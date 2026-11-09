# Panduan Instalasi SIAKAD SMK

Aplikasi ini terdiri dari **dua bagian terpisah**:

| Bagian | Tempat | Berkas |
|---|---|---|
| **Backend** (database & logika) | Google Apps Script | `Kode.gs` dan `appsscript.json` |
| **Frontend** (tampilan) | GitHub Pages | isi ZIP: `index.html`, `css/`, `js/` |

Kerjakan **urut**: Bagian A (backend) → Bagian B (hubungkan) → Bagian C (GitHub Pages).

---

## BAGIAN A — Pasang Backend di Google Apps Script

1. Buka <https://script.google.com> dengan akun Google sekolah, klik **Proyek baru**.
2. Beri nama proyek: `SIAKAD SMK API`.
3. Hapus isi `Code.gs` bawaan, lalu **tempel seluruh isi `Kode.gs`**.
4. Aktifkan manifest: ikon roda gigi **Setelan Proyek** → centang **Tampilkan file manifes "appsscript.json" di editor**. Kembali ke Editor, buka `appsscript.json`, ganti isinya dengan isi berkas `appsscript.json`. Simpan (Ctrl+S).
5. Di dropdown fungsi (atas), pilih **`setupAppEnvironment`** → klik **Jalankan**. Izinkan akses saat diminta (Lanjutkan → Lanjutan → *Buka SIAKAD SMK API (tidak aman)* → Izinkan; ini normal untuk skrip milik sendiri).
6. Buka **Log eksekusi** (bawah layar). Catat **username `admin` dan password awalnya**. Password ini hanya tampil sekali. Jika terlewat, jalankan `resetAdminPassword`.
7. *(Opsional, untuk mencoba)* jalankan **`seedDemoData`** untuk mengisi data contoh. Hapus data contoh sebelum dipakai sungguhan.
8. Jalankan **`installTriggers`** sekali: ini menjaga server tetap "hangat" (loading cepat) dan membuat backup harian jam 02.00.
9. **Deploy:** klik **Terapkan → Deployment baru** → jenis **Aplikasi web**:
   - *Jalankan sebagai*: **Saya**
   - *Yang memiliki akses*: **Siapa saja**
   
   Klik **Terapkan**, lalu **salin URL Aplikasi Web** (berakhiran `/exec`).
10. Uji: tempel URL itu di tab baru. Harus muncul teks JSON berisi `"success":true`.

> Setiap kali Anda mengubah `Kode.gs`, buat **Deployment versi baru** (Terapkan → Kelola deployment → ikon pensil → Versi baru → Terapkan). URL tetap sama.

---

## BAGIAN B — Hubungkan Frontend ke Backend

1. Unduh ZIP frontend, ekstrak ke folder bernama **`siakad-smk-frontend`**.
2. Buka `js/config.js` dengan Notepad, ganti:
   ```js
   GAS_URL: 'PASTE_URL_EXEC_DISINI',
   ```
   menjadi URL `/exec` dari langkah A-9. Simpan.

---

## BAGIAN C — Deploy ke GitHub Pages (lewat terminal)

> **Folder kerja Anda adalah folder `siakad-smk-frontend`, yaitu folder yang langsung berisi `index.html`.** Semua perintah di bawah dijalankan DI DALAM folder itu. Jika `index.html` tidak terlihat saat Anda membuka folder, Anda salah masuk folder, dan situs akan 404.

### C1. Persiapan satu kali
1. Pasang Git: <https://git-scm.com/downloads>. Cek: `git --version`.
2. Buat akun di <https://github.com>.
3. Buat repository: **New repository** → nama `siakad-smk` → **Public** → *jangan* centang README/.gitignore → **Create repository**.
4. Buat **Personal Access Token**: GitHub → Settings → Developer settings → Personal access tokens → **Tokens (classic)** → Generate new token → centang **`repo`** → Generate. **Salin token** (hanya tampil sekali). Token ini dipakai sebagai *password* saat push.

### C2. Push pertama
Buka terminal (Windows: PowerShell; Mac: Terminal), lalu:
```bash
cd path/ke/siakad-smk-frontend      # folder yang berisi index.html
git init
git config user.name  "Nama Anda"
git config user.email "email@anda.com"
git add .
git commit -m "SIAKAD SMK versi 1"
git branch -M main
git remote add origin https://github.com/USERNAME/siakad-smk.git
git push -u origin main
```
Ganti `USERNAME` dengan username GitHub Anda. Saat diminta *Username* isi username GitHub, saat diminta *Password* **tempel token** (layar tidak menampilkan apa-apa, itu normal).

### C3. Aktifkan Pages
Repository → **Settings → Pages** → *Source*: **Deploy from a branch** → Branch **`main`**, folder **`/ (root)`** → **Save**. Tunggu 1–2 menit. Alamat situs:
```
https://USERNAME.github.io/siakad-smk/
```

### C4. Update di kemudian hari
Setelah mengubah berkas (mis. `config.js`), di folder yang sama:
```bash
git add .
git commit -m "Update"
git push
```
Tunggu ±1 menit lalu muat ulang dengan Ctrl+Shift+R.

---

## Langkah Pertama Setelah Online
1. Buka situs, login `admin` + password awal → **wajib ganti password**.
2. **Pengaturan**: isi nama sekolah, kepala sekolah, KKM, jam pelajaran.
3. **Data Master**: tahun ajaran aktif → Kelas → Mapel → Guru → Siswa (bisa **Impor CSV**, unduh templat di dalamnya) → Penugasan → Jadwal.
4. **Pengguna → Buat akun semua guru / siswa**. Unduh CSV kredensial dan bagikan. Semua wajib ganti password saat login pertama.
5. **Kalender akademik**: tambahkan agenda; otomatis tampil di dashboard.

## Masalah Umum
| Gejala | Penyebab & solusi |
|---|---|
| Situs 404 | `index.html` tidak di root repo. Ulangi C2 dari folder yang benar; pastikan Pages memakai `main` + `/ (root)`. |
| "Konfigurasi belum lengkap" | `js/config.js` belum diisi URL `/exec` yang benar. |
| "Gagal terhubung ke server" | Deployment bukan *Siapa saja*, atau belum Deployment versi baru setelah ubah kode. |
| `Authentication failed` saat push | Pakai **token** sebagai password, bukan password GitHub. |
| Login pertama lambat (±3 detik) | Server dingin; trigger `keepWarm` (A-8) menguranginya. |
| Lupa password admin | Jalankan `resetAdminPassword` di editor Apps Script, lihat Log eksekusi. |
