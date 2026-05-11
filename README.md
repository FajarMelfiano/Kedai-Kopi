# Bean & Brew - Premium Coffee Shop & Reservation System

Bean & Brew is a sophisticated web application designed for a premium coffee shop experience. It features a modern user interface, a curated menu display, and a powerful real-time table reservation system.

## 🚀 Fitur Utama

### 1. Sistem Reservasi Cerdas
- **Pengecekan Ketersediaan**: Sistem secara otomatis mengecek ketersediaan meja berdasarkan tanggal dan jam yang dipilih.
- **Durasi Tetap (5 Jam)**: Setiap pemesanan memiliki durasi otomatis selama 5 jam untuk memastikan kenyamanan pelanggan.
- **Logika Overlap**: Menghindari bentrokan jadwal dengan memblokir meja yang sudah dipesan di rentang waktu yang bersinggungan.
- **Kapasitas Meja**: Validasi jumlah tamu terhadap kapasitas maksimal meja yang tersedia.

### 2. Denah Meja Interaktif
- Visualisasi denah ruangan yang intuitif.
- Status meja real-time (Tersedia, Penuh, atau Kapasitas Tidak Mencukupi).
- UI berbasis Framer Motion untuk interaksi yang mulus dan responsif.

### 3. Panel Admin (Dashboard)
- Pemantauan semua reservasi dalam satu layar.
- Statistik ringkasan (Total, Menunggu, Dikonfirmasi, Dibatalkan).
- Kontrol status reservasi (Terima/Tolak/Hapus).
- Detail pelanggan lengkap termasuk info kontak dan pilihan meja.

### 4. Menu Digital
- Katalog menu yang dikategorikan (Kopi, Teh, Pastry).
- Desain visual yang menarik dengan gambar berkualitas.

## 🛠️ Tech Stack

- **Frontend**: React 18 (Vite)
- **Styling**: Tailwind CSS untuk desain modern dan responsif.
- **Animasi**: Framer Motion (motion/react).
- **Backend & Database**: Firebase Firestore untuk penyimpanan data real-time.
- **Autentikasi**: Firebase Auth (Google Login).
- **Icons**: Lucide React.

## 📁 Struktur Proyek

- `/src/App.tsx`: Komponen utama aplikasi termasuk logika routing dan state management.
- `/src/types.ts`: Definisi interface TypeScript untuk konsistensi data.
- `/firestore.rules`: Aturan keamanan database untuk melindungi data pelanggan.
- `/firebase-blueprint.json`: Dokumentasi skema data Firestore.

## 🛡️ Keamanan Data

Aplikasi ini menggunakan Firebase Security Rules yang ketat untuk memastikan:
1. Hanya admin yang memiliki akses penuh ke semua reservasi.
2. Pelanggan hanya dapat melihat status reservasi mereka sendiri (jika fitur login pengguna diaktifkan).
3. Validasi tipe data dan batasan ukuran pada setiap input untuk mencegah penyalahgunaan.

## 📖 Cara Penggunaan

1. **Pesan Meja**: Pilih tanggal, jam, dan jumlah tamu. Klik "Lanjut" untuk melihat denah meja.
2. **Pilih Meja**: Pilih meja yang berwarna putih (tersedia). Meja merah (penuh) atau abu-abu (kapasitas kurang) tidak dapat dipilih.
3. **Login Admin**: Akses dashboard dengan email admin (Admin ID: orioon700@gmail.com) untuk mengelola pesanan masuk.

---
*Dibuat dengan ❤️ untuk Aroma Bumi.*
