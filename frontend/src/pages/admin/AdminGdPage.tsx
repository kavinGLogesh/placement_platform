import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Tooltip,
  Chip,
  Grid,
  Card,
  CardContent,
  CardActions,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Divider,
  Stack,
  FormControl,
  InputLabel,
  Select,
  InputAdornment,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import RefreshIcon from '@mui/icons-material/Refresh';
import GroupsIcon from '@mui/icons-material/Groups';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import SearchIcon from '@mui/icons-material/Search';
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff';
import SaveIcon from '@mui/icons-material/Save';
import SendIcon from '@mui/icons-material/Send';
import CloseIcon from '@mui/icons-material/Close';
import TableChartIcon from '@mui/icons-material/TableChart';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import TuneIcon from '@mui/icons-material/Tune';
import { useAuth } from '../../hooks/useAuth.js';
import { evaluationService } from '../../services/evaluation.service.js';
import { managementService } from '../../services/management.service.js';
import { StudentSelector } from '../../components/evaluation/StudentSelector.js';
import {
  GdRoundDto,
  GdParticipantDto,
  CriterionConfig,
  DEFAULT_GD_CRITERIA,
  AttendanceStatus,
  BulkStudentEvaluationItemInput,
  BulkStudentEvaluationScoreInput,
} from '../../types/evaluation.types.js';
import { ClassEntity, Section } from '../../types/management.types.js';

