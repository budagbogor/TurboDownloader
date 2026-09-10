# TurboDownloader

> **Multi-threaded, multi-platform video downloader** — built for 27+ streaming platforms with real-time WebSocket progress, SQLite persistence, and browser-native light-mode premium UI.
> No Electron/Tauri. Pure React 19 + Vite 6 frontend · Node.js 22 + Express 4 backend · `yt-dlp` engine + bundled `ffmpeg-static` for stream merging (video + audio).

![Shield: TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white) ![Shield: React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white) ![Shield: Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white) ![Shield: Node](https://img.shields.io/badge/Node.js-%3E=22-339933?logo=nodedotjs&logoColor=white) ![Shield: YouTube](https://img.shields.io/badge/Engine-yt--dlp%202026.08-FF0000?logo=youtube&logoColor=white) ![Shield: DB](https://img.shields.io/badge/Persistence-SQLite%20(WAL)-003B57?logo=sqlite&logoColor=white) ![Shield: License](https://img.shields.io/badge/License-MIT-blue) ![Shield: UI](https://img.shields.io/badge/UI-Light%20Mode%20ONLY-8A2BE2)

---

## ✨ Fitur Utama

| Fitur | Status |
|---|---|
| **27+ Platform Support** | YouTube, Instagram, TikTok, X/Twitter, Facebook, Vimeo, Dailymotion, dan 20+ lainnya via `yt-dlp` extractor collection (1.744 extractor loaded). |
| **DASH-aware Engine** | Otomatis gabung stream `bestvideo* + bestaudio` via **bundled ffmpeg-static**; output MP4 H.264/AAC. |
| **Multi-threaded HTTP Direct** | Untuk direct-link file HTTP: 8 segment paralel default (bisa diatur di settings). |
| **Trash System (Soft-Delete)** | Hapus task tidak permanen: masuk Trash Page, bisa restore / delete forever + retention days auto cleanup. |
| **Real-time WebSocket UI Sync** | Progress, bitrate, segment sparkline disiarkan ke semua browser tab via `ws://host:3000/` (broadcast dedupe per task). |
| **SQLite WAL Persistence** | Semua task, setting, event log disimpan permanen ke `data/turbodownloader.sqlite`. Bisa export/wipe via Settings. |
| **CSP + Rate Limit + Helmet Hardened** | Production security defaults: strict helmet CORS LAN, `POST /api/downloads` rate-limit 2 req/detik/IP, z-schema `zod` validation untuk semua input. |
| **Mobile-friendly Responsive UI** | Tailwind 4 + Inter font self-hosted (no Google Fonts blocked CSP), chip status warna, bandwidth aggregate sparkline per task. |
| **Cookie Injection Support** | Bypass YouTube bot detection / restricted content: import `cookies.txt` Netscape format (Chrome/Edge/Firefox extension). |
| **Quality Presets** | Auto (1080p), HD (720p), Full HD, 4K, Audio-only (AAC 320k). |

---

## ⚙️ Tech Stack

### Frontend (React 19 · Vite 6 · Tailwind 4)
- **UI Library** · React 19 (`/src/App.tsx`) — no shadcn/ui; pure Tailwind `.surface-card` + `@tailwindcss/vite` JIT.
- **Fonts** · `@fontsource-variable/inter` (self-hosted, hindari blocked Google Fonts CSP).
- **Animations** · `framer-motion` 12.
- **Icons** · `lucide-react` 0.546.
- **Routing** · Client-side via state machine sidebar category (no router package).

### Backend (Node.js 22 · Express 4 · tsx)
- **Runtime** · Node 22.19+, `tsx watch server.ts` untuk development hot-reload ESM/TS.
- **Download Engine** · `youtube-dl-exec ^3` (bundles `yt-dlp.exe stable@2026.08.19` Win x64, auto extract).
- **Media Merging** · `ffmpeg-static 5.3` (H.264/AAC) + `fluent-ffmpeg 2.1` (faststart MP4 moov atom front).
- **Security** · `helmet 8`, `express-rate-limit 8`, `cors`, `zod 4` body/param schema validation.
- **WebSocket** · `ws 8` (no Socket.IO) — broadcast `tasks/update` JSON events.
- **Database** · `better-sqlite3 12` **WAL mode** (Write-Ahead Logging). 3 tables: `tasks`, `settings`, `event_log`.

---

## 🚀 Quick Start

### 1. Persyaratan Sistem

| Tool | Minimum | Notes |
|---|---|---|
| **Node.js** | **≥ 22 LTS** | Digunakan oleh yt-dlp EJS runtime untuk solve YouTube JS challenge (lihat *YouTube Engine Internals*). Installer: https://nodejs.org |
| **npm** | ≥ 10 | Auto include dengan Node. |
| **OS** | Windows 10/11 (x64) | `yt-dlp.exe` & `ffmpeg.exe` bundled untuk Windows. Untuk Linux/macOS: pastikan `ffmpeg` ada di PATH. |
| **Disk Space** | ≥ 800 MB | `node_modules` (450 MB) + `yt-dlp` + `ffmpeg-static` binary (200 MB) + cache. |
| **Internet** | Stabil (WebSocket reconnect otomatis jika putus). |

### 2. Instalasi

```bash
# 1. Clone project
git clone https://github.com/budagbogor/TurboDownloader.git
cd TurboDownloader

# 2. Install dependencies (akan auto download youtube-dl.exe + ffmpeg-static)
npm install
```

*Tunggu sampai npm selesai extract binary `ffmpeg-static` dan `youtube-dl-exec/bin/yt-dlp.exe`. Perkiraan 1-3 menit.*

### 3. Jalankan Development Server

```bash
# Cara REKOMENDASI: 2 terminal terpisah untuk hot reload fullstack.

# TERMINAL 1 — Backend Express (port 3000 default, includes static serve dari dist/)
npm run dev
#   Equivalent: tsx watch server.ts

# TERMINAL 2 — Frontend Vite (HMR on port 5173, proxy /api ke port 3000)
#   (Opsional, karena server.ts di atas sudah serve static dist/ juga.
#    Pilih ini kalau mau edit frontend dengan instant HMR.)
npx vite
```

Tunggu sampai muncul log:
```
[TurboDownloader] Server running on http://localhost:3000
[TurboDownloader] Security: helmet+rateLimit+CORS-LAN+zod validation enabled
[TurboDownloader] Persistence: SQLite (WAL) tasks/settings/event_log tables ready
```

Buka browser ke **http://localhost:3000** (atau **http://localhost:5173** jika pakai Vite HMR).

### 4. Build Production

```bash
# Build frontend (Vite React 19) -> dist/
npm run build

# Build backend (TypeScript) -> dist-server/
npm run build:server

# Keduanya sekaligus
npm run build:all

# Jalankan build production (tanpa tsx, pure Node ESM compiled JS)
npm start
```

---

## 🏗️ Architecture Overview

```
                              ┌──────────────────────────────────────┐
                              │           Browser (React UI)         │
                              │  │ useDownloadsWebSocket.ts (ws)     │
                              │  │ App.tsx state reducer             │
                              │  └── SettingsPage, Downloads list   │
                              └──────┬──────────────────┬─────────────┘
                                     │ ws://host/       │ HTTP /api/*
                                     ▼                  ▼
                              ┌──────────────────────────────────────────────────┐
                              │   server.ts (Express 4 · Node 22 · ws server)    │
                              │   ├─ /api/* REST endpoints (zod validate)        │
                              │   ├─ /downloads/* static serve file output       │
                              │   └─ DownloadManager (singleton in-memory cache) │
                              └────────────┬──────────────┬──────────────────────┘
                                           │ spawn proc   │ SQLite WAL read/write
                                           ▼              ▼
                 ┌────────────────────────────────────┐  ┌──────────────────────┐
                 │ youtube-dl-handler (yt-dlp.exe)    │  │ database.ts          │
                 │ · EJS runtime = node.exe           │  │ · tasks table        │
                 │ · multi-player clients (android 1st)│  │ · settings table     │
                 │ · cookie inject (cookies.txt)      │  │ · event_log table    │
                 │ · ffmpeg merge (video+audiotrack)  │  └──────────────────────┘
                 └────────────────────────────────────┘
```

### Key Module Responsibilities

| File | Fungsi Utama |
|---|---|
| [`server.ts`](file:///C:/Users/snwd/Videos/turbodownoader/TurboDownloader-1/server.ts) | HTTP router (29 REST endpoints), WebSocket broadcast, security (helmet+rateLimit+CORS+zod), static serve Vite build, health check `/api/health`. |
| [`src/server/DownloadManager.ts`](file:///C:/Users/snwd/Videos/turbodownoader/TurboDownloader-1/src/server/DownloadManager.ts) | Singleton orchestrator: queue task, concurrency limiter, trash system, serialize/restore state dari DB, WebSocket broadcast aggregator. |
| [`src/server/DownloadTask.ts`](file:///C:/Users/snwd/Videos/turbodownoader/TurboDownloader-1/src/server/DownloadTask.ts) | Abstraksi 1 download task: initialize, start, pause (SIGKILL), resume, repair, soft-delete, retry logic. Route YouTube → useYoutubeDlDirect=true; URL direct → useYoutubeDlDirect=false. |
| [`src/server/youtube-dl-handler.ts`](file:///C:/Users/snwd/Videos/turbodownoader/TurboDownloader-1/src/server/youtube-dl-handler.ts) | **YT Engine**: Spawn `yt-dlp.exe` + 15 custom args chain, NDJSON progress parse → emit bytes/percentage/Eta ke task. Inject cookie, ffmpeg path, player clients. |
| [`src/server/database.ts`](file:///C:/Users/snwd/Videos/turbodownoader/TurboDownloader-1/src/server/database.ts#L130-L205) | SQLite 3 tables schema: `tasks`, `settings`, `event_log`. Auto migrate & WAL enable. |
| [`src/server/ffmpeg-toolchain.ts`](file:///C:/Users/snwd/Videos/turbodownoader/TurboDownloader-1/src/server/ffmpeg-toolchain.ts) | Resolve bundled `ffmpeg-static` binary → `getFfmpegBinary()`. Optimize video: `faststart` moov atom to depan for browser play compatibility. |
| [`src/components/SettingsPage.tsx`](file:///C:/Users/snwd/Videos/turbodownoader/TurboDownloader-1/src/components/SettingsPage.tsx) | 5-tab settings: General, Networking, Quality, Notifications, Advanced. IsDirty status chip + Save Changes button (see fixed earlier bug). |
| [`src/hooks/useDownloadsWebSocket.ts`](file:///C:/Users/snwd/Videos/turbodownoader/TurboDownloader-1/src/hooks/useDownloadsWebSocket.ts) | WebSocket client: exponential backoff 1-16s reconnect; dedupe message id, deserialize strict zod. |

---

## 📁 Project Structure (Clean)

Hanya **14 root files + 9 folders** (dibersihkan dari sisa 258 MB artifacts Tauri & debug):

```
TurboDownloader-1/
├── .trae/               IDE state (ignore)
├── .vercel/             Vercel deploy credentials (ignore)
├── data/                SQLite WAL files: turbodownloader.sqlite (persistence)
├── dist/                Vite build output frontend (serve via server.ts)
├── dist-server/         TSC output backend JS compiled (npm start run ini)
├── downloads/           User output files (bisa diatur di Settings)
├── node_modules/        Dependencies (include binary yt-dlp + ffmpeg-static)
├── public/              Static assets: favicon.ico
├── release/             Release staging build artifacts
├── src/                 Semua aplikasi source code
│   ├── components/      (13 UI components: SettingsPage, DownloadItem, ...)
│   ├── hooks/           useDownloadsWebSocket, useTheme, useShortcuts
│   ├── lib/             utils.ts (cn, formatBytes, formatBitrate, dll)
│   └── server/          Backend modules (9 files: DownloadManager, database, ffmpeg, yt-dlp, ...)
│   ├── App.tsx          Root React app + sidebar layout
│   ├── index.css        Tailwind + global light-mode-only styles (NO dark:)
│   └── main.tsx         React 19 createRoot mount
├── .env.example         env template (YOUTUBE_DL_PATH, PORT, CORS_ORIGINS)
├── .gitignore           TANPA data, .dbg, downloads, *.sqlite (wajib)
├── .vercelignore        Vercel ignore rules (exclude node_modules, src, etc)
├── MASTER_PLAN.md       SRS lengkap project
├── metadata.json        Aplikasi manifest (version, engine version)
├── package.json         Dependencies + 10 npm scripts (dev/start/build/clean/lint)
├── package-lock.json    NPM lockfile (DIUTAMAKAN; bun.lock sudah dihapus)
├── PRD.md               Product Requirements Document
├── README.md            File inilah yang sedang Anda baca
├── server.ts            Backend Express + WebSocket server entry
├── tailwind.config.js   Tailwind 4 config (light only)
├── tsconfig.json        TS compiler frontend React 19 config
├── tsconfig.server.json TS compiler backend (Node ESM target ESNext)
├── vercel.json          Vercel deploy monorepo rules
└── vite.config.ts       Vite 6 React config + @tailwindcss/vite plugin
```

---

## 🔧 Environment Variables

Copy `.env.example` jadi `.env` di root folder (optional — semua vars punya safe default).

| Variable | Default | Keterangan |
|---|---|---|
| `PORT` | `3000` | Port backend Express + WebSocket (jangan lupa update Vite proxy `vite.config.ts` jika diubah). |
| `CORS_ORIGINS` | `http://localhost:5173,http://localhost:3000,https://vercel.app` | Daftar origins diizinkan CORS, pisahkan koma. Untuk deploy LAN mobile: tambah `http://192.168.x.x:*`. |
| `YOUTUBE_DL_PATH` | auto (`node_modules/youtube-dl-exec/bin/yt-dlp.exe`) | Override path ke `yt-dlp` custom Anda jika mau pakai nightly build sendiri. |
| `FFMPEG_PATH` | auto (`node_modules/ffmpeg-static/...`) | Override ke binary `ffmpeg.exe` global yang sudah Anda install di `C:\ffmpeg\bin\` jika mau. |
| `MAX_CONCURRENT_DOWNLOADS` | `3` | Batas maksimal task jalan bersamaan (queue otomatis). Bisa diatur di Settings > Networking juga. |
| `DEFAULT_DOWNLOAD_DIR` | `./downloads` | Path output folder. Bisa absolute: `C:\Users\you\Videos`. |
| `SQLITE_PATH` | `./data/turbodownloader.sqlite` | Path file SQLite persistent database. |
| `LOG_LEVEL` | `info` | `debug | info | warn | error`. Mode debug: print yt-dlp stderr dan all DB writes. |
| `WS_PING_INTERVAL_MS` | `20000` | WebSocket keep-alive ping interval (detect connection drop lebih cepat daripada OS timeout). |

---

## 🛠️ NPM Scripts Reference

Didefinisikan di [`package.json#L6-L14`](file:///C:/Users/snwd/Videos/turbodownoader/TurboDownloader-1/package.json#L6-L14):

| Command | Fungsi | Kapan Digunakan |
|---|---|---|
| `npm run dev` | `tsx watch server.ts` — backend + static serve frontend build. | Dev: saat edit backend mostly (pakai port 3000). |
| `npm start` | `node dist-server/server.js` — production pure Node run compiled JS. | Production server / PM2 / NSSM service. |
| `npm run build` | `vite build` — bundle React frontend → `dist/`. | Sebelum deploy / sebelum `npm start`. |
| `npm run build:server` | `tsc -p tsconfig.server.json` — compile backend TypeScript → `dist-server/`. | Untuk production build. |
| `npm run build:all` | Kombinasi `build` + `build:server`. | Deploy step 1. |
| `npm run preview` | `vite preview` — preview build frontend di port 4173 (tanpa backend). | QA frontend build output ONLY. |
| `npm run clean` | Hapus folder build artifacts `dist/` + `dist-server/`. | Clean sebelum rebuild. |
| `npm run lint` | `tsc --noEmit` — TypeScript typecheck strict mode seluruh project (frontend+backend). | Pre-push / sebelum commit / CI. |

---

## 🔌 REST API Reference

Semua endpoints di definisikan di [`server.ts`](file:///C:/Users/snwd/Videos/turbodownoader/TurboDownloader-1/server.ts). Root base URL: `http://localhost:3000`.

Semua POST/PUT body validasi pakai **zod schema** di `validateBody()` / `validateParam()` middleware.

### 1. Health & Metadata

| Method | Path | Deskripsi |
|---|---|---|
| `GET` | `/api/health` | Service health check. Returns `{ status:"ok", services:["ffmpeg","sqlite","ytdlp"], ffmpegBinary, ytDlpBinaryPath, uptimeSec }`. Digunakan untuk monitoring dan startup UI toast. |
| `GET` | `/api/platforms` | Return list platform yang didukung dengan icon (dari mapping extractor 1744 yang ter-load). |
| `GET` | `/api/stats` | Aggregate stats: `{ active, queued, completed, failed, totalDownloadedGB, sessionBandwidthMbps }`. |

### 2. Settings Table

| Method | Path | Deskripsi |
|---|---|---|
| `GET` | `/api/settings` | Get semua settings key-value (12 keys default + user overrides). |
| `POST` | `/api/settings` | Upsert 1 key setting: body `{ key: SettingsKey, value: string\|number\|boolean }`. Broadcast WebSocket `settings/updated`. |
| `POST` | `/api/db/export` | Download seluruh SQLite DB sebagai file `.sqlite` (backup). |
| `POST` | `/api/db/wipe` | ⚠️ DANGEROUS. Hapus semua data tasks, settings, event_log. (Confirmation dialog dua kali di UI.) |

### 3. Downloads / Tasks CRUD

| Method | Path | Deskripsi |
|---|---|---|
| `GET` | `/api/downloads` | Get semua task array (paginated + filter status). |
| `POST` | `/api/downloads` | ⭐ CREATE task. Body: `{ url: string, saveToHistory?: boolean, quality?: "auto"\|"720p"\|"1080p"\|"4k"\|"audio", connections?: number, customName?: string }`. **Rate-limit 2 req/detik IP**. |
| `POST` | `/api/analyze` | Analyze URL extractor (preview format list, resolution, estimated size tanpa download). Body `{ url }`. Return `{ title, duration, thumbnail, formats[] }`. |
| `GET` | `/api/downloads/:id/logs` | Get tail 100 baris log task tertentu (error, yt-dlp stderr, ffmpeg output). Untuk Error Details Modal (ⓘ icon). |
| `POST` | `/api/downloads/:id/pause` | Pause task: send `SIGKILL` ke yt-dlp child process (tidak meninggalkan orphan process). |
| `POST` | `/api/downloads/:id/resume` | Resume task from DB checkpoint (direct HTTP multi-threaded; YT = restart from temp file fragment). |
| `DELETE` | `/api/downloads/:id` | ⚠️ Soft-delete: pindah ke Trash Page (bisa restore). File fisik di `downloads/` TIDAK dihapus (opsi delete forever di Trash). |
| `GET` | `/api/downloads/:id/file` | Download single file output task (stream Content-Length header). |
| `GET` | `/api/downloads/:id/stream` | Streaming MP4 dengan range request support (seekable HTML5 player internal). |
| `POST` | `/api/downloads/:id/repair` | Jika task stuck/0-bytes corrupt: reinitialize metadata & coba resume dari fragment yang ada. |
| `POST` | `/api/downloads/pause-all` | Bulk pause semua active & queued tasks. |
| `POST` | `/api/downloads/resume-all` | Bulk resume tasks dari queue head (sampai MAX_CONCURRENT tercapai). |
| `POST` | `/api/downloads/clear-completed` | Bulk soft-delete semua status=completed. Masuk Trash. |

### 4. Trash System

| Method | Path | Deskripsi |
|---|---|---|
| `GET` | `/api/trash` | List all soft-deleted tasks di trash. |
| `POST` | `/api/trash/:id/restore` | Restore back ke downloads list (status di-reset ke queued jika original masih incomplete). |
| `DELETE` | `/api/trash/:id/forever` | ❌ PERMANENT: Hapus DB record + HAPUS FILE FISIK output dari disk secara permanen (tidak bisa dibalikin). |

---

## 🔔 WebSocket Events Reference

Connected at: `ws://<host>:3000/` (same origin port, default 3000). Client implementation: [`useDownloadsWebSocket.ts`](file:///C:/Users/snwd/Videos/turbodownoader/TurboDownloader-1/src/hooks/useDownloadsWebSocket.ts).

### ⬇️ Server → Client Events (Subscribe)

Semua payload JSON format: `{ type: string, data: any, id: string, ts: number }`

| `type` | `data` shape | Ketika Dipancarkan |
|---|---|---|
| **`tasks/created`** | `{ task }` | Task baru ditambahkan via `POST /api/downloads`. |
| **`tasks/updated`** | `{ id, patch: Partial<Task> }` | Update bytes, speed, percentage, eta, status. 1-2 emit per detik per task active. **Dedupe client-side via id + ts**. |
| **`tasks/completed`** | `{ task, finalSizeBytes, downloadedPath }` | Task selesai 100%. Kirim Web Notification API jika user izinkan. |
| **`tasks/failed`** | `{ id, errorMessage, errorCode, logTail[] }` | Task error. Muncul red chip "Failed" di UI. Klik ⓘ untuk `logTail`. |
| **`tasks/deleted`** | `{ id, trash: true/false }` | Task dihapus / pindah trash. |
| **`settings/updated`** | `{ key, value }` | Setting berubah (semua tab disinkronkan real-time). |
| **`trash/updated`** | `{ entry, action: "restore"/"forever"/"added" }` | Trash page changes. |
| **`stats/heartbeat`** | `{ StatsSummary }` | Aggregate bandwidth, active count. Tiap 2 detik. Digunakan sparkline chart di header. |
| **`server/hello`** | `{ serverVersion, protocol: 1 }` | Emit pada saat client baru connect. Untuk handshake protocol version mismatch detect. |

### ⬆️ Client → Server Events (Send Command)

**Rarely used** (lebih baik pakai REST API untuk action), tapi support:

| `type` | Data | Deskripsi |
|---|---|---|
| `tasks/request_full` | — | Force server broadcast entire tasks list. Dipakai WebSocket reconnect supaya tidak miss event selama offline. |
| `ping` | `{ ts: number }` | Server reply `{ type:"pong", ts, latencyMs }`. |

---

## 💽 Persistence: SQLite WAL Schema

3 tables di `data/turbodownloader.sqlite`. Define di [`database.ts#L130-L205`](file:///C:/Users/snwd/Videos/turbodownoader/TurboDownloader-1/src/server/database.ts#L130-L205).

### Table: `tasks` (1 row = 1 download task)

| Column | Type | Index | Deskripsi |
|---|---|---|---|
| `id` | TEXT UUID | PK | Unique identifier task (v4). |
| `created_at` | INTEGER ms | INDEX DESC | Sort order default. |
| `updated_at` | INTEGER ms | INDEX | Last state change timestamp. |
| `url` | TEXT | INDEX | Original user input URL (youtu.be shortened expanded ke youtube.com/watch?v=...). |
| `originalYouTubeUrl` | TEXT | — | Saved URL sebelum rewrite. Jika DB restore hilang: fallback logic detect YouTube dari URL pattern. |
| `displayName` | TEXT | — | Judul video final (dari extractor yt-dlp / manual user override). |
| `fileName` | TEXT | UNIQUE | Nama file output fisik di disk. |
| `savePath` | TEXT | — | Absolute/relatif path ke output file. |
| `status` | TEXT | INDEX | `queued \| initializing \| analyzing \| downloading \| merging \| optimizing \| completed \| failed \| paused \| paused_by_user \| trash` enum. |
| `totalSize` | INTEGER bytes | — | Ukuran file total (0 = unknown di awal, akan diupdate ketika extractor selesai). |
| `downloadedSize` | INTEGER bytes | — | Sudah diunduh bytes (strict monotonic increase guard, no visual rollback bug). |
| `segments` | TEXT JSON | — | Untuk direct HTTP multi-thread: byte-ranges tiap segment worker. |
| `connections` | INTEGER | — | Jumlah paralel worker (default 8 untuk direct; 1 untuk yt-dlp). |
| `speed` | INTEGER Bps | — | Recent 3s EMA kecepatan bytes/detik. |
| `eta` | INTEGER sec | — | Estimasi sisa detik. |
| `error` | TEXT | — | Pesan error terakhir (jika failed). |
| `thumbnailUrl` | TEXT | — | Cover image (untuk card UI). |
| `platform` | TEXT | INDEX | Kategori platform tag (youtube / instagram / http, dll). |
| `isYouTube` | INTEGER BOOL | INDEX | 1 = route ke startYoutubeDlDownload(); 0 = direct HTTP. |
| `useYoutubeDlDirect` | INTEGER BOOL | — | Compute dari initialize. 1 = engine yt-dlp; 0 = axios range download. |
| `deleted_at` | INTEGER ms \| NULL | INDEX | Jika NOT NULL: task berada di Trash Page (soft-delete). |
| `quality` | TEXT | — | User requested quality preset. |

### Table: `settings` (key-value store sederhana)

| Column | Type |
|---|---|
| `key` TEXT PK (contoh: `"youtubeCookiePath"`, `"defaultDownloadDir"`) |
| `value` TEXT (JSON.stringify jika complex) |
| `updated_at` INTEGER ms |

All default values (12 keys) defined in [`settingsDefaults` object of database.ts](file:///C:/Users/snwd/Videos/turbodownoader/TurboDownloader-1/src/server/database.ts#L37-L60).
Auto inject ke `getAllSettings()` return; tidak perlu INSERT manual di DB.

### Table: `event_log` (append-only audit log)

| Column | Type |
|---|---|
| `id` INTEGER PK AUTOINCREMENT |
| `timestamp` INTEGER ms INDEX DESC |
| `level` TEXT (`info\|warn\|error\|debug`) |
| `category` TEXT (contoh: `"youtube-extractor"`, `"database"`, `"ws-broadcast"`) |
| `message` TEXT |
| `task_id` TEXT FK (nullable, link ke tasks.id) |
| `extra_json` TEXT JSON (stack traces, object dumps) |

*Browsable via Settings → Advanced → View Event Log (future feature).*

---

## 🎬 YouTube Engine Internals (Critical for 0-bytes bug avoidance)

This is the most fragile piece of the app. YouTube secara aktif mengubah signature extractor setiap minggu, dan jika salah 1 argumen → playability status `UNPLAYABLE` → 0 bytes failed.

**Pipeline lengkap** didefinisikan di [`youtube-dl-handler.ts#L60-L480`](file:///C:/Users/snwd/Videos/turbodownoader/TurboDownloader-1/src/server/youtube-dl-handler.ts#L60-L480):

```
YouTube task → DownloadTask.start()
       │
       ├─ ytArgs chain (17 args total, DI BAWAH INI YANG PALING PENTING):
       │    1.  -S  vcodec:h264,res:1080,fps,res,acodec:m4a,br   ← sort format priority
       │    2.  -f  "bestvideo*+bestaudio/best/.../best"           ← selector (fallback chain)
       │    3.  --ffmpeg-location <bundled ffmpeg-static path>      ← jika tidak ada = fallback progressive 360p
       │    4.  --merge-output-format mp4
       │    5.  --cookies <absolute cookies.txt path> ←⭐ INJECT DARI DB SETTINGS youtubeCookiePath
       │    6.  --extractor-args "youtube:player_clients=android,web,ios,mweb,web_embedded,tv_downgraded"
       │         ⚠️ ANDROID FIRST! Hindari visionos default (sering UNPLAYABLE).
       │    7.  --js-runtimes node        ←⭐ WAJIB: pakai node.exe untuk EJS challenge solver
       │         Jika ini MISSING: WARNING "No supported JavaScript runtime… formats may be missing" → UNPLAYABLE
       │    8.  --add-header "Referer:https://www.youtube.com/"
       │    9.  --add-header "Origin:https://www.youtube.com"
       │   10.  --add-header "Accept-Language:en-US,en;q=0.9,id;q=0.8"
       │
       ├─ spawn attempt 1: shell=false (CreateProcess raw) — ini primary.
       ├─ spawn attempt 2: shell=true  — fallback Windows quoting edge case.
       │
       ├─ stdout parse: PROGRESS:downloaded/total/speed/eta NDJSON → patch task bytes%  (strictly monotonic check!)
       ├─ stderr collect: jika ERROR = parse error code, masuk event_log, set status failed.
       │
       └─ on close code=0 → ffmpeg faststart optimize (jika MP4) → status completed → broadcast tasks/completed.
```

### 3 Rules to Avoid YouTube Failures (learned dari debugging sessions):

1. **NODE.JS WAJIB ADA ≥ v22 DI PATH** (`--js-runtimes node` akan resolve `where.exe node`). Tanpa ini: YouTube `visionos player playability=UNPLAYABLE`.
2. **Player client = ANDROID URUTAN PERTAMA** (bukan web/visionos). Ini yang paling sedikit bot detection flag. Jangan ganti urutan.
3. **Untuk konten restricted/usia/login-wajib**: Export cookies browser jadi `cookies.txt` (Netscape format) dan set **Settings → Quality → YouTube cookies.txt Path** absolute path ke file itu. Tanpa cookies YouTube modern 2025 sering mark playability=UNPLAYABLE cold IP.

---

## 🐛 Troubleshooting FAQ (Common Issues)

Berikut solusi untuk masalah yang sering dilaporkan (sudah diverifikasi dari 2 debug session):

---

### Q1. Semua task YouTube status **Failed** / **`0 Bytes / 0 Bytes`** dari awal, bahkan tidak ada progress sama sekali.

**Root Cause Paling Umum (H4 confirmed dari debug session):**
- Import error module resolution (`ERR_MODULE_NOT_FOUND: './settings-store.js'`) di youtube-dl-handler → `startYoutubeDlDownload() TIDAK PERNAH jalan`.
- Atau: Node.js TIDAK TERINSTALL di PATH (tidak ada `node.exe`), jadi yt-dlp EJS runtime gak bisa solve challenge → `UNPLAYABLE visionos player`.

**Solusi (3 langkah cek):**
```powershell
# 1. Pastikan node.exe TERSEDIA di PATH (WAJIB)
node --version
#    Expected output: v22.19.0 (atau lebih baru). KALAU TIDAK ADA: install Node 22 LTS.

# 2. Typecheck project untuk memastikan TIDAK ADA import broken (selalu jalan sebelum run server):
npm run lint
#    Expected: 0 errors. Kalau ada ERR_MODULE_NOT_FOUND di youtube-dl-handler.ts →
#               cek import L9: harus "import { getAllSettings } from './database.js';" (bukan settings-store).

# 3. Restart server dev (WAJIB setiap kali ganti backend source):
#    Ctrl+C dua kali, lalu npm run dev LAGI.
```

---

### Q2. YouTube tertentu berhasil, YouTube LAINNYA status **Failed 0 bytes**.

**Root Cause:** `playability status=UNPLAYABLE` untuk default player. Biasanya untuk konten region-locked / age-restricted / bot flagged IP.

**Solusi:**
1. Export **`cookies.txt`** dari browser yang SUDAH LOGIN YouTube. Rekomendasi extension Chrome: **Get cookies.txt LOCALLY**.
2. Buka **Settings → Quality → YouTube cookies.txt Path** → paste path absolut contoh: `C:\Users\you\Downloads\youtube_cookies.txt`.
3. Klik **Save Changes** → Delete task failed → Retry URL itu. Harusnya berhasil.

---

### Q3. Download MP4 **hasilnya cuma ada suara (audio-only .m4a / 0 video track)**.

**Root Cause:** `ffmpeg` binary TIDAK TERSEDIA → fallback format selector progressive TERPILIH single audio stream.

**Verifikasi:**
```powershell
# Buka di browser:
curl http://localhost:3000/api/health
# Expected: services.ffmpeg = "ok", ffmpegBinary = path menunjuk ke bundled ffmpeg-static.
```

**Solusi permanent:** Jangan reinstall `node_modules` dengan `--ignore-scripts`. Script install `ffmpeg-static` harus jalan untuk extract binary ~75 MB ke node_modules. Jika binary hilang:
```powershell
rm -rf node_modules/ffmpeg-static
npm install ffmpeg-static --no-audit --no-fund  # re-extract binary
```

---

### Q4. UI menampilkan status Downloading TETAPI server log sudah completed (stuck di WebSocket).

**Root Cause:** WebSocket connection closed sebelum message `tasks/completed` diterima (lihat `debug-ws-closed-download-stuck.md` session). Biasanya proxy corporate / timeout OS.

**Workaround sekarang (fix ada di useDownloadsWebSocket):**
- Automatic reconnect backoff 1-16 detik. Setelah reconnect → emit `tasks/request_full` untuk sinkron full state.
- Jika masih stuck: F5 refresh halaman (get all state via REST `/api/downloads`).

---

### Q5. File 300MB aneh size progress **turun drastis** (dari 50% → 10% lagi secara visual).

**Root Cause:** Progress NDJSON tidak di-validate `strictly monotonic increase` (yt-dlp kadang emit progress reset ketika restart segment).

**Fixed (already):** Di yt-dlp-handler line parse progress, ada guard `if (newDownloaded < lastReportedDownloaded) return;` — mencegah angka turun. Jika masih terjadi, report sebagai bug.

---

## 🎯 Settings Page Reference

5 tab di SettingsModal (dibuka via icon gear ⚙️ header kanan atas):

| Tab | Penting Keys | Default | Notes |
|---|---|---|---|
| **General** | `defaultDownloadDir` | `./downloads` | Path output. bisa absolute `C:\Users\you\Videos` |
| | `trashRetentionDays` | `30` | Otomatis permanent delete trash item setelah N hari. |
| | `autoMergeSegments` | `true` | Untuk direct HTTP multi-threaded. false = biarkan potongan .part tidak di-gabung (debug). |
| | `autoOptimizeMp4` | `true` | Jalankan ffmpeg faststart moov atom ke depan. Matikan = disable 2-3 detik tambahan processing. |
| **Networking** | `maxConcurrentDownloads` | `3` | Max task jalan bersamaan (lebih = lebih bandwidth). |
| | `defaultConnections` | `8` | Jumlah segment paralel untuk direct HTTP. YT selalu 1. |
| | `maxBandwidthKbps` | `0` (unlimited) | Global throttle bandwidth (0 = unlimited). |
| **Quality** | `defaultVideoQuality` | `"auto"` (1080p) | 480p/720p/1080p/4k/audio-only. |
| | `youtubeCookiePath` | `""` (empty) | ⭐ SANGAT PENTING: absolute path ke `cookies.txt` Netscape. |
| | `instagramCookieHeader` | `""` (empty) | Raw header Cookie untuk Instagram (bypass login wall). |
| **Notifications** | `notificationsEnabled` | `true` | Web Notification API toast ketika task completed / failed. |
| **Advanced** | `theme` | `"light"` | 🔒 **Locked** (hard constraint project: TIDAK ADA dark mode. Selalu light mode premium). |
| | `exportDB` / `wipeDB` | — | Backup / wipe actions. |

---

## 🔐 Security & Hardening Notes

- **Content Security Policy (CSP)** di `server.ts` Helmet strict: `'self'` hanya, kecuali:
  - `img-src https:` izinkan thumbnail eksternal YouTube/Instagram CDN.
  - `media-src https:` izinkan streaming video source external (player embed).
  - `connect-src ws: wss: http: https:` izinkan WebSocket broadcast.
- **No Google Fonts CDN** (blocked CSP default) → font **Inter** via `@fontsource-variable/inter` self-hosted di node_modules.
- **Rate limit 2/detik IP** hanya di `POST /api/downloads` (mencegah spam submit URL).
- **Zod validation** di semua input body/param; unknown keys di-strip.
- **Process kill safety**: Setiap pause/delete task = `SIGKILL` (Unix) / `taskkill /F /T` (Windows) yt-dlp + ffmpeg child processes (tidak ada orphan zombie).

---

## 🚀 Deployment Options

### Local Network (LAN) - Paling Recommended untuk Pribadi

```bash
npm run build:all
set PORT=3000
set CORS_ORIGINS=http://localhost:3000,http://192.168.1.20:3000
npm start
```

Akses dari HP/Lain di jaringan yang sama: `http://<IP-KOMPUTER>:3000`.

### Vercel / Railway / Render (Backend + Frontend Combined)

Config file `vercel.json` + `.vercelignore` sudah template. Catatan krusial:
1. `yt-dlp` & `ffmpeg-static` binary **WAJIB MENYESUAIKAN PLATFORM DEPLOY** (Vercel adalah Linux x64). Install ulang dependencies di build step platform target, JANGAN upload binary Windows `node_modules` dari lokal.
2. SQLite file write: **Pakai volume / persistent disk (Railway/Render).** Vercel Serverless = ephemeral FS; database akan hilang tiap redeploy (untuk Vercel lebih baik pakai PostgreSQL nanti, bukan SQLite).

---

## 📜 License

MIT. See root `LICENSE` file.

