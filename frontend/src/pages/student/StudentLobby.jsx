import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExamStore } from '../../store/useExamStore';
import { fetchCurrentUserApi } from '../../api/authApi';
import Modal from '../../components/common/Modal';
import WelcomeProfileModal from '../../components/modals/WelcomeProfileModal';
import logoSdMis from '../../assets/logo sd mis.png';
import { 
  FileText, 
  Calendar, 
  Info, 
  LogOut, 
  Smartphone, 
  Monitor, 
  ArrowRight, 
  ShieldAlert,
  GraduationCap,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Ban,
  ShieldCheck,
  CalendarCheck,
  Layers,
  Lock,
  Settings,
  Sparkles,
  MapPin,
  ChevronRight,
  BookOpen,
  Award
} from 'lucide-react';

export default function StudentLobby() {
  const navigate = useNavigate();
  const { 
    currentUser, 
    setScreenOrientation, 
    logout, 
    examSessions, 
    fetchSessions,
    schoolSettings, 
    fetchSchoolSettings 
  } = useExamStore();

  // Modals State
  const [isOrientationModalOpen, setIsOrientationModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);

  // Digital Clock Real-Time State
  const [currentTime, setCurrentTime] = useState(new Date());

  const studentClassName = typeof currentUser?.classroom === 'object' && currentUser?.classroom !== null
    ? (currentUser.classroom.name || currentUser.classroom_name || '-')
    : (currentUser?.classroom || currentUser?.classroom_name || '-');

  useEffect(() => {
    fetchSchoolSettings?.();
    fetchSessions?.();
    
    // Pengecekan profil akun siswa saat pertama kali masuk lobby
    fetchCurrentUserApi?.().then((user) => {
      if (user) {
        useExamStore.getState().setCurrentUser(user);

        const isDismissed = sessionStorage.getItem('dismiss_profile_welcome_modal') === 'true';
        if (!isDismissed && user.needs_profile_completion) {
          setShowWelcomeModal(true);
        }
      }
    }).catch(() => {});

    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, [fetchSchoolSettings, fetchSessions]);

  // Helper Format Rentang Jadwal (Tanggal & Jam Mulai hingga Berakhir)
  const formatScheduleRange = (session) => {
    const startTimeStr = session.start_time || session.startTime;
    const endTimeStr = session.end_time || session.endTime;

    if (!startTimeStr && !endTimeStr) {
      return 'Jadwal Belum Ditentukan';
    }

    const sTime = startTimeStr ? new Date(startTimeStr) : null;
    const eTime = endTimeStr ? new Date(endTimeStr) : null;

    const isValid = (d) => d && !isNaN(d.getTime());

    if (!isValid(sTime) && !isValid(eTime)) {
      return `${startTimeStr || ''} - ${endTimeStr || ''} WIB`;
    }

    const formatDate = (d) => d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    const formatTime = (d) => d.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    });

    if (isValid(sTime) && isValid(eTime)) {
      const isSameDate = sTime.toDateString() === eTime.toDateString();
      if (isSameDate) {
        return `${formatDate(sTime)}, ${formatTime(sTime)} s/d ${formatTime(eTime)} WIB`;
      }
      return `${formatDate(sTime)} ${formatTime(sTime)} s/d ${formatDate(eTime)} ${formatTime(eTime)} WIB`;
    }

    if (isValid(sTime)) {
      return `Mulai: ${formatDate(sTime)} ${formatTime(sTime)} WIB`;
    }

    return `Selesai: ${formatDate(eTime)} ${formatTime(eTime)} WIB`;
  };

  // Helper Status Sesi Ujian (Aktif / Belum Dibuka / Selesai / Terjadwal)
  const getScheduleStatus = (session) => {
    const startTimeStr = session.start_time || session.startTime;
    const endTimeStr = session.end_time || session.endTime;
    const now = currentTime.getTime();

    const sTime = startTimeStr ? new Date(startTimeStr) : null;
    const eTime = endTimeStr ? new Date(endTimeStr) : null;

    // 1. Cek apakah sesi sudah melewati waktu berakhir
    if (eTime && !isNaN(eTime.getTime()) && now > eTime.getTime()) {
      return {
        status: 'EXPIRED',
        label: 'Sesi Selesai',
      };
    }

    // 2. Cek apakah sesi belum masuk waktu mulai
    if (sTime && !isNaN(sTime.getTime()) && now < sTime.getTime()) {
      return {
        status: 'UPCOMING',
        label: 'Belum Dibuka',
      };
    }

    // 3. Waktu dan tanggal sudah sesuai (sedang aktif) -> Sesi Dibuka
    return {
      status: 'ACTIVE',
      label: 'Sesi Dibuka',
    };
  };

  // Format Jam Digital Real-Time
  const hours = currentTime.getHours();
  const timeString = currentTime.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  // Ucapan Sapaan Berdasarkan Jam
  let greeting = 'Selamat Pagi';
  if (hours >= 11 && hours < 15) {
    greeting = 'Selamat Siang';
  } else if (hours >= 15 && hours < 18) {
    greeting = 'Selamat Sore';
  } else if (hours >= 18 || hours < 5) {
    greeting = 'Selamat Malam';
  }

  const handleSelectOrientation = (mode) => {
    setScreenOrientation(mode);
    setIsOrientationModalOpen(false);
    navigate('/student/subjects');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#EBF7CD] via-[#E2F4B8] to-[#D9F0A5] text-[#102919] flex flex-col justify-between select-none antialiased font-sans">
      {/* ======================================================== */}
      {/* 1. TOP HEADER BAR (EXECUTIVE GREEN SCREEN NAVBAR)         */}
      {/* ======================================================== */}
      <header className="bg-gradient-to-r from-[#102919] via-[#143820] to-[#1F4B2C] border-b-2 border-[#C3E956]/30 px-4 sm:px-8 py-3.5 flex items-center justify-between sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#EFF9CE] p-1.5 flex items-center justify-center shadow-lg ring-2 ring-[#C3E956]/60 shrink-0">
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
                className="p-1 sm:p-1.5 rounded-lg bg-[#0A1D11]/70 hover:bg-[#0A1D11] text-[#91EAAF] hover:text-[#C3E956] border border-[#1F4B2C] transition shadow-xs group"
              >
                <Settings className="w-3.5 h-3.5 group-hover:rotate-45 transition-transform duration-300" />
              </button>
            </div>
            <div 
              onClick={() => navigate('/student/profile')}
              title="Klik untuk membuka Pengaturan Profil"
              className="text-xs text-[#91EAAF] truncate max-w-[200px] sm:max-w-md cursor-pointer hover:text-[#C3E956] transition font-medium"
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
      {/* 2. MAIN CONTENT AREA (BERANDA AKTIVITAS ASESMEN SISWA)    */}
      {/* ======================================================== */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col justify-center space-y-7">
        {/* Banner Ucapan & Jam Real-Time Mobile */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#102919] border border-[#C3E956]/40 text-xs text-[#C3E956] font-black shadow-md">
            <span className="w-2.5 h-2.5 rounded-full bg-[#C3E956] animate-pulse" />
            <span>{greeting}, {currentUser?.fullName?.split(' ')[0] || 'Siswa'}!</span>
            <span className="sm:hidden font-mono">• {timeString} WIB</span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#102919] tracking-tight">
            Pusat Aktivitas Asesmen Digital Siswa
          </h2>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#102919] text-[#C3E956] font-black text-xs tracking-wide shadow-sm border border-[#C3E956]/30">
            <Sparkles className="w-4 h-4 text-[#C3E956]" />
            <span>'Digital Mind, Islamic Heart' • Zero-Tolerance Lockdown</span>
          </div>
          <p className="text-xs sm:text-sm text-[#1F4B2C] font-semibold max-w-lg mx-auto leading-relaxed pt-1">
            Pilihlah menu di bawah ini untuk memulai pengerjaan ujian terproteksi, memeriksa jadwal asesmen kelas Anda, atau membaca tata tertib integritas.
          </p>
        </div>

        {/* ======================================================== */}
        {/* GRID MENU UTAMA BERGAYA EXAMBROWSER (3 KARTU TAKTIL)      */}
        {/* ======================================================== */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* KARTU 1: E-UJIAN (MENU UTAMA PENGERJAAN SOAL) */}
          <div
            onClick={() => setIsOrientationModalOpen(true)}
            className="cursor-pointer group relative bg-[#EFF9CE] border-2 border-[#8BC829] hover:border-[#102919] rounded-3xl p-6 transition-all duration-200 shadow-md hover:shadow-2xl hover:-translate-y-1 flex flex-col justify-between overflow-hidden"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-[#102919] border-2 border-[#C3E956]/50 flex items-center justify-center text-[#C3E956] transition-transform group-hover:scale-105 shadow-md">
                  <FileText className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-[#C3E956] text-[#0A1D11] border border-[#4D7111]/30 shadow-xs">
                  Menu Utama
                </span>
              </div>
              <h3 className="text-xl font-black text-[#102919] group-hover:text-[#1F4B2C] transition tracking-tight">
                E-UJIAN
              </h3>
              <p className="text-xs text-[#1F4B2C] font-medium mt-2.5 leading-relaxed">
                Masuk ke ruang pengerjaan asesmen mandiri AKM atau form eksternal dalam proteksi layar penuh terkunci (<em>Zero-Tolerance Lockdown</em>).
              </p>
            </div>

            <div className="mt-6 pt-4 border-t-2 border-[#8BC829]/40">
              <div className="w-full py-2.5 px-4 rounded-xl bg-[#C3E956] group-hover:bg-[#b8e337] text-[#0A1D11] font-black text-xs transition flex items-center justify-between shadow-md border border-[#4D7111]/30 active:scale-[0.98]">
                <span>Buka Ruang Ujian</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>

          {/* KARTU 2: JADWAL ASESMEN KELAS */}
          <div
            onClick={() => setIsScheduleModalOpen(true)}
            className="cursor-pointer group bg-[#EFF9CE] border-2 border-[#8BC829] hover:border-[#102919] rounded-3xl p-6 transition-all duration-200 shadow-md hover:shadow-2xl hover:-translate-y-1 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-[#E2F4B4] border-2 border-[#8BC829] flex items-center justify-center text-[#1F4B2C] transition-transform group-hover:scale-105 shadow-xs">
                  <Calendar className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-[#E2F4B4] text-[#1F4B2C] border border-[#8BC829]">
                  Kelas {studentClassName}
                </span>
              </div>
              <h3 className="text-xl font-black text-[#102919] group-hover:text-[#1F4B2C] transition tracking-tight">
                JADWAL ASESMEN
              </h3>
              <p className="text-xs text-[#1F4B2C] font-medium mt-2.5 leading-relaxed">
                Lihat daftar jadwal sesi ujian aktif hari ini, mata pelajaran, serta durasi waktu alokasi pengerjaan asesmen resmi.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t-2 border-[#8BC829]/40">
              <div className="w-full py-2.5 px-4 rounded-xl bg-[#E2F4B4] hover:bg-[#D5EE9E] text-[#102919] border-2 border-[#8BC829] font-black text-xs transition flex items-center justify-between shadow-xs group-hover:border-[#102919]">
                <span>Lihat Jadwal Lengkap</span>
                <ArrowRight className="w-4 h-4 text-[#102919] group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>

          {/* KARTU 3: INFORMASI TATA TERTIB INTEGRITAS */}
          <div
            onClick={() => setIsRulesModalOpen(true)}
            className="cursor-pointer group bg-[#EFF9CE] border-2 border-[#8BC829] hover:border-[#102919] rounded-3xl p-6 transition-all duration-200 shadow-md hover:shadow-2xl hover:-translate-y-1 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-200/80 border-2 border-amber-400 flex items-center justify-center text-amber-900 transition-transform group-hover:scale-105 shadow-xs">
                  <Info className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-amber-300 text-amber-950 border border-amber-500">
                  Wajib Dipatuhi
                </span>
              </div>
              <h3 className="text-xl font-black text-[#102919] group-hover:text-[#1F4B2C] transition tracking-tight">
                TATA TERTIB UJIAN
              </h3>
              <p className="text-xs text-[#1F4B2C] font-medium mt-2.5 leading-relaxed">
                Ketahui protokol anti-curang, larangan membuka tab baru, perpindahan aplikasi, screenshot, dan pembekuan layar otomatis.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t-2 border-[#8BC829]/40">
              <div className="w-full py-2.5 px-4 rounded-xl bg-[#E2F4B4] hover:bg-[#D5EE9E] text-[#102919] border-2 border-[#8BC829] font-black text-xs transition flex items-center justify-between shadow-xs group-hover:border-[#102919]">
                <span>Baca Aturan & Protokol</span>
                <ArrowRight className="w-4 h-4 text-[#102919] group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer Info */}
      <footer className="py-4 text-center text-[#1F4B2C] font-semibold text-xs border-t-2 border-[#8BC829]/50 bg-[#E2F4B4]/80">
        <strong className="text-[#102919]">{schoolSettings?.name || 'SD Mentari Islamic School'}</strong> • Portal Asesmen Siswa Anti-Cheat Berbasis Web & ExamBrowser
      </footer>

      {/* ======================================================== */}
      {/* 3. MODAL PILIH ORIENTASI LAYAR (PORTRAIT / LANDSCAPE)     */}
      {/* ======================================================== */}
      <Modal
        isOpen={isOrientationModalOpen}
        onClose={() => setIsOrientationModalOpen(false)}
        title="Pilih Orientasi Layar Ujian"
        maxWidth="max-w-lg"
      >
        <div className="space-y-4">
          <p className="text-xs text-[#1F4B2C] font-semibold leading-relaxed">
            Pilihlah mode orientasi perangkat yang paling nyaman untuk mengerjakan soal. Tampilan lembar ujian akan menyesuaikan secara presisi:
          </p>

          <div className="grid grid-cols-2 gap-4">
            {/* Opsi Portrait */}
            <button
              onClick={() => handleSelectOrientation('PORTRAIT')}
              className="p-5 rounded-2xl border-2 border-[#8BC829] hover:border-[#102919] bg-[#E2F4B4] hover:bg-[#D5EE9E] flex flex-col items-center text-center transition hover:-translate-y-0.5 active:scale-[0.98] group shadow-sm cursor-pointer"
            >
              <div className="w-14 h-14 rounded-2xl bg-[#C3E956] border-2 border-[#8BC829] flex items-center justify-center text-[#0A1D11] mb-3 group-hover:bg-[#102919] group-hover:text-[#C3E956] transition-colors shadow-xs">
                <Smartphone className="w-7 h-7" />
              </div>
              <span className="font-black text-[#102919] text-sm tracking-tight">PORTRAIT</span>
              <span className="text-[11px] text-[#1F4B2C] font-medium mt-1">Mode Tegak (Smartphone)</span>
              <span className="mt-2.5 text-[10px] font-black px-2.5 py-0.5 rounded-full bg-[#C3E956] text-[#0A1D11] border border-[#4D7111]/30 shadow-2xs">
                Rekomendasi HP
              </span>
            </button>

            {/* Opsi Landscape */}
            <button
              onClick={() => handleSelectOrientation('LANDSCAPE')}
              className="p-5 rounded-2xl border-2 border-[#8BC829] hover:border-[#102919] bg-[#E2F4B4] hover:bg-[#D5EE9E] flex flex-col items-center text-center transition hover:-translate-y-0.5 active:scale-[0.98] group shadow-sm cursor-pointer"
            >
              <div className="w-14 h-14 rounded-2xl bg-[#C3E956] border-2 border-[#8BC829] flex items-center justify-center text-[#0A1D11] mb-3 group-hover:bg-[#102919] group-hover:text-[#C3E956] transition-colors shadow-xs">
                <Monitor className="w-7 h-7" />
              </div>
              <span className="font-black text-[#102919] text-sm tracking-tight">LANDSCAPE</span>
              <span className="text-[11px] text-[#1F4B2C] font-medium mt-1">Mode Mendatar (Tablet / PC)</span>
              <span className="mt-2.5 text-[10px] font-black px-2.5 py-0.5 rounded-full bg-[#C3E956] text-[#0A1D11] border border-[#4D7111]/30 shadow-2xs">
                Rekomendasi Laptop/Tab
              </span>
            </button>
          </div>

          <div className="p-4 rounded-2xl bg-[#E2F4B4] border-2 border-[#8BC829] text-[#102919] text-xs flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <span className="leading-relaxed">
              <strong>Penting:</strong> Setelah Anda memilih orientasi dan mengklik mata pelajaran, sistem akan langsung meminta <strong>Mode Layar Penuh (Fullscreen)</strong>. Jangan tekan tombol keluar atau berpindah tab!
            </span>
          </div>
        </div>
      </Modal>

      {/* ======================================================== */}
      {/* 4. MODAL JADWAL UJIAN AKTIF                               */}
      {/* ======================================================== */}
      <Modal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        title="Jadwal Asesmen Aktif Kelas Anda"
        maxWidth="max-w-xl"
      >
        <div className="space-y-3.5">
          <p className="text-xs text-[#1F4B2C] font-semibold">
            Daftar sesi ujian yang dijadwalkan untuk kelas <strong>{studentClassName}</strong>:
          </p>

          <div className="space-y-3 max-h-84 overflow-y-auto pr-0.5 custom-scrollbar">
            {examSessions.length === 0 ? (
              <div className="text-center py-8 text-[#1F4B2C] text-xs space-y-2">
                <Calendar className="w-8 h-8 text-[#4D7111] mx-auto" />
                <p>Belum ada jadwal sesi asesmen yang aktif untuk kelas Anda saat ini.</p>
              </div>
            ) : (
              examSessions.map((session) => {
                const scheduleRange = formatScheduleRange(session);
                const scheduleStatus = getScheduleStatus(session);

                return (
                  <div
                    key={session.id}
                    className="p-4 rounded-2xl border-2 border-[#8BC829] bg-[#E2F4B4] hover:bg-[#D5EE9E] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                  >
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-black px-2.5 py-0.5 rounded-md bg-[#EFF9CE] text-[#102919] border border-[#8BC829]">
                          {session.classroom_name || session.classroom || 'Semua Kelas'}
                        </span>
                        <span className="text-[10px] font-black px-2.5 py-0.5 rounded-md bg-[#C3E956] text-[#0A1D11] border border-[#4D7111]/30">
                          ⏱️ {session.duration_minutes || session.durationMinutes || 60} Menit
                        </span>
                      </div>
                      <h4 className="font-black text-[#102919] text-sm tracking-tight truncate">
                        {session.subject_name || session.subjectName || session.title}
                      </h4>
                      <div className="text-[11px] text-[#1F4B2C] font-semibold">
                        {scheduleRange}
                      </div>
                    </div>

                    <div className="shrink-0 self-start sm:self-center">
                      <span className={`text-[10px] font-black px-3 py-1 rounded-full border-2 ${
                        scheduleStatus.status === 'ACTIVE'
                          ? 'bg-[#C3E956] text-[#0A1D11] border-[#4D7111]/40'
                          : scheduleStatus.status === 'UPCOMING'
                          ? 'bg-[#EFF9CE] text-[#1F4B2C] border-[#8BC829]'
                          : 'bg-rose-100 text-rose-800 border-rose-300'
                      }`}>
                        {scheduleStatus.label}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={() => setIsScheduleModalOpen(false)}
              className="px-6 py-2.5 bg-[#C3E956] hover:bg-[#b6df3c] text-[#0A1D11] rounded-xl text-xs font-black transition shadow-md border border-[#4D7111]/30 cursor-pointer"
            >
              Tutup Jadwal
            </button>
          </div>
        </div>
      </Modal>

      {/* ======================================================== */}
      {/* 5. MODAL TATA TERTIB INTEGRITAS UJIAN                     */}
      {/* ======================================================== */}
      <Modal
        isOpen={isRulesModalOpen}
        onClose={() => setIsRulesModalOpen(false)}
        title="Tata Tertib & Protokol Integritas Asesmen"
        maxWidth="max-w-lg"
      >
        <div className="space-y-4 text-xs text-[#102919]">
          <div className="p-4 rounded-2xl bg-[#E2F4B4] border-2 border-rose-300 text-rose-900 font-semibold space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-black text-rose-800">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              <span>Sensor Anti-Cheat Aktif Selama Ujian:</span>
            </div>
            <p className="text-[11px] font-medium leading-relaxed">
              Seluruh aktivitas peramban diawasi otomatis oleh sistem. Pelanggaran akan mencatat jam, menit, detik kejadian, membekukan layar, dan disinkronkan ke E-Jurnal Guru Pengawas.
            </p>
          </div>

          <div className="space-y-2.5 leading-relaxed">
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[#E2F4B4] border-2 border-[#8BC829]">
              <span className="w-5 h-5 rounded-full bg-rose-200 text-rose-800 flex items-center justify-center font-black text-xs shrink-0 mt-0.5">✕</span>
              <div>
                <strong className="text-[#102919]">Dilarang Membuka Tab Baru / Minimalkan Browser:</strong>
                <p className="text-[11px] text-[#1F4B2C] mt-0.5">Berpindah tab atau aplikasi akan langsung membekukan layar pengerjaan.</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[#E2F4B4] border-2 border-[#8BC829]">
              <span className="w-5 h-5 rounded-full bg-rose-200 text-rose-800 flex items-center justify-center font-black text-xs shrink-0 mt-0.5">✕</span>
              <div>
                <strong className="text-[#102919]">Dilarang Keluar dari Mode Layar Penuh (ESC):</strong>
                <p className="text-[11px] text-[#1F4B2C] mt-0.5">Keluar mode fullscreen memicu alarm keamanan di ruang pengawas.</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[#E2F4B4] border-2 border-[#8BC829]">
              <span className="w-5 h-5 rounded-full bg-rose-200 text-rose-800 flex items-center justify-center font-black text-xs shrink-0 mt-0.5">✕</span>
              <div>
                <strong className="text-[#102919]">Dilarang Tangkapan Layar (Screenshot) / Rekam Layar:</strong>
                <p className="text-[11px] text-[#1F4B2C] mt-0.5">Fitur printscreen dan gesture rekam layar otomatis dinonaktifkan sistem.</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[#C3E956]/40 border-2 border-[#8BC829]">
              <span className="w-5 h-5 rounded-full bg-[#102919] text-[#C3E956] flex items-center justify-center font-black text-xs shrink-0 mt-0.5">✓</span>
              <div>
                <strong className="text-[#102919]">Prosedur Selesai Ujian:</strong>
                <p className="text-[11px] text-[#1F4B2C] font-semibold mt-0.5">Setelah seluruh jawaban terisi, klik tombol &quot;Selesai & Kirim Ujian&quot; untuk mengakhiri sesi pengerjaan.</p>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={() => setIsRulesModalOpen(false)}
              className="w-full py-3 bg-[#C3E956] hover:bg-[#b6df3c] text-[#0A1D11] font-black text-xs rounded-xl transition shadow-md border border-[#4D7111]/30 cursor-pointer active:scale-[0.98]"
            >
              Saya Mengerti & Siap Mematuhi Tata Tertib
            </button>
          </div>
        </div>
      </Modal>

      {/* Pop Up Lengkapi Profil Pertama Kali Login */}
      {showWelcomeModal && currentUser && (
        <WelcomeProfileModal
          user={currentUser}
          onClose={() => setShowWelcomeModal(false)}
        />
      )}
    </div>
  );
}
