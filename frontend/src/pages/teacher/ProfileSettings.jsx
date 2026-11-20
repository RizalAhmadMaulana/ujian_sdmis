import React, { useState, useEffect } from 'react';
import { 
  UserCheck, 
  KeyRound, 
  Mail, 
  ShieldCheck, 
  ShieldAlert, 
  Save, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles,
  Info,
  RefreshCw,
  Lock,
  BadgeCheck,
  School,
  Fingerprint,
  FileCheck2,
  LockKeyhole
} from 'lucide-react';
import { useExamStore } from '../../store/useExamStore';
import { fetchCurrentUserApi, updateCurrentUserProfileApi } from '../../api/authApi';
import logoSdMis from '../../assets/logo sd mis.png';

export default function ProfileSettings() {
  const { currentUser, setCurrentUser } = useExamStore();

  const [formData, setFormData] = useState({
    username: '',
    full_name: '',
    email: '',
    nip: '',
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
  const [profileMeta, setProfileMeta] = useState({
    is_profile_complete: false,
    is_password_default: false,
    needs_profile_completion: false,
  });

  // Muat data profil terbaru dari API
  const loadProfile = async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const data = await fetchCurrentUserApi();
      if (data) {
        setFormData((prev) => ({
          ...prev,
          username: data.username || '',
          full_name: data.full_name || data.fullName || '',
          email: data.email || '',
          nip: data.nip || data.username || '',
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
      console.error('Gagal memuat profil pengguna:', err);
      if (currentUser) {
        setFormData((prev) => ({
          ...prev,
          username: currentUser.username || '',
          full_name: currentUser.full_name || currentUser.fullName || '',
          email: currentUser.email || '',
          nip: currentUser.nip || currentUser.username || '',
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

  const handleSave = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!formData.full_name.trim()) {
      setErrorMessage('Nama lengkap tidak boleh kosong!');
      return;
    }

    if (!formData.username.trim()) {
      setErrorMessage('Username / NIP tidak boleh kosong!');
      return;
    }

    // Jika mengisi ganti kata sandi
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
        nip: formData.username.trim(),
        email: formData.email.trim(),
      };

      if (formData.password.trim()) {
        payload.current_password = formData.current_password.trim();
        payload.password = formData.password.trim();
      }

      const res = await updateCurrentUserProfileApi(payload);
      if (res) {
        const normalized = {
          ...res,
          fullName: res.full_name || res.username,
          full_name: res.full_name || res.username,
        };
        setCurrentUser(normalized);
        localStorage.setItem('user', JSON.stringify(normalized));

        setProfileMeta({
          is_profile_complete: !!res.is_profile_complete,
          is_password_default: !!res.is_password_default,
          needs_profile_completion: !!res.needs_profile_completion,
        });

        // Kosongkan form password
        setFormData((prev) => ({
          ...prev,
          current_password: '',
          password: '',
          confirm_password: '',
        }));

        setSuccessMessage('Profil Anda berhasil diperbarui dan otomatis disinkronkan ke seluruh sistem!');
        setTimeout(() => setSuccessMessage(''), 5000);
      }
    } catch (err) {
      console.error('Gagal memperbarui profil:', err);
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

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto">
      {/* ======================================================== */}
      {/* 1. EXECUTIVE PROFILE HERO BANNER                         */}
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

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            {/* Avatar Circle with Vibrant Chartreuse Accent */}
            <div className="relative shrink-0">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-[#1F4B2C] to-[#0A1D11] border-2 border-[#C3E956] flex items-center justify-center text-[#C3E956] font-black text-3xl sm:text-4xl shadow-xl ring-4 ring-[#91EAAF]/20">
                {formData.full_name?.charAt(0) || formData.username?.charAt(0) || 'G'}
              </div>
              <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#C3E956] text-[#0A1D11] flex items-center justify-center shadow-md">
                <CheckCircle2 className="w-4 h-4 font-black" />
              </div>
            </div>

            {/* Profile Info */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full bg-[#C3E956] text-[#0A1D11] text-[11px] font-mono font-black uppercase tracking-wider shadow-xs">
                  Guru Pengawas Asesmen
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-[#143820] border border-[#91EAAF]/50 text-[#91EAAF] text-[11px] font-semibold">
                  SD Mentari Islamic School
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-white">
                {formData.full_name || 'Guru Pengawas'}
              </h1>
              <div className="text-xs sm:text-sm text-[#91EAAF] font-mono flex items-center gap-2">
                <span>NIP / ID: <strong>{formData.username || '-'}</strong></span>
                <span>•</span>
                <span className="text-[#F4FFFC]/80">{formData.email || 'Email belum diatur'}</span>
              </div>
            </div>
          </div>

          {/* Status & Refresh Button */}
          <div className="flex items-center gap-3 self-start md:self-center shrink-0">
            {profileMeta.needs_profile_completion ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-400/50 text-amber-200 text-xs font-bold animate-pulse">
                <ShieldAlert className="w-4 h-4 text-amber-300" />
                <span>Perlu Dilengkapi</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#C3E956]/20 border border-[#C3E956]/40 text-[#C3E956] text-xs font-bold">
                <BadgeCheck className="w-4 h-4 text-[#C3E956]" />
                <span>Akun Terverifikasi</span>
              </div>
            )}
            <button
              type="button"
              onClick={loadProfile}
              disabled={isLoading}
              title="Segarkan data profil"
              className="p-2.5 rounded-xl bg-[#143820] hover:bg-[#183D23] border border-[#91EAAF]/40 text-[#91EAAF] hover:text-[#C3E956] transition shadow-xs active:scale-95 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-[#C3E956]' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Alert Notifikasi Sukses / Gagal */}
      {successMessage && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-[#E1F8ED] border-2 border-[#91EAAF] text-[#1F4B2C] text-xs sm:text-sm shadow-xs font-bold animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-[#1F4B2C] shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-rose-50 border-2 border-rose-300 text-rose-800 text-xs sm:text-sm shadow-xs font-bold animate-fadeIn">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Form Settings Profil & Keamanan */}
      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Kolom 1 & 2: Informasi Data Diri & Ganti Sandi */}
          <div className="lg:col-span-2 space-y-6">
            {/* Card 1: Biodata Diri & Kontak */}
            <div className="bg-white rounded-3xl border border-[#91EAAF]/40 shadow-xs overflow-hidden p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-[#91EAAF]/30 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#E1F8ED] border border-[#91EAAF]/60 text-[#1F4B2C] flex items-center justify-center shadow-2xs">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-[#102919]">Informasi Data Diri Pengawas</h2>
                    <p className="text-xs text-zinc-500">Data resmi yang dicantumkan pada E-Jurnal & Berita Acara Asesmen</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Nama Lengkap & Gelar */}
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="block text-xs font-bold text-zinc-800">
                    Nama Lengkap & Gelar Akademik <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleChange}
                    placeholder="Contoh: Supeni, S.Pd"
                    required
                    className="w-full px-4 py-2.5 bg-[#F4FFFC] rounded-xl border border-[#91EAAF]/70 text-xs sm:text-sm font-semibold text-zinc-900 focus:bg-white focus:ring-2 focus:ring-[#91EAAF]/50 focus:border-[#1F4B2C] outline-none transition"
                  />
                  <p className="text-[11px] text-zinc-400">Dicantumkan pada Tanda Tangan digital Guru Pengawas.</p>
                </div>

                {/* Username / NIP */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-zinc-800">
                    Nomor Induk Pegawai (NIP / Username) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    placeholder="Contoh: 198005122005012001"
                    required
                    className="w-full px-4 py-2.5 bg-[#F4FFFC] rounded-xl border border-[#91EAAF]/70 text-xs sm:text-sm font-mono font-bold text-[#102919] focus:bg-white focus:ring-2 focus:ring-[#91EAAF]/50 focus:border-[#1F4B2C] outline-none transition"
                  />
                  <p className="text-[11px] text-zinc-400">Digunakan sebagai username saat login.</p>
                </div>

                {/* Alamat Email */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-zinc-800">
                    Alamat Email Resmi Sekolah <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="Contoh: guru@sdmis.sch.id"
                      className="w-full pl-10 pr-4 py-2.5 bg-[#F4FFFC] rounded-xl border border-[#91EAAF]/70 text-xs sm:text-sm font-semibold text-zinc-900 focus:bg-white focus:ring-2 focus:ring-[#91EAAF]/50 focus:border-[#1F4B2C] outline-none transition"
                    />
                    <Mail className="w-4 h-4 text-[#1F4B2C] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                  <p className="text-[11px] text-zinc-400">Untuk koordinasi dan notifikasi sistem asesmen.</p>
                </div>
              </div>
            </div>

            {/* Card 2: Keamanan & Ganti Kata Sandi */}
            <div className="bg-white rounded-3xl border border-[#91EAAF]/40 shadow-xs overflow-hidden p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-[#91EAAF]/30 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#C3E956]/20 border border-[#C3E956]/40 text-[#4D7111] flex items-center justify-center shadow-2xs">
                    <LockKeyhole className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-[#102919]">Keamanan & Ganti Kata Sandi</h2>
                    <p className="text-xs text-zinc-500">Biarkan kosong jika Anda tidak ingin memperbarui kata sandi</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Kata Sandi Saat Ini */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-zinc-800">
                    Kata Sandi Lama
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      name="current_password"
                      value={formData.current_password}
                      onChange={handleChange}
                      placeholder="Sandi saat ini"
                      className="w-full pr-10 pl-3.5 py-2.5 bg-[#F4FFFC] rounded-xl border border-[#91EAAF]/70 text-xs sm:text-sm text-zinc-900 focus:bg-white focus:ring-2 focus:ring-[#91EAAF]/50 focus:border-[#1F4B2C] outline-none transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 cursor-pointer"
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-zinc-400">Verifikasi otentikasi akun.</p>
                </div>

                {/* Kata Sandi Baru */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-zinc-800">
                    Kata Sandi Baru
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Min. 6 karakter"
                      className="w-full pr-10 pl-3.5 py-2.5 bg-[#F4FFFC] rounded-xl border border-[#91EAAF]/70 text-xs sm:text-sm text-zinc-900 focus:bg-white focus:ring-2 focus:ring-[#91EAAF]/50 focus:border-[#1F4B2C] outline-none transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 cursor-pointer"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-zinc-400">Kombinasi huruf & angka.</p>
                </div>

                {/* Konfirmasi Kata Sandi Baru */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-zinc-800">
                    Konfirmasi Sandi Baru
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      name="confirm_password"
                      value={formData.confirm_password}
                      onChange={handleChange}
                      placeholder="Ulangi sandi baru"
                      className="w-full pr-10 pl-3.5 py-2.5 bg-[#F4FFFC] rounded-xl border border-[#91EAAF]/70 text-xs sm:text-sm text-zinc-900 focus:bg-white focus:ring-2 focus:ring-[#91EAAF]/50 focus:border-[#1F4B2C] outline-none transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-zinc-400">Harus sama dengan sandi baru.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Kolom 3: Hak Akses & Status Kepatuhan Keamanan */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl border border-[#91EAAF]/40 shadow-xs p-6 space-y-5">
              <div className="border-b border-[#91EAAF]/30 pb-4">
                <h3 className="text-base font-bold text-[#102919] flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#1F4B2C]" />
                  <span>Kepatuhan Asesmen</span>
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">Protokol keamanan pengawas</p>
              </div>

              <div className="space-y-3.5 text-xs">
                <div className="p-3.5 rounded-2xl bg-[#F4FFFC] border border-[#91EAAF]/50 space-y-1">
                  <div className="font-bold text-[#102919] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#C3E956]" />
                    <span>Zero-Tolerance Lockdown</span>
                  </div>
                  <p className="text-zinc-500 text-[11px] leading-relaxed">
                    Setiap aksi siswa keluar dari ExamBrowser akan terkunci seketika dan masuk ke notifikasi pengawas.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#F4FFFC] border border-[#91EAAF]/50 space-y-1">
                  <div className="font-bold text-[#102919] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#1F4B2C]" />
                    <span>Sinkronisasi Otomatis E-Jurnal</span>
                  </div>
                  <p className="text-zinc-500 text-[11px] leading-relaxed">
                    Nama dan NIP pengawas otomatis menjadi penanggung jawab sah pada Berita Acara Asesmen resmi sekolah.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#F4FFFC] border border-[#91EAAF]/50 space-y-1">
                  <div className="font-bold text-[#102919] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#C3E956]" />
                    <span>Single-Device Protection</span>
                  </div>
                  <p className="text-zinc-500 text-[11px] leading-relaxed">
                    Akun terproteksi dari akses bersamaan ganda untuk menjaga kredibilitas hasil evaluasi.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Button Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-3xl bg-white border border-[#91EAAF]/40 shadow-xs">
          <div className="flex items-center gap-2 text-xs text-zinc-600 font-medium">
            <Info className="w-4 h-4 text-[#1F4B2C] shrink-0" />
            <span>Perubahan data otomatis disinkronkan ke seluruh sistem asesmen sekolah.</span>
          </div>
          <button
            type="submit"
            disabled={isSaving}
            className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-[#C3E956] hover:bg-[#d4f76b] text-[#0A1D11] font-bold text-xs sm:text-sm shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-[#0A1D11]" />
                <span>Menyimpan Perubahan...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4 text-[#0A1D11]" />
                <span>Simpan Perubahan Profil</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
