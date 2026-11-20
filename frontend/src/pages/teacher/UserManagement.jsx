import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Plus, 
  FileSpreadsheet, 
  Download, 
  Edit3, 
  Trash2, 
  KeyRound, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Search, 
  Filter, 
  X,
  ShieldCheck,
  GraduationCap,
  Users
} from 'lucide-react';
import Modal from '../../components/common/Modal';
import { 
  getUsersApi, 
  createUserApi, 
  updateUserApi, 
  deleteUserApi, 
  getClassroomsApi, 
  downloadUserTemplateExcelApi, 
  importUsersExcelApi 
} from '../../api/authApi';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Filter & Search states
  const [roleFilter, setRoleFilter] = useState(''); // '' | 'TEACHER' | 'STUDENT'
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);

  // Modal Tambah / Edit Pengguna
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    full_name: '',
    email: '',
    role: 'STUDENT',
    classroom_id: '',
    password: ''
  });
  const [modalError, setModalError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal Hapus User
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
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
      console.error('Gagal mengambil kelas:', err);
    }
  };

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = {};
      if (roleFilter) params.role = roleFilter;
      if (searchTerm.trim()) params.search = searchTerm.trim();

      const data = await getUsersApi(params);
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Gagal mengambil data user:', err);
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  }, [roleFilter, searchTerm]);

  useEffect(() => {
    fetchClassrooms();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchUsers]);

  useEffect(() => {
    setCurrentPage(1);
  }, [roleFilter, searchTerm, entriesPerPage]);

  // Helper Initials
  const getInitials = (name) => {
    if (!name) return 'US';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Pagination calculation
  const indexOfLastItem = currentPage * entriesPerPage;
  const indexOfFirstItem = indexOfLastItem - entriesPerPage;
  const currentItems = users.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(users.length / entriesPerPage) || 1;

  // Handler Buka Modal Tambah
  const handleOpenAdd = () => {
    setIsEditing(false);
    setSelectedUserId(null);
    setFormData({
      username: '',
      full_name: '',
      email: '',
      role: 'STUDENT',
      classroom_id: classrooms[0]?.id || '',
      password: ''
    });
    setModalError('');
    setIsModalOpen(true);
  };

  // Handler Buka Modal Edit
  const handleOpenEdit = (user) => {
    setIsEditing(true);
    setSelectedUserId(user.id);
    setFormData({
      username: user.username,
      full_name: user.full_name || '',
      email: user.email || '',
      role: user.role,
      classroom_id: user.classroom?.id || user.classroom_id || '',
      password: ''
    });
    setModalError('');
    setIsModalOpen(true);
  };

  // Handler Simpan Data (Tambah / Edit)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.username.trim() || !formData.full_name.trim()) {
      setModalError('Username dan Nama Lengkap wajib diisi!');
      return;
    }
    if (!isEditing && !formData.password.trim()) {
      setModalError('Kata sandi wajib diisi untuk pengguna baru!');
      return;
    }

    setIsSubmitting(true);
    setModalError('');

    try {
      const payload = {
        username: formData.username.trim(),
        full_name: formData.full_name.trim(),
        email: formData.email.trim(),
        role: formData.role
      };

      if (formData.role === 'STUDENT' && formData.classroom_id) {
        payload.classroom_id = formData.classroom_id;
      }

      if (formData.password.trim()) {
        payload.password = formData.password.trim();
      }

      if (isEditing) {
        await updateUserApi(selectedUserId, payload);
        showToast('Data pengguna berhasil diperbarui!');
      } else {
        await createUserApi(payload);
        showToast('Akun pengguna baru berhasil dibuat!');
      }

      setIsModalOpen(false);
      fetchUsers();
    } catch (err) {
      const errData = err.response?.data;
      let msg = 'Gagal menyimpan data pengguna.';
      if (errData) {
        if (typeof errData === 'string') msg = errData;
        else if (errData.username) msg = `Username: ${errData.username.join(', ')}`;
        else if (errData.detail) msg = errData.detail;
      }
      setModalError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler Buka Modal Hapus
  const handleOpenDelete = (user) => {
    setUserToDelete(user);
    setIsDeleteModalOpen(true);
  };

  // Eksekusi Hapus User
  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    try {
      await deleteUserApi(userToDelete.id);
      showToast(`Pengguna ${userToDelete.full_name || userToDelete.username} berhasil dihapus!`);
      setIsDeleteModalOpen(false);
      setUserToDelete(null);
      fetchUsers();
    } catch (err) {
      alert('Gagal menghapus pengguna: ' + (err.response?.data?.detail || err.message));
    } finally {
      setIsDeleting(false);
    }
  };

  // Unduh Template Excel Pengguna
  const handleDownloadTemplate = async () => {
    setIsDownloadingTemplate(true);
    try {
      await downloadUserTemplateExcelApi('Template_Import_User_E-Ujian.xlsx');
      showToast('Template Excel Pengguna berhasil diunduh!');
    } catch (err) {
      alert('Gagal mengunduh template Excel: ' + err.message);
    } finally {
      setIsDownloadingTemplate(false);
    }
  };

  // Upload & Import Excel Pengguna
  const handleImportSubmit = async () => {
    if (!importFile) {
      setImportError('Silakan pilih berkas Excel terlebih dahulu!');
      return;
    }
    setIsImporting(true);
    setImportError('');
    setImportResult(null);

    try {
      const res = await importUsersExcelApi(importFile);
      setImportResult(res);
      showToast(res.message || 'Proses impor pengguna berhasil!');
      fetchUsers();
      fetchClassrooms();

      // Otomatis menutup pop-up modal import setelah data berhasil masuk
      setTimeout(() => {
        setIsImportModalOpen(false);
        setImportFile(null);
        setImportResult(null);
        setImportError('');
        if (fileInputRef.current) fileInputRef.current.value = '';
      }, 1200);
    } catch (err) {
      setImportError(err.response?.data?.error || 'Gagal mengimpor file Excel.');
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
              <ShieldCheck className="w-5 h-5 text-[#102919]" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-[#102919] tracking-tight">
              Manajemen Pengguna & Hak Akses
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[#102919]/80 mt-1 leading-relaxed font-medium">
            Kelola seluruh akun pengguna, hak akses peran, dan reset kata sandi asesmen.
          </p>
        </div>

        {/* 3 Tombol Aksi Lengkap */}
        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2.5 bg-[#C3E956] hover:bg-[#b8e337] text-[#0A1D11] border-2 border-[#4D7111]/30 rounded-xl text-xs font-black shadow-sm hover:-translate-y-0.5 active:scale-[0.98] transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#0A1D11] stroke-[2.5]" />
            <span>Tambah User</span>
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

      {/* Bar Pencarian, Show Entries, Filter Peran, & Refresh */}
      <div className="bg-[#EFF9CE] rounded-3xl p-4 sm:p-5 border-2 border-[#8BC829] shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Sisi Kiri: Show Entries & Filter Peran */}
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

          {/* Filter Peran */}
          <div className="flex items-center gap-2 text-xs text-[#102919] font-bold">
            <Filter className="w-3.5 h-3.5 text-[#102919]" />
            <span>Peran:</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-1.5 bg-[#F9FDEE] border-2 border-[#8BC829] rounded-xl text-xs font-black text-[#102919] focus:outline-none focus:ring-2 focus:ring-[#C3E956] cursor-pointer"
            >
              <option value="">Semua Peran</option>
              <option value="TEACHER">Guru Pengawas</option>
              <option value="STUDENT">Siswa Peserta</option>
            </select>
          </div>
        </div>

        {/* Sisi Kanan: Search Bar & Counter */}
        <div className="flex items-center gap-3 w-full lg:w-auto">
          <div className="relative flex-1 lg:w-64">
            <Search className="w-4 h-4 text-[#102919]/50 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari Username / Nama..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-9 py-2 bg-[#F9FDEE] border-2 border-[#8BC829] rounded-xl text-xs text-[#102919] placeholder-[#102919]/50 font-medium focus:outline-none focus:border-[#102919] focus:ring-2 focus:ring-[#C3E956] transition"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#102919]/50 hover:text-[#102919]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-[#102919]/80 font-bold hidden md:inline">
              Total: <strong className="text-[#102919] font-mono font-black">{users.length}</strong> Pengguna
            </span>
            <button
              onClick={fetchUsers}
              disabled={isLoading}
              className="p-2.5 rounded-xl bg-[#E2F4B4] border-2 border-[#8BC829] hover:bg-[#d6f0a3] text-[#102919] transition shadow-xs hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer"
              title="Muat Ulang"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#102919]' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Tabel Manajemen Pengguna */}
      <div className="bg-[#EFF9CE] rounded-3xl border-2 border-[#8BC829] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#102919]">
            <thead className="bg-[#E2F4B4] border-b-2 border-[#8BC829] text-[#102919] font-black uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4 w-14 text-center">NO</th>
                <th className="py-3.5 px-4">Nama Lengkap Pengguna</th>
                <th className="py-3.5 px-4">Username (NIP / NISN)</th>
                <th className="py-3.5 px-4">Email</th>
                <th className="py-3.5 px-4 text-center">Role / Hak Akses</th>
                <th className="py-3.5 px-4 text-center w-36">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-[#8BC829]/30">
              {users.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-[#102919]/60 text-xs font-medium">
                    {isLoading ? 'Memuat data pengguna...' : 'Belum ada akun pengguna yang terdaftar.'}
                  </td>
                </tr>
              ) : (
                currentItems.map((u, index) => (
                  <tr key={u.id} className="hover:bg-[#E2F4B4]/60 transition">
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-[#102919]/70 tabular-nums">
                      {indexOfFirstItem + index + 1}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-[#102919] text-xs sm:text-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-[#102919] text-[#C3E956] font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                          {getInitials(u.full_name || u.username)}
                        </div>
                        <div>
                          <div className="text-[#102919] font-black">{u.full_name || '-'}</div>
                          <div className="text-[11px] text-[#102919]/60 font-medium">
                            {u.role === 'TEACHER' ? 'Dewan Guru Pengawas' : (u.classroom?.name || u.classroom_name ? `Kelas: ${u.classroom?.name || u.classroom_name}` : 'Siswa Peserta')}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-mono px-3 py-1 rounded-xl bg-[#E2F4B4] border-2 border-[#8BC829] text-[#102919] font-black text-[11px] tabular-nums shadow-2xs">
                        {u.username}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-[#102919]/80 font-mono text-[11px] font-medium">
                      {u.email || '-'}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {u.role === 'TEACHER' ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#102919] text-[#C3E956] font-black text-xs border border-[#C3E956]/40 shadow-2xs">
                          <GraduationCap className="w-3.5 h-3.5 text-[#C3E956]" />
                          <span>Guru Pengawas</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#C3E956] text-[#0A1D11] font-black text-xs border border-[#4D7111]/30 shadow-2xs">
                          <Users className="w-3.5 h-3.5 text-[#0A1D11]" />
                          <span>Siswa Peserta</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleOpenEdit(u)}
                          className="px-3 py-1.5 rounded-xl bg-[#E2F4B4] border-2 border-[#8BC829] hover:bg-[#d6f0a3] text-[#102919] font-black text-xs flex items-center gap-1.5 shadow-xs transition-all active:scale-[0.98] cursor-pointer"
                          title="Edit User & Reset Sandi"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-[#102919]" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => handleOpenDelete(u)}
                          className="px-3 py-1.5 rounded-xl bg-[#E2F4B4] border-2 border-rose-300 hover:bg-rose-600 text-rose-700 hover:text-white font-black text-xs flex items-center gap-1.5 shadow-xs transition-all active:scale-[0.98] cursor-pointer"
                          title="Hapus User"
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
            Menampilkan <strong className="text-[#102919] font-black">{users.length > 0 ? indexOfFirstItem + 1 : 0}</strong> sampai{' '}
            <strong className="text-[#102919] font-black">{Math.min(indexOfLastItem, users.length)}</strong> dari{' '}
            <strong className="text-[#102919] font-black">{users.length}</strong> pengguna
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
      {/* MODAL TAMBAH / EDIT USER */}
      {/* ======================================================== */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={isEditing ? 'Perbarui Akun Pengguna' : 'Tambah Pengguna Baru'}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {modalError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{modalError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-black text-[#102919] uppercase tracking-wider mb-1.5">
              Username (NIP / NISN) <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              placeholder="Contoh: 19850101... atau 008123..."
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              className="w-full px-3 py-2 bg-[#F9FDEE] border-2 border-[#8BC829] rounded-xl text-xs sm:text-sm font-mono font-bold text-[#102919] placeholder-[#102919]/40 focus:bg-[#EFF9CE] focus:ring-2 focus:ring-[#C3E956] focus:border-[#102919] outline-none transition"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-black text-[#102919] uppercase tracking-wider mb-1.5">
              Nama Lengkap <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              placeholder="Nama lengkap pengguna"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="w-full px-3 py-2 bg-[#F9FDEE] border-2 border-[#8BC829] rounded-xl text-xs sm:text-sm font-bold text-[#102919] placeholder-[#102919]/40 focus:bg-[#EFF9CE] focus:ring-2 focus:ring-[#C3E956] focus:border-[#102919] outline-none transition"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-black text-[#102919] uppercase tracking-wider mb-1.5">
              Email (Opsional)
            </label>
            <input
              type="email"
              placeholder="user@sekolah.sch.id"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 bg-[#F9FDEE] border-2 border-[#8BC829] rounded-xl text-xs sm:text-sm font-medium text-[#102919] placeholder-[#102919]/40 focus:bg-[#EFF9CE] focus:ring-2 focus:ring-[#C3E956] focus:border-[#102919] outline-none transition"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black text-[#102919] uppercase tracking-wider mb-1.5">
                Peran Akun <span className="text-rose-600">*</span>
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-3 py-2 bg-[#F9FDEE] border-2 border-[#8BC829] rounded-xl text-xs sm:text-sm font-bold text-[#102919] focus:bg-[#EFF9CE] focus:ring-2 focus:ring-[#C3E956] focus:border-[#102919] outline-none transition cursor-pointer"
              >
                <option value="STUDENT">Siswa Peserta</option>
                <option value="TEACHER">Guru Pengawas</option>
              </select>
            </div>

            {formData.role === 'STUDENT' && (
              <div>
                <label className="block text-xs font-black text-[#102919] uppercase tracking-wider mb-1.5">
                  Kelas / Rombel
                </label>
                <select
                  value={formData.classroom_id}
                  onChange={(e) => setFormData({ ...formData, classroom_id: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F9FDEE] border-2 border-[#8BC829] rounded-xl text-xs sm:text-sm font-bold text-[#102919] focus:bg-[#EFF9CE] focus:ring-2 focus:ring-[#C3E956] focus:border-[#102919] outline-none transition cursor-pointer"
                >
                  <option value="">-- Tanpa Kelas --</option>
                  {classrooms.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-black text-[#102919] uppercase tracking-wider mb-1.5">
              {isEditing ? 'Ubah Kata Sandi (Kosongkan jika tidak diubah)' : 'Kata Sandi'} {!isEditing && <span className="text-rose-600">*</span>}
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-[#102919]/50 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={isEditing ? 'Masukkan kata sandi baru...' : 'Masukkan kata sandi akun'}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full pl-9 pr-3 py-2 bg-[#F9FDEE] border-2 border-[#8BC829] rounded-xl text-xs sm:text-sm font-medium text-[#102919] placeholder-[#102919]/40 focus:bg-[#EFF9CE] focus:ring-2 focus:ring-[#C3E956] focus:border-[#102919] outline-none transition"
                required={!isEditing}
              />
            </div>
            {isEditing && (
              <p className="text-[11px] text-[#102919]/70 font-medium mt-1">
                * Isi kolom ini untuk me-reset kata sandi pengguna jika pengguna lupa sandi.
              </p>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t-2 border-[#8BC829]/30">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-3.5 py-2 rounded-xl bg-[#E2F4B4] border-2 border-[#8BC829] hover:bg-[#d6f0a3] text-[#102919] text-xs sm:text-sm font-black transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-[#C3E956] hover:bg-[#b8e337] text-[#0A1D11] text-xs sm:text-sm font-black border-2 border-[#4D7111]/30 transition shadow-xs flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting && <RefreshCw className="w-4 h-4 animate-spin text-[#0A1D11]" />}
              <span>{isEditing ? 'Simpan Perubahan' : 'Tambah User'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL KONFIRMASI HAPUS USER */}
      {/* ======================================================== */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Konfirmasi Hapus Pengguna"
        maxWidth="max-w-sm"
      >
        <div className="space-y-4 text-center">
          <div className="w-11 h-11 rounded-xl bg-rose-100 border-2 border-rose-300 text-rose-700 flex items-center justify-center mx-auto shadow-2xs">
            <Trash2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-[#102919]">
              Hapus akun pengguna ini?
            </h3>
            <p className="text-xs text-[#102919]/70 font-medium mt-1">
              Akun <strong>{userToDelete?.full_name || userToDelete?.username}</strong> ({userToDelete?.username}) akan dihapus secara permanen dari sistem.
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(false)}
              className="px-3.5 py-2 rounded-xl bg-[#E2F4B4] border-2 border-[#8BC829] hover:bg-[#d6f0a3] text-[#102919] text-xs font-black transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black border-2 border-rose-700 transition shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {isDeleting ? 'Menghapus...' : 'Ya, Hapus'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL IMPORT EXCEL PENGGUNA */}
      {/* ======================================================== */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Import Pengguna via Excel"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div className="text-center bg-[#E2F4B4] border-2 border-[#8BC829] rounded-2xl p-4">
            <div className="w-12 h-12 rounded-xl bg-[#EFF9CE] border-2 border-[#8BC829] flex items-center justify-center text-[#102919] mx-auto mb-2 shadow-2xs">
              <FileSpreadsheet className="w-6 h-6 text-[#1F4B2C]" />
            </div>
            <p className="text-xs text-[#102919] font-bold">
              Format Header Kolom Excel: <br />
              <span className="font-mono font-bold text-[#102919] bg-[#EFF9CE] px-2 py-0.5 rounded border border-[#8BC829] mt-1 inline-block">
                username, full_name, email, role, password
              </span>
            </p>
          </div>

          {importError && (
            <div className="p-3 rounded-xl bg-rose-100 border-2 border-rose-300 text-xs text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span className="font-bold">{importError}</span>
            </div>
          )}

          {importResult && (
            <div className="p-3 rounded-xl bg-[#E2F4B4] border-2 border-[#8BC829] text-xs text-[#102919] space-y-1">
              <div className="font-black flex items-center gap-1.5 text-[#102919]">
                <CheckCircle2 className="w-4 h-4 text-[#4D7111]" />
                <span>{importResult.message}</span>
              </div>
              <div className="text-[11px] text-[#102919]/80 font-bold pl-5.5">
                Pengguna Baru: <strong>{importResult.created_count}</strong> • Diperbarui: <strong>{importResult.updated_count}</strong>
              </div>
            </div>
          )}

          <div className="border-2 border-dashed border-[#8BC829] rounded-2xl p-4 bg-[#F9FDEE] text-center hover:bg-[#EFF9CE] transition">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => setImportFile(e.target.files[0] || null)}
              className="text-xs text-[#102919] font-medium file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-2 file:border-[#4D7111]/30 file:text-xs file:font-black file:bg-[#C3E956] file:text-[#0A1D11] hover:file:bg-[#b8e337] cursor-pointer w-full"
            />
            <p className="text-[11px] text-[#102919]/70 font-medium mt-2">
              Pilih file spreadsheet .xlsx atau .xls dari komputer Anda.
            </p>
          </div>

          <div className="flex items-center justify-between gap-2 pt-2">
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="text-xs font-black text-[#102919] hover:text-[#4D7111] flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#4D7111]" /> Unduh Format Template
            </button>

            <button
              type="button"
              onClick={handleImportSubmit}
              disabled={isImporting || !importFile}
              className="px-4 py-2 rounded-xl bg-[#C3E956] hover:bg-[#b8e337] text-[#0A1D11] text-xs sm:text-sm font-black border-2 border-[#4D7111]/30 shadow-xs transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
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
