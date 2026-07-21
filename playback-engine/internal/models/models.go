package models

// TimelineState represents the mathematical playback timeline
type TimelineState struct {
	MediaID        string  `json:"media_id"`
	Playing        bool    `json:"playing"`
	StartedAt      int64   `json:"started_at"`      // ms since Epoch
	PausedPosition float64 `json:"paused_position"` // seconds
	PlaybackRate   float64 `json:"playback_rate"`
	Duration       float64 `json:"duration"`
	Volume         float64 `json:"volume"`
	Muted          bool    `json:"muted"`
	SessionID      string  `json:"session_id"`
	Hash           string  `json:"hash"`
	Behavior       string  `json:"behavior"` // "loop", "once_clear", etc.
}

// WSMessage is the generic wrapper for messages sent to clients
type WSMessage struct {
	Type           string      `json:"type,omitempty"`
	Action         string      `json:"action,omitempty"`
	Payload        interface{} `json:"payload,omitempty"`
	MediaID        string      `json:"media_id,omitempty"`
	ServerTime     int64       `json:"server_time,omitempty"`
	Position       float64     `json:"position,omitempty"`
	Playing        bool        `json:"playing,omitempty"`
	PlaybackRate   float64     `json:"playback_rate,omitempty"`
	Nonce          string      `json:"_nonce,omitempty"`
	// [OPT] NetworkAdvance: estimasi half-RTT (detik) untuk kompensasi latency WebSocket.
	// Client JS menambahkan nilai ini ke target position saat sync, sehingga video
	// sedikit "proaktif" daripada terlambat. Ini mengurangi visual lag di output display.
	// Nilai default: 0.025 (25ms) — tipikal half-RTT jaringan lokal.
	NetworkAdvance float64     `json:"network_advance,omitempty"`
}

// WSClientMessage represents messages received from WebSocket clients
type WSClientMessage struct {
	Action   string      `json:"action"`
	ClientTS int64       `json:"client_ts,omitempty"`
	Payload  interface{} `json:"payload,omitempty"`
}

// BackgroundPayload defines the payload for update_background WebSocket broadcast
type BackgroundPayload struct {
	URL          string  `json:"url"`
	Behavior     string  `json:"behavior"`
	StartTime    float64 `json:"start_time"`
	Playing      bool    `json:"playing"`
	MediaID      string  `json:"media_id"`
	PlaybackRate float64 `json:"playback_rate"`
	Hash         string  `json:"hash"`
}

// BGControlPayload defines the payload for bg_control WS events
type BGControlPayload struct {
	Target       string  `json:"target"`
	Command      string  `json:"command"`
	Value        interface{} `json:"value,omitempty"`
	Playing      bool    `json:"playing"`
	PlaybackRate float64 `json:"playback_rate"`
}

// CacheStatusPayload is what client reports back to WS about video precaching
type CacheStatusPayload struct {
	VideoID string `json:"video_id"`
	Status  string `json:"status"` // "ready", "downloading", "error"
}

// CommandRequest represents the JSON body received at POST /command
type CommandRequest struct {
	Action       string      `json:"action"`
	MediaID      string      `json:"media_id,omitempty"`
	Path         string      `json:"path,omitempty"`
	Duration     float64     `json:"duration,omitempty"`
	Hash         string      `json:"hash,omitempty"`
	Behavior     string      `json:"behavior,omitempty"`
	Value        interface{} `json:"value,omitempty"`
	PlaybackRate float64     `json:"playback_rate,omitempty"`
	Payload      interface{} `json:"payload,omitempty"`
}
