import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  CircularProgress,
  Alert,
  Chip,
  FormControl,
  InputLabel,
  Select,
  Grid,
  Paper,
  Radio,
  Checkbox,
  Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import VisibilityIcon from '@mui/icons-material/Visibility';
import RefreshIcon from '@mui/icons-material/Refresh';
import FilterListIcon from '@mui/icons-material/FilterList';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import CloseIcon from '@mui/icons-material/Close';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import { DataTable, Column } from '../../components/management/DataTable.js';
import { ConfirmDialog } from '../../components/management/ConfirmDialog.js';
import { AiQuestionImportDialog } from '../../components/question/AiQuestionImportDialog.js';
import { AiClassificationReviewDialog } from '../../components/question/AiClassificationReviewDialog.js';
import { questionService } from '../../services/question.service.js';
import { companyService } from '../../services/company.service.js';
import { CompanyDto } from '../../types/company.types.js';
import { QuestionContentRenderer } from '../../components/common/QuestionContentRenderer.js';
import {
  Question,
  CreateQuestionInput,
  UpdateQuestionInput,
  QuestionCategory,
  QuestionDifficulty,
  QuestionType,
  QuestionStatus,
  AiClassificationStatus,
  CATEGORY_TOPICS_MAP,
  CreateQuestionOptionInput,
} from '../../types/question.types.js';

