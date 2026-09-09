 *(Pastikan Tauri CLI dan Rust/Cargo sudah terinstal di komputer Anda jika ingin mem-build installer Tauri native).*# Master Plan & Architecture
## Project Name: TurboDownloader

Dokumen ini berisi panduan teknis dan arsitektur untuk menjalankan, memodifikasi, dan mengembangkan TurboDownloader lebih lanjut di *Environment* Lokal atau IDE Eksternal (seperti VS Code, Cursor, WebStorm).

---

### 1. Arsitektur Sistem (System Architecture)

TurboDownloader beroperasi sebagai **Full-Stack Application** dengan model *Client-Server*:

1.  **Client (React SPA):** 
    *   Bertanggung jawab untuk *User Interface*, validasi input URL awal, dan menampilkan progres *real-time*.
    *   Berkomunikasi dengan server melalui REST API (Polling) atau WebSockets (opsional di masa depan) untuk mengambil status unduhan dari `DownloadManager`.
2.  **Server (Express + Node.js):** 
    *   Menangani logika inti pengunduhan.
    *   **Analyzer (`/api/analyze`):** Menganalisis URL, memeriksa *Content-Length*, dan mengekstrak *Direct URL* jika sumbernya adalah platform sosial media (menggunakan modul `play-dl` / `youtube-dl-exec`).
    *   **Download Manager (`src/server/DownloadManager.ts`):** Mengelola antrean unduhan (*Task Lifecycle*).
    *   **Download Task (`src/server/DownloadTask.ts`):** Entitas tunggal yang merepresentasikan satu file. Modul ini bertanggung jawab untuk menghitung *byte range*, membuat *worker* (*Promises*) untuk mengunduh setiap *chunk* secara paralel, memantau *throughput* kecepatan, dan menyatukan (*assemble*) potongan *file* sementara di `/tmp/downloads`.

---

### 2. Struktur Direktori Utama

```text
turbodownloader/
├── src/
│   ├── components/      # Komponen UI React (Card, Progress Bar, Icons)
│   ├── server/
│   │   ├── DownloadManager.ts # Pengelola state global unduhan di backend
│   │   └── DownloadTask.ts    # Engine pengunduhan multi-part & Ekstraksi Sosmed
│   ├── App.tsx          # Main React Application
│   └── main.tsx         # React Entry Point
├── server.ts            # Express Server Entry Point (API Routes)
├── package.json         # Konfigurasi dependensi dan scripts build/dev
├── tsconfig.server.json # Konfigurasi Typescript khusus untuk kompilasi backend
└── vite.config.ts       # Konfigurasi Vite
```

---

### 3. Panduan Setup Lingkungan Lokal (Local Development)

Mengingat adanya batasan dari beberapa platform (terutama perlindungan Anti-Bot YouTube terhadap IP Data Center/Cloud), **pengembangan dan penggunaan terbaik adalah di lingkungan lokal (PC/Laptop Anda sendiri)**.

**Langkah-langkah Eksekusi Lokal:**

1.  **Clone / Unduh Kode Sumber:**
    Bawa folder proyek ini ke lingkungan lokal Anda.
2.  **Instalasi Dependensi:**
    Buka terminal di direktori *root* proyek, jalankan:
    ```bash
    npm install
    ```
    *Catatan: Instalasi ini akan otomatis memicu script *postinstall* untuk mengunduh binary `youtube-dl-exec` (yt-dlp).*
3.  **Jalankan Server Development:**
    ```bash
    npm run dev
    ```
    Perintah ini akan menjalankan *Express server* beserta *Vite middleware* di *Port* `3000`. Anda bisa mengakses aplikasi di `http://localhost:3000`.
4.  **Kompilasi Produksi (Build):**
    Jika Anda ingin melakukan *deploy* mandiri (contoh: di Raspberry Pi atau server *homelab*):
    ```bash
    npm run build
    npm run start
    ```

---

### 4. Roadmap & Fase Pengembangan (Future Expansion)

Bagi pengembang (Developer), berikut adalah alur peta jalan pengembangan yang direkomendasikan untuk TurboDownloader:

#### **Fase 1: Stabilisasi Lokal (Current Phase)**
*   Fokus pada perbaikan ekstraktor URL agar tidak rapuh (brittle) saat algoritma platform seperti YouTube atau TikTok berubah.
*   Peningkatan penanganan galat (Error Handling) untuk memberi tahu pengguna jika *cookie* otentikasi diperlukan.

#### **Fase 2: Otentikasi Lanjutan & Bypass Bot**
*   **Fitur:** Menambahkan konfigurasi *Cookie Injection* di *frontend*.
*   **Tujuan:** Mengizinkan pengguna memasukkan String Cookie Youtube secara manual melalui antarmuka, yang kemudian akan diteruskan ke *backend* (`youtube-dl-exec`) agar bebas dari blokir *Anti-Bot* tanpa harus melakukan *hardcode* di server.

#### **Fase 3: Desktop App (Tauri / Rust)**
*   **Tujuan:** Memindahkan aplikasi web ini menjadi aplikasi Desktop *native* menggunakan *Tauri* dan bahasa pemrogaman *Rust*.
*   **Manfaat:** 
    *   **Performa & Ukuran:** Tauri menggunakan *webview* bawaan OS (bukan membundel Chromium seperti Electron). Ukuran *installer* akan menyusut dari ~150MB menjadi ~5MB.
    *   **RAM & CPU:** Penggunaan memori jauh lebih rendah berkat *concurrency* di Rust (menggunakan `tokio`).
    *   **Arsitektur:** Menggantikan peran server Node.js lokal dengan *backend* Rust (menggunakan `reqwest` untuk HTTP request, dan *Tauri IPC* untuk komunikasi ke React).
    *   **Bebas CORS:** Rust langsung mengunduh ke *file system* OS tanpa halangan *sandbox browser*.
*   **Status Implementasi:** Kerangka dasar konfigurasi Tauri sudah dibuat (`src-tauri` folder, `tauri.conf.json`, `Cargo.toml`). Anda cukup menjalankan `npm run tauri:dev` (membutuhkan instalasi Rust di komputer Anda).

#### **Fase 4: Manajemen Antrean Lanjut (Advanced Queueing)**
*   Menambahkan dukungan "Jeda/Lanjutkan" (*Pause/Resume*) pada tingkat byte dengan menyimpan status *chunk* yang sudah diunduh ke basis data lokal sementara (seperti SQLite/JSON Data Store).
*   Penjadwalan pengunduhan berdasarkan waktu (contoh: *Download* hanya aktif di atas jam 12 malam).
