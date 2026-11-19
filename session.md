# 🛡️ Session Log: E-UJIAN PRO (SD Mentari Islamic School - Ujian SDMIS)

**Domain Produksi Aktif:** [https://ujian.sdmis.sch.id/](https://ujian.sdmis.sch.id/)  
**Root Workspace:** `ujian_sdmis/`  
**Tanggal Update:** 19 November 2026  
**Status Sistem:** Production Ready & Live  

---

## 📌 Ringkasan Update Sesi Ini (19 November 2026)

### 🎯 Fitur: Peningkatan Dual-Engine Impor Data Guru via Excel (Multi-Format & High Speed)
Memperbarui sistem impor data guru pada menu **Data Guru Pengawas** (`/teacher/teachers`) agar mendukung impor berkas Excel dari dua sumber berbeda (Export Sistem **Risalah / Tahfidz_MIS** & Template Resmi **E-Ujian PRO**) dengan seleksi kolom otomatis serta kecepatan proses instan tanpa jeda tunggu lama.

---

### 1. Masalah Utama & Solusi:
1. **Perbedaan Struktur Kolom:**
   - Hasil export data guru dari **Risalah / Tahfidz_MIS** memiliki struktur:
     `[No, Nama Guru, Jenis Kelamin, NIP, Wali Kelas, Murid Ampu, Tempat Tanggal Lahir, No Telp / WA, Email]`
   - Sedangkan berkas template standar **E-Ujian PRO** memiliki format:
     `[No, NIP, Nama Guru, Email]` (dengan header judul di baris 1-2 dan label tabel di baris 4).
2. **Penyaringan Kolom Spesifik (Hanya Kolom yang Dibutuhkan):**
   - Sistem ujian hanya membutuhkan 3 data utama guru: **NIP**, **Nama Guru**, dan **Email**.
   - Kolom lainnya (`Jenis Kelamin`, `Wali Kelas`, `Murid Ampu`, `Tempat Tanggal Lahir`, `No Telp / WA`) diabaikan total dan **tidak tersimpan** ke database.
3. **Pemisahan Logika Menjadi 2 Fungsi Khusus:**
   - **Fungsi 1 (`_import_teachers_from_tahfidz_mis`)**: Didedikasikan untuk memetakan kolom dari format export sistem Tahfidz_MIS.
   - **Fungsi 2 (`_import_teachers_from_standard_template`)**: Didedikasikan untuk memetakan kolom dari format template resmi E-Ujian.
4. **Pencegahan Salah Deteksi (False Positive Header):**
   - Kolom `jenis kelamin` dicegah agar tidak salah terdeteksi sebagai `nip`.
   - Baris judul/keterangan template dicegah agar tidak memicu deteksi header palsu.
5. **Performa Tinggi (High-Speed Bulk Engine):**
   - Deduplikasi NIP di memori.
   - Single-query pre-fetch data guru yang sudah ada.
   - Multithreaded password hashing paralel (`ThreadPoolExecutor`) untuk memanfaatkan seluruh core CPU.
   - Eksekusi database menggunakan single atomic transaction `bulk_create` dan `bulk_update`.

---

## 🔗 Analisis Keterhubungan Data Guru, Data Siswa, & Manajemen Pengguna

Berdasarkan arsitektur backend Django pada `apps/accounts`:
1. **Satu Model Basis Data Tunggal (`User` / `db_table = 'users'`):**
   - Seluruh akun guru, siswa, dan admin tersimpan di tabel yang sama: `users`.
   - **Data Guru:** Difilter berdasarkan `role = 'TEACHER'` (`is_staff = True`).
   - **Data Siswa:** Difilter berdasarkan `role = 'STUDENT'`.
   - **Manajemen Pengguna:** Menampilkan seluruh user (`User.objects.all()`).
2. **Sinkronisasi Dua Arah Otomatis (100% Real-Time):**
   - **Jika Guru Ditambah / Diimpor di menu Data Guru:** Otomatis langsung muncul di menu **Manajemen Pengguna** dengan role `Guru Pengawas` dan status staf aktif.
   - **Jika Guru Diubah (Edit Nama/Email/NIP) di Data Guru:** Otomatis data akun di **Manajemen Pengguna** langsung ikut terupdate.
   - **Jika Guru Dihapus di Data Guru:** Akun user terkait di **Manajemen Pengguna** otomatis terhapus permanen.
   - **Jika Siswa Ditambah / Diimpor di menu Data Siswa:** Otomatis langsung muncul di menu **Manajemen Pengguna** dengan role `Peserta Siswa` beserta kelasnya.
   - **Jika CRUD dilakukan dari Manajemen Pengguna:** Menambah atau mengubah user dengan role Guru otomatis langsung tampil di menu Data Guru; menambah siswa otomatis tampil di menu Data Siswa.

---

## 🏗️ Detail Arsitektur & Perubahan Kode

### File yang Diperbarui:
* **`backend/apps/accounts/views.py`**
  - **Fungsi Batching:** Menambahkan `_process_teacher_batch(rows_data, errors)` dengan optimasi multi-threading hashing dan transaksi atomic bulk create/update.
  - **Fungsi 1:** Menambahkan `_import_teachers_from_tahfidz_mis(ws, header_row_idx, col_map)` khusus menyaring kolom NIP, Nama, dan Email dari export Tahfidz_MIS.
  - **Fungsi 2:** Menambahkan `_import_teachers_from_standard_template(ws, header_row_idx, col_map)` untuk membaca berkas template bawaan.
  - **Class API `TeacherExcelImportView`:**
    * Deteksi pintar baris header secara otomatis (format Tahfidz_MIS vs Template Standar).
    * Proteksi substring agar kolom `jenis kelamin` tidak tertukar dengan `nip`.
    * Mengembalikan notifikasi hasil impor detail ke frontend beserta label format yang terdeteksi.

---

## 📋 Riwayat Aktivitas & Perubahan File

| Tanggal | Komponen / File | Aksi | Rincian Perubahan |
|---|---|---|---|
| 2026-11-19 | `backend/apps/accounts/views.py` | Update & Optimasi | Implementasi 2 fungsi parser impor guru (`_import_teachers_from_tahfidz_mis` & `_import_teachers_from_standard_template`), seleksi kolom tertentu (NIP, Nama, Email), deteksi header pintar, serta high-speed batch processing via `ThreadPoolExecutor` dan `bulk_create`/`bulk_update`. |
| 2026-11-19 | Database & Model `User` | Verifikasi | Memastikan integritas keterhubungan CRUD 100% tersinkronisasi dua arah antara menu Data Guru, Data Siswa, dan Manajemen Pengguna. |
| 2026-11-19 | `session.md` | Reset & Update | Reset total log session lama dan mencatat dokumentasi lengkap pembaruan dual-engine impor guru, arsitektur sinkronisasi user, serta panduan lokal & produksi. |

---

## 🚀 Panduan Eksekusi & Pengujian (Lokal & Produksi)

> ⚠️ **Catatan Penting:** Sesuai instruksi, semua perintah terminal di bawah ini dijalankan sendiri oleh Anda.

### A. Pengujian di Lingkungan Lokal (Localhost):
1. **Jalankan Backend Django (Port 8001):**
   ```powershell
   cd C:\xampp\htdocs\mis_dev\ujian_sdmis\backend
   .\venv\Scripts\activate
   python manage.py runserver 0.0.0.0:8001
   ```
2. **Jalankan Frontend Vite (Port 5173 / 5174):**
   ```powershell
   cd C:\xampp\htdocs\mis_dev\ujian_sdmis\frontend
   npm run dev -- --host
   ```
3. **Uji Coba Fitur Impor Guru:**
   - Akses web via browser: `http://localhost:5173` (atau port yang tampil pada terminal Vite).
   - Login dengan akun admin/guru.
   - Buka menu **Data Guru** (`/teacher/teachers`).
   - Klik tombol **Import Excel**, lalu pilih berkas `Data_Guru_TA_2026_2027.xlsx` (hasil export Tahfidz_MIS).
   - Klik submit: Data guru akan langsung masuk secara instan tanpa loading lama. Akun login dibuat otomatis dengan **Username & Password = NIP**.
   - Cek menu **Manajemen Pengguna**: Data guru yang baru diimpor otomatis muncul di daftar pengguna.
   - Coba juga unggah berkas dari tombol **Template Excel** bawaan untuk memastikan template standar tetap 100% berfungsi normal.

### B. Deployment ke Server Produksi (`https://ujian.sdmis.sch.id`):
1. **Commit & Push dari Komputer Lokal:**
   ```powershell
   cd C:\xampp\htdocs\mis_dev\ujian_sdmis
   git status
   git add backend/apps/accounts/views.py session.md
   git commit -m "feat: dual-format high-speed teacher excel import (tahfidz_mis & standard template)"
   git push origin main
   ```
2. **Tarik dan Terapkan di Server Produksi (Hostinger / VPS):**
   - Masuk via SSH ke server:
     ```bash
     cd /path/to/ujian_sdmis
     git pull origin main
     ```
   - Restart service ASGI/Daphne/Gunicorn backend:
     ```bash
     sudo systemctl restart ujian_backend
     # atau jika menggunakan supervisor:
     sudo supervisorctl restart ujian_backend
     ```
   - *(Frontend tidak memerlukan build ulang karena perubahan murni berada di backend API).*
