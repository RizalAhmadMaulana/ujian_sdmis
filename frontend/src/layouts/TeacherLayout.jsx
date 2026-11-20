import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useExamStore } from '../store/useExamStore';
import { fetchCurrentUserApi } from '../api/authApi';
import { 
  LayoutDashboard, 
  School,
  Users,
  FolderKanban, 
  CalendarClock, 
  Radio, 
  FileSpreadsheet, 
  Building2, 
  Settings,
  LogOut, 
  Menu, 
  X, 
  ShieldCheck, 
  UserCheck, 
  GraduationCap, 
  ShieldAlert, 
  Bell,
  FileCheck,
  Award 
} from 'lucide-react';
import WelcomeProfileModal from '../components/modals/WelcomeProfileModal';
import logoSdMis from '../assets/logo sd mis.png';

export default function TeacherLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const { currentUser, logout, proctoringStudents, schoolSettings, fetchSchoolSettings } = useExamStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchSchoolSettings?.();
    fetchCurrentUserApi?.().then((user) => {
      if (user) {
        useExamStore.getState().setCurrentUser(user);

        const isDismissed = sessionStorage.getItem('dismiss_profile_welcome_modal') === 'true';
        if (!isDismissed && user.needs_profile_completion) {
          setShowWelcomeModal(true);
        }
      }
    }).catch(() => {});
  }, [fetchSchoolSettings]);

  // Hitung jumlah siswa yang sedang terkunci akibat pelanggaran
  const lockedStudentsCount = proctoringStudents.filter(
    (s) => s.status === 'LOCKED_VIOLATION'
  ).length;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { 
      to: '/teacher/dashboard', 
      label: 'Dashboard', 
      icon: LayoutDashboard 
    },
    { 
      to: '/teacher/classrooms', 
      label: 'Data Kelas / Rombel', 
      icon: School 
    },
    { 
      to: '/teacher/teachers', 
      label: 'Data Guru', 
      icon: UserCheck 
    },
    { 
      to: '/teacher/students', 
      label: 'Data Siswa', 
      icon: GraduationCap 
    },
    { 
      to: '/teacher/users', 
      label: 'Manajemen Pengguna', 
      icon: Users 
    },
    { 
      to: '/teacher/packages', 
      label: 'Bank Soal & Paket Ujian', 
      icon: FolderKanban 
    },
    { 
      to: '/teacher/sessions', 
      label: 'Jadwal & Sesi Ujian', 
      icon: CalendarClock 
    },
    { 
      to: '/teacher/proctoring', 
      label: 'Live Proctoring', 
      icon: Radio, 
      badge: lockedStudentsCount > 0 ? `${lockedStudentsCount} Terkunci` : null,
      isAlert: lockedStudentsCount > 0 
    },
    { 
      to: '/teacher/grading', 
      label: 'Koreksi Esai', 
      icon: FileCheck 
    },
    { 
      to: '/teacher/results', 
      label: 'Rekap Nilai Siswa', 
      icon: Award 
    },
    { 
      to: '/teacher/violations', 
      label: 'Riwayat Pelanggaran', 
      icon: ShieldAlert 
    },
    { 
      to: '/teacher/ejournal', 
      label: 'E-Jurnal Ujian', 
      icon: FileSpreadsheet 
    },
    { 
      to: '/teacher/settings', 
      label: 'Pengaturan Sekolah', 
      icon: Building2 
    },
  ];

  return (
    <div className="min-h-screen bg-[#F4FFFC] flex flex-col md:flex-row text-zinc-800">
      {/* ======================================================== */}
      {/* MOBILE HEADER BAR */}
      {/* ======================================================== */}
      <div className="md:hidden bg-[#0E2416] text-[#F4FFFC] flex items-center justify-between px-4 py-3 border-b border-[#1F4B2C]/80 sticky top-0 z-40 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white p-1 flex items-center justify-center shadow-xs ring-1 ring-[#91EAAF]/40 shrink-0">
            <img src={logoSdMis} alt="Logo SDMIS" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="font-bold text-xs tracking-tight text-white">SD MENTARI ISLAMIC SCHOOL</div>
            <div className="text-[10px] font-mono text-[#C3E956] uppercase tracking-wider font-semibold">Guru Pengawas</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {lockedStudentsCount > 0 && (
            <button
              onClick={() => navigate('/teacher/proctoring')}
              className="px-2 py-1 rounded bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[11px] font-medium flex items-center gap-1 animate-pulse"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>{lockedStudentsCount}</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => navigate('/teacher/profile')}
            title="Pengaturan Profil Akun"
            className="p-1.5 rounded-lg bg-[#143820] border border-[#1F4B2C] text-[#91EAAF] hover:text-[#C3E956] transition"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-1.5 rounded-lg bg-[#143820] border border-[#1F4B2C] text-[#91EAAF] hover:text-[#C3E956] transition"
          >
            {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SIDEBAR NAVIGATION (Desktop & Mobile Drawer) */}
      {/* ======================================================== */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-60 bg-[#0E2416] text-[#F4FFFC]/80 flex flex-col border-r border-[#1F4B2C]/80 shadow-xl transform transition-transform duration-200 ease-in-out md:static md:translate-x-0 ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand / Logo */}
        <div className="p-4 border-b border-[#1F4B2C]/80 flex items-center justify-between bg-[#0A1D11]/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white p-1.5 flex items-center justify-center shadow-md ring-1 ring-[#91EAAF]/40 shrink-0">
              <img src={logoSdMis} alt="Logo SDMIS" className="w-full h-full object-contain" />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-white text-xs tracking-tight truncate max-w-[130px]">SD MENTARI</div>
              <div className="text-[10px] font-mono text-[#C3E956] uppercase tracking-wider font-semibold">Portal Pengawas</div>
            </div>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="md:hidden text-[#91EAAF] hover:text-[#C3E956] p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-2.5 space-y-1 overflow-y-auto">
          <div className="px-2.5 py-1 text-[10px] font-mono font-semibold uppercase tracking-wider text-[#91EAAF]/60">
            Menu Utama
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-[#1F4B2C] text-[#C3E956] font-bold border border-[#C3E956]/40 shadow-xs'
                      : 'hover:bg-[#143820] hover:text-[#C3E956] text-[#F4FFFC]/75'
                  }`
                }
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon className="w-4 h-4 shrink-0 transition-colors" />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded border ${
                    item.isAlert
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                      : 'bg-[#143820] text-[#C3E956] border-[#C3E956]/30'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* User Profile Card */}
        <div className="p-2.5 border-t border-[#1F4B2C]/80 bg-[#0A1D11]/90">
          <div className="flex items-center justify-between p-2 rounded-lg bg-[#143820]/70 border border-[#1F4B2C]">
            <div 
              onClick={() => {
                setIsMobileMenuOpen(false);
                navigate('/teacher/profile');
              }}
              className="flex items-center gap-2 overflow-hidden cursor-pointer hover:opacity-90 transition"
              title="Buka Pengaturan Profil"
            >
              <div className="w-7 h-7 rounded-md bg-[#1F4B2C] border border-[#C3E956]/40 flex items-center justify-center text-[#C3E956] font-bold text-xs shrink-0">
                {currentUser?.fullName?.charAt(0) || currentUser?.username?.charAt(0) || 'G'}
              </div>
              <div className="overflow-hidden min-w-0">
                <div className="text-xs font-semibold text-white truncate">
                  {currentUser?.fullName || currentUser?.full_name || currentUser?.username || 'Guru Pengawas'}
                </div>
                <div className="text-[10px] font-mono text-[#91EAAF]/80 truncate">
                  {currentUser?.nip || currentUser?.username || '-'}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  navigate('/teacher/profile');
                }}
                title="Pengaturan Profil Akun"
                className="p-1 text-[#91EAAF] hover:text-[#C3E956] hover:bg-[#1F4B2C] rounded transition"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleLogout}
                title="Keluar dari Akun"
                className="p-1 text-[#91EAAF] hover:text-rose-400 hover:bg-[#1F4B2C] rounded transition"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Backdrop for Mobile */}
      {isMobileMenuOpen && (
        <div
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden"
        />
      )}

      {/* ======================================================== */}
      {/* MAIN CONTENT AREA WITH DESKTOP TOP BAR */}
      {/* ======================================================== */}
      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto bg-[#F4FFFC]">
        {/* Desktop Header */}
        <header className="hidden md:flex bg-white/95 backdrop-blur-md border-b border-[#91EAAF]/35 px-6 py-3 items-center justify-between sticky top-0 z-30 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-[#F4FFFC] text-[#1F4B2C] border border-[#91EAAF]/50">
              {schoolSettings?.name || 'SD MENTARI ISLAMIC SCHOOL'}
            </span>
            <span className="text-[#91EAAF]">•</span>
            <span className="text-xs text-[#4D7111] font-semibold flex items-center gap-1.5 bg-[#C3E956]/15 px-2.5 py-0.5 rounded-full border border-[#C3E956]/40">
              <span className="w-1.5 h-1.5 rounded-full bg-[#C3E956] animate-pulse" />
              Zero-Tolerance Lockdown Aktif
            </span>
          </div>

          <div className="flex items-center gap-3">
            {lockedStudentsCount > 0 && (
              <button
                onClick={() => navigate('/teacher/proctoring')}
                className="px-2.5 py-1 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-1.5 hover:bg-rose-100 transition animate-pulse"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                <span>{lockedStudentsCount} Siswa Terkunci</span>
              </button>
            )}

            <div className="flex items-center gap-2.5 pl-3 border-l border-[#91EAAF]/40">
              <button
                type="button"
                onClick={() => navigate('/teacher/profile')}
                title="Pengaturan Profil & Akun"
                className="p-1.5 text-zinc-600 hover:text-[#1F4B2C] hover:bg-[#F4FFFC] rounded-md border border-zinc-200 hover:border-[#91EAAF]/60 transition group"
              >
                <Settings className="w-3.5 h-3.5 group-hover:rotate-45 transition-transform duration-200" />
              </button>

              <div 
                onClick={() => navigate('/teacher/profile')}
                className="text-right cursor-pointer hover:opacity-85 transition"
                title="Buka Pengaturan Profil Akun"
              >
                <div className="text-xs font-bold text-[#1F4B2C] leading-tight">
                  {currentUser?.fullName || currentUser?.full_name || currentUser?.username || 'Guru Pengawas'}
                </div>
                <div className="text-[10px] text-zinc-500 font-mono font-medium">Guru Pengawas Ujian</div>
              </div>

              <button
                onClick={handleLogout}
                title="Keluar"
                className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </header>

        {/* Content Outlet */}
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
          <Outlet />
        </main>
      </div>

      {/* Pop Up Lengkapi Profil / Ganti Kata Sandi Bawaan Pertama Kali Login */}
      {showWelcomeModal && currentUser && (
        <WelcomeProfileModal
          user={currentUser}
          onClose={() => setShowWelcomeModal(false)}
        />
      )}
    </div>
  );
}
