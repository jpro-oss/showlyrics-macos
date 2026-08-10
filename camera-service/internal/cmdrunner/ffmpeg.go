package cmdrunner

import (
	"bufio"
	"encoding/binary"
	"fmt"
	"io"
	"log"
	"math/rand"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"runtime"
	"strings"
	"sync"
	"time"

	"github.com/pion/rtp"
)

// =============================================================
// CameraManager — FFmpeg → IVF stdout pipe
//
// Uses IVF container (not WebM) for zero-latency frame delivery.
// IVF writes each VP8 frame individually with a 12-byte header,
// eliminating the WebM cluster buffering that caused 2-second freezes.
//
// Also avoids RTP/UDP entirely to bypass circular_buffer_size crash
// on FFmpeg 2.x built without pthread support (exit 0xc0000005).
// =============================================================

type CameraManager struct {
	mu      sync.Mutex
	streams map[string]*cameraProcess
}

type cameraProcess struct {
	mu      sync.Mutex
	cmd     *exec.Cmd
	stopped bool
}

func NewCameraManager() *CameraManager {
	return &CameraManager{streams: make(map[string]*cameraProcess)}
}

func FindFFmpeg() string {
	ext := ""
	if runtime.GOOS == "windows" {
		ext = ".exe"
	}
	name := "ffmpeg" + ext
	exeDir := "."
	if exePath, err := os.Executable(); err == nil {
		exeDir = filepath.Dir(exePath)
	}
	candidates := []string{
		filepath.Join(exeDir, name),
		filepath.Join(".", name),
		filepath.Join(".", "backend", name),
		filepath.Join("..", "backend", name),
	}
	for _, p := range candidates {
		if _, err := os.Stat(p); err == nil {
			if abs, err := filepath.Abs(p); err == nil {
				return abs
			}
			return p
		}
	}
	if resolved, err := exec.LookPath(name); err == nil {
		if abs, err := filepath.Abs(resolved); err == nil {
			return abs
		}
		return resolved
	}
	return "ffmpeg"
}

// StartPipe launches FFmpeg writing IVF VP8 to stdout and returns the pipe reader.
func (cm *CameraManager) StartPipe(key, cameraName string) (io.ReadCloser, error) {
	cm.mu.Lock()
	defer cm.mu.Unlock()

	if old, ok := cm.streams[key]; ok {
		old.mu.Lock()
		old.killLocked()
		old.mu.Unlock()
		delete(cm.streams, key)
	}

	ffmpeg := FindFFmpeg()
	args := ivfPipeArgs(cameraName)

	log.Printf("[FFMPEG] StartPipe key=%s device=%q", key, cameraName)
	log.Printf("[FFMPEG] CMD: %s %s", ffmpeg, strings.Join(args, " "))

	cmd := exec.Command(ffmpeg, args...)
	stdoutPipe, err := cmd.StdoutPipe()
	if err != nil {
		return nil, fmt.Errorf("stdout pipe: %v", err)
	}
	stderrPipe, _ := cmd.StderrPipe()

	if err := cmd.Start(); err != nil {
		return nil, fmt.Errorf("ffmpeg start: %v", err)
	}

	proc := &cameraProcess{cmd: cmd}
	cm.streams[key] = proc

	if stderrPipe != nil {
		go func() {
			sc := bufio.NewScanner(stderrPipe)
			for sc.Scan() {
				line := sc.Text()
				// Suppress known harmless warnings
				if strings.Contains(line, "circular_buffer_size") ||
					strings.Contains(line, "deprecated pixel format") ||
					strings.Contains(line, "Past duration") {
					continue
				}
				log.Printf("[FFMPEG:%s] %s", key, line)
			}
		}()
	}

	go func() {
		if err := cmd.Wait(); err != nil {
			log.Printf("[FFMPEG] %s exited: %v", key, err)
		} else {
			log.Printf("[FFMPEG] %s exited cleanly", key)
		}
		proc.mu.Lock()
		proc.stopped = true
		proc.mu.Unlock()
		cm.mu.Lock()
		if cm.streams[key] == proc {
			delete(cm.streams, key)
		}
		cm.mu.Unlock()
	}()

	return stdoutPipe, nil
}

