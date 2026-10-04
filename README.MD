# 🏭 Moon Autoparts - Sistem Operasional Pabrik Sparepart Mobil

Aplikasi ERP mini untuk operasional pabrik dan bisnis sparepart mobil. Autentikasi menggunakan Firebase Authentication; produk, transaksi, karyawan, stock opname, dan arsip HPP disimpan di Cloud Firestore. Sebelum dijalankan atau di-deploy, hubungkan aplikasi ke proyek Firebase menggunakan langkah konfigurasi di bawah ini.

---

## ✨ Fitur Utama

### 🛒 1. Menu Kasir (Point of Sales)
- **Checkout:** Proses transaksi penjualan mengurangi stok sparepart di gudang.
- **Pencarian Barcode:** Input barang cepat di kasir menggunakan teks barcode atau integrasi kamera sebagai pemindai (scanner).
- **Kunci HPP Otomatis:** Setiap transaksi mengunci nilai HPP saat itu untuk menjaga akurasi perhitungan keuntungan.

### 📦 2. Manajemen Barang & HPP Produksi
- **Input Sparepart:** Form inventarisasi untuk mencatat SKU, barcode, kategori, harga, HPP, dan jumlah stok sparepart.
- **Menu Perhitungan HPP Produksi:** Owner dan Admin dapat mencatat produk hasil produksi, bahan baku, tenaga kerja langsung, overhead, dan jumlah hasil produksi. Sistem menampilkan biaya produksi total serta HPP per unit, lalu menyimpan hasil ke Cloud Firestore untuk ditinjau, diubah, dihapus, atau dicetak/diekspor ke PDF. Perhitungan ini tidak otomatis mengubah stok barang.
- **Rumus HPP produksi:** `(total biaya bahan baku + tenaga kerja langsung + overhead produksi) ÷ jumlah unit hasil produksi`.
- **Contoh:** Karet mentah `10 × Rp1.000` + pipa besi `20 × Rp1.500` + perekat `10 × Rp1.000` menghasilkan biaya bahan Rp50.000. Ditambah tenaga kerja Rp20.000 dan overhead Rp0, total biaya produksi Rp70.000. Jika hasilnya 15 unit, HPP per unit adalah `Rp70.000 ÷ 15 = Rp4.666,67`, dibulatkan menjadi **Rp4.667**.
- **Notifikasi Stok Minimum:** Indikator visual apabila stok sparepart sudah mendekati batas minimum.

### 📋 3. Modul Stock Opname
- **Audit Finansial Internal:** Formulir digital periodik untuk mencocokkan stok fisik di toko dengan stok tercatat pada sistem.
- **Pencatatan Selisih:** Otomatis menghitung selisih barang (hilang/rusak), menyimpan arsip di Cloud Firestore, dan melakukan penyesuaian stok secara atomik.

### 👥 4. Manajemen Karyawan & Hak Akses (Multi-Role)
- **Pembatasan Menu Dinamis:** Hak akses pengguna dibagi berdasarkan peran masing-masing demi keamanan data sensitif toko:
  - `owner`: Akses penuh ke seluruh sistem, termasuk menambah/menghapus akun karyawan dan mengubah role.
  - `admin`: Akses ke dashboard, kasir, inventaris, perhitungan HPP produksi, dan stock opname; tidak dapat mengelola akun karyawan.
  - `kasir`: Hanya memiliki izin untuk membuka layar kasir dan melakukan transaksi penjualan.
- **Login:** Aplikasi menggunakan Firebase Authentication email/kata sandi dan memeriksa profil serta role karyawan di Firestore.
- **Kelola akun:** Hanya `owner` yang dapat menambah/menghapus akun karyawan dan mengubah role. Minimal satu akun owner harus tetap tersedia.
- **Akun karyawan:** Dibuat melalui Firebase Cloud Functions; pembuatan akun tidak menyimpan kata sandi ke Firestore.
- **Checkout:** Cloud Function memvalidasi stok terakhir dan menulis transaksi serta pengurangan stok dalam satu transaksi database.

---

## 📂 Arsitektur Direktori Proyek

