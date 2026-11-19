package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"camera-service/internal/api"
	"camera-service/internal/cmdrunner"
	"camera-service/internal/webrtc"
)

func main() {
	log.Println("[CAMERA-SERVICE] Starting WebRTC camera service")

	manager := cmdrunner.NewCameraManager()
	streamMgr := webrtc.NewStreamManager(manager)
	router := api.NewRouter(manager, streamMgr)

	port := os.Getenv("CAMERA_SVC_PORT")
	if port == "" {
		port = "18901"
	}

	srv := &http.Server{
		Addr:              "127.0.0.1:" + port,
		Handler:           router,
		ReadHeaderTimeout: 10 * time.Second,
		IdleTimeout:       120 * time.Second,
	}

	go func() {
		sigChan := make(chan os.Signal, 1)
		signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)
		<-sigChan
		log.Println("[CAMERA-SERVICE] Shutting down")
		streamMgr.CloseAll()
		manager.StopAll()
		ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		defer cancel()
		_ = srv.Shutdown(ctx)
	}()

	log.Printf("[CAMERA-SERVICE] Ready on http://127.0.0.1:%s", port)
	if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("[CAMERA-SERVICE] Server error: %v", err)
	}
}
