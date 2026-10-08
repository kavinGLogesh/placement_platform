import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Typography,
  Box,
  Card,
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
  LinearProgress,
  Tooltip,
  IconButton,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
} from 'recharts';
import { analyticsService } from '../services/analytics.service.js';
import { evaluationService } from '../services/evaluation.service.js';

export const StudentDashboardPage: React.FC = () => {
  const navigate = useNavigate();

  // Primary student dashboard metrics (assigned, completed, available, scores)
  const {
    data: dashboardData,
    isLoading: isDashboardLoading,
    isError: isDashboardError,
    error: dashboardError,
    refetch: refetchDashboard,
    isFetching: isDashboardFetching,
  } = useQuery({
    queryKey: ['studentDashboardMetrics'],
    queryFn: () => analyticsService.getStudentDashboard(),
    staleTime: 30000,
  });

  // Detailed performance analytics (trends & category breakdown)
  const {
    data: performanceData,
    isLoading: isPerformanceLoading,
    refetch: refetchPerformance,
  } = useQuery({
    queryKey: ['studentPerformanceData'],
    queryFn: () => analyticsService.getStudentPerformance(),
    staleTime: 30000,
  });

  // Human evaluation rounds (GD & Interviews)
  const {
    data: humanEvalSummary,
    refetch: refetchHumanEval,
  } = useQuery({
    queryKey: ['studentHumanEvaluationSummary'],
    queryFn: () => evaluationService.getStudentEvaluationSummary(),
    staleTime: 30000,
  });

  const handleRefreshAll = () => {
    refetchDashboard();
    refetchPerformance();
    refetchHumanEval();
  };

  const summary = dashboardData?.summary || {
    totalAssigned: 0,
    completedAssessments: 0,
    availableAssessments: 0,
    averageScore: 0,
    passRate: 0,
    averageAccuracy: 0,
  };

  // Compute weighted readiness score
  const readinessScore = useMemo(() => {
    const avgScore = summary.averageScore || 0;
    const accuracy = summary.averageAccuracy || 0;
    const passRate = summary.passRate || 0;
    const gdAvg = humanEvalSummary?.gd?.averagePercentage || 0;
    const interviewAvg = humanEvalSummary?.interview?.averagePercentage || 0;

    if (summary.completedAssessments === 0 && !humanEvalSummary?.gd?.totalEvaluated) {
      return 60; // Initial benchmark for enrolled student
    }

    let totalWeight = 0;
    let weightedSum = 0;

    if (summary.completedAssessments > 0) {
      weightedSum += avgScore * 0.4 + passRate * 0.25 + accuracy * 0.15;
      totalWeight += 0.8;
    }
    if (humanEvalSummary?.gd?.totalEvaluated) {
      weightedSum += gdAvg * 0.1;
      totalWeight += 0.1;
    }
    if (humanEvalSummary?.interview?.totalEvaluated) {
      weightedSum += interviewAvg * 0.1;
      totalWeight += 0.1;
    }

    return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 65;
  }, [summary, humanEvalSummary]);

  // Chart data: chronological progression of scores & accuracy
  const chartData = useMemo(() => {
    if (performanceData?.trends && performanceData.trends.length > 0) {
      return performanceData.trends.map((t) => ({
        name: t.assessmentTitle.length > 14 ? t.assessmentTitle.substring(0, 12) + '…' : t.assessmentTitle,
        fullName: t.assessmentTitle,
        score: t.percentage,
        accuracy: t.accuracy,
        date: new Date(t.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        isPassed: t.isPassed,
      }));
    }
    if (dashboardData?.recentResults && dashboardData.recentResults.length > 0) {
      return [...dashboardData.recentResults].reverse().map((r) => ({
        name: r.assessmentTitle.length > 14 ? r.assessmentTitle.substring(0, 12) + '…' : r.assessmentTitle,
        fullName: r.assessmentTitle,
        score: r.percentage,
        accuracy: r.accuracy,
        date: r.submittedAt
          ? new Date(r.submittedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
          : 'Recent',
        isPassed: r.isPassed,
      }));
    }
    return [];
  }, [performanceData, dashboardData]);

  // Category breakdown with 4 core domains
  const categoriesList = useMemo(() => {
    const rawCategories = performanceData?.categoryPerformance || [];
    const defaults = [
      { category: 'QUANTITATIVE_APTITUDE', displayName: 'Quantitative Aptitude', accuracy: 0, totalQuestions: 0, attemptedCount: 0, correctCount: 0 },
      { category: 'LOGICAL_REASONING', displayName: 'Logical Reasoning', accuracy: 0, totalQuestions: 0, attemptedCount: 0, correctCount: 0 },
      { category: 'VERBAL_ABILITY', displayName: 'Verbal Ability', accuracy: 0, totalQuestions: 0, attemptedCount: 0, correctCount: 0 },
      { category: 'TECHNICAL_CORE', displayName: 'Technical & Core Skills', accuracy: 0, totalQuestions: 0, attemptedCount: 0, correctCount: 0 },
    ];

    if (rawCategories.length === 0) {
      return defaults;
    }

    return defaults.map((def) => {
      const match = rawCategories.find(
        (c) =>
          c.category.toUpperCase() === def.category ||
          c.displayName.toLowerCase().includes(def.displayName.toLowerCase()) ||
          (def.category === 'TECHNICAL_CORE' && c.category.toLowerCase().includes('tech'))
      );
      return match || def;
    });
  }, [performanceData]);

  const totalGdAssigned = humanEvalSummary?.gd?.totalAssigned || 0;
  const totalGdEvaluated = humanEvalSummary?.gd?.totalEvaluated || 0;
  const totalInterviewAssigned = humanEvalSummary?.interview?.totalAssigned || 0;
  const totalInterviewEvaluated = humanEvalSummary?.interview?.totalEvaluated || 0;

  const totalEvaluationRoundsCompleted = totalGdEvaluated + totalInterviewEvaluated;
  const totalEvaluationRoundsScheduled = totalGdAssigned + totalInterviewAssigned;

  return (
    <Box sx={{ width: '100%', pb: 5 }}>
      {/* Page Title & Controls */}
      <Box
        sx={{
          mb: 3,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 1.5,
        }}
      >
        <Box>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 800,
              color: '#0F172A',
              letterSpacing: '-0.02em',
              lineHeight: 1.2,
            }}
          >
            Dashboard
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748B', mt: 0.5 }}>
            Real-time candidate placement performance, active test drives, and topic proficiency metrics.
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <Tooltip title="Refresh dashboard data">
            <IconButton
              onClick={handleRefreshAll}
              disabled={isDashboardFetching}
              size="small"
              sx={{
                bgcolor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                color: '#475569',
                '&:hover': { bgcolor: '#F8FAFC' },
              }}
            >
              <RefreshIcon fontSize="small" sx={{ animation: isDashboardFetching ? 'spin 1s linear infinite' : 'none' }} />
            </IconButton>
          </Tooltip>
          <Button
            variant="outlined"
            size="small"
            startIcon={<DescriptionOutlinedIcon fontSize="small" />}
            onClick={() => navigate('/student/reports')}
            sx={{
              borderColor: '#E2E8F0',
              color: '#334155',
              bgcolor: '#FFFFFF',
              fontWeight: 600,
              fontSize: '0.8rem',
              textTransform: 'none',
              borderRadius: '8px',
              px: 1.75,
              py: 0.65,
              '&:hover': { borderColor: '#CBD5E1', bgcolor: '#F8FAFC' },
            }}
          >
            Scorecards & Reports
          </Button>
        </Box>
      </Box>

      {isDashboardError && (
        <Alert
          severity="error"
          sx={{ mb: 3, borderRadius: '12px', border: '1px solid #FECACA' }}
          action={
            <Button color="inherit" size="small" onClick={() => refetchDashboard()}>
              Retry
            </Button>
          }
        >
          {dashboardError instanceof Error ? dashboardError.message : 'Failed to load student dashboard metrics'}
        </Alert>
      )}



      {/* KPI Cards Grid */}
      {isDashboardLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6, mb: 3.5, bgcolor: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
          <CircularProgress size={32} sx={{ color: '#2563EB' }} />
        </Box>
      ) : (
        <Grid container spacing={2.5} sx={{ mb: 3.5 }}>
          {/* 1. Assessments Assigned */}
          <Grid item xs={12} sm={6} md={4} lg={2}>
            <Card
              elevation={0}
              sx={{
                p: 2.25,
                bgcolor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '14px',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 6px 16px rgba(0, 0, 0, 0.06)' },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.04em' }}>
                  ASSIGNED
                </Typography>
                <Box sx={{ width: 38, height: 38, borderRadius: '50%', bgcolor: '#EFF6FF', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AssignmentOutlinedIcon sx={{ fontSize: 20 }} />
                </Box>
              </Box>
              <Box sx={{ mt: 1.5, mb: 0.5 }}>
                <Typography variant="h5" sx={{ fontWeight: 800, color: '#0F172A', fontSize: '1.75rem', lineHeight: 1.2 }}>
                  {summary.totalAssigned}
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748B', fontSize: '0.74rem' }}>
                  Total tests scheduled
                </Typography>
              </Box>
            </Card>
          </Grid>

          {/* 2. Assessments Completed */}
          <Grid item xs={12} sm={6} md={4} lg={2}>
            <Card
              elevation={0}
              sx={{
                p: 2.25,
                bgcolor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '14px',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 6px 16px rgba(0, 0, 0, 0.06)' },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.04em' }}>
                  COMPLETED
                </Typography>
                <Box sx={{ width: 38, height: 38, borderRadius: '50%', bgcolor: '#ECFDF5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CheckCircleOutlineIcon sx={{ fontSize: 20 }} />
                </Box>
              </Box>
              <Box sx={{ mt: 1.5, mb: 0.5 }}>
                <Typography variant="h5" sx={{ fontWeight: 800, color: '#0F172A', fontSize: '1.75rem', lineHeight: 1.2 }}>
                  {summary.completedAssessments}
                </Typography>
                <Typography variant="caption" sx={{ color: '#059669', fontWeight: 600, fontSize: '0.74rem' }}>
                  {summary.totalAssigned > 0 ? Math.round((summary.completedAssessments / summary.totalAssigned) * 100) : 0}% completion
                </Typography>
              </Box>
            </Card>
          </Grid>

          {/* 3. Overall Performance */}
          <Grid item xs={12} sm={6} md={4} lg={2}>
            <Card
              elevation={0}
              sx={{
                p: 2.25,
                bgcolor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '14px',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 6px 16px rgba(0, 0, 0, 0.06)' },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.04em' }}>
                  AVERAGE SCORE
                </Typography>
                <Box sx={{ width: 38, height: 38, borderRadius: '50%', bgcolor: '#EEF2FF', color: '#4F46E5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <TrendingUpIcon sx={{ fontSize: 20 }} />
                </Box>
              </Box>
              <Box sx={{ mt: 1.5, mb: 0.5 }}>
                <Typography variant="h5" sx={{ fontWeight: 800, color: '#4F46E5', fontSize: '1.75rem', lineHeight: 1.2 }}>
                  {summary.averageScore}%
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748B', fontSize: '0.74rem' }}>
                  Across submitted tests
                </Typography>
              </Box>
            </Card>
          </Grid>

          {/* 4. Question Accuracy */}
          <Grid item xs={12} sm={6} md={4} lg={2}>
            <Card
              elevation={0}
              sx={{
                p: 2.25,
                bgcolor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '14px',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 6px 16px rgba(0, 0, 0, 0.06)' },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.04em' }}>
                  ACCURACY
                </Typography>
                <Box sx={{ width: 38, height: 38, borderRadius: '50%', bgcolor: '#ECFEFF', color: '#0891B2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <DoneAllIcon sx={{ fontSize: 20 }} />
                </Box>
              </Box>
              <Box sx={{ mt: 1.5, mb: 0.5 }}>
                <Typography variant="h5" sx={{ fontWeight: 800, color: '#0891B2', fontSize: '1.75rem', lineHeight: 1.2 }}>
                  {summary.averageAccuracy}%
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748B', fontSize: '0.74rem' }}>
                  {summary.passRate}% pass qualification
                </Typography>
              </Box>
            </Card>
          </Grid>

          {/* 5. GD / Interviews */}
          <Grid item xs={12} sm={6} md={4} lg={2}>
            <Card
              elevation={0}
              sx={{
                p: 2.25,
                bgcolor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '14px',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 6px 16px rgba(0, 0, 0, 0.06)' },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.04em' }}>
                  GD & INTERVIEWS
                </Typography>
                <Box sx={{ width: 38, height: 38, borderRadius: '50%', bgcolor: '#FFFBEB', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <GroupsOutlinedIcon sx={{ fontSize: 20 }} />
                </Box>
              </Box>
              <Box sx={{ mt: 1.5, mb: 0.5 }}>
                <Typography variant="h5" sx={{ fontWeight: 800, color: '#0F172A', fontSize: '1.75rem', lineHeight: 1.2 }}>
                  {totalEvaluationRoundsCompleted}
                </Typography>
                <Typography variant="caption" sx={{ color: '#D97706', fontWeight: 600, fontSize: '0.74rem' }}>
                  {totalEvaluationRoundsScheduled} rounds scheduled
                </Typography>
              </Box>
            </Card>
          </Grid>

          {/* 6. Placement Readiness */}
          <Grid item xs={12} sm={6} md={4} lg={2}>
            <Card
              elevation={0}
              sx={{
                p: 2.25,
                bgcolor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '14px',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 6px 16px rgba(0, 0, 0, 0.06)' },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.04em' }}>
                  READINESS
                </Typography>
                <Box sx={{ width: 38, height: 38, borderRadius: '50%', bgcolor: '#F5F3FF', color: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <SchoolOutlinedIcon sx={{ fontSize: 20 }} />
                </Box>
              </Box>
              <Box sx={{ mt: 1.5, mb: 0.5 }}>
                <Typography variant="h5" sx={{ fontWeight: 800, color: '#7C3AED', fontSize: '1.75rem', lineHeight: 1.2 }}>
                  {readinessScore}%
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color: readinessScore >= 75 ? '#059669' : readinessScore >= 50 ? '#2563EB' : '#D97706',
                    fontWeight: 600,
                    fontSize: '0.74rem',
                  }}
                >
                  {readinessScore >= 75 ? 'Industry Ready' : readinessScore >= 50 ? 'Progressing Well' : 'Training Active'}
                </Typography>
              </Box>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Two-Column Chart Section */}
      <Grid container spacing={2.5} sx={{ mb: 3.5 }}>
        {/* Left Column: Assessment Performance Line/Area Chart */}
        <Grid item xs={12} lg={7}>
          <Card
            elevation={0}
            sx={{
              p: 3,
              borderRadius: '16px',
              bgcolor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2.5 }}>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0F172A', lineHeight: 1.2 }}>
                  Assessment Performance
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748B', display: 'block', mt: 0.25 }}>
                  Score progression across your recent tests
                </Typography>
              </Box>
              {chartData.length > 0 && (
                <Chip
                  label={`Last ${chartData.length} Tests`}
                  size="small"
                  sx={{
                    height: 24,
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    bgcolor: '#F1F5F9',
                    color: '#475569',
                    border: '1px solid #E2E8F0',
                    borderRadius: '6px',
                  }}
                />
              )}
            </Box>

            {isPerformanceLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 260 }}>
                <CircularProgress size={28} sx={{ color: '#2563EB' }} />
              </Box>
            ) : chartData.length > 0 ? (
              <Box sx={{ width: '100%', height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="scoreColor" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563EB" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#2563EB" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis
                      dataKey="name"
                      tickLine={false}
                      axisLine={{ stroke: '#E2E8F0' }}
                      tick={{ fill: '#64748B', fontSize: 11, fontWeight: 500 }}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tickLine={false}
                      axisLine={{ stroke: '#E2E8F0' }}
                      tick={{ fill: '#64748B', fontSize: 11 }}
                      tickFormatter={(val) => `${val}%`}
                    />
                    <RechartsTooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <Box
                              sx={{
                                bgcolor: '#0F172A',
                                color: '#FFFFFF',
                                p: 1.5,
                                borderRadius: '8px',
                                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                                fontSize: '0.78rem',
                              }}
                            >
                              <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', color: '#93C5FD' }}>
                                {data.fullName}
                              </Typography>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                  Score: {data.score}%
                                </Typography>
                                <Chip
                                  label={data.isPassed ? 'PASS' : 'FAIL'}
                                  size="small"
                                  sx={{
                                    height: 18,
                                    fontSize: '0.62rem',
                                    fontWeight: 700,
                                    bgcolor: data.isPassed ? '#059669' : '#DC2626',
                                    color: '#FFFFFF',
                                  }}
                                />
                              </Box>
                              <Typography variant="caption" sx={{ color: '#94A3B8', display: 'block', mt: 0.25 }}>
                                Accuracy: {data.accuracy}% • {data.date}
                              </Typography>
                            </Box>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="score"
                      stroke="#2563EB"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#scoreColor)"
                      activeDot={{ r: 6, fill: '#2563EB', stroke: '#FFFFFF', strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
            ) : (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: 260,
                  bgcolor: '#F8FAFC',
                  borderRadius: '12px',
                  border: '1px dashed #CBD5E1',
                  p: 3,
                  textAlign: 'center',
                }}
              >
                <CheckCircleOutlineIcon sx={{ fontSize: 40, color: '#94A3B8', mb: 1 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#334155' }}>
                  No Assessment History Yet
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748B', maxWidth: 320, mt: 0.5 }}>
                  Attempt your scheduled tests to unlock interactive performance charts and historical progression.
                </Typography>
                <Button
                  size="small"
                  variant="contained"
                  onClick={() => navigate('/student/tests')}
                  sx={{ mt: 2, bgcolor: '#2563EB', fontSize: '0.78rem', textTransform: 'none' }}
                >
                  View Available Tests
                </Button>
              </Box>
            )}
          </Card>
        </Grid>

        {/* Right Column: Category-wise Performance */}
        <Grid item xs={12} lg={5}>
          <Card
            elevation={0}
            sx={{
              p: 3,
              borderRadius: '16px',
              bgcolor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0F172A', lineHeight: 1.2 }}>
                  Category-wise Performance
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748B', display: 'block', mt: 0.25 }}>
                  Proficiency breakdown by assessment domain
                </Typography>
              </Box>
              <Button
                size="small"
                endIcon={<ArrowForwardIcon sx={{ fontSize: 14 }} />}
                onClick={() => navigate('/student/performance')}
                sx={{
                  color: '#2563EB',
                  fontWeight: 600,
                  fontSize: '0.78rem',
                  textTransform: 'none',
                  p: 0,
                  '&:hover': { bgcolor: 'transparent', textDecoration: 'underline' },
                }}
              >
                Topics
              </Button>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.25, my: 'auto' }}>
              {categoriesList.map((cat) => {
                const acc = Math.min(100, Math.max(0, cat.accuracy || 0));
                const badgeColor =
                  acc >= 70
                    ? { bg: '#ECFDF5', text: '#059669', border: '#A7F3D0', label: 'STRONG' }
                    : acc >= 40
                      ? { bg: '#FFFBEB', text: '#D97706', border: '#FDE68A', label: 'AVERAGE' }
                      : { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA', label: 'NEEDS WORK' };

                const barColor = acc >= 70 ? '#059669' : acc >= 40 ? '#D97706' : '#DC2626';

                return (
                  <Box key={cat.category}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: '#1E293B', fontSize: '0.84rem' }}>
                          {cat.displayName}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip
                          label={badgeColor.label}
                          size="small"
                          sx={{
                            height: 20,
                            fontSize: '0.62rem',
                            fontWeight: 700,
                            bgcolor: badgeColor.bg,
                            color: badgeColor.text,
                            border: `1px solid ${badgeColor.border}`,
                            borderRadius: '4px',
                          }}
                        />
                        <Typography variant="body2" sx={{ fontWeight: 800, color: '#0F172A', fontSize: '0.84rem', minWidth: 38, textAlign: 'right' }}>
                          {acc}%
                        </Typography>
                      </Box>
                    </Box>

                    <LinearProgress
                      variant="determinate"
                      value={acc}
                      sx={{
                        height: 7,
                        borderRadius: '4px',
                        bgcolor: '#F1F5F9',
                        '& .MuiLinearProgress-bar': {
                          bgcolor: barColor,
                          borderRadius: '4px',
                        },
                      }}
                    />

                    <Typography variant="caption" sx={{ color: '#64748B', fontSize: '0.72rem', mt: 0.5, display: 'block' }}>
                      {cat.attemptedCount > 0
                        ? `${cat.attemptedCount} attempted • ${cat.correctCount} correct`
                        : 'No questions answered in this domain yet'}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          </Card>
        </Grid>
      </Grid>

      {/* Available Tests & Recent Submissions Grid */}
      <Grid container spacing={2.5}>
        {/* Available Tests */}
        <Grid item xs={12} md={6}>
          <Card
            elevation={0}
            sx={{
              p: 3,
              borderRadius: '16px',
              bgcolor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0F172A' }}>
                  Available Assessments
                </Typography>
                {summary.availableAssessments > 0 && (
                  <Chip
                    label={summary.availableAssessments}
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      bgcolor: '#EFF6FF',
                      color: '#2563EB',
                      borderRadius: '4px',
                    }}
                  />
                )}
              </Box>
              <Button
                size="small"
                endIcon={<ArrowForwardIcon sx={{ fontSize: 14 }} />}
                onClick={() => navigate('/student/tests')}
                sx={{
                  color: '#2563EB',
                  fontWeight: 600,
                  fontSize: '0.78rem',
                  textTransform: 'none',
                  p: 0,
                  '&:hover': { bgcolor: 'transparent', textDecoration: 'underline' },
                }}
              >
                All Tests
              </Button>
            </Box>

            {dashboardData?.upcomingAssessments && dashboardData.upcomingAssessments.length > 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.75 }}>
                {dashboardData.upcomingAssessments.slice(0, 4).map((test) => (
                  <Box
                    key={test.id}
                    sx={{
                      p: 2,
                      bgcolor: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      borderRadius: '10px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: 1.5,
                      transition: 'border-color 0.15s ease, bgcolor 0.15s ease',
                      '&:hover': {
                        borderColor: '#2563EB',
                        bgcolor: '#FFFFFF',
                      },
                    }}
                  >
                    <Box sx={{ flex: 1, minWidth: 200 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0F172A' }}>
                        {test.title}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.75, flexWrap: 'wrap' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#64748B' }}>
                          <AccessTimeIcon sx={{ fontSize: 14 }} />
                          <Typography variant="caption" sx={{ fontWeight: 600 }}>
                            {test.durationMinutes} mins
                          </Typography>
                        </Box>
                        <Chip
                          label={`${test.totalMarks} Marks`}
                          size="small"
                          sx={{ height: 20, fontSize: '0.68rem', bgcolor: '#FFFFFF', border: '1px solid #E2E8F0', fontWeight: 600, borderRadius: '4px' }}
                        />
                        <Chip
                          label={`Pass: ${test.passingPercentage}%`}
                          size="small"
                          sx={{ height: 20, fontSize: '0.68rem', bgcolor: '#FFFFFF', border: '1px solid #E2E8F0', color: '#059669', fontWeight: 600, borderRadius: '4px' }}
                        />
                      </Box>
                    </Box>
                    <Button
                      variant="contained"
                      color="primary"
                      size="small"
                      startIcon={<PlayArrowIcon sx={{ fontSize: 16 }} />}
                      onClick={() => navigate('/student/tests')}
                      sx={{
                        bgcolor: '#2563EB',
                        px: 2,
                        py: 0.6,
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        textTransform: 'none',
                        borderRadius: '6px',
                        '&:hover': { bgcolor: '#1D4ED8' },
                      }}
                    >
                      Start Test
                    </Button>
                  </Box>
                ))}
              </Box>
            ) : (
              <Box sx={{ p: 4, textAlign: 'center', bgcolor: '#F8FAFC', borderRadius: '10px', border: '1px dashed #CBD5E1' }}>
                <CheckCircleOutlineIcon sx={{ fontSize: 36, color: '#059669', mb: 1 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0F172A' }}>
                  You are all caught up!
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748B', mt: 0.5, display: 'block' }}>
                  No pending tests assigned right now. Check back later or review your official scorecards.
                </Typography>
              </Box>
            )}
          </Card>
        </Grid>

        {/* Recent Results */}
        <Grid item xs={12} md={6}>
          <Card
            elevation={0}
            sx={{
              p: 3,
              borderRadius: '16px',
              bgcolor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0F172A' }}>
                Recent Results & Submissions
              </Typography>
              <Button
                size="small"
                endIcon={<ArrowForwardIcon sx={{ fontSize: 14 }} />}
                onClick={() => navigate('/student/results')}
                sx={{
                  color: '#2563EB',
                  fontWeight: 600,
                  fontSize: '0.78rem',
                  textTransform: 'none',
                  p: 0,
                  '&:hover': { bgcolor: 'transparent', textDecoration: 'underline' },
                }}
              >
                All Results
              </Button>
            </Box>

            {dashboardData?.recentResults && dashboardData.recentResults.length > 0 ? (
              <TableContainer>
                <Table size="small">
                  <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, color: '#64748B', fontSize: '0.75rem', py: 1.25, borderBottom: '1px solid #E2E8F0' }}>Assessment</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#64748B', fontSize: '0.75rem', py: 1.25, borderBottom: '1px solid #E2E8F0' }}>Score</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#64748B', fontSize: '0.75rem', py: 1.25, borderBottom: '1px solid #E2E8F0' }}>Accuracy</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#64748B', fontSize: '0.75rem', py: 1.25, borderBottom: '1px solid #E2E8F0' }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#64748B', fontSize: '0.75rem', py: 1.25, borderBottom: '1px solid #E2E8F0' }} align="right">Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {dashboardData.recentResults.slice(0, 5).map((r) => (
                      <TableRow key={r.id} hover sx={{ '&:hover': { bgcolor: '#F8FAFC' } }}>
                        <TableCell sx={{ fontWeight: 600, color: '#0F172A', fontSize: '0.82rem', borderBottom: '1px solid #F1F5F9' }}>
                          {r.assessmentTitle}
                        </TableCell>
                        <TableCell sx={{ borderBottom: '1px solid #F1F5F9' }}>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: '#0F172A', fontSize: '0.82rem' }}>
                            {r.percentage}%
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#64748B', fontSize: '0.7rem' }}>
                            {r.obtainedMarks}/{r.totalMarks} marks
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ color: '#334155', fontWeight: 600, fontSize: '0.82rem', borderBottom: '1px solid #F1F5F9' }}>
                          {r.accuracy}%
                        </TableCell>
                        <TableCell sx={{ borderBottom: '1px solid #F1F5F9' }}>
                          <Chip
                            icon={r.isPassed ? <CheckCircleOutlineIcon sx={{ '&&': { fontSize: 13 } }} /> : <CancelOutlinedIcon sx={{ '&&': { fontSize: 13 } }} />}
                            label={r.isPassed ? 'PASS' : 'FAIL'}
                            size="small"
                            sx={{
                              fontWeight: 700,
                              fontSize: '0.68rem',
                              borderRadius: '4px',
                              bgcolor: r.isPassed ? '#ECFDF5' : '#FEF2F2',
                              color: r.isPassed ? '#059669' : '#DC2626',
                              border: '1px solid',
                              borderColor: r.isPassed ? '#A7F3D0' : '#FECACA',
                            }}
                          />
                        </TableCell>
                        <TableCell align="right" sx={{ borderBottom: '1px solid #F1F5F9' }}>
                          <Button
                            size="small"
                            variant="text"
                            onClick={() => navigate('/student/reports')}
                            sx={{ fontWeight: 600, fontSize: '0.78rem', color: '#2563EB', textTransform: 'none' }}
                          >
                            Scorecard
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Box sx={{ p: 4, textAlign: 'center', bgcolor: '#F8FAFC', borderRadius: '10px', border: '1px dashed #CBD5E1' }}>
                <AssignmentOutlinedIcon sx={{ fontSize: 36, color: '#94A3B8', mb: 1 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0F172A' }}>
                  No submissions recorded
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748B', mt: 0.5, display: 'block' }}>
                  When you complete an assessment, your score, question accuracy, and topic breakdown will appear right here.
                </Typography>
              </Box>
            )}
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};
