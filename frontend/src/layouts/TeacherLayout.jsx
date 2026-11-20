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
  Award,
  Sparkles,
  ChevronRight
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

  const navGroups = [
    {
      groupLabel: 'Utama',
      items: [
        { to: '/teacher/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { 
          to: '/teacher/proctoring', 
          label: 'Live Proctoring', 
          icon: Radio, 
          badge: lockedStudentsCount > 0 ? `${lockedStudentsCount} Terkunci` : null,
          isAlert: lockedStudentsCount > 0 
        },
      ]
    },
    {
      groupLabel: 'Asesmen & Nilai',
      items: [
        { to: '/teacher/packages', label: 'Bank Soal & Paket Ujian', icon: FolderKanban },
        { to: '/teacher/sessions', label: 'Jadwal & Sesi Ujian', icon: CalendarClock },
        { to: '/teacher/grading', label: 'Koreksi Esai', icon: FileCheck },
        { to: '/teacher/results', label: 'Rekap Nilai Siswa', icon: Award },
        { to: '/teacher/violations', label: 'Riwayat Pelanggaran', icon: ShieldAlert },
        { to: '/teacher/ejournal', label: 'E-Jurnal Ujian', icon: FileSpreadsheet },
      ]
    },
    {
      groupLabel: 'Master Data & Sekolah',
      items: [
        { to: '/teacher/classrooms', label: 'Data Kelas / Rombel', icon: School },
        { to: '/teacher/teachers', label: 'Data Guru', icon: UserCheck },
        { to: '/teacher/students', label: 'Data Siswa', icon: GraduationCap },
        { to: '/teacher/users', label: 'Manajemen Pengguna', icon: Users },
        { to: '/teacher/settings', label: 'Pengaturan Sekolah', icon: Building2 },
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#EBF7CD] via-[#E2F4B8] to-[#D9F0A5] flex flex-col md:flex-row text-[#102919] antialiased font-sans">
      {/* ======================================================== */}
      {/* MOBILE HEADER BAR */}
      {/* ======================================================== */}
      <div className="md:hidden bg-[#102919] text-[#EFF9CE] flex items-center justify-between px-4 py-3 border-b-2 border-[#1F4B2C] sticky top-0 z-40 shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#EFF9CE] border border-[#8BC829]/50 p-1 flex items-center justify-center shadow-xs ring-1 ring-[#C3E956]/50 shrink-0">
            <img src={logoSdMis} alt="Logo SDMIS" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="font-extrabold text-xs tracking-tight text-white leading-tight">SD MENTARI ISLAMIC SCHOOL</div>
            <div className="text-[10px] font-mono text-[#C3E956] uppercase tracking-wider font-bold">Portal Pengawas</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {lockedStudentsCount > 0 && (
            <button
              onClick={() => navigate('/teacher/proctoring')}
              className="px-2 py-1 rounded-lg bg-rose-500/20 border border-rose-500/50 text-rose-300 text-[11px] font-bold flex items-center gap-1 animate-pulse"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>{lockedStudentsCount}</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => navigate('/teacher/profile')}
            title="Pengaturan Profil Akun"
            className="p-1.5 rounded-lg bg-[#143820] border border-[#1F4B2C] text-[#C3E956] hover:bg-[#1F4B2C] transition"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-1.5 rounded-lg bg-[#143820] border border-[#1F4B2C] text-[#C3E956] hover:bg-[#1F4B2C] transition"
          >
            {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SIDEBAR NAVIGATION (Executive Green Screen Theme)       */}
      {/* ======================================================== */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-gradient-to-b from-[#102919] via-[#0E2416] to-[#0A1D11] text-[#EFF9CE] flex flex-col border-r-2 border-[#1F4B2C] shadow-2xl transform transition-transform duration-200 ease-in-out md:static md:translate-x-0 ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand / School Header */}
        <div className="p-4 border-b border-[#1F4B2C]/80 bg-[#0A1D11]/70">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#EFF9CE] border border-[#8BC829]/50 p-1.5 flex items-center justify-center shadow-lg ring-2 ring-[#C3E956]/40 shrink-0">
                <img src={logoSdMis} alt="Logo SDMIS" className="w-full h-full object-contain" />
              </div>
              <div className="min-w-0">
                <div className="font-black text-white text-xs tracking-tight truncate">SD MENTARI</div>
                <div className="text-[10px] font-bold text-[#C3E956] uppercase tracking-wider">ISLAMIC SCHOOL</div>
                <div className="text-[9px] font-mono text-[#91EAAF]/70 mt-0.5">NPSN: 70047473</div>
              </div>
            </div>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="md:hidden text-[#91EAAF] hover:text-[#C3E956] p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* School Tagline Pill */}
          <div className="mt-2.5 px-2.5 py-1 rounded-lg bg-[#143820]/80 border border-[#1F4B2C] flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-[#C3E956] shrink-0" />
            <span className="text-[10px] font-bold text-[#C3E956] truncate">Digital Mind, Islamic Heart</span>
          </div>
        </div>

        {/* Navigation Items (Grouped with High Contrast & Signature Chartreuse Active Pill) */}
        <nav className="flex-1 px-3 py-3 space-y-4 overflow-y-auto custom-scrollbar">
          {navGroups.map((group, gIdx) => (
            <div key={gIdx} className="space-y-1">
              <div className="px-3 py-1 text-[10px] font-mono font-bold uppercase tracking-widest text-[#91EAAF]/60">
                {group.groupLabel}
              </div>
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `group relative flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 ${
                        isActive
                          ? 'bg-[#C3E956] text-[#0A1D11] font-black shadow-md shadow-[#C3E956]/20'
                          : 'text-[#EFF9CE]/85 hover:bg-[#1F4B2C]/70 hover:text-white'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Icon className={`w-4 h-4 shrink-0 transition-colors ${
                            isActive ? 'text-[#0A1D11]' : 'text-[#91EAAF] group-hover:text-[#C3E956]'
                          }`} />
                          <span className="truncate">{item.label}</span>
                        </div>
                        {item.badge ? (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            item.isAlert
                              ? 'bg-rose-500 text-white border-rose-600 animate-pulse'
                              : isActive
                              ? 'bg-[#0A1D11] text-[#C3E956] border-[#0A1D11]'
                              : 'bg-[#143820] text-[#C3E956] border-[#C3E956]/30'
                          }`}>
                            {item.badge}
                          </span>
                        ) : (
                          isActive && (
                            <ChevronRight className="w-3.5 h-3.5 text-[#0A1D11]/70 shrink-0" />
                          )
                        )}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User Profile Card at Sidebar Bottom */}
        <div className="p-3 border-t border-[#1F4B2C] bg-[#0A1D11]/90">
          <div className="flex items-center justify-between p-2 rounded-xl bg-[#143820]/80 border border-[#1F4B2C]/80 shadow-xs">
            <div 
              onClick={() => {
                setIsMobileMenuOpen(false);
                navigate('/teacher/profile');
              }}
              className="flex items-center gap-2.5 overflow-hidden cursor-pointer hover:opacity-90 transition flex-1 min-w-0"
              title="Buka Pengaturan Profil Akun"
            >
              <div className="w-8 h-8 rounded-lg bg-[#1F4B2C] border border-[#C3E956]/50 flex items-center justify-center text-[#C3E956] font-black text-xs shrink-0 shadow-xs">
                {currentUser?.fullName?.charAt(0) || currentUser?.username?.charAt(0) || 'G'}
              </div>
              <div className="overflow-hidden min-w-0">
                <div className="text-xs font-bold text-white truncate">
                  {currentUser?.fullName || currentUser?.full_name || currentUser?.username || 'Guru Pengawas'}
                </div>
                <div className="text-[10px] font-mono text-[#C3E956] truncate">
                  {currentUser?.nip || currentUser?.username || 'NIP: -'}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0 ml-1">
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  navigate('/teacher/profile');
                }}
                title="Pengaturan Profil"
                className="p-1.5 text-[#91EAAF] hover:text-[#C3E956] hover:bg-[#1F4B2C] rounded-lg transition"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleLogout}
                title="Keluar dari Akun"
                className="p-1.5 text-[#91EAAF] hover:text-rose-400 hover:bg-[#1F4B2C] rounded-lg transition"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Backdrop for Mobile Drawer */}
      {isMobileMenuOpen && (
        <div
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-xs md:hidden"
        />
      )}

      {/* ======================================================== */}
      {/* MAIN CONTENT AREA WITH DESKTOP TOP BAR */}
      {/* ======================================================== */}
      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto bg-gradient-to-b from-[#EBF7CD] via-[#E2F4B8] to-[#D9F0A5]">
        {/* Desktop Header */}
        <header className="hidden md:flex bg-[#EFF9CE]/95 backdrop-blur-md border-b-2 border-[#8BC829] px-6 py-3 items-center justify-between sticky top-0 z-30 shadow-xs">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-black px-3 py-1.5 rounded-xl bg-[#E2F4B4] text-[#102919] border-2 border-[#8BC829] shadow-xs flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#102919]" />
              {schoolSettings?.name || 'SD MENTARI ISLAMIC SCHOOL'}
            </span>
            <span className="text-[#8BC829] font-black">•</span>
            <span className="text-xs text-[#0A1D11] font-black flex items-center gap-1.5 bg-[#C3E956] px-3 py-1.5 rounded-xl border-2 border-[#4D7111]/30 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-[#0A1D11] animate-pulse" />
              Zero-Tolerance Lockdown Aktif
            </span>
          </div>

          <div className="flex items-center gap-3">
            {lockedStudentsCount > 0 && (
              <button
                onClick={() => navigate('/teacher/proctoring')}
                className="px-3 py-1 rounded-lg bg-rose-100 border-2 border-rose-300 text-rose-900 text-xs font-black flex items-center gap-1.5 hover:bg-rose-200 transition animate-pulse"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-rose-700" />
                <span>{lockedStudentsCount} Siswa Terkunci</span>
              </button>
            )}

            <div className="flex items-center gap-3 pl-3 border-l-2 border-[#8BC829]">
              <button
                type="button"
                onClick={() => navigate('/teacher/profile')}
                title="Pengaturan Profil & Akun"
                className="p-2 text-[#102919] hover:text-[#0A1D11] bg-[#E2F4B4] hover:bg-[#C3E956] rounded-xl border-2 border-[#8BC829] transition group"
              >
                <Settings className="w-4 h-4 group-hover:rotate-45 transition-transform duration-200" />
              </button>

              <div 
                onClick={() => navigate('/teacher/profile')}
                className="text-right cursor-pointer hover:opacity-85 transition"
                title="Buka Pengaturan Profil Akun"
              >
                <div className="text-xs font-black text-[#102919] leading-tight">
                  {currentUser?.fullName || currentUser?.full_name || currentUser?.username || 'Guru Pengawas'}
                </div>
                <div className="text-[10px] text-[#102919]/70 font-mono font-bold">Guru Pengawas Ujian</div>
              </div>

              <button
                onClick={handleLogout}
                title="Keluar"
                className="p-2 text-[#102919] hover:text-rose-700 bg-[#E2F4B4] hover:bg-rose-100 rounded-xl border-2 border-[#8BC829] hover:border-rose-300 transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Content Outlet */}
        <main className="flex-1">
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
