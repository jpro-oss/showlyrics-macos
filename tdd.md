# TDD - LAN Media Synchronization Engine

## 1. System Overview

Sistem menggunakan arsitektur:

Master Timeline + Local Media Cache + Distributed Playback

Prinsip utama:

* Video tidak dibroadcast saat playback.
* Semua video diputar dari storage lokal masing-masing client.
* Server hanya mengirim state timeline.
* Sinkronisasi dilakukan menggunakan timestamp server.
* Playback tidak bergantung pada browser controller.

---

# 2. High Level Flow

## Upload Phase

Operator Upload MP4
↓
Media Library
↓
Metadata Extraction
↓
Hash Generation
↓
Database Registration
↓
Client Cache Validation
↓
Client Download Missing Files
↓
Ready

---

## Playback Phase

PLAY
↓
Timeline Engine Update
↓
WebSocket Broadcast
↓
Client Receive State
↓
Client Calculate Position
↓
Local Playback
↓
Drift Monitoring
↓
Auto Correction

---

# 3. Core Architecture

## Timeline Server

Single Source Of Truth.

Semua state playback berada di server.

Contoh:

```python
timeline = {
    "media_id": "video_001",
    "playing": True,
    "started_at": 1748912400.500,
    "paused_position": None,
    "playback_rate": 1.0
}
```

Server tidak menyimpan posisi frame-by-frame.

Posisi dihitung secara matematis.

---

# 4. Position Calculation Method

## Wrong Method

```python
position += delta
```

Masalah:

* Drift
* Floating point accumulation
* Desync

---

## Correct Method

```python
position =
(current_server_time -
started_timestamp)
* playback_rate
```

Contoh:

```python
started_timestamp = 1000
current_time = 1125
```

hasil:

```python
position = 125
```

Posisi selalu absolut.

Tidak pernah dihitung menggunakan loop.

---

# 5. Timeline State Machine

State:

```text
STOPPED
PLAYING
PAUSED
BUFFERING
ENDED
```

Transisi:

```text
STOPPED
   │
   ▼

PLAYING

PLAYING
   │
   ▼

PAUSED

PAUSED
   │
   ▼

PLAYING

PLAYING
   │
   ▼

ENDED
```

---

# 6. Synchronization Algorithm

## Heartbeat Sync

Server mengirim heartbeat:

500 ms

Payload:

```json
{
  "type": "heartbeat",
  "media_id": "video_001",
  "server_time": 1748912400,
  "position": 320.45,
  "playing": true
}
```

---

## Client Drift Detection

Client menghitung:

```javascript
drift =
localCurrentTime -
serverPosition
```

---

Jika:

```text
abs(drift) < 100ms
```

Tidak ada tindakan.

---

Jika:

```text
100ms <= drift <= 300ms
```

Gunakan soft correction.

```javascript
video.playbackRate = 1.01
```

atau

```javascript
video.playbackRate = 0.99
```

---

Jika:

```text
drift > 300ms
```

Gunakan hard correction.

```javascript
video.currentTime =
serverPosition
```

---

# 7. Media Distribution System

## Purpose

Menghindari streaming video realtime.

---

## Upload Workflow

Operator Upload
↓
Server Generate Hash
↓
Server Save Metadata
↓
Broadcast New Media Event
↓
Client Compare Hash
↓
Download If Missing

---

## Hash Validation

Gunakan:

SHA256

Contoh:

```python
video_hash =
sha256(file)
```

Client menyimpan:

```json
{
  "media_id": "video_001",
  "hash": "ab34cd..."
}
```

---

# 8. Cache Architecture

## Server

```text
/media

video1.mp4
video2.mp4
video3.mp4
```

---

## Client

```text
/cache

video1.mp4
video2.mp4
video3.mp4
```

---

Playback selalu berasal dari:

```text
/cache
```

Tidak pernah dari:

```text
/network
```

---

# 9. WebSocket Channels

## Control Channel

Digunakan untuk:

* play
* pause
* seek
* replay
* stop

Payload kecil.

---

## Timeline Channel

Digunakan untuk:

* heartbeat
* sync
* recovery

---

## Status Channel

Digunakan untuk:

* cache status
* online status
* playback health

---

# 10. Reconnect Strategy

## Problem

Client disconnect 10 detik.

---

## Solution

Saat reconnect:

```text
Connect
↓
Request Timeline
↓
Receive Current State
↓
Seek
↓
Resume Playback
```

Target:

< 2 detik

---

# 11. Controller Independence

Controller tidak boleh menjadi playback master.

Controller hanya mengirim command.

```text
PLAY
PAUSE
SEEK
REPLAY
```

Timeline tetap berada di server.

---

# 12. Multi Output Strategy

## Existing Approach

```text
Browser 1
Browser 2
Browser 3
```

Masalah:

* Decoder duplikasi
* Buffer duplikasi
* RAM tinggi

---

## Recommended

```text
Output Manager
     │
     ├── Display 1
     ├── Display 2
     └── Display 3
```

Semua output subscribe ke timeline yang sama.

---

# 13. Hardware Acceleration Strategy

Gunakan:

HTML5 Video Element

Browser akan memanfaatkan:

Windows

* DXVA2
* D3D11

NVIDIA

* NVDEC

Intel

* Quick Sync

AMD

* VCN

---

Dilarang:

Canvas Rendering

```javascript
ctx.drawImage(video)
```

karena menyebabkan GPU → CPU copy.

---

# 14. Failure Recovery

## Controller Crash

Playback tetap berjalan.

---

## Client Crash

Reconnect
↓
State Request
↓
Re-Sync

---

## Network Loss

Video tetap berjalan dari cache.

Ketika koneksi kembali:

Auto Sync.

---

## Server Restart

Database menyimpan:

```json
{
  "media_id": "...",
  "playing": true,
  "position": 120
}
```

Timeline dipulihkan saat startup.

---

# 15. Example Runtime Scenario

1. Operator upload video 500 MB.
2. Server generate hash.
3. Client A/B/C download file.
4. Semua client status READY.
5. Operator klik PLAY.
6. Timeline Server membuat started_timestamp.
7. Heartbeat berjalan setiap 500 ms.
8. Client menghitung posisi menggunakan timestamp.
9. Client melakukan drift correction otomatis.
10. Client baru join 15 menit kemudian.
11. Client meminta state.
12. Server mengirim position=900.
13. Client seek ke 900 detik.
14. Playback langsung sinkron.

Hasil:

* Tidak ada streaming video realtime.
* Tidak ada bottleneck bandwidth.
* Tidak ada ketergantungan controller.
* GPU decode berjalan lokal.
* Skalabilitas hingga puluhan client dalam LAN.

Satu peningkatan yang aku rekomendasikan untuk versi enterprise

Daripada client menghitung waktu menggunakan Date.now(), gunakan server monotonic clock + NTP-like offset calibration.

Workflow:

Client Connect
↓
Ping Server
↓
Hitung RTT
↓
Hitung Clock Offset
↓
Simpan Offset
↓
Gunakan Offset Saat Sinkronisasi

Ini mirip cara kerja:

Spotify Connect
Zoom media sync
ProPresenter Stage Display
BrightSign Network