```text
umkm-mudah/
├── .github/                   # Konfigurasi otomasi GitHub Actions (CI/CD)
├── public/                    # Aset publik statis
└── src/
    ├── assets/                # File gaya global (CSS), font, dan gambar pendukung
    ├── config/                # Inisialisasi konfigurasi pihak ketiga
    │   └── firebase.js        # SDK penghubung koneksi ke Firebase Cloud Services
    ├── components/            # Komponen antarmuka (UI) modular yang dapat digunakan kembali
    │   ├── Navbar.jsx         # Bar navigasi bagian atas halaman
    │   ├── Sidebar.jsx        # Menu navigasi samping dengan filter berbasis Hak Akses (Role)
    │   ├── ProductCard.jsx    # Komponen visual display ringkasan barang
    │   └── ui/                # UI atomic dasar (Tombol, Input, Modal Box)
    ├── context/               # Manajemen state global aplikasi
    │   └── AuthContext.jsx    # Pemelihara data sesi (session) karyawan yang sedang login
    ├── hooks/                 # Custom React Hooks
    │   └── useFirestore.js    # Abstraksi fungsi CRUD cepat ke database Firebase
    ├── pages/                 # Berkas halaman utama aplikasi
    │   ├── Login.jsx          # Gerbang otentikasi masuk pengguna
    │   ├── Dashboard.jsx      # Panel utama grafik penjualan & analisis laba (Admin Only)
    │   ├── Cashier.jsx        # Dashboard utama tempat transaksi kasir berlangsung
    │   ├── Inventory.jsx      # Panel kelola sparepart dan stok
    │   ├── HppCalculator.jsx  # Kalkulasi HPP biaya produksi dan arsip perhitungan
    │   ├── StockOpname.jsx    # Halaman entri hasil opname stok fisik berkala
    │   └── Employees.jsx      # Manajemen data akun & pengubah peran karyawan (Admin Only)
    ├── routes/                # Pengatur jalur navigasi halaman
    │   └── PrivateRoute.jsx   # Protektor keamanan halaman dari pengguna ilegal
    ├── utils/                 # Kumpulan fungsi pembantu (helper functions)
    │   ├── hppCalculator.js   # Perhitungan HPP produksi dan helper biaya
    │   └── formatCurrency.js  # Pengubah format angka integer menjadi Rupiah (Rp)
    ├── App.jsx                # Komponen root pengatur struktur routing utama
    └── main.jsx               # Titik entri utama (Entry Point) eksekusi aplikasi
├── firestore.rules            # Aturan otorisasi Cloud Firestore
└── functions/                 # Cloud Functions tepercaya untuk akun dan checkout
    ├── index.js               # Callable Functions untuk karyawan dan checkout atomik
    └── scripts/bootstrapOwner.js # Menyiapkan Owner pertama secara administratif
```

### Koleksi Firestore
- `employees/{uid}`: profil karyawan dan role; perubahan hanya melalui Cloud Functions.
- `products/{sku}`: katalog, harga, HPP, dan saldo stok sparepart.
- `transactions/{id}`: bukti transaksi penjualan, snapshot HPP saat transaksi, dan laba kotor.
- `hpp_calculations/{id}`: arsip kalkulasi biaya produksi per batch.
- `stock_opname/{id}`: hasil audit dan penyesuaian saldo stok.

---

## 🗄️ Model Struktur Data (Cloud Firestore)

Database dokumen NoSQL pada Firebase Firestore terbagi menjadi 4 koleksi utama:

### 1. Koleksi: `products`
```json
{
  "id_barang": "SP-001",
  "barcode": "899123450001",
  "nama_barang": "Filter Oli Mesin",
  "kategori": "Filter & Pelumasan",
  "harga_jual": 45000,
  "harga_beli_terakhir": 28000,
  "hpp_rata_rata": 30000,
  "stok_sekarang": 120,
  "stok_minimum": 10,
  "dibuat_pada": "2026-10-04T12:00:00Z"
}
```

