import React from 'react';
import {
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  Chip,
  Button,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Divider,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import CategoryIcon from '@mui/icons-material/Category';
import CodeIcon from '@mui/icons-material/Code';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';
import GroupsIcon from '@mui/icons-material/Groups';
import WorkOutlineIcon from '@mui/icons-material/WorkOutline';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { analyticsService } from '../../services/analytics.service.js';
import { evaluationService } from '../../services/evaluation.service.js';

export const StudentPerformancePage: React.FC = () => {
  const navigate = useNavigate();

  const {
    data: performance,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['studentPerformanceData'],
    queryFn: () => analyticsService.getStudentPerformance(),
    staleTime: 30000,
  });

  const { data: humanEvalSummary } = useQuery({
    queryKey: ['studentHumanEvaluationSummary'],
    queryFn: () => evaluationService.getStudentEvaluationSummary(),
    staleTime: 30000,
  });

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (isError || !performance) {
    return (
      <Box sx={{ p: 4 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/student/dashboard')}
          sx={{ mb: 2 }}
        >
          Back to Dashboard
        </Button>
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => refetch()}>
              Retry
            </Button>
          }
        >
          {error instanceof Error ? error.message : 'Failed to load performance analytics'}
        </Alert>
      </Box>
    );
  }

  const { summary, categoryPerformance, topicPerformance, codingPerformance, assessmentHistory } =
    performance;

  const categoryChartData = categoryPerformance.map((c) => ({
    name: c.displayName,
    accuracy: c.accuracy,
    avgScore: c.averageScore,
  }));

  // Assessment Improvement: Chronological comparison between previous and latest completed assessment
  const sortedHistory = [...(assessmentHistory || [])].sort(
    (a, b) => new Date(a.createdAt || a.submittedAt || 0).getTime() - new Date(b.createdAt || b.submittedAt || 0).getTime()
  );

  const hasAtLeastTwo = sortedHistory.length >= 2;
  const previousAssessment = hasAtLeastTwo ? sortedHistory[sortedHistory.length - 2] : null;
  const currentAssessment = hasAtLeastTwo ? sortedHistory[sortedHistory.length - 1] : null;

  let previousNormalized = 0;
  let currentNormalized = 0;
  let pointsDiff = 0;
  let relativeChange = 0;
  let changeStatus: 'IMPROVED' | 'DECREASED' | 'NO_CHANGE' = 'NO_CHANGE';

  if (previousAssessment && currentAssessment) {
    // Normalize scores to 100 before comparison if assessments have different maximum marks
    previousNormalized =
      previousAssessment.totalMarks > 0
        ? Math.round(((previousAssessment.obtainedMarks / previousAssessment.totalMarks) * 100) * 100) / 100
        : previousAssessment.percentage || 0;

    currentNormalized =
      currentAssessment.totalMarks > 0
        ? Math.round(((currentAssessment.obtainedMarks / currentAssessment.totalMarks) * 100) * 100) / 100
        : currentAssessment.percentage || 0;

    // Improvement points = Current normalized score - Previous normalized score
    pointsDiff = Math.round((currentNormalized - previousNormalized) * 100) / 100;

    // Relative percentage change calculated from previous normalized score, handling base 0 safely
    if (previousNormalized > 0) {
      relativeChange =
        Math.round(((currentNormalized - previousNormalized) / previousNormalized) * 10000) / 100;
    } else {
      relativeChange = pointsDiff > 0 ? 100 : 0;
    }

    if (pointsDiff > 0) {
      changeStatus = 'IMPROVED';
    } else if (pointsDiff < 0) {
      changeStatus = 'DECREASED';
    } else {
      changeStatus = 'NO_CHANGE';
    }
  }

  return (
    <Box>
      {/* Navigation Header */}
      <Box
        sx={{
          mb: 4,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <div>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/student/dashboard')}
            sx={{ mb: 1 }}
          >
            Dashboard
          </Button>
          <Typography variant="overline" color="primary.light" fontWeight={700} letterSpacing={1.2} display="block">
            Student Analytics Hub • Phase 8
          </Typography>
          <Typography variant="h4" fontWeight={800} letterSpacing="-0.02em">
            My Performance, Trends & Mastery
          </Typography>
        </div>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => refetch()}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {/* KPI Cards (Retaining Tests Taken, Tests Passed, Accuracy) */}
      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={4}>
          <Card sx={{ bgcolor: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
            <CardContent>
              <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">
                Tests Taken
              </Typography>
              <Typography variant="h4" fontWeight={800} color="#818cf8" sx={{ my: 0.5 }}>
                {summary.totalAssessmentsTaken}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Completed submissions
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Card sx={{ bgcolor: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
            <CardContent>
              <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">
                Tests Passed
              </Typography>
              <Typography variant="h4" fontWeight={800} color="#34d399" sx={{ my: 0.5 }}>
                {summary.totalPassed}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Met cutoff percentage
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Card sx={{ bgcolor: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
            <CardContent>
              <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">
                Accuracy
              </Typography>
              <Typography variant="h4" fontWeight={800} color="#fbbf24" sx={{ my: 0.5 }}>
                {summary.averageAccuracy}%
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Correct answers ratio
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Assessment Improvement Comparison Section */}
      <Card sx={{ mb: 4, p: 3, bgcolor: 'background.paper', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <CompareArrowsIcon color="primary" />
          <Typography variant="h6" fontWeight={700}>
            Assessment Improvement
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Factual comparative analysis between your previous assessment and latest assessment.
        </Typography>

        {!hasAtLeastTwo ? (
          <Alert severity="info">Complete another assessment to compare your improvement.</Alert>
        ) : (
          <Box>
            {/* Top Status Banner */}
            <Box
              sx={{
                p: 2.5,
                mb: 3,
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 2,
                bgcolor:
                  changeStatus === 'IMPROVED'
                    ? 'rgba(16, 185, 129, 0.08)'
                    : changeStatus === 'DECREASED'
                    ? 'rgba(239, 68, 68, 0.08)'
                    : 'rgba(148, 163, 184, 0.08)',
                border: '1px solid',
                borderColor:
                  changeStatus === 'IMPROVED'
                    ? 'rgba(16, 185, 129, 0.25)'
                    : changeStatus === 'DECREASED'
                    ? 'rgba(239, 68, 68, 0.25)'
                    : 'rgba(148, 163, 184, 0.25)',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor:
                      changeStatus === 'IMPROVED'
                        ? 'rgba(16, 185, 129, 0.15)'
                        : changeStatus === 'DECREASED'
                        ? 'rgba(239, 68, 68, 0.15)'
                        : 'rgba(148, 163, 184, 0.15)',
                    color:
                      changeStatus === 'IMPROVED'
                        ? '#34d399'
                        : changeStatus === 'DECREASED'
                        ? '#f87171'
                        : '#8293B0',
                  }}
                >
                  {changeStatus === 'IMPROVED' ? (
                    <TrendingUpIcon fontSize="medium" />
                  ) : changeStatus === 'DECREASED' ? (
                    <TrendingDownIcon fontSize="medium" />
                  ) : (
                    <TrendingFlatIcon fontSize="medium" />
                  )}
                </Box>
                <Box>
                  <Typography
                    variant="h6"
                    fontWeight={800}
                    sx={{
                      color:
                        changeStatus === 'IMPROVED'
                          ? '#34d399'
                          : changeStatus === 'DECREASED'
                          ? '#f87171'
                          : '#D1DEF0',
                    }}
                  >
                    {changeStatus === 'IMPROVED'
                      ? 'Improvement'
                      : changeStatus === 'DECREASED'
                      ? 'Performance Decreased'
                      : 'No Change'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {changeStatus === 'IMPROVED'
                      ? 'Your normalized score increased compared to the previous assessment.'
                      : changeStatus === 'DECREASED'
                      ? 'Your normalized score decreased compared to the previous assessment.'
                      : 'Your normalized score remained unchanged from the previous assessment.'}
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                <Box sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">
                    POINTS CHANGE
                  </Typography>
                  <Typography
                    variant="h5"
                    fontWeight={800}
                    sx={{
                      color:
                        changeStatus === 'IMPROVED'
                          ? '#34d399'
                          : changeStatus === 'DECREASED'
                          ? '#f87171'
                          : '#8293B0',
                    }}
                  >
                    {pointsDiff > 0 ? `+${pointsDiff}` : `${pointsDiff}`} points
                  </Typography>
                </Box>
                <Divider orientation="vertical" flexItem sx={{ height: 36, alignSelf: 'center', borderColor: 'rgba(255, 255, 255, 0.1)' }} />
                <Box sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">
                    PERCENTAGE CHANGE
                  </Typography>
                  <Typography
                    variant="h5"
                    fontWeight={800}
                    sx={{
                      color:
                        changeStatus === 'IMPROVED'
                          ? '#34d399'
                          : changeStatus === 'DECREASED'
                          ? '#f87171'
                          : '#8293B0',
                    }}
                  >
                    {changeStatus === 'IMPROVED'
                      ? `+${relativeChange}% improvement`
                      : `${relativeChange}%`}
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* Assessment Cards Side-by-Side */}
            <Grid container spacing={2.5}>
              {/* Previous Assessment */}
              <Grid item xs={12} md={6}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2.5,
                    borderRadius: 2,
                    bgcolor: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                  }}
                >
                  <Typography variant="caption" fontWeight={700} color="text.secondary" textTransform="uppercase" letterSpacing={0.5}>
                    Previous Assessment
                  </Typography>
                  <Typography variant="subtitle1" fontWeight={700} sx={{ mt: 0.5, mb: 1 }}>
                    {previousAssessment?.assessmentTitle}
                  </Typography>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      Date Completed:
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {previousAssessment?.createdAt ? new Date(previousAssessment.createdAt).toLocaleDateString() : 'N/A'}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      Raw Score:
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {previousAssessment?.obtainedMarks} / {previousAssessment?.totalMarks} marks
                    </Typography>
                  </Box>

                  <Divider sx={{ my: 1.5, borderColor: 'rgba(255, 255, 255, 0.08)' }} />

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" fontWeight={700} color="text.secondary">
                      Normalized Score:
                    </Typography>
                    <Typography variant="h6" fontWeight={800} color="primary.light">
                      Score = {previousNormalized} / 100
                    </Typography>
                  </Box>
                </Paper>
              </Grid>

              {/* Current Assessment */}
              <Grid item xs={12} md={6}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2.5,
                    borderRadius: 2,
                    bgcolor: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                  }}
                >
                  <Typography variant="caption" fontWeight={700} color="text.secondary" textTransform="uppercase" letterSpacing={0.5}>
                    Current Assessment (Latest)
                  </Typography>
                  <Typography variant="subtitle1" fontWeight={700} sx={{ mt: 0.5, mb: 1 }}>
                    {currentAssessment?.assessmentTitle}
                  </Typography>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      Date Completed:
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {currentAssessment?.createdAt ? new Date(currentAssessment.createdAt).toLocaleDateString() : 'N/A'}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      Raw Score:
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {currentAssessment?.obtainedMarks} / {currentAssessment?.totalMarks} marks
                    </Typography>
                  </Box>

                  <Divider sx={{ my: 1.5, borderColor: 'rgba(255, 255, 255, 0.08)' }} />

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" fontWeight={700} color="text.secondary">
                      Normalized Score:
                    </Typography>
                    <Typography variant="h6" fontWeight={800} color="primary.light">
                      Score = {currentNormalized} / 100
                    </Typography>
                  </Box>
                </Paper>
              </Grid>
            </Grid>
          </Box>
        )}
      </Card>

      {/* Category Breakdown & Coding Performance */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Category Performance */}
        <Grid item xs={12} md={7}>
          <Card sx={{ p: 3, height: '100%', bgcolor: 'background.paper', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <CategoryIcon color="primary" />
              <Typography variant="h6" fontWeight={700}>
                Component Mastery Breakdown
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Your accuracy and score across Aptitude, Reasoning, Verbal, Technical & Coding.
            </Typography>

            {categoryChartData.length > 0 ? (
              <Box sx={{ width: '100%', height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryChartData} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
                    <XAxis dataKey="name" stroke="#8293B0" />
                    <YAxis unit="%" domain={[0, 100]} stroke="#8293B0" />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#33466A', borderColor: '#405678', borderRadius: 8 }}
                      formatter={(val: any) => [`${val}%`]}
                    />
                    <Legend />
                    <Bar dataKey="accuracy" name="Accuracy %" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="avgScore" name="Avg Score %" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            ) : (
              <Alert severity="info">No component data recorded yet.</Alert>
            )}
          </Card>
        </Grid>

        {/* Coding Assessment Performance */}
        <Grid item xs={12} md={5}>
          <Card sx={{ p: 3, height: '100%', bgcolor: 'background.paper', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <CodeIcon color="primary" />
              <Typography variant="h6" fontWeight={700}>
                Coding Assessment Performance
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Phase 7 secure code execution statistics.
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                  <Typography variant="caption" color="text.secondary">Total Submissions</Typography>
                  <Typography variant="h5" fontWeight={800}>{codingPerformance.totalSubmissions}</Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                  <Typography variant="caption" color="#34d399">Accepted Solutions</Typography>
                  <Typography variant="h5" fontWeight={800} color="#34d399">{codingPerformance.acceptedCount}</Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                  <Typography variant="caption" color="#fbbf24">Partial / Wrong</Typography>
                  <Typography variant="h5" fontWeight={800} color="#fbbf24">{codingPerformance.partialCount + codingPerformance.failedCount}</Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'rgba(99, 102, 241, 0.05)', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                  <Typography variant="caption" color="#818cf8">Test Cases Pass Ratio</Typography>
                  <Typography variant="h5" fontWeight={800} color="#818cf8">{codingPerformance.passedTestsRatio}%</Typography>
                </Box>
              </Grid>
            </Grid>

            <Box sx={{ mt: 3 }}>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                Programming Languages Used:
              </Typography>
              {codingPerformance.languagesUsed.length > 0 ? (
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {codingPerformance.languagesUsed.map((lang) => (
                    <Chip key={lang} label={lang} size="small" color="primary" variant="outlined" />
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No coding problems submitted yet.
                </Typography>
              )}
            </Box>
          </Card>
        </Grid>
      </Grid>

      {/* Topic Strengths & Weaknesses Table */}
      {topicPerformance && topicPerformance.length > 0 && (
        <Card sx={{ mb: 4, p: 3, bgcolor: 'background.paper', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
            Topic Mastery & Strengths Matrix
          </Typography>
          <TableContainer component={Paper} sx={{ bgcolor: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: 'rgba(255, 255, 255, 0.04)' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Topic Name</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Component</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Answered</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Correct</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Accuracy</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {topicPerformance.map((t) => (
                  <TableRow key={`${t.category}-${t.topic}`} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{t.topic}</TableCell>
                    <TableCell color="text.secondary">{t.category}</TableCell>
                    <TableCell>{t.attemptedCount}</TableCell>
                    <TableCell>{t.correctCount}</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{t.accuracy}%</TableCell>
                    <TableCell>
                      <Chip
                        label={t.strength}
                        size="small"
                        color={
                          t.strength === 'STRONG'
                            ? 'success'
                            : t.strength === 'AVERAGE'
                            ? 'warning'
                            : 'error'
                        }
                        sx={{ fontWeight: 700, fontSize: '0.7rem' }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      {/* Human Evaluation: Group Discussion & Structured Interviews */}
      <Box sx={{ mt: 5, mb: 2 }}>
        <Typography variant="overline" sx={{ fontWeight: 800, color: '#16a34a', letterSpacing: 1.5 }}>
          Human Evaluation: Structured GD & Interviews
        </Typography>
        <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5, color: '#14264B' }}>
          Qualitative & Evaluator Assessment Progress
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Independent human evaluator scoring for Communication, Subject Knowledge, Confidence, and Technical/HR Interviews.
        </Typography>
      </Box>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* GD Card */}
        <Grid item xs={12} md={6}>
          <Card sx={{ p: 3, border: '1px solid rgba(22, 163, 74, 0.2)', bgcolor: 'background.paper', height: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <GroupsIcon sx={{ color: '#16a34a' }} />
                <Typography variant="h6" fontWeight={700}>
                  Group Discussion (GD)
                </Typography>
              </Box>
              <Chip
                label={`${humanEvalSummary?.gd.totalEvaluated || 0} Evaluated`}
                size="small"
                color="success"
              />
            </Box>

            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">AVERAGE SCORE</Typography>
                <Typography variant="h5" fontWeight={800} color="#16a34a">
                  {humanEvalSummary?.gd.averagePercentage ? `${humanEvalSummary.gd.averagePercentage}%` : '—'}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">LATEST SCORE</Typography>
                <Typography variant="h5" fontWeight={800} color="#14264B">
                  {humanEvalSummary?.gd.latestPercentage ? `${humanEvalSummary.gd.latestPercentage}%` : '—'}
                </Typography>
              </Grid>
            </Grid>

            <Divider sx={{ my: 1.5 }} />

            <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" sx={{ mb: 1 }}>
              PROGRESSION & IMPROVEMENT:
            </Typography>

            {humanEvalSummary?.gd.progression && humanEvalSummary.gd.progression.length > 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {humanEvalSummary.gd.progression.map((p, idx) => (
                  <Box
                    key={idx}
                    sx={{
                      p: 1.5,
                      borderRadius: 1.5,
                      bgcolor: 'rgba(241, 245, 249, 0.6)',
                      border: '1px solid #DCE6F5',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <Typography variant="body2" fontWeight={600} color="#14264B">
                      {p.displayText}
                    </Typography>
                    {p.difference !== null && (
                      <Chip
                        icon={p.difference >= 0 ? <TrendingUpIcon /> : <TrendingDownIcon />}
                        label={p.difference >= 0 ? `+${p.difference} pts` : `${p.difference} pts`}
                        size="small"
                        color={p.difference >= 0 ? 'success' : 'error'}
                        sx={{ fontWeight: 700 }}
                      />
                    )}
                  </Box>
                ))}
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', py: 1 }}>
                No previous evaluation available.
              </Typography>
            )}

            <Box sx={{ mt: 2, textAlign: 'right' }}>
              <Button size="small" onClick={() => navigate('/student/gd')}>
                View All GD Rounds →
              </Button>
            </Box>
          </Card>
        </Grid>

        {/* Interview Card */}
        <Grid item xs={12} md={6}>
          <Card sx={{ p: 3, border: '1px solid rgba(37, 99, 235, 0.2)', bgcolor: 'background.paper', height: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <WorkOutlineIcon sx={{ color: '#318992' }} />
                <Typography variant="h6" fontWeight={700}>
                  Structured Interviews
                </Typography>
              </Box>
              <Chip
                label={`${humanEvalSummary?.interview.totalEvaluated || 0} Evaluated`}
                size="small"
                color="primary"
              />
            </Box>

            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">AVERAGE SCORE</Typography>
                <Typography variant="h5" fontWeight={800} color="#318992">
                  {humanEvalSummary?.interview.averagePercentage ? `${humanEvalSummary.interview.averagePercentage}%` : '—'}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">LATEST SCORE</Typography>
                <Typography variant="h5" fontWeight={800} color="#14264B">
                  {humanEvalSummary?.interview.latestPercentage ? `${humanEvalSummary.interview.latestPercentage}%` : '—'}
                </Typography>
              </Grid>
            </Grid>

            <Divider sx={{ my: 1.5 }} />

            <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" sx={{ mb: 1 }}>
              PROGRESSION & IMPROVEMENT:
            </Typography>

            {humanEvalSummary?.interview.progression && humanEvalSummary.interview.progression.length > 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {humanEvalSummary.interview.progression.map((p, idx) => (
                  <Box
                    key={idx}
                    sx={{
                      p: 1.5,
                      borderRadius: 1.5,
                      bgcolor: 'rgba(241, 245, 249, 0.6)',
                      border: '1px solid #DCE6F5',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <Typography variant="body2" fontWeight={600} color="#14264B">
                      {p.displayText}
                    </Typography>
                    {p.difference !== null && (
                      <Chip
                        icon={p.difference >= 0 ? <TrendingUpIcon /> : <TrendingDownIcon />}
                        label={p.difference >= 0 ? `+${p.difference} pts` : `${p.difference} pts`}
                        size="small"
                        color={p.difference >= 0 ? 'success' : 'error'}
                        sx={{ fontWeight: 700 }}
                      />
                    )}
                  </Box>
                ))}
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', py: 1 }}>
                No previous evaluation available.
              </Typography>
            )}

            <Box sx={{ mt: 2, textAlign: 'right' }}>
              <Button size="small" onClick={() => navigate('/student/interviews')}>
                View All Interviews →
              </Button>
            </Box>
          </Card>
        </Grid>
      </Grid>

      {/* Assessment History Table */}
      <Card sx={{ mb: 4, p: 3, bgcolor: 'background.paper', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
        <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
          Complete Assessment History ({assessmentHistory.length})
        </Typography>

        {assessmentHistory.length > 0 ? (
          <TableContainer component={Paper} sx={{ bgcolor: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: 'rgba(255, 255, 255, 0.04)' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Assessment Title</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Score Awarded</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Percentage</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Accuracy</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Correct</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Incorrect</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {assessmentHistory.map((r) => (
                  <TableRow key={r.id} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{r.assessmentTitle}</TableCell>
                    <TableCell>{r.obtainedMarks} / {r.totalMarks}</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{r.percentage}%</TableCell>
                    <TableCell>{r.accuracy}%</TableCell>
                    <TableCell sx={{ color: '#34d399' }}>{r.correctCount}</TableCell>
                    <TableCell sx={{ color: '#f87171' }}>{r.incorrectCount}</TableCell>
                    <TableCell>
                      <Chip
                        icon={r.isPassed ? <CheckCircleOutlineIcon /> : <CancelOutlinedIcon />}
                        label={r.isPassed ? 'PASS' : 'FAIL'}
                        size="small"
                        color={r.isPassed ? 'success' : 'error'}
                        sx={{ fontWeight: 700 }}
                      />
                    </TableCell>
                    <TableCell color="text.secondary">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Alert severity="info">You haven't completed any assessments yet.</Alert>
        )}
      </Card>
    </Box>
  );
};
