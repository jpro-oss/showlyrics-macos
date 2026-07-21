package timeline

import (
	"crypto/rand"
	"encoding/hex"
	"math"
	"sync"
	"time"

	"playback-engine/internal/models"
)

type Engine struct {
	mu    sync.RWMutex
	state models.TimelineState
}

func NewEngine() *Engine {
	e := &Engine{
		state: models.TimelineState{
			Playing:      false,
			PlaybackRate: 1.0,
			Volume:       100.0,
			Muted:        true,
		},
	}
	// [PERF-FIX] Mulai goroutine terpisah untuk expiry check.
	// Sebelumnya checkAndHandleExpiration() dipanggil dari GetState() yang menggunakan
	// Lock() eksklusif. Ini memblokir SEMUA API request (play, pause, seek, load)
	// selama heartbeat berlangsung setiap 500ms.
	// Solusi: expiry check berjalan di goroutine sendiri setiap 500ms dengan write lock
	// singkat, sementara GetState() dan GetPosition() beralih ke RLock() yang bisa
	// berjalan concurrent tanpa saling blokir.
	go e.startExpirationChecker()
	return e
}

// startExpirationChecker berjalan sebagai goroutine terpisah — periodik cek expiry.
// Ini membebaskan GetState() dari keharusan menggunakan write lock.
func (e *Engine) startExpirationChecker() {
	ticker := time.NewTicker(500 * time.Millisecond)
	defer ticker.Stop()
	for range ticker.C {
		e.mu.Lock()
		e.checkAndHandleExpiration(time.Now().UnixNano() / int64(time.Millisecond))
		e.mu.Unlock()
	}
}

// GetState returns a snapshot of the current state, calculating dynamic position.
// [PERF-FIX] Menggunakan RLock() — bisa berjalan concurrent dengan goroutine lain.
// Expiry check tidak lagi dilakukan di sini — sudah dipindah ke startExpirationChecker().
func (e *Engine) GetState() models.TimelineState {
	e.mu.RLock()
	defer e.mu.RUnlock()

	state := e.state
	state.PausedPosition = e.calculatePositionAt(time.Now().UnixNano() / int64(time.Millisecond))
	return state
}

// GetPosition returns the current position in seconds.
// [PERF-FIX] Menggunakan RLock() — tidak lagi memblokir write operations.
func (e *Engine) GetPosition() float64 {
	e.mu.RLock()
	defer e.mu.RUnlock()

	return e.calculatePositionAt(time.Now().UnixNano() / int64(time.Millisecond))
}

// Internal position calculation (expects caller to hold lock or be called safely)
func (e *Engine) calculatePositionAt(nowMs int64) float64 {
	if !e.state.Playing {
		return math.Round(e.state.PausedPosition*1000) / 1000.0
	}
	elapsedSec := float64(nowMs-e.state.StartedAt) / 1000.0
	pos := e.state.PausedPosition + elapsedSec*e.state.PlaybackRate
	if e.state.Duration > 0 {
		if e.state.Behavior == "loop" || e.state.Behavior == "" {
			pos = math.Mod(pos, e.state.Duration)
		} else {
			if pos >= e.state.Duration {
				pos = e.state.Duration
			}
		}
	}
	if pos < 0 {
		pos = 0
	}
	return math.Round(pos*1000) / 1000.0
}

// checkAndHandleExpiration hanya dipanggil dari startExpirationChecker() dengan write lock.
func (e *Engine) checkAndHandleExpiration(nowMs int64) {
	if !e.state.Playing || e.state.Duration <= 0 {
		return
	}
	if e.state.Behavior == "loop" || e.state.Behavior == "" {
		return
	}
	elapsedSec := float64(nowMs-e.state.StartedAt) / 1000.0
	pos := e.state.PausedPosition + elapsedSec*e.state.PlaybackRate
	if pos >= e.state.Duration {
		e.state.Playing = false
		e.state.PausedPosition = e.state.Duration
	}
}

