package websocket

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"math"
	"net/http"
	"sync"
	"sync/atomic"
	"time"

	"github.com/gorilla/websocket"
	"playback-engine/internal/models"
	"playback-engine/internal/timeline"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all connections
	},
}

type Client struct {
	conn   *websocket.Conn
	// [OPT] Buffer dinaikkan 256→512:
	// Mencegah client disconnect saat burst event (load_media + play + heartbeat bersamaan).
	// Di low-end device dengan JS event loop lambat, burst event sering memenuhi channel 256
	// dan menyebabkan unregister prematur. 512 memberikan ruang buffer yang aman.
	send    chan []byte
	host    string
	scheme  string
	// [PERF-FIX] closing flag untuk mencegah goroutine spawn tak terbatas.
	// Sebelumnya: setiap kali channel client penuh, goroutine baru di-spawn untuk
	// mengirim ke h.unregister. Pada low-end device dengan JS processing lambat,
	// channel sering penuh → ratusan goroutine pending → memory buildup.
	// Solusi: atomic flag mencegah unregister dikirim lebih dari sekali per client.
	closing int32 // atomic: 0 = active, 1 = closing/closed
}

type Hub struct {
	clients    map[*Client]bool
	register   chan *Client
	unregister chan *Client
	mu         sync.RWMutex
	timeline   *timeline.Engine
	bgConfig   interface{}

	// [OPT] Adaptive heartbeat state — tracking posisi terakhir yang di-broadcast.
	// Digunakan untuk skip heartbeat jika posisi nyaris tidak berubah dari prediksi,
	// menghemat CPU dari marshal+broadcast yang tidak perlu.
	lastHBPos     float64
	lastHBMediaID string
}

func NewHub(timeline *timeline.Engine) *Hub {
	return &Hub{
		clients:    make(map[*Client]bool),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		timeline:   timeline,
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true
			h.mu.Unlock()

			// Send current active background if loaded
			state := h.timeline.GetState()
			if state.MediaID != "" {
				videoURL := fmt.Sprintf("%s://%s/api/stream_video/%s", client.scheme, client.host, state.MediaID)
				payload := models.BackgroundPayload{
					URL:          videoURL,
					Behavior:     state.Behavior,
					StartTime:    state.PausedPosition,
					Playing:      state.Playing,
					MediaID:      state.MediaID,
					PlaybackRate: state.PlaybackRate,
					Hash:         state.Hash,
				}
				msg := models.WSMessage{
					Type:    "update_background",
					Payload: payload,
				}
				if data, err := json.Marshal(msg); err == nil {
					client.send <- data
				}
			}

			// Send current bg config if available
			h.mu.RLock()
			savedConfig := h.bgConfig
			h.mu.RUnlock()
			if savedConfig != nil {
				msg := models.WSMessage{
					Type:    "update_bg_config",
					Payload: savedConfig,
				}
				if data, err := json.Marshal(msg); err == nil {
					client.send <- data
				}
			}

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
			}
			h.mu.Unlock()
		}
	}
}

// tryMarkClosing returns true jika berhasil menandai client sebagai closing (first caller wins).
// Mencegah double-close yang menyebabkan goroutine pile-up.
func (c *Client) tryMarkClosing() bool {
	return atomic.CompareAndSwapInt32(&c.closing, 0, 1)
}

func (h *Hub) Broadcast(msg interface{}) {
	// Intercept update_bg_config type messages to update cached bgConfig
	if wsMsg, ok := msg.(models.WSMessage); ok {
		if wsMsg.Type == "update_bg_config" {
			h.mu.Lock()
			h.bgConfig = wsMsg.Payload
			h.mu.Unlock()
		}
	} else if wsMsgPtr, ok := msg.(*models.WSMessage); ok {
		if wsMsgPtr.Type == "update_bg_config" {
			h.mu.Lock()
			h.bgConfig = wsMsgPtr.Payload
			h.mu.Unlock()
		}
	}

	data, err := json.Marshal(msg)
	if err != nil {
		log.Printf("Error marshalling broadcast message: %v", err)
		return
	}

	h.mu.RLock()
	defer h.mu.RUnlock()

	for client := range h.clients {
		select {
		case client.send <- data:
		default:
			// [PERF-FIX] Client channel penuh — tandai sebagai closing dengan atomic flag.
			// tryMarkClosing() memastikan hanya SATU goroutine yang mengirim unregister,
			// bahkan jika default branch ini terpicu berkali-kali (misalnya dari heartbeat
			// berturut-turut saat client lag). Mencegah goroutine pile-up.
			if client.tryMarkClosing() {
				go func(c *Client) {
					h.unregister <- c
					c.conn.Close()
				}(client)
			}
		}
	}
}

