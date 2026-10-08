import React from 'react';
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
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import DescriptionIcon from '@mui/icons-material/Description';
import BarChartIcon from '@mui/icons-material/BarChart';
import AddIcon from '@mui/icons-material/Add';
import BusinessIcon from '@mui/icons-material/Business';
import QuizIcon from '@mui/icons-material/Quiz';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import SendIcon from '@mui/icons-material/Send';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import Snackbar from '@mui/material/Snackbar';
import { useAuth } from '../hooks/useAuth.js';
import { analyticsService } from '../services/analytics.service.js';
import { attendanceService } from '../services/attendance.service.js';

export const AdminDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const {
    data: overview,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['adminOverviewKPIs'],
    queryFn: () => analyticsService.getAdminOverview(),
    staleTime: 30000,
  });

  const { data: funnelData } = useQuery({
    queryKey: ['adminFunnelQuick'],
    queryFn: () => analyticsService.getPlacementFunnel(),
    staleTime: 60000,
  });

  const { data: activeAlerts = [], refetch: refetchAlerts } = useQuery({
    queryKey: ['adminAttendanceAlerts'],
    queryFn: () => attendanceService.getActiveAlerts(),
    staleTime: 15000,
  });

  const [toastMessage, setToastMessage] = React.useState<string>('');
  const [toastOpen, setToastOpen] = React.useState<boolean>(false);

  const handleExportAlertExcel = async (assessmentId: string, title: string) => {
    try {
      setToastMessage(`Downloading not-attended list for ${title}...`);
      setToastOpen(true);
      await attendanceService.exportNotAttendedExcel(assessmentId, title);
    } catch {
      setToastMessage('Failed to download Excel report.');
      setToastOpen(true);
    }
  };

  const handleSendAlertReminder = async (assessmentId: string, title: string) => {
    try {
      setToastMessage(`Dispatching reminders for ${title}...`);
      setToastOpen(true);
      const res = await attendanceService.sendReminders(assessmentId);
      setToastMessage(`Sent ${res.sentCount} follow-up reminder(s). (${res.skippedCount} previously notified skipped)`);
      setToastOpen(true);
      refetchAlerts();
    } catch {
      setToastMessage('Failed to send reminder emails.');
      setToastOpen(true);
    }
  };

  return (
    <Box>
      {/* Enterprise Executive Banner */}
      <Box
        sx={{
          mb: 3,
          p: { xs: 2.5, md: 3 },
          borderRadius: '8px',
          bgcolor: '#ffffff',
          border: '1px solid #DCE6F5',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', md: 'center' },
          flexDirection: { xs: 'column', md: 'row' },
          gap: 2,
        }}
      >
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <Typography variant="overline" sx={{ color: '#1765B5', fontWeight: 700, letterSpacing: '0.06em' }}>
              CAMPUS PLACEMENT SYSTEM
            </Typography>
            <Chip
              label={isSuperAdmin ? 'Super Administrator (Governance)' : 'Placement Administrator'}
              size="small"
              sx={{
                height: 22,
                fontSize: '0.72rem',
                fontWeight: 600,
                borderRadius: '4px',
                bgcolor: isSuperAdmin ? '#EDF2FF' : '#E4EEFC',
                color: '#1765B5',
                border: '1px solid #D1DEF0',
              }}
            />
          </Box>
          <Typography variant="h5" fontWeight={700} sx={{ color: '#14264B', mb: 0.5 }}>
            {isSuperAdmin ? 'Institutional Governance & Oversight Console' : 'Placement Operations Dashboard'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {isSuperAdmin
              ? 'Institutional oversight across candidate readiness, departmental benchmarks, placement funnel, and governance audits.'
              : 'Real-time candidate readiness tracking, drive examination scheduling, and recruiter mock assessment management.'}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.25, flexWrap: 'wrap' }}>
          {isSuperAdmin ? (
            <>
              <Button
                variant="contained"
                color="primary"
                startIcon={<BarChartIcon />}
                onClick={() => navigate('/admin/analytics')}
              >
                Analytics Hub
              </Button>
              <Button
                variant="outlined"
                startIcon={<DescriptionIcon />}
                onClick={() => navigate('/admin/reports')}
              >
                Executive Reports
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={() => navigate('/admin/assessments/create')}
              >
                Create Assessment
              </Button>
              <Button
                variant="outlined"
                startIcon={<BusinessIcon />}
                onClick={() => navigate('/admin/company-assessments')}
              >
                Recruiter Tracks
              </Button>
              <Button
                variant="outlined"
                startIcon={<HowToRegIcon />}
                onClick={() => navigate('/admin/attendance')}
              >
                Attendance Hub
              </Button>
              <Button
                variant="outlined"
                startIcon={<QuizIcon />}
                onClick={() => navigate('/admin/questions')}
              >
                Question Bank
              </Button>
            </>
          )}
        </Box>
      </Box>

      {/* Attention Required Section (Closed Assessments with Non-Attended Candidates) */}
      {activeAlerts.length > 0 && (
        <Card
          elevation={0}
          sx={{
            mb: 3,
            p: 2.5,
            bgcolor: '#ffffff',
            border: '1px solid #DCE6F5',
            borderLeft: '4px solid #1765B5',
            borderRadius: '8px',
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.25 }}>
                <WarningAmberIcon sx={{ color: '#b91c1c', fontSize: 20 }} />
                <Typography variant="overline" sx={{ color: '#b91c1c', fontWeight: 700, letterSpacing: '0.06em' }}>
                  ATTENTION REQUIRED
                </Typography>
                <Chip
                  label={`${activeAlerts.length} Assessments Closed with Absences`}
                  size="small"
                  sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700, bgcolor: '#fef2f2', color: '#b91c1c', borderRadius: '4px' }}
                />
              </Box>
              <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#14264B' }}>
                Concluded Placement Drives Requiring Attendance Follow-up
              </Typography>
            </Box>
            <Button
              size="small"
              variant="outlined"
              onClick={() => navigate('/admin/attendance')}
              sx={{ fontWeight: 600, fontSize: '0.8rem', color: '#1765B5', borderColor: '#D1DEF0' }}
            >
              Open Attendance Console
            </Button>
          </Box>

          <Grid container spacing={1.5}>
            {activeAlerts.map((alert) => (
              <Grid item xs={12} key={alert.id}>
                <Box
                  sx={{
                    p: 2,
                    bgcolor: '#EDF2FF',
                    border: '1px solid #DCE6F5',
                    borderRadius: '6px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: { xs: 'flex-start', sm: 'center' },
                    flexDirection: { xs: 'column', sm: 'row' },
                    gap: 1.5,
                  }}
                >
                  <Box>
                    <Typography variant="body2" fontWeight={700} sx={{ color: '#14264B' }}>
                      {alert.notAttendedCount} students did not attend the {alert.assessmentTitle}.
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#7182A0' }}>
                      Allocated Candidates: {alert.assignedCount} | Missed Without Attempt: {alert.notAttendedCount}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => navigate(`/admin/attendance?assessmentId=${alert.assessmentId}`)}
                      sx={{ fontSize: '0.78rem', py: 0.5, bgcolor: '#ffffff', color: '#1765B5', borderColor: '#D1DEF0' }}
                    >
                      View Students
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<FileDownloadIcon sx={{ fontSize: '15px !important' }} />}
                      onClick={() => handleExportAlertExcel(alert.assessmentId, alert.assessmentTitle)}
                      sx={{ fontSize: '0.78rem', py: 0.5, bgcolor: '#ffffff', color: '#1765B5', borderColor: '#D1DEF0' }}
                    >
                      Export Excel
                    </Button>
                    {!isSuperAdmin && (
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={<SendIcon sx={{ fontSize: '14px !important' }} />}
                        onClick={() => handleSendAlertReminder(alert.assessmentId, alert.assessmentTitle)}
                        sx={{ fontSize: '0.78rem', py: 0.5, bgcolor: '#1765B5', '&:hover': { bgcolor: '#104B91' } }}
                      >
                        Send Reminder
                      </Button>
                    )}
                  </Box>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Card>
      )}

      {isError && (
        <Alert
          severity="error"
          sx={{ mb: 3 }}
          action={
            <Button color="inherit" size="small" onClick={() => refetch()}>
              Retry
            </Button>
          }
        >
          {error instanceof Error ? error.message : 'Failed to load executive analytics summary'}
        </Alert>
      )}

      {/* Key Performance Indicators */}
      <Box sx={{ mb: 3.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="subtitle1" fontWeight={700} color="#14264B">
              Real-Time Placement Performance Metrics
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Authoritative indicators aggregated across all test attempts and departmental cohorts
            </Typography>
          </Box>
          <Button
            size="small"
            endIcon={<ArrowForwardIcon sx={{ fontSize: 16 }} />}
            onClick={() => navigate('/admin/analytics')}
            sx={{ fontWeight: 600, fontSize: '0.8rem' }}
          >
            Analytics Hub
          </Button>
        </Box>

        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 5, bgcolor: '#ffffff', borderRadius: '8px', border: '1px solid #DCE6F5' }}>
            <CircularProgress size={28} />
          </Box>
        ) : (
          <Grid container spacing={2}>
            {/* Card 1: Registered Candidates */}
            <Grid item xs={12} sm={6} md={3}>
              <Card
                elevation={0}
                sx={{
                  p: 2.25,
                  bgcolor: '#ffffff',
                  border: '1px solid #DCE6F5',
                  borderRadius: '8px',
                }}
              >
                <Typography variant="caption" sx={{ color: '#7182A0', fontWeight: 600, letterSpacing: '0.04em' }}>
                  REGISTERED CANDIDATES
                </Typography>
                <Typography variant="h5" fontWeight={700} sx={{ color: '#14264B', my: 0.5 }}>
                  {overview?.totalStudents || 0}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <Chip
                    label={`${overview?.activeStudents || 0} Active`}
                    size="small"
                    sx={{ height: 20, fontSize: '0.7rem', bgcolor: '#E7EEFA', color: '#405678', fontWeight: 600, borderRadius: '4px' }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    across all departments
                  </Typography>
                </Box>
              </Card>
            </Grid>

            {/* Card 2: Attendance Rate (Cleaned of duplicate text) */}
            <Grid item xs={12} sm={6} md={3}>
              <Card
                elevation={0}
                sx={{
                  p: 2.25,
                  bgcolor: '#ffffff',
                  border: '1px solid #DCE6F5',
                  borderRadius: '8px',
                }}
              >
                <Typography variant="caption" sx={{ color: '#7182A0', fontWeight: 600, letterSpacing: '0.04em' }}>
                  ASSESSMENT ATTENDANCE
                </Typography>
                <Typography variant="h5" fontWeight={700} sx={{ color: '#1765B5', my: 0.5 }}>
                  {overview?.activeStudents || 0} <Typography component="span" variant="body2" sx={{ color: '#7182A0' }}>/ {overview?.totalStudents || 0}</Typography>
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Appeared for at least 1 placement evaluation
                </Typography>
              </Card>
            </Grid>

            {/* Card 3: Assessment Outcomes */}
            <Grid item xs={12} sm={6} md={3}>
              <Card
                elevation={0}
                sx={{
                  p: 2.25,
                  bgcolor: '#ffffff',
                  border: '1px solid #DCE6F5',
                  borderRadius: '8px',
                }}
              >
                <Typography variant="caption" sx={{ color: '#7182A0', fontWeight: 600, letterSpacing: '0.04em' }}>
                  QUALIFICATION OUTCOMES
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', my: 0.5 }}>
                  <Box>
                    <Typography variant="caption" sx={{ color: '#047857', fontWeight: 700 }}>
                      Passed:
                    </Typography>
                    <Typography variant="h6" fontWeight={700} sx={{ color: '#047857' }}>
                      {overview?.passedCount ?? 0}
                    </Typography>
                  </Box>
                  <Box sx={{ height: 32, width: '1px', bgcolor: '#DCE6F5' }} />
                  <Box>
                    <Typography variant="caption" sx={{ color: '#b91c1c', fontWeight: 700 }}>
                      Needs Prep:
                    </Typography>
                    <Typography variant="h6" fontWeight={700} sx={{ color: '#b91c1c' }}>
                      {overview?.failedCount ?? 0}
                    </Typography>
                  </Box>
                </Box>
                <Typography variant="caption" color="text.secondary">
                  {((overview?.passedCount ?? 0) + (overview?.failedCount ?? 0))} evaluated submissions
                </Typography>
              </Card>
            </Grid>

            {/* Card 4: Pass Percentage */}
            <Grid item xs={12} sm={6} md={3}>
              <Card
                elevation={0}
                sx={{
                  p: 2.25,
                  bgcolor: '#ffffff',
                  border: '1px solid #DCE6F5',
                  borderRadius: '8px',
                }}
              >
                <Typography variant="caption" sx={{ color: '#7182A0', fontWeight: 600, letterSpacing: '0.04em' }}>
                  OVERALL PASS RATE
                </Typography>
                <Typography variant="h5" fontWeight={700} sx={{ color: '#b45309', my: 0.5 }}>
                  {overview?.passPercentage || 0}%
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(100, overview?.passPercentage || 0)}
                  sx={{ height: 5, borderRadius: '3px', my: 0.75, bgcolor: '#E7EEFA', '& .MuiLinearProgress-bar': { bgcolor: '#b45309' } }}
                />
                <Typography variant="caption" color="text.secondary">
                  Candidates meeting cut-off criteria
                </Typography>
              </Card>
            </Grid>
          </Grid>
        )}
      </Box>

      {/* Placement Pipeline Funnel */}
      {funnelData && (
        <Card
          elevation={0}
          sx={{
            mb: 3.5,
            p: 2.5,
            bgcolor: '#ffffff',
            border: '1px solid #DCE6F5',
            borderRadius: '8px',
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
            <Box>
              <Typography variant="subtitle1" fontWeight={700} color="#14264B">
                Placement Pipeline Progression Funnel
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Candidate conversion flow from portal registration through assessment qualification
              </Typography>
            </Box>
            <Button
              size="small"
              endIcon={<ArrowForwardIcon sx={{ fontSize: 16 }} />}
              onClick={() => navigate('/admin/analytics')}
              sx={{ fontWeight: 600, fontSize: '0.8rem' }}
            >
              Detailed Pipeline
            </Button>
          </Box>

          <Grid container spacing={1.5}>
            {funnelData.stages.map((st) => (
              <Grid item xs={6} sm={4} md={2} key={st.stage}>
                <Box
                  sx={{
                    p: 1.75,
                    borderRadius: '6px',
                    bgcolor: st.isImplemented ? '#EDF2FF' : '#ffffff',
                    border: '1px solid',
                    borderColor: st.isImplemented ? '#D1DEF0' : '#E7EEFA',
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
                    <Typography variant="caption" fontWeight={700} color="#405678">
                      {st.stage}
                    </Typography>
                    {!st.isImplemented && (
                      <Chip label="Upcoming" size="small" sx={{ fontSize: '0.62rem', height: 16, bgcolor: '#E7EEFA', color: '#8293B0', borderRadius: '3px' }} />
                    )}
                  </Box>
                  <Typography variant="h6" fontWeight={700} color="#14264B" sx={{ my: 0.25 }}>
                    {st.count}
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(100, st.conversionRate)}
                    sx={{ height: 4, borderRadius: '2px', mb: 0.5, bgcolor: '#DCE6F5' }}
                  />
                  <Typography variant="caption" color="text.secondary" fontWeight={500}>
                    {st.conversionRate}% of cohort
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Card>
      )}

      {/* Live Results Feed Table */}
      <Card
        elevation={0}
        sx={{
          mb: 4,
          bgcolor: '#ffffff',
          border: '1px solid #DCE6F5',
          borderRadius: '8px',
          overflow: 'hidden',
        }}
      >
        <Box sx={{ p: 2, borderBottom: '1px solid #DCE6F5', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
          <Box>
            <Typography variant="subtitle1" fontWeight={700} color="#14264B">
              Recent Assessment Submissions
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Latest student completions with scoring accuracy and qualification verdicts
            </Typography>
          </Box>
          <Button
            size="small"
            variant="outlined"
            endIcon={<ArrowForwardIcon sx={{ fontSize: 16 }} />}
            onClick={() => navigate('/admin/results')}
            sx={{ fontWeight: 600, fontSize: '0.8rem' }}
          >
            All Results ({overview?.totalAttempts || 0})
          </Button>
        </Box>

        {overview?.recentResults && overview.recentResults.length > 0 ? (
          <TableContainer>
            <Table size="small">
              <TableHead sx={{ bgcolor: '#EDF2FF' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, color: '#526584', fontSize: '0.78rem', py: 1.25 }}>Candidate</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#526584', fontSize: '0.78rem', py: 1.25 }}>Register No.</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#526584', fontSize: '0.78rem', py: 1.25 }}>Assessment</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#526584', fontSize: '0.78rem', py: 1.25 }}>Department</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#526584', fontSize: '0.78rem', py: 1.25 }}>Score</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#526584', fontSize: '0.78rem', py: 1.25 }}>Accuracy</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#526584', fontSize: '0.78rem', py: 1.25 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#526584', fontSize: '0.78rem', py: 1.25 }} align="right">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {overview.recentResults.map((item) => (
                  <TableRow key={item.id} hover sx={{ '&:hover': { bgcolor: '#EDF2FF' } }}>
                    <TableCell sx={{ fontWeight: 600, color: '#14264B', fontSize: '0.82rem' }}>{item.studentName}</TableCell>
                    <TableCell sx={{ color: '#7182A0', fontSize: '0.8rem' }}>{item.registerNumber}</TableCell>
                    <TableCell sx={{ color: '#33466A', fontSize: '0.82rem' }}>{item.assessmentTitle}</TableCell>
                    <TableCell sx={{ color: '#7182A0', fontSize: '0.8rem' }}>{item.departmentCode || item.departmentName || '—'}</TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={700} color="#14264B" sx={{ fontSize: '0.82rem' }}>
                        {item.percentage}%
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {item.obtainedMarks}/{item.totalMarks} marks
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ color: '#405678', fontWeight: 600, fontSize: '0.82rem' }}>{item.accuracy}%</TableCell>
                    <TableCell>
                      <Chip
                        icon={item.isPassed ? <CheckCircleOutlineIcon sx={{ '&&': { fontSize: 14 } }} /> : <CancelOutlinedIcon sx={{ '&&': { fontSize: 14 } }} />}
                        label={item.isPassed ? 'PASS' : 'FAIL'}
                        size="small"
                        sx={{
                          fontWeight: 700,
                          fontSize: '0.7rem',
                          borderRadius: '4px',
                          bgcolor: item.isPassed ? '#ecfdf5' : '#fef2f2',
                          color: item.isPassed ? '#047857' : '#b91c1c',
                          border: '1px solid',
                          borderColor: item.isPassed ? '#a7f3d0' : '#fecaca',
                        }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        variant="text"
                        onClick={() => navigate(`/admin/students/${item.studentId}/performance`)}
                        sx={{ fontWeight: 600, fontSize: '0.78rem' }}
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
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              No recent assessment results submitted yet. Results will appear here as students complete their assessments.
            </Typography>
          </Box>
        )}
      </Card>

      <Snackbar
        open={toastOpen}
        autoHideDuration={4000}
        onClose={() => setToastOpen(false)}
        message={toastMessage}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      />
    </Box>
  );
};

