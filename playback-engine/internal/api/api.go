package api

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"

	"playback-engine/internal/models"
	"playback-engine/internal/storage"
	"playback-engine/internal/timeline"
	"playback-engine/internal/websocket"
)

// videoContentTypes: peta ekstensi → MIME type untuk GPU hardware decode.
var videoContentTypes = map[string]string{
	".mp4":  "video/mp4",
	".webm": "video/webm",
	".mkv":  "video/x-matroska",
	".mov":  "video/quicktime",
	".avi":  "video/avi",
	".m4v":  "video/mp4",
	".ts":   "video/mp2t",
	".ogv":  "video/ogg",
}

var hopByHopHeaders = map[string]bool{
	"connection":          true,
	"keep-alive":          true,
	"proxy-authenticate":  true,
	"proxy-authorization": true,
	"te":                  true,
	"trailers":            true,
	"transfer-encoding":   true,
	"upgrade":             true,
}

type Server struct {
	timeline        *timeline.Engine
	resolver        *storage.Resolver
	hub             *websocket.Hub
	streamTransport *http.Transport
	streamClient    *http.Client
	bufferPool      *sync.Pool
}

func NewServer(timeline *timeline.Engine, resolver *storage.Resolver, hub *websocket.Hub) *Server {
	transport := &http.Transport{
		Proxy: http.ProxyFromEnvironment,
		DialContext: (&net.Dialer{
			Timeout:   5 * time.Second,
			KeepAlive: 30 * time.Second,
		}).DialContext,
		MaxIdleConns:        50,
		MaxIdleConnsPerHost: 20,
		IdleConnTimeout:     90 * time.Second,
		TLSHandshakeTimeout: 5 * time.Second,
		DisableCompression:  true, // crucial: video stream byte-range tidak boleh di-gzip
	}

	client := &http.Client{
		Transport: transport,
		Timeout:   0, // 0 = tidak ada timeout global agar streaming durasi panjang / loop tidak terputus
	}

	bufPool := &sync.Pool{
		New: func() interface{} {
			b := make([]byte, 64*1024) // 64KB buffer chunk
			return &b
		},
	}

	return &Server{
		timeline:        timeline,
		resolver:        resolver,
		hub:             hub,
		streamTransport: transport,
		streamClient:    client,
		bufferPool:      bufPool,
	}
}

func (s *Server) SetupRoutes() *http.ServeMux {
	mux := http.NewServeMux()

	// WebSocket route
	mux.HandleFunc("/ws", s.hub.HandleWebSocket)

	// API control routes
	mux.HandleFunc("/command", s.handleCORS(s.handleCommand))
	mux.HandleFunc("/state", s.handleCORS(s.handleState))

	// Video streaming routes (supporting both formats)
	mux.HandleFunc("/video/", s.handleCORS(s.handleStream))
	mux.HandleFunc("/api/stream_video/", s.handleCORS(s.handleStream))

	return mux
}

func (s *Server) handleCORS(h http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS, HEAD")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Range, X-ShowLyrics-Secret")
		w.Header().Set("Access-Control-Expose-Headers", "Content-Range, Accept-Ranges, Content-Length")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		h(w, r)
	}
}

