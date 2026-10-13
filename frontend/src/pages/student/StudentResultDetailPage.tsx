import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Chip,
  Alert,
  CircularProgress,
  Divider,
  Paper,
  Tabs,
  Tab,
  Stack,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import GradeIcon from '@mui/icons-material/Grade';
import SpeedIcon from '@mui/icons-material/Speed';
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { useParams, useNavigate } from 'react-router-dom';
import { attemptService } from '../../services/attempt.service.js';
import { AssessmentResultDto, ResultQuestionDetailDto } from '../../types/attempt.types.js';
import { QuestionContentRenderer } from '../../components/common/QuestionContentRenderer.js';

export const StudentResultDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [result, setResult] = useState<AssessmentResultDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [questionFilter, setQuestionFilter] = useState<'ALL' | 'INCORRECT' | 'CORRECT' | 'UNANSWERED'>('ALL');

  useEffect(() => {
    if (!id) return;
    loadResultDetail(id);
  }, [id]);

  const loadResultDetail = async (resultId: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await attemptService.getResultDetail(resultId);
      setResult(data);
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : 'Failed to load result details';
      setError(msg || 'Failed to load result details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress size={48} sx={{ color: '#0284c7' }} />
      </Box>
    );
  }

  if (error || !result) {
    return (
      <Box sx={{ p: 4, maxWidth: 640, mx: 'auto', mt: 4 }}>
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
          {error || 'Result not found or access denied.'}
        </Alert>
        <Button
          variant="contained"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/student/results')}
          sx={{ bgcolor: '#0284c7', textTransform: 'none', fontWeight: 700 }}
        >
          Back to Results
        </Button>
      </Box>
    );
  }

  const isPassed = result.isPassed;
  const passingPercentage = result.assessment?.passingPercentage ?? 50;
  const questions: ResultQuestionDetailDto[] = result.questions || [];

  const incorrectCount = questions.filter((q) => !q.isUnanswered && !q.isCorrect).length || result.incorrectCount;
  const correctCount = questions.filter((q) => q.isCorrect).length || result.correctCount;
  const unansweredCount = questions.filter((q) => q.isUnanswered).length || result.unansweredCount;

  const filteredQuestions = questions.filter((q) => {
    if (questionFilter === 'INCORRECT') return !q.isUnanswered && !q.isCorrect;
    if (questionFilter === 'CORRECT') return q.isCorrect;
    if (questionFilter === 'UNANSWERED') return q.isUnanswered;
    return true;
  });

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1100, mx: 'auto' }}>
      {/* Top Breadcrumb / Navigation */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/student/results')}
          sx={{
            fontWeight: 700,
            textTransform: 'none',
            color: '#1e293b',
            borderColor: '#cbd5e1',
            borderRadius: 2,
            bgcolor: '#ffffff',
            '&:hover': { bgcolor: '#f8fafc', borderColor: '#94a3b8' },
          }}
        >
          Back to Results
        </Button>
        <Button
          variant="contained"
          size="small"
          onClick={() => navigate('/student/tests')}
          sx={{
            bgcolor: '#0284c7',
            textTransform: 'none',
            fontWeight: 700,
            borderRadius: 2,
            '&:hover': { bgcolor: '#0369a1' },
          }}
        >
          Assigned Tests
        </Button>
      </Box>

      {/* Main Performance Evaluation Card (Clean High-Contrast Theme) */}
      <Card
        elevation={0}
        sx={{
          mb: 4,
          borderRadius: 3,
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.02)',
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '5px',
            backgroundColor: isPassed ? '#10b981' : '#ef4444',
          },
        }}
      >
        <CardContent sx={{ p: { xs: 3, md: 4 } }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2, mb: 3 }}>
            <div>
              <Typography
                variant="overline"
                sx={{
                  color: '#0284c7',
                  fontWeight: 800,
                  letterSpacing: '0.08em',
                  fontSize: '0.8rem',
                  display: 'block',
                }}
              >
                ASSESSMENT EVALUATION
              </Typography>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 800,
                  letterSpacing: '-0.02em',
                  color: '#0f172a',
                  mt: 0.5,
                }}
              >
                {result.assessment?.name || 'Assessment Performance Report'}
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5, fontWeight: 500 }}>
                Completed on {new Date(result.createdAt).toLocaleDateString()} at{' '}
                {new Date(result.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Typography>
            </div>

            <Chip
              icon={isPassed ? <CheckCircleIcon sx={{ color: '#ffffff !important' }} /> : <CancelIcon sx={{ color: '#ffffff !important' }} />}
              label={isPassed ? 'PASSED' : 'FAILED'}
              sx={{
                py: 2.5,
                px: 2,
                fontSize: '1rem',
                fontWeight: 800,
                color: '#ffffff',
                backgroundColor: isPassed ? '#16a34a' : '#dc2626',
                boxShadow: isPassed
                  ? '0 4px 14px rgba(22, 163, 74, 0.35)'
                  : '0 4px 14px rgba(220, 38, 38, 0.35)',
                borderRadius: '9999px',
              }}
            />
          </Box>

          <Divider sx={{ my: 3, borderColor: '#f1f5f9' }} />

          {/* 4 Key Metrics Cards with Crystal-Clear High Contrast */}
          <Grid container spacing={2.5}>
            {/* 1. Score */}
            <Grid item xs={12} sm={6} md={3}>
              <Paper
                elevation={0}
                sx={{
                  p: 2.5,
                  borderRadius: 2.5,
                  backgroundColor: '#f0f9ff',
                  border: '1px solid #bae6fd',
                  textAlign: 'center',
                  transition: 'transform 0.15s ease',
                  '&:hover': { transform: 'translateY(-2px)' },
                }}
              >
                <GradeIcon sx={{ color: '#0284c7', fontSize: 32, mb: 0.5 }} />
                <Typography variant="caption" sx={{ color: '#0369a1', fontWeight: 700, display: 'block', textTransform: 'uppercase' }}>
                  Marks Obtained
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, color: '#0c4a6e', my: 0.5 }}>
                  {result.obtainedMarks}
                </Typography>
                <Typography variant="caption" sx={{ color: '#0284c7', fontWeight: 600 }}>
                  out of {result.totalMarks} total
                </Typography>
              </Paper>
            </Grid>

            {/* 2. Percentage */}
            <Grid item xs={12} sm={6} md={3}>
              <Paper
                elevation={0}
                sx={{
                  p: 2.5,
                  borderRadius: 2.5,
                  backgroundColor: isPassed ? '#f0fdf4' : '#fef2f2',
                  border: isPassed ? '1px solid #bbf7d0' : '1px solid #fecaca',
                  textAlign: 'center',
                  transition: 'transform 0.15s ease',
                  '&:hover': { transform: 'translateY(-2px)' },
                }}
              >
                <Typography variant="h5" sx={{ color: isPassed ? '#16a34a' : '#dc2626', fontWeight: 800, mb: 0.5 }}>
                  %
                </Typography>
                <Typography variant="caption" sx={{ color: isPassed ? '#15803d' : '#b91c1c', fontWeight: 700, display: 'block', textTransform: 'uppercase' }}>
                  Score Percentage
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, color: isPassed ? '#15803d' : '#b91c1c', my: 0.5 }}>
                  {result.percentage}%
                </Typography>
                <Typography variant="caption" sx={{ color: isPassed ? '#166534' : '#991b1b', fontWeight: 600 }}>
                  Target: {passingPercentage}%
                </Typography>
              </Paper>
            </Grid>

            {/* 3. Accuracy */}
            <Grid item xs={12} sm={6} md={3}>
              <Paper
                elevation={0}
                sx={{
                  p: 2.5,
                  borderRadius: 2.5,
                  backgroundColor: '#f5f3ff',
                  border: '1px solid #ddd6fe',
                  textAlign: 'center',
                  transition: 'transform 0.15s ease',
                  '&:hover': { transform: 'translateY(-2px)' },
                }}
              >
                <SpeedIcon sx={{ color: '#7c3aed', fontSize: 32, mb: 0.5 }} />
                <Typography variant="caption" sx={{ color: '#6d28d9', fontWeight: 700, display: 'block', textTransform: 'uppercase' }}>
                  Accuracy Rate
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, color: '#4c1d95', my: 0.5 }}>
                  {result.accuracy}%
                </Typography>
                <Typography variant="caption" sx={{ color: '#7c3aed', fontWeight: 600 }}>
                  correct vs answered
                </Typography>
              </Paper>
            </Grid>

            {/* 4. Question Status */}
            <Grid item xs={12} sm={6} md={3}>
              <Paper
                elevation={0}
                sx={{
                  p: 2.5,
                  borderRadius: 2.5,
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  textAlign: 'center',
                  transition: 'transform 0.15s ease',
                  '&:hover': { transform: 'translateY(-2px)' },
                }}
              >
                <HelpOutlineIcon sx={{ color: '#475569', fontSize: 32, mb: 0.5 }} />
                <Typography variant="caption" sx={{ color: '#334155', fontWeight: 700, display: 'block', textTransform: 'uppercase' }}>
                  Questions Answered
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, color: '#0f172a', my: 0.5 }}>
                  {result.correctCount + result.incorrectCount}
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                  {result.unansweredCount} unanswered
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          {/* Breakdown Pills */}
          <Box sx={{ mt: 4, display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Chip
              icon={<CheckCircleIcon sx={{ color: '#15803d !important', fontSize: 18 }} />}
              label={`${result.correctCount} Correct`}
              sx={{
                fontWeight: 700,
                px: 1.5,
                py: 2,
                fontSize: '0.875rem',
                backgroundColor: '#dcfce7',
                color: '#15803d',
                border: '1px solid #86efac',
              }}
            />
            <Chip
              icon={<CancelIcon sx={{ color: '#b91c1c !important', fontSize: 18 }} />}
              label={`${result.incorrectCount} Incorrect`}
              sx={{
                fontWeight: 700,
                px: 1.5,
                py: 2,
                fontSize: '0.875rem',
                backgroundColor: '#fee2e2',
                color: '#b91c1c',
                border: '1px solid #fca5a5',
              }}
            />
            <Chip
              icon={<HelpOutlineIcon sx={{ color: '#475569 !important', fontSize: 18 }} />}
              label={`${result.unansweredCount} Unanswered`}
              sx={{
                fontWeight: 700,
                px: 1.5,
                py: 2,
                fontSize: '0.875rem',
                backgroundColor: '#f1f5f9',
                color: '#475569',
                border: '1px solid #cbd5e1',
              }}
            />
          </Box>
        </CardContent>
      </Card>

      {/* Detailed Question Review & Analysis Section */}
      <Box sx={{ mb: 6 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 2.5 }}>
          <div>
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#0f172a', letterSpacing: '-0.01em' }}>
              Detailed Question Analysis & Solution Review
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>
              Review correct answers, your submitted answers, scoring details, and step-by-step explanations.
            </Typography>
          </div>
        </Box>

        {/* Filter Navigation Tabs */}
        <Paper
          elevation={0}
          sx={{
            mb: 3,
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 2.5,
            overflow: 'hidden',
          }}
        >
          <Tabs
            value={questionFilter}
            onChange={(_e, val) => setQuestionFilter(val)}
            sx={{
              px: 2,
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 700,
                fontSize: '0.875rem',
                minHeight: 48,
                py: 1.5,
              },
              '& .Mui-selected': {
                color: '#0284c7',
              },
              '& .MuiTabs-indicator': {
                backgroundColor: '#0284c7',
                height: 3,
                borderRadius: '3px 3px 0 0',
              },
            }}
          >
            <Tab
              value="ALL"
              icon={<AssignmentOutlinedIcon sx={{ fontSize: 18 }} />}
              iconPosition="start"
              label={`All Questions (${questions.length})`}
            />
            <Tab
              value="INCORRECT"
              icon={<CancelIcon sx={{ fontSize: 18, color: '#dc2626' }} />}
              iconPosition="start"
              label={`Incorrect (${incorrectCount})`}
            />
            <Tab
              value="CORRECT"
              icon={<CheckCircleIcon sx={{ fontSize: 18, color: '#16a34a' }} />}
              iconPosition="start"
              label={`Correct (${correctCount})`}
            />
            <Tab
              value="UNANSWERED"
              icon={<HelpOutlineIcon sx={{ fontSize: 18, color: '#64748b' }} />}
              iconPosition="start"
              label={`Unanswered (${unansweredCount})`}
            />
          </Tabs>
        </Paper>

        {/* Questions List */}
        {questions.length === 0 ? (
          <Paper
            elevation={0}
            sx={{
              p: 4,
              textAlign: 'center',
              borderRadius: 3,
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
            }}
          >
            <AssignmentOutlinedIcon sx={{ fontSize: 48, color: '#94a3b8', mb: 1.5 }} />
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>
              Question Breakdown Not Available
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5, maxWidth: 500, mx: 'auto' }}>
              The detailed question-level review is being processed or was finalized under protected examination archives.
            </Typography>
          </Paper>
        ) : filteredQuestions.length === 0 ? (
          <Paper
            elevation={0}
            sx={{
              p: 4,
              textAlign: 'center',
              borderRadius: 3,
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
            }}
          >
            <CheckCircleIcon sx={{ fontSize: 48, color: '#10b981', mb: 1.5 }} />
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>
              {questionFilter === 'INCORRECT'
                ? 'No Incorrect Questions!'
                : questionFilter === 'UNANSWERED'
                ? 'No Unanswered Questions!'
                : 'No Questions Found'}
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>
              {questionFilter === 'INCORRECT'
                ? 'Outstanding performance! You answered all questions correctly in this assessment.'
                : 'All questions were attempted by you.'}
            </Typography>
            <Button
              variant="outlined"
              size="small"
              onClick={() => setQuestionFilter('ALL')}
              sx={{ mt: 2, textTransform: 'none', fontWeight: 600, color: '#0284c7', borderColor: '#bae6fd' }}
            >
              View All Questions
            </Button>
          </Paper>
        ) : (
          <Stack spacing={3}>
            {filteredQuestions.map((q, idx) => {
              const isCorrect = q.isCorrect;
              const isUnanswered = q.isUnanswered;
              const isIncorrect = !isUnanswered && !isCorrect;

              return (
                <Card
                  key={q.questionId || idx}
                  elevation={0}
                  sx={{
                    borderRadius: 3,
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderLeft: `5px solid ${
                      isCorrect ? '#16a34a' : isIncorrect ? '#dc2626' : '#d97706'
                    }`,
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                    overflow: 'hidden',
                  }}
                >
                  <CardContent sx={{ p: { xs: 2.5, md: 3.5 } }}>
                    {/* Header: Question Meta & Outcome Status */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 1.5, mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Chip
                          label={`Question ${q.questionOrder || idx + 1}`}
                          sx={{
                            fontWeight: 800,
                            fontSize: '0.8rem',
                            backgroundColor: '#0f172a',
                            color: '#ffffff',
                            borderRadius: '6px',
                          }}
                        />
                        <Chip
                          label={q.category}
                          size="small"
                          sx={{
                            fontWeight: 600,
                            fontSize: '0.75rem',
                            backgroundColor: '#f1f5f9',
                            color: '#475569',
                          }}
                        />
                        {q.topic && (
                          <Chip
                            label={q.topic}
                            size="small"
                            sx={{
                              fontWeight: 600,
                              fontSize: '0.75rem',
                              backgroundColor: '#e0f2fe',
                              color: '#0369a1',
                            }}
                          />
                        )}
                        <Chip
                          label={q.difficulty}
                          size="small"
                          sx={{
                            fontWeight: 600,
                            fontSize: '0.75rem',
                            backgroundColor:
                              q.difficulty === 'HARD' ? '#fef2f2' : q.difficulty === 'MEDIUM' ? '#fefce8' : '#f0fdf4',
                            color:
                              q.difficulty === 'HARD' ? '#991b1b' : q.difficulty === 'MEDIUM' ? '#854d0e' : '#166534',
                          }}
                        />
                        <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, ml: 0.5 }}>
                          Max: +{q.marks} {q.negativeMarks > 0 && `(Neg: -${q.negativeMarks})`}
                        </Typography>
                      </Box>

                      {/* Result Outcome Badge */}
                      {isCorrect && (
                        <Chip
                          icon={<CheckIcon sx={{ color: '#15803d !important', fontSize: 16 }} />}
                          label={`Correct (+${q.marksAwarded} Marks)`}
                          sx={{
                            fontWeight: 700,
                            fontSize: '0.8rem',
                            backgroundColor: '#dcfce7',
                            color: '#15803d',
                            border: '1px solid #86efac',
                            borderRadius: '8px',
                          }}
                        />
                      )}
                      {isIncorrect && (
                        <Chip
                          icon={<CloseIcon sx={{ color: '#b91c1c !important', fontSize: 16 }} />}
                          label={`Incorrect (${q.marksAwarded > 0 ? '+' : ''}${q.marksAwarded} Marks)`}
                          sx={{
                            fontWeight: 700,
                            fontSize: '0.8rem',
                            backgroundColor: '#fee2e2',
                            color: '#b91c1c',
                            border: '1px solid #fca5a5',
                            borderRadius: '8px',
                          }}
                        />
                      )}
                      {isUnanswered && (
                        <Chip
                          icon={<WarningAmberIcon sx={{ color: '#b45309 !important', fontSize: 16 }} />}
                          label="Unanswered (0 Marks)"
                          sx={{
                            fontWeight: 700,
                            fontSize: '0.8rem',
                            backgroundColor: '#fef3c7',
                            color: '#b45309',
                            border: '1px solid #fde68a',
                            borderRadius: '8px',
                          }}
                        />
                      )}
                    </Box>

                    {/* Question Text and Authenticated Diagram */}
                    <Box sx={{ mb: 2.5 }}>
                      <QuestionContentRenderer
                        content={q.questionText}
                        imageUrl={q.imageUrl}
                        sx={{ fontSize: '1.05rem', fontWeight: 600, color: '#0f172a' }}
                      />
                    </Box>

                    {/* Option Choices List */}
                    {q.options && q.options.length > 0 && (
                      <Stack spacing={1.5} sx={{ mb: 2 }}>
                        {q.options.map((opt, optIndex) => {
                          const isSelected = q.selectedOptionIds?.includes(opt.id);
                          const isCorrectOpt = opt.isCorrect;
                          const letter = String.fromCharCode(65 + optIndex);

                          // State determinations
                          const isSelectedAndCorrect = isSelected && isCorrectOpt;
                          const isSelectedAndWrong = isSelected && !isCorrectOpt;
                          const isCorrectUnselected = !isSelected && isCorrectOpt;

                          let bgColor = '#f8fafc';
                          let borderColor = '#e2e8f0';
                          let textColor = '#334155';

                          if (isSelectedAndCorrect) {
                            bgColor = '#dcfce7';
                            borderColor = '#16a34a';
                            textColor = '#14532d';
                          } else if (isSelectedAndWrong) {
                            bgColor = '#fee2e2';
                            borderColor = '#dc2626';
                            textColor = '#7f1d1d';
                          } else if (isCorrectUnselected) {
                            bgColor = '#f0fdf4';
                            borderColor = '#22c55e';
                            textColor = '#15803d';
                          }

                          return (
                            <Box
                              key={opt.id}
                              sx={{
                                p: 1.75,
                                borderRadius: 2,
                                border: '1.5px solid',
                                borderColor,
                                backgroundColor: bgColor,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 2,
                                transition: 'all 0.15s ease',
                              }}
                            >
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
                                <Box
                                  sx={{
                                    width: 28,
                                    height: 28,
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 700,
                                    fontSize: '0.8rem',
                                    backgroundColor: isSelected
                                      ? isCorrectOpt
                                        ? '#16a34a'
                                        : '#dc2626'
                                      : isCorrectOpt
                                      ? '#22c55e'
                                      : '#e2e8f0',
                                    color: isSelected || isCorrectOpt ? '#ffffff' : '#475569',
                                  }}
                                >
                                  {letter}
                                </Box>
                                <Typography
                                  variant="body2"
                                  sx={{
                                    fontWeight: isSelected || isCorrectOpt ? 700 : 500,
                                    color: textColor,
                                    fontSize: '0.925rem',
                                  }}
                                >
                                  {opt.optionText}
                                </Typography>
                              </Box>

                              {/* Badges on right side */}
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                {isSelectedAndCorrect && (
                                  <Chip
                                    size="small"
                                    icon={<CheckIcon sx={{ color: '#15803d !important', fontSize: 14 }} />}
                                    label="Your Answer (Correct)"
                                    sx={{
                                      fontWeight: 800,
                                      fontSize: '0.75rem',
                                      backgroundColor: '#bbf7d0',
                                      color: '#15803d',
                                    }}
                                  />
                                )}
                                {isSelectedAndWrong && (
                                  <Chip
                                    size="small"
                                    icon={<CloseIcon sx={{ color: '#b91c1c !important', fontSize: 14 }} />}
                                    label="Your Answer (Wrong)"
                                    sx={{
                                      fontWeight: 800,
                                      fontSize: '0.75rem',
                                      backgroundColor: '#fca5a5',
                                      color: '#991b1b',
                                    }}
                                  />
                                )}
                                {isCorrectUnselected && (
                                  <Chip
                                    size="small"
                                    icon={<CheckIcon sx={{ color: '#15803d !important', fontSize: 14 }} />}
                                    label="Correct Answer"
                                    sx={{
                                      fontWeight: 800,
                                      fontSize: '0.75rem',
                                      backgroundColor: '#dcfce7',
                                      color: '#15803d',
                                      border: '1px solid #86efac',
                                    }}
                                  />
                                )}
                              </Box>
                            </Box>
                          );
                        })}
                      </Stack>
                    )}

                    {/* Fill in Blank / Text Answer Rendering */}
                    {(!q.options || q.options.length === 0) && (
                      <Grid container spacing={2} sx={{ mb: 2 }}>
                        <Grid item xs={12} sm={6}>
                          <Paper
                            elevation={0}
                            sx={{
                              p: 2,
                              borderRadius: 2,
                              border: '1.5px solid',
                              borderColor: isCorrect ? '#86efac' : isUnanswered ? '#cbd5e1' : '#fca5a5',
                              backgroundColor: isCorrect ? '#f0fdf4' : isUnanswered ? '#f8fafc' : '#fef2f2',
                            }}
                          >
                            <Typography
                              variant="caption"
                              sx={{
                                fontWeight: 700,
                                color: isCorrect ? '#166534' : isUnanswered ? '#475569' : '#991b1b',
                                textTransform: 'uppercase',
                              }}
                            >
                              Your Answer
                            </Typography>
                            <Typography variant="body1" sx={{ fontWeight: 600, color: '#0f172a', mt: 0.5 }}>
                              {q.studentAnswerText || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>No answer submitted</span>}
                            </Typography>
                          </Paper>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Paper
                            elevation={0}
                            sx={{
                              p: 2,
                              borderRadius: 2,
                              border: '1.5px solid #86efac',
                              backgroundColor: '#f0fdf4',
                            }}
                          >
                            <Typography
                              variant="caption"
                              sx={{
                                fontWeight: 700,
                                color: '#166534',
                                textTransform: 'uppercase',
                              }}
                            >
                              Correct Answer
                            </Typography>
                            <Typography variant="body1" sx={{ fontWeight: 700, color: '#15803d', mt: 0.5 }}>
                              {q.correctAnswerText || 'Consult solution key'}
                            </Typography>
                          </Paper>
                        </Grid>
                      </Grid>
                    )}

                    {/* Explanation / Key Concept Note */}
                    {q.explanation && (
                      <Paper
                        elevation={0}
                        sx={{
                          p: 2,
                          borderRadius: 2,
                          backgroundColor: '#f0f9ff',
                          border: '1px solid #bae6fd',
                          display: 'flex',
                          gap: 1.5,
                          alignItems: 'flex-start',
                        }}
                      >
                        <LightbulbOutlinedIcon sx={{ color: '#0284c7', fontSize: 22, mt: 0.2 }} />
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0369a1', fontSize: '0.85rem' }}>
                            Explanation & Solution Key:
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#0c4a6e', mt: 0.5, lineHeight: 1.6, fontWeight: 500 }}>
                            {q.explanation}
                          </Typography>
                        </Box>
                      </Paper>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </Stack>
        )}
      </Box>
    </Box>
  );
};
