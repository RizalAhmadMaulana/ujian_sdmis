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
            <div className="w-10 h-10 rounded-xl bg-[#F4FFFC] border border-[#91EAAF]/60 text-[#1F4B2C] flex items-center justify-center shadow-2xs">
              <GraduationCap className="w-5 h-5 text-[#1F4B2C]" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">
              Data Guru Pengawas
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1 leading-relaxed">
            Kelola data dewan guru pengawas asesmen (Akun otomatis: Username & Password = NIP).
          </p>
        </div>

        {/* 3 Tombol Aksi */}
        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-[#1F4B2C] hover:bg-[#183D23] text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-xs hover:-translate-y-0.5 active:scale-[0.98]"
          >
            <Plus className="w-4 h-4 text-[#C3E956] stroke-[2.5]" />
            <span>Tambah Guru</span>
          </button>

          <button
            onClick={() => {
              setImportFile(null);
              setImportError('');
              setImportResult(null);
              setIsImportModalOpen(true);
            }}
            className="px-4 py-2 bg-white hover:bg-[#F4FFFC] text-[#1F4B2C] border border-[#91EAAF]/60 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-2xs hover:-translate-y-0.5 active:scale-[0.98]"
          >
            <FileSpreadsheet className="w-4 h-4 text-[#4D7111]" />
            <span>Import Excel</span>
          </button>

          <button
            onClick={handleDownloadTemplate}
            disabled={isDownloadingTemplate}
            className="px-4 py-2 bg-white hover:bg-[#F4FFFC] text-[#1F4B2C] border border-[#91EAAF]/60 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-2xs hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-50"
          >
            <Download className="w-4 h-4 text-[#4D7111]" />
            <span>{isDownloadingTemplate ? 'Mengunduh...' : 'Template Excel'}</span>
          </button>
        </div>
      </div>

      {/* Bar Pencarian, Show Entries, & Refresh */}
      <div className="bg-white rounded-xl p-4 border border-[#91EAAF]/40 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Sisi Kiri: Show Entries */}
        <div className="flex items-center gap-2 text-xs text-zinc-600 font-medium">
          <span>Show</span>
          <select
            value={entriesPerPage}
            onChange={(e) => setEntriesPerPage(Number(e.target.value))}
            className="px-2.5 py-1.5 bg-[#F4FFFC] border border-[#91EAAF]/50 rounded-lg text-xs font-semibold text-[#1F4B2C] focus:bg-white focus:ring-1 focus:ring-[#1F4B2C] focus:border-[#1F4B2C] outline-none cursor-pointer"
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
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari Nama atau NIP..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-7 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs text-zinc-800 focus:bg-white focus:ring-1 focus:ring-[#1F4B2C] focus:border-[#1F4B2C] focus:outline-none transition"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-zinc-500 font-medium hidden md:inline">
              Total: <strong className="text-[#1F4B2C] font-mono font-bold">{teachers.length}</strong> Guru
            </span>
            <button
              onClick={fetchTeachers}
              disabled={isLoading}
              className="p-2 rounded-lg bg-white border border-[#91EAAF]/50 hover:bg-[#F4FFFC] text-[#1F4B2C] transition shadow-2xs hover:-translate-y-0.5 active:scale-[0.98]"
              title="Muat Ulang"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#1F4B2C]' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Tabel Data Guru */}
      <div className="bg-white rounded-xl border border-[#91EAAF]/40 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-700">
            <thead className="bg-[#F4FFFC] border-b border-[#91EAAF]/40 text-[#1F4B2C] font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4 w-12 text-center">NO</th>
                <th className="py-3 px-4">Nama Lengkap Guru</th>
                <th className="py-3 px-4">NIP (Username)</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4 text-center w-36">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {teachers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-12 text-center text-zinc-400 text-xs">
                    {isLoading ? 'Memuat data guru...' : 'Belum ada data guru yang terdaftar.'}
                  </td>
                </tr>
              ) : (
                currentItems.map((teacher, index) => (
                  <tr key={teacher.id} className="hover:bg-[#F4FFFC]/50 transition">
                    <td className="py-3 px-4 text-center font-mono text-zinc-500">
                      {indexOfFirstItem + index + 1}
                    </td>
                    <td className="py-3 px-4 font-semibold text-zinc-900 text-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#E1F8ED] border border-[#91EAAF]/60 text-[#1F4B2C] font-bold text-xs flex items-center justify-center shrink-0">
                          {getInitials(teacher.full_name)}
                        </div>
                        <div>
                          <div className="text-zinc-900 font-bold">{teacher.full_name}</div>
                          <div className="text-[11px] text-zinc-400 font-normal">Guru Pengawas Asesmen</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono px-2 py-0.5 rounded-md bg-[#F4FFFC] border border-[#91EAAF]/60 text-[#1F4B2C] font-bold text-[11px]">
                        {teacher.nip || teacher.username}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-zinc-600 font-normal">
                      {teacher.email || '-'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(teacher)}
                          className="px-2.5 py-1 rounded-md bg-[#F4FFFC] text-[#1F4B2C] hover:bg-[#E1F8ED] border border-[#91EAAF]/50 transition text-xs font-bold flex items-center gap-1 shadow-2xs hover:-translate-y-0.5 active:scale-[0.98]"
                          title="Edit Guru"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-[#1F4B2C]" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => handleOpenDelete(teacher)}
                          className="px-2.5 py-1 rounded-md text-zinc-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition text-xs font-semibold flex items-center gap-1 active:scale-[0.98]"
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
        <div className="p-3.5 bg-[#F4FFFC]/50 border-t border-[#91EAAF]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-zinc-500 font-medium">
          <div>
            Menampilkan <strong className="text-[#1F4B2C] font-bold">{teachers.length > 0 ? indexOfFirstItem + 1 : 0}</strong> sampai{' '}
            <strong className="text-[#1F4B2C] font-bold">{Math.min(indexOfLastItem, teachers.length)}</strong> dari{' '}
            <strong className="text-[#1F4B2C] font-bold">{teachers.length}</strong> guru
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-lg border border-[#91EAAF]/50 bg-white hover:bg-[#F4FFFC] text-[#1F4B2C] font-semibold text-xs disabled:opacity-40 transition"
            >
              Prev
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-7 h-7 rounded-lg text-xs font-bold transition flex items-center justify-center ${
                  currentPage === page
                    ? 'bg-[#1F4B2C] text-[#C3E956] shadow-xs border border-[#1F4B2C]'
                    : 'bg-white border border-[#91EAAF]/50 text-zinc-700 hover:bg-[#F4FFFC]'
                }`}
              >
                {page}
              </button>
            ))}

            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="px-3 py-1.5 rounded-lg border border-[#91EAAF]/50 bg-white hover:bg-[#F4FFFC] text-[#1F4B2C] font-semibold text-xs disabled:opacity-40 transition"
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
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{modalError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Nama Lengkap Guru <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Contoh: Supeni S.Pd"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs sm:text-sm font-semibold text-zinc-800 focus:bg-white focus:ring-1 focus:ring-[#1F4B2C] focus:border-[#1F4B2C] outline-none transition"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
              NIP (Nomor Induk Pegawai) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Contoh: 198501012010011005 atau guru"
              value={formData.nip}
              onChange={(e) => setFormData({ ...formData, nip: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs sm:text-sm font-mono font-bold text-zinc-800 focus:bg-white focus:ring-1 focus:ring-[#1F4B2C] focus:border-[#1F4B2C] outline-none transition"
              required
            />
            <p className="text-[11px] text-zinc-500 mt-1">
              * NIP ini otomatis digunakan sebagai <strong>Username</strong> dan <strong>Password</strong> login awal guru.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
              Email Guru (Opsional)
            </label>
            <input
              type="email"
              placeholder="Contoh: guru@sekolah.sch.id"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs sm:text-sm font-semibold text-zinc-800 focus:bg-white focus:ring-1 focus:ring-[#1F4B2C] focus:border-[#1F4B2C] outline-none transition"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2.5 rounded-xl bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 text-xs sm:text-sm font-bold transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-[#1F4B2C] hover:bg-[#183D23] text-white text-xs sm:text-sm font-bold transition shadow-xs flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting && <RefreshCw className="w-4 h-4 animate-spin text-[#C3E956]" />}
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
          <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto shadow-sm">
            <Trash2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-800">
              Hapus akun guru ini?
            </h3>
            <p className="text-xs text-zinc-500 mt-1">
              Data guru <strong>{teacherToDelete?.full_name}</strong> (NIP: {teacherToDelete?.nip || teacherToDelete?.username}) akan dihapus secara permanen beserta akun loginnya di Manajemen Pengguna.
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 text-xs font-bold transition"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-md shadow-rose-600/30 disabled:opacity-50"
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
            <div className="w-14 h-14 rounded-2xl bg-[#F4FFFC] border border-[#91EAAF]/60 flex items-center justify-center text-[#1F4B2C] mx-auto mb-3 shadow-sm">
              <FileSpreadsheet className="w-7 h-7 text-[#4D7111]" />
            </div>
            <p className="text-xs text-zinc-600 font-medium">
              Format Header Kolom Excel: <br />
              <span className="font-mono font-bold text-[#1F4B2C] bg-[#F4FFFC] px-2 py-0.5 rounded border border-[#91EAAF]/50 mt-1 inline-block">
                NIP, Nama Guru, Email
              </span>
            </p>
          </div>

          {importError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{importError}</span>
            </div>
          )}

          {importResult && (
            <div className="p-3 rounded-xl bg-[#F4FFFC] border border-[#91EAAF]/60 text-xs text-[#1F4B2C] space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-[#1F4B2C]">
                <CheckCircle2 className="w-4 h-4 text-[#4D7111]" />
                <span>{importResult.message}</span>
              </div>
              <div className="text-[11px] text-[#4D7111] pl-5.5">
                Guru Baru: <strong>{importResult.created_count}</strong> • Diperbarui: <strong>{importResult.updated_count}</strong>
              </div>
            </div>
          )}

          <div className="border border-dashed border-[#91EAAF] rounded-xl p-4 bg-[#F4FFFC] text-center hover:bg-[#E1F8ED]/60 transition">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => setImportFile(e.target.files[0] || null)}
              className="text-xs text-zinc-700 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-[#1F4B2C] file:text-white hover:file:bg-[#183D23] cursor-pointer w-full"
            />
            <p className="text-[11px] text-zinc-500 mt-2">
              Pilih file spreadsheet .xlsx atau .xls dari komputer Anda.
            </p>
          </div>

          <div className="flex items-center justify-between gap-2 pt-2">
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="text-xs font-bold text-[#1F4B2C] hover:text-[#4D7111] flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-[#4D7111]" /> Unduh Format Template
            </button>

            <button
              type="button"
              onClick={handleImportSubmit}
              disabled={isImporting || !importFile}
              className="px-5 py-2.5 rounded-xl bg-[#1F4B2C] hover:bg-[#183D23] text-white text-xs sm:text-sm font-bold shadow-xs transition flex items-center gap-2 disabled:opacity-50"
            >
              {isImporting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-[#C3E956]" />
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
