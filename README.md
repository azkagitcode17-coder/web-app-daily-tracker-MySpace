# 🌙 MySpace — Personal Web App

Aplikasi web pribadi all-in-one untuk kebutuhan sehari-hari, dibangun dengan HTML, CSS, JavaScript, dan Firebase Firestore.

---

## ✨ Fitur

| Fitur | Deskripsi |
|-------|-----------|
| 💰 **Finance Tracker** | Catat pemasukan & pengeluaran, grafik garis 7 hari |
| 📚 **Monitoring Belajar** | Timer countdown, progress bar, tandai berhasil/gagal |
| 🎓 **Rata-rata Nilai** | Input mapel bebas, hitung otomatis, riwayat tersimpan |
| 📋 **Jadwal Harian** | Checklist, donut chart progress, tandai hari libur |
| 📅 **Kalender** | Navigasi bulan, lihat jadwal per tanggal |
| 🕐 **Jam Indonesia** | WIB / WITA / WIT real-time |
| 🔢 **Kalkulator** | Operasi lengkap (+, −, ×, ÷, %, ±) |

---

## 🗂️ Struktur Folder

```
myspace/
├── index.html              # Kerangka utama (sidebar, topbar, modal)
├── css/
│   └── style.css           # Semua styling (tema, komponen, responsive)
├── js/
│   ├── firebase.js         # ⚠️ Konfigurasi Firebase — EDIT DI SINI
│   ├── utils.js            # Cache buster, helper, navigasi, search, init
│   ├── dashboard.js        # Logika halaman dashboard
│   ├── finance.js          # Logika finance tracker
│   ├── study.js            # Logika monitoring belajar
│   ├── grades.js           # Logika rata-rata nilai
│   ├── schedule.js         # Logika jadwal harian
│   ├── calendar.js         # Logika kalender
│   ├── clock.js            # Logika jam Indonesia
│   └── calculator.js       # Logika kalkulator
└── pages/
    ├── dashboard.html      # HTML konten dashboard (referensi)
    ├── finance.html        # HTML konten finance (referensi)
    ├── study.html          # HTML konten belajar (referensi)
    ├── grades.html         # HTML konten nilai (referensi)
    ├── schedule.html       # HTML konten jadwal (referensi)
    ├── calendar.html       # HTML konten kalender (referensi)
    ├── clock.html          # HTML konten jam (referensi)
    └── calculator.html     # HTML konten kalkulator (referensi)
```

> **Catatan:** Folder `pages/` berisi file HTML referensi tiap fitur agar mudah diedit.  
> Konten aktual yang dirender ada di dalam `index.html`.

---

## ⚙️ Setup Firebase

1. Buka [console.firebase.google.com](https://console.firebase.google.com)
2. Buat project baru → pilih **Spark plan (gratis)**
3. Aktifkan **Firestore Database** (mode production/test)
4. Buka **Project Settings → Your apps → Web app**
5. Copy config dan paste ke `js/firebase.js`:

```js
const firebaseConfig = {
  apiKey:            "ISI_API_KEY_KAMU",
  authDomain:        "ISI_AUTH_DOMAIN",
  projectId:         "ISI_PROJECT_ID",
  storageBucket:     "ISI_STORAGE_BUCKET",
  messagingSenderId: "ISI_MESSAGING_SENDER_ID",
  appId:             "ISI_APP_ID"
};
```

> **Tanpa Firebase pun tetap berjalan** — data disimpan di `localStorage` browser secara otomatis.

---

## 🔄 Update & Versi

Setiap kali kamu **mengedit dan menyimpan** file, naikkan versi di `js/utils.js`:

```js
const APP_VERSION = '1.0.0'; // → ganti ke '1.0.1', '1.0.2', dst.
```

Ini mencegah browser memakai file lama dari cache (tidak perlu Ctrl+F5 lagi).

---

## 🛠️ Tech Stack

- **HTML5** — Struktur halaman
- **CSS3** — Custom properties, animasi, responsive grid
- **JavaScript (ES6+)** — Logika aplikasi
- **Tailwind CSS** — Utility classes (via CDN)
- **Bootstrap Icons** — Icon set (via CDN)
- **Chart.js** — Grafik garis & donut chart
- **jQuery** — Fitur pencarian global
- **Firebase Firestore** — Database cloud (Spark/gratis)

---

## 📱 Responsive

| Perangkat | Tampilan |
|-----------|----------|
| Desktop   | Sidebar terbuka, layout multi-kolom |
| Tablet    | Sidebar collapsible |
| HP        | Sidebar tersembunyi, tombol hamburger |

---

## 🌙 Dark / Light Mode

Klik ikon ☀️/🌙 di pojok kanan atas. Preferensi disimpan otomatis.

---

## 📄 Lisensi

Proyek pribadi — bebas digunakan dan dimodifikasi.

---

## 🔐 Sistem Login

Web app ini dilengkapi autentikasi Firebase Authentication.

### Alur
```
login.html  →  (berhasil login)  →  index.html
index.html  →  (belum login)     →  login.html (redirect otomatis)
```

### Fitur Login
- **Daftar akun** baru dengan nama, email, password
- **Login** dengan email & password
- **Lupa password** — kirim link reset ke email
- **Logout** — tombol di bagian bawah sidebar
- **Indikator kekuatan password** saat daftar
- **Data terpisah per akun** — setiap user hanya lihat data miliknya

### Struktur Data Firestore (per user)
```
users/
  {uid}/
    finance/     ← transaksi keuangan
    study/       ← sesi belajar
    grades/      ← riwayat nilai
    schedule/    ← jadwal harian
    holidays/    ← hari libur
```

### Aktifkan Firebase Authentication
1. Buka [console.firebase.google.com](https://console.firebase.google.com)
2. Pilih project → **Authentication** → **Get started**
3. Tab **Sign-in method** → aktifkan **Email/Password**
4. Pastikan config di `login.html` dan `js/firebase.js` **sama persis**
