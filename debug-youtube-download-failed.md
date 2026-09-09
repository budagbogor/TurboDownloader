# Debug Session: youtube-download-failed
- **Status**: [OPEN]
- **Issue**: Download YouTube masuk ke antrean tetapi langsung berstatus failed pada aplikasi web.
- **Debug Server**: Pending
- **Log File**: .dbg/trae-debug-log-youtube-download-failed.ndjson

## Reproduction Steps
1. Jalankan aplikasi web dan backend lokal.
2. Buka modal Add Direct Download atau Media Analyzer.
3. Masukkan URL YouTube seperti `https://youtu.be/...`.
4. Mulai download.
5. Amati task berubah menjadi `Failed`.

## Hypotheses & Verification
| ID | Hypothesis | Likelihood | Effort | Evidence |
|----|------------|------------|--------|----------|
| A | URL YouTube tidak diekstrak menjadi direct media URL sebelum masuk engine chunk downloader | High | Low | Pending |
| B | Ekstraksi berhasil, tetapi probe `HEAD`/range ke URL hasil ekstraksi ditolak oleh YouTube/CDN | High | Low | Pending |
| C | Request download memakai header/cookie yang tidak cukup sehingga server remote mengembalikan 403/HTML | Medium | Medium | Pending |
| D | Frontend mengirim URL mentah ke endpoint direct download tanpa lewat jalur analyzer/format selection | High | Low | Pending |
| E | Error terjadi saat merge atau penamaan file, bukan saat inisialisasi URL | Low | Medium | Pending |

## Log Evidence
Pending

## Verification Conclusion
Pending
