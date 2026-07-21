package main

import (
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"playback-engine/internal/api"
	"playback-engine/internal/storage"
	"playback-engine/internal/timeline"
	"playback-engine/internal/websocket"
)

func main() {
	log.Println("[ENGINE] Starting ShowLyrics Playback Engine...")

	// 1. Initialize Engines & Core Components
	timelineEngine := timeline.NewEngine()
	storageResolver := storage.NewResolver()
	wsHub := websocket.NewHub(timelineEngine)

	// 2. Start WebSocket Hub Run Loop
	go wsHub.Run()

	// 3. Start Heartbeat Broadcaster (Ticker every 500ms)
	wsHub.StartHeartbeat()

	// 4. Initialize HTTP Server
	server := api.NewServer(timelineEngine, storageResolver, wsHub)
	mux := server.SetupRoutes()

	// 5. Setup Signal Interceptor for Graceful Shutdown
	go func() {
		sigChan := make(chan os.Signal, 1)
		signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)
		<-sigChan
		log.Println("[ENGINE] Shutting down ShowLyrics Playback Engine...")
		os.Exit(0)
	}()

	// 6. Listen and Serve on Port 18899 or custom port
	port := os.Getenv("PLAYBACK_PORT")
	if port == "" {
		port = "18899"
	}

	// [OPT] Custom HTTP server dengan timeout tuning untuk video streaming:
	// - ReadHeaderTimeout: cegah koneksi menggantung saat header tidak terkirim
	// - IdleTimeout: cleanup koneksi keep-alive yang idle (penting untuk HDD — kurangi file handle leak)
	// - WriteTimeout SENGAJA tidak di-set: streaming video durasi panjang membutuhkan
	//   koneksi tetap terbuka selama playback (bisa >1 jam untuk loop video)
	// - MaxHeaderBytes: batasi serangan header besar
	httpServer := &http.Server{
		Addr:              ":" + port,
		Handler:           mux,
		ReadHeaderTimeout: 10 * time.Second,
		IdleTimeout:       120 * time.Second,
		MaxHeaderBytes:    1 << 20, // 1MB
	}

	log.Printf("[ENGINE] Server running on localhost:%s\n", port)
	if err := httpServer.ListenAndServe(); err != nil {
		log.Fatalf("[ENGINE] ListenAndServe error: %v", err)
	}
}
