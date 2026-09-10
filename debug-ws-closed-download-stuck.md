# [OPEN] Debug Session: ws-closed-download-stuck
- **Created At:** 2026-09-09 (TurboDownloader)
- **Bug Summary:** Download YouTube stuck 0 Bytes/s + Browser console: `WebSocket connection to 'ws://localhost:3000/' failed: WebSocket is closed before the connection is established.` (useDownloadsWebSocket.ts:186). UI Card shows status=Downloading, bytes=5.88/120.68 MB (4%), speed=0 Bytes/s → progress stalled.
- **Reproduction Steps:** (1) Buka http://localhost:3000, (2) Tambah YouTube URL → Add Download, (3) Lihat card Downloading, (4) Buka DevTools Console lihat error WS closed, (5) Progress stuck Bytes/s=0.
- **Environment:** Windows 11, Node 22, npm run dev (tsx server.ts + Vite Middleware), Express Helmet CSP enabled.
- **Regression Window:** After commit d2833b1 (CSP tighten + self-host Inter) → OR commit 772e368 (light-only theme rewrite).

---

## 5 Falsifiable Hypotheses

| # | Hypothesis | Observable Test Point | Status |
|---|---|---|---|
| **H1** | Helmet CSP `connectSrc` terlalu ketat, block WebSocket upgrade `ws://` (tetapi commit d2833b1 sudah whitelist `ws://localhost:*`). Test: cek actual CSP header response. | Chrome DevTools → Network → localhost document → Response Headers → `Content-Security-Policy` value, apakah ada `ws://localhost:*` di `connect-src`? | PENDING |
| **H2** | Express WebSocket server di `server.ts` TIDAK attach listener `upgrade` untuk path `/` (hanya `/ws`?), sedangkan client `useDownloadsWebSocket.ts:186` connect ke `ws://localhost:3000/` root (tanpa path). Ketika client kirim `GET / upgrade: websocket`, Express tidak handle → menutup socket. | Server: log `upgrade` event server dan `connection` wss event. Client: log actual `new WebSocket(URL)` URL string + path | PENDING |
| **H3** | WebSocket client melakukan reconnect terlalu cepat (exponential backoff terlalu kecil) → server belum ready, connection attempt di-reject sebelum handshake selesai → error "closed before established". | Client: log `scheduleReconnect` delays, attempt counter, WebSocket `readyState` transitions (0 CONNECTING → 1 OPEN / 3 CLOSED). | PENDING |
| **H4** | **Root cause download stuck 0 Bytes/s:** WebSocket client connection failure menyebabkan Frontend TIDAK PERNAH menerima update progress `progress` event dari Backend (engine yt-dlp). Backend sebenarnya men-download bytes ke disk, tapi Frontend tidak terima event WS → UI speed=0 Bytes/s. Atau sebaliknya: yt-dlp process actually paused/died karena ctx bug (lebih jarang karena sudah fix). | Server: log yt-dlp `progress` emit count vs WebSocket `send()` count vs client `onmessage` count. Inspect DB: actual `downloaded_size` bertambah / tidak (query SQLite). | PENDING |
| **H5** | Vite dev server middleware interferes dengan WebSocket upgrade path `/` (Vite menggunakan WebSocket untuk HMR di path tertentu). Ketika client kirim upgrade ke `/`, Vite menangkap sebelum Express WebSocket handler → close. | Test: connect URL explicit `ws://localhost:3000/ws` path vs `/` → mana yang sukses. Server log `req.url` pada `upgrade` event. | PENDING |

---

## Acceptance Criteria (PASS/FAIL)
- **[PASS]** Console NO error `WebSocket is closed before the connection is established.`
- **[PASS]** useDownloadsWebSocket.ts: `ws.readyState === 1 (OPEN)` dalam < 2 reconnect attempts
- **[PASS]** Download card YouTube: `Bytes/s > 500 KB/s` dalam 5 detik setelah status=Downloading, DB downloaded_size bertambah
- **[PASS]** Lint tsc --noEmit: 0 errors post-fix