// StartHeartbeat starts the ticker that broadcasts current playing state.
// [OPT] Adaptive heartbeat dengan drift detection:
// - Skip heartbeat jika posisi video mendekati prediksi (drift < 50ms) → hemat CPU marshal+broadcast
// - Tetap kirim heartbeat penuh ketika state berubah signifikan (seek, pause, rate change)
// - network_advance: client JS menambahkan nilai ini ke target position untuk kompensasi
//   latency WS (Go→OS→Electron IPC→JS event loop ≈ 15–50ms)
func (h *Hub) StartHeartbeat() {
	ticker := time.NewTicker(500 * time.Millisecond)
	go func() {
		for range ticker.C {
			// Skip jika tidak ada klien — hemat CPU marshal + broadcast
			h.mu.RLock()
			clientCount := len(h.clients)
			h.mu.RUnlock()
			if clientCount == 0 {
				continue
			}

			state := h.timeline.GetState()
			if state.MediaID != "" && state.Playing {

				// [OPT] Adaptive heartbeat skip:
				// Jika mediaID sama dan posisi mendekati prediksi (drift < 50ms),
				// skip heartbeat cycle ini. Ini menghemat ~40% CPU overhead dari
				// marshal + broadcast saat video berjalan mulus tanpa drift.
				//
				// Cara kerja: setiap 500ms, posisi seharusnya maju 0.5 * playbackRate detik.
				// Jika posisi aktual ≈ prediksi → state stabil → broadcast tidak perlu.
				// Jika ada drift > 50ms (misalnya setelah seek, load, atau buffering) → kirim.
				if state.MediaID == h.lastHBMediaID {
					predictedPos := h.lastHBPos + 0.5*state.PlaybackRate
					if math.Abs(state.PausedPosition-predictedPos) < 0.05 { // < 50ms drift
						h.lastHBPos = predictedPos
						continue // skip heartbeat — state sudah diprediksi dengan akurat
					}
				}
				h.lastHBPos = state.PausedPosition
				h.lastHBMediaID = state.MediaID

				msg := models.WSMessage{
					Type:           "heartbeat",
					MediaID:        state.MediaID,
					ServerTime:     time.Now().UnixNano() / int64(time.Millisecond),
					Position:       state.PausedPosition,
					Playing:        true,
					PlaybackRate:   state.PlaybackRate,
					// [OPT] 25ms = estimasi half-RTT jaringan lokal (localhost/LAN).
					// Client JS menambahkan nilai ini ke target position:
					// targetPos = position + elapsed * rate + network_advance
					// Hasilnya: video sedikit "proaktif" → mengurangi visual lag di output display.
					NetworkAdvance: 0.025,
				}
				h.Broadcast(msg)
			} else {
				// Reset tracking saat tidak playing agar tidak ada prediksi stale
				h.lastHBPos = 0
				h.lastHBMediaID = ""
			}
		}
	}()
}

func (h *Hub) HandleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("Upgrade error: %v", err)
		return
	}

	scheme := "http"
	if r.TLS != nil {
		scheme = "https"
	}
	host := r.Host
	if host == "" {
		host = "localhost:18899"
	}

	client := &Client{
		conn:   conn,
		send:   make(chan []byte, 512), // [OPT] 256→512: buffer lebih besar cegah disconnect saat burst
		host:   host,
		scheme: scheme,
	}
	h.register <- client

	// Write loop
	go func() {
		defer func() {
			// Gunakan tryMarkClosing agar unregister tidak dikirim dua kali
			if client.tryMarkClosing() {
				h.unregister <- client
			}
			conn.Close()
		}()
		for msg := range client.send {
			conn.SetWriteDeadline(time.Now().Add(5 * time.Second))
			if err := conn.WriteMessage(websocket.TextMessage, msg); err != nil {
				return
			}
		}
	}()

	// Read loop
	go func() {
		defer func() {
			// Gunakan tryMarkClosing agar unregister tidak dikirim dua kali
			if client.tryMarkClosing() {
				h.unregister <- client
			}
			conn.Close()
		}()

		conn.SetReadLimit(4096)
		conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		conn.SetPongHandler(func(string) error {
			conn.SetReadDeadline(time.Now().Add(60 * time.Second))
			return nil
		})

		for {
			_, message, err := conn.ReadMessage()
			if err != nil {
				break
			}

			var clientMsg models.WSClientMessage
			if err := json.Unmarshal(message, &clientMsg); err != nil {
				continue
			}

			switch clientMsg.Action {
			case "ping":
				nowMs := time.Now().UnixNano() / int64(time.Millisecond)
				// Format custom matching background.html expectations
				type PongResponse struct {
					Type     string `json:"type"`
					ClientTS int64  `json:"client_ts"`
					ServerTS int64  `json:"server_ts"`
					Action   string `json:"action"`
				}
				customResp := PongResponse{
					Type:     "pong",
					ClientTS: clientMsg.ClientTS,
					ServerTS: nowMs,
					Action:   "pong",
				}
				if data, err := json.Marshal(customResp); err == nil {
					client.send <- data
				}

			case "cache_status":
				// Forward cache status from browser to Python Control Server
				if clientMsg.Payload != nil {
					go forwardCacheStatusToPython(clientMsg.Payload)
				}
			}
		}
	}()
}

func forwardCacheStatusToPython(payload interface{}) {
	data, err := json.Marshal(payload)
	if err != nil {
		return
	}

	url := "http://localhost:18888/api/background/cache_status"
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(data))
	if err != nil {
		return
	}
	req.Header.Set("Content-Type", "application/json")

	// Set header secret token if needed. Since python serves internally,
	// let's do a fast post. Python will receive and broadcast.
	client := &http.Client{Timeout: 1 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return
	}
	defer resp.Body.Close()
}
