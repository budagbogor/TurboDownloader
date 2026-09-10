# [CLOSED] Debug Session: yt-task-still-failed-ignition ✅ User Confirmed BERHASIL

**Session ID**: `yt-task-still-failed-ignition`
**Date**: 2026-09-10 (duration: 1 debugging round trip, 18 minutes)
**Linked to**: `youtube-0bytes-failed`, `youtube-audio-stuck`
**User reported symptoms (screenshot)**:
- Post-fix (inject cookies from settings + --js-runtimes node + extractor-args multi-client + Android player FIRST), user reports: MASIH GAGAL task `How Ignition Coils Work.mp4` (YouTube `https://youtu.be/lWyn_eV-DzM`) status = **Failed**, progress card = **`0 Bytes / 0 Bytes · 0%`** (TIDAK ADA byte sama sekali, artinya spawn atau extract metadata GAGAL sebelum download mulai)
- Previously (sesi CLI standalone di luar server): yt-dlp.exe dengan chain args sama BERHASIL ExitCode=0 dan download 7.03MB. Namun, ketika dijalankan melalui App.tsx → server.ts handleNewTask → DownloadTask.start() → chain internal = MASIH FAILED.
- Ini mengindikasikan ada DISCREPANCY antara standalone CLI args vs args yang di-spawn di dalam `startYoutubeDlDownload()` melalui server Node tsx.

**Expected**: handleNewTask URL → DownloadTask init → totalSize>0 → start youtube-dl → progress bytes>0 → completed.
**Result**: ✅ User explicitly replied "berhasilll" (2026-09-10). All steps verified.

**Constraints (Debugger Protocol Evidence Gate)**:
- COMPLIED: H1-H5 hypotheses listed BEFORE any code change.
- COMPLIED: Static analysis (Glob, Grep, DownloadTask initialize path) used BEFORE business logic change.
- COMPLIED: Minimal fix (only 2 lines changed: import statement + function rename call) after H4 evidence confirmed 100%.

---

## 5 Falsifiable Hypotheses (Verdict Summary):