// SetBehavior updates the behavior dynamically
func (e *Engine) SetBehavior(behavior string) models.TimelineState {
	e.mu.Lock()
	defer e.mu.Unlock()

	e.state.Behavior = behavior
	if behavior == "" {
		e.state.Behavior = "loop"
	}
	e.checkAndHandleExpiration(time.Now().UnixNano() / int64(time.Millisecond))
	return e.state
}

// LoadMedia resets state and loads new media
func (e *Engine) LoadMedia(mediaID, path string, duration float64, hash, behavior string) models.TimelineState {
	e.mu.Lock()
	defer e.mu.Unlock()

	now := time.Now().UnixNano() / int64(time.Millisecond)
	e.state.MediaID = mediaID
	e.state.Duration = duration
	e.state.Hash = hash
	e.state.Behavior = behavior
	if behavior == "" {
		e.state.Behavior = "loop"
	}
	e.state.Playing = true
	e.state.StartedAt = now
	e.state.PausedPosition = 0.0
	e.state.PlaybackRate = 1.0
	e.state.SessionID = generateSessionID()

	return e.state
}

// Play starts timeline execution from current position
func (e *Engine) Play() models.TimelineState {
	e.mu.Lock()
	defer e.mu.Unlock()

	if !e.state.Playing {
		e.state.Playing = true
		e.state.StartedAt = time.Now().UnixNano() / int64(time.Millisecond)
	}
	return e.state
}

// Pause suspends timeline execution and saves the current position
func (e *Engine) Pause() models.TimelineState {
	e.mu.Lock()
	defer e.mu.Unlock()

	if e.state.Playing {
		now := time.Now().UnixNano() / int64(time.Millisecond)
		e.state.PausedPosition = e.calculatePositionAt(now)
		e.state.Playing = false
	}
	return e.state
}

// Replay restarts timeline from 0
func (e *Engine) Replay() models.TimelineState {
	e.mu.Lock()
	defer e.mu.Unlock()

	e.state.Playing = true
	e.state.StartedAt = time.Now().UnixNano() / int64(time.Millisecond)
	e.state.PausedPosition = 0.0
	return e.state
}

// Seek sets current position to target seconds
func (e *Engine) Seek(target float64) models.TimelineState {
	e.mu.Lock()
	defer e.mu.Unlock()

	if target < 0 {
		target = 0
	}
	if e.state.Duration > 0 && target > e.state.Duration {
		if e.state.Behavior == "loop" {
			target = math.Mod(target, e.state.Duration)
		} else {
			target = e.state.Duration
		}
	}

	e.state.PausedPosition = target
	if e.state.Playing {
		e.state.StartedAt = time.Now().UnixNano() / int64(time.Millisecond)
	}
	return e.state
}

// Stop resets media state
func (e *Engine) Stop() models.TimelineState {
	e.mu.Lock()
	defer e.mu.Unlock()

	e.state.MediaID = ""
	e.state.Playing = false
	e.state.PausedPosition = 0.0
	e.state.StartedAt = 0
	e.state.Duration = 0.0
	e.state.SessionID = ""
	e.state.Hash = ""
	e.state.Behavior = ""

	return e.state
}

// SetVolume updates timeline volume settings
func (e *Engine) SetVolume(volume float64) models.TimelineState {
	e.mu.Lock()
	defer e.mu.Unlock()
	e.state.Volume = volume
	return e.state
}

// SetMute sets muting setting
func (e *Engine) SetMute(muted bool) models.TimelineState {
	e.mu.Lock()
	defer e.mu.Unlock()
	e.state.Muted = muted
	return e.state
}

// SetPlaybackRate adjusts playback multiplier
func (e *Engine) SetPlaybackRate(rate float64) models.TimelineState {
	e.mu.Lock()
	defer e.mu.Unlock()

	if rate <= 0 {
		rate = 1.0
	}
	now := time.Now().UnixNano() / int64(time.Millisecond)
	e.state.PausedPosition = e.calculatePositionAt(now)
	e.state.PlaybackRate = rate
	e.state.StartedAt = now
	return e.state
}

func generateSessionID() string {
	b := make([]byte, 8)
	if _, err := rand.Read(b); err != nil {
		return "session_default"
	}
	return "sess_" + hex.EncodeToString(b)
}
