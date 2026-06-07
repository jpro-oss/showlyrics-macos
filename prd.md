# PRD - Enterprise LAN Media Synchronization & Digital Signage Engine

## Overview

Membangun sistem media playback enterprise berbasis LAN yang mampu melakukan sinkronisasi video secara real-time antar banyak perangkat dengan latensi rendah, penggunaan CPU minimal, GPU accelerated playback, fault tolerance tinggi, dan kemampuan join/reconnect tanpa mengganggu playback yang sedang berjalan.

Sistem akan digunakan untuk:

* ShowLyrics Media Sender
* Digital Signage
* LED Wall Control
* Multi Display Presentation
* Worship Presentation System
* Event Broadcasting
* Multi Screen Video Playback

---

# Core Design Philosophy

## Anti-Pattern yang Harus Dihindari

Dilarang menggunakan pendekatan berikut:

### Continuous MP4 Streaming

Server mengirim video secara terus-menerus selama playback.

Masalah:

* Network bottleneck
* Skalabilitas buruk
* Tidak tahan disconnect
* Bandwidth tinggi

---

### Controller As Playback Master

Browser controller menjadi sumber timeline.

Masalah:

* Jika controller close playback rusak
* State hilang
* Client kehilangan sinkronisasi

---

### Iframe-Based Playback

Video player berada di dalam iframe.

Masalah:

* Decoder destroy/create
* Memory leak
* Reconnect overhead
* GPU context reset

---

### Canvas Video Rendering

Render video melalui Canvas.

Masalah:

* GPU → CPU Copy
* CPU tinggi
* Tidak efisien

---

# Target Architecture

## Master Timeline Architecture

Server menjadi satu-satunya sumber kebenaran.

```text
Controller
      │
      ▼

Timeline Server
      │
      ▼

WebSocket Hub
      │
 ┌────┼────┐
 ▼    ▼    ▼

Client Client Client
```

Controller hanya mengirim command.

Server menyimpan state playback.

Client mengikuti timeline server.

---

# Primary Components

## Timeline Engine

Tanggung jawab:

* Play
* Pause
* Stop
* Seek
* Replay
* Next Media
* Previous Media
* Playback Speed

Server harus mampu menghitung posisi playback tanpa menyimpan frame-by-frame counter.

Gunakan:

position = current_time - started_timestamp

bukan:

position += delta_time

untuk menghindari drift.

---

## Sync Engine

Bertugas melakukan sinkronisasi semua perangkat.

Target:

* Drift < 100 ms
* Recovery < 1 detik
* Join Time < 2 detik

Sync berjalan setiap:

500 ms

Server mengirim:

* playback state
* current position
* media id
* playback rate

Client melakukan koreksi otomatis.

---

## Media Library Engine

Fitur:

* Upload Video
* Delete Video
* Rename Video
* Metadata Extraction
* Hash Validation
* Thumbnail Generation

Metadata dibaca menggunakan:

ffprobe

bukan ffmpeg transcode.

Target import:

< 3 detik untuk file besar.

---

## Cache Distribution Engine

Tujuan:

Mendistribusikan file media ke seluruh client sebelum playback.

Workflow:

Upload
↓
Hash Generate
↓
Client Check Cache
↓
Download Missing Files
↓
Ready State

Playback tidak dimulai sebelum file tersedia.

---

## Local Cache Engine

Semua client memiliki cache lokal.

Contoh:

cache/
├─ video1.mp4
├─ video2.mp4
└─ video3.mp4

Playback selalu berasal dari local storage.

Tidak pernah dari network stream saat playback.

---

## Playback Engine

Menggunakan:

HTML5 Video Element Native

Wajib:

* GPU Decode
* Hardware Acceleration
* Native Rendering

Dilarang:

* Canvas Playback
* WebGL Playback
* Iframe Video Engine

---

# Synchronization Strategy

## Soft Correction

Jika drift:

100 ms – 300 ms

gunakan:

playbackRate = 0.99
playbackRate = 1.01

untuk koreksi halus.

---

## Hard Correction

Jika drift:

> 300 ms

gunakan:

video.currentTime = target_position

---

## Late Join Recovery

Client baru:

Connect
↓
Request State
↓
Receive Timeline
↓
Seek Position
↓
Play

Target recovery:

< 2 detik

---

# Multi Output Design

## Single PC Multi Display

Target:

1 PC
2 Monitor

1 PC
3 Monitor

1 PC
4 Monitor

Playback engine tidak boleh diduplikasi.

Gunakan:

Output Manager

yang mengontrol banyak view.

Semua output subscribe ke state yang sama.

---

# Server Technology Stack

Backend:

Python 3.12+

Framework:

FastAPI

ASGI:

Uvicorn

Realtime:

WebSocket

Task Queue:

AsyncIO

Database:

SQLite
atau
PostgreSQL

Media Analysis:

FFProbe

Hash:

SHA256

---

# Client Technology Stack

Frontend:

HTML5

CSS3

Vanilla JavaScript

State Management:

Reactive State Store

Video Engine:

Native Video Element

Storage:

IndexedDB
atau
File System Cache

---

# Network Architecture

## Control Channel

WebSocket

Digunakan untuk:

* Play
* Pause
* Seek
* Replay
* State Sync

Bandwidth sangat kecil.

---

## Media Channel

HTTP Download

Digunakan untuk:

* Initial Cache
* File Update

Tidak digunakan selama playback.

---

# Performance Requirements

## CPU

Idle:

< 2%

Playback:

< 10%

Target Device:

Intel i3
Intel i5
AMD Ryzen 3

---

## GPU

Hardware decode wajib aktif.

Support:

* Intel Quick Sync
* NVIDIA NVDEC
* AMD VCN
* DXVA2
* D3D11 Video Decoder

---

## Memory

Per Output:

< 500 MB

Target:

3 Output
< 2 GB RAM

---

# Fault Tolerance

## Controller Crash

Playback tetap berjalan.

---

## Client Disconnect

Reconnect otomatis.

Sinkronisasi otomatis.

---

## Server Restart

State recovery dari database.

Playback state dapat dipulihkan.

---

## Network Interruption

Client tetap memutar video lokal.

Ketika koneksi kembali:

Auto Re-Sync.

---

# Future Roadmap

Phase 1

* Video Sync
* Local Cache
* Play/Pause/Seek

Phase 2

* Playlist
* Schedule
* Scene Management

Phase 3

* Multi Zone Display
* Group Playback
* Video Wall

Phase 4

* Distributed Media Cluster
* Multi Server Failover
* Redundant Timeline Server

---

# Success Metrics

Target 50 Client LAN

Playback Success:
99.9%

Drift:
<100 ms

Reconnect:
<2 detik

Controller Failure Impact:
0

Playback CPU:
<10%

Playback Network Usage:
<100 KB/s

Media Delivery Reliability:
99.99%
