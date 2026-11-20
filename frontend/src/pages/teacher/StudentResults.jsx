import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import { 
  Award, 
  Search, 
  Filter, 
  BookOpen, 
  School, 
  Calendar, 
  Users, 
  CheckCircle, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  FileSpreadsheet, 
  RefreshCw, 
  Eye, 
  ChevronRight, 
  X, 
  Sparkles, 
  HelpCircle, 
  FileText, 
  Check, 
  AlertCircle, 
  TrendingUp, 
  Clock, 
  ShieldAlert, 
  ShieldCheck, 
  ExternalLink,
  ChevronDown,
  RotateCcw
} from 'lucide-react';
import { 
  getSessionsApi, 
  getPackagesApi, 
  getSessionStudentResultsApi, 
  getStudentAttemptBreakdownApi,
  downloadSessionResultsExcelApi,
  openStudentRemedialApi
} from '../../api/examApi';
import { getClassroomsApi } from '../../api/authApi';
import MathText from '../../components/common/MathText';
import { resolveImageUrl, handleImageErrorFallback } from '../../utils/imageUrlFormatter';

export default function StudentResults() {
  const [searchParams] = useSearchParams();

  // Master Filter Data
  const [sessions, setSessions] = useState([]);
  const [packages, setPackages] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [isLoadingFilters, setIsLoadingFilters] = useState(true);

  // Active Filter Selection
  const [selectedPackageId, setSelectedPackageId] = useState('ALL');
  const [selectedClassId, setSelectedClassId] = useState('ALL');
  const [selectedSessionId, setSelectedSessionId] = useState(searchParams.get('session') || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusTab, setStatusTab] = useState('SUBMITTED'); // SUBMITTED | IN_PROGRESS | ALL

  // Session Results Data
  const [sessionResults, setSessionResults] = useState(null);
  const [isLoadingResults, setIsLoadingResults] = useState(false);
  const [resultsError, setResultsError] = useState('');
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  // Student Attempt Breakdown Modal State
  const [selectedAttempt, setSelectedAttempt] = useState(null);
  const [breakdownData, setBreakdownData] = useState(null);
  const [isLoadingBreakdown, setIsLoadingBreakdown] = useState(false);
  const [breakdownFilter, setBreakdownFilter] = useState('ALL'); // ALL | CORRECT | INCORRECT | ESSAY

  // Student Remedial Modal State
  const [remedialStudent, setRemedialStudent] = useState(null);
  const [isOpeningRemedial, setIsOpeningRemedial] = useState(false);
  const [remedialFeedback, setRemedialFeedback] = useState(null);

  // Kunci scroll halaman saat modal rincian lembar jawaban atau remidi terbuka
  useEffect(() => {
    if (selectedAttempt || remedialStudent) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [selectedAttempt, remedialStudent]);

  // 1. Inisialisasi Filter Data (Paket, Kelas, dan Sesi)
  useEffect(() => {
    const fetchFilterData = async () => {
      setIsLoadingFilters(true);
      try {
        const [sessRes, pkgRes, clsRes] = await Promise.allSettled([
          getSessionsApi(),
          getPackagesApi(),
          getClassroomsApi()
        ]);

        const sessList = sessRes.status === 'fulfilled' && Array.isArray(sessRes.value) ? sessRes.value : [];
        const pkgList = pkgRes.status === 'fulfilled' && Array.isArray(pkgRes.value) ? pkgRes.value : [];
        const clsList = clsRes.status === 'fulfilled' && Array.isArray(clsRes.value) ? clsRes.value : [];

        // Tampilkan seluruh paket ujian dan sesi (pilihan ganda, esai, campuran, dll) tanpa dibatasi
        setSessions(sessList);
        setPackages(pkgList);
        setClassrooms(clsList);

        // Jika belum ada session terpilih dari URL, pilih sesi pertama yang tersedia
        if (!selectedSessionId && sessList.length > 0) {
          setSelectedSessionId(sessList[0].id);
        }
      } catch (err) {
        console.error('Gagal mengambil master data filter:', err);
      } finally {
        setIsLoadingFilters(false);
      }
    };

    fetchFilterData();
  }, []);

  // 2. Filter Sesi Ujian Berdasarkan Paket Soal & Kelas Terpilih
  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      // Filter Paket Soal
      if (selectedPackageId !== 'ALL') {
        const sPkgId = s.package?.id || s.package_id || s.packageId;
        if (sPkgId && String(sPkgId) !== String(selectedPackageId)) return false;
      }

      // Filter Kelas
      if (selectedClassId !== 'ALL') {
        if (s.is_all_classrooms || s.allow_all_classes || s.allowAllClasses) return true; // Sesi untuk semua kelas tetap lolos
        const multiClassIds = Array.isArray(s.classrooms) ? s.classrooms.map((c) => String(c?.id || c || '')) : [];
        const singleClassId = s.classroom?.id ? String(s.classroom.id) : (s.classroom_id ? String(s.classroom_id) : null);
        const matchClass = multiClassIds.includes(String(selectedClassId)) || singleClassId === String(selectedClassId);
        if (!matchClass) return false;
      }

      return true;
    });
  }, [sessions, selectedPackageId, selectedClassId]);

  // Sinkronisasi Sesi Terpilih jika di luar filter
  useEffect(() => {
    if (filteredSessions.length > 0) {
      if (!filteredSessions.some((s) => String(s.id) === String(selectedSessionId))) {
        setSelectedSessionId(filteredSessions[0].id);
      }
    } else {
      setSelectedSessionId('');
    }
  }, [filteredSessions, selectedSessionId]);

  // Helper selectedClassObj
  const selectedClassObj = useMemo(() => {
    if (selectedClassId === 'ALL') return null;
    return classrooms.find((c) => String(c.id) === String(selectedClassId));
  }, [classrooms, selectedClassId]);

  // 3. Fetch Rekapitulasi Nilai Siswa untuk Sesi & Kelas Terpilih
  const fetchSessionResults = useCallback(async (sessionId, classId = selectedClassId) => {
    if (!sessionId) {
      setSessionResults(null);
      return;
    }

    setIsLoadingResults(true);
    setResultsError('');
    try {
      const clsParam = (classId && classId !== 'ALL') ? classId : null;
      const data = await getSessionStudentResultsApi(sessionId, clsParam);
      setSessionResults(data);
    } catch (err) {
      console.error('Gagal mengambil rekapitulasi nilai sesi:', err);
      setResultsError(err.response?.data?.error || 'Gagal memuat rekapitulasi nilai siswa.');
      setSessionResults(null);
    } finally {
      setIsLoadingResults(false);
    }
  }, [selectedClassId]);

  useEffect(() => {
    if (selectedSessionId) {
      fetchSessionResults(selectedSessionId, selectedClassId);
    }
  }, [selectedSessionId, selectedClassId, fetchSessionResults]);

  // 4. Fetch Rincian Lembar Jawaban Siswa (Breakdown Modal)
  const handleOpenBreakdownModal = async (student) => {
    if (!student.attempt_id) return;
    setSelectedAttempt(student);
    setIsLoadingBreakdown(true);
    setBreakdownFilter('ALL');
    try {
      const data = await getStudentAttemptBreakdownApi(student.attempt_id);
      setBreakdownData(data);
    } catch (err) {
      console.error('Gagal memuat rincian lembar jawaban:', err);
      setBreakdownData(null);
    } finally {
      setIsLoadingBreakdown(false);
    }
  };

  const handleCloseBreakdownModal = () => {
    setSelectedAttempt(null);
    setBreakdownData(null);
  };

  // 4b. Handler Buka Akses Remidi Siswa
  const handleOpenRemedialModal = (student) => {
    setRemedialStudent(student);
  };

  const handleCloseRemedialModal = () => {
    setRemedialStudent(null);
  };

  const handleConfirmOpenRemedial = async () => {
    if (!remedialStudent || !selectedSessionId) return;
    setIsOpeningRemedial(true);
    try {
      const res = await openStudentRemedialApi(selectedSessionId, remedialStudent.student_id, 'open');
      setRemedialFeedback({
        type: 'success',
        message: res.message || `Akses remidi untuk ${remedialStudent.student_name} berhasil dibuka.`
      });
      handleCloseRemedialModal();
      await fetchSessionResults(selectedSessionId, selectedClassId);
    } catch (err) {
      console.error('Gagal membuka akses remidi:', err);
      alert(err.response?.data?.error || 'Gagal membuka akses remidi siswa. Silakan coba lagi.');
    } finally {
      setIsOpeningRemedial(false);
    }
  };

  // 5. Isolasi Data Siswa Berdasarkan Kelas Terpilih
  const classStudents = useMemo(() => {
    if (!sessionResults?.students) return [];
    if (selectedClassId === 'ALL') return sessionResults.students;

    const targetName = selectedClassObj?.name?.trim().toLowerCase();
    const targetNameClean = targetName ? targetName.replace(/\s+/g, '') : '';
    const targetIdStr = String(selectedClassId);

    return sessionResults.students.filter((st) => {
      if (st.classroom_id && String(st.classroom_id) === targetIdStr) return true;
      if (targetName && st.classroom_name) {
        const cName = st.classroom_name.trim().toLowerCase();
        if (cName === targetName || cName.replace(/\s+/g, '') === targetNameClean) return true;
      }
      return false;
    });
  }, [sessionResults, selectedClassId, selectedClassObj]);

  // 6. Hitung Statistik Nilai Khusus Kelas Terpilih
  const classStats = useMemo(() => {
    const total = classStudents.length;
    const isStudentSubmitted = (s) => (
      s.status === 'SUBMITTED' ||
      s.is_remedial_allowed ||
      Boolean(s.finished_at)
    );
    const submitted = classStudents.filter(isStudentSubmitted);
    const submittedCount = submitted.length;
    const inProgressCount = classStudents.filter((s) => !isStudentSubmitted(s) && s.status !== 'NOT_STARTED').length;

    let average = '-';
    let highest = 0;
    let lowest = 0;

    if (submittedCount > 0) {
      // Siswa yang belum dinilai esainya dikecualikan dari kalkulasi rerata/tertinggi/terendah
      const gradedStudents = submitted.filter((s) => !s.has_ungraded_essay);
      if (gradedStudents.length > 0) {
        const scores = gradedStudents.map((s) => Number(s.final_score !== undefined ? s.final_score : (s.total_score !== null && s.total_score !== undefined ? s.total_score : s.previous_score)) || 0);
        const sum = scores.reduce((a, b) => a + b, 0);
        average = Math.round((sum / gradedStudents.length) * 10) / 10;
        highest = Math.max(...scores);
        lowest = Math.min(...scores);
      }
    }

    return {
      total,
      submittedCount,
      inProgressCount,
      average,
      highest,
      lowest,
    };
  }, [classStudents]);

  // 7. Filter Akhir Data Siswa (Tab Status + Search Query)
  const filteredStudents = useMemo(() => {
    if (!classStudents) return [];

    return classStudents.filter((st) => {
      const isStudentSubmitted = (
        st.status === 'SUBMITTED' ||
        st.is_remedial_allowed ||
        Boolean(st.finished_at)
      );

      // Filter Status Tab (Siswa dengan hak remidi terbuka atau sudah selesai tampil di tab Selesai)
      if (statusTab === 'SUBMITTED' && !isStudentSubmitted) return false;
      if (statusTab === 'IN_PROGRESS' && (isStudentSubmitted || st.status === 'NOT_STARTED')) return false;

      // Filter Pencarian Teks
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = st.student_name?.toLowerCase().includes(q);
        const matchNisn = st.nisn?.toLowerCase().includes(q);
        const matchClass = st.classroom_name?.toLowerCase().includes(q);
        if (!matchName && !matchNisn && !matchClass) return false;
      }

      return true;
    });
  }, [classStudents, statusTab, searchQuery]);

  // Helper Durasi Pengerjaan
  const formatDuration = (started, finished) => {
    if (!started || !finished) return '-';
    try {
      const start = new Date(started).getTime();
      const end = new Date(finished).getTime();
      const diffMinutes = Math.round((end - start) / 60000);
      if (diffMinutes < 1) return '< 1 Menit';
      return `${diffMinutes} Menit`;
    } catch {
      return '-';
    }
  };

  // Current session object for quick info
  const currentSessionObj = useMemo(() => {
    return sessions.find((s) => String(s.id) === String(selectedSessionId)) || null;
  }, [sessions, selectedSessionId]);

  // Handler Download Rekapitulasi Nilai & Analisis Butir Soal ke Excel (.xlsx) Sesuai Filter
  const handleDownloadExcel = async () => {
    if (!selectedSessionId) {
      alert('Silakan pilih sesi ujian terlebih dahulu.');
      return;
    }
    setIsExportingExcel(true);
    try {
      const currentPkgTitle = currentSessionObj?.title || 'Rekap_Ujian';
      const classNameForFile = selectedClassObj?.name || (selectedClassId !== 'ALL' ? selectedClassId : (currentSessionObj?.classroom_display || currentSessionObj?.classroom_name || 'Semua_Kelas'));
      const statusSuffix = statusTab !== 'ALL' ? `_${statusTab}` : '';
      const cleanFilename = `Rekap_Nilai_${currentPkgTitle}_${classNameForFile}${statusSuffix}.xlsx`.replace(/[^\w.-]/g, '_');
      
      const classroomParam = selectedClassId !== 'ALL' ? (selectedClassObj?.name || selectedClassId) : null;
      const statusParam = statusTab !== 'ALL' ? statusTab : null;

      await downloadSessionResultsExcelApi(selectedSessionId, cleanFilename, classroomParam, statusParam);
    } catch (err) {
      console.error('Gagal mengunduh file excel rekapitulasi nilai:', err);
      alert('Gagal mengunduh rekap Excel: ' + (err.response?.data?.error || err.message || 'Terjadi kesalahan'));
    } finally {
      setIsExportingExcel(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* ======================================================== */}
      {/* 1. HEADER HALAMAN & INTEGRASI QUICK ACTIONS               */}
      {/* ======================================================== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#EFF9CE] p-6 rounded-3xl border-2 border-[#8BC829] shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#E2F4B4] border-2 border-[#8BC829] flex items-center justify-center text-[#102919] shadow-xs shrink-0">
            <Award className="w-6 h-6 text-[#102919]" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-[#102919] tracking-tight">
              Rekap Nilai Siswa
            </h1>
            <p className="text-xs sm:text-sm text-[#102919]/80 mt-0.5 leading-relaxed font-medium">
              Hasil penilaian otomatis, analisis lembar jawaban per butir soal, dan integrasi dengan Berita Acara E-Jurnal.
            </p>
          </div>
        </div>

        {/* Tombol Segarkan Data */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fetchSessionResults(selectedSessionId)}
            disabled={isLoadingResults || !selectedSessionId}
            className="p-3 bg-[#E2F4B4] hover:bg-[#C3E956] text-[#102919] border-2 border-[#8BC829] rounded-xl text-xs font-black transition disabled:opacity-50 shadow-xs active:scale-[0.98] cursor-pointer"
            title="Segarkan Rekap Nilai"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingResults ? 'animate-spin text-[#102919]' : 'text-[#102919]'}`} />
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. FILTER MULTI-LEVEL (PAKET SOAL, KELAS, & SESI UJIAN)  */}
      {/* ======================================================== */}
      <div className="bg-[#EFF9CE] rounded-3xl p-6 border-2 border-[#8BC829] shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b-2 border-[#8BC829]/40 pb-3">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#102919]">
            <Filter className="w-4 h-4 text-[#102919]" />
            <span>Pilih Paket Soal, Rombel Kelas, & Sesi Ujian</span>
          </div>
          <span className="text-[11px] text-[#102919]/70 font-mono font-bold">
            {filteredSessions.length} sesi tersedia
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 1. Filter Paket Soal */}
          <div>
            <label className="block text-xs font-black text-[#102919] mb-1.5">
              1. Filter Paket Soal:
            </label>
            <select
              value={selectedPackageId}
              onChange={(e) => setSelectedPackageId(e.target.value)}
              className="w-full text-xs bg-[#F9FDEE] border-2 border-[#8BC829] rounded-xl p-2.5 text-[#102919] font-bold focus:ring-2 focus:ring-[#C3E956] focus:border-[#102919] outline-none transition cursor-pointer"
            >
              <option value="ALL">-- Seluruh Paket Soal Mandiri ({packages.length}) --</option>
              {packages.map((pkg) => (
                <option key={pkg.id} value={pkg.id}>
                  {pkg.subject_name || pkg.subjectName} — {pkg.title}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Filter Kelas / Rombel */}
          <div>
            <label className="block text-xs font-black text-[#102919] mb-1.5">
              2. Filter Kelas / Rombel:
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full text-xs bg-[#F9FDEE] border-2 border-[#8BC829] rounded-xl p-2.5 text-[#102919] font-bold focus:ring-2 focus:ring-[#C3E956] focus:border-[#102919] outline-none transition font-medium cursor-pointer"
            >
              <option value="ALL">-- Seluruh Kelas ({classrooms.length}) --</option>
              {classrooms.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Pilih Sesi Ujian Terbuka */}
          <div>
            <label className="block text-xs font-black text-[#102919] mb-1.5">
              3. Sesi Ujian Aktif:
            </label>
            <select
              value={selectedSessionId}
              onChange={(e) => setSelectedSessionId(e.target.value)}
              disabled={filteredSessions.length === 0}
              className="w-full text-xs bg-[#F9FDEE] border-2 border-[#8BC829] rounded-xl p-2.5 text-[#102919] font-bold focus:ring-2 focus:ring-[#C3E956] focus:border-[#102919] outline-none transition cursor-pointer disabled:opacity-50"
            >
              {filteredSessions.length === 0 ? (
                <option value="">Tidak ada sesi yang cocok</option>
              ) : (
                filteredSessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title} ({s.classroom_display || s.classroom_name || 'Semua Kelas'})
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        {/* Ringkasan Info Sesi Terpilih */}
        {currentSessionObj && (
          <div className="bg-[#E2F4B4] border-2 border-[#8BC829] rounded-2xl p-3.5 text-xs flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-3 text-[#102919]">
              <span className="font-black text-[#102919]">{currentSessionObj.title}</span>
              <span className="text-[#8BC829] font-black">•</span>
              <span>Mapel: <strong className="text-[#102919] font-black">{currentSessionObj.subject_name || currentSessionObj.subjectName || '-'}</strong></span>
              <span className="text-[#8BC829] font-black">•</span>
              <span>Kelas: <strong className="text-[#102919] font-black">{currentSessionObj.classroom_display || currentSessionObj.classroom_name || 'Semua Kelas'}</strong></span>
              <span className="text-[#8BC829] font-black">•</span>
              <span>Durasi: <strong className="text-[#102919] font-black">{currentSessionObj.duration_minutes || currentSessionObj.durationMinutes} Menit</strong></span>
            </div>
            <div className="text-[11px] font-mono text-[#102919]/70 font-bold">
              ID Sesi: {currentSessionObj.id?.slice(0, 8)}...
            </div>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* 3. 4 KPI STATISTIK KARTU NILAI KELAS                    */}
      {/* ======================================================== */}
      {sessionResults && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Card 1: Total Peserta */}
          <div className="bg-[#EFF9CE] rounded-2xl p-5 border-2 border-[#8BC829] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-[#102919]/70 uppercase tracking-wider">Total Peserta</span>
              <div className="w-9 h-9 rounded-xl bg-[#E2F4B4] border-2 border-[#8BC829] flex items-center justify-center text-[#102919]">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black font-mono text-[#102919]">
                {classStats.total}
              </span>
              <span className="text-xs text-[#102919]/70 font-bold">Siswa</span>
            </div>
            <div className="text-[11px] text-[#102919]/60 font-medium mt-1">
              {selectedClassObj ? `Terdaftar di kelas ${selectedClassObj.name}` : 'Terdaftar dalam sesi ini'}
            </div>
          </div>

          {/* Card 2: Sudah Selesai / Terkirim */}
          <div className="bg-[#EFF9CE] rounded-2xl p-5 border-2 border-[#8BC829] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-[#102919]/70 uppercase tracking-wider">Selesai / Terkirim</span>
              <div className="w-9 h-9 rounded-xl bg-[#C3E956] border-2 border-[#4D7111]/30 flex items-center justify-center text-[#0A1D11]">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black font-mono text-[#102919]">
                {classStats.submittedCount}
              </span>
              <span className="text-xs text-[#102919]/70 font-bold">
                {classStats.total > 0
                  ? `(${Math.round((classStats.submittedCount / classStats.total) * 100)}%)`
                  : ''}
              </span>
            </div>
            <div className="text-[11px] text-[#102919]/60 font-medium mt-1">Lembar jawaban terarsip</div>
          </div>

          {/* Card 3: Rata-Rata Nilai */}
          <div className="bg-[#EFF9CE] rounded-2xl p-5 border-2 border-[#8BC829] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-[#102919]/70 uppercase tracking-wider">Rata-Rata Kelas</span>
              <div className="w-9 h-9 rounded-xl bg-[#E2F4B4] border-2 border-[#8BC829] flex items-center justify-center text-[#102919]">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black font-mono text-[#102919]">
                {classStats.average}
              </span>
              <span className="text-xs text-[#102919]/70 font-bold">/ 100</span>
            </div>
            <div className="text-[11px] text-[#102919]/60 font-medium mt-1">Skor rerata {selectedClassObj?.name || 'kelas'}</div>
          </div>

          {/* Card 4: Tertinggi & Terendah */}
          <div className="bg-[#EFF9CE] rounded-2xl p-5 border-2 border-[#8BC829] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-[#102919]/70 uppercase tracking-wider">Tertinggi / Terendah</span>
              <div className="w-9 h-9 rounded-xl bg-[#E2F4B4] border-2 border-[#8BC829] flex items-center justify-center text-[#102919]">
                <Award className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2 font-mono">
              <span className="text-xl sm:text-2xl font-black text-[#102919]">
                {classStats.highest}
              </span>
              <span className="text-[#8BC829] font-black">/</span>
              <span className="text-xl sm:text-2xl font-black text-rose-600">
                {classStats.lowest}
              </span>
            </div>
            <div className="text-[11px] text-[#102919]/60 font-medium mt-1">Rentang nilai siswa</div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. TABEL REKAPITULASI NILAI & ACTION LIHAT LEMBAR JAWABAN */}
      {/* ======================================================== */}
      <div className="bg-[#EFF9CE] rounded-3xl border-2 border-[#8BC829] shadow-sm overflow-hidden">
        {/* Toolbar Pencarian & Filter Tab */}
        <div className="p-4 sm:p-5 border-b-2 border-[#8BC829]/40 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-[#E2F4B4]">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 bg-[#EFF9CE] p-1.5 rounded-2xl border-2 border-[#8BC829] overflow-x-auto">
            <button
              type="button"
              onClick={() => setStatusTab('SUBMITTED')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition whitespace-nowrap cursor-pointer ${
                statusTab === 'SUBMITTED'
                  ? 'bg-[#102919] text-[#C3E956] shadow-sm'
                  : 'text-[#102919] hover:bg-[#E2F4B4]'
              }`}
            >
              Selesai ({classStats.submittedCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusTab('IN_PROGRESS')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition whitespace-nowrap cursor-pointer ${
                statusTab === 'IN_PROGRESS'
                  ? 'bg-[#102919] text-[#C3E956] shadow-sm'
                  : 'text-[#102919] hover:bg-[#E2F4B4]'
              }`}
            >
              Sedang Mengerjakan ({classStats.inProgressCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusTab('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition whitespace-nowrap cursor-pointer ${
                statusTab === 'ALL'
                  ? 'bg-[#102919] text-[#C3E956] shadow-sm'
                  : 'text-[#102919] hover:bg-[#E2F4B4]'
              }`}
            >
              Semua Peserta ({classStats.total})
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Search Box */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-[#102919]/60 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Cari nama siswa atau NISN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs font-bold pl-8 pr-3 py-2 bg-[#F9FDEE] border-2 border-[#8BC829] rounded-xl text-[#102919] placeholder-[#102919]/50 focus:outline-none focus:ring-2 focus:ring-[#C3E956] focus:border-[#102919] transition"
              />
            </div>

            {/* Tombol Unduh Rekap Excel di Atas Tabel */}
            <button
              type="button"
              onClick={handleDownloadExcel}
              disabled={isExportingExcel || !selectedSessionId}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#C3E956] hover:bg-[#b8e337] disabled:bg-zinc-300 text-[#0A1D11] text-xs font-black transition shadow-sm active:scale-[0.98] shrink-0 cursor-pointer disabled:cursor-not-allowed border-2 border-[#4D7111]/30"
              title="Unduh seluruh rekapitulasi nilai dan rincian jawaban siswa ke format Excel (.xlsx)"
            >
              <FileSpreadsheet className={`w-3.5 h-3.5 text-[#0A1D11] ${isExportingExcel ? 'animate-bounce' : ''}`} />
              <span className="hidden sm:inline">{isExportingExcel ? 'Menyiapkan...' : 'Download Excel'}</span>
              <span className="sm:hidden">Excel</span>
            </button>
          </div>
        </div>

        {/* Remedial Feedback Banner */}
        {remedialFeedback && (
          <div className="mx-4 mt-3 p-3 rounded-2xl bg-[#E2F4B4] border-2 border-[#8BC829] text-[#102919] text-xs flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#102919] shrink-0" />
              <span className="font-bold">{remedialFeedback.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setRemedialFeedback(null)}
              className="p-1 hover:bg-[#EFF9CE] rounded-lg text-[#102919] transition font-bold"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Tabel Data Siswa */}
        <div className="overflow-x-auto">
          {isLoadingResults ? (
            <div className="py-16 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-[#102919] animate-spin mx-auto" />
              <div className="text-xs text-[#102919] font-bold">Memuat rekap nilai siswa...</div>
            </div>
          ) : resultsError ? (
            <div className="py-14 text-center space-y-3 px-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 border-2 border-amber-300 text-amber-800 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="text-sm font-black text-[#102919]">
                  {resultsError.includes('500') || resultsError.includes('Gagal memuat')
                    ? 'Belum Ada Aktivitas Pengerjaan Sesi Ini'
                    : resultsError}
                </div>
                <p className="text-xs text-[#102919]/70 max-w-md mx-auto leading-relaxed font-medium">
                  Belum ada siswa yang mulai atau mengirimkan lembar jawaban pada sesi ujian ini. Nilai dan analisis butir soal akan otomatis terdata secara real-time saat siswa mulai mengerjakan.
                </p>
              </div>
              <button
                type="button"
                onClick={() => fetchSessionResults(selectedSessionId)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#E2F4B4] border-2 border-[#8BC829] text-[#102919] hover:bg-[#C3E956] text-xs font-black shadow-xs transition cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[#102919]" />
                <span>Segarkan Data</span>
              </button>
            </div>
          ) : !selectedSessionId ? (
            <div className="py-16 text-center space-y-2 text-[#102919]/70">
              <Filter className="w-8 h-8 mx-auto text-[#8BC829]" />
              <div className="text-xs font-bold">Silakan pilih sesi ujian pada filter di atas untuk melihat nilai.</div>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="py-14 text-center space-y-3 px-4">
              <div className="w-12 h-12 rounded-2xl bg-[#E2F4B4] border-2 border-[#8BC829] text-[#102919] flex items-center justify-center mx-auto">
                <Users className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="text-sm font-black text-[#102919]">Belum Ada Siswa yang Terdata</div>
                <p className="text-xs text-[#102919]/70 max-w-sm mx-auto font-medium">
                  {searchQuery 
                    ? `Tidak ditemukan siswa dengan kata kunci "${searchQuery}". Coba kata kunci lain.`
                    : statusTab === 'SUBMITTED'
                      ? `Belum ada siswa ${selectedClassObj ? `kelas ${selectedClassObj.name}` : ''} yang berstatus Selesai pada sesi ini.`
                      : `Belum ada siswa ${selectedClassObj ? `kelas ${selectedClassObj.name}` : ''} yang terdaftar atau mengerjakan sesi ini.`}
                </p>
              </div>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-[#E2F4B4] border-b-2 border-[#8BC829] text-[#102919] font-black uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-3 text-center w-12">No</th>
                  <th className="py-3 px-3">NISN</th>
                  <th className="py-3 px-4">Nama Siswa</th>
                  <th className="py-3 px-3">Kelas</th>
                  <th className="py-3 px-3 text-center">Waktu Selesai</th>
                  <th className="py-3 px-3">Durasi</th>
                  <th className="py-3 px-3 text-center">Jawaban Benar</th>
                  <th className="py-3 px-3 text-center">Sensor Anti-Cheat</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Nilai Akhir</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-[#8BC829]/30">
                {filteredStudents.map((st, idx) => (
                  <tr key={st.student_id || idx} className="bg-[#EFF9CE] hover:bg-[#E2F4B4] transition">
                    <td className="py-3.5 px-3 text-center font-mono font-bold text-[#102919]/70">
                      {idx + 1}
                    </td>
                    <td className="py-3.5 px-3 font-mono font-bold text-[#102919]">
                      {st.nisn || '-'}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-[#E2F4B4] border-2 border-[#8BC829] text-[#102919] flex items-center justify-center font-black text-[11px] shrink-0">
                          {st.student_name ? st.student_name.charAt(0).toUpperCase() : 'S'}
                        </div>
                        <div className="font-black text-[#102919]">
                          {st.student_name}
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 text-[#102919] font-bold">
                      {st.classroom_name || '-'}
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      {st.finished_at ? (
                        <div className="flex flex-col items-center leading-tight">
                          <span className="font-mono text-[#102919] text-[11px] font-black whitespace-nowrap">
                            {st.finished_date && st.finished_date !== '-' 
                              ? st.finished_date 
                              : new Date(st.finished_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                          <span className="font-mono text-[#102919]/70 text-[10px] font-bold whitespace-nowrap">
                            {st.finished_time && st.finished_time !== '-'
                              ? `${st.finished_time} WIB`
                              : `${new Date(st.finished_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB`}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[#102919]/50 font-mono text-xs font-bold">-</span>
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-[#102919] font-mono text-[11px] font-bold">
                      {formatDuration(st.started_at, st.finished_at)}
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <span className="inline-flex items-center gap-1 font-mono font-black text-[#102919]">
                        <span className="text-[#102919]">{st.correct_count ?? 0}</span>
                        <span className="text-[#8BC829]">/</span>
                        <span>{st.total_questions ?? sessionResults.total_questions ?? 0}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      {st.violation_count > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white border border-rose-700 animate-pulse">
                          <ShieldAlert className="w-3 h-3 text-white" />
                          <span>{st.violation_count} Pelanggaran</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-[#C3E956] text-[#0A1D11] border border-[#4D7111]/30">
                          <ShieldCheck className="w-3 h-3 text-[#0A1D11]" />
                          <span>0 Bersih</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      {st.is_remedial_allowed ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border-2 border-amber-300 shadow-2xs">
                          <RotateCcw className="w-3 h-3 text-amber-700" />
                          <span>Remidi Terbuka</span>
                        </span>
                      ) : (st.status === 'SUBMITTED' || Boolean(st.finished_at)) ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-[#C3E956] text-[#0A1D11] border border-[#4D7111]/30">
                          <CheckCircle className="w-3 h-3 text-[#0A1D11]" />
                          <span>Selesai</span>
                        </span>
                      ) : st.status === 'LOCKED_VIOLATION' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white border border-rose-700 animate-pulse">
                          <AlertTriangle className="w-3 h-3 text-white" />
                          <span>Terkunci</span>
                        </span>
                      ) : st.status === 'NOT_STARTED' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#E2F4B4] text-[#102919] border-2 border-[#8BC829]">
                          <Clock className="w-3 h-3 text-[#102919]" />
                          <span>Belum Masuk</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-[#E2F4B4] text-[#102919] border-2 border-[#8BC829]">
                          <Clock className="w-3 h-3 text-[#102919]" />
                          <span>Mengerjakan</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {st.has_ungraded_essay ? (
                        <div className="flex flex-col items-center gap-1">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-100 text-amber-900 border-2 border-amber-300 font-black text-xs shadow-2xs">
                            <Clock className="w-3.5 h-3.5 text-amber-700" />
                            <span>Belum Dinilai</span>
                          </span>
                          <span className="text-[10px] text-[#102919]/70 font-bold">
                            {st.essay_graded_count !== undefined ? `${st.essay_graded_count}/${st.total_essay_questions || 0} Esai Dinilai` : 'Menunggu Koreksi'}
                          </span>
                        </div>
                      ) : st.total_score !== null && st.total_score !== undefined && st.status !== 'NOT_STARTED' ? (
                        <div className="flex flex-col items-center gap-1">
                          <div className="inline-flex items-baseline gap-1 px-2.5 py-1 rounded-xl bg-[#102919] border border-[#C3E956]/40 text-white font-mono font-bold text-xs shadow-xs">
                            <span className="text-sm font-black text-[#C3E956]">{st.total_score}</span>
                            <span className="text-[10px] text-[#EFF9CE]/80">/ 100</span>
                          </div>
                          {st.previous_score !== null && st.previous_score !== undefined && (
                            <span 
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300" 
                              title={`Nilai Awal: ${st.previous_score}${st.remedial_score !== null && st.remedial_score !== undefined ? `, Nilai Remidi: ${st.remedial_score}` : ''} (Sistem Otomatis Mengambil Nilai Tertinggi)`}
                            >
                              <RotateCcw className="w-2.5 h-2.5 text-amber-700" />
                              <span>Awal: {st.previous_score}</span>
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[#102919]/50 font-mono font-bold">-</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenBreakdownModal(st)}
                          disabled={!st.attempt_id || st.status === 'NOT_STARTED'}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#102919] hover:bg-[#1F4B2C] border border-[#C3E956]/40 text-[#C3E956] font-black text-xs transition shadow-sm active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                          title={st.status === 'NOT_STARTED' ? 'Siswa belum memulai ujian' : 'Lihat Rincian Analisis Jawaban Siswa per Butir Soal'}
                        >
                          <Eye className="w-3.5 h-3.5 text-[#C3E956]" />
                          <span>Lihat Jawaban</span>
                        </button>

                        {/* Tombol Buka Remidi */}
                        {st.status !== 'NOT_STARTED' && (
                          <button
                            type="button"
                            onClick={() => handleOpenRemedialModal(st)}
                            disabled={isOpeningRemedial}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-black text-xs transition shadow-xs active:scale-[0.98] cursor-pointer ${
                              st.is_remedial_allowed
                                ? 'bg-amber-600 hover:bg-amber-700 text-white border border-amber-700 shadow-sm'
                                : 'bg-[#E2F4B4] hover:bg-[#d6f0a3] border-2 border-amber-400 text-amber-900'
                            }`}
                            title="Buka akses remidi untuk siswa ini (nilai awal disimpan & sistem otomatis mencatat nilai tertinggi)"
                          >
                            <RotateCcw className={`w-3.5 h-3.5 ${st.is_remedial_allowed ? 'animate-spin' : 'text-amber-700'}`} />
                            <span>{st.is_remedial_allowed ? 'Remidi Aktif' : 'Buka Remidi'}</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 5. MODAL DETAIL LEMBAR JAWABAN SISWA (PORTAL FULLSCREEN) */}
      {/* ======================================================== */}
      {selectedAttempt && createPortal(
        <div className="fixed inset-0 z-[9999] bg-[#0A1D11]/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fade-in">
          <div className="bg-[#EFF9CE] rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border-2 border-[#8BC829] overflow-hidden my-auto text-[#102919]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b-2 border-[#8BC829] bg-gradient-to-r from-[#102919] via-[#0E2416] to-[#0A1D11] text-white flex items-center justify-between shrink-0 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#143820] border-2 border-[#C3E956]/50 flex items-center justify-center text-[#C3E956] font-black shrink-0 shadow-xs">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white leading-tight">
                    Lembar Jawaban: {selectedAttempt.student_name}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#EFF9CE]/80 mt-1 font-bold">
                    <span className="font-mono text-[#C3E956]">NISN: {selectedAttempt.nisn}</span>
                    <span className="text-[#C3E956]">•</span>
                    <span>Kelas: <strong className="text-white">{selectedAttempt.classroom_name}</strong></span>
                    <span className="text-[#C3E956]">•</span>
                    <span className="text-[#C3E956]">{sessionResults?.subject_name}</span>
                  </div>
                </div>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={handleCloseBreakdownModal}
                className="p-2 rounded-xl bg-[#143820] hover:bg-[#1F4B2C] text-[#EFF9CE] hover:text-[#C3E956] border border-[#C3E956]/30 transition cursor-pointer"
                title="Tutup Lembar Jawaban"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-gradient-to-b from-[#EBF7CD] to-[#D9F0A5] custom-scrollbar">
              {isLoadingBreakdown ? (
                <div className="py-20 text-center space-y-3">
                  <RefreshCw className="w-8 h-8 text-[#102919] animate-spin mx-auto" />
                  <div className="text-xs text-[#102919] font-bold">Mengambil analisis lembar jawaban siswa...</div>
                </div>
              ) : !breakdownData ? (
                <div className="py-16 text-center space-y-2 text-[#102919]/70">
                  <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
                  <div className="text-xs font-black text-[#102919]">Rincian jawaban tidak dapat ditemukan.</div>
                </div>
              ) : (
                <>
                  {/* Score KPI Header Inside Modal */}
                  <div className="bg-[#EFF9CE] border-2 border-[#8BC829] rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-[#102919] border border-[#C3E956]/40 flex flex-col items-center justify-center text-white shrink-0 shadow-xs">
                        <span className="text-2xl font-black font-mono text-[#C3E956]">
                          {breakdownData.total_score}
                        </span>
                        <span className="text-[9px] uppercase tracking-wider text-[#EFF9CE]/70 font-bold">Skor Akhir</span>
                      </div>
                      <div>
                        <div className="text-xs text-[#102919]/70 uppercase font-black tracking-wider">Capaian Nilai</div>
                        <div className="text-sm font-black text-[#102919] mt-0.5">
                          {breakdownData.total_score} dari {breakdownData.total_max_points || 100} Poin Maksimal
                        </div>
                        <div className="text-xs text-[#102919]/80 font-bold mt-0.5">
                          Persentase: <strong className="text-[#102919] font-black">{breakdownData.total_max_points ? Math.round((breakdownData.total_score / breakdownData.total_max_points) * 100) : 0}%</strong>
                        </div>
                      </div>
                    </div>

                    {/* Breakdown Badges */}
                    <div className="flex items-center gap-2">
                      <div className="px-3 py-2 rounded-xl bg-[#C3E956] border-2 border-[#4D7111]/30 text-center shadow-xs">
                        <div className="text-base font-black font-mono text-[#0A1D11]">{breakdownData.total_correct ?? 0}</div>
                        <div className="text-[10px] text-[#0A1D11] font-black">Benar</div>
                      </div>
                      <div className="px-3 py-2 rounded-xl bg-rose-100 border-2 border-rose-300 text-center shadow-xs">
                        <div className="text-base font-black font-mono text-rose-800">{breakdownData.total_incorrect ?? 0}</div>
                        <div className="text-[10px] text-rose-700 font-bold">Salah / Belum</div>
                      </div>
                      <div className="px-3 py-2 rounded-xl bg-[#E2F4B4] border-2 border-[#8BC829] text-center shadow-xs">
                        <div className="text-base font-black font-mono text-[#102919]">{breakdownData.total_questions ?? 0}</div>
                        <div className="text-[10px] text-[#102919] font-black">Total Soal</div>
                      </div>
                    </div>
                  </div>

                  {/* Filter Tabs Inside Modal */}
                  <div className="flex items-center gap-1.5 border-b-2 border-[#8BC829]/40 pb-2 overflow-x-auto">
                    <button
                      type="button"
                      onClick={() => setBreakdownFilter('ALL')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                        breakdownFilter === 'ALL'
                          ? 'bg-[#102919] text-[#C3E956] shadow-sm'
                          : 'bg-[#E2F4B4] hover:bg-[#d6f0a3] text-[#102919] border-2 border-[#8BC829]'
                      }`}
                    >
                      Semua Soal ({breakdownData.items?.length || 0})
                    </button>
                    <button
                      type="button"
                      onClick={() => setBreakdownFilter('CORRECT')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                        breakdownFilter === 'CORRECT'
                          ? 'bg-[#102919] text-[#C3E956] shadow-sm'
                          : 'bg-[#E2F4B4] hover:bg-[#d6f0a3] text-[#102919] border-2 border-[#8BC829]'
                      }`}
                    >
                      Benar ({breakdownData.items?.filter((i) => i.status === 'CORRECT' || i.status === 'PARTIAL').length || 0})
                    </button>
                    <button
                      type="button"
                      onClick={() => setBreakdownFilter('INCORRECT')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                        breakdownFilter === 'INCORRECT'
                          ? 'bg-rose-600 text-white shadow-sm'
                          : 'bg-rose-100 hover:bg-rose-200 text-rose-900 border-2 border-rose-300'
                      }`}
                    >
                      Salah ({breakdownData.items?.filter((i) => i.status === 'INCORRECT' || i.status === 'UNANSWERED').length || 0})
                    </button>
                    <button
                      type="button"
                      onClick={() => setBreakdownFilter('ESSAY')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                        breakdownFilter === 'ESSAY'
                          ? 'bg-[#102919] text-[#C3E956] shadow-sm'
                          : 'bg-[#E2F4B4] hover:bg-[#d6f0a3] text-[#102919] border-2 border-[#8BC829]'
                      }`}
                    >
                      Esai ({breakdownData.items?.filter((i) => i.question_type === 'ESSAY').length || 0})
                    </button>
                  </div>

                  {/* Question Breakdown List */}
                  <div className="space-y-4">
                    {breakdownData.items
                      ?.filter((item) => {
                        if (breakdownFilter === 'CORRECT') return item.status === 'CORRECT' || item.status === 'PARTIAL';
                        if (breakdownFilter === 'INCORRECT') return item.status === 'INCORRECT' || item.status === 'UNANSWERED';
                        if (breakdownFilter === 'ESSAY') return item.question_type === 'ESSAY';
                        return true;
                      })
                      .map((item, idx) => (
                        <div
                          key={item.question_id || idx}
                          className="bg-[#EFF9CE] rounded-2xl border-2 border-[#8BC829] p-4 sm:p-5 shadow-sm space-y-3 text-[#102919]"
                        >
                          {/* Item Header */}
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-[#8BC829]/40 pb-2.5">
                            <div className="flex items-center gap-2">
                              <span className="w-7 h-7 rounded-xl bg-[#102919] text-[#C3E956] font-mono font-black text-xs flex items-center justify-center border border-[#C3E956]/40">
                                {item.order_number}
                              </span>
                              <span className="text-xs font-black text-[#102919] uppercase tracking-wider">
                                {item.question_type === 'MULTIPLE_CHOICE' && 'Pilihan Ganda'}
                                {item.question_type === 'MULTIPLE_CHOICE_COMPLEX' && 'Pilihan Ganda Kompleks'}
                                {item.question_type === 'SHORT_ANSWER' && 'Isian Singkat'}
                                {item.question_type === 'TRUE_FALSE_MATRIX' && 'Matriks Benar / Salah'}
                                {item.question_type === 'MATCHING_PAIR' && 'Menjodohkan'}
                                {item.question_type === 'ESSAY' && 'Esai / Uraian'}
                              </span>
                            </div>

                            {/* Status Badge */}
                            <div>
                              {item.status === 'CORRECT' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-[#C3E956] text-[#0A1D11] border border-[#4D7111]/30">
                                  <Check className="w-3.5 h-3.5 text-[#0A1D11]" />
                                  <span>Benar (+{item.earned_points} Poin)</span>
                                </span>
                              )}
                              {item.status === 'PARTIAL' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-900 border-2 border-amber-300">
                                  <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                                  <span>Sebagian (+{item.earned_points} Poin)</span>
                                </span>
                              )}
                              {item.status === 'INCORRECT' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-rose-600 text-white border border-rose-700">
                                  <X className="w-3.5 h-3.5 text-white" />
                                  <span>Salah (0 Poin)</span>
                                </span>
                              )}
                              {item.status === 'UNANSWERED' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-[#E2F4B4] text-[#102919] border-2 border-[#8BC829]">
                                  <span>Tidak Dijawab (0 Poin)</span>
                                </span>
                              )}
                              {item.status === 'ESSAY_GRADED' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-[#C3E956] text-[#0A1D11] border border-[#4D7111]/30">
                                  <Award className="w-3.5 h-3.5 text-[#0A1D11]" />
                                  <span>Esai Dinilai (+{item.earned_points} / {item.points} Poin)</span>
                                </span>
                              )}
                              {item.status === 'ESSAY_PENDING' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-violet-100 text-violet-900 border-2 border-violet-300">
                                  <Clock className="w-3.5 h-3.5 text-violet-700" />
                                  <span>Esai Menunggu Koreksi Guru</span>
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Teks Butir Soal (KaTeX Ready) */}
                          <div className="text-xs sm:text-sm font-bold text-[#102919] leading-relaxed pt-1">
                            <MathText text={item.question_text} />
                          </div>

                          {/* Lampiran Gambar Soal (Jika Ada) */}
                          {(item.image_url || item.imageUrl) && (
                            <div className="pt-2">
                              <div className="inline-block p-2 rounded-2xl bg-[#F9FDEE] border-2 border-[#8BC829] shadow-2xs max-w-full">
                                <img
                                  src={resolveImageUrl(item.image_url || item.imageUrl)}
                                  alt={`Gambar Soal Nomor ${item.number || idx + 1}`}
                                  className="max-h-64 sm:max-h-80 w-auto rounded-xl object-contain bg-transparent block"
                                  loading="lazy"
                                  onError={handleImageErrorFallback}
                                />
                              </div>
                            </div>
                          )}

                          {/* Opsi Pilihan Ganda Visualizer (Jika Pilihan Ganda) */}
                          {item.options && item.options.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                              {item.options.map((opt) => {
                                const isCorrect = opt.is_correct;
                                const isChosen = opt.is_chosen;

                                let borderClass = 'border-2 border-[#8BC829] bg-[#F9FDEE] text-[#102919] font-bold';
                                if (isCorrect && isChosen) {
                                  borderClass = 'border-2 border-[#4D7111] bg-[#C3E956] text-[#0A1D11] font-black ring-2 ring-[#4D7111]/30';
                                } else if (isCorrect && !isChosen) {
                                  borderClass = 'border-2 border-[#8BC829] bg-[#E2F4B4] text-[#102919] font-bold';
                                } else if (!isCorrect && isChosen) {
                                  borderClass = 'border-2 border-rose-400 bg-rose-100 text-rose-900 line-through font-bold';
                                }

                                return (
                                  <div
                                    key={opt.id}
                                    className={`p-2.5 rounded-xl border text-xs flex flex-col gap-2 ${borderClass}`}
                                  >
                                    <div className="flex items-start gap-2 w-full">
                                      <span className="font-black shrink-0">{opt.label}.</span>
                                      <div className="flex-1">
                                        <MathText text={opt.text} />
                                      </div>
                                      {isChosen && (
                                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded-lg bg-[#102919] text-[#C3E956] shrink-0 border border-[#C3E956]/40">
                                          Pilihan Siswa
                                        </span>
                                      )}
                                      {isCorrect && !isChosen && (
                                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded-lg bg-[#C3E956] text-[#0A1D11] shrink-0 border border-[#4D7111]/30">
                                          Kunci
                                        </span>
                                      )}
                                    </div>
                                    {(opt.image_url || opt.imageUrl) && (
                                      <div className="mt-1 pl-5">
                                        <div className="inline-block p-1.5 rounded-xl bg-[#F9FDEE] border-2 border-[#8BC829] shadow-2xs max-w-full">
                                          <img
                                            src={resolveImageUrl(opt.image_url || opt.imageUrl)}
                                            alt={`Gambar Opsi ${opt.label}`}
                                            className="max-h-40 w-auto rounded-lg object-contain bg-transparent block"
                                            loading="lazy"
                                            onError={handleImageErrorFallback}
                                          />
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Lembar Perbandingan Jawaban Siswa vs Kunci Sistem */}
                          <div className="bg-[#E2F4B4] border-2 border-[#8BC829] rounded-2xl p-3.5 text-xs space-y-2 mt-2 text-[#102919]">
                            <div className="flex items-start gap-2">
                              <span className="font-black text-[#102919] min-w-28 shrink-0">Jawaban Siswa:</span>
                              <span className={`font-black ${
                                item.status === 'CORRECT' 
                                  ? 'text-[#102919]' 
                                  : item.status === 'INCORRECT' 
                                    ? 'text-rose-700' 
                                    : 'text-[#102919]'
                              }`}>
                                {item.student_answer_display}
                              </span>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="font-black text-[#102919] min-w-28 shrink-0">Kunci Jawaban:</span>
                              <span className="font-black text-[#102919]">
                                {item.correct_answer_display}
                              </span>
                            </div>
                            {item.feedback && (
                              <div className="flex items-start gap-2 pt-1 border-t-2 border-[#8BC829]/40">
                                <span className="font-black text-[#102919] min-w-28 shrink-0">Catatan Guru:</span>
                                <span className="text-[#102919] italic font-medium">{item.feedback}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t-2 border-[#8BC829] bg-[#EFF9CE] flex items-center justify-between shrink-0">
              <span className="text-xs text-[#102919]/70 font-medium">
                Tekan tombol di kanan untuk menutup lembar analisis.
              </span>
              <button
                type="button"
                onClick={handleCloseBreakdownModal}
                className="px-5 py-2.5 rounded-xl bg-[#102919] hover:bg-[#1F4B2C] text-[#C3E956] border border-[#C3E956]/40 text-xs font-black transition active:scale-[0.98] cursor-pointer shadow-sm"
              >
                Tutup Lembar Jawaban
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ======================================================== */}
      {/* 6. MODAL KONFIRMASI BUKA REMIDI SISWA (PORTAL)          */}
      {/* ======================================================== */}
      {remedialStudent && createPortal(
        <div className="fixed inset-0 z-[9999] bg-[#0A1D11]/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-[#EFF9CE] rounded-3xl max-w-md w-full shadow-2xl border-2 border-[#8BC829] overflow-hidden my-auto text-[#102919]">
            {/* Header */}
            <div className="px-6 py-4 border-b-2 border-[#8BC829] bg-gradient-to-r from-[#102919] via-[#0E2416] to-[#0A1D11] text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#143820] border-2 border-[#C3E956]/50 flex items-center justify-center text-[#C3E956] font-black shrink-0">
                  <RotateCcw className="w-5 h-5 text-[#C3E956]" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    Buka Akses Remidi Siswa
                  </h3>
                  <p className="text-xs text-[#EFF9CE]/80 font-bold">
                    Konfirmasi pembukaan sesi remedial mandiri
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseRemedialModal}
                disabled={isOpeningRemedial}
                className="p-1.5 rounded-xl hover:bg-[#1F4B2C] text-[#EFF9CE] hover:text-[#C3E956] transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 text-xs">
              {/* Card Siswa */}
              <div className="p-4 rounded-2xl bg-[#E2F4B4] border-2 border-[#8BC829] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-black text-[#102919] text-sm">{remedialStudent.student_name}</span>
                  <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-black bg-[#C3E956] text-[#0A1D11] border border-[#4D7111]/30">
                    Nilai Awal: {remedialStudent.total_score ?? remedialStudent.previous_score ?? 0}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[#102919]/80 font-mono font-bold text-[11px]">
                  <span>NISN: <strong>{remedialStudent.nisn}</strong></span>
                  <span>•</span>
                  <span>Kelas: <strong>{remedialStudent.classroom_name}</strong></span>
                </div>
              </div>

              {/* Ketentuan Remidi */}
              <div className="space-y-2">
                <div className="font-black text-[#102919] flex items-center gap-1.5 text-xs">
                  <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>Ketentuan Otomatisasi Sistem Remidi:</span>
                </div>
                <ul className="space-y-2 text-[#102919] pl-5 list-disc leading-relaxed text-[11px] font-medium">
                  <li>
                    Siswa diizinkan masuk dan mengerjakan kembali lembar asesmen ini melalui ExamBrowser.
                  </li>
                  <li>
                    <strong className="text-[#102919] font-black">Pembersihan Pelanggaran:</strong> Seluruh catatan pelanggaran sensor siswa pada sesi ini di-reset menjadi <strong>0 Bersih</strong> dan disinkronkan ke E-Jurnal Guru.
                  </li>
                  <li>
                    <strong className="text-[#102919] font-black">Prinsip Nilai Tertinggi:</strong> Sistem menyimpan nilai awal siswa (<strong>{remedialStudent.total_score ?? remedialStudent.previous_score ?? 0}</strong>). Jika perolehan nilai remidi lebih rendah dari nilai awal, sistem secara otomatis <strong>tetap mengambil dan mencatat nilai yang paling tinggi</strong>.
                  </li>
                </ul>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="px-6 py-4 bg-[#EFF9CE] border-t-2 border-[#8BC829] flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={handleCloseRemedialModal}
                disabled={isOpeningRemedial}
                className="px-4 py-2.5 rounded-xl border-2 border-[#8BC829] text-[#102919] font-black text-xs hover:bg-[#E2F4B4] transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmOpenRemedial}
                disabled={isOpeningRemedial}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs shadow-sm transition cursor-pointer disabled:opacity-60 border border-amber-700"
              >
                {isOpeningRemedial ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Membuka Remidi...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Ya, Buka Remidi</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
