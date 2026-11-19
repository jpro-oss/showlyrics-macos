package storage

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
)

type MediaInfo struct {
	FilePath  string  `json:"file_path"`
	VideoPath string  `json:"video_path"` // support old schema key
	Duration  float64 `json:"duration"`
	Hash      string  `json:"hash"`
}

type BackgroundsDB struct {
	Videos map[string]MediaInfo `json:"videos"`
	Items  map[string]MediaInfo `json:"items"`
}

// StreamEndpoint stores multi-route streaming details for remote media
type StreamEndpoint struct {
	PrimaryURL  string  `json:"primary_url"`
	FallbackURL string  `json:"fallback_url"`
	ActiveRoute string  `json:"active_route"` // "primary" or "fallback"
	IsRemote    bool    `json:"is_remote"`
	Duration    float64 `json:"duration"`
}

type Resolver struct {
	mu           sync.RWMutex
	mediaMap     map[string]string          // media_id → file_path or active URL
	endpoints    map[string]*StreamEndpoint // media_id → StreamEndpoint (remote sender)
	validatedSet map[string]struct{}        // path yang sudah dikonfirmasi exist via os.Stat
}

func NewResolver() *Resolver {
	return &Resolver{
		mediaMap:     make(map[string]string),
		endpoints:    make(map[string]*StreamEndpoint),
		validatedSet: make(map[string]struct{}),
	}
}

// Register caches a mapping in memory (backward compatible)
func (r *Resolver) Register(mediaID, path string) {
	r.mu.Lock()
	defer r.mu.Unlock()

	// Jika path berubah untuk mediaID yang sama, invalidate validated cache lama
	if oldPath, exists := r.mediaMap[mediaID]; exists && oldPath != path {
		delete(r.validatedSet, oldPath)
	}
	r.mediaMap[mediaID] = path

	isRemote := strings.HasPrefix(path, "http://") || strings.HasPrefix(path, "https://")
	if isRemote {
		if ep, exists := r.endpoints[mediaID]; exists {
			ep.PrimaryURL = path
			ep.ActiveRoute = "primary"
		} else {
			r.endpoints[mediaID] = &StreamEndpoint{
				PrimaryURL:  path,
				ActiveRoute: "primary",
				IsRemote:    true,
			}
		}
	}
}

// RegisterRemote caches a remote streaming media with dual routes
func (r *Resolver) RegisterRemote(mediaID, primaryURL, fallbackURL string, duration float64) {
	r.mu.Lock()
	defer r.mu.Unlock()

	if oldPath, exists := r.mediaMap[mediaID]; exists && oldPath != primaryURL {
		delete(r.validatedSet, oldPath)
	}

	activeURL := primaryURL
	if activeURL == "" {
		activeURL = fallbackURL
	}
	r.mediaMap[mediaID] = activeURL

	r.endpoints[mediaID] = &StreamEndpoint{
		PrimaryURL:  primaryURL,
		FallbackURL: fallbackURL,
		ActiveRoute: "primary",
		IsRemote:    true,
		Duration:    duration,
	}
}

// GetEndpoint retrieves the StreamEndpoint for mediaID if registered
func (r *Resolver) GetEndpoint(mediaID string) (*StreamEndpoint, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	ep, ok := r.endpoints[mediaID]
	if !ok || ep == nil {
		return nil, false
	}
	// Return a copy to be race-safe
	cp := *ep
	return &cp, true
}

// PinActiveRoute pins either "primary" or "fallback" as the confirmed working route
func (r *Resolver) PinActiveRoute(mediaID, route string) {
	r.mu.Lock()
	defer r.mu.Unlock()

	ep, ok := r.endpoints[mediaID]
	if !ok || ep == nil {
		return
	}

	ep.ActiveRoute = route
	if route == "fallback" && ep.FallbackURL != "" {
		r.mediaMap[mediaID] = ep.FallbackURL
	} else if ep.PrimaryURL != "" {
		r.mediaMap[mediaID] = ep.PrimaryURL
	}
}

// UpdateDuration updates the duration for a registered media
func (r *Resolver) UpdateDuration(mediaID string, duration float64) {
	r.mu.Lock()
	defer r.mu.Unlock()

	if ep, ok := r.endpoints[mediaID]; ok && ep != nil {
		ep.Duration = duration
	}
}

