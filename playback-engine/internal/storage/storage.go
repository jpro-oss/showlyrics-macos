package storage

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
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

type Resolver struct {
	mu           sync.RWMutex
	mediaMap     map[string]string      // media_id → file_path
	// [OPT] validatedSet: cache untuk path yang sudah terkonfirmasi exist via os.Stat().
	// Saat browser seek, ada 4–8 range request paralel — setiap request memanggil GetVideoPath()
	// yang sebelumnya selalu os.Stat() ulang. Di HDD 5400rpm, Stat() ≈ 1–5ms per call.
	// Dengan validatedSet, hanya Stat() sekali per path — request berikutnya skip langsung.
	validatedSet map[string]struct{}     // path yang sudah dikonfirmasi exist
}

func NewResolver() *Resolver {
	return &Resolver{
		mediaMap:     make(map[string]string),
		validatedSet: make(map[string]struct{}),
	}
}

// Register caches a mapping in memory
func (r *Resolver) Register(mediaID, path string) {
	r.mu.Lock()
	defer r.mu.Unlock()

	// Jika path berubah untuk mediaID yang sama, invalidate validated cache lama
	if oldPath, exists := r.mediaMap[mediaID]; exists && oldPath != path {
		delete(r.validatedSet, oldPath)
	}
	r.mediaMap[mediaID] = path
}

// GetVideoPath returns the absolute path of a video file for mediaID
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

	dbPath := filepath.Join(home, "Documents", "WorshipEngineData", "backgrounds.json")
	if _, err := os.Stat(dbPath); os.IsNotExist(err) {
		return "", fmt.Errorf("backgrounds.json does not exist at %s", dbPath)
	}

	data, err := os.ReadFile(dbPath)
	if err != nil {
		return "", fmt.Errorf("failed to read backgrounds.json: %w", err)
	}

	var db BackgroundsDB
	if err := json.Unmarshal(data, &db); err != nil {
		// Try parsing a flat map if the structural parsing failed
		var flatMap map[string]interface{}
		if errFlat := json.Unmarshal(data, &flatMap); errFlat == nil {
			// Check if it's a flat structure of mediaID -> info
			if infoVal, exists := flatMap[mediaID]; exists {
				if infoMap, ok := infoVal.(map[string]interface{}); ok {
					if fp, ok := infoMap["file_path"].(string); ok && fp != "" {
						return fp, nil
					}
					if vp, ok := infoMap["video_path"].(string); ok && vp != "" {
						return vp, nil
					}
				}
			}
		}
		return "", fmt.Errorf("failed to unmarshal JSON: %w", err)
	}

	// Look in Items map
	if db.Items != nil {
		if info, ok := db.Items[mediaID]; ok {
			path := info.FilePath
			if path == "" {
				path = info.VideoPath
			}
			if path != "" {
				return path, nil
			}
		}
	}

	// Look in Videos map (old schema compatibility)
	if db.Videos != nil {
		if info, ok := db.Videos[mediaID]; ok {
			path := info.VideoPath
			if path == "" {
				path = info.FilePath
			}
			if path != "" {
				return path, nil
			}
		}
	}

	return "", fmt.Errorf("media ID %s not found in backgrounds database", mediaID)
}
