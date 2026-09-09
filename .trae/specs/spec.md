# Spesifikasi: TurboDownloader v3.0 — Web App Kelas Dunia Multi-Platform Video Downloader

## 1. Problem Statement

TurboDownloader saat ini (v2.0) adalah MVP web app yang berhasil bekerja untuk YouTube direct-download, namun **jauh dari standar "kelas dunia"**:

- **Dukungan situs media TIDAK LENGKAP**: Cuma YouTube, Facebook, TikTok yang ada di /api/analyze. Instagram, Twitter/X, Vimeo, Dailymotion, Bilibili, Reddit, Pinterest, Twitch Clips, SoundCloud, Spotify (preview), dll TIDAK BISA didownload meskipun dependensi library-nya terpasang tapi TIDAK DIPAKAI.
- **Semua data hilang jika server restart**: `better-sqlite3` sudah dipasang di package.json tapi TIDAK PERNAH dihubungkan ke DownloadManager. Semua state hanya di in-memory `Map<string, DownloadTask>`.
- **Keamanan RENTAN**: Tidak ada rate limiting API, tidak ada sanitasi input URL/filename, tidak ada validation, tidak ada WAF dasar. Server.ts bisa di-DDOS atau path injection.
- **Realtime WebSocket terbuang**: Backend sudah setup WebSocket server + broadcast setiap 1 detik, tapi frontend `App.tsx` SAMA SEKALI tidak connect — hanya menggunakan HTTP polling 1 detik sekali dengan setTimeout. Boros resource dan 3x lebih lambat.
- **TypeScript longgar**: `strict: false`, sisa import Capacitor (di-comment), sisa @tauri-apps di dependencies, package.json main masih `electron.js` padahal sudah web app.
- **Tidak ada Settings UI & User Preference**: User tidak bisa ubah download folder, default quality YouTube (hanya 1080p vs Best), limit bandwidth global, max concurrent download, notifikasi toggle.
- **Fitur production TIDAK ADA**: Dark mode, keyboard shortcut, drag-drop paste URL, batch import URL list (CSV/txt), download scheduler, trash/recycle bin before delete, auto-shutdown setelah complete, queue priority.
- **Player in-app buruk**: `/api/stream` TIDAK ADA support Range header (video tidak bisa seek/drag playhead), tidak ada subtitle display, tidak ada volume persist.
- **Post-processing broken**: ffmpeg repair dan optimization call selalu gagal karena ffmpeg tidak ada di PATH dan tidak ada auto-installer ffmpeg-static.
- **Bloated dependency**: 8+ unused dependency (@distube/ytdl-core, youtubei.js, @google/genai, @jerrycoder/instagram-api, @tauri-apps/api + cli, src-tauri/ folder 500MB+ binary artifacts, android/ capacior folder, test_*.mp4 file sampah 3 file di root).

Goal: Upgrade TurboDownloader v2.0 menjadi **v3.0 KELAS DUNIA** dengan semua fitur standar IDM / JDownloader / 4K Video Downloader, dalam format web app murni (tanpa Electron/Tauri/Capacitor) agar mudah di-audit user.

---

## 2. Users & Goals

| User | Goals |
|---|---|
| **User Indonesia (Primary - ATPM market)** | Download video/audio dari SEMUA sosial media lokal & global (YouTube Shorts, TikTok, Instagram Reels/Story, Facebook Reels, Twitter/X Video, Dailymotion, Bstation/WeTV, Spotify/Joox audio, Telegram link) |
| **Power User / Auditors** | Source code transparan, web-only tanpa binary native, SQLite persistence (bisa lihat database), Settings lengkap, keyboard shortcut, batch import URL |
| **Casual User** | Paste URL → otomatis sniff media → pilih quality → download. Tidak perlu install ffmpeg. UI clean, dark mode tersedia, notifikasi desktop otomatis. |

