import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Plus, 
  FileSpreadsheet, 
  Download, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  GraduationCap,
  Search,
  X
} from 'lucide-react';
import Modal from '../../components/common/Modal';
import { 
  getTeachersApi, 
  createTeacherApi, 
  updateTeacherApi, 
  deleteTeacherApi, 
  downloadTeacherTemplateExcelApi, 
  importTeachersExcelApi 
} from '../../api/authApi';

export default function TeacherManagement() {
  const [teachers, setTeachers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);

  // Modal Tambah / Edit Guru (Tanpa Input Password)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState(null);
  const [formData, setFormData] = useState({
    full_name: '',
    nip: '',
    email: ''
  });
  const [modalError, setModalError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal Hapus Guru
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [teacherToDelete, setTeacherToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Modal Import Excel
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [importError, setImportError] = useState('');
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);
  const fileInputRef = useRef(null);

  // Toast Notifikasi
  const [toastMessage, setToastMessage] = useState('');
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const fetchTeachers = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = {};
      if (searchTerm.trim()) params.search = searchTerm.trim();

      const data = await getTeachersApi(params);
      setTeachers(data || []);
    } catch (err) {
      console.error('Gagal mengambil data guru:', err);
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTeachers();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchTeachers]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, entriesPerPage]);

  // Helper Initials
  const getInitials = (name) => {
    if (!name) return 'GP';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Pagination calculation
  const indexOfLastItem = currentPage * entriesPerPage;
  const indexOfFirstItem = indexOfLastItem - entriesPerPage;
  const currentItems = teachers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(teachers.length / entriesPerPage) || 1;

  // Buka Modal Tambah Guru
  const handleOpenAdd = () => {
    setIsEditing(false);
    setSelectedTeacherId(null);
    setFormData({
      full_name: '',
      nip: '',
      email: ''
    });
    setModalError('');
    setIsModalOpen(true);
  };

  // Buka Modal Edit Guru
  const handleOpenEdit = (teacher) => {
    setIsEditing(true);
    setSelectedTeacherId(teacher.id);
    setFormData({
      full_name: teacher.full_name || '',
      nip: teacher.nip || teacher.username || '',
      email: teacher.email || ''
    });
    setModalError('');
    setIsModalOpen(true);
  };

  // Simpan Tambah / Edit Guru
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.full_name.trim()) {
      setModalError('Nama lengkap guru wajib diisi!');
      return;
    }
    if (!formData.nip.trim()) {
      setModalError('NIP guru wajib diisi!');
      return;
    }

    setIsSubmitting(true);
    setModalError('');

    try {
      if (isEditing) {
        await updateTeacherApi(selectedTeacherId, formData);
        showToast('Data guru berhasil diperbarui!');
      } else {
        await createTeacherApi(formData);
        showToast('Guru baru berhasil didaftarkan! (Username & Password = NIP)');
      }
      setIsModalOpen(false);
      fetchTeachers();
    } catch (err) {
      const errData = err.response?.data;
      let msg = 'Gagal menyimpan data guru.';
      if (errData) {
        if (typeof errData === 'string') msg = errData;
        else if (errData.nip) msg = `NIP: ${errData.nip.join(', ')}`;
        else if (errData.username) msg = `NIP/Username: ${errData.username.join(', ')}`;
        else if (errData.detail) msg = errData.detail;
      }
      setModalError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Buka Modal Konfirmasi Hapus Guru
  const handleOpenDelete = (teacher) => {
    setTeacherToDelete(teacher);
    setIsDeleteModalOpen(true);
  };

  // Eksekusi Hapus Guru
  const handleConfirmDelete = async () => {
    if (!teacherToDelete) return;
    setIsDeleting(true);
    try {
      await deleteTeacherApi(teacherToDelete.id);
      showToast(`Guru ${teacherToDelete.full_name || teacherToDelete.nip} berhasil dihapus!`);
      setIsDeleteModalOpen(false);
      setTeacherToDelete(null);
      fetchTeachers();
    } catch (err) {
      alert('Gagal menghapus guru: ' + (err.response?.data?.detail || err.message));
    } finally {
      setIsDeleting(false);
    }
  };

  // Download Template Excel Guru
  const handleDownloadTemplate = async () => {
    setIsDownloadingTemplate(true);
    try {
      await downloadTeacherTemplateExcelApi('Template_Import_Guru_E-Ujian.xlsx');
      showToast('Template Excel Guru berhasil diunduh!');
    } catch (err) {
      alert('Gagal mengunduh template Excel: ' + err.message);
    } finally {
      setIsDownloadingTemplate(false);
    }
  };

  // Proses Upload & Impor Excel Guru
  const handleImportSubmit = async () => {
    if (!importFile) {
      setImportError('Silakan pilih berkas Excel terlebih dahulu!');
      return;
    }
    setIsImporting(true);
    setImportError('');
    setImportResult(null);

    try {
      const res = await importTeachersExcelApi(importFile);
      setImportResult(res);
      showToast(res.message || 'Proses impor guru berhasil!');
      fetchTeachers();

      // Otomatis menutup pop-up modal import setelah data berhasil masuk
      setTimeout(() => {
        setIsImportModalOpen(false);
        setImportFile(null);
        setImportResult(null);
        setImportError('');
        if (fileInputRef.current) fileInputRef.current.value = '';
      }, 1000);
    } catch (err) {
      setImportError(err.response?.data?.error || 'Gagal mengimpor file Excel guru.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Toast Notifikasi Floating */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 animate-bounce">
          <div className="px-5 py-3 rounded-xl bg-slate-900 border-2 border-emerald-500 text-white font-bold text-xs flex items-center gap-2.5 shadow-2xl">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Header Halaman & 3 Tombol Aksi */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#E2F4B4] border-2 border-[#8BC829] text-[#102919] flex items-center justify-center shadow-xs">
              <GraduationCap className="w-5 h-5 text-[#102919]" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-[#102919] tracking-tight">
              Data Guru Pengawas
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[#102919]/80 mt-1 leading-relaxed font-medium">
            Kelola data dewan guru pengawas asesmen (Akun otomatis: Username & Password = NIP).
          </p>
        </div>

        {/* 3 Tombol Aksi */}
        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2.5 bg-[#C3E956] hover:bg-[#b8e337] text-[#0A1D11] border-2 border-[#4D7111]/30 rounded-xl text-xs font-black transition flex items-center gap-2 shadow-sm hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#0A1D11] stroke-[2.5]" />
            <span>Tambah Guru</span>
          </button>

          <button
            onClick={() => {
              setImportFile(null);
              setImportError('');
              setImportResult(null);
              setIsImportModalOpen(true);
            }}
            className="px-4 py-2.5 bg-[#E2F4B4] hover:bg-[#d6f0a3] text-[#102919] border-2 border-[#8BC829] rounded-xl text-xs font-black transition flex items-center gap-2 shadow-xs hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-[#102919]" />
            <span>Import Excel</span>
          </button>

          <button
            onClick={handleDownloadTemplate}
            disabled={isDownloadingTemplate}
            className="px-4 py-2.5 bg-[#E2F4B4] hover:bg-[#d6f0a3] text-[#102919] border-2 border-[#8BC829] rounded-xl text-xs font-black transition flex items-center gap-2 shadow-xs hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
          >
            <Download className="w-4 h-4 text-[#102919]" />
            <span>{isDownloadingTemplate ? 'Mengunduh...' : 'Template Excel'}</span>
          </button>
        </div>
      </div>

      {/* Bar Pencarian, Show Entries, & Refresh */}
      <div className="bg-[#EFF9CE] rounded-3xl p-4 sm:p-5 border-2 border-[#8BC829] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Sisi Kiri: Show Entries */}
        <div className="flex items-center gap-2 text-xs text-[#102919] font-bold">
          <span>Show</span>
          <select
            value={entriesPerPage}
            onChange={(e) => setEntriesPerPage(Number(e.target.value))}
            className="px-2.5 py-1.5 bg-[#F9FDEE] border-2 border-[#8BC829] rounded-xl text-xs font-black text-[#102919] focus:outline-none focus:ring-2 focus:ring-[#C3E956] cursor-pointer"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
          <span>entries</span>
        </div>

        {/* Sisi Kanan: Search Bar & Counter */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-[#102919]/50 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari Nama atau NIP..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-7 py-2 bg-[#F9FDEE] border-2 border-[#8BC829] rounded-xl text-xs text-[#102919] placeholder-[#102919]/50 font-medium focus:outline-none focus:border-[#102919] focus:ring-2 focus:ring-[#C3E956] transition"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#102919]/50 hover:text-[#102919]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-[#102919]/80 font-bold hidden md:inline">
              Total: <strong className="text-[#102919] font-mono font-black">{teachers.length}</strong> Guru
            </span>
            <button
              onClick={fetchTeachers}
              disabled={isLoading}
              className="p-2.5 rounded-xl bg-[#E2F4B4] border-2 border-[#8BC829] hover:bg-[#d6f0a3] text-[#102919] transition shadow-xs hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer"
              title="Muat Ulang"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#102919]' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Tabel Data Guru */}
      <div className="bg-[#EFF9CE] rounded-3xl border-2 border-[#8BC829] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#102919]">
            <thead className="bg-[#E2F4B4] border-b-2 border-[#8BC829] text-[#102919] font-black uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4 w-12 text-center">NO</th>
                <th className="py-3.5 px-4">Nama Lengkap Guru</th>
                <th className="py-3.5 px-4">NIP (Username)</th>
                <th className="py-3.5 px-4">Email</th>
                <th className="py-3.5 px-4 text-center w-36">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-[#8BC829]/30">
              {teachers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-12 text-center text-[#102919]/60 text-xs font-medium">
                    {isLoading ? 'Memuat data guru...' : 'Belum ada data guru yang terdaftar.'}
                  </td>
                </tr>
              ) : (
                currentItems.map((teacher, index) => (
                  <tr key={teacher.id} className="hover:bg-[#E2F4B4]/60 transition">
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-[#102919]/70">
                      {indexOfFirstItem + index + 1}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-[#102919] text-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-[#102919] text-[#C3E956] font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                          {getInitials(teacher.full_name)}
                        </div>
                        <div>
                          <div className="text-[#102919] font-black">{teacher.full_name}</div>
                          <div className="text-[11px] text-[#102919]/60 font-medium">Guru Pengawas Asesmen</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-mono px-3 py-1 rounded-xl bg-[#E2F4B4] border-2 border-[#8BC829] text-[#102919] font-black text-[11px] shadow-2xs">
                        {teacher.nip || teacher.username}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-[#102919]/80 font-mono text-[11px] font-medium">
                      {teacher.email || '-'}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleOpenEdit(teacher)}
                          className="px-3 py-1.5 rounded-xl bg-[#E2F4B4] text-[#102919] hover:bg-[#d6f0a3] border-2 border-[#8BC829] transition text-xs font-black flex items-center gap-1 shadow-xs hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer"
                          title="Edit Guru"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-[#102919]" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => handleOpenDelete(teacher)}
                          className="px-3 py-1.5 rounded-xl text-rose-700 hover:text-white hover:bg-rose-600 border-2 border-rose-300 hover:border-rose-700 transition text-xs font-black flex items-center gap-1 active:scale-[0.98] cursor-pointer"
                          title="Hapus Guru"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Hapus</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Card Footer: Info Entri & Paginasi */}
        <div className="p-4 bg-[#E2F4B4]/70 border-t-2 border-[#8BC829]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#102919] font-bold">
          <div>
            Menampilkan <strong className="text-[#102919] font-black">{teachers.length > 0 ? indexOfFirstItem + 1 : 0}</strong> sampai{' '}
            <strong className="text-[#102919] font-black">{Math.min(indexOfLastItem, teachers.length)}</strong> dari{' '}
            <strong className="text-[#102919] font-black">{teachers.length}</strong> guru
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-xl border-2 border-[#8BC829] bg-[#EFF9CE] hover:bg-[#d6f0a3] text-[#102919] font-black text-xs disabled:opacity-40 transition cursor-pointer"
            >
              Prev
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-8 h-8 rounded-xl text-xs font-black transition flex items-center justify-center cursor-pointer ${
                  currentPage === page
                    ? 'bg-[#102919] text-[#C3E956] shadow-xs border-2 border-[#102919]'
                    : 'bg-[#EFF9CE] border-2 border-[#8BC829] text-[#102919] hover:bg-[#d6f0a3]'
                }`}
              >
                {page}
              </button>
            ))}

            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="px-3 py-1.5 rounded-xl border-2 border-[#8BC829] bg-[#EFF9CE] hover:bg-[#d6f0a3] text-[#102919] font-black text-xs disabled:opacity-40 transition cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODAL TAMBAH / EDIT GURU */}
      {/* ======================================================== */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={isEditing ? 'Perbarui Data Guru' : 'Tambah Guru Baru'}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {modalError && (
            <div className="p-3 rounded-xl bg-rose-100 border-2 border-rose-400 text-xs text-rose-900 font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{modalError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-black text-[#102919] uppercase tracking-wider mb-1.5">
              Nama Lengkap Guru <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              placeholder="Contoh: Supeni S.Pd"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-[#F9FDEE] border-2 border-[#8BC829] rounded-xl text-xs sm:text-sm font-semibold text-[#102919] placeholder-[#102919]/40 focus:outline-none focus:border-[#102919] focus:ring-2 focus:ring-[#C3E956] transition"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-black text-[#102919] uppercase tracking-wider mb-1.5">
              NIP (Nomor Induk Pegawai) <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              placeholder="Contoh: 198501012010011005 atau guru"
              value={formData.nip}
              onChange={(e) => setFormData({ ...formData, nip: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-[#F9FDEE] border-2 border-[#8BC829] rounded-xl text-xs sm:text-sm font-mono font-black text-[#102919] placeholder-[#102919]/40 focus:outline-none focus:border-[#102919] focus:ring-2 focus:ring-[#C3E956] transition"
              required
            />
            <p className="text-[11px] text-[#102919]/70 mt-1 font-medium">
              * NIP ini otomatis digunakan sebagai <strong>Username</strong> dan <strong>Password</strong> login awal guru.
            </p>
          </div>

          <div>
            <label className="block text-xs font-black text-[#102919] uppercase tracking-wider mb-1.5">
              Email Guru (Opsional)
            </label>
            <input
              type="email"
              placeholder="Contoh: guru@sdmis.sch.id"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-[#F9FDEE] border-2 border-[#8BC829] rounded-xl text-xs sm:text-sm font-semibold text-[#102919] placeholder-[#102919]/40 focus:outline-none focus:border-[#102919] focus:ring-2 focus:ring-[#C3E956] transition"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t-2 border-[#8BC829]/40">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2.5 rounded-xl bg-[#E2F4B4] border-2 border-[#8BC829] hover:bg-[#d6f0a3] text-[#102919] text-xs sm:text-sm font-black transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-[#C3E956] hover:bg-[#b8e337] text-[#0A1D11] border-2 border-[#4D7111]/30 text-xs sm:text-sm font-black transition shadow-xs flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting && <RefreshCw className="w-4 h-4 animate-spin text-[#0A1D11]" />}
              <span>{isEditing ? 'Simpan Perubahan' : 'Tambah Guru'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL KONFIRMASI HAPUS GURU */}
      {/* ======================================================== */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Konfirmasi Hapus Guru"
        maxWidth="max-w-sm"
      >
        <div className="space-y-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-rose-100 border-2 border-rose-300 text-rose-600 flex items-center justify-center mx-auto shadow-xs">
            <Trash2 className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-black text-[#102919]">
              Hapus akun guru ini?
            </h3>
            <p className="text-xs text-[#102919]/80 mt-1 font-medium leading-relaxed">
              Data guru <strong>{teacherToDelete?.full_name}</strong> (NIP: {teacherToDelete?.nip || teacherToDelete?.username}) akan dihapus secara permanen beserta akun loginnya di Manajemen Pengguna.
            </p>
          </div>
          <div className="flex items-center justify-center gap-2.5 pt-3 border-t-2 border-[#8BC829]/40">
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(false)}
              className="px-4 py-2.5 rounded-xl bg-[#E2F4B4] border-2 border-[#8BC829] hover:bg-[#d6f0a3] text-[#102919] text-xs font-black transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white border-2 border-rose-700 text-xs font-black transition shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {isDeleting ? 'Menghapus...' : 'Ya, Hapus'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL IMPORT EXCEL GURU */}
      {/* ======================================================== */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Import Data Guru via Excel"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#E2F4B4] border-2 border-[#8BC829] flex items-center justify-center text-[#102919] mx-auto mb-3 shadow-xs">
              <FileSpreadsheet className="w-7 h-7 text-[#102919]" />
            </div>
            <p className="text-xs text-[#102919] font-bold">
              Format Header Kolom Excel: <br />
              <span className="font-mono font-black text-[#102919] bg-[#E2F4B4] px-3 py-1 rounded-xl border border-[#8BC829] mt-1.5 inline-block shadow-2xs">
                NIP, Nama Guru, Email
              </span>
            </p>
          </div>

          {importError && (
            <div className="p-3 rounded-xl bg-rose-100 border-2 border-rose-300 text-xs text-rose-900 font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{importError}</span>
            </div>
          )}

          {importResult && (
            <div className="p-3 rounded-xl bg-[#E2F4B4] border-2 border-[#8BC829] text-xs text-[#102919] space-y-1">
              <div className="font-black flex items-center gap-1.5 text-[#102919]">
                <CheckCircle2 className="w-4 h-4 text-[#102919]" />
                <span>{importResult.message}</span>
              </div>
              <div className="text-[11px] text-[#102919]/80 font-bold pl-5.5">
                Guru Baru: <strong>{importResult.created_count}</strong> • Diperbarui: <strong>{importResult.updated_count}</strong>
              </div>
            </div>
          )}

          <div className="border-2 border-dashed border-[#8BC829] rounded-2xl p-4 bg-[#F9FDEE] text-center hover:bg-[#E2F4B4]/40 transition">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => setImportFile(e.target.files[0] || null)}
              className="text-xs text-[#102919] file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-2 file:border-[#4D7111]/30 file:text-xs file:font-black file:bg-[#C3E956] file:text-[#0A1D11] hover:file:bg-[#b8e337] cursor-pointer w-full font-medium"
            />
            <p className="text-[11px] text-[#102919]/70 mt-2 font-medium">
              Pilih file spreadsheet .xlsx atau .xls dari komputer Anda.
            </p>
          </div>

          <div className="flex items-center justify-between gap-2.5 pt-3 border-t-2 border-[#8BC829]/40">
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="text-xs font-black text-[#102919] hover:text-[#4D7111] flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#102919]" /> Unduh Format Template
            </button>

            <button
              type="button"
              onClick={handleImportSubmit}
              disabled={isImporting || !importFile}
              className="px-5 py-2.5 rounded-xl bg-[#C3E956] hover:bg-[#b8e337] text-[#0A1D11] border-2 border-[#4D7111]/30 text-xs sm:text-sm font-black shadow-xs transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isImporting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-[#0A1D11]" />
                  <span>Memproses...</span>
                </>
              ) : (
                <span>Import Sekarang</span>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