func (s *Server) handleState(w http.ResponseWriter, r *http.Request) {
	if r.Method != "GET" {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	state := s.timeline.GetState()
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(state)
}

func (s *Server) handleCommand(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	var cmd models.CommandRequest
	if err := json.NewDecoder(r.Body).Decode(&cmd); err != nil {
		http.Error(w, "Bad Request", http.StatusBadRequest)
		return
	}

	var state models.TimelineState

	// Set dynamic Go host
	scheme := "http"
	if r.TLS != nil {
		scheme = "https"
	}
	host := r.Host
	if host == "" {
		host = "localhost:18899"
	}

	switch cmd.Action {
	case "load_media", "load":
		isRemote := strings.HasPrefix(cmd.Path, "http://") || strings.HasPrefix(cmd.Path, "https://") || strings.HasPrefix(cmd.MediaID, "sender_")
		if isRemote {
			s.resolver.RegisterRemote(cmd.MediaID, cmd.Path, cmd.FallbackURL, cmd.Duration)
		} else {
			s.resolver.Register(cmd.MediaID, cmd.Path)
		}

		state = s.timeline.LoadMedia(cmd.MediaID, cmd.Path, cmd.Duration, cmd.Hash, cmd.Behavior)

		videoURL := fmt.Sprintf("%s://%s/api/stream_video/%s", scheme, host, state.MediaID)
		payload := models.BackgroundPayload{
			URL:          videoURL,
			FallbackURL:  cmd.FallbackURL,
			Behavior:     state.Behavior,
			StartTime:    0.0,
			Playing:      state.Playing,
			MediaID:      state.MediaID,
			PlaybackRate: state.PlaybackRate,
			Hash:         state.Hash,
			IsRemote:     isRemote,
		}
		s.hub.Broadcast(models.WSMessage{
			Type:     "update_background",
			Payload:  payload,
			IsRemote: isRemote,
		})

	case "update_duration":
		var dur float64
		if valFloat, ok := cmd.Value.(float64); ok {
			dur = valFloat
		} else if cmd.Duration > 0 {
			dur = cmd.Duration
		} else if valStr, ok := cmd.Value.(string); ok {
			dur, _ = strconv.ParseFloat(valStr, 64)
		}
		if dur > 0 {
			s.timeline.UpdateDuration(dur)
			s.resolver.UpdateDuration(cmd.MediaID, dur)
		}
		state = s.timeline.GetState()

	case "play":
		state = s.timeline.Play()
		payload := models.BGControlPayload{
			Target:       "video",
			Command:      "play",
			Playing:      true,
			PlaybackRate: state.PlaybackRate,
		}
		s.hub.Broadcast(models.WSMessage{
			Type:     "bg_control",
			Payload:  payload,
			IsRemote: state.IsRemote,
		})

	case "pause":
		state = s.timeline.Pause()
		payload := models.BGControlPayload{
			Target:       "video",
			Command:      "pause",
			Playing:      false,
			PlaybackRate: state.PlaybackRate,
		}
		s.hub.Broadcast(models.WSMessage{
			Type:     "bg_control",
			Payload:  payload,
			IsRemote: state.IsRemote,
		})

	case "replay":
		state = s.timeline.Replay()
		payload := models.BGControlPayload{
			Target:       "video",
			Command:      "replay",
			Playing:      true,
			PlaybackRate: state.PlaybackRate,
		}
		s.hub.Broadcast(models.WSMessage{
			Type:     "bg_control",
			Payload:  payload,
			IsRemote: state.IsRemote,
		})

	case "seek", "sync_time":
		var target float64
		if valStr, ok := cmd.Value.(string); ok {
			target, _ = strconv.ParseFloat(valStr, 64)
		} else if valFloat, ok := cmd.Value.(float64); ok {
			target = valFloat
		}
		state = s.timeline.Seek(target)
		payload := models.BGControlPayload{
			Target:       "video",
			Command:      "sync_time",
			Value:        state.PausedPosition,
			Playing:      state.Playing,
			PlaybackRate: state.PlaybackRate,
		}
		s.hub.Broadcast(models.WSMessage{
			Type:     "bg_control",
			Payload:  payload,
			IsRemote: state.IsRemote,
		})

	case "playback_rate":
		rate := cmd.PlaybackRate
		if rate <= 0 {
			rate = 1.0
		}
		state = s.timeline.SetPlaybackRate(rate)
		payload := models.BGControlPayload{
			Target:       "video",
			Command:      "sync_time",
			Value:        state.PausedPosition,
			Playing:      state.Playing,
			PlaybackRate: state.PlaybackRate,
		}
		s.hub.Broadcast(models.WSMessage{
			Type:     "bg_control",
			Payload:  payload,
			IsRemote: state.IsRemote,
		})

	case "volume":
		var vol float64
		if valFloat, ok := cmd.Value.(float64); ok {
			vol = valFloat
		}
		state = s.timeline.SetVolume(vol)
		payload := models.BGControlPayload{
			Target:       "video",
			Command:      "volume",
			Value:        vol,
			Playing:      state.Playing,
			PlaybackRate: state.PlaybackRate,
		}
		s.hub.Broadcast(models.WSMessage{
			Type:     "bg_control",
			Payload:  payload,
			IsRemote: state.IsRemote,
		})

	case "mute":
		state = s.timeline.SetMute(true)
		payload := models.BGControlPayload{
			Target:       "video",
			Command:      "mute",
			Playing:      state.Playing,
			PlaybackRate: state.PlaybackRate,
		}
		s.hub.Broadcast(models.WSMessage{
			Type:     "bg_control",
			Payload:  payload,
			IsRemote: state.IsRemote,
		})

	case "unmute":
		state = s.timeline.SetMute(false)
		payload := models.BGControlPayload{
			Target:       "video",
			Command:      "unmute",
			Playing:      state.Playing,
			PlaybackRate: state.PlaybackRate,
		}
		s.hub.Broadcast(models.WSMessage{
			Type:     "bg_control",
			Payload:  payload,
			IsRemote: state.IsRemote,
		})

	case "stop":
		state = s.timeline.Stop()
		payload := models.BackgroundPayload{
			URL:          "",
			Behavior:     "loop",
			StartTime:    0.0,
			Playing:      false,
			MediaID:      "",
			PlaybackRate: 1.0,
			Hash:         "",
			IsRemote:     false,
		}
		s.hub.Broadcast(models.WSMessage{
			Type:     "update_background",
			Payload:  payload,
			IsRemote: false,
		})

	case "loop":
		var isLoop bool
		if valBool, ok := cmd.Value.(bool); ok {
			isLoop = valBool
		} else if valStr, ok := cmd.Value.(string); ok {
			isLoop = (valStr == "loop" || valStr == "true")
		}

		behavior := "once_hold"
		if isLoop {
			behavior = "loop"
		}
		state = s.timeline.SetBehavior(behavior)
		payload := models.BGControlPayload{
			Target:       "video",
			Command:      "loop",
			Value:        isLoop,
			Playing:      state.Playing,
			PlaybackRate: state.PlaybackRate,
		}
		s.hub.Broadcast(models.WSMessage{
			Type:     "bg_control",
			Payload:  payload,
			IsRemote: state.IsRemote,
		})

	case "update_behavior":
		var behavior string
		if valStr, ok := cmd.Value.(string); ok {
			behavior = valStr
		}
		state = s.timeline.SetBehavior(behavior)
		payload := models.BGControlPayload{
			Target:       "video",
			Command:      "update_behavior",
			Value:        behavior,
			Playing:      state.Playing,
			PlaybackRate: state.PlaybackRate,
		}
		s.hub.Broadcast(models.WSMessage{
			Type:     "bg_control",
			Payload:  payload,
			IsRemote: state.IsRemote,
		})

	case "update_bg_config":
		s.hub.Broadcast(models.WSMessage{
			Type:    "update_bg_config",
			Payload: cmd.Payload,
		})

	default:
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{"status": "ignored"})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(state)
}

func (s *Server) handleStream(w http.ResponseWriter, r *http.Request) {
	// Extract media ID from path, trimming slashes
	trimmed := strings.Trim(r.URL.Path, "/")
	parts := strings.Split(trimmed, "/")
	if len(parts) == 0 {
		http.Error(w, "Bad Request", http.StatusBadRequest)
		return
	}
	mediaID := parts[len(parts)-1]
	if mediaID == "" {
		http.Error(w, "Media ID Required", http.StatusBadRequest)
		return
	}

	// 1. Check if registered as remote endpoint (Media Sender)
	if ep, ok := s.resolver.GetEndpoint(mediaID); ok && ep != nil && ep.IsRemote {
		s.proxyStreamWithFailover(w, r, mediaID, ep)
		return
	}

	// 2. Query resolver path
	path, err := s.resolver.GetVideoPath(mediaID)
	if err != nil {
		log.Printf("[STREAM] Error finding video path for %s: %v", mediaID, err)
		http.Error(w, "Video File Not Found", http.StatusNotFound)
		return
	}

	// Remote proxy streaming
	if strings.HasPrefix(path, "http://") || strings.HasPrefix(path, "https://") {
		ep := &storage.StreamEndpoint{
			PrimaryURL:  path,
			ActiveRoute: "primary",
			IsRemote:    true,
		}
		s.proxyStreamWithFailover(w, r, mediaID, ep)
		return
	}

	// Local file streaming (100% UNTOUCHED LOCAL ARCHITECTURE)
	info, err := os.Stat(path)
	if err != nil {
		log.Printf("[STREAM] Error stat file %s: %v", path, err)
		http.Error(w, "Video File Stat Error", http.StatusNotFound)
		return
	}

	ext := strings.ToLower(filepath.Ext(path))
	if ct, ok := videoContentTypes[ext]; ok {
		w.Header().Set("Content-Type", ct)
	}

	w.Header().Set("Vary", "Range")
	w.Header().Set("Cache-Control", "public, max-age=31536000")
	w.Header().Set("Accept-Ranges", "bytes")

	if info.Size() > 50*1024*1024 {
		go prewarmFileCache(path)
	}

	log.Printf("[STREAM] Serving local: %s (%d MB)", filepath.Base(path), info.Size()/(1024*1024))
	s.streamStandardFile(w, r, path, info.ModTime())
}

var prewarmedFiles sync.Map

func prewarmFileCache(path string) {
	if _, loaded := prewarmedFiles.LoadOrStore(path, struct{}{}); loaded {
		return
	}
	f, err := os.Open(path)
	if err != nil {
		prewarmedFiles.Delete(path)
		return
	}
	defer f.Close()
	buf := make([]byte, 512*1024)
	_, _ = f.Read(buf)
}

func (s *Server) streamStandardFile(w http.ResponseWriter, r *http.Request, path string, modTime time.Time) {
	file, err := os.Open(path)
	if err != nil {
		http.Error(w, "File Access Denied", http.StatusForbidden)
		return
	}
	defer file.Close()

	http.ServeContent(w, r, filepath.Base(path), modTime, file)
}

// proxyStreamWithFailover manages streaming from Media Sender with dual-route failover
func (s *Server) proxyStreamWithFailover(w http.ResponseWriter, r *http.Request, mediaID string, ep *storage.StreamEndpoint) {
	// Determine target URL based on active route
	primaryTarget := ep.PrimaryURL
	fallbackTarget := ep.FallbackURL

	targetURL := primaryTarget
	if ep.ActiveRoute == "fallback" && fallbackTarget != "" {
		targetURL = fallbackTarget
	}

	resp, chosenURL, err := s.executeUpstreamRequest(r, targetURL)
	if err != nil || (resp != nil && resp.StatusCode >= 500) || (resp != nil && resp.StatusCode == 404 && fallbackTarget != "" && targetURL != fallbackTarget) {
		// Attempt failover if another URL is available
		if resp != nil {
			resp.Body.Close()
		}

		alternativeURL := ""
		if targetURL == primaryTarget && fallbackTarget != "" {
			alternativeURL = fallbackTarget
		} else if targetURL == fallbackTarget && primaryTarget != "" {
			alternativeURL = primaryTarget
		}

		if alternativeURL != "" {
			log.Printf("[PROXY FAILOVER] Target %s failed (%v). Switching to %s", targetURL, err, alternativeURL)
			respAlt, chosenAlt, errAlt := s.executeUpstreamRequest(r, alternativeURL)
			if errAlt == nil && respAlt != nil && respAlt.StatusCode < 400 {
				resp = respAlt
				chosenURL = chosenAlt
				// Pin active route for future requests
				if alternativeURL == fallbackTarget {
					s.resolver.PinActiveRoute(mediaID, "fallback")
				} else {
					s.resolver.PinActiveRoute(mediaID, "primary")
				}
			} else {
				if respAlt != nil {
					respAlt.Body.Close()
				}
				log.Printf("[PROXY ERROR] Both primary and fallback failed for %s: %v", mediaID, errAlt)
				http.Error(w, "Bad Gateway - Remote Media Sender Stream Unavailable", http.StatusBadGateway)
				return
			}
		} else {
			log.Printf("[PROXY ERROR] Stream connection failed for %s: %v", targetURL, err)
			http.Error(w, "Bad Gateway - Remote Stream Unavailable", http.StatusBadGateway)
			return
		}
	}
	defer resp.Body.Close()

	// Forward response headers
	for k, vv := range resp.Header {
		lowerKey := strings.ToLower(k)
		if hopByHopHeaders[lowerKey] {
			continue
		}
		for _, v := range vv {
			w.Header().Add(k, v)
		}
	}

	// Ensure Content-Type is valid for GPU decoding
	ct := w.Header().Get("Content-Type")
	if ct == "" || strings.HasPrefix(ct, "application/octet-stream") {
		w.Header().Set("Content-Type", "video/mp4")
	}

	w.Header().Set("Accept-Ranges", "bytes")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Expose-Headers", "Content-Range, Accept-Ranges, Content-Length")

	w.WriteHeader(resp.StatusCode)

	if r.Method == http.MethodHead {
		return
	}

	// Stream body using sync.Pool buffer and immediate flushing
	bufPtr := s.bufferPool.Get().(*[]byte)
	buf := *bufPtr
	defer s.bufferPool.Put(bufPtr)

	flusher, hasFlusher := w.(http.Flusher)
	for {
		n, readErr := resp.Body.Read(buf)
		if n > 0 {
			_, writeErr := w.Write(buf[:n])
			if writeErr != nil {
				// Client disconnected (e.g. seek / channel change)
				break
			}
			if hasFlusher {
				flusher.Flush()
			}
		}
		if readErr != nil {
			if readErr != io.EOF {
				log.Printf("[STREAM 206] Stream ended: %v (target=%s)", readErr, chosenURL)
			}
			break
		}
	}
}

func (s *Server) executeUpstreamRequest(r *http.Request, targetURL string) (*http.Response, string, error) {
	if targetURL == "" {
		return nil, "", fmt.Errorf("empty target URL")
	}

	req, err := http.NewRequestWithContext(r.Context(), r.Method, targetURL, nil)
	if err != nil {
		return nil, targetURL, err
	}

	// Copy allowed client headers (Range, If-Range, Accept, etc.)
	for k, vv := range r.Header {
		lowerK := strings.ToLower(k)
		if lowerK == "host" || hopByHopHeaders[lowerK] {
			continue
		}
		for _, v := range vv {
			req.Header.Add(k, v)
		}
	}

	resp, err := s.streamClient.Do(req)
	return resp, targetURL, err
}
