import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExamStore } from '../../store/useExamStore';
import { getSessionTokens, formatTimeRemaining } from '../../utils/tokenGenerator';
import { 
  FolderKanban, 
  Users, 
  ShieldAlert, 
  Clock, 
  ArrowRight, 
  Radio, 
  FileSpreadsheet, 
  PlusCircle,
  ExternalLink,
  BookOpen,
  AlertTriangle,
  Unlock,
  CheckCircle2,
  CalendarCheck,
  CalendarClock,
  School,
  Sparkles,
  Award,
  KeyRound,
  RotateCcw,
  GraduationCap,
  FileCheck,
  ShieldCheck,
  ChevronRight,
  MapPin,
  Building
} from 'lucide-react';
import logoSdMis from '../../assets/logo sd mis.png';

export default function DashboardTeacher() {
  const navigate = useNavigate();
  const { 
    examPackages, 
    examSessions, 
    proctoringStudents, 
    currentUser,
    unlockStudent,
    fetchPackages,
    fetchSessions
  } = useExamStore();

  useEffect(() => {
    fetchPackages?.();
    fetchSessions?.();
  }, [fetchPackages, fetchSessions]);

  // Live Timer State untuk Sinkronisasi Rotasi Token 10 Menit
  const [tickTime, setTickTime] = useState(Date.now());
  const [copiedToken, setCopiedToken] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setTickTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleCopyToken = (text, type) => {
    if (!text) return;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopiedToken(type);
      setTimeout(() => setCopiedToken(null), 2000);
    } catch (_) {}
  };

  const activeSessions = examSessions.filter((s) => s.isActive || s.is_active);
  const lockedStudents = proctoringStudents.filter((s) => s.status === 'LOCKED_VIOLATION');
  const workingStudents = proctoringStudents.filter((s) => s.status === 'WORKING');
  const submittedStudents = proctoringStudents.filter((s) => s.status === 'SUBMITTED');
  const totalViolationsCount = proctoringStudents.reduce((acc, curr) => acc + (curr.violationCount || curr.violation_count || 0), 0);

  // Siswa yang pernah melakukan pelanggaran untuk live feed
  const studentsWithViolations = proctoringStudents.filter((s) => (s.violationCount || s.violation_count) > 0);

  const quickServices = [
    {
      title: 'Bank Soal & Paket Ujian',
      desc: 'Kelola butir soal AKM, pilihan ganda, esai uraian, dan form eksternal.',
      icon: FolderKanban,
      path: '/teacher/packages',
      tag: `${examPackages.length} Paket`
    },
    {
      title: 'Jadwal & Sesi Ujian',
      desc: 'Atur jadwal ruang asesmen, alokasi kelas, token, dan durasi pengerjaan.',
      icon: CalendarClock,
      path: '/teacher/sessions',
      tag: `${examSessions.length} Sesi`
    },
    {
      title: 'Live Proctoring',
      desc: 'Pantau layar siswa secara real-time dengan sensor anti-curang.',
      icon: Radio,
      path: '/teacher/proctoring',
      tag: lockedStudents.length > 0 ? `${lockedStudents.length} Terkunci` : 'Siaga',
      isAlert: lockedStudents.length > 0
    },
    {
      title: 'Koreksi Lembar Esai',
      desc: 'Evaluasi lembar jawaban uraian siswa per butir soal dengan rubrik.',
      icon: FileCheck,
      path: '/teacher/grading',
      tag: 'Rubrik Dinilai'
    },
    {
      title: 'Rekap Nilai Siswa',
      desc: 'Analisis butir soal, unduh format Excel (.xlsx), dan buka akses remidi.',
      icon: Award,
      path: '/teacher/results',
      tag: 'Ekspor Excel'
    },
    {
      title: 'E-Jurnal Berita Acara',
      desc: 'Berita acara pelaksanaan asesmen resmi sekolah siap cetak PDF.',
      icon: FileSpreadsheet,
      path: '/teacher/ejournal',
      tag: 'Berita Acara'
    }
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* ======================================================== */}
      {/* 1. EXECUTIVE SCHOOL IDENTITY & HERO COMMAND CENTER       */}
      {/* ======================================================== */}
      <div className="bg-gradient-to-br from-[#102919] via-[#143820] to-[#1F4B2C] rounded-3xl p-6 sm:p-8 text-white border border-[#1F4B2C] shadow-xl relative overflow-hidden">
        {/* Subtle Architectural Pattern */}
        <div 
          className="absolute inset-0 opacity-[0.05] pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(to right, #91EAAF 1px, transparent 1px), linear-gradient(to bottom, #91EAAF 1px, transparent 1px)',
            backgroundSize: '32px 32px'
          }}
        />

        <div className="relative z-10 space-y-6">
          {/* Top Brand & Metadata Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#1F4B2C]/80 pb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white p-2.5 flex items-center justify-center shadow-xl ring-2 ring-[#91EAAF]/50 shrink-0">
                <img src={logoSdMis} alt="Logo SD Mentari Islamic School" className="w-full h-full object-contain" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-white">
                    SD MENTARI ISLAMIC SCHOOL
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#C3E956] text-[#0A1D11] text-[11px] font-mono font-extrabold shadow-xs">
                    NPSN: 70047473
                  </span>
                </div>
                <div className="text-xs sm:text-sm text-[#91EAAF] mt-1 flex items-center gap-1.5 font-medium">
                  <MapPin className="w-3.5 h-3.5 text-[#C3E956] shrink-0" />
                  <span>Lembu RT 02/ RW 01, Jimus, Polanharjo, Klaten</span>
                </div>
              </div>
            </div>

            {/* Status Pills */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0A1D11]/80 border border-[#C3E956]/40 text-[#C3E956] text-xs font-bold shadow-xs">
                <span className="w-2 h-2 rounded-full bg-[#C3E956] animate-pulse" />
                <span>Zero-Tolerance Lockdown Aktif</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#143820] border border-[#91EAAF]/40 text-[#F4FFFC] text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-[#C3E956]" />
                <span>CBT Versi 2.0 Pro</span>
              </div>
            </div>
          </div>

          {/* School Vision Tagline Quote */}
          <div className="p-4 rounded-2xl bg-[#0A1D11]/60 border border-[#1F4B2C]/70 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-[11px] font-mono uppercase tracking-widest text-[#91EAAF]/80 font-bold">
                Sistem Evaluasi Asesmen SD Mentari Islamic School
              </div>
              <p className="text-xs sm:text-sm text-[#F4FFFC]/90 italic font-medium leading-relaxed">
                &ldquo;Kami bangga menjadi pelopor dalam menggabungkan teknologi modern dengan nilai-nilai Islam yang kokoh. <strong className="text-[#C3E956] font-bold not-italic">&lsquo;Digital Mind, Islamic Heart&rsquo;</strong>.&rdquo;
              </p>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                onClick={() => navigate('/teacher/sessions')}
                className="h-10 px-4 rounded-xl bg-[#C3E956] hover:bg-[#d4f76b] text-[#0A1D11] text-xs font-bold tracking-tight transition-all duration-150 hover:-translate-y-0.5 active:scale-[0.98] shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <CalendarClock className="w-4 h-4 text-[#0A1D11]" />
                <span>Jadwal Sesi Ujian</span>
              </button>
              <button
                onClick={() => navigate('/teacher/proctoring')}
                className={`h-10 px-4 rounded-xl text-xs font-bold tracking-tight transition-all duration-150 hover:-translate-y-0.5 active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer ${
                  lockedStudents.length > 0
                    ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-md animate-pulse'
                    : 'bg-[#143820] hover:bg-[#183D23] border border-[#91EAAF]/40 text-[#F4FFFC]'
                }`}
              >
                <Radio className="w-4 h-4 text-[#C3E956]" />
                <span>Ruang Pengawas {lockedStudents.length > 0 ? `(${lockedStudents.length} Terkunci)` : ''}</span>
              </button>
              <button
                onClick={() => navigate('/teacher/packages')}
                className="h-10 px-4 rounded-xl bg-white/10 hover:bg-white/15 border border-[#91EAAF]/40 text-[#F4FFFC] text-xs font-semibold tracking-tight transition-all duration-150 hover:-translate-y-0.5 active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4 text-[#91EAAF]" />
                <span>+ Buat Paket</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. 4 EXECUTIVE KPI STATISTIC CARDS                       */}
      {/* ======================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Paket Soal */}
        <div 
          onClick={() => navigate('/teacher/packages')}
          className="bg-white rounded-2xl p-5 border border-[#91EAAF]/40 shadow-xs hover:border-[#1F4B2C] hover:shadow-md transition-all duration-200 cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold text-[#1F4B2C] uppercase tracking-wider">
              Total Bank Soal
            </span>
            <div className="w-9 h-9 rounded-xl bg-[#E1F8ED] text-[#1F4B2C] flex items-center justify-center border border-[#91EAAF]/60 group-hover:bg-[#1F4B2C] group-hover:text-[#C3E956] transition-colors">
              <FolderKanban className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-[#102919] mt-3 tracking-tight font-mono tabular-nums">
            {examPackages.length}
          </div>
          <div className="text-xs text-zinc-500 mt-1 flex items-center justify-between">
            <span>Mandiri AKM & Form</span>
            <ChevronRight className="w-3.5 h-3.5 text-[#1F4B2C] opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>

        {/* Card 2: Sesi Ujian Aktif */}
        <div 
          onClick={() => navigate('/teacher/sessions')}
          className="bg-white rounded-2xl p-5 border border-[#91EAAF]/40 shadow-xs hover:border-[#1F4B2C] hover:shadow-md transition-all duration-200 cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold text-[#1F4B2C] uppercase tracking-wider">
              Sesi Ujian Aktif
            </span>
            <div className="w-9 h-9 rounded-xl bg-[#C3E956]/20 text-[#4D7111] flex items-center justify-center border border-[#C3E956]/40 group-hover:bg-[#1F4B2C] group-hover:text-[#C3E956] transition-colors">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-[#1F4B2C] mt-3 tracking-tight font-mono tabular-nums">
            {activeSessions.length}
          </div>
          <div className="text-xs text-[#4D7111] font-bold mt-1 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Siap diakses siswa
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-[#1F4B2C] opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>

        {/* Card 3: Siswa Mengerjakan */}
        <div 
          onClick={() => navigate('/teacher/proctoring')}
          className="bg-white rounded-2xl p-5 border border-[#91EAAF]/40 shadow-xs hover:border-[#1F4B2C] hover:shadow-md transition-all duration-200 cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold text-[#1F4B2C] uppercase tracking-wider">
              Siswa Sedang Fokus
            </span>
            <div className="w-9 h-9 rounded-xl bg-[#E1F8ED] text-[#1F4B2C] flex items-center justify-center border border-[#91EAAF]/60 group-hover:bg-[#1F4B2C] group-hover:text-[#C3E956] transition-colors">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-[#102919] mt-3 tracking-tight font-mono tabular-nums">
            {workingStudents.length}
          </div>
          <div className="text-xs text-zinc-500 mt-1 flex items-center justify-between">
            <span>{submittedStudents.length} siswa selesai terkirim</span>
            <ChevronRight className="w-3.5 h-3.5 text-[#1F4B2C] opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>

        {/* Card 4: Status Integritas */}
        <div 
          onClick={() => navigate('/teacher/violations')}
          className={`rounded-2xl p-5 border shadow-xs transition-all duration-200 cursor-pointer group ${
            lockedStudents.length > 0 
              ? 'bg-rose-50/70 border-rose-300 hover:border-rose-500' 
              : 'bg-white border-[#91EAAF]/40 hover:border-[#1F4B2C] hover:shadow-md'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#1F4B2C]">
              Integritas & Pelanggaran
            </span>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-colors ${
              lockedStudents.length > 0 
                ? 'bg-rose-100 text-rose-700 border-rose-300 animate-pulse' 
                : 'bg-[#E1F8ED] text-[#1F4B2C] border-[#91EAAF]/60 group-hover:bg-[#1F4B2C] group-hover:text-[#C3E956]'
            }`}>
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-3xl font-black mt-3 tracking-tight font-mono tabular-nums ${
            lockedStudents.length > 0 ? 'text-rose-700' : 'text-[#102919]'
          }`}>
            {totalViolationsCount}
          </div>
          <div className="text-xs font-bold mt-1 flex items-center justify-between">
            {lockedStudents.length > 0 ? (
              <span className="text-rose-700 flex items-center gap-1 animate-pulse">
                <AlertTriangle className="w-3.5 h-3.5" />
                {lockedStudents.length} Siswa Terkunci!
              </span>
            ) : (
              <span className="text-[#4D7111] flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[#4D7111]" />
                Kondusif & Aman
              </span>
            )}
            <ChevronRight className="w-3.5 h-3.5 text-[#1F4B2C] opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. DUA KOLOM: SESI UJIAN AKTIF & FEED PELANGGARAN        */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kolom Kiri (2 Kolom): Sesi Ujian Aktif Hari Ini */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-[#91EAAF]/40 shadow-xs p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-[#91EAAF]/30 pb-4">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#102919] tracking-tight">
                Ruang Sesi Asesmen Aktif
              </h2>
              <p className="text-xs text-zinc-500">
                Token masuk otomatis berotasi tiap 10 menit untuk menjamin kejujuran ujian
              </p>
            </div>
            <button
              onClick={() => navigate('/teacher/sessions')}
              className="text-xs font-bold text-[#1F4B2C] hover:text-[#4D7111] flex items-center gap-1 transition"
            >
              <span>Kelola Semua Sesi</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#4D7111]" />
            </button>
          </div>

          <div className="space-y-3.5">
            {examSessions.length === 0 ? (
              <div className="p-12 text-center text-zinc-400 text-xs space-y-3">
                <CalendarClock className="w-10 h-10 text-[#91EAAF] mx-auto" />
                <p className="font-medium text-zinc-600">Belum ada sesi ujian yang dijadwalkan.</p>
                <button
                  onClick={() => navigate('/teacher/sessions')}
                  className="px-5 py-2.5 bg-[#1F4B2C] hover:bg-[#183D23] text-white rounded-xl font-bold text-xs shadow-xs transition"
                >
                  + Jadwalkan Sesi Asesmen Baru
                </button>
              </div>
            ) : (
              examSessions.slice(0, 5).map((session) => {
                const sessionTitle = session.title || session.package_title || 'Sesi Ujian';
                const classroomName = session.classroom_display || session.classroom_name || session.classroom || 'Semua Kelas';
                const duration = session.duration_minutes || session.durationMinutes || 60;
                const dynamicTokens = getSessionTokens(session.id, tickTime / 1000);
                const entryPw = dynamicTokens.entryToken || session.entry_password || session.entryPassword || '-';
                const pinPw = dynamicTokens.pinToken || session.supervisor_pin || session.supervisorPin || 'PIN-1234';
                const countdownStr = formatTimeRemaining(dynamicTokens.expiresInSeconds);
                const examType = session.exam_type || session.examType || 'NATIVE_QUESTIONS';

                return (
                  <div
                    key={session.id}
                    className="p-4 sm:p-5 rounded-2xl border border-[#91EAAF]/40 bg-[#F4FFFC]/50 hover:bg-[#F4FFFC] hover:border-[#1F4B2C] transition-all duration-150 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs"
                  >
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-[#C3E956]/20 text-[#4D7111] border border-[#C3E956]/40">
                          {classroomName === 'Semua Kelas' ? '🌟 Semua Kelas' : `Kelas ${classroomName}`}
                        </span>
                        <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-lg bg-white text-zinc-700 border border-zinc-200">
                          ⏱️ {duration} Menit
                        </span>
                        {examType === 'EXTERNAL_LINK' ? (
                          <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                            <ExternalLink className="w-3 h-3" /> Form Eksternal
                          </span>
                        ) : (
                          <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-lg bg-[#E1F8ED] text-[#1F4B2C] border border-[#91EAAF]/50 flex items-center gap-1">
                            <BookOpen className="w-3 h-3 text-[#1F4B2C]" /> Soal Mandiri
                          </span>
                        )}
                      </div>

                      <h3 className="font-bold text-zinc-900 text-sm sm:text-base tracking-tight truncate">
                        {sessionTitle}
                      </h3>

                      {/* Token Bar dengan Copy Action */}
                      <div className="flex flex-wrap items-center gap-2 text-xs pt-0.5">
                        <div 
                          onClick={() => handleCopyToken(entryPw, `entry-${session.id}`)}
                          className="flex items-center gap-1.5 bg-white border border-[#91EAAF]/60 px-2.5 py-1 rounded-lg text-zinc-700 font-medium cursor-pointer hover:border-[#1F4B2C] transition"
                          title="Klik untuk menyalin Token Masuk Siswa"
                        >
                          <KeyRound className="w-3.5 h-3.5 text-[#1F4B2C]" />
                          <span>Token: <strong className="text-[#1F4B2C] font-mono font-bold">{entryPw}</strong></span>
                          {copiedToken === `entry-${session.id}` && (
                            <span className="text-[10px] text-[#4D7111] font-bold animate-pulse">Tersalin!</span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 bg-white border border-zinc-200 px-2.5 py-1 rounded-lg text-zinc-700 font-medium">
                          <span>PIN: <strong className="text-[#102919] font-mono font-bold">{pinPw}</strong></span>
                        </div>

                        <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#C3E956]/20 border border-[#C3E956]/40 text-[#4D7111] font-mono font-bold text-[11px]">
                          <RotateCcw className="w-3 h-3 text-[#4D7111] animate-spin" style={{ animationDuration: '6s' }} />
                          <span>Rotasi: {countdownStr}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start md:self-center shrink-0">
                      <button
                        onClick={() => navigate('/teacher/proctoring')}
                        className="h-9 px-4 bg-[#1F4B2C] hover:bg-[#183D23] text-[#C3E956] rounded-xl text-xs font-bold transition-all duration-150 hover:-translate-y-0.5 active:scale-[0.98] flex items-center gap-1.5 shadow-xs cursor-pointer"
                      >
                        <Radio className="w-3.5 h-3.5 text-[#C3E956]" />
                        <span>Pantau Live</span>
                      </button>
                      <button
                        onClick={() => navigate(`/teacher/results?session=${session.id}`)}
                        className="h-9 px-3.5 bg-white border border-[#91EAAF]/60 hover:bg-[#F4FFFC] text-[#1F4B2C] rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                      >
                        <Award className="w-3.5 h-3.5 text-[#4D7111]" />
                        <span>Nilai</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Kolom Kanan (1 Kolom): Feed Pelanggaran Siswa Real-Time */}
        <div className="bg-white rounded-3xl border border-[#91EAAF]/40 shadow-xs p-6 space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#91EAAF]/30 pb-4">
              <div>
                <h2 className="text-base font-bold text-[#102919] tracking-tight">
                  Audit Pelanggaran Siswa
                </h2>
                <p className="text-xs text-zinc-500">
                  Sensor deteksi keluar tab & aplikasi
                </p>
              </div>
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
            </div>

            <div className="space-y-3">
              {studentsWithViolations.length === 0 ? (
                <div className="p-8 text-center text-zinc-400 text-xs space-y-2">
                  <ShieldCheck className="w-10 h-10 text-[#91EAAF] mx-auto" />
                  <div className="font-semibold text-zinc-700">Ruang Asesmen Kondusif</div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Belum ada insiden perpindahan tab atau aplikasi yang terdeteksi pada seluruh siswa aktif.
                  </p>
                </div>
              ) : (
                studentsWithViolations.slice(0, 4).map((student) => {
                  const isCurrentlyLocked = student.status === 'LOCKED_VIOLATION';
                  const sName = student.fullName || student.student_name || 'Siswa';
                  const sNisn = student.nisn || student.username || '-';
                  const sClass = student.classroom || student.classroom_name || '-';
                  const vCount = student.violationCount || student.violation_count || 0;

                  return (
                    <div
                      key={student.studentId || student.id}
                      className={`p-3.5 rounded-2xl border text-xs transition-colors space-y-2 ${
                        isCurrentlyLocked
                          ? 'bg-rose-50/70 border-rose-300'
                          : 'bg-[#F4FFFC]/50 border-[#91EAAF]/40'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-bold text-zinc-900 text-sm leading-tight">{sName}</div>
                          <div className="text-[10px] font-mono text-zinc-500 mt-0.5">
                            NISN: {sNisn} ({sClass})
                          </div>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                          isCurrentlyLocked 
                            ? 'bg-rose-500 text-white border-rose-600 animate-pulse' 
                            : 'bg-[#C3E956]/20 text-[#4D7111] border-[#C3E956]/40'
                        }`}>
                          {vCount}x Pelanggaran
                        </span>
                      </div>

                      {student.lastViolation && (
                        <div className="text-[11px] text-zinc-600 bg-white p-2 rounded-xl border border-zinc-200/80">
                          <span className="font-bold text-rose-600">[{student.lastViolation.time}]</span> {student.lastViolation.description}
                        </div>
                      )}

                      {isCurrentlyLocked && (
                        <button
                          onClick={() => unlockStudent(student.studentId || student.id)}
                          className="w-full py-2 bg-[#1F4B2C] hover:bg-[#183D23] text-[#C3E956] rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer active:scale-[0.98]"
                        >
                          <Unlock className="w-3.5 h-3.5 text-[#C3E956]" />
                          <span>Buka Kunci Layar Siswa</span>
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-[#91EAAF]/30">
            <button
              onClick={() => navigate('/teacher/proctoring')}
              className="w-full h-11 bg-gradient-to-r from-[#102919] to-[#1F4B2C] hover:from-[#0E2416] hover:to-[#183D23] text-[#C3E956] rounded-xl text-xs font-bold tracking-tight transition flex items-center justify-center gap-2 shadow-xs border border-[#C3E956]/40 cursor-pointer"
            >
              <Radio className="w-4 h-4 text-[#C3E956]" />
              <span>Buka Ruang Live Proctoring</span>
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 4. QUICK SERVICES NAVIGATION MATRIX (6 MODUL UTAMA)      */}
      {/* ======================================================== */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-[#102919] tracking-tight">
            Layanan & Fasilitas Pengawas Asesmen
          </h2>
          <span className="text-xs text-zinc-500">Akses cepat modul sistem</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickServices.map((srv, idx) => {
            const Icon = srv.icon;
            return (
              <div
                key={idx}
                onClick={() => navigate(srv.path)}
                className="bg-white rounded-2xl p-5 border border-[#91EAAF]/40 shadow-xs hover:border-[#1F4B2C] hover:shadow-md transition-all duration-150 cursor-pointer flex flex-col justify-between space-y-4 group"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-[#E1F8ED] border border-[#91EAAF]/60 flex items-center justify-center text-[#1F4B2C] group-hover:bg-[#1F4B2C] group-hover:text-[#C3E956] transition-colors shadow-2xs">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                      srv.isAlert
                        ? 'bg-rose-500 text-white border-rose-600 animate-pulse'
                        : 'bg-[#C3E956]/20 text-[#4D7111] border-[#C3E956]/40'
                    }`}>
                      {srv.tag}
                    </span>
                  </div>
                  <h3 className="font-bold text-zinc-900 text-sm group-hover:text-[#1F4B2C] transition-colors">
                    {srv.title}
                  </h3>
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    {srv.desc}
                  </p>
                </div>

                <div className="flex items-center gap-1 text-xs font-bold text-[#1F4B2C] pt-2 border-t border-zinc-100 group-hover:text-[#4D7111] transition-colors">
                  <span>Buka Modul</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
