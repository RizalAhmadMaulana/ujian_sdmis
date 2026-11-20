import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExamStore } from '../../store/useExamStore';
import { useExamSecurity } from '../../hooks/useExamSecurity';
import { useProctorSocket } from '../../hooks/useProctorSocket';
import { playExitSuccessAlarm } from '../../utils/soundEffects';
import logoSdMis from '../../assets/logo sd mis.png';
import { submitExamAnswersApi, finishExamAttemptApi, cancelExamAttemptApi } from '../../api/examApi';
import { proctoringApi } from '../../api/proctoringApi';
import { resolveImageUrl, handleImageErrorFallback } from '../../utils/imageUrlFormatter';
import Modal from '../../components/common/Modal';
import MathText from '../../components/common/MathText';
import NetworkSignalIndicator from '../../components/common/NetworkSignalIndicator';
import { isValidSupervisorPin, getSessionTokens, generateDynamicToken } from '../../utils/tokenGenerator';
import { enableAntiScreenshot, disableAntiScreenshot } from '../../utils/nativeMobileLock';
import { 
  ShieldAlert, 
  Lock, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw, 
  Smartphone, 
  Monitor, 
  Maximize2, 
  Unlock, 
  Check, 
  HelpCircle,
  Pin,
  CameraOff,
  LogOut,
  CheckSquare,
  Grid,
  GitCompare,
  ListOrdered,
  Save,
  Megaphone,
  Trophy,
  Award,
  Sparkles,
  ChevronRight,
  Ban,
  XCircle,
  AlertCircle
} from 'lucide-react';

