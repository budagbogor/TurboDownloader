# Product Requirements Document (PRD)
## Project Name: TurboDownloader

### 1. Ringkasan Eksekutif (Executive Summary)
TurboDownloader adalah aplikasi web full-stack modern yang dirancang untuk mengunduh file dan media dengan kecepatan tinggi. Aplikasi ini memanfaatkan teknik pengunduhan multi-koneksi (multi-threaded chunk downloading) untuk memaksimalkan *bandwidth* dan memiliki kemampuan ekstraksi cerdas untuk berbagai platform media sosial (YouTube, TikTok, Facebook, dll.).

### 2. Latar Belakang & Masalah
*   Pengunduhan file berukuran besar di peramban web standar seringkali lambat karena hanya menggunakan koneksi tunggal.
*   Mengunduh video dari media sosial seringkali membutuhkan aplikasi pihak ketiga yang penuh iklan atau berisiko *malware*.
*   Solusi yang ada jarang menawarkan antarmuka UI/UX modern berbasis web yang bersih dan responsif.

### 3. Tujuan (Goals) & Non-Tujuan (Non-Goals)
**Tujuan:**
*   Menyediakan kecepatan unduh maksimal melalui segmentasi file (HTTP Range Requests).
*   Menyediakan antarmuka yang bersih (React + Tailwind) untuk memantau progres unduhan secara *real-time*.
*   Mendukung ekstraksi media sosial secara transparan bagi pengguna.
*   Menyediakan penanganan *error* yang baik, khususnya untuk proteksi *anti-bot* dari platform seperti YouTube.

**Non-Tujuan:**
*   Aplikasi ini bukan platform berbagi *file* (file-sharing/hosting).
*   Aplikasi ini tidak dirancang untuk membajak konten berbayar (DRM-protected content).

### 4. Kebutuhan Fungsional (Functional Requirements)
*   **F1. Analisis URL:** Sistem dapat menerima input URL dan membedakan antara *Direct Link* (file mentah) dan *Social Media Link*.
*   **F2. Ekstraksi Media:** Modul *backend* (menggunakan `play-dl`, `youtube-dl-exec`, dll.) harus bisa mengekstrak tautan unduhan langsung (Direct URL) dari platform media sosial.
*   **F3. Pengunduhan Multi-Part:** *Backend* membagi file menjadi beberapa *chunk* (misal: 4 hingga 8 koneksi bersamaan) berdasarkan ukuran file dan kapabilitas server sumber (Accept-Ranges).
*   **F4. Pemantauan Progres:** *Client* menerima metrik progres secara langsung (*real-time*), termasuk kecepatan (KB/s atau MB/s), ETA (Estimasi Waktu Selesai), dan persentase keseluruhan.
*   **F5. Manajemen Antrean (Queue):** Pengguna dapat melihat daftar unduhan yang sedang berjalan, selesai, atau dibatalkan.
*   **F6. Penggabungan File (Assembly):** Setelah semua segmen selesai diunduh, *backend* akan menggabungkannya menjadi satu file utuh yang siap disajikan ke pengguna.

### 5. Kebutuhan Non-Fungsional (Non-Functional Requirements)
*   **Performa:** Penggabungan *file chunk* harus efisien dan menggunakan *stream* untuk mencegah *overhead* memori pada server.
*   **Ketahanan (Resilience):** Jika satu koneksi *chunk* gagal, sistem harus mampu mencoba ulang (retry) segmen tersebut tanpa mengulang dari awal.
*   **Lingkungan Operasional:** Dirancang untuk berjalan optimal di *Localhost* (komputer pribadi) guna menghindari pemblokiran IP Data Center oleh YouTube/Google (Anti-Bot Protection).

### 6. Tech Stack
*   **Frontend:** React 18, Vite, TypeScript, Tailwind CSS, Lucide React (Icons).
*   **Backend:** Node.js, Express.js, TypeScript.
*   **Core Libraries:** Axios (untuk *HTTP Range Requests*), `play-dl` & `youtube-dl-exec` (untuk ekstraksi media sosial).
*   **Build System:** `esbuild` untuk mengompilasi *backend*, `vite build` untuk *frontend*.

### 7. Keamanan & Batasan
*   Server secara otomatis menolak tautan internal atau alamat IP lokal untuk mencegah eksploitasi SSRF (*Server-Side Request Forgery*).
*   Validasi *file path* yang ketat saat mengunduh dan menggabungkan segmen (mencegah *Path Traversal*).
