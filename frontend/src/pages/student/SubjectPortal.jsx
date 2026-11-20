import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExamStore } from '../../store/useExamStore';
import { getSessionsApi } from '../../api/examApi';
import logoSdMis from '../../assets/logo sd mis.png';
import { 
  BookOpen, 
  ExternalLink, 
  ArrowRight, 
  ShieldCheck, 
  ArrowLeft, 
  Lock, 
  Sparkles, 
  Smartphone, 
  Monitor,
  Clock,
  AlertCircle,
  CheckCircle,
  RotateCcw,
  GraduationCap,
  LogOut,
  Settings,
  AlertTriangle
} from 'lucide-react';

export default function SubjectPortal() {
  const navigate = useNavigate();
  const { 
    examPackages, 
    fetchPackages,
    setSelectedPackage, 
    activeAttempt, 
    currentUser, 
    examSessions,
    setSessionId,
    logout
  } = useExamStore();
  
  const [availableSessions, setAvailableSessions] = useState(examSessions);
  const [isLaunching, setIsLaunching] = useState(false);
  const [launchingPackageId, setLaunchingPackageId] = useState(null);
  const [portalAlert, setPortalAlert] = useState('');

  // Digital Clock Real-Time State
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const timeString = currentTime.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const studentClassName = typeof currentUser?.classroom === 'object' && currentUser?.classroom !== null
    ? (currentUser.classroom.name || currentUser.classroom_name || '-')
    : (currentUser?.classroom || currentUser?.classroom_name || '-');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  useEffect(() => {
    const fetchPortalData = async () => {
      try {
        if (fetchPackages) {
          await fetchPackages();
        }
        const sessions = await getSessionsApi();
        if (sessions && sessions.length > 0) {
          setAvailableSessions(sessions);
        }
      } catch (err) {
        console.warn('Gagal sinkronisasi data sesi & paket:', err);
      }
    };
    fetchPortalData();
  }, []);

  const formatDateTimeIndo = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '-';
    const dateFormatted = d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    const timeFormatted = d.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    });
    return `${dateFormatted}, ${timeFormatted} WIB`;
  };

  const getScheduleStatus = (session) => {
    if (!session) {
      return {
        status: 'NO_SESSION',
        canStart: false,
        badgeText: 'Belum Terjadwal',
        btnText: 'BELUM TERJADWAL',
        timeText: 'Belum ada jadwal sesi asesmen dari pengawas',
        alertMessage: 'Ujian ini belum dijadwalkan oleh guru pengawas.',
      };
    }

    const myAttempt = session.my_attempt;
    const isRemedial = Boolean(myAttempt?.is_remedial_allowed);
    const isSubmitted = myAttempt?.status === 'SUBMITTED' || Boolean(myAttempt?.finished_at);

    // 1. Cek apakah siswa sudah selesai dan belum dibuka remidi oleh Guru
    if (isSubmitted && !isRemedial) {
      return {
        status: 'COMPLETED',
        canStart: false,
        badgeText: 'Sudah Dikerjakan',
        btnText: 'SUDAH DIKERJAKAN',
        timeText: myAttempt.total_score !== null && myAttempt.total_score !== undefined
          ? `Nilai Akhir: ${myAttempt.total_score} • Selesai Dikerjakan`
          : 'Ujian selesai dan jawaban telah tersimpan resmi',
        alertMessage: 'Anda sudah menyelesaikan ujian ini dan lembar jawaban Anda telah tersimpan secara resmi. Pengerjaan ulang hanya dapat dilakukan jika Guru Pengawas membuka akses remidi untuk Anda.',
      };
    }

    // 2. Jika akses remidi terbuka oleh Guru
    if (isRemedial) {
      const prevScoreText = myAttempt?.previous_score !== null && myAttempt?.previous_score !== undefined
        ? `Nilai Awal: ${myAttempt.previous_score} • Diambil Nilai Tertinggi`
        : 'Akses Remidi Diizinkan Guru Pengawas';
      return {
        status: 'REMEDIAL',
        canStart: true,
        badgeText: 'Remidi Terbuka',
        btnText: 'KERJAKAN REMIDI',
        timeText: prevScoreText,
        alertMessage: null,
      };
    }

    const now = new Date();
    const startTime = session.start_time || session.startTime;
    const endTime = session.end_time || session.endTime;

    if (startTime) {
      const sDate = new Date(startTime);
      if (!isNaN(sDate.getTime()) && now < sDate) {
        return {
          status: 'UPCOMING',
          canStart: false,
          badgeText: 'Belum Dibuka',
          btnText: 'BELUM DIBUKA',
          timeText: `Dibuka Mulai: ${formatDateTimeIndo(startTime)}`,
          alertMessage: `Ujian belum dibuka! Jadwal pengerjaan baru akan dimulai pada ${formatDateTimeIndo(startTime)}.`,
        };
      }
    }

    if (endTime) {
      const eDate = new Date(endTime);
      if (!isNaN(eDate.getTime()) && now > eDate) {
        return {
          status: 'CLOSED',
          canStart: false,
          badgeText: 'Telah Ditutup',
          btnText: 'SOAL DITUTUP',
          timeText: `Telah Berakhir: ${formatDateTimeIndo(endTime)}`,
          alertMessage: `Ujian ini telah selesai dan resmi ditutup pada ${formatDateTimeIndo(endTime)}. Anda tidak dapat memulai pengerjaan lagi.`,
        };
      }
    }

    return {
      status: 'ACTIVE',
      canStart: true,
      badgeText: 'Sedang Berjalan',
      btnText: 'MULAI UJIAN',
      timeText: endTime ? `Batas Pengerjaan: ${formatDateTimeIndo(endTime)}` : 'Sesi Ujian Aktif',
      alertMessage: null,
    };
  };

  const handleStartExam = (pkg, schedule, matchingSession) => {
    if (!schedule.canStart) {
      setPortalAlert(schedule.alertMessage || 'Ujian tidak dapat dibuka saat ini.');
      setTimeout(() => setPortalAlert(''), 6000);
      return;
    }

    setPortalAlert('');
    setSelectedPackage(pkg);

    if (matchingSession) {
      setSessionId(matchingSession.id, matchingSession.supervisor_pin || matchingSession.supervisorPin || '');
    }

    // Arahkan ke halaman kredensial Password Masuk khusus mapel yang dipilih
    navigate('/student/gatekeeper');
  };

  return (
    <div className="min-h-screen bg-[#F4FFFC] text-zinc-800 flex flex-col justify-between select-none relative overflow-x-hidden antialiased font-sans">
      {/* ======================================================== */}
      {/* 1. TOP HEADER BAR (EXECUTIVE GREEN SCREEN NAVBAR)         */}
      {/* ======================================================== */}
      <header className="bg-gradient-to-r from-[#102919] via-[#143820] to-[#1F4B2C] border-b border-[#1F4B2C] px-4 sm:px-8 py-3.5 flex items-center justify-between sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white p-1.5 flex items-center justify-center shadow-lg ring-2 ring-[#91EAAF]/40 shrink-0">
            <img 
              src={logoSdMis} 
              alt="Logo SD Mentari Islamic School" 
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <div className="font-black text-sm sm:text-base text-white tracking-tight flex items-center gap-2">
              <span>SD MENTARI ISLAMIC SCHOOL</span>
              <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded-full bg-[#C3E956] text-[#0A1D11] shadow-xs hidden sm:inline-block">
                NPSN: 70047473
              </span>
              <button
                type="button"
                onClick={() => navigate('/student/profile')}
                title="Pengaturan Profil Akun Siswa"
                className="p-1 sm:p-1.5 rounded-lg bg-[#0A1D11]/70 hover:bg-[#0A1D11] text-[#91EAAF] hover:text-[#C3E956] border border-[#1F4B2C] transition shadow-xs group cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5 group-hover:rotate-45 transition-transform duration-300" />
              </button>
            </div>
            <div 
              onClick={() => navigate('/student/profile')}
              title="Klik untuk membuka Pengaturan Profil"
              className="text-xs text-[#91EAAF] truncate max-w-[200px] sm:max-w-md cursor-pointer hover:text-white transition font-medium"
            >
              {currentUser?.fullName} • Kelas {studentClassName} (NISN: {currentUser?.username})
            </div>
          </div>
        </div>

        {/* Live Digital Clock & Logout Button */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0A1D11]/80 border border-[#C3E956]/40 font-mono text-xs font-bold text-[#C3E956] tabular-nums shadow-xs">
            <Clock className="w-3.5 h-3.5 text-[#C3E956]" />
            <span>{timeString} WIB</span>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#0A1D11]/80 hover:bg-rose-950/60 hover:text-rose-300 border border-[#1F4B2C] text-xs font-semibold text-[#F4FFFC] transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Keluar</span>
          </button>
        </div>
      </header>

      {/* ======================================================== */}
      {/* 2. MAIN CONTENT AREA                                     */}
      {/* ======================================================== */}
      <main className="flex-1 max-w-3xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col justify-center space-y-5 z-10">
        {/* Navigation & Header Status Bar */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/student/lobby')}
            className="flex items-center gap-2 text-xs font-bold text-[#1F4B2C] hover:text-[#102919] transition-all px-3.5 py-2 rounded-xl bg-white border-2 border-[#91EAAF]/60 shadow-xs hover:border-[#1F4B2C] active:scale-[0.98] cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-[#1F4B2C]" />
            <span>Kembali ke Lobby</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs px-3 py-1.5 rounded-xl bg-white text-[#1F4B2C] border-2 border-[#91EAAF]/60 font-bold flex items-center gap-1.5 shadow-xs">
              {activeAttempt.screenOrientation === 'LANDSCAPE' ? (
                <Monitor className="w-4 h-4 text-[#4D7111]" />
              ) : (
                <Smartphone className="w-4 h-4 text-[#4D7111]" />
              )}
              <span>Orientasi: {activeAttempt.screenOrientation}</span>
            </span>
          </div>
        </div>

        {/* Big Title Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#102919] border border-[#C3E956]/30 text-[#C3E956] text-xs font-bold shadow-xs">
            <Lock className="w-3.5 h-3.5 text-[#C3E956]" />
            <span>Ruang Ujian Terproteksi — Kelas {studentClassName}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#102919] tracking-tight">
            Portal Asesmen — Pilih Mata Pelajaran
          </h1>
          <p className="text-xs sm:text-sm text-zinc-600 max-w-lg mx-auto leading-relaxed">
            Klik mata pelajaran di bawah ini untuk memulai pengerjaan. Layar perangkat Anda akan langsung dikunci otomatis dalam mode <strong className="text-[#102919] font-bold">Layar Penuh (Fullscreen)</strong>.
          </p>
        </div>

        {/* Warning Callout Box */}
        <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 text-amber-950 text-xs flex items-start gap-3.5 shadow-xs">
          <div className="p-2 rounded-xl bg-amber-500 text-white shrink-0 mt-0.5 shadow-xs">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="space-y-1 leading-relaxed">
            <div className="font-black text-amber-950 text-xs sm:text-sm">
              Peringatan Keamanan Asesmen:
            </div>
            <p className="text-amber-900 text-xs">
              Setelah tombol mata pelajaran diklik, dilarang menekan tombol ESC, berpindah tab, meminimalkan aplikasi, atau menyentuh tombol navigasi. Segala aktivitas keluar layar akan membekukan lembar ujian dan tercatat otomatis pada <strong>E-Jurnal Guru Pengawas</strong>.
            </p>
          </div>
        </div>

        {/* Real-time Schedule Alert / Notification Banner */}
        {portalAlert && (
          <div className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-300 text-rose-950 text-xs flex items-start gap-3.5 shadow-xs animate-shake">
            <div className="p-2 rounded-xl bg-rose-600 text-white shrink-0 mt-0.5 shadow-xs">
              <AlertCircle className="w-4 h-4" />
            </div>
            <div className="space-y-1">
              <div className="font-black text-rose-950 text-xs sm:text-sm">Pemberitahuan Akses Jadwal Ujian:</div>
              <p className="text-rose-900 text-xs leading-relaxed">{portalAlert}</p>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* LIST TOMBOL MATA PELAJARAN (TACTILE GREEN SCREEN CARDS)  */}
        {/* ======================================================== */}
        <div className="space-y-3.5">
          {examPackages.map((pkg) => {
            const isSelected = launchingPackageId === pkg.id;
            const isNative = pkg.examType === 'NATIVE_QUESTIONS';

            // Pencarian Sesi Ujian yang presisi (Prioritas ID Paket & Judul, cegah false-match sesama mata pelajaran)
            let matchingSession = availableSessions.find((s) => {
              const sPkgId = typeof s.package === 'object' ? s.package?.id : (s.package || s.packageId || s.exam_package);
              return sPkgId && String(sPkgId) === String(pkg.id);
            });

            if (!matchingSession && pkg.title) {
              const cleanPkgTitle = pkg.title.trim().toLowerCase();
              matchingSession = availableSessions.find((s) => {
                const sTitle = (s.title || s.package_title || s.package?.title || '').trim().toLowerCase();
                return sTitle && sTitle === cleanPkgTitle;
              });
            }

            if (!matchingSession && pkg.title) {
              const cleanPkgTitle = pkg.title.trim().toLowerCase();
              matchingSession = availableSessions.find((s) => {
                const sTitle = (s.title || s.package_title || s.package?.title || '').trim().toLowerCase();
                return sTitle && (sTitle.includes(cleanPkgTitle) || cleanPkgTitle.includes(sTitle));
              });
            }

            if (!matchingSession && pkg.subjectName) {
              const cleanSubj = pkg.subjectName.trim().toLowerCase();
              const sameSubjectSessions = availableSessions.filter((s) => {
                const sSubj = (s.subject_name || s.subjectName || s.package?.subject_name || '').trim().toLowerCase();
                return sSubj === cleanSubj;
              });
              if (sameSubjectSessions.length === 1) {
                matchingSession = sameSubjectSessions[0];
              }
            }

            const schedule = getScheduleStatus(matchingSession);

            return (
              <div
                key={pkg.id}
                onClick={() => handleStartExam(pkg, schedule, matchingSession)}
                className={`w-full group relative text-left p-4 sm:p-5 rounded-2xl border-2 transition-all duration-150 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 overflow-hidden ${
                  !schedule.canStart
                    ? schedule.status === 'COMPLETED'
                      ? 'border-emerald-300 bg-emerald-50/60 cursor-pointer hover:border-emerald-400'
                      : schedule.status === 'CLOSED'
                      ? 'border-zinc-200 bg-zinc-100/70 opacity-75 cursor-not-allowed'
                      : 'border-amber-200 bg-amber-50/50 opacity-80 cursor-not-allowed'
                    : 'border-[#91EAAF]/70 hover:border-[#1F4B2C] bg-white hover:shadow-md cursor-pointer hover:-translate-y-0.5 active:scale-[0.99]'
                }`}
              >
                <div className="flex items-start sm:items-center gap-3.5 sm:gap-4 flex-1 min-w-0">
                  {/* Icon Box */}
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border transition-transform group-hover:scale-105 shadow-xs ${
                      !schedule.canStart
                        ? schedule.status === 'COMPLETED'
                          ? 'bg-emerald-600 text-white border-emerald-700'
                          : schedule.status === 'CLOSED'
                          ? 'bg-zinc-200 text-zinc-500 border-zinc-300'
                          : 'bg-amber-100 text-amber-700 border-amber-300'
                        : schedule.status === 'REMEDIAL'
                        ? 'bg-amber-500 text-white border-amber-600'
                        : 'bg-gradient-to-br from-[#102919] to-[#1F4B2C] text-[#C3E956] border-[#1F4B2C]'
                    }`}
                  >
                    {schedule.status === 'COMPLETED' ? (
                      <CheckCircle className="w-6 h-6 text-white" />
                    ) : schedule.status === 'REMEDIAL' ? (
                      <RotateCcw className="w-6 h-6 text-white" />
                    ) : !schedule.canStart ? (
                      <Lock className="w-5 h-5" />
                    ) : isNative ? (
                      <BookOpen className="w-6 h-6 text-[#C3E956]" />
                    ) : (
                      <ExternalLink className="w-6 h-6 text-[#C3E956]" />
                    )}
                  </div>

                  {/* Title & Badge */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`text-sm sm:text-base font-black uppercase tracking-tight transition ${
                        schedule.status === 'COMPLETED'
                          ? 'text-emerald-900'
                          : schedule.status === 'REMEDIAL'
                          ? 'text-amber-900'
                          : !schedule.canStart 
                          ? 'text-zinc-600' 
                          : 'text-[#102919] group-hover:text-[#1F4B2C]'
                      }`}>
                        {pkg.subjectName}
                      </span>
                      
                      {/* Type Badge */}
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#E1F8ED] text-[#1F4B2C] border border-[#91EAAF]">
                        {isNative ? 'Soal Mandiri' : 'Google Form'}
                      </span>

                      {/* Schedule Status Badge */}
                      {schedule.status === 'COMPLETED' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3 text-emerald-600" />
                          <span>Sudah Dikerjakan</span>
                        </span>
                      )}
                      {schedule.status === 'REMEDIAL' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1 animate-pulse">
                          <RotateCcw className="w-3 h-3 text-amber-600" />
                          <span>Remidi Terbuka</span>
                        </span>
                      )}
                      {schedule.status === 'CLOSED' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 text-rose-600" />
                          <span>Telah Ditutup</span>
                        </span>
                      )}
                      {schedule.status === 'UPCOMING' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-600" />
                          <span>Belum Dibuka</span>
                        </span>
                      )}
                      {schedule.status === 'ACTIVE' && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-[#C3E956] text-[#0A1D11] border border-[#4D7111]/30 flex items-center gap-1 shadow-2xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#0A1D11] animate-ping" />
                          <span>Sedang Berjalan</span>
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-zinc-600 font-medium line-clamp-1">
                      {pkg.title}
                    </p>

                    {/* Schedule Time Information */}
                    <div className={`text-[11px] flex items-center gap-1.5 mt-1 font-mono font-bold tabular-nums ${
                      schedule.status === 'COMPLETED'
                        ? 'text-emerald-700'
                        : schedule.status === 'REMEDIAL'
                        ? 'text-amber-800'
                        : schedule.status === 'CLOSED'
                        ? 'text-rose-700'
                        : schedule.status === 'UPCOMING'
                        ? 'text-amber-700'
                        : 'text-[#1F4B2C]'
                    }`}>
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      <span>{schedule.timeText}</span>
                    </div>
                  </div>
                </div>

                {/* Action Button & Status Indicator */}
                <div className="flex items-center gap-2.5 shrink-0 sm:self-center">
                  {schedule.canStart ? (
                    <button
                      type="button"
                      disabled={isLaunching}
                      className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#C3E956] hover:bg-[#d4f76b] text-[#0A1D11] font-black text-xs uppercase tracking-wider shadow-md border border-[#4D7111]/20 transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      <span>{schedule.btnText || 'MULAI UJIAN'}</span>
                      <ArrowRight className="w-4 h-4 text-[#0A1D11] group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  ) : schedule.status === 'COMPLETED' ? (
                    <div className="px-3 py-1.5 rounded-xl bg-[#E1F8ED] border border-[#91EAAF] text-[#1F4B2C] text-xs font-bold flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4 text-[#1F4B2C]" />
                      <span>Selesai Dikerjakan</span>
                    </div>
                  ) : (
                    <div className="px-3 py-1.5 rounded-xl bg-zinc-200 border border-zinc-300 text-zinc-600 text-xs font-bold flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-zinc-500" />
                      <span>{schedule.btnText}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* ======================================================== */}
      {/* 3. FOOTER                                                */}
      {/* ======================================================== */}
      <footer className="border-t border-[#91EAAF]/50 bg-white/90 px-4 py-3 text-center text-xs text-[#1F4B2C] font-semibold backdrop-blur-sm z-10 flex items-center justify-center gap-2 shadow-xs shrink-0">
        <ShieldCheck className="w-4 h-4 text-[#1F4B2C]" />
        <span>Sesi Asesmen Diawasi oleh Pengawas Ruang Ujian & Sistem Anti-Cheat SD Mentari Islamic School</span>
      </footer>
    </div>
  );
}
