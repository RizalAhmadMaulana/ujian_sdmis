import React, { useState, useEffect } from 'react';
import { 
  School, 
  Plus, 
  Edit3, 
  Trash2, 
  Users, 
  Calendar, 
  Search, 
  CheckCircle2, 
  AlertCircle,
  RefreshCw,
  X,
  GraduationCap
} from 'lucide-react';
import Modal from '../../components/common/Modal';
import { 
  getClassroomsApi, 
  createClassroomApi, 
  updateClassroomApi, 
  deleteClassroomApi,
  getStudentsApi
} from '../../api/authApi';

export default function ClassroomManagement() {
  const [classrooms, setClassrooms] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    academic_year: '2026/2027'
  });
  const [modalError, setModalError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal Detail Siswa per Kelas
  const [isStudentListModalOpen, setIsStudentListModalOpen] = useState(false);
  const [selectedClassForStudents, setSelectedClassForStudents] = useState(null);
  const [classStudents, setClassStudents] = useState([]);
  const [isLoadingClassStudents, setIsLoadingClassStudents] = useState(false);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [studentCurrentPage, setStudentCurrentPage] = useState(1);
  const [studentEntriesPerPage, setStudentEntriesPerPage] = useState(10);

  // Load classrooms from API
  const fetchClassrooms = async () => {
    setIsLoading(true);
    try {
      const data = await getClassroomsApi();
      setClassrooms(data || []);
    } catch (err) {
      console.error('Gagal mengambil data kelas:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClassrooms();
  }, []);

  const handleOpenAdd = () => {
    setIsEditing(false);
    setSelectedClassId(null);
    setFormData({ name: '', academic_year: '2026/2027' });
    setModalError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cls) => {
    setIsEditing(true);
    setSelectedClassId(cls.id);
    setFormData({
      name: cls.name,
      academic_year: cls.academic_year || '2026/2027'
    });
    setModalError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setModalError('Nama kelas wajib diisi!');
      return;
    }

    setIsSubmitting(true);
    setModalError('');
    try {
      if (isEditing) {
        await updateClassroomApi(selectedClassId, formData);
      } else {
        await createClassroomApi(formData);
      }
      setIsModalOpen(false);
      await fetchClassrooms();
    } catch (err) {
      const errDetail = err.response?.data?.name?.[0] || err.response?.data?.detail || 'Gagal menyimpan data kelas.';
      setModalError(errDetail);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (cls) => {
    if (window.confirm(`Yakin ingin menghapus kelas "${cls.name}"? Siswa di kelas ini akan terlepas.`)) {
      try {
        await deleteClassroomApi(cls.id);
        await fetchClassrooms();
      } catch (err) {
        alert('Gagal menghapus kelas: ' + (err.response?.data?.detail || err.message));
      }
    }
  };

  // Buka Modal Daftar Siswa per Kelas
  const handleOpenStudentList = async (cls) => {
    if (!cls) return;
    setSelectedClassForStudents(cls);
    setStudentSearchQuery('');
    setStudentCurrentPage(1);
    setIsStudentListModalOpen(true);
    setIsLoadingClassStudents(true);
    try {
      // 1. Ambil data dengan filter classroom_id
      let data = await getStudentsApi({ classroom_id: cls.id });
      let list = Array.isArray(data) ? data : (data?.results || []);

      // 2. Jika list kosong tetapi cls.student_count > 0, fallback ambil seluruh siswa dan saring lokal
      if (list.length === 0 && (cls.student_count || 0) > 0) {
        const allRes = await getStudentsApi();
        const allList = Array.isArray(allRes) ? allRes : (allRes?.results || []);
        list = allList.filter(
          (s) =>
            String(s.classroom_id) === String(cls.id) ||
            String(s.classroom?.id) === String(cls.id) ||
            (s.classroom?.name && s.classroom.name.toLowerCase() === cls.name.toLowerCase()) ||
            (s.classroom_name && s.classroom_name.toLowerCase() === cls.name.toLowerCase())
        );
      }

      setClassStudents(list);
    } catch (err) {
      console.warn('Gagal ambil data siswa per kelas, mencoba fallback semua data siswa:', err);
      try {
        const allRes = await getStudentsApi();
        const allList = Array.isArray(allRes) ? allRes : (allRes?.results || []);
        const list = allList.filter(
          (s) =>
            String(s.classroom_id) === String(cls.id) ||
            String(s.classroom?.id) === String(cls.id) ||
            (s.classroom?.name && s.classroom.name.toLowerCase() === cls.name.toLowerCase()) ||
            (s.classroom_name && s.classroom_name.toLowerCase() === cls.name.toLowerCase())
        );
        setClassStudents(list);
      } catch (fallbackErr) {
        console.error('Fallback ambil siswa gagal:', fallbackErr);
        setClassStudents([]);
      }
    } finally {
      setIsLoadingClassStudents(false);
    }
  };

  useEffect(() => {
    setStudentCurrentPage(1);
  }, [studentSearchQuery, studentEntriesPerPage]);

  const filteredClassrooms = classrooms.filter((c) =>
    (c.name && c.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (c.academic_year && c.academic_year.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Filter & Pagination Siswa di Modal
  const filteredClassStudents = classStudents.filter((s) => {
    if (!studentSearchQuery.trim()) return true;
    const q = studentSearchQuery.toLowerCase();
    return (
      (s.full_name && s.full_name.toLowerCase().includes(q)) ||
      (s.nisn && s.nisn.toLowerCase().includes(q)) ||
      (s.username && s.username.toLowerCase().includes(q)) ||
      (s.email && s.email.toLowerCase().includes(q))
    );
  });

  const studentTotalPages = Math.ceil(filteredClassStudents.length / studentEntriesPerPage) || 1;
  const studentIndexOfLast = studentCurrentPage * studentEntriesPerPage;
  const studentIndexOfFirst = studentIndexOfLast - studentEntriesPerPage;
  const currentClassStudents = filteredClassStudents.slice(studentIndexOfFirst, studentIndexOfLast);

  // Helper Inisial Avatar (Aman dari null / multi-whitespace)
  const getInitials = (name) => {
    if (!name || typeof name !== 'string') return 'SP';
    const clean = name.trim().split(/\s+/).filter(Boolean);
    if (clean.length === 0) return 'SP';
    if (clean.length === 1) return clean[0].substring(0, 2).toUpperCase();
    return (clean[0][0] + clean[clean.length - 1][0]).toUpperCase();
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#F4FFFC] border border-[#91EAAF]/60 text-[#1F4B2C] flex items-center justify-center shadow-2xs">
              <School className="w-5 h-5 text-[#1F4B2C]" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">
              Data Kelas & Rombongan Belajar
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1 leading-relaxed">
            Kelola data kelas dan tahun ajaran untuk alokasi siswa, paket soal, dan sesi ujian.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2 bg-[#1F4B2C] hover:bg-[#183D23] text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-xs hover:-translate-y-0.5 active:scale-[0.98] self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Tambah Kelas Baru</span>
        </button>
      </div>

      {/* Bar Pencarian & Refresh */}
      <div className="bg-white rounded-xl p-4 border border-[#91EAAF]/40 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama kelas atau tahun ajaran..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-zinc-50/70 border border-zinc-200 rounded-lg text-xs focus:bg-white focus:border-[#1F4B2C] focus:ring-1 focus:ring-[#1F4B2C] focus:outline-none transition"
          />
        </div>

        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          <span className="text-xs text-zinc-500 font-medium">
            Total: <strong className="text-[#1F4B2C] font-mono font-bold">{filteredClassrooms.length}</strong> Kelas
          </span>
          <button
            onClick={fetchClassrooms}
            disabled={isLoading}
            className="p-2 rounded-lg bg-white border border-[#91EAAF]/50 hover:bg-[#F4FFFC] text-[#1F4B2C] transition shadow-2xs hover:-translate-y-0.5 active:scale-[0.98]"
            title="Muat Ulang"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#1F4B2C]' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tabel Data Kelas */}
      <div className="bg-white rounded-xl border border-[#91EAAF]/40 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-700">
            <thead className="bg-[#F4FFFC] border-b border-[#91EAAF]/40 text-[#1F4B2C] font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4 w-12 text-center">No</th>
                <th className="py-3 px-4">Nama Kelas / Rombel</th>
                <th className="py-3 px-4">Tahun Ajaran</th>
                <th className="py-3 px-4 text-center">Jumlah Siswa</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredClassrooms.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-12 text-center text-zinc-400 text-xs">
                    {isLoading ? 'Memuat data kelas...' : 'Belum ada data kelas yang terdaftar.'}
                  </td>
                </tr>
              ) : (
                filteredClassrooms.map((cls, index) => (
                  <tr key={cls.id} className="hover:bg-[#F4FFFC]/50 transition">
                    <td className="py-3 px-4 text-center font-mono text-zinc-500">
                      {index + 1}
                    </td>
                    <td className="py-3 px-4 font-bold text-zinc-900 text-sm">
                      {cls.name}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-0.5 rounded-md bg-[#F4FFFC] border border-[#91EAAF]/60 text-[#1F4B2C] font-mono text-[11px] font-semibold">
                        {cls.academic_year || '2026/2027'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleOpenStudentList(cls)}
                        title={`Klik untuk melihat detail ${cls.student_count || 0} siswa kelas ${cls.name}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#E1F8ED] hover:bg-[#cbf4e0] text-[#1F4B2C] font-mono font-bold text-xs border border-[#91EAAF]/60 transition-all hover:-translate-y-0.5 active:scale-[0.98] shadow-2xs cursor-pointer group mx-auto"
                      >
                        <Users className="w-3.5 h-3.5 text-[#1F4B2C] group-hover:scale-110 transition" />
                        <span>
                          {cls.student_count || 0} Siswa
                        </span>
                      </button>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(cls)}
                          className="p-1.5 rounded-md bg-[#F4FFFC] text-[#1F4B2C] hover:bg-[#E1F8ED] border border-[#91EAAF]/50 transition shadow-2xs hover:-translate-y-0.5 active:scale-[0.98]"
                          title="Edit Kelas"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(cls)}
                          className="p-1.5 rounded-md text-zinc-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition active:scale-[0.98]"
                          title="Hapus Kelas"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tambah / Edit Kelas */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={isEditing ? 'Edit Data Kelas' : 'Tambah Kelas Baru'}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {modalError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{modalError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              Nama Kelas / Rombel <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: X TKJ 1, XII MIPA 2"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs focus:border-zinc-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              Tahun Ajaran <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: 2026/2027"
              value={formData.academic_year}
              onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })}
              className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs focus:border-zinc-400 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-3.5 py-2 border border-zinc-200 text-zinc-700 font-medium text-xs rounded-lg hover:bg-zinc-50 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-[#1F4B2C] hover:bg-[#183D23] text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#C3E956]" />
                  <span>{isEditing ? 'Simpan Perubahan' : 'Tambah Kelas'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL DAFTAR SISWA PER KELAS */}
      {/* ======================================================== */}
      <Modal
        isOpen={isStudentListModalOpen}
        onClose={() => setIsStudentListModalOpen(false)}
        title={`Daftar Siswa Kelas ${selectedClassForStudents?.name || ''}`}
        maxWidth="max-w-3xl"
      >
        <div className="space-y-4">
          {/* Header Banner - SDMIS Forest Brand */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-gradient-to-r from-[#102919] via-[#143820] to-[#1F4B2C] border border-[#1F4B2C] text-white shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#0A1D11] border border-[#C3E956]/40 flex items-center justify-center text-[#C3E956]">
                <School className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-sm sm:text-base text-white">
                  Alokasi Rombongan Belajar
                </div>
                <div className="text-xs text-[#91EAAF]">
                  Kelas {selectedClassForStudents?.name} • Tahun Ajaran {selectedClassForStudents?.academic_year || '2026/2027'}
                </div>
              </div>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#0A1D11]/80 border border-[#C3E956]/40 text-xs font-mono font-bold text-[#C3E956] self-start sm:self-auto">
              <Users className="w-3.5 h-3.5 text-[#C3E956]" />
              <span>Total {classStudents.length} Siswa</span>
            </div>
          </div>

          {/* Kontrol: Show Entries & Search Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500 font-medium">Show</span>
              <select
                value={studentEntriesPerPage}
                onChange={(e) => setStudentEntriesPerPage(Number(e.target.value))}
                className="px-2 py-1 bg-white border border-[#91EAAF]/50 rounded-lg text-xs font-medium text-zinc-700 focus:outline-none focus:border-[#1F4B2C]"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
              <span className="text-xs text-zinc-500 font-medium">entries</span>
            </div>

            <div className="relative flex-1 sm:max-w-xs">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari nama atau NISN..."
                value={studentSearchQuery}
                onChange={(e) => setStudentSearchQuery(e.target.value)}
                className="w-full pl-8 pr-7 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs focus:border-[#1F4B2C] focus:ring-1 focus:ring-[#1F4B2C] focus:outline-none text-zinc-800 font-medium"
              />
              {studentSearchQuery && (
                <button
                  type="button"
                  onClick={() => setStudentSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Tabel Siswa */}
          <div className="rounded-xl border border-[#91EAAF]/40 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto max-h-[380px]">
              <table className="w-full text-left text-xs text-zinc-700">
                <thead className="bg-[#F4FFFC] border-b border-[#91EAAF]/40 text-[#1F4B2C] font-semibold uppercase tracking-wider text-[10px] sticky top-0 z-10">
                  <tr>
                    <th className="py-2.5 px-3 w-12 text-center">No</th>
                    <th className="py-2.5 px-3">Nama Lengkap Siswa</th>
                    <th className="py-2.5 px-3">NISN / Username</th>
                    <th className="py-2.5 px-3">Email</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {isLoadingClassStudents ? (
                    <tr>
                      <td colSpan="5" className="py-12 text-center text-zinc-400">
                        <div className="flex items-center justify-center gap-2">
                          <RefreshCw className="w-4 h-4 animate-spin text-[#1F4B2C]" />
                          <span>Memuat data siswa kelas...</span>
                        </div>
                      </td>
                    </tr>
                  ) : currentClassStudents.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="py-12 text-center text-zinc-400">
                        {studentSearchQuery
                          ? 'Tidak ada siswa yang cocok dengan kata kunci pencarian.'
                          : 'Belum ada siswa yang terdaftar pada kelas ini.'}
                      </td>
                    </tr>
                  ) : (
                    currentClassStudents.map((std, idx) => (
                      <tr key={std.id || idx} className="hover:bg-[#F4FFFC]/50 transition">
                        <td className="py-2 px-3 text-center font-mono text-zinc-500">
                          {studentIndexOfFirst + idx + 1}
                        </td>
                        <td className="py-2 px-3 font-medium text-zinc-900">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded bg-[#1F4B2C] text-[#C3E956] font-bold text-[10px] flex items-center justify-center shrink-0">
                              {getInitials(std.full_name)}
                            </div>
                            <div>
                              <div className="text-zinc-900 font-semibold">{std.full_name}</div>
                              <div className="text-[10px] text-zinc-400 font-normal">Peserta Ujian</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-2 px-3">
                          <span className="font-mono px-2 py-0.5 rounded-md bg-[#F4FFFC] border border-[#91EAAF]/60 text-[#1F4B2C] font-semibold text-[11px]">
                            {std.nisn || std.username}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-zinc-500 font-mono text-[11px]">
                          {std.email || '-'}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#C3E956]/20 text-[#4D7111] font-bold text-[10px] border border-[#C3E956]/40">
                            <CheckCircle2 className="w-3 h-3 text-[#4D7111]" />
                            <span>Aktif</span>
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer: Keterangan Entri, Paginasi & Tombol Tutup */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-zinc-500 font-medium pt-2 border-t border-zinc-100">
            <div>
              Menampilkan <span className="font-mono text-zinc-800">{filteredClassStudents.length > 0 ? studentIndexOfFirst + 1 : 0}</span> - <span className="font-mono text-zinc-800">{Math.min(studentIndexOfLast, filteredClassStudents.length)}</span> dari <span className="font-mono text-zinc-800">{filteredClassStudents.length}</span> siswa
            </div>

            <div className="flex items-center gap-2">
              {studentTotalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setStudentCurrentPage((p) => Math.max(p - 1, 1))}
                    disabled={studentCurrentPage === 1}
                    className="px-2 py-1 rounded border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 font-medium disabled:opacity-40 transition text-xs"
                  >
                    Prev
                  </button>
                  <span className="px-1 text-xs font-mono text-zinc-700">
                    {studentCurrentPage} / {studentTotalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setStudentCurrentPage((p) => Math.min(p + 1, studentTotalPages))}
                    disabled={studentCurrentPage === studentTotalPages}
                    className="px-2 py-1 rounded border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 font-medium disabled:opacity-40 transition text-xs"
                  >
                    Next
                  </button>
                </div>
              )}
              <button
                type="button"
                onClick={() => setIsStudentListModalOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 text-xs font-medium transition ml-auto"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

