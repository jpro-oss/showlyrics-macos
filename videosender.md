# PRD — VIDEO MEDIA SENDER

## ShowLyrics Media Sender — Video Module Integration

---

# 1. Overview

Fitur **VIDEO MEDIA SENDER** akan ditambahkan pada aplikasi **ShowLyrics Media Sender** dengan struktur, UX, dan workflow yang sangat mirip dengan modul **PHOTO** yang sudah ada pada `@contextScopeItemMention`.

Tujuan utama dari sistem ini adalah:

* Mengirim video ke ShowLyrics utama dengan sangat stabil
* Tidak terjadi lag saat playback maupun switching
* Tidak terjadi double request / memory leak / buffer stacking
* Sinkronisasi sender ↔ receiver berjalan ringan dan efisien
* Tetap mempertahankan architecture existing dari `@contextScopeItemMention`
* Hanya memodifikasi Media Sender tanpa mengubah core existing system

---

# 2. Scope

## Yang Dikerjakan

* Penambahan TAB VIDEO
* UI Video Library
* UI Playback Control
* UI Audio Control
* Video CRUD System
* Video Streaming Optimization
* Sender Playback Optimization
* Sender ↔ ShowLyrics Integration
* Resource Management Optimization
* Buffer Management
* Cache Management

---

## Yang TIDAK Dikerjakan

* Tidak mengubah core architecture `@contextScopeItemMention`
* Tidak mengubah sistem PHOTO existing
* Tidak mengubah protocol utama receiver
* Tidak memodifikasi sistem ShowLyrics utama
* Tidak mengubah komunikasi existing sender-receiver

---

# 3. UI Layout

## Struktur TAB

```plaintext
[ PHOTO ] [ VIDEO ]
```

TAB VIDEO memiliki layout sangat mirip dengan PHOTO.

---

# 4. VIDEO UI Structure

## Main Layout

```plaintext
---------------------------------------------------
| BG MEDIA PANEL                                  |
|-------------------------------------------------|
| BG FOLDER SIDEBAR | VIDEO PREVIEW & CONTROLS   |
|                   |                             |
| MEDIA SENDER      |     VIDEO PREVIEW           |
| LOKAL             |                             |
|                   |                             |
| Folder List       | Timeline                    |
|                   | Playback Controls           |
|                   | Volume Controls             |
---------------------------------------------------
```

---

# 5. Sidebar Structure

## bg-folder-sidebar

Tambahkan section:

```plaintext
MEDIA SENDER
LOKAL
```

Sama seperti sistem PHOTO existing.

---

# 6. CRUD Features

## Folder CRUD

### Required Features

* Create Folder
* Rename Folder
* Delete Folder
* Add Existing Windows Folder
* Refresh Folder
* Drag & Drop Support

---

## Video CRUD

### Required Features

* Add Video File
* Multi Select Import
* Delete Video
* Rename Video
* Duplicate Video
* Sort Video
* Search Video
* Thumbnail Preview
* Duration Metadata

---

# 7. Supported Video Formats

## Required Formats

```plaintext
.mp4
.mov
.webm
.mkv
.avi
```

Gunakan decoding yang ringan dan hardware accelerated jika tersedia.

---

# 8. Video Playback Controls

## Required Controls

### Playback

* Play
* Pause
* Restart
* Stop

---

### Looping

Modes:

```plaintext
- No Loop
- Single Loop
- Playlist Loop
```

---

### Timeline

* Seek Timeline
* Drag Scrubber
* Current Time
* Total Duration
* Frame Accurate Seeking

---

# 9. Audio System

## Dual Audio Architecture

Sistem audio harus dipisah menjadi:

---

## A. Volume Output

### Function

Volume yang dikirim ke ShowLyrics utama.

### Features

* Large Fader
* Mute Toggle
* Numeric Percentage
* Real-time Adjustment
* Smooth Fade

---

## B. Volume Monitor

### Function

Volume lokal pada komputer Media Sender untuk monitoring operator.

### Features

* Large Fader
* Mute Toggle
* Independent Mixer
* Real-time Adjustment
* Smooth Fade

---

# 10. Audio Routing Architecture

## Audio Split System

```plaintext
Video Source
    ↓
Audio Decoder
    ↓
Audio Splitter
   ↙        ↘
Output Bus   Monitor Bus
```

---

## Requirements

* Kedua audio system independen
* Tidak saling mempengaruhi
* Tidak menyebabkan audio duplication
* Tidak menyebabkan clipping
* Tidak menyebabkan delay

---

# 11. Performance Requirements

## CRITICAL REQUIREMENTS

Sistem HARUS:

* Tidak lag saat playback
* Tidak lag saat switching video
* Tidak freeze saat seek timeline
* Tidak stutter saat network transfer
* Tidak drop frame
* Tidak memory leak
* Tidak GPU leak
* Tidak CPU spike
* Tidak double rendering
* Tidak duplicate decode process

