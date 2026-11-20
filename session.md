# 🛡️ Session Log: E-UJIAN PRO (SD Mentari Islamic School - Ujian SDMIS)

**Domain Produksi Aktif:** [https://ujian.sdmis.sch.id/](https://ujian.sdmis.sch.id/)  
**Root Workspace:** `ujian_sdmis/`  
**Tanggal Update:** 20 November 2026  
**Status Sistem:** Production Ready & Live  

---

## 📌 Ringkasan Update Sesi Ini (20 November 2026)

### 🎯 1. Analisis & Solusi Tuntas Jawaban Esai Siswa Tidak Tampil di Menu Koreksi Esai
Berdasarkan investigasi mendalam terhadap alur penyimpanan jawaban siswa dan serialisasi data backend ke frontend:
- **Akar Masalah Utama:**
  1. **Mismatch Struktur Data (Array vs Object Keyed):**  
     Endpoint backend `SessionEssaySubmissionsView` mengirimkan lembar jawaban siswa sebagai **Array/List** (`answers: [ { question_id: '...', student_answer: '...' } ]`), sedangkan frontend `EssayGrading.jsx` mengaksesnya sebagai properti Object berbasis UUID butir soal (`selectedStudent.answers?.[question.id]`). Dalam JavaScript, mengakses array dengan indeks string UUID (`array['uuid']`) selalu menghasilkan `undefined`. Akibatnya, `studentAns?.student_answer` bernilai kosong (`""`), memicu tampilan *"Lembar jawaban kosong. (Tidak ada jawaban diketik oleh siswa)"* padahal siswa telah mengetik jawaban dan tersimpan di database.
  2. **Field Compatibility (`points` vs `max_score`):**  
     Frontend mengharapkan `question.max_score` dan `question.order`, sedangkan backend sebelumnya hanya menyediakan `points` dan `order_number`. Akibatnya teks header menampilkan `Bobot Maks: Poin` dan input skor bertuliskan `Skor (0 - ):`.
  3. **Penyelamatan Atribut Gambar:**  
     Pengambilan `image_url` pada model `Question` yang bertipe CharField memanggil `.url` yang berisiko error jika berupa string URL mentah.
- **Solusi yang Diterapkan:**
  1. `SessionEssaySubmissionsView` kini menyediakan **DUAL FORMAT**:
     - `answers`: Dictionary/Object yang di-index langsung berdasarkan `question_id` string untuk akses instan `selectedStudent.answers[question.id]`.
     - `answers_list`: List/Array untuk iterasi fleksibel.
  2. Multi-key fallback extractor pada backend: mengambil jawaban siswa dari `str(q.id)`, `lowercase/uppercase uuid`, `q_{order_number}`, maupun format dict/objek.
  3. Menambahkan atribut kompatibilitas lengkap: `max_score`, `max_points`, `points`, `order`, `order_number`.
  4. Perbaikan pada frontend `EssayGrading.jsx` dengan multi-layer safe accessor.

---

### 🎯 2. Rombak Total Tampilan Menu Koreksi Esai (`/teacher/grading`)
Tampilan menu Koreksi Esai dirombak total sesuai kebutuhan guru pengawas asesmen:
1. **Bagian Atas (Top Cascading Filter Bar):**
   - **Dropdown 1: Filter Paket Soal** (pilih paket soal tertentu atau semua paket).
   - **Dropdown 2: Filter Kelas / Rombel** (pilih kelas tertentu atau seluruh kelas).
   - **Dropdown 3: Sesi Ujian Aktif** (otomatis tersinkronisasi dan menampilkan sesi ujian yang relevan sesuai paket dan kelas terpilih).
   - Metadata baris informasi sesi aktif (Mata pelajaran, Rombel kelas, Durasi waktu, ID Sesi).
   - Tombol Segarkan Data & 4 Kartu Statistik Ringkas: *Total Peserta*, *Butir Soal Esai*, *Perlu Dikoreksi*, dan *Selesai Dikoreksi*.
2. **Bagian Bawah (Tabel Daftar Nama Siswa):**
   - Menampilkan daftar siswa pada kelas terpilih dalam format tabel yang rapi dan elegan.
   - Kolom tabel: *No, NISN, Nama Lengkap Siswa, Kelas/Rombel, Status Ujian (Selesai/Mengerjakan), Status Koreksi (Badge Selesai/Belum Dinilai + Rasio Soal), Skor Esai Terkumpul, dan Tombol Aksi "Koreksi Jawaban"*.
   - Filter Tab cepat (*Semua Peserta*, *Perlu Dikoreksi*, *Selesai Dikoreksi*) serta Search bar pencarian nama siswa atau NISN.
3. **Lembar Koreksi Interaktif (Interactive Student Grading Sheet / Modal):**
   - Terbuka saat nama siswa atau tombol "Koreksi Jawaban" di-klik.
   - Header fokus: Nama Siswa, NISN, Kelas, Status Pengerjaan, Progres Nilai, serta Tombol Navigasi Cepat *Prev Siswa* dan *Next Siswa*.
   - Tampilan per butir soal esai:
     - Nomor Urut & Bobot Poin Maksimal.
     - Pertanyaan Soal (didukung rumus matematika KaTeX via `MathText`).
     - Gambar Soal (jika ada).
     - **Teks Jawaban Siswa** yang diformat jelas dengan tipografi nyaman dan proteksi pre-wrap.
     - Form Koreksi: Input skor nilai dengan step 0.5, tombol nilai cepat `Maks` dan `0`, input catatan umpan balik guru (opsional), dan tombol `Simpan Nilai` (terintegrasi API async instan).
   - Tombol "Kembali ke Daftar Siswa" dan "Lanjut ke Siswa Berikutnya".

---

### 🎯 3. Integrasi Rekap Nilai Siswa (`/teacher/results`) & Tampilan Semua Ragam Ujian
1. **Pelepasan Filter Pilihan Ganda pada Menu Rekap Nilai:**
   - Filter master data paket soal dan sesi ujian di `StudentResults.jsx` tidak lagi membatasi tipe ujian. Seluruh ujian (pilihan ganda, esai, campuran, maupun formulir eksternal) kini tampil lengkap pada pilihan filter.
2. **Status 'Belum Dinilai' untuk Ujian Esai:**
   - Backend `SessionStudentResultsView` kini mendeteksi apakah suatu sesi memiliki butir esai dan memeriksa apakah seluruh esai siswa telah dinilai guru (`is_essay_graded`).
   - Jika siswa telah mengirimkan ujian (`SUBMITTED`) namun butir esainya belum selesai dinilai oleh guru, kolom **Nilai Akhir** pada tabel dan rekap menampilkan status **'Belum Dinilai'** (Badge amber: `Belum Dinilai (X/Y Esai Dinilai)`).
   - Siswa yang esainya belum dinilai juga secara otomatis dikecualikan dari kalkulasi rerata/tertinggi/terendah kelas agar tidak merusak statistik kelas.
   - Setelah guru selesai mengoreksi seluruh butir esai, nilai akhir akumulasi otomatis tampil utuh di menu Rekap Nilai Siswa.
3. **Ekspor Excel Rekap Nilai:**
   - File Excel (.xlsx) yang diunduh dari menu Rekap Nilai kini juga otomatis menuliskan `"Belum Dinilai"` dengan format sel soft amber jika penilaian esai siswa belum selesai.

---

### 4. Apakah Perlu `makemigrations` dan `migrate` di Production?

> 💡 **JAWABAN: TIDAK PERLU!**  
> Seluruh perbaikan ini murni penyempurnaan logika backend Django REST framework (`views.py`, `excel_results_generator.py`) dan frontend React (`EssayGrading.jsx`, `StudentResults.jsx`, `examApi.js`). Model database `StudentAttempt` telah memiliki field `answers_json` dan `essay_scores` sejak awal sehingga struktur tabel SQL tidak berubah.

---

## 🏗️ Detail Perubahan Kode

### File yang Diperbarui:
1. **`backend/apps/exams/views.py`**
   - `SessionEssaySubmissionsView`: Menambahkan filter `classroom`, dual format representasi jawaban (`answers` dict & `answers_list`), safe string formatter gambar soal, dan atribut lengkap `points`/`max_score`.
   - `GradeEssaySubmissionView`: Mendukung identifikasi via `attempt_id` maupun `student_id`, dan otomatis menghitung ulang `attempt.total_score` pasca penilaian esai.
   - `SessionStudentResultsView`: Menambahkan deteksi kelengkapan koreksi esai (`has_essay`, `is_essay_graded`, `has_ungraded_essay`, `essay_graded_count`) serta isolasi skor belum dinilai dari statistik rata-rata.
   - `ExportSessionResultsExcelView`: Meneruskan flag `has_ungraded_essay` ke generator Excel.
2. **`backend/apps/exams/excel_results_generator.py`**
   - Menampilkan `"Belum Dinilai"` pada kolom Nilai Akhir berkas Excel jika ujian esai siswa belum tuntas dikoreksi.
3. **`frontend/src/api/examApi.js`**
   - Memperbarui `getEssaySubmissionsApi(sessionId, classroomId)` agar mendukung parameter filter kelas.
4. **`frontend/src/pages/teacher/EssayGrading.jsx`**
   - Rombak total UI: 3 dropdown filter berjenjang (Paket, Kelas, Sesi), 4 kartu statistik, tabel daftar siswa dengan status koreksi, serta modal lembar koreksi esai per siswa dengan navigasi cepat Prev/Next.
5. **`frontend/src/pages/teacher/StudentResults.jsx`**
   - Menampilkan seluruh paket & sesi tanpa filter eksklusif.
   - Menampilkan badge **'Belum Dinilai'** pada kolom Nilai Akhir jika terdapat butir esai yang belum dinilai guru.

---

## 📋 Riwayat Aktivitas & Perubahan File

| Tanggal | Komponen / File | Aksi | Rincian Perubahan |
|---|---|---|---|
| 2026-11-20 | `backend/apps/exams/views.py` | Fix & Feature | Resolusi bug jawaban esai kosong via dual format dict/list, integrasi kalkulasi total skor esai, dan flag kelengkapan koreksi esai di rekap nilai. |
| 2026-11-20 | `backend/apps/exams/excel_results_generator.py` | Feature | Penyesuaian output ekspor Excel agar menampilkan 'Belum Dinilai' untuk siswa yang esainya belum dinilai. |
| 2026-11-20 | `frontend/src/api/examApi.js` | Update | Penambahan parameter `classroomId` pada `getEssaySubmissionsApi`. |
| 2026-11-20 | `frontend/src/pages/teacher/EssayGrading.jsx` | Rombak Total UI | Rombak total menu Koreksi Esai: 3 filter berjenjang di atas, tabel list siswa di bawah, dan modal lembar koreksi interaktif dengan navigasi siswa. |
| 2026-11-20 | `frontend/src/pages/teacher/StudentResults.jsx` | Update UI | Menampilkan semua tipe ujian pada filter dan menampilkan badge 'Belum Dinilai' pada kolom Nilai Akhir siswa. |
| 2026-11-20 | `session.md` | Update | Dokumentasi lengkap sesi investigasi bug esai, rombak total UI koreksi esai, dan panduan deployment. |

---

## 🚀 Panduan Eksekusi & Deployment

### A. Push Perubahan dari Komputer Lokal:
Jalankan di PowerShell komputer Anda:

```powershell
cd C:\xampp\htdocs\mis_dev\ujian_sdmis
git status
git add backend/apps/exams/views.py backend/apps/exams/excel_results_generator.py frontend/src/api/examApi.js frontend/src/pages/teacher/EssayGrading.jsx frontend/src/pages/teacher/StudentResults.jsx session.md
git commit -m "feat(grading): overhaul essay grading UI, fix student essay answers display, and integrate ungraded status into student results"
git push origin main
```

---

### B. Menerapkan di Server Produksi (SSH / VPS):
Jalankan di terminal SSH Anda:

```bash
# 1. Masuk ke direktori project di VPS
cd ~/htdocs/ujian_sdmis

# 2. Tarik update terbaru dari repository GitHub
git pull origin main

# 3. Build frontend jika frontend di-serve via build production (opsional jika menggunakan vite build)
cd frontend
npm run build

# 4. Masuk ke backend dan restart PM2 backend ujian
cd ../backend
pm2 restart ujian-sdmis-backend
```

Setelah PM2 di-restart dan halaman di-refresh pada browser:
1. Masuk ke menu **Koreksi Esai** (`/teacher/grading`):
   - Filter paket soal, kelas, dan sesi ujian akan tampil di bagian atas.
   - Tabel list nama siswa tampil di bagian bawah lengkap dengan status ujian, status koreksi, dan tombol "Koreksi Jawaban".
   - Klik baris siswa: seluruh jawaban esai yang diketik siswa akan tampil secara jelas dan guru dapat langsung mengoreksi satu per satu.
2. Masuk ke menu **Rekap Nilai Siswa** (`/teacher/results`):
   - Seluruh sesi dan paket ujian (termasuk esai) kini dapat dipilih.
   - Jika ada ujian esai yang belum selesai dinilai, kolom Nilai Akhir menampilkan badge **'Belum Dinilai'**.
   - Setelah dinilai di menu Koreksi Esai, nilai totalnya otomatis terakumulasi dan tampil di menu Rekap Nilai Siswa!