// GetVideoPath returns the absolute path or active streaming URL of a video file for mediaID
func (r *Resolver) GetVideoPath(mediaID string) (string, error) {
	r.mu.RLock()
	path, ok := r.mediaMap[mediaID]
	_, alreadyValidated := r.validatedSet[path]
	r.mu.RUnlock()

	if ok && path != "" {
		// Remote URL: tidak perlu Stat()
		if strings.HasPrefix(path, "http://") || strings.HasPrefix(path, "https://") {
			return path, nil
		}

		// [OPT] Path sudah pernah di-Stat dan valid — skip syscall
		if alreadyValidated {
			return path, nil
		}

		// Pertama kali — lakukan Stat() dan simpan ke validatedSet jika exist
		if _, err := os.Stat(path); err == nil {
			r.mu.Lock()
			r.validatedSet[path] = struct{}{}
			r.mu.Unlock()
			return path, nil
		}
	}

	// Try reading from database file
	resolved, err := r.resolveFromDB(mediaID)
	if err != nil {
		return "", err
	}

	r.Register(mediaID, resolved)

	// Validasi dan masukkan ke validatedSet setelah resolve dari DB
	if !strings.HasPrefix(resolved, "http://") && !strings.HasPrefix(resolved, "https://") {
		if _, err := os.Stat(resolved); err == nil {
			r.mu.Lock()
			r.validatedSet[resolved] = struct{}{}
			r.mu.Unlock()
		}
	}

	return resolved, nil
}

func (r *Resolver) resolveFromDB(mediaID string) (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", fmt.Errorf("could not get home dir: %w", err)
	}

	// Candidates list for Tri-Source DB discovery:
	// 1. macOS ShowLyrics data path
	// 2. Windows ShowLyrics WorshipEngineData path
	// 3. ShowLyrics Media Sender data path (showlyricssender)
	var candidates []string
	if runtime.GOOS == "darwin" {
		candidates = append(candidates,
			filepath.Join(home, "Library", "Application Support", "ShowLyrics", "backgrounds.json"),
			filepath.Join(home, "Documents", "WorshipEngineData", "backgrounds.json"),
			filepath.Join(home, "Documents", "showlyricssender", "videos_db.json"),
		)
	} else {
		candidates = append(candidates,
			filepath.Join(home, "Documents", "WorshipEngineData", "backgrounds.json"),
			filepath.Join(home, "Documents", "showlyricssender", "videos_db.json"),
			filepath.Join(home, "Library", "Application Support", "ShowLyrics", "backgrounds.json"),
		)
	}

	for _, dbPath := range candidates {
		if _, err := os.Stat(dbPath); err != nil {
			continue
		}

		data, err := os.ReadFile(dbPath)
		if err != nil {
			continue
		}

		// 1. Check if it's backgrounds.json (ShowLyrics App)
		var db BackgroundsDB
		if err := json.Unmarshal(data, &db); err == nil {
			if db.Items != nil {
				if info, ok := db.Items[mediaID]; ok {
					p := info.FilePath
					if p == "" {
						p = info.VideoPath
					}
					if p != "" {
						return p, nil
					}
				}
			}
			if db.Videos != nil {
				if info, ok := db.Videos[mediaID]; ok {
					p := info.VideoPath
					if p == "" {
						p = info.FilePath
					}
					if p != "" {
						return p, nil
					}
				}
			}
		}

		// 2. Check if it's videos_db.json (ShowLyrics Media Sender) or flat map
		var rawMap map[string]interface{}
		if errRaw := json.Unmarshal(data, &rawMap); errRaw == nil {
			// Check if there is an "items" dict
			if itemsVal, exists := rawMap["items"]; exists {
				if itemsMap, ok := itemsVal.(map[string]interface{}); ok {
					if itemVal, itemExists := itemsMap[mediaID]; itemExists {
						if itemObj, ok := itemVal.(map[string]interface{}); ok {
							if p, ok := itemObj["path"].(string); ok && p != "" {
								return p, nil
							}
							if p, ok := itemObj["file_path"].(string); ok && p != "" {
								return p, nil
							}
							if p, ok := itemObj["video_path"].(string); ok && p != "" {
								return p, nil
							}
						}
					}
				}
			}

			// Check direct flat mapping mediaID -> item
			if infoVal, exists := rawMap[mediaID]; exists {
				if infoMap, ok := infoVal.(map[string]interface{}); ok {
					if p, ok := infoMap["path"].(string); ok && p != "" {
						return p, nil
					}
					if p, ok := infoMap["file_path"].(string); ok && p != "" {
						return p, nil
					}
					if p, ok := infoMap["video_path"].(string); ok && p != "" {
						return p, nil
					}
				}
			}
		}
	}

	return "", fmt.Errorf("media ID %s not found in any backgrounds database", mediaID)
}
