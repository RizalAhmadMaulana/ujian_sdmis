import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExamStore } from '../../store/useExamStore';
import { loginApi } from '../../api/authApi';
import logoSdMis from '../../assets/logo sd mis.png';
import locMisPhoto from '../../assets/loc-mis.jpeg';
import { 
  ShieldCheck, 
  Lock, 
  User, 
  ArrowRight,
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle,
  MapPin,
  Sparkles,
  School,
  GraduationCap
} from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const { setCurrentUser, schoolSettings, fetchSchoolSettings } = useExamStore();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    fetchSchoolSettings?.();
    try {
      localStorage.removeItem('exam_active_attempt');
      localStorage.removeItem('exam_screen_orientation');
      sessionStorage.removeItem('exam_active_attempt');
    } catch (_) {}
  }, [fetchSchoolSettings]);

  const handleManualLogin = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMessage('Silakan masukkan NIP/NISN dan kata sandi Anda.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      try {
        localStorage.removeItem('exam_active_attempt');
        localStorage.removeItem('exam_screen_orientation');
        sessionStorage.removeItem('exam_active_attempt');
      } catch (_) {}

      const res = await loginApi(username.trim(), password.trim());
      if (res && res.user) {
        setCurrentUser({
          id: res.user.id,
          username: res.user.username,
          fullName: res.user.full_name,
          role: res.user.role,
          classroom: res.user.classroom_name,
          schoolName: schoolSettings?.name || 'SD MENTARI ISLAMIC SCHOOL',
        });

        if (res.user.role === 'TEACHER') {
          navigate('/teacher/dashboard');
        } else {
          navigate('/student/lobby');
        }
        return;
      }
    } catch (err) {
      console.warn('Login error:', err?.response?.data || err.message);
      if (err.response && (err.response.status === 401 || err.response.status === 400)) {
        setErrorMessage('NIP/NISN atau kata sandi tidak cocok. Silakan periksa kembali.');
      } else if (err.message === 'Network Error') {
        setErrorMessage('Koneksi ke server gagal. Pastikan server backend aktif.');
      } else {
        setErrorMessage('Terjadi kesalahan saat masuk. Silakan coba kembali.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A1D11] text-[#F4FFFC] flex flex-col justify-between selection:bg-[#C3E956]/30 relative overflow-x-hidden">
      {/* Background Architectural Grid Pattern */}
      <div 
        className="fixed inset-0 opacity-[0.035] pointer-events-none z-0"
        style={{
          backgroundImage: 'linear-gradient(to right, #91EAAF 1px, transparent 1px), linear-gradient(to bottom, #91EAAF 1px, transparent 1px)',
          backgroundSize: '48px 48px'
        }}
      />

      {/* Decorative Radial Lighting Glows with Green-Lime Screen Palette */}
      <div className="fixed top-0 left-1/4 w-[28rem] h-[28rem] bg-[#C3E956]/12 rounded-full blur-3xl pointer-events-none -translate-y-1/2 z-0" />
      <div className="fixed bottom-0 right-1/4 w-[28rem] h-[28rem] bg-[#91EAAF]/12 rounded-full blur-3xl pointer-events-none translate-y-1/2 z-0" />
      <div className="fixed top-1/2 right-10 w-80 h-80 bg-[#1F4B2C]/40 rounded-full blur-3xl pointer-events-none z-0" />

      {/* ============================================================ */}
      {/* 1. TOP NAVBAR / BRANDING BAR                                 */}
      {/* ============================================================ */}
      <header className="relative z-10 border-b border-[#1F4B2C]/80 bg-[#0E2416]/85 backdrop-blur-md px-4 sm:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white p-1.5 flex items-center justify-center shadow-md shadow-black/40 ring-1 ring-[#91EAAF]/30 shrink-0">
              <img 
                src={logoSdMis} 
                alt="Logo SD Mentari Islamic School" 
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <div className="font-bold text-sm sm:text-base text-white tracking-tight flex items-center gap-2">
                <span>SD MENTARI ISLAMIC SCHOOL</span>
                <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#C3E956]/15 text-[#C3E956] border border-[#C3E956]/40">
                  NPSN: 70047473
                </span>
              </div>
              <div className="text-[11px] text-[#91EAAF]/90 font-medium hidden sm:block">
                Sistem Evaluasi Asesmen & Ujian Berbasis Komputer (CBT)
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden sm:flex items-center gap-1.5 text-xs text-[#F4FFFC]/90 font-medium bg-[#143820]/80 px-3 py-1.5 rounded-lg border border-[#1F4B2C]">
              <span className="w-2 h-2 rounded-full bg-[#C3E956] animate-pulse" />
              <span>Portal Asesmen Aktif</span>
            </span>
            <div className="text-right sm:hidden">
              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#C3E956]/15 text-[#C3E956] border border-[#C3E956]/30">
                NPSN 70047473
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* ============================================================ */}
      {/* 2. MAIN HERO & LOGIN SECTION (RESPONSIVE SPLIT LAYOUT)        */}
      {/* ============================================================ */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex items-center justify-center relative z-10 my-auto">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
          
          {/* ======================================================== */}
          {/* SISI KIRI: SHOWCASE SEKOLAH & VISI (DESKTOP / TABLET)    */}
          {/* ======================================================== */}
          <div className="lg:col-span-7 flex flex-col justify-between rounded-2xl overflow-hidden border border-[#1F4B2C] bg-[#0E2416]/80 shadow-2xl relative min-h-[360px] lg:min-h-[580px]">
            {/* Background Foto Gedung SD Mentari Islamic School dengan Overlay Hijau Hutan Gelap */}
            <div className="absolute inset-0 z-0">
              <img 
                src={locMisPhoto} 
                alt="Gedung SD Mentari Islamic School" 
                className="w-full h-full object-cover object-center filter brightness-[0.42] contrast-[1.12] saturate-[1.15] scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0A1D11] via-[#0A1D11]/80 to-[#0A1D11]/45" />
              <div className="absolute inset-0 bg-[#1F4B2C]/30 mix-blend-multiply" />
            </div>

            {/* Konten Atas Sisi Kiri */}
            <div className="relative z-10 p-5 sm:p-7 lg:p-8 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#143820]/80 backdrop-blur-md border border-[#C3E956]/30 text-xs font-semibold text-[#F4FFFC] shadow-sm">
                <Sparkles className="w-3.5 h-3.5 text-[#C3E956]" />
                <span>Portal Evaluasi Terpadu Digital</span>
              </div>

              <div className="space-y-2">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-tight">
                  SD MENTARI <br className="hidden sm:inline" />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#91EAAF] via-[#C3E956] to-[#F4FFFC]">
                    ISLAMIC SCHOOL
                  </span>
                </h1>
                <p className="text-xs sm:text-sm text-[#F4FFFC]/85 max-w-xl leading-relaxed font-normal">
                  Platform asesmen sekolah modern yang mengedepankan objektivitas, kedisiplinan, serta pembentukan karakter generasi berakhlak mulia.
                </p>
              </div>
            </div>

            {/* Konten Bawah Sisi Kiri: Quote & Tagline Utama */}
            <div className="relative z-10 p-5 sm:p-7 lg:p-8 space-y-4 bg-gradient-to-t from-[#0A1D11] via-[#0A1D11]/95 to-transparent pt-8">
              {/* Card Quote Resmi SDMIS */}
              <div className="p-4 sm:p-5 rounded-xl bg-[#102919]/90 backdrop-blur-md border border-[#1F4B2C] shadow-xl space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-[#C3E956] uppercase tracking-wider">
                  <div className="w-2 h-2 rounded-full bg-[#C3E956]" />
                  <span>Sistem Evaluasi SD Mentari Islamic School</span>
                </div>

                <blockquote className="text-xs sm:text-sm text-[#F4FFFC] leading-relaxed italic font-normal">
                  "Kami bangga menjadi pelopor dalam menggabungkan teknologi modern dengan nilai-nilai Islam yang kokoh."
                </blockquote>

                <div className="pt-2 border-t border-[#1F4B2C]/80 flex flex-wrap items-center justify-between gap-2">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#C3E956] text-[#0A1D11] font-extrabold text-xs sm:text-sm font-sans tracking-wide shadow-md">
                    <span>✨ 'Digital Mind, Islamic Heart'</span>
                  </div>
                  <span className="text-[11px] text-[#91EAAF] font-mono">Klaten, Jawa Tengah</span>
                </div>
              </div>

              {/* Alamat Resmi & Keunggulan Ringkas */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#91EAAF]/90 pt-1">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-[#C3E956] shrink-0 mt-0.5" />
                  <span className="leading-snug text-[#F4FFFC]/90 text-[11px] sm:text-xs">
                    Lembu RT 02/ RW 01, Jimus, Polanharjo, Klaten
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-[#C3E956] shrink-0 font-medium">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#C3E956]" />
                  <span>Zero-Tolerance Lockdown</span>
                </div>
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* SISI KANAN: CARD FORM LOGIN PESERTA & GURU               */}
          {/* ======================================================== */}
          <div className="lg:col-span-5 flex flex-col justify-center">
            <div className="bg-[#102919]/90 backdrop-blur-xl border border-[#1F4B2C] py-6 sm:py-8 px-5 sm:px-8 shadow-2xl rounded-2xl relative overflow-hidden ring-1 ring-white/5">
              {/* Subtle Card Accent Glow */}
              <div className="absolute top-0 right-0 w-44 h-44 bg-[#C3E956]/10 rounded-full blur-2xl pointer-events-none -mr-12 -mt-12" />

              {/* Header Form */}
              <div className="mb-6 relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#C3E956]/15 border border-[#C3E956]/30 text-[#C3E956] text-[11px] font-bold">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Portal Masuk Terpadu</span>
                  </div>
                  <span className="text-[11px] font-mono text-[#91EAAF]">T.A. 2026/2027</span>
                </div>

                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Masuk ke Ruang Ujian
                </h2>
                <p className="text-xs text-[#F4FFFC]/70 mt-1 leading-relaxed">
                  Silakan masukkan Nomor Induk (NISN untuk Siswa atau NIP untuk Guru Pengawas) beserta kata sandi Anda.
                </p>
              </div>

              {/* Login Form */}
              <div className="space-y-4 relative z-10">
                {errorMessage && (
                  <div className="p-3 bg-rose-500/15 border border-rose-500/40 rounded-xl flex items-center gap-2.5 text-rose-300 text-xs font-medium animate-fadeIn">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Input Username (NISN / NIP) */}
                <div>
                  <label className="block text-xs font-semibold text-[#F4FFFC]/90 mb-1.5">
                    Nomor Induk (NISN / NIP)
                  </label>
                  <div className="relative rounded-xl">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#91EAAF]">
                      <User className="h-4 w-4" />
                    </div>
                    <input
                      type="text"
                      required
                      autoComplete="username"
                      autoCorrect="off"
                      autoCapitalize="none"
                      spellCheck="false"
                      inputMode="text"
                      data-lpignore="true"
                      data-form-type="other"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleManualLogin(e)}
                      placeholder="Contoh: 3183019963 / NIP Guru"
                      className="block w-full pl-10 pr-3.5 py-2.5 bg-[#0A1D11]/90 border border-[#1F4B2C] rounded-xl text-xs sm:text-sm text-[#F4FFFC] placeholder-zinc-500 focus:outline-none focus:border-[#C3E956] focus:ring-2 focus:ring-[#C3E956]/25 transition font-medium"
                    />
                  </div>
                </div>

                {/* Input Kata Sandi */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-[#F4FFFC]/90">
                      Kata Sandi
                    </label>
                    <span className="text-[10px] text-[#91EAAF] font-mono">
                      Bawaan: sama dengan NISN/NIP
                    </span>
                  </div>
                  <div className="relative rounded-xl">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#91EAAF]">
                      <Lock className="h-4 w-4" />
                    </div>
                    <input
                      type="text"
                      required
                      autoComplete="current-password"
                      autoCorrect="off"
                      autoCapitalize="none"
                      spellCheck="false"
                      data-lpignore="true"
                      data-form-type="other"
                      style={{
                        WebkitTextSecurity: showPassword ? 'none' : 'disc',
                        textSecurity: showPassword ? 'none' : 'disc'
                      }}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleManualLogin(e)}
                      placeholder="Masukkan kata sandi akun Anda"
                      className="block w-full pl-10 pr-11 py-2.5 bg-[#0A1D11]/90 border border-[#1F4B2C] rounded-xl text-xs sm:text-sm text-[#F4FFFC] placeholder-zinc-500 focus:outline-none focus:border-[#C3E956] focus:ring-2 focus:ring-[#C3E956]/25 transition font-mono font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#91EAAF] hover:text-white transition cursor-pointer"
                      title={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Tombol Masuk dengan Gradien Hijau Hutan & Aksen Lime */}
                <button
                  type="button"
                  onClick={handleManualLogin}
                  disabled={isLoading}
                  className="w-full mt-2 h-11 px-4 rounded-xl bg-gradient-to-r from-[#1F4B2C] via-[#2E6B3F] to-[#4D7111] hover:from-[#173A21] hover:to-[#3E5D0E] text-white text-xs sm:text-sm font-bold tracking-wide transition-all duration-150 shadow-lg shadow-black/40 ring-1 ring-[#C3E956]/40 hover:-translate-y-0.5 active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Masuk ke Portal Ujian</span>
                      <ArrowRight className="w-4 h-4 text-[#C3E956]" />
                    </>
                  )}
                </button>
              </div>

              {/* Zero-Tolerance Security Footnote */}
              <div className="mt-6 pt-4 border-t border-[#1F4B2C]/80 flex items-center justify-between text-[11px] text-[#91EAAF] relative z-10">
                <span className="flex items-center gap-1.5 text-[#C3E956] font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#C3E956] animate-pulse" />
                  Zero-Tolerance Lockdown Aktif
                </span>
                <span className="font-mono text-[#F4FFFC]/70">SDMIS CBT Engine</span>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* ============================================================ */}
      {/* 3. FOOTER RESMI                                              */}
      {/* ============================================================ */}
      <footer className="relative z-10 border-t border-[#1F4B2C]/80 bg-[#0E2416]/90 px-4 sm:px-8 py-3.5 text-center text-xs text-[#F4FFFC]/75">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            © {new Date().getFullYear()} <strong>SD Mentari Islamic School</strong>. Hak Cipta Dilindungi.
          </div>
          <div className="text-[11px] text-[#91EAAF] flex items-center gap-2">
            <span>NPSN: 70047473</span>
            <span>•</span>
            <span>Polanharjo, Klaten</span>
            <span>•</span>
            <span className="text-[#C3E956] font-bold">'Digital Mind, Islamic Heart'</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
