# 🏷️ Tinemu — Automated DTF Label Printing System

Sistem Otomasi dan Manajemen Produksi Label DTF (*Direct-to-Film*) Berbasis Web end-to-end. Dirancang khusus untuk memotong waktu proses *layouting* manual, mengeliminasi *human-error* pada nomor resi/nama pesanan, serta menghasilkan berkas siap cetak beresolusi tinggi (300 DPI) yang terstandarisasi langsung untuk mesin RIP dan CorelDRAW.

---

## 📑 Daftar Isi
1. [Ringkasan Eksekutif & Latar Belakang](#-ringkasan-eksekutif--latar-belakang)
2. [Arsitektur & Tumpukan Teknologi (Tech Stack)](#-arsitektur--tumpukan-teknologi-tech-stack)
3. [Matriks Hak Akses & Peran (RBAC Matrix)](#-matriks-hak-akses--peran-rbac-matrix)
4. [Bedah Detail Fitur Per Menu Sistem](#-bedah-detail-fitur-per-menu-sistem)
   - [Dashboard Monitoring](#1-dashboard-monitoring-dashboard)
   - [Manajemen Roll Produksi](#2-manajemen-roll-produksi-roll)
   - [Manajemen Transaksi & Detail Nama](#3-manajemen-transaksi--detail-nama-transaksi)
   - [Material Font](#4-material-font-materialsfont)
   - [Material Background](#5-material-background-materialsbackground)
   - [Manajemen Pengguna (Admin Only)](#6-manajemen-pengguna-users)
   - [Audit Trail & Log Aktivitas (Admin Only)](#7-audit-trail--log-aktivitas-log)
5. [Spesifikasi Teknis Mesin Cetak (Print Engine Specs)](#-spesifikasi-teknis-mesin-cetak-print-engine-specs)
6. [SOP Alur Kerja Operasional (Panduan User & Orang Awam)](#-sop-alur-kerja-operasional-panduan-user--orang-awam)
7. [Panduan Instalasi & Deployment (Panduan Developer)](#-panduan-instalasi--deployment-panduan-developer)
8. [Struktur Direktori Proyek](#-struktur-direktori-proyek)
9. [Analisa Kritis & Rekomendasi Arsitektur](#-analisa-kritis--rekomendasi-arsitektur)

---

## 🎯 Ringkasan Eksekutif & Latar Belakang

### Masalah Nyata di Lantai Produksi DTF Manual:
1. **Inefisiensi Waktu Layouting**: Operator menghabiskan 15–30 menit per pesanan hanya untuk menyusun ratusan nama satu per satu ke lembar kerja grafis (CorelDRAW / Adobe Photoshop / Illustrator).
2. **Resiko Human Error**: Tertukarnya nomor resi ekspedisi, kesalahan ketik nama pelanggan, dan duplikasi nama yang tidak terdeteksi sebelum dicetak.
3. **Masalah Skala & DPI**: Gambar PNG yang diexport tanpa metadata kerap dibuka oleh CorelDRAW pada resolusi standar layar (72 DPI), menyebabkan ukuran fisik cetak membengkak 4x lipat dan merusak bahan film DTF.
4. **Ketiadaan Audit Trail**: Manajemen tidak memiliki data objektif mengenai berapa lama waktu yang dihabiskan operator untuk memproses suatu pesanan, siapa yang membuat perubahan nama, serta tracking penggunaan bahan roll.

### Solusi yang Diberikan Sistem Tinemu:
* **Batch Processing Cepat**: Mendukung import data langsung dari file Excel/CSV atau copy-paste ratusan nama sekaligus.
* **Auto-Layouting Matematis**: Sistem otomatis membagi nama ke dalam paket standar (10 kolom × 5 baris = 50 label per paket) dengan jeda potong (*spacing*) yang presisi.
* **Injeksi Chunk pHYs 300 DPI**: Sistem langsung menginjeksi metadata biner resolusi ke dalam berkas PNG, menjamin skala 1:1 saat di-import ke RIP software maupun CorelDRAW.
* **Tracking & Deteksi Duplikat**: Otomatis memperingatkan operator jika terdapat nama kembar dalam satu transaksi, serta mencatat durasi kerja dan rekam jejak revisi per transaksi.

---

## 🛠️ Arsitektur & Tumpukan Teknologi (Tech Stack)

Sistem dibangun menggunakan standar aplikasi web modern berkinerja tinggi:

| Komponen | Teknologi | Versi / Keterangan |
| :--- | :--- | :--- |
| **Framework Utama** | [Next.js](https://nextjs.org/) | `16.2.10` (App Router, Server Components & Server Actions) |
| **Library Antarmuka** | [React](https://react.dev/) | `19.2.7` |
| **Bahasa Pemrograman** | [TypeScript](https://www.typescriptlang.org/) | `v5` (Strict Type Checking) |
| **Styling & Desain** | [Tailwind CSS](https://tailwindcss.com/) | `v4` modern utility-first stylesheet |
| **Komponen UI** | Radix UI / Shadcn UI | Desain gelap premium, aksesibel, dan responsif |
| **Notifikasi Toast** | Sonner | Real-time feedback aksi & duplicate warning |
| **Database ORM** | [Prisma ORM](https://www.prisma.io/) | `7.8.0` dengan Driver Adapter PostgreSQL (`@prisma/adapter-pg`) |
| **Basis Data** | PostgreSQL | Relational DB dengan dukungan JSONB untuk Audit Logs |
| **Autentikasi & Keamanan** | NextAuth.js (Auth.js) | `5.0.0-beta.31` dengan JWT Strategy & `bcryptjs` (salt 12) |
| **Mesin Render Grafis** | [@napi-rs/canvas](https://github.com/Brooooooklyn/canvas) | High-performance Rust/Skia 2D Canvas Engine di sisi server |
| **Barcode & Text Renderer**| [bwip-js](https://github.com/metafloor/bwip-js) & Custom Text Engine | Auto-wrap, auto-font-downscale, & rotated vertical resi index |
| **Pengolahan Berkas** | [xlsx](https://sheetjs.com/) | Pembaca file spreadsheet (.xlsx, .xls, .csv) otomatis |

---

## 🔐 Matriks Hak Akses & Peran (RBAC Matrix)

Sistem mengadopsi 2 tingkat peran pengguna (*User Roles*): **Admin** dan **Operator**. 

### Tabel Matriks Hak Akses Lengkap

| Modul / Fitur | Sub-Fitur / Aksi | Operator | Admin | Rute / Endpoint / Action |
| :--- | :--- | :---: | :---: | :--- |
| **Autentikasi** | Login / Logout | ✅ | ✅ | `/login`, Server Auth Handler |
| **Dashboard** | Melihat Statistik Operasional Umum | ✅ | ✅ | `/dashboard` |
| | Melihat Metrik Finansial & KPI Lanjutan | ❌ | ✅ | Transaksi Hari Ini, Pending, User Aktif, Nama Dicetak |
| | Melihat Live Stream Log Aktivitas Terbaru | ❌ | ✅ | Dashboard Activity Stream Widget |
| **Roll Produksi** | Melihat Daftar Roll & Kalkulasi Tinggi | ✅ | ✅ | `/roll` |
| | Membuat Roll Baru | ✅ | ✅ | `createRoll()` Server Action |
| | Mengubah Data Roll (Nama/Status) | ✅ | ✅ | `updateRoll()` Server Action |
| | Menghapus Roll Produksi | ❌ | ✅ | `deleteRoll()` (*Protected: requireAdmin*) |
| | Generate Berkas Cetak PNG Roll | ✅ | ✅ | `POST /api/generate` |
| | Preview & Unduh Berkas PNG | ✅ | ✅ | Modal Preview & Direct Download |
| | Melihat Detail Transaksi dalam Roll | ✅ | ✅ | Modal Detail Roll (`Eye` icon) |
| **Transaksi** | Melihat Daftar Transaksi & Filter | ✅ | ✅ | `/transaksi` |
| | Membuat Transaksi Baru | ✅ | ✅ | `createTransaction()` Server Action |
| | Mengubah Transaksi (Termasuk Completed) | ✅ | ✅ | `updateTransaction()` Server Action |
| | Menghapus Transaksi | ❌ | ✅ | `deleteTransaction()` (*Protected: requireAdmin*) |
| | Input Detail Nama (Manual / Paste / Excel) | ✅ | ✅ | `saveTransactionDetails()`, `POST /api/parse-excel` |
| | Deteksi Nama Duplikat | ✅ | ✅ | Duplicate Name Alert System |
| | Melihat Riwayat Edit Transaksi (Audit) | ✅ | ✅ | Modal Log Per-Transaksi (`History` icon) |
| **Material Font** | Melihat Katalog Font | ✅ | ✅ | `/materials/font` |
| | Tambah / Upload Font Baru (.ttf, .otf, .woff) | ✅ | ✅ | `createFont()`, `POST /api/upload` |
| | Menghapus Font | ❌ | ✅ | `deleteFont()` (*Protected: requireAdmin*) |
| **Material Background** | Melihat Katalog Background Plat | ✅ | ✅ | `/materials/background` |
| | Tambah / Upload Desain Background Baru | ✅ | ✅ | `createBackground()`, `POST /api/upload` |
| | Mengubah Nama & Warna Font Background | ✅ | ✅ | `updateBackground()` Server Action |
| | Menghapus Background Plat | ❌ | ✅ | `deleteBackground()` (*Protected: requireAdmin*) |
| **Manajemen User** | Akses Menu & Melihat Daftar User | ❌ | ✅ | `/users` (*Middleware Protected*) |
| | Tambah User Baru (Admin/Operator) | ❌ | ✅ | `createUser()` (*Protected: requireAdmin*) |
| | Ubah Nama, Email, & Role User | ❌ | ✅ | `updateUser()` (*Protected: requireAdmin*) |
| | Toggle Aktif / Non-Aktif User | ❌ | ✅ | `toggleUserActive()` (*Anti Self-Lock Guard*) |
| | Reset Password Pengguna | ❌ | ✅ | `resetUserPassword()` (*Protected: requireAdmin*) |
| | Hapus Pengguna | ❌ | ✅ | `deleteUser()` (*Anti Self-Delete Guard*) |
| **Audit & Log** | Akses Menu Log Aktivitas | ❌ | ✅ | `/log` (*Middleware Protected*) |
| | Filter Log Aktivitas (User, Aksi, Tanggal) | ❌ | ✅ | `/log?tab=semua` |
| | Inspeksi Perbandingan Data (Sebelum vs Sesudah)| ❌ | ✅ | Modal Detail Log Snapshot JSON |
| | Monitoring Waktu & Durasi Kerja Transaksi | ❌ | ✅ | `/log?tab=transaksi` (Waktu Mulai, Selesai, Kecepatan) |
| | Penghapusan Riwayat Log | ❌ | ❌ | **TIDAK ADA**: Bersifat *Append-Only Immutable* |

### Analisis Kritis Pembagian Hak Akses:
1. **Pelonggaran Hak Edit Transaksi Berstatus Selesai (*Completed*) untuk Operator**:
   * *Alasan Nyata Lapangan*: Pelanggan seringkali mengirim ralat penulisan nama atau penggantian nomor resi beberapa saat setelah berkas digenerate, namun sebelum film masuk ke mesin pemanas/oven DTF. Jika operator harus meminta approval admin hanya untuk mengoreksi 1 huruf, antrean mesin cetak akan terhenti (*bottleneck*).
   * *Mitigasi Resiko*: Setiap pengubahan yang dilakukan oleh operator akan otomatis dicatat ke dalam audit trail (`AuditLog` dan `ActivityLog`), menyertakan identitas pengubah, waktu, dan rekaman data sebelum vs sesudah diubah.
2. **Penguncian Hak Hapus (*Delete Lock*) Khusus Admin**:
   * Menghapus transaksi, roll, background, atau font akan menghapus relasi data dan berpotensi menghapus berkas fisik di server storage (`fs.rm`). Operator dilarang menghapus data agar tidak terjadi *fraud*, data hilang yang tidak terlacak, atau rusaknya integritas referensi transaksi lama.
3. **Pemberian Akses Tambah Font & Background untuk Operator**:
   * Mengakomodasi permintaan custom desain stiker atau jenis font baru dari pesanan mendesak tanpa hambatan otorisasi manajerial.

---

## 🖥️ Bedah Detail Fitur Per Menu Sistem

### 1. Dashboard Monitoring (`/dashboard`)
Pusat kontrol visual untuk memantau status operasional secara langsung.
* **Metrik Bersama (Operator & Admin)**:
  * *Total Rolls*: Jumlah keseluruhan roll media cetak yang terdaftar di sistem.
  * *Total Transaksi*: Akumulasi seluruh batch pesanan.
  * *Transaksi Selesai*: Jumlah batch yang telah sukses digenerate dan siap/sudah dicetak.
  * *Total Font & Background*: Jumlah material desain yang siap digunakan.
  * *Tabel Roll & Transaksi Terbaru*: Menampilkan 5 aktivitas produksi terakhir dengan shortcut aksi cepat.
* **Metrik Khusus Admin (KPI & Pengawasan)**:
  * *Transaksi Hari Ini*: Jumlah transaksi yang dibuat sejak pukul 00:00 hari ini.
  * *Transaksi Pending*: Jumlah transaksi yang masih berstatus `Processed` (memerlukan tindakan segera).
  * *User Aktif Hari Ini*: Total operator yang aktif melakukan input/generate hari ini.
  * *Total Nama Dicetak Hari Ini*: Akumulasi fisik stiker nama yang digenerate hari ini.
  * *Widget Feed Aktivitas Real-Time*: 8 log aksi terakhir di sistem beserta nama pelaku dan badge tipe aksinya.

---

### 2. Manajemen Roll Produksi (`/roll`)
Mengelola gulungan media film DTF (lebar 58 cm).
* **Kalkulasi Tinggi Otomatis**:
  * Sistem tidak hanya mencatat target kapasitas roll (misal: 100 cm atau 1000 cm), melainkan **menghitung secara presisi estimasi panjang aktual** yang digunakan berdasarkan seluruh paket transaksi di dalamnya via `calcOutputHeightFromGroups`.
* **Fitur & Interaksi**:
  * **Tambah Roll**: Input nama roll (misal: `ROLL-DTF-01-SEPT`), target tinggi (cm), dan target quantity.
  * **Edit Roll**: Memperbarui identitas roll atau status produksi.
  * **Generate Roll**: Memanggil generator grafis untuk menyatukan seluruh transaksi di dalam roll menjadi 1 lembar berkas PNG panjang.
  * **Preview & Download Hasil Cetak**: Modal interaktif dengan zoom untuk mengecek hasil rendering sebelum dicetak ke mesin fisik, dilengkapi tautan unduh beresolusi tinggi.
  * **Lihat Transaksi Roll**: Modal inspeksi cepat untuk memeriksa transaksi apa saja yang masuk ke dalam roll tersebut.
  * **Hapus Roll** (*Admin Only*): Menghapus roll beserta relasinya dengan aman.

---

### 3. Manajemen Transaksi & Detail Nama (`/transaksi`)
Jantung dari operasional produksi tempat operator memasukkan dan menyusun pesanan label nama.
* **Informasi Header Transaksi**:
  * Mengaitkan transaksi ke salah satu Roll aktif.
  * Tanggal transaksi.
  * Nomor Resi utama / referensi marketplace.
  * Preset ukuran label (Default: Standard 5.4 × 1.4 cm).
* **3 Metode Input Detail Nama Fleksibel**:
  1. **Input Manual Baris demi Baris**: Menambah nama satu per satu, memilih variasi Font dan Background Plat, serta jumlah kuantitas.
  2. **Quick Multi-Line Paste**: Cukup paste daftar nama mentah dari pesan WhatsApp / Chat Marketplace ke textarea, sistem akan otomatis memecahnya menjadi daftar baris.
  3. **Import Spreadsheet Excel/CSV (.xlsx, .xls, .csv)**:
     * Otomatis membaca kolom pertama atau kolom yang mengandung header `nama`, `name`, `label`, `teks`, atau `text`.
     * Menolak berkas corrupt atau berkas di atas batas maksimum 5 MB.
* **Deteksi Cerdas Nama Duplikat**:
  * Saat menyimpan detail transaksi, sistem memindai apakah terdapat nama yang sama (bersifat *case-insensitive*).
  * Menampilkan Toast Peringatan berlatar kuning: `⚠️ Terdeteksi X nama duplikat: "Nama" (2x). Pastikan ini disengaja.` untuk mencegah operator salah cetak pesanan kembar tanpa disengaja.
* **Sistem Resi Barcode Sectioning**:
  * Jika dalam 1 transaksi terdapat banyak resi, sistem memetakan detail nama ke masing-masing resi.
  * Setiap resi akan memperoleh section barcode dan penomoran paket tersendiri saat digenerate.
* **Riwayat Edit Per-Transaksi (Audit Log Tracker)**:
  * Setiap baris transaksi dilengkapi tombol ikon jam/riwayat (*History*).
  * Menampilkan modal pop-up kronologis: Siapa yang membuat pertama kali, siapa yang melakukan revisi terakhir, kapan perubahan dilakukan, serta daftar field apa saja yang diubah.

---

### 4. Material Font (`/materials/font`)
Manajemen tipografi untuk teks nama pada label DTF.
* **Dukungan Font Ganda**:
  * Menggunakan font default sistem operasi (seperti Arial, Times New Roman, Poppins, Comic Sans MS).
  * Mendukung upload berkas font mandiri (*Custom Font File*) berekstensi `.ttf`, `.otf`, atau `.woff`.
* **Penyimpanan Base64 & Safe Alias**:
  * File font dikonversi ke format Base64 di database Postgres dan disinkronisasikan ke filesystem server (`/tmp/fonts` di Vercel atau `public/fonts` di VPS/Local).
  * Sistem memberikan *safe alphanumeric alias* saat diregistrasikan ke Rust Canvas untuk mencegah kegagalan baca nama font yang mengandung karakter khusus.
* **Live Font Preview**: Kartu font menampilkan contoh teks "Label Nama 123" langsung dengan jenis huruf yang dipilih.

---

### 5. Material Background (`/materials/background`)
Katalog plat dasar desain stiker label DTF.
* **Konfigurasi Warna Font Otomatis**:
  * Setiap background memiliki pengaturan warna teks bawaan (`#FFFFFF` untuk latar gelap, `#000000` untuk latar terang).
  * Operator tidak perlu menebak warna teks agar hasil cetak selalu memiliki kontras tinggi yang mudah dibaca.
* **Upload Aset Gambar Plat**:
  * Mendukung upload file raster dan vektor web: `.png`, `.jpg`, `.jpeg`, `.svg`, `.webp`.
  * Gambar disimpan dalam database (Base64) dan filesystem lokal server.
* **Live Visual Card Preview**:
  * Setiap kartu background menyajikan simulasi visual label nyata lengkap dengan gambar plat dan teks contoh.

---

### 6. Manajemen Pengguna (`/users`)
*Menu khusus Admin untuk tata kelola akun dan hak akses tim.*
* **Tambah Pengguna**: Menentukan nama, alamat email unik, password awal (minimal 6 karakter, di-hash dengan Bcryptjs), dan role (`admin` atau `operator`).
* **Edit Data Pengguna**: Mengubah nama, email, dan menaikkan/menurunkan peran (*role*).
* **Toggle Status Aktif / Non-Aktif**:
  * Menonaktifkan akun operator yang cuti atau telah keluar tanpa perlu menghapus histori kerjanya.
  * *Safety Guard*: Admin tidak dapat menonaktifkan akun miliknya sendiri.
* **Reset Password Cepat**: Mengganti password akun pengguna jika operator lupa kredensial login.
* **Hapus Pengguna**: Menghapus akun permanen (dengan proteksi *Anti Self-Delete*).

---

### 7. Audit Trail & Log Aktivitas (`/log`)
*Instrumen transparansi, pengawasan kinerja, dan forensik data perusahaan khusus Administrator.*
* **Tab 1: Semua Aktivitas**:
  * Rekaman kronologis seluruh mutasi data: `BUAT_TRANSAKSI`, `UBAH_TRANSAKSI`, `HAPUS_TRANSAKSI`, `SIMPAN_DETAIL_NAMA`, `GENERATE_LABEL`, `BUAT_ROLL`, `UBAH_ROLL`, `TAMBAH_FONT`, `TAMBAH_BACKGROUND`, `TAMBAH_USER`, dll.
  * **Filter Multi-Kriteria**: Filter berdasarkan Operator tertentu, Jenis Aksi tertentu, serta rentang Tanggal Mulai dan Tanggal Selesai.
  * **Modal Detail Snapshot**: Menyajikan perbandingan data *Sebelum* (*Before*) dan *Sesudah* (*After*) dalam format JSON terstruktur.
* **Tab 2: Monitoring Waktu & Durasi Kerja Per Transaksi**:
  * Mengelompokkan aktivitas berdasarkan ID Transaksi.
  * Menghitung durasi pengerjaan: waktu aksi pertama (mulai input) hingga waktu aksi terakhir (selesai simpan/generate).
  * **Indikator Kecepatan Visual Berwarna**:
    * 🟢 **Hijau (< 5 Menit)**: Pengerjaan sangat cepat & efisien.
    * 🟡 **Kuning (5 – 30 Menit)**: Pengerjaan standar wajar.
    * 🔴 **Merah (> 30 Menit)**: Pengerjaan lambat, terhenti, atau tertunda.
  * **Timeline Alur Kerja Interaktif**: Mengklik salah satu transaksi akan memunculkan timeline vertikal runtut dari detik ke detik aksi yang terjadi pada transaksi tersebut.
* **Prinsip Desain Append-Only Immutable**:
  * Tabel `activity_logs` tidak menyediakan method `UPDATE` atau `DELETE`. Bahkan Admin sekalipun tidak dapat menghapus atau merekayasa riwayat log aktivitas melalui antarmuka sistem.

---

## 🖨️ Spesifikasi Teknis Mesin Cetak (Print Engine Specs)

Seluruh parameter tata letak dikunci pada modul `src/lib/print-spec.ts` dan dieksekusi oleh `src/lib/label-generator.ts`. Dilarang mengubah nilai ini tanpa persetujuan penanggung jawab produksi fisik.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       LEBAR TOTAL ROLL: 58.0 CM (300 DPI)                   │
├───────────────┬─────────────────────────────────────────────────────────────┤
│ BARCODE /     │                       AREA LABEL 10 KOLOM                   │
│ NO. RESI      │  [Label 1] [Label 2] [Label 3] ... [Label 10]               │ <- Baris 1
│ (2.65 cm)     │  [Label 11] ...                    [Label 20]               │ <- Baris 2
│ Teks vertikal │  [Label 21] ...                    [Label 30]               │ <- Baris 3 (Total 5 Baris)
│ rotasi -90°   │  [Label 31] ...                    [Label 40]               │ <- Baris 4 (50 Label / Paket)
│               │  [Label 41] ...                    [Label 50]               │ <- Baris 5 (Tinggi 7.6 cm)
├───────────────┴─────────────────────────────────────────────────────────────┤
│                        GAP ANTAR PAKET: 0.6 CM                              │
├───────────────┬─────────────────────────────────────────────────────────────┤
│ RESI 2 / LANJ │  [Label 51] ...                    [Label 100]              │ <- Paket ke-2
└───────────────┴─────────────────────────────────────────────────────────────┘
```

### Parameter Ukuran & Dimensi Produksi:
* **Resolusi Cetak Dasar**: `300 DPI` (1 inci = 2.54 cm $\rightarrow$ 1 cm $\approx$ 118.11 pixel).
* **Lebar Media Cetak Roll**: `58.0 cm` (6850 pixel).
* **Dimensi Fisik Per Label**: Lebar `5.4 cm` × Tinggi `1.4 cm` (638 px × 165 px).
* **Jarak Antar Label (Spacing)**: Horizontal `0.15 cm` & Vertikal `0.15 cm` (18 px).
* **Formasi Paket**: 10 kolom horizontal × 5 baris vertikal = **50 label per paket**.
* **Tinggi Satu Paket Fisik**: $(5 \times 1.4\text{ cm}) + (4 \times 0.15\text{ cm}) = \mathbf{7.6\text{ cm}}$ (898 pixel).
* **Area Samping Resi / Barcode**: Lebar `2.65 cm` (313 pixel). 
  * Diisi teks nomor resi yang dirotasi $-90^\circ$ vertikal presisi di tengah paket.
  * Jika jumlah label lebih dari 50, otomatis diberi penomoran paket pecahan: `RESI-12345 1/3`, `RESI-12345 2/3`, dst.
* **Jarak Pemisah Antar Paket (Gap)**: `0.6 cm` (71 pixel) untuk mempermudah pemotongan pisau mesin/gunting operator.

### Algoritma Penataan Teks & Auto-Downscale:
1. **Auto-Wrap & Centering**: Memecah nama panjang menjadi beberapa baris secara seimbang.
2. **Dynamic Downscaling**: Teks dimulai dari ukuran maksimum proporsional ($60\%$ tinggi label). Jika teks melebihi batas toleransi lebar ($70\%$ lebar label), ukuran font diturunkan bertahap (step 1px) hingga muat.
3. **Safety Font Clamp**: Font terkecil dikunci pada `28 pixel` ($\approx 7\text{ pt}$ @ 300 DPI) agar teks tetap tajam dan tidak pudar saat proses transfer panas DTF ke kain.
4. **Boundary Protection**: Batas teks dibatasi $70\%$ lebar label agar teks tidak menabrak ikon/bintang pada plat background.

### Injeksi Header Biner PNG pHYs (Penyelamat Skala CorelDRAW):
Format PNG standar umumnya tidak membawa informasi satuan fisik (pixel-per-meter), sehingga software percetakan seperti CorelDRAW mengasumsikan resolusi default 72 DPI. Hal ini menyebabkan gambar 58 cm terbaca menjadi lebih dari 240 cm.
Sistem secara otomatis membedah struktur byte biner PNG dan menyisipkan chunk **pHYs** (*Physical Pixel Dimensions*):
$$\text{Pixels Per Meter (PPM)} = \text{round}\left(\frac{300}{0.0254}\right) = \mathbf{11811}\text{ ppm}$$
Hasilnya: File PNG yang diunduh dari Tinemu **dapat langsung di-drag & drop ke CorelDRAW dan langsung terbaca pada dimensi fisik 58.0 cm presisi tanpa perlu resize manual**.

---

## 📋 SOP Alur Kerja Operasional (Panduan User & Orang Awam)

Bagi operator cetak dan staf administrasi baru, berikut panduan langkah demi langkah memproses pesanan:

```
[1. Login Akun] ──> [2. Buat / Pilih Roll Aktif] ──> [3. Buat Transaksi Baru]
                                                             │
[6. Download PNG] <── [5. Klik Generate Roll]   <── [4. Masukkan Nama & Resi]
        │                                                    │
        ▼                                                    ▼
(Kirim ke Corel / RIP)                             (Cek Peringatan Duplikat)
```

### Langkah 1: Masuk ke Sistem
* Buka browser dan arahkan ke alamat web sistem Tinemu.
* Masukkan email dan kata sandi yang telah diberikan oleh Administrator.

### Langkah 2: Menyiapkan Lembar Kerja (Roll)
* Masuk ke menu **Roll** pada sidebar kiri.
* Klik tombol **Tambah Roll**.
* Masukkan nama roll untuk membedakan kelompok cetak (contoh: `ROLL-PAGI-A`).
* Isi estimasi tinggi roll (misal: `100 cm`). Status otomatis `Diproses`.

### Langkah 3: Menginput Pesanan Pelanggan (Transaksi)
* Masuk ke menu **Transaksi**.
* Klik tombol **Tambah Transaksi**.
* Pilih Roll yang tadi disiapkan, tentukan tanggal hari ini, dan masukkan Nomor Resi pesanan.
* Klik tombol **Simpan Transaksi**.

### Langkah 4: Memasukkan Nama-Nama Label
* Pada daftar transaksi, klik transaksi yang baru dibuat untuk membuka form detail nama.
* Anda dapat memilih salah satu cara input:
  * **Ketik Langsung**: Masukkan nama, pilih jenis Font, pilih plat Background, dan tentukan kuantitas stiker.
  * **Paste Daftar Nama**: Jika pelanggan mengirim teks daftar nama via WhatsApp, salin dan tempelkan ke kolom teks massal.
  * **Upload File Excel**: Jika pesanan berupa rekap spreadsheet, klik **Pilih File** (.xlsx / .csv), sistem otomatis membaca baris nama.
* **Perhatikan Peringatan Kuning**: Jika muncul notifikasi `⚠️ Terdeteksi nama duplikat`, pastikan kembali ke pemesan apakah pesanan kembar tersebut disengaja atau tidak.
* Klik **Simpan Detail Nama**.

### Langkah 5: Generate Berkas Cetak
* Kembali ke menu **Roll**.
* Pastikan panjang terpakai (*Estimasi Tinggi*) tidak melebihi kapasitas bahan roll Anda.
* Klik tombol ikon tongkat sihir (**Generate Roll**) pada roll yang ingin dicetak.
* Tunggu beberapa detik hingga proses rendering grafis di server selesai (status berubah menjadi `Selesai`).

### Langkah 6: Preview & Unduh
* Klik tombol **Preview / Unduh**.
* Periksa kesesuaian letak nama dan barcode resi pada jendela pratinjau.
* Klik tombol **Download**. Berkas PNG resolusi 300 DPI siap diserahkan ke bagian operator mesin DTF untuk dicetak langsung via CorelDRAW atau software RIP mesin.

### Penanganan Ralat / Revisi Nama:
* Jika ada ralat nama saat status sudah `Selesai`, operator tidak perlu panik. 
* Cukup buka kembali menu **Transaksi**, klik tombol edit pada transaksi tersebut, perbaiki nama yang salah, lalu klik **Generate Roll** ulang di menu Roll.

---

## 💻 Panduan Instalasi & Deployment (Panduan Developer)

### 1. Kebutuhan Lingkungan Sistem (Prerequisites)
* **Node.js**: Versi `20.x` atau lebih baru.
* **Package Manager**: `npm`, `pnpm`, atau `bun`.
* **Database**: PostgreSQL versi `14` atau lebih tinggi.
* **Compiler C++**: Dibutuhkan oleh node-gyp / `@napi-rs/canvas` (biasanya sudah include pada OS Linux/Mac, atau Visual Studio Build Tools pada Windows).

### 2. Kloning & Pemasangan Dependensi
```bash
# Kloning repositori
git clone https://github.com/suksesdigitalmedia11-gif/Automation-label.git
cd Automation-label

# Install dependensi
npm install
```

### 3. Konfigurasi Environment Variable (`.env`)
Salin atau buat file `.env` di direktori *root* proyek:
```env
# URL Koneksi PostgreSQL
DATABASE_URL="postgresql://username:password@localhost:5432/tinemu_db?schema=public"

# Secret Key untuk NextAuth (Hasilkan via: openssl rand -base64 32)
AUTH_SECRET="your-super-secret-random-key-here"

# URL Aplikasi
NEXTAUTH_URL="http://localhost:3000"
```

### 4. Setup Database & Seeding Awal
```bash
# Sinkronisasi schema Prisma ke database
npx prisma db push

# Generate client Prisma
npx prisma generate

# Jalankan database seeder (Membuat user default, font, background, preset)
npm run seed
```

#### Kredensial Akun Default Bawaan Seeder:
| Role | Email | Password Default |
| :--- | :--- | :--- |
| **Admin** | `admin@tinemu.com` | `admin123` |
| **Operator** | `operator@tinemu.com` | `operator123` |

### 5. Menjalankan Server Development
```bash
npm run dev
```
Akses aplikasi melalui peramban di: `http://localhost:3000`

### 6. Skrip NPM yang Tersedia
* `npm run dev`: Menjalankan aplikasi pada mode pengembang dengan *hot-reload*.
* `npm run build`: Menghasilkan artefak prisma client dan mem-build bundle Next.js untuk produksi.
* `npm run start`: Menjalankan server aplikasi Next.js mode produksi.
* `npm run lint`: Memeriksa kepatuhan penulisan kode via ESLint.
* `npm run seed`: Menjalankan file seed database (`prisma/seed.ts`).
* `npm run db:push`: Mendorong perubahan skema langsung ke database.
* `npm run db:studio`: Membuka antarmuka grafis penjelajah database Prisma Studio.
* `npm run typecheck`: Memeriksa integritas tipe data TypeScript secara menyeluruh.

---

## 📂 Struktur Direktori Proyek

```
Automation-label/
├── prisma/
│   ├── schema.prisma          # Skema database relasional Prisma (User, Roll, Tx, Logs)
│   └── seed.ts                # Seeder data awal (admin, operator, font, background, preset)
├── public/
│   ├── backgrounds/           # Direktori penyimpanan file gambar plat background
│   ├── fonts/                 # Direktori penyimpanan file font custom (.ttf, .otf)
│   └── output/                # Direktori keluaran file PNG hasil render label
├── src/
│   ├── actions/               # Next.js Server Actions (Mutasi data & Business Logic)
│   │   ├── audit-log-actions.ts
│   │   ├── background-actions.ts
│   │   ├── detail-actions.ts   # Logika simpan nama & duplicate name detector
│   │   ├── font-actions.ts
│   │   ├── log-actions.ts      # Engine pencatat ActivityLog (Append-only)
│   │   ├── roll-actions.ts     # CRUD Roll & RBAC guard
│   │   ├── transaksi-actions.ts# CRUD Transaksi & Cleanup folder
│   │   └── user-actions.ts     # CRUD Pengguna & Password Hashing
│   ├── app/                   # App Router Pages & Layouts
│   │   ├── (auth)/login/      # Halaman Login Autentikasi
│   │   ├── (dashboard)/       # Halaman Terproteksi Sistem
│   │   │   ├── dashboard/     # Metrik Dashboard & Admin KPI
│   │   │   ├── roll/          # Modul Manajemen Roll & Print Preview
│   │   │   ├── transaksi/     # Modul Transaksi & Batch Detail Nama
│   │   │   ├── materials/     # Submodul Font & Background Plat
│   │   │   ├── users/         # Modul Tata Kelola Pengguna (Admin)
│   │   │   └── log/           # Modul Monitoring Aktivitas & Waktu Kerja
│   │   └── api/               # Rute API Backend
│   │       ├── auth/          # Endpoint NextAuth
│   │       ├── generate/      # Endpoint Eksekusi Render Gambar Label
│   │       ├── parse-excel/   # Endpoint Pembaca Berkas Excel/CSV
│   │       └── upload/        # Endpoint Pengunggah File Font & Gambar
│   ├── components/            # Komponen Antarmuka Reusable (UI & Form)
│   ├── lib/                   # Utilitas Sistem & Engine Inti
│   │   ├── auth.ts            # Konfigurasi NextAuth Providers & Authorize
│   │   ├── auth-helpers.ts    # requireAuth(), requireAdmin(), safeError()
│   │   ├── label-generator.ts # Engine Render Rust/Skia Canvas & Injeksi 300 DPI
│   │   ├── output-calc.ts     # Formula Penghitung Tinggi Roll (cm)
│   │   ├── print-spec.ts      # Konstanta Standar Produksi DTF Fisik
│   │   └── prisma.ts          # Singleton Instance Prisma Client dengan Adapter PG
│   └── middleware.ts          # Route Guarding & RBAC Redirection Middleware
├── package.json               # Daftar pustaka dependensi & skrip aplikasi
└── README.md                  # Dokumentasi komprehensif sistem
```

---

## 🔬 Analisa Kritis & Rekomendasi Arsitektur

Sebagai hasil kajian teknis kritis dari arsitektur sistem berjalan:

### 1. Keunggulan Arsitektur Saat Ini
* **Performa Render Tinggi**: Penggunaan `@napi-rs/canvas` jauh lebih cepat dan hemat memori dibandingkan solusi berbasis Headless Chrome (seperti Puppeteer/Playwright) atau HTML2Canvas di sisi klien.
* **Ketahanan Bencana Serverless / Cloud**: Sistem telah dilengkapi fallback Base64 di database Postgres untuk font dan gambar latar, serta pendeteksi lingkungan `process.env.VERCEL` (menggunakan direktori `/tmp`), sehingga aplikasi siap dipindahkan kapan saja antara lingkungan VPS biasa maupun *Serverless Hosting*.
* **Integritas Transaksional**: Operasi simpan detail nama menggunakan `prisma.$transaction` atomic; jika satu baris data gagal diproses, seluruh transaksi dibatalkan tanpa menyisakan data korup (*orphan records*).
* **Keamanan Path Traversal**: Pada penghapusan transaksi (`deleteTransaction`), sistem menerapkan pengujian ketat `targetDir.startsWith(outputBase + path.sep)` guna menjamin tidak ada skrip yang dapat menghapus direktori di luar folder output.

### 2. Rekomendasi Roadmap Skalabilitas Masa Depan
1. **Antrean Pekerjaan Latar Belakang (Asynchronous Job Queue)**:
   * *Kondisi Saat Ini*: Proses `generateLabels` dijalankan secara *synchronous* dalam satu siklus HTTP Request. Untuk roll dengan panjang di atas 10 meter (ratusan transaksi), pemrosesan dapat memakan waktu 15–45 detik yang berpotensi memicu *gateway timeout* pada load balancer.
   * *Rekomendasi*: Menerapkan antrean antre kerja (seperti Redis + BullMQ) dengan status polling atau WebSocket notification (SSE/Socket.io).
2. **Penyimpanan Objek Eksternal (Cloud Object Storage - S3 / R2)**:
   * *Kondisi Saat Ini*: Berkas hasil cetak disimpan di disk lokal server (`public/output` atau `/tmp`).
   * *Rekomendasi*: Jika aplikasi dideploy ke multi-instance (cluster kubernetes / auto-scaling), berkas gambar hasil render disarankan dialihkan ke Cloudflare R2 atau AWS S3 dengan presigned URL.
3. **Penyusutan Otomatis Berkas Lama (Retention Policy)**:
   * Menambahkan *cron job* berkala untuk menghapus file output PNG yang telah berumur lebih dari 14 atau 30 hari guna mencegah kepenuhan kapasitas penyimpanan storage server.

---

<div align="center">
  <b>Tinemu DTF Automation System</b> — Dibangun untuk Efisiensi, Ketelitian, dan Kecepatan Industri Percetakan Modern.
</div>