export const QuestionsPage: React.FC = () => {
  // Data & Pagination
  const [questions, setQuestions] = useState<Question[]>([]);
  const [companies, setCompanies] = useState<CompanyDto[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchParams, setSearchParams] = useSearchParams();
  const urlCompanyId = searchParams.get('companyId') || '';
  const [companyFilter, setCompanyFilter] = useState<string>(urlCompanyId);

  // Search, Filters & Sorting
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<QuestionCategory | ''>('');
  const [topicFilter, setTopicFilter] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<QuestionDifficulty | ''>('');
  const [typeFilter, setTypeFilter] = useState<QuestionType | ''>('');
  const [statusFilter, setStatusFilter] = useState<QuestionStatus | ''>('');
  const [aiStatusFilter, setAiStatusFilter] = useState<AiClassificationStatus | ''>('');
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // AI Review & Intelligence State
  const [reviewQuestion, setReviewQuestion] = useState<Question | null>(null);
  const [classifyingId, setClassifyingId] = useState<string | null>(null);
  const [batchClassifying, setBatchClassifying] = useState(false);
  const [detectingMetadata, setDetectingMetadata] = useState(false);
  const [detectedConfidenceBadge, setDetectedConfidenceBadge] = useState<string | null>(null);

  // Detail View Dialog
  const [viewQuestion, setViewQuestion] = useState<Question | null>(null);

  // Create / Edit Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Form State
  const [formCompanyId, setFormCompanyId] = useState<string>('');
  const [formCategory, setFormCategory] = useState<QuestionCategory>('QUANTITATIVE_APTITUDE');
  const [formTopic, setFormTopic] = useState<string>('Percentage');
  const [formDifficulty, setFormDifficulty] = useState<QuestionDifficulty>('MEDIUM');
  const [formType, setFormType] = useState<QuestionType>('SINGLE_CHOICE');
  const [formText, setFormText] = useState<string>('');
  const [formImageUrl, setFormImageUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [showImageHelper, setShowImageHelper] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [formMarks, setFormMarks] = useState<number>(1.0);
  const [formNegativeMarks, setFormNegativeMarks] = useState<number>(0.0);
  const [formCorrectAnswer, setFormCorrectAnswer] = useState<string>('');
  const [formExplanation, setFormExplanation] = useState<string>('');
  const [formStatus, setFormStatus] = useState<QuestionStatus>('ACTIVE');
  const [formOptions, setFormOptions] = useState<CreateQuestionOptionInput[]>([
    { optionText: '', optionOrder: 1, isCorrect: true },
    { optionText: '', optionOrder: 2, isCorrect: false },
    { optionText: '', optionOrder: 3, isCorrect: false },
    { optionText: '', optionOrder: 4, isCorrect: false },
  ]);

  const handleImageFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageUploadError(null);

    // Validate size (5MB max)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setImageUploadError('Image file size exceeds the 5MB limit.');
      return;
    }

    // Validate format
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      setImageUploadError('Unsupported format. Only JPG, JPEG, PNG, and WebP diagrams are supported.');
      return;
    }

    setUploadingImage(true);
    try {
      const res = await questionService.uploadQuestionImage(file);
      setFormImageUrl(res.imageUrl);
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'message' in err ? String((err as { message: unknown }).message) : 'Failed to upload image';
      setImageUploadError(msg);
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Delete Dialog
  const [deleteTarget, setDeleteTarget] = useState<Question | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch Questions
  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await questionService.getQuestions({
        page: page + 1,
        limit: rowsPerPage,
        search: search.trim() || undefined,
        category: categoryFilter || undefined,
        topic: topicFilter.trim() || undefined,
        difficulty: difficultyFilter || undefined,
        questionType: typeFilter || undefined,
        status: statusFilter || undefined,
        aiStatus: aiStatusFilter || undefined,
        companyId: companyFilter || undefined,
        sortBy: sortBy as 'createdAt' | 'marks' | 'difficulty' | 'questionType' | 'category',
        sortOrder,
      });
      setQuestions(res.data);
      setTotalCount(res.pagination.totalCount);
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'message' in err ? String((err as { message: unknown }).message) : 'Failed to fetch questions';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, search, categoryFilter, topicFilter, difficultyFilter, typeFilter, statusFilter, aiStatusFilter, companyFilter, sortBy, sortOrder]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  useEffect(() => {
    companyService
      .getCompanies({ limit: 100 })
      .then((res) => {
        if (res && res.data) {
          setCompanies(res.data);
        }
      })
      .catch((err) => {
        console.error('Failed to load companies:', err);
      });
  }, []);

  useEffect(() => {
    setCompanyFilter(urlCompanyId);
  }, [urlCompanyId]);

  const currentFilteredCompany = companies.find((c) => c.id === companyFilter);

  // Dynamic available topics based on chosen category
  const filterTopics = categoryFilter ? CATEGORY_TOPICS_MAP[categoryFilter] : [];
  const formAvailableTopics = CATEGORY_TOPICS_MAP[formCategory] || [];

  // Reset or initialize options when Question Type changes in form
  const handleTypeChange = (newType: QuestionType) => {
    setFormType(newType);
    if (newType === 'TRUE_FALSE') {
      setFormOptions([
        { optionText: 'True', optionOrder: 1, isCorrect: true },
        { optionText: 'False', optionOrder: 2, isCorrect: false },
      ]);
    } else if (newType === 'SINGLE_CHOICE' || newType === 'MULTIPLE_CHOICE') {
      if (formOptions.length < 2) {
        setFormOptions([
          { optionText: '', optionOrder: 1, isCorrect: true },
          { optionText: '', optionOrder: 2, isCorrect: false },
        ]);
      }
    } else {
      setFormOptions([]);
    }
  };

  const handleOpenDialog = (q?: Question) => {
    setFormError(null);
    setShowImageHelper(false);
    setImageUrlInput('');
    setDetectedConfidenceBadge(null);
    if (q) {
      setEditingQuestion(q);
      setFormCompanyId(q.companyId || '');
      setFormCategory(q.category);
      setFormTopic(q.topic);
      setFormDifficulty(q.difficulty);
      setFormType(q.questionType);
      setFormText(q.questionText);
      setFormImageUrl(q.imageUrl || null);
      setImageUploadError(null);
      setFormMarks(q.marks);
      setFormNegativeMarks(q.negativeMarks);
      setFormCorrectAnswer(q.correctAnswer || '');
      setFormExplanation(q.explanation || '');
      setFormStatus(q.status);
      setFormOptions(
        q.options.map((o) => ({
          optionText: o.optionText,
          optionOrder: o.optionOrder,
          isCorrect: o.isCorrect,
        }))
      );
    } else {
      setEditingQuestion(null);
      setFormCompanyId(companyFilter || '');
      const defaultCat: QuestionCategory = categoryFilter || 'QUANTITATIVE_APTITUDE';
      const defaultTopic = CATEGORY_TOPICS_MAP[defaultCat][0] || 'Percentage';
      setFormCategory(defaultCat);
      setFormTopic(defaultTopic);
      setFormDifficulty('MEDIUM');
      setFormType('SINGLE_CHOICE');
      setFormText('');
      setFormImageUrl(null);
      setImageUploadError(null);
      setFormMarks(1.0);
      setFormNegativeMarks(0.25);
      setFormCorrectAnswer('');
      setFormExplanation('');
      setFormStatus('ACTIVE');
      setFormOptions([
        { optionText: '', optionOrder: 1, isCorrect: true },
        { optionText: '', optionOrder: 2, isCorrect: false },
        { optionText: '', optionOrder: 3, isCorrect: false },
        { optionText: '', optionOrder: 4, isCorrect: false },
      ]);
    }
    setDialogOpen(true);
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Client side option validation before submission
    if (formType === 'SINGLE_CHOICE' || formType === 'MULTIPLE_CHOICE' || formType === 'TRUE_FALSE') {
      const emptyOpt = formOptions.some((o) => !o.optionText.trim());
      if (emptyOpt) {
        setFormError('All options must have non-empty text');
        return;
      }
      const correctCount = formOptions.filter((o) => o.isCorrect).length;
      if (formType === 'SINGLE_CHOICE' && correctCount !== 1) {
        setFormError(`SINGLE_CHOICE requires exactly 1 correct option (selected: ${correctCount})`);
        return;
      }
      if (formType === 'MULTIPLE_CHOICE' && correctCount < 1) {
        setFormError('MULTIPLE_CHOICE requires at least 1 correct option');
        return;
      }
      if (formType === 'TRUE_FALSE' && correctCount !== 1) {
        setFormError('TRUE_FALSE requires exactly 1 correct option');
        return;
      }
    } else if (formType === 'FILL_BLANK' && !formCorrectAnswer.trim()) {
      setFormError('FILL_BLANK questions require an exact Correct Answer');
      return;
    }

    setSaving(true);
    try {
      const payload: CreateQuestionInput = {
        companyId: formCompanyId ? formCompanyId : null,
        category: formCategory,
        topic: formTopic,
        difficulty: formDifficulty,
        questionType: formType,
        questionText: formText.trim(),
        imageUrl: formImageUrl || undefined,
        marks: Number(formMarks),
        negativeMarks: Number(formNegativeMarks),
        correctAnswer: formCorrectAnswer.trim() || undefined,
        explanation: formExplanation.trim() || undefined,
        status: formStatus,
        options:
          formType === 'FILL_BLANK' || formType === 'DESCRIPTIVE'
            ? []
            : formOptions.map((o, idx) => ({
              optionText: o.optionText.trim(),
              optionOrder: idx + 1,
              isCorrect: o.isCorrect,
            })),
      };

      if (editingQuestion) {
        await questionService.updateQuestion(editingQuestion.id, payload as UpdateQuestionInput);
      } else {
        await questionService.createQuestion(payload);
      }

      setDialogOpen(false);
      setEditingQuestion(null);
      fetchQuestions();
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'message' in err ? String((err as { message: unknown }).message) : 'Failed to save question';
      setFormError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (q: Question) => {
    const newStatus: QuestionStatus = q.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await questionService.updateQuestionStatus(q.id, newStatus);
      fetchQuestions();
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'message' in err ? String((err as { message: unknown }).message) : 'Failed to toggle status';
      setError(msg);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await questionService.deleteQuestion(deleteTarget.id);
      setDeleteTarget(null);
      fetchQuestions();
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'message' in err ? String((err as { message: unknown }).message) : 'Failed to delete question';
      setError(msg);
    } finally {
      setDeleting(false);
    }
  };

  const handleSortChange = (colId: string) => {
    if (sortBy === colId) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(colId);
      setSortOrder('asc');
    }
  };

  const handleQuickClassify = async (questionId: string) => {
    setClassifyingId(questionId);
    try {
      const updated = await questionService.classifyQuestion(questionId);
      setQuestions((prev) => prev.map((q) => (q.id === questionId ? updated : q)));
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'message' in err ? String((err as { message: unknown }).message) : 'Classification failed';
      setError(msg);
    } finally {
      setClassifyingId(null);
    }
  };

  const handleBatchClassify = async () => {
    if (questions.length === 0) return;
    setBatchClassifying(true);
    try {
      const ids = questions.map((q) => q.id);
      await questionService.batchClassifyQuestions(ids);
      await fetchQuestions();
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'message' in err ? String((err as { message: unknown }).message) : 'Batch classification failed';
      setError(msg);
    } finally {
      setBatchClassifying(false);
    }
  };

  const handleAutoDetectMetadata = async () => {
    if (!formText.trim()) return;
    setDetectingMetadata(true);
    try {
      const res = await questionService.autoDetectClassification({
        questionText: formText.trim(),
        options: formOptions.filter((o) => o.optionText.trim()),
        correctAnswer: formCorrectAnswer.trim() || undefined,
        explanation: formExplanation.trim() || undefined,
      });

      setFormCategory(res.category);
      setFormTopic(res.topic);
      setFormDifficulty(res.difficulty);
      setFormType(res.questionType);
      setDetectedConfidenceBadge(
        `AI Identified: ${res.category.replace(/_/g, ' ')} → ${res.topic} (${res.difficulty}) with ${Math.round(
          (res.confidence.overall || 0.8) * 100
        )}% confidence. ${res.reasoning || ''}`
      );
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'message' in err ? String((err as { message: unknown }).message) : 'Auto-detect failed';
      setFormError(msg);
    } finally {
      setDetectingMetadata(false);
    }
  };

  const columns: Column<Question>[] = [
    {
      id: 'questionText',
      label: 'Question',
      minWidth: 260,
      render: (q) => (
        <div>
          <Typography
            variant="body2"
            fontWeight={600}
            sx={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              cursor: 'pointer',
              '&:hover': { color: 'primary.light' },
            }}
            onClick={() => setViewQuestion(q)}
          >
            {q.questionText}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.25, flexWrap: 'wrap' }}>
            {q.imageUrl && (
              <Chip
                icon={<ImageOutlinedIcon sx={{ fontSize: '13px !important' }} />}
                label="Diagram"
                size="small"
                color="info"
                variant="outlined"
                sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700 }}
              />
            )}
            <Typography variant="caption" color="text.secondary">
              {q.options.length > 0 ? `${q.options.length} Options` : q.questionType}
            </Typography>
          </Box>
        </div>
      ),
    },
    {
      id: 'category',
      label: 'Category & Track',
      minWidth: 200,
      sortable: true,
      render: (q) => {
        const companyName = q.company?.name || companies.find((c) => c.id === q.companyId)?.name;
        return (
          <div>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5, flexWrap: 'wrap' }}>
              <Chip
                label={q.category.replace('_', ' ')}
                size="small"
                color={
                  q.category === 'TECHNICAL_MCQ'
                    ? 'primary'
                    : q.category === 'CODING'
                      ? 'secondary'
                      : q.category === 'QUANTITATIVE_APTITUDE'
                        ? 'info'
                        : 'default'
                }
                sx={{ fontWeight: 700, fontSize: '0.7rem', height: 20 }}
              />
              {companyName ? (
                <Chip
                  label={companyName}
                  size="small"
                  variant="outlined"
                  color="secondary"
                  sx={{ fontWeight: 600, fontSize: '0.68rem', height: 20 }}
                />
              ) : (
                <Chip
                  label="Global"
                  size="small"
                  variant="outlined"
                  sx={{ fontWeight: 500, fontSize: '0.68rem', height: 20, color: '#7182A0', borderColor: '#D1DEF0' }}
                />
              )}
            </Box>
            <Typography variant="body2" color="text.secondary">
              {q.topic}
            </Typography>
          </div>
        );
      },
    },
    {
      id: 'aiClassification',
      label: 'AI Intelligence',
      minWidth: 160,
      render: (q) => {
        const ai = q.aiClassification;
        const isClassifying = classifyingId === q.id;

        if (isClassifying) {
          return (
            <Chip
              size="small"
              icon={<CircularProgress size={12} color="inherit" />}
              label="Analyzing..."
              sx={{ bgcolor: '#e0f2fe', color: '#0369a1', fontWeight: 600, fontSize: '0.7rem' }}
            />
          );
        }

        if (!ai) {
          return (
            <Button
              size="small"
              variant="text"
              startIcon={<AutoAwesomeIcon sx={{ fontSize: '13px !important', color: '#0284c7' }} />}
              onClick={(e) => {
                e.stopPropagation();
                handleQuickClassify(q.id);
              }}
              sx={{ fontSize: '0.72rem', textTransform: 'none', py: 0.2, color: '#0284c7', fontWeight: 600 }}
            >
              Classify
            </Button>
          );
        }

        const confPercent = Math.round(ai.overallConfidence * 100);
        let color: 'success' | 'warning' | 'info' | 'error' = 'info';
        let label = ai.status as string;

        if (ai.status === 'CLASSIFIED') {
          color = 'success';
          label = `AI: ${confPercent}%`;
        } else if (ai.status === 'NEEDS_REVIEW') {
          color = 'warning';
          label = `Review (${confPercent}%)`;
        } else if (ai.status === 'AI_FAILED') {
          color = 'error';
          label = 'AI Failed';
        } else {
          color = 'info';
          label = 'AI Pending';
        }

        return (
          <Tooltip
            title={
              <Box sx={{ p: 0.5 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', color: '#38bdf8' }}>
                  AI Semantic Intelligence
                </Typography>
                <Typography variant="caption" sx={{ display: 'block' }}>
                  Topic: {ai.suggestedTopic} ({Math.round(ai.topicConfidence * 100)}%)
                </Typography>
                <Typography variant="caption" sx={{ display: 'block' }}>
                  Difficulty: {ai.suggestedDifficulty} ({Math.round(ai.difficultyConfidence * 100)}%)
                </Typography>
                <Typography variant="caption" sx={{ display: 'block' }}>
                  Status: {ai.status} {ai.isApproved ? '✔ (Approved)' : ''}
                </Typography>
                <Typography variant="caption" sx={{ display: 'block', mt: 0.5, fontStyle: 'italic', color: '#D1DEF0' }}>
                  Click to inspect full confidence breakdown or override
                </Typography>
              </Box>
            }
          >
            <Chip
              label={label}
              size="small"
              color={color}
              variant={ai.status === 'CLASSIFIED' ? 'filled' : 'outlined'}
              icon={<AutoAwesomeIcon sx={{ fontSize: '13px !important' }} />}
              onClick={(e) => {
                e.stopPropagation();
                setReviewQuestion(q);
              }}
              sx={{ fontWeight: 700, fontSize: '0.7rem', height: 22, cursor: 'pointer' }}
            />
          </Tooltip>
        );
      },
    },
    {
      id: 'difficulty',
      label: 'Difficulty',
      minWidth: 100,
      sortable: true,
      render: (q) => {
        const color =
          q.difficulty === 'EASY' ? 'success' : q.difficulty === 'MEDIUM' ? 'warning' : 'error';
        return <Chip label={q.difficulty} size="small" color={color} sx={{ fontWeight: 700 }} />;
      },
    },
    {
      id: 'questionType',
      label: 'Type',
      minWidth: 130,
      sortable: true,
      render: (q) => (
        <Chip
          label={q.questionType.replace('_', ' ')}
          size="small"
          variant="outlined"
          sx={{ fontWeight: 600, fontSize: '0.72rem' }}
        />
      ),
    },
    {
      id: 'marks',
      label: 'Marks',
      minWidth: 90,
      sortable: true,
      render: (q) => (
        <div>
          <Typography variant="body2" fontWeight={700} color="primary.light">
            +{q.marks}
          </Typography>
          {q.negativeMarks > 0 && (
            <Typography variant="caption" color="error.light">
              -{q.negativeMarks}
            </Typography>
          )}
        </div>
      ),
    },
    {
      id: 'status',
      label: 'Status',
      minWidth: 110,
      render: (q) => (
        <Tooltip title={`Click to ${q.status === 'ACTIVE' ? 'deactivate' : 'activate'}`}>
          <Chip
            label={q.status}
            size="small"
            color={q.status === 'ACTIVE' ? 'success' : 'default'}
            sx={{ fontWeight: 700, cursor: 'pointer' }}
            onClick={() => handleToggleStatus(q)}
          />
        </Tooltip>
      ),
    },
    {
      id: 'actions',
      label: 'Actions',
      minWidth: 130,
      align: 'right',
      render: (q) => (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          <Tooltip title="AI Intelligence & Review">
            <IconButton size="small" onClick={() => setReviewQuestion(q)} sx={{ color: '#0284c7' }}>
              <AutoAwesomeIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="View Question Details">
            <IconButton size="small" onClick={() => setViewQuestion(q)} sx={{ color: 'secondary.light' }}>
              <VisibilityIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Edit Question">
            <IconButton size="small" onClick={() => handleOpenDialog(q)} sx={{ color: 'primary.light' }}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete Question">
            <IconButton size="small" onClick={() => setDeleteTarget(q)} sx={{ color: 'error.light' }}>
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
        <div>
          <Typography variant="overline" sx={{ color: '#1765B5', fontWeight: 700, letterSpacing: '0.06em' }}>
            ASSESSMENT AUTHORING ENGINE
          </Typography>
          <Typography variant="h5" fontWeight={700} sx={{ color: '#14264B', mb: 0.5 }}>
            Authoritative Question Bank
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Multi-component repository with category tagging, difficulty levels, and automated test set generation.
          </Typography>
        </div>

        <Box sx={{ display: 'flex', gap: 1.25, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchQuestions}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            startIcon={batchClassifying ? <CircularProgress size={14} color="inherit" /> : <AutoAwesomeIcon />}
            onClick={handleBatchClassify}
            disabled={loading || batchClassifying || questions.length === 0}
            sx={{ fontWeight: 600 }}
          >
            {batchClassifying ? 'Classifying...' : 'Batch AI Classify'}
          </Button>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<AutoAwesomeIcon />}
            onClick={() => setImportDialogOpen(true)}
            sx={{
              fontWeight: 700,
              bgcolor: '#0284c7',
              '&:hover': {
                bgcolor: '#0369a1',
              },
            }}
          >
            AI Document / Image Import
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Create Question
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2.5 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {companyFilter && (
        <Alert
          severity="info"
          sx={{ mb: 2.5, alignItems: 'center' }}
          action={
            <Button
              color="inherit"
              size="small"
              variant="outlined"
              sx={{ bgcolor: 'rgba(255, 255, 255, 0.8)', borderColor: 'rgba(0,0,0,0.15)' }}
              onClick={() => {
                setCompanyFilter('');
                setSearchParams({});
                setPage(0);
              }}
            >
              Clear Filter (Show All)
            </Button>
          }
        >
          Filtering Question Bank by Company Track:{' '}
          <strong>
            {currentFilteredCompany
              ? `${currentFilteredCompany.name} (${currentFilteredCompany.code})`
              : companyFilter}
          </strong>
        </Alert>
      )}

      {/* Filter Toolbar */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 2.5,
          backgroundColor: '#ffffff',
          border: '1px solid #DCE6F5',
          borderRadius: '8px',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <FilterListIcon sx={{ color: '#1765B5', fontSize: 18 }} />
          <Typography variant="subtitle2" fontWeight={700} color="#14264B">
            Multi-Parameter Question Filter
          </Typography>
        </Box>

        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={2}>
            <FormControl size="small" fullWidth>
              <InputLabel>Company Track</InputLabel>
              <Select
                value={companyFilter}
                label="Company Track"
                onChange={(e) => {
                  const val = e.target.value;
                  setCompanyFilter(val);
                  setSearchParams(val ? { companyId: val } : {});
                  setPage(0);
                }}
              >
                <MenuItem value="">All Companies (Global)</MenuItem>
                {companies.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={2}>
            <FormControl size="small" fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={categoryFilter}
                label="Category"
                onChange={(e) => {
                  setCategoryFilter(e.target.value as QuestionCategory | '');
                  setTopicFilter('');
                  setPage(0);
                }}
              >
                <MenuItem value="">All Categories</MenuItem>
                <MenuItem value="QUANTITATIVE_APTITUDE">Quantitative Aptitude</MenuItem>
                <MenuItem value="LOGICAL_REASONING">Logical Reasoning</MenuItem>
                <MenuItem value="VERBAL_ABILITY">Verbal Ability</MenuItem>
                <MenuItem value="TECHNICAL_MCQ">Technical MCQ</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={2}>
            <FormControl size="small" fullWidth>
              <InputLabel>Topic</InputLabel>
              <Select
                value={topicFilter}
                label="Topic"
                disabled={!categoryFilter}
                onChange={(e) => {
                  setTopicFilter(e.target.value);
                  setPage(0);
                }}
              >
                <MenuItem value="">All Topics</MenuItem>
                {filterTopics.map((t) => (
                  <MenuItem key={t} value={t}>
                    {t}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={4} md={1.7}>
            <FormControl size="small" fullWidth>
              <InputLabel>Difficulty</InputLabel>
              <Select
                value={difficultyFilter}
                label="Difficulty"
                onChange={(e) => {
                  setDifficultyFilter(e.target.value as QuestionDifficulty | '');
                  setPage(0);
                }}
              >
                <MenuItem value="">All Difficulties</MenuItem>
                <MenuItem value="EASY">Easy</MenuItem>
                <MenuItem value="MEDIUM">Medium</MenuItem>
                <MenuItem value="HARD">Hard</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={4} md={1.7}>
            <FormControl size="small" fullWidth>
              <InputLabel>Question Type</InputLabel>
              <Select
                value={typeFilter}
                label="Question Type"
                onChange={(e) => {
                  setTypeFilter(e.target.value as QuestionType | '');
                  setPage(0);
                }}
              >
                <MenuItem value="">All Types</MenuItem>
                <MenuItem value="SINGLE_CHOICE">Single Choice</MenuItem>
                <MenuItem value="MULTIPLE_CHOICE">Multiple Choice</MenuItem>
                <MenuItem value="TRUE_FALSE">True / False</MenuItem>
                <MenuItem value="FILL_BLANK">Fill in Blank</MenuItem>
                <MenuItem value="DESCRIPTIVE">Descriptive</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={4} md={1.4}>
            <FormControl size="small" fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                label="Status"
                onChange={(e) => {
                  setStatusFilter(e.target.value as QuestionStatus | '');
                  setPage(0);
                }}
              >
                <MenuItem value="">All Statuses</MenuItem>
                <MenuItem value="ACTIVE">ACTIVE</MenuItem>
                <MenuItem value="INACTIVE">INACTIVE</MenuItem>
                <MenuItem value="DRAFT">DRAFT</MenuItem>
                <MenuItem value="ARCHIVED">ARCHIVED</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={4} md={1.6}>
            <FormControl size="small" fullWidth>
              <InputLabel>AI Intelligence</InputLabel>
              <Select
                value={aiStatusFilter}
                label="AI Intelligence"
                onChange={(e) => {
                  setAiStatusFilter(e.target.value as AiClassificationStatus | '');
                  setPage(0);
                }}
              >
                <MenuItem value="">All AI Statuses</MenuItem>
                <MenuItem value="CLASSIFIED">Classified</MenuItem>
                <MenuItem value="NEEDS_REVIEW">Needs Review</MenuItem>
                <MenuItem value="AI_PENDING">AI Pending</MenuItem>
                <MenuItem value="AI_FAILED">AI Failed</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={1.2}>
            <Button
              variant="outlined"
              color="inherit"
              fullWidth
              startIcon={<RefreshIcon />}
              onClick={() => {
                setSearch('');
                setCategoryFilter('');
                setTopicFilter('');
                setDifficultyFilter('');
                setTypeFilter('');
                setStatusFilter('');
                setAiStatusFilter('');
                setCompanyFilter('');
                setSearchParams({});
                setPage(0);
              }}
            >
              Reset
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Main Question DataTable */}
      <DataTable
        columns={columns}
        data={questions}
        loading={loading}
        totalCount={totalCount}
        page={page}
        rowsPerPage={rowsPerPage}
        searchValue={search}
        searchPlaceholder="Search question text or topic..."
        onSearchChange={(val) => {
          setSearch(val);
          setPage(0);
        }}
        onPageChange={(newPage) => setPage(newPage)}
        onRowsPerPageChange={(newLimit) => {
          setRowsPerPage(newLimit);
          setPage(0);
        }}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={handleSortChange}
        emptyMessage="No assessment questions found matching criteria."
      />

      {/* Create / Edit Question Modal */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: '#ffffff',
            border: '1px solid #DCE6F5',
            borderRadius: 3,
            boxShadow: '0 20px 25px -5px rgba(20, 38, 75, 0.1)',
          },
        }}
      >
        <form onSubmit={handleSaveQuestion}>
          <DialogTitle
            sx={{
              color: '#14264B',
              fontWeight: 700,
              fontSize: '1.25rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid #DCE6F5',
              pb: 2,
            }}
          >
            <Box>
              <Typography variant="h6" fontWeight={700} color="#14264B">
                {editingQuestion ? 'Edit Assessment Question' : 'Author New Assessment Question'}
              </Typography>
              <Typography variant="caption" color="#7182A0">
                Configure question classification, scoring weights, prompt, and answer choices.
              </Typography>
            </Box>
            <IconButton onClick={() => setDialogOpen(false)} size="small" sx={{ color: '#7182A0' }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 3, pb: 3 }}>
            {formError && (
              <Alert severity="error" variant="outlined" onClose={() => setFormError(null)}>
                {formError}
              </Alert>
            )}

            {/* SECTION 1: Classification & Scoring */}
            <Paper
              variant="outlined"
              sx={{
                p: 2.5,
                borderRadius: 2,
                backgroundColor: '#EDF2FF',
                border: '1px solid #DCE6F5',
              }}
            >
              <Typography variant="subtitle2" fontWeight={700} color="#14264B" sx={{ mb: 2 }}>
                1. Question Classification & Scoring
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    select
                    label="Company Track Association"
                    fullWidth
                    value={formCompanyId}
                    onChange={(e) => setFormCompanyId(e.target.value)}
                    helperText="Assign to a company track or leave General (Global Bank)"
                  >
                    <MenuItem value="">
                      <em>General / Global (All Companies)</em>
                    </MenuItem>
                    {companies.map((c) => (
                      <MenuItem key={c.id} value={c.id}>
                        {c.name} ({c.code})
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    select
                    label="Category"
                    required
                    fullWidth
                    value={formCategory}
                    onChange={(e) => {
                      const newCat = e.target.value as QuestionCategory;
                      setFormCategory(newCat);
                      const defaultTopic = CATEGORY_TOPICS_MAP[newCat][0] || '';
                      setFormTopic(defaultTopic);
                    }}
                  >
                    <MenuItem value="QUANTITATIVE_APTITUDE">Quantitative Aptitude</MenuItem>
                    <MenuItem value="LOGICAL_REASONING">Logical Reasoning</MenuItem>
                    <MenuItem value="VERBAL_ABILITY">Verbal Ability</MenuItem>
                    <MenuItem value="TECHNICAL_MCQ">Technical MCQ</MenuItem>
                  </TextField>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    select
                    label="Authoritative Topic"
                    required
                    fullWidth
                    value={formTopic}
                    onChange={(e) => setFormTopic(e.target.value)}
                  >
                    {formAvailableTopics.map((t) => (
                      <MenuItem key={t} value={t}>
                        {t}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    select
                    label="Difficulty"
                    required
                    fullWidth
                    value={formDifficulty}
                    onChange={(e) => setFormDifficulty(e.target.value as QuestionDifficulty)}
                  >
                    <MenuItem value="EASY">Easy</MenuItem>
                    <MenuItem value="MEDIUM">Medium</MenuItem>
                    <MenuItem value="HARD">Hard</MenuItem>
                  </TextField>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    select
                    label="Question Type"
                    required
                    fullWidth
                    value={formType}
                    onChange={(e) => handleTypeChange(e.target.value as QuestionType)}
                  >
                    <MenuItem value="SINGLE_CHOICE">Single Choice (1 Correct)</MenuItem>
                    <MenuItem value="MULTIPLE_CHOICE">Multiple Choice (1+ Correct)</MenuItem>
                    <MenuItem value="TRUE_FALSE">True / False</MenuItem>
                    <MenuItem value="FILL_BLANK">Fill in the Blank</MenuItem>
                    <MenuItem value="DESCRIPTIVE">Descriptive</MenuItem>
                  </TextField>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    select
                    label="Status"
                    required
                    fullWidth
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as QuestionStatus)}
                  >
                    <MenuItem value="ACTIVE">ACTIVE</MenuItem>
                    <MenuItem value="DRAFT">DRAFT</MenuItem>
                    <MenuItem value="INACTIVE">INACTIVE</MenuItem>
                    <MenuItem value="ARCHIVED">ARCHIVED</MenuItem>
                  </TextField>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Marks (Positive)"
                    type="number"
                    required
                    fullWidth
                    inputProps={{ min: 0.25, max: 50, step: 0.25 }}
                    value={formMarks}
                    onChange={(e) => setFormMarks(Number(e.target.value))}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Negative Marks"
                    type="number"
                    required
                    fullWidth
                    inputProps={{ min: 0, max: formMarks, step: 0.25 }}
                    value={formNegativeMarks}
                    onChange={(e) => setFormNegativeMarks(Number(e.target.value))}
                    helperText={`Deducted on incorrect answer (Max: ${formMarks})`}
                  />
                </Grid>
              </Grid>
            </Paper>

            {/* SECTION 2: Question Statement / Prompt */}
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, flexWrap: 'wrap', gap: 1 }}>
                <Typography variant="subtitle2" fontWeight={700} color="#14264B">
                  2. Question Statement / Prompt
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    size="small"
                    variant="contained"
                    color="secondary"
                    startIcon={detectingMetadata ? <CircularProgress size={14} color="inherit" /> : <AutoAwesomeIcon />}
                    onClick={handleAutoDetectMetadata}
                    disabled={detectingMetadata || !formText.trim()}
                    sx={{ textTransform: 'none', py: 0.3, fontWeight: 700 }}
                  >
                    {detectingMetadata ? 'Detecting Concept...' : 'AI Auto-Detect'}
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<AddPhotoAlternateIcon />}
                    onClick={() => setShowImageHelper(!showImageHelper)}
                    sx={{ textTransform: 'none', py: 0.3 }}
                  >
                    {showImageHelper ? 'Hide Image Tool' : 'Insert Image / Diagram'}
                  </Button>
                </Box>
              </Box>

              {detectedConfidenceBadge && (
                <Alert severity="success" sx={{ mb: 1.5, py: 0.5, fontSize: '0.85rem' }} onClose={() => setDetectedConfidenceBadge(null)}>
                  {detectedConfidenceBadge}
                </Alert>
              )}

              {showImageHelper && (
                <Paper variant="outlined" sx={{ p: 2, mb: 1.5, bgcolor: '#f0f9ff', borderColor: '#bae6fd' }}>
                  <Typography variant="caption" fontWeight={700} color="#0369a1" sx={{ display: 'block', mb: 1 }}>
                    Attach Diagram / Image to Question (Supports URL or markdown):
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <TextField
                      size="small"
                      fullWidth
                      placeholder="Paste Image URL (e.g. https://... or hosted image link)"
                      value={imageUrlInput}
                      onChange={(e) => setImageUrlInput(e.target.value)}
                    />
                    <Button
                      variant="contained"
                      size="small"
                      disabled={!imageUrlInput.trim()}
                      onClick={() => {
                        const trimmed = imageUrlInput.trim();
                        if (trimmed) {
                          const tag = `\n\n![Question Diagram](${trimmed})\n`;
                          setFormText((prev) => prev + tag);
                          setImageUrlInput('');
                        }
                      }}
                    >
                      Insert
                    </Button>
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
                    Tip: You can also directly paste <code>![Image description](https://url)</code> or an image URL anywhere in the question text.
                  </Typography>
                </Paper>
              )}

              <TextField
                label="Question Text"
                required
                fullWidth
                multiline
                rows={3}
                value={formText}
                onChange={(e) => setFormText(e.target.value)}
                placeholder="Enter the complete question prompt, code snippet, scenario, or problem description..."
              />

              {/* Diagram / Visual Figure Attachment Area */}
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  mt: 2,
                  borderRadius: 2,
                  bgcolor: '#F8FAFC',
                  border: '1px solid #DCE6F5',
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AddPhotoAlternateIcon sx={{ color: '#0284c7', fontSize: 20 }} />
                    <Typography variant="subtitle2" fontWeight={700} color="#14264B">
                      Diagram / Visual Figure Attachment (Optional)
                    </Typography>
                  </Box>
                  {formImageUrl && (
                    <Chip
                      label="Visual Attached"
                      size="small"
                      color="info"
                      sx={{ height: 22, fontSize: '0.7rem', fontWeight: 700 }}
                    />
                  )}
                </Box>

                {imageUploadError && (
                  <Alert severity="error" sx={{ mb: 1.5, py: 0.5, fontSize: '0.8rem' }} onClose={() => setImageUploadError(null)}>
                    {imageUploadError}
                  </Alert>
                )}

                {formImageUrl ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <Box
                      sx={{
                        p: 2,
                        bgcolor: '#ffffff',
                        borderRadius: 2,
                        border: '1px solid #DCE6F5',
                        display: 'flex',
                        flexDirection: { xs: 'column', sm: 'row' },
                        gap: 2.5,
                        alignItems: { xs: 'stretch', sm: 'flex-start' },
                      }}
                    >
                      <Box sx={{ maxWidth: { xs: '100%', sm: 300 }, minWidth: { sm: 220 }, width: '100%' }}>
                        <Typography variant="caption" fontWeight={700} color="#7182A0" sx={{ display: 'block', mb: 0.5 }}>
                          Live Interactive Preview:
                        </Typography>
                        <QuestionContentRenderer content="" imageUrl={formImageUrl} />
                      </Box>
                      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Typography variant="body2" fontWeight={700} color="#14264B">
                          Diagram Associated With This Question
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ wordBreak: 'break-all' }}>
                          Resource: {formImageUrl}
                        </Typography>
                        <Typography variant="caption" color="#7182A0">
                          Students taking an assessment with this question will view this diagram with click-to-zoom support.
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/png,image/jpeg,image/webp,image/jpg"
                            style={{ display: 'none' }}
                            onChange={handleImageFileSelect}
                          />
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={uploadingImage ? <CircularProgress size={14} color="inherit" /> : <CloudUploadIcon />}
                            disabled={uploadingImage}
                            onClick={() => fileInputRef.current?.click()}
                            sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.78rem' }}
                          >
                            {uploadingImage ? 'Uploading...' : 'Replace Diagram'}
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            startIcon={<DeleteOutlineIcon />}
                            disabled={uploadingImage}
                            onClick={() => setFormImageUrl(null)}
                            sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.78rem' }}
                          >
                            Remove Diagram
                          </Button>
                        </Box>
                      </Box>
                    </Box>
                  </Box>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/jpg"
                      style={{ display: 'none' }}
                      onChange={handleImageFileSelect}
                    />
                    <Box
                      sx={{
                        p: 3,
                        border: '1.5px dashed #93c5fd',
                        borderRadius: 2,
                        bgcolor: '#f0f9ff',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 1,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        '&:hover': { bgcolor: '#e0f2fe', borderColor: '#0284c7' },
                      }}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {uploadingImage ? (
                        <CircularProgress size={28} sx={{ color: '#0284c7' }} />
                      ) : (
                        <CloudUploadIcon sx={{ fontSize: 36, color: '#0284c7' }} />
                      )}
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="body2" fontWeight={700} color="#0369a1">
                          {uploadingImage ? 'Uploading and validating diagram...' : 'Upload Diagram / Chart / Figure from Computer'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Supports PNG, JPG, JPEG, and WebP (Max: 5MB). Circuit diagrams, geometry, graphs, tables.
                        </Typography>
                      </Box>
                      <Button
                        size="small"
                        variant="contained"
                        disabled={uploadingImage}
                        sx={{ bgcolor: '#0284c7', '&:hover': { bgcolor: '#0369a1' }, textTransform: 'none', fontWeight: 700, mt: 0.5 }}
                      >
                        Browse Image File
                      </Button>
                    </Box>
                  </Box>
                )}
              </Paper>

              {/* Live Preview if question prompt contains text or markdown images */}
              {(formText.includes('![') || formText.includes('<img') || /https?:\/\/\S+\.(?:png|jpe?g|gif|webp|svg)/i.test(formText)) && (
                <Box sx={{ mt: 1.5, p: 2, bgcolor: '#EDF2FF', borderRadius: 2, border: '1px dashed #D1DEF0' }}>
                  <Typography variant="caption" fontWeight={700} color="#7182A0" sx={{ textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', mb: 1 }}>
                    Inline Markdown Prompt Preview:
                  </Typography>
                  <QuestionContentRenderer content={formText} />
                </Box>
              )}
            </Box>

            {/* SECTION 3: Dynamic Options Management */}
            {(formType === 'SINGLE_CHOICE' || formType === 'MULTIPLE_CHOICE' || formType === 'TRUE_FALSE') && (
              <Paper
                variant="outlined"
                sx={{
                  p: 2.5,
                  borderRadius: 2,
                  backgroundColor: '#EDF2FF',
                  border: '1px solid #DCE6F5',
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                  <Box>
                    <Typography variant="subtitle2" fontWeight={700} color="#14264B">
                      3. Options & Correct Answer Selection
                    </Typography>
                    <Typography variant="caption" color="#7182A0">
                      Mark the correct option using the selector on the left.
                    </Typography>
                  </Box>
                  {formType !== 'TRUE_FALSE' && formOptions.length < 6 && (
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<AddIcon />}
                      onClick={() =>
                        setFormOptions([
                          ...formOptions,
                          { optionText: '', optionOrder: formOptions.length + 1, isCorrect: false },
                        ])
                      }
                      sx={{ bgcolor: '#ffffff' }}
                    >
                      Add Option
                    </Button>
                  )}
                </Box>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {formOptions.map((opt, idx) => (
                    <Paper
                      key={idx}
                      elevation={0}
                      sx={{
                        p: 1.5,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        backgroundColor: opt.isCorrect ? '#f0fdf4' : '#ffffff',
                        border: opt.isCorrect ? '1.5px solid #16a34a' : '1px solid #D1DEF0',
                        borderRadius: 2,
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {formType === 'SINGLE_CHOICE' || formType === 'TRUE_FALSE' ? (
                        <Radio
                          checked={opt.isCorrect}
                          color="success"
                          onChange={() => {
                            const updated = formOptions.map((o, i) => ({
                              ...o,
                              isCorrect: i === idx,
                            }));
                            setFormOptions(updated);
                          }}
                        />
                      ) : (
                        <Checkbox
                          checked={opt.isCorrect}
                          color="success"
                          onChange={(e) => {
                            const updated = [...formOptions];
                            updated[idx].isCorrect = e.target.checked;
                            setFormOptions(updated);
                          }}
                        />
                      )}

                      <TextField
                        size="small"
                        fullWidth
                        disabled={formType === 'TRUE_FALSE'}
                        label={`Option ${idx + 1}`}
                        value={opt.optionText}
                        onChange={(e) => {
                          const updated = [...formOptions];
                          updated[idx].optionText = e.target.value;
                          setFormOptions(updated);
                        }}
                        placeholder={`Enter Option ${idx + 1} text`}
                      />

                      {formType !== 'TRUE_FALSE' && formOptions.length > 2 && (
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => {
                            const updated = formOptions.filter((_, i) => i !== idx);
                            setFormOptions(updated);
                          }}
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      )}
                    </Paper>
                  ))}
                </Box>
              </Paper>
            )}

            {/* Fill Blank Correct Answer */}
            {formType === 'FILL_BLANK' && (
              <Box>
                <Typography variant="subtitle2" fontWeight={700} color="#14264B" sx={{ mb: 1 }}>
                  3. Exact Correct Answer Key
                </Typography>
                <TextField
                  label="Exact Correct Answer"
                  required
                  fullWidth
                  value={formCorrectAnswer}
                  onChange={(e) => setFormCorrectAnswer(e.target.value)}
                  placeholder="Enter exact keyword or phrase expected from student..."
                  helperText="Case-insensitive exact match evaluation against student input"
                />
              </Box>
            )}

            {/* Descriptive Model Criteria */}
            {formType === 'DESCRIPTIVE' && (
              <Box>
                <Typography variant="subtitle2" fontWeight={700} color="#14264B" sx={{ mb: 1 }}>
                  3. Model Answer & Scoring Rubric
                </Typography>
                <TextField
                  label="Model Answer / Scoring Rubric"
                  fullWidth
                  multiline
                  rows={2}
                  value={formCorrectAnswer}
                  onChange={(e) => setFormCorrectAnswer(e.target.value)}
                  placeholder="Optional grading guidelines or expected points..."
                />
              </Box>
            )}

            {/* SECTION 4: Explanation */}
            <Box>
              <Typography variant="subtitle2" fontWeight={700} color="#14264B" sx={{ mb: 1 }}>
                4. Solution Explanation & Notes
              </Typography>
              <TextField
                label="Solution Explanation (Provided after assessment)"
                fullWidth
                multiline
                rows={2}
                value={formExplanation}
                onChange={(e) => setFormExplanation(e.target.value)}
                placeholder="Step-by-step reasoning or theoretical derivation..."
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 2.5, backgroundColor: '#EDF2FF', borderTop: '1px solid #DCE6F5' }}>
            <Button onClick={() => setDialogOpen(false)} variant="outlined" color="inherit">
              Cancel
            </Button>
            <Button type="submit" variant="contained" color="primary" disabled={saving} sx={{ px: 3 }}>
              {saving ? <CircularProgress size={20} color="inherit" /> : 'Save Question'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* View Question Detail Modal */}
      <Dialog
        open={!!viewQuestion}
        onClose={() => setViewQuestion(null)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: '#ffffff',
            border: '1px solid #DCE6F5',
            borderRadius: 3,
            boxShadow: '0 20px 25px -5px rgba(20, 38, 75, 0.1)',
          },
        }}
      >
        {viewQuestion && (
          <>
            <DialogTitle
              sx={{
                color: '#14264B',
                fontWeight: 700,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid #DCE6F5',
                pb: 2,
              }}
            >
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                <Chip label={viewQuestion.category.replace('_', ' ')} color="primary" size="small" sx={{ fontWeight: 700 }} />
                <Chip label={viewQuestion.topic} variant="outlined" size="small" sx={{ fontWeight: 600, color: '#405678', borderColor: '#D1DEF0' }} />
                <Chip
                  label={viewQuestion.difficulty}
                  size="small"
                  color={viewQuestion.difficulty === 'EASY' ? 'success' : viewQuestion.difficulty === 'MEDIUM' ? 'warning' : 'error'}
                  sx={{ fontWeight: 700 }}
                />
                {viewQuestion.company ? (
                  <Chip
                    label={`Company: ${viewQuestion.company.name} (${viewQuestion.company.code})`}
                    size="small"
                    color="secondary"
                    variant="outlined"
                    sx={{ fontWeight: 700 }}
                  />
                ) : (
                  <Chip
                    label="Global Question"
                    size="small"
                    variant="outlined"
                    sx={{ fontWeight: 600, color: '#7182A0', borderColor: '#D1DEF0' }}
                  />
                )}
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip label={`+${viewQuestion.marks} / -${viewQuestion.negativeMarks} Marks`} size="small" sx={{ fontWeight: 700, bgcolor: '#eff6ff', color: '#267D86' }} />
                <IconButton onClick={() => setViewQuestion(null)} size="small" sx={{ color: '#7182A0' }}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Box>
            </DialogTitle>
            <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 3 }}>
              <Paper variant="outlined" sx={{ p: 2.5, bgcolor: '#EDF2FF', border: '1px solid #DCE6F5', borderRadius: 2 }}>
                <Typography variant="caption" fontWeight={700} color="#7182A0" sx={{ textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', mb: 1 }}>
                  Question Statement
                </Typography>
                <QuestionContentRenderer content={viewQuestion.questionText} imageUrl={viewQuestion.imageUrl} />
              </Paper>

              {/* Options Breakdown */}
              {viewQuestion.options.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" fontWeight={700} color="#14264B" sx={{ mb: 1.5 }}>
                    Options & Correctness Evaluation:
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {viewQuestion.options.map((opt) => (
                      <Paper
                        key={opt.id}
                        elevation={0}
                        sx={{
                          p: 1.5,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1.5,
                          bgcolor: opt.isCorrect ? '#f0fdf4' : '#ffffff',
                          border: opt.isCorrect ? '1.5px solid #16a34a' : '1px solid #DCE6F5',
                          borderRadius: 2,
                        }}
                      >
                        {opt.isCorrect ? (
                          <CheckCircleIcon sx={{ color: '#16a34a', fontSize: 20 }} />
                        ) : (
                          <Box sx={{ width: 18, height: 18, borderRadius: '50%', border: '1px solid #D1DEF0' }} />
                        )}
                        <Typography variant="body2" color="#14264B" fontWeight={opt.isCorrect ? 700 : 500}>
                          {opt.optionText}
                        </Typography>
                        {opt.isCorrect && (
                          <Chip label="Correct Answer" size="small" color="success" sx={{ ml: 'auto', height: 20, fontSize: '0.7rem', fontWeight: 700 }} />
                        )}
                      </Paper>
                    ))}
                  </Box>
                </Box>
              )}

              {/* Text answer if Fill Blank */}
              {viewQuestion.questionType === 'FILL_BLANK' && viewQuestion.correctAnswer && (
                <Box sx={{ p: 2, bgcolor: '#f0fdf4', borderRadius: 2, border: '1px solid #86efac' }}>
                  <Typography variant="caption" color="#166534" fontWeight={700}>
                    Correct Answer:
                  </Typography>
                  <Typography variant="body1" fontWeight={700} color="#14532d">
                    {viewQuestion.correctAnswer}
                  </Typography>
                </Box>
              )}

              {/* Explanation */}
              {viewQuestion.explanation && (
                <Box sx={{ p: 2, bgcolor: '#eff6ff', borderRadius: 2, border: '1px solid #bfdbfe' }}>
                  <Typography variant="caption" color="#267D86" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <HelpOutlineIcon fontSize="inherit" /> Solution Explanation:
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <QuestionContentRenderer content={viewQuestion.explanation} color="#3B82D0" variant="body2" />
                  </Box>
                </Box>
              )}

              <Divider sx={{ borderColor: '#DCE6F5' }} />

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                <Typography variant="caption" color="#7182A0">
                  Assessment Usages: <strong>{viewQuestion._count?.usages ?? 0} times</strong>
                </Typography>
                <Typography variant="caption" color="#7182A0">
                  Created: <strong>{new Date(viewQuestion.createdAt).toLocaleDateString()}</strong>
                </Typography>
              </Box>
            </DialogContent>
            <DialogActions sx={{ p: 2.5, bgcolor: '#EDF2FF', borderTop: '1px solid #DCE6F5' }}>
              <Button onClick={() => setViewQuestion(null)} variant="outlined" color="inherit">
                Close
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* AI Question Import Dialog */}
      <AiQuestionImportDialog
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        onSuccess={() => {
          fetchQuestions();
        }}
        companies={companies}
        defaultCompanyId={companyFilter}
      />

      {/* AI Classification Review & Approval Dialog */}
      <AiClassificationReviewDialog
        open={Boolean(reviewQuestion)}
        question={reviewQuestion}
        onClose={() => setReviewQuestion(null)}
        onSuccess={(updated) => {
          setQuestions((prev) => prev.map((q) => (q.id === updated.id ? updated : q)));
          if (viewQuestion?.id === updated.id) {
            setViewQuestion(updated);
          }
        }}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Assessment Question"
        message="Are you sure you want to delete this question? Questions that have already been used in institutional assessments are protected and cannot be deleted."
        loading={deleting}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </Box>
  );
};
