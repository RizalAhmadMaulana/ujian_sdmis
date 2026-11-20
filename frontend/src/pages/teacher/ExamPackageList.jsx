import React, { useState, useEffect, useMemo } from 'react';
import { useExamStore } from '../../store/useExamStore';
import { formatExternalExamUrl, isValidExamUrl } from '../../utils/urlEmbedFormatter';
import { 
  getPackagesApi, 
  getPackageDetailApi,
  createPackageApi, 
  updatePackageApi, 
  deletePackageApi, 
  uploadExamImageApi,
  importDocxQuestionsApi,
  importExcelQuestionsApi,
  downloadQuestionTemplateExcelApi
} from '../../api/examApi';
import { resolveImageUrl, handleImageErrorFallback } from '../../utils/imageUrlFormatter';
import { getClassroomsApi } from '../../api/authApi';
import Modal from '../../components/common/Modal';
import MathText from '../../components/common/MathText';
import FormulaToolbar from '../../components/common/FormulaToolbar';
import { 
  FolderKanban, 
  Plus, 
  ExternalLink, 
  BookOpen, 
  Trash2, 
  Edit3,
  CheckCircle, 
  Eye, 
  Sparkles, 
  Layers, 
  FileQuestion, 
  HelpCircle, 
  X,
  Image as ImageIcon,
  Copy,
  Check,
  FileSpreadsheet,
  FileText,
  Download,
  UploadCloud,
  CheckSquare,
  ListOrdered,
  Sigma,
  Grid,
  GitCompare,
  Search,
  ChevronDown,
  ArrowRight,
  Info
} from 'lucide-react';

