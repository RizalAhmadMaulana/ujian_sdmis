# 🛡️ Session Log: E-UJIAN PRO (SD Mentari Islamic School - Ujian SDMIS)

**Domain Produksi Aktif:** [https://ujian.sdmis.sch.id/](https://ujian.sdmis.sch.id/)  
**Root Workspace:** `ujian_sdmis/`  
**Tanggal Update:** 19 November 2026  
**Status Sistem:** Production Ready & Live  

---

## 📌 Ringkasan Update Sesi Ini (19 November 2026)

### 🎯 Fitur: Smart Matching (Upsert Engine) & Anti-Crash Impor Excel Data Siswa & Guru
Memperbarui sistem impor data siswa (`/teacher/students`) dan data guru (`/teacher/teachers`) dengan mekanisme **Smart Matching (Upsert: Update or Insert)** untuk mencegah data duplikat/dobel, mengatasi perbedaan angka nol di depan NISN/NIP, serta membungkus API dengan pengamanan *error-handling* anti-crash agar proses impor di server production berjalan mulus tanpa error 500.

---

### 1. Masalah Utama yang Teridentifikasi & Solusinya:

1. **Masalah Duplikasi & Gagal Impor di Production:**
   - **Kondisi Local vs Production:** Di local, database masih kosong sehingga proses yang berjalan hanya *Create* (`bulk_create`). Sedangkan di server production, sudah ada 14 siswa lama terdaftar, sehingga proses *Update* (`bulk_update`) terpanggil.
   - **Masalah Leading Zero pada NISN:** Di database production, NISN siswa tersimpan 10 digit (contoh: `0152093713`). Sementara pada berkas Excel export Risalah/Tahfidz_MIS, kolom NISN diformat sebagai *Number*, sehingga angka nol di depan otomatis hilang menjadi 9 digit (`152093713`). Sistem lama menganggap ini sebagai siswa baru dan berusaha membuat akun dobel yang berbenturan dengan database.
2. **Solusi: Smart Matching (Pencocokan Cerdas 3 Jalur):**
   Setiap baris data Excel kini dicocokkan ke database melalui 3 prioritas:
   - **Prioritas 1 (NISN/NIP Eksak):** Mencocokkan string NISN/NIP persis sama.
   - **Prioritas 2 (NISN/NIP Tanpa Leading Zero):** Mengabaikan angka nol di depan (misal: `152093713` $\leftrightarrow$ `0152093713`).
   - **Prioritas 3 (Nama Lengkap Case-Insensitive):** Jika format NISN berbeda tetapi Nama Lengkap sama persis (misal `"Abinaya Naufal Ashadiq"`), sistem otomatis mengenali bahwa ini adalah orang yang sama!
3. **Konsep Upsert (Update or Insert):**
   - **Jika data cocok (Siswa/Guru Lama):** Sistem **TIDAK MEMBUAT DATA BARU**, melainkan **MENGUPDATE DATA LAMA** (memperbarui kelas terkini, email, dan merapikan data). Akun login dan riwayat ujian siswa tetap aman.
   - **Jika data belum ada (Siswa/Guru Baru):** Sistem membuat akun baru dengan password default = NISN / NIP.
4. **Pencegahan Duplikasi ID di `bulk_update` & Username Collision:**
   - Menambahkan pelacak `updated_user_ids` agar instance pengguna yang sama tidak pernah masuk dua kali ke daftar `bulk_update`.
   - Menambahkan pengecekan `all_existing_usernames` agar `bulk_create` tidak memicu *IntegrityError*.
5. **Pengamanan Error Handling (Anti-Crash):**
   - Seluruh pemrosesan impor di `StudentExcelImportView` dan `TeacherExcelImportView` dibungkus blok `try...except`.
   - Jika ada anomali berkas, API tidak lagi melempar HTTP 500 bisu, melainkan mengembalikan pesan error jelas dengan status HTTP 400 ke frontend.

---

### 2. Apakah Perlu `makemigrations` dan `migrate` di Production?

> 💡 **JAWABAN: TIDAK PERLU!**  
> Perubahan ini **murni pada tingkat logika backend Python** (`views.py`). Tidak ada struktur tabel, kolom baru, atau tipe data yang diubah pada model basis data (`models.py`).  
> Anda cukup melakukan **`git pull`** di server production dan me-restart service backend (`systemctl restart ujian_backend`).

---

## 🏗️ Detail Perubahan Kode

### File yang Diperbarui:
* **`backend/apps/accounts/views.py`**
  - **`_process_student_batch`**: Mengimplementasikan algoritma Smart Matching (NISN eksak, NISN zero-stripped, Nama Lengkap case-insensitive), deduplikasi ID pada `update_students`, validasi username unik pada `new_students`, serta penanganan ForeignKey kelas.
  - **`_process_teacher_batch`**: Mengimplementasikan Smart Matching (NIP eksak, NIP zero-stripped, Nama Lengkap case-insensitive) untuk data guru.
  - **`StudentExcelImportView` & `TeacherExcelImportView`**: Membungkus eksekusi batching dengan `try...except` dan logging lengkap untuk mencegah unhandled HTTP 500 error.

---

## 📋 Riwayat Aktivitas & Perubahan File

| Tanggal | Komponen / File | Aksi | Rincian Perubahan |
|---|---|---|---|
| 2026-11-19 | `backend/apps/accounts/views.py` | Update | Implementasi Smart Matching (Upsert) untuk Data Siswa & Data Guru (pencocokan NISN/NIP zero-padding dan Nama Lengkap), proteksi duplikasi ID, serta try-catch anti-crash error handling. |
| 2026-11-19 | `session.md` | Update | Pencatatan lengkap hasil investigasi kegagalan production, arsitektur Smart Upsert, konfirmasi migrasi database, dan panduan deploy. |

---

## 🚀 Panduan Eksekusi & Deployment

> ⚠️ *Terminal dijalankan sendiri oleh Anda di PowerShell / terminal server.*

### A. Pengujian di Lokal:
1. Pastikan backend Django aktif:
   ```powershell
   cd C:\xampp\htdocs\mis_dev\ujian_sdmis\backend
   .\venv\Scripts\activate
   python manage.py runserver 0.0.0.0:8001
   ```
2. Frontend Vite:
   ```powershell
   cd C:\xampp\htdocs\mis_dev\ujian_sdmis\frontend
   npm run dev -- --host
   ```

---

### B. Commit & Push ke GitHub:
Jalankan perintah ini di komputer lokal Anda:

```powershell
cd C:\xampp\htdocs\mis_dev\ujian_sdmis
git status
git add backend/apps/accounts/views.py session.md
git commit -m "fix(import): implement smart matching upsert for student and teacher excel import"
git push origin main
```

---

### C. Menerapkan di Server Produksi (`https://ujian.sdmis.sch.id`):
Masuk ke terminal server / VPS via SSH, lalu jalankan:

```bash
# 1. Masuk ke direktori project
cd /path/ke/ujian_sdmis

# 2. Tarik kode terbaru dari GitHub
git pull origin main

# 3. TIDAK PERLU makemigrations atau migrate (karena tidak ada perubahan model)

# 4. Restart service backend Daphne / Gunicorn
sudo systemctl restart ujian_backend
# (atau jika memakai supervisor: sudo supervisorctl restart ujian_backend)
```

Setelah service di-restart di server production, silakan coba kembali tombol **Import Excel** pada **Data Siswa**. Berkas `Data_Siswa_TA_2026_2027.xlsx` kini akan langsung memetakan siswa lama tanpa membuat data dobel, dan mendaftarkan siswa baru secara instan!
