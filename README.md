# 🍩 DONAT • Download and Convert (donat.bangkit.io)

Aplikasi Web Downloader & Converter video/audio modern, bersih, tanpa login, dan bebas iklan. Dirancang khusus agar file langsung terunduh ke penyimpanan internal **iPhone (Safari Downloads / File Saya)** maupun PC.

---

## 📱 Fitur Utama

- **100% Langsung ke iPhone:** Memanfaatkan HTTP attachment stream murni sehingga Safari iOS langsung menampilkan dialog *"Ingin mengunduh file ini?"* dan menyimpannya di folder **Downloads (File)** iPhone.
- **Pilihan Resolusi Video:** 1080p Full HD, 720p HD, 480p SD.
- **Pilihan Bitrate MP3:** 320 kbps (Studio), 256 kbps (High), 128 kbps (Standar).
- **Multi-Platform:** Mendukung YouTube, TikTok (tanpa watermark), dan Instagram Reels/Post.
- **Tanpa Login & Bebas Iklan:** Siapapun bisa langsung pakai tanpa akun.

---

## 🚀 Cara Menjalankan di Komputer

Buka terminal PowerShell di folder ini:
```bash
npm start
```

Output:
```text
🚀 DONAT (Download and Convert) aktif!
🌐 Domain Target : donat.bangkit.io
💻 Akses Lokal   : http://localhost:3000
📱 Akses iPhone  : http://10.15.30.93:3000 (Pastikan 1 Wi-Fi)
```

---

## 📲 Cara Akses dari iPhone (Lokal Wi-Fi)

1. Pastikan iPhone dan Laptop/PC ini terhubung ke **Wi-Fi yang sama**.
2. Buka **Safari** di iPhone.
3. Ketik alamat:
   ```text
   http://10.15.30.93:3000
   ```
4. Tempel link video $\rightarrow$ Tekan **Proses Link** $\rightarrow$ Pilih **Download MP3 / Video**.
5. Safari akan memunculkan pop-up konfirmasi unduh. File langsung masuk ke app **File (Files) > Unduhan (Downloads)** di iPhone.
   * *Tips untuk Video di iPhone:* Buka file di app Files $\rightarrow$ tekan tombol **Bagikan (Share)** $\rightarrow$ pilih **Simpan Video (Save Video)** agar langsung masuk ke Galeri Foto (Camera Roll) iPhone.

---

## 🌐 Menghubungkan ke Domain `donat.bangkit.io`

### Opsi Paling Mudah & Aman: Cloudflare Tunnel (Gratis + Auto SSL HTTPS)
Jika domain `bangkit.io` dikelola di Cloudflare:
1. Pasang `cloudflared` di server/PC:
   ```bash
   cloudflared tunnel --url http://localhost:3000
   ```
2. Atau buat tunnel permanen di dashboard Cloudflare Zero Trust:
   - Hostname: `donat.bangkit.io`
   - Service: `HTTP` $\rightarrow$ `localhost:3000`
3. Selesai! Web Anda langsung bisa diakses publik dari mana saja lewat `https://donat.bangkit.io`.
