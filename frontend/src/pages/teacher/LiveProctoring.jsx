import React, { useState, useEffect, useCallback } from 'react';
import { useExamStore } from '../../store/useExamStore';
import StatusBadge from '../../components/common/StatusBadge';
import { useProctorSocket } from '../../hooks/useProctorSocket';
import { proctoringApi } from '../../api/proctoringApi';
import { examApi } from '../../api/examApi';
import { 
  Radio, 
  Unlock, 
  Ban, 
  AlertTriangle, 
  ShieldCheck, 
  Search, 
  Filter, 
  Smartphone, 
  Monitor, 
  Clock, 
  UserCheck, 
  RefreshCw, 
  Sparkles,
  Wifi,
  WifiOff,
  Megaphone,
  Send,
  X,
  Volume2,
  CheckCircle2,
  KeyRound,
  Copy,
  RotateCcw
} from 'lucide-react';
import { getSessionTokens, formatTimeRemaining } from '../../utils/tokenGenerator';

export default function LiveProctoring() {
  const { 
    examSessions, 
    proctoringStudents, 
    currentUser,
    unlockStudent: storeUnlockStudent, 
    disqualifyStudent: storeDisqualifyStudent,
    triggerViolationLock
  } = useExamStore();

  const [availableSessions, setAvailableSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'WORKING' | 'LOCKED_VIOLATION' | 'SUBMITTED'
  const [liveStudents, setLiveStudents] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // State Siaran Pengumuman Langsung (Live Announcement Broadcast)
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastUrgency, setBroadcastUrgency] = useState('INFO'); // 'INFO' | 'WARNING' | 'URGENT'
  const [broadcastHistory, setBroadcastHistory] = useState([]);
  const [broadcastAlertToast, setBroadcastAlertToast] = useState('');

  // State Buka Kunci Seluruh Siswa (Mass Unlock)
  const [isUnlockAllModalOpen, setIsUnlockAllModalOpen] = useState(false);
  const [isUnlockingAll, setIsUnlockingAll] = useState(false);
  const [unlockAllSuccessToast, setUnlockAllSuccessToast] = useState('');

  // Live Timer State untuk Sinkronisasi Rotasi Token 10 Menit
  const [tickTime, setTickTime] = useState(Date.now());
  const [copiedToken, setCopiedToken] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setTickTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleCopyLiveToken = (text, type) => {
    if (!text) return;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
    } catch (_) {}
    setCopiedToken(type);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  // 1. Ambil daftar sesi ujian dari backend
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const sessions = await examApi.getSessions();
        if (sessions && sessions.length > 0) {
          setAvailableSessions(sessions);
          setSelectedSessionId((prev) => (prev && sessions.some(s => s.id === prev) ? prev : sessions[0].id));
        } else {
          setAvailableSessions([]);
          setSelectedSessionId('');
        }
      } catch (err) {
        console.warn('Gagal memuat sesi backend:', err);
      }
    };
    fetchSessions();
  }, []);

  // 2. Ambil status siswa untuk sesi yang dipilih
  const fetchSessionStatus = useCallback(async () => {
    if (!selectedSessionId) {
      setLiveStudents([]);
      return;
    }
    setIsLoading(true);
    try {
      const data = await proctoringApi.getSessionStatus(selectedSessionId);
      if (data && data.students && data.students.length > 0) {
        const mapped = data.students.map(s => ({
          studentId: s.student_id,
          attemptId: s.id,
          nisn: s.nisn,
          fullName: s.student_name,
          classroom: data.classroom,
          status: s.status,
          screenOrientation: s.screen_orientation,
          violationCount: s.violation_count,
          score: s.total_score,
          networkLatencyMs: s.network_latency_ms || 0,
          startedAt: s.started_at ? new Date(s.started_at).toLocaleTimeString('id-ID') : '-',
          finishedAt: s.finished_at ? new Date(s.finished_at).toLocaleTimeString('id-ID') : null,
          lastViolation: s.violations && s.violations.length > 0 ? {
            type: s.violations[0].violation_type,
            description: s.violations[0].description,
            time: new Date(s.violations[0].detected_at).toLocaleTimeString('id-ID')
          } : null
        }));
        setLiveStudents(mapped);
      } else {
        setLiveStudents([]);
      }
    } catch {
      setLiveStudents([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedSessionId]);

  useEffect(() => {
    fetchSessionStatus();
  }, [fetchSessionStatus]);

  // 3. WebSocket Realtime Listener
  const handleStudentLocked = useCallback((payload) => {
    setLiveStudents(prev => prev.map(student => {
      if (student.attemptId === payload.attempt_id || student.nisn === payload.nisn) {
        return {
          ...student,
          status: 'LOCKED_VIOLATION',
          violationCount: payload.violation_count,
          lastViolation: {
            type: payload.violation_type,
            description: payload.description,
            time: payload.detected_at || new Date().toLocaleTimeString('id-ID')
          }
        };
      }
      return student;
    }));
  }, []);

  const handleStudentUnlocked = useCallback((payload) => {
    setLiveStudents(prev => prev.map(student => {
      if (student.attemptId === payload.attempt_id) {
        return {
          ...student,
          status: 'WORKING'
        };
      }
      return student;
    }));
  }, []);

  const handleAllStudentsUnlocked = useCallback(() => {
    setLiveStudents(prev => prev.map(student => {
      if (student.status === 'LOCKED_VIOLATION') {
        return {
          ...student,
          status: 'WORKING'
        };
      }
      return student;
    }));
  }, []);

  const handleStudentDisqualified = useCallback((payload) => {
    setLiveStudents(prev => prev.map(student => {
      if (student.attemptId === payload.attempt_id) {
        return {
          ...student,
          status: 'DISQUALIFIED'
        };
      }
      return student;
    }));
  }, []);

  const handleStudentSubmitted = useCallback((payload) => {
    setLiveStudents(prev => prev.map(student => {
      if (student.attemptId === payload.attempt_id) {
        return {
          ...student,
          status: 'SUBMITTED',
          score: payload.total_score
        };
      }
      return student;
    }));
  }, []);

  const handleStudentCancelled = useCallback((payload) => {
    setLiveStudents((prev) =>
      prev.filter(
        (student) =>
          student.attemptId !== payload.attempt_id &&
          student.studentId !== payload.student_id
      )
    );
  }, []);

  const handleNetworkHeartbeat = useCallback((payload) => {
    setLiveStudents((prev) =>
      prev.map((student) => {
        if (student.attemptId === payload.attempt_id) {
          return {
            ...student,
            networkLatencyMs: payload.latency_ms || 0
          };
        }
        return student;
      })
    );
  }, []);

  const { isConnected, sendUnlockCommand, sendUnlockAllCommand, sendDisqualifyCommand, sendAnnouncement } = useProctorSocket(
    selectedSessionId,
    {
      onStudentLocked: handleStudentLocked,
      onStudentUnlocked: handleStudentUnlocked,
      onAllStudentsUnlocked: handleAllStudentsUnlocked,
      onStudentDisqualified: handleStudentDisqualified,
      onStudentSubmitted: handleStudentSubmitted,
      onStudentCancelled: handleStudentCancelled,
      onNetworkHeartbeat: handleNetworkHeartbeat
    }
  );

  // Handler Kirim Siaran Pengumuman
  const handleSendBroadcast = (e) => {
    if (e) e.preventDefault();
    const trimmed = broadcastMessage.trim();
    if (!trimmed) return;

    const sender = currentUser?.full_name || 'Guru Pengawas';
    sendAnnouncement(trimmed, broadcastUrgency, sender);

    const newRecord = {
      id: Date.now(),
      message: trimmed,
      urgency: broadcastUrgency,
      sender: sender,
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    };

    setBroadcastHistory(prev => [newRecord, ...prev]);
    setBroadcastMessage('');
    setIsBroadcastModalOpen(false);
    setBroadcastAlertToast('Siaran pengumuman berhasil dikirim ke seluruh layar siswa!');
    setTimeout(() => setBroadcastAlertToast(''), 4500);
  };

  const currentSession = availableSessions.find((s) => s.id === selectedSessionId) || availableSessions[0];

  // Aksi Unlock Siswa
  const handleUnlock = async (student) => {
    // 1. Panggil WebSocket
    if (student.attemptId) {
      sendUnlockCommand(student.attemptId);
      try {
        await proctoringApi.unlockStudent(student.attemptId);
      } catch (err) {
        console.warn('Unlock API fallback:', err);
      }
    }
    // 2. Perbarui Store & State Lokal
    storeUnlockStudent(student.studentId);
    setLiveStudents(prev => prev.map(s => s.studentId === student.studentId ? { ...s, status: 'WORKING' } : s));
  };

  // Aksi Buka Kunci Seluruh Siswa Sekaligus (Mass Unlock)
  const handleUnlockAll = async () => {
    if (!selectedSessionId) return;
    setIsUnlockingAll(true);

    const targetStudents = (liveStudents.length > 0 ? liveStudents : proctoringStudents);
    const lockedStudents = targetStudents.filter(s => s.status === 'LOCKED_VIOLATION');
    const count = lockedStudents.length;

    try {
      // 1. Panggil WebSocket perintah massal
      sendUnlockAllCommand();

      // 2. Panggil REST API Backend
      await proctoringApi.unlockAllStudents(selectedSessionId);

      // 3. Perbarui Store Zustand Lokal
      lockedStudents.forEach(s => {
        storeUnlockStudent(s.studentId);
      });

      // 4. Perbarui State liveStudents Lokal
      setLiveStudents(prev => prev.map(s => s.status === 'LOCKED_VIOLATION' ? { ...s, status: 'WORKING' } : s));

      setIsUnlockAllModalOpen(false);
      setUnlockAllSuccessToast(`Berhasil membuka kunci seluruh siswa (${count} siswa)! Layar ujian siswa telah pulih kembali.`);
      setTimeout(() => setUnlockAllSuccessToast(''), 5000);
    } catch (err) {
      console.warn('Unlock all API fallback ke lokal:', err);
      lockedStudents.forEach(s => {
        storeUnlockStudent(s.studentId);
      });
      setLiveStudents(prev => prev.map(s => s.status === 'LOCKED_VIOLATION' ? { ...s, status: 'WORKING' } : s));
      setIsUnlockAllModalOpen(false);
      setUnlockAllSuccessToast(`Layar ${count} siswa berhasil dibuka kembali.`);
      setTimeout(() => setUnlockAllSuccessToast(''), 5000);
    } finally {
      setIsUnlockingAll(false);
    }
  };

  // Aksi Diskualifikasi Siswa
  const handleDisqualify = async (student) => {
    if (!confirm(`Yakin ingin mendiskualifikasi siswa ${student.fullName}?`)) return;

    if (student.attemptId) {
      sendDisqualifyCommand(student.attemptId);
      try {
        await proctoringApi.disqualifyStudent(student.attemptId);
      } catch (err) {
        console.warn('Disqualify API fallback:', err);
      }
    }
    storeDisqualifyStudent(student.studentId);
    setLiveStudents(prev => prev.map(s => s.studentId === student.studentId ? { ...s, status: 'DISQUALIFIED' } : s));
  };

  // Filtering Data Siswa
  const displayedStudents = liveStudents.length > 0 ? liveStudents : proctoringStudents;
  const filteredStudents = displayedStudents.filter((student) => {
    const matchesSearch = 
      student.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.nisn.includes(searchQuery);

    const matchesStatus = 
      statusFilter === 'ALL' || student.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const totalCount = displayedStudents.length;
  const workingCount = displayedStudents.filter((s) => s.status === 'WORKING').length;
  const lockedCount = displayedStudents.filter((s) => s.status === 'LOCKED_VIOLATION').length;
  const submittedCount = displayedStudents.filter((s) => s.status === 'SUBMITTED').length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">
              Ruang Pengawas Real-Time (Live Proctoring)
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 mt-0.5 leading-relaxed">
            Pantau aktivitas ujian, layar siswa terkunci secara live, dan berikan izin buka kunci (unlock).
          </p>
        </div>

        {/* Action Simulasi & Status Koneksi */}
        <div className="flex items-center gap-2">
          <div className={`px-2 py-0.5 rounded text-[11px] font-medium border flex items-center gap-1.5 ${
            isConnected 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
              : 'bg-amber-50 border-amber-200 text-amber-800'
          }`}>
            {isConnected ? (
              <>
                <Wifi className="w-3 h-3 text-emerald-600" />
                <span>WebSocket Aktif</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3 h-3 text-amber-600" />
                <span>Mode Standby</span>
              </>
            )}
          </div>

          {/* Tombol Buka Kunci Seluruh Siswa */}
          <button
            onClick={() => {
              if (lockedCount === 0) {
                setBroadcastAlertToast('Saat ini tidak ada siswa yang layarnya terkunci.');
                setTimeout(() => setBroadcastAlertToast(''), 4000);
                return;
              }
              setIsUnlockAllModalOpen(true);
            }}
            disabled={isLoading || isUnlockingAll}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs hover:-translate-y-0.5 active:scale-[0.98] ${
              lockedCount > 0
                ? 'bg-[#1F4B2C] hover:bg-[#183D23] text-[#C3E956] border border-[#C3E956]/40 shadow-xs'
                : 'bg-[#E2F4B4] hover:bg-[#d6f0a3] text-[#102919] border-2 border-[#8BC829]'
            }`}
            title="Buka kembali layar seluruh siswa yang saat ini terkunci secara serentak"
          >
            <Unlock className="w-4 h-4" />
            <span>Buka Kunci Seluruh Siswa</span>
            {lockedCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#C3E956] text-[#0A1D11] font-mono font-extrabold">
                {lockedCount}
              </span>
            )}
          </button>

          {/* Tombol Kirim Siaran ke Siswa */}
          <button
            onClick={() => setIsBroadcastModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-[#143820] hover:bg-[#183D23] border border-[#91EAAF]/40 text-[#F4FFFC] text-xs font-bold transition flex items-center gap-1.5 shadow-xs hover:-translate-y-0.5 active:scale-[0.98]"
            title="Kirim Siaran Pengumuman ke Seluruh Siswa"
          >
            <Megaphone className="w-4 h-4 text-[#C3E956]" />
            <span className="hidden sm:inline">Kirim Siaran Siswa</span>
          </button>

          <button
            onClick={fetchSessionStatus}
            disabled={isLoading}
            className="p-2.5 rounded-xl bg-[#E2F4B4] border-2 border-[#8BC829] hover:bg-[#C3E956] text-[#102919] transition shadow-xs hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer"
            title="Muat Ulang Status"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-[#102919]' : ''}`} />
          </button>
        </div>
      </div>

      {/* Toast Sukses Unlock All */}
      {unlockAllSuccessToast && (
        <div className="p-3 bg-[#E2F4B4] border-2 border-[#8BC829] text-[#102919] rounded-2xl text-xs font-black flex items-center gap-2 shadow-xs animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-[#102919] shrink-0" />
          <span>{unlockAllSuccessToast}</span>
        </div>
      )}

      {/* Toast Sukses Broadcast */}
      {broadcastAlertToast && (
        <div className="p-3 bg-[#E2F4B4] border-2 border-[#8BC829] text-[#102919] rounded-2xl text-xs font-black flex items-center gap-2 shadow-xs animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-[#102919] shrink-0" />
          <span>{broadcastAlertToast}</span>
        </div>
      )}

      {/* Bar Filter Sesi Ujian & Ringkasan Status */}
      <div className="bg-[#EFF9CE] rounded-3xl p-5 sm:p-6 border-2 border-[#8BC829] shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 items-center">
          {/* Pilih Sesi Ujian */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-[#102919] mb-1">
              Pilih Sesi Ujian Aktif:
            </label>
            <select
              value={selectedSessionId}
              onChange={(e) => setSelectedSessionId(e.target.value)}
              className="w-full text-xs sm:text-sm font-bold rounded-xl border-2 border-[#8BC829] focus:outline-none focus:border-[#102919] focus:ring-2 focus:ring-[#C3E956] py-2.5 px-3 bg-[#F9FDEE] text-[#102919]"
            >
              {availableSessions.map((ses) => (
                <option key={ses.id} value={ses.id}>
                  {ses.subject_name || ses.subjectName} — {ses.classroom_name || ses.classroom} ({ses.title})
                </option>
              ))}
            </select>
          </div>

          {/* Bar Pencarian Siswa */}
          <div className="md:col-span-2">
            <label className="block text-[11px] font-black uppercase tracking-wider text-[#102919] mb-1">
              Cari Nama atau NISN Siswa:
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-[#102919]/60 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Ketik nama atau nomor induk..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 text-xs sm:text-sm font-bold rounded-xl border-2 border-[#8BC829] focus:outline-none focus:border-[#102919] focus:ring-2 focus:ring-[#C3E956] bg-[#F9FDEE] text-[#102919]"
              />
            </div>
          </div>
        </div>

        {/* DUO TOKEN AKTIF PENGAWAS (ROTASI 10 MENIT) */}
        {(() => {
          const selectedSession = availableSessions.find(s => s.id === selectedSessionId) || availableSessions[0];
          if (!selectedSession) return null;
          const dynamicTokens = getSessionTokens(selectedSession.id, tickTime / 1000);
          const entryToken = dynamicTokens.entryToken || selectedSession.entry_password || selectedSession.entryPassword || '-';
          const pinToken = dynamicTokens.pinToken || selectedSession.supervisor_pin || selectedSession.supervisorPin || 'PIN-1234';
          const countdownStr = formatTimeRemaining(dynamicTokens.expiresInSeconds);

          return (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3.5 rounded-2xl bg-gradient-to-r from-[#102919] via-[#143820] to-[#1F4B2C] text-white border-2 border-[#1F4B2C] shadow-sm">
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#0A1D11]/80 border border-[#C3E956]/40 text-[#C3E956] font-mono text-[11px] font-black">
                  <RotateCcw className="w-3.5 h-3.5 text-[#C3E956] animate-spin" style={{ animationDuration: '6s' }} />
                  <span>Rotasi: <strong className="text-white font-black">{countdownStr}</strong></span>
                </span>
                <span className="text-[#8BC829] hidden md:inline">•</span>
                <span className="text-[#EFF9CE]/90 font-medium text-[11px] hidden md:inline">
                  Token berganti otomatis tiap 10 menit
                </span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Token Masuk Siswa */}
                <button
                  type="button"
                  onClick={() => handleCopyLiveToken(entryToken, 'entry')}
                  className="px-3.5 py-1.5 rounded-xl bg-[#0A1D11]/90 hover:bg-[#0A1D11] border border-[#C3E956]/50 text-[#C3E956] text-xs flex items-center gap-1.5 transition active:scale-[0.98] shadow-xs cursor-pointer"
                  title="Salin Token Masuk Siswa"
                >
                  <KeyRound className="w-3.5 h-3.5 text-[#C3E956]" />
                  <span className="text-[#EFF9CE]/80 text-[11px]">Token Masuk:</span>
                  <strong className="text-white font-mono font-black">{entryToken}</strong>
                  {copiedToken === 'entry' ? (
                    <span className="text-[#C3E956] text-[10px] font-black animate-pulse ml-0.5">Tersalin!</span>
                  ) : (
                    <Copy className="w-3 h-3 text-[#C3E956]/80 hover:text-white ml-0.5" />
                  )}
                </button>

                {/* PIN Pengawas */}
                <button
                  type="button"
                  onClick={() => handleCopyLiveToken(pinToken, 'pin')}
                  className="px-3.5 py-1.5 rounded-xl bg-[#0A1D11]/90 hover:bg-[#0A1D11] border border-[#91EAAF]/40 text-[#91EAAF] text-xs flex items-center gap-1.5 transition active:scale-[0.98] shadow-xs cursor-pointer"
                  title="Salin PIN Buka Kunci Pengawas"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-[#91EAAF]" />
                  <span className="text-[#EFF9CE]/80 text-[11px]">PIN Pengawas:</span>
                  <strong className="text-white font-mono font-black">{pinToken}</strong>
                  {copiedToken === 'pin' ? (
                    <span className="text-[#91EAAF] text-[10px] font-black animate-pulse ml-0.5">Tersalin!</span>
                  ) : (
                    <Copy className="w-3 h-3 text-[#91EAAF]/80 hover:text-white ml-0.5" />
                  )}
                </button>
              </div>
            </div>
          );
        })()}

        {/* 4 Tombol Filter Tab Status */}
        <div className="flex items-center gap-2 pt-2 border-t-2 border-[#8BC829]/40 overflow-x-auto pb-1 sm:flex-wrap">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 shrink-0 border-2 cursor-pointer ${
              statusFilter === 'ALL'
                ? 'bg-[#102919] text-[#C3E956] border-[#102919] shadow-xs'
                : 'bg-[#E2F4B4] text-[#102919] border-[#8BC829] hover:bg-[#d6f0a3]'
            }`}
          >
            <span>Semua Siswa</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#EFF9CE] text-[#102919] font-mono font-black">
              {totalCount}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('WORKING')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 shrink-0 border-2 cursor-pointer ${
              statusFilter === 'WORKING'
                ? 'bg-[#102919] text-[#C3E956] border-[#102919] shadow-xs'
                : 'bg-[#E2F4B4] text-[#102919] border-[#8BC829] hover:bg-[#d6f0a3]'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#C3E956]" />
            <span>Sedang Fokus</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[#1F4B2C] text-[#C3E956] font-mono font-bold">
              {workingCount}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('LOCKED_VIOLATION')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shrink-0 border ${
              statusFilter === 'LOCKED_VIOLATION'
                ? 'bg-rose-600 text-white border-rose-600 shadow-2xs font-semibold animate-pulse'
                : 'bg-rose-50 text-rose-900 border-rose-200 hover:bg-rose-100'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
            <span>Layar Terkunci</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-200 text-rose-900 font-mono font-bold">
              {lockedCount}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('SUBMITTED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shrink-0 border ${
              statusFilter === 'SUBMITTED'
                ? 'bg-[#4D7111] text-white border-[#4D7111] shadow-xs'
                : 'bg-[#C3E956]/20 text-[#4D7111] border-[#C3E956]/40 hover:bg-[#C3E956]/30'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#91EAAF]" />
            <span>Selesai Terkirim</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[#4D7111] text-white font-mono font-bold">
              {submittedCount}
            </span>
          </button>

          {lockedCount > 0 && (
            <button
              onClick={() => setIsUnlockAllModalOpen(true)}
              className="ml-auto px-3 py-1.5 rounded-xl bg-[#1F4B2C] hover:bg-[#183D23] text-[#C3E956] text-xs font-bold transition flex items-center gap-1.5 shadow-xs shrink-0 active:scale-[0.98] border border-[#C3E956]/40"
              title="Buka Kunci Seluruh Siswa yang Terkunci"
            >
              <Unlock className="w-3.5 h-3.5" />
              <span>Buka Semua Kunci ({lockedCount})</span>
            </button>
          )}
        </div>
      </div>

      {/* Grid Kartu Siswa Real-Time */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredStudents.length > 0 ? (
          filteredStudents.map((student) => {
            const isLocked = student.status === 'LOCKED_VIOLATION';
            const isSubmitted = student.status === 'SUBMITTED';

            return (
              <div
                key={student.studentId || student.nisn}
                className={`rounded-3xl border-2 transition-all duration-200 flex flex-col justify-between overflow-hidden shadow-sm hover:shadow-md ${
                  isLocked
                    ? 'bg-rose-50 border-rose-500 ring-2 ring-rose-400/40'
                    : isSubmitted
                    ? 'bg-[#EFF9CE] border-2 border-[#8BC829] hover:border-[#102919]'
                    : 'bg-[#EFF9CE] border-2 border-[#8BC829] hover:border-[#102919]'
                }`}
              >
                <div>
                  {/* Top Status Banner across card header */}
                  <div className={`px-4 py-2.5 flex items-center justify-between text-xs font-black ${
                    isLocked
                      ? 'bg-rose-600 text-white animate-pulse'
                      : isSubmitted
                      ? 'bg-gradient-to-r from-[#102919] to-[#1F4B2C] text-[#C3E956]'
                      : 'bg-gradient-to-r from-[#143820] to-[#102919] text-[#C3E956]'
                  }`}>
                    <div className="flex items-center gap-1.5">
                      {isLocked ? (
                        <>
                          <AlertTriangle className="w-3.5 h-3.5 text-white" />
                          <span>Layar Terkunci</span>
                        </>
                      ) : isSubmitted ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#C3E956]" />
                          <span>Selesai Terkirim</span>
                        </>
                      ) : (
                        <>
                          <span className="w-2 h-2 rounded-full bg-[#C3E956] animate-pulse" />
                          <span className="text-white">Sedang Fokus</span>
                        </>
                      )}
                    </div>

                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-black ${
                      isLocked
                        ? 'bg-rose-200 text-rose-900 border border-rose-300'
                        : isSubmitted
                        ? 'bg-[#0A1D11] text-[#C3E956]'
                        : 'bg-[#1F4B2C] text-[#C3E956]'
                    }`}>
                      {student.classroom || 'Kelas'}
                    </span>
                  </div>

                  <div className="p-4 space-y-3">
                    {/* Student Identity */}
                    <div>
                      <h3 className="font-black text-[#102919] text-sm sm:text-base leading-tight tracking-tight">
                        {student.fullName}
                      </h3>
                      <div className="text-[11px] text-[#102919]/70 mt-1 flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[#102919] bg-[#E2F4B4] px-2 py-0.5 rounded-lg border border-[#8BC829] font-black">
                          NISN: {student.nisn}
                        </span>
                      </div>
                    </div>

                    {/* Info Sensor Device & Waktu */}
                    <div className="space-y-1.5 text-xs bg-[#E2F4B4] border-2 border-[#8BC829] rounded-2xl p-3 text-[#102919]">
                      <div className="flex items-center justify-between">
                        <span className="text-[#102919] font-bold flex items-center gap-1.5">
                          {student.screenOrientation === 'LANDSCAPE' ? (
                            <Monitor className="w-3.5 h-3.5 text-[#102919]" />
                          ) : (
                            <Smartphone className="w-3.5 h-3.5 text-[#102919]" />
                          )}
                          Orientasi:
                        </span>
                        <span className="font-mono font-black text-[#102919] bg-[#F9FDEE] px-2 py-0.5 rounded-lg border border-[#8BC829] text-[11px]">
                          {student.screenOrientation}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-[#102919] font-bold">Jam Mulai:</span>
                        <span className="font-mono text-[#102919] font-bold text-[11px]">{student.startedAt || '-'}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-[#102919] font-bold">Jam Selesai:</span>
                        <span className="font-mono text-[#102919] font-bold text-[11px]">{student.finishedAt || 'Sedang Berjalan'}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-[#102919] font-bold flex items-center gap-1">
                          <Wifi className="w-3.5 h-3.5 text-[#102919]" />
                          Latensi:
                        </span>
                        <span
                          className={`font-mono text-[10px] px-2 py-0.5 rounded-lg border flex items-center gap-1 font-bold ${
                            student.networkLatencyMs > 0 && student.networkLatencyMs < 150
                              ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                              : student.networkLatencyMs >= 150 && student.networkLatencyMs < 400
                              ? 'bg-amber-100 text-amber-900 border-amber-300'
                              : student.networkLatencyMs >= 400
                              ? 'bg-rose-100 text-rose-900 border-rose-300'
                              : 'bg-[#F9FDEE] text-[#102919] border-[#8BC829]'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              student.networkLatencyMs > 0 && student.networkLatencyMs < 150
                                ? 'bg-emerald-500'
                                : student.networkLatencyMs >= 150 && student.networkLatencyMs < 400
                                ? 'bg-amber-500'
                                : student.networkLatencyMs >= 400
                                ? 'bg-rose-500'
                                : 'bg-emerald-500'
                            }`}
                          />
                          {student.networkLatencyMs ? `${student.networkLatencyMs} ms` : 'Aktif'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between border-t border-[#8BC829]/40 pt-1.5 mt-1">
                        <span className="text-[#102919] font-black">Pelanggaran:</span>
                        <span className={`font-mono text-[11px] px-2 py-0.5 rounded-lg border font-black ${
                          student.violationCount > 0 
                            ? 'text-white bg-rose-600 border-rose-700 animate-pulse' 
                            : 'text-[#0A1D11] bg-[#C3E956] border-[#4D7111]/30'
                        }`}>
                          {student.violationCount > 0 ? `${student.violationCount} Kali` : '0 Bersih'}
                        </span>
                      </div>

                      {student.score !== null && student.score !== undefined && (
                        <div className="flex items-center justify-between border-t border-[#8BC829]/40 pt-1.5 mt-1">
                          <span className="text-[#102919] font-black">Skor Nilai:</span>
                          <span className="text-[#0A1D11] font-mono font-black text-xs bg-[#C3E956] px-2 py-0.5 rounded-lg border border-[#4D7111]/30">
                            {student.score} Poin
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Warning Box Pelanggaran Terakhir */}
                    {isLocked && student.lastViolation && (
                      <div className="p-3 bg-rose-100 border border-rose-300 rounded-xl text-xs text-rose-950 space-y-1 shadow-2xs">
                        <div className="flex items-center gap-1.5 font-bold text-rose-900">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                          <span>Pelanggaran [{student.lastViolation.time}]:</span>
                        </div>
                        <div className="text-[11px] leading-relaxed font-medium">
                          {student.lastViolation.description}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Tombol Aksi Pengawas */}
                <div className="p-3 pt-0 flex items-center gap-2">
                  {isLocked ? (
                    <button
                      onClick={() => handleUnlock(student)}
                      className="flex-1 py-2.5 px-3 bg-[#102919] hover:bg-[#1F4B2C] text-[#C3E956] border border-[#C3E956]/40 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98] cursor-pointer"
                    >
                      <Unlock className="w-4 h-4 text-[#C3E956]" />
                      <span>Buka Kunci Layar</span>
                    </button>
                  ) : isSubmitted ? (
                    <div className="flex-1 py-2 px-3 bg-[#C3E956] text-[#0A1D11] border border-[#4D7111]/30 rounded-xl text-xs font-black text-center flex items-center justify-center gap-1.5 shadow-xs">
                      <CheckCircle2 className="w-4 h-4 text-[#0A1D11]" />
                      <span>Selesai Terkirim</span>
                    </div>
                  ) : (
                    <div className="flex-1 py-2 px-3 bg-[#E2F4B4] text-[#102919] border-2 border-[#8BC829] rounded-xl text-xs font-black flex items-center justify-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-[#102919]" />
                      <span>Kondusif & Terkunci</span>
                    </div>
                  )}

                  <button
                    onClick={() => handleDisqualify(student)}
                    className="p-2 text-[#102919] hover:text-rose-700 bg-[#E2F4B4] hover:bg-rose-100 rounded-xl border-2 border-[#8BC829] hover:border-rose-300 transition active:scale-[0.98] cursor-pointer"
                    title="Diskualifikasi Siswa dari Ujian"
                  >
                    <Ban className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full py-16 text-center bg-[#EFF9CE] rounded-3xl border-2 border-dashed border-[#8BC829] p-6 space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-[#E2F4B4] flex items-center justify-center text-[#102919] mx-auto mb-2 border-2 border-[#8BC829]">
              <UserCheck className="w-6 h-6" />
            </div>
            <h3 className="font-black text-[#102919] text-base">Belum Ada Siswa yang Sedang Mengerjakan</h3>
            <p className="text-xs text-[#102919]/70 max-w-md mx-auto leading-relaxed font-medium">
              Saat ini belum ada peserta yang memulai sesi ujian ini atau seluruh sesi pengerjaan telah selesai. Kartu pemantauan akan otomatis muncul secara langsung (real-time) saat siswa memasukkan Password Masuk Ujian.
            </p>
          </div>
        )}
      </div>

      {/* MODAL SIARAN PENGUMUMAN LANGSUNG KE SISWA */}
      {isBroadcastModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#0A1D11]/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-[#EFF9CE] rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border-2 border-[#8BC829] space-y-4 my-8 text-[#102919]">
            <div className="flex items-start justify-between gap-3 border-b-2 border-[#8BC829]/40 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[#E2F4B4] border-2 border-[#8BC829] text-[#102919] flex items-center justify-center shrink-0">
                  <Megaphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#102919]">
                    Siaran Pengumuman Pengawas
                  </h3>
                  <p className="text-xs text-[#102919]/70 font-medium">
                    Kirim ralat soal atau instruksi waktu langsung ke layar seluruh siswa aktif.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsBroadcastModalOpen(false)}
                className="p-1.5 rounded-xl text-[#102919] hover:bg-[#E2F4B4] border border-transparent hover:border-[#8BC829] transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendBroadcast} className="space-y-4">
              {/* Urgensi Level */}
              <div>
                <label className="block text-xs font-black text-[#102919] mb-1.5">
                  Tingkat Urgensi Pengumuman:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setBroadcastUrgency('INFO')}
                    className={`py-2 px-3 rounded-xl text-xs font-black border-2 transition text-center cursor-pointer ${
                      broadcastUrgency === 'INFO'
                        ? 'bg-[#102919] border-[#102919] text-[#C3E956] shadow-xs'
                        : 'bg-[#E2F4B4] border-[#8BC829] text-[#102919] hover:bg-[#d6f0a3]'
                    }`}
                  >
                    Info Umum
                  </button>
                  <button
                    type="button"
                    onClick={() => setBroadcastUrgency('WARNING')}
                    className={`py-2 px-3 rounded-xl text-xs font-black border-2 transition text-center cursor-pointer ${
                      broadcastUrgency === 'WARNING'
                        ? 'bg-amber-600 border-amber-700 text-white shadow-xs'
                        : 'bg-[#E2F4B4] border-[#8BC829] text-[#102919] hover:bg-[#d6f0a3]'
                    }`}
                  >
                    Peringatan
                  </button>
                  <button
                    type="button"
                    onClick={() => setBroadcastUrgency('URGENT')}
                    className={`py-2 px-3 rounded-xl text-xs font-black border-2 transition text-center cursor-pointer ${
                      broadcastUrgency === 'URGENT'
                        ? 'bg-rose-600 border-rose-700 text-white shadow-xs'
                        : 'bg-[#E2F4B4] border-[#8BC829] text-[#102919] hover:bg-[#d6f0a3]'
                    }`}
                  >
                    Ralat Vital
                  </button>
                </div>
              </div>

              {/* Textarea Pesan */}
              <div>
                <label className="block text-xs font-black text-[#102919] mb-1.5">
                  Isi Pesan Pengumuman / Ralat Soal:
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Contoh: Perhatian siswa, untuk Soal No. 8 satuan yang dimaksud adalah cm bukan meter. Waktu tersisa 15 menit lagi."
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  className="w-full p-3 text-xs sm:text-sm rounded-xl border-2 border-[#8BC829] bg-[#F9FDEE] text-[#102919] focus:outline-none focus:border-[#102919] focus:ring-2 focus:ring-[#C3E956] transition resize-none font-bold leading-relaxed"
                />
              </div>

              {/* Riwayat Pengumuman Sebelumnya (jika ada) */}
              {broadcastHistory.length > 0 && (
                <div className="bg-[#E2F4B4] p-3 rounded-2xl border-2 border-[#8BC829] space-y-1.5">
                  <div className="text-[11px] font-black text-[#102919] uppercase tracking-wider">
                    Riwayat Siaran Sesi Ini:
                  </div>
                  <div className="max-h-28 overflow-y-auto space-y-1 pr-1 divide-y divide-[#8BC829]/40 text-xs">
                    {broadcastHistory.map((h) => (
                      <div key={h.id} className="pt-1.5 first:pt-0">
                        <div className="flex items-center justify-between text-[10px] text-[#102919]/70 font-mono font-bold">
                          <span className="font-black text-[#102919]">[{h.urgency}] {h.time}</span>
                          <span>Oleh: {h.sender}</span>
                        </div>
                        <p className="text-[#102919] text-[11px] mt-0.5 line-clamp-2 font-medium">
                          {h.message}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tombol Aksi */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t-2 border-[#8BC829]/40">
                <button
                  type="button"
                  onClick={() => setIsBroadcastModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-black text-[#102919] bg-[#E2F4B4] hover:bg-[#d6f0a3] border-2 border-[#8BC829] transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={!broadcastMessage.trim()}
                  className="px-5 py-2.5 rounded-xl bg-[#C3E956] hover:bg-[#b8e337] text-[#0A1D11] text-xs font-black transition flex items-center gap-1.5 shadow-sm border-2 border-[#4D7111]/30 cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Kirim ke Seluruh Siswa</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL KONFIRMASI BUKA KUNCI SELURUH SISWA (MASS UNLOCK)   */}
      {/* ======================================================== */}
      {isUnlockAllModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#0A1D11]/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn select-none">
          <div className="bg-[#EFF9CE] rounded-3xl border-2 border-[#8BC829] max-w-md w-full p-6 shadow-2xl space-y-4 relative text-[#102919]">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-[#E2F4B4] border-2 border-[#8BC829] flex items-center justify-center text-[#102919] shrink-0">
                <Unlock className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-black text-[#102919] tracking-tight">
                  Buka Kunci Seluruh Siswa?
                </h3>
                <p className="text-xs text-[#102919]/70 mt-1 leading-relaxed font-medium">
                  Sistem mendeteksi ada <strong className="text-rose-700 font-black">{lockedCount} siswa</strong> yang layarnya saat ini terkunci akibat penalti keamanan.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsUnlockAllModalOpen(false)}
                className="p-1.5 rounded-xl text-[#102919] hover:bg-[#E2F4B4] border border-transparent hover:border-[#8BC829] transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-[#E2F4B4] border-2 border-[#8BC829] rounded-2xl p-4 text-xs text-[#102919] space-y-2 leading-relaxed">
              <div className="flex items-center gap-1.5 text-[#102919] font-black">
                <CheckCircle2 className="w-4 h-4 text-[#1F4B2C]" />
                <span>Pemulihan Layar Ujian Otomatis</span>
              </div>
              <p className="font-medium">
                Dengan menekan tombol konfirmasi di bawah, sinyal buka kunci akan dikirimkan ke seluruh peramban siswa yang terkunci secara serentak. Layar ujian siswa otomatis kembali aktif dalam mode layar penuh (Fullscreen) tanpa perlu dibuka satu per satu.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t-2 border-[#8BC829]/40">
              <button
                type="button"
                disabled={isUnlockingAll}
                onClick={() => setIsUnlockAllModalOpen(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-black text-[#102919] bg-[#E2F4B4] hover:bg-[#d6f0a3] border-2 border-[#8BC829] transition disabled:opacity-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isUnlockingAll}
                onClick={handleUnlockAll}
                className="px-5 py-2.5 rounded-xl bg-[#C3E956] hover:bg-[#b8e337] text-[#0A1D11] text-xs font-black transition flex items-center gap-1.5 shadow-sm border-2 border-[#4D7111]/30 disabled:opacity-50 cursor-pointer"
              >
                {isUnlockingAll ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-[#0A1D11]" />
                    <span>Membuka Kunci...</span>
                  </>
                ) : (
                  <>
                    <Unlock className="w-4 h-4 text-[#0A1D11]" />
                    <span>Ya, Buka Kunci {lockedCount} Siswa</span>
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
