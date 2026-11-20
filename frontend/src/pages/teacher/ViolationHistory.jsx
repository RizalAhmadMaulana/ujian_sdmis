import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExamStore } from '../../store/useExamStore';
import { proctoringApi } from '../../api/proctoringApi';
import { examApi } from '../../api/examApi';
import { getClassroomsApi } from '../../api/authApi';
import { 
  ShieldAlert, 
  Trash2, 
  RefreshCw, 
  Search, 
  Filter, 
  ExternalLink, 
  Check, 
  CheckCircle2, 
  AlertTriangle, 
  FileSpreadsheet, 
  X,
  Users,
  Clock,
  CheckSquare,
  Square
} from 'lucide-react';

export default function ViolationHistory() {
  const navigate = useNavigate();
  const { examSessions, examPackages } = useExamStore();

  const [allSessions, setAllSessions] = useState([]);
  const [allPackages, setAllPackages] = useState([]);
  const [allClassrooms, setAllClassrooms] = useState([]);

  // Multi-level Filtering (Identik dengan Menu E-Jurnal)
  const [selectedPackageFilter, setSelectedPackageFilter] = useState('ALL');
  const [selectedClassFilter, setSelectedClassFilter] = useState('ALL');
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Data Pelanggaran
  const [violations, setViolations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);

  // Modal Konfirmasi Hapus Satuan & Massal
  const [deleteTarget, setDeleteTarget] = useState(null); // Single violation object
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // 1. Ambil data master sesi, paket, dan kelas saat inisialisasi
  // Helper resolusi objek & nama kelas terpilih
  const selectedClassObj = useMemo(() => {
    if (!selectedClassFilter || selectedClassFilter === 'ALL') return null;
    return allClassrooms.find((c) => String(c.id) === String(selectedClassFilter) || c.name === selectedClassFilter) || null;
  }, [selectedClassFilter, allClassrooms]);

  const selectedClassName = selectedClassObj ? selectedClassObj.name : (selectedClassFilter !== 'ALL' ? selectedClassFilter : null);

  useEffect(() => {
    const initializeMasterData = async () => {
      setIsLoading(true);
      try {
        const [sessionsData, packagesData, classroomsData] = await Promise.allSettled([
          examApi.getSessions(),
          examApi.getPackages(),
          getClassroomsApi()
        ]);

        const sessions = sessionsData.status === 'fulfilled' && Array.isArray(sessionsData.value) ? sessionsData.value : examSessions;
        const packages = packagesData.status === 'fulfilled' && Array.isArray(packagesData.value) ? packagesData.value : examPackages;
        const classrooms = classroomsData.status === 'fulfilled' && Array.isArray(classroomsData.value) ? classroomsData.value : [];

        setAllSessions(sessions || []);
        setAllPackages(packages || []);
        setAllClassrooms(classrooms || []);

        if (sessions && sessions.length > 0) {
          setSelectedSessionId(sessions[0].id);
        }
      } catch (err) {
        console.warn('Gagal memuat master data Riwayat Pelanggaran:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initializeMasterData();
  }, []);

  // 2. Filter sesi berdasarkan pilihan Paket Soal & Kelas (Sinkron Multi-Kelas)
  const filteredSessions = useMemo(() => {
    return allSessions.filter((ses) => {
      // 1. Filter Paket Soal
      if (selectedPackageFilter !== 'ALL') {
        const pkgId = ses.package?.id || ses.package || ses.packageId || ses.package_id;
        if (pkgId && String(pkgId) !== String(selectedPackageFilter)) return false;
      }

      // 2. Filter Kelas
      if (selectedClassFilter !== 'ALL') {
        if (ses.allow_all_classes || ses.is_all_classrooms) return true;

        const targetId = selectedClassObj ? String(selectedClassObj.id) : String(selectedClassFilter);
        const targetName = String(selectedClassName || selectedClassFilter || '').toLowerCase().trim().replace(/^(kelas|rombel)\s+/i, '');

        // Cek ID kelas pada sesi
        const multiClassIds = Array.isArray(ses.classrooms) 
          ? ses.classrooms.map((c) => String(c?.id || c || '')) 
          : (Array.isArray(ses.classroom_ids) ? ses.classroom_ids.map(String) : []);
        const singleClassId = ses.classroom?.id ? String(ses.classroom.id) : (ses.classroom_id ? String(ses.classroom_id) : null);

        if (multiClassIds.includes(targetId) || singleClassId === targetId) return true;

        // Cek Nama kelas pada sesi (aman terhadap tipe data object/string)
        const multiClassNames = Array.isArray(ses.classrooms)
          ? ses.classrooms.map((c) => {
              const nameStr = (c && typeof c === 'object') ? (c.name || '') : String(c || '');
              return String(nameStr).toLowerCase().trim().replace(/^(kelas|rombel)\s+/i, '');
            })
          : [];
        const rawSingleText = (
          typeof ses.classroom_display === 'string' ? ses.classroom_display :
          typeof ses.classroom_name === 'string' ? ses.classroom_name :
          (ses.classroom && typeof ses.classroom.name === 'string') ? ses.classroom.name :
          typeof ses.classroom === 'string' ? ses.classroom : ''
        );
        const singleClassText = rawSingleText.toLowerCase().trim();
        const singleClassNames = singleClassText.split(',').map((s) => s.trim().replace(/^(kelas|rombel)\s+/i, ''));

        if (multiClassNames.includes(targetName)) return true;
        if (singleClassNames.includes(targetName)) return true;
        if (singleClassText.includes(targetName)) return true;

        return false;
      }

      return true;
    });
  }, [allSessions, selectedPackageFilter, selectedClassFilter, selectedClassObj, selectedClassName]);

  // Update selectedSessionId jika sesi yang sedang dipilih tidak ada di daftar filtered
  useEffect(() => {
    if (filteredSessions.length > 0) {
      if (!filteredSessions.some((s) => s.id === selectedSessionId)) {
        setSelectedSessionId(filteredSessions[0].id);
      }
    } else {
      setSelectedSessionId('');
    }
  }, [filteredSessions, selectedSessionId]);

  // 3. Sesi aktif yang sedang dipilih (Strict: tidak fallback ke sesi luar filter)
  const currentSession = useMemo(() => {
    if (filteredSessions.length === 0) return null;
    if (!selectedSessionId) return filteredSessions[0];
    return filteredSessions.find((s) => s.id === selectedSessionId) || filteredSessions[0];
  }, [selectedSessionId, filteredSessions]);

  // 4. Ambil daftar pelanggaran terfilter dari backend
  const fetchViolations = useCallback(async () => {
    if (!currentSession?.id) {
      setViolations([]);
      setSelectedIds([]);
      return;
    }
    setIsLoading(true);
    try {
      const params = {
        session_id: currentSession.id
      };
      if (selectedPackageFilter !== 'ALL') {
        params.package_id = selectedPackageFilter;
      }
      if (selectedClassFilter !== 'ALL') {
        params.classroom_id = selectedClassName || selectedClassFilter;
      }

      const data = await proctoringApi.getViolations(params);
      setViolations(Array.isArray(data) ? data : []);
      setSelectedIds([]);
    } catch (err) {
      console.warn('Gagal memuat log pelanggaran backend:', err);
      setViolations([]);
      setSelectedIds([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentSession?.id, selectedPackageFilter, selectedClassFilter, selectedClassName]);

  useEffect(() => {
    fetchViolations();
  }, [fetchViolations]);

  // 5. Filter pelanggaran secara reaktif (Kelas + Search Query)
  const filteredViolations = useMemo(() => {
    if (!currentSession) return [];

    return violations.filter((v) => {
      if (!v) return false;

      // Filter Kelas Siswa jika selectedClassFilter aktif
      if (selectedClassFilter !== 'ALL') {
        const targetId = selectedClassObj ? String(selectedClassObj.id) : String(selectedClassFilter);
        const targetName = String(selectedClassName || selectedClassFilter || '').toLowerCase().trim().replace(/^(kelas|rombel)\s+/i, '');

        const matchId = v.classroom_id && String(v.classroom_id) === targetId;
        const rawVCls = (v.classroom_name && typeof v.classroom_name === 'string') 
          ? v.classroom_name 
          : (typeof v.classroom === 'string' ? v.classroom : (v.classroom?.name || ''));
        const vCls = String(rawVCls).toLowerCase().trim().replace(/^(kelas|rombel)\s+/i, '');
        const matchName = Boolean(vCls && targetName && (vCls === targetName || vCls.includes(targetName) || targetName.includes(vCls)));

        if (!matchId && !matchName) {
          return false;
        }
      }

      // Filter Pencarian Teks
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = v.student_name && String(v.student_name).toLowerCase().includes(q);
        const matchNisn = v.nisn && String(v.nisn).toLowerCase().includes(q);
        const matchDesc = v.description && String(v.description).toLowerCase().includes(q);
        const matchType = v.violation_type_label && String(v.violation_type_label).toLowerCase().includes(q);
        if (!matchName && !matchNisn && !matchDesc && !matchType) return false;
      }

      return true;
    });
  }, [violations, currentSession, selectedClassFilter, selectedClassName, selectedClassObj, searchQuery]);

  // Statistik Ringkasan Dihitung dari Data Terfilter
  const totalViolations = filteredViolations.length;
  const uniqueStudents = new Set(filteredViolations.map((v) => v.nisn || v.student_name)).size;
  const unlockedCount = filteredViolations.filter((v) => Boolean(v.unlocked_by_teacher_at)).length;
  const stillLockedCount = Math.max(0, totalViolations - unlockedCount);

  // Toggle Pilihan Checkbox
  const handleToggleSelectAll = () => {
    if (selectedIds.length === filteredViolations.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredViolations.map((v) => v.id));
    }
  };

  const handleToggleSelectOne = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Handler Hapus Satuan
  const handleConfirmSingleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await proctoringApi.deleteViolation(deleteTarget.id);
      setToastMessage(`Catatan pelanggaran ${deleteTarget.student_name} berhasil dihapus. E-Jurnal telah disinkronkan.`);
      setTimeout(() => setToastMessage(''), 5000);
      setDeleteTarget(null);
      await fetchViolations();
    } catch (err) {
      alert('Gagal menghapus catatan pelanggaran: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsDeleting(false);
    }
  };

  // Handler Hapus Massal (Terpilih atau Seluruh Sesi Sesuai Filter Kelas)
  const handleConfirmBulkDelete = async () => {
    if (!currentSession?.id) return;
    setIsDeleting(true);
    try {
      const payload = selectedIds.length > 0 
        ? { ids: selectedIds } 
        : { 
            session_id: currentSession.id,
            classroom_id: selectedClassFilter !== 'ALL' ? (selectedClassName || selectedClassFilter) : undefined
          };

      const res = await proctoringApi.bulkDeleteViolations(payload);
      setToastMessage(res.message || 'Catatan pelanggaran berhasil dihapus dan E-Jurnal telah disinkronkan.');
      setTimeout(() => setToastMessage(''), 5000);
      setIsBulkDeleteModalOpen(false);
      setSelectedIds([]);
      await fetchViolations();
    } catch (err) {
      alert('Gagal menghapus catatan pelanggaran massal: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* ======================================================== */}
      {/* 1. HEADER HALAMAN & ACTION TOOLBAR                       */}
      {/* ======================================================== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#EFF9CE] p-6 rounded-3xl border-2 border-[#8BC829] shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-rose-600 animate-pulse" />
            <h1 className="text-xl sm:text-2xl font-black text-[#102919] tracking-tight">
              Riwayat Pelanggaran Integritas Ujian
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[#102919]/80 mt-1 leading-relaxed font-medium">
            Monitor dan bersihkan data pelanggaran sensor yang tidak disengaja oleh siswa sebelum E-Jurnal Berita Acara dicetak resmi.
          </p>
        </div>

        {/* Toolbar Tombol Aksi */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => navigate('/teacher/ejournal')}
            className="px-4 py-2.5 rounded-xl bg-[#102919] hover:bg-[#1F4B2C] text-[#C3E956] border border-[#C3E956]/40 text-xs font-black transition flex items-center gap-1.5 shadow-sm active:scale-[0.98] cursor-pointer"
            title="Buka Lembar E-Jurnal Berita Acara untuk Verifikasi & Cetak"
          >
            <FileSpreadsheet className="w-4 h-4 text-[#C3E956]" />
            <span>Lihat di E-Jurnal</span>
          </button>

          <button
            onClick={fetchViolations}
            disabled={isLoading}
            className="p-2.5 rounded-xl bg-[#E2F4B4] border-2 border-[#8BC829] hover:bg-[#C3E956] text-[#102919] transition shadow-xs active:scale-[0.98] cursor-pointer"
            title="Muat Ulang Riwayat"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-[#102919]' : 'text-[#102919]'}`} />
          </button>
        </div>
      </div>

      {/* Toast Notifikasi Sukses */}
      {toastMessage && (
        <div className="p-3.5 bg-[#C3E956] text-[#0A1D11] border-2 border-[#4D7111]/30 rounded-2xl text-xs font-black flex items-center gap-2 shadow-xs animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-[#0A1D11] shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. KARTU FILTER PERSIS E-JURNAL (PAKET, KELAS, & SESI)   */}
      {/* ======================================================== */}
      <div className="bg-[#EFF9CE] rounded-3xl p-6 border-2 border-[#8BC829] shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b-2 border-[#8BC829]/40 pb-3">
          <div className="flex items-center gap-2 text-xs font-black text-[#102919] uppercase tracking-wider">
            <Filter className="w-4 h-4 text-[#102919]" />
            <span>Pilih Paket Soal, Rombel Kelas, & Sesi Ujian</span>
          </div>
          <span className="text-[11px] font-mono font-bold text-[#102919]/70">
            {filteredSessions.length} sesi asesmen
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 1. Filter Paket Soal */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-[#102919] mb-1.5">
              Filter Paket Soal:
            </label>
            <select
              value={selectedPackageFilter}
              onChange={(e) => setSelectedPackageFilter(e.target.value)}
              className="w-full text-xs font-bold rounded-xl border-2 border-[#8BC829] focus:outline-none focus:ring-2 focus:ring-[#C3E956] focus:border-[#102919] py-2.5 px-3 bg-[#F9FDEE] text-[#102919]"
            >
              <option value="ALL">Semua Paket Soal</option>
              {allPackages.map((pkg) => (
                <option key={pkg.id} value={pkg.id}>
                  {pkg.subject_name || pkg.subjectName} — {pkg.title}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Filter Kelas / Rombel */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-[#102919] mb-1.5">
              Filter Kelas / Rombel:
            </label>
            <select
              value={selectedClassFilter}
              onChange={(e) => setSelectedClassFilter(e.target.value)}
              className="w-full text-xs font-bold rounded-xl border-2 border-[#8BC829] focus:outline-none focus:ring-2 focus:ring-[#C3E956] focus:border-[#102919] py-2.5 px-3 bg-[#F9FDEE] text-[#102919]"
            >
              <option value="ALL">-- Seluruh Kelas ({allClassrooms.length}) --</option>
              {allClassrooms.map((cls) => (
                <option key={cls.id || cls.name} value={cls.id}>
                  {cls.name} ({cls.academic_year || 'Aktif'})
                </option>
              ))}
            </select>
          </div>

          {/* 3. Pilih Sesi Ujian Terbuka */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-[#102919] mb-1.5">
              Pilih Sesi Ujian Terbuka:
            </label>
            <select
              value={selectedSessionId}
              onChange={(e) => setSelectedSessionId(e.target.value)}
              disabled={filteredSessions.length === 0}
              className="w-full text-xs font-bold rounded-xl border-2 border-[#8BC829] focus:outline-none focus:ring-2 focus:ring-[#C3E956] focus:border-[#102919] py-2.5 px-3 bg-[#F9FDEE] text-[#102919] disabled:opacity-50"
            >
              {filteredSessions.length === 0 ? (
                <option value="">Tidak ada sesi yang cocok</option>
              ) : (
                filteredSessions.map((ses) => (
                  <option key={ses.id} value={ses.id}>
                    {ses.subject_name || ses.subjectName} • {ses.classroom_name || ses.classroom} ({ses.title})
                  </option>
                ))
              )}
            </select>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. 4 KARTU METRIK STATISTIK PELANGGARAN                   */}
      {/* ======================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-[#EFF9CE] p-5 rounded-2xl border-2 border-[#8BC829] shadow-sm">
          <div className="text-[11px] font-black uppercase tracking-wider text-[#102919]/70">
            Total Pelanggaran
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-rose-700 mt-1">
            {totalViolations} <span className="text-xs font-bold text-[#102919]/60 font-sans">kejadian</span>
          </div>
        </div>

        <div className="bg-[#EFF9CE] p-5 rounded-2xl border-2 border-[#8BC829] shadow-sm">
          <div className="text-[11px] font-black uppercase tracking-wider text-[#102919]/70">
            Siswa Terdeteksi
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-[#102919] mt-1">
            {uniqueStudents} <span className="text-xs font-bold text-[#102919]/60 font-sans">orang</span>
          </div>
        </div>

        <div className="bg-[#EFF9CE] p-5 rounded-2xl border-2 border-[#8BC829] shadow-sm">
          <div className="text-[11px] font-black uppercase tracking-wider text-[#102919]/70">
            Sudah Dibuka Kunci
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-[#102919] mt-1">
            {unlockedCount} <span className="text-xs font-bold text-[#102919]/60 font-sans">kali</span>
          </div>
        </div>

        <div className="bg-[#EFF9CE] p-5 rounded-2xl border-2 border-amber-300 shadow-sm">
          <div className="text-[11px] font-black uppercase tracking-wider text-amber-900">
            Status Masih Terkunci
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-amber-900 mt-1">
            {stillLockedCount} <span className="text-xs font-bold text-amber-800 font-sans">kali</span>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 4. TABEL RIWAYAT PELANGGARAN PERSIS CATATAN INTEGRITAS   */}
      {/* ======================================================== */}
      <div className="bg-[#EFF9CE] rounded-3xl border-2 border-[#8BC829] shadow-sm overflow-hidden space-y-4 p-5 sm:p-6 text-[#102919]">
        {/* Toolbar Tabel: Search & Tombol Hapus Massal */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-[#102919]/60 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari siswa, NISN, atau keterangan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border-2 border-[#8BC829] focus:outline-none focus:ring-2 focus:ring-[#C3E956] focus:border-[#102919] bg-[#F9FDEE] text-[#102919] font-bold"
            />
          </div>

          <div className="flex items-center gap-2">
            {selectedIds.length > 0 ? (
              <button
                onClick={() => setIsBulkDeleteModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black transition flex items-center gap-1.5 shadow-sm active:scale-[0.98] cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus Terpilih ({selectedIds.length})</span>
              </button>
            ) : violations.length > 0 ? (
              <button
                onClick={() => setIsBulkDeleteModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-[#E2F4B4] border-2 border-rose-300 hover:bg-rose-100 text-rose-900 text-xs font-black transition flex items-center gap-1.5 active:scale-[0.98] cursor-pointer"
                title="Hapus seluruh log pelanggaran pada sesi aktif ini sekaligus"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-700" />
                <span>Bersihkan Seluruh Log Sesi</span>
              </button>
            ) : null}
          </div>
        </div>

        {/* Kontainer Tabel */}
        <div className="overflow-x-auto rounded-2xl border-2 border-[#8BC829]">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#E2F4B4] text-[#102919] font-black uppercase text-[10px] tracking-wider border-b-2 border-[#8BC829]">
              <tr>
                <th className="py-3 px-3 text-center w-8">
                  <input
                    type="checkbox"
                    checked={filteredViolations.length > 0 && selectedIds.length === filteredViolations.length}
                    onChange={handleToggleSelectAll}
                    className="rounded border-[#8BC829] text-[#102919] focus:ring-[#C3E956] cursor-pointer"
                  />
                </th>
                <th className="py-3 px-3 text-center w-10">No</th>
                <th className="py-3 px-3">Nama Siswa</th>
                <th className="py-3 px-3 text-center">Kelas</th>
                <th className="py-3 px-3 text-center">NISN</th>
                <th className="py-3 px-3 text-center">Jenis Pelanggaran</th>
                <th className="py-3 px-3">Keterangan Sensor</th>
                <th className="py-3 px-3 text-center">Tanggal</th>
                <th className="py-3 px-3 text-center">Waktu</th>
                <th className="py-3 px-3 text-center">Status Buka Kunci</th>
                <th className="py-3 px-3 text-center w-16">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-[#8BC829]/30 bg-[#EFF9CE]">
              {isLoading ? (
                <tr>
                  <td colSpan="11" className="py-10 text-center text-[#102919] text-xs font-bold">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-1.5 text-rose-600" />
                    <span>Memuat riwayat pelanggaran...</span>
                  </td>
                </tr>
              ) : filteredViolations.length === 0 ? (
                <tr>
                  <td colSpan="11" className="py-12 text-center text-[#102919]/70 text-xs">
                    {searchQuery ? (
                      <div className="font-bold">Tidak ditemukan data pelanggaran dengan kata kunci "{searchQuery}".</div>
                    ) : (
                      <div className="space-y-1">
                        <div className="font-black text-[#102919] text-sm">Bersih! Tidak Ada Catatan Pelanggaran</div>
                        <p className="text-[#102919]/80 text-[11px] font-medium">
                          {selectedClassFilter !== 'ALL' 
                            ? `Seluruh siswa kelas ${selectedClassName || selectedClassFilter} pada sesi ini tertib tanpa insiden yang tercatat.`
                            : 'Seluruh siswa pada sesi ini mengerjakan secara tertib tanpa ada insiden yang tercatat.'}
                        </p>
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                filteredViolations.map((v, idx) => {
                  const isSelected = selectedIds.includes(v.id);
                  return (
                    <tr 
                      key={v.id || idx}
                      className={`hover:bg-[#E2F4B4] transition ${isSelected ? 'bg-[#E2F4B4]' : ''}`}
                    >
                      <td className="py-2.5 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectOne(v.id)}
                          className="rounded border-[#8BC829] text-rose-600 focus:ring-rose-500 cursor-pointer"
                        />
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-black text-rose-700">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3 font-black text-[#102919]">
                        {v.student_name}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-lg bg-[#E2F4B4] border border-[#8BC829] text-[#102919] text-[10px] font-mono font-bold">
                          {v.classroom_name || v.classroom || '-'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-[#102919]">
                        {v.nisn}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-lg bg-rose-100 text-rose-900 border border-rose-300 font-bold text-[10px]">
                          {v.violation_type_label || v.violation_type}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-[#102919] font-medium leading-relaxed">
                        {v.description}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-[#102919] whitespace-nowrap">
                        {v.detected_date && v.detected_date !== '-' 
                          ? v.detected_date 
                          : (v.detected_at ? new Date(v.detected_at).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-')}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-[#102919] whitespace-nowrap">
                        {v.detected_time && v.detected_time !== '-'
                          ? v.detected_time
                          : (v.detected_at ? new Date(v.detected_at).toLocaleTimeString('id-ID') : '-')}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {v.unlocked_by_teacher_at ? (
                          <span className="text-[#102919] bg-[#C3E956] border border-[#4D7111]/30 px-2 py-0.5 rounded-lg font-black text-[10px] inline-flex items-center justify-center gap-1">
                            <Check className="w-3 h-3" /> Dibuka [{new Date(v.unlocked_by_teacher_at).toLocaleTimeString('id-ID')}]
                          </span>
                        ) : (
                          <span className="text-white bg-rose-600 px-2 py-0.5 rounded-lg font-black text-[10px] inline-block animate-pulse">
                            Terkunci
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(v)}
                          className="p-1.5 rounded-xl bg-[#E2F4B4] border border-[#8BC829] hover:bg-rose-100 text-[#102919] hover:text-rose-700 transition shadow-2xs active:scale-95 cursor-pointer"
                          title="Hapus catatan pelanggaran ini"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Keterangan Sinkronisasi Otomatis E-Jurnal */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-[#102919]/80 font-bold pt-1 gap-2">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-[#102919]" />
            <span>Setiap data riwayat yang dihapus di sini otomatis langsung memperbarui catatan integritas dan rekapitulasi di E-Jurnal.</span>
          </div>
          <div className="font-mono">
            Menampilkan {filteredViolations.length} dari {totalViolations} data
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 5. MODAL KONFIRMASI HAPUS SATUAN                         */}
      {/* ======================================================== */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-[#0A1D11]/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn select-none">
          <div className="bg-[#EFF9CE] rounded-3xl border-2 border-[#8BC829] max-w-md w-full p-6 shadow-2xl space-y-4 text-[#102919]">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 border-2 border-rose-300 flex items-center justify-center text-rose-700 shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-black text-[#102919] tracking-tight">
                  Hapus Catatan Pelanggaran Siswa?
                </h3>
                <p className="text-xs text-[#102919]/70 mt-1 leading-relaxed font-medium">
                  Apakah Anda yakin ingin menghapus catatan insiden untuk siswa <strong className="text-[#102919] font-black">{deleteTarget.student_name}</strong>?
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="p-1.5 rounded-xl text-[#102919] hover:bg-[#E2F4B4] transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-[#E2F4B4] border-2 border-[#8BC829] rounded-2xl p-3.5 text-xs text-[#102919] space-y-1 font-bold">
              <div>• <strong>Jenis:</strong> {deleteTarget.violation_type_label || deleteTarget.violation_type}</div>
              <div>• <strong>Keterangan:</strong> {deleteTarget.description}</div>
              <div>• <strong>Waktu:</strong> {deleteTarget.detected_at ? new Date(deleteTarget.detected_at).toLocaleTimeString('id-ID') : '-'}</div>
            </div>

            <div className="text-[11px] leading-relaxed bg-[#F9FDEE] border-2 border-[#8BC829] p-3 rounded-2xl text-[#102919] font-medium">
              Penghapusan ini akan mengurangkan total akumulasi pelanggaran siswa tersebut dan seketika tercermin pada lembar Berita Acara E-Jurnal sebelum dicetak.
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t-2 border-[#8BC829]/40">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-black text-[#102919] bg-[#E2F4B4] hover:bg-[#d6f0a3] border-2 border-[#8BC829] transition disabled:opacity-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmSingleDelete}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black transition flex items-center gap-1.5 shadow-sm active:scale-[0.98] disabled:opacity-50 cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Menghapus...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Ya, Hapus Catatan</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 6. MODAL KONFIRMASI HAPUS MASSAL                         */}
      {/* ======================================================== */}
      {isBulkDeleteModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#0A1D11]/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn select-none">
          <div className="bg-[#EFF9CE] rounded-3xl border-2 border-[#8BC829] max-w-md w-full p-6 shadow-2xl space-y-4 text-[#102919]">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 border-2 border-rose-300 flex items-center justify-center text-rose-700 shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-black text-[#102919] tracking-tight">
                  {selectedIds.length > 0 
                    ? `Hapus ${selectedIds.length} Catatan Pelanggaran Terpilih?` 
                    : `Bersihkan Seluruh Log Pelanggaran Sesi Ini?`}
                </h3>
                <p className="text-xs text-[#102919]/70 mt-1 leading-relaxed font-medium">
                  {selectedIds.length > 0
                    ? `Seluruh ${selectedIds.length} catatan pelanggaran yang Anda pilih akan dihapus permanen dari basis data.`
                    : `Seluruh catatan insiden pelanggaran pada sesi ${currentSession?.title || 'ini'} akan dihapus permanen.`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsBulkDeleteModalOpen(false)}
                className="p-1.5 rounded-xl text-[#102919] hover:bg-[#E2F4B4] transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-[11px] text-[#102919] bg-[#E2F4B4] border-2 border-[#8BC829] p-3.5 rounded-2xl leading-relaxed font-medium">
              Tindakan ini akan me-reset akumulasi pelanggaran siswa yang bersangkutan. Tabel Catatan Integritas pada E-Jurnal otomatis disinkronkan secara bersih sebelum Anda mencetak dokumen berita acara.
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t-2 border-[#8BC829]/40">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setIsBulkDeleteModalOpen(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-black text-[#102919] bg-[#E2F4B4] hover:bg-[#d6f0a3] border-2 border-[#8BC829] transition disabled:opacity-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmBulkDelete}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black transition flex items-center gap-1.5 shadow-sm active:scale-[0.98] disabled:opacity-50 cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Menghapus...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Ya, Hapus Sekarang</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
