# Product Requirements Document (PRD)
# TurboDownloader: Next-Generation Professional Download Accelerator

**Version:** 2.0.0  
**Status:** Approved & Implemented  
**Target Platforms:** Desktop (Windows, macOS, Linux via Electron), Web Dashboard, Mobile (Android via Capacitor)  
**Author / Lead Architect:** Principal Full-Stack Software Engineer & AI System Architect  

---

## 1. Executive Summary & Vision

### 1.1 Vision Statement
TurboDownloader is engineered to be the ultimate, modern open-source successor to Internet Download Manager (IDM). While IDM remains the historical benchmark for download acceleration on Windows, its legacy UI, closed ecosystem, lack of cross-platform support, and dated media extraction pipelines present a massive opportunity.

TurboDownloader delivers:
- **Maximum Throughput Acceleration:** Dynamic multi-threaded segmentation (up to 32 parallel HTTP connections with dynamic chunk byte-range splitting).
- **Intelligent Media Sniffer & Stream Extractor:** Direct extraction and resolution selection for modern video platforms (YouTube, TikTok watermark-free, Facebook, X, Instagram, and direct HTTP/HTTPS/FTP streams).
- **Modern Industrial Grade Interface:** A responsive, dark-mode first, high-density dashboard inspired by modern developer tooling with live per-segment connection waterfalls, real-time speed charts, and queue management.
- **Cross-Platform Parity:** A unified TypeScript/Node architecture running as a standalone Electron desktop utility with native system tray integration, a high-performance local web server, and a mobile-ready Capacitor Android app.

---

## 2. Competitive Analysis: TurboDownloader vs. IDM

| Capability | Internet Download Manager (IDM) | TurboDownloader 2.0 |
| :--- | :--- | :--- |
| **User Interface** | 1990s Win32 dialogs, low DPI scaling | Modern Fluent/Tailwind UI, Dark/Light modes, responsive layout |
| **Segment Visualization** | Static segmented bar | Live reactive multi-thread waterfall visualizer with real-time per-thread bitrates |
| **Media Extraction** | Browser extension hook only | Integrated server-side parser (play-dl, youtube-dl, TikTok nowatermark) + quality picker |
| **OS Compatibility** | Windows only | Windows, macOS, Linux (Electron), Web, Android (Capacitor) |
| **Remote Management** | Not supported natively | Built-in REST API & WebSocket server for remote browser management |
| **Multi-thread Engine** | Fixed chunk allocation | Dynamic byte-range segmentation with asynchronous worker thread merging |
| **Queue & Scheduling** | Complex dialog queues | One-click Queue actions (Start All, Pause All, Priority Reordering) |
| **Open & Extensible** | Closed source, paid license | Modern Node.js/TypeScript stack, zero-cost, modular architecture |

---

## 3. Architecture & Technical Stack

### 3.1 System Diagram
```
┌────────────────────────────────────────────────────────────┐
│              User Interfaces (Presentation)                │
├──────────────────────────┬─────────────────────────────────┤
│  Electron Desktop Shell  │  React 19 + Tailwind CSS +      │
│  (Window, Tray, IPC)     │  Lucide Icons + Framer Motion   │
└────────────┬─────────────┴────────────────┬────────────────┘
             │                              │
             ▼                              ▼
┌────────────────────────────────────────────────────────────┐
│      Express 4 + WebSocket Fast-Path Server (Node.js)      │
│  - REST Endpoints (/api/downloads, /api/analyze, etc.)     │
│  - WebSocket Event Bus (Task progress, speed, segments)   │
└────────────────────────────┬───────────────────────────────┘
                             │
                             ▼
┌────────────────────────────────────────────────────────────┐
│             Core Download Engine (TypeScript)              │
├────────────────────────────┬───────────────────────────────┤
│   DownloadManager (Store)  │   DownloadTask (State Machine)│
│   - In-memory task registry│   - Byte-range chunking       │
│   - Queue coordination     │   - Speed telemetry & ETA     │
│   - Persistence layer      │   - Pause / Resume / Cancel   │
├────────────────────────────┴───────────────────────────────┤
│   Worker Threads (mergeWorker.ts)                          │
│   - Non-blocking disk concatenation of segment buffers     │
└────────────────────────────────────────────────────────────┘
```

### 3.2 Core Component Responsibilities
1. **Frontend (`/src/App.tsx`, `/src/components/*`):**
   - High-speed reactive dashboard rendering active downloads.
   - Per-segment chunk visualizer displaying real-time worker thread progress.
   - Media Analyzer Modal for examining video/audio formats and selecting resolution.
   - Categorized library (All, Video, Audio, Compressed, Documents, Programs).
   - Global speed, ETA, and bandwidth telemetry.

2. **Backend Services (`server.ts`):**
   - Head-request validation and Range header compliance checking.
   - Media link resolution (TikTok API fallback, YouTube audio/video stream demuxing).
   - WebSocket broadcast channel for low-latency speed and progress streaming.
   - Static asset streaming for finished downloads.

3. **Multi-Thread Download Engine (`DownloadTask.ts` & `mergeWorker.ts`):**
   - Automated detection of `Accept-Ranges: bytes`.
   - Dynamic allocation of 1–32 simultaneous TCP stream workers with Axios cancel tokens.
   - Streamed writing directly to separate temp chunk files to prevent memory exhaustion.
   - Multi-threaded assembly via Node.js `worker_threads` to avoid blocking the event loop.

---

## 4. Functional Specifications

- **F-01: Segmented Acceleration:** Parallel chunk downloads with range headers, reducing latency bottlenecks and bypassing single-connection ISP throttles.
- **F-02: Live Thread Visualizer:** Visual inspection of each connection segment (progress, bytes transferred, status).
- **F-03: Media Quality Analyzer:** Sniffing YouTube/TikTok/Direct links, extracting video resolutions (1080p, 720p, 480p) and audio options before download.
- **F-04: Queue Management:** Batch actions (`Pause All`, `Resume All`, `Clear Completed`, `Delete All`).
- **F-05: Smart Categorization:** Automatic tagging and filtering of files by extension into Videos, Music, Documents, Archives, Applications, and Miscellaneous.
- **F-06: Speed & ETA Telemetry:** Accurate speed calculation, time remaining, and total elapsed duration.
- **F-07: Resilient Error Handling & Resume:** Auto-reconnect on network dropouts, state preservation across interruptions.
- **F-08: Cross-Platform Native Notifications:** Sound and system notifications upon download completion on both Desktop and Android.