### Non-Goals (TIDAK DIKERJAKAN)
- ❌ Bukan native app installer. Tetap **web app murni (http://localhost:3000)** sesuai project_memory constraint.
- ❌ Tidak membuat user account/login / multi-user auth. Tetap single-user local app.
- ❌ Tidak membuat Chrome extension / native integration. Cuma web UI.
- ❌ Tidak deploy ke public cloud (hosting). Fokus local workstation install.

---

## 3. Functional Requirements (FR)

### FR-K1: Universal Media Extractor (18+ Platform Support)
Sistem /api/analyze dan DownloadTask.initialize() HARUS support ekstraksi media dari platform berikut, dengan order fallback engine:

1. YouTube (youtu.be, youtube.com, /shorts/, /live/) — priority: youtube-dl-exec yt-dlp → play-dl
2. TikTok (tiktok.com, vt.tiktok.com) — Snaptik/TikWM API fallback
3. Instagram Reels/Story/Post/IGTV (instagram.com, instagr.am) — @jerrycoder/instagram-api → instagram-scraper fallback
4. Facebook/FB Reels/FB Watch (facebook.com, fb.watch, fb.com) — @renpwn/fb-downloader → yt-dlp fallback
5. Twitter/X Video & GIF (twitter.com, x.com, tweet with video) — yt-dlp engine
6. Reddit Video with audio (reddit.com, v.redd.it) — gallery extract fallback
7. Vimeo (vimeo.com, player.vimeo.com) — yt-dlp
8. Dailymotion (dailymotion.com, dai.ly)
9. Bilibili / Bstation (bilibili.com, bilibili.tv) untuk pasar SEA
10. Twitch Clips & VODs (clips.twitch.tv, twitch.tv/videos)
11. Pinterest Video pin (pinterest.com/pin/)
12. SoundCloud audio (soundcloud.com)
13. Spotify episode/show/30s preview URL (spotify.com)
14. LinkedIn Learning video (linkedin.com/learning)
15. 9GAG video post (9gag.com/gag/)
16. Imgur video/gallery (imgur.com/)
17. Streamable/Vidyard/Loom CDN short video (streamable.com, loom.com/share, vidyard.com)
18. Generic direct stream HLS/DASH (.m3u8, .mpd) + Generic HTTP direct-file fallback

**Fallback rule**: Setiap platform jika engine pertama GAGAL → otomatis pindah ke youtube-dl-exec yt-dlp (karena yt-dlp support 1700+ situs) → terakhir HEAD request direct file. TIDAK BOLEH langsung silent-fail dengan "Failed 0 bytes" seperti sebelumnya.

---

### FR-K2: SQLite Persistence Layer
Semua task download, settings, dan log history HARUS disimpan di SQLite via `better-sqlite3`. Kriteria:
- Schema 3 tabel: `tasks(id uuid PK, url, filename, total_size, downloaded_size, status TEXT, speed, error TEXT, category TEXT, num_conns INTEGER, created_at INTEGER, completed_at INTEGER, file_path TEXT, metadata_json TEXT)` + `settings(key PK, value TEXT)` + `event_log(id INTEGER PK AUTOINCREMENT, task_id FK, message TEXT, level TEXT, ts INTEGER)`.
- App start → migrate schema if not exists.
- Setiap action (task created / status changed / progress tick setiap 5 detik / deleted) → sync ke database dengan async debounce.
- Restart server → restore ALL tasks from SQLite, including status paused/error/downloading (yang interrupted ditandai error dan bisa resume via partial file jika ada).
- UI Settings page bisa Export DB JSON / Import / Wipe All History.

---

### FR-K3: Security & API Hardening
- **Rate limiting**: Express middleware `express-rate-limit`. /api/downloads POST = max 20 req/menit per IP. /api/analyze POST = max 30 req/menit. Tanpa bypass.
- **Input validation** zod schema untuk SEMUA body request. URL wajib valid http(s) URI. Filename wajib sanitize (tidak ada path traversal `../`, tidak ada null byte). Ukuran connections harus integer clamp 1-32.
- **CORS strict**: Hanya allow origin localhost / 127.0.0.1 + LAN private range 192.168.* / 10.*. Public IP blocked.
- **Helmet.js**: security headers + frame-options deny.
- **Directory traversal prevention**: Semua akses file downloads folder wajib melalui `path.resolve()` + `startsWith(downloadDir)` check dengan throw 403.
- **Dependency audit**: Remove @tauri-apps/*, remove android/ folder, remove src-tauri/ folder (500MB+ binary unused), remove electron.js main from package.json, remove file test_*.mp4 sampah di root, remove unused package (@google/genai, youtubei.js, @distube/ytdl-core if unused).

---

### FR-K4: WebSocket Real-time (No Polling)
Frontend `App.tsx` HARUS connect ke `ws://localhost:3000` WebSocket (yang sudah ada setupnya tapi TIDAK DIGUNAKAN). Kriteria:
- WebSocket subscribe → client menerima INIT, NEW_DOWNLOAD, UPDATE_DOWNLOAD, DELETE_DOWNLOAD, UPDATE_ALL events.
- Hanya HTTP polling sebagai **fallback** jika WebSocket gagal connect setelah 3x retry (backoff).
- Hapus setTimeout polling 1000ms di App.tsx ketika WS aktif.
- Upload progress / YouTube merging progress update <200ms latency via WS vs 1000ms poll.

---

### FR-K5: Settings UI Lengkap (Persistent)
Halaman `/settings` client-side route (SPA hash-based atau state-based modal fullscreen) dengan:
1. **Downloads**: Default output folder (path user input + browse via API), Max concurrent downloads (1-16 default 4), Default connection per task (1-32 default 8), Default YouTube video quality (Best / 2160p4K / 1440p / 1080p / 720p / 480p / 360p), Default format (MP4 H264 / MKV / WebM / Audio MP3 Only / Audio M4A), Extract Audio Only toggle.
2. **Networking**: Global bandwidth limit KB/s (0 = unlimited), Proxy HTTP/SOCKS5 (optional untuk bypass region lock), User-Agent custom (default desktop Chrome), Retry count (default 10), Retry delay seconds (default 5).
3. **Notifications**: Web Notification toggle (granted/denied), Sound alert complete toggle, Auto-open file folder complete toggle.
4. **Performance**: Auto-convert to universal MP4 (AAC+FastStart) toggle (default OFF jika ffmpeg tidak ada — tapi auto-download ffmpeg-static platform binary di backend ketika toggle ON pertama kali).
5. **Privacy**: Auto-clear task history after (never / 1 hari / 7 hari / 30 hari), Delete physical file when delete task from UI (with Trash prompt confirmation), Enable debug logging toggle.
6. **About**: Version info, Engine (yt-dlp version check), Disk usage download folder, DB size, link source code GitHub.

Semua settings disimpan ke SQLite settings table via POST /api/settings (GET + POST).

---

### FR-K6: UI/UX Production Grade
- **Dark / Light / System theme** dengan icon sun/moon toggle. Tailwind dark class support di root. Persist ke localStorage + sync ke settings.
- **Keyboard Shortcuts**: `Ctrl+N` = New Download, `Ctrl+M` = Media Sniffer, `Space` = pause/resume selected, `Delete` = remove selected, `Ctrl+A` = select all, `Ctrl+P` = pause all, `Ctrl+R` = resume all, `/` = focus search.
- **Drag & Drop + Paste URL**: Area drop di NewDownloadModal (drag file .txt/.csv URL list → batch import) + global `window.clipboard paste event` ketika fokus di app → auto buka modal with URL terisi.
- **Batch Import UI**: Upload .txt / .csv berisi URL 1 per baris → tampilkan preview count → confirm → bulk queue.
- **Trash Bin soft-delete**: Default ketika user klik delete → task dipindah ke status `deleted` (tersembunyi di UI kecuali buka Trash category). Permanent delete + file unlink hanya ketika user klik "Empty Trash" atau "Delete Forever" di konfirmasi kedua.
- **Scheduler**: Panel kanan "Schedule Downloads" → checkbox "Only download between" jam awal-jam akhir, option auto-start queue ketika app start.
- **Realtime Speed Graph**: Di Header, mini sparkline bandwidth 60 detik terakhir menggunakan library ring-buffer array 60 item + SVG path.
- **Empty state ilustrasi SVG** untuk setiap category (BUKAN cuma icon Inbox).

---

### FR-K7: Post-Processing Toolchain + FFmpeg AutoInstall
- **Backend**: pertama kali ketika user toggle "Auto optimize MP4", download `ffmpeg-static` binary (platform Windows/Linux/Mac auto-detect) ke `./bin/ffmpeg.exe` atau path user. TIDAK BOLEH depend global PATH ffmpeg.
- **Fitur repair di VideoPlayerModal**: jika user klik "Repair Compatibility" → panggil local bin ffmpeg dengan `-c:v copy -c:a aac -b:a 128k -movflags +faststart`, update status task "optimizing" seperti status "merging" di progress bar.
- **Extract Audio Only**: ketika user pilih kualitas "Audio MP3 320kbps" → youtube-dl post processor `--extract-audio --audio-format mp3 --audio-quality 0`.
- **Auto-generate thumbnail JPG** 320px untuk setiap video completed (ffmpeg -ss 3 -frames:v 1) → simpan di ./downloads/.thumbs/ → tampilkan di DownloadItem kartu sebagai cover.

---

### FR-K8: Video Player Full-Featured
- **Route /api/downloads/:id/stream** harus support HTTP Range header byte-range dengan benar (sekarang cuma `res.sendFile` tanpa handling range → video tidak bisa seek). Implementasi manual chunked stream dengan `fs.createReadStream({start,end})` → Content-Range → 206 Partial Content.
- **HTML5 player**: di VideoPlayerModal tampilkan native controls + custom overlay: seekable progress bar buffer indicator, volume slider dengan mute persist, playback speed (0.5x/1x/1.25x/1.5x/2x), fullscreen button, shortcut (Arrow Left/Right = seek 5s, Arrow Up/Down = volume, F fullscreen, M mute).
- **Thumbnail preview on hover**: jika .thumbs file ada → show tooltip gambar ketika hover progress bar.
- **Subtitle support**: jika YouTube video ada subtitle dan user enable "Download subtitle", simpan .srt sidecar → player load via `<track>` tag.

---

### FR-K9: Download Engine Enhancements
- **YouTube adaptive**: Settings "Avoid 4K if > 500MB" (auto turun resolusi ke 1080p untuk hemat storage), "Embed subtitle" toggle.
- **Resume partial file**: direct axios multi-thread mode BISA resume dari byte offset yang sudah ada (sekarang start selalu dari 0 → restart download dari awal). Cek existing file size → segments start adjust dari existing bytes.
- **YouTube DL direct mode** (yang sudah benar kemarin) ditambah: extract subtitle option, embed thumbnail to MP4 metadata.
- **Priority queue**: User bisa reorder task via drag-drop di UI (before DownloadItem map) atau kanan klik "Move to Top / Bottom".
- **Bandwidth throttling global**: settings max bandwidth → token bucket rate limiter pada setiap axios download stream wrapper per task.

---

### FR-K10: Monitoring, Logging, Error UX
- Semua error user-facing (download gagal, extractor gagal, network timeout) HARUS menampilkan **pesan error yang spesifik dan langkah perbaikan**, bukan cuma "Failed". Contoh: `Gagal download Instagram Reels: login cookie tidak di-set. Buka Settings → Networking → paste Instagram session cookie atau gunakan opsi Login with Browser Extension.`
- **Toast notifications** (selain Web Notification): UI toaster di sudut kanan-bawah dengan style success/error/info.
- **TaskDetailsModal**: tab "Logs" → lihat semua event_log history per task (300 baris terakhir).
- **Health page / About**: status semua engine test (yt-dlp OK? play-dl OK? ffmpeg OK? SQLite OK? disk space?).

---

## 4. Non-Functional Requirements (NFR)

### NFR-1: Performance
- **Lighthouse Score ≥ 90** untuk Performance, Accessibility, Best Practices, SEO (SPA local).
- **Time to Interactive < 2s** di laptop mid-range Intel i5 gen-10, SSD.
- **Memory usage server < 500MB** dengan 50 concurrent task (garbage collection axios stream buffer).
- **DB read latency getAll() < 20ms** untuk 10.000 tasks di SQLite.

### NFR-2: Reliability
- **Build sukses 100%**: `npm run build:all` (client vite build + server tsc build) harus lulus tanpa warning.
- **Lint lulus 100%**: `npm run lint` (tsc --noEmit) strict mode ON.
- **Resume-safe**: jika server dimatikan paksa ketika downloading 8 file, ketika restart semua 8 file muncul status=error dan ketika user klik Resume → lanjut dari byte terakhir (bukan dari awal, kecuali YouTube mode yang harus ulang yt-dlp).

### NFR-3: Maintainability
- **Dependency size turun ≥ 30%**: menghapus semua package unused + folder src-tauri/ dan android/.
- **TypeScript strict**: `tsconfig.json strict: true` dengan noUnusedLocals, noUnusedParameters. Fix semua error type.
- **Boundary separation**:
  - `src/server/media-extractors/*.ts` — masing-masing platform file terpisah (YouTubeExtractor, InstagramExtractor, etc) dengan interface `Extractor` → buang switch-case raksasa di server.ts /api/analyze.
  - `src/server/persistence/SQLiteStore.ts` — database layer (bukan inline di DownloadManager).
  - `src/server/security/*.ts` — rate limit, validation, CORS, sanitize.

### NFR-4: Auditability (sesuai user profile "lebih memilih versi web daripada installer desktop untuk kemudahan audit kode")
- Setiap file < 400 line. DownloadTask.ts saat ini ~1400 line → dipecah menjadi:
  - DownloadTask.ts (class utama, <300 line)
  - youtube-dl-handler.ts (progress parsing & process management)
  - direct-http-downloader.ts (multi-thread chunked axios engine)
  - ffmpeg-toolchain.ts (post-processing, repair, thumbnail, extract audio)
  - task-persistence.ts (serialize / restore ke SQLite)
- Tidak ada eval, tidak ada dynamic require, semua URL API third-party di-dokumentasi di .env.example dengan comment sumber official.

### NFR-5: Accessibility
- Semua button punya aria-label
- Kontras warna AA 4.5:1 di dark dan light mode
- Keyboard operable penuh (Tidak click-only)
- `prefers-reduced-motion`: disable animation framer-motion ketika user setting system reduce motion.

---

## 5. Constraints, Dependencies, Assumptions

### Constraints (Tetap)
- Web app ONLY. DILARANG kembali ke Electron / Tauri / Capacitor. (Project memory hard constraint)
- Tidak membuat installer / binary. Entry point server = `npm run dev` tsx server.ts → localhost:3000.
- Web Notification API native browser. DILARANG menggunakan Capacitor LocalNotifications.

### Dependencies (Akan ditambahkan)
- `zod` — schema validation
- `express-rate-limit`
- `helmet`
- `ffmpeg-static` — binary auto-include
- `@ffmpeg-installer/ffmpeg` (jika ffmpeg-static berat) OR download binary manual
- Optional: `dexie` jika ingin client-side query builder tapi tidak perlu — SQLite server-side better via better-sqlite3.
- `react-router-dom` — untuk client-side routing /settings, /about, /trash, /batch.
- `clsx + tailwind-merge` sudah ada, OK.
- `sonner` atau `react-hot-toast` untuk UI toast.

Dependency yang AKAN DIHAPUS:
- @tauri-apps/api, @tauri-apps/cli
- android/ folder, src-tauri/ folder (seluruhnya)
- @google/genai (unused)
- youtubei.js (unused, jika yt-dlp sudah cover semua kasus YouTube termasuk 18+)
- @distube/ytdl-core (unuse — pakai youtube-dl-exec + play-dl saja)
- File test_*.mp4 3 file di root repo (sampah debugging)
- capacitor.config.ts, fix-permissions.js, MASTER_PLAN.md (jika bukan bagian app) → pindahkan ke .archive/

### Assumptions
- User menjalankan di local Windows 10/11 workstation (bukan public server). Rate limit CORS allow LAN private IP.
- User punya koneksi internet aktif untuk pertama kali download ffmpeg-static binary (≈80MB).
- yt-dlp (youtube-dl-exec) menggunakan internal binarynya yang auto-update. Tidak perlu install global yt-dlp.

---

## 6. Open Questions

1. **Instagram Session Cookie**: Untuk private Story/Reels Instagram biasanya butuh cookie sesi login. Apakah kita: (A) Buat field settings "Instagram Cookie Header" (raw string yang user copy dari browser devtools), atau (B) Hanya support public post saja v3.0 dan private support nanti?

2. **YouTube Age-Restricted / Private Video**: Same question. Apakah settings ada input "YouTube cookies.txt path" atau skip dulu?

3. **Download Folder Default**: Sekarang `./downloads` (relative ke project root). Apakah sebaiknya default ke OS user home directory `~/Downloads/TurboDownloader` via `os.homedir()`? Atau biarkan relative dan user ubah di Settings.

4. **Batch Import Support**: Apakah perlu parsing CSV dengan custom quality per URL, atau cukup plain TXT (1 URL per baris, semua pakai default quality)?

5. **Trash Soft-Delete + Soft-Delete File**: Apakah file fisik juga dipindah ke `./downloads/.trash/` folder (bisa restore dengan file explorer), atau cuma task record yang di-soft-delete (file tetap di lokasi tapi task UI hilang)?

---

## 7. Acceptance Criteria

### Rule AC (Pass/Fail Biner)

| ID | Tipe | Rule | Bukti |
|---|---|---|---|
| AC-01 | rule | `npm run lint` lulus 100% dengan strict: true di tsconfig.json | Run command + screenshot exit code 0 |
| AC-02 | rule | `npm run build:all` (vite client + tsc server) sukses tanpa error | Build output present, no TS errors |
| AC-03 | rule | 10 platform media random test (YouTube / TikTok / Instagram public / FB / X Twitter / Vimeo / Dailymotion / Reddit / SoundCloud / Pinterest) via /api/analyze menghasilkan minimal 1 format valid (TIDAK SEMUA Failed). Ekstraksi engine fallback yt-dlp TIDAK BOLEH silent gagal tanpa message jelas | Test script /api/analyze curl batch per platform |
| AC-04 | rule | Download task disimpan ke SQLite DB `turbo.db` di project root. Restart server → semua task (including error/paused) muncul kembali di UI dan bisa di-resume | DB file exist + restart test + UI list match before shutdown |
| AC-05 | rule | Rate limit aktif: kirim 25 request POST /api/downloads dalam 1 menit → request ke-21 harus kembalikan 429 Too Many Requests | ab/script load test 25 req |
| AC-06 | rule | WebSocket aktif di frontend. Buka DevTools Network → WS tab → ada 1 koneksi ws://localhost:3000/ dan menerima event UPDATE_DOWNLOAD setiap detik ketika ada downloading task. Tidak ada setTimeout 1000ms polling ketika WS OK. | Chrome DevTools Network screenshot |
| AC-07 | rule | Settings page ada, minimal 5 kategori (Downloads, Networking, Notifications, Privacy, About). Perubahan setting tersimpan ke DB dan restart server tidak hilang. | UI screenshot Settings + restart persistence test |
| AC-08 | rule | Dark/Light theme toggle ada dan berfungsi. Persist di localStorage. Atribut `class=dark` di html root. | Screenshot UI dark mode + light |
| AC-09 | rule | /api/downloads/:id/stream support Range request. Test `curl -H "Range: bytes=1048576-2097152" http://localhost:3000/api/downloads/:id/stream --output out.mp4 | head -c 1048576` → status 206 + Content-Range header ada + output size tepat 1048576 byte | Curl command output |
| AC-10 | rule | ffmpeg post-processing tidak lagi depend global PATH. Optimize button di VideoPlayerModal berfungsi (file hasil repaired > 1000 bytes) tanpa error "ffmpeg is not recognized" | Test repair + success return |
| AC-11 | rule | Hapus dependency + folder bloated: @tauri-apps/* hilang dari package.json, src-tauri/ tidak ada, android/ tidak ada, 8 package unused dihapus. npm install total size turun minimal 300 MB (karena src-tauri binary artifact 500MB+). | du / ls before-after, package.json diff. |
| AC-12 | rule | Dependency yang digunakan InstagramExtractor aktif berfungsi (bukan cuma terpasang tapi tidak dipakai di /api/analyze). Test Instagram public reel URL → /api/analyze return format array tidak empty | Curl test public instagram reel |

### Rubric AC (Evaluative Quality Threshold)

| ID | Tipe | Rubric (Scale 0-5, Pass ≥ 4) | Evidence |
|---|---|---|---|
| AC-R1 | rubric | **Code Modularity & Auditability**. Semua file logic < 400 line. Extractors masing-masing 1 file terpisah, persistence 1 file, security 1 file, direct http downloader 1 file, yt-dlp handler 1 file. Class DownloadTask <300 line (bukan 1400 line). Evidence: line count per file using wc -l. | Sloccount / cat -n line count |
| AC-R2 | rubric | **UI polish & UX smoothness**. Animasi framer-motion natural, empty state ilustrasi SVG ada per category, keyboard shortcut bekerja sesuai FR-K6, drag-drop batch import bisa memasukkan 50 URL txt, toast muncul untuk success/error, speed sparkline di header benar. Evidence: Screencast 30 detik 60fps demo flow | Screencast video |
| AC-R3 | rubric | **Error UX & Message Clarity**. 5 error case acak (private video, network offline, disk full, invalid URL, rate-limited by YouTube) masing-masing menampilkan error message yang SPESIFIK (tidak cuma "Failed") dengan saran langkah perbaikan. Evidence: screenshot UI 5 error case berbeda-beda, tiap pesan > 1 kalimat + actionable | Screenshot 5 error UI |
| AC-R4 | rubric | **Type Safety Strict**. Semua props typed, tidak ada `any` / `as any` casting (kecuali wrapper third-party library yang tidak punya types dengan // justified comment). `noImplicitAny: true` aktif di tsconfig. Evidence: full repo grep `: any` count < 10 (excluding node_modules) | Grep report |
| AC-R5 | rubric | **Security audit checklist**. Tidak ada path traversal di stream/download route. Tidak ada SQL injection di SQLite (semua parameterized query di better-sqlite3.prepare). Tidak ada eval / new Function. Helmet headers aktif. CORS origin strict. Evidence: curl path traversal test payload `../../etc/passwd` + burp-like scan + network tab response headers | Security test report snippet |
