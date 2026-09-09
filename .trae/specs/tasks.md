# Task Plan: TurboDownloader v3.0 Upgrade
Terkait: [spec.md](file:///C:/Users/snwd/Videos/turbodownoader/TurboDownloader-1/.trae/specs/spec.md)

## Overview
22 task terurut berdasarkan dependencies. Total coverage: Semua 12 Rule AC + semua 5 Rubric AC covered.

---

## Phase 1: Foundation & Cleanup (Low-risk, high leverage)

## Task 1: Bersihkan Dependency Bloated + Unused + Artifacts Sampah
**Status: pending**
**Priority: high**
**Dependency: tidak ada**
**Coverage: AC-11**

### Objective
Kurangi size install dari ~800MB menjadi <300MB dengan menghapus 100% yang tidak dipakai.

### Work Items
1. Hapus dari package.json dependencies: `@tauri-apps/api`, `@tauri-apps/cli`, `@google/genai`, `youtubei.js`, `@distube/ytdl-core` jika dipastikan tidak dipakai.
2. Hapus dari package.json: main "electron.js" field. Ubah jadi tidak ada atau `server.ts`.
3. Hapus folder `./android/` (recursive - Capacitor build artifact).
4. Hapus folder `./src-tauri/` (recursive - Tauri build artifacts, sekitar 500MB+).
5. Hapus file root junk: `test_direct.mp4`, `test_fix2.mp4`, `test_remux.mp4`, `capacitor.config.ts`, `fix-permissions.js`, `app-icon.png` (jika tidak dipakai index.html).
6. Verify: `npm run lint` masih lulus, `npm run build:all` masih lulus.
7. Jika @distube/ytdl-core DIPAKAI (search), TIDAK JADI dihapus — cari dulu.

### Test Requirements
- **Rule TR-1.1**: Setelah cleanup, `ls ./android ./src-tauri` error "folder tidak ada" (FileNotFound).
- **Rule TR-1.2**: `package.json` "dependencies" list TIDAK ADA kata `tauri`, `electron`, `youtubei.js`, `@google/genai`.
- **Rule TR-1.3**: `npm run lint` lulus.
- **Rubric TR-1.4 (0-5, pass >=4)**: Ukuran sebelum & sesudah (via du -sh node_modules atau Get-ChildItem recursive size) — harus turun min 300 MB untuk mendapat skor 5. Bukti: output size command before-after.

---

## Task 2: Aktifkan TypeScript Strict Mode + Fix All Type Errors
**Status: pending**
**Priority: high**
**Dependency: Task 1 selesai (utk menghindari error type di package yang dihapus)**
**Coverage: AC-01, AC-R4**

### Objective
Ubah `strict: false` jadi `strict: true` dan `noUnusedLocals/Parameters` true di BOTH tsconfig.json (frontend) DAN tsconfig.server.json (jika ada). Fix semua type error tanpa `any` casting kecuali justified.

### Work Items
1. Edit tsconfig.json: `strict: true`, `noImplicitAny: true`, `noUnusedLocals: true`, `noUnusedParameters: true`.
2. Cek tsconfig.server.json (jika tidak ada buat yang sesuai untuk backend server.ts + src/server/**) dengan strict juga.
3. Jalankan `npm run lint` → catat semua error.
4. Fix error 1 per 1: props interfaces yang kurang, return types, optional chaining dimana undefined.
5. Grep ": any" → hitung jumlah sisa. Jika di >10 tempat dan justified, tambah comment "// eslint-disable justified third-party type miss".
6. Pastikan `useYoutubeDlDirect` dan semua properties private baru di DownloadTask.ts dideklarasikan dengan type explicit.

### Test Requirements
- **Rule TR-2.1**: `npm run lint` (tsc --noEmit) exit code 0 DENGAN strict: true aktif.
- **Rule TR-2.2**: tsconfig.json strict field = true (baca file).
- **Rubric TR-2.3 (0-5, pass >=4)**: Count `grep -r ": any" src --include="*.ts" --include="*.tsx"` (exclude node_modules). Skor: 0 → 5, 1-3 → 4, 4-9 → 3, 10-19 → 2, 20+ → 0.

---

## Task 3: Pisahkan src/server/DownloadTask.ts (1400+ lines) Menjadi 6 Modular Files
**Status: pending**
**Priority: high**
**Dependency: Task 2**
**Coverage: AC-R1 (modularity)**

### Objective
Pecah DownloadTask.ts monolith menjadi file-file terpisah masing-masing <400 line dengan interface clean.

### Work Items
1. Buat `src/server/types.ts` (server-side types) — definisi interface `DownloadSegmentInternal`, `Extractor`, `PersistedTaskRecord`, dll.
2. Buat `src/server/direct-http-downloader.ts` — engine multi-threaded axios chunked, `probeTarget`, `downloadSegment`, `assembleChunks`, `mergeStream`. Semua method yang TIDAK related to YouTube/yt-dlp pindah ke sini. Expose class `DirectHttpDownloader`.
3. Buat `src/server/youtube-dl-handler.ts` — semua logic yt-dlp spawn, progress-template parsing stdout, stderr death detection, `isTrackSwitch`, `ytDlStableTotalLocked` dan flag-flag pindah ke sini. Expose class `YtDlDownloadRunner` { start, kill, onProgress, onComplete }.
4. Buat `src/server/ffmpeg-toolchain.ts` — semua call ffmpeg: repair/optimize, extract audio mp3, generate thumbnail JPG, check ffmpeg binary path. Expose `FfmpegRunner` singleton.
5. Buat `src/server/task-persistence.ts` — serialize task ke plain object + restore from plain object (DB layer nanti tinggal panggil).
6. Sisa `DownloadTask.ts` — hanya class orchestrator, state machine status (pending→initialize→downloading→merging→optimizing→completed|paused|error). Panggil direct http ATAU yt-dlp handler berdasarkan URL. Cek size class: target <350 line. Jika masih kebesaran, extract lagi.
7. Semua import chain di DownloadManager.ts harus tetep lulus compile.
8. Verify: `npm run build:all` dan run 1 test download YouTube → status completed.

### Test Requirements
- **Rule TR-3.1**: Setiap file baru line count < 400. (Gunakan `cat -n file | wc -l`)
- **Rule TR-3.2**: DownloadTask.ts (file utama sisa) line count < 350.
- **Rule TR-3.3**: `npm run build:all` lulus tanpa error.
- **Rule TR-3.4**: Test end-to-end YouTube download → completed OK.
- **Rubric TR-3.5 (0-5)**: Modularity quality — setiap file punya single responsibility, tidak ada circular import, nama function jelas. 5 = excellent separation, 3 = OK tapi masih ada cross-cutting concern yang campur, 1 = hanya rename file tapi logic masih copy-paste.

---

## Phase 2: Core Backend (Persistence, Security, Realtime)

## Task 4: Implement SQLite Persistence Layer (Schema + CRUD)
**Status: pending**
**Priority: high**
**Dependency: Task 3 (types extracted)**
**Coverage: AC-04, FR-K2**

### Objective
Aktifkan `better-sqlite3` (yang sudah terpasang tapi TIDAK dipakai) untuk storage semua task dan settings.

### Work Items
1. Buat `src/server/persistence/SQLiteStore.ts` singleton.
2. Init DB path: `./turbo.db` di project root.
3. Schema migration (IF NOT EXISTS):
   ```
   tasks (id TEXT PRIMARY KEY, url TEXT NOT NULL, filename TEXT NOT NULL, total_size INTEGER DEFAULT 0, downloaded_size INTEGER DEFAULT 0, status TEXT NOT NULL, speed INTEGER DEFAULT 0, error TEXT, category TEXT NOT NULL DEFAULT 'other', num_conns INTEGER DEFAULT 8, created_at INTEGER NOT NULL, completed_at INTEGER, file_path TEXT, metadata_json TEXT)
   settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)
   event_log (id INTEGER PRIMARY KEY AUTOINCREMENT, task_id TEXT, message TEXT, level TEXT, ts INTEGER NOT NULL, FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE SET NULL)
   ```
4. Method yang harus ada: `getAllTasks()`, `getTaskById(id)`, `upsertTask(task)`, `deleteTask(id)`, `getSetting(key, defaultVal)`, `setSetting(key, value)`, `appendLog(taskId, level, message)`, `getLogsForTask(taskId, limit=300)`.
5. Semua query HARUS parameterized (prepare statement) — NO SQL string concat untuk values.
6. DownloadManager modifikasi: constructor → loadAllTasksFromDB() → rehydrate DownloadTask instances (restore partial state jika file ada di disk).
7. Debounce autosave: perubahan progress dan speed di-save ke DB setiap 5 detik per task (tidak setiap tick). Status change langsung save tanpa debounce.
8. Method `clearCompleted` → delete dari DB juga, kecuali mode soft-delete nanti.

### Test Requirements
- **Rule TR-4.1**: File `./turbo.db` dibuat setelah app start pertama (tidak ada sebelum, ada setelah).
- **Rule TR-4.2**: Shutdown server via Ctrl+C (atau process kill SIGINT) → task yang completed 100% masih ada di UI setelah restart. Test: create 3 download tasks (1 completed, 1 paused, 1 error), kill, restart, count tasks = 3.
- **Rule TR-4.3**: setSetting("test_foo", "bar_value") → restart server → getSetting mengembalikan "bar_value".
- **Rule TR-4.4**: Semua DB access menggunakan `better-sqlite3.prepare()` dengan `stmt.run(params)` — TIDAK ADA string concat. Buktikan dengan grep source.
- **Rule TR-4.5**: Path traversal protection — semua file_path dari DB `startsWith(os.homedir()) || startsWith(projectRoot)` — atau setidaknya validate tidak mengandung `..`.

---

## Task 5: Security Hardening — Rate Limit, Validation, Helmet, CORS, Path Traversal
**Status: pending**
**Priority: high**
**Dependency: Task 4 (DB ada sebelum rate limit counter? Tidak, rate limit in memory saja OK)**
**Coverage: AC-03 (input validation), AC-05, AC-R5**

### Objective
Lindungi server.ts dari abuse, tanpa break user normal lokal/LAN.

### Work Items
1. Install package baru (bila belum ada): `express-rate-limit`, `helmet`, `zod`, `cors`.
2. Buat `src/server/security/rateLimiter.ts` — 2 limiter:
   - `apiHeavyLimiter`: /api/downloads POST + /api/analyze POST → max 20/min, standardHeaders true.
   - `apiStandardLimiter`: yang lain max 200/min.
3. Buat `src/server/security/validationSchemas.ts` dengan zod schemas:
   - `analyzeRequestSchema = z.object({ url: z.string().url().startsWith('http').max(2048) })`
   - `createDownloadSchema = z.object({ url: z.string().url(), filename: z.string().max(255).regex(/[^<>:"/\\|?*\x00-\x1F]/).optional(), connections: z.number().int().min(1).max(32).default(8) })`
   - `taskIdParamSchema = z.object({ id: z.string().uuid() })`
   - `settingsSchema = z.record(z.string(), z.string())`
4. Buat middleware `validateBody(schema)` dan `validateParam(schema)` yang return 400 dengan error.format zod.
5. Wrap HELMET: app.use(helmet()) dengan `crossOriginResourcePolicy: { policy: "cross-origin" }` (supaya stream video masih bisa diputar di <video> tag LAN).
6. CORS middleware: allow origin: `[ /localhost/i, /^https?:\/\/(127\.0\.0\.1|192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)/i, null ]`. Origins lain → 403.
7. Path traversal prevention GLOBAL: semua route yang menggunakan parameter path (misal stream route filename) WAJIB:
   ```typescript
   const safeBase = path.resolve(downloadDir);
   const userPath = path.resolve(path.join(safeBase, filenameRaw));
   if (!userPath.startsWith(safeBase)) throw createError(403, 'Invalid path');
   ```
   Apply di /api/downloads/:id/stream, /api/downloads/:id/file, dan express.static /downloads dengan dotfiles deny.
8. Buat unit test simulasi: Kirim payload `{ filename: "../../../windows/system32/calc.exe" }` → harus ditolak 400 (regex filename validator).
9. Rate limit test: 25 POST /api/downloads dengan rapid (sleep 1ms) → request ke-21 return 429.

### Test Requirements
- **Rule TR-5.1 (AC-05)**: Rate limit test script. Kirim 25 POST /api/downloads dalam <10 detik → status codes array mengandung minimal 1x 429 Too Many Requests.
- **Rule TR-5.2**: Path traversal payload `curl -X POST -H 'Content-Type: application/json' -d '{"url":"http://localhost/api/sample-demo.dat","filename":"../evil.txt"}' /api/downloads` → status 400.
- **Rule TR-5.3**: Response headers di curl -I /api/stats mengandung `X-Download-Options: noopen`, `X-Content-Type-Options: nosniff` (helmet active).
- **Rule TR-5.4**: CORS origin "https://evil.com" via `Origin: https://evil.com` → response header Access-Control-Allow-Origin TIDAK ADA atau = null (bukan evil.com).
- **Rubric TR-5.5 (0-5, AC-R5)**: Semua 9 item di Work Items diterapkan dengan benar → skor 5. Kurang 1 item → -1 point.

---

## Task 6: Aktifkan WebSocket di Frontend App.tsx (Ganti Polling)
**Status: pending**
**Priority: medium**
**Dependency: Task 3 (clean types), Task 4 (task restore works)**
**Coverage: AC-06, FR-K4**

### Objective
Frontend connect ke WebSocket server yang sudah ada (server.ts wss on("connection")) untuk real-time update, HTTP polling hanya sebagai fallback.

### Work Items
1. Buat custom hook `src/hooks/useDownloadsWebSocket.ts` dengan state machine:
   - connect(): new WebSocket(ws://localhost:3000) tapi compute protocol + host dari `window.location.host`.
   - onopen: subscribe flag.
   - onmessage: switch type (INIT, NEW_DOWNLOAD, UPDATE_DOWNLOAD, DELETE_DOWNLOAD, UPDATE_ALL) → patch downloads state.
   - onclose: retry exponential backoff 1s, 2s, 4s, 8s, max 15s. After 3 retries FAIL → fallback ke HTTP polling lama.
   - Method pause/resume/delete BISA via REST API (lebih sederhana) — tidak perlu buat WS command, cukup listen UPDATE events.
2. App.tsx replace useEffect polling dengan useDownloadsWebSocket hook.
3. Add connection status indicator di Header (kanan atas): dot green WS connected, dot yellow fallback polling, dot red disconnected. Icon Wifi/Zap kecil.
4. Jika WebSocket aktif → HAPUS timer setTimeout polling (no double network).
5. Test simulasi network drop: Chrome DevTools Network Offline → reconnect → dot yellow → hijau kembali setelah online.

### Test Requirements
- **Rule TR-6.1 (AC-06)**: Chrome DevTools Network tab → WS subpanel → ada 1 koneksi "ws://..." established, "Messages" received setiap 1 detik dengan type UPDATE_ALL saat downloading task aktif.
- **Rule TR-6.2**: Selama WS aktif, Console.log tidak ada polling calls (setTimeout fetch fires) — buktikan dengan console.timeStamp / network panel HTTP GET /api/downloads tidak terjadi setiap 1 detik (cuma 1x saat fallback).
- **Rule TR-6.3**: Saat WS OFF (block WS port di firewall) → after 3 retries polling fallback aktif dan meng-update UI dengan benar.

---

## Phase 3: Universal Media Extractor (10+ Platform)

## Task 7: Buat Universal Media Extractor Interface + Router
**Status: pending**
**Priority: high**
**Dependency: Task 3 (types)**
**Coverage: AC-03**

### Objective
Refactor /api/analyze switch-case raksasa menjadi architecture plugin-style masing-masing extractor 1 file. Fallback yt-dlp universal untuk platform yang tidak punya dedicated extractor.

### Work Items
1. Buat `src/server/media-extractors/types.ts`:
   ```typescript
   export interface ExtractorResult {
     title: string;
     formats: AnalyzeFormat[];
     engine: string; // e.g. 'play-dl', 'yt-dlp', 'instagram-api', 'direct-head'
   }
   export interface MediaExtractor {
     name: string;
     matchUrl(url: string): boolean;
     extract(url: string, ctx: ExtractorContext): Promise<ExtractorResult | null>;
   }
   export interface ExtractorContext { userAgent: string; proxy?: string; ytDlpCookie?: string; }
   ```
2. Buat file masing-masing extractor di `src/server/media-extractors/`:
   - `YouTubeExtractor.ts` → order: play-dl → yt-dlp fallback.
   - `TikTokExtractor.ts` → tikwm API (yang sudah ada) → yt-dlp fallback.
   - `FacebookExtractor.ts` → @renpwn/fb-downloader (yang sudah ada) → yt-dlp fallback.
   - `InstagramExtractor.ts` → @jerrycoder/instagram-api → yt-dlp fallback.
   - `TwitterXExtractor.ts` → pure yt-dlp.
   - `VimeoExtractor.ts` → pure yt-dlp.
   - `RedditExtractor.ts` → pure yt-dlp.
   - `SoundCloudExtractor.ts` → pure yt-dlp.
   - `BilibiliExtractor.ts` → pure yt-dlp.
   - `GenericYtDlpFallbackExtractor.ts` → matchUrl selalu return true, priority TERENDAH (match any URL http yang lain). Ekstrak dengan yt-dlp jika bisa, jika tidak ada video return null.
   - `DirectHeadProbeExtractor.ts` → HEAD request direct file, untuk direct URL yang extractor lain FAIL.
3. Buat `src/server/media-extractors/router.ts` — array of extractor dengan order: spesifik platform di DEPAN, GenericYtDlpFallbackExtractor dan DirectHeadProbeExtractor DI BELAKANG. Loop try semua extractor. Return first non-null result. Jika SEMUA return null → return 500 error dengan message "Tidak ada extractor yang bisa mendownload URL ini. Pastikan URL adalah media stream yang publik.".
4. `/api/analyze` endpoint dipanggil → gunakan router instead inline switch.
5. DownloadTask.initialize() YOUTUBE/FACEBOOK/TIKTOK detection lama → gunakan extractor router juga (agar single source of truth).
6. Perbaikan error message untuk setiap platform yang GAGAL. Misal Instagram private → `Ekstraksi Instagram gagal. Reels/Story private membutuhkan login cookie. Silakan buka Settings → Networking dan paste cookie sesi Instagram Anda. Atau coba dengan akun publik.`

### Test Requirements
- **Rule TR-7.1**: 10 platform test script → curl batch:
  ```
  1. YouTube → /api/analyze → formats.length >= 1
  2. TikTok public → >= 1
  3. FB public post video → >= 1
  4. Instagram public Reel (random cari url public) → >=1 OR jelas error butuh cookie dengan message "cookie" di dalamnya (bukan cuma "Failed")
  5. X Twitter public video post → formats>=1 OR yt-dlp error readable
  6. Vimeo video staff pick → formats>=1
  7. Reddit v.redd.it video post → formats>=1
  8. SoundCloud track → formats>=1
  9. Random direct-file → formats.length = 1 (direct probe)
  10. Random invalid URL (example.com html page) → return 500 dengan message user-friendly, TIDAK crash server.
  ```
  Total passing platform: minimal 7/10 dianggap OK.
- **Rule TR-7.2**: Setiap file extractor < 250 line.
- **Rubric TR-7.3 (0-5)**: Fallback chain yang benar: jika extractor dedicated gagal → lanjut ke yt-dlp → lanjut direct probe. Diuji dengan 2 case: YouTube dengan play-dl di-block (simulasi dengan throw error di test) → masih return result dari yt-dlp fallback.

---

## Phase 4: Settings Page, Persistent Settings API

## Task 8: Settings API + Settings Page UI (5 Kategori)
**Status: pending**
**Priority: high**
**Dependency: Task 4 (SQLite settings table + Task 6 WebSocket)**
**Coverage: AC-07, FR-K5**

### Objective
Bikin endpoint REST untuk settings + halaman Settings UI lengkap dengan kategori.

### Work Items
1. Backend routes server.ts:
   - `GET /api/settings` → return semua settings dari DB, merge dengan DEFAULT_SETTINGS object (default value jika key tidak ada).
   - `POST /api/settings` → body `{ key, value }` per key, atau bulk `{ settings: Record<string,string> }`. Validate dengan zod.
2. DEFAULT_SETTINGS:
   ```
   downloads: {
     output_folder: path.resolve('./downloads'),
     max_concurrent: 4,
     default_connections: 8,
     youtube_quality: 'best', // 'best' | '2160p' | '1440p' | '1080p' | '720p' | '480p' | '360p'
     default_format: 'mp4', // 'mp4' | 'mkv' | 'webm' | 'mp3' | 'm4a'
     extract_audio_only: false,
   }
   networking: {
     bandwidth_limit_kbps: 0, // 0 = unlimited
     proxy_url: '',
     user_agent: DEFAULT_USER_AGENT,
     retry_count: 10,
     retry_delay_seconds: 5,
     instagram_cookie: '',
     youtube_cookie: '',
   }
   notifications: {
     web_notification: true,
     sound_alert: false,
     auto_open_folder: false,
   }
   privacy: {
     auto_clear_after_days: '0', // '0' = never
     soft_delete_trash: true,
     debug_logging: false,
   }
   perf: {
     auto_optimize_mp4: false,
     download_subtitles: false,
     generate_thumbnail: true,
   }
   ```
   Serialize ke settings table dengan format JSON string per kategori, atau flat key `downloads.output_folder` → OK pilih flat key.
3. Frontend: Install `react-router-dom` (jika belum). Tambah client routes:
   - `#/` (default, app home)
   - `#/settings` (settings page)
   - `#/batch` (batch import)
   - `#/about` (health & about)
   - `#/trash` (soft-deleted tasks)
   Atau jika routing library berat, state-based modal fullscreen `currentPage: 'home'|'settings'|'batch'|'about'|'trash'` dengan URL hash listener.
4. UI Settings page: 5 tab side menu (Downloads / Networking / Notifications / Privacy / Performance). Setiap tab berisi form fields yang sesuai default settings di atas. Save button per section + autosave on blur dengan debounce 500ms. Show toast "Settings saved" setelah POST /api/settings success.
5. Settings apply LIVE: max_concurrent → DownloadManager akan menyesuaikan next task scheduling (bila task > max_concurrent, sisanya status "queued"). Default YouTube quality → ketika user create download tanpa specify quality, pilih sesuai settings.

### Test Requirements
- **Rule TR-8.1**: UI Settings page accessible via link "Settings" di header samping atau icon gear. Membuka halaman dengan 5 tab.
- **Rule TR-8.2**: Ubah `default_connections` dari 8 jadi 16, simpan, restart server, buka settings page lagi → nilai tetap 16 (persisted via DB).
- **Rule TR-8.3**: GET /api/settings response JSON mengandung minimal 15 key (dari 5 kategori).
- **Rubric TR-8.4 (0-5)**: UI polish. 5 = validasi per field input (number clamp, path input valid, proxy URL valid), tooltips setiap field yang menjelaskan fungsi, save state indicator loading saat POST. 3 = ada form tapi tanpa validasi.

---

## Phase 5: UI/UX Production Grade

## Task 9: Dark/Light Theme + System Theme Detection
**Status: pending**
**Priority: medium**
**Dependency: Task 2 (no TS error before)**
**Coverage: AC-08**

### Objective
Implement theme toggle 3 state: Dark / Light / System.

### Work Items
1. Install `next-themes` atau buat custom ThemeProvider dengan Tailwind `class` strategy.
2. index.html root `<html>` default `class="light"` + data-theme.
3. Header right side tambahkan button group 3 icon: Sun (Light) / Moon (Dark) / Monitor (System).
4. Persist ke localStorage key `turbodownloader_theme`.
5. Apply prefers-reduced-motion di App root → framer-motion reduced motion global context.
6. Semua component yang menggunakan bg-slate-50 text-slate-900 harus compatible dark:bg-slate-900 dark:text-slate-100. Lakukan sweep massal di Header, Toolbar, CategorySidebar, DownloadItem, Semua Modal, Settings page.
7. Test: Toggle Dark → UI semua panel background gelap text terang, progress bar hijau masih visible contrast AA.

### Test Requirements
- **Rule TR-9.1 (AC-08)**: `<html>` class berubah jadi `dark` ketika user click moon icon. Refresh page masih dark (localStorage persist).
- **Rule TR-9.2**: System mode (Monitor icon) ketika user ubah OS theme Windows → app auto switch match theme 1 detik setelah window focus.
- **Rule TR-9.3**: Color contrast check on 3 theme state — check text utama vs bg minimal 4.5:1. Quick test with DevTools Inspect Lighthouse.

---

## Task 10: Keyboard Shortcuts, Batch Import, Paste URL Global
**Status: pending**
**Priority: medium**
**Dependency: Task 8 (router halaman), Task 9 (theme ready)**
**Coverage: FR-K6, AC-R2**

### Objective
Power user productivity.

### Work Items
1. Buat `src/hooks/useKeyboardShortcuts.ts` effect yang listen di window level:
   - Ctrl/⌘ + N → open NewDownloadModal
   - Ctrl/⌘ + M → open MediaAnalyzerModal
   - Ctrl/⌘ + P → pauseAll
   - Ctrl/⌘ + Shift + R → resumeAll
   - Delete / Backspace → delete selected task (with confirm prompt)
   - / (slash, ketika fokus bukan di input) → focus search input
   - Ctrl/⌘ + , (comma) → open Settings page
   - Escape → close semua modal
2. Di NewDownloadModal, buat drop zone (framer-motion or native) yang menerima drop file .txt / .csv → read content, extract line by line URL yang valid http, tampilkan preview count + list URL invalid, tombol "Queue All (N items)".
3. Global paste listener: `window.addEventListener('paste')` ketika user tidak fokus ke input text field → jika clipboardText is URL valid http, auto open NewDownloadModal dan set URL field.
4. Selected task state: highlight task jika user klik kartu (single select). Didesain untuk shortcut Delete.
5. Add Keyboard Shortcut cheat sheet (button ? di footer, tekan ? → open modal popup list shortcuts).

### Test Requirements
- **Rule TR-10.1**: Ctrl+N → modal terbuka (bisa dicek state isAddModalOpen true).
- **Rule TR-10.2**: Paste URL https://example.com/video.mp4 di window (tanpa fokus input) → NewDownloadModal auto terbuka dengan URL field terisi.
- **Rule TR-10.3**: Upload 10 URL text file (1 URL per line) via drag-drop → Batch import preview count = 10 → Queue All → /api/downloads POST 10 request selesai, tasks list bertambah 10 items.
- **Rubric TR-10.4 (0-5)**: UX polish shortcuts. 5 = cheat sheet muncul, shortcut label di tooltips setiap button, paste event tidak firing ketika fokus di input text area. 3 = shortcuts work tapi tanpa dokumentasi.

---

## Task 11: Soft-Delete Trash Bin, Empty Trash, Recover Task
**Status: pending**
**Priority: medium**
**Dependency: Task 4 (SQLite add column deleted_at INTEGER), Task 8 (router halaman #/trash)**
**Coverage: FR-K6**

### Objective
Tidak langsung unlink file. User ada "safety net" 30 hari.

### Work Items
1. SQLite tasks tabel tambah column `deleted_at INTEGER DEFAULT NULL`.
2. CategorySidebar add "Trash" item dengan icon Trash2 + badge count task yang deleted_at not null.
3. Route `#/trash` hanya menampilkan task deleted_at not null.
4. Delete task di halaman utama → set `status='deleted'` dan `deleted_at = Date.now()` di DB. UI filter default (category 'all') HIDE status === 'deleted'.
5. Di halaman Trash: 3 action per task:
   - "Restore" → set deleted_at = null, kembalikan status ke status sebelumnya (simpan `previous_status` di metadata_json? Atau default paused).
   - "Delete Forever" → prompt konfirmasi "File akan dihapus PERMANEN dari disk" → baru jalankan fs.unlink + DB delete.
6. "Empty Trash" button (confirm 2 step) → delete forever semua items di trash.
7. Privacy setting "auto_clear_after_days" = 7 → app start scan tasks dengan deleted_at < now - 7*24h → auto delete forever.

### Test Requirements
- **Rule TR-11.1**: Delete task di UI utama → task hilang dari list tapi file di ./downloads/ masih exist (cari dengan fs.existsSync).
- **Rule TR-11.2**: Buka #/trash → item muncul. Click Restore → item kembali ke list utama dengan status paused.
- **Rule TR-11.3**: Click Delete Forever → file di disk hilang (fs.existsSync return false).

---

## Task 12: Speed Sparkline Graph + Realtime Stats Dashboard Mini
**Status: pending**
**Priority: low**
**Dependency: Task 2, 6**
**Coverage: FR-K6, AC-R2**

### Objective
Header sparkline 60 seconds bandwidth.

### Work Items
1. Server-side: DownloadManager expose 60-length array ring buffer speeds[]. Setiap 1 detik shift-push totalSpeed (sum semua active).
2. Broadcast via WebSocket event type "SPEED_BUFFER" setiap 1 detik.
3. Header component: render SVG 200x60 polyline dengan path dari buffer. Y scale auto max = max(buffer) * 1.1. Gradient fill hijau di bawah.
4. Mouse-hover sparkline → tooltip dengan speed value per detik.
5. Add mini stats cards yang ada sekarang (Total bandwidth, Active, Completed) + tambah "Disk Used" = total size downloads folder.

### Test Requirements
- **Rule TR-12.1**: Sparkline SVG rendering di DOM. Ketika download active → polyline bergerak setiap detik.
- **Rule TR-12.2**: Tidak ada JS error ketika buffer all zero (idle state).

---

## Phase 6: Player + FFmpeg Toolchain

## Task 13: Stream Route Range Header Support (Seekable Video)
**Status: pending**
**Priority: high**
**Dependency: Task 5 security apply global**
**Coverage: AC-09, FR-K8**

### Objective
Video player bisa seek/drag playhead dengan HTTP 206 Partial Content.

### Work Items
1. Refactor `GET /api/downloads/:id/stream` di server.ts:
   - Get filePath with path traversal protection (Task 5 rule).
   - fs.statSync untuk size total.
   - Parse `req.headers.range` jika ada:
     - bytes=start-end (misal bytes=1048576-2097152).
     - Jika range TIDAK VALID → return 416 Range Not Satisfiable dengan `Content-Range: bytes */totalSize`.
     - Jika valid → res.status(206). Set header:
       `Content-Range: bytes ${start}-${end}/${totalSize}`
       `Accept-Ranges: bytes`
       `Content-Length: ${chunkSize}`
       `Content-Type: video/mp4` (atau mime detect dari ext via mime-types package)
     - Pipe `fs.createReadStream(filePath, { start, end, highWaterMark: 1024 * 1024 })` ke res.
   - Jika tidak ada range header → status 200 dengan Content-Length = full size, pipe readStream penuh.
2. Add `Accept-Ranges: bytes` di HEAD response juga (app.head route).
3. Test dengan curl:
   ```
   curl -H "Range: bytes=1048576-2097151" -o test_chunk.bin http://localhost:3000/api/downloads/:id/stream
   wc -c test_chunk.bin → harusnya 1048576 bytes.
   curl -I output header mengandung HTTP/1.1 206 + Content-Range: bytes 1048576-2097151/ACTUALTOTALSIZE
   ```
4. VideoPlayerModal: tambahkan custom progress bar dengan buffered indicator. Test seek ke tengah → video langsung lompat (bukan buffering dari awal).

### Test Requirements
- **Rule TR-13.1 (AC-09)**: Curl range test 1MB chunk → Content-Length 1,048,576 bytes dan 206 status.
- **Rule TR-13.2**: HTML5 <video> di browser → drag playhead ke 30% → video play mulai dari detik itu, TIDAK loading dari awal.
- **Rule TR-13.3**: Invalid Range header `bytes=999999999999-` → return 416 (bukan crash 500).

---

## Task 14: FFmpeg Static Auto-Installer + Repair Compatibility + Thumbnail
**Status: pending**
**Priority: high**
**Dependency: Task 8 (settings perf tab), Task 3 (ffmpeg-toolchain.ts)**
**Coverage: AC-10, FR-K7**

### Objective
Tidak lagi depend global ffmpeg. Download binary otomatis ketika user pertama kali enable fitur.

### Work Items
1. Install `ffmpeg-static` package. Platform Windows otomatis include binary ffmpeg.exe. Check path via `require('ffmpeg-static')` resolve ke absolute path.
2. Modifikasi ffmpeg-toolchain.ts:
   - `getFfmpegPath()` → return `ffmpeg-static` path. Jika tidak ada → fallback ke global `ffmpeg` di PATH.
   - Semua call fluent-ffmpeg `.setFfmpegPath(getFfmpegPath())` (gunakan package fluent-ffmpeg yang sudah terpasang + @types/fluent-ffmpeg).
3. Repair Compatibility action di VideoPlayerModal: sekarang PASTI berfungsi, tidak ada "ffmpeg not recognized".
4. Generate Thumbnail otomatis ketika completed: `ffmpeg -ss 3 -i input -frames:v 1 -q:v 4 -vf scale=320:-1 output.jpg` → simpan di `./downloads/.thumbs/<id>.jpg`.
5. Di DownloadItem card: kiri atas ada thumbnail 64px image jika thumbs/ file ada (replace icon category video biasa). Lazy load image.
6. Settings perf "Extract Audio Only" ketika toggle + YouTube download → yt-dlp args `--extract-audio --audio-format mp3 --audio-quality 0`. Output file extension berubah jadi .mp3.

### Test Requirements
- **Rule TR-14.1 (AC-10)**: Click "Repair Compatibility" di VideoPlayerModal → status task "optimizing" → selesai success, repaired file size > 1000 bytes, TIDAK ADA error "ffmpeg not recognized".
- **Rule TR-14.2**: ./downloads/.thumbs/ folder ada dan berisi 1 file .jpg setelah 1 video completed.
- **Rule TR-14.3**: Thumbnail tampil di DownloadItem card (ganti icon biasa).
- **Rubric TR-14.4 (0-5)**: Post-processing feature completeness. 5 = Repair berhasil, Extract Audio berhasil, Thumbnail berhasil, ffmpeg progress ditampilkan di UI task status (optimizing 35%). 3 = Repair doang works.

---

## Phase 7: Engine Enhancements

## Task 15: YouTube Settings Quality Apply + Cookie Support
**Status: pending**
**Priority: high**
**Dependency: Task 8 (settings youtube_quality field), Task 3 yt-dlp handler**
**Coverage: FR-K9, Open Questions #1, #2**

### Objective
Default quality youtube_quality + cookie untuk age-restricted video.

### Work Items
1. Ubah yt-dlp args di startYoutubeDlDownload:
   - Jika `youtube_quality === '360p'` → format selector `worst[height<=360]` / atau yang sesuai 360p.
   - Jika `youtube_quality === '720p'` → `bestvideo[height<=720]+bestaudio/best[height<=720]`
   - Jika `youtube_quality === '1080p'` → `bestvideo[height<=1080]+bestaudio/best[height<=1080]`
   - Jika `1440p / 2160p` → height<= sesuai.
   - Jika `best` → default bestvideo+bestaudio/best lama.
   - Jika `extract_audio_only = true` → tidak perlu video format, langsung bestaudio dan extract.
2. Cookie support: Jika settings `networking.youtube_cookie` tidak kosong, pass sebagai yt-dlp arg `--cookies-from-browser` ATAU (lebih robust) simpan ke file temp `youtube-cookies.txt` dan gunakan arg `--cookies <filePath>`.
3. Instagram cookie: Settings networking.instagram_cookie → pass ke InstagramExtractor jika mau digunakan oleh @jerrycoder/instagram-api atau yt-dlp --cookies juga.
4. Test: Setting 720p → download video 4K → hasil completed file size lebih kecil dari 4K (resolusi diset maks 720p). Buktikan dengan ffprobe atau Properties file.

### Test Requirements
- **Rule TR-15.1**: Ubah YouTube setting ke 360p → download video → actual video height (via ffprobe atau Properties Details) ≤ 480.
- **Rule TR-15.2**: Format selector string yang dipakai di command line → buka via process.spawn args log, mengandung `height<=360` sesuai setting.
- **Rule TR-15.3**: Cookie youtube_cookie non-empty → file temp cookies.txt dibuat dan command yt-dlp mengandung parameter `--cookies`.

---

## Task 16: Direct HTTP Downloader Resumable (Partial File)
**Status: pending**
**Priority: medium**
**Dependency: Task 3 DirectHttpDownloader extracted**
**Coverage: FR-K9, NFR-2 resume-safe**

### Objective
Pause server di tengah download direct HTTP (bukan YouTube) → restart → resume dari byte terakhir, bukan dari 0.

### Work Items
1. DirectHttpDownloader: sebelum probe + start, cek jika output file sudah ada di disk:
   - `stat.existingSize = fs.statSync(filePath).size || 0`
   - Jika existingSize > 0 DAN existingSize < totalSize estimated → masuk resume mode.
   - Set downloadedBytes = existingSize.
   - Semua segment start/end di adjust ke offset + existingSize.
2. DownloadTask.status = "error" ketika server restart sebelum completed. Ketika user Resume → coba resume mode direct HTTP.
3. YouTube mode memang tidak bisa resume byte-level (yt-dlp manage sendiri), jadi YouTube tetap restart yt-dlp command jika di-interrupt. Bisa tambahkan arg `--continue` untuk yt-dlp built-in resume.
4. Test: Buat direct download 12MB sample-demo.dat, pause di tengah (6MB downloaded). Restart server. Resume task → lanjut dari 6MB dan total final = 12MB (bukan 18MB).

### Test Requirements
- **Rule TR-16.1**: Resume mode direct HTTP works. Kill process saat downloading di tengah → restart server → klik Resume → progress tidak mulai dari 0% lagi (start >= 40%).
- **Rule TR-16.2**: Final file downloaded (resumed + yang baru) MD5 hash cocok dengan file yang download dari awal tanpa pause.
- **Rubric TR-16.3 (0-5)**: Resume reliability multi-scenario. 5 = pause resume 3x berturut, file tetap utuh. 3 = sekali resume works.

---

## Task 17: Bandwidth Limiter Global + Max Concurrent Queue
**Status: pending**
**Priority: low**
**Dependency: Task 8 (downloads.max_concurrent + bandwidth_limit_kbps)**
**Coverage: FR-K9, FR-K5**

### Objective
Throttle speed agar tidak memenuhi bandwidth, dan queue concurrency limit.

### Work Items
1. DownloadManager modifikasi:
   - Ketika addTask → check jika active downloading count ≥ max_concurrent (setting default 4) → new task status = "queued" not "downloading".
   - Ketika active task complete/error → pop next task "queued" dan call start().
   - UI: Status badge "Queued" ada warna biru muda, progress bar placeholder.
2. Bandwidth limiter:
   - Gunakan simple approach: setiap chunk stream dari axios → setiap `stream.on('data')` → catat timestamp, if bytes transmitted > allowed rate → Promise.sleep (backpressure). Atau gunakan library `stream-throttle` jika ringan.
   - Tampilkan di header settings bandwidth limit 0 = unlimited / kalau di-set misal 500 KB/s → speed semua task combined ≤ 500 KB/s.
3. Reorder queue: di task right click atau drag icon up/down → move to top.

### Test Requirements
- **Rule TR-17.1**: Set max_concurrent = 1. Add 3 task sekaligus → hanya 1 yang status "downloading", 2 lainnya = "queued". Selesai 1 → queued next berubah ke downloading.
- **Rule TR-17.2**: Set bandwidth_limit_kbps = 100. Speed total active tasks ~= 100 KB/s (toleransi ±50%) dan tidak pernah > 200 KB/s sustained.

---

## Phase 8: Error UX, Logs, Toasts, Health

## Task 18: Toast Notifications, Specific Error Messages, Event Logs
**Status: pending**
**Priority: high**
**Dependency: Task 7 (extractors return detailed errors), Task 4 event_log table, React toast lib**
**Coverage: AC-R3, FR-K10**

### Objective
Semua error user-friendly dan jelas.

### Work Items
1. Install library `sonner` (toast ringan, TypeScript).
2. Bungkus di App.tsx: `<Toaster position="bottom-right" richColors />`.
3. Map setiap action:
   - Task created success → toast success ✅ "Added to queue: filename"
   - Task completed → toast success + Web Notification (sudah ada tapi tambah sound jika setting enable).
   - Task error → toast error ❌ dengan message SPESIFIK (bukan "Failed"): e.g. "❌ Download GAGAL - YouTube: Video ini private atau age-restricted. Buka Settings → Networking dan paste cookie login YouTube Anda."
   - Settings saved → toast info.
   - Bulk import complete → "25 tasks added"
4. TaskDetailsModal new Tab 3rd: "Logs" → scrollable 300 baris event_log per task (level INFO/WARN/ERROR color coded).
5. Setiap state change / error / extractor try disimpan ke appendLog taskId — sehingga user bisa lihat tahapan mana yang gagal.
6. Spesifik message per failure mode:
   - Disk full → "Ruang disk hampir penuh. Sisakan minimal 1GB atau pindahkan folder Downloads di Settings."
   - Network offline di tengah → "Koneksi internet terputus. Klik Resume untuk mencoba lagi."
   - YouTube rate limit 429 → "YouTube telah rate-limit IP server Anda. Coba setting Networking → Proxy, atau tunggu 1 jam."
   - Private account → message cookie setting.
   - Playlist tidak didukung → "Playlist YouTube TIDAK didukung di versi ini. Silakan input video URL individual atau gunakan fitur Batch Import TXT."

### Test Requirements
- **Rule TR-18.1**: 5 error scenario (screenshot minimal 1 tiap). Setiap message ERROR mengandung minimal 2 kalimat dan 1 saran action.
- **Rule TR-18.2**: TaskDetailsModal Logs tab menampilkan minimal 5 baris log per task (INFO [Init] mulai, [Extractor] try play-dl, dll).
- **Rubric TR-18.3 (AC-R3, 0-5)**: 5 scenario × message quality. 5 = semua 5 error message memiliki saran jelas actionable, 3 = setengahnya masih generik.

---

## Task 19: Health Page, About, Disk Usage, Engine Test
**Status: pending**
**Priority: low**
**Dependency: Task 8 (halaman About #/about)**
**Coverage: FR-K10 last part**

### Objective
User bisa melihat status setiap komponen engine sehat atau tidak.

### Work Items
1. Route #/about → panel:
   - **App Info**: TurboDownloader v3.0, Build Date, Node.js version, Platform OS via `os.platform()`.
   - **Engine Status Cards**:
     - ✅ SQLite → test query `SELECT 1`, latency ms.
     - ✅ yt-dlp → run `yt-dlp --version` → return version string OK / ❌ FAILED if error.
     - ✅ ffmpeg → test `ffmpeg -version` → version string.
     - ✅ Disk space → download folder drive info `os.fsstat()` atau drive total/free.
     - ✅ RAM usage → process.memoryUsage() MB.
   - **DB Management**:
     - Button "Export DB JSON" → GET /api/settings/export JSON zip of all tasks + settings.
     - Button "Wipe All Tasks & History" → prompt 3 step confirm.
     - Button "Optimize DB VACUUM" → run `db.pragma('vacuum')` shrink.
   - **Shortcut list** (dari Task 10 cheat sheet).
   - **Open Source Licenses** credit libraries.
2. API backend endpoints: `GET /api/health` → JSON status semua engine di atas dengan masing-masing healthy boolean + info.

### Test Requirements
- **Rule TR-19.1**: `/api/health` return JSON dengan keys: `sqlite, ytDlp, ffmpeg, diskSpace, memory` masing-masing punya `healthy` dan `message`.
- **Rule TR-19.2**: Health page UI menampilkan 5 cards status dengan icon check/x.
- **Rule TR-19.3**: Button Export DB → download JSON file non-empty valid object.

---

## Phase 9: Build, Verify, Lighthouse

## Task 20: Fix All Build Warnings + Production Build Output Validation
**Status: pending**
**Priority: high**
**Dependency: SEMUA Task sebelum ini (Task 1-19)**
**Coverage: AC-02 (build success)**

### Objective
`npm run build:all` = client vite build + server tsc build → BOTH sukses, tanpa warning kritis.

### Work Items
1. Jalankan `npm run build:all`, catat semua warning/error.
2. Fix issue:
   - Unused import variables.
   - Vite warning chunk size terlalu besar (split code).
   - Server built dist-server/ output harus ada `server.js` + `src/server/**` compiled.
3. Test production mode: `set NODE_ENV=production && node dist-server/server.js` → http://localhost:3000 load index.html dari dist/ folder static serve. Tidak ada 404 assets.
4. Grep source code `console.log` debug yang tidak perlu → ganti dengan properti `if (debugLogging) console.log` atau event_log append.

### Test Requirements
- **Rule TR-20.1 (AC-02)**: `npm run build:all` exit code 0. Output folders `dist/` dan `dist-server/` ada.
- **Rule TR-20.2**: NODE_ENV=production server load → UI muncul tanpa error JS console.
- **Rule TR-20.3**: Production server download YouTube 1 video → completed OK.

---

## Task 21: Lighthouse Score Audit + Performance Fixes
**Status: pending**
**Priority: medium**
**Dependency: Task 20 (production build)**
**Coverage: NFR-1**

### Objective
Lighthouse Performance / A11y / BP ≥ 90.

### Work Items
1. Build production mode.
2. Run `npx lighthouse http://localhost:3000` (jika lighthouse diinstall, atau via Chrome DevTools manual).
3. Score awal catat.
4. Fix low scores:
   - Performance: lazy load React.lazy untuk Settings/Batch/About halaman page + modal yang jarang dibuka (NewDownload, TaskDetails, VideoPlayer, MediaAnalyzer). code splitting per route.
   - A11y: alt icon, aria label semua button, role modal aria-labelledby untuk setiap modal. Kontras warna di dark mode level AA.
5. Re-run lighthouse → sampai performance + a11y + BP ≥ 90.

### Test Requirements
- **Rubric TR-21.1 (NFR-1, 0-5)**: Lighthouse scores: Performance ≥ 90, Accessibility ≥ 90, Best Practices ≥ 90, SEO ≥ 90. Skor 5 = 4x 90+, 4 = 3x 90+, 3 = 2x 90+, <2 fail.

---

## Task 22: Independent Full Integration Test Checklist 12 Rule AC
**Status: pending**
**Priority: high**
**Dependency: Task 20 done, Task 21 done**
**Coverage: SEMUA Rule AC 1-12 + Rubric Final Wrap-up**

### Objective
Independent review checklist semua AC di spec.md. Jika semua PASS — SPEC MODE SUCCESS.

### Work Items
1. Run semua Rule AC 01-12 test masing-masing satu per satu.
2. Write evidence per test: command output, screenshots, file output.
3. Catat rubric score 5 AC-R1 sampai AC-R5 dengan evidence.
4. Jika ada FAILURE, kembali ke Implement fase dan buat remediation task baru. Jika semua PASS → mark SPEC MODE SUCCESS COMPLETED.

### Test Requirements
- **Rule TR-22.1**: File review.md di specs folder berisi semua 12 rule checklist checked dengan evidence link/path.
- **Rule TR-22.2**: Semua 5 rubric memiliki score ≥ 4 (pass threshold).
- **Rule TR-22.3**: Tidak ada leftover pending task di tasks.md, semuanya completed atau cancelled user approved.

---

## Dependency Graph (Urutan Eksekusi)

```
Task 1 (Cleanup)
  → Task 2 (TS Strict)
     → Task 3 (Split files)
        ├→ Task 4 (SQLite)
        │   ├→ Task 7 (Extractors)
        │   ├→ Task 8 (Settings API+UI)
        │   │   ├→ Task 9 (Theme)
        │   │   ├→ Task 11 (Trash)
        │   │   ├→ Task 14 (FFmpeg)
        │   │   ├→ Task 15 (YouTube Quality + Cookie)
        │   │   └→ Task 17 (MaxConcurrent + Bandwidth)
        │   └→ Task 18 (Toasts Errors Logs)
        ├→ Task 5 (Security)   (dijalankan paralel dengan Task 4)
        │   └→ Task 13 (Stream Range)
        └→ Task 6 (WebSocket)
            └→ Task 10 (Shortcuts)
               └→ Task 12 (Sparkline)
Task 16 (Resume) bisa jalankan paralel dengan task lain setelah Task 3
Task 19 (About Health) bisa jalankan setelah Task 8
Task 20, 21, 22 (Final Build/Lighthouse/Review) di AKHIR setelah semua task lain completed
```