// Start kept for interface compatibility.
func (cm *CameraManager) Start(key, cameraName string, port int) error { return nil }

func (p *cameraProcess) killLocked() {
	if p.stopped {
		return
	}
	p.stopped = true
	if p.cmd != nil && p.cmd.Process != nil {
		_ = p.cmd.Process.Kill()
	}
}

func (cm *CameraManager) Stop(key string) {
	cm.mu.Lock()
	defer cm.mu.Unlock()
	if proc, ok := cm.streams[key]; ok {
		log.Printf("[FFMPEG] Stop: %s", key)
		proc.mu.Lock()
		proc.killLocked()
		proc.mu.Unlock()
		delete(cm.streams, key)
	}
}

func (cm *CameraManager) StopAll() {
	cm.mu.Lock()
	defer cm.mu.Unlock()
	for key, proc := range cm.streams {
		log.Printf("[FFMPEG] StopAll: %s", key)
		proc.mu.Lock()
		proc.killLocked()
		proc.mu.Unlock()
		delete(cm.streams, key)
	}
}

// =============================================================
// FFmpeg arguments — IVF output (zero-latency frame delivery)
// =============================================================

// ivfPipeArgs returns FFmpeg args to capture camera and output IVF VP8 to stdout.
//
// WHY IVF instead of WebM:
//   - WebM uses "clusters" that batch multiple frames before flushing to stdout.
//     This causes periodic 2-5 second freezes as the Go parser waits for data.
//   - IVF is the simplest possible VP8 container: 32-byte file header, then
//     each frame gets a 12-byte header + raw VP8 data, flushed immediately.
//     Zero clustering, zero buffering = zero-latency frame delivery.
func ivfPipeArgs(cameraName string) []string {
	common := []string{
		"-an",                       // no audio
		"-vcodec", "libvpx",
		"-pix_fmt", "yuv420p",
		"-s", "1280x720",            // 720p — sharp for projectors/videotrons
		"-r", "30",                  // output 30fps — smoother, synced with input
		"-deadline", "realtime",     // real-time encoding mode
		"-cpu-used", "8",            // balanced quality vs speed — still realtime
		"-lag-in-frames", "0",       // no frame reordering delay
		"-error-resilient", "1",     // resilient to packet loss in WebRTC
		"-static-thresh", "800",     // skip encoding near-identical frames (saves CPU)
		"-qmin", "4",                // min quantizer — clean detail preservation
		"-qmax", "40",               // max quantizer — prevents noise/artifacts
		"-g", "30",                  // keyframe every 1 second (at 30fps output)
		"-keyint_min", "15",         // min keyframe interval
		"-b:v", "2200k",             // target bitrate — crisp 720p, balanced CPU
		"-maxrate", "2600k",         // peak bitrate cap — tighter than before
		"-bufsize", "110k",          // tight VBV buffer = minimal encoding delay
		"-threads", "0",             // auto thread count for libvpx
		"-f", "ivf",                 // IVF container — per-frame, zero clustering
		"pipe:1",                    // write to stdout
	}

	if runtime.GOOS == "windows" {
		input := "video=" + cameraName
		if strings.TrimSpace(cameraName) == "" || cameraName == "0" {
			input = "video=default"
		}
		return append([]string{
			"-hide_banner", "-loglevel", "warning",
			"-f", "dshow",
			"-video_size", "1280x720",  // explicit input resolution
			"-framerate", "30",         // explicit input framerate
			"-rtbufsize", "8M",         // 8MB capture buffer — saves ~42MB RAM vs 50M
			"-thread_queue_size", "8",  // small thread queue for low latency
			"-i", input,
		}, common...)
	}

	// macOS AVFoundation
	input := cameraName
	if strings.TrimSpace(input) == "" {
		input = "0:none"
	} else if !strings.Contains(input, ":") {
		input = input + ":none"
	}
	return append([]string{
		"-hide_banner", "-loglevel", "warning",
		"-f", "avfoundation",
		"-capture_cursor", "0",
		"-framerate", "30",
		"-i", input,
	}, common...)
}

