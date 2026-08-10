package webrtc

import (
	"errors"
	"io"
	"log"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"camera-service/internal/capture"
	"camera-service/internal/cmdrunner"
	"github.com/gorilla/websocket"
	"github.com/pion/rtp"
	pionwebrtc "github.com/pion/webrtc/v3"
)

const (
	// How long after the last WebRTC client disconnects before FFmpeg is killed.
	// Kept short so camera resources are freed quickly when user switches
	// cameras or leaves the preview tab.
	idleShutdownDelay = 5 * time.Second
)

// CaptureSession represents a single FFmpeg capture process for one physical camera.
// Multiple WebRTC clients (projector, browser tabs, preview) share this session
// via the FanoutTrack — only ONE FFmpeg process per camera, regardless of how
// many clients are viewing it.
type CaptureSession struct {
	mu           sync.Mutex
	canonicalKey string // e.g. "camera:integrated camera" — from capture.ResolveCanonicalName()
	cameraName   string // original FFmpeg device name — e.g. "Integrated Camera"
	fanout       *FanoutTrack
	manager      *cmdrunner.CameraManager
	clients      atomic.Int32
	idleTimer    *time.Timer
	closed       bool
	// pipe-based forwarding
	pipeReader io.ReadCloser
	stopChan   chan struct{}
}

type StreamManager struct {
	mu       sync.Mutex
	captures map[string]*CaptureSession // keyed by canonical camera name ONLY
	manager  *cmdrunner.CameraManager
}

func NewStreamManager(manager *cmdrunner.CameraManager) *StreamManager {
	return &StreamManager{
		captures: make(map[string]*CaptureSession),
		manager:  manager,
	}
}

func (sm *StreamManager) HandleSignaling(ws *websocket.Conn, channel string, cameraName string) {
	if channel == "" {
		channel = "main"
	}

	// Resolve canonical name — reject UUID device_id, empty names, etc.
	canonicalKey, err := capture.ResolveCanonicalName(cameraName)
	if err != nil {
		log.Printf("[WebRTC] Rejected camera name %q: %v", cameraName, err)
		_ = ws.WriteJSON(map[string]string{"type": "error", "message": err.Error()})
		return
	}

	session, err := sm.getSession(canonicalKey, cameraName)
	if err != nil {
		log.Printf("[WebRTC] Session creation failed: %v", err)
		_ = ws.WriteJSON(map[string]string{"type": "error", "message": err.Error()})
		return
	}
	session.AddClient(ws, cameraName)
}

func (sm *StreamManager) CloseAll() {
	sm.mu.Lock()
	sessions := make([]*CaptureSession, 0, len(sm.captures))
	for _, session := range sm.captures {
		sessions = append(sessions, session)
	}
	sm.captures = make(map[string]*CaptureSession)
	sm.mu.Unlock()

	for _, session := range sessions {
		session.closeStreamInternal()
	}
}

// GetStats returns stats for all active capture sessions.
// Used by /api/camera/stats endpoint.
func (sm *StreamManager) GetStats() []map[string]interface{} {
	sm.mu.Lock()
	defer sm.mu.Unlock()

	stats := make([]map[string]interface{}, 0, len(sm.captures))
	for key, session := range sm.captures {
		session.mu.Lock()
		clientCount := int(session.clients.Load())
		cameraName := session.cameraName
		isClosed := session.closed
		session.mu.Unlock()

		if isClosed {
			continue
		}
		stats = append(stats, map[string]interface{}{
			"camera":  cameraName,
			"key":     key,
			"clients": clientCount,
			"encoder": "libvpx",
		})
	}
	return stats
}

func (sm *StreamManager) getSession(canonicalKey string, cameraName string) (*CaptureSession, error) {
	sm.mu.Lock()
	defer sm.mu.Unlock()

	if session, ok := sm.captures[canonicalKey]; ok {
		session.mu.Lock()
		if session.closed {
			session.mu.Unlock()
			delete(sm.captures, canonicalKey)
		} else {
			if cameraName != "" && session.cameraName != cameraName && session.clients.Load() == 0 {
				session.cameraName = cameraName
			}
			session.mu.Unlock()
			return session, nil
		}
	}

	session := &CaptureSession{
		canonicalKey: canonicalKey,
		cameraName:   cameraName,
		fanout:       NewFanoutTrack(),
		manager:      sm.manager,
	}
	sm.captures[canonicalKey] = session

	log.Printf("[Capture] Session created: key=%s camera=%q", canonicalKey, cameraName)
	return session, nil
}

func safeTrackID(key string) string {
	replacer := strings.NewReplacer(":", "-", " ", "-", "/", "-", "\\", "-", "#", "-")
	return replacer.Replace(key)
}

