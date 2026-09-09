# [OPEN] Debug Session: youtube-0bytes-failed

**Session ID**: `youtube-0bytes-failed`
**Date**: 2026-09-09
**User reported symptoms (screenshot)**:
- Task 1: YouTube `https://youtu.be/txyEDL2F1Ck` card stuck **Downloading** — `0 Bytes / 0 Bytes · 0% · 0 Bytes/s` — paralel thread T#1 status `Wait` (tidak pernah Streaming)
- Task 2: YouTube `https://youtu.be/Awy1oBkhKhc` status **Failed** — `0 Bytes / 0 Bytes · 0%` — T#1 `Wait` 0 Bytes

**Expected**: yt-dlp dumpSingleJson → auto choose best V+A combined stream → 1+ thread Streaming status → progress non-0 bytes → Completed.

**Constraints (Debugger Protocol)**:
- Steps 1-4: DILARANG ubah business logic. Hanya instrumentasi.
- Modification pertama hanya instrumentation (debug-point wrappers + fetch report).

---

## 5 Falsifiable Hypotheses:

| # | Hypothesis | Predictions | Evidence Check Point |
|---|---|---|---|
| H1 | **yt-dlp binary not found / exec throws** | `findYtDlpBinary()` return null OR spawn ENOENT; task.status berubah langsung error dengan message "yt-dlp not found" | `youtube-dl-handler.ts`: findYtDlpBinary, startYoutubeDlDownload ctx spawn stderr |
| H2 | **dumpSingleJson analyzeUniversalMedia FAILS — YouTube signature/age-gate/consent** → tidak ada requested_formats / combined size = 0 → task initialize exit dgn useYoutubeDlDirect=true tapi startYtdlDownload tidak pernah emit progress first chunk >30s. | `analyzeUniversalMedia` best.format = undefined OR `estimateSize=0`; `DownloadTask.initialize()` -> set status "error" atau stuck di useYoutubeDlDirect tanpa totalSize. | server: universal-extractors.ts analyzeUniversalMedia logs formats array length; DownloadTask initialize() final `this.totalSize` + this.useYoutubeDlDirect value |
| H3 | **ytdl stream spawn success tapi stdout pipe never write** → progressListener never fires (status stuck downloading 0 bytes). OR `supportsRange=false numConnections=1 -> segment createSegmentsList returns 1 seg tapi downloadSegment axios call hang di URL signer expired CORS (youtube googlevideo). | event_log untuk task row ada entry "youtube_dl_started" tapi tidak ada "progress_ytdl_bytes" setelah 20s. axios interceptor request hang tanpa error / timeout. | youtube-dl-handler.ts: progress.on data chunk; DownloadSegmentWithRetry axios call timeout; server.ts logs stderr |
| H4 | **TotalSize = 0 → progress 0% → UI show 0 / 0 Bytes** → `DownloadTask.progress` computed `downloadedSize / totalSize = NaN` di sanitize jadi 0. totalSize=0 berasal dari analyzeUniversalMedia estimate 0 bytes. | task.totalSize =0 di server state; frontend card "0 Bytes / 0 Bytes". | DownloadTask constructor after initialize totalSize value; REST /api/downloads GET the task |
| H5 | **Segment T#1 Wait forever — maxConcurrent=3 tapi active download task belum dequeue processQueue** → task.status="downloading" tapi DownloadTask.start() tidak pernah dipanggil. | DownloadManager active < maxConcurrent. | DownloadManager.processQueue is called; task.started timestamp. |

---

## Step Log:

### Step 1: Init + Hypotheses
- Status: [OPEN] Hypotheses listed. Next: Instrumentation debug-point to:
  - `youtube-dl-handler.ts` findYtDlpBinary + startYoutubeDlDownload
  - `DownloadTask.ts` initialize() end result
  - `universal-extractors.ts` analyzeUniversalMedia() best.format + estimateSize
  - `direct-http-downloader.ts` downloadSegmentWithRetry
  - `DownloadManager.ts` processQueue + start task
