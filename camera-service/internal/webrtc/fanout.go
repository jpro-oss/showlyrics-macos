package webrtc

import (
	"log"
	"sync"

	"github.com/pion/rtp"
)

// =============================================================
// FanoutTrack — Non-Blocking RTP Fan-Out
//
// Problem: track.WriteRTP() in Pion's TrackLocalStaticRTP is
// synchronous — if one PeerConnection's send buffer is full,
// it blocks ALL other clients from receiving frames.
//
// Solution: Each subscriber gets a small buffered channel (depth=2).
// Broadcast() does a non-blocking send to each subscriber.
// If a subscriber's channel is full, the oldest packet is dropped
// (live video policy: prefer freshness over completeness).
//
// Each subscriber has its own goroutine that reads from the channel
// and calls WriteRTP() — so a slow client only blocks itself.
// =============================================================

const subscriberQueueDepth = 2

// packetPool reduces GC pressure by reusing RTP packet payload slices.
// Estimated savings: 30-50% fewer allocations at ~1000+ packets/sec.
var packetPool = sync.Pool{
	New: func() interface{} {
		buf := make([]byte, 0, 1300) // typical RTP payload < 1200 bytes
		return &buf
	},
}

// GetPooledPayload returns a byte slice from the pool, reset to length 0.
func GetPooledPayload(size int) []byte {
	bp := packetPool.Get().(*[]byte)
	buf := *bp
	if cap(buf) < size {
		buf = make([]byte, size)
	} else {
		buf = buf[:size]
	}
	return buf
}

// PutPooledPayload returns a byte slice to the pool.
func PutPooledPayload(buf []byte) {
	if cap(buf) > 0 {
		b := buf[:0]
		packetPool.Put(&b)
	}
}

// Subscriber represents a single WebRTC PeerConnection receiving
// fan-out RTP packets from a shared capture session.
type Subscriber struct {
	id       uint64
	ch       chan *rtp.Packet
	stopChan chan struct{}
	stopped  bool
}

// FanoutTrack manages non-blocking RTP distribution to multiple subscribers.
type FanoutTrack struct {
	mu          sync.RWMutex
	subscribers map[uint64]*Subscriber
	nextID      uint64
}

// NewFanoutTrack creates a new fan-out track.
func NewFanoutTrack() *FanoutTrack {
	return &FanoutTrack{
		subscribers: make(map[uint64]*Subscriber),
	}
}

// Subscribe adds a new subscriber. The caller must provide a write function
// that will be called from the subscriber's dedicated goroutine.
// Returns the Subscriber (used for Unsubscribe).
func (ft *FanoutTrack) Subscribe(writeFn func(pkt *rtp.Packet) error) *Subscriber {
	ft.mu.Lock()
	ft.nextID++
	id := ft.nextID

	sub := &Subscriber{
		id:       id,
		ch:       make(chan *rtp.Packet, subscriberQueueDepth),
		stopChan: make(chan struct{}),
	}
	ft.subscribers[id] = sub
	count := len(ft.subscribers)
	ft.mu.Unlock()

	log.Printf("[Fanout] Subscriber %d added (total: %d)", id, count)

	// Start dedicated writer goroutine for this subscriber
	go func() {
		defer func() {
			log.Printf("[Fanout] Subscriber %d writer stopped", id)
		}()
		for {
			select {
			case pkt, ok := <-sub.ch:
				if !ok {
					return
				}
				if err := writeFn(pkt); err != nil {
					// Don't log "closed" errors — they're expected during teardown
					return
				}
			case <-sub.stopChan:
				return
			}
		}
	}()

	return sub
}

// Unsubscribe removes a subscriber and stops its writer goroutine.
func (ft *FanoutTrack) Unsubscribe(sub *Subscriber) {
	if sub == nil {
		return
	}

	ft.mu.Lock()
	if _, ok := ft.subscribers[sub.id]; ok {
		delete(ft.subscribers, sub.id)
		if !sub.stopped {
			sub.stopped = true
			close(sub.stopChan)
		}
	}
	count := len(ft.subscribers)
	ft.mu.Unlock()

	log.Printf("[Fanout] Subscriber %d removed (remaining: %d)", sub.id, count)
}

// Broadcast sends an RTP packet to all subscribers non-blocking.
// If a subscriber's queue is full, the oldest packet is dropped
// to make room (live video: freshness > completeness).
func (ft *FanoutTrack) Broadcast(pkt *rtp.Packet) {
	ft.mu.RLock()
	defer ft.mu.RUnlock()

	for _, sub := range ft.subscribers {
		if sub.stopped {
			continue
		}
		select {
		case sub.ch <- pkt:
			// Sent successfully
		default:
			// Queue full — drop oldest, push newest (live video policy)
			select {
			case <-sub.ch:
			default:
			}
			select {
			case sub.ch <- pkt:
			default:
			}
		}
	}
}

// Count returns the current number of active subscribers.
func (ft *FanoutTrack) Count() int {
	ft.mu.RLock()
	defer ft.mu.RUnlock()
	return len(ft.subscribers)
}

// CloseAll stops all subscriber goroutines and clears the subscriber list.
func (ft *FanoutTrack) CloseAll() {
	ft.mu.Lock()
	defer ft.mu.Unlock()

	for _, sub := range ft.subscribers {
		if !sub.stopped {
			sub.stopped = true
			close(sub.stopChan)
		}
	}
	ft.subscribers = make(map[uint64]*Subscriber)
	log.Printf("[Fanout] All subscribers closed")
}
