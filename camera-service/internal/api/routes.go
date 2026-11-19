package api

import (
	"encoding/json"
	"log"
	"net/http"

	"camera-service/internal/capture"
	"camera-service/internal/cmdrunner"
	"camera-service/internal/webrtc"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin:     func(r *http.Request) bool { return true },
	ReadBufferSize:  4096,
	WriteBufferSize: 4096,
}

func NewRouter(manager *cmdrunner.CameraManager, streamMgr *webrtc.StreamManager) *http.ServeMux {
	mux := http.NewServeMux()

	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		setCORSHeaders(w)
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
	})

	mux.HandleFunc("/api/camera/list", func(w http.ResponseWriter, r *http.Request) {
		setCORSHeaders(w)
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		cams, err := manager.ListCameras()
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		_ = json.NewEncoder(w).Encode(map[string]any{"cameras": cams})
	})

	// GET /api/camera/stats — returns active capture sessions and client counts.
	// Useful for debugging: verify only 1 FFmpeg per camera, see client count.
	mux.HandleFunc("/api/camera/stats", func(w http.ResponseWriter, r *http.Request) {
		setCORSHeaders(w)
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		stats := streamMgr.GetStats()
		_ = json.NewEncoder(w).Encode(map[string]any{"streams": stats})
	})

	// GET /api/camera/resolve?name=... — returns the canonical FFmpeg name
	// for a given camera input string. Used for debugging name resolution.
	mux.HandleFunc("/api/camera/resolve", func(w http.ResponseWriter, r *http.Request) {
		setCORSHeaders(w)
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		name := r.URL.Query().Get("name")
		canonical, err := capture.ResolveCanonicalName(name)
		if err != nil {
			_ = json.NewEncoder(w).Encode(map[string]any{
				"error":   err.Error(),
				"input":   name,
				"valid":   false,
			})
			return
		}
		_ = json.NewEncoder(w).Encode(map[string]any{
			"input":     name,
			"canonical": canonical,
			"display":   capture.CanonicalToDisplayName(canonical),
			"valid":     true,
		})
	})

	mux.HandleFunc("/ws/webrtc", func(w http.ResponseWriter, r *http.Request) {
		channel := r.URL.Query().Get("channel")
		cameraName := r.URL.Query().Get("camera")

		// Validate camera name before upgrading WebSocket
		if cameraName != "" {
			if _, err := capture.ResolveCanonicalName(cameraName); err != nil {
				log.Printf("[API] Rejected WebRTC request: camera=%q err=%v", cameraName, err)
				http.Error(w, "invalid camera name: "+err.Error(), http.StatusBadRequest)
				return
			}
		}

		log.Printf("[API] WebRTC signaling request: channel=%s camera=%s", channel, cameraName)

		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			log.Printf("[API] WebSocket upgrade failed: %v", err)
			return
		}
		defer conn.Close()

		streamMgr.HandleSignaling(conn, channel, cameraName)
	})

	return mux
}

func setCORSHeaders(w http.ResponseWriter) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
}
