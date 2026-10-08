import React, { useState, useEffect, useCallback } from 'react';
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
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import VisibilityIcon from '@mui/icons-material/Visibility';
import RefreshIcon from '@mui/icons-material/Refresh';
import WorkIcon from '@mui/icons-material/Work';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import RateReviewIcon from '@mui/icons-material/RateReview';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import PsychologyIcon from '@mui/icons-material/Psychology';
import BusinessCenterIcon from '@mui/icons-material/BusinessCenter';
import TerminalIcon from '@mui/icons-material/Terminal';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';
import { useAuth } from '../../hooks/useAuth.js';
import { evaluationService } from '../../services/evaluation.service.js';
import { managementService } from '../../services/management.service.js';
import { StudentSelector } from '../../components/evaluation/StudentSelector.js';
import {
  InterviewRoundDto,
  InterviewParticipantDto,
  InterviewType,
  CriterionConfig,
  DEFAULT_INTERVIEW_CRITERIA,
  AttendanceStatus,
} from '../../types/evaluation.types.js';

export const AdminInterviewsPage: React.FC = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  // State
  const [rounds, setRounds] = useState<InterviewRoundDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  // Hierarchy Data
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([]);
  const [courses, setCourses] = useState<Array<{ id: string; name: string }>>([]);

  // Create Interview Round Dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<InterviewType>('TECHNICAL');
  const [newInstructions, setNewInstructions] = useState('');
  const [newScheduledDate, setNewScheduledDate] = useState('');
  const [newDuration, setNewDuration] = useState(45);
  const [newEvaluatorId, setNewEvaluatorId] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedBatchYear, setSelectedBatchYear] = useState('');
  const [criteria, setCriteria] = useState<CriterionConfig[]>([...DEFAULT_INTERVIEW_CRITERIA]);
  const [createSelectedStudentIds, setCreateSelectedStudentIds] = useState<string[]>([]);

  // Round Details & Evaluation View
  const [selectedRound, setSelectedRound] = useState<InterviewRoundDto | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Student Assignment
  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [assigning, setAssigning] = useState(false);

  // Evaluation Dialog
  const [evaluatingParticipant, setEvaluatingParticipant] = useState<InterviewParticipantDto | null>(null);
  const [evaluatingScores, setEvaluatingScores] = useState<Record<string, { score: number; comment?: string }>>({});
  const [evaluatingStrengths, setEvaluatingStrengths] = useState('');
  const [evaluatingAreasForImprovement, setEvaluatingAreasForImprovement] = useState('');
  const [evaluatingOverallFeedback, setEvaluatingOverallFeedback] = useState('');
  const [evaluatingSubmitting, setEvaluatingSubmitting] = useState(false);
  const [evaluationSuccessMsg, setEvaluationSuccessMsg] = useState<string | null>(null);

  // Load rounds
  const fetchRounds = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await evaluationService.getInterviewRounds({
        interviewType: typeFilter !== 'ALL' ? typeFilter : undefined,
      });
      setRounds(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load interview rounds');
    } finally {
      setLoading(false);
    }
  }, [typeFilter]);

  useEffect(() => {
    fetchRounds();
  }, [fetchRounds]);

  // Load hierarchy
  useEffect(() => {
    const loadHierarchy = async () => {
      try {
        const [deptRes, courseRes] = await Promise.all([
          managementService.getDepartments(),
          managementService.getCourses(),
        ]);
        setDepartments(deptRes || []);
        setCourses(courseRes || []);
      } catch (e) {
        console.error('Failed to load hierarchy for Interview targeting', e);
      }
    };
    loadHierarchy();
  }, []);

  const refreshSelectedRound = async (roundId: string) => {
    try {
      setDetailsLoading(true);
      const fresh = await evaluationService.getInterviewRoundById(roundId);
      setSelectedRound(fresh);
      setRounds((prev) => prev.map((r) => (r.id === fresh.id ? fresh : r)));
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to refresh round');
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleOpenCreate = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 60);
    const dateStr = now.toISOString().slice(0, 16);
    setNewTitle('');
    setNewType('TECHNICAL');
    setNewInstructions('');
    setNewScheduledDate(dateStr);
    setNewDuration(45);
    setNewEvaluatorId('');
    setSelectedDeptId('');
    setSelectedCourseId('');
    setSelectedBatchYear('');
    setCriteria(DEFAULT_INTERVIEW_CRITERIA.map((c) => ({ ...c })));
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
    if (!newTitle.trim() || !newScheduledDate) {
      alert('Please fill in title and scheduled date.');
      return;
    }
    try {
      setCreating(true);
      await evaluationService.createInterviewRound({
        title: newTitle.trim(),
        interviewType: newType,
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
      alert(err?.response?.data?.message || 'Failed to create interview round');
    } finally {
      setCreating(false);
    }
  };

  const handleOpenAssign = (round: InterviewRoundDto) => {
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
      await evaluationService.assignStudentsToInterview(selectedRound.id, newIds);
      setAssignOpen(false);
      setSelectedStudentIds([]);
      await refreshSelectedRound(selectedRound.id);
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Failed to assign students');
    } finally {
      setAssigning(false);
    }
  };

  const handleToggleAttendance = async (part: InterviewParticipantDto, nextStatus: AttendanceStatus) => {
    if (isSuperAdmin) return;
    try {
      await evaluationService.updateInterviewAttendance(part.id, nextStatus);
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
      await evaluationService.batchUpdateInterviewAttendance(records);
      await refreshSelectedRound(selectedRound.id);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to batch update attendance');
    }
  };

  const handleOpenEvaluation = (participant: InterviewParticipantDto) => {
    setEvaluatingParticipant(participant);
    setEvaluationSuccessMsg(null);
    const roundCriteria = selectedRound?.criteria || [];
    const initScores: Record<string, { score: number; comment?: string }> = {};

    if (participant.evaluation) {
      participant.evaluation.criterionScores.forEach((cs) => {
        initScores[cs.criterionId] = { score: cs.score, comment: cs.comment };
      });
      setEvaluatingStrengths(participant.evaluation.strengths || '');
      setEvaluatingAreasForImprovement(participant.evaluation.areasForImprovement || '');
      setEvaluatingOverallFeedback(participant.evaluation.overallFeedback || '');
    } else {
      roundCriteria.forEach((c) => {
        initScores[c.id] = { score: Math.round(c.maxMarks * 0.75), comment: '' };
      });
      setEvaluatingStrengths('');
      setEvaluatingAreasForImprovement('');
      setEvaluatingOverallFeedback('');
    }
    setEvaluatingScores(initScores);
  };

  const handleEvaluationScoreChange = (criterionId: string, val: number) => {
    setEvaluatingScores((prev) => ({
      ...prev,
      [criterionId]: {
        ...prev[criterionId],
        score: val,
      },
    }));
  };

  const handleEvaluationCommentChange = (criterionId: string, comment: string) => {
    setEvaluatingScores((prev) => ({
      ...prev,
      [criterionId]: {
        ...prev[criterionId],
        comment,
      },
    }));
  };

  const handleSubmitEvaluation = async () => {
    if (!selectedRound || !evaluatingParticipant) return;
    try {
      setEvaluatingSubmitting(true);
      const criterionScores = Object.entries(evaluatingScores).map(([critId, val]) => ({
        criterionId: critId,
        score: Number(val.score),
        comment: val.comment?.trim() || undefined,
      }));

      const res = await evaluationService.submitInterviewEvaluation(selectedRound.id, {
        participantId: evaluatingParticipant.id,
        strengths: evaluatingStrengths.trim() || undefined,
        areasForImprovement: evaluatingAreasForImprovement.trim() || undefined,
        overallFeedback: evaluatingOverallFeedback.trim() || undefined,
        criterionScores,
      });

      setEvaluationSuccessMsg(
        `Evaluation recorded: Total ${res.totalScore}/${res.maxPossibleMarks} (${res.percentage}%). ${
          res.comparison ? res.comparison.displayText : ''
        }`
      );

      await refreshSelectedRound(selectedRound.id);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to save Interview evaluation');
    } finally {
      setEvaluatingSubmitting(false);
    }
  };

  const handleDeleteRound = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this interview round?')) return;
    try {
      await evaluationService.deleteInterviewRound(id);
      if (selectedRound?.id === id) {
        setSelectedRound(null);
      }
      await fetchRounds();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to delete interview round');
    }
  };

  const previewMaxMarks = (selectedRound?.criteria || []).reduce((acc, c) => acc + c.maxMarks, 0);
  const previewTotal = Object.values(evaluatingScores).reduce((acc, curr) => acc + (Number(curr?.score) || 0), 0);
  const previewPct = previewMaxMarks > 0 ? Math.round((previewTotal / previewMaxMarks) * 100) : 0;

  const getTypeIcon = (type: InterviewType) => {
    switch (type) {
      case 'TECHNICAL':
        return <TerminalIcon fontSize="small" />;
      case 'HR':
        return <SupervisorAccountIcon fontSize="small" />;
      case 'MANAGERIAL':
        return <BusinessCenterIcon fontSize="small" />;
      default:
        return <PsychologyIcon fontSize="small" />;
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="overline" color="#1765B5" fontWeight={700} letterSpacing={1.2}>
            CANDIDATE INTERVIEW EVALUATION
          </Typography>
          <Typography variant="h4" fontWeight={800} letterSpacing="-0.02em" sx={{ mb: 0.5, color: '#14264B' }}>
            Structured Interview Evaluations
          </Typography>
          <Typography variant="body2" sx={{ color: '#7182A0' }}>
            Conduct Mock, HR, Technical, and Managerial interviews with configurable criteria, strengths, and areas for improvement.
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
              Create Interview Round
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
              TOTAL INTERVIEW ROUNDS
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, color: '#14264B' }}>
              {rounds.length}
            </Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ p: 2, bgcolor: '#ffffff', border: '1px solid #DCE6F5', borderRadius: '8px' }}>
            <Typography variant="caption" sx={{ color: '#7182A0', fontWeight: 600 }}>
              TECHNICAL INTERVIEWS
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, color: '#0369a1' }}>
              {rounds.filter((r) => r.interviewType === 'TECHNICAL').length}
            </Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ p: 2, bgcolor: '#ffffff', border: '1px solid #DCE6F5', borderRadius: '8px' }}>
            <Typography variant="caption" sx={{ color: '#7182A0', fontWeight: 600 }}>
              HR / MOCK INTERVIEWS
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, color: '#047857' }}>
              {rounds.filter((r) => r.interviewType === 'HR' || r.interviewType === 'MOCK').length}
            </Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ p: 2, bgcolor: '#ffffff', border: '1px solid #DCE6F5', borderRadius: '8px' }}>
            <Typography variant="caption" sx={{ color: '#7182A0', fontWeight: 600 }}>
              TOTAL CANDIDATES EVALUATED
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, color: '#1765B5' }}>
              {rounds.reduce((acc, r) => acc + (r.evaluatedCount || 0), 0)}
            </Typography>
          </Card>
        </Grid>
      </Grid>

      {/* Type Filter Tabs */}
      <Paper elevation={0} sx={{ mb: 3, border: '1px solid #DCE6F5', borderRadius: '8px', bgcolor: '#ffffff' }}>
        <Tabs
          value={typeFilter}
          onChange={(_, val) => setTypeFilter(val)}
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
          <Tab label="All Types" value="ALL" />
          <Tab label="Technical" value="TECHNICAL" />
          <Tab label="HR Interview" value="HR" />
          <Tab label="Mock Interview" value="MOCK" />
          <Tab label="Managerial" value="MANAGERIAL" />
        </Tabs>
      </Paper>

      {/* Main Layout */}
      <Grid container spacing={3}>
        {/* Left Column: Interview Rounds */}
        <Grid item xs={12} md={selectedRound ? 5 : 12}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress />
            </Box>
          ) : rounds.length === 0 ? (
            <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
              <WorkIcon sx={{ fontSize: 48, color: '#8293B0', mb: 1 }} />
              <Typography variant="h6" sx={{ color: '#526584' }}>
                No Interview Rounds Found
              </Typography>
              <Typography variant="body2" sx={{ color: '#7182A0', mt: 0.5 }}>
                Create structured Technical, HR, Mock, or Managerial interview rounds for students.
              </Typography>
            </Paper>
          ) : (
            <Stack spacing={2}>
              {rounds.map((round) => {
                const isSelected = selectedRound?.id === round.id;
                return (
                  <Card
                    key={round.id}
                    variant="outlined"
                    sx={{
                      borderRadius: 2,
                      borderColor: isSelected ? '#318992' : 'rgba(226, 232, 240, 0.9)',
                      boxShadow: isSelected ? '0 0 0 2px rgba(37, 99, 235, 0.2)' : 'none',
                      transition: 'all 0.2s',
                    }}
                  >
                    <CardContent sx={{ pb: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#14264B' }}>
                          {round.title}
                        </Typography>
                        <Chip
                          icon={getTypeIcon(round.interviewType)}
                          label={round.interviewType}
                          size="small"
                          color={
                            round.interviewType === 'TECHNICAL'
                              ? 'primary'
                              : round.interviewType === 'HR'
                              ? 'secondary'
                              : 'default'
                          }
                          sx={{ fontWeight: 600, fontSize: '0.75rem' }}
                        />
                      </Box>
                      <Stack direction="row" spacing={2} sx={{ color: '#7182A0', fontSize: '0.8rem', mb: 1 }}>
                        <span>📅 {new Date(round.scheduledDate).toLocaleDateString()}</span>
                        <span>⏱ {round.durationMinutes} mins</span>
                        <span>👥 {round.totalParticipants} candidates</span>
                      </Stack>
                      {round.evaluatorName && (
                        <Typography variant="caption" sx={{ color: '#526584', display: 'block', mb: 0.5 }}>
                          Interviewer: {round.evaluatorName}
                        </Typography>
                      )}
                      {round.averageScore !== null && (
                        <Box sx={{ mt: 1 }}>
                          <Chip
                            label={`Avg Score: ${round.averageScore}% (${round.evaluatedCount}/${round.totalParticipants} evaluated)`}
                            size="small"
                            sx={{ backgroundColor: '#E7EEFA', color: '#14264B', fontWeight: 600 }}
                          />
                        </Box>
                      )}
                    </CardContent>
                    <Divider />
                    <CardActions sx={{ justifyContent: 'space-between', px: 2, py: 1 }}>
                      <Button
                        size="small"
                        variant={isSelected ? 'contained' : 'outlined'}
                        startIcon={<VisibilityIcon />}
                        onClick={() => setSelectedRound(round)}
                      >
                        {isSelected ? 'Viewing' : 'View Candidates'}
                      </Button>
                      <Stack direction="row" spacing={0.5}>
                        {!isSuperAdmin && (
                          <>
                            <Tooltip title="Assign Candidates">
                              <IconButton size="small" onClick={() => handleOpenAssign(round)}>
                                <PersonAddIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete Round">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleDeleteRound(round.id)}
                              >
                                <DeleteOutlineIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                      </Stack>
                    </CardActions>
                  </Card>
                );
              })}
            </Stack>
          )}
        </Grid>

        {/* Right Column: Selected Candidates & Evaluation */}
        {selectedRound && (
          <Grid item xs={12} md={7}>
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#14264B' }}>
                    {selectedRound.title}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#526584', mt: 0.5 }}>
                    <strong>Type:</strong> {selectedRound.interviewType} Interview
                  </Typography>
                  {selectedRound.instructions && (
                    <Typography variant="caption" sx={{ color: '#7182A0', display: 'block', mt: 0.5 }}>
                      <strong>Instructions:</strong> {selectedRound.instructions}
                    </Typography>
                  )}
                </Box>
                <Stack direction="row" spacing={1}>
                  {!isSuperAdmin && (
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<HowToRegIcon />}
                      onClick={handleMarkAllPresent}
                    >
                      Mark All Present
                    </Button>
                  )}
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<PersonAddIcon />}
                    onClick={() => handleOpenAssign(selectedRound)}
                  >
                    Add Candidates
                  </Button>
                </Stack>
              </Box>

              <Divider sx={{ mb: 2 }} />

              <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip
                  label={`Criteria: ${selectedRound.criteria.length} items`}
                  size="small"
                  variant="outlined"
                />
                <Chip
                  label={`Total Marks: ${selectedRound.criteria.reduce((a, b) => a + b.maxMarks, 0)}`}
                  size="small"
                  variant="outlined"
                />
                <Chip
                  label={`Candidates: ${selectedRound.participants.length}`}
                  size="small"
                  variant="outlined"
                />
                <Chip
                  label={`Evaluated: ${selectedRound.evaluatedCount}`}
                  size="small"
                  color="success"
                />
              </Box>

              {detailsLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress size={32} />
                </Box>
              ) : selectedRound.participants.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4, color: '#7182A0' }}>
                  <Typography variant="body2">No candidates assigned to this interview round yet.</Typography>
                  <Button
                    variant="text"
                    startIcon={<PersonAddIcon />}
                    onClick={() => handleOpenAssign(selectedRound)}
                    sx={{ mt: 1 }}
                  >
                    Assign Candidates Now
                  </Button>
                </Box>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead sx={{ backgroundColor: '#EDF2FF' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600 }}>Candidate</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Dept / Reg</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Attendance</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Score</TableCell>
                        <TableCell sx={{ fontWeight: 600, textAlign: 'right' }}>Action</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedRound.participants.map((part) => {
                        const isEvaluated = Boolean(part.evaluation);
                        return (
                          <TableRow key={part.id} hover>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {part.studentName}
                              </Typography>
                              <Typography variant="caption" sx={{ color: '#7182A0' }}>
                                {part.collegeEmail}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">{part.registerNumber}</Typography>
                              <Typography variant="caption" sx={{ color: '#7182A0' }}>
                                {part.departmentName || '—'}
                              </Typography>
                            </TableCell>
                            <TableCell>
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
                                sx={{ cursor: isSuperAdmin ? 'default' : 'pointer' }}
                              />
                            </TableCell>
                            <TableCell>
                              {isEvaluated ? (
                                <Box>
                                  <Typography variant="body2" sx={{ fontWeight: 700, color: '#16a34a' }}>
                                    {part.evaluation?.percentage}%
                                  </Typography>
                                  <Typography variant="caption" sx={{ color: '#7182A0' }}>
                                    {part.evaluation?.totalScore} / {part.evaluation?.maxPossibleMarks}
                                  </Typography>
                                </Box>
                              ) : (
                                <Typography variant="caption" sx={{ color: '#8293B0' }}>
                                  Pending
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell sx={{ textAlign: 'right' }}>
                              <Button
                                size="small"
                                variant={isEvaluated ? 'outlined' : 'contained'}
                                color={isEvaluated ? 'primary' : 'success'}
                                startIcon={<RateReviewIcon />}
                                onClick={() => handleOpenEvaluation(part)}
                              >
                                {isEvaluated ? 'View Eval' : 'Evaluate'}
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Paper>
          </Grid>
        )}
      </Grid>

      {/* Create Interview Round Dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Create New Structured Interview Round</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5}>
            <TextField
              label="Interview Round Title"
              fullWidth
              required
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g., Campus Placement Technical Round 1"
            />
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  label="Interview Type"
                  fullWidth
                  required
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as InterviewType)}
                >
                  <MenuItem value="TECHNICAL">Technical Interview</MenuItem>
                  <MenuItem value="HR">HR Interview</MenuItem>
                  <MenuItem value="MOCK">Mock Interview</MenuItem>
                  <MenuItem value="MANAGERIAL">Managerial Interview</MenuItem>
                </TextField>
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

            <TextField
              label="Scheduled Date & Time"
              type="datetime-local"
              fullWidth
              required
              value={newScheduledDate}
              onChange={(e) => setNewScheduledDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              label="Instructions & Setup Notes"
              fullWidth
              multiline
              rows={2}
              value={newInstructions}
              onChange={(e) => setNewInstructions(e.target.value)}
              placeholder="Specific questions to cover, technical domains, or guidelines..."
            />

            <Divider>
              <Chip label="Target Audience / Batch" size="small" />
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

            {/* Candidate Selection for Interview Round */}
            <Divider>
              <Chip label="Candidate Selection (Optional Direct Assignment)" size="small" />
            </Divider>

            <StudentSelector
              initialDepartmentId={selectedDeptId || undefined}
              initialCourseId={selectedCourseId || undefined}
              selectedStudentIds={createSelectedStudentIds}
              onSelectionChange={setCreateSelectedStudentIds}
              title="Select Candidates for Interview Round"
              helperText="Filter by Department → Course → Class → Section. Multi-select across different sections/classes to assign candidates directly upon round creation."
            />

            <Divider>
              <Chip label="Configurable Criteria (Human Evaluation Only)" size="small" />
            </Divider>

            <Alert severity="info" sx={{ py: 0.5, fontSize: '0.8rem' }}>
              Note: Body Language and Eye Contact are strictly assessed by human evaluators. No automated AI or webcam detection is used.
            </Alert>

            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  Interview Criteria (Default: 10 Criteria / 100 Marks Total)
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Button size="small" onClick={() => setCriteria(DEFAULT_INTERVIEW_CRITERIA.map((c) => ({ ...c })))}>
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
              `Create Interview Round (${createSelectedStudentIds.length} Candidates)`
            ) : (
              'Create Interview Round'
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Assign Candidates Dialog */}
      <Dialog open={assignOpen} onClose={() => setAssignOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          Assign Candidates to Interview: {selectedRound?.title}
        </DialogTitle>
        <DialogContent dividers>
          {selectedRound && (
            <StudentSelector
              initialDepartmentId={selectedRound.departmentId || undefined}
              initialCourseId={selectedRound.courseId || undefined}
              selectedStudentIds={selectedStudentIds}
              onSelectionChange={setSelectedStudentIds}
              alreadyAssignedStudentIds={(selectedRound.participants || []).map((p) => p.studentId)}
              title={`Target Candidates for "${selectedRound.title}"`}
              helperText="Filter by Department → Course → Class → Section. Previously assigned candidates appear selected and locked to prevent duplicates."
            />
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          {(() => {
            const existingIds = new Set((selectedRound?.participants || []).map((p) => p.studentId));
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
                    'No New Candidates Selected'
                  ) : (
                    `Assign ${newCount} New Candidate${newCount === 1 ? '' : 's'}`
                  )}
                </Button>
              </>
            );
          })()}
        </DialogActions>
      </Dialog>

      {/* Structured Interview Evaluation Modal */}
      <Dialog
        open={Boolean(evaluatingParticipant)}
        onClose={() => setEvaluatingParticipant(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          Interview Evaluation: {evaluatingParticipant?.studentName}
        </DialogTitle>
        <DialogContent dividers>
          {evaluatingParticipant && selectedRound && (
            <Stack spacing={2.5}>
              {evaluationSuccessMsg && (
                <Alert severity="success" onClose={() => setEvaluationSuccessMsg(null)}>
                  {evaluationSuccessMsg}
                </Alert>
              )}

              {/* Candidate Info Card */}
              <Card variant="outlined" sx={{ p: 2, backgroundColor: '#EDF2FF' }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={3}>
                    <Typography variant="caption" sx={{ color: '#7182A0' }}>
                      CANDIDATE
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {evaluatingParticipant.studentName}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <Typography variant="caption" sx={{ color: '#7182A0' }}>
                      REGISTRATION NO.
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {evaluatingParticipant.registerNumber}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <Typography variant="caption" sx={{ color: '#7182A0' }}>
                      ROUND TYPE
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#318992' }}>
                      {selectedRound.interviewType}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <Typography variant="caption" sx={{ color: '#7182A0' }}>
                      DEPARTMENT
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {evaluatingParticipant.departmentName || '—'}
                    </Typography>
                  </Grid>
                </Grid>
              </Card>

              {/* Previous Evaluation Comparison Display */}
              {evaluatingParticipant.evaluation?.comparison && (
                <Alert
                  severity="info"
                  icon={<TrendingUpIcon />}
                  sx={{ backgroundColor: '#eff6ff', borderColor: '#bfdbfe' }}
                >
                  <strong>Improvement History: </strong>
                  {evaluatingParticipant.evaluation.comparison.displayText}
                </Alert>
              )}

              {/* Criterion-Level Scoring Table */}
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#14264B' }}>
                Criterion Evaluation Marks (Source of Truth Backend Calculation)
              </Typography>

              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead sx={{ backgroundColor: '#E7EEFA' }}>
                    <TableRow>
                      <TableCell sx={{ width: 40 }}>#</TableCell>
                      <TableCell sx={{ width: 220 }}>Criterion</TableCell>
                      <TableCell sx={{ width: 140 }}>Score (Max)</TableCell>
                      <TableCell>Evaluator Observation</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedRound.criteria.map((crit, idx) => {
                      const entry = evaluatingScores[crit.id] || { score: 0, comment: '' };
                      return (
                        <TableRow key={crit.id}>
                          <TableCell>{idx + 1}</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>{crit.name}</TableCell>
                          <TableCell>
                            <TextField
                              size="small"
                              type="number"
                              disabled={isSuperAdmin}
                              inputProps={{ min: 0, max: crit.maxMarks, step: 0.5 }}
                              value={entry.score}
                              onChange={(e) =>
                                handleEvaluationScoreChange(crit.id, Number(e.target.value))
                              }
                              helperText={`Max: ${crit.maxMarks}`}
                            />
                          </TableCell>
                          <TableCell>
                            <TextField
                              size="small"
                              fullWidth
                              disabled={isSuperAdmin}
                              placeholder="Observation notes..."
                              value={entry.comment || ''}
                              onChange={(e) =>
                                handleEvaluationCommentChange(crit.id, e.target.value)
                              }
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Structured Qualitative Feedback */}
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Strengths"
                    multiline
                    rows={3}
                    fullWidth
                    disabled={isSuperAdmin}
                    value={evaluatingStrengths}
                    onChange={(e) => setEvaluatingStrengths(e.target.value)}
                    placeholder="Candidate demonstrated strong technical clarity, problem decomposition, confidence..."
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Areas for Improvement"
                    multiline
                    rows={3}
                    fullWidth
                    disabled={isSuperAdmin}
                    value={evaluatingAreasForImprovement}
                    onChange={(e) => setEvaluatingAreasForImprovement(e.target.value)}
                    placeholder="Edge-case analysis, eye contact maintenance, structured answer pacing..."
                  />
                </Grid>
              </Grid>

              <TextField
                label="Overall Qualitative Feedback & Decision Notes"
                multiline
                rows={2}
                fullWidth
                disabled={isSuperAdmin}
                value={evaluatingOverallFeedback}
                onChange={(e) => setEvaluatingOverallFeedback(e.target.value)}
                placeholder="Overall impression and placement readiness recommendation..."
              />

              {/* Live Backend Score Preview */}
              <Card variant="outlined" sx={{ p: 2, backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#166534' }}>
                      Backend Authoritative Score Preview:
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#15803d' }}>
                      Backend enforces min/max score boundaries and validates all required criteria.
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="h5" sx={{ fontWeight: 800, color: '#166534' }}>
                      {previewTotal} / {previewMaxMarks} ({previewPct}%)
                    </Typography>
                  </Box>
                </Box>
              </Card>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setEvaluatingParticipant(null)}>Close</Button>
          {!isSuperAdmin && (
            <Button
              variant="contained"
              color="success"
              onClick={handleSubmitEvaluation}
              disabled={evaluatingSubmitting}
            >
              {evaluatingSubmitting ? <CircularProgress size={24} /> : 'Save Interview Evaluation'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};