| # | Hypothesis | ✅ Verdict | Evidence |
|---|---|---|---|
| **H1** | Patch TIDAK TER-APPLY: server tsx belum di-restart | 🟡 Contributing (user didn't restart, but secondary issue — even after restarting will still fail because of H4 broken import) | User confirmed MASIH GAGAL sebelum restart instruction; after restart + H4 apply = works. |
| **H2** | Task route ke direct-http bukan useYoutubeDlDirect | ❌ **REJECTED** | [DownloadTask.ts#L140-L143](file:///C:/Users/snwd/Videos/turbodownoader/TurboDownloader-1/src/server/DownloadTask.ts#L140-L143): `if (isYouTube) { this.originalYouTubeUrl = this.url; this.useYoutubeDlDirect = true; }` — 100% YouTube path selalu TRUE untuk useYoutubeDlDirect. |
| **H3** | attemptSpawn semicolon extractor-args shell=true strip | ❌ **REJECTED** | [youtube-dl-handler.ts#L141](file:///C:/Users/snwd/Videos/turbodownoader/TurboDownloader-1/src/server/youtube-dl-handler.ts#L141): Primary spawn = `attemptSpawn(ytExe, shell=false)`. Semicolon `;` di args array (spawn execFile style) TIDAK diinterpretasikan shell; args di-pass raw sebagai array argv ke CreateProcess. |
| **H4** | ❌💥 `getSettings()` import `./settings-store.js` module NOT FOUND. TIDAK ADA file settings-store.ts di repo. | ✅ **CONFIRMED 100% ROOT CAUSE** | 1. `Glob **/settings-store*` → No file found. <br> 2. `grep export.*getSettings` global → 0 matches (hanya ada `getAllSettings()` di `database.ts` L187). <br> 3. Post-fix tsx ESM import chain test: ✅ ALL 3 LEVELS PASSED ExitCode=0; pre-fix would have thrown `ERR_MODULE_NOT_FOUND: Cannot find module './settings-store.js'`. |
| **H5** | Player_clients separator comma salah parse | ❌ **REJECTED** | Format `player_clients` = comma-separated value (`a,b,c`) dikemas di dalam 1 value extractor-args key `youtube:player_clients=android,web,...` → dikirim sebagai 1 argv element di spawn. Verified working di CLI standalone sebelumnya. ExitCode 0. |

---

## Root Cause H4 Detailed Proof:

**Kesalahan author patch awal (1 roundtrip lalu user report still-failed):**
- File [youtube-dl-handler.ts#L9 (broken)](file:///C:/Users/snwd/Videos/turbodownoader/TurboDownloader-1/src/server/youtube-dl-handler.ts#L9): 
  ```diff
  - import { getSettings } from "./settings-store.js";  // ❌ file TIDAK ADA di project manapun
  + import { getAllSettings } from "./database.js";     // ✅ function SUDAH ADA sejak awal, return 12 keys settings obj
  ```
- Call-site L84:
  ```diff
  - const s = getSettings();          // ❌ function undefined, import throws ESM top-level
  + const s = getAllSettings();       // ✅ return object { youtubeCookiePath, instagramCookieHeader, ... }
  ```

**Dampak ke runtime Node (tsx ESM):**
1. Ketika `DownloadTask.start()` → import chain `youtube-dl-handler.js` pertama kali, Node ESM resolver **melempar `ERR_MODULE_NOT_FOUND: Cannot find module './settings-store.js'`** sebelum function body startYoutubeDlDownload() ever execute SATU LINE PUN.
2. Exception naik ke atas stack dan tertangkap oleh wrapper top-level start → `task.status = 'error'`, `task.error = 'YouTube direct download engine error: Cannot find module ...'`.
3. Akibatnya 0 bytes progress card (spawn yt-dlp.exe TIDAK PERNAH DIJALANKAN BAHKAN SATU KALI).
4. Inilah kenapa CLI standalone BISA (PowerShell tidak pernah import module youtube-dl-handler, hanya langsung spawn yt-dlp.exe binary dengan arg string).

---

## Step Log:

### Step 1: Init + Hypotheses
- Status: [OPEN] Hypotheses H1-H5 listed. ✅
- Evidence static analysis:
  - H2 rejected: DownloadTask.initialize() L140 isYouTube block set useYoutubeDlDirect = true 100%.
  - H4 suspect: Grep global getSettings function definition → 0 matches.

### Step 2: Evidence Gate Confirmed H4
- Glob `settings-store*` → No file. ✅ H4 100% confirmed.
- Database.ts L187 `export function getAllSettings()` → Return type `SettingsDefaults` = EXACTLY match expected keys at youtube-dl-handler L85-L93 (youtubeCookiePath, instagramCookieHeader).

### Step 5: Minimal Fix Patch Applied
1. Line 9 import: `./settings-store.js { getSettings }` → `./database.js { getAllSettings }`
2. Line 84 call: `getSettings()` → `getAllSettings()`

### Step 6: Verification Evidence
- **TypeScript Diagnostics**: 0 errors, 0 warnings.
- **tsx ESM chain test (`npx tsx .dbg/test-module-import.mjs`)**:
  ```
  [TEST OK L1] import database.ts -> getAllSettings typeof = function
  [TEST OK L2] getAllSettings() returned object keys = maxConcurrentDownloads,maxBandwidthKbps,defaultConnections,defaultDownloadDir,defaultVideoQuality,youtubeCookiePath,instagramCookieHeader,theme,notificationsEnabled,autoMergeSegments,autoOptimizeMp4,trashRetentionDays
  [TEST OK L3] import youtube-dl-handler.ts NO THROW. exports keys = findYtDlpBinary,startYoutubeDlDownload
  [TEST SUMMARY] ALL 3 LEVELS PASSED. H4 fix applied. Module resolution OK.
  >>> ExitCode=0
  ```

### Step 11: User Verdict (Pre-cleanup confirmation)
- User explicit confirmation: **`berhasilll`** ✅
- Download task How Ignition Coils Work.mp4 berhasil Completed, 0 Bytes issue teratasi.

---

## Final Artifacts Cleanup Status:
| File / Folder | Action | Reason |
|---|---|---|
| `.dbg/test-module-import.mjs` | ❌ Delete | Temp ESM test script, not needed in prod |
| `.dbg/yt-dlp-dryrun/` (folder + logs + sample 7MB mp4) | ❌ Delete | Temp CLI standalone test sandbox + downloaded sample (18MB) violated project rule: downloads/ + sample output ignored from repo |
| `debug-yt-task-still-failed-ignition.md` | ✅ KEEP (mark [CLOSED]) | Audit trail bug H4 untuk future reference |
