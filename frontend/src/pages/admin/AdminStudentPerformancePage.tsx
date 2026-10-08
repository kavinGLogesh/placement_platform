import React, { useState } from 'react';
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
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SchoolIcon from '@mui/icons-material/School';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import CodeIcon from '@mui/icons-material/Code';
import CategoryIcon from '@mui/icons-material/Category';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DownloadIcon from '@mui/icons-material/Download';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import HorizontalRuleIcon from '@mui/icons-material/HorizontalRule';
import TimelineIcon from '@mui/icons-material/Timeline';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
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
import { AdminNavTabs } from '../../components/management/AdminNavTabs.js';
import { analyticsService } from '../../services/analytics.service.js';
import { managementService } from '../../services/management.service.js';

export const AdminStudentPerformancePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Resume Action State
  const [downloadingResume, setDownloadingResume] = useState(false);
  const [viewingResume, setViewingResume] = useState(false);
  const [resumeActionError, setResumeActionError] = useState<string | null>(null);

  const {
    data: drilldown,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['studentDrilldown', id],
    queryFn: () => analyticsService.getStudentDrilldown(id || ''),
    enabled: !!id,
  });

  const handleViewResume = async () => {
    if (!id) return;
    try {
      setViewingResume(true);
      setResumeActionError(null);
      const blob = await managementService.downloadStudentResume(id, true);
      const fileUrl = window.URL.createObjectURL(blob);
      window.open(fileUrl, '_blank');
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err && (err as any).response?.data?.message
          ? (err as any).response.data.message
          : 'Unable to open verified resume';
      setResumeActionError(msg);
    } finally {
      setViewingResume(false);
    }
  };

  const handleDownloadResume = async () => {
    if (!id) return;
    try {
      setDownloadingResume(true);
      setResumeActionError(null);
      const blob = await managementService.downloadStudentResume(id, false);
      const fileUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download =
        drilldown?.resume?.fileName ||
        `${drilldown?.student?.registerNumber || 'Student'}_Resume.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(fileUrl);
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err && (err as any).response?.data?.message
          ? (err as any).response.data.message
          : 'Unable to download verified resume';
      setResumeActionError(msg);
    } finally {
      setDownloadingResume(false);
    }
  };

  if (isLoading) {
    return (
      <Box>
        <AdminNavTabs />
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress />
        </Box>
      </Box>
    );
  }

  if (isError || !drilldown) {
    return (
      <Box>
        <AdminNavTabs />
        <Alert
          severity="error"
          sx={{ my: 4 }}
          action={
            <Button color="inherit" size="small" onClick={() => refetch()}>
              Retry
            </Button>
          }
        >
          {error instanceof Error ? error.message : 'Student performance records not found'}
        </Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/admin/results')}>
          Back to Results
        </Button>
      </Box>
    );
  }

  const { student, summary, assessmentHistory, categoryPerformance, codingPerformance, performanceProgress, resume } = drilldown;

  const categoryChartData = categoryPerformance.map((c) => ({
    name: c.displayName,
    accuracy: c.accuracy,
    avgScore: c.averageScore,
  }));

  return (
    <Box>
      <AdminNavTabs />

      {/* Navigation and Title */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/admin/results')}
          >
            Back to Results
          </Button>
          <Button
            variant="outlined"
            onClick={() => navigate(`/admin/students/${student.id}`)}
          >
            View Student Profile
          </Button>
        </Box>

        {/* Profile Card Banner */}
        <Card sx={{ p: 3, bgcolor: 'background.paper', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <SchoolIcon sx={{ fontSize: 48, color: 'primary.light' }} />
              <div>
                <Typography variant="h4" fontWeight={800} letterSpacing="-0.02em">
                  {student.name}
                </Typography>
                <Typography variant="subtitle1" color="text.secondary">
                  Reg No: <strong>{student.registerNumber}</strong> • {student.email}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {student.departmentName} ({student.departmentCode}) • {student.courseName} • Class {student.className} • Section {student.sectionName}
                </Typography>
              </div>
            </Box>

            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Chip label={`Batch: ${student.batchYear}`} variant="outlined" />
              {student.cgpa > 0 && <Chip label={`CGPA: ${student.cgpa}`} color="primary" />}
              <Chip label={student.status} color="success" sx={{ fontWeight: 700 }} />
            </Box>
          </Box>
        </Card>
      </Box>

      {/* Verified Placement Resume Section */}
      <Card sx={{ mb: 3, p: 3, bgcolor: 'background.paper', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
          <PictureAsPdfIcon sx={{ color: '#ef4444', fontSize: 26 }} />
          <Typography variant="h6" fontWeight={700}>
            Verified Placement Resume
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
          Official candidate resume uploaded to the placement portal for campus recruitment.
        </Typography>

        {resumeActionError && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setResumeActionError(null)}>
            {resumeActionError}
          </Alert>
        )}

        {resume?.exists ? (
          <Box
            sx={{
              p: 2.5,
              borderRadius: 2,
              bgcolor: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <PictureAsPdfIcon sx={{ color: '#ef4444', fontSize: 32 }} />
              <div>
                <Typography variant="subtitle1" fontWeight={700}>
                  {resume.fileName || `${student.registerNumber}_Resume.pdf`}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {resume.uploadedAt
                    ? `Uploaded: ${new Date(resume.uploadedAt).toLocaleDateString()}`
                    : 'Uploaded'}{' '}
                  • {resume.fileSize || 'PDF Document'}
                </Typography>
              </div>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              <Chip
                icon={<CheckCircleIcon />}
                label={resume.status || 'Verified'}
                size="small"
                color={resume.status === 'VERIFIED' ? 'success' : 'warning'}
                sx={{ fontWeight: 700 }}
              />
              <Button
                variant="outlined"
                color="primary"
                size="small"
                startIcon={viewingResume ? <CircularProgress size={16} /> : <VisibilityIcon />}
                onClick={handleViewResume}
                disabled={viewingResume}
              >
                View Resume
              </Button>
              <Button
                variant="contained"
                color="primary"
                size="small"
                startIcon={downloadingResume ? <CircularProgress size={16} color="inherit" /> : <DownloadIcon />}
                onClick={handleDownloadResume}
                disabled={downloadingResume}
              >
                Download Resume
              </Button>
            </Box>
          </Box>
        ) : (
          <Alert severity="info" variant="outlined">
            No verified placement resume uploaded.
          </Alert>
        )}
      </Card>

      {/* Student Performance Progress Section */}
      <Card sx={{ mb: 3, p: 3, bgcolor: 'background.paper', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <TimelineIcon color="primary" sx={{ fontSize: 26 }} />
            <Typography variant="h6" fontWeight={700}>
              Student Performance Progress
            </Typography>
          </Box>
          {performanceProgress?.canCompare && (
            <Chip
              label={`Performance Status: ${performanceProgress.status}`}
              color={
                performanceProgress.status === 'Improved'
                  ? 'success'
                  : performanceProgress.status === 'Decreased'
                  ? 'error'
                  : 'default'
              }
              sx={{ fontWeight: 700 }}
            />
          )}
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
          Chronological assessment score trajectory comparing latest completed assessment against immediately previous test.
        </Typography>

        {!performanceProgress || !performanceProgress.hasCompletedAssessments ? (
          <Alert severity="info" variant="outlined">
            No completed assessment data available.
          </Alert>
        ) : !performanceProgress.canCompare ? (
          <Box>
            <Alert severity="info" variant="outlined" sx={{ mb: 2 }}>
              {performanceProgress.statusMessage || 'Previous assessment comparison is not available.'}
            </Alert>
            {performanceProgress.currentTest && (
              <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.06)', maxWidth: 400 }}>
                <Typography variant="caption" color="text.secondary">Latest Assessment</Typography>
                <Typography variant="subtitle1" fontWeight={700}>{performanceProgress.currentTest.assessmentTitle}</Typography>
                <Typography variant="h5" fontWeight={800} color="primary.light">
                  {performanceProgress.currentTest.score} / {performanceProgress.currentTest.totalMarks} ({performanceProgress.currentTest.percentage}%)
                </Typography>
              </Box>
            )}
          </Box>
        ) : (
          <Box>
            <Grid container spacing={3} sx={{ mb: 2.5 }}>
              {/* Previous Test */}
              <Grid item xs={12} md={5}>
                <Box sx={{ p: 2.5, borderRadius: 2, bgcolor: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700}>Previous Assessment</Typography>
                  <Typography variant="h6" fontWeight={700}>{performanceProgress.previousTest?.assessmentTitle}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                    {performanceProgress.previousTest?.date ? new Date(performanceProgress.previousTest.date).toLocaleDateString() : '—'}
                  </Typography>
                  <Typography variant="h4" fontWeight={800}>
                    {performanceProgress.previousTest?.score} / {performanceProgress.previousTest?.totalMarks}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Percentage: {performanceProgress.previousTest?.percentage}%
                  </Typography>
                </Box>
              </Grid>

              {/* Progress Indicator */}
              <Grid item xs={12} md={2} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <Box
                  sx={{
                    width: 52,
                    height: 52,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor:
                      performanceProgress.status === 'Improved'
                        ? 'rgba(16, 185, 129, 0.12)'
                        : performanceProgress.status === 'Decreased'
                        ? 'rgba(239, 68, 68, 0.12)'
                        : 'rgba(100, 116, 139, 0.12)',
                    mb: 1,
                  }}
                >
                  {performanceProgress.status === 'Improved' ? (
                    <TrendingUpIcon sx={{ color: '#10b981', fontSize: 30 }} />
                  ) : performanceProgress.status === 'Decreased' ? (
                    <TrendingDownIcon sx={{ color: '#ef4444', fontSize: 30 }} />
                  ) : (
                    <HorizontalRuleIcon sx={{ color: '#7182A0', fontSize: 30 }} />
                  )}
                </Box>
                <Typography
                  variant="subtitle1"
                  fontWeight={800}
                  sx={{
                    color:
                      performanceProgress.status === 'Improved'
                        ? '#10b981'
                        : performanceProgress.status === 'Decreased'
                        ? '#ef4444'
                        : '#8293B0',
                    textAlign: 'center',
                  }}
                >
                  {performanceProgress.status === 'Improved'
                    ? `↑ Improved by ${performanceProgress.percentageChange ? Math.abs(performanceProgress.percentageChange).toFixed(2) + '%' : performanceProgress.percentageChangeDisplay}`
                    : performanceProgress.status === 'Decreased'
                    ? `↓ Decreased by ${performanceProgress.percentageChange ? Math.abs(performanceProgress.percentageChange).toFixed(2) + '%' : performanceProgress.percentageChangeDisplay}`
                    : performanceProgress.percentageChangeDisplay}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
                  Score Change: {performanceProgress.scoreChange !== undefined && performanceProgress.scoreChange > 0 ? `+${performanceProgress.scoreChange}` : performanceProgress.scoreChange} marks
                </Typography>
              </Grid>

              {/* Current Test */}
              <Grid item xs={12} md={5}>
                <Box sx={{ p: 2.5, borderRadius: 2, bgcolor: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                  <Typography variant="caption" color="#34d399" fontWeight={700}>Current Assessment (Latest)</Typography>
                  <Typography variant="h6" fontWeight={700} color="#34d399">{performanceProgress.currentTest?.assessmentTitle}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                    {performanceProgress.currentTest?.date ? new Date(performanceProgress.currentTest.date).toLocaleDateString() : '—'}
                  </Typography>
                  <Typography variant="h4" fontWeight={800} color="#34d399">
                    {performanceProgress.currentTest?.score} / {performanceProgress.currentTest?.totalMarks}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Percentage: {performanceProgress.currentTest?.percentage}%
                  </Typography>
                </Box>
              </Grid>
            </Grid>

            {/* Category Breakdown Comparison Table */}
            {performanceProgress.categoryComparison && performanceProgress.categoryComparison.length > 0 && (
              <Box sx={{ mt: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                  <CompareArrowsIcon color="primary" fontSize="small" />
                  <Typography variant="subtitle2" fontWeight={700}>Performance Comparison by Category</Typography>
                </Box>
                <TableContainer component={Paper} sx={{ bgcolor: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: 'rgba(255, 255, 255, 0.04)' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>Category</TableCell>
                        <TableCell sx={{ fontWeight: 700 }} align="right">Previous Score</TableCell>
                        <TableCell sx={{ fontWeight: 700 }} align="right">Current Score</TableCell>
                        <TableCell sx={{ fontWeight: 700 }} align="right">Change</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {performanceProgress.categoryComparison.map((cat) => (
                        <TableRow key={cat.category} hover>
                          <TableCell sx={{ fontWeight: 600 }}>{cat.displayName}</TableCell>
                          <TableCell align="right">{cat.previousScore}</TableCell>
                          <TableCell align="right">{cat.currentScore}</TableCell>
                          <TableCell align="right">
                            <Chip
                              label={cat.change > 0 ? `+${cat.change}` : `${cat.change}`}
                              size="small"
                              color={cat.change > 0 ? 'success' : cat.change < 0 ? 'error' : 'default'}
                              sx={{ fontWeight: 700 }}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}
          </Box>
        )}
      </Card>

      {/* Summary KPI Cards */}
      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <Card sx={{ bgcolor: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
            <CardContent>
              <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">
                Assigned Tests
              </Typography>
              <Typography variant="h4" fontWeight={800} color="#818cf8" sx={{ my: 0.5 }}>
                {summary.totalAssigned}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Allocated assessments
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4} lg={2}>
          <Card sx={{ bgcolor: 'rgba(14, 165, 233, 0.08)', border: '1px solid rgba(14, 165, 233, 0.2)' }}>
            <CardContent>
              <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">
                Completed
              </Typography>
              <Typography variant="h4" fontWeight={800} color="#38bdf8" sx={{ my: 0.5 }}>
                {summary.totalCompleted}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Submitted attempts
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4} lg={2}>
          <Card sx={{ bgcolor: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
            <CardContent>
              <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">
                Average Score
              </Typography>
              <Typography variant="h4" fontWeight={800} color="#34d399" sx={{ my: 0.5 }}>
                {summary.averageScore}%
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Overall percentage
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4} lg={2}>
          <Card sx={{ bgcolor: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
            <CardContent>
              <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">
                Accuracy
              </Typography>
              <Typography variant="h4" fontWeight={800} color="#fbbf24" sx={{ my: 0.5 }}>
                {summary.averageAccuracy}%
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Correct / Attempted
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4} lg={2}>
          <Card sx={{ bgcolor: 'rgba(168, 85, 247, 0.08)', border: '1px solid rgba(168, 85, 247, 0.2)' }}>
            <CardContent>
              <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">
                Passed Tests
              </Typography>
              <Typography variant="h4" fontWeight={800} color="#c084fc" sx={{ my: 0.5 }}>
                {summary.totalPassed}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Met cutoff criteria
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4} lg={2}>
          <Card sx={{ bgcolor: 'rgba(236, 72, 153, 0.08)', border: '1px solid rgba(236, 72, 153, 0.2)' }}>
            <CardContent>
              <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">
                Pass Rate
              </Typography>
              <Typography variant="h4" fontWeight={800} color="#f472b6" sx={{ my: 0.5 }}>
                {summary.passRate}%
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Passed / Completed
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Category Breakdown & Coding Performance */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Category Accuracy */}
        <Grid item xs={12} md={7}>
          <Card sx={{ p: 3, height: '100%', bgcolor: 'background.paper', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <CategoryIcon color="primary" />
              <Typography variant="h6" fontWeight={700}>
                Candidate Component Breakdown
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Accuracy & average scores across test components for this candidate.
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
                    <Bar dataKey="accuracy" name="Accuracy %" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="avgScore" name="Avg Score %" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            ) : (
              <Alert severity="info">No component assessment data recorded yet.</Alert>
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
                  <TableCell sx={{ fontWeight: 700 }}>Marks Awarded</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Percentage</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Accuracy</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Correct</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Incorrect</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Unanswered</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Pass / Fail</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Completed At</TableCell>
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
                    <TableCell color="text.secondary">{r.unansweredCount}</TableCell>
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
          <Alert severity="info">
            Candidate has not completed any assessments yet.
          </Alert>
        )}
      </Card>
    </Box>
  );
};