export default function ExamWorkspace() {
  const navigate = useNavigate();
  const { 
    activeAttempt, 
    triggerViolationLock, 
    verifyExitPassword, 
    setStudentAnswer, 
    decrementTimer,
    currentUser,
    unlockStudent,
    examSessions
  } = useExamStore();

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [doubtQuestions, setDoubtQuestions] = useState({}); // { [qId]: boolean }
  const [showExitConfirmModal, setShowExitConfirmModal] = useState(false);
  const [showCancelConfirmModal, setShowCancelConfirmModal] = useState(false);
  const [showScoreResultModal, setShowScoreResultModal] = useState(false);
  const [studentFinalScoreData, setStudentFinalScoreData] = useState(null);
  const [isSubmittingExam, setIsSubmittingExam] = useState(false);
  const [isCancellingExam, setIsCancellingExam] = useState(false);
  const [iframeKey, setIframeKey] = useState(1);
  const [screenshotToast, setScreenshotToast] = useState('');
  const [unlockSuccessToast, setUnlockSuccessToast] = useState('');
  const [supervisorUnlockPin, setSupervisorUnlockPin] = useState('');
  const [unlockError, setUnlockError] = useState('');
  const [activeAnnouncement, setActiveAnnouncement] = useState(null); // { message, urgency, senderName, timestamp }
  const [isFullscreenActive, setIsFullscreenActive] = useState(true);

  // Aktifkan FLAG_SECURE Anti-Screenshot jika berjalan pada wrapper native Android
  useEffect(() => {
    enableAntiScreenshot();
    return () => {
      disableAntiScreenshot();
    };
  }, []);

  // Formatter Jenis Pelanggaran Human-Readable
  const formatViolationType = (type) => {
    const map = {
      'SCREENSHOT_GESTURE': 'Tangkapan Layar Gesture Multi-Jari (Swap Layar HP)',
      'SCREENSHOT_3FINGER_GESTURE': 'Tangkapan Layar Gesture 3 Jari (HP)',
      'SCREENSHOT_HARDWARE_BUTTON': 'Tombol Fisik Screenshot HP (Volume/Power)',
      'SCREENSHOT_KEY_ATTEMPT': 'Tangkapan Layar Keyboard (PrintScreen / Snipping Tool)',
      'SCREEN_RECORDING_ATTEMPT': 'Perekaman Layar Terdeteksi (Screen Recording / Capture)',
      'NOTIFICATION_BAR_PULLDOWN': 'Menarik Bilah Notifikasi / Menu Rekam Layar HP',
      'VOICE_ASSISTANT_ATTEMPT': 'Asisten Suara AI (Gemini Live / Google Assistant)',
      'VOICE_SPEAKING_ATTEMPT': 'Membaca Soal / Bersuara (Voice AI)',
      'COPY_ATTEMPT': 'Menyalin Teks / Soal (Ctrl+C)',
      'PASTE_ATTEMPT': 'Menempelkan Teks (Ctrl+V)',
      'CUT_ATTEMPT': 'Memotong Teks (Ctrl+X)',
      'SELECT_ALL_ATTEMPT': 'Pilih Semua Teks (Ctrl+A)',
      'CONTEXT_MENU_ATTEMPT': 'Klik Kanan (Context Menu)',
      'DEVTOOLS_ATTEMPT': 'Inspect Element / Developer Tools',
      'PRINT_ATTEMPT': 'Mencetak Lembar Soal (Ctrl+P)',
      'VIEW_SOURCE_ATTEMPT': 'Melihat Kode Sumber (Ctrl+U)',
      'SAVE_PAGE_ATTEMPT': 'Menyimpan Halaman (Ctrl+S)',
      'TEXT_SELECTION_ATTEMPT': 'Menyeret / Seleksi Teks',
      'TAB_SWITCH': 'Pindah Tab / Minimize Browser',
      'APP_SWITCH': 'Beralih ke Aplikasi Lain (Alt+Tab / Taskbar)',
      'EXIT_FULLSCREEN': 'Keluar Mode Layar Penuh (ESC)',
      'FLOATING_WINDOW_ATTEMPT': 'Asisten Mengambang (Gemini Live / Floating Window)',
      'SPLIT_SCREEN_ATTEMPT': 'Mode Layar Belah HP (Split Screen)',
    };
    return map[type] || type || 'Pelanggaran Keamanan';
  };

  // Helper pemeriksa apakah butir soal sudah dijawab siswa
  const isQuestionAnswered = (ans) => {
    if (ans === undefined || ans === null || ans === '') return false;
    if (Array.isArray(ans)) return ans.length > 0;
    if (typeof ans === 'object') {
      const values = Object.values(ans);
      return values.length > 0 && values.some((v) => v !== undefined && v !== null && v !== '');
    }
    return true;
  };

  // Deteksi perangkat iOS (iPhone / iPad) yang tidak mendukung Fullscreen DOM API
  const isIOS = (() => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent || '';
    const platform = navigator.platform || '';
    const isDirectIOS = /iPad|iPhone|iPod/i.test(ua);
    const isMacTouch = (platform === 'MacIntel' || /Macintosh/i.test(ua)) && navigator.maxTouchPoints > 1;
    const isAppleVendorTouch = (navigator.vendor && navigator.vendor.includes('Apple')) && 
      ('ontouchstart' in window || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0));
    const isAppleStandalone = 'standalone' in navigator;
    return Boolean(isDirectIOS || isMacTouch || isAppleVendorTouch || isAppleStandalone);
  })();

  const selectedPackage = activeAttempt.selectedPackage || 
    (useExamStore.getState().examPackages || []).find((p) => p.id === activeAttempt.packageId) || 
    useExamStore.getState().examPackages?.[0];

  const studentDisplayName = currentUser?.fullName || currentUser?.full_name || 'PESERTA UJIAN';
  const studentNisn = currentUser?.nisn || currentUser?.username || '-';
  const studentClassroom = currentUser?.classroom_name || (typeof currentUser?.classroom === 'object' ? currentUser?.classroom?.name : currentUser?.classroom) || 'KELAS';

  // 0. Enforce Orientasi Layar (PORTRAIT / LANDSCAPE) saat komponen dimuat
  useEffect(() => {
    const enforceOrientation = () => {
      const savedOrientation = activeAttempt.screenOrientation || localStorage.getItem('exam_screen_orientation') || 'PORTRAIT';
      if (window.screen && window.screen.orientation && window.screen.orientation.lock) {
        try {
          if (savedOrientation === 'PORTRAIT') {
            window.screen.orientation.lock('portrait-primary').catch(() => window.screen.orientation.lock('portrait').catch(() => {}));
          } else if (savedOrientation === 'LANDSCAPE') {
            window.screen.orientation.lock('landscape-primary').catch(() => window.screen.orientation.lock('landscape').catch(() => {}));
          }
        } catch (err) {
          console.warn('Gagal kunci orientasi workspace:', err);
        }
      }
    };
    enforceOrientation();
    window.addEventListener('resize', enforceOrientation);
    return () => window.removeEventListener('resize', enforceOrientation);
  }, [activeAttempt.screenOrientation]);

  // Pastikan style filter/blur selalu bersih agar layar siswa tidak pernah blank hitam
  useEffect(() => {
    try {
      document.documentElement.style.filter = '';
      document.documentElement.style.backdropFilter = '';
      document.body.style.filter = '';
      document.body.style.backgroundColor = '';
    } catch (_) {}
  }, [activeAttempt.isLocked]);

  // Jika workspace dimuat ulang (misal tab di-restore peramban Android) dan state kosong,
  // pulihkan activeAttempt dari localStorage
  useEffect(() => {
    if (!activeAttempt.selectedPackage && !activeAttempt.sessionId) {
      try {
        const saved = localStorage.getItem('exam_active_attempt');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && (parsed.selectedPackage || parsed.sessionId)) {
            useExamStore.setState({ activeAttempt: { ...useExamStore.getState().activeAttempt, ...parsed } });
            return;
          }
        }
      } catch (_) {}

      // Jika benar-benar tidak ada sesi aktif, arahkan kembali dengan aman ke portal mata pelajaran
      const fallbackTimer = setTimeout(() => {
        const currentAttempt = useExamStore.getState().activeAttempt;
        if (!currentAttempt.selectedPackage && !currentAttempt.sessionId) {
          navigate('/student/subjects');
        }
      }, 2500);
      return () => clearTimeout(fallbackTimer);
    }
  }, [activeAttempt.selectedPackage, activeAttempt.sessionId, navigate]);

  // Sinkronisasi status attempt dari server saat workspace pulih
  useEffect(() => {
    if (activeAttempt.attemptId) {
      proctoringApi.getAttemptStatus(activeAttempt.attemptId).then((res) => {
        if (res && res.status === 'LOCKED_VIOLATION' && !activeAttempt.isLocked) {
          triggerViolationLock('APP_SWITCH', 'Layar ujian terkunci akibat terdeteksi beralih aplikasi.');
        } else if (res && res.status === 'WORKING' && activeAttempt.isLocked) {
          unlockStudent(currentUser?.id || 's-001');
        }
        if (res && typeof res.violation_count === 'number') {
          useExamStore.setState((state) => {
            if (state.activeAttempt.violationCount !== res.violation_count) {
              const updated = {
                ...state.activeAttempt,
                violationCount: res.violation_count,
              };
              try {
                localStorage.setItem('exam_active_attempt', JSON.stringify(updated));
              } catch (_) {}
              return { activeAttempt: updated };
            }
            return state;
          });
        }
      }).catch(() => {});
    }
  }, [activeAttempt.attemptId]);

  // Pantau status fullscreen aktif secara real-time
  useEffect(() => {
    const updateFullscreenState = () => {
      // Pada perangkat iOS (iPhone / iPad), Fullscreen DOM API tidak didukung Apple.
      // Selalu anggap fullscreen aktif pada iOS agar tidak memicu overlay atau false-lock.
      if (isIOS) {
        setIsFullscreenActive(true);
        return;
      }
      const isFull = Boolean(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
      );
      setIsFullscreenActive(isFull);
    };

    updateFullscreenState();
    document.addEventListener('fullscreenchange', updateFullscreenState);
    document.addEventListener('webkitfullscreenchange', updateFullscreenState);
    document.addEventListener('mozfullscreenchange', updateFullscreenState);
    document.addEventListener('MSFullscreenChange', updateFullscreenState);

    return () => {
      document.removeEventListener('fullscreenchange', updateFullscreenState);
      document.removeEventListener('webkitfullscreenchange', updateFullscreenState);
      document.removeEventListener('mozfullscreenchange', updateFullscreenState);
      document.removeEventListener('MSFullscreenChange', updateFullscreenState);
    };
  }, [isIOS]);

  // Masuk Kembali ke Mode Fullscreen & Kunci Orientasi secara Handal
  const handleReEnterFullscreen = async () => {
    if (isIOS) return; // iOS Safari tidak mendukung DOM Fullscreen pada documentElement
    try {
      if (document.activeElement && typeof document.activeElement.blur === 'function') {
        document.activeElement.blur();
      }

      const docEl = document.documentElement;
      if (docEl.requestFullscreen) {
        await docEl.requestFullscreen({ navigationUI: 'hide' });
      } else if (docEl.webkitRequestFullscreen) {
        await docEl.webkitRequestFullscreen();
      } else if (docEl.mozRequestFullScreen) {
        await docEl.mozRequestFullScreen();
      } else if (docEl.msRequestFullscreen) {
        await docEl.msRequestFullscreen();
      }
    } catch (err) {
      console.warn('Gagal request fullscreen:', err);
    }

    try {
      const savedOrientation = activeAttempt.screenOrientation || localStorage.getItem('exam_screen_orientation') || 'PORTRAIT';
      if (window.screen && window.screen.orientation && window.screen.orientation.lock) {
        if (savedOrientation === 'PORTRAIT') {
          window.screen.orientation.lock('portrait-primary').catch(() => window.screen.orientation.lock('portrait').catch(() => {}));
        } else if (savedOrientation === 'LANDSCAPE') {
          window.screen.orientation.lock('landscape-primary').catch(() => window.screen.orientation.lock('landscape').catch(() => {}));
        }
      }
    } catch (_) {}
  };

  // 1. WebSocket Proctoring untuk Siswa
  const handleRemoteUnlocked = useCallback((payload) => {
    if (!activeAttempt.attemptId || payload.attempt_id === activeAttempt.attemptId) {
      unlockStudent(currentUser?.id || 's-001');
      handleReEnterFullscreen().catch(() => {});
      setUnlockSuccessToast('Layar berhasil dibuka kembali oleh Guru Pengawas! Silakan lanjutkan pengerjaan soal.');
      setTimeout(() => setUnlockSuccessToast(''), 5000);
    }
  }, [activeAttempt.attemptId, currentUser, unlockStudent]);

  const handleRemoteDisqualified = useCallback((payload) => {
    if (!activeAttempt.attemptId || payload.attempt_id === activeAttempt.attemptId) {
      alert('Perhatian: Anda telah didiskualifikasi dari sesi ujian ini oleh Guru Pengawas.');
      navigate('/student/lobby');
    }
  }, [activeAttempt.attemptId, navigate]);

  const handleReceiveAnnouncement = useCallback((payload) => {
    setActiveAnnouncement({
      message: payload.message,
      urgency: payload.urgency || 'INFO',
      senderName: payload.sender_name || 'Guru Pengawas',
      timestamp: payload.timestamp ? new Date(payload.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    });
  }, []);

  const { isConnected: isWsConnected, sendViolationReport } = useProctorSocket(
    activeAttempt.sessionId,
    {
      onStudentUnlocked: handleRemoteUnlocked,
      onAllStudentsUnlocked: handleRemoteUnlocked,
      onStudentDisqualified: handleRemoteDisqualified,
      onAnnouncement: handleReceiveAnnouncement
    }
  );

  const isExamSubmittedRef = useRef(false);

  // Handler saat sensor useExamSecurity mendeteksi pelanggaran
  const handleSecurityViolation = useCallback((type, description) => {
    if (isExamSubmittedRef.current || isSubmittingExam || showScoreResultModal) {
      return;
    }
    if (activeAttempt.attemptId && !activeAttempt.isLocked) {
      sendViolationReport(activeAttempt.attemptId, type, description);
      proctoringApi.reportViolation(activeAttempt.attemptId, type, description).catch(() => {});
    }
  }, [activeAttempt.attemptId, activeAttempt.isLocked, sendViolationReport, isSubmittingExam, showScoreResultModal]);

  // Sambungkan Sensor Keamanan Zero-Tolerance Lockdown
  useExamSecurity({
    isExamActive: !activeAttempt.examSubmittedAt,
    onViolationDetected: handleSecurityViolation,
    onScreenshotBlocked: (msg) => {
      setScreenshotToast(msg);
      setTimeout(() => setScreenshotToast(''), 3000);
    },
  });

  // Fallback Polling: jika Guru membuka kunci melalui menu Live Proctoring (REST API)
  useEffect(() => {
    if (!activeAttempt.isLocked || !activeAttempt.attemptId) return;

    const pollInterval = setInterval(async () => {
      try {
        const res = await proctoringApi.getAttemptStatus(activeAttempt.attemptId);
        if (res && res.status === 'WORKING') {
          unlockStudent(currentUser?.id || 's-001');
          handleReEnterFullscreen().catch(() => {});
          setUnlockSuccessToast('Layar berhasil dibuka kembali oleh Guru Pengawas! Silakan lanjutkan pengerjaan soal.');
          setTimeout(() => setUnlockSuccessToast(''), 5000);
        }
      } catch (err) {
        // Fallback hening jika endpoint belum aktif/offline
      }
    }, 2500);

    return () => clearInterval(pollInterval);
  }, [activeAttempt.isLocked, activeAttempt.attemptId, currentUser, unlockStudent]);

  // -------------------------------------------------------------
  // DUAL-LAYER AUTO-SAVE (LOCALSTORAGE MIRRORING + DEBOUNCED API)
  // -------------------------------------------------------------
  // Layer 1: Instant Local Mirroring
  useEffect(() => {
    const mirrorKey = `exam_mirror_${activeAttempt.attemptId || activeAttempt.sessionId || 'current'}`;
    if (activeAttempt.studentAnswers && Object.keys(activeAttempt.studentAnswers).length > 0) {
      localStorage.setItem(mirrorKey, JSON.stringify(activeAttempt.studentAnswers));
    }
  }, [activeAttempt.studentAnswers, activeAttempt.attemptId, activeAttempt.sessionId]);

  // Restore dari LocalStorage jika browser ter-refresh / restart
  useEffect(() => {
    const mirrorKey = `exam_mirror_${activeAttempt.attemptId || activeAttempt.sessionId || 'current'}`;
    const cached = localStorage.getItem(mirrorKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed && typeof parsed === 'object') {
          Object.entries(parsed).forEach(([qId, ans]) => {
            if (activeAttempt.studentAnswers[qId] === undefined) {
              setStudentAnswer(qId, ans);
            }
          });
        }
      } catch (err) {
        console.warn('Gagal membaca mirror localStorage:', err);
      }
    }
  }, [activeAttempt.attemptId, activeAttempt.sessionId]);

  // Layer 2: Debounced Server Sync (1500ms)
  const syncTimeoutRef = useRef(null);
  useEffect(() => {
    if (!activeAttempt.sessionId || !activeAttempt.studentAnswers || Object.keys(activeAttempt.studentAnswers).length === 0) return;
    if (selectedPackage?.examType !== 'NATIVE_QUESTIONS') return;

    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = setTimeout(async () => {
      try {
        await submitExamAnswersApi(activeAttempt.sessionId, activeAttempt.studentAnswers);
      } catch (err) {
        // Fallback hening: Jawaban tetap 100% aman tersimpan di Layer 1 LocalStorage
      }
    }, 1500);

    return () => {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
  }, [activeAttempt.studentAnswers, activeAttempt.sessionId, selectedPackage?.examType]);

  // Countdown Timer Interval
  useEffect(() => {
    const timer = setInterval(() => {
      decrementTimer();
    }, 1000);
    return () => clearInterval(timer);
  }, [decrementTimer]);

  // Format detik ke MM:SS
  const formatTime = (totalSeconds) => {
    if (totalSeconds <= 0) return '00:00';
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Konfirmasi Selesai & Keluar Ujian (Merekam Nilai & Membuka Modal Skor Hasil Ujian)
  const handleFinishAndExitExam = async () => {
    isExamSubmittedRef.current = true;
    setIsSubmittingExam(true);

    let calculatedScore = null;

    try {
      if (activeAttempt.sessionId && activeAttempt.sessionId.length > 10) {
        if (selectedPackage?.examType === 'NATIVE_QUESTIONS') {
          const subRes = await submitExamAnswersApi(activeAttempt.sessionId, activeAttempt.studentAnswers);
          if (subRes && (subRes.calculated_score !== undefined || subRes.total_score !== undefined)) {
            calculatedScore = subRes.calculated_score ?? subRes.total_score;
          }
        }
        const finRes = await finishExamAttemptApi(activeAttempt.sessionId, activeAttempt.studentAnswers);
        if (finRes && finRes.score !== undefined && finRes.score !== null) {
          calculatedScore = finRes.score;
        }
      }
    } catch (err) {
      console.warn('Backend finish attempt error fallback ke local store:', err);
    }

    // 1. Update status di store lokal
    useExamStore.getState().finishExam();

    // 2. Mainkan bunyi notifikasi alarm besar ExamBrowser (~2.5 detik)
    playExitSuccessAlarm();

    // 3. Lepaskan mode fullscreen
    if (document.exitFullscreen && document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }

    const questions = selectedPackage?.questions || [];
    const maxPoints = questions.reduce((sum, q) => sum + (Number(q.points) || 10), 0) || 100;
    const hasEssay = questions.some((q) => (q.questionType === 'ESSAY' || q.question_type === 'ESSAY'));
    const isPureMultipleChoice = questions.length > 0 && questions.every((q) => (q.questionType === 'MULTIPLE_CHOICE' || q.question_type === 'MULTIPLE_CHOICE'));
    const isForm = selectedPackage?.examType !== 'NATIVE_QUESTIONS';
    const requiresTeacherGrading = hasEssay || !isPureMultipleChoice || isForm;

    // Fallback hitung skor offline/lokal jika backend belum mengembalikan skor numerik
    if (calculatedScore === null && selectedPackage?.examType === 'NATIVE_QUESTIONS') {
      let localScore = 0;
      questions.forEach((q) => {
        const studentAns = activeAttempt.studentAnswers?.[q.id];
        if (q.questionType === 'MULTIPLE_CHOICE' || q.question_type === 'MULTIPLE_CHOICE') {
          const correctOpt = (q.options || []).find((o) => o.isCorrect || o.is_correct);
          const correctVal = correctOpt ? (correctOpt.optionLabel || correctOpt.label) : q.correctOption;
          const correctId = correctOpt?.id;
          if (studentAns !== undefined && studentAns !== null) {
            if (String(studentAns) === String(correctId) || String(studentAns).toUpperCase() === String(correctVal).toUpperCase()) {
              localScore += (Number(q.points) || 10);
            }
          }
        }
      });
      calculatedScore = localScore;
    }

    const userName = currentUser?.fullName || currentUser?.full_name || 'Peserta Ujian';
    const userClass = currentUser?.classroom_name || (typeof currentUser?.classroom === 'object' ? currentUser?.classroom?.name : currentUser?.classroom) || 'Kelas';

    setStudentFinalScoreData({
      score: calculatedScore !== null ? Number(calculatedScore) : (selectedPackage?.examType === 'NATIVE_QUESTIONS' ? 0 : null),
      maxPoints,
      hasEssay,
      isPureMultipleChoice,
      requiresTeacherGrading,
      totalQuestions: questions.length,
      studentName: userName,
      nisn: currentUser?.nisn || currentUser?.username || '-',
      classroom: userClass,
      subjectName: selectedPackage?.subjectName || selectedPackage?.subject_name || 'Mata Pelajaran',
      packageTitle: selectedPackage?.title || 'Asesmen Mandiri',
      finishedAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB',
      isForm
    });

    setShowExitConfirmModal(false);
    setIsSubmittingExam(false);
    setShowScoreResultModal(true);
  };

  const handleAcknowledgeScoreAndExit = () => {
    isExamSubmittedRef.current = true;
    setShowScoreResultModal(false);
    if (activeAttempt.isSimulation) {
      useExamStore.getState().loginAsTeacher();
      navigate('/teacher/dashboard');
    } else {
      navigate('/student/lobby');
    }
  };

  // Konfirmasi Batal & Keluar Ujian (Membatalkan Ujian, Menghapus Seluruh Log Pelanggaran Sesi Ini, & Tanpa Rekap Nilai)
  const handleCancelAndExitExam = async () => {
    isExamSubmittedRef.current = true;
    setIsCancellingExam(true);

    try {
      if (activeAttempt.sessionId && activeAttempt.sessionId.length > 10) {
        await cancelExamAttemptApi(activeAttempt.sessionId, activeAttempt.attemptId);
      }
    } catch (err) {
      console.warn('Backend cancel attempt fallback ke local store:', err);
    }

    // 1. Reset attempt di Zustand store & localStorage
    useExamStore.getState().cancelExam();

    // 2. Lepaskan mode fullscreen
    if (document.exitFullscreen && document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }

    setShowCancelConfirmModal(false);
    setIsCancellingExam(false);

    // 3. Langsung arahkan kembali ke Lobby Siswa tanpa memunculkan modal nilai
    if (activeAttempt.isSimulation) {
      useExamStore.getState().loginAsTeacher();
      navigate('/teacher/dashboard');
    } else {
      navigate('/student/lobby');
    }
  };

  // Buka Kunci Mandiri oleh Siswa menggunakan PIN Pengawas Ruangan
  const handleSupervisorLocalUnlock = async (e) => {
    e.preventDefault();
    setUnlockError('');

    const inputPin = supervisorUnlockPin.trim().toUpperCase().replace(/\s+/g, '');
    const cleanInputPin = inputPin.replace(/^PIN-?/i, '').replace(/-/g, '');

    // Kumpulkan kandidat PIN pengawas yang sah
    const candidatePins = new Set();
    const addCandidate = (val) => {
      if (!val) return;
      const clean = String(val).trim().toUpperCase().replace(/\s+/g, '');
      const noPre = clean.replace(/^PIN-?/i, '').replace(/-/g, '');
      candidatePins.add(clean);
      candidatePins.add(noPre);
    };

    // 0. Dynamic 10-Minute PIN (Slot Saat Ini, Slot Sebelumnya, dan Toleransi Drift +1 Slot)
    const targetSessionId = activeAttempt.sessionId;
    if (targetSessionId) {
      const dyn = getSessionTokens(targetSessionId);
      [-1, 0, 1].forEach(offset => {
        const p = generateDynamicToken(targetSessionId, dyn.slot + offset, 'PIN');
        addCandidate(p);
      });
    }

    // 1. Dari activeAttempt (disimpan saat mulai sesi)
    if (activeAttempt.supervisorPin) {
      addCandidate(activeAttempt.supervisorPin);
    }

    // 2. Dari seluruh daftar sesi yang ada di store/local
    (examSessions || []).forEach(s => {
      if (s.id) {
        const d = getSessionTokens(s.id);
        [-1, 0, 1].forEach(offset => {
          const p = generateDynamicToken(s.id, d.slot + offset, 'PIN');
          addCandidate(p);
        });
      }
      const sPin = s.supervisorPin || s.supervisor_pin;
      if (sPin) {
        addCandidate(sPin);
      }
    });

    // 3. Default universal backup PIN pengawas
    ['GURU123', 'MASUK123', '12345', 'PIN-1234', '1234'].forEach(p => {
      addCandidate(p);
    });

    const isValid = candidatePins.has(inputPin) || candidatePins.has(cleanInputPin);

    if (isValid) {
      // 1. Blur input agar keyboard virtual di HP langsung tertutup
      if (document.activeElement && typeof document.activeElement.blur === 'function') {
        document.activeElement.blur();
      }

      // 2. Buka status lock di store
      unlockStudent(currentUser?.id || 's-001');
      setSupervisorUnlockPin('');
      setUnlockError('');

      // 3. Masuk Fullscreen seketika dalam konteks user-click gesture
      await handleReEnterFullscreen();

      // 4. Tampilkan toast non-blocking
      setUnlockSuccessToast('Layar berhasil dibuka kembali! Selamat mengerjakan.');
      setTimeout(() => setUnlockSuccessToast(''), 5000);

      // 6. Sinkronisasi ke backend secara asynchronous
      if (activeAttempt.attemptId) {
        try {
          await proctoringApi.unlockStudent(activeAttempt.attemptId, supervisorUnlockPin);
        } catch (err) {
          console.warn('Unlock API fallback:', err);
        }
      }
    } else {
      setUnlockError('PIN Pengawas salah atau sudah kedaluwarsa! PIN diperbarui otomatis setiap 10 menit. Silakan periksa PIN terbaru di menu Jadwal & Sesi Ujian.');
    }
  };

  // Toggle Ragu-ragu
  const toggleDoubt = (qId) => {
    setDoubtQuestions((prev) => ({
      ...prev,
      [qId]: !prev[qId],
    }));
  };

  const questions = selectedPackage?.questions || [];
  const currentQuestion = questions[currentQuestionIndex];
  const isLandscape = activeAttempt.screenOrientation === 'LANDSCAPE';

  return (
    <div 
      className={`min-h-screen bg-[#F4FFFC] text-zinc-800 flex flex-col relative select-none overflow-hidden selection:bg-[#C3E956] selection:text-[#0A1D11] exam-secure-workspace antialiased font-sans ${
        isLandscape ? 'orientation-landscape' : 'orientation-portrait'
      }`}
      onTouchStart={(e) => {
        // Jika sedang di layar terkunci, bebas sentuh / screenshot tanpa menambah akumulasi pelanggaran
        if (activeAttempt.isLocked) return;
        const count = Math.max(e.touches?.length || 0, e.targetTouches?.length || 0, e.changedTouches?.length || 0);
        if (count >= 2) {
          if (e.cancelable) e.preventDefault();
          e.stopPropagation();
          setScreenshotToast(`Tangkapan layar ${count} jari diblokir! Layar ujian Anda dibekukan.`);
          setTimeout(() => setScreenshotToast(''), 3000);
          handleSecurityViolation('SCREENSHOT_3FINGER_GESTURE', `Siswa terdeteksi mencoba tangkapan layar (Screenshot) menggunakan gesture ${count} jari di HP`);
          triggerViolationLock('SCREENSHOT_3FINGER_GESTURE', `Siswa terdeteksi mencoba tangkapan layar (Screenshot) menggunakan gesture ${count} jari di HP`);
        }
      }}
      onTouchMove={(e) => {
        // Jika sedang di layar terkunci, bebas sentuh / screenshot tanpa menambah akumulasi pelanggaran
        if (activeAttempt.isLocked) return;
        const count = Math.max(e.touches?.length || 0, e.targetTouches?.length || 0, e.changedTouches?.length || 0);
        if (count >= 2) {
          if (e.cancelable) e.preventDefault();
          e.stopPropagation();
          setScreenshotToast(`Tangkapan layar ${count} jari diblokir! Layar ujian Anda dibekukan.`);
          setTimeout(() => setScreenshotToast(''), 3000);
          handleSecurityViolation('SCREENSHOT_3FINGER_GESTURE', `Siswa terdeteksi mencoba tangkapan layar (Screenshot) menggunakan gesture ${count} jari di HP`);
          triggerViolationLock('SCREENSHOT_3FINGER_GESTURE', `Siswa terdeteksi mencoba tangkapan layar (Screenshot) menggunakan gesture ${count} jari di HP`);
        }
      }}
      onContextMenu={(e) => {
        if (activeAttempt.isLocked) return;
        e.preventDefault();
        e.stopPropagation();
        handleSecurityViolation('CONTEXT_MENU_ATTEMPT', 'Siswa mencoba membuka menu klik kanan (Context Menu) pada lembar ujian');
        triggerViolationLock('CONTEXT_MENU_ATTEMPT', 'Siswa mencoba membuka menu klik kanan (Context Menu) pada lembar ujian');
      }}
    >
      {/* Subtle Architectural Grid Pattern */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }}
      />

      {/* ======================================================== */}
      {/* TOAST ANTI-SCREENSHOT NOTIFICATION */}
      {/* ======================================================== */}
      {screenshotToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 animate-bounce">
          <div className="px-5 py-3 rounded-2xl bg-[#102919] border-2 border-rose-500 text-white flex items-center gap-3 shadow-2xl backdrop-blur-md">
            <CameraOff className="w-5 h-5 text-rose-400" />
            <span className="text-xs font-black text-rose-300">{screenshotToast}</span>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TOAST SUKSES BUKA KUNCI (NON-BLOCKING) */}
      {/* ======================================================== */}
      {unlockSuccessToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 animate-bounce">
          <div className="px-5 py-3 rounded-2xl bg-[#102919] border-2 border-[#C3E956] text-white flex items-center gap-3 shadow-2xl backdrop-blur-md">
            <CheckCircle className="w-5 h-5 text-[#C3E956] shrink-0" />
            <span className="text-xs sm:text-sm font-black text-[#F4FFFC]">{unlockSuccessToast}</span>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 1. TOP SECURITY BAR (KAPSUL HITAM PENGAMAN DI ATAS LAYAR) */}
      {/* ======================================================== */}
      <header 
        className="bg-gradient-to-r from-[#102919] via-[#143820] to-[#1F4B2C] border-b border-[#1F4B2C] px-3 sm:px-6 py-2.5 flex items-center justify-between z-30 sticky top-0 shadow-md gap-2 w-full max-w-full overflow-hidden"
        onTouchStart={(e) => {
          if (activeAttempt.isLocked) return;
          const count = Math.max(e.touches?.length || 0, e.targetTouches?.length || 0, e.changedTouches?.length || 0);
          if (count >= 2) {
            if (e.cancelable) e.preventDefault();
            e.stopPropagation();
            setScreenshotToast(`Tangkapan layar ${count} jari diblokir! Layar ujian Anda dibekukan.`);
            setTimeout(() => setScreenshotToast(''), 3000);
            handleSecurityViolation('SCREENSHOT_3FINGER_GESTURE', `Siswa terdeteksi mencoba tangkapan layar (Screenshot) menggunakan gesture ${count} jari di HP`);
            triggerViolationLock('SCREENSHOT_3FINGER_GESTURE', `Siswa terdeteksi mencoba tangkapan layar (Screenshot) menggunakan gesture ${count} jari di HP`);
          }
        }}
        onTouchMove={(e) => {
          if (activeAttempt.isLocked) return;
          const count = Math.max(e.touches?.length || 0, e.targetTouches?.length || 0, e.changedTouches?.length || 0);
          if (count >= 2) {
            if (e.cancelable) e.preventDefault();
            e.stopPropagation();
            setScreenshotToast(`Tangkapan layar ${count} jari diblokir! Layar ujian Anda dibekukan.`);
            setTimeout(() => setScreenshotToast(''), 3000);
            handleSecurityViolation('SCREENSHOT_3FINGER_GESTURE', `Siswa terdeteksi mencoba tangkapan layar (Screenshot) menggunakan gesture ${count} jari di HP`);
            triggerViolationLock('SCREENSHOT_3FINGER_GESTURE', `Siswa terdeteksi mencoba tangkapan layar (Screenshot) menggunakan gesture ${count} jari di HP`);
          }
        }}
      >
        {/* Status Monitoring & Judul */}
        <div className="flex items-center gap-2 shrink-0 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-white p-1 flex items-center justify-center shadow-md ring-2 ring-[#91EAAF]/40 shrink-0">
            <img 
              src={logoSdMis} 
              alt="Logo SD Mentari Islamic School" 
              className="w-full h-full object-contain"
            />
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/20 border border-rose-400/40 text-rose-300 text-[10px] font-black tracking-wider uppercase shrink-0 whitespace-nowrap shadow-xs">
            <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
            <span>LIVE</span>
            <span className="hidden md:inline font-bold">• Terproteksi</span>
          </div>

          {activeAttempt.isSimulation && (
            <span className="px-2.5 py-1 rounded-full bg-[#C3E956] text-[#0A1D11] text-[10px] font-black uppercase tracking-wider shrink-0 whitespace-nowrap shadow-xs">
              <span className="sm:hidden">Sim</span>
              <span className="hidden sm:inline">Simulasi Guru</span>
            </span>
          )}

          <div className="hidden xl:block">
            <span className="text-xs font-bold text-white truncate max-w-xs block">
              {selectedPackage?.subjectName} — {selectedPackage?.title}
            </span>
          </div>
        </div>

        {/* Countdown Timer, Indikator Sinyal & Action Bar */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 ml-auto">
          {/* Indikator Sinyal Jaringan & Ping Real-Time */}
          <NetworkSignalIndicator
            attemptId={activeAttempt.attemptId}
            onPingRecorded={(ms) => {
              if (activeAttempt.attemptId) {
                proctoringApi.sendHeartbeat(activeAttempt.attemptId, ms).catch(() => {});
              }
            }}
          />

          {/* Tombol Keluar Simulasi (Khusus Mode Simulasi Guru) */}
          {activeAttempt.isSimulation && (
            <button
              onClick={() => {
                if (document.exitFullscreen && document.fullscreenElement) {
                  document.exitFullscreen().catch(() => {});
                }
                useExamStore.getState().loginAsTeacher();
                navigate('/teacher/dashboard');
              }}
              className="flex items-center gap-1 px-2 py-1 rounded-md bg-amber-500 hover:bg-amber-400 text-zinc-950 text-[11px] sm:text-xs font-semibold transition active:scale-[0.98] shrink-0 whitespace-nowrap"
              title="Kembali ke Dashboard Guru"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          )}

          {/* Tombol Refresh Frame */}
          {selectedPackage?.examType === 'EXTERNAL_LINK' && (
            <button
              onClick={() => setIframeKey((prev) => prev + 1)}
              title="Refresh Lembar Soal"
              className="p-1 sm:p-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 text-xs flex items-center gap-1 transition shrink-0 whitespace-nowrap"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden md:inline text-[11px]">Refresh Form</span>
            </button>
          )}

          {/* Tombol Re-Enter Fullscreen jika Layar Penuh Terlepas (Kecuali iOS iPhone yang tidak mendukung Fullscreen API) */}
          {!isFullscreenActive && !isIOS && !activeAttempt.isLocked && (
            <button
              type="button"
              onClick={handleReEnterFullscreen}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#C3E956] hover:bg-[#d4f76b] text-[#0A1D11] text-xs font-black shadow-xs transition active:scale-95 shrink-0 whitespace-nowrap animate-pulse cursor-pointer"
              title="Aktifkan Kembali Mode Layar Penuh"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Layar Penuh</span>
            </button>
          )}

          {/* Countdown Timer */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0A1D11]/90 border border-[#C3E956]/50 font-mono text-xs sm:text-sm font-black text-[#C3E956] tabular-nums shrink-0 whitespace-nowrap shadow-xs">
            <Clock className="w-3.5 h-3.5 text-[#C3E956] shrink-0" />
            <span>{formatTime(activeAttempt.remainingSeconds)}</span>
          </div>

          {/* Tombol Batalkan Ujian */}
          <button
            type="button"
            onClick={() => setShowCancelConfirmModal(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#0A1D11]/80 hover:bg-rose-950/60 text-zinc-300 hover:text-rose-300 border border-[#1F4B2C] text-xs font-bold shadow-xs transition active:scale-95 shrink-0 whitespace-nowrap cursor-pointer"
            title="Batalkan pengerjaan dan keluar tanpa menyelesaikan ujian"
          >
            <Ban className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <span>Batal</span>
          </button>

          {/* Tombol Konfirmasi Selesai & Keluar Ujian */}
          <button
            onClick={() => setShowExitConfirmModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#C3E956] hover:bg-[#d4f76b] text-[#0A1D11] text-xs font-black shadow-sm border border-[#4D7111]/30 transition active:scale-95 shrink-0 whitespace-nowrap cursor-pointer"
            title="Selesaikan pengerjaan dan keluar dari ujian"
          >
            <CheckCircle className="w-4 h-4 shrink-0 text-[#0A1D11]" />
            <span>Selesai</span>
            <span className="hidden md:inline"> Ujian</span>
          </button>
        </div>
      </header>

      {/* ======================================================== */}
      {/* FLOATING ANNOUNCEMENT BANNER DARI GURU PENGAWAS */}
      {/* ======================================================== */}
      {activeAnnouncement && (
        <div className={`border-b px-4 py-3 shadow-md z-40 animate-slideDown transition-all ${
          activeAnnouncement.urgency === 'URGENT'
            ? 'bg-rose-950/90 border-rose-500/40 text-rose-100'
            : activeAnnouncement.urgency === 'WARNING'
            ? 'bg-amber-950/90 border-amber-500/40 text-amber-100'
            : 'bg-zinc-900/95 border-zinc-800 text-zinc-100'
        }`}>
          <div className="max-w-4xl mx-auto flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className={`p-1.5 rounded-md shrink-0 mt-0.5 ${
                activeAnnouncement.urgency === 'URGENT'
                  ? 'bg-rose-600 text-white animate-pulse'
                  : activeAnnouncement.urgency === 'WARNING'
                  ? 'bg-amber-500 text-zinc-950 font-bold'
                  : 'bg-zinc-800 text-zinc-200'
              }`}>
                <Megaphone className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-black/40 border border-white/10">
                    {activeAnnouncement.urgency === 'URGENT' ? '🚨 Ralat Vital' : activeAnnouncement.urgency === 'WARNING' ? '⚠️ Peringatan Pengawas' : '📢 Pengumuman Pengawas'}
                  </span>
                  <span className="text-xs text-zinc-400 font-medium">
                    {activeAnnouncement.senderName} • {activeAnnouncement.timestamp}
                  </span>
                </div>
                <div className="text-xs sm:text-sm font-medium text-zinc-100 mt-1 leading-relaxed">
                  {activeAnnouncement.message}
                </div>
              </div>
            </div>

            <button
              onClick={() => setActiveAnnouncement(null)}
              className="px-2.5 py-1 rounded-md bg-white/10 hover:bg-white/20 active:scale-95 text-white text-xs font-medium transition shrink-0 flex items-center gap-1 border border-white/20"
              title="Tutup Pengumuman"
            >
              <span>Mengerti</span>
              <Check className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. LAYAR PEMBEKUAN MERAH (PENALTY FREEZE OVERLAY) */}
      {/* Di-render langsung in-DOM sebagai fixed overlay z-[99999] */}
      {/* 100% kebal bug GPU compositor & selalu tampil tajam di HP */}
      {/* ======================================================== */}
      {activeAttempt.isLocked && (
        <div 
          className="fixed inset-0 z-[99999] bg-[#0A1D11]/95 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 text-center select-none overflow-y-auto"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            minHeight: '100dvh',
            height: '100%',
            backgroundColor: 'rgba(10, 29, 17, 0.95)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflowY: 'auto'
          }}
        >
          <div className="max-w-md w-full m-auto py-4 flex flex-col items-center space-y-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-rose-600/20 border-2 border-rose-500 flex items-center justify-center text-rose-400 animate-pulse shrink-0 shadow-lg">
              <ShieldAlert className="w-9 h-9 sm:w-11 sm:h-11" />
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase">
              AKSES UJIAN DIBEKUKAN (TERKUNCI)!
            </h2>

            <p className="text-rose-200 text-xs sm:text-sm leading-relaxed font-medium">
              Sistem mendeteksi Anda mencoba keluar dari halaman ujian, berpindah tab, meminimalkan jendela, atau membuka aplikasi lain. 
              <strong className="text-white font-black"> Kejadian ini telah tercatat di E-Jurnal Guru beserta jam dan detiknya.</strong>
            </p>

            {/* Rincian Pelanggaran Terdeteksi */}
            <div className="bg-[#102919] border-2 border-rose-500/50 rounded-2xl p-4 w-full text-xs text-left text-zinc-200 space-y-2 shadow-md">
              <div className="font-black text-rose-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>Log Pelanggaran Sistem Terkini:</span>
              </div>
              <div>• Jenis Pelanggaran: <strong className="font-black text-white bg-rose-950 px-2 py-0.5 rounded-lg border border-rose-500/40">{formatViolationType(activeAttempt?.violationLogs?.[0]?.violationType || activeAttempt?.violationLogs?.[0]?.type || 'APP_SWITCH')}</strong></div>
              <div>• Keterangan Sensor: <em className="text-zinc-300 font-medium">{activeAttempt?.violationLogs?.[0]?.description || 'Pelanggaran keamanan terdeteksi sistem.'}</em></div>
              <div>• Waktu Terdeteksi: <strong className="font-mono font-bold text-white">{activeAttempt?.violationLogs?.[0]?.detectedAt || 'Baru Saja'}</strong></div>
              <div>• Total Akumulasi: <strong className="text-amber-300 font-black">{(Number(activeAttempt?.violationCount) > 0 ? Number(activeAttempt.violationCount) : 1)} kali pelanggaran</strong></div>
            </div>

            {/* Form Pembukaan Kunci Pengawas */}
            <div className="w-full bg-[#102919] border-2 border-[#1F4B2C] p-4 sm:p-5 rounded-2xl space-y-3 shadow-md">
              <div className="text-xs text-[#91EAAF] font-semibold">
                Minta Guru Pengawas untuk membuka kunci melalui menu Live Proctoring, atau masukkan PIN Pengawas di bawah ini:
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  onFocus={(e) => e.target.removeAttribute('readonly')}
                  autoComplete="one-time-code"
                  autoCorrect="off"
                  autoCapitalize="characters"
                  spellCheck="false"
                  role="presentation"
                  data-lpignore="true"
                  data-form-type="other"
                  value={supervisorUnlockPin}
                  onChange={(e) => setSupervisorUnlockPin(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSupervisorLocalUnlock(e);
                    }
                  }}
                  placeholder="PIN Pengawas Ruangan"
                  style={{
                    WebkitTextSecurity: 'disc',
                    textSecurity: 'disc'
                  }}
                  className="flex-1 px-4 py-2.5 bg-[#0A1D11] border-2 border-[#91EAAF]/60 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-[#C3E956] font-mono font-bold text-center uppercase tracking-widest"
                />
                <button
                  type="button"
                  onClick={handleSupervisorLocalUnlock}
                  className="px-4 py-2.5 bg-[#C3E956] hover:bg-[#d4f76b] text-[#0A1D11] rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-md shrink-0 active:scale-95 cursor-pointer"
                >
                  <Unlock className="w-4 h-4 text-[#0A1D11]" /> Buka Kunci
                </button>
              </div>
              {unlockError && <div className="text-xs text-rose-300 font-bold">{unlockError}</div>}
            </div>

            <button
              onClick={handleReEnterFullscreen}
              className="px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 transition flex items-center gap-2 active:scale-95 cursor-pointer shadow-xs"
            >
              <Maximize2 className="w-4 h-4" /> Masuk Kembali ke Fullscreen
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2B. 1-TAP FULLSCREEN ENFORCEMENT OVERLAY */}
      {/* ======================================================== */}
      {!isFullscreenActive && !isIOS && !activeAttempt.isLocked && !activeAttempt.examSubmittedAt && (
        <div 
          onClick={handleReEnterFullscreen}
          className="fixed inset-0 z-[99990] bg-[#0A1D11]/95 backdrop-blur-md flex items-center justify-center p-4 text-center cursor-pointer select-none"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            minHeight: '100dvh',
            height: '100%',
            backgroundColor: 'rgba(10, 29, 17, 0.95)',
            zIndex: 99990,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <div className="max-w-sm w-full p-6 sm:p-8 rounded-3xl bg-white border-2 border-[#91EAAF] shadow-2xl flex flex-col items-center space-y-4 m-auto">
            <div className="w-16 h-16 rounded-2xl bg-[#E1F8ED] border-2 border-[#91EAAF] flex items-center justify-center text-[#1F4B2C] animate-pulse shadow-sm">
              <Maximize2 className="w-8 h-8 text-[#1F4B2C]" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-black text-[#102919] tracking-tight">
                Mode Layar Penuh Ujian
              </h3>
              <p className="text-zinc-600 text-xs leading-relaxed font-medium">
                Sistem mewajibkan mode layar penuh (Fullscreen) untuk mencegah kecurangan. Ketuk tombol di bawah untuk mengaktifkan layar penuh secara otomatis.
              </p>
            </div>

            <button
              type="button"
              onClick={handleReEnterFullscreen}
              className="w-full py-3.5 px-5 rounded-2xl bg-[#C3E956] hover:bg-[#d4f76b] text-[#0A1D11] font-black text-xs uppercase tracking-wider shadow-md transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer border border-[#4D7111]/30"
            >
              <Maximize2 className="w-4 h-4 text-[#0A1D11]" />
              <span>Aktifkan Layar Penuh (1-Ketuk)</span>
            </button>

            <span className="text-[11px] text-zinc-500 font-semibold">
              Ketuk di mana saja pada layar ini untuk melanjutkan
            </span>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. AREA PENGERJAAN SOAL (HYBRID RENDERER) */}
      {/* Disembunyikan seketika saat terkunci agar bebas intip & tidak direkam */}
      {/* ======================================================== */}
      <main 
        className="flex-1 flex flex-col overflow-hidden relative"
        style={{
          display: activeAttempt.isLocked ? 'none' : 'flex',
          visibility: activeAttempt.isLocked ? 'hidden' : 'visible',
          pointerEvents: activeAttempt.isLocked ? 'none' : 'auto'
        }}
      >
        {selectedPackage?.examType === 'EXTERNAL_LINK' ? (
          /* ========================================== */
          /* MODE IFRAME SECURE: GOOGLE FORM / MS TEAMS */
          /* ========================================== */
          <div 
            className="flex-1 w-full h-full relative bg-white select-none flex flex-col"
            style={{
              WebkitUserSelect: 'none',
              userSelect: 'none',
              WebkitTouchCallout: 'none'
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              handleSecurityViolation('CONTEXT_MENU_ATTEMPT', 'Siswa mencoba membuka menu klik kanan (Context Menu) pada lembar ujian');
              triggerViolationLock('CONTEXT_MENU_ATTEMPT', 'Siswa mencoba membuka menu klik kanan (Context Menu) pada lembar ujian');
            }}
            onCopy={(e) => {
              e.preventDefault();
              triggerViolationLock('COPY_ATTEMPT', 'Siswa terdeteksi mencoba menyalin konten lembar ujian');
            }}
            onCut={(e) => {
              e.preventDefault();
              triggerViolationLock('CUT_ATTEMPT', 'Siswa terdeteksi mencoba memotong konten lembar ujian');
            }}
          >
            {/* Security Notice Bar for External Forms */}
            <div 
              className="bg-amber-50 border-b-2 border-amber-300 px-4 py-2 flex items-center justify-between text-xs text-amber-950 shrink-0 z-10 shadow-xs"
            >
              <div className="flex items-center gap-2 truncate">
                <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
                <span className="font-black text-amber-950">Protokol Keamanan Lembar Eksternal:</span>
                <span className="text-amber-900 truncate">Dilarang memicu pintasan peramban atau berpindah tab. Layar akan langsung terkunci seketika.</span>
              </div>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-500 text-white font-mono font-bold shrink-0 ml-2">
                Zero-Tolerance ON
              </span>
            </div>

            <div className="flex-1 w-full relative">
              <iframe
                key={iframeKey}
                src={selectedPackage.externalUrl}
                title="Lembar Ujian Eksternal Google Form"
                className="w-full h-full border-0 absolute inset-0 select-none"
                style={{
                  WebkitUserSelect: 'none',
                  userSelect: 'none',
                  WebkitTouchCallout: 'none'
                }}
                allow="fullscreen"
              />
            </div>
          </div>
        ) : (
          /* ========================================== */
          /* MODE SOAL MANDIRI (NATIVE QUESTIONS)       */
          /* ========================================== */
          <div className="flex-1 max-w-6xl w-full mx-auto p-3 sm:p-6 flex flex-col md:flex-row gap-5 overflow-y-auto z-10 select-none">
            {/* Panel Kiri: Lembar Soal Aktif */}
            <div className="flex-1 bg-white border-2 border-[#91EAAF]/60 rounded-3xl p-5 sm:p-7 flex flex-col justify-between space-y-6 shadow-sm">
              {currentQuestion ? (
                <div className="space-y-5">
                  {/* Nomor Soal & Badge */}
                  <div className="flex items-center justify-between border-b-2 border-[#91EAAF]/40 pb-4 flex-wrap gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-black font-mono px-3.5 py-1.5 rounded-xl bg-[#102919] text-[#C3E956] shadow-xs">
                        Soal Nomor {currentQuestionIndex + 1}
                      </span>
                      <span className="text-xs font-bold text-[#1F4B2C] bg-[#E1F8ED] border border-[#91EAAF] px-3 py-1.5 rounded-xl">
                        Bobot: {currentQuestion.points} Poin
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Tombol Ragu-ragu */}
                      <button
                        type="button"
                        onClick={() => toggleDoubt(currentQuestion.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 ${
                          doubtQuestions[currentQuestion.id]
                            ? 'bg-amber-400 text-[#0A1D11] border-2 border-amber-500'
                            : 'bg-white text-zinc-600 hover:text-amber-800 border-2 border-[#91EAAF]/60 hover:border-amber-400 font-bold'
                        }`}
                      >
                        <HelpCircle className="w-4 h-4" />
                        <span>Ragu-ragu</span>
                      </button>

                      <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-[#E1F8ED] text-[#1F4B2C] border border-[#91EAAF]">
                        {({
                          MULTIPLE_CHOICE: 'Pilihan Ganda',
                          MULTIPLE_CHOICE_COMPLEX: 'Pilihan Ganda Kompleks',
                          SHORT_ANSWER: 'Isian Singkat',
                          TRUE_FALSE_MATRIX: 'Benar / Salah',
                          MATCHING_PAIR: 'Menjodohkan',
                          ESSAY: 'Uraian / Esai',
                        })[currentQuestion.questionType || currentQuestion.question_type] || 'Soal Ujian'}
                      </span>
                    </div>
                  </div>

                  {/* Teks Pertanyaan Soal (Dukungan Tipografi Rumus Matematika KaTeX) */}
                  <div className="text-sm sm:text-base text-zinc-900 font-bold leading-relaxed select-none">
                    <MathText text={currentQuestion.questionText || currentQuestion.question_text || ''} />
                  </div>

                  {/* Gambar Pertanyaan Soal (Jika Ada) */}
                  {(currentQuestion.imageUrl || currentQuestion.image_url) && (
                    <div className="my-3 rounded-2xl overflow-hidden border-2 border-[#91EAAF]/60 max-w-xl bg-white p-2 shadow-sm">
                      <img
                        src={resolveImageUrl(currentQuestion.imageUrl || currentQuestion.image_url)}
                        alt="Gambar Pertanyaan Soal"
                        className="w-full max-h-80 object-contain rounded-xl bg-white mx-auto"
                        onError={handleImageErrorFallback}
                      />
                    </div>
                  )}

                  {/* ======================================================== */}
                  {/* RAGAM INTERAKTIF TIPE SOAL (STANDAR AKM & ANBK)           */}
                  {/* ======================================================== */}

                  {/* 1. PILIHAN GANDA BIASA (1 Jawaban Benar) */}
                  {(currentQuestion.questionType === 'MULTIPLE_CHOICE' || currentQuestion.question_type === 'MULTIPLE_CHOICE') && (
                    <div className="space-y-3 pt-1">
                      {(currentQuestion.options || []).map((opt) => {
                        const optLabel = opt.label || opt.option_label;
                        const optText = opt.text || opt.option_text;
                        const optImg = opt.imageUrl || opt.image_url;
                        const isSelected = activeAttempt.studentAnswers[currentQuestion.id] === optLabel;
                        return (
                          <button
                            key={optLabel}
                            type="button"
                            onClick={() => setStudentAnswer(currentQuestion.id, optLabel)}
                            className={`w-full p-4 rounded-2xl border-2 text-left text-xs sm:text-sm font-semibold transition flex flex-col sm:flex-row sm:items-center gap-3.5 cursor-pointer active:scale-[0.99] ${
                              isSelected
                                ? 'bg-[#E1F8ED] border-2 border-[#1F4B2C] text-[#102919] shadow-xs ring-2 ring-[#C3E956]/50 font-bold'
                                : 'bg-[#F4FFFC] border-2 border-[#91EAAF]/60 text-zinc-800 hover:bg-white hover:border-[#1F4B2C]'
                            }`}
                          >
                            <div className="flex items-center gap-3.5 flex-1 min-w-0">
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs shrink-0 transition ${
                                isSelected ? 'bg-[#102919] text-[#C3E956] font-black shadow-xs' : 'bg-white border-2 border-[#91EAAF] text-[#1F4B2C] font-black'
                              }`}>
                                {optLabel}
                              </div>
                              <div className="leading-relaxed flex-1">
                                <MathText text={optText} />
                              </div>
                            </div>

                            {optImg && (
                              <div className="sm:ml-auto rounded-xl overflow-hidden border border-zinc-300 max-h-32 bg-white p-1 shrink-0 shadow-xs">
                                <img
                                  src={resolveImageUrl(optImg)}
                                  alt={`Gambar Opsi ${optLabel}`}
                                  className="h-24 sm:h-28 object-contain rounded bg-white"
                                  onError={handleImageErrorFallback}
                                />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* 2. PILIHAN GANDA KOMPLEKS (Multi-Centang Checkbox) */}
                  {(currentQuestion.questionType === 'MULTIPLE_CHOICE_COMPLEX' || currentQuestion.question_type === 'MULTIPLE_CHOICE_COMPLEX') && (
                    <div className="space-y-3 pt-1">
                      <div className="text-xs text-[#1F4B2C] font-bold flex items-center gap-2 pb-0.5">
                        <CheckSquare className="w-4 h-4 text-[#1F4B2C]" />
                        <span>Pilihlah satu atau lebih jawaban yang menurut Anda benar:</span>
                      </div>
                      {(currentQuestion.options || []).map((opt) => {
                        const optLabel = opt.label || opt.option_label;
                        const optText = opt.text || opt.option_text;
                        const optImg = opt.imageUrl || opt.image_url;
                        const rawAns = activeAttempt.studentAnswers[currentQuestion.id];
                        const selectedList = Array.isArray(rawAns) ? rawAns : (typeof rawAns === 'string' ? rawAns.split(',') : []);
                        const isChecked = selectedList.includes(optLabel);

                        const handleToggle = () => {
                          let next;
                          if (isChecked) {
                            next = selectedList.filter(x => x !== optLabel);
                          } else {
                            next = [...selectedList, optLabel];
                          }
                          setStudentAnswer(currentQuestion.id, next);
                        };

                        return (
                          <button
                            key={optLabel}
                            type="button"
                            onClick={handleToggle}
                            className={`w-full p-4 rounded-2xl border-2 text-left text-xs sm:text-sm font-semibold transition flex flex-col sm:flex-row sm:items-center gap-3.5 cursor-pointer active:scale-[0.99] ${
                              isChecked
                                ? 'bg-[#E1F8ED] border-2 border-[#1F4B2C] text-[#102919] shadow-xs ring-2 ring-[#C3E956]/50 font-bold'
                                : 'bg-[#F4FFFC] border-2 border-[#91EAAF]/60 text-zinc-800 hover:bg-white hover:border-[#1F4B2C]'
                            }`}
                          >
                            <div className="flex items-center gap-3.5 flex-1 min-w-0">
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs shrink-0 transition ${
                                isChecked ? 'bg-[#102919] text-[#C3E956] font-black shadow-xs' : 'bg-white border-2 border-[#91EAAF] text-[#1F4B2C] font-black'
                              }`}>
                                {isChecked ? <Check className="w-4 h-4 stroke-[3]" /> : optLabel}
                              </div>
                              <div className="leading-relaxed flex-1">
                                <MathText text={optText} />
                              </div>
                            </div>

                            {optImg && (
                              <div className="sm:ml-auto rounded-xl overflow-hidden border border-zinc-300 max-h-32 bg-white p-1 shrink-0 shadow-xs">
                                <img
                                  src={resolveImageUrl(optImg)}
                                  alt={`Gambar Opsi ${optLabel}`}
                                  className="h-24 sm:h-28 object-contain rounded bg-white"
                                  onError={handleImageErrorFallback}
                                />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* 3. ISIAN SINGKAT (Short Answer / Exact Match) */}
                  {(currentQuestion.questionType === 'SHORT_ANSWER' || currentQuestion.question_type === 'SHORT_ANSWER') && (
                    <div className="space-y-3 pt-1">
                      <label className="block text-xs font-black text-[#102919] flex items-center gap-2">
                        <ListOrdered className="w-4 h-4 text-[#1F4B2C]" />
                        <span>Ketikkan jawaban singkat Anda pada kotak di bawah ini:</span>
                      </label>
                      <input
                        type="text"
                        value={activeAttempt.studentAnswers[currentQuestion.id] || ''}
                        onChange={(e) => setStudentAnswer(currentQuestion.id, e.target.value)}
                        placeholder="Ketik jawaban singkat di sini..."
                        className="w-full p-4 bg-[#F4FFFC] border-2 border-[#91EAAF] rounded-2xl text-sm font-bold text-[#102919] placeholder-zinc-400 focus:outline-none focus:border-[#1F4B2C] font-mono shadow-inner"
                      />
                      <p className="text-[11px] text-zinc-500 italic font-medium">
                        Tip: Jawaban tidak membedakan huruf besar dan huruf kecil (case-insensitive).
                      </p>
                    </div>
                  )}

                  {/* 4. TABEL BENAR / SALAH (Grid Matrix) */}
                  {(currentQuestion.questionType === 'TRUE_FALSE_MATRIX' || currentQuestion.question_type === 'TRUE_FALSE_MATRIX') && (
                    <div className="space-y-3 pt-1">
                      <div className="text-xs text-[#102919] font-black flex items-center gap-2 pb-0.5">
                        <Grid className="w-4 h-4 text-[#1F4B2C]" />
                        <span>Tentukan apakah setiap pernyataan di bawah ini BENAR atau SALAH:</span>
                      </div>
                      <div className="space-y-2.5">
                        {((currentQuestion.extra_data?.rows || currentQuestion.extraData?.rows) || []).map((row, rIdx) => {
                          const currentMatrixAns = (typeof activeAttempt.studentAnswers[currentQuestion.id] === 'object' && activeAttempt.studentAnswers[currentQuestion.id]) || {};
                          const rowAns = currentMatrixAns[String(rIdx)];

                          const handleSetChoice = (isTrue) => {
                            const updated = { ...currentMatrixAns, [String(rIdx)]: isTrue };
                            setStudentAnswer(currentQuestion.id, updated);
                          };

                          return (
                            <div key={rIdx} className="p-3.5 rounded-2xl bg-[#F4FFFC] border-2 border-[#91EAAF]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="flex items-start gap-3 flex-1">
                                <span className="w-6 h-6 rounded-lg bg-[#102919] text-[#C3E956] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                                  {rIdx + 1}
                                </span>
                                <div className="text-xs sm:text-sm text-zinc-900 font-semibold leading-relaxed">
                                  <MathText text={row.statement || ''} />
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                                <button
                                  type="button"
                                  onClick={() => handleSetChoice(true)}
                                  className={`px-4 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 ${
                                    rowAns === true
                                      ? 'bg-[#102919] text-[#C3E956] border-2 border-[#1F4B2C]'
                                      : 'bg-white text-zinc-700 hover:text-[#102919] border-2 border-[#91EAAF]/60'
                                  }`}
                                >
                                  {rowAns === true && <Check className="w-3.5 h-3.5 stroke-[3]" />} Benar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSetChoice(false)}
                                  className={`px-4 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 ${
                                    rowAns === false
                                      ? 'bg-rose-600 text-white border-2 border-rose-700'
                                      : 'bg-white text-zinc-700 hover:text-rose-600 border-2 border-[#91EAAF]/60'
                                  }`}
                                >
                                  {rowAns === false && <Check className="w-3.5 h-3.5 stroke-[3]" />} Salah
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 5. MENJODOHKAN (Matching Pair) */}
                  {(currentQuestion.questionType === 'MATCHING_PAIR' || currentQuestion.question_type === 'MATCHING_PAIR') && (
                    <div className="space-y-3 pt-1">
                      <div className="text-xs text-[#102919] font-black flex items-center gap-2 pb-0.5">
                        <GitCompare className="w-4 h-4 text-[#1F4B2C]" />
                        <span>Pasangkan setiap pernyataan di sebelah kiri dengan pilihan yang tepat di sebelah kanan:</span>
                      </div>
                      {(() => {
                        const pairs = (currentQuestion.extra_data?.pairs || currentQuestion.extraData?.pairs) || [];
                        const rightChoices = pairs.map(p => p.right).filter(Boolean);
                        const currentPairsAns = (typeof activeAttempt.studentAnswers[currentQuestion.id] === 'object' && activeAttempt.studentAnswers[currentQuestion.id]) || {};

                        return (
                          <div className="space-y-2.5">
                            {pairs.map((p, pIdx) => {
                              const leftKey = p.left;
                              const selectedVal = currentPairsAns[leftKey] || '';

                              const handleChangePair = (val) => {
                                const updated = { ...currentPairsAns, [leftKey]: val };
                                setStudentAnswer(currentQuestion.id, updated);
                              };

                              return (
                                <div key={pIdx} className="p-3.5 rounded-2xl bg-[#F4FFFC] border-2 border-[#91EAAF]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                  <div className="flex items-start gap-3 flex-1">
                                    <span className="w-6 h-6 rounded-lg bg-[#102919] text-[#C3E956] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                                      {pIdx + 1}
                                    </span>
                                    <div className="text-xs sm:text-sm text-zinc-900 font-semibold leading-relaxed">
                                      <MathText text={leftKey} />
                                    </div>
                                  </div>

                                  <div className="shrink-0 w-full sm:w-64">
                                    <select
                                      value={selectedVal}
                                      onChange={(e) => handleChangePair(e.target.value)}
                                      className="w-full px-3.5 py-2 bg-white border-2 border-[#91EAAF] rounded-xl text-xs font-bold text-[#102919] focus:outline-none focus:border-[#1F4B2C]"
                                    >
                                      <option value="">-- Pilih Pasangan --</option>
                                      {rightChoices.map((choice, cIdx) => (
                                        <option key={cIdx} value={choice}>
                                          {choice}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* 6. INPUT ESAI */}
                  {(currentQuestion.questionType === 'ESSAY' || currentQuestion.question_type === 'ESSAY') && (
                    <div className="space-y-2">
                      <label className="block text-xs font-black text-[#102919]">
                        Jawaban Esai Anda:
                      </label>
                      <textarea
                        rows={6}
                        value={activeAttempt.studentAnswers[currentQuestion.id] || ''}
                        onChange={(e) => setStudentAnswer(currentQuestion.id, e.target.value)}
                        placeholder="Ketik jawaban esai secara lengkap dan terstruktur di sini..."
                        className="w-full p-4 bg-[#F4FFFC] border-2 border-[#91EAAF] rounded-2xl text-xs sm:text-sm font-medium text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-[#1F4B2C] shadow-inner"
                      />
                    </div>
                  )}
                </div>
              ) : null}

              {/* Navigasi Bawah: Sebelumnya & Berikutnya */}
              <div className="flex items-center justify-between pt-4 border-t-2 border-[#91EAAF]/40">
                <button
                  disabled={currentQuestionIndex === 0}
                  onClick={() => setCurrentQuestionIndex((prev) => prev - 1)}
                  className="px-5 py-2.5 rounded-xl bg-white hover:bg-[#E1F8ED] text-[#1F4B2C] border-2 border-[#91EAAF]/60 text-xs font-bold disabled:opacity-40 transition active:scale-95 cursor-pointer shadow-xs"
                >
                  ← Soal Sebelumnya
                </button>

                {currentQuestionIndex === questions.length - 1 ? (
                  <button
                    onClick={() => setShowExitConfirmModal(true)}
                    className="px-6 py-2.5 rounded-xl bg-[#C3E956] hover:bg-[#d4f76b] text-[#0A1D11] text-xs font-black shadow-md border border-[#4D7111]/30 transition flex items-center gap-1.5 active:scale-95 cursor-pointer"
                  >
                    <Check className="w-4 h-4 text-[#0A1D11]" /> Selesai & Kirim Ujian
                  </button>
                ) : (
                  <button
                    onClick={() => setCurrentQuestionIndex((prev) => prev + 1)}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#102919] to-[#1F4B2C] hover:from-[#143820] hover:to-[#255e37] text-white text-xs font-black shadow-md transition active:scale-95 cursor-pointer"
                  >
                    Soal Berikutnya →
                  </button>
                )}
              </div>
            </div>

            {/* Panel Kanan: Kisi Nomor Navigasi Soal */}
            <div className="w-full md:w-64 bg-white border-2 border-[#91EAAF]/60 rounded-3xl p-5 h-fit space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b-2 border-[#91EAAF]/40 pb-3">
                <h3 className="text-xs font-black uppercase text-[#102919] tracking-wider">
                  Nomor Soal
                </h3>
                {(() => {
                  const answeredCount = questions.filter((q) => isQuestionAnswered(activeAttempt.studentAnswers[q.id])).length;
                  return (
                    <span className="text-xs font-bold text-[#1F4B2C] bg-[#E1F8ED] border border-[#91EAAF] px-2.5 py-0.5 rounded-full font-mono">
                      {answeredCount}/{questions.length} Terjawab
                    </span>
                  );
                })()}
              </div>

              {/* Grid Kotak Nomor Soal */}
              <div className="grid grid-cols-5 gap-2">
                {questions.map((q, i) => {
                  const isCurrent = currentQuestionIndex === i;
                  const ans = activeAttempt.studentAnswers[q.id];
                  const isAnswered = isQuestionAnswered(ans);
                  const isDoubt = Boolean(doubtQuestions[q.id]);

                  return (
                    <button
                      key={q.id}
                      onClick={() => setCurrentQuestionIndex(i)}
                      className={`h-10 rounded-xl font-mono text-xs transition cursor-pointer flex items-center justify-center relative active:scale-95 ${
                        isCurrent
                          ? 'bg-[#102919] text-[#C3E956] ring-2 ring-[#C3E956] shadow-md font-black scale-105'
                          : isDoubt
                          ? 'bg-amber-400 text-amber-950 font-black border-2 border-amber-500 shadow-xs'
                          : isAnswered
                          ? 'bg-[#1F4B2C] text-[#C3E956] font-bold shadow-xs'
                          : 'bg-[#F4FFFC] text-zinc-600 hover:text-[#102919] hover:bg-[#E1F8ED] border-2 border-[#91EAAF]/60 font-bold'
                      }`}
                    >
                      {i + 1}
                    </button>
                  );
                })}
              </div>

              {/* Keterangan Warna */}
              <div className="pt-3 border-t-2 border-[#91EAAF]/40 text-[11px] space-y-1.5 text-zinc-600 font-semibold">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-md bg-[#1F4B2C] border border-[#102919] inline-block shrink-0 shadow-2xs" />
                  <span className="text-[#102919]">Sudah Terjawab</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-md bg-amber-400 border border-amber-500 inline-block shrink-0 shadow-2xs" />
                  <span className="text-zinc-700">Ragu-ragu</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-md bg-[#F4FFFC] border-2 border-[#91EAAF] inline-block shrink-0" />
                  <span className="text-zinc-600">Belum Terjawab</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-md bg-[#102919] ring-2 ring-[#C3E956] inline-block shrink-0" />
                  <span className="text-[#102919] font-bold">Sedang Dibuka</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ======================================================== */}
      {/* MODAL KONFIRMASI BATAL & KELUAR UJIAN                    */}
      {/* ======================================================== */}
      {showCancelConfirmModal && (
        <div className="fixed inset-0 z-50 bg-[#0A1D11]/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fade-in select-none">
          <div className="bg-white border-2 border-rose-200 rounded-3xl max-w-md w-full p-6 shadow-2xl relative space-y-5 max-h-[94dvh] overflow-y-auto my-auto">
            {/* Header Modal */}
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 border-2 border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-black text-zinc-900 tracking-tight">
                  Batalkan Pengerjaan Ujian?
                </h3>
                <p className="text-xs text-zinc-600 mt-1 leading-relaxed">
                  Apakah Anda yakin ingin membatalkan dan keluar tanpa menyelesaikan ujian ini?
                </p>
              </div>
            </div>

            {/* Kotak Informasi & Peringatan Konsekuensi */}
            <div className="bg-rose-50/50 border-2 border-rose-100 rounded-2xl p-4 space-y-2.5 text-xs text-zinc-700">
              <div className="font-black text-rose-700 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                <span>Konsekuensi Pembatalan:</span>
              </div>
              <ul className="space-y-1.5 text-zinc-700 text-xs leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="text-rose-600 font-bold">•</span>
                  <span>Anda akan keluar dari ujian tanpa mengirimkan lembar jawaban.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-rose-600 font-bold">•</span>
                  <span>Nilai ujian Anda <strong className="text-rose-800">TIDAK AKAN DIREKAP / DIHITUNG</strong> di sistem.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#1F4B2C] font-bold">•</span>
                  <span>Seluruh log pelanggaran Anda pada sesi ini <strong className="text-[#1F4B2C]">AKAN DIHAPUS BERSIH</strong> dan tidak masuk ke rekap pelanggaran maupun E-Jurnal Guru.</span>
                </li>
              </ul>
            </div>

            {/* Peringatan Konfirmasi */}
            <div className="text-xs text-zinc-600 bg-[#F4FFFC] border border-[#91EAAF]/60 p-3.5 rounded-xl leading-relaxed">
              Jika Anda ingin melanjutkan pengerjaan di lain waktu, Anda dapat masuk kembali menggunakan Token Masuk baru dari guru pengawas.
            </div>

            {/* Tombol Aksi */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isCancellingExam}
                onClick={() => setShowCancelConfirmModal(false)}
                className="px-5 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold transition active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                Lanjutkan Ujian
              </button>
              <button
                type="button"
                disabled={isCancellingExam}
                onClick={handleCancelAndExitExam}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-md transition active:scale-95 flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isCancellingExam ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Membatalkan...</span>
                  </>
                ) : (
                  <>
                    <LogOut className="w-4 h-4" />
                    <span>Ya, Batalkan & Keluar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL KONFIRMASI SELESAI & KELUAR UJIAN                  */}
      {/* ======================================================== */}
      {showExitConfirmModal && (
        <div className="fixed inset-0 z-50 bg-[#0A1D11]/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fade-in select-none">
          <div className="bg-white border-2 border-[#91EAAF] rounded-3xl max-w-lg w-full p-6 shadow-2xl relative space-y-5 max-h-[94dvh] overflow-y-auto my-auto">
            {/* Header Modal */}
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border-2 border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-black text-[#102919] tracking-tight">
                  Konfirmasi Selesai Ujian
                </h3>
                <p className="text-xs text-zinc-600 mt-1 leading-relaxed">
                  Pastikan seluruh jawaban Anda sudah terisi dengan benar sebelum mengirim lembar ujian.
                </p>
              </div>
            </div>

            {/* Ringkasan Pengerjaan untuk Soal Mandiri */}
            {selectedPackage?.examType === 'NATIVE_QUESTIONS' ? (
              <div className="bg-[#F4FFFC] border-2 border-[#91EAAF]/60 rounded-2xl p-4 space-y-3">
                <div className="text-[11px] font-black uppercase tracking-wider text-[#102919]">
                  Status Lembar Jawaban:
                </div>
                {(() => {
                  const answeredCount = questions.filter((q) => isQuestionAnswered(activeAttempt.studentAnswers?.[q.id])).length;
                  const doubtCount = Object.values(doubtQuestions).filter(Boolean).length;
                  const unansweredCount = Math.max(0, questions.length - answeredCount);

                  return (
                    <div className="grid grid-cols-3 gap-2.5 text-center">
                      <div className="bg-[#E1F8ED] border-2 border-[#91EAAF] rounded-xl p-3">
                        <div className="text-xl sm:text-2xl font-black font-mono text-[#1F4B2C]">
                          {answeredCount}
                        </div>
                        <div className="text-[10px] text-[#4D7111] font-bold mt-0.5">Sudah Terjawab</div>
                      </div>
                      <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-3">
                        <div className="text-xl sm:text-2xl font-black font-mono text-amber-700">
                          {doubtCount}
                        </div>
                        <div className="text-[10px] text-amber-800 font-bold mt-0.5">Ragu-ragu</div>
                      </div>
                      <div className={`rounded-xl p-3 border-2 ${
                        unansweredCount > 0 
                          ? 'bg-rose-50 border-rose-200' 
                          : 'bg-white border-zinc-200'
                      }`}>
                        <div className={`text-xl sm:text-2xl font-black font-mono ${
                          unansweredCount > 0 ? 'text-rose-600' : 'text-zinc-400'
                        }`}>
                          {unansweredCount}
                        </div>
                        <div className={`text-[10px] font-bold mt-0.5 ${
                          unansweredCount > 0 ? 'text-rose-700' : 'text-zinc-500'
                        }`}>
                          Belum Diisi
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {(() => {
                  const unanswered = questions.filter((q) => !isQuestionAnswered(activeAttempt.studentAnswers?.[q.id])).length;
                  if (unanswered > 0) {
                    return (
                      <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 px-3 py-2 rounded-xl flex items-center gap-2 font-medium">
                        <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                        <span>Masih ada <strong>{unanswered} soal</strong> yang belum dijawab!</span>
                      </div>
                    );
                  }
                  return (
                    <div className="text-xs text-[#1F4B2C] bg-[#E1F8ED] border border-[#91EAAF] px-3 py-2 rounded-xl flex items-center gap-2 font-bold">
                      <CheckCircle className="w-4 h-4 shrink-0 text-[#1F4B2C]" />
                      <span>Hebat! Seluruh butir soal telah berhasil Anda jawab.</span>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="bg-[#F4FFFC] border-2 border-[#91EAAF]/60 rounded-2xl p-4 text-xs text-zinc-700 space-y-1.5 leading-relaxed">
                <div className="font-bold text-[#102919] flex items-center gap-1.5">
                  <CheckSquare className="w-4 h-4 text-[#1F4B2C]" />
                  <span>Ujian Berbasis Formulir Online</span>
                </div>
                <p>
                  Pastikan Anda sudah menekan tombol <strong>"Kirim" / "Submit"</strong> di dalam formulir Google Form / Microsoft Teams sebelum mengakhiri sesi pengerjaan ini.
                </p>
              </div>
            )}

            {/* Peringatan Konfirmasi Akhir */}
            <div className="text-xs text-zinc-600 bg-zinc-50 border border-zinc-200 p-3.5 rounded-xl leading-relaxed">
              Setelah dikonfirmasi, mode layar penuh otomatis dilepaskan, sesi pengerjaan ditutup, dan seluruh hasil asesmen langsung disimpan di portal pengawas guru.
            </div>

            {/* Tombol Aksi */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isSubmittingExam}
                onClick={() => setShowExitConfirmModal(false)}
                className="px-5 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold transition active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                Lanjut Mengerjakan
              </button>
              <button
                type="button"
                disabled={isSubmittingExam}
                onClick={handleFinishAndExitExam}
                className="px-6 py-2.5 rounded-xl bg-[#C3E956] hover:bg-[#d4f76b] text-[#0A1D11] text-xs font-black shadow-md border border-[#4D7111]/30 transition active:scale-95 flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isSubmittingExam ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-[#0A1D11]" />
                    <span>Menyimpan & Mengirim...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 text-[#0A1D11]" />
                    <span>Ya, Selesaikan Ujian</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL KARTU SKOR HASIL UJIAN SISWA (POST-EXAM RESULT)   */}
      {/* HANYA MENAMPILKAN NILAI TANPA KUNCI/LEMBAR JAWABAN       */}
      {/* DESAIN RINGKAS, RESPONSIVE, ANTI-TERTUTUP NAV BAR HP     */}
      {/* ======================================================== */}
      {showScoreResultModal && studentFinalScoreData && (
        <div className="fixed inset-0 z-50 bg-[#0A1D11]/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fade-in select-none">
          <div className="bg-white border-2 border-[#91EAAF] rounded-3xl max-w-sm sm:max-w-md w-full p-5 sm:p-6 shadow-2xl relative space-y-4 text-zinc-800 max-h-[94dvh] overflow-y-auto my-auto flex flex-col">
            {/* Header / Celebration Icon */}
            <div className="text-center space-y-1.5">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#E1F8ED] border-2 border-[#91EAAF] text-[#1F4B2C] shadow-sm">
                <Trophy className="w-6 h-6 text-[#1F4B2C] animate-pulse" />
              </div>
              <h2 className="text-lg sm:text-xl font-black tracking-tight text-[#102919]">
                Ujian Berhasil Diselesaikan!
              </h2>
              <p className="text-xs text-zinc-600 max-w-xs mx-auto leading-relaxed">
                Seluruh jawaban telah berhasil disimpan dan disinkronkan ke server portal guru pengawas.
              </p>
            </div>

            {/* Kartu Status / Skor Hasil Asesmen */}
            <div className="bg-[#F4FFFC] border-2 border-[#91EAAF]/60 rounded-2xl p-4 sm:p-5 text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 transform translate-x-2 -translate-y-2 opacity-10 pointer-events-none">
                <Award className="w-24 h-24 text-[#1F4B2C]" />
              </div>

              {/* KONDISI 1: JIKA SOAL SELAIN PILIHAN GANDA (ESAI / FORM / MEMERLUKAN KOREKSI MANUAL GURU) */}
              {studentFinalScoreData.requiresTeacherGrading ? (
                <div className="py-2 space-y-3">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 text-amber-900 border-2 border-amber-300 text-xs font-black shadow-xs">
                    <Clock className="w-4 h-4 text-amber-600 animate-pulse" />
                    <span>Menunggu Hasil Koreksi Guru (Belum Dikoreksi)</span>
                  </div>

                  <div className="text-xs sm:text-sm text-zinc-700 font-medium leading-relaxed max-w-sm mx-auto">
                    Selamat, Anda telah berhasil menyelesaikan ujian! Seluruh lembar jawaban Anda telah tersimpan dan nilai akhir akan diumumkan setelah hasil koreksi selesai dinilai oleh guru pengawas.
                  </div>

                  <div className="inline-flex items-center gap-2 text-xs text-[#1F4B2C] bg-[#E1F8ED] px-3.5 py-1.5 rounded-xl border border-[#91EAAF] font-bold">
                    <Sparkles className="w-4 h-4 text-[#4D7111]" />
                    <span>
                      {studentFinalScoreData.isForm 
                        ? 'Tautan Formulir Asesmen Berhasil Terkirim' 
                        : `${studentFinalScoreData.totalQuestions} Butir Soal Terkirim • Menunggu Hasil Evaluasi`}
                    </span>
                  </div>
                </div>
              ) : (
                /* KONDISI 2: JIKA SOAL PILIHAN GANDA (100% AUTO-GRADED) -> TAMPILKAN NILAI LANGSUNG */
                <div className="py-1 space-y-1">
                  <div className="text-xs font-bold uppercase tracking-wider text-[#4D7111]">
                    Perolehan Nilai Asesmen
                  </div>

                  <div className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-[#1F4B2C]">
                    {studentFinalScoreData.score}
                  </div>
                  <div className="text-xs text-zinc-600 flex items-center justify-center gap-2 flex-wrap pt-1">
                    <span>
                      dari total <span className="font-bold text-[#102919]">{studentFinalScoreData.maxPoints}</span> Poin Maksimal
                    </span>
                    {studentFinalScoreData.maxPoints > 0 && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black bg-[#C3E956] text-[#0A1D11] border border-[#4D7111]/30">
                        {Math.round((studentFinalScoreData.score / studentFinalScoreData.maxPoints) * 100)}% Capaian
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Rincian Identitas Peserta & Asesmen (Grid 2 Kolom Kompak) */}
            <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-3.5 text-xs">
              <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                <div>
                  <span className="text-zinc-500 text-[11px] block">Nama Siswa:</span>
                  <span className="font-bold text-[#102919] truncate block">{studentFinalScoreData.studentName}</span>
                </div>
                <div>
                  <span className="text-zinc-500 text-[11px] block">NISN:</span>
                  <span className="font-mono font-bold text-zinc-800 block">{studentFinalScoreData.nisn}</span>
                </div>
                <div>
                  <span className="text-zinc-500 text-[11px] block">Kelas / Mapel:</span>
                  <span className="font-medium text-zinc-800 truncate block">{studentFinalScoreData.classroom} • {studentFinalScoreData.subjectName}</span>
                </div>
                <div>
                  <span className="text-zinc-500 text-[11px] block">Waktu Pengiriman:</span>
                  <span className="font-mono text-[#1F4B2C] font-bold block">{studentFinalScoreData.finishedAt}</span>
                </div>
              </div>
            </div>

            {/* Peringatan Kerahasiaan Kunci Jawaban Ringkas */}
            <div className="bg-[#F4FFFC] border border-[#91EAAF]/60 p-2.5 sm:p-3 rounded-xl flex items-center gap-2.5 text-xs text-zinc-600 leading-tight">
              <Lock className="w-4 h-4 text-[#1F4B2C] shrink-0" />
              <span>
                <strong className="text-[#102919]">Kerahasiaan Jawaban:</strong> Rincian kunci jawaban dirahasiakan demi integritas asesmen sekolah.
              </span>
            </div>

            {/* Tombol Aksi - Selalu Terlihat & Nyaman Diklik */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleAcknowledgeScoreAndExit}
                className="w-full py-3.5 px-5 rounded-2xl bg-[#C3E956] hover:bg-[#d4f76b] text-[#0A1D11] font-black text-sm shadow-md border border-[#4D7111]/30 transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>{activeAttempt.isSimulation ? 'Kembali ke Dashboard Guru' : 'Selesai & Kembali ke Lobby'}</span>
                <ChevronRight className="w-4 h-4 text-[#0A1D11]" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
