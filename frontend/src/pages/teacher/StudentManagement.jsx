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
  Users, 
  Search, 
  Filter, 
  X,
  School
} from 'lucide-react';
import Modal from '../../components/common/Modal';
import { 
  getStudentsApi, 
  createStudentApi, 
  updateStudentApi, 
  deleteStudentApi, 
  getClassroomsApi, 
  downloadStudentTemplateExcelApi, 
  importStudentsExcelApi 
} from '../../api/authApi';

export default function StudentManagement() {
  const [students, setStudents] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Filter & Search states
  const [filterKelas, setFilterKelas] = useState('Semua');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);

  // Modal Tambah / Edit Siswa (Tanpa Input Password)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [formData, setFormData] = useState({
    full_name: '',
    nisn: '',
    classroom_id: '',
    email: ''
  });
  const [modalError, setModalError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal Hapus Siswa
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState(null);
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

  const fetchClassrooms = async () => {
    try {
      const data = await getClassroomsApi();
      setClassrooms(data || []);
    } catch (err) {
      console.error('Gagal mengambil daftar kelas:', err);
    }
  };

  const fetchStudents = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = {};
      if (filterKelas !== 'Semua') params.classroom_id = filterKelas;
      if (searchTerm.trim()) params.search = searchTerm.trim();

      const data = await getStudentsApi(params);
      setStudents(data || []);
    } catch (err) {
      console.error('Gagal mengambil data siswa:', err);
    } finally {
      setIsLoading(false);
    }
  }, [filterKelas, searchTerm]);

  useEffect(() => {
    fetchClassrooms();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStudents();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchStudents]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterKelas, searchTerm, entriesPerPage]);

  // Helper Initials
  const getInitials = (name) => {
    if (!name) return 'SP';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Pagination calculation
  const indexOfLastItem = currentPage * entriesPerPage;
  const indexOfFirstItem = indexOfLastItem - entriesPerPage;
  const currentItems = students.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(students.length / entriesPerPage) || 1;

  // Buka Modal Tambah Siswa
  const handleOpenAdd = () => {
    setIsEditing(false);
    setSelectedStudentId(null);
    setFormData({
      full_name: '',
      nisn: '',
      classroom_id: classrooms[0]?.id || '',
      email: ''
    });
    setModalError('');
    setIsModalOpen(true);
  };

  // Buka Modal Edit Siswa
  const handleOpenEdit = (student) => {
    setIsEditing(true);
    setSelectedStudentId(student.id);
    setFormData({
      full_name: student.full_name || '',
      nisn: student.nisn || student.username || '',
      classroom_id: student.classroom?.id || student.classroom_id || student.classroom || '',
      email: student.email || ''
    });
    setModalError('');
    setIsModalOpen(true);
  };

  // Simpan Tambah / Edit Siswa
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.full_name.trim()) {
      setModalError('Nama lengkap siswa wajib diisi!');
      return;
    }
    if (!formData.nisn.trim()) {
      setModalError('NISN siswa wajib diisi!');
      return;
    }

    setIsSubmitting(true);
    setModalError('');

    try {
      const payload = {
        ...formData,
        classroom_id: formData.classroom_id ? Number(formData.classroom_id) : null,
      };

      if (isEditing) {
        await updateStudentApi(selectedStudentId, payload);
        showToast('Data siswa berhasil diperbarui!');
      } else {
        await createStudentApi(payload);
        showToast('Siswa baru berhasil didaftarkan! (Username & Password = NISN)');
      }
      setIsModalOpen(false);
      fetchStudents();
    } catch (err) {
      const errData = err.response?.data;
      let msg = 'Gagal menyimpan data siswa.';
      if (errData) {
        if (typeof errData === 'string') msg = errData;
        else if (errData.nisn) msg = `NISN: ${errData.nisn.join(', ')}`;
        else if (errData.username) msg = `NISN/Username: ${errData.username.join(', ')}`;
        else if (errData.detail) msg = errData.detail;
      }
      setModalError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Buka Modal Konfirmasi Hapus Siswa
  const handleOpenDelete = (student) => {
    setStudentToDelete(student);
    setIsDeleteModalOpen(true);
  };

  // Eksekusi Hapus Siswa
  const handleConfirmDelete = async () => {
    if (!studentToDelete) return;
    setIsDeleting(true);
    try {
      await deleteStudentApi(studentToDelete.id);
      showToast(`Siswa ${studentToDelete.full_name || studentToDelete.nisn} berhasil dihapus!`);
      setIsDeleteModalOpen(false);
      setStudentToDelete(null);
      fetchStudents();
    } catch (err) {
      alert('Gagal menghapus siswa: ' + (err.response?.data?.detail || err.message));
    } finally {
      setIsDeleting(false);
    }
  };

  // Download Template Excel Siswa
  const handleDownloadTemplate = async () => {
    setIsDownloadingTemplate(true);
    try {
      await downloadStudentTemplateExcelApi('Template_Import_Siswa_E-Ujian.xlsx');
      showToast('Template Excel Siswa berhasil diunduh!');
    } catch (err) {
      alert('Gagal mengunduh template Excel: ' + err.message);
    } finally {
      setIsDownloadingTemplate(false);
    }
  };

  // Proses Upload & Impor Excel Siswa
  const handleImportSubmit = async () => {
    if (!importFile) {
      setImportError('Silakan pilih berkas Excel terlebih dahulu!');
      return;
    }
    setIsImporting(true);
    setImportError('');
    setImportResult(null);

    try {
      const res = await importStudentsExcelApi(importFile);
      setImportResult(res);
      const msg = res.message || `Impor data siswa selesai! ${res.created_count || 0} siswa baru terdaftar.`;
      showToast(msg);
      fetchStudents();
      fetchClassrooms();

      // Otomatis menutup pop-up modal import setelah data berhasil masuk
      setTimeout(() => {
        setIsImportModalOpen(false);
        setImportFile(null);
        setImportResult(null);
        setImportError('');
        if (fileInputRef.current) fileInputRef.current.value = '';
      }, 1000);
    } catch (err) {
      setImportError(err.response?.data?.error || 'Gagal mengimpor file Excel siswa.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Toast Notifikasi Floating */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50">
          <div className="px-4 py-2.5 rounded-lg bg-zinc-900 border border-zinc-700 text-white font-medium text-xs flex items-center gap-2.5 shadow-xl">
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
              <Users className="w-5 h-5 text-[#102919]" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-[#102919] tracking-tight">
              Data Siswa Peserta
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[#102919]/80 mt-1 leading-relaxed font-medium">
            Kelola data peserta asesmen per rombongan belajar (Akun otomatis: Username & Password = NISN).
          </p>
        </div>

        {/* 3 Tombol Aksi Lengkap */}
        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2.5 bg-[#C3E956] hover:bg-[#b8e337] text-[#0A1D11] border-2 border-[#4D7111]/30 rounded-xl text-xs font-black shadow-sm hover:-translate-y-0.5 active:scale-[0.98] transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#0A1D11] stroke-[2.5]" />
            <span>Tambah Siswa</span>
          </button>

          <button
            onClick={() => {
              setImportFile(null);
              setImportError('');
              setImportResult(null);
              setIsImportModalOpen(true);
            }}
            className="px-4 py-2.5 bg-[#E2F4B4] hover:bg-[#d6f0a3] text-[#102919] border-2 border-[#8BC829] rounded-xl text-xs font-black shadow-xs hover:-translate-y-0.5 active:scale-[0.98] transition-all flex items-center gap-2 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-[#102919]" />
            <span>Import Excel</span>
          </button>

          <button
            onClick={handleDownloadTemplate}
            disabled={isDownloadingTemplate}
            className="px-4 py-2.5 bg-[#E2F4B4] hover:bg-[#d6f0a3] text-[#102919] border-2 border-[#8BC829] rounded-xl text-xs font-black shadow-xs hover:-translate-y-0.5 active:scale-[0.98] transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            <Download className="w-4 h-4 text-[#102919]" />
            <span>{isDownloadingTemplate ? 'Mengunduh...' : 'Template Excel'}</span>
          </button>
        </div>
      </div>

      {/* Bar Pencarian, Show Entries, Filter Kelas, & Refresh */}
      <div className="bg-[#EFF9CE] rounded-3xl p-4 sm:p-5 border-2 border-[#8BC829] shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Sisi Kiri: Show Entries & Filter Kelas */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Show Entries */}
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

          <span className="text-[#8BC829] font-black hidden sm:inline">|</span>

          {/* Filter Kelas */}
          <div className="flex items-center gap-2 text-xs text-[#102919] font-bold">
            <Filter className="w-3.5 h-3.5 text-[#102919]" />
            <span>Kelas:</span>
            <select
              value={filterKelas}
              onChange={(e) => setFilterKelas(e.target.value)}
              className="px-3 py-1.5 bg-[#F9FDEE] border-2 border-[#8BC829] rounded-xl text-xs font-black text-[#102919] focus:outline-none focus:ring-2 focus:ring-[#C3E956] cursor-pointer"
            >
              <option value="Semua">Semua Kelas</option>
              {classrooms.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Sisi Kanan: Search Bar & Counter */}
        <div className="flex items-center gap-3 w-full lg:w-auto">
          <div className="relative flex-1 lg:w-64">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari Nama atau NISN..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-9 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs text-zinc-900 focus:bg-white focus:ring-1 focus:ring-[#1F4B2C] focus:border-[#1F4B2C] outline-none transition"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-zinc-500 font-medium hidden md:inline">
              Total: <strong className="text-[#1F4B2C] font-bold font-mono">{students.length}</strong> Siswa
            </span>
            <button
              onClick={fetchStudents}
              disabled={isLoading}
              className="p-2 rounded-lg bg-white border border-[#91EAAF]/50 hover:bg-[#F4FFFC] text-[#1F4B2C] transition shadow-2xs hover:-translate-y-0.5 active:scale-[0.98]"
              title="Muat Ulang"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-[#1F4B2C]' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Tabel Data Siswa */}
      <div className="bg-[#EFF9CE] rounded-3xl border-2 border-[#8BC829] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#102919]">
            <thead className="bg-[#E2F4B4] border-b-2 border-[#8BC829] text-[#102919] font-black uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4 w-14 text-center">NO</th>
                <th className="py-3.5 px-4">Nama Lengkap Siswa</th>
                <th className="py-3.5 px-4">NISN (Username)</th>
                <th className="py-3.5 px-4 text-center">Kelas / Rombel</th>
                <th className="py-3.5 px-4">Email</th>
                <th className="py-3.5 px-4 text-center w-36">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-[#8BC829]/30">
              {students.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-[#102919]/60 text-xs font-medium">
                    {isLoading ? 'Memuat data siswa...' : 'Belum ada data siswa yang terdaftar.'}
                  </td>
                </tr>
              ) : (
                currentItems.map((student, index) => (
                  <tr key={student.id} className="hover:bg-[#E2F4B4]/60 transition">
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-[#102919]/70 tabular-nums">
                      {indexOfFirstItem + index + 1}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-[#102919] text-xs sm:text-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-[#102919] text-[#C3E956] font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                          {getInitials(student.full_name)}
                        </div>
                        <div>
                          <div className="text-[#102919] font-black">{student.full_name}</div>
                          <div className="text-[11px] text-[#102919]/60 font-medium">Peserta Ujian Asesmen</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-mono px-3 py-1 rounded-xl bg-[#E2F4B4] border-2 border-[#8BC829] text-[#102919] font-black text-[11px] tabular-nums shadow-2xs">
                        {student.nisn || student.username}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#C3E956] text-[#0A1D11] font-black text-xs border border-[#4D7111]/30 shadow-2xs">
                        <School className="w-3.5 h-3.5 text-[#0A1D11]" />
                        <span>{student.classroom?.name || student.classroom_name || '-'}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-[#102919]/80 font-mono text-[11px] font-medium">
                      {student.email || '-'}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleOpenEdit(student)}
                          className="px-3 py-1.5 rounded-xl bg-[#E2F4B4] border-2 border-[#8BC829] hover:bg-[#d6f0a3] text-[#102919] font-black text-xs flex items-center gap-1.5 shadow-xs transition-all active:scale-[0.98] cursor-pointer"
                          title="Edit Siswa"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-[#102919]" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => handleOpenDelete(student)}
                          className="px-3 py-1.5 rounded-xl bg-[#E2F4B4] border-2 border-rose-300 hover:bg-rose-600 text-rose-700 hover:text-white font-black text-xs flex items-center gap-1.5 shadow-xs transition-all active:scale-[0.98] cursor-pointer"
                          title="Hapus Siswa"
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
            Menampilkan <strong className="text-[#102919] font-black">{students.length > 0 ? indexOfFirstItem + 1 : 0}</strong> sampai{' '}
            <strong className="text-[#102919] font-black">{Math.min(indexOfLastItem, students.length)}</strong> dari{' '}
            <strong className="text-[#102919] font-black">{students.length}</strong> siswa
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
                className={`w-8 h-8 rounded-xl font-black text-xs transition flex items-center justify-center cursor-pointer ${
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
      {/* MODAL TAMBAH / EDIT SISWA */}
      {/* ======================================================== */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={isEditing ? 'Perbarui Data Siswa' : 'Tambah Siswa Baru'}
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
              Nama Lengkap Siswa <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              placeholder="Contoh: Rizal Ahmad Maulana"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-[#F9FDEE] border-2 border-[#8BC829] rounded-xl text-xs sm:text-sm font-semibold text-[#102919] placeholder-[#102919]/40 focus:bg-white focus:outline-none focus:border-[#102919] focus:ring-2 focus:ring-[#C3E956] transition"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-black text-[#102919] uppercase tracking-wider mb-1.5">
              NISN (Nomor Induk Siswa Nasional) <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              placeholder="Contoh: 0081234567 atau siswa"
              value={formData.nisn}
              onChange={(e) => setFormData({ ...formData, nisn: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-[#F9FDEE] border-2 border-[#8BC829] rounded-xl text-xs sm:text-sm font-mono font-black text-[#102919] placeholder-[#102919]/40 focus:bg-white focus:outline-none focus:border-[#102919] focus:ring-2 focus:ring-[#C3E956] transition"
              required
            />
            <p className="text-[11px] text-[#102919]/70 mt-1 font-medium">
              * NISN ini otomatis digunakan sebagai <strong>Username</strong> dan <strong>Password</strong> login awal siswa.
            </p>
          </div>

          <div>
            <label className="block text-xs font-black text-[#102919] uppercase tracking-wider mb-1.5">
              Kelas / Rombel Siswa <span className="text-rose-600">*</span>
            </label>
            <select
              value={formData.classroom_id}
              onChange={(e) => setFormData({ ...formData, classroom_id: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-[#F9FDEE] border-2 border-[#8BC829] rounded-xl text-xs sm:text-sm font-bold text-[#102919] focus:bg-white focus:outline-none focus:border-[#102919] focus:ring-2 focus:ring-[#C3E956] transition cursor-pointer"
              required
            >
              <option value="">-- Pilih Kelas --</option>
              {classrooms.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name} ({cls.academic_year || '2026/2027'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-black text-[#102919] uppercase tracking-wider mb-1.5">
              Email Siswa (Opsional)
            </label>
            <input
              type="email"
              placeholder="Contoh: siswa@sekolah.sch.id"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-[#F9FDEE] border-2 border-[#8BC829] rounded-xl text-xs sm:text-sm font-semibold text-[#102919] placeholder-[#102919]/40 focus:bg-white focus:outline-none focus:border-[#102919] focus:ring-2 focus:ring-[#C3E956] transition"
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
              <span>{isEditing ? 'Simpan Perubahan' : 'Tambah Siswa'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL KONFIRMASI HAPUS SISWA */}
      {/* ======================================================== */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Konfirmasi Hapus Siswa"
        maxWidth="max-w-sm"
      >
        <div className="space-y-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-rose-100 border-2 border-rose-300 text-rose-600 flex items-center justify-center mx-auto shadow-xs">
            <Trash2 className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-black text-[#102919]">
              Hapus akun siswa ini?
            </h3>
            <p className="text-xs text-[#102919]/80 mt-1 font-medium leading-relaxed">
              Data siswa <strong>{studentToDelete?.full_name}</strong> (NISN: {studentToDelete?.nisn || studentToDelete?.username}) akan dihapus secara permanen beserta akun loginnya di Manajemen Pengguna.
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
      {/* MODAL IMPORT EXCEL SISWA */}
      {/* ======================================================== */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Import Data Siswa via Excel"
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
                NISN, Nama Siswa, Kelas, Email
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
                Siswa Baru: <strong>{importResult.created_count}</strong> • Diperbarui: <strong>{importResult.updated_count}</strong>
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
              Pilih file spreadsheet .xlsx atau .xls dari komputer Anda (Rekap GForm / Dapodik).
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
