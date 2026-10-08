import React, { useState } from 'react';
import {
  Typography,
  Box,
  Card,
  Grid,
  Chip,
  Button,
  CircularProgress,
  Alert,
  TextField,
  MenuItem,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
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
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import RefreshIcon from '@mui/icons-material/Refresh';
import LayersIcon from '@mui/icons-material/Layers';
import SchoolIcon from '@mui/icons-material/School';
import CategoryIcon from '@mui/icons-material/Category';
import { analyticsService } from '../../services/analytics.service.js';
import { managementService } from '../../services/management.service.js';
import { assessmentService } from '../../services/assessment.service.js';

export const AdminAnalyticsPage: React.FC = () => {
  // Filters
  const [selectedDeptId, setSelectedDeptId] = useState<string>('');
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Auxiliary queries for filters
  const { data: departments } = useQuery({
    queryKey: ['filterDepartments'],
    queryFn: () => managementService.getDepartments(),
    staleTime: 300000,
  });

  const { data: assessmentsData } = useQuery({
    queryKey: ['filterAssessments'],
    queryFn: () => assessmentService.getAssessments({ limit: 100 }),
    staleTime: 300000,
  });

  const activeFilters = {
    departmentId: selectedDeptId || undefined,
    assessmentId: selectedAssessmentId || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  };

  // Queries for Analytics
  const {
    data: funnel,
    isLoading: loadingFunnel,
    refetch: refetchFunnel,
  } = useQuery({
    queryKey: ['placementFunnel', activeFilters],
    queryFn: () => analyticsService.getPlacementFunnel(activeFilters),
  });

  const {
    data: departmentAnalytics,
    isLoading: loadingDept,
    refetch: refetchDept,
  } = useQuery({
    queryKey: ['deptAnalytics', activeFilters],
    queryFn: () =>
      analyticsService.getDepartmentAnalytics({
        assessmentId: activeFilters.assessmentId,
        startDate: activeFilters.startDate,
        endDate: activeFilters.endDate,
      }),
  });

  const {
    data: topicAnalytics,
    isLoading: loadingTopics,
    refetch: refetchTopics,
  } = useQuery({
    queryKey: ['topicAnalytics', activeFilters],
    queryFn: () => analyticsService.getTopicAnalytics(activeFilters),
  });

  const handleResetFilters = () => {
    setSelectedDeptId('');
    setSelectedAssessmentId('');
    setStartDate('');
    setEndDate('');
  };

  const handleRefreshAll = () => {
    refetchFunnel();
    refetchDept();
    refetchTopics();
  };

  // Department chart data
  const deptChartData = (departmentAnalytics || []).map((d) => ({
    name: d.departmentCode || d.departmentName,
    fullName: d.departmentName,
    avgScore: d.averageScore,
    passRate: d.passPercentage,
    participation: d.participationRate,
  }));

  // Category chart data
  const categoryChartData = (topicAnalytics?.categories || []).map((c) => ({
    category: c.displayName,
    accuracy: c.accuracy,
    avgScore: c.averageScore,
    attempted: c.attemptedCount,
  }));

  return (
    <Box>
      {/* Header */}
      <Box
        sx={{
          mb: 3,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', md: 'center' },
          flexDirection: { xs: 'column', md: 'row' },
          gap: 2,
        }}
      >
        <div>
          <Typography variant="overline" sx={{ color: '#1765B5', fontWeight: 700, letterSpacing: '0.06em' }}>
            INSTITUTIONAL INTELLIGENCE & BENCHMARKS
          </Typography>
          <Typography variant="h5" fontWeight={700} sx={{ color: '#14264B', mb: 0.5 }}>
            Analytics, Placement Funnel & Performance Hub
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Cohort progression funnel, departmental benchmark distributions, and topic mastery diagnostics.
          </Typography>
        </div>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleRefreshAll}
          >
            Refresh Analytics
          </Button>
        </Box>
      </Box>

      {/* Filter Toolbar */}
      <Card elevation={0} sx={{ mb: 3, p: 2, bgcolor: '#ffffff', border: '1px solid #DCE6F5', borderRadius: '8px' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <FilterAltIcon sx={{ color: '#1765B5', fontSize: 18 }} />
          <Typography variant="subtitle2" fontWeight={700} color="#14264B">
            Authoritative Filters
          </Typography>
        </Box>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              select
              fullWidth
              size="small"
              label="Department"
              value={selectedDeptId}
              onChange={(e) => setSelectedDeptId(e.target.value)}
            >
              <MenuItem value="">All Departments</MenuItem>
              {(departments || []).map((d) => (
                <MenuItem key={d.id} value={d.id}>
                  {d.code} - {d.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <TextField
              select
              fullWidth
              size="small"
              label="Assessment"
              value={selectedAssessmentId}
              onChange={(e) => setSelectedAssessmentId(e.target.value)}
            >
              <MenuItem value="">All Assessments</MenuItem>
              {(assessmentsData?.data || []).map((a) => (
                <MenuItem key={a.id} value={a.id}>
                  {a.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12} sm={6} md={2.5}>
            <TextField
              fullWidth
              size="small"
              type="date"
              label="Start Date"
              InputLabelProps={{ shrink: true }}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={2.5}>
            <TextField
              fullWidth
              size="small"
              type="date"
              label="End Date"
              InputLabelProps={{ shrink: true }}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </Grid>

          <Grid item xs={12} sm={12} md={1}>
            <Button
              fullWidth
              variant="text"
              color="inherit"
              size="small"
              onClick={handleResetFilters}
            >
              Reset
            </Button>
          </Grid>
        </Grid>
      </Card>

      {/* 1. Placement Funnel Visualizer */}
      <Card elevation={0} sx={{ mb: 3.5, p: 2.5, bgcolor: '#ffffff', border: '1px solid #DCE6F5', borderRadius: '8px' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <LayersIcon sx={{ color: '#1765B5', fontSize: 20 }} />
          <Typography variant="subtitle1" fontWeight={700} color="#14264B">
            End-to-End Placement Pipeline Funnel
          </Typography>
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 2.5, display: 'block' }}>
          Pipeline stages computed strictly from real student attempt and result database records.
        </Typography>

        {loadingFunnel ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        ) : funnel ? (
          <Grid container spacing={1.5}>
            {funnel.stages.map((st, index) => {
              const colors = [
                '#1765B5',
                '#0284c7',
                '#15803D',
                '#059669',
                '#7182A0',
                '#8293B0',
              ];
              const color = colors[index % colors.length];

              return (
                <Grid item xs={12} sm={6} md={4} lg={2} key={st.stage}>
                  <Card
                    elevation={0}
                    sx={{
                      p: 1.75,
                      height: '100%',
                      bgcolor: st.isImplemented ? '#EDF2FF' : '#ffffff',
                      border: '1px solid',
                      borderColor: st.isImplemented ? '#D1DEF0' : '#E7EEFA',
                      borderTop: `3px solid ${color}`,
                      borderRadius: '6px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
                        <Typography variant="caption" fontWeight={700} color="#33466A">
                          {index + 1}. {st.stage}
                        </Typography>
                        {!st.isImplemented ? (
                          <Chip label="Future" size="small" sx={{ height: 16, fontSize: '0.62rem', bgcolor: '#E7EEFA', color: '#8293B0', borderRadius: '3px' }} />
                        ) : (
                          <Chip label="Active" size="small" sx={{ height: 16, fontSize: '0.62rem', bgcolor: '#E4EEFC', color: '#1765B5', borderRadius: '3px' }} />
                        )}
                      </Box>
                      <Typography variant="h5" fontWeight={700} sx={{ color, my: 0.5 }}>
                        {st.count}
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={Math.min(100, st.conversionRate)}
                        sx={{
                          height: 4,
                          borderRadius: '2px',
                          mb: 0.75,
                          bgcolor: '#DCE6F5',
                          '& .MuiLinearProgress-bar': { bgcolor: color },
                        }}
                      />
                      <Typography variant="caption" color="text.secondary" display="block">
                        <strong>{st.conversionRate}%</strong> of Registered
                      </Typography>
                      {index > 0 && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          <strong>{st.stageConversionRate}%</strong> step conversion
                        </Typography>
                      )}
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', fontSize: '0.68rem', lineHeight: 1.3 }}>
                      {st.description}
                    </Typography>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        ) : (
          <Alert severity="info">No funnel data available</Alert>
        )}
      </Card>

      {/* 2. Department Comparisons & Category Mastery */}
      <Grid container spacing={2.5} sx={{ mb: 3.5 }}>
        {/* Department Comparison Chart */}
        <Grid item xs={12} lg={6}>
          <Card elevation={0} sx={{ p: 2.5, height: '100%', bgcolor: '#ffffff', border: '1px solid #DCE6F5', borderRadius: '8px' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <SchoolIcon sx={{ color: '#1765B5', fontSize: 18 }} />
              <Typography variant="subtitle1" fontWeight={700} color="#14264B">
                Department Performance Comparison
              </Typography>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 2.5, display: 'block' }}>
              Comparative average score %, pass percentage %, and cohort participation rate %.
            </Typography>

            {loadingDept ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                <CircularProgress size={28} />
              </Box>
            ) : deptChartData.length > 0 ? (
              <Box sx={{ width: '100%', height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={deptChartData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E7EEFA" />
                    <XAxis dataKey="name" stroke="#7182A0" tick={{ fontSize: 12 }} />
                    <YAxis unit="%" domain={[0, 100]} stroke="#7182A0" tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#ffffff', borderColor: '#D1DEF0', borderRadius: 6, fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}
                      formatter={(val: any) => [`${val}%`]}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="avgScore" name="Avg Score %" fill="#1765B5" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="passRate" name="Pass Rate %" fill="#15803D" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="participation" name="Participation %" fill="#0284c7" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            ) : (
              <Alert severity="info">No departmental results recorded yet</Alert>
            )}
          </Card>
        </Grid>

        {/* Category Accuracy Chart */}
        <Grid item xs={12} lg={6}>
          <Card elevation={0} sx={{ p: 2.5, height: '100%', bgcolor: '#ffffff', border: '1px solid #DCE6F5', borderRadius: '8px' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <CategoryIcon sx={{ color: '#1765B5', fontSize: 18 }} />
              <Typography variant="subtitle1" fontWeight={700} color="#14264B">
                Assessment Component Accuracy
              </Typography>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 2.5, display: 'block' }}>
              Accuracy percentage across Aptitude, Reasoning, Verbal, Technical MCQ & Coding.
            </Typography>

            {loadingTopics ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                <CircularProgress size={28} />
              </Box>
            ) : categoryChartData.length > 0 ? (
              <Box sx={{ width: '100%', height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryChartData} layout="vertical" margin={{ top: 10, right: 30, left: 40, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E7EEFA" />
                    <XAxis type="number" unit="%" domain={[0, 100]} stroke="#7182A0" tick={{ fontSize: 12 }} />
                    <YAxis dataKey="category" type="category" width={110} stroke="#7182A0" tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#ffffff', borderColor: '#D1DEF0', borderRadius: 6, fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}
                      formatter={(val: any) => [`${val}%`]}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="accuracy" name="Accuracy %" fill="#b45309" radius={[0, 3, 3, 0]} />
                    <Bar dataKey="avgScore" name="Avg Score %" fill="#1765B5" radius={[0, 3, 3, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            ) : (
              <Alert severity="info">No component assessment data recorded yet</Alert>
            )}
          </Card>
        </Grid>
      </Grid>

      {/* 3. Topic Strengths and Weaknesses Matrix */}
      <Card elevation={0} sx={{ mb: 4, p: 2.5, bgcolor: '#ffffff', border: '1px solid #DCE6F5', borderRadius: '8px' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
          <Box>
            <Typography variant="subtitle1" fontWeight={700} color="#14264B">
              Topic Strengths & Weaknesses Matrix
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Authoritative granular accuracy breakdown per question topic.
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Chip label="Strong (≥75%)" size="small" sx={{ bgcolor: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', fontWeight: 600, fontSize: '0.7rem', borderRadius: '4px' }} />
            <Chip label="Average (50-74%)" size="small" sx={{ bgcolor: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', fontWeight: 600, fontSize: '0.7rem', borderRadius: '4px' }} />
            <Chip label="Weak (<50%)" size="small" sx={{ bgcolor: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', fontWeight: 600, fontSize: '0.7rem', borderRadius: '4px' }} />
          </Box>
        </Box>

        {topicAnalytics?.topics && topicAnalytics.topics.length > 0 ? (
          <TableContainer sx={{ border: '1px solid #DCE6F5', borderRadius: '6px' }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: '#EDF2FF' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, color: '#526584', fontSize: '0.78rem' }}>Topic Name</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#526584', fontSize: '0.78rem' }}>Component</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#526584', fontSize: '0.78rem' }}>Questions Answered</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#526584', fontSize: '0.78rem' }}>Correct</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#526584', fontSize: '0.78rem' }}>Accuracy</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#526584', fontSize: '0.78rem' }}>Average Score</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#526584', fontSize: '0.78rem' }}>Classification</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {topicAnalytics.topics.map((t) => (
                  <TableRow key={`${t.category}-${t.topic}`} hover sx={{ '&:hover': { bgcolor: '#EDF2FF' } }}>
                    <TableCell sx={{ fontWeight: 600, color: '#14264B', fontSize: '0.82rem' }}>{t.topic}</TableCell>
                    <TableCell sx={{ color: '#7182A0', fontSize: '0.8rem' }}>{t.category}</TableCell>
                    <TableCell sx={{ fontSize: '0.8rem' }}>{t.attemptedCount}</TableCell>
                    <TableCell sx={{ fontSize: '0.8rem' }}>{t.correctCount}</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#14264B', fontSize: '0.82rem' }}>{t.accuracy}%</TableCell>
                    <TableCell sx={{ fontSize: '0.8rem' }}>{t.averageScore}%</TableCell>
                    <TableCell>
                      <Chip
                        label={t.strength}
                        size="small"
                        sx={{
                          fontWeight: 700,
                          fontSize: '0.68rem',
                          borderRadius: '4px',
                          bgcolor: t.strength === 'STRONG' ? '#ecfdf5' : t.strength === 'AVERAGE' ? '#fef3c7' : '#fef2f2',
                          color: t.strength === 'STRONG' ? '#047857' : t.strength === 'AVERAGE' ? '#b45309' : '#b91c1c',
                          border: '1px solid',
                          borderColor: t.strength === 'STRONG' ? '#a7f3d0' : t.strength === 'AVERAGE' ? '#fde68a' : '#fecaca',
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Alert severity="info">
            Topic breakdown will appear here as students answer assessment questions.
          </Alert>
        )}
      </Card>
    </Box>
  );
};