---

# 12. Video Optimization System

## Decode Pipeline

Gunakan:

```plaintext
Hardware Accelerated Decode
↓
Frame Buffer Queue
↓
Adaptive Frame Delivery
↓
Sender Encoder
```

---

## Optimization Rules

### Required

* GPU decode priority
* Async frame loading
* Buffered playback
* Smart frame caching
* Background preloading
* Frame queue limit
* Memory auto cleanup

---

## Forbidden

* Double decode
* Full memory preload
* Blocking render
* Infinite buffering
* Duplicate network send

---

# 13. Sender Networking Optimization

## Goal

Pastikan video terkirim lancar ke ShowLyrics utama tanpa bottleneck.

---

## Required Features

### Smart Streaming

* Chunked frame transfer
* Adaptive bitrate internal
* Delta frame update
* Buffer queue management
* Packet throttling

---

### Stability

* Auto reconnect
* Queue recovery
* Packet retry
* Transfer timeout protection
* Session cleanup

---

### Anti Overload

* Prevent duplicate request
* Prevent stacked sending process
* Prevent multi encoder spawn
* Prevent zombie threads
* Prevent stale socket

---

# 14. Synchronization System

## Sender ↔ Receiver Sync

Pastikan:

* Timeline sinkron
* Pause sinkron
* Restart sinkron
* Seek sinkron
* Loop sinkron
* Volume output sinkron

---

## Monitor Volume

TIDAK perlu sinkron karena hanya lokal sender.

---

# 15. Playback Engine Requirements

## Engine Rules

Playback engine HARUS:

* Lightweight
* Async based
* Non-blocking
* GPU accelerated
* Resource aware

---

## Recommended Architecture

```plaintext
Video Decoder Thread
Audio Thread
Render Thread
Network Sender Thread
UI Thread
```

Semua thread HARUS dipisah agar tidak blocking.

---

# 16. Buffer Management

## Required System

### Dynamic Buffer

* Auto resize buffer
* Buffer cleanup
* Overflow prevention
* Underflow prevention

---

## Cache Rules

### Smart Cache

* Cache current playback
* Cache next playback
* Auto release old frame
* Limit RAM usage

---

# 17. Resource Management

## CPU Protection

* Limit background polling
* Avoid busy loop
* Async waiting
* Frame throttling

---

## GPU Protection

* Release unused textures
* Reuse render surface
* Avoid duplicate upload
* Prevent VRAM leak

---

## RAM Protection

* Frame auto disposal
* Garbage cleanup
* Video cache limit
* No infinite array storage

---

# 18. Error Handling

## Required Handling

### Playback Errors

* Corrupt file
* Unsupported codec
* Missing file
* Decode failure

---

### Network Errors

* Sender disconnected
* Timeout
* Packet loss
* Receiver unavailable

---

### Recovery

* Graceful fallback
* Auto reconnect
* Safe cleanup
* State recovery

---

# 19. UX Requirements

## UX Goals

* Mirip PHOTO UI
* Mudah dipahami operator
* Real-time responsive
* Tidak delay saat klik
* Smooth slider interaction

---

## Visual Requirements

* Large Preview
* Large Volume Fader
* Clean Timeline
* Modern Minimal UI
* Fast thumbnail loading

---

# 20. Core Integration Rules

## VERY IMPORTANT

### HARUS:

* Mengikuti architecture `@contextScopeItemMention`
* Mengikuti komunikasi existing sender
* Menggunakan existing integration flow

---

### TIDAK BOLEH:

* Mengubah core receiver
* Mengubah API utama
* Mengubah flow PHOTO
* Mengubah protocol existing

---

# 21. Stability Checklist

## Final Validation

### Playback

* [ ] Video play smooth
* [ ] Pause instant
* [ ] Restart instant
* [ ] Seek smooth
* [ ] Loop stable

---

### Audio

* [ ] Output volume independent
* [ ] Monitor volume independent
* [ ] No audio duplication
* [ ] No clipping
* [ ] No desync

---

### Networking

* [ ] No double request
* [ ] No duplicate frame
* [ ] No queue stacking
* [ ] Stable reconnect
* [ ] Stable transfer

---

### Resources

* [ ] No RAM leak
* [ ] No GPU leak
* [ ] No CPU spike
* [ ] No zombie process
* [ ] No thread leak

---

# 22. Final Objective

Modul VIDEO pada ShowLyrics Media Sender harus:

* Stabil untuk penggunaan live production
* Ringan pada device low-end
* Minim latency
* Tidak lag
* Tidak freeze
* Tidak crash
* Tidak menyebabkan overload system
* Terintegrasi sempurna dengan `@contextScopeItemMention`
* Memiliki UX yang konsisten dengan modul PHOTO
* Profesional dan production ready
