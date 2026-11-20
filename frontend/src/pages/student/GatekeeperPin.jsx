import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExamStore } from '../../store/useExamStore';
import { getSessionsApi, verifyEntryPasswordApi, startExamAttemptApi } from '../../api/examApi';
import { isValidEntryToken } from '../../utils/tokenGenerator';
import logoSdMis from '../../assets/logo sd mis.png';
import { 
  ShieldCheck, 
  KeyRound, 
  ArrowRight, 
  ArrowLeft, 
  AlertCircle, 
  LogOut, 
  Pin, 
  CheckCircle2, 
  GraduationCap, 
  BookOpen, 
  ExternalLink, 
  Clock, 
  Settings,
  Sparkles
} from 'lucide-react';

export default function GatekeeperPin() {
  const navigate = useNavigate();
  const { 
    verifyEntryPassword, 
    currentUser, 
    logout, 
    examSessions, 
    examPackages,
    activeAttempt,
    setAttemptId,
    setSessionId,
    schoolSettings, 
    fetchSchoolSettings 
  } = useExamStore();

  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [showPinnedToast, setShowPinnedToast] = useState(false);
  const [availableSessions, setAvailableSessions] = useState(examSessions);

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

  // Deteksi perangkat iOS (iPhone / iPad) yang tidak mendukung Fullscreen DOM API
  const isIOSDevice = () => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent || '';
    const platform = navigator.platform || '';
    const isDirectIOS = /iPad|iPhone|iPod/i.test(ua);
    const isMacTouch = (platform === 'MacIntel' || /Macintosh/i.test(ua)) && navigator.maxTouchPoints > 1;
    const isAppleVendorTouch = (navigator.vendor && navigator.vendor.includes('Apple')) && 
      ('ontouchstart' in window || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0));
    const isAppleStandalone = 'standalone' in navigator;
    return Boolean(isDirectIOS || isMacTouch || isAppleVendorTouch || isAppleStandalone);
  };

  // Ambil paket ujian terpilih dari state aktif
  const selectedPackage = activeAttempt?.selectedPackage || examPackages[0];

  useEffect(() => {
    // Jika tidak ada paket ujian terpilih dan tidak ada paket di store, kembali ke portal mapel
    if (!activeAttempt?.selectedPackage && (!examPackages || examPackages.length === 0)) {
      navigate('/student/subjects');
      return;
    }

    fetchSchoolSettings?.();
    const fetchSessions = async () => {
      try {
        const sessions = await getSessionsApi();
        if (sessions && sessions.length > 0) {
          setAvailableSessions(sessions);
        }
      } catch (err) {
        console.warn('Gagal ambil sesi backend, pakai store:', err);
      }
    };
    fetchSessions();
  }, [fetchSchoolSettings, activeAttempt?.selectedPackage, examPackages, navigate]);

  // Cari sesi ujian yang cocok dengan mata pelajaran yang dipilih (Prioritas ID Paket & Judul)
  const targetSession = React.useMemo(() => {
    // 1. Cocokkan ID Paket Soal secara langsung
    if (selectedPackage?.id) {
      const byPkg = availableSessions.find(s => {
        const sPkgId = typeof s.package === 'object' ? s.package?.id : (s.package || s.packageId || s.exam_package);
        return sPkgId && String(sPkgId) === String(selectedPackage.id);
      });
      if (byPkg) return byPkg;
    }

    // 2. Cocokkan Judul Paket
    if (selectedPackage?.title) {
      const cleanPkgTitle = selectedPackage.title.trim().toLowerCase();
      const byTitle = availableSessions.find(s => {
        const sTitle = (s.title || s.package_title || s.package?.title || '').trim().toLowerCase();
        return sTitle && sTitle === cleanPkgTitle;
      });
      if (byTitle) return byTitle;
    }

    // 3. Cocokkan activeAttempt.sessionId jika ada di availableSessions dan relevan
    if (activeAttempt?.sessionId) {
      const byId = availableSessions.find(s => s.id === activeAttempt.sessionId);
      if (byId) return byId;
    }

    // 4. Fallback jika ada tepat 1 sesi dengan mata pelajaran sama
    if (selectedPackage?.subjectName) {
      const cleanSubj = selectedPackage.subjectName.trim().toLowerCase();
      const sameSubj = availableSessions.filter(s => {
        const sSubj = (s.subject_name || s.subjectName || s.package?.subject_name || '').trim().toLowerCase();
        return sSubj === cleanSubj;
      });
      if (sameSubj.length === 1) return sameSubj[0];
    }

    return availableSessions[0] || examSessions[0];
  }, [availableSessions, selectedPackage, activeAttempt?.sessionId, examSessions]);

  const isNative = selectedPackage?.examType === 'NATIVE_QUESTIONS';

  const isAlreadySubmitted = Boolean(
    (targetSession?.my_attempt?.status === 'SUBMITTED' || Boolean(targetSession?.my_attempt?.finished_at)) &&
    !targetSession?.my_attempt?.is_remedial_allowed
  );

  const handleVerifyAndStart = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (isAlreadySubmitted) {
      setErrorMsg('Anda sudah menyelesaikan ujian ini dan lembar jawaban Anda telah tersimpan secara resmi. Pengerjaan ulang hanya dapat dilakukan jika Guru Pengawas membuka akses remidi untuk Anda.');
      return;
    }
    setErrorMsg('');
    const inputPin = pin.trim().toUpperCase().replace(/\s+/g, '');

    if (!inputPin) {
      setErrorMsg(`Password Masuk wajib diisi untuk memulai ujian ${selectedPackage?.subjectName || ''}!`);
      return;
    }

    // 1. PANGGIL FULLSCREEN SEGERA PADA USER GESTURE SINKRON (Sebelum Async Network Calls)
    if (!isIOSDevice()) {
      try {
        const docEl = document.documentElement;
        if (docEl.requestFullscreen) {
          docEl.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
        } else if (docEl.webkitRequestFullscreen) {
          docEl.webkitRequestFullscreen();
        }
      } catch (_) {}
    }

    setIsChecking(true);

    try {
      let verified = false;

      // Smart Session Resolution: cari apakah token yang diketik siswa cocok dengan salah satu sesi aktif
      let currentTargetSession = targetSession;
      const tokenMatchedSession = availableSessions.find(s => {
        const baseTok = s.entry_password || s.entryPassword || '';
        return isValidEntryToken(s.id, inputPin, baseTok);
      });

      if (tokenMatchedSession) {
        currentTargetSession = tokenMatchedSession;
        const matchingPkg = examPackages.find(p => {
          const sPkgId = typeof tokenMatchedSession.package === 'object' ? tokenMatchedSession.package?.id : (tokenMatchedSession.package || tokenMatchedSession.packageId || tokenMatchedSession.exam_package);
          return (sPkgId && String(p.id) === String(sPkgId)) ||
                 (tokenMatchedSession.title && p.title && tokenMatchedSession.title.toLowerCase() === p.title.toLowerCase()) ||
                 (tokenMatchedSession.package_title && p.title && tokenMatchedSession.package_title.toLowerCase() === p.title.toLowerCase());
        });
        if (matchingPkg) {
          useExamStore.getState().setSelectedPackage(matchingPkg);
        }
      }

      let sessId = currentTargetSession?.id || activeAttempt?.sessionId;

      // 1. Verifikasi Password Masuk ke Backend Django
      if (sessId && sessId.length > 10) {
        setSessionId(sessId, currentTargetSession?.supervisor_pin || currentTargetSession?.supervisorPin || '');
        try {
          const apiRes = await verifyEntryPasswordApi(sessId, inputPin);
          if (apiRes && apiRes.success) {
            verified = true;
            if (apiRes.session_id) {
              sessId = apiRes.session_id;
            }
            if (apiRes.package_id) {
              const pkgFromApi = examPackages.find(p => String(p.id) === String(apiRes.package_id));
              if (pkgFromApi) {
                useExamStore.getState().setSelectedPackage(pkgFromApi);
              }
            }
          }
        } catch (apiErr) {
          console.warn('API verifyEntryPassword fallback ke lokal token validator:', apiErr);
          if (apiErr.response?.data?.status_code === 'ALREADY_SUBMITTED' || apiErr.response?.data?.message?.includes('sudah menyelesaikan')) {
            setIsChecking(false);
            setErrorMsg(apiErr.response.data.message);
            return;
          }
          if (apiErr.response?.data?.message) {
            setErrorMsg(apiErr.response.data.message);
          }
        }
      }

      // 2. Fallback verifikasi lokal store & dynamic token generator (jika offline/mock)
      if (!verified) {
        const baseToken = currentTargetSession?.entry_password || currentTargetSession?.entryPassword || '';
        const isValidDynamic = isValidEntryToken(sessId, inputPin, baseToken);
        const storeRes = verifyEntryPassword(inputPin);
        if (isValidDynamic || storeRes.success) {
          verified = true;
          setErrorMsg('');
        }
      }

      if (!verified) {
        setIsChecking(false);
        setErrorMsg((prev) => prev || `Token Masuk tidak valid atau sudah kedaluwarsa! Token ujian diperbarui secara otomatis setiap 10 menit. Silakan minta token terbaru kepada pengawas.`);
        return;
      }

      // 3. Berhasil diverifikasi: Daftarkan attempt siswa di backend & persist ke store/storage
      const targetOrientation = activeAttempt.screenOrientation || localStorage.getItem('exam_screen_orientation') || 'PORTRAIT';
      if (sessId) {
        useExamStore.getState().setSessionId(sessId, currentTargetSession?.supervisor_pin || currentTargetSession?.supervisorPin || '');
      }

      if (sessId && sessId.length > 10) {
        try {
          const attemptRes = await startExamAttemptApi(sessId, targetOrientation, true);
          if (attemptRes && attemptRes.attempt_id) {
            setAttemptId(attemptRes.attempt_id, attemptRes.violation_count ?? 0);
          }
        } catch (attemptErr) {
          console.warn('Backend startAttempt fallback ke lokal attempt:', attemptErr);
          if (attemptErr.response?.data?.error) {
            setIsChecking(false);
            setErrorMsg(attemptErr.response.data.error);
            return;
          }
        }
      }

      // Pastikan status terkunci dari sesi sebelumnya di-reset secara mutlak
      useExamStore.setState((state) => {
        const updated = {
          ...state.activeAttempt,
          isLocked: false,
          _lastViolationLockTime: null,
        };
        try {
          localStorage.setItem('exam_active_attempt', JSON.stringify(updated));
        } catch (_) {}
        return { activeAttempt: updated };
      });

      // 3. Tampilkan toast Screen Pinned & Kunci Layar Penuh (Fullscreen)
      setShowPinnedToast(true);

      if (!isIOSDevice()) {
        try {
          if (document.activeElement && typeof document.activeElement.blur === 'function') {
            document.activeElement.blur();
          }
          const docEl = document.documentElement;
          if (docEl.requestFullscreen) {
            await docEl.requestFullscreen({ navigationUI: 'hide' });
          } else if (docEl.webkitRequestFullscreen) {
            await docEl.webkitRequestFullscreen();
          } else if (docEl.mozRequestFullScreen) {
            await docEl.mozRequestFullScreen();
          } else if (docEl.msRequestFullscreen) {
            await docEl.msRequestFullscreen();
          }
        } catch (fullErr) {
          console.warn('Fullscreen request blocked or not user-gesture triggered:', fullErr);
        }
      }

      // 4. Kunci Orientasi Layar Sesuai Pilihan Siswa (PORTRAIT / LANDSCAPE)
      if (window.screen && window.screen.orientation && window.screen.orientation.lock) {
        try {
          if (targetOrientation === 'PORTRAIT') {
            await window.screen.orientation.lock('portrait-primary').catch(() => window.screen.orientation.lock('portrait').catch(() => {}));
          } else if (targetOrientation === 'LANDSCAPE') {
            await window.screen.orientation.lock('landscape-primary').catch(() => window.screen.orientation.lock('landscape').catch(() => {}));
          }
        } catch (orientErr) {
          console.warn('Orientation lock error:', orientErr);
        }
      }

      // 5. Masuk ke Arena Ujian Sesungguhnya
      setTimeout(() => {
        navigate('/student/exam-workspace');
      }, 700);

    } catch (err) {
      console.warn('Verifikasi password gagal:', err);
      setIsChecking(false);
      const backendMsg = err.response?.data?.message || err.response?.data?.error;
      setErrorMsg(backendMsg || `Password Masuk salah untuk mata pelajaran ${selectedPackage?.subjectName || 'ini'}! Silakan minta token ke pengawas.`);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#F4FFFC] text-zinc-800 flex flex-col justify-between overflow-y-auto select-none relative antialiased font-sans">
      {/* ======================================================== */}
      {/* 1. TOP HEADER BAR (EXECUTIVE GREEN SCREEN NAVBAR)         */}
      {/* ======================================================== */}
      <header className="bg-gradient-to-r from-[#102919] via-[#143820] to-[#1F4B2C] border-b border-[#1F4B2C] px-4 sm:px-8 py-3.5 flex items-center justify-between sticky top-0 z-30 shadow-md shrink-0">
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
      {/* TOAST NOTIFIKASI: APLIKASI DIPASANGI PIN (SCREEN PINNED) */}
      {/* ======================================================== */}
      {showPinnedToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-bounce">
          <div className="px-5 py-3 rounded-2xl bg-[#102919] border-2 border-[#C3E956] shadow-2xl text-white flex items-center gap-3 backdrop-blur-md">
            <div className="w-8 h-8 rounded-xl bg-[#C3E956] text-[#0A1D11] flex items-center justify-center shrink-0 shadow-xs">
              <Pin className="w-4 h-4 fill-[#0A1D11]" />
            </div>
            <div>
              <div className="text-xs font-black text-[#C3E956] tracking-wide uppercase">
                Aplikasi Dipasangi Pin (Screen Pinned)
              </div>
              <div className="text-xs text-[#91EAAF] font-medium">
                Mode Penguncian Ujian Aktif — Membuka Lembar Asesmen...
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. MAIN CONTENT AREA (CLEAN CENTERED CARD)              */}
      {/* ======================================================== */}
      <main className="flex-1 flex flex-col justify-center items-center px-4 py-6 sm:py-10 relative z-10">
        {/* Header Identitas Sekolah & ExamBrowser Branding */}
        <div className="max-w-md w-full text-center mb-4 z-10 space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white p-2 shadow-md ring-2 ring-[#91EAAF]/40 mx-auto mb-1">
            <img 
              src={logoSdMis} 
              alt="Logo SD Mentari Islamic School" 
              className="w-full h-full object-contain"
            />
          </div>
          <div className="text-xs font-black uppercase tracking-widest text-[#1F4B2C]">
            SD MENTARI ISLAMIC SCHOOL
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-[#102919] tracking-tight">
            PORTAL E-UJIAN ANTI-CHEAT
          </h1>
          <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#C3E956]/20 border border-[#C3E956]/40 text-[#4D7111] font-bold text-xs">
            <Sparkles className="w-3.5 h-3.5" />
            <span>'Digital Mind, Islamic Heart' • NPSN: 70047473</span>
          </div>
        </div>

        {/* Main Card Form */}
        <div className="max-w-md w-full bg-white border-2 border-[#91EAAF]/70 rounded-3xl p-5 sm:p-7 shadow-lg z-10 space-y-4">
          {/* 1. Identitas Peserta Siswa */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-[#E1F8ED] border border-[#91EAAF]/60">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#102919] to-[#1F4B2C] text-[#C3E956] flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs sm:text-sm font-black text-[#102919] truncate">
                  {currentUser?.fullName || 'Peserta Asesmen'}
                </div>
                <div className="text-[11px] text-[#1F4B2C] font-semibold truncate">
                  NISN: {currentUser?.username || '-'} • Kelas: {studentClassName}
                </div>
              </div>
            </div>
            <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-[#C3E956] text-[#0A1D11] border border-[#4D7111]/30 shrink-0 ml-2 shadow-2xs">
              Terverifikasi
            </span>
          </div>

          {/* 2. Kartu Informasi Mata Pelajaran Terpilih */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-[#F4FFFC] border-2 border-[#91EAAF]/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#102919] text-[#C3E956]">
                Mata Pelajaran Terpilih
              </span>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-white text-[#1F4B2C] border border-[#91EAAF] flex items-center gap-1 font-mono">
                <Clock className="w-3.5 h-3.5 text-[#4D7111]" />
                {targetSession?.durationMinutes || targetSession?.duration_minutes || selectedPackage?.durationMinutes || 60} Menit
              </span>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-base sm:text-lg font-black text-[#102919] tracking-tight uppercase truncate">
                  {selectedPackage?.subjectName || targetSession?.subjectName || 'Mata Pelajaran'}
                </h2>
                <p className="text-xs text-zinc-600 font-medium truncate">
                  {selectedPackage?.title || targetSession?.title || 'Paket Ujian'}
                </p>
              </div>
              <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-[#102919] text-[#C3E956] border border-[#1F4B2C] shrink-0 flex items-center gap-1">
                {isNative ? <BookOpen className="w-3.5 h-3.5" /> : <ExternalLink className="w-3.5 h-3.5" />}
                <span>{isNative ? 'Soal Mandiri' : 'Google Form'}</span>
              </span>
            </div>
          </div>

          {/* 3. Status Sistem: Layar Akan Dipasangi Pin */}
          <div className="p-3 rounded-2xl bg-amber-50 border border-amber-300 text-xs text-amber-950 flex items-center gap-2.5">
            <Pin className="w-4 h-4 text-amber-700 shrink-0" />
            <span className="leading-tight">
              Layar perangkat akan <strong className="font-black text-amber-950">dikunci otomatis (Fullscreen)</strong> saat Anda mengklik Mulai Ujian.
            </span>
          </div>

          {/* Error Alert Box */}
          {errorMsg && (
            <div className="p-3 rounded-2xl bg-rose-50 border-2 border-rose-300 text-xs text-rose-950 flex items-start gap-2.5 animate-shake">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span className="leading-tight font-bold">{errorMsg}</span>
            </div>
          )}

          {/* 4. Input Form Pin / Password Masuk ATAU State Sudah Dikerjakan */}
          {isAlreadySubmitted ? (
            <div className="p-5 rounded-2xl bg-emerald-50 border-2 border-emerald-300 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-black text-emerald-950">Ujian Telah Selesai Dikerjakan</h3>
                <p className="text-xs text-zinc-700 leading-relaxed">
                  Anda sudah menyelesaikan ujian ini dan lembar jawaban Anda telah tersimpan secara resmi di portal guru pengawas.
                  {targetSession?.my_attempt?.total_score !== null && targetSession?.my_attempt?.total_score !== undefined && (
                    <span className="block mt-2 text-emerald-700 font-mono font-black text-base">
                      Nilai Asesmen: {targetSession.my_attempt.total_score}
                    </span>
                  )}
                </p>
                <p className="text-[11px] text-zinc-500 pt-1">
                  Pengerjaan ulang hanya dapat dilakukan jika Guru Pengawas membuka akses remidi melalui menu Rekap Nilai Siswa.
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/student/subjects')}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-95"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Kembali ke Portal Mapel</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-black text-[#102919] uppercase tracking-wider flex items-center gap-1.5">
                    <KeyRound className="w-4 h-4 text-[#1F4B2C]" /> Password Masuk Ujian
                  </label>
                  <span className="text-[11px] text-zinc-500 font-medium">Dari Guru Pengawas</span>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    required
                    autoFocus
                    autoComplete="one-time-code"
                    autoCorrect="off"
                    autoCapitalize="characters"
                    spellCheck="false"
                    role="presentation"
                    data-lpignore="true"
                    data-form-type="other"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.toUpperCase())}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleVerifyAndStart(e);
                      }
                    }}
                    placeholder="CONTOH: MSK-2JM4"
                    className="w-full text-center text-lg sm:text-xl font-mono font-black tracking-widest py-3 px-4 bg-[#F4FFFC] border-2 border-[#91EAAF] rounded-2xl text-[#102919] placeholder-zinc-400 focus:outline-none focus:border-[#1F4B2C] uppercase transition shadow-inner"
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-zinc-500 mt-1.5 px-1 font-mono">
                  <span>Huruf Besar / Angka</span>
                  <span className="text-[#4D7111] font-bold">Minta token ke guru pengawas</span>
                </div>
              </div>

              {/* Tombol Utama: MULAI UJIAN */}
              <button
                type="button"
                onClick={handleVerifyAndStart}
                disabled={isChecking || showPinnedToast}
                className="w-full py-3.5 px-5 bg-[#C3E956] hover:bg-[#d4f76b] text-[#0A1D11] font-black rounded-2xl text-xs sm:text-sm shadow-md border border-[#4D7111]/20 transition flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] cursor-pointer"
              >
                {isChecking ? (
                  <div className="w-5 h-5 border-2 border-[#0A1D11]/30 border-t-[#0A1D11] rounded-full animate-spin" />
                ) : (
                  <>
                    <span>MULAI UJIAN</span>
                    <ArrowRight className="w-4 h-4 text-[#0A1D11]" />
                  </>
                )}
              </button>
            </div>
          )}

          {/* Footer Card: Tombol Kembali & Status Keamanan */}
          <div className="pt-3 border-t border-[#91EAAF]/50 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={() => navigate('/student/subjects')}
              className="text-[#1F4B2C] hover:text-[#102919] flex items-center gap-1.5 transition font-bold cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Kembali
            </button>
            <div className="flex items-center gap-1.5 text-[#4D7111] font-black text-xs">
              <CheckCircle2 className="w-3.5 h-3.5" /> Zero-Tolerance Active
            </div>
          </div>
        </div>
      </main>

      {/* ======================================================== */}
      {/* 3. FOOTER                                                */}
      {/* ======================================================== */}
      <footer className="border-t border-[#91EAAF]/50 bg-white/90 px-4 py-3 text-center text-xs text-[#1F4B2C] font-semibold backdrop-blur-sm z-10 shrink-0 flex items-center justify-center gap-2 shadow-xs">
        <ShieldCheck className="w-4 h-4 text-[#1F4B2C]" />
        <span>Sesi Asesmen Diawasi oleh Pengawas Ruang Ujian & Sistem Anti-Cheat SD Mentari Islamic School</span>
      </footer>
    </div>
  );
}