### 2. Koleksi: `transactions`
```json
{
  "id_transaksi": "TRX-20261004-001",
  "waktu": "2026-10-04T16:30:00Z",
  "id_kasir": "EMP-002",
  "nama_kasir": "Siti Aminah",
  "item_belanja": [
    {
      "id_barang": "SP-001",
      "nama_barang": "Filter Oli Mesin",
      "jumlah": 2,
      "harga_jual_satuan": 5000,
      "hpp_satuan": 3400
    }
  ],
  "total_belanja": 10000,
  "total_hpp": 6800,
  "laba_kotor": 3200,
  "metode_pembayaran": "Tunai"
}
```

### 3. Koleksi: `employees`
```json
{
  "id_karyawan": "UID_DARI_FIREBASE_AUTH",
  "nama": "Siti Aminah",
  "email": "siti.kasir@toko.com",
  "role": "kasir", 
  "status": "aktif"
}
```

### 4. Koleksi: `stock_opname`
```json
{
  "id_opname": "OPN-202610-01",
  "tanggal": "2026-10-31T22:00:00Z",
  "id_petugas": "EMP-003",
  "detail_barang": [
    {
      "id_barang": "BRG-001",
      "stok_sistem": 120,
      "stok_fisik": 118,
      "selisih": -2,
      "keterangan": "Kemasan robek/bocor"
    }
  ],
  "status": "selesai"
}
```

---

## 🛠️ Panduan Instalasi Lokal

Ikuti langkah-langkah berikut untuk menjalankan proyek **Moon Autoparts** di komputer lokal Anda:

### 1. Kloning Repositori
```bash
git clone https://github.com
cd umkm-mudah
```

### 2. Instalasi Dependensi
Aplikasi ini berjalan menggunakan Node.js. Pastikan Node.js telah terpasang, lalu jalankan:
```bash
npm install
npm install --prefix functions
```

### 3. Konfigurasi Variabel Lingkungan (Environment Variables)
Salin `.env.example` menjadi `.env.local`, kemudian salin nilai konfigurasi aplikasi web dari Firebase Console → Project settings → Your apps. File `.env.local` tidak masuk ke Git.
```env
VITE_FIREBASE_API_KEY=nilai-dari-firebase
VITE_FIREBASE_AUTH_DOMAIN=project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=project-id
VITE_FIREBASE_STORAGE_BUCKET=project-id.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=nilai-dari-firebase
VITE_FIREBASE_APP_ID=nilai-dari-firebase
```

### 4. Siapkan Owner pertama
1. Di Firebase Console → Authentication, buat akun email/kata sandi Owner pertama, lalu salin UID-nya.
2. Login dengan Google Cloud CLI sebagai project administrator (`gcloud auth application-default login`).
3. Dari folder `functions`, bootstrap hanya boleh dijalankan sekali:
   ```bash
   $env:GCLOUD_PROJECT="moon-autoparts"
   npm run bootstrap:owner -- UID_DARI_AUTH "Nama Owner"
   ```
   Script membuat profil Owner pertama dan mengunci bootstrap. Service-account key tidak diperlukan; gunakan Application Default Credentials dan jangan simpan key di source code.

### 5. Deploy aturan database, Functions, dan hosting
Pilih proyek Firebase melalui CLI (`firebase use --add`), lalu jalankan dari root:
```bash
npm run build
firebase deploy --only firestore:rules,functions,hosting
```
Cloud Functions berjalan di `asia-southeast2`. Pastikan proyek memiliki billing/plan yang diperlukan oleh Functions sebelum deploy.

### 6. Jalankan Server Pengembangan Lokal
```bash
npm run dev
```
Buka peramban (browser) Anda dan akses alamat lokal yang tertera pada terminal (biasanya `http://localhost:5173`).

---

## 🌐 Data lama dari mode lokal

Catatan yang sebelumnya tersimpan di `localStorage` tiap browser tidak otomatis dipindahkan ke Firestore. Ekspor dan tinjau data lama sebelum migrasi, lalu impor setelah Owner pertama dan aturan database aktif. Aplikasi versi ini tidak lagi membaca atau menulis catatan usaha ke localStorage.

---
**Moon Autoparts** — *Operasional sparepart mobil dalam satu tempat.*