// =============================================================
// Camera list
// =============================================================

func (cm *CameraManager) ListCameras() ([]string, error) {
	ffmpeg := FindFFmpeg()
	var cmd *exec.Cmd
	if runtime.GOOS == "windows" {
		cmd = exec.Command(ffmpeg, "-hide_banner", "-list_devices", "true", "-f", "dshow", "-i", "dummy")
	} else {
		cmd = exec.Command(ffmpeg, "-hide_banner", "-f", "avfoundation", "-list_devices", "true", "-i", "")
	}
	out, err := cmd.CombinedOutput()
	s := string(out)
	if err != nil && strings.TrimSpace(s) == "" {
		return nil, err
	}
	return parseCameraList(s), nil
}

func parseCameraList(output string) []string {
	var cameras []string
	seen := map[string]bool{}
	sc := bufio.NewScanner(strings.NewReader(output))

	if runtime.GOOS == "windows" {
		inVideo := false
		re := regexp.MustCompile(`"([^"]+)"`)
		for sc.Scan() {
			line := sc.Text()
			if strings.Contains(line, "DirectShow video devices") {
				inVideo = true
				continue
			}
			if strings.Contains(line, "DirectShow audio devices") {
				inVideo = false
			}
			if !inVideo || strings.Contains(line, "Alternative name") {
				continue
			}
			if m := re.FindStringSubmatch(line); len(m) > 1 && !seen[m[1]] {
				seen[m[1]] = true
				cameras = append(cameras, m[1])
			}
		}
		return cameras
	}

	inVideo := false
	re := regexp.MustCompile(`\[(\d+)\]\s+(.+)`)
	for sc.Scan() {
		line := sc.Text()
		if strings.Contains(line, "AVFoundation video devices") {
			inVideo = true
			continue
		}
		if strings.Contains(line, "AVFoundation audio devices") {
			inVideo = false
		}
		if !inVideo {
			continue
		}
		if m := re.FindStringSubmatch(line); len(m) > 2 {
			name := strings.TrimSpace(m[2])
			if name != "" && !seen[name] {
				seen[name] = true
				cameras = append(cameras, name)
			}
		}
	}
	return cameras
}

// =============================================================
// IVF parser + VP8 → RTP packetizer
//
// IVF format is extremely simple:
//   File header:  32 bytes (read once, skip)
//   Frame header: 12 bytes  [4-byte LE frame_size, 8-byte LE timestamp]
//   Frame data:   frame_size bytes of raw VP8 data
//
// Compare to WebM EBML which needs nested container traversal,
// variable-length integer decoding, cluster boundary handling, etc.
// IVF delivers ~10x lower parsing overhead.
// =============================================================

const ivfFileHeaderSize = 32
const ivfFrameHeaderSize = 12

// IVFParser reads IVF frames from a pipe and produces VP8 RTP packets.
type IVFParser struct {
	r          *bufio.Reader
	ssrc       uint32
	seq        uint16
	headerRead bool
	timestamp  uint32 // deterministic RTP timestamp (increments by 90000/fps per frame)
	frameBuf   []byte // reusable buffer to avoid per-frame allocation
	frameCount uint64 // diagnostics: total frames parsed
	startTime  time.Time // for fps diagnostics only
}

// rtpTimestampIncrement is 90000 Hz clock / 30 fps = 3000 ticks per frame.
// Using deterministic timestamps eliminates wall-clock jitter that causes
// playback drift in Chromium's video pipeline.
const rtpTimestampIncrement = 3000

func NewIVFParser(r io.Reader) *IVFParser {
	return &IVFParser{
		r:        bufio.NewReaderSize(r, 128*1024), // 128KB read buffer
		ssrc:     rand.Uint32(),
		seq:      uint16(rand.Uint32()),
		frameBuf: make([]byte, 0, 256*1024), // pre-allocate 256KB
	}
}

