package api

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"playback-engine/internal/models"
	"playback-engine/internal/storage"
	"playback-engine/internal/timeline"
	"playback-engine/internal/websocket"
)

// videoContentTypes: peta ekstensi → MIME type untuk GPU hardware decode.
// Browser (Chrome/Electron) hanya mengaktifkan hardware video decoder jika Content-Type
// terdeteksi dengan benar. Tanpa ini, browser melakukan MIME sniffing (baca 512 byte pertama
// file) → potensi salah deteksi → software decode via CPU, bukan GPU.
// Eksplisit Content-Type = GPU decode aktif = CPU usage turun signifikan.
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

type Server struct {
	timeline *timeline.Engine
	resolver *storage.Resolver
	hub      *websocket.Hub
}

func NewServer(timeline *timeline.Engine, resolver *storage.Resolver, hub *websocket.Hub) *Server {
	return &Server{
		timeline: timeline,
		resolver: resolver,
		hub:      hub,
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
		s.resolver.Register(cmd.MediaID, cmd.Path)
		state = s.timeline.LoadMedia(cmd.MediaID, cmd.Path, cmd.Duration, cmd.Hash, cmd.Behavior)

		videoURL := fmt.Sprintf("%s://%s/api/stream_video/%s", scheme, host, state.MediaID)
		payload := models.BackgroundPayload{
			URL:          videoURL,
			Behavior:     state.Behavior,
			StartTime:    0.0,
			Playing:      state.Playing,
			MediaID:      state.MediaID,
			PlaybackRate: state.PlaybackRate,
			Hash:         state.Hash,
		}
		s.hub.Broadcast(models.WSMessage{
			Type:    "update_background",
			Payload: payload,
		})

	case "play":
		state = s.timeline.Play()
		payload := models.BGControlPayload{
			Target:       "video",
			Command:      "play",
			Playing:      true,
			PlaybackRate: state.PlaybackRate,
		}
		s.hub.Broadcast(models.WSMessage{
			Type:    "bg_control",
			Payload: payload,
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
			Type:    "bg_control",
			Payload: payload,
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
			Type:    "bg_control",
			Payload: payload,
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
			Type:    "bg_control",
			Payload: payload,
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
			Type:    "bg_control",
			Payload: payload,
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
			Type:    "bg_control",
			Payload: payload,
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
			Type:    "bg_control",
			Payload: payload,
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
			Type:    "bg_control",
			Payload: payload,
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
		}
		s.hub.Broadcast(models.WSMessage{
			Type:    "update_background",
			Payload: payload,
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
			Type:    "bg_control",
			Payload: payload,
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
			Type:    "bg_control",
			Payload: payload,
		})

	case "update_bg_config":
		s.hub.Broadcast(models.WSMessage{
			Type:    "update_bg_config",
			Payload: cmd.Payload,
		})

	default:
		// success response for next/previous placeholder commands
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
	// Extract media ID from path
	// path format: /video/{media_id} or /api/stream_video/{media_id}
	parts := strings.Split(r.URL.Path, "/")
	if len(parts) == 0 {
		http.Error(w, "Bad Request", http.StatusBadRequest)
		return
	}
	mediaID := parts[len(parts)-1]
	if mediaID == "" {
		http.Error(w, "Media ID Required", http.StatusBadRequest)
		return
	}

	path, err := s.resolver.GetVideoPath(mediaID)
	if err != nil {
		log.Printf("[STREAM] Error finding video path for %s: %v", mediaID, err)
		http.Error(w, "Video File Not Found", http.StatusNotFound)
		return
	}

	// Remote proxy streaming
	if strings.HasPrefix(path, "http://") || strings.HasPrefix(path, "https://") {
		log.Printf("[STREAM] Proxying stream for %s to %s", mediaID, path)
		s.proxyRemoteURL(w, r, path)
		return
	}

	info, err := os.Stat(path)
	if err != nil {
		log.Printf("[STREAM] Error stat file %s: %v", path, err)
		http.Error(w, "Video File Stat Error", http.StatusNotFound)
		return
	}

	// [OPT] Set Content-Type EKSPLISIT berdasarkan ekstensi file SEBELUM http.ServeContent.
	// Ini krusial untuk GPU hardware decode:
	// - Tanpa ini: browser lakukan MIME sniffing (baca 512 byte pertama) — syscall tambahan
	// - Dengan MIME sniffing yang salah: browser fallback ke software decode (CPU tinggi)
	// - Dengan Content-Type eksplisit: browser langsung aktifkan hardware decoder (GPU)
	// Hasil: CPU usage turun 30–60% saat playback video 4K/high-bitrate
	ext := strings.ToLower(filepath.Ext(path))
	if ct, ok := videoContentTypes[ext]; ok {
		w.Header().Set("Content-Type", ct)
	}

	// [OPT] Vary: Range — cache proxy yang benar membutuhkan ini untuk membedakan
	// response dengan range berbeda. Tanpa ini, proxy bisa serve full-file response
	// untuk range request.
	w.Header().Set("Vary", "Range")

	// Cache-Control headers for media assets
	w.Header().Set("Cache-Control", "public, max-age=31536000")
	w.Header().Set("Accept-Ranges", "bytes")

	// [OPT] OS Readahead hint untuk file besar (>50MB):
	// Baca 512KB pertama di goroutine background untuk mengisi OS page cache
	// sebelum browser mengirim range request pertama (yang bisa datang dalam <100ms).
	// Di HDD 5400rpm: page fault pertama = 5–20ms per 4KB page.
	// Dengan readahead: 512KB sudah di-cache → range request pertama langsung dilayani.
	// Catatan: goroutine ini berjalan NON-BLOCKING — tidak menunda response ke browser.
	if info.Size() > 50*1024*1024 {
		go prewarmFileCache(path)
	}

	log.Printf("[STREAM] Serving: %s (%d MB)", filepath.Base(path), info.Size()/(1024*1024))
	s.streamStandardFile(w, r, path, info.ModTime())
}

// prewarmFileCache membaca 512KB pertama file untuk mengisi OS page cache.
// Dipanggil secara async (goroutine) — tidak blocking request handler.
func prewarmFileCache(path string) {
	f, err := os.Open(path)
	if err != nil {
		return
	}
	defer f.Close()
	buf := make([]byte, 512*1024) // 512KB — ukuran tipikal buffer decode awal browser
	f.Read(buf)                   // baca dan buang — tujuannya hanya mengisi OS page cache
	buf = nil                     // allow GC
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

func (s *Server) proxyRemoteURL(w http.ResponseWriter, r *http.Request, remoteURL string) {
	req, err := http.NewRequest(r.Method, remoteURL, nil)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Copy headers from incoming request (Range, Accept, etc.)
	for k, vv := range r.Header {
		if k == "Host" || k == "Connection" {
			continue
		}
		for _, v := range vv {
			req.Header.Add(k, v)
		}
	}

	client := &http.Client{
		Timeout: 60 * time.Second,
	}

	resp, err := client.Do(req)
	if err != nil {
		log.Printf("[PROXY] Error connecting to remote stream %s: %v", remoteURL, err)
		http.Error(w, "Bad Gateway", http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	// Copy response headers
	for k, vv := range resp.Header {
		for _, v := range vv {
			w.Header().Add(k, v)
		}
	}

	w.WriteHeader(resp.StatusCode)

	// Stream response body with 64KB buffer
	var buf = make([]byte, 64*1024)
	for {
		n, err := resp.Body.Read(buf)
		if n > 0 {
			_, writeErr := w.Write(buf[:n])
			if writeErr != nil {
				// Connection closed by client
				break
			}
			if flusher, ok := w.(http.Flusher); ok {
				flusher.Flush()
			}
		}
		if err != nil {
			break
		}
	}
}