export const AdminGdPage: React.FC = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  // GD Rounds State
  const [rounds, setRounds] = useState<GdRoundDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusTab, setStatusTab] = useState<string>('ALL');

  // Institutional Hierarchy Data
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([]);
  const [courses, setCourses] = useState<Array<{ id: string; name: string; departmentId: string }>>([]);
  const [classes, setClasses] = useState<ClassEntity[]>([]);
  const [sections, setSections] = useState<Section[]>([]);

  // Create GD Round Dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTopic, setNewTopic] = useState('');
  const [newInstructions, setNewInstructions] = useState('');
  const [newScheduledDate, setNewScheduledDate] = useState('');
  const [newDuration, setNewDuration] = useState(30);
  const [newEvaluatorId, setNewEvaluatorId] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedBatchYear, setSelectedBatchYear] = useState('');
  const [criteria, setCriteria] = useState<CriterionConfig[]>([...DEFAULT_GD_CRITERIA]);
  const [createSelectedStudentIds, setCreateSelectedStudentIds] = useState<string[]>([]);

  // Selected Round for Overall Evaluation Sheet Workspace
  const [selectedRound, setSelectedRound] = useState<GdRoundDto | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Dynamic Student Assignment Dialog
  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [assigning, setAssigning] = useState(false);

  // Participant Filters inside Selected Round
  const [partDeptFilter, setPartDeptFilter] = useState('');
  const [partCourseFilter, setPartCourseFilter] = useState('');
  const [partClassFilter, setPartClassFilter] = useState('');
  const [partSectionFilter, setPartSectionFilter] = useState('');
  const [partSearch, setPartSearch] = useState('');

  // Excel-Style Evaluation Sheet Marks State (studentId -> { scores, feedback, errors })
  const [sheetScores, setSheetScores] = useState<
    Record<
      string,
      {
        scores: Record<string, string | number>;
        feedback: string;
        errors: Record<string, string>;
      }
    >
  >({});
  const [savingDraft, setSavingDraft] = useState(false);
  const [submittingEval, setSubmittingEval] = useState(false);
  const [sheetAlert, setSheetAlert] = useState<{ severity: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Category / Criteria Management Modal State
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCriteria, setEditingCriteria] = useState<CriterionConfig[]>([]);
  const [savingCriteria, setSavingCriteria] = useState(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);

  // Load rounds
  const fetchRounds = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await evaluationService.getGdRounds({
        status: statusTab !== 'ALL' ? statusTab : undefined,
      });
      setRounds(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load GD rounds');
    } finally {
      setLoading(false);
    }
  }, [statusTab]);

  useEffect(() => {
    fetchRounds();
  }, [fetchRounds]);

  // Load institutional hierarchy
  useEffect(() => {
    const loadHierarchy = async () => {
      try {
        const [deptRes, courseRes, classRes, secRes] = await Promise.all([
          managementService.getDepartments(),
          managementService.getCourses(),
          managementService.getClasses(),
          managementService.getSections(),
        ]);
        setDepartments((deptRes as any) || []);
        setCourses((courseRes as any) || []);
        setClasses(classRes || []);
        setSections(secRes || []);
      } catch (e) {
        console.error('Failed to load institutional hierarchy', e);
      }
    };
    loadHierarchy();
  }, []);

  // Sync sheet scores whenever selectedRound data is refreshed
  const populateSheetScoresFromRound = useCallback((round: GdRoundDto) => {
    const initial: typeof sheetScores = {};
    (round.participants || []).forEach((p) => {
      const scores: Record<string, string | number> = {};
      if (p.evaluation?.criterionScores) {
        p.evaluation.criterionScores.forEach((cs) => {
          scores[cs.criterionId] = cs.score;
        });
      }
      initial[p.studentId] = {
        scores,
        feedback: p.evaluation?.feedback || '',
        errors: {},
      };
    });
    setSheetScores(initial);
  }, []);

  const refreshSelectedRound = async (roundId: string) => {
    try {
      setDetailsLoading(true);
      const fresh = await evaluationService.getGdRoundById(roundId);
      setSelectedRound(fresh);
      populateSheetScoresFromRound(fresh);
      // Also update in rounds list
      setRounds((prev) => prev.map((r) => (r.id === fresh.id ? fresh : r)));
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to refresh round details');
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleOpenEvaluationSheet = (round: GdRoundDto) => {
    setSelectedRound(round);
    populateSheetScoresFromRound(round);
    setPartDeptFilter('');
    setPartCourseFilter('');
    setPartClassFilter('');
    setPartSectionFilter('');
    setPartSearch('');
    setSheetAlert(null);
  };

  const handleBackToRounds = () => {
    setSelectedRound(null);
    setSheetAlert(null);
  };

  // Create Round
  const handleOpenCreate = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 60);
    const dateStr = now.toISOString().slice(0, 16);
    setNewTitle('');
    setNewTopic('');
    setNewInstructions('');
    setNewScheduledDate(dateStr);
    setNewDuration(30);
    setNewEvaluatorId('');
    setSelectedDeptId('');
    setSelectedCourseId('');
    setSelectedBatchYear('');
    setCriteria(DEFAULT_GD_CRITERIA.map((c) => ({ ...c })));
    setCreateSelectedStudentIds([]);
    setCreateOpen(true);
  };

  const handleAddCriterion = () => {
    setCriteria((prev) => [
      ...prev,
      { name: `Criterion ${prev.length + 1}`, maxMarks: 10, order: prev.length + 1 },
    ]);
  };

  const handleRemoveCriterion = (index: number) => {
    if (criteria.length <= 1) return;
    setCriteria((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleUpdateCriterion = (index: number, field: keyof CriterionConfig, value: any) => {
    setCriteria((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleCreateSubmit = async () => {
    if (!newTitle.trim() || !newTopic.trim() || !newScheduledDate) {
      alert('Please fill in title, topic, and scheduled date.');
      return;
    }
    try {
      setCreating(true);
      await evaluationService.createGdRound({
        title: newTitle.trim(),
        topic: newTopic.trim(),
        instructions: newInstructions.trim() || undefined,
        scheduledDate: new Date(newScheduledDate).toISOString(),
        durationMinutes: Number(newDuration),
        evaluatorId: newEvaluatorId.trim() || undefined,
        departmentId: selectedDeptId || undefined,
        courseId: selectedCourseId || undefined,
        batchYear: selectedBatchYear ? Number(selectedBatchYear) : undefined,
        studentIds: createSelectedStudentIds.length > 0 ? createSelectedStudentIds : undefined,
        criteria,
      });
      setCreateOpen(false);
      setCreateSelectedStudentIds([]);
      await fetchRounds();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to create GD round');
    } finally {
      setCreating(false);
    }
  };

  // Student Assignment
  const handleOpenAssign = (round: GdRoundDto) => {
    setSelectedRound(round);
    const existingIds = (round.participants || []).map((p) => p.studentId);
    setSelectedStudentIds([...existingIds]);
    setAssignOpen(true);
  };

  const handleAssignSubmit = async () => {
    if (!selectedRound || selectedStudentIds.length === 0) return;
    try {
      setAssigning(true);
      const existingIds = new Set((selectedRound.participants || []).map((p) => p.studentId));
      const newIds = selectedStudentIds.filter((id) => !existingIds.has(id));
      if (newIds.length === 0) {
        alert('All selected students are already assigned to this round.');
        setAssignOpen(false);
        return;
      }
      await evaluationService.assignStudentsToGd(selectedRound.id, newIds);
      setAssignOpen(false);
      setSelectedStudentIds([]);
      await refreshSelectedRound(selectedRound.id);
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Failed to assign students');
    } finally {
      setAssigning(false);
    }
  };

  // Attendance
  const handleToggleAttendance = async (part: GdParticipantDto, nextStatus: AttendanceStatus) => {
    if (isSuperAdmin) return;
    try {
      await evaluationService.updateGdAttendance(part.id, nextStatus);
      if (selectedRound) {
        await refreshSelectedRound(selectedRound.id);
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to update attendance');
    }
  };

  const handleMarkAllPresent = async () => {
    if (!selectedRound || isSuperAdmin) return;
    try {
      const records = selectedRound.participants.map((p) => ({
        participantId: p.id,
        attendance: 'PRESENT' as AttendanceStatus,
      }));
      await evaluationService.batchUpdateGdAttendance(records);
      await refreshSelectedRound(selectedRound.id);
      setSheetAlert({ severity: 'success', message: 'All participants marked present.' });
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to batch update attendance');
    }
  };

  const handleDeleteRound = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this GD round?')) return;
    try {
      await evaluationService.deleteGdRound(id);
      if (selectedRound?.id === id) {
        setSelectedRound(null);
      }
      await fetchRounds();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to delete GD round');
    }
  };

  // Participant Filtering inside Selected GD Round
  const filteredParticipants = useMemo(() => {
    return (selectedRound?.participants || []).filter((p) => {
      if (partDeptFilter && p.departmentId !== partDeptFilter) return false;
      if (partCourseFilter && p.courseId !== partCourseFilter) return false;
      if (partClassFilter && p.classId !== partClassFilter) return false;
      if (partSectionFilter && p.sectionId !== partSectionFilter) return false;
      if (partSearch.trim()) {
        const q = partSearch.trim().toLowerCase();
        const matchName = (p.studentName || '').toLowerCase().includes(q);
        const matchReg = (p.registerNumber || '').toLowerCase().includes(q);
        if (!matchName && !matchReg) return false;
      }
      return true;
    });
  }, [selectedRound?.participants, partDeptFilter, partCourseFilter, partClassFilter, partSectionFilter, partSearch]);

  const availableCoursesForFilter = partDeptFilter
    ? courses.filter((c) => c.departmentId === partDeptFilter)
    : courses;

  const availableClassesForFilter = classes.filter((cl) => {
    if (partCourseFilter && cl.courseId !== partCourseFilter) return false;
    if (partDeptFilter && cl.departmentId !== partDeptFilter) return false;
    return true;
  });

  const availableSectionsForFilter = partClassFilter
    ? sections.filter((s) => s.classId === partClassFilter)
    : sections;

  const handleResetParticipantFilters = () => {
    setPartDeptFilter('');
    setPartCourseFilter('');
    setPartClassFilter('');
    setPartSectionFilter('');
    setPartSearch('');
  };

  // ===========================================================================
  // CATEGORY / CRITERIA MANAGEMENT IN EXISTING GD ROUND
  // ===========================================================================

  const handleOpenCategoryManager = () => {
    if (!selectedRound) return;
    setEditingCriteria(selectedRound.criteria.map((c) => ({ ...c })));
    setCategoryError(null);
    setCategoryModalOpen(true);
  };

  const handleAddCategoryRow = () => {
    setEditingCriteria((prev) => [
      ...prev,
      { name: '', maxMarks: 10, order: prev.length + 1 },
    ]);
  };

  const handleEditCategoryField = (index: number, field: keyof CriterionConfig, val: any) => {
    setEditingCriteria((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  const handleRemoveCategoryRow = (index: number) => {
    if (editingCriteria.length <= 1) {
      setCategoryError('A GD round must have at least one evaluation category.');
      return;
    }
    setEditingCriteria((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSaveCategories = async () => {
    if (!selectedRound) return;
    setCategoryError(null);

    // Validation
    const seenNames = new Set<string>();
    for (let i = 0; i < editingCriteria.length; i++) {
      const c = editingCriteria[i];
      if (!c.name.trim()) {
        setCategoryError(`Category #${i + 1} name cannot be empty.`);
        return;
      }
      const lower = c.name.trim().toLowerCase();
      if (seenNames.has(lower)) {
        setCategoryError(`Duplicate category name "${c.name.trim()}" is not allowed.`);
        return;
      }
      seenNames.add(lower);
      const marks = Number(c.maxMarks);
      if (isNaN(marks) || marks <= 0 || marks > 100) {
        setCategoryError(`Category "${c.name}" maximum marks must be between 1 and 100.`);
        return;
      }
    }

    try {
      setSavingCriteria(true);
      await evaluationService.updateGdRound(selectedRound.id, {
        criteria: editingCriteria.map((c, idx) => ({
          id: c.id,
          name: c.name.trim(),
          maxMarks: Number(c.maxMarks),
          order: idx + 1,
        })),
      });

      await refreshSelectedRound(selectedRound.id);
      setCategoryModalOpen(false);
      setSheetAlert({
        severity: 'success',
        message: 'Evaluation categories updated successfully. Columns updated in the evaluation sheet.',
      });
    } catch (err: any) {
      setCategoryError(err?.response?.data?.message || err?.message || 'Failed to update categories');
    } finally {
      setSavingCriteria(false);
    }
  };

  // ===========================================================================
  // EXCEL-STYLE OVERALL EVALUATION SHEET CELL & MARK ENTRY
  // ===========================================================================

  const totalPossibleRoundMarks = useMemo(() => {
    return (selectedRound?.criteria || []).reduce((acc, c) => acc + c.maxMarks, 0);
  }, [selectedRound?.criteria]);

  const handleCellScoreChange = (
    studentId: string,
    criterionId: string,
    rawVal: string,
    maxMarks: number
  ) => {
    setSheetScores((prev) => {
      const studentRow = prev[studentId] || { scores: {}, feedback: '', errors: {} };
      let errorMsg = '';
      if (rawVal !== '') {
        const val = Number(rawVal);
        if (isNaN(val)) {
          errorMsg = 'Number required';
        } else if (val < 0) {
          errorMsg = 'Min 0';
        } else if (val > maxMarks) {
          errorMsg = `Max ${maxMarks}`;
        }
      }
      return {
        ...prev,
        [studentId]: {
          ...studentRow,
          scores: {
            ...studentRow.scores,
            [criterionId]: rawVal,
          },
          errors: {
            ...studentRow.errors,
            [criterionId]: errorMsg,
          },
        },
      };
    });
  };

  const handleCellFeedbackChange = (studentId: string, feedback: string) => {
    setSheetScores((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || { scores: {}, feedback: '', errors: {} }),
        feedback,
      },
    }));
  };

  // Keyboard navigation across the Excel spreadsheet grid
  const handleCellKeyDown = (
    e: React.KeyboardEvent<any>,
    rowIdx: number,
    colIdx: number,
    numRows: number
  ) => {
    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      const nextRow = (rowIdx + 1) % numRows;
      const nextEl = document.getElementById(`sheet-cell-${nextRow}-${colIdx}`);
      if (nextEl) (nextEl as HTMLInputElement).focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevRow = (rowIdx - 1 + numRows) % numRows;
      const prevEl = document.getElementById(`sheet-cell-${prevRow}-${colIdx}`);
      if (prevEl) (prevEl as HTMLInputElement).focus();
    }
  };

  // Save Draft (Partial Marks Allowed, Restorable, does not mark round complete)
  const handleSaveDraft = async () => {
    if (!selectedRound) return;

    // Collect all participants with at least one entered score
    const participantsWithData = (selectedRound.participants || []).filter((p) => {
      const row = sheetScores[p.studentId];
      if (!row) return false;
      return Object.values(row.scores).some((v) => v !== '' && v !== undefined && !isNaN(Number(v)));
    });

    if (participantsWithData.length === 0) {
      setSheetAlert({
        severity: 'info',
        message: 'No student marks entered yet to save as draft.',
      });
      return;
    }

    try {
      setSavingDraft(true);
      setSheetAlert(null);

      const evaluations: BulkStudentEvaluationItemInput[] = participantsWithData.map((p) => {
        const row = sheetScores[p.studentId] || { scores: {}, feedback: '', errors: {} };
        const criterionScores: BulkStudentEvaluationScoreInput[] = [];

        (selectedRound.criteria || []).forEach((c) => {
          const rawVal = row.scores[c.id];
          if (rawVal !== undefined && rawVal !== '' && !isNaN(Number(rawVal))) {
            criterionScores.push({
              criterionId: c.id,
              score: Number(rawVal),
            });
          }
        });

        return {
          studentId: p.studentId,
          participantId: p.id,
          scores: criterionScores,
          feedback: row.feedback.trim() || undefined,
        };
      });

      const res = await evaluationService.bulkEvaluateGd(selectedRound.id, {
        isDraft: true,
        evaluations,
      });

      setSheetAlert({
        severity: 'success',
        message: `Draft marks saved for ${res.totalProcessed} student(s). You can safely close or resume entering marks anytime.`,
      });
      await refreshSelectedRound(selectedRound.id);
    } catch (err: any) {
      setSheetAlert({
        severity: 'error',
        message: err?.response?.data?.message || err?.message || 'Failed to save draft marks',
      });
    } finally {
      setSavingDraft(false);
    }
  };

  // Submit Final Evaluation (Validates all criteria marks, atomic transaction-safe backend operation)
  const handleSubmitEvaluation = async () => {
    if (!selectedRound) return;

    const participantsToSubmit = (selectedRound.participants || []).filter((p) => {
      const row = sheetScores[p.studentId];
      if (!row) return false;
      return Object.values(row.scores).some((v) => v !== '' && v !== undefined);
    });

    if (participantsToSubmit.length === 0) {
      setSheetAlert({
        severity: 'info',
        message: 'Please enter marks for students before submitting.',
      });
      return;
    }

    // Strict validation: every student being submitted must have valid scores for all round criteria
    let hasValidationError = false;
    const updatedSheetScores = { ...sheetScores };

    for (const p of participantsToSubmit) {
      const row = updatedSheetScores[p.studentId] || { scores: {}, feedback: '', errors: {} };
      const newErrors: Record<string, string> = {};

      for (const crit of selectedRound.criteria) {
        const rawVal = row.scores[crit.id];
        if (rawVal === undefined || rawVal === '' || isNaN(Number(rawVal))) {
          newErrors[crit.id] = 'Required';
          hasValidationError = true;
        } else {
          const num = Number(rawVal);
          if (num < 0) {
            newErrors[crit.id] = 'Min 0';
            hasValidationError = true;
          } else if (num > crit.maxMarks) {
            newErrors[crit.id] = `Max ${crit.maxMarks}`;
            hasValidationError = true;
          }
        }
      }

      updatedSheetScores[p.studentId] = {
        ...row,
        errors: newErrors,
      };
    }

    setSheetScores(updatedSheetScores);

    if (hasValidationError) {
      setSheetAlert({
        severity: 'error',
        message:
          'Validation failed: Please enter valid marks (between 0 and configured maximum) for all criteria on students being submitted.',
      });
      return;
    }

    try {
      setSubmittingEval(true);
      setSheetAlert(null);

      const evaluations: BulkStudentEvaluationItemInput[] = participantsToSubmit.map((p) => {
        const row = sheetScores[p.studentId];
        const criterionScores = (selectedRound.criteria || []).map((c) => ({
          criterionId: c.id,
          score: Number(row.scores[c.id]),
        }));

        return {
          studentId: p.studentId,
          participantId: p.id,
          scores: criterionScores,
          feedback: row.feedback.trim() || undefined,
        };
      });

      const res = await evaluationService.bulkEvaluateGd(selectedRound.id, {
        isDraft: false,
        evaluations,
      });

      await refreshSelectedRound(selectedRound.id);
      setSheetAlert({
        severity: 'success',
        message: `Evaluation submitted successfully for ${res.totalProcessed} student(s)! Backend has recalculated and finalized all scores.`,
      });
    } catch (err: any) {
      setSheetAlert({
        severity: 'error',
        message: err?.response?.data?.message || err?.message || 'Failed to submit evaluation',
      });
    } finally {
      setSubmittingEval(false);
    }
  };

  // ===========================================================================
  // RENDER: EXCEL-STYLE OVERALL EVALUATION SHEET WORKSPACE
  // ===========================================================================

  if (selectedRound) {
    return (
      <Box>
        {/* Workspace Header & Action Controls */}
        <Paper
          elevation={0}
          sx={{
            p: 2.5,
            mb: 2.5,
            bgcolor: '#ffffff',
            border: '1px solid #DCE6F5',
            borderRadius: '8px',
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                <Button
                  size="small"
                  startIcon={<ArrowBackIcon />}
                  onClick={handleBackToRounds}
                  sx={{ textTransform: 'none', color: '#1765B5', fontWeight: 700, p: 0, minWidth: 'auto', mr: 1 }}
                >
                  All GD Rounds
                </Button>
                <Typography variant="overline" color="#1765B5" fontWeight={700} letterSpacing={1.2}>
                  / EVALUATION SHEET WORKSPACE
                </Typography>
                <Chip
                  label={selectedRound.status}
                  size="small"
                  color={
                    selectedRound.status === 'COMPLETED'
                      ? 'success'
                      : selectedRound.status === 'IN_PROGRESS'
                      ? 'warning'
                      : 'primary'
                  }
                  sx={{ fontWeight: 700, fontSize: '0.75rem', height: 22 }}
                />
              </Stack>
              <Typography variant="h4" fontWeight={800} letterSpacing="-0.02em" sx={{ color: '#14264B' }}>
                {selectedRound.title}
              </Typography>
              <Typography variant="body2" sx={{ color: '#526584', mt: 0.5 }}>
                <strong>Discussion Topic:</strong> {selectedRound.topic}
              </Typography>
              {selectedRound.instructions && (
                <Typography variant="caption" sx={{ color: '#7182A0', display: 'block', mt: 0.25 }}>
                  <strong>Guidelines:</strong> {selectedRound.instructions}
                </Typography>
              )}
            </Box>

            {/* Quick Action Buttons */}
            <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
              {!isSuperAdmin && (
                <>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<TuneIcon />}
                    onClick={handleOpenCategoryManager}
                    sx={{ textTransform: 'none', fontWeight: 600, borderColor: '#D1DEF0', color: '#1765B5' }}
                  >
                    Manage Categories
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<PersonAddIcon />}
                    onClick={() => handleOpenAssign(selectedRound)}
                    sx={{ textTransform: 'none', fontWeight: 600, borderColor: '#D1DEF0', color: '#1765B5' }}
                  >
                    Assign Students
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<HowToRegIcon />}
                    onClick={handleMarkAllPresent}
                    sx={{ textTransform: 'none', fontWeight: 600, borderColor: '#D1DEF0' }}
                  >
                    Mark All Present
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    color="primary"
                    startIcon={savingDraft ? <CircularProgress size={16} /> : <SaveIcon />}
                    onClick={handleSaveDraft}
                    disabled={savingDraft || submittingEval}
                    sx={{ textTransform: 'none', fontWeight: 700 }}
                  >
                    {savingDraft ? 'Saving...' : 'Save Draft'}
                  </Button>
                  <Button
                    variant="contained"
                    size="small"
                    color="success"
                    startIcon={submittingEval ? <CircularProgress size={16} color="inherit" /> : <SendIcon />}
                    onClick={handleSubmitEvaluation}
                    disabled={savingDraft || submittingEval}
                    sx={{ textTransform: 'none', fontWeight: 700, px: 2.5 }}
                  >
                    {submittingEval ? 'Submitting...' : 'Submit Evaluation'}
                  </Button>
                </>
              )}
              <Tooltip title="Refresh round data from database">
                <IconButton size="small" onClick={() => refreshSelectedRound(selectedRound.id)} disabled={detailsLoading}>
                  <RefreshIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          </Box>

          {/* Metrics Overview Ribbon */}
          <Box sx={{ mt: 2.5, pt: 2, borderTop: '1px solid #E7EEFA', display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
            <Chip
              label={`Categories: ${selectedRound.criteria.length} columns`}
              size="small"
              variant="outlined"
              sx={{ fontWeight: 600 }}
            />
            <Chip
              label={`Total Max Marks: ${totalPossibleRoundMarks}`}
              size="small"
              variant="outlined"
              sx={{ fontWeight: 700, borderColor: '#1765B5', color: '#1765B5' }}
            />
            <Chip
              label={`Assigned Students: ${selectedRound.participants.length}`}
              size="small"
              variant="outlined"
              sx={{ fontWeight: 600 }}
            />
            <Chip
              label={`Evaluated: ${selectedRound.evaluatedCount} / ${selectedRound.participants.length}`}
              size="small"
              color={selectedRound.evaluatedCount > 0 ? 'success' : 'default'}
              sx={{ fontWeight: 700 }}
            />
            {selectedRound.averageScore !== null && (
              <Chip
                label={`Round Average: ${selectedRound.averageScore}%`}
                size="small"
                sx={{ bgcolor: '#1765B5', color: '#ffffff', fontWeight: 700 }}
              />
            )}
          </Box>
        </Paper>

        {sheetAlert && (
          <Alert severity={sheetAlert.severity} sx={{ mb: 2.5 }} onClose={() => setSheetAlert(null)}>
            {sheetAlert.message}
          </Alert>
        )}

        {/* Hierarchy Filters (Department → Course → Class → Section → Search) */}
        <Paper variant="outlined" sx={{ p: 1.75, mb: 2.5, backgroundColor: '#EDF2FF', borderRadius: 2 }}>
          <Grid container spacing={1.5} alignItems="center">
            <Grid item xs={12} sm={6} md={2.4}>
              <FormControl size="small" fullWidth>
                <InputLabel>Department</InputLabel>
                <Select
                  value={partDeptFilter}
                  label="Department"
                  onChange={(e) => {
                    setPartDeptFilter(e.target.value);
                    setPartCourseFilter('');
                    setPartClassFilter('');
                    setPartSectionFilter('');
                  }}
                >
                  <MenuItem value="">All Departments</MenuItem>
                  {departments.map((d) => (
                    <MenuItem key={d.id} value={d.id}>
                      {d.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
              <FormControl size="small" fullWidth>
                <InputLabel>Course</InputLabel>
                <Select
                  value={partCourseFilter}
                  label="Course"
                  onChange={(e) => {
                    setPartCourseFilter(e.target.value);
                    setPartClassFilter('');
                    setPartSectionFilter('');
                  }}
                >
                  <MenuItem value="">All Courses</MenuItem>
                  {availableCoursesForFilter.map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
              <FormControl size="small" fullWidth>
                <InputLabel>Class</InputLabel>
                <Select
                  value={partClassFilter}
                  label="Class"
                  onChange={(e) => {
                    setPartClassFilter(e.target.value);
                    setPartSectionFilter('');
                  }}
                >
                  <MenuItem value="">All Classes</MenuItem>
                  {availableClassesForFilter.map((cl) => (
                    <MenuItem key={cl.id} value={cl.id}>
                      {cl.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
              <FormControl size="small" fullWidth>
                <InputLabel>Section</InputLabel>
                <Select
                  value={partSectionFilter}
                  label="Section"
                  onChange={(e) => setPartSectionFilter(e.target.value)}
                >
                  <MenuItem value="">All Sections</MenuItem>
                  {availableSectionsForFilter.map((s) => (
                    <MenuItem key={s.id} value={s.id}>
                      {s.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
              <TextField
                size="small"
                fullWidth
                placeholder="Search student or reg no..."
                value={partSearch}
                onChange={(e) => setPartSearch(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" sx={{ color: '#8293B0' }} />
                    </InputAdornment>
                  ),
                  endAdornment: (partDeptFilter || partCourseFilter || partClassFilter || partSectionFilter || partSearch) && (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={handleResetParticipantFilters}>
                        <FilterAltOffIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
          </Grid>
        </Paper>

        {/* The Excel-Style Overall Evaluation Sheet Table */}
        <Paper
          variant="outlined"
          sx={{
            borderRadius: 2,
            border: '1px solid #D1DEF0',
            overflow: 'hidden',
            backgroundColor: '#ffffff',
          }}
        >
          <Box sx={{ p: 1.5, bgcolor: '#1765B5', color: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <TableChartIcon fontSize="small" />
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                EVALUATION SPREADSHEET (Students × Configured Categories)
              </Typography>
            </Stack>
            <Typography variant="caption" sx={{ color: '#8293B0' }}>
              Showing {filteredParticipants.length} of {selectedRound.participants.length} assigned students • Keyboard navigation supported
            </Typography>
          </Box>

          {detailsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress />
            </Box>
          ) : selectedRound.participants.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8, color: '#7182A0' }}>
              <GroupsIcon sx={{ fontSize: 48, color: '#D1DEF0', mb: 1 }} />
              <Typography variant="h6" sx={{ color: '#526584' }}>
                No Students Assigned to this GD Round
              </Typography>
              <Typography variant="body2" sx={{ color: '#7182A0', mt: 0.5, mb: 2 }}>
                Target students using the department, course, class, and section hierarchy to begin evaluation.
              </Typography>
              <Button variant="contained" startIcon={<PersonAddIcon />} onClick={() => handleOpenAssign(selectedRound)}>
                Assign Students Now
              </Button>
            </Box>
          ) : (
            <TableContainer sx={{ maxHeight: '68vh', overflow: 'auto' }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    {/* Sticky Student Identity Columns (Read-only) */}
                    <TableCell
                      sx={{
                        position: 'sticky',
                        left: 0,
                        zIndex: 10,
                        backgroundColor: '#E7EEFA',
                        fontWeight: 700,
                        width: 44,
                        textAlign: 'center',
                        borderRight: '1px solid #DCE6F5',
                      }}
                    >
                      #
                    </TableCell>
                    <TableCell
                      sx={{
                        position: 'sticky',
                        left: 44,
                        zIndex: 10,
                        backgroundColor: '#E7EEFA',
                        fontWeight: 700,
                        minWidth: 170,
                        borderRight: '1px solid #DCE6F5',
                      }}
                    >
                      Student Name
                    </TableCell>
                    <TableCell
                      sx={{
                        position: 'sticky',
                        left: 214,
                        zIndex: 10,
                        backgroundColor: '#E7EEFA',
                        fontWeight: 700,
                        minWidth: 120,
                        borderRight: '1px solid #DCE6F5',
                      }}
                    >
                      Register No
                    </TableCell>
                    <TableCell
                      sx={{
                        position: 'sticky',
                        left: 334,
                        zIndex: 10,
                        backgroundColor: '#E7EEFA',
                        fontWeight: 700,
                        minWidth: 150,
                        borderRight: '2px solid #D1DEF0',
                      }}
                    >
                      Hierarchy
                    </TableCell>

                    <TableCell
                      sx={{
                        backgroundColor: '#E7EEFA',
                        fontWeight: 700,
                        textAlign: 'center',
                        minWidth: 110,
                        borderRight: '1px solid #DCE6F5',
                      }}
                    >
                      Attendance
                    </TableCell>

                    {/* Dynamic Category Columns (Read from round configuration) */}
                    {(selectedRound.criteria || []).map((crit) => (
                      <TableCell
                        key={crit.id}
                        sx={{
                          backgroundColor: '#E7EEFA',
                          fontWeight: 700,
                          textAlign: 'center',
                          minWidth: 110,
                          borderRight: '1px solid #DCE6F5',
                        }}
                      >
                        <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', color: '#14264B' }}>
                          {crit.name}
                        </Typography>
                        <Chip
                          label={`Max: ${crit.maxMarks}`}
                          size="small"
                          sx={{
                            height: 18,
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            backgroundColor: '#DCE6F5',
                          }}
                        />
                      </TableCell>
                    ))}

                    {/* Calculated Columns */}
                    <TableCell
                      sx={{
                        backgroundColor: '#E7EEFA',
                        fontWeight: 700,
                        textAlign: 'center',
                        minWidth: 95,
                        borderLeft: '2px solid #D1DEF0',
                        borderRight: '1px solid #DCE6F5',
                      }}
                    >
                      Total
                    </TableCell>
                    <TableCell
                      sx={{
                        backgroundColor: '#E7EEFA',
                        fontWeight: 700,
                        textAlign: 'center',
                        minWidth: 80,
                        borderRight: '1px solid #DCE6F5',
                      }}
                    >
                      Score %
                    </TableCell>
                    <TableCell
                      sx={{
                        backgroundColor: '#E7EEFA',
                        fontWeight: 700,
                        textAlign: 'center',
                        minWidth: 95,
                        borderRight: '1px solid #DCE6F5',
                      }}
                    >
                      Status
                    </TableCell>
                    <TableCell
                      sx={{
                        backgroundColor: '#E7EEFA',
                        fontWeight: 700,
                        minWidth: 200,
                      }}
                    >
                      Evaluator Feedback
                    </TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {filteredParticipants.map((part, rowIdx) => {
                    const studentRow = sheetScores[part.studentId] || { scores: {}, feedback: '', errors: {} };

                    // Live auto total & percentage calculation
                    const rowSum = Object.values(studentRow.scores).reduce<number>((acc, v) => {
                      const num = Number(v);
                      return !isNaN(num) && v !== '' ? acc + num : acc;
                    }, 0);
                    const rowPct = totalPossibleRoundMarks > 0 ? Math.round((rowSum / totalPossibleRoundMarks) * 100) : 0;
                    const isEvaluated = part.evaluation?.status === 'EVALUATED';
                    const isDraft = part.evaluation?.status === 'DRAFT';

                    return (
                      <TableRow key={part.id} hover>
                        {/* Serial No. */}
                        <TableCell
                          sx={{
                            position: 'sticky',
                            left: 0,
                            zIndex: 5,
                            backgroundColor: '#ffffff',
                            textAlign: 'center',
                            fontWeight: 600,
                            color: '#7182A0',
                            borderRight: '1px solid #DCE6F5',
                          }}
                        >
                          {rowIdx + 1}
                        </TableCell>

                        {/* Student Name (Read-only) */}
                        <TableCell
                          sx={{
                            position: 'sticky',
                            left: 44,
                            zIndex: 5,
                            backgroundColor: '#ffffff',
                            borderRight: '1px solid #DCE6F5',
                          }}
                        >
                          <Typography variant="body2" sx={{ fontWeight: 700, color: '#14264B' }}>
                            {part.studentName}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#7182A0', display: 'block' }}>
                            {part.collegeEmail}
                          </Typography>
                        </TableCell>

                        {/* Register Number (Read-only) */}
                        <TableCell
                          sx={{
                            position: 'sticky',
                            left: 214,
                            zIndex: 5,
                            backgroundColor: '#ffffff',
                            borderRight: '1px solid #DCE6F5',
                          }}
                        >
                          <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: 'monospace', color: '#33466A' }}>
                            {part.registerNumber}
                          </Typography>
                        </TableCell>

                        {/* Department / Course / Class / Section Hierarchy (Read-only) */}
                        <TableCell
                          sx={{
                            position: 'sticky',
                            left: 334,
                            zIndex: 5,
                            backgroundColor: '#ffffff',
                            borderRight: '2px solid #D1DEF0',
                          }}
                        >
                          <Typography variant="caption" sx={{ fontWeight: 600, color: '#405678', display: 'block' }}>
                            {part.departmentName || '—'}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#7182A0' }}>
                            {part.className || '—'} {part.sectionName ? `• Sec ${part.sectionName}` : ''}
                          </Typography>
                        </TableCell>

                        {/* Attendance Toggle */}
                        <TableCell sx={{ textAlign: 'center', borderRight: '1px solid #DCE6F5' }}>
                          <Chip
                            label={part.attendance}
                            size="small"
                            icon={
                              part.attendance === 'PRESENT' ? (
                                <CheckCircleIcon />
                              ) : part.attendance === 'ABSENT' ? (
                                <CancelIcon />
                              ) : (
                                <HourglassEmptyIcon />
                              )
                            }
                            color={
                              part.attendance === 'PRESENT'
                                ? 'success'
                                : part.attendance === 'ABSENT'
                                ? 'error'
                                : 'warning'
                            }
                            onClick={() => {
                              if (isSuperAdmin) return;
                              const next: AttendanceStatus =
                                part.attendance === 'PRESENT'
                                  ? 'ABSENT'
                                  : part.attendance === 'ABSENT'
                                  ? 'PENDING'
                                  : 'PRESENT';
                              handleToggleAttendance(part, next);
                            }}
                            sx={{ cursor: isSuperAdmin ? 'default' : 'pointer', height: 22, fontSize: '0.7rem' }}
                          />
                        </TableCell>

                        {/* Dynamic Criteria Mark Entry Editable Cells */}
                        {(selectedRound.criteria || []).map((crit, colIdx) => {
                          const cellScore = studentRow.scores[crit.id] !== undefined ? studentRow.scores[crit.id] : '';
                          const cellError = studentRow.errors[crit.id];

                          return (
                            <TableCell
                              key={crit.id}
                              sx={{
                                textAlign: 'center',
                                p: 1,
                                borderRight: '1px solid #DCE6F5',
                              }}
                            >
                              <TextField
                                id={`sheet-cell-${rowIdx}-${colIdx}`}
                                size="small"
                                type="number"
                                disabled={isSuperAdmin}
                                value={cellScore}
                                error={Boolean(cellError)}
                                helperText={cellError}
                                onChange={(e) =>
                                  handleCellScoreChange(part.studentId, crit.id, e.target.value, crit.maxMarks)
                                }
                                onKeyDown={(e) =>
                                  handleCellKeyDown(e, rowIdx, colIdx, filteredParticipants.length)
                                }
                                inputProps={{
                                  min: 0,
                                  max: crit.maxMarks,
                                  step: 0.5,
                                  style: {
                                    textAlign: 'center',
                                    fontWeight: 700,
                                    fontSize: '0.875rem',
                                    padding: '6px 4px',
                                  },
                                }}
                                sx={{
                                  width: 80,
                                  '& .MuiOutlinedInput-root': {
                                    borderRadius: 1,
                                    bgcolor: cellError ? '#fef2f2' : cellScore !== '' ? '#f0fdf4' : '#ffffff',
                                  },
                                }}
                              />
                            </TableCell>
                          );
                        })}

                        {/* Total Calculated Column */}
                        <TableCell
                          sx={{
                            textAlign: 'center',
                            borderLeft: '2px solid #D1DEF0',
                            borderRight: '1px solid #DCE6F5',
                            fontWeight: 800,
                            color: '#14264B',
                          }}
                        >
                          {rowSum} / {totalPossibleRoundMarks}
                        </TableCell>

                        {/* Percentage Calculated Column */}
                        <TableCell sx={{ textAlign: 'center', borderRight: '1px solid #DCE6F5' }}>
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 700,
                              color: rowPct >= 70 ? '#16a34a' : rowPct >= 50 ? '#d97706' : '#dc2626',
                            }}
                          >
                            {rowPct}%
                          </Typography>
                        </TableCell>

                        {/* Status Column */}
                        <TableCell sx={{ textAlign: 'center', borderRight: '1px solid #DCE6F5' }}>
                          {isEvaluated ? (
                            <Chip label="Evaluated" size="small" color="success" sx={{ height: 20, fontSize: '0.7rem' }} />
                          ) : isDraft ? (
                            <Chip label="Draft" size="small" color="warning" sx={{ height: 20, fontSize: '0.7rem' }} />
                          ) : (
                            <Chip label="Unscored" size="small" variant="outlined" sx={{ height: 20, fontSize: '0.7rem' }} />
                          )}
                        </TableCell>

                        {/* Feedback Column */}
                        <TableCell>
                          <TextField
                            size="small"
                            fullWidth
                            disabled={isSuperAdmin}
                            placeholder="Observations / notes..."
                            value={studentRow.feedback}
                            onChange={(e) => handleCellFeedbackChange(part.studentId, e.target.value)}
                            sx={{ minWidth: 180 }}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* Sticky Bottom Actions Bar */}
          <Box
            sx={{
              p: 2,
              bgcolor: '#EDF2FF',
              borderTop: '1px solid #DCE6F5',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 2,
            }}
          >
            <Typography variant="caption" sx={{ color: '#7182A0', fontWeight: 600 }}>
              Backend is the authoritative calculation source for final scores and reports. Marks permanently mapped via Student ID + Criterion ID.
            </Typography>

            {!isSuperAdmin && (
              <Stack direction="row" spacing={1.5}>
                <Button
                  variant="outlined"
                  color="primary"
                  startIcon={savingDraft ? <CircularProgress size={16} /> : <SaveIcon />}
                  onClick={handleSaveDraft}
                  disabled={savingDraft || submittingEval}
                  sx={{ textTransform: 'none', fontWeight: 700 }}
                >
                  {savingDraft ? 'Saving Draft...' : 'Save Draft'}
                </Button>
                <Button
                  variant="contained"
                  color="success"
                  startIcon={submittingEval ? <CircularProgress size={16} color="inherit" /> : <SendIcon />}
                  onClick={handleSubmitEvaluation}
                  disabled={savingDraft || submittingEval}
                  sx={{ textTransform: 'none', fontWeight: 700, px: 3 }}
                >
                  {submittingEval ? 'Submitting...' : 'Submit Evaluation'}
                </Button>
              </Stack>
            )}
          </Box>
        </Paper>

        {/* Category Management Dialog */}
        <Dialog open={categoryModalOpen} onClose={() => setCategoryModalOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle sx={{ fontWeight: 800, bgcolor: '#1765B5', color: '#ffffff' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6" fontWeight={800}>
                Configure GD Evaluation Categories
              </Typography>
              <IconButton size="small" onClick={() => setCategoryModalOpen(false)} sx={{ color: '#ffffff' }}>
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent dividers sx={{ p: 2.5 }}>
            <Typography variant="body2" sx={{ color: '#7182A0', mb: 2 }}>
              Add, edit, or configure maximum marks for evaluation categories. Changes immediately update the sheet columns and recalculate total maximum marks.
            </Typography>

            {categoryError && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setCategoryError(null)}>
                {categoryError}
              </Alert>
            )}

            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead sx={{ bgcolor: '#EDF2FF' }}>
                  <TableRow>
                    <TableCell sx={{ width: 40, fontWeight: 700 }}>#</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Category Name</TableCell>
                    <TableCell sx={{ width: 130, fontWeight: 700 }}>Max Marks</TableCell>
                    <TableCell sx={{ width: 60, textAlign: 'center', fontWeight: 700 }}>Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {editingCriteria.map((c, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          fullWidth
                          value={c.name}
                          placeholder="e.g., Problem Solving"
                          onChange={(e) => handleEditCategoryField(idx, 'name', e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          type="number"
                          value={c.maxMarks}
                          onChange={(e) => handleEditCategoryField(idx, 'maxMarks', e.target.value)}
                          inputProps={{ min: 1, max: 100 }}
                        />
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleRemoveCategoryRow(idx)}
                          disabled={editingCriteria.length <= 1}
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={handleAddCategoryRow}>
                Add Category
              </Button>
              <Typography variant="body2" sx={{ fontWeight: 700, color: '#1765B5' }}>
                Total Maximum Marks: {editingCriteria.reduce((acc, c) => acc + (Number(c.maxMarks) || 0), 0)}
              </Typography>
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setCategoryModalOpen(false)}>Cancel</Button>
            <Button variant="contained" onClick={handleSaveCategories} disabled={savingCriteria}>
              {savingCriteria ? <CircularProgress size={20} /> : 'Save Categories'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Assign Students Dialog */}
        <Dialog open={assignOpen} onClose={() => setAssignOpen(false)} maxWidth="lg" fullWidth>
          <DialogTitle sx={{ fontWeight: 700 }}>
            Assign Students to GD: {selectedRound.title}
          </DialogTitle>
          <DialogContent dividers>
            <StudentSelector
              initialDepartmentId={selectedRound.departmentId || undefined}
              initialCourseId={selectedRound.courseId || undefined}
              selectedStudentIds={selectedStudentIds}
              onSelectionChange={setSelectedStudentIds}
              alreadyAssignedStudentIds={(selectedRound.participants || []).map((p) => p.studentId)}
              title={`Target Students for "${selectedRound.title}"`}
              helperText="Filter by Department → Course → Class → Section. Multi-select across classes/sections to assign students directly to this GD Round."
            />
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            {(() => {
              const existingIds = new Set((selectedRound.participants || []).map((p) => p.studentId));
              const newCount = selectedStudentIds.filter((id) => !existingIds.has(id)).length;
              return (
                <>
                  <Button onClick={() => setAssignOpen(false)}>Cancel</Button>
                  <Button
                    variant="contained"
                    onClick={handleAssignSubmit}
                    disabled={assigning || newCount === 0}
                  >
                    {assigning ? (
                      <CircularProgress size={24} />
                    ) : newCount === 0 ? (
                      'No New Students Selected'
                    ) : (
                      `Assign ${newCount} New Student${newCount === 1 ? '' : 's'}`
                    )}
                  </Button>
                </>
              );
            })()}
          </DialogActions>
        </Dialog>
      </Box>
    );
  }

  // ===========================================================================
  // RENDER: ROUNDS LIST VIEW (When no specific round is open)
  // ===========================================================================

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="overline" color="#1765B5" fontWeight={700} letterSpacing={1.2}>
            QUALITATIVE EVALUATION SUITE
          </Typography>
          <Typography variant="h4" fontWeight={800} letterSpacing="-0.02em" sx={{ mb: 0.5, color: '#14264B' }}>
            Group Discussion (GD) Rounds
          </Typography>
          <Typography variant="body2" sx={{ color: '#7182A0' }}>
            Open any GD round to launch its integrated Excel-style Overall Evaluation Sheet. Configure categories, track attendance, and record marks.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<RefreshIcon fontSize="small" />}
            onClick={() => fetchRounds()}
            disabled={loading}
            sx={{
              color: '#1765B5',
              borderColor: '#D1DEF0',
              borderRadius: '6px',
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.8125rem',
              '&:hover': { borderColor: '#1765B5', bgcolor: 'rgba(23, 101, 181, 0.04)' },
            }}
          >
            Refresh
          </Button>
          {!isSuperAdmin && (
            <Button
              variant="contained"
              size="small"
              startIcon={<AddIcon fontSize="small" />}
              onClick={handleOpenCreate}
              sx={{
                bgcolor: '#1765B5',
                color: '#ffffff',
                borderRadius: '6px',
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.8125rem',
                '&:hover': { bgcolor: '#104B91' },
              }}
            >
              Create GD Round
            </Button>
          )}
        </Stack>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: '8px' }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Metric Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ p: 2, bgcolor: '#ffffff', border: '1px solid #DCE6F5', borderRadius: '8px' }}>
            <Typography variant="caption" sx={{ color: '#7182A0', fontWeight: 600 }}>
              TOTAL GD ROUNDS
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, color: '#14264B' }}>
              {rounds.length}
            </Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ p: 2, bgcolor: '#ffffff', border: '1px solid #DCE6F5', borderRadius: '8px' }}>
            <Typography variant="caption" sx={{ color: '#7182A0', fontWeight: 600 }}>
              ACTIVE / SCHEDULED
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, color: '#0369a1' }}>
              {rounds.filter((r) => r.status === 'SCHEDULED' || r.status === 'IN_PROGRESS').length}
            </Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ p: 2, bgcolor: '#ffffff', border: '1px solid #DCE6F5', borderRadius: '8px' }}>
            <Typography variant="caption" sx={{ color: '#7182A0', fontWeight: 600 }}>
              TOTAL EVALUATED
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, color: '#047857' }}>
              {rounds.reduce((acc, r) => acc + (r.evaluatedCount || 0), 0)}
            </Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ p: 2, bgcolor: '#ffffff', border: '1px solid #DCE6F5', borderRadius: '8px' }}>
            <Typography variant="caption" sx={{ color: '#7182A0', fontWeight: 600 }}>
              AVG GD PERFORMANCE
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, color: '#1765B5' }}>
              {(() => {
                const evaluatedRounds = rounds.filter((r) => r.averageScore !== null);
                if (evaluatedRounds.length === 0) return '—';
                const avg =
                  evaluatedRounds.reduce((acc, r) => acc + (r.averageScore || 0), 0) /
                  evaluatedRounds.length;
                return `${Math.round(avg)}%`;
              })()}
            </Typography>
          </Card>
        </Grid>
      </Grid>

      {/* Status Tabs */}
      <Paper elevation={0} sx={{ mb: 3, border: '1px solid #DCE6F5', borderRadius: '8px', bgcolor: '#ffffff' }}>
        <Tabs
          value={statusTab}
          onChange={(_, val) => setStatusTab(val)}
          textColor="primary"
          indicatorColor="primary"
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.875rem',
              py: 1.5,
              minHeight: 48,
              color: '#7182A0',
              '&.Mui-selected': { color: '#1765B5', fontWeight: 700 },
            },
          }}
        >
          <Tab label="All Rounds" value="ALL" />
          <Tab label="Scheduled" value="SCHEDULED" />
          <Tab label="In Progress" value="IN_PROGRESS" />
          <Tab label="Completed" value="COMPLETED" />
        </Tabs>
      </Paper>

      {/* Rounds List Grid */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : rounds.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
          <GroupsIcon sx={{ fontSize: 48, color: '#8293B0', mb: 1 }} />
          <Typography variant="h6" sx={{ color: '#526584' }}>
            No Group Discussion Rounds Found
          </Typography>
          <Typography variant="body2" sx={{ color: '#7182A0', mt: 0.5 }}>
            Create a new GD round to evaluate student communication, confidence, and leadership.
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={2.5}>
          {rounds.map((round) => (
            <Grid item xs={12} md={6} lg={4} key={round.id}>
              <Card
                variant="outlined"
                sx={{
                  borderRadius: 2,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'all 0.2s',
                  '&:hover': {
                    boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                    borderColor: '#D1DEF0',
                  },
                }}
              >
                <CardContent sx={{ pb: 1.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#14264B' }}>
                      {round.title}
                    </Typography>
                    <Chip
                      label={round.status}
                      size="small"
                      color={
                        round.status === 'COMPLETED'
                          ? 'success'
                          : round.status === 'IN_PROGRESS'
                          ? 'warning'
                          : 'primary'
                      }
                      sx={{ fontWeight: 700, fontSize: '0.75rem', height: 22 }}
                    />
                  </Box>
                  <Typography variant="body2" sx={{ color: '#405678', fontWeight: 500, mb: 1.5 }}>
                    Topic: {round.topic}
                  </Typography>
                  <Stack direction="row" spacing={2} sx={{ color: '#7182A0', fontSize: '0.8rem', mb: 1 }}>
                    <span>📅 {new Date(round.scheduledDate).toLocaleDateString()}</span>
                    <span>⏱ {round.durationMinutes} mins</span>
                    <span>👥 {round.totalParticipants} students</span>
                  </Stack>
                  <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Chip
                      label={`${round.criteria.length} Categories`}
                      size="small"
                      variant="outlined"
                      sx={{ fontSize: '0.7rem' }}
                    />
                    {round.averageScore !== null && (
                      <Chip
                        label={`Avg: ${round.averageScore}% (${round.evaluatedCount}/${round.totalParticipants})`}
                        size="small"
                        sx={{ backgroundColor: '#E7EEFA', color: '#14264B', fontWeight: 600, fontSize: '0.7rem' }}
                      />
                    )}
                  </Box>
                </CardContent>
                <Divider />
                <CardActions sx={{ justifyContent: 'space-between', px: 2, py: 1.25 }}>
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<TableChartIcon />}
                    onClick={() => handleOpenEvaluationSheet(round)}
                    sx={{
                      bgcolor: '#1765B5',
                      color: '#ffffff',
                      textTransform: 'none',
                      fontWeight: 700,
                      '&:hover': { bgcolor: '#104B91' },
                    }}
                  >
                    Open Evaluation Sheet
                  </Button>
                  <Stack direction="row" spacing={0.5}>
                    {!isSuperAdmin && (
                      <>
                        <Tooltip title="Assign Students">
                          <IconButton size="small" onClick={() => handleOpenAssign(round)}>
                            <PersonAddIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete Round">
                          <IconButton size="small" color="error" onClick={() => handleDeleteRound(round.id)}>
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </>
                    )}
                  </Stack>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Create GD Round Dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Create New Group Discussion Round</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5}>
            <TextField
              label="Round Title"
              fullWidth
              required
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g., Round 1: AI & Ethics in Engineering"
            />
            <TextField
              label="Discussion Topic"
              fullWidth
              required
              multiline
              rows={2}
              value={newTopic}
              onChange={(e) => setNewTopic(e.target.value)}
              placeholder="Enter the topic to be presented to the students"
            />
            <TextField
              label="Special Instructions / Guidelines"
              fullWidth
              multiline
              rows={2}
              value={newInstructions}
              onChange={(e) => setNewInstructions(e.target.value)}
              placeholder="Guidelines for students and evaluators..."
            />
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Scheduled Date & Time"
                  type="datetime-local"
                  fullWidth
                  required
                  value={newScheduledDate}
                  onChange={(e) => setNewScheduledDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Duration (minutes)"
                  type="number"
                  fullWidth
                  value={newDuration}
                  onChange={(e) => setNewDuration(Number(e.target.value))}
                />
              </Grid>
            </Grid>

            <Divider>
              <Chip label="Target Audience / Batch (Optional Default)" size="small" />
            </Divider>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <TextField
                  select
                  label="Department"
                  fullWidth
                  value={selectedDeptId}
                  onChange={(e) => setSelectedDeptId(e.target.value)}
                >
                  <MenuItem value="">All Departments</MenuItem>
                  {departments.map((d) => (
                    <MenuItem key={d.id} value={d.id}>
                      {d.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  select
                  label="Course"
                  fullWidth
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                >
                  <MenuItem value="">All Courses</MenuItem>
                  {courses.map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="Batch Year"
                  type="number"
                  fullWidth
                  value={selectedBatchYear}
                  onChange={(e) => setSelectedBatchYear(e.target.value)}
                  placeholder="e.g. 2026"
                />
              </Grid>
            </Grid>

            {/* Student Selection for GD Round */}
            <Divider>
              <Chip label="Student Selection (Optional Direct Assignment)" size="small" />
            </Divider>

            <StudentSelector
              initialDepartmentId={selectedDeptId || undefined}
              initialCourseId={selectedCourseId || undefined}
              selectedStudentIds={createSelectedStudentIds}
              onSelectionChange={setCreateSelectedStudentIds}
              title="Select Students for GD Round"
              helperText="Filter by Department → Course → Class → Section. Multi-select across different sections/classes to assign students directly upon round creation."
            />

            <Divider>
              <Chip label="Evaluation Criteria Configuration" size="small" />
            </Divider>

            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  Configurable Criteria (Default: 10 Criteria / 100 Marks Total)
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Button size="small" onClick={() => setCriteria(DEFAULT_GD_CRITERIA.map((c) => ({ ...c })))}>
                    Reset Defaults
                  </Button>
                  <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={handleAddCriterion}>
                    Add Criterion
                  </Button>
                </Stack>
              </Box>

              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead sx={{ backgroundColor: '#EDF2FF' }}>
                    <TableRow>
                      <TableCell sx={{ width: 50 }}>#</TableCell>
                      <TableCell>Criterion Name</TableCell>
                      <TableCell sx={{ width: 120 }}>Max Marks</TableCell>
                      <TableCell sx={{ width: 60 }}></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {criteria.map((crit, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{idx + 1}</TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            fullWidth
                            value={crit.name}
                            onChange={(e) => handleUpdateCriterion(idx, 'name', e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            type="number"
                            value={crit.maxMarks}
                            onChange={(e) => handleUpdateCriterion(idx, 'maxMarks', Number(e.target.value))}
                          />
                        </TableCell>
                        <TableCell>
                          <IconButton
                            size="small"
                            color="error"
                            disabled={criteria.length <= 1}
                            onClick={() => handleRemoveCriterion(idx)}
                          >
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <Box sx={{ mt: 1.5, textAlign: 'right' }}>
                <Typography variant="body2" sx={{ fontWeight: 700, color: '#14264B' }}>
                  Total Maximum Marks: {criteria.reduce((a, b) => a + (Number(b.maxMarks) || 0), 0)}
                </Typography>
              </Box>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setCreateOpen(false)} disabled={creating}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleCreateSubmit} disabled={creating}>
            {creating ? (
              <CircularProgress size={24} />
            ) : createSelectedStudentIds.length > 0 ? (
              `Create GD Round (${createSelectedStudentIds.length} Students)`
            ) : (
              'Create GD Round'
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
