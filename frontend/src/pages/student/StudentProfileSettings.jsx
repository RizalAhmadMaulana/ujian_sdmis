import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  GraduationCap, 
  KeyRound, 
  Mail, 
  ShieldCheck, 
  ShieldAlert, 
  Save, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle, 
  ArrowLeft,
  RefreshCw,
  Lock,
  BadgeCheck,
  Clock,
  LogOut,
  Info,
  UserCheck,
  Sparkles,
  School
} from 'lucide-react';
import { useExamStore } from '../../store/useExamStore';
import { fetchCurrentUserApi, updateCurrentUserProfileApi } from '../../api/authApi';
import logoSdMis from '../../assets/logo sd mis.png';

export default function StudentProfileSettings() {
  const navigate = useNavigate();
  const { currentUser, setCurrentUser, logout } = useExamStore();

  const [formData, setFormData] = useState({
    username: '',
    full_name: '',
    email: '',
    nisn: '',
    classroom: '',
    current_password: '',
    password: '',
    confirm_password: '',
  });

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  const [profileMeta, setProfileMeta] = useState({
    is_profile_complete: false,
    is_password_default: false,
    needs_profile_completion: false,
  });

  // Jam Digital
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeString = currentTime.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const studentClassName = formData.classroom || (typeof currentUser?.classroom === 'object' && currentUser?.classroom !== null ? currentUser.classroom.name : currentUser?.classroom) || '-';

  // Muat data profil terbaru dari backend API
  const loadProfile = async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const data = await fetchCurrentUserApi();
      if (data) {
        const cName = data.classroom_name || (typeof data.classroom === 'object' ? data.classroom?.name : data.classroom) || currentUser?.classroom || '-';
        setFormData((prev) => ({
          ...prev,
          username: data.username || '',
          full_name: data.full_name || data.fullName || '',
          email: data.email || '',
          nisn: data.nisn || data.username || '',
          classroom: cName,
          current_password: '',
          password: '',
          confirm_password: '',
        }));
        setProfileMeta({
          is_profile_complete: !!data.is_profile_complete,
          is_password_default: !!data.is_password_default,
          needs_profile_completion: !!data.needs_profile_completion,
        });
      }
    } catch (err) {
      console.error('Gagal memuat profil siswa:', err);
      if (currentUser) {
        setFormData((prev) => ({
          ...prev,
          username: currentUser.username || '',
          full_name: currentUser.full_name || currentUser.fullName || '',
          email: currentUser.email || '',
          nisn: currentUser.nisn || currentUser.username || '',
          classroom: currentUser.classroom || '-',
        }));
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!formData.full_name.trim()) {
      setErrorMessage('Nama lengkap tidak boleh kosong!');
      return;
    }

    if (!formData.username.trim()) {
      setErrorMessage('NISN / Username tidak boleh kosong!');
      return;
    }

    // Jika mengisi perubahan kata sandi
    if (formData.password.trim() || formData.confirm_password.trim() || formData.current_password.trim()) {
      if (!formData.current_password.trim()) {
        setErrorMessage('Silakan masukkan kata sandi Anda saat ini (lama) untuk verifikasi!');
        return;
      }
      if (!formData.password.trim()) {
        setErrorMessage('Kata sandi baru tidak boleh kosong!');
        return;
      }
      if (formData.password.length < 6) {
        setErrorMessage('Kata sandi baru minimal 6 karakter!');
        return;
      }
      if (formData.password !== formData.confirm_password) {
        setErrorMessage('Konfirmasi kata sandi baru tidak cocok dengan kata sandi baru!');
        return;
      }
    }

    setIsSaving(true);
    try {
      const payload = {
        full_name: formData.full_name.trim(),
        username: formData.username.trim(),
        nisn: formData.username.trim(),
        email: formData.email.trim(),
      };

      if (formData.password.trim()) {
        payload.current_password = formData.current_password.trim();
        payload.password = formData.password.trim();
      }

      const res = await updateCurrentUserProfileApi(payload);
      if (res) {
        const cName = res.classroom_name || formData.classroom || currentUser?.classroom;
        const normalized = {
          ...res,
          fullName: res.full_name || res.username,
          full_name: res.full_name || res.username,
          classroom: cName,
        };
        setCurrentUser(normalized);
        localStorage.setItem('user', JSON.stringify(normalized));

        setProfileMeta({
          is_profile_complete: !!res.is_profile_complete,
          is_password_default: !!res.is_password_default,
          needs_profile_completion: !!res.needs_profile_completion,
        });

        // Kosongkan field kata sandi
        setFormData((prev) => ({
          ...prev,
          current_password: '',
          password: '',
          confirm_password: '',
        }));

        setSuccessMessage('Profil Anda berhasil diperbarui dan disinkronkan ke server sekolah!');
        setTimeout(() => setSuccessMessage(''), 5000);
      }
    } catch (err) {
      console.error('Gagal memperbarui profil siswa:', err);
      const dataErrors = err.response?.data;
      if (dataErrors) {
        if (typeof dataErrors === 'object') {
          const firstKey = Object.keys(dataErrors)[0];
          const firstVal = dataErrors[firstKey];
          const msg = Array.isArray(firstVal) ? firstVal[0] : String(firstVal);
          setErrorMessage(`${firstKey}: ${msg}`);
        } else {
          setErrorMessage(String(dataErrors));
        }
      } else {
        setErrorMessage('Terjadi kesalahan saat menyimpan profil. Silakan coba kembali.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return 'S';
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#EBF7CD] via-[#E2F4B8] to-[#D9F0A5] text-[#102919] flex flex-col justify-between select-none relative antialiased font-sans">
      {/* ======================================================== */}
      {/* 1. TOP HEADER BAR (EXECUTIVE GREEN SCREEN NAVBAR)         */}
      {/* ======================================================== */}
      <header className="bg-gradient-to-r from-[#102919] via-[#143820] to-[#1F4B2C] border-b-2 border-[#C3E956]/30 px-4 sm:px-8 py-3.5 flex items-center justify-between sticky top-0 z-30 shadow-md shrink-0">
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
            </div>
            <div className="text-xs text-[#91EAAF] truncate max-w-[200px] sm:max-w-md font-medium">
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
      <main className="flex-1 max-w-3xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6 z-10">
        {/* Navigation Back Button & Status */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/student/lobby')}
            className="flex items-center gap-2 text-xs font-black text-[#102919] hover:text-[#0A1D11] transition-all px-4 py-2.5 rounded-xl bg-[#EFF9CE] border-2 border-[#8BC829] shadow-xs hover:border-[#102919] hover:bg-[#E2F4B4] active:scale-[0.98] cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-[#102919]" />
            <span>Kembali ke Beranda Asesmen</span>
          </button>

          {/* Security Badge Status */}
          <div className="flex items-center gap-2">
            {profileMeta.needs_profile_completion ? (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-300 border border-amber-500 text-amber-950 text-xs font-black shadow-xs">
                <ShieldAlert className="w-4 h-4 text-amber-900" />
                <span>Perlu Dilengkapi</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#C3E956] border border-[#4D7111]/30 text-[#0A1D11] text-xs font-black shadow-xs">
                <BadgeCheck className="w-4 h-4 text-[#0A1D11]" />
                <span>Profil Aman</span>
              </div>
            )}
            <button
              type="button"
              onClick={loadProfile}
              disabled={isLoading}
              title="Muat ulang data profil"
              className="p-2 rounded-xl border-2 border-[#8BC829] bg-[#EFF9CE] text-[#102919] hover:bg-[#E2F4B4] transition-all shadow-xs cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Profile Hero Header Card */}
        <div className="bg-gradient-to-br from-[#102919] via-[#143820] to-[#1F4B2C] rounded-3xl p-6 text-white shadow-xl border-2 border-[#C3E956]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#C3E956] text-[#0A1D11] font-black text-2xl flex items-center justify-center shadow-md ring-4 ring-white/20 shrink-0">
              {getInitials(formData.full_name || currentUser?.fullName)}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {formData.full_name || currentUser?.fullName || 'Akun Siswa'}
                </h1>
                <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-[#C3E956] text-[#0A1D11] shadow-xs">
                  Siswa Aktif
                </span>
              </div>
              <p className="text-xs text-[#91EAAF] font-medium mt-1">
                NISN: <span className="font-mono font-bold text-white">{formData.username || currentUser?.username}</span> • Kelas: <span className="font-bold text-white">{studentClassName}</span>
              </p>
              <div className="text-[11px] text-zinc-300 mt-1 flex items-center gap-1.5 font-medium">
                <School className="w-3.5 h-3.5 text-[#C3E956]" />
                <span>SD Mentari Islamic School • NPSN: 70047473</span>
              </div>
            </div>
          </div>
        </div>

        {/* Alert Notifikasi */}
        {successMessage && (
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-[#E2F4B4] border-2 border-[#8BC829] text-[#102919] text-xs font-black shadow-xs animate-fadeIn">
            <CheckCircle2 className="w-5 h-5 text-[#4D7111] shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-[#E2F4B4] border-2 border-rose-300 text-rose-950 text-xs font-black shadow-xs animate-shake">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Warning Box jika kata sandi masih bawaan atau email belum diatur */}
        {profileMeta.needs_profile_completion && (
          <div className="p-4 rounded-2xl bg-[#E2F4B4] border-2 border-amber-300 text-[#102919] space-y-2 shadow-xs">
            <div className="flex items-center gap-2 font-black text-xs text-[#102919]">
              <ShieldAlert className="w-4 h-4 text-amber-700" />
              <span>Pemberitahuan Keamanan Akun Siswa:</span>
            </div>
            <div className="text-xs text-[#1F4B2C] font-semibold leading-relaxed space-y-1">
              {profileMeta.is_password_default && (
                <p>• Akun Anda masih menggunakan kata sandi bawaan (NISN). Mohon ganti kata sandi di bawah ini agar akun Anda aman dari akses orang lain.</p>
              )}
              {!profileMeta.is_profile_complete && (
                <p>• Lengkapi nama lengkap dan email aktif Anda untuk identitas resmi pengerjaan asesmen sekolah.</p>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {/* Card 1: Informasi Biodata Peserta */}
          <div className="bg-[#EFF9CE] rounded-3xl border-2 border-[#8BC829] p-6 space-y-5 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b-2 border-[#8BC829]/40">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-[#102919] to-[#1F4B2C] text-[#C3E956] shadow-xs">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-black text-[#102919]">Biodata Peserta Asesmen</h2>
                  <p className="text-xs text-[#1F4B2C] font-semibold">Terhubung langsung dengan Manajemen Siswa & E-Jurnal Sekolah.</p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full bg-[#E2F4B4] text-[#1F4B2C] text-xs font-black border border-[#8BC829]">
                Kelas: {studentClassName}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Nama Lengkap */}
              <div className="md:col-span-2">
                <label className="block text-xs font-black text-[#102919] mb-1.5 uppercase tracking-wider">
                  Nama Lengkap Siswa <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  placeholder="Contoh: Muhammad Rayhan"
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-[#F9FDEE] border-2 border-[#8BC829] text-[#102919] text-xs sm:text-sm font-semibold focus:border-[#102919] focus:outline-none transition shadow-inner"
                />
                <p className="text-[11px] text-[#1F4B2C] mt-1 font-semibold">Nama ini dicantumkan pada Berita Acara dan Rekap Nilai E-Jurnal.</p>
              </div>

              {/* NISN / Username */}
              <div>
                <label className="block text-xs font-black text-[#102919] mb-1.5 uppercase tracking-wider">
                  NISN / Nomor Induk <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="Contoh: 0081234567"
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-[#F9FDEE] border-2 border-[#8BC829] text-[#102919] text-xs sm:text-sm font-mono font-bold focus:border-[#102919] focus:outline-none transition shadow-inner"
                />
                <p className="text-[11px] text-[#1F4B2C] mt-1 font-semibold">Digunakan untuk login ke Portal Ujian.</p>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-black text-[#102919] mb-1.5 uppercase tracking-wider">
                  Alamat Email Aktif <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Contoh: siswa@mentarischool.sch.id"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#F9FDEE] border-2 border-[#8BC829] text-[#102919] text-xs sm:text-sm font-semibold focus:border-[#102919] focus:outline-none transition shadow-inner"
                  />
                  <Mail className="w-4 h-4 text-[#4D7111] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                <p className="text-[11px] text-[#1F4B2C] mt-1 font-semibold">Digunakan untuk pemulihan akun jika lupa kata sandi.</p>
              </div>
            </div>
          </div>

          {/* Card 2: Keamanan & Ganti Kata Sandi */}
          <div className="bg-[#EFF9CE] rounded-3xl border-2 border-[#8BC829] p-6 space-y-5 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b-2 border-[#8BC829]/40">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-[#102919] to-[#1F4B2C] text-[#C3E956] shadow-xs">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-black text-[#102919]">Ganti Kata Sandi Akun Siswa (Opsional)</h2>
                  <p className="text-xs text-[#1F4B2C] font-semibold">Kosongkan bagian ini jika Anda tidak ingin mengubah kata sandi.</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Kata Sandi Lama */}
              <div>
                <label className="block text-xs font-black text-[#102919] mb-1.5 uppercase tracking-wider">
                  Kata Sandi Lama
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    name="current_password"
                    value={formData.current_password}
                    onChange={handleChange}
                    placeholder="Kata sandi saat ini"
                    className="w-full pr-10 pl-3.5 py-2.5 rounded-xl bg-[#F9FDEE] border-2 border-[#8BC829] text-[#102919] text-xs sm:text-sm font-semibold focus:border-[#102919] focus:outline-none transition shadow-inner"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-[#102919] transition cursor-pointer"
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-[#1F4B2C] mt-1 font-semibold">Sandi saat ini (default: NISN).</p>
              </div>

              {/* Kata Sandi Baru */}
              <div>
                <label className="block text-xs font-black text-[#102919] mb-1.5 uppercase tracking-wider">
                  Kata Sandi Baru
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Minimal 6 karakter"
                    className="w-full pr-10 pl-3.5 py-2.5 rounded-xl bg-[#F9FDEE] border-2 border-[#8BC829] text-[#102919] text-xs sm:text-sm font-semibold focus:border-[#102919] focus:outline-none transition shadow-inner"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-[#102919] transition cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-[#1F4B2C] mt-1 font-semibold">Gunakan sandi yang aman dan mudah diingat.</p>
              </div>

              {/* Konfirmasi Kata Sandi Baru */}
              <div>
                <label className="block text-xs font-black text-[#102919] mb-1.5 uppercase tracking-wider">
                  Ulangi Sandi Baru
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirm_password"
                    value={formData.confirm_password}
                    onChange={handleChange}
                    placeholder="Ulangi kata sandi baru"
                    className="w-full pr-10 pl-3.5 py-2.5 rounded-xl bg-[#F9FDEE] border-2 border-[#8BC829] text-[#102919] text-xs sm:text-sm font-semibold focus:border-[#102919] focus:outline-none transition shadow-inner"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-[#102919] transition cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-[#1F4B2C] mt-1 font-semibold">Harus sama dengan sandi baru.</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <div className="flex items-center gap-2 text-xs text-[#1F4B2C] font-semibold">
              <Info className="w-4 h-4 text-[#102919] shrink-0" />
              <span>Perubahan data otomatis disinkronkan ke server sekolah.</span>
            </div>
            <button
              type="submit"
              disabled={isSaving}
              className="w-full sm:w-auto px-7 py-3 rounded-2xl bg-[#C3E956] hover:bg-[#b8e337] active:scale-[0.98] text-[#0A1D11] font-black text-xs sm:text-sm tracking-wide shadow-md border-2 border-[#4D7111]/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-[#0A1D11]" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 text-[#0A1D11]" />
                  <span>Simpan Perubahan</span>
                </>
              )}
            </button>
          </div>
        </form>
      </main>

      {/* Footer */}
      <footer className="text-center py-4 border-t-2 border-[#8BC829]/50 bg-[#E2F4B4]/90 text-[#1F4B2C] text-xs font-black shrink-0">
        Portal Asesmen Digital Siswa • SD Mentari Islamic School • 'Digital Mind, Islamic Heart'
      </footer>
    </div>
  );
}