export default function ExamPackageList() {
  const { examPackages, addExamPackage, fetchPackages } = useExamStore();

  const [classroomsList, setClassroomsList] = useState([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingPackageId, setEditingPackageId] = useState(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');

  // Native Questions Preview State (Soal Mandiri)
  const [isNativePreviewOpen, setIsNativePreviewOpen] = useState(false);
  const [previewPackage, setPreviewPackage] = useState(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL'); // 'ALL' | 'NATIVE_QUESTIONS' | 'EXTERNAL_LINK'

  // Form State
  const [examType, setExamType] = useState('NATIVE_QUESTIONS'); // 'NATIVE_QUESTIONS' | 'EXTERNAL_LINK'
  const [title, setTitle] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [targetClassroom, setTargetClassroom] = useState('');
  const [platform, setPlatform] = useState('GOOGLE_FORMS'); // 'GOOGLE_FORMS' | 'MICROSOFT_FORMS'
  const [rawExternalUrl, setRawExternalUrl] = useState('');

  // Import Modal State (Word .docx & Excel .xlsx)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importFormat, setImportFormat] = useState('EXCEL'); // 'EXCEL' | 'DOCX'
  const [importTitle, setImportTitle] = useState('');
  const [importSubject, setImportSubject] = useState('');
  const [importTargetPkgId, setImportTargetPkgId] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importMessage, setImportMessage] = useState('');

  // Formula Toolbar Active Target: { qIdx, optIdx, field: 'questionText' | 'optionText' }
  const [activeFormulaTarget, setActiveFormulaTarget] = useState(null);

  // Quick Add Question Dropdown Toggle (Khusus Mobile/Desktop)
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);

  useEffect(() => {
    fetchPackages?.();
    const loadClassrooms = async () => {
      try {
        const cls = await getClassroomsApi();
        if (cls && cls.length > 0) {
          setClassroomsList(cls);
          setTargetClassroom(cls[0].name);
        }
      } catch (err) {
        console.warn('Gagal ambil data kelas:', err);
      }
    };
    loadClassrooms();
  }, [fetchPackages]);

  // Native Question Builder State (Microsoft Forms Style)
  const [questions, setQuestions] = useState([
    {
      id: `q-${Date.now()}-1`,
      questionType: 'MULTIPLE_CHOICE',
      questionText: '',
      imageUrl: '',
      points: 20,
      options: [
        { id: `opt-1`, label: 'A', text: '', imageUrl: '' },
        { id: `opt-2`, label: 'B', text: '', imageUrl: '' },
        { id: `opt-3`, label: 'C', text: '', imageUrl: '' },
        { id: `opt-4`, label: 'D', text: '', imageUrl: '' },
      ],
      correctOption: 'A',
      correctOptions: ['A'],
      exactKeys: '',
      matrixRows: [
        { statement: '', correct: true },
        { statement: '', correct: false },
      ],
      matchingPairs: [
        { left: '', right: '' },
        { left: '', right: '' },
      ],
    },
  ]);

  // Akumulasi Poin Real-time
  const totalPoints = useMemo(() => {
    return questions.reduce((sum, q) => sum + (Number(q.points) || 0), 0);
  }, [questions]);

  // Format URL Embed External
  const formattedEmbedUrl = useMemo(() => {
    if (!rawExternalUrl.trim()) return '';
    return formatExternalExamUrl(rawExternalUrl, platform);
  }, [rawExternalUrl, platform]);

  // Filter List Paket Ujian
  const filteredPackages = useMemo(() => {
    return examPackages.filter((pkg) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch = 
        !q ||
        (pkg.title || '').toLowerCase().includes(q) ||
        (pkg.subjectName || pkg.subject_name || '').toLowerCase().includes(q) ||
        (pkg.targetClassroom || pkg.target_classroom || '').toLowerCase().includes(q);

      const pkgType = pkg.examType || pkg.exam_type || 'NATIVE_QUESTIONS';
      const matchType = 
        typeFilter === 'ALL' ||
        (typeFilter === 'NATIVE_QUESTIONS' && pkgType === 'NATIVE_QUESTIONS') ||
        (typeFilter === 'EXTERNAL_LINK' && pkgType === 'EXTERNAL_LINK');

      return matchSearch && matchType;
    });
  }, [examPackages, searchQuery, typeFilter]);

  // Tambah Butir Soal Baru berdasarkan Tipe
  const handleAddQuestion = (type = 'MULTIPLE_CHOICE') => {
    let options = [];
    let correctOption = 'A';
    let correctOptions = ['A'];
    let exactKeys = '';
    let matrixRows = [];
    let matchingPairs = [];

    if (type === 'MULTIPLE_CHOICE' || type === 'MULTIPLE_CHOICE_COMPLEX') {
      options = [
        { id: `opt-${Date.now()}-1`, label: 'A', text: '', imageUrl: '' },
        { id: `opt-${Date.now()}-2`, label: 'B', text: '', imageUrl: '' },
        { id: `opt-${Date.now()}-3`, label: 'C', text: '', imageUrl: '' },
        { id: `opt-${Date.now()}-4`, label: 'D', text: '', imageUrl: '' },
      ];
    } else if (type === 'TRUE_FALSE_MATRIX') {
      matrixRows = [
        { statement: '', correct: true },
        { statement: '', correct: false },
      ];
    } else if (type === 'MATCHING_PAIR') {
      matchingPairs = [
        { left: '', right: '' },
        { left: '', right: '' },
      ];
    }

    setQuestions((prev) => [
      ...prev,
      {
        id: `q-${Date.now()}-${prev.length + 1}`,
        questionType: type,
        questionText: '',
        imageUrl: '',
        points: 20,
        options,
        correctOption,
        correctOptions,
        exactKeys,
        matrixRows,
        matchingPairs,
      },
    ]);
    setIsTypeDropdownOpen(false);
  };

  // Helper Sisipkan Rumus KaTeX
  const handleInsertFormula = (latexSyntax) => {
    if (!activeFormulaTarget) return;
    const { qIdx, optIdx, field } = activeFormulaTarget;
    const updated = [...questions];
    if (field === 'questionText') {
      const current = updated[qIdx].questionText || '';
      updated[qIdx].questionText = `${current} $${latexSyntax}$ `;
    } else if (field === 'optionText' && optIdx !== undefined) {
      const current = updated[qIdx].options[optIdx]?.text || '';
      updated[qIdx].options[optIdx].text = `${current} $${latexSyntax}$ `;
    }
    setQuestions(updated);
  };

  // Handler Pilihan Ganda Kompleks (Checkbox)
  const handleToggleComplexOption = (qIdx, label) => {
    const updated = [...questions];
    const current = updated[qIdx].correctOptions || [];
    if (current.includes(label)) {
      if (current.length <= 1) {
        alert('Minimal harus ada 1 opsi jawaban yang benar!');
        return;
      }
      updated[qIdx].correctOptions = current.filter((x) => x !== label);
    } else {
      updated[qIdx].correctOptions = [...current, label];
    }
    setQuestions(updated);
  };

  // Handler Tabel Benar/Salah (Matrix)
  const handleAddMatrixRow = (qIdx) => {
    const updated = [...questions];
    const rows = updated[qIdx].matrixRows || [];
    updated[qIdx].matrixRows = [...rows, { statement: '', correct: true }];
    setQuestions(updated);
  };

  const handleRemoveMatrixRow = (qIdx, rIdx) => {
    const updated = [...questions];
    const rows = [...(updated[qIdx].matrixRows || [])];
    if (rows.length <= 1) {
      alert('Tabel Benar/Salah minimal harus memiliki 1 baris pernyataan.');
      return;
    }
    rows.splice(rIdx, 1);
    updated[qIdx].matrixRows = rows;
    setQuestions(updated);
  };

  const handleMatrixStatementChange = (qIdx, rIdx, val) => {
    const updated = [...questions];
    updated[qIdx].matrixRows[rIdx].statement = val;
    setQuestions(updated);
  };

  const handleMatrixCorrectChange = (qIdx, rIdx, val) => {
    const updated = [...questions];
    updated[qIdx].matrixRows[rIdx].correct = val;
    setQuestions(updated);
  };

  // Handler Menjodohkan (Matching Pair)
  const handleAddMatchingPair = (qIdx) => {
    const updated = [...questions];
    const pairs = updated[qIdx].matchingPairs || [];
    updated[qIdx].matchingPairs = [...pairs, { left: '', right: '' }];
    setQuestions(updated);
  };

  const handleRemoveMatchingPair = (qIdx, pIdx) => {
    const updated = [...questions];
    const pairs = [...(updated[qIdx].matchingPairs || [])];
    if (pairs.length <= 1) {
      alert('Soal menjodohkan minimal harus memiliki 1 pasangan pernyataan.');
      return;
    }
    pairs.splice(pIdx, 1);
    updated[qIdx].matchingPairs = pairs;
    setQuestions(updated);
  };

  const handleMatchingPairChange = (qIdx, pIdx, side, val) => {
    const updated = [...questions];
    updated[qIdx].matchingPairs[pIdx][side] = val;
    setQuestions(updated);
  };

  const handleExactKeysChange = (qIdx, val) => {
    const updated = [...questions];
    updated[qIdx].exactKeys = val;
    setQuestions(updated);
  };

  const handleDuplicateQuestion = (qIndex) => {
    const qToCopy = questions[qIndex];
    const duplicated = {
      ...qToCopy,
      id: `q-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      options: (qToCopy.options || []).map((o, idx) => ({
        ...o,
        id: `opt-${Date.now()}-${idx}`,
      })),
    };
    const updated = [...questions];
    updated.splice(qIndex + 1, 0, duplicated);
    setQuestions(updated);
  };

  const handleRemoveQuestion = (index) => {
    if (questions.length <= 1) {
      alert('Paket soal minimal harus memiliki 1 butir pertanyaan.');
      return;
    }
    const updated = [...questions];
    updated.splice(index, 1);
    setQuestions(updated);
  };

  const handleQuestionTextChange = (index, text) => {
    const updated = [...questions];
    updated[index].questionText = text;
    setQuestions(updated);
  };

  const handlePointsChange = (index, points) => {
    const updated = [...questions];
    updated[index].points = Number(points) || 0;
    setQuestions(updated);
  };

  // Upload Gambar Soal (Pratinjau Instan Blob + Unggah Server)
  const handleQuestionImageUpload = async (qIndex, file) => {
    if (!file) return;
    const localBlobUrl = URL.createObjectURL(file);
    const updated = [...questions];
    updated[qIndex].imageUrl = localBlobUrl;
    setQuestions(updated);

    try {
      const res = await uploadExamImageApi(file);
      const serverUrl = res.stream_url || res.url || res.relative_url;
      const finalUpdated = [...questions];
      finalUpdated[qIndex].imageUrl = serverUrl;
      setQuestions(finalUpdated);
    } catch (err) {
      alert('Gagal mengunggah gambar soal: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleRemoveQuestionImage = (qIndex) => {
    const updated = [...questions];
    updated[qIndex].imageUrl = '';
    setQuestions(updated);
  };

  // Manajemen Opsi Jawaban Dinamis
  const handleAddOption = (qIndex) => {
    const updated = [...questions];
    const currentOptions = updated[qIndex].options || [];
    if (currentOptions.length >= 8) {
      alert('Maksimal 8 opsi pilihan jawaban (A sampai H).');
      return;
    }
    const nextLabel = String.fromCharCode(65 + currentOptions.length);
    updated[qIndex].options = [
      ...currentOptions,
      {
        id: `opt-${Date.now()}-${currentOptions.length + 1}`,
        label: nextLabel,
        text: '',
        imageUrl: '',
      },
    ];
    setQuestions(updated);
  };

  const handleRemoveOption = (qIndex, optIndex) => {
    const updated = [...questions];
    const currentOptions = [...(updated[qIndex].options || [])];
    if (currentOptions.length <= 2) {
      alert('Pilihan ganda minimal harus memiliki 2 opsi jawaban.');
      return;
    }
    const removedLabel = currentOptions[optIndex].label;
    currentOptions.splice(optIndex, 1);

    const reindexed = currentOptions.map((opt, i) => ({
      ...opt,
      label: String.fromCharCode(65 + i),
    }));
    updated[qIndex].options = reindexed;

    if (updated[qIndex].correctOption === removedLabel || !reindexed.some((o) => o.label === updated[qIndex].correctOption)) {
      updated[qIndex].correctOption = reindexed[0]?.label || 'A';
    }
    setQuestions(updated);
  };

  const handleOptionTextChange = (qIndex, optIndex, text) => {
    const updated = [...questions];
    updated[qIndex].options[optIndex].text = text;
    setQuestions(updated);
  };

  // Upload Gambar Opsi Jawaban (Pratinjau Instan Blob + Unggah Server)
  const handleOptionImageUpload = async (qIndex, optIndex, file) => {
    if (!file) return;
    const localBlobUrl = URL.createObjectURL(file);
    const updated = [...questions];
    updated[qIndex].options[optIndex].imageUrl = localBlobUrl;
    setQuestions(updated);

    try {
      const res = await uploadExamImageApi(file);
      const serverUrl = res.stream_url || res.url || res.relative_url;
      const finalUpdated = [...questions];
      finalUpdated[qIndex].options[optIndex].imageUrl = serverUrl;
      setQuestions(finalUpdated);
    } catch (err) {
      alert('Gagal mengunggah gambar opsi: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleRemoveOptionImage = (qIndex, optIndex) => {
    const updated = [...questions];
    updated[qIndex].options[optIndex].imageUrl = '';
    setQuestions(updated);
  };

  const handleCorrectOptionChange = (qIndex, optLabel) => {
    const updated = [...questions];
    updated[qIndex].correctOption = optLabel;
    setQuestions(updated);
  };

  // Unduh Berkas Template Excel
  const handleDownloadExcelTemplate = async () => {
    try {
      const blob = await downloadQuestionTemplateExcelApi();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Template_Import_Soal_E-Ujian.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Gagal mengunduh template Excel: ' + (err.message || 'Error jaringan'));
    }
  };

  const handleOpenAdd = () => {
    setIsEditing(false);
    setEditingPackageId(null);
    setTitle('');
    setSubjectName('');
    setRawExternalUrl('');
    setExamType('NATIVE_QUESTIONS');
    setTargetClassroom(classroomsList[0]?.name || 'Semua Kelas');
    setQuestions([
      {
        id: `q-${Date.now()}-1`,
        questionType: 'MULTIPLE_CHOICE',
        questionText: '',
        imageUrl: '',
        points: 20,
        options: [
          { id: `opt-1`, label: 'A', text: '', imageUrl: '' },
          { id: `opt-2`, label: 'B', text: '', imageUrl: '' },
          { id: `opt-3`, label: 'C', text: '', imageUrl: '' },
          { id: `opt-4`, label: 'D', text: '', imageUrl: '' },
        ],
        correctOption: 'A',
        correctOptions: ['A'],
        exactKeys: '',
        matrixRows: [],
        matchingPairs: [],
      },
    ]);
    setActiveFormulaTarget(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (pkg) => {
    setIsEditing(true);
    setEditingPackageId(pkg.id);
    setTitle(pkg.title || '');
    setSubjectName(pkg.subjectName || pkg.subject_name || '');
    setTargetClassroom(pkg.targetClassroom || pkg.target_classroom || (classroomsList[0]?.name || 'Semua Kelas'));
    setExamType(pkg.examType || pkg.exam_type || 'NATIVE_QUESTIONS');
    setRawExternalUrl(pkg.externalUrl || pkg.external_url || '');

    if (pkg.questions && pkg.questions.length > 0) {
      setQuestions(
        pkg.questions.map((q, idx) => {
          const qType = q.question_type || q.questionType || 'MULTIPLE_CHOICE';
          const extra = q.extra_data || q.extraData || {};
          
          let exactKeys = '';
          if (extra.exact_keys) {
            exactKeys = Array.isArray(extra.exact_keys) ? extra.exact_keys.join(' / ') : String(extra.exact_keys);
          }

          let matrixRows = [];
          if (extra.rows && Array.isArray(extra.rows)) {
            matrixRows = extra.rows.map((r) => ({
              statement: r.statement || '',
              correct: Boolean(r.correct !== undefined ? r.correct : r.is_correct),
            }));
          }

          let matchingPairs = [];
          if (extra.pairs && Array.isArray(extra.pairs)) {
            matchingPairs = extra.pairs.map((p) => ({
              left: p.left || '',
              right: p.right || '',
            }));
          }

          const opts = (q.options || []).map((opt, oIdx) => ({
            id: opt.id || `opt-${idx}-${oIdx}`,
            label: opt.option_label || opt.label || String.fromCharCode(65 + oIdx),
            text: opt.option_text || opt.text || '',
            imageUrl: opt.image_url || opt.imageUrl || '',
            isCorrect: Boolean(opt.is_correct || opt.isCorrect),
          }));

          const correctOption = opts.find((o) => o.isCorrect)?.label || opts[0]?.label || 'A';
          const correctOptions = opts.filter((o) => o.isCorrect).map((o) => o.label);

          return {
            id: q.id || `q-${idx}`,
            questionType: qType,
            questionText: q.text || q.questionText || '',
            imageUrl: q.image_url || q.imageUrl || '',
            points: Number(q.points) || 20,
            options: opts,
            correctOption,
            correctOptions: correctOptions.length > 0 ? correctOptions : ['A'],
            exactKeys,
            matrixRows,
            matchingPairs,
          };
        })
      );
    } else {
      setQuestions([
        {
          id: `q-${Date.now()}-1`,
          questionType: 'MULTIPLE_CHOICE',
          questionText: '',
          imageUrl: '',
          points: 20,
          options: [
            { id: `opt-1`, label: 'A', text: '', imageUrl: '' },
            { id: `opt-2`, label: 'B', text: '', imageUrl: '' },
            { id: `opt-3`, label: 'C', text: '', imageUrl: '' },
            { id: `opt-4`, label: 'D', text: '', imageUrl: '' },
          ],
          correctOption: 'A',
          correctOptions: ['A'],
          exactKeys: '',
          matrixRows: [],
          matchingPairs: [],
        },
      ]);
    }
    setActiveFormulaTarget(null);
    setIsAddModalOpen(true);
  };

  const handleOpenImportModal = (targetPkgId = null) => {
    setImportTargetPkgId(targetPkgId || '');
    setImportFile(null);
    setImportFormat('EXCEL');
    setImportTitle('');
    setImportSubject('');
    setImportMessage('');
    setIsImportModalOpen(true);
  };

  const handleExecuteImport = async (e) => {
    e.preventDefault();
    if (!importFile) {
      alert('Mohon pilih berkas soal Word (.docx) atau Excel (.xlsx) terlebih dahulu.');
      return;
    }

    setIsImporting(true);
    setImportMessage('');

    try {
      let res;
      if (importFormat === 'DOCX') {
        res = await importDocxQuestionsApi(importFile, importTargetPkgId || null, importTitle, importSubject);
      } else {
        res = await importExcelQuestionsApi(importFile, importTargetPkgId || null, importTitle, importSubject);
      }

      alert(res.message || 'Import soal massal berhasil diproses!');
      setIsImportModalOpen(false);
      await fetchPackages?.();
    } catch (err) {
      const errMsg = err.response?.data?.error || err.response?.data?.detail || err.message;
      setImportMessage(`Gagal import: ${errMsg}`);
    } finally {
      setIsImporting(false);
    }
  };

  const handleDeletePackage = async (pkgId, pkgTitle) => {
    if (window.confirm(`Yakin ingin menghapus paket "${pkgTitle}"? Seluruh butir soal di dalamnya akan dihapus.`)) {
      try {
        await deletePackageApi(pkgId);
        await fetchPackages?.();
        alert(`Paket "${pkgTitle}" berhasil dihapus.`);
      } catch (err) {
        alert('Gagal menghapus paket: ' + (err.response?.data?.detail || err.message));
      }
    }
  };

  const handleSavePackage = async (e) => {
    e.preventDefault();

    if (!title.trim() || !subjectName.trim()) {
      alert('Mohon isi Judul Paket dan Nama Mata Pelajaran.');
      return;
    }

    if (examType === 'EXTERNAL_LINK') {
      if (!rawExternalUrl.trim()) {
        alert('Mohon masukkan tautan soal Google Form atau Microsoft Teams.');
        return;
      }
      try {
        if (isEditing) {
          await updatePackageApi(editingPackageId, {
            title,
            subject_name: subjectName,
            exam_type: 'EXTERNAL_LINK',
            external_url: formattedEmbedUrl,
          });
        } else {
          await createPackageApi({
            title,
            subject_name: subjectName,
            exam_type: 'EXTERNAL_LINK',
            external_url: formattedEmbedUrl,
            questions: [],
          });
        }
      } catch (err) {
        console.warn('Backend package save fallback:', err);
      }

      addExamPackage({
        title,
        subjectName,
        examType: 'EXTERNAL_LINK',
        targetClassroom,
        externalUrl: formattedEmbedUrl,
        questions: [],
      });
    } else {
      const hasEmptyQuestion = questions.some((q) => !q.questionText?.trim() && !q.imageUrl);
      if (hasEmptyQuestion) {
        alert('Mohon lengkapi teks pertanyaan atau lampirkan gambar pada setiap butir soal.');
        return;
      }

      const hasInvalidOption = questions.some(
        (q) =>
          (q.questionType === 'MULTIPLE_CHOICE' || q.questionType === 'MULTIPLE_CHOICE_COMPLEX') &&
          (q.options || []).some((opt) => !opt.text?.trim() && !opt.imageUrl)
      );
      if (hasInvalidOption) {
        alert('Setiap opsi pilihan ganda wajib memiliki teks atau lampiran gambar.');
        return;
      }

      const questionsPayload = questions.map((q, idx) => {
        const extraData = {};
        let options = [];

        if (q.questionType === 'MULTIPLE_CHOICE') {
          options = (q.options || []).map((opt) => ({
            option_label: opt.label,
            option_text: opt.text?.trim() || '',
            text: opt.text?.trim() || '',
            image_url: opt.imageUrl || null,
            imageUrl: opt.imageUrl || null,
            is_correct: opt.label === q.correctOption,
          }));
        } else if (q.questionType === 'MULTIPLE_CHOICE_COMPLEX') {
          const correctSet = new Set(q.correctOptions || []);
          options = (q.options || []).map((opt) => ({
            option_label: opt.label,
            option_text: opt.text?.trim() || '',
            text: opt.text?.trim() || '',
            image_url: opt.imageUrl || null,
            imageUrl: opt.imageUrl || null,
            is_correct: correctSet.has(opt.label),
          }));
        } else if (q.questionType === 'SHORT_ANSWER') {
          const rawKeys = q.exactKeys || '';
          extraData.exact_keys = rawKeys
            .split('/')
            .map((s) => s.trim())
            .filter(Boolean);
        } else if (q.questionType === 'TRUE_FALSE_MATRIX') {
          extraData.rows = (q.matrixRows || []).map((r) => ({
            statement: r.statement,
            correct: Boolean(r.correct),
          }));
        } else if (q.questionType === 'MATCHING_PAIR') {
          extraData.pairs = (q.matchingPairs || []).map((p) => ({
            left: p.left,
            right: p.right,
          }));
        }

        return {
          question_type: q.questionType,
          question_text: q.questionText,
          text: q.questionText,
          image_url: q.imageUrl || null,
          imageUrl: q.imageUrl || null,
          points: Number(q.points) || 20,
          order_number: idx + 1,
          order: idx + 1,
          options,
          extra_data: extraData,
        };
      });

      try {
        if (isEditing) {
          await updatePackageApi(editingPackageId, {
            title,
            subject_name: subjectName,
            exam_type: 'NATIVE_QUESTIONS',
            questions: questionsPayload,
          });
        } else {
          await createPackageApi({
            title,
            subject_name: subjectName,
            exam_type: 'NATIVE_QUESTIONS',
            questions: questionsPayload,
          });
        }
      } catch (err) {
        console.error('Backend package save error:', err);
        const errMsg = err.response?.data?.error || err.response?.data?.detail || JSON.stringify(err.response?.data) || err.message;
        alert('Perhatian: Gagal menyimpan paket ke server: ' + errMsg);
      }

      addExamPackage({
        title,
        subjectName,
        examType: 'NATIVE_QUESTIONS',
        targetClassroom,
        questions,
      });
    }

    setTitle('');
    setSubjectName('');
    setRawExternalUrl('');
    setIsEditing(false);
    setEditingPackageId(null);
    setIsAddModalOpen(false);
    await fetchPackages?.();
    alert(`Paket Ujian Berhasil ${isEditing ? 'Diperbarui' : 'Dibuat'} dan Disimpan ke Sistem!`);
  };

  const handleOpenPreview = (url) => {
    setPreviewUrl(url);
    setIsPreviewModalOpen(true);
  };

  const handleOpenNativePreview = async (pkg) => {
    setIsLoadingPreview(true);
    setPreviewPackage(pkg);
    setIsNativePreviewOpen(true);
    try {
      const freshPkg = await getPackageDetailApi(pkg.id);
      if (freshPkg) {
        setPreviewPackage(freshPkg);
      }
    } catch (err) {
      console.warn('Gagal memuat detail paket soal untuk pratinjau:', err);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const typeLabels = {
    MULTIPLE_CHOICE: 'Pilihan Ganda (1 Benar)',
    MULTIPLE_CHOICE_COMPLEX: 'Pilihan Ganda Kompleks (Multi-Centang)',
    SHORT_ANSWER: 'Isian Singkat (Exact Match)',
    TRUE_FALSE_MATRIX: 'Tabel Benar / Salah',
    MATCHING_PAIR: 'Menjodohkan Pasangan',
    ESSAY: 'Uraian / Esai',
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* ======================================================== */}
      {/* 1. HEADER HALAMAN BANK SOAL & AKSI (CLEAN & TASTEFUL)    */}
      {/* ======================================================== */}
      <div className="bg-[#EFF9CE] rounded-3xl p-5 sm:p-6 border-2 border-[#8BC829] shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <span className="p-2.5 rounded-2xl bg-[#E2F4B4] text-[#102919] border-2 border-[#8BC829] shadow-xs">
                <FolderKanban className="w-5 h-5 text-[#102919]" />
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-[#102919] tracking-tight">
                Bank Soal & Paket Ujian
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-[#102919]/80 max-w-2xl leading-relaxed font-medium">
              Kelola lembar asesmen mandiri berstandar Kurikulum Merdeka (AKM/ANBK 6 tipe soal), editor rumus matematika KaTeX, fasilitas impor massal Word & Excel, serta integrasi Google Form.
            </p>
          </div>

          {/* Action Buttons Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
            {/* Tombol Unduh Template Excel */}
            <button
              type="button"
              onClick={handleDownloadExcelTemplate}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-[#E2F4B4] hover:bg-[#d6f0a3] text-[#102919] border-2 border-[#8BC829] rounded-xl text-xs font-black hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-150 shadow-xs cursor-pointer"
              title="Unduh format template Excel resmi untuk impor soal"
            >
              <Download className="w-3.5 h-3.5 text-[#102919]" />
              <span className="hidden sm:inline">Template Excel</span>
              <span className="sm:hidden">Unduh Template</span>
            </button>

            {/* Tombol Impor Soal Massal */}
            <button
              type="button"
              onClick={() => handleOpenImportModal(null)}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-[#E2F4B4] hover:bg-[#d6f0a3] text-[#102919] border-2 border-[#8BC829] rounded-xl text-xs font-black hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-150 shadow-xs cursor-pointer"
              title="Import butir soal dari berkas Word (.docx) atau Excel (.xlsx)"
            >
              <UploadCloud className="w-3.5 h-3.5 text-[#102919]" />
              <span>Import Soal (.docx / .xlsx)</span>
            </button>

            {/* Tombol Utama Tambah Paket Baru */}
            <button
              onClick={handleOpenAdd}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#C3E956] hover:bg-[#b8e337] text-[#0A1D11] rounded-xl text-xs font-black hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-150 shadow-sm border-2 border-[#4D7111]/30 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-[#0A1D11] stroke-[2.5]" />
              <span>Tambah Paket Baru</span>
            </button>
          </div>
        </div>

        {/* Filter Bar & Search Box */}
        <div className="pt-3 border-t-2 border-[#8BC829]/40 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Tab Filter Tipe Paket */}
          <div className="inline-flex items-center gap-1 p-1 bg-[#E2F4B4] rounded-2xl border-2 border-[#8BC829] overflow-x-auto">
            <button
              type="button"
              onClick={() => setTypeFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs transition shrink-0 cursor-pointer ${
                typeFilter === 'ALL'
                  ? 'bg-[#102919] text-[#C3E956] shadow-xs font-black'
                  : 'text-[#102919] hover:bg-[#EFF9CE] font-bold'
              }`}
            >
              Semua Paket ({examPackages.length})
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('NATIVE_QUESTIONS')}
              className={`px-3 py-1.5 rounded-xl text-xs transition shrink-0 flex items-center gap-1.5 cursor-pointer ${
                typeFilter === 'NATIVE_QUESTIONS'
                  ? 'bg-[#102919] text-[#C3E956] shadow-xs font-black'
                  : 'text-[#102919] hover:bg-[#EFF9CE] font-bold'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#C3E956]" />
              Soal Mandiri (AKM)
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('EXTERNAL_LINK')}
              className={`px-3 py-1.5 rounded-xl text-xs transition shrink-0 flex items-center gap-1.5 cursor-pointer ${
                typeFilter === 'EXTERNAL_LINK'
                  ? 'bg-[#102919] text-[#C3E956] shadow-xs font-black'
                  : 'text-[#102919] hover:bg-[#EFF9CE] font-bold'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#91EAAF]" />
              Google Form / Teams
            </button>
          </div>

          {/* Search Box Input */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-[#102919]/60 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Cari judul atau mapel..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3 py-2 bg-[#F9FDEE] hover:bg-[#EFF9CE] border-2 border-[#8BC829] focus:border-[#102919] focus:ring-2 focus:ring-[#C3E956] rounded-xl text-xs font-bold text-[#102919] focus:outline-none transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-[#102919]/70 hover:text-[#102919]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. GRID KARTU PAKET UJIAN                                */}
      {/* ======================================================== */}
      {filteredPackages.length === 0 ? (
        <div className="py-14 sm:py-20 text-center bg-[#EFF9CE] rounded-3xl border-2 border-dashed border-[#8BC829] p-6 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#E2F4B4] text-[#102919] border-2 border-[#8BC829] flex items-center justify-center mx-auto">
            <FolderKanban className="w-6 h-6" />
          </div>
          <h3 className="font-black text-[#102919] text-base">
            {searchQuery ? 'Tidak Ada Paket yang Cocok' : 'Belum Ada Paket Soal'}
          </h3>
          <p className="text-xs text-[#102919]/70 max-w-sm mx-auto leading-relaxed font-medium">
            {searchQuery
              ? `Pencarian "${searchQuery}" tidak menemukan paket soal. Coba gunakan kata kunci lain.`
              : 'Mulai dengan membuat paket soal mandiri baru atau import massal dari berkas Word/Excel.'}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <button
              onClick={() => handleOpenImportModal(null)}
              className="px-4 py-2.5 bg-[#E2F4B4] text-[#102919] border-2 border-[#8BC829] font-black text-xs rounded-xl hover:bg-[#d6f0a3] transition flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <UploadCloud className="w-3.5 h-3.5 text-[#102919]" /> Import Word / Excel
            </button>
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2.5 bg-[#C3E956] text-[#0A1D11] border-2 border-[#4D7111]/30 font-black text-xs rounded-xl hover:bg-[#b8e337] transition flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Tambah Paket Baru
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredPackages.map((pkg) => {
            const pkgTitle = pkg.title;
            const pkgSubject = pkg.subjectName || pkg.subject_name || '-';
            const pkgExamType = pkg.examType || pkg.exam_type || 'NATIVE_QUESTIONS';
            const pkgClass = pkg.targetClassroom || pkg.target_classroom || '';
            const pkgUrl = pkg.externalUrl || pkg.external_url || '';
            const pkgDate = pkg.createdAt || pkg.created_at;
            const formattedDate = pkgDate ? new Date(pkgDate).toLocaleDateString('id-ID') : '-';
            const questionCount = pkg.questions?.length || 0;

            return (
              <div
                key={pkg.id}
                className="bg-[#EFF9CE] rounded-3xl p-5 sm:p-6 border-2 border-[#8BC829] hover:border-[#102919] border-t-4 border-t-[#102919] transition-all duration-200 flex flex-col justify-between space-y-4 group relative shadow-sm hover:shadow-md hover:-translate-y-0.5"
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span
                      className={`text-xs font-black px-2.5 py-1 rounded-xl border-2 flex items-center gap-1.5 shadow-xs ${
                        pkgExamType === 'NATIVE_QUESTIONS'
                          ? 'bg-[#E2F4B4] text-[#102919] border-[#8BC829]'
                          : 'bg-[#C3E956] text-[#0A1D11] border-[#4D7111]/30'
                      }`}
                    >
                      {pkgExamType === 'NATIVE_QUESTIONS' ? (
                        <>
                          <BookOpen className="w-3.5 h-3.5 text-[#102919] stroke-[2.5]" />
                          <span>Soal Mandiri (AKM)</span>
                        </>
                      ) : (
                        <>
                          <ExternalLink className="w-3.5 h-3.5 text-[#0A1D11] stroke-[2.5]" />
                          <span>Google Form</span>
                        </>
                      )}
                    </span>
                    {pkgClass && (
                      <span className="text-xs font-mono font-black px-2.5 py-1 rounded-xl bg-[#E2F4B4] text-[#102919] border-2 border-[#8BC829] uppercase shadow-xs">
                        {pkgClass}
                      </span>
                    )}
                  </div>

                  {/* Judul & Mapel */}
                  <h3 className="font-black text-[#102919] text-base sm:text-lg leading-snug mb-1.5 group-hover:text-[#1F4B2C] transition-colors">
                    {pkgTitle}
                  </h3>
                  <div className="text-xs text-[#102919]/80 font-bold mb-3.5">
                    Mata Pelajaran: <span className="text-[#102919] font-black">{pkgSubject}</span>
                  </div>

                  {/* Informasi Konten Soal */}
                  {pkgExamType === 'NATIVE_QUESTIONS' ? (
                    <div className="p-3.5 rounded-2xl bg-[#E2F4B4] border-2 border-[#8BC829] text-xs text-[#102919] space-y-2 mb-2 shadow-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[#102919] font-black uppercase tracking-wider text-[11px]">Jumlah Butir Soal:</span>
                        <span className="text-[#102919] font-mono font-black tabular-nums bg-[#F9FDEE] border border-[#8BC829] px-2.5 py-0.5 rounded-lg text-xs shadow-xs">
                          {questionCount} Soal
                        </span>
                      </div>
                      <div className="text-[11px] text-[#102919]/80 font-medium leading-relaxed">
                        Mendukung Pilgan Kompleks, Isian Singkat, Benar/Salah, Menjodohkan & Rumus KaTeX.
                      </div>
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-2xl bg-[#E2F4B4] border-2 border-[#8BC829] text-xs text-[#102919] space-y-2 mb-2 shadow-xs">
                      <div className="font-black flex items-center gap-1.5 text-[#102919] text-xs uppercase tracking-wider">
                        <ExternalLink className="w-3.5 h-3.5 text-[#102919] stroke-[2.5]" />
                        <span>Link Terproteksi (Secure Iframe):</span>
                      </div>
                      <div className="font-mono text-xs font-bold text-[#102919] truncate bg-[#F9FDEE] p-2.5 rounded-xl border border-[#8BC829] shadow-xs">
                        {pkgUrl || '-'}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Kartu & Tombol Aksi */}
                <div className="pt-3.5 border-t-2 border-[#8BC829]/40 flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs text-[#102919]/70 font-mono font-bold">
                    {formattedDate}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {pkgExamType === 'NATIVE_QUESTIONS' && (
                      <>
                        <button
                          onClick={() => handleOpenNativePreview(pkg)}
                          className="px-3 py-1.5 text-xs font-black text-[#102919] bg-[#E2F4B4] hover:bg-[#d6f0a3] border-2 border-[#8BC829] rounded-xl transition flex items-center gap-1 shadow-xs active:scale-[0.98] cursor-pointer"
                          title="Pratinjau Tampilan Soal Siswa"
                        >
                          <Eye className="w-3.5 h-3.5 text-[#102919]" />
                          <span>Preview</span>
                        </button>
                        <button
                          onClick={() => handleOpenImportModal(pkg.id)}
                          className="px-3 py-1.5 text-xs font-black text-[#102919] bg-[#E2F4B4] hover:bg-[#d6f0a3] border-2 border-[#8BC829] rounded-xl transition flex items-center gap-1 shadow-xs active:scale-[0.98] cursor-pointer"
                          title="Import butir soal tambahan ke paket ini"
                        >
                          <UploadCloud className="w-3.5 h-3.5 text-[#102919]" />
                          <span>+ Import</span>
                        </button>
                      </>
                    )}
                    {pkgExamType === 'EXTERNAL_LINK' && (
                      <button
                        onClick={() => handleOpenPreview(pkgUrl)}
                        className="px-3 py-1.5 text-xs font-black text-[#102919] bg-[#E2F4B4] hover:bg-[#d6f0a3] border-2 border-[#8BC829] rounded-xl transition flex items-center gap-1 shadow-xs active:scale-[0.98] cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-[#102919]" />
                        <span>Preview</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleOpenEdit(pkg)}
                      className="px-3 py-1.5 text-xs font-black text-[#102919] bg-[#E2F4B4] hover:bg-[#d6f0a3] border-2 border-[#8BC829] rounded-xl transition flex items-center gap-1 shadow-xs active:scale-[0.98] cursor-pointer"
                      title="Edit Data Paket Soal"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-[#102919]" />
                      <span>Edit</span>
                    </button>

                    <button
                      onClick={() => handleDeletePackage(pkg.id, pkgTitle)}
                      className="p-2 text-[#102919] hover:text-rose-700 bg-[#E2F4B4] hover:bg-rose-100 border-2 border-[#8BC829] hover:border-rose-300 rounded-xl transition active:scale-[0.98] cursor-pointer"
                      title="Hapus Paket Soal"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. MODAL IMPORT SOAL MASSAL (WORD .DOCX & EXCEL .XLSX)   */}
      {/* ======================================================== */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Import Butir Soal Massal (Word & Excel)"
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleExecuteImport} className="space-y-4">
          <div className="p-3.5 rounded-2xl bg-[#E2F4B4] border-2 border-[#8BC829] text-[#102919] text-xs leading-relaxed flex items-start gap-2.5">
            <Info className="w-4 h-4 text-[#4D7111] shrink-0 mt-0.5" />
            <div className="font-bold">
              Fitur ini mengekstrak nomor soal, narasi soal, rumus matematika KaTeX ($...$), pilihan jawaban A-E, dan penanda kunci jawaban secara otomatis ke dalam paket ujian.
            </div>
          </div>

          {/* Pemilihan Format Berkas */}
          <div>
            <label className="block text-xs font-black text-[#102919] uppercase tracking-wider mb-1.5">
              Pilih Format Berkas:
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setImportFormat('EXCEL')}
                className={`p-3 rounded-2xl border-2 text-left flex items-center gap-3 transition cursor-pointer ${
                  importFormat === 'EXCEL'
                    ? 'border-[#102919] bg-[#C3E956] text-[#0A1D11] font-black shadow-xs ring-2 ring-[#102919]'
                    : 'border-[#8BC829] bg-[#EFF9CE] text-[#102919] hover:bg-[#E2F4B4]'
                }`}
              >
                <FileSpreadsheet className="w-5 h-5 text-[#1F4B2C] shrink-0" />
                <div>
                  <div className="text-xs font-black">Microsoft Excel (.xlsx)</div>
                  <div className="text-[11px] text-[#102919]/70 font-bold">Format kolom terstruktur</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setImportFormat('DOCX')}
                className={`p-3 rounded-2xl border-2 text-left flex items-center gap-3 transition cursor-pointer ${
                  importFormat === 'DOCX'
                    ? 'border-[#102919] bg-[#C3E956] text-[#0A1D11] font-black shadow-xs ring-2 ring-[#102919]'
                    : 'border-[#8BC829] bg-[#EFF9CE] text-[#102919] hover:bg-[#E2F4B4]'
                }`}
              >
                <FileText className="w-5 h-5 text-[#1F4B2C] shrink-0" />
                <div>
                  <div className="text-xs font-black">Microsoft Word (.docx)</div>
                  <div className="text-[11px] text-[#102919]/70 font-bold">Format nomor standar</div>
                </div>
              </button>
            </div>
          </div>

          {/* Target Paket Ujian */}
          <div>
            <label className="block text-xs font-black text-[#102919] uppercase tracking-wider mb-1">
              Target Penyimpanan:
            </label>
            <select
              value={importTargetPkgId}
              onChange={(e) => setImportTargetPkgId(e.target.value)}
              className="w-full px-3 py-2 border-2 border-[#8BC829] rounded-xl text-xs bg-[#F9FDEE] focus:bg-[#EFF9CE] focus:outline-none focus:border-[#102919] text-[#102919] font-bold cursor-pointer"
            >
              <option value="">+ Buat Paket Ujian Baru dari Berkas Ini</option>
              {examPackages
                .filter((p) => (p.examType || p.exam_type) === 'NATIVE_QUESTIONS')
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    Tambahkan ke: {p.title} ({p.subjectName || p.subject_name})
                  </option>
                ))}
            </select>
          </div>

          {!importTargetPkgId && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-black text-[#102919] uppercase tracking-wider mb-1">
                  Judul Paket Baru:
                </label>
                <input
                  type="text"
                  value={importTitle}
                  onChange={(e) => setImportTitle(e.target.value)}
                  placeholder="Contoh: Asesmen Sumatif IPA"
                  className="w-full px-3 py-2 border-2 border-[#8BC829] rounded-xl text-xs bg-[#F9FDEE] focus:bg-[#EFF9CE] focus:outline-none focus:border-[#102919] text-[#102919] font-bold placeholder-[#102919]/40"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-[#102919] uppercase tracking-wider mb-1">
                  Mata Pelajaran:
                </label>
                <input
                  type="text"
                  value={importSubject}
                  onChange={(e) => setImportSubject(e.target.value)}
                  placeholder="Contoh: Ilmu Pengetahuan Alam"
                  className="w-full px-3 py-2 border-2 border-[#8BC829] rounded-xl text-xs bg-[#F9FDEE] focus:bg-[#EFF9CE] focus:outline-none focus:border-[#102919] text-[#102919] font-bold placeholder-[#102919]/40"
                />
              </div>
            </div>
          )}

          {/* Upload Input */}
          <div>
            <label className="block text-xs font-black text-[#102919] uppercase tracking-wider mb-1">
              Pilih Berkas {importFormat === 'DOCX' ? 'Word (.docx)' : 'Excel (.xlsx)'}:
            </label>
            <input
              type="file"
              required
              accept={importFormat === 'DOCX' ? '.docx' : '.xlsx,.xlsm'}
              onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              className="w-full text-xs text-[#102919] font-bold file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-2 file:border-[#4D7111]/30 file:text-xs file:font-black file:bg-[#C3E956] file:text-[#0A1D11] hover:file:bg-[#b8e337] cursor-pointer border-2 border-[#8BC829] rounded-xl p-1.5 bg-[#F9FDEE]"
            />
          </div>

          {importFormat === 'EXCEL' && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#E2F4B4] border-2 border-[#8BC829] text-xs">
              <span className="text-[#102919] font-bold">Belum memiliki format template Excel?</span>
              <button
                type="button"
                onClick={handleDownloadExcelTemplate}
                className="text-[#1F4B2C] hover:text-[#4D7111] font-black underline flex items-center gap-1 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" /> Unduh Template
              </button>
            </div>
          )}

          {importMessage && (
            <div className="p-3 rounded-xl bg-rose-100 border-2 border-rose-300 text-rose-800 text-xs font-black">
              {importMessage}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t-2 border-[#8BC829]/30">
            <button
              type="button"
              onClick={() => setIsImportModalOpen(false)}
              className="px-3.5 py-2 border-2 border-[#8BC829] rounded-xl text-xs font-black text-[#102919] bg-[#E2F4B4] hover:bg-[#d6f0a3] transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isImporting}
              className="px-4 py-2 bg-[#C3E956] hover:bg-[#b8e337] disabled:opacity-50 text-[#0A1D11] rounded-xl text-xs font-black border-2 border-[#4D7111]/30 shadow-xs transition flex items-center gap-1.5 hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer"
            >
              {isImporting ? (
                <span>Mengekstrak Soal...</span>
              ) : (
                <>
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Mulai Import Soal</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* ======================================================== */}
      {/* 4. MODAL BUAT / EDIT PAKET UJIAN BARU (TASTE-SKILL SPEC) */}
      {/* ======================================================== */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={isEditing ? 'Edit Data Paket Ujian' : 'Buat Paket Ujian Baru (Hybrid Mode)'}
        maxWidth="max-w-5xl"
      >
        <form onSubmit={handleSavePackage} className="space-y-5">
          {/* SECTION A: SUMBER SOAL & IDENTITAS PAKET */}
          <div className="bg-[#E2F4B4] rounded-2xl p-4 sm:p-5 border-2 border-[#8BC829] space-y-4">
            {/* Pilihan Sumber Soal */}
            <div>
              <label className="block text-[11px] font-black uppercase text-[#102919] tracking-wider mb-2">
                1. Pilih Sumber Soal Ujian:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setExamType('NATIVE_QUESTIONS')}
                  className={`p-3.5 rounded-2xl border-2 text-left transition flex items-start gap-3 cursor-pointer ${
                    examType === 'NATIVE_QUESTIONS'
                      ? 'border-[#102919] bg-[#C3E956] text-[#0A1D11] shadow-xs ring-2 ring-[#102919]'
                      : 'border-[#8BC829] bg-[#EFF9CE] text-[#102919] hover:bg-[#E2F4B4]'
                  }`}
                >
                  <div
                    className={`p-2 rounded-xl shrink-0 ${
                      examType === 'NATIVE_QUESTIONS'
                        ? 'bg-[#102919] text-[#C3E956]'
                        : 'bg-[#E2F4B4] text-[#102919]'
                    }`}
                  >
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-black text-xs sm:text-sm text-[#102919]">Soal Mandiri (Standar AKM)</div>
                    <div className="text-[11px] text-[#102919]/70 mt-0.5 leading-relaxed font-bold">
                      6 ragam soal (Pilgan, Kompleks, Isian, Benar/Salah, Menjodohkan, Esai) & rumus KaTeX
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setExamType('EXTERNAL_LINK')}
                  className={`p-3.5 rounded-2xl border-2 text-left transition flex items-start gap-3 cursor-pointer ${
                    examType === 'EXTERNAL_LINK'
                      ? 'border-[#102919] bg-[#C3E956] text-[#0A1D11] shadow-xs ring-2 ring-[#102919]'
                      : 'border-[#8BC829] bg-[#EFF9CE] text-[#102919] hover:bg-[#E2F4B4]'
                  }`}
                >
                  <div
                    className={`p-2 rounded-xl shrink-0 ${
                      examType === 'EXTERNAL_LINK'
                        ? 'bg-[#102919] text-[#C3E956]'
                        : 'bg-[#E2F4B4] text-[#102919]'
                    }`}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-black text-xs sm:text-sm text-[#102919]">Google Form / MS Teams</div>
                    <div className="text-[11px] text-[#102919]/70 mt-0.5 leading-relaxed font-bold">
                      Sematkan tautan form eksternal dalam bingkai terproteksi anti-curang
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Input Identitas Paket */}
            <div>
              <label className="block text-[11px] font-black uppercase text-[#102919] tracking-wider mb-2">
                2. Informasi Paket Asesmen:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-black text-[#102919] mb-1">
                    Judul Paket Ujian *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Contoh: Asesmen Sumatif Tengah Semester"
                    className="w-full px-3 py-2 bg-[#F9FDEE] border-2 border-[#8BC829] rounded-xl text-xs sm:text-sm font-bold text-[#102919] placeholder-[#102919]/40 focus:bg-[#EFF9CE] focus:outline-none focus:border-[#102919]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black text-[#102919] mb-1">
                    Mata Pelajaran *
                  </label>
                  <input
                    type="text"
                    required
                    value={subjectName}
                    onChange={(e) => setSubjectName(e.target.value)}
                    placeholder="Contoh: Ilmu Pengetahuan Alam"
                    className="w-full px-3 py-2 bg-[#F9FDEE] border-2 border-[#8BC829] rounded-xl text-xs sm:text-sm font-bold text-[#102919] placeholder-[#102919]/40 focus:bg-[#EFF9CE] focus:outline-none focus:border-[#102919]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SECTION B1: FORMULIR LINK GOOGLE FORM / TEAMS */}
          {examType === 'EXTERNAL_LINK' && (
            <div className="p-4 sm:p-5 rounded-2xl bg-[#E2F4B4] border-2 border-[#8BC829] space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-[#102919] tracking-wider">
                  Pengaturan Formulir Online
                </span>
                <span className="text-[11px] font-black text-[#102919] bg-[#C3E956] px-2 py-0.5 rounded-lg border border-[#4D7111]/30">
                  Secure Iframe Protected
                </span>
              </div>

              <div>
                <label className="block text-xs font-black text-[#102919] mb-1.5">
                  Tempelkan URL Google Form atau Microsoft Forms:
                </label>
                <input
                  type="url"
                  required
                  value={rawExternalUrl}
                  onChange={(e) => setRawExternalUrl(e.target.value)}
                  placeholder="https://docs.google.com/forms/d/e/.../viewform"
                  className="w-full px-3 py-2 border-2 border-[#8BC829] rounded-xl text-xs sm:text-sm font-mono focus:outline-none focus:border-[#102919] bg-[#F9FDEE] text-[#102919]"
                />
              </div>

              {rawExternalUrl && (
                <div className="p-3 rounded-xl bg-[#EFF9CE] border-2 border-[#8BC829] text-xs space-y-2">
                  <div className="text-[11px] text-[#102919]/70 font-bold">
                    Hasil Konversi Sematan Otomatis (Embedded Mode):
                  </div>
                  <div className="font-mono text-[#102919] text-xs truncate bg-[#F9FDEE] p-2 rounded-xl border border-[#8BC829]">
                    {formattedEmbedUrl}
                  </div>
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => handleOpenPreview(formattedEmbedUrl)}
                      className="px-3.5 py-1.5 bg-[#C3E956] hover:bg-[#b8e337] text-[#0A1D11] border-2 border-[#4D7111]/30 rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-2xs hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" /> Uji Tampilan Formulir
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SECTION B2: BUILDER BUTIR SOAL MANDIRI */}
          {examType === 'NATIVE_QUESTIONS' && (
            <div className="space-y-4">
              {/* Header Bar Pertanyaan & Toolbar Tambah Soal Responsif */}
              <div className="bg-[#E2F4B4] rounded-2xl p-4 border-2 border-[#8BC829] shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-xs font-black text-[#102919] uppercase tracking-wider">
                      Daftar Butir Soal ({questions.length} Butir)
                    </span>
                    <div
                      className={`px-2.5 py-0.5 rounded-xl text-xs font-mono font-black border-2 flex items-center gap-1.5 ${
                        totalPoints === 100
                          ? 'bg-[#C3E956] text-[#0A1D11] border-[#4D7111]/40'
                          : 'bg-[#EFF9CE] text-[#102919] border-[#8BC829]'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Total: {totalPoints} Poin</span>
                      {totalPoints === 100 && (
                        <span className="text-[10px] text-[#102919] font-black ml-0.5">✓ 100 Standar</span>
                      )}
                    </div>
                  </div>

                  {/* Dropdown Tambah Soal Cepat */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsTypeDropdownOpen((prev) => !prev)}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-[#C3E956] hover:bg-[#b8e337] text-[#0A1D11] rounded-xl text-xs font-black border-2 border-[#4D7111]/30 shadow-xs transition hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Tambah Butir Soal</span>
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>

                    {isTypeDropdownOpen && (
                      <div className="absolute right-0 mt-2 w-72 bg-[#EFF9CE] rounded-2xl shadow-xl border-2 border-[#8BC829] p-2 z-50">
                        <div className="px-2 py-1 text-[10px] font-black uppercase text-[#102919]/70 tracking-wider">
                          Pilih Ragam Format Soal:
                        </div>
                        <div className="space-y-0.5">
                          <button
                            type="button"
                            onClick={() => handleAddQuestion('MULTIPLE_CHOICE')}
                            className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-bold text-[#102919] hover:bg-[#E2F4B4] transition flex items-center gap-2 cursor-pointer"
                          >
                            <span className="w-2 h-2 rounded-full bg-[#102919]" />
                            <span>1. Pilihan Ganda (1 Benar)</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAddQuestion('MULTIPLE_CHOICE_COMPLEX')}
                            className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-bold text-[#102919] hover:bg-[#E2F4B4] transition flex items-center gap-2 cursor-pointer"
                          >
                            <CheckSquare className="w-3.5 h-3.5 text-[#1F4B2C]" />
                            <span>2. Pilgan Kompleks (Multi-Centang)</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAddQuestion('SHORT_ANSWER')}
                            className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-bold text-[#102919] hover:bg-[#E2F4B4] transition flex items-center gap-2 cursor-pointer"
                          >
                            <ListOrdered className="w-3.5 h-3.5 text-[#4D7111]" />
                            <span>3. Isian Singkat (Exact Match)</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAddQuestion('TRUE_FALSE_MATRIX')}
                            className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-bold text-[#102919] hover:bg-[#E2F4B4] transition flex items-center gap-2 cursor-pointer"
                          >
                            <Grid className="w-3.5 h-3.5 text-amber-700" />
                            <span>4. Tabel Benar / Salah</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAddQuestion('MATCHING_PAIR')}
                            className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-bold text-[#102919] hover:bg-[#E2F4B4] transition flex items-center gap-2 cursor-pointer"
                          >
                            <GitCompare className="w-3.5 h-3.5 text-[#1F4B2C]" />
                            <span>5. Menjodohkan Pasangan</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAddQuestion('ESSAY')}
                            className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-bold text-[#102919] hover:bg-[#E2F4B4] transition flex items-center gap-2 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5 text-[#102919]" />
                            <span>6. Uraian / Esai Terstruktur</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Add Pills Bar */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                  <span className="text-[11px] font-black text-[#102919] shrink-0 mr-1 hidden sm:inline">
                    Pintasan:
                  </span>
                  <button
                    type="button"
                    onClick={() => handleAddQuestion('MULTIPLE_CHOICE')}
                    className="px-2.5 py-1 bg-[#EFF9CE] hover:bg-[#d6f0a3] rounded-xl font-black text-[11px] text-[#102919] border-2 border-[#8BC829] transition shrink-0 cursor-pointer"
                  >
                    + Pilgan
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddQuestion('MULTIPLE_CHOICE_COMPLEX')}
                    className="px-2.5 py-1 bg-[#EFF9CE] hover:bg-[#d6f0a3] rounded-xl font-black text-[11px] text-[#102919] border-2 border-[#8BC829] transition shrink-0 cursor-pointer"
                  >
                    + Kompleks
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddQuestion('SHORT_ANSWER')}
                    className="px-2.5 py-1 bg-[#EFF9CE] hover:bg-[#d6f0a3] rounded-xl font-black text-[11px] text-[#102919] border-2 border-[#8BC829] transition shrink-0 cursor-pointer"
                  >
                    + Isian Singkat
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddQuestion('TRUE_FALSE_MATRIX')}
                    className="px-2.5 py-1 bg-[#EFF9CE] hover:bg-[#d6f0a3] rounded-xl font-black text-[11px] text-[#102919] border-2 border-[#8BC829] transition shrink-0 cursor-pointer"
                  >
                    + Benar/Salah
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddQuestion('MATCHING_PAIR')}
                    className="px-2.5 py-1 bg-[#EFF9CE] hover:bg-[#d6f0a3] rounded-xl font-black text-[11px] text-[#102919] border-2 border-[#8BC829] transition shrink-0 cursor-pointer"
                  >
                    + Menjodohkan
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddQuestion('ESSAY')}
                    className="px-2.5 py-1 bg-[#EFF9CE] hover:bg-[#d6f0a3] rounded-xl font-black text-[11px] text-[#102919] border-2 border-[#8BC829] transition shrink-0 cursor-pointer"
                  >
                    + Esai
                  </button>
                </div>
              </div>

              {/* Loop Kartu Butir Soal */}
              <div className="space-y-4">
                {questions.map((q, idx) => {
                  return (
                    <div
                      key={q.id}
                      className="p-4 sm:p-5 rounded-2xl border-2 border-[#8BC829] bg-[#EFF9CE] shadow-xs space-y-3.5"
                    >
                      {/* Bar Atas Kartu Soal */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b-2 border-[#8BC829]/30">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-xl bg-[#102919] text-[#C3E956] font-mono font-black text-xs flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <span className="text-xs font-black text-[#102919]">
                            {typeLabels[q.questionType] || q.questionType}
                          </span>
                        </div>

                        {/* Kontrol Kanan Kartu Soal */}
                        <div className="flex items-center justify-between sm:justify-end gap-2 flex-wrap">
                          {/* Tombol KaTeX */}
                          <button
                            type="button"
                            onClick={() => {
                              if (activeFormulaTarget?.qIdx === idx && activeFormulaTarget?.field === 'questionText') {
                                setActiveFormulaTarget(null);
                              } else {
                                setActiveFormulaTarget({ qIdx: idx, field: 'questionText' });
                              }
                            }}
                            className={`px-2.5 py-1 rounded-xl text-[11px] font-black transition flex items-center gap-1 border-2 cursor-pointer ${
                              activeFormulaTarget?.qIdx === idx && activeFormulaTarget?.field === 'questionText'
                                ? 'bg-[#102919] text-[#C3E956] border-[#102919]'
                                : 'bg-[#E2F4B4] text-[#102919] border-[#8BC829] hover:bg-[#d6f0a3]'
                            }`}
                          >
                            <Sigma className="w-3.5 h-3.5" />
                            <span>Rumus KaTeX</span>
                          </button>

                          {/* Input Poin */}
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#E2F4B4] border-2 border-[#8BC829] text-xs">
                            <span className="text-[#102919] font-black">Poin:</span>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={q.points}
                              onChange={(e) => handlePointsChange(idx, e.target.value)}
                              className="w-12 px-1 py-0.5 border border-[#8BC829] rounded-lg text-center font-mono font-black text-[#102919] focus:outline-none focus:border-[#102919] bg-[#F9FDEE]"
                            />
                          </div>

                          <div className="flex items-center gap-1">
                            {/* Duplikat */}
                            <button
                              type="button"
                              onClick={() => handleDuplicateQuestion(idx)}
                              className="p-1.5 text-[#102919] hover:bg-[#E2F4B4] rounded-xl border border-transparent hover:border-[#8BC829] transition cursor-pointer"
                              title="Duplikat Soal"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>

                            {/* Hapus */}
                            <button
                              type="button"
                              onClick={() => handleRemoveQuestion(idx)}
                              className="p-1.5 text-rose-700 hover:bg-rose-100 rounded-xl border border-transparent hover:border-rose-300 transition cursor-pointer"
                              title="Hapus Soal"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Formula Toolbar Inline */}
                      {activeFormulaTarget?.qIdx === idx && (
                        <div className="p-3 rounded-2xl bg-[#E2F4B4] border-2 border-[#8BC829]">
                          <FormulaToolbar onInsertFormula={handleInsertFormula} />
                        </div>
                      )}

                      {/* Textarea Pertanyaan & Gambar */}
                      <div className="space-y-2">
                        <div className="relative">
                          <textarea
                            rows={3}
                            required={!q.imageUrl}
                            value={q.questionText}
                            onChange={(e) => handleQuestionTextChange(idx, e.target.value)}
                            placeholder={q.imageUrl ? "Tuliskan teks pertanyaan soal di sini... (opsional jika sudah ada gambar)" : "Tuliskan teks pertanyaan soal di sini... (Mendukung rumus KaTeX diapit tanda $...$)"}
                            className="w-full px-3 py-2 pr-10 border-2 border-[#8BC829] rounded-xl text-xs sm:text-sm focus:outline-none focus:border-[#102919] bg-[#F9FDEE] text-[#102919] leading-relaxed placeholder:text-[#102919]/40 font-medium"
                          />

                          <label
                            className="absolute right-2.5 top-2.5 p-1 text-[#102919]/60 hover:text-[#102919] hover:bg-[#E2F4B4] rounded-lg cursor-pointer transition"
                            title="Sisipkan Gambar pada Soal"
                          >
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                if (e.target.files?.[0]) {
                                  handleQuestionImageUpload(idx, e.target.files[0]);
                                }
                              }}
                            />
                            <ImageIcon className="w-4 h-4" />
                          </label>
                        </div>

                        {/* KaTeX Live Math Preview */}
                        {q.questionText && q.questionText.includes('$') && (
                          <div className="p-3 rounded-xl bg-[#E2F4B4] border-2 border-[#8BC829] text-xs text-[#102919]">
                            <span className="text-[10px] font-black text-[#102919]/70 block mb-1">
                              Pratinjau Tipografi Rumus (KaTeX):
                            </span>
                            <MathText text={q.questionText} />
                          </div>
                        )}

                        {/* Pratinjau Gambar Soal */}
                        {q.imageUrl && (
                          <div className="relative inline-block border-2 border-[#8BC829] rounded-2xl p-2 bg-[#F9FDEE] shadow-2xs">
                            <img
                              src={resolveImageUrl(q.imageUrl)}
                              alt="Gambar Soal"
                              className="max-h-48 rounded-xl object-contain border border-[#8BC829] bg-[#EFF9CE]"
                              onError={handleImageErrorFallback}
                            />
                            <div className="flex items-center justify-between gap-2 pt-1.5 px-1">
                              <span className="text-[10px] text-[#102919]/70 font-mono font-bold">Gambar Terlampir</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveQuestionImage(idx)}
                                className="text-[11px] font-black text-rose-700 hover:underline flex items-center gap-1 cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" /> Hapus Gambar
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* SUB-FORM 1: PILIHAN GANDA BIASA (1 Benar) */}
                      {q.questionType === 'MULTIPLE_CHOICE' && (
                        <div className="space-y-2 pt-1">
                          <div className="text-[11px] font-black text-[#102919] flex items-center justify-between flex-wrap gap-1">
                            <span>Pilihan Jawaban (Klik lingkaran opsi untuk memilih 1 kunci jawaban benar):</span>
                            <span className="text-[#1F4B2C] font-black font-mono">Kunci: Opsi {q.correctOption}</span>
                          </div>

                          <div className="space-y-2">
                            {q.options.map((opt, optIdx) => {
                              const isCorrect = q.correctOption === opt.label;
                              return (
                                <div
                                  key={opt.id || opt.label}
                                  className="p-2.5 rounded-2xl bg-[#E2F4B4] border-2 border-[#8BC829] flex flex-col sm:flex-row sm:items-center gap-2 group hover:border-[#4D7111] transition"
                                >
                                  <div className="flex items-center gap-2 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => handleCorrectOptionChange(idx, opt.label)}
                                      className={`w-7 h-7 rounded-xl border-2 flex items-center justify-center transition shrink-0 text-xs font-mono font-black cursor-pointer ${
                                        isCorrect
                                          ? 'border-[#4D7111] bg-[#C3E956] text-[#0A1D11] shadow-2xs'
                                          : 'border-[#8BC829] hover:border-[#102919] bg-[#F9FDEE] text-[#102919]'
                                      }`}
                                      title={isCorrect ? 'Kunci Jawaban Benar' : 'Klik untuk jadikan Kunci Jawaban'}
                                    >
                                      {isCorrect ? <Check className="w-3.5 h-3.5 stroke-[2.5]" /> : opt.label}
                                    </button>
                                    <span className="sm:hidden font-black text-xs text-[#102919]">
                                      Pilihan {opt.label}
                                    </span>
                                  </div>

                                  <div className="flex-1 w-full relative flex items-center">
                                    <input
                                      type="text"
                                      required={!opt.imageUrl}
                                      value={opt.text}
                                      onChange={(e) => handleOptionTextChange(idx, optIdx, e.target.value)}
                                      placeholder={opt.imageUrl ? `(Opsi ${opt.label} Bergambar - teks opsional)` : `Teks pilihan ${opt.label}... (Mendukung rumus $...$)`}
                                      className="w-full pl-3 pr-8 py-1.5 border-2 border-[#8BC829] rounded-xl text-xs sm:text-sm bg-[#F9FDEE] text-[#102919] font-bold focus:outline-none focus:border-[#102919]"
                                    />
                                    <label
                                      className="absolute right-2 text-[#102919]/60 hover:text-[#102919] cursor-pointer p-0.5"
                                      title="Sisipkan Gambar pada Opsi ini"
                                    >
                                      <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => {
                                          if (e.target.files?.[0]) {
                                            handleOptionImageUpload(idx, optIdx, e.target.files[0]);
                                          }
                                        }}
                                      />
                                      <ImageIcon className="w-3.5 h-3.5" />
                                    </label>
                                  </div>

                                  <div className="flex items-center justify-end gap-1.5 shrink-0">
                                    {opt.imageUrl && (
                                      <div className="flex items-center gap-1 bg-[#EFF9CE] p-1 rounded-xl border border-[#8BC829]">
                                        <img
                                          src={resolveImageUrl(opt.imageUrl)}
                                          alt={`Gbr ${opt.label}`}
                                          className="h-6 w-6 object-contain rounded-lg bg-[#EFF9CE]"
                                          onError={handleImageErrorFallback}
                                        />
                                        <button
                                          type="button"
                                          onClick={() => handleRemoveOptionImage(idx, optIdx)}
                                          className="text-[10px] text-rose-700 font-bold hover:underline px-1 cursor-pointer"
                                        >
                                          Hapus Gbr
                                        </button>
                                      </div>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveOption(idx, optIdx)}
                                      className="p-1.5 text-rose-700 hover:bg-rose-100 rounded-xl transition cursor-pointer"
                                      title="Hapus Opsi ini"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleAddOption(idx)}
                            className="mt-1 px-3 py-1.5 text-xs font-black text-[#102919] bg-[#E2F4B4] hover:bg-[#d6f0a3] rounded-xl border-2 border-dashed border-[#8BC829] transition flex items-center gap-1.5 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" /> Tambahkan Opsi Pilihan ({String.fromCharCode(65 + q.options.length)})
                          </button>
                        </div>
                      )}

                      {/* SUB-FORM 2: PILIHAN GANDA KOMPLEKS (Multi-Centang) */}
                      {q.questionType === 'MULTIPLE_CHOICE_COMPLEX' && (
                        <div className="space-y-2 pt-1">
                          <div className="text-[11px] font-black text-[#102919] flex items-center justify-between flex-wrap gap-1">
                            <span>Pilihan Jawaban (Centang opsi untuk seluruh kunci jawaban yang benar):</span>
                            <span className="text-[#1F4B2C] font-black font-mono">
                              Kunci: {q.correctOptions?.join(', ') || '-'}
                            </span>
                          </div>

                          <div className="space-y-2">
                            {q.options.map((opt, optIdx) => {
                              const isChecked = q.correctOptions?.includes(opt.label);
                              return (
                                <div
                                  key={opt.id || opt.label}
                                  className="p-2.5 rounded-2xl bg-[#E2F4B4] border-2 border-[#8BC829] flex flex-col sm:flex-row sm:items-center gap-2 group hover:border-[#4D7111] transition"
                                >
                                  <div className="flex items-center gap-2 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => handleToggleComplexOption(idx, opt.label)}
                                      className={`w-7 h-7 rounded-xl border-2 flex items-center justify-center transition shrink-0 text-xs font-mono font-black cursor-pointer ${
                                        isChecked
                                          ? 'border-[#4D7111] bg-[#C3E956] text-[#0A1D11] shadow-2xs'
                                          : 'border-[#8BC829] hover:border-[#102919] bg-[#F9FDEE] text-[#102919]'
                                      }`}
                                      title={isChecked ? 'Hapus dari Kunci Jawaban' : 'Jadikan Kunci Jawaban'}
                                    >
                                      {isChecked ? <Check className="w-3.5 h-3.5 stroke-[2.5]" /> : opt.label}
                                    </button>
                                    <span className="sm:hidden font-black text-xs text-[#102919]">
                                      Pilihan {opt.label}
                                    </span>
                                  </div>

                                  <div className="flex-1 w-full relative flex items-center">
                                    <input
                                      type="text"
                                      required={!opt.imageUrl}
                                      value={opt.text}
                                      onChange={(e) => handleOptionTextChange(idx, optIdx, e.target.value)}
                                      placeholder={opt.imageUrl ? `(Opsi ${opt.label} Bergambar - teks opsional)` : `Teks pilihan ${opt.label}...`}
                                      className="w-full pl-3 pr-8 py-1.5 border-2 border-[#8BC829] rounded-xl text-xs sm:text-sm bg-[#F9FDEE] text-[#102919] font-bold focus:outline-none focus:border-[#102919]"
                                    />
                                    <label
                                      className="absolute right-2 text-[#102919]/60 hover:text-[#102919] cursor-pointer p-0.5"
                                      title="Sisipkan Gambar pada Opsi ini"
                                    >
                                      <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => {
                                          if (e.target.files?.[0]) {
                                            handleOptionImageUpload(idx, optIdx, e.target.files[0]);
                                          }
                                        }}
                                      />
                                      <ImageIcon className="w-3.5 h-3.5" />
                                    </label>
                                  </div>

                                  <div className="flex items-center justify-end gap-1.5 shrink-0">
                                    {opt.imageUrl && (
                                      <div className="flex items-center gap-1 bg-[#EFF9CE] p-1 rounded-xl border border-[#8BC829]">
                                        <img
                                          src={resolveImageUrl(opt.imageUrl)}
                                          alt={`Gbr ${opt.label}`}
                                          className="h-6 w-6 object-contain rounded-lg bg-[#EFF9CE]"
                                          onError={handleImageErrorFallback}
                                        />
                                        <button
                                          type="button"
                                          onClick={() => handleRemoveOptionImage(idx, optIdx)}
                                          className="text-[10px] text-rose-700 font-bold hover:underline px-1 cursor-pointer"
                                        >
                                          Hapus Gbr
                                        </button>
                                      </div>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveOption(idx, optIdx)}
                                      className="p-1.5 text-rose-700 hover:bg-rose-100 rounded-xl transition cursor-pointer"
                                      title="Hapus Opsi ini"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleAddOption(idx)}
                            className="mt-1 px-3 py-1.5 text-xs font-black text-[#102919] bg-[#E2F4B4] hover:bg-[#d6f0a3] rounded-xl border-2 border-dashed border-[#8BC829] transition flex items-center gap-1.5 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" /> Tambahkan Opsi Pilihan ({String.fromCharCode(65 + q.options.length)})
                          </button>
                        </div>
                      )}

                      {/* SUB-FORM 3: ISIAN SINGKAT (Exact Match) */}
                      {q.questionType === 'SHORT_ANSWER' && (
                        <div className="space-y-2 pt-1 bg-[#E2F4B4] p-3.5 rounded-2xl border-2 border-[#8BC829]">
                          <label className="block text-xs font-black text-[#102919]">
                            Kunci Jawaban Tepat (Toleransi Kata Kunci):
                          </label>
                          <input
                            type="text"
                            required
                            value={q.exactKeys || ''}
                            onChange={(e) => handleExactKeysChange(idx, e.target.value)}
                            placeholder="Contoh: Fotosintesis / fotosintesa / anabolisme"
                            className="w-full px-3 py-2 border-2 border-[#8BC829] rounded-xl text-xs sm:text-sm bg-[#F9FDEE] focus:outline-none focus:border-[#102919] font-bold text-[#102919]"
                          />
                          <p className="text-[11px] text-[#102919]/70 font-medium">
                            Gunakan garis miring (<strong>/</strong>) untuk memberikan beberapa variasi jawaban benar alternatif. Sistem otomatis mengabaikan huruf besar/kecil (case-insensitive) dan spasi berlebih.
                          </p>
                        </div>
                      )}

                      {/* SUB-FORM 4: TABEL BENAR / SALAH (Matrix) */}
                      {q.questionType === 'TRUE_FALSE_MATRIX' && (
                        <div className="space-y-2.5 pt-1">
                          <div className="text-[11px] font-black text-[#102919]">
                            Daftar Pernyataan & Kunci Kebenaran:
                          </div>

                          <div className="space-y-2">
                            {(q.matrixRows || []).map((row, rIdx) => (
                              <div
                                key={rIdx}
                                className="p-2.5 rounded-2xl bg-[#E2F4B4] border-2 border-[#8BC829] flex flex-col sm:flex-row sm:items-center gap-2.5"
                              >
                                <span className="w-6 h-6 rounded-xl bg-[#EFF9CE] text-[#102919] border border-[#8BC829] font-mono font-black text-xs flex items-center justify-center shrink-0">
                                  {rIdx + 1}
                                </span>

                                <input
                                  type="text"
                                  required
                                  value={row.statement}
                                  onChange={(e) => handleMatrixStatementChange(idx, rIdx, e.target.value)}
                                  placeholder={`Pernyataan ${rIdx + 1}...`}
                                  className="flex-1 w-full px-3 py-1.5 border-2 border-[#8BC829] rounded-xl text-xs sm:text-sm bg-[#F9FDEE] font-bold text-[#102919] focus:outline-none focus:border-[#102919]"
                                />

                                <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
                                  <div className="flex items-center gap-2 bg-[#EFF9CE] px-2.5 py-1 rounded-xl border border-[#8BC829] text-xs font-black">
                                    <label className="flex items-center gap-1 cursor-pointer text-[#1F4B2C]">
                                      <input
                                        type="radio"
                                        name={`matrix-${q.id}-${rIdx}`}
                                        checked={row.correct === true}
                                        onChange={() => handleMatrixCorrectChange(idx, rIdx, true)}
                                        className="text-[#1F4B2C] focus:ring-0"
                                      />
                                      Benar
                                    </label>
                                    <span className="text-[#8BC829]">|</span>
                                    <label className="flex items-center gap-1 cursor-pointer text-rose-700">
                                      <input
                                        type="radio"
                                        name={`matrix-${q.id}-${rIdx}`}
                                        checked={row.correct === false}
                                        onChange={() => handleMatrixCorrectChange(idx, rIdx, false)}
                                        className="text-rose-600 focus:ring-0"
                                      />
                                      Salah
                                    </label>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => handleRemoveMatrixRow(idx, rIdx)}
                                    className="p-1.5 text-rose-700 hover:bg-rose-100 rounded-xl transition cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleAddMatrixRow(idx)}
                            className="px-3 py-1.5 text-xs font-black text-[#102919] bg-[#E2F4B4] hover:bg-[#d6f0a3] rounded-xl border-2 border-dashed border-[#8BC829] transition flex items-center gap-1.5 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" /> Tambah Baris Pernyataan
                          </button>
                        </div>
                      )}

                      {/* SUB-FORM 5: MENJODOHKAN (Matching Pair) */}
                      {q.questionType === 'MATCHING_PAIR' && (
                        <div className="space-y-2.5 pt-1">
                          <div className="text-[11px] font-black text-[#102919]">
                            Pasangan Premis Kiri & Jawaban Kanan:
                          </div>

                          <div className="space-y-2">
                            {(q.matchingPairs || []).map((pair, pIdx) => (
                              <div
                                key={pIdx}
                                className="p-2.5 rounded-2xl bg-[#E2F4B4] border-2 border-[#8BC829] flex flex-col sm:flex-row sm:items-center gap-2"
                              >
                                <span className="w-6 h-6 rounded-xl bg-[#EFF9CE] text-[#102919] border border-[#8BC829] font-mono font-black text-xs flex items-center justify-center shrink-0">
                                  {pIdx + 1}
                                </span>

                                <div className="flex-1 w-full">
                                  <input
                                    type="text"
                                    required
                                    value={pair.left}
                                    onChange={(e) => handleMatchingPairChange(idx, pIdx, 'left', e.target.value)}
                                    placeholder={`Pernyataan Kiri ${pIdx + 1}...`}
                                    className="w-full px-3 py-1.5 border-2 border-[#8BC829] rounded-xl text-xs sm:text-sm bg-[#F9FDEE] font-bold text-[#102919] focus:outline-none focus:border-[#102919]"
                                  />
                                </div>

                                <ArrowRight className="w-3.5 h-3.5 text-[#102919]/60 hidden sm:block shrink-0" />

                                <div className="flex-1 w-full">
                                  <input
                                    type="text"
                                    required
                                    value={pair.right}
                                    onChange={(e) => handleMatchingPairChange(idx, pIdx, 'right', e.target.value)}
                                    placeholder={`Pasangan Kanan ${pIdx + 1}...`}
                                    className="w-full px-3 py-1.5 border-2 border-[#8BC829] rounded-xl text-xs sm:text-sm bg-[#F9FDEE] font-bold text-[#102919] focus:outline-none focus:border-[#102919]"
                                  />
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleRemoveMatchingPair(idx, pIdx)}
                                  className="p-1.5 text-rose-700 hover:bg-rose-100 rounded-xl self-end sm:self-auto transition cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleAddMatchingPair(idx)}
                            className="px-3 py-1.5 text-xs font-black text-[#102919] bg-[#E2F4B4] hover:bg-[#d6f0a3] rounded-xl border-2 border-dashed border-[#8BC829] transition flex items-center gap-1.5 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" /> Tambah Pasangan Menjodohkan
                          </button>
                        </div>
                      )}

                      {/* SUB-FORM 6: ESAI */}
                      {q.questionType === 'ESSAY' && (
                        <div className="p-3.5 rounded-2xl bg-[#E2F4B4] border-2 border-[#8BC829] text-xs text-[#102919] space-y-1">
                          <span className="font-black text-[#102919]">Format Soal Uraian / Esai:</span>
                          <p className="font-medium text-[#102919]/80">
                            Siswa akan diberikan area pengetikan jawaban terbuka di lembar pengerjaan ujian. Nilai esai dapat dievaluasi secara mandiri oleh guru di halaman Koreksi Esai setelah asesmen selesai.
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Bottom Add Bar */}
              <div className="pt-1 flex justify-center">
                <button
                  type="button"
                  onClick={() => handleAddQuestion('MULTIPLE_CHOICE')}
                  className="px-4 py-2 bg-[#E2F4B4] hover:bg-[#d6f0a3] text-[#102919] rounded-xl font-black text-xs flex items-center gap-1.5 transition border-2 border-[#8BC829] hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Butir Soal Nomor {questions.length + 1}</span>
                </button>
              </div>
            </div>
          )}

          {/* SECTION C: STICKY FOOTER ACTIONS (TASTE-SKILL PAIR) */}
          <div className="sticky bottom-0 -mx-6 -mb-6 px-6 py-3.5 bg-[#EFF9CE]/95 backdrop-blur-md border-t-2 border-[#8BC829] flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-b-2xl">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-[#102919]/70 font-black">Ringkasan:</span>
              <span className="font-mono font-black text-[#102919] bg-[#E2F4B4] border-2 border-[#8BC829] px-2.5 py-0.5 rounded-xl">
                {examType === 'NATIVE_QUESTIONS' ? `${questions.length} Butir Soal` : 'Google Form'}
              </span>
              {examType === 'NATIVE_QUESTIONS' && (
                <span
                  className={`font-mono font-black px-2.5 py-0.5 rounded-xl border-2 ${
                    totalPoints === 100
                      ? 'bg-[#C3E956] text-[#0A1D11] border-[#4D7111]/40'
                      : 'bg-[#E2F4B4] text-[#102919] border-[#8BC829]'
                  }`}
                >
                  {totalPoints} Poin
                </span>
              )}
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-3.5 py-2 border-2 border-[#8BC829] rounded-xl text-xs font-black text-[#102919] bg-[#E2F4B4] hover:bg-[#d6f0a3] transition hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-[#C3E956] hover:bg-[#b8e337] active:scale-[0.98] text-[#0A1D11] rounded-xl text-xs font-black border-2 border-[#4D7111]/30 shadow-xs transition flex items-center gap-1.5 hover:-translate-y-0.5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>{isEditing ? 'Simpan Perubahan Paket' : 'Simpan Paket Ujian'}</span>
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* ======================================================== */}
      {/* 5. MODAL PREVIEW IFRAME FORMULIR ONLINE                  */}
      {/* ======================================================== */}
      <Modal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        title="Pratinjau Tampilan Iframe Formulir Soal"
        maxWidth="max-w-4xl"
      >
        <div className="space-y-3">
          <div className="p-3.5 rounded-2xl bg-[#E2F4B4] border-2 border-[#8BC829] text-[#102919] text-xs font-bold flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span>Tampilan pratinjau seperti yang akan dilihat siswa di arena ujian:</span>
            <span className="font-mono text-[11px] truncate max-w-sm bg-[#F9FDEE] px-2.5 py-1 rounded-xl border border-[#8BC829] text-[#102919]">
              {previewUrl}
            </span>
          </div>

          <div className="w-full h-96 sm:h-[480px] border-2 border-[#8BC829] rounded-2xl overflow-hidden bg-[#EFF9CE] relative shadow-inner">
            <iframe
              src={previewUrl}
              title="Pratinjau Soal Formulir"
              className="w-full h-full border-0"
              allow="camera; microphone; fullscreen"
            />
          </div>

          <div className="flex justify-end pt-1">
            <button
              onClick={() => setIsPreviewModalOpen(false)}
              className="px-4 py-2 bg-[#C3E956] text-[#0A1D11] border-2 border-[#4D7111]/30 rounded-xl text-xs font-black hover:bg-[#b8e337] transition hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer"
            >
              Tutup Pratinjau
            </button>
          </div>
        </div>
      </Modal>

      {/* ======================================================== */}
      {/* 6. MODAL PREVIEW SOAL MANDIRI (AKM / NATIVE)             */}
      {/* ======================================================== */}
      <Modal
        isOpen={isNativePreviewOpen}
        onClose={() => setIsNativePreviewOpen(false)}
        title="Pratinjau Lembar Soal Ujian (Tampilan Siswa)"
        maxWidth="max-w-4xl"
      >
        <div className="space-y-4">
          {/* Header Info Paket */}
          <div className="p-4 rounded-2xl bg-[#E2F4B4] border-2 border-[#8BC829] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-xl text-[10px] font-black uppercase tracking-wider bg-[#102919] text-[#C3E956] shadow-2xs">
                  Soal Mandiri (AKM)
                </span>
                <span className="text-xs text-[#102919] font-black">
                  {previewPackage?.subjectName || previewPackage?.subject_name || 'Mata Pelajaran'}
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-black text-[#102919] mt-1">
                {previewPackage?.title || 'Judul Paket Soal'}
              </h3>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono font-black">
              <span className="px-3 py-1 bg-[#EFF9CE] border-2 border-[#8BC829] rounded-xl text-[#102919] shadow-2xs">
                {previewPackage?.questions?.length || 0} Butir Soal
              </span>
            </div>
          </div>

          <p className="text-xs text-[#102919]/70 font-bold leading-relaxed">
            Berikut adalah simulasi visual lembar soal yang akan dikerjakan siswa. Mendukung rendering rumus matematika KaTeX serta gambar lampiran pada soal dan opsi jawaban yang diekstrak dari berkas Excel/Word.
          </p>

          {/* Konten Daftar Soal */}
          {isLoadingPreview ? (
            <div className="py-12 text-center text-[#102919] text-xs font-black space-y-2">
              <div className="w-7 h-7 border-2 border-[#102919] border-t-transparent rounded-full animate-spin mx-auto" />
              <span>Memuat butir soal ujian...</span>
            </div>
          ) : !previewPackage?.questions || previewPackage.questions.length === 0 ? (
            <div className="py-10 text-center text-[#102919]/60 text-xs font-bold bg-[#E2F4B4] border-2 border-dashed border-[#8BC829] rounded-2xl">
              Belum ada butir soal dalam paket ini. Silakan klik tombol <b>+ Import</b> untuk menambahkan soal dari berkas Excel.
            </div>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto space-y-4 pr-1">
              {previewPackage.questions.map((q, idx) => {
                const qType = q.questionType || q.question_type || 'MULTIPLE_CHOICE';
                const qText = q.questionText || q.question_text || q.text || '';
                const qImg = q.imageUrl || q.image_url;
                const extra = q.extraData || q.extra_data || {};

                return (
                  <div key={q.id || idx} className="p-4 sm:p-5 rounded-2xl bg-[#EFF9CE] border-2 border-[#8BC829] shadow-xs space-y-3.5">
                    {/* Baris Atas Soal: Nomor, Tipe, Poin */}
                    <div className="flex items-center justify-between flex-wrap gap-2 pb-2.5 border-b-2 border-[#8BC829]/30">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-xl bg-[#102919] text-[#C3E956] font-mono font-black text-xs">
                          #{idx + 1}
                        </span>
                        <span className="text-xs font-black text-[#102919]">
                          {({
                            MULTIPLE_CHOICE: 'Pilihan Ganda',
                            MULTIPLE_CHOICE_COMPLEX: 'Pilihan Ganda Kompleks',
                            SHORT_ANSWER: 'Isian Singkat',
                            TRUE_FALSE_MATRIX: 'Benar / Salah',
                            MATCHING_PAIR: 'Menjodohkan',
                            ESSAY: 'Uraian / Esai',
                          })[qType] || 'Pilihan Ganda'}
                        </span>
                      </div>
                      <span className="text-xs font-mono font-black text-[#102919] bg-[#E2F4B4] px-2.5 py-0.5 rounded-xl border border-[#8BC829]">
                        {q.points || 10} Poin
                      </span>
                    </div>

                    {/* Teks Pertanyaan dengan Rumus KaTeX */}
                    <div className="text-xs sm:text-sm text-[#102919] font-bold leading-relaxed">
                      <MathText text={qText} />
                    </div>

                    {/* Gambar Pertanyaan Soal (Jika Ada) */}
                    {qImg && (
                      <div className="my-2.5 p-2 rounded-2xl bg-[#F9FDEE] border-2 border-[#8BC829] max-w-xl shadow-2xs">
                        <img
                          src={resolveImageUrl(qImg)}
                          alt={`Gambar Soal Nomor ${idx + 1}`}
                          className="max-h-72 w-auto object-contain rounded-xl mx-auto bg-[#EFF9CE]"
                          onError={handleImageErrorFallback}
                        />
                      </div>
                    )}

                    {/* 1. Tipe Pilihan Ganda / Kompleks */}
                    {(qType === 'MULTIPLE_CHOICE' || qType === 'MULTIPLE_CHOICE_COMPLEX') && (
                      <div className="space-y-2 pt-1">
                        {(q.options || []).map((opt, oIdx) => {
                          const optLabel = opt.optionLabel || opt.option_label || opt.label || String.fromCharCode(65 + oIdx);
                          const optText = opt.optionText || opt.option_text || opt.text || '';
                          const optImg = opt.imageUrl || opt.image_url;
                          const isCorrect = Boolean(opt.isCorrect || opt.is_correct);

                          return (
                            <div
                              key={optLabel}
                              className={`p-3 rounded-2xl border-2 text-xs sm:text-sm font-bold flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition ${
                                isCorrect
                                  ? 'bg-[#C3E956] border-[#4D7111] text-[#0A1D11] ring-2 ring-[#4D7111]/30'
                                  : 'bg-[#E2F4B4] border-[#8BC829] text-[#102919]'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                <span className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
                                  isCorrect 
                                    ? 'bg-[#102919] text-[#C3E956] shadow-2xs' 
                                    : 'bg-[#EFF9CE] text-[#102919] border-2 border-[#8BC829]'
                                }`}>
                                  {optLabel}
                                </span>
                                <div className="leading-relaxed">
                                  {optText ? <MathText text={optText} /> : <span className="italic text-[#102919]/60">(Opsi Bergambar)</span>}
                                </div>
                                {isCorrect && (
                                  <span className="ml-auto sm:ml-2 px-2.5 py-0.5 rounded-xl text-[10px] font-black uppercase tracking-wider bg-[#102919] text-[#C3E956] shrink-0 shadow-2xs">
                                    ✓ Kunci
                                  </span>
                                )}
                              </div>

                              {optImg && (
                                <div className="sm:ml-auto p-1.5 rounded-xl bg-[#F9FDEE] border-2 border-[#8BC829] max-h-32 shrink-0 shadow-2xs">
                                  <img
                                    src={resolveImageUrl(optImg)}
                                    alt={`Gambar Opsi ${optLabel}`}
                                    className="h-20 sm:h-24 object-contain rounded-lg bg-[#EFF9CE]"
                                    onError={handleImageErrorFallback}
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* 2. Tipe Isian Singkat */}
                    {qType === 'SHORT_ANSWER' && (
                      <div className="p-3.5 rounded-2xl bg-[#E2F4B4] border-2 border-[#8BC829] text-xs text-[#102919] space-y-1">
                        <span className="font-black">Kunci Jawaban yang Diterima Sistem:</span>
                        <div className="font-mono font-bold bg-[#F9FDEE] p-2.5 rounded-xl border border-[#8BC829] text-[#102919]">
                          {Array.isArray(extra.exact_keys) 
                            ? extra.exact_keys.join(' / ') 
                            : (extra.exact_keys || '-')}
                        </div>
                      </div>
                    )}

                    {/* 3. Tipe Benar / Salah Matrix */}
                    {qType === 'TRUE_FALSE_MATRIX' && extra.rows && (
                      <div className="space-y-1.5 pt-1">
                        <span className="text-xs font-black text-[#102919]">Pernyataan Benar / Salah:</span>
                        {extra.rows.map((r, rIdx) => (
                          <div key={rIdx} className="p-2.5 rounded-2xl bg-[#E2F4B4] border-2 border-[#8BC829] text-xs flex items-center justify-between gap-2">
                            <span className="font-bold text-[#102919]">{r.statement}</span>
                            <span className={`px-2.5 py-0.5 rounded-xl font-black text-[10px] ${
                              r.correct || r.is_correct ? 'bg-[#C3E956] text-[#0A1D11] border border-[#4D7111]/30' : 'bg-rose-200 text-rose-900 border border-rose-300'
                            }`}>
                              {r.correct || r.is_correct ? 'BENAR' : 'SALAH'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 4. Tipe Menjodohkan */}
                    {qType === 'MATCHING_PAIR' && extra.pairs && (
                      <div className="space-y-1.5 pt-1">
                        <span className="text-xs font-black text-[#102919]">Pasangan Menjodohkan:</span>
                        {extra.pairs.map((p, pIdx) => (
                          <div key={pIdx} className="p-2.5 rounded-2xl bg-[#E2F4B4] border-2 border-[#8BC829] text-xs flex items-center gap-2">
                            <span className="font-bold text-[#102919]">{p.left}</span>
                            <ArrowRight className="w-3.5 h-3.5 text-[#102919]/60 shrink-0" />
                            <span className="text-[#1F4B2C] font-black">{p.right}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 5. Tipe Esai */}
                    {qType === 'ESSAY' && (
                      <div className="p-3.5 rounded-2xl bg-[#E2F4B4] border-2 border-dashed border-[#8BC829] text-[#102919] text-xs font-bold italic">
                        [Lembar Jawaban Esai Siswa - Dikoreksi Guru pada Menu Koreksi Esai]
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Footer Modal */}
          <div className="flex justify-end pt-2 border-t-2 border-[#8BC829]/30">
            <button
              type="button"
              onClick={() => setIsNativePreviewOpen(false)}
              className="px-4 py-2 bg-[#C3E956] hover:bg-[#b8e337] active:scale-[0.98] text-[#0A1D11] rounded-xl text-xs font-black border-2 border-[#4D7111]/30 shadow-xs transition cursor-pointer"
            >
              Tutup Pratinjau
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