// ReadRTPPackets reads the next VP8 frame and returns RTP packets.
func (p *IVFParser) ReadRTPPackets() ([]*rtp.Packet, error) {
	// Read file header on first call
	if !p.headerRead {
		hdr := make([]byte, ivfFileHeaderSize)
		if _, err := io.ReadFull(p.r, hdr); err != nil {
			return nil, fmt.Errorf("IVF file header: %w", err)
		}
		// Verify IVF signature "DKIF"
		if string(hdr[0:4]) != "DKIF" {
			return nil, fmt.Errorf("not IVF: signature %q", string(hdr[0:4]))
		}
		p.headerRead = true
		log.Printf("[IVF] Header: codec=%s width=%d height=%d",
			string(hdr[8:12]),
			binary.LittleEndian.Uint16(hdr[12:14]),
			binary.LittleEndian.Uint16(hdr[14:16]))
	}

	// Read frame header (12 bytes)
	var fhdr [ivfFrameHeaderSize]byte
	if _, err := io.ReadFull(p.r, fhdr[:]); err != nil {
		return nil, err
	}
	frameSize := binary.LittleEndian.Uint32(fhdr[0:4])

	if frameSize == 0 || frameSize > 4*1024*1024 {
		return nil, fmt.Errorf("invalid IVF frame size: %d", frameSize)
	}

	// Read frame data — reuse buffer to avoid GC pressure
	if cap(p.frameBuf) < int(frameSize) {
		p.frameBuf = make([]byte, frameSize)
	}
	frame := p.frameBuf[:frameSize]
	if _, err := io.ReadFull(p.r, frame); err != nil {
		return nil, err
	}

	// Detect keyframe from VP8 bitstream header
	isKey := len(frame) > 0 && (frame[0]&0x01) == 0

	// Deterministic RTP timestamps — increment by fixed amount per frame.
	// Eliminates wall-clock jitter that causes playback drift in Chromium.
	// 90000 Hz clock / 30 fps = 3000 ticks per frame.
	p.timestamp += rtpTimestampIncrement

	// Periodic diagnostics — log every ~5 seconds (30fps × 5s = 150 frames)
	p.frameCount++
	if p.frameCount == 1 {
		p.startTime = time.Now()
	}
	if p.frameCount%150 == 0 {
		elapsed := time.Since(p.startTime)
		fps := float64(p.frameCount) / elapsed.Seconds()
		log.Printf("[IVF] %d frames in %.1fs (%.1f fps, frame=%d bytes, key=%v)",
			p.frameCount, elapsed.Seconds(), fps, frameSize, isKey)
	}

	return packetizeVP8(frame, isKey, p.ssrc, &p.seq, p.timestamp), nil
}

// =============================================================
// VP8 RTP packetizer (RFC 7741)
// =============================================================

const maxRTPPayload = 1200

func packetizeVP8(frame []byte, isKey bool, ssrc uint32, seq *uint16, ts uint32) []*rtp.Packet {
	// Pre-calculate number of packets to avoid slice re-growth
	maxPayload := maxRTPPayload - 1 // 1 byte VP8 descriptor
	numPkts := (len(frame) + maxPayload - 1) / maxPayload
	if numPkts == 0 {
		numPkts = 1
	}
	packets := make([]*rtp.Packet, 0, numPkts)
	offset := 0
	first := true

	for offset < len(frame) {
		end := offset + maxPayload
		if end > len(frame) {
			end = len(frame)
		}
		isLast := end == len(frame)

		// VP8 payload descriptor (RFC 7741 §4.2)
		var desc byte
		if first {
			desc = 0x10 // S=1 (start of VP8 partition)
		}

		payload := make([]byte, 1+end-offset)
		payload[0] = desc
		copy(payload[1:], frame[offset:end])

		pkt := &rtp.Packet{
			Header: rtp.Header{
				Version:        2,
				PayloadType:    96,
				SequenceNumber: *seq,
				Timestamp:      ts,
				SSRC:           ssrc,
				Marker:         isLast,
			},
			Payload: payload,
		}
		*seq++
		packets = append(packets, pkt)

		offset = end
		first = false
	}
	return packets
}
