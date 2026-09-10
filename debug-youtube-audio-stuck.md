# Debug Session: youtube-audio-stuck
- **Status**: [OPEN]
- **Issue**: Download YouTube kadang hanya berisi audio, satu task terlihat selesai saat task video lain berjalan, dan download baru tidak kunjung selesai.
- **Debug Server**: http://127.0.0.1:7777/event
- **Log File**: .dbg/trae-debug-log-youtube-audio-stuck.ndjson

## Reproduction Steps
1. Tambahkan 2 URL YouTube berurutan.
2. Amati apakah salah satu file selesai sebagai audio-only.
3. Amati apakah task lain berhenti di status downloading/100% atau task baru tidak selesai.

## Hypotheses & Verification
| ID | Hypothesis | Likelihood | Effort | Evidence |
|----|------------|------------|--------|----------|
| A | Status task di server sudah `completed`, tetapi broadcast WS terakhir tidak mengirim perubahan akhir ke UI. | High | Low | Confirmed (fixed) |
| B | Pemilihan format `yt-dlp` jatuh ke stream audio-only pada fallback tertentu. | High | Low | Confirmed (fixed) |
| C | Queue/transition antar task tidak memicu `processQueue()` atau flush status akhir pada task berikutnya. | Medium | Medium | Rejected for current reproduction |
| D | Deteksi file final memilih output sementara yang salah, sehingga file audio kecil dianggap hasil akhir. | Medium | Medium | Confirmed (fixed) |

## Log Evidence
- Pre-fix resume bug:
  - Task restore dari DB sempat masuk `status=downloading` dengan `downloadedSize=0` tanpa progress nyata.
  - Setelah fallback `originalYouTubeUrl = this.url`, task resume kembali memanggil `yt-dlp` dan tidak macet diam.
- Pre-fix audio-only:
  - `How ABS` sebelumnya tersimpan sebagai file `738,504 bytes` di folder `downloads`, konsisten dengan stream audio `140-11` sekitar `738.77 KiB`.
  - Listing format dari binary internal `yt-dlp.exe -F https://youtu.be/hwwXukJaTlM` menunjukkan video ini hanya punya stream `audio only` dan `video only`; tidak ada format gabungan audio+video.
  - Itu berarti tanpa `ffmpeg`, hasil yang benar tidak bisa dibentuk untuk video seperti ini.
- Post-fix with bundled ffmpeg:
  - Health endpoint melaporkan `ffmpeg.binary = node_modules\\ffmpeg-static\\ffmpeg.exe`.
  - Log `youtube-dl-handler.ts:startYoutubeDlDownload:ytArgs` menunjukkan `ffmpegAvailable = 1` dan `--ffmpeg-location` diarahkan ke binary bundel.
  - `How ABS` transisi `downloading -> merging -> completed`, final file tunggal `.mp4` size `1,788,918 bytes`.
  - Inspeksi stream file final menunjukkan:
    - `Stream #0:0 Video: h264`
    - `Stream #0:1 Audio: aac`
  - Task `Memahami Sistem Rem...` juga transisi sampai `completed` dengan final size `200,258,180 bytes`.
  - Broadcast WS periodik sesudah fix menampilkan kedua task berakhir `status=completed`, jadi UI tidak lagi tertinggal di `downloading` saat backend sudah selesai.

## Verification Conclusion
- Root cause gabungan:
  1. Task YouTube yang dipulihkan dari DB kehilangan `originalYouTubeUrl`, sehingga resume bisa macet di `downloading` tanpa benar-benar memulai `yt-dlp`.
  2. Environment tidak punya `ffmpeg` di PATH, padahal beberapa video YouTube hanya tersedia sebagai stream terpisah audio/video. Tanpa `ffmpeg`, output mudah jatuh ke audio-only atau tidak bisa diselesaikan dengan benar.
  3. Broadcast status akhir perlu tetap terkirim agar UI menerima `completed`.
- Applied fix set:
  1. Fallback restore/resume `originalYouTubeUrl = this.url`.
  2. Bundle dan resolve `ffmpeg-static`, dipakai oleh `yt-dlp`, optimizer, repair endpoint, dan health check.
  3. Final file selection diprioritaskan ke kandidat video/merged, bukan audio-only.
  4. Broadcast `UPDATE_ALL` tetap berjalan sehingga transisi akhir muncul di UI.
