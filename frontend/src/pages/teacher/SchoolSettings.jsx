import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Save, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Eye, 
  MapPin, 
  Phone, 
  Mail, 
  UserCheck, 
  Calendar,
  Sparkles,
  School
} from 'lucide-react';
import { useExamStore } from '../../store/useExamStore';
import { getSchoolSettingsApi, updateSchoolSettingsApi } from '../../api/authApi';

export default function SchoolSettings() {
  const { currentUser, schoolSettings, fetchSchoolSettings, updateSchoolSettings } = useExamStore();

  const [formData, setFormData] = useState({
    name: 'SD MENTARI ISLAMIC SCHOOL',
    sub_header: 'NPSN: 70047473',
    address: 'Lembu RT 02/ RW 01, Jimus, Polanharjo, Klaten',
    phone: '(0272) 123456',
    email: 'info@sdmis.sch.id',
    principal_name: 'Kepala Sekolah SD Mentari Islamic School',
    principal_nip: '-',
    city: 'Klaten',
    academic_year: '2026/2027',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // 1. Ambil data pengaturan sekolah saat mount
  useEffect(() => {
    const loadSettings = async () => {
      setIsLoading(true);
      try {
        const data = await getSchoolSettingsApi();
        if (data && data.name) {
          setFormData({
            name: data.name || '',
            sub_header: data.sub_header || '',
            address: data.address || '',
            phone: data.phone || '',
            email: data.email || '',
            principal_name: data.principal_name || '',
            principal_nip: data.principal_nip || '',
            city: data.city || '',
            academic_year: data.academic_year || '2026/2027',
          });
        }
      } catch (err) {
        console.warn('Fallback settings dari store:', err);
        if (schoolSettings) {
          setFormData(schoolSettings);
        }
      } finally {
        setIsLoading(false);
      }
    };
    loadSettings();
  }, [schoolSettings]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setErrorMessage('Nama sekolah tidak boleh kosong.');
      return;
    }

    setIsSaving(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      const res = await updateSchoolSettingsApi(formData);
      if (res) {
        await updateSchoolSettings(formData);
        setSuccessMessage('Pengaturan identitas sekolah berhasil disimpan dan disinkronkan ke E-Jurnal!');
        setTimeout(() => setSuccessMessage(''), 4000);
      }
    } catch (err) {
      console.error('Gagal menyimpan pengaturan sekolah:', err);
      // Fallback local update
      updateSchoolSettings(formData);
      setSuccessMessage('Pengaturan tersimpan di sesi lokal.');
      setTimeout(() => setSuccessMessage(''), 4000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#102919] border-2 border-[#8BC829] flex items-center justify-center text-[#C3E956] shadow-xs">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-[#102919] tracking-tight">
                Pengaturan & Identitas Sekolah
              </h1>
              <p className="text-xs sm:text-sm text-[#102919]/70 font-bold">
                Ubah nama sekolah, kop dinas, alamat, dan pejabat kepala sekolah untuk dokumen E-Jurnal resmi.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={fetchSchoolSettings}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#E2F4B4] border-2 border-[#8BC829] text-xs font-black text-[#102919] hover:bg-[#d6f0a3] transition shadow-xs active:scale-[0.98] cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#102919]' : 'text-[#1F4B2C]'}`} />
          <span>Muat Ulang</span>
        </button>
      </div>

      {/* Alert Notifikasi */}
      {successMessage && (
        <div className="p-3.5 rounded-xl bg-[#E2F4B4] border-2 border-[#8BC829] text-[#102919] text-xs sm:text-sm font-black flex items-center gap-2.5 shadow-xs animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-[#4D7111] shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-100 border-2 border-rose-300 text-rose-900 text-xs sm:text-sm font-black flex items-center gap-2.5 shadow-xs animate-fadeIn">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ======================================================== */}
        {/* KOLOM KIRI: FORMULIR INPUT PENGATURAN (7 Kolom) */}
        {/* ======================================================== */}
        <div className="lg:col-span-7 bg-[#EFF9CE] rounded-2xl border-2 border-[#8BC829] shadow-xs p-5 sm:p-6 space-y-5">
          <div className="border-b-2 border-[#8BC829]/30 pb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-black text-[#102919]">Form Identitas & Dokumen Resmi</h2>
              <p className="text-xs text-[#102919]/70 font-medium">Data ini otomatis tercetak pada Berita Acara, Lembar E-Jurnal, dan Ekspor PDF/Excel.</p>
            </div>
            <span className="px-2.5 py-0.5 rounded-xl text-[10px] font-black uppercase tracking-wider bg-[#C3E956] text-[#0A1D11] border border-[#4D7111]/30">
              Dinamis
            </span>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            {/* 1. Nama Sekolah & Instansi */}
            <div className="space-y-1.5">
              <label className="block text-xs font-black text-[#102919] uppercase tracking-wider">
                Nama Sekolah / Madrasah <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                placeholder="Contoh: SD MENTARI ISLAMIC SCHOOL"
                className="w-full px-3 py-2 bg-[#F9FDEE] rounded-xl border-2 border-[#8BC829] text-xs sm:text-sm font-bold text-[#102919] focus:bg-[#EFF9CE] focus:outline-none focus:border-[#102919] transition"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-black text-[#102919] uppercase tracking-wider">
                Instansi / Sub-Header Kop Surat
              </label>
              <input
                type="text"
                name="sub_header"
                value={formData.sub_header}
                onChange={handleChange}
                placeholder="Contoh: YAYASAN MENTARI ISLAMIC SCHOOL / DINAS PENDIDIKAN"
                className="w-full px-3 py-2 bg-[#F9FDEE] rounded-xl border-2 border-[#8BC829] text-xs sm:text-sm font-bold text-[#102919] focus:bg-[#EFF9CE] focus:outline-none focus:border-[#102919] transition"
              />
              <span className="text-[11px] text-[#102919]/60 font-medium block">Tampil pada baris paling atas kop dokumen resmi</span>
            </div>

            {/* 2. Alamat & Kota */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1.5">
                <label className="block text-xs font-black text-[#102919] uppercase tracking-wider">
                  Alamat Lengkap
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Contoh: Lembu RT 02/ RW 01, Jimus, Polanharjo, Klaten"
                  className="w-full px-3 py-2 bg-[#F9FDEE] rounded-xl border-2 border-[#8BC829] text-xs sm:text-sm font-bold text-[#102919] focus:bg-[#EFF9CE] focus:outline-none focus:border-[#102919] transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-black text-[#102919] uppercase tracking-wider">
                  Kota / Kabupaten
                </label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="Contoh: Klaten"
                  className="w-full px-3 py-2 bg-[#F9FDEE] rounded-xl border-2 border-[#8BC829] text-xs sm:text-sm font-bold text-[#102919] focus:bg-[#EFF9CE] focus:outline-none focus:border-[#102919] transition"
                />
              </div>
            </div>

            {/* 3. Telepon & Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-[#102919] uppercase tracking-wider">
                  Nomor Telepon
                </label>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Contoh: (0272) 123456"
                  className="w-full px-3 py-2 bg-[#F9FDEE] rounded-xl border-2 border-[#8BC829] text-xs sm:text-sm font-bold text-[#102919] focus:bg-[#EFF9CE] focus:outline-none focus:border-[#102919] transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-black text-[#102919] uppercase tracking-wider">
                  Email Resmi
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Contoh: info@sdmis.sch.id"
                  className="w-full px-3 py-2 bg-[#F9FDEE] rounded-xl border-2 border-[#8BC829] text-xs sm:text-sm font-bold text-[#102919] focus:bg-[#EFF9CE] focus:outline-none focus:border-[#102919] transition"
                />
              </div>
            </div>

            {/* 4. Pejabat Kepala Sekolah & NIP */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t-2 border-[#8BC829]/30">
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-[#102919] uppercase tracking-wider">
                  Nama Kepala Sekolah / Madrasah
                </label>
                <input
                  type="text"
                  name="principal_name"
                  value={formData.principal_name}
                  onChange={handleChange}
                  placeholder="Contoh: H. Ahmad Syafi'i, M.Pd.I"
                  className="w-full px-3 py-2 bg-[#F9FDEE] rounded-xl border-2 border-[#8BC829] text-xs sm:text-sm font-black text-[#102919] focus:bg-[#EFF9CE] focus:outline-none focus:border-[#102919] transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-black text-[#102919] uppercase tracking-wider">
                  NIP / NUPTK Kepala Sekolah
                </label>
                <input
                  type="text"
                  name="principal_nip"
                  value={formData.principal_nip}
                  onChange={handleChange}
                  placeholder="Contoh: 197508102003121002"
                  className="w-full px-3 py-2 bg-[#F9FDEE] rounded-xl border-2 border-[#8BC829] text-xs sm:text-sm font-mono font-bold text-[#102919] focus:bg-[#EFF9CE] focus:outline-none focus:border-[#102919] transition"
                />
              </div>
            </div>

            {/* 5. Tahun Ajaran Aktif */}
            <div className="space-y-1.5">
              <label className="block text-xs font-black text-[#102919] uppercase tracking-wider">
                Tahun Ajaran Aktif
              </label>
              <input
                type="text"
                name="academic_year"
                value={formData.academic_year}
                onChange={handleChange}
                placeholder="Contoh: 2026/2027"
                className="w-full sm:w-1/2 px-3 py-2 bg-[#F9FDEE] rounded-xl border-2 border-[#8BC829] text-xs sm:text-sm font-bold text-[#102919] focus:bg-[#EFF9CE] focus:outline-none focus:border-[#102919] transition"
              />
            </div>

            {/* Tombol Simpan Form */}
            <div className="pt-4 border-t-2 border-[#8BC829]/30 flex items-center justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2.5 bg-[#C3E956] hover:bg-[#b8e337] text-[#0A1D11] rounded-xl text-xs sm:text-sm font-black border-2 border-[#4D7111]/30 shadow-xs active:scale-[0.98] transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-[#0A1D11]" />
                    <span>Menyimpan Perubahan...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 text-[#0A1D11]" />
                    <span>Simpan Pengaturan Sekolah</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* ======================================================== */}
        {/* KOLOM KANAN: LIVE PREVIEW KOP & TANDA TANGAN (5 Kolom) */}
        {/* ======================================================== */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#102919] text-white p-3.5 rounded-2xl border-2 border-[#8BC829] shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-[#C3E956]" />
              <span className="text-xs font-black uppercase tracking-wider text-[#C3E956]">Pratinjau Lembar Dokumen</span>
            </div>
            <span className="text-[10px] bg-[#1F4B2C] text-[#C3E956] px-2.5 py-0.5 rounded-xl font-mono font-bold border border-[#8BC829]">
              Live Preview
            </span>
          </div>

          {/* Kotak Kertas A4 Mini */}
          <div className="bg-[#E2F4B4] rounded-2xl border-2 border-[#8BC829] shadow-xs p-5 sm:p-6 space-y-5 text-[#102919] text-center">
            {/* Kop Surat Live Preview */}
            <div className="border-b-2 border-[#102919] pb-3 text-center space-y-1">
              {formData.sub_header && (
                <div className="text-[10px] font-black uppercase tracking-wider text-[#102919]/70">
                  {formData.sub_header}
                </div>
              )}
              <h3 className="text-base sm:text-lg font-black text-[#102919] tracking-tight leading-tight">
                {formData.name || 'NAMA SEKOLAH'}
              </h3>
              <p className="text-[10px] text-[#102919]/80 font-bold leading-tight">
                {[
                  formData.address,
                  formData.phone ? `Telp: ${formData.phone}` : null,
                  formData.email ? `Email: ${formData.email}` : null
                ].filter(Boolean).join(' • ')}
              </p>
            </div>

            {/* Judul Dokumen Preview */}
            <div className="space-y-0.5 py-1">
              <div className="text-xs font-black uppercase text-[#102919] underline underline-offset-2">
                Berita Acara & E-Jurnal Pelaksanaan Asesmen
              </div>
              <div className="text-[10px] text-[#102919]/70 font-bold">
                Tahun Ajaran {formData.academic_year || '2026/2027'} • Sistem Anti-Cheat Lockdown
              </div>
            </div>

            {/* Ilustrasi Tabel Nilai */}
            <div className="p-3 bg-[#EFF9CE] rounded-xl border border-[#8BC829] text-left text-[11px] space-y-1">
              <div className="flex justify-between font-black text-[#102919]">
                <span>Contoh Rekapitulasi:</span>
                <span className="text-[#1F4B2C] font-black">32 Siswa Hadir</span>
              </div>
              <div className="text-[#102919]/70 text-[10px] font-medium">
                Rekapitulasi kehadiran, hasil pengerjaan soal, skor pilihan ganda, dan log sensor kecurangan.
              </div>
            </div>

            {/* Tanda Tangan Pengesahan Live Preview */}
            <div className="pt-3 border-t-2 border-[#8BC829]/30 grid grid-cols-2 gap-4 text-center text-[10px]">
              <div>
                <div className="text-[#102919]/70 font-bold">Mengetahui,</div>
                <div className="font-black text-[#102919]">Kepala {formData.name || 'Sekolah'}</div>
                <div className="h-10 flex items-center justify-center text-[#102919]/30 italic text-[9px] font-bold">
                  (Tanda Tangan & Cap)
                </div>
                <div className="font-black text-[#102919] underline">
                  {formData.principal_name || 'Nama Kepala Sekolah'}
                </div>
                <div className="text-[#102919]/70 font-mono font-bold text-[9px]">
                  {formData.principal_nip ? `NIP. ${formData.principal_nip}` : '-'}
                </div>
              </div>

              <div>
                <div className="text-[#102919]/70 font-bold">
                  {formData.city || 'Kota'}, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
                <div className="font-black text-[#102919]">Guru Pengawas Ujian</div>
                <div className="h-10 flex items-center justify-center text-[#102919]/30 italic text-[9px] font-bold">
                  (Tanda Tangan)
                </div>
                <div className="font-black text-[#102919] underline">
                  {currentUser?.fullName || currentUser?.full_name || currentUser?.username || 'Guru Pengawas Ujian'}
                </div>
                <div className="text-[#102919]/70 font-mono font-bold text-[9px]">
                  {currentUser?.nip ? `NIP. ${currentUser.nip}` : (currentUser?.username ? `NIP. ${currentUser.username}` : '-')}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

