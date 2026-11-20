# 🛡️ Session Log: E-UJIAN PRO (SD Mentari Islamic School - Ujian SDMIS)

**Domain Produksi Aktif:** [https://ujian.sdmis.sch.id/](https://ujian.sdmis.sch.id/)  
**Root Workspace:** `ujian_sdmis/`  
**Tanggal Update:** 20 November 2026  
**Status Sistem:** Production Ready & Live  

---

## 📌 Ringkasan Update Sesi Ini (20 November 2026)

### 🎯 1. Penghapusan Field "Kelas Peserta" di Menu Bank Soal & Paket Ujian
- **Latar Belakang:**  
  Sebelumnya, saat guru membuat atau mengedit paket soal di menu Bank Soal & Paket Ujian (`/teacher/packages`), terdapat field input *Kelas Peserta*. Field ini tidak diperlukan lagi karena pengaturan rombel kelas peserta sudah ditentukan secara spesifik dan fleksibel saat guru menjadwalkan sesi ujian di menu *Jadwal & Sesi Ujian* (`/teacher/sessions`).
- **Perubahan yang Diterapkan:**
  - Menghapus field dropdown *Kelas Peserta* dari modal "Buat Paket Ujian Baru (Hybrid Mode)" dan modal edit pada file `frontend/src/pages/teacher/ExamPackageList.jsx`.
  - Merapikan grid informasi paket asesmen menjadi 2 kolom simetris: **Judul Paket Ujian** dan **Mata Pelajaran**.

---

### 🎯 2. Tampilan Baru Pasca Selesai Ujian Siswa (2 Kondisi Berdasarkan Tipe Soal)
- **Latar Belakang:**  
  Sebelumnya, saat siswa selesai mengerjakan ujian yang berisi soal esai atau non-pilihan ganda, modal ucapan selamat menampilkan angka nilai `0` (karena soal esai belum dinilai manual oleh guru). Hal ini membuat siswa khawatir mengira nilainya nol.
- **Perubahan yang Diterapkan pada `frontend/src/pages/student/ExamWorkspace.jsx`:**
  Sistem kini membedakan tampilan hasil pengerjaan ke dalam **2 Kondisi**:
  1. **Kondisi 1 — Ujian Pilihan Ganda Murni (100% Dinilai Otomatis):**
     - Menampilkan angka nilai asesmen secara langsung (misal `85`), poin maksimal, dan persentase capaian secara transparan.
  2. **Kondisi 2 — Ujian Selain Pilihan Ganda / Terdapat Soal Esai / Form Eksternal:**
     - **Angka nilai 0 disembunyikan sepenuhnya!**
     - Menampilkan badge status: **"Menunggu Hasil Koreksi Guru (Belum Dikoreksi)"**.
     - Menampilkan ucapan selamat yang menenangkan siswa:  
       > *"Selamat, Anda telah berhasil menyelesaikan ujian! Seluruh lembar jawaban Anda telah tersimpan dan nilai akhir akan diumumkan setelah hasil koreksi selesai dinilai oleh guru pengawas."*
     - Menampilkan informasi ringkas jumlah butir soal yang berhasil terkirim.

---

### 🎯 3. Analisis & Solusi Tuntas Jawaban Esai Siswa Tidak Tampil di Menu Koreksi Esai
- **Akar Masalah:**
  1. **Mismatch Struktur Data (Array vs Object Keyed):**  
     Endpoint backend `SessionEssaySubmissionsView` mengirimkan lembar jawaban siswa sebagai **Array/List** (`answers: [ { question_id: '...', student_answer: '...' } ]`), sedangkan frontend `EssayGrading.jsx` mengaksesnya sebagai properti Object berbasis UUID butir soal (`selectedStudent.answers?.[question.id]`). Dalam JavaScript, mengakses array dengan indeks string UUID (`array['uuid']`) selalu menghasilkan `undefined`. Akibatnya, `studentAns?.student_answer` bernilai kosong (`""`), memicu tampilan *"Lembar jawaban kosong. (Tidak ada jawaban diketik oleh siswa)"* padahal siswa telah mengetik jawaban dan tersimpan di database.
  2. **Field Compatibility (`points` vs `max_score`):**  
     Frontend mengharapkan `question.max_score` dan `question.order`, sedangkan backend sebelumnya hanya menyediakan `points` dan `order_number`.
- **Solusi yang Diterapkan:**
  1. `SessionEssaySubmissionsView` kini menyediakan **DUAL FORMAT**:
     - `answers`: Dictionary/Object yang di-index langsung berdasarkan `question_id` string untuk akses instan `selectedStudent.answers[question.id]`.
     - `answers_list`: List/Array untuk iterasi fleksibel.
  2. Multi-key fallback extractor pada backend: mengambil jawaban siswa dari `str(q.id)`, `lowercase/uppercase uuid`, `q_{order_number}`, maupun format dict/objek.
  3. Menambahkan atribut kompatibilitas lengkap: `max_score`, `max_points`, `points`, `order`, `order_number`.
  4. Perbaikan pada frontend `EssayGrading.jsx` dengan multi-layer safe accessor.

---

### 🎯 4. Rombak Total Tampilan Menu Koreksi Esai (`/teacher/grading`)
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

### 🎯 5. Integrasi Rekap Nilai Siswa (`/teacher/results`) & Tampilan Semua Ragam Ujian
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

### 🎯 6. Perbaikan Tampilan Modal Koreksi Esai (Full Screen & Enhanced Glass Backdrop Blur)
- **Latar Belakang Masalah:**  
  Sebelumnya, saat guru membuka lembar koreksi esai siswa pada menu `/teacher/grading`, overlay modal berada di dalam kontainer konten `<main>` layout guru. Hal ini menyebabkan bagian header atas layout (`MIS RISALAH • Zero-Tolerance Lockdown Aktif ...`) tidak tertutup backdrop (muncul celah putih di atas), dan efek blur latar belakang terasa kurang (`backdrop-blur-xs`).
- **Solusi yang Diterapkan pada `frontend/src/pages/teacher/EssayGrading.jsx`:**
  1. **React Portal (`createPortal` ke `document.body`):**  
     Modal lembar koreksi kini di-render langsung ke `document.body` di luar hierarki DOM layout, sehingga posisi `fixed inset-0 z-[9999]` benar-benar membungkus **100% layar (true full screen)** tanpa celah header maupun sidebar.
  2. **Enhanced Glass Backdrop Blur:**  
     Memperbarui styling overlay menjadi `bg-black/80 backdrop-blur-md` dengan animasi `animate-fade-in`, menghasilkan efek frosted-glass yang sangat elegan, fokus, dan merata di seluruh layar.
  3. **Body Scroll Lock:**  
     Menambahkan `useEffect` otomatis untuk mengunci scroll halaman browser (`overflow: hidden`) saat modal aktif, dan mengembalikannya saat modal ditutup.

---

### 🎯 7. Rombak Tampilan Depan / Halaman Login & Identitas Resmi SD Mentari Islamic School
- **Latar Belakang Permintaan Client:**  
  Client meminta agar tampilan depan sistem asesmen / ujian dipercantik dan dibenahi dengan identitas resmi lembaga:
  - **Nama Sekolah:** `SD MENTARI ISLAMIC SCHOOL`
  - **NPSN:** `70047473`
  - **Alamat:** `Lembu RT 02/ RW 01, Jimus, Polanharjo, Klaten`
  - **Aset Logo:** Memasang logo resmi perisai sekolah `frontend/src/assets/logo sd mis.png`
  - **Foto Gedung:** Memasang foto gedung sekolah `frontend/src/assets/loc-mis.jpeg`
  - **Tagline & Visi Resmi:**  
    > *"Sistem evaluasi SD Mentari Islamic School"*  
    > *"Kami bangga menjadi pelopor dalam menggabungkan teknologi modern dengan nilai-nilai Islam yang kokoh. 'Digital Mind, Islamic Heart'."*
- **Perubahan yang Diterapkan:**
  1. **`frontend/src/pages/auth/LoginPage.jsx` (Redesain Total Halaman Depan):**
     - Desain modern bernuansa **biru tua sedikit kehitaman (`#070B14`, `#090D16`)** dengan glassmorphism mewah dan glowing accent.
     - **Layout Split Responsif (Desktop/Tablet):**
       - Sisi Kiri: Menampilkan foto gedung sekolah (`loc-mis.jpeg`) dengan overlay gradien biru-hitam artistik, logo resmi sekolah (`logo sd mis.png`), badge `NPSN: 70047473`, kartu kutipan visi sekolah, highlight tagline signature `'Digital Mind, Islamic Heart'`, dan alamat Klaten.
       - Sisi Kanan: Kartu form login bersih, aman, dan responsif untuk memasukkan NISN/NIP dan Kata Sandi.
     - **Tampilan Mobile:** Didesain compact, touch-friendly, logo proporsional, dan form langsung siap input tanpa scrolling berlebih.
  2. **`frontend/src/pages/student/StudentLobby.jsx`:**
     - Header beranda siswa menampilkan logo resmi `logo sd mis.png`, nama `SD Mentari Islamic School`, `NPSN: 70047473`, dan banner kutipan `'Digital Mind, Islamic Heart'`.
  3. **`frontend/src/pages/student/GatekeeperPin.jsx`:**
     - Menampilkan logo resmi `logo sd mis.png`, nama `SD MENTARI ISLAMIC SCHOOL`, dan tagline `'Digital Mind, Islamic Heart'`.
  4. **`frontend/src/layouts/TeacherLayout.jsx`:**
     - Sidebar brand dan mobile header menampilkan logo resmi `logo sd mis.png` dan nama `SD MENTARI ISLAMIC SCHOOL`.
  5. **`frontend/src/pages/teacher/SchoolSettings.jsx` & `frontend/src/store/useExamStore.js`:**
     - Master identitas default sekolah disinkronkan ke `SD MENTARI ISLAMIC SCHOOL`, NPSN `70047473`, dan alamat `Lembu RT 02/ RW 01, Jimus, Polanharjo, Klaten`.

---

### 8. Apakah Perlu `makemigrations` dan `migrate` di Production?

> 💡 **JAWABAN: TIDAK PERLU!**  
> Seluruh perbaikan ini murni pada frontend React dan endpoint serializer/views Django REST framework. Struktur database tidak mengalami perubahan.

---

## 🏗️ Detail Perubahan Kode

### File yang Diperbarui:
1. **`frontend/src/pages/teacher/ExamPackageList.jsx`**
   - Menghapus field input *Kelas Peserta* dari modal buat dan edit paket soal.
2. **`frontend/src/pages/student/ExamWorkspace.jsx`**
   - Memperbarui modal hasil ujian siswa: Jika ujian bertipe esai / selain pilihan ganda, menampilkan status **Belum Dikoreksi (Menunggu Pemeriksaan Guru)** tanpa memunculkan angka nilai 0. Jika pilihan ganda murni, menampilkan nilai langsung.
3. **`backend/apps/exams/views.py`**
   - `SessionEssaySubmissionsView`: Menambahkan filter `classroom`, dual format representasi jawaban (`answers` dict & `answers_list`), safe string formatter gambar soal, dan atribut lengkap `points`/`max_score`.
   - `GradeEssaySubmissionView`: Mendukung identifikasi via `attempt_id` maupun `student_id`, dan otomatis menghitung ulang `attempt.total_score` pasca penilaian esai.
   - `SessionStudentResultsView`: Menambahkan deteksi kelengkapan koreksi esai (`has_essay`, `is_essay_graded`, `has_ungraded_essay`, `essay_graded_count`) serta isolasi skor belum dinilai dari statistik rata-rata.
   - `ExportSessionResultsExcelView`: Meneruskan flag `has_ungraded_essay` ke generator Excel.
4. **`backend/apps/exams/excel_results_generator.py`**
   - Menampilkan `"Belum Dinilai"` pada kolom Nilai Akhir berkas Excel jika ujian esai siswa belum tuntas dikoreksi.
5. **`frontend/src/api/examApi.js`**
   - Memperbarui `getEssaySubmissionsApi(sessionId, classroomId)` agar mendukung parameter filter kelas.
6. **`frontend/src/pages/teacher/EssayGrading.jsx`**
   - Rombak total UI: 3 dropdown filter berjenjang (Paket, Kelas, Sesi), 4 kartu statistik, tabel daftar siswa dengan status koreksi, serta modal lembar koreksi esai per siswa dengan navigasi cepat Prev/Next.
7. **`frontend/src/pages/teacher/StudentResults.jsx`**
   - Menampilkan seluruh paket & sesi tanpa filter eksklusif.
   - Menampilkan badge **'Belum Dinilai'** pada kolom Nilai Akhir jika terdapat butir esai yang belum dinilai guru.

---

---

### 🎯 7. Rebranding Total Style Frontend (Green Screen Palette & Taste-Skill Frontend)
- **Latar Belakang & Arahan Klien:**  
  Klien menginginkan perubahan total nuansa desain dari sebelumnya biru tua kehitam-hitaman menjadi palet warna **Green Screen** bernuansa hijau ke kuning-kuningan (karya Vasil Enev) yang melambangkan kesegaran, modernitas, dan identitas keislaman SD Mentari Islamic School:
  - `#F4FFFC` : Mint cream (background bersih, cerah, fresh canvas)
  - `#91EAAF` : Soft mint spring green (border lembut, badge soft, ring focus)
  - `#C3E956` : Vivid lime-yellow / chartreuse (aksen utama, badge status sukses, highlight)
  - `#4D7111` : Deep lime olive / moss green (teks dengan keterbacaan tinggi di atas badge lime)
  - `#1F4B2C` : Deep forest green / dark emerald pine (primary brand, tombol utama, teks judul)
  - `#102919` / `#0E2416` / `#143820` : Deep forest dark tones (sidebar guru, dark hero banners, modal header)
  - `#E1F8ED` : Tint mint lembut (avatar box, container icon, highlight row)
- **Penerapan Rules Design-Taste-Frontend (Anti AI-Slop):**
  - **Typography & Kontras:** Teks selalu berkontras tinggi (tidak pernah memakai teks lime tipis di atas putih). Aksen lime `#C3E956` digunakan dengan teks gelap `#0A1D11` atau di atas surface gelap `#102919`/`#1F4B2C`.
  - **Aset Asli Sekolah:** Menggunakan logo resmi `logo sd mis.png` dan foto gedung `loc-mis.jpeg` dengan identitas resmi (NPSN 70047473, Polanharjo, Klaten) serta tagline signature `'Digital Mind, Islamic Heart'`.
  - **Konsistensi Komponen Seluruh Halaman Guru:**
    1. **`tailwind.config.js`:** Ditambahkan custom palette `brand` dan `primary` berbasis Green Screen.
    2. **`LoginPage.jsx`:** Split-screen responsif dengan foto gedung, logo sekolah, identitas Klaten, dan form login dengan tombol lime `#C3E956`.
    3. **`TeacherLayout.jsx`:** Sidebar dan mobile header bertema deep forest dark (`#0E2416` & border `#1F4B2C]/80`), active link pill dengan warna `#1F4B2C` dan teks `#C3E956`, serta kanvas utama `bg-[#F4FFFC]`.
    4. **`DashboardTeacher.jsx`:** Hero banner `from-[#102919] via-[#143820] to-[#1F4B2C]` dengan tombol aksi lime, 4 stat cards bernuansa mint-lime-forest, dan feed pelanggaran yang serasi.
    5. **`ClassroomManagement.jsx`:** Header tabel `bg-[#F4FFFC] text-[#1F4B2C]`, tombol tambah kelas `#1F4B2C text-[#C3E956]`, modal kelas & modal list siswa bertema forest green.
    6. **`StudentManagement.jsx`:** Search bar, filter kelas, tombol import/template excel, avatar siswa `#E1F8ED text-[#1F4B2C]`, badge NISN & kelas, paginasi aktif `#1F4B2C text-[#C3E956]`.
    7. **`TeacherManagement.jsx`:** Tombol tambah guru, tabel guru, modal form NIP & mapel, avatar inisial, dan aksi edit/hapus bernuansa hijau-lime.
    8. **`UserManagement.jsx`:** Filter peran, tombol tambah/import/template, badge role (`TEACHER` emerald-mint, `STUDENT` lime-olive), modal reset sandi & import.
    9. **`ExamPackageList.jsx`:** Kartu paket soal top-accent `#1F4B2C`, badge AKM vs Google Form, kotak info soal, tombol aksi preview/edit/delete.
    10. **`ExamSessionSetup.jsx`:** Tombol buka sesi ujian baru `#1F4B2C text-[#C3E956]`, banner Zero-Tolerance lockdown, duo token tiles (Token Masuk Siswa & PIN Pengawas).
    11. **`LiveProctoring.jsx`:** Tombol buka kunci seluruh siswa `#1F4B2C text-[#C3E956]`, siaran pengumuman, tab filter status fokus/terkunci, duo token tiles rotasi 10 menit.
    12. **`EssayGrading.jsx`:** Top cascading filter bar (Paket, Kelas, Sesi), 4 stat cards, tabel list siswa dengan score pill `#102919 text-[#C3E956]`, tombol koreksi, dan modal lembar koreksi (React Portal full screen) berlatar `#102919` gradient.
    13. **`StudentResults.jsx`:** 4 KPI cards (Total, Selesai, Rata-Rata, Rentang Nilai), tombol download Excel `#1F4B2C text-[#C3E956]`, tabel nilai dengan badge status pengerjaan, modal analisis lembar jawaban per butir soal, dan modal buka remidi.
    14. **`ViolationHistory.jsx`:** Header dengan tombol "Lihat di E-Jurnal" `#1F4B2C text-[#C3E956]`, 4 metrik pelanggaran, tabel catatan sensor Zero-Tolerance, modal konfirmasi hapus satuan & massal.
    15. **`EJournalReport.jsx`:** Tombol ekspor rekap Excel & unduh berita acara PDF `#1F4B2C text-[#C3E956]`, lembar dokumen berita acara formal A4 dengan kop surat MIS, tabel presensi & skor, log sensor, dan form catatan pengawas.
    16. **`SchoolSettings.jsx`:** Form identitas sekolah lengkap dengan live preview kop surat dan pengesahan kepala sekolah/pengawas bergradasi deep forest.
    17. **`ProfileSettings.jsx`:** Form biodata diri guru, badge keamanan akun, form ubah kata sandi dengan toggle intip sandi, dan tombol simpan `#1F4B2C text-[#C3E956]`.

---

---

### 🎯 7. Total Redesign & Overhaul Portal Guru (Green Screen Palette & Executive Anti-Slop UI)
Sesuai arahan dan evaluasi menyeluruh dari client, seluruh tampilan portal guru dirombak total agar tampil baru, profesional, informatif, dan responsif dengan tema **Green Screen Palette (Vasil Enev: `#F4FFFC`, `#91EAAF`, `#C3E956`, `#4D7111`, `#1F4B2C`, `#102919`)**:

1. **Perbaikan Tuntas Modal Fullscreen Blur di Rekap Nilai (`/teacher/results`):**
   - **Akar Masalah:** Modal rincian lembar jawaban siswa sebelumnya dirender di dalam hierarki kontainer `<main>` layout guru, sehingga overlay backdrop blur tidak menutupi top header dan sidebar.
   - **Solusi:** 
     - Menggunakan `createPortal(..., document.body)` untuk me-mount modal rincian lembar jawaban dan modal remidi langsung di root body.
     - Posisi `fixed inset-0 z-[9999] bg-[#0A1D11]/85 backdrop-blur-md` menjamin 100% layar (seluruh header dan sidebar) ter-blur sempurna dan elegan tanpa celah.
     - Mengunci body scroll (`document.body.style.overflow = 'hidden'`) secara otomatis saat modal aktif.
     - Merombak desain modal dengan header forest gradient, skor KPI besar (`#102919` pill text `#C3E956`), tab filter (Semua, Benar, Salah, Esai), dan kartu butir soal berformat KaTeX dengan evaluasi rubrik.

2. **Total Redesign Sidebar Navigasi (`TeacherLayout.jsx`):**
   - Latar belakang sidebar menggunakan gradasi deep forest `bg-gradient-to-b from-[#102919] via-[#0E2416] to-[#0A1D11]` dengan border emerald halus.
   - Header sekolah terintegrasi dengan logo `logo sd mis.png`, "SD MENTARI ISLAMIC SCHOOL", NPSN: 70047473, serta pill tagline *"Digital Mind, Islamic Heart"*.
   - Navigasi dikelompokkan secara terstruktur (*Utama*, *Asesmen & Nilai*, *Master Data & Sekolah*).
   - **Signature Active Link Pill:** Menggunakan warna hijau ke kuning-kuningan chartreuse `#C3E956` dengan teks gelap `#0A1D11` tebal (font-bold) dan bayangan lembut, sehingga menu yang sedang aktif langsung terlihat sangat kontras dan mencolok.
   - Kartu profil pengawas di bagian bawah dengan avatar, NIP, tombol akses profil, dan logout.

3. **Penguatan Kartu Siswa Live Proctoring (`LiveProctoring.jsx`):**
   - Menghilangkan tampilan washed-out / abu-abu pucat.
   - Setiap kartu siswa kini dilengkapi **Top Status Banner** melintang:
     - *Layar Terkunci:* `bg-rose-600 text-white font-bold animate-pulse`
     - *Selesai Terkirim:* `bg-gradient-to-r from-[#102919] to-[#1F4B2C] text-[#C3E956] font-bold`
     - *Sedang Fokus:* `bg-gradient-to-r from-[#143820] to-[#102919] text-[#91EAAF] font-bold`
   - Frame kartu menggunakan `border-2` solid dengan hover shadow yang taktil.
   - Kotak metrik sensor berlatar `#F4FFFC` dengan orientasi layar, jam mulai/selesai, sensor latensi dengan pulsing dot hijau live, badge pelanggaran beranimasi, dan skor nilai berlatar gelap `#102919 text-[#C3E956]`.
   - Tombol aksi buka kunci taktil langsung di footer kartu.

4. **Rombak Total Halaman Dashboard Guru (`DashboardTeacher.jsx`):**
   - Dibangun ulang dari nol sebagai **Executive School Command Center**:
     - **School Identity Hero Banner:** Menampilkan logo sekolah resmi, nama "SD MENTARI ISLAMIC SCHOOL", NPSN: 70047473, alamat Lembu Polanharjo Klaten, dan kutipan visi resmi client: *"Kami bangga menjadi pelopor dalam menggabungkan teknologi modern dengan nilai-nilai Islam yang kokoh. 'Digital Mind, Islamic Heart'."*
     - **4 Executive KPI Cards:** Total Bank Soal, Sesi Ujian Aktif, Siswa Sedang Fokus, dan Status Integritas (0 Pelanggaran).
     - **Matriks Sesi Ujian Aktif (2 Kolom Kiri):** Kartu sesi dengan countdown rotasi token 10 menit live, token masuk (copy click), PIN pengawas, dan tombol akses cepat proctoring & rekap nilai.
     - **Audit Pelanggaran Real-Time (1 Kolom Kanan):** Feed live riwayat sensor siswa dengan tombol satu-klik buka kunci layar.
     - **Matriks Layanan Cepat (6 Modul Utama):** Bank Soal, Jadwal Sesi, Live Proctoring, Koreksi Esai, Rekap Nilai, dan E-Jurnal.

5. **Tampilan Profesional & Berwarna Profil Guru (`ProfileSettings.jsx`):**
   - Banner profil eksekutif dengan gradasi dark forest, avatar besar beraksen `#C3E956`, badge verified pengawas, dan NIP.
   - Tiga kartu terstruktur: *Informasi Data Diri & Kontak*, *Keamanan & Ganti Sandi* (dengan eye toggle show/hide), dan *Kepatuhan Asesmen*.
   - Tombol simpan perubahan profil lebar beraksen lime `#C3E956` dengan teks gelap `#0A1D11` font-bold.

---

### 🎯 8. Total Redesign & Overhaul Portal Siswa / Role Student (Green Screen Palette & Executive Anti-Slop UI)
Sesuai arahan client dan taste-skill (`design-taste-frontend`), seluruh tampilan frontend pada **Role Siswa (Student Portal)** dirombak total dari tema lama (biru tua kehitam-hitaman gelap gulita) menjadi tema baru yang profesional, bersih, elegan, dan beridentitas tinggi dengan **Green Screen Palette (Vasil Enev: `#F4FFFC`, `#91EAAF`, `#C3E956`, `#4D7111`, `#1F4B2C`, `#102919`)**:

1. **Beranda Utama Siswa (`StudentLobby.jsx` - `/student/lobby`):**
   - **Kanvas Bersih Mint Cream (`#F4FFFC`):** Menghilangkan dominasi layar hitam pekat yang membuat siswa cepat lelah.
   - **Header Eksekutif Dark Forest (`#102919` ke `#1F4B2C`):** Menampilkan logo resmi perisai sekolah `logo sd mis.png`, "SD MENTARI ISLAMIC SCHOOL", NPSN: 70047473, Polanharjo Klaten, jam digital WIB live, dan info chip akun siswa (Nama, Kelas, NISN) serta tombol akses profil dan logout.
   - **Hero Greeting & Tagline:** Salam hangat personal siswa, judul *"Pusat Aktivitas Asesmen Digital Siswa"*, serta highlight pill tagline resmi *'Digital Mind, Islamic Heart'*.
   - **3 Kartu Aksi Taktil (Tactile Action Cards):**
     - *E-UJIAN (Kartu Utama):* Highlight border-2 `#91EAAF`, lencana *Menu Utama* lime `#C3E956`, deskripsi asesmen terkunci, dan tombol *Buka Ruang Ujian* dengan animasi panah.
     - *JADWAL UJIAN:* Kartu daftar sesi asesmen kelas, membuka modal jadwal aktif terstruktur.
     - *TATA TERTIB UJIAN:* Kartu protokol integritas anti-curang dengan badge *Wajib Dibaca*.
   - **Modal Responsif Green Screen:** Modal *Tata Tertib*, Modal *Jadwal Asesmen*, dan Modal *Pilih Orientasi Layar (Portrait/Landscape)* didesain ulang dengan kartu putih tebal, border `#91EAAF`, dan tombol aksi chartreuse `#C3E956`.

2. **Portal Pilihan Mata Pelajaran (`SubjectPortal.jsx` - `/student/subjects`):**
   - Latar belakang `#F4FFFC` dengan header dark forest dan tombol kembali taktil.
   - Kotak informasi instruksi siswa dengan panduan jelas sebelum memulai ujian.
   - **Kartu Mata Pelajaran Taktil (Tactile Subject Cards):**
     - Setiap kartu ujian menampilkan badge mapel, nama paket ujian, kode sesi, durasi waktu (menit), dan tanggal pelaksanaan.
     - Status pintar: *Selesai Dikerjakan* (badge hijau mint), *Sesi Belum Dimulai* (badge abu-abu), atau *Sesi Terbuka* (badge pulsing emerald).
     - Tombol *Mulai Ujian* menggunakan warna signature chartreuse `#C3E956` dengan font tebal hitam `#0A1D11` yang sangat kontras dan nyaman diklik.

3. **Gerbang Masuk PIN Pengawas (`GatekeeperPin.jsx` - `/student/gatekeeper`):**
   - Form otentikasi terpusat di tengah layar dengan kanvas `#F4FFFC`.
   - Menampilkan logo perisai sekolah, badge NPSN: 70047473, dan strip verifikasi identitas siswa (`#E1F8ED`).
   - Kartu ringkasan mata pelajaran & informasi sesi ujian aktif yang akan ditempuh.
   - Input PIN Token Masuk berukuran besar dengan font mono di tengah dan focus ring `#91EAAF`.
   - Tombol utama *Masuk ke Ruang Ujian* beraksen `#C3E956` dengan teks gelap `#0A1D11` font-black.

4. **Pengaturan Profil & Keamanan Siswa (`StudentProfileSettings.jsx` - `/student/profile`):**
   - Banner profil siswa dengan gradasi dark forest, avatar inisial besar beraksen `#C3E956`, dan badge status *Siswa Terverifikasi*.
   - Tiga kartu manajemen data:
     - *Biodata Peserta Didik:* NISN, Username, Nama Lengkap, dan Kelas/Rombel.
     - *Keamanan & Kata Sandi:* Input sandi baru dan konfirmasi sandi dilengkapi tombol intip (eye toggle show/hide).
     - *Integritas Asesmen Digital:* Ringkasan komitmen kepatuhan sensor anti-curang sekolah.
   - Tombol simpan perubahan profil lebar chartreuse `#C3E956` dengan teks gelap `#0A1D11` font-bold.

5. **Lembar Kerja Ujian Siswa (`ExamWorkspace.jsx` - `/student/exam-workspace`):**
   - **Header Bar Navigasi:** Berlatar gradasi dark forest `#102919` ke `#1F4B2C`, logo resmi sekolah, badge *LIVE REC*, jam countdown sisa waktu beraksen chartreuse `#C3E956`, serta tombol aksi *Batal Ujian* dan *Selesai Ujian*.
   - **Lembar Soal (Panel Kiri):**
     - Pill nomor soal besar berlatar `#102919` dengan teks `#C3E956`.
     - Bobot poin soal, tombol ragu-ragu (Doubt) taktil, dan badge tipe soal (Pilihan Ganda, Esai, dsb).
     - Pertanyaan soal dengan tipografi tajam dan nyaman dibaca, didukung rumus matematika KaTeX via `MathText` dan preview gambar soal terbingkai rapi.
     - Komponen pilihan jawaban (PG, PG Kompleks, Isian Singkat, Benar/Salah Matrix, Menjodohkan, dan Esai Textarea) berdesain taktil dengan border `#91EAAF` dan focus state yang jelas.
     - Navigasi bawah: Tombol *← Soal Sebelumnya*, *Soal Berikutnya →*, dan tombol *Selesai & Kirim Ujian* `#C3E956`.
   - **Kisi Navigasi Nomor Soal (Panel Kanan):**
     - Grid kotak nomor soal responsif dengan indikator warna Green Screen yang jelas:
       - *Sedang Dibuka:* `#102919` dengan ring `#C3E956` font-black skala membesar.
       - *Sudah Terjawab:* `#1F4B2C` dengan teks `#C3E956` font-bold.
       - *Ragu-ragu:* `bg-amber-400` teks amber tua font-bold.
       - *Belum Terjawab:* `#F4FFFC` border `#91EAAF`/60 hover `#1F4B2C`.
     - Legenda keterangan warna yang bersih dan rapi.
   - **Tiga Modal Interaktif Terstandarisasi:**
     - *Modal Batal & Keluar Ujian:* Overlay `#0A1D11`/85 backdrop-blur-md, peringatan konsekuensi pembatalan yang jelas.
     - *Modal Konfirmasi Selesai Ujian:* Ringkasan pengerjaan (Sudah Terjawab, Ragu-ragu, Belum Diisi) dengan deteksi cerdas jika masih ada soal terlewat.
     - *Modal Kartu Skor Hasil Ujian (Post-Exam):* 
       - **Kondisi 1 (Esai / Memerlukan Koreksi Guru):** Nilai `0` disembunyikan sepenuhnya! Menampilkan badge *"Menunggu Hasil Koreksi Guru (Belum Dikoreksi)"* dan ucapan selamat bahwa lembar jawaban tersimpan aman.
       - **Kondisi 2 (Pilihan Ganda Murni):** Menampilkan perolehan skor nilai font-mono besar hijau pine `#1F4B2C`, total poin maksimal, dan badge persentase capaian `#C3E956`.

---

## 📋 Riwayat Aktivitas & Perubahan File

| Tanggal | Komponen / File | Aksi | Rincian Perubahan |
|---|---|---|---|
| 2026-11-20 | `frontend/tailwind.config.js` | Config | Menambahkan konfigurasi extended colors `brand` dan palette `primary` sesuai Green Screen (Vasil Enev: `#F4FFFC`, `#91EAAF`, `#C3E956`, `#4D7111`, `#1F4B2C`, `#102919`). |
| 2026-11-20 | `frontend/src/pages/auth/LoginPage.jsx` | Rebranding UI | Redesain total halaman login depan responsif split-screen dengan foto gedung `loc-mis.jpeg`, logo `logo sd mis.png`, NPSN 70047473, alamat Klaten, tagline 'Digital Mind, Islamic Heart', dan tombol login lime `#C3E956`. |
| 2026-11-20 | `frontend/src/layouts/TeacherLayout.jsx` | Overhaul UI | Total redesign sidebar Green Screen: background gradasi dark forest, signature active link pill chartreuse `#C3E956` text `#0A1D11` font-bold, header identitas SD Mentari Islamic School + tagline pill, dan footer kartu profil guru. |
| 2026-11-20 | `frontend/src/pages/teacher/DashboardTeacher.jsx` | Overhaul UI | Rombak total dashboard menjadi Executive School Command Center: hero banner identitas resmi SD Mentari Islamic School (NPSN 70047473, Polanharjo Klaten, quote visi), 4 KPI cards, sesi aktif rotasi token 10 menit, audit pelanggaran live feed, dan 6 modul cepat. |
| 2026-11-20 | `frontend/src/pages/teacher/LiveProctoring.jsx` | Overhaul & Bugfix | Penguatan kartu siswa real-time: border-2 solid, top status banner melintang (Terkunci: rose animate-pulse, Selesai: forest/lime, Fokus: emerald), kotak sensor berlatar `#F4FFFC`, live pulsing dot latensi, badge pelanggaran beranimasi, dan tombol aksi taktil. Membersihkan sisa tag button duplikat di baris 848 yang memicu error vite-babel. |
| 2026-11-20 | `frontend/src/pages/teacher/StudentResults.jsx` | Bugfix & UI | Perbaikan tuntas modal fullscreen blur bug menggunakan `createPortal(..., document.body)` dengan `z-[9999] bg-[#0A1D11]/85 backdrop-blur-md` & body scroll lock. Menghilangkan celah putih header/sidebar. Rombak tampilan modal rincian lembar jawaban siswa dan remidi. |
| 2026-11-20 | `frontend/src/pages/teacher/ProfileSettings.jsx` | Overhaul UI | Desain ulang profil guru yang lebih profesional & berwarna: hero profile banner dengan avatar besar beraksen `#C3E956`, badge verified pengawas, 3 kartu terstruktur (Data Diri, Keamanan Sandi, Kepatuhan Asesmen), dan tombol simpan beraksen lime `#C3E956`. |
| 2026-11-20 | `frontend/src/pages/student/StudentLobby.jsx` | Overhaul UI | Rombak total beranda siswa dengan tema Green Screen `#F4FFFC`: header dark forest terintegrasi logo sekolah `logo sd mis.png` & NPSN 70047473, personal greeting siswa, 3 tactile action cards (E-Ujian, Jadwal, Tata Tertib), dan modal orientasi layar (Portrait/Landscape) taktil. |
| 2026-11-20 | `frontend/src/pages/student/SubjectPortal.jsx` | Overhaul UI | Rombak total portal mapel siswa: kanvas `#F4FFFC`, header dark forest, tactile subject cards dengan border `#91EAAF`, badge mapel & status sesi cerdas, serta tombol *Mulai Ujian* chartreuse `#C3E956`. |
| 2026-11-20 | `frontend/src/pages/student/GatekeeperPin.jsx` | Overhaul UI | Rombak total gerbang PIN: tampilan form terpusat berlatar `#F4FFFC`, header perisai sekolah, strip identitas siswa `#E1F8ED`, kartu info mapel, input PIN besar font-mono, dan tombol submit `#C3E956`. |
| 2026-11-20 | `frontend/src/pages/student/StudentProfileSettings.jsx` | Overhaul UI | Desain baru profil siswa: hero banner dark forest, avatar beraksen lime `#C3E956`, 3 kartu manajemen (Biodata, Ganti Sandi + toggle intip, Integritas Asesmen), dan tombol simpan `#C3E956`. |
| 2026-11-20 | `frontend/src/pages/student/ExamWorkspace.jsx` | Overhaul UI | Rombak total lembar kerja ujian siswa: kanvas `#F4FFFC`, header bar dark forest `#102919` dengan timer `#C3E956`, panel kiri lembar soal dengan 6 tipe soal taktil & KaTeX support, panel kanan kisi navigasi nomor 5 kolom berstatus Green Screen, modal batal, modal selesai, dan modal skor hasil ujian (menjaga 2 kondisi: sembunyikan nilai 0 untuk esai & tampilkan nilai langsung untuk PG murni). |
| 2026-11-20 | `session.md` | Update | Dokumentasi lengkap seluruh pembaruan rebranding Green Screen untuk role guru & role siswa serta panduan deployment. |

---

## 🚀 Panduan Eksekusi & Deployment

### A. Push Perubahan dari Komputer Lokal:
Jalankan di terminal PowerShell komputer Anda:

```powershell
cd C:\xampp\htdocs\mis_dev\ujian_sdmis
git status
git add frontend/tailwind.config.js frontend/src/pages/auth/LoginPage.jsx frontend/src/layouts/TeacherLayout.jsx frontend/src/pages/teacher/DashboardTeacher.jsx frontend/src/pages/teacher/ClassroomManagement.jsx frontend/src/pages/teacher/StudentManagement.jsx frontend/src/pages/teacher/TeacherManagement.jsx frontend/src/pages/teacher/UserManagement.jsx frontend/src/pages/teacher/ExamPackageList.jsx frontend/src/pages/teacher/ExamSessionSetup.jsx frontend/src/pages/teacher/LiveProctoring.jsx frontend/src/pages/teacher/EssayGrading.jsx frontend/src/pages/teacher/StudentResults.jsx frontend/src/pages/teacher/ViolationHistory.jsx frontend/src/pages/teacher/EJournalReport.jsx frontend/src/pages/teacher/SchoolSettings.jsx frontend/src/pages/teacher/ProfileSettings.jsx frontend/src/pages/student/StudentLobby.jsx frontend/src/pages/student/SubjectPortal.jsx frontend/src/pages/student/GatekeeperPin.jsx frontend/src/pages/student/StudentProfileSettings.jsx frontend/src/pages/student/ExamWorkspace.jsx session.md
git commit -m "feat(rebranding): complete overhaul with Green Screen palette for login, teacher, and student portals"
git push origin main
```

---

### B. Menerapkan di Server Produksi (SSH / VPS):
Jalankan di terminal SSH VPS Anda:

```bash
# 1. Masuk ke direktori project di VPS
cd ~/htdocs/ujian_sdmis

# 2. Tarik update terbaru dari repository GitHub
git pull origin main

# 3. Build ulang bundle frontend Vite
cd frontend
npm run build

# 4. Masuk ke backend dan restart PM2 backend ujian (jika diperlukan)
cd ../backend
pm2 restart ujian-sdmis-backend
```
