import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  TextField,
  IconButton,
  Checkbox,
  CircularProgress,
  Alert,
  Paper,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  LinearProgress,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Tooltip,
  InputAdornment,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import TableChartIcon from '@mui/icons-material/TableChart';
import ImageIcon from '@mui/icons-material/Image';
import DescriptionIcon from '@mui/icons-material/Description';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ThumbUpAltIcon from '@mui/icons-material/ThumbUpAlt';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { questionService } from '../../services/question.service.js';
import { CompanyDto } from '../../types/company.types.js';
import {
  QuestionCategory,
  QuestionDifficulty,
  QuestionType,
  CATEGORY_TOPICS_MAP,
  ExtractedQuestionDto,
  CreateQuestionInput,
} from '../../types/question.types.js';
import { QuestionContentRenderer } from '../common/QuestionContentRenderer.js';

interface AiQuestionImportDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  companies: CompanyDto[];
  defaultCompanyId?: string;
}

export const AiQuestionImportDialog: React.FC<AiQuestionImportDialogProps> = ({
  open,
  onClose,
  onSuccess,
  companies,
  defaultCompanyId = '',
}) => {
  // Step: 0 = Upload & Analyze, 1 = Excel-Style Review Table, 2 = Success Summary
  const [step, setStep] = useState<0 | 1 | 2>(0);

  // File & Input state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState<boolean>(false);
  const [manualText, setManualText] = useState<string>('');
  const [showManualText, setShowManualText] = useState<boolean>(false);

  // Company track assignment
  const [targetCompanyId, setTargetCompanyId] = useState<string>(defaultCompanyId);

  // Analysis status & extracted data
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [importing, setImporting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [extractedQuestions, setExtractedQuestions] = useState<ExtractedQuestionDto[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [detectedCompany, setDetectedCompany] = useState<string | null>(null);
  const [detectedYear, setDetectedYear] = useState<number | null>(null);

  // Filters for Excel-style Review Table
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Question detail inspection dialog
  const [inspectQuestion, setInspectQuestion] = useState<ExtractedQuestionDto | null>(null);
  const inspectFileInputRef = useRef<HTMLInputElement>(null);
  const [inspectUploading, setInspectUploading] = useState<boolean>(false);

  // Import result
  const [importedCount, setImportedCount] = useState<number>(0);

  useEffect(() => {
    if (open) {
      setTargetCompanyId(defaultCompanyId);
      setError(null);
    }
  }, [open, defaultCompanyId]);

  const handleReset = () => {
    setStep(0);
    setSelectedFile(null);
    setManualText('');
    setShowManualText(false);
    setError(null);
    setExtractedQuestions([]);
    setSelectedIndices(new Set());
    setDetectedCompany(null);
    setDetectedYear(null);
    setImportedCount(0);
    setStatusFilter('ALL');
    setCategoryFilter('ALL');
    setDifficultyFilter('ALL');
    setSearchTerm('');
    setInspectQuestion(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      setError(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile && !manualText.trim()) {
      setError('Please select a question file (PDF, DOCX, XLSX, CSV, JPG, PNG) from your computer or paste text.');
      return;
    }

    setAnalyzing(true);
    setError(null);

    try {
      const res = await questionService.aiAnalyzeDocument({
        file: selectedFile || undefined,
        text: manualText.trim() || undefined,
        companyId: targetCompanyId || undefined,
      });

      if (!res.questions || res.questions.length === 0) {
        setError('No assessment questions could be recognized from the provided document. Please check the document format.');
        return;
      }

      if (res.detectedCompany) {
        setDetectedCompany(res.detectedCompany);
        if (!targetCompanyId) {
          const match = companies.find(
            (c) =>
              c.name.toLowerCase().includes(res.detectedCompany!.toLowerCase()) ||
              res.detectedCompany!.toLowerCase().includes(c.name.toLowerCase()) ||
              c.code.toLowerCase() === res.detectedCompany!.toLowerCase()
          );
          if (match) {
            setTargetCompanyId(match.id);
          }
        }
      }
      setDetectedYear(res.detectedYear);

      // Map questions with initial company and approval state
      const prepared: ExtractedQuestionDto[] = res.questions.map((q, idx) => ({
        ...q,
        tempId: q.tempId || `ext-${Date.now()}-${idx + 1}`,
        companyId: targetCompanyId || q.companyId || null,
        isApproved: q.isApproved ?? (q.status === 'CLASSIFIED' && !q.isDuplicate && !q.hasUnresolvedDiagram),
      }));

      setExtractedQuestions(prepared);
      // Select all non-duplicate, resolved questions by default
      const initialSelected = new Set<number>();
      prepared.forEach((q, i) => {
        if (!q.isDuplicate && q.status === 'CLASSIFIED' && !q.hasUnresolvedDiagram) {
          initialSelected.add(i);
        }
      });
      setSelectedIndices(initialSelected);
      setStep(1); // Proceed to Excel-style review table
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to analyze document with Gemini API.';
      setError(msg);
    } finally {
      setAnalyzing(false);
    }
  };

  // =========================================================================
  // REVIEW TABLE ACTIONS
  // =========================================================================

  const handleUpdateQuestion = (index: number, updates: Partial<ExtractedQuestionDto>) => {
    setExtractedQuestions((prev) => {
      const copy = [...prev];
      const current = copy[index];
      const updated = { ...current, ...updates };

      // If category changed, check if current topic is valid, otherwise set to first valid topic
      if (updates.category && updates.category !== current.category) {
        const allowedTopics = CATEGORY_TOPICS_MAP[updates.category] || [];
        if (!allowedTopics.includes(updated.topic as any)) {
          updated.topic = allowedTopics[0] || 'General';
        }
      }

      // Mark as approved if user manually modified or reviewed it
      if (updates.category || updates.topic || updates.difficulty || updates.questionType) {
        updated.status = 'CLASSIFIED';
        updated.isApproved = true;
      }

      copy[index] = updated;
      return copy;
    });
  };

  const handleToggleApprove = (index: number) => {
    setExtractedQuestions((prev) => {
      const copy = [...prev];
      const current = copy[index];
      copy[index] = {
        ...current,
        isApproved: !current.isApproved,
        status: !current.isApproved ? 'CLASSIFIED' : current.status,
      };
      return copy;
    });
  };

  const handleApproveAllValid = () => {
    setExtractedQuestions((prev) =>
      prev.map((q) => {
        if (q.isDuplicate) return q;
        return {
          ...q,
          isApproved: true,
          status: 'CLASSIFIED',
        };
      })
    );
  };

  const handleApproveSelected = () => {
    setExtractedQuestions((prev) =>
      prev.map((q, i) => {
        if (selectedIndices.has(i)) {
          return {
            ...q,
            isApproved: true,
            status: 'CLASSIFIED',
          };
        }
        return q;
      })
    );
  };

  const handleRejectSelected = () => {
    setExtractedQuestions((prev) =>
      prev.filter((_, i) => !selectedIndices.has(i))
    );
    setSelectedIndices(new Set());
  };

  const handleDeleteQuestion = (index: number) => {
    setExtractedQuestions((prev) => prev.filter((_, i) => i !== index));
    setSelectedIndices((prev) => {
      const next = new Set<number>();
      Array.from(prev).forEach((idx) => {
        if (idx < index) next.add(idx);
        else if (idx > index) next.add(idx - 1);
      });
      return next;
    });
  };

  const handleToggleSelectRow = (index: number) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const handleSelectAllFiltered = (checked: boolean, filteredIndices: number[]) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (checked) {
        filteredIndices.forEach((i) => next.add(i));
      } else {
        filteredIndices.forEach((i) => next.delete(i));
      }
      return next;
    });
  };

  const handleInspectImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !inspectQuestion) return;

    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setError('Image file size exceeds the 5MB limit.');
      return;
    }

    setInspectUploading(true);
    try {
      const res = await questionService.uploadQuestionImage(file);
      const updated = {
        ...inspectQuestion,
        imageUrl: res.imageUrl,
        hasUnresolvedDiagram: false,
      };
      setInspectQuestion(updated);

      const idx = extractedQuestions.findIndex(
        (item) => (item.tempId && item.tempId === inspectQuestion.tempId) || item === inspectQuestion
      );
      if (idx !== -1) {
        handleUpdateQuestion(idx, { imageUrl: res.imageUrl, hasUnresolvedDiagram: false });
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to upload image';
      setError(msg);
    } finally {
      setInspectUploading(false);
      if (inspectFileInputRef.current) {
        inspectFileInputRef.current.value = '';
      }
    }
  };

  const handleInspectRemoveImage = () => {
    if (!inspectQuestion) return;
    const updated = {
      ...inspectQuestion,
      imageUrl: null,
    };
    setInspectQuestion(updated);

    const idx = extractedQuestions.findIndex(
      (item) => (item.tempId && item.tempId === inspectQuestion.tempId) || item === inspectQuestion
    );
    if (idx !== -1) {
      handleUpdateQuestion(idx, { imageUrl: null });
    }
  };

  // Filtered Questions for Excel-Style Table
  const filteredQuestions = useMemo(() => {
    return extractedQuestions
      .map((q, originalIndex) => ({ q, originalIndex }))
      .filter(({ q }) => {
        // Status filter
        if (statusFilter === 'APPROVED' && !q.isApproved) return false;
        if (statusFilter === 'NEEDS_REVIEW' && (q.isApproved || q.status !== 'NEEDS_REVIEW')) return false;
        if (statusFilter === 'DUPLICATE' && !q.isDuplicate) return false;
        if (statusFilter === 'AI_FAILED' && q.status !== 'AI_FAILED') return false;

        // Category filter
        if (categoryFilter !== 'ALL' && q.category !== categoryFilter) return false;

        // Difficulty filter
        if (difficultyFilter !== 'ALL' && q.difficulty !== difficultyFilter) return false;

        // Search text
        if (searchTerm.trim()) {
          const s = searchTerm.toLowerCase();
          const matchText = q.questionText.toLowerCase().includes(s);
          const matchTopic = q.topic.toLowerCase().includes(s);
          if (!matchText && !matchTopic) return false;
        }

        return true;
      });
  }, [extractedQuestions, statusFilter, categoryFilter, difficultyFilter, searchTerm]);

  // Summary counts
  const summaryCounts = useMemo(() => {
    let approved = 0;
    let needsReview = 0;
    let duplicates = 0;
    let failed = 0;

    for (const q of extractedQuestions) {
      if (q.isApproved) approved++;
      else if (q.isDuplicate) duplicates++;
      else if (q.status === 'NEEDS_REVIEW') needsReview++;
      else if (q.status === 'AI_FAILED') failed++;
    }

    return {
      total: extractedQuestions.length,
      approved,
      needsReview,
      duplicates,
      failed,
    };
  }, [extractedQuestions]);

  // Final Import Handler: Only imports approved questions
  const handleFinalImport = async () => {
    const approvedQuestions = extractedQuestions.filter((q) => q.isApproved);

    if (approvedQuestions.length === 0) {
      setError('No questions are currently marked as Approved. Please approve at least one question before importing.');
      return;
    }

    setImporting(true);
    setError(null);

    const questionsToImport: CreateQuestionInput[] = approvedQuestions.map((q) => ({
      companyId: targetCompanyId || q.companyId || null,
      category: q.category,
      topic: q.topic,
      difficulty: q.difficulty,
      questionType: q.questionType,
      questionText: q.questionText,
      imageUrl: q.imageUrl || undefined,
      marks: q.marks,
      negativeMarks: q.negativeMarks,
      correctAnswer: q.correctAnswer || undefined,
      explanation: q.explanation || undefined,
      status: 'ACTIVE',
      options: q.options.map((opt) => ({
        optionText: opt.optionText,
        optionOrder: opt.optionOrder,
        isCorrect: opt.isCorrect,
      })),
    }));

    try {
      const res = await questionService.bulkCreateQuestions(questionsToImport);
      setImportedCount(res.created.length);
      setStep(2); // Success step
      onSuccess();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to import approved questions into Question Bank.';
      setError(msg);
    } finally {
      setImporting(false);
    }
  };

  const getFileIcon = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return <PictureAsPdfIcon sx={{ color: '#ef4444', fontSize: 36 }} />;
    if (['xlsx', 'xls', 'csv'].includes(ext || '')) return <TableChartIcon sx={{ color: '#10b981', fontSize: 36 }} />;
    if (['png', 'jpg', 'jpeg', 'webp'].includes(ext || '')) return <ImageIcon sx={{ color: '#3b82f6', fontSize: 36 }} />;
    return <DescriptionIcon sx={{ color: '#6366f1', fontSize: 36 }} />;
  };

  const getConfidenceBadgeColor = (confidence: number) => {
    if (confidence >= 0.88) return 'success';
    if (confidence >= 0.75) return 'warning';
    return 'error';
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth={step === 1 ? 'xl' : 'md'}
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          boxShadow: '0 25px 50px -12px rgba(20, 38, 75, 0.25)',
          overflow: 'hidden',
          minHeight: step === 1 ? '85vh' : 'auto',
        },
      }}
    >
      {/* Header */}
      <DialogTitle
        sx={{
          bgcolor: '#14264B',
          color: '#ffffff',
          py: 2,
          px: 3,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              bgcolor: 'rgba(56, 189, 248, 0.15)',
              p: 1,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AutoAwesomeIcon sx={{ color: '#38bdf8', fontSize: 24 }} />
          </Box>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="h6" fontWeight={700} sx={{ color: '#ffffff', lineHeight: 1.2 }}>
                AI Document & Image Question Intelligence
              </Typography>
              <Chip
                label="Gemini Multimodal"
                size="small"
                sx={{
                  bgcolor: 'rgba(34, 197, 94, 0.2)',
                  color: '#4ade80',
                  fontWeight: 700,
                  fontSize: '0.68rem',
                  height: 20,
                  border: '1px solid rgba(74, 222, 128, 0.3)',
                }}
              />
            </Box>
            <Typography variant="caption" sx={{ color: '#8293B0' }}>
              Direct computer upload • PDF, DOCX, XLSX, CSV, XML, JPG, PNG • Full concept understanding & duplicate detection
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={handleClose} size="small" sx={{ color: '#8293B0', '&:hover': { color: '#ffffff' } }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      {(analyzing || importing) && <LinearProgress color="info" />}

      <DialogContent sx={{ p: 3, bgcolor: '#F8FAFC' }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2.5 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* ========================================================================= */}
        {/* STEP 0: Upload & Analyze */}
        {/* ========================================================================= */}
        {step === 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Paper elevation={0} sx={{ p: 2.5, bgcolor: '#ffffff', border: '1px solid #E2E8F0', borderRadius: 2.5 }}>
              <Typography variant="subtitle2" fontWeight={700} color="#14264B" sx={{ mb: 1.5 }}>
                1. Target Recruitment Company Track (Optional)
              </Typography>
              <FormControl size="small" fullWidth>
                <InputLabel>Company Track Destination</InputLabel>
                <Select
                  value={targetCompanyId}
                  label="Company Track Destination"
                  onChange={(e) => setTargetCompanyId(e.target.value)}
                >
                  <MenuItem value="">
                    <em>Auto-detect from document (or General Question Bank)</em>
                  </MenuItem>
                  {companies.map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.name} ({c.code})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.75, display: 'block' }}>
                If set to auto-detect, Gemini analyzes whether the uploaded exam paper belongs to a specific company drive (e.g. TCS, Infosys, Wipro).
              </Typography>
            </Paper>

            <Paper elevation={0} sx={{ p: 2.5, bgcolor: '#ffffff', border: '1px solid #E2E8F0', borderRadius: 2.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Typography variant="subtitle2" fontWeight={700} color="#14264B">
                  2. Upload Question Document or Image from Computer
                </Typography>
                <Button
                  size="small"
                  variant="text"
                  onClick={() => setShowManualText(!showManualText)}
                  sx={{ textTransform: 'none', fontSize: '0.8rem' }}
                >
                  {showManualText ? 'Hide Text Area' : 'Or Paste Raw Text'}
                </Button>
              </Box>

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.doc,.xlsx,.xls,.csv,.xml,.png,.jpg,.jpeg,.webp,.txt"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />

              {!selectedFile ? (
                <Box
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleFileDrop}
                  onClick={() => fileInputRef.current?.click()}
                  sx={{
                    border: '2px dashed',
                    borderColor: dragOver ? 'primary.main' : '#CBD5E1',
                    borderRadius: 2.5,
                    p: 4,
                    textAlign: 'center',
                    cursor: 'pointer',
                    bgcolor: dragOver ? '#eff6ff' : '#F1F5F9',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      borderColor: 'primary.main',
                      bgcolor: '#E2E8F0',
                    },
                  }}
                >
                  <CloudUploadIcon sx={{ fontSize: 48, color: '#64748B', mb: 1 }} />
                  <Typography variant="subtitle1" fontWeight={700} color="#14264B">
                    Select Question Document or Image directly from your computer
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                    Supports single or multi-page documents containing 10, 50, 500+ questions
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap', mt: 1 }}>
                    <Chip label="PDF (.pdf)" size="small" variant="outlined" />
                    <Chip label="Word (.docx)" size="small" variant="outlined" />
                    <Chip label="Excel (.xlsx, .csv)" size="small" variant="outlined" />
                    <Chip label="Images (.png, .jpg, .jpeg)" size="small" variant="outlined" />
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
                    Max file size: 25 MB • Secure backend processing • No URL input required
                  </Typography>
                </Box>
              ) : (
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    bgcolor: '#F0FDF4',
                    borderColor: '#86EFAC',
                    borderRadius: 2,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    {getFileIcon(selectedFile)}
                    <Box>
                      <Typography variant="body2" fontWeight={700} color="#14264B">
                        {selectedFile.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready for Gemini semantic analysis
                      </Typography>
                    </Box>
                  </Box>
                  <Button
                    size="small"
                    color="error"
                    variant="outlined"
                    onClick={() => {
                      setSelectedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                  >
                    Remove
                  </Button>
                </Paper>
              )}

              {showManualText && (
                <Box sx={{ mt: 2 }}>
                  <TextField
                    fullWidth
                    multiline
                    rows={4}
                    label="Paste Raw Question Statements / OCR Text"
                    placeholder={`1. If cost price is ₹500 and selling price is ₹600, find profit percentage.\nA) 10%\nB) 20%\nC) 15%\nD) 25%\nAnswer: B`}
                    value={manualText}
                    onChange={(e) => setManualText(e.target.value)}
                  />
                </Box>
              )}
            </Paper>
          </Box>
        )}

        {/* ========================================================================= */}
        {/* STEP 1: EXCEL-STYLE ADMIN REVIEW TABLE */}
        {/* ========================================================================= */}
        {step === 1 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Top Statistics Bar */}
            <Paper
              elevation={0}
              sx={{
                p: 2,
                bgcolor: '#ffffff',
                border: '1px solid #E2E8F0',
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 1.5,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Typography variant="subtitle2" fontWeight={700} color="#14264B">
                  Extraction Results:
                </Typography>
                <Chip label={`Total: ${summaryCounts.total}`} size="small" variant="outlined" sx={{ fontWeight: 700 }} />
                <Chip
                  label={`Approved: ${summaryCounts.approved}`}
                  size="small"
                  color="success"
                  icon={<CheckCircleIcon sx={{ fontSize: '1rem !important' }} />}
                  sx={{ fontWeight: 700 }}
                />
                {summaryCounts.needsReview > 0 && (
                  <Chip
                    label={`Needs Review: ${summaryCounts.needsReview}`}
                    size="small"
                    color="warning"
                    icon={<WarningAmberIcon sx={{ fontSize: '1rem !important' }} />}
                    sx={{ fontWeight: 700 }}
                  />
                )}
                {summaryCounts.duplicates > 0 && (
                  <Chip
                    label={`Duplicates: ${summaryCounts.duplicates}`}
                    size="small"
                    color="error"
                    icon={<ContentCopyIcon sx={{ fontSize: '1rem !important' }} />}
                    sx={{ fontWeight: 700 }}
                  />
                )}
                {summaryCounts.failed > 0 && (
                  <Chip
                    label={`Failed: ${summaryCounts.failed}`}
                    size="small"
                    color="error"
                    icon={<ErrorOutlineIcon sx={{ fontSize: '1rem !important' }} />}
                    sx={{ fontWeight: 700 }}
                  />
                )}
                {detectedCompany && (
                  <Chip
                    label={`Target: ${detectedCompany}${detectedYear ? ` (${detectedYear})` : ''}`}
                    size="small"
                    color="info"
                    sx={{ fontWeight: 700 }}
                  />
                )}
              </Box>

              {/* Bulk Actions */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Button
                  size="small"
                  variant="contained"
                  color="success"
                  onClick={handleApproveAllValid}
                  startIcon={<ThumbUpAltIcon fontSize="small" />}
                  sx={{ textTransform: 'none', fontWeight: 600 }}
                >
                  Approve All Valid
                </Button>
                {selectedIndices.size > 0 && (
                  <>
                    <Button
                      size="small"
                      variant="outlined"
                      color="primary"
                      onClick={handleApproveSelected}
                      sx={{ textTransform: 'none', fontWeight: 600 }}
                    >
                      Approve Selected ({selectedIndices.size})
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      onClick={handleRejectSelected}
                      sx={{ textTransform: 'none', fontWeight: 600 }}
                    >
                      Reject Selected
                    </Button>
                  </>
                )}
              </Box>
            </Paper>

            {/* Filter Toolbar */}
            <Paper
              elevation={0}
              sx={{
                p: 1.5,
                bgcolor: '#ffffff',
                border: '1px solid #E2E8F0',
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                flexWrap: 'wrap',
              }}
            >
              <TextField
                size="small"
                placeholder="Search questions or topics..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" color="action" />
                    </InputAdornment>
                  ),
                }}
                sx={{ minWidth: 220, flex: 1 }}
              />

              <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel>Status</InputLabel>
                <Select value={statusFilter} label="Status" onChange={(e) => setStatusFilter(e.target.value)}>
                  <MenuItem value="ALL">All Statuses</MenuItem>
                  <MenuItem value="APPROVED">Approved ({summaryCounts.approved})</MenuItem>
                  <MenuItem value="NEEDS_REVIEW">Needs Review ({summaryCounts.needsReview})</MenuItem>
                  <MenuItem value="DUPLICATE">Duplicates ({summaryCounts.duplicates})</MenuItem>
                  <MenuItem value="AI_FAILED">Failed ({summaryCounts.failed})</MenuItem>
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ minWidth: 160 }}>
                <InputLabel>Category</InputLabel>
                <Select value={categoryFilter} label="Category" onChange={(e) => setCategoryFilter(e.target.value)}>
                  <MenuItem value="ALL">All Categories</MenuItem>
                  <MenuItem value="QUANTITATIVE_APTITUDE">Quantitative Aptitude</MenuItem>
                  <MenuItem value="LOGICAL_REASONING">Logical Reasoning</MenuItem>
                  <MenuItem value="VERBAL_ABILITY">Verbal Ability</MenuItem>
                  <MenuItem value="TECHNICAL_MCQ">Technical MCQ</MenuItem>
                  <MenuItem value="CODING">Coding</MenuItem>
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Difficulty</InputLabel>
                <Select value={difficultyFilter} label="Difficulty" onChange={(e) => setDifficultyFilter(e.target.value)}>
                  <MenuItem value="ALL">All</MenuItem>
                  <MenuItem value="EASY">Easy</MenuItem>
                  <MenuItem value="MEDIUM">Medium</MenuItem>
                  <MenuItem value="HARD">Hard</MenuItem>
                </Select>
              </FormControl>
            </Paper>

            {/* EXCEL-STYLE REVIEW TABLE */}
            <TableContainer
              component={Paper}
              elevation={0}
              sx={{
                border: '1px solid #E2E8F0',
                borderRadius: 2,
                maxHeight: '52vh',
                bgcolor: '#ffffff',
              }}
            >
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow sx={{ '& th': { bgcolor: '#1E293B', color: '#F8FAFC', fontWeight: 700 } }}>
                    <TableCell padding="checkbox">
                      <Checkbox
                        size="small"
                        checked={
                          filteredQuestions.length > 0 &&
                          filteredQuestions.every(({ originalIndex }) => selectedIndices.has(originalIndex))
                        }
                        indeterminate={
                          filteredQuestions.some(({ originalIndex }) => selectedIndices.has(originalIndex)) &&
                          !filteredQuestions.every(({ originalIndex }) => selectedIndices.has(originalIndex))
                        }
                        onChange={(e) =>
                          handleSelectAllFiltered(
                            e.target.checked,
                            filteredQuestions.map((f) => f.originalIndex)
                          )
                        }
                        sx={{ color: '#94A3B8', '&.Mui-checked': { color: '#38BDF8' } }}
                      />
                    </TableCell>
                    <TableCell sx={{ width: 45 }}>#</TableCell>
                    <TableCell sx={{ minWidth: 260 }}>Question Statement</TableCell>
                    <TableCell sx={{ minWidth: 150 }}>Category</TableCell>
                    <TableCell sx={{ minWidth: 150 }}>Topic</TableCell>
                    <TableCell sx={{ minWidth: 100 }}>Difficulty</TableCell>
                    <TableCell sx={{ minWidth: 110 }}>Type</TableCell>
                    <TableCell sx={{ minWidth: 120 }}>Correct Answer</TableCell>
                    <TableCell sx={{ minWidth: 95 }}>Confidence</TableCell>
                    <TableCell sx={{ minWidth: 105 }}>Status</TableCell>
                    <TableCell align="center" sx={{ minWidth: 90 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredQuestions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                        No questions match the current filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredQuestions.map(({ q, originalIndex }, displayIdx) => {
                      const isSelected = selectedIndices.has(originalIndex);
                      const allowedTopics = CATEGORY_TOPICS_MAP[q.category] || [];
                      const confColor = getConfidenceBadgeColor(q.confidence?.overall ?? 0.85);

                      return (
                        <TableRow
                          key={q.tempId || originalIndex}
                          hover
                          sx={{
                            bgcolor: q.isApproved
                              ? 'rgba(240, 253, 244, 0.6)'
                              : q.isDuplicate
                              ? 'rgba(254, 242, 242, 0.6)'
                              : 'inherit',
                            '&:hover': { bgcolor: '#F1F5F9' },
                          }}
                        >
                          {/* Checkbox */}
                          <TableCell padding="checkbox">
                            <Checkbox
                              size="small"
                              checked={isSelected}
                              onChange={() => handleToggleSelectRow(originalIndex)}
                            />
                          </TableCell>

                          {/* Row # */}
                          <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.8rem' }}>
                            {q.questionNumber || displayIdx + 1}
                          </TableCell>

                          {/* Question Text */}
                          <TableCell>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                              <Typography
                                variant="body2"
                                sx={{
                                  fontWeight: 600,
                                  color: '#1E293B',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical',
                                  lineHeight: 1.3,
                                  cursor: 'pointer',
                                  '&:hover': { color: '#0284C7' },
                                }}
                                onClick={() => setInspectQuestion(q)}
                              >
                                {q.questionText}
                              </Typography>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap', mt: 0.25 }}>
                                {q.imageUrl && (
                                  <Chip
                                    icon={<ImageIcon sx={{ fontSize: '13px !important' }} />}
                                    label="Diagram"
                                    size="small"
                                    color="info"
                                    variant="outlined"
                                    sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700 }}
                                  />
                                )}
                                {q.hasUnresolvedDiagram && (
                                  <Tooltip title={q.diagramReviewNote || 'Diagram detected in source document requires admin review'} arrow>
                                    <Chip
                                      icon={<WarningAmberIcon sx={{ fontSize: '13px !important' }} />}
                                      label="Diagram Needs Review"
                                      size="small"
                                      color="warning"
                                      sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700 }}
                                    />
                                  </Tooltip>
                                )}
                              </Box>
                              {q.isDuplicate && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <Chip
                                    label="Duplicate Detected"
                                    size="small"
                                    color="error"
                                    sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700 }}
                                  />
                                  <Typography variant="caption" color="error.main" sx={{ fontSize: '0.7rem' }}>
                                    {q.duplicateReason || 'Matches existing question'}
                                  </Typography>
                                </Box>
                              )}
                            </Box>
                          </TableCell>

                          {/* Category (Editable Select) */}
                          <TableCell>
                            <Select
                              size="small"
                              value={q.category}
                              onChange={(e) =>
                                handleUpdateQuestion(originalIndex, {
                                  category: e.target.value as QuestionCategory,
                                })
                              }
                              sx={{ fontSize: '0.78rem', height: 32 }}
                              fullWidth
                            >
                              <MenuItem value="QUANTITATIVE_APTITUDE">Quantitative Aptitude</MenuItem>
                              <MenuItem value="LOGICAL_REASONING">Logical Reasoning</MenuItem>
                              <MenuItem value="VERBAL_ABILITY">Verbal Ability</MenuItem>
                              <MenuItem value="TECHNICAL_MCQ">Technical MCQ</MenuItem>
                              <MenuItem value="CODING">Coding</MenuItem>
                            </Select>
                          </TableCell>

                          {/* Topic (Editable Select) */}
                          <TableCell>
                            <Select
                              size="small"
                              value={allowedTopics.includes(q.topic as any) ? q.topic : allowedTopics[0] || 'General'}
                              onChange={(e) =>
                                handleUpdateQuestion(originalIndex, { topic: e.target.value })
                              }
                              sx={{ fontSize: '0.78rem', height: 32 }}
                              fullWidth
                            >
                              {allowedTopics.map((top) => (
                                <MenuItem key={top} value={top} sx={{ fontSize: '0.8rem' }}>
                                  {top}
                                </MenuItem>
                              ))}
                            </Select>
                          </TableCell>

                          {/* Difficulty (Editable Select) */}
                          <TableCell>
                            <Select
                              size="small"
                              value={q.difficulty}
                              onChange={(e) =>
                                handleUpdateQuestion(originalIndex, {
                                  difficulty: e.target.value as QuestionDifficulty,
                                })
                              }
                              sx={{
                                fontSize: '0.78rem',
                                height: 32,
                                fontWeight: 600,
                                color:
                                  q.difficulty === 'EASY'
                                    ? '#15803d'
                                    : q.difficulty === 'MEDIUM'
                                    ? '#b45309'
                                    : '#b91c1c',
                              }}
                              fullWidth
                            >
                              <MenuItem value="EASY">Easy</MenuItem>
                              <MenuItem value="MEDIUM">Medium</MenuItem>
                              <MenuItem value="HARD">Hard</MenuItem>
                            </Select>
                          </TableCell>

                          {/* Question Type (Editable Select) */}
                          <TableCell>
                            <Select
                              size="small"
                              value={q.questionType}
                              onChange={(e) =>
                                handleUpdateQuestion(originalIndex, {
                                  questionType: e.target.value as QuestionType,
                                })
                              }
                              sx={{ fontSize: '0.78rem', height: 32 }}
                              fullWidth
                            >
                              <MenuItem value="SINGLE_CHOICE">Single Choice</MenuItem>
                              <MenuItem value="MULTIPLE_CHOICE">Multiple Choice</MenuItem>
                              <MenuItem value="TRUE_FALSE">True / False</MenuItem>
                              <MenuItem value="FILL_BLANK">Fill Blank</MenuItem>
                              <MenuItem value="DESCRIPTIVE">Descriptive</MenuItem>
                              <MenuItem value="CODING">Coding</MenuItem>
                            </Select>
                          </TableCell>

                          {/* Correct Answer */}
                          <TableCell>
                            {q.hasDocumentAnswer && q.documentAnswer ? (
                              <Tooltip title={`Document Answer: ${q.documentAnswer} (Extracted directly from document)`} arrow>
                                <Chip
                                  label={q.documentAnswer.length > 10 ? q.documentAnswer.substring(0, 8) + '...' : q.documentAnswer}
                                  size="small"
                                  color="success"
                                  sx={{ fontWeight: 700, fontSize: '0.72rem', height: 22 }}
                                />
                              </Tooltip>
                            ) : (
                              <Tooltip
                                title={
                                  q.aiVerifiedAnswer
                                    ? `No answer in document. AI suggests: ${q.aiVerifiedAnswer}. Please review!`
                                    : 'No answer provided in document. Admin review required.'
                                }
                                arrow
                              >
                                <Chip
                                  label={q.aiVerifiedAnswer ? `AI: ${q.aiVerifiedAnswer}` : 'Not Provided'}
                                  size="small"
                                  color="warning"
                                  variant="outlined"
                                  sx={{ fontWeight: 600, fontSize: '0.7rem', height: 22, borderStyle: 'dashed' }}
                                />
                              </Tooltip>
                            )}
                          </TableCell>

                          {/* Confidence */}
                          <TableCell>
                            <Tooltip
                              title={
                                <Box sx={{ p: 0.5 }}>
                                  <Typography variant="caption" sx={{ display: 'block', fontWeight: 700 }}>
                                    Confidence Breakdown:
                                  </Typography>
                                  <Typography variant="caption" sx={{ display: 'block' }}>
                                    Category: {(q.confidence.category * 100).toFixed(0)}%
                                  </Typography>
                                  <Typography variant="caption" sx={{ display: 'block' }}>
                                    Topic: {(q.confidence.topic * 100).toFixed(0)}%
                                  </Typography>
                                  <Typography variant="caption" sx={{ display: 'block' }}>
                                    Difficulty: {(q.confidence.difficulty * 100).toFixed(0)}%
                                  </Typography>
                                  <Typography variant="caption" sx={{ display: 'block' }}>
                                    Type: {(q.confidence.questionType * 100).toFixed(0)}%
                                  </Typography>
                                  <Typography variant="caption" sx={{ display: 'block' }}>
                                    Answer: {q.hasDocumentAnswer ? `${((q.confidence.answer ?? 0.95) * 100).toFixed(0)}%` : 'Not in Document'}
                                  </Typography>
                                  {q.reasoning && (
                                    <Typography variant="caption" sx={{ display: 'block', mt: 0.5, fontStyle: 'italic' }}>
                                      Reasoning: {q.reasoning}
                                    </Typography>
                                  )}
                                </Box>
                              }
                              arrow
                            >
                              <Chip
                                label={`${(((q.confidence?.overall ?? 0.85)) * 100).toFixed(0)}%`}
                                size="small"
                                color={confColor}
                                sx={{ fontWeight: 700, fontSize: '0.72rem', height: 22 }}
                              />
                            </Tooltip>
                          </TableCell>

                          {/* Status */}
                          <TableCell>
                            {q.isApproved ? (
                              <Chip
                                label="Approved"
                                size="small"
                                color="success"
                                icon={<CheckCircleIcon sx={{ fontSize: '0.9rem !important' }} />}
                                sx={{ fontWeight: 700, fontSize: '0.7rem', height: 22 }}
                              />
                            ) : q.isDuplicate ? (
                              <Chip
                                label="Duplicate"
                                size="small"
                                color="error"
                                icon={<ContentCopyIcon sx={{ fontSize: '0.9rem !important' }} />}
                                sx={{ fontWeight: 700, fontSize: '0.7rem', height: 22 }}
                              />
                            ) : q.status === 'NEEDS_REVIEW' ? (
                              <Chip
                                label="Review"
                                size="small"
                                color="warning"
                                icon={<WarningAmberIcon sx={{ fontSize: '0.9rem !important' }} />}
                                sx={{ fontWeight: 700, fontSize: '0.7rem', height: 22 }}
                              />
                            ) : (
                              <Chip
                                label="Failed"
                                size="small"
                                color="error"
                                icon={<ErrorOutlineIcon sx={{ fontSize: '0.9rem !important' }} />}
                                sx={{ fontWeight: 700, fontSize: '0.7rem', height: 22 }}
                              />
                            )}
                          </TableCell>

                          {/* Actions */}
                          <TableCell align="center">
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                              <Tooltip title={q.isApproved ? 'Unapprove' : 'Approve Question'}>
                                <IconButton
                                  size="small"
                                  color={q.isApproved ? 'success' : 'default'}
                                  onClick={() => handleToggleApprove(originalIndex)}
                                >
                                  <CheckCircleIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="View Details">
                                <IconButton size="small" onClick={() => setInspectQuestion(q)}>
                                  <VisibilityIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => handleDeleteQuestion(originalIndex)}
                                >
                                  <DeleteOutlineIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* ========================================================================= */}
        {/* STEP 2: SUCCESS CONFIRMATION */}
        {/* ========================================================================= */}
        {step === 2 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CheckCircleIcon sx={{ fontSize: 64, color: 'success.main', mb: 1.5 }} />
            <Typography variant="h5" fontWeight={700} color="#14264B" sx={{ mb: 1 }}>
              Questions Successfully Imported!
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              {importedCount} verified questions have been added to the active Question Bank. They are now available to the Assessment Builder.
            </Typography>
            <Button variant="contained" color="primary" onClick={handleClose}>
              Back to Question Bank
            </Button>
          </Box>
        )}
      </DialogContent>

      {/* Footer Actions */}
      {step !== 2 && (
        <DialogActions sx={{ px: 3, py: 2, bgcolor: '#ffffff', borderTop: '1px solid #E2E8F0', justifyContent: 'space-between' }}>
          {step === 0 ? (
            <>
              <Button onClick={handleClose} color="inherit">
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleAnalyze}
                disabled={analyzing || (!selectedFile && !manualText.trim())}
                startIcon={analyzing ? <CircularProgress size={18} color="inherit" /> : <AutoAwesomeIcon />}
                sx={{
                  bgcolor: '#0284C7',
                  '&:hover': { bgcolor: '#0369A1' },
                  px: 3,
                  fontWeight: 700,
                  textTransform: 'none',
                }}
              >
                {analyzing ? 'Analyzing with Gemini AI...' : 'Analyze Document & Extract'}
              </Button>
            </>
          ) : (
            <>
              <Button onClick={() => setStep(0)} color="inherit">
                Back to Upload
              </Button>
              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary" fontWeight={600}>
                  {summaryCounts.approved} of {summaryCounts.total} questions ready for import
                </Typography>
                <Button
                  variant="contained"
                  color="success"
                  onClick={handleFinalImport}
                  disabled={importing || summaryCounts.approved === 0}
                  startIcon={importing ? <CircularProgress size={18} color="inherit" /> : <CheckCircleOutlineIcon />}
                  sx={{ px: 3, fontWeight: 700, textTransform: 'none' }}
                >
                  {importing
                    ? 'Importing...'
                    : `Import ${summaryCounts.approved} Approved Question${summaryCounts.approved === 1 ? '' : 's'}`}
                </Button>
              </Box>
            </>
          )}
        </DialogActions>
      )}

      {/* Detailed Question Inspector Drawer / Dialog */}
      {inspectQuestion && (
        <Dialog
          open={Boolean(inspectQuestion)}
          onClose={() => setInspectQuestion(null)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="subtitle1" fontWeight={700}>
              Question Details & AI Reasoning
            </Typography>
            <IconButton size="small" onClick={() => setInspectQuestion(null)}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </DialogTitle>
          <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip label={inspectQuestion.category} color="primary" size="small" />
              <Chip label={inspectQuestion.topic} variant="outlined" size="small" />
              <Chip label={inspectQuestion.difficulty} color={inspectQuestion.difficulty === 'EASY' ? 'success' : inspectQuestion.difficulty === 'MEDIUM' ? 'warning' : 'error'} size="small" />
              <Chip label={inspectQuestion.questionType} size="small" />
              <Chip label={`Confidence: ${(((inspectQuestion.confidence?.overall ?? 0.85)) * 100).toFixed(0)}%`} size="small" color={getConfidenceBadgeColor(inspectQuestion.confidence?.overall ?? 0.85)} />
            </Box>

            {inspectQuestion.isDuplicate && (
              <Alert severity="warning">
                <strong>Duplicate Warning:</strong> {inspectQuestion.duplicateReason || 'Matches existing Question Bank question'}
              </Alert>
            )}

            {inspectQuestion.hasUnresolvedDiagram && (
              <Alert severity="warning" icon={<WarningAmberIcon />}>
                <strong>Diagram Review Flag:</strong> {inspectQuestion.diagramReviewNote || 'A visual diagram or chart reference was detected in the source document for this question. Please upload or verify the diagram before approving.'}
              </Alert>
            )}

            <Box>
              <Typography variant="caption" fontWeight={700} color="text.secondary">
                QUESTION STATEMENT:
              </Typography>
              <Paper variant="outlined" sx={{ p: 2, mt: 0.5, bgcolor: '#F8FAFC' }}>
                <QuestionContentRenderer content={inspectQuestion.questionText} imageUrl={inspectQuestion.imageUrl} />
              </Paper>
            </Box>

            {/* Diagram / Visual Figure Attachment Controls */}
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                <Typography variant="caption" fontWeight={700} color="text.secondary">
                  QUESTION DIAGRAM / VISUAL FIGURE:
                </Typography>
                {inspectQuestion.imageUrl && (
                  <Chip label="Attached" size="small" color="primary" sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700 }} />
                )}
              </Box>
              <input
                ref={inspectFileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/jpg"
                style={{ display: 'none' }}
                onChange={handleInspectImageUpload}
              />
              {inspectQuestion.imageUrl ? (
                <Paper variant="outlined" sx={{ p: 1.5, bgcolor: '#ffffff', display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                  <Box sx={{ maxWidth: 220, flex: 1 }}>
                    <QuestionContentRenderer content="" imageUrl={inspectQuestion.imageUrl} />
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={inspectUploading ? <CircularProgress size={12} color="inherit" /> : <CloudUploadIcon />}
                      disabled={inspectUploading}
                      onClick={() => inspectFileInputRef.current?.click()}
                      sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                    >
                      {inspectUploading ? 'Uploading...' : 'Replace Diagram'}
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      startIcon={<DeleteOutlineIcon />}
                      disabled={inspectUploading}
                      onClick={handleInspectRemoveImage}
                      sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                    >
                      Remove Diagram
                    </Button>
                  </Box>
                </Paper>
              ) : (
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={inspectUploading ? <CircularProgress size={12} color="inherit" /> : <CloudUploadIcon />}
                  disabled={inspectUploading}
                  onClick={() => inspectFileInputRef.current?.click()}
                  sx={{ textTransform: 'none', fontSize: '0.75rem', mt: 0.5 }}
                >
                  {inspectUploading ? 'Uploading Diagram...' : 'Upload / Attach Diagram from Computer'}
                </Button>
              )}
            </Box>

            {inspectQuestion.options && inspectQuestion.options.length > 0 && (
              <Box>
                <Typography variant="caption" fontWeight={700} color="text.secondary">
                  OPTIONS:
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 0.5 }}>
                  {inspectQuestion.options.map((opt, i) => (
                    <Paper
                      key={i}
                      variant="outlined"
                      sx={{
                        p: 1.25,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        bgcolor: opt.isCorrect ? '#F0FDF4' : '#ffffff',
                        borderColor: opt.isCorrect ? '#86EFAC' : '#E2E8F0',
                      }}
                    >
                      <Chip
                        label={String.fromCharCode(65 + i)}
                        size="small"
                        color={opt.isCorrect ? 'success' : 'default'}
                        sx={{ fontWeight: 700 }}
                      />
                      <Typography variant="body2" sx={{ fontWeight: opt.isCorrect ? 700 : 400 }}>
                        {opt.optionText}
                      </Typography>
                      {opt.isCorrect && (
                        <Chip label="Correct Answer" size="small" color="success" sx={{ ml: 'auto', height: 20, fontSize: '0.65rem' }} />
                      )}
                    </Paper>
                  ))}
                </Box>
              </Box>
            )}

            {/* Document Answer vs AI Answer Callout */}
            <Box
              sx={{
                p: 2,
                bgcolor: inspectQuestion.hasDocumentAnswer ? '#F0FDF4' : '#FFFBEB',
                border: `1px solid ${inspectQuestion.hasDocumentAnswer ? '#86EFAC' : '#FDE68A'}`,
                borderRadius: 2,
              }}
            >
              <Typography
                variant="caption"
                fontWeight={700}
                color={inspectQuestion.hasDocumentAnswer ? 'success.dark' : 'warning.dark'}
              >
                DOCUMENT ANSWER KEY:
              </Typography>
              <Typography
                variant="body2"
                fontWeight={700}
                color={inspectQuestion.hasDocumentAnswer ? 'success.main' : 'warning.main'}
              >
                {inspectQuestion.hasDocumentAnswer
                  ? `${inspectQuestion.documentAnswer} (Preserved from document)`
                  : 'NOT PROVIDED IN DOCUMENT (Needs Review - Never Invented)'}
              </Typography>
              {inspectQuestion.aiVerifiedAnswer && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                  AI-Verified Calculation: <strong>{inspectQuestion.aiVerifiedAnswer}</strong>
                </Typography>
              )}
            </Box>

            {inspectQuestion.explanation && (
              <Box>
                <Typography variant="caption" fontWeight={700} color="text.secondary">
                  EXPLANATION:
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {inspectQuestion.explanation}
                </Typography>
              </Box>
            )}

            {inspectQuestion.reasoning && (
              <Box>
                <Typography variant="caption" fontWeight={700} color="info.main">
                  AI COGNITIVE REASONING:
                </Typography>
                <Paper variant="outlined" sx={{ p: 1.5, mt: 0.5, bgcolor: '#F0F9FF', borderColor: '#BAE6FD' }}>
                  <Typography variant="body2" color="#0369A1">
                    {inspectQuestion.reasoning}
                  </Typography>
                </Paper>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setInspectQuestion(null)}>Close</Button>
          </DialogActions>
        </Dialog>
      )}
    </Dialog>
  );
};