func (s *CaptureSession) AddClient(ws *websocket.Conn, cameraName string) {
	if cameraName != "" {
		s.mu.Lock()
		if s.cameraName != cameraName && s.clients.Load() == 0 {
			s.cameraName = cameraName
		}
		s.mu.Unlock()
	}

	s.mu.Lock()
	if s.closed {
		s.mu.Unlock()
		_ = ws.WriteJSON(map[string]string{"type": "error", "message": "stream is closed"})
		return
	}
	if s.idleTimer != nil {
		s.idleTimer.Stop()
		s.idleTimer = nil
	}
	s.clients.Add(1)
	clientCount := s.clients.Load()
	s.mu.Unlock()

	log.Printf("[Capture] camera=%s clients=%d ffmpeg=1", s.cameraName, clientCount)

	defer func() {
		newCount := s.clients.Add(-1)
		s.mu.Lock()
		if newCount == 0 && !s.closed {
			s.idleTimer = time.AfterFunc(idleShutdownDelay, s.CloseStream)
		}
		s.mu.Unlock()
		log.Printf("[Capture] Client disconnected: camera=%s clients=%d", s.cameraName, newCount)
	}()

	if err := s.ensureStarted(); err != nil {
		log.Printf("[WebRTC] Failed to start capture for %s: %v", s.cameraName, err)
		_ = ws.WriteJSON(map[string]string{"type": "error", "message": err.Error()})
		return
	}

	// Create a SEPARATE track per PeerConnection so fan-out writes are isolated.
	// This prevents a slow client from blocking WriteRTP for other clients.
	track, err := pionwebrtc.NewTrackLocalStaticRTP(pionwebrtc.RTPCodecCapability{
		MimeType:  pionwebrtc.MimeTypeVP8,
		ClockRate: 90000,
	}, "video", "showlyrics-camera-"+safeTrackID(s.canonicalKey))
	if err != nil {
		log.Printf("[WebRTC] NewTrack failed: %v", err)
		_ = ws.WriteJSON(map[string]string{"type": "error", "message": err.Error()})
		return
	}

	pc, err := pionwebrtc.NewPeerConnection(pionwebrtc.Configuration{})
	if err != nil {
		log.Printf("[WebRTC] PeerConnection failed: %v", err)
		return
	}
	defer pc.Close()

	rtpSender, err := pc.AddTrack(track)
	if err != nil {
		log.Printf("[WebRTC] AddTrack failed: %v", err)
		return
	}

	// Subscribe to fan-out — each subscriber's writer goroutine calls
	// WriteRTP on THIS client's dedicated track (not a shared one).
	sub := s.fanout.Subscribe(func(pkt *rtp.Packet) error {
		return track.WriteRTP(pkt)
	})
	defer s.fanout.Unsubscribe(sub)

	go func() {
		rtcpBuf := make([]byte, 1500)
		for {
			if _, _, err := rtpSender.Read(rtcpBuf); err != nil {
				return
			}
		}
	}()

	offer, err := pc.CreateOffer(nil)
	if err != nil {
		log.Printf("[WebRTC] CreateOffer failed: %v", err)
		return
	}
	if err := pc.SetLocalDescription(offer); err != nil {
		log.Printf("[WebRTC] SetLocalDescription failed: %v", err)
		return
	}

	<-pionwebrtc.GatheringCompletePromise(pc)
	if err := ws.WriteJSON(pc.LocalDescription()); err != nil {
		return
	}

	var answer pionwebrtc.SessionDescription
	if err := ws.ReadJSON(&answer); err != nil {
		log.Printf("[WebRTC] Read answer failed: %v", err)
		return
	}
	if err := pc.SetRemoteDescription(answer); err != nil {
		log.Printf("[WebRTC] SetRemoteDescription failed: %v", err)
		return
	}

	for {
		if _, _, err := ws.ReadMessage(); err != nil {
			return
		}
	}
}

func (s *CaptureSession) ensureStarted() error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.closed {
		return errors.New("stream is closed")
	}
	if s.stopChan != nil {
		// Already started — pipe reader is running
		return nil
	}
	if s.cameraName == "" {
		return errors.New("camera name is empty")
	}

	s.stopChan = make(chan struct{})

	// Start FFmpeg + pipe reader — completely bypass UDP/RTP
	pipeReader, err := s.manager.StartPipe(s.canonicalKey, s.cameraName)
	if err != nil {
		close(s.stopChan)
		s.stopChan = nil
		return err
	}
	s.pipeReader = pipeReader

	go s.forwardFromPipe(pipeReader, s.stopChan)
	return nil
}

// forwardFromPipe reads IVF VP8 frames from FFmpeg stdout pipe and broadcasts
// RTP packets to all subscribers via the FanoutTrack. Each subscriber has its
// own goroutine + dedicated track for WriteRTP — a slow client only blocks
// itself, not the capture pipeline.
func (s *CaptureSession) forwardFromPipe(pipe io.ReadCloser, stopChan <-chan struct{}) {
	defer func() {
		_ = pipe.Close()
	}()

	parser := cmdrunner.NewIVFParser(pipe)
	for {
		packets, err := parser.ReadRTPPackets()
		if err != nil {
			select {
			case <-stopChan:
				return
			default:
				log.Printf("[WebRTC] Pipe read error on %s: %v", s.canonicalKey, err)
				return
			}
		}

		for _, pkt := range packets {
			s.fanout.Broadcast(pkt)
		}
	}
}

// CloseStream is the public close method called by idle timer.
// It checks if clients are still connected before closing.
func (s *CaptureSession) CloseStream() {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.closed {
		return
	}

	// Guard: don't close if clients are still connected
	if s.clients.Load() > 0 {
		log.Printf("[Capture] Skipping close — %d clients still connected to %s", s.clients.Load(), s.cameraName)
		return
	}

	s.closeInternalLocked()
}

// closeStreamInternal closes the session unconditionally (used by CloseAll).
func (s *CaptureSession) closeStreamInternal() {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.closed {
		return
	}
	s.closeInternalLocked()
}

// closeInternalLocked performs the actual close. Caller must hold s.mu.
func (s *CaptureSession) closeInternalLocked() {
	s.closed = true
	log.Printf("[Capture] Closing session: key=%s camera=%s", s.canonicalKey, s.cameraName)

	if s.idleTimer != nil {
		s.idleTimer.Stop()
		s.idleTimer = nil
	}
	if s.fanout != nil {
		s.fanout.CloseAll()
	}
	if s.stopChan != nil {
		close(s.stopChan)
		s.stopChan = nil
	}
	if s.pipeReader != nil {
		_ = s.pipeReader.Close()
		s.pipeReader = nil
	}
	s.manager.Stop(s.canonicalKey)
}
