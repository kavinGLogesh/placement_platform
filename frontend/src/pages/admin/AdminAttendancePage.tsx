import React, { useState } from 'react';
import {
  Box,
  Typography,
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
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  IconButton,
  Tooltip,
} from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import SendIcon from '@mui/icons-material/Send';
import SettingsIcon from '@mui/icons-material/Settings';
import SyncIcon from '@mui/icons-material/Sync';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import HistoryIcon from '@mui/icons-material/History';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import { attendanceService } from '../../services/attendance.service.js';
import { assessmentService } from '../../services/assessment.service.js';
import { useAuth } from '../../hooks/useAuth.js';
import { StudentAttendanceStatus } from '../../types/attendance.types.js';

export const AdminAttendancePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  // URL state
  const selectedAssessmentId = searchParams.get('assessmentId') || '';
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('');

  // Dialog states
  const [isReminderDialogOpen, setIsReminderDialogOpen] = useState<boolean>(false);
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState<boolean>(false);
  const [isRepeatedInsightsOpen, setIsRepeatedInsightsOpen] = useState<boolean>(false);
  const [customReminderMessage, setCustomReminderMessage] = useState<string>('');
  const [notificationSnackbar, setNotificationSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'info' | 'warning' | 'error';
  }>({ open: false, message: '', severity: 'info' });

  // 1. Fetch all assessments for dropdown
  const { data: allAssessments = [], isLoading: isLoadingAssessments } = useQuery({
    queryKey: ['attendanceAssessmentsList'],
    queryFn: async () => {
      const res = await assessmentService.getAssessments({ limit: 100 });
      return res.data || [];
    },
  });

  // Effective assessment ID (defaults to first available or URL param)
  const effectiveAssessmentId =
    selectedAssessmentId || (allAssessments.length > 0 ? allAssessments[0].id : '');

  // 2. Fetch Attendance Overview for selected assessment
  const {
    data: overview,
    isLoading: isLoadingOverview,
    isError: isOverviewError,
    refetch: refetchOverview,
  } = useQuery({
    queryKey: ['assessmentAttendanceOverview', effectiveAssessmentId],
    queryFn: () => attendanceService.getAssessmentOverview(effectiveAssessmentId),
    enabled: Boolean(effectiveAssessmentId),
  });

  // 3. Fetch Attendance Records for students
  const {
    data: recordsData,
    isLoading: isLoadingRecords,
    refetch: refetchRecords,
  } = useQuery({
    queryKey: [
      'assessmentAttendanceRecords',
      effectiveAssessmentId,
      statusFilter,
      departmentFilter,
      searchTerm,
    ],
    queryFn: () =>
      attendanceService.getAttendanceRecords({
        assessmentId: effectiveAssessmentId,
        status: statusFilter,
        departmentId: departmentFilter || undefined,
        search: searchTerm || undefined,
        limit: 100,
      }),
    enabled: Boolean(effectiveAssessmentId),
  });

  // 4. Fetch Active Alerts
  const { data: activeAlerts = [], refetch: refetchAlerts } = useQuery({
    queryKey: ['attendanceActiveAlerts'],
    queryFn: () => attendanceService.getActiveAlerts(),
  });

  // 5. Fetch Repeated Non-Attendance Insights
  const { data: repeatedInsights = [], isLoading: isLoadingRepeated } = useQuery({
    queryKey: ['repeatedNonAttendanceInsights'],
    queryFn: () => attendanceService.getRepeatedNonAttendance(),
    enabled: isRepeatedInsightsOpen,
  });

  // 6. Fetch Automation Config
  const { data: configData, refetch: refetchConfig } = useQuery({
    queryKey: ['attendanceConfig', effectiveAssessmentId],
    queryFn: () => attendanceService.getConfig(effectiveAssessmentId),
    enabled: Boolean(effectiveAssessmentId) && isConfigDialogOpen,
  });

  // Mutations
  const sendRemindersMutation = useMutation({
    mutationFn: (message?: string) =>
      attendanceService.sendReminders(effectiveAssessmentId, {
        customMessage: message,
      }),
    onSuccess: (result) => {
      setNotificationSnackbar({
        open: true,
        message: `Reminders sent to ${result.sentCount} candidate(s). (${result.skippedCount} previously notified skipped)`,
        severity: 'success',
      });
      setIsReminderDialogOpen(false);
      setCustomReminderMessage('');
      queryClient.invalidateQueries({ queryKey: ['assessmentAttendanceRecords'] });
      queryClient.invalidateQueries({ queryKey: ['attendanceActiveAlerts'] });
    },
    onError: (err: any) => {
      setNotificationSnackbar({
        open: true,
        message: err.response?.data?.message || 'Failed to dispatch reminder emails',
        severity: 'error',
      });
    },
  });

  const syncAssessmentsMutation = useMutation({
    mutationFn: () => attendanceService.syncAssessments(),
    onSuccess: (result) => {
      setNotificationSnackbar({
        open: true,
        message: `Closure sweep completed. ${result.newAlertsCount} new attendance alert(s) generated.`,
        severity: 'success',
      });
      refetchOverview();
      refetchRecords();
      refetchAlerts();
    },
  });

  const resolveAlertMutation = useMutation({
    mutationFn: (alertId: string) => attendanceService.resolveAlert(alertId),
    onSuccess: () => {
      refetchAlerts();
    },
  });

  const updateConfigMutation = useMutation({
    mutationFn: (newConfig: any) =>
      attendanceService.updateConfig(effectiveAssessmentId, newConfig),
    onSuccess: () => {
      setNotificationSnackbar({
        open: true,
        message: 'Attendance automation configuration updated successfully',
        severity: 'success',
      });
      setIsConfigDialogOpen(false);
      refetchConfig();
    },
  });

  const handleAssessmentChange = (id: string) => {
    setSearchParams({ assessmentId: id });
  };

  const handleExportExcel = async () => {
    try {
      setNotificationSnackbar({
        open: true,
        message: 'Generating Excel report for not-attended candidates...',
        severity: 'info',
      });
      await attendanceService.exportNotAttendedExcel(
        effectiveAssessmentId,
        overview?.assessmentName
      );
      setNotificationSnackbar({
        open: true,
        message: 'Excel report downloaded successfully',
        severity: 'success',
      });
    } catch (err: any) {
      setNotificationSnackbar({
        open: true,
        message: err.response?.data?.message || 'Failed to export Excel report',
        severity: 'error',
      });
    }
  };

  const getStatusChip = (status: StudentAttendanceStatus) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <Chip
            label="COMPLETED"
            size="small"
            sx={{
              height: 22,
              fontSize: '0.72rem',
              fontWeight: 700,
              bgcolor: '#dcfce7',
              color: '#15803d',
              border: '1px solid #bbf7d0',
              borderRadius: '4px',
            }}
          />
        );
      case 'ATTENDED':
        return (
          <Chip
            label="ATTENDED"
            size="small"
            sx={{
              height: 22,
              fontSize: '0.72rem',
              fontWeight: 700,
              bgcolor: '#fef3c7',
              color: '#b45309',
              border: '1px solid #fde68a',
              borderRadius: '4px',
            }}
          />
        );
      case 'NOT_ATTENDED':
        return (
          <Chip
            label="NOT ATTENDED"
            size="small"
            sx={{
              height: 22,
              fontSize: '0.72rem',
              fontWeight: 700,
              bgcolor: '#fee2e2',
              color: '#b91c1c',
              border: '1px solid #fecaca',
              borderRadius: '4px',
            }}
          />
        );
      case 'NOT_STARTED':
      default:
        return (
          <Chip
            label="NOT STARTED (ACTIVE)"
            size="small"
            sx={{
              height: 22,
              fontSize: '0.72rem',
              fontWeight: 600,
              bgcolor: '#E7EEFA',
              color: '#526584',
              border: '1px solid #DCE6F5',
              borderRadius: '4px',
            }}
          />
        );
    }
  };

  return (
    <Box sx={{ pb: 6 }}>
      {/* 1. Header Banner */}
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
            <Button
              size="small"
              startIcon={<ArrowBackIcon sx={{ fontSize: 16 }} />}
              onClick={() => navigate('/admin/dashboard')}
              sx={{ color: '#7182A0', fontWeight: 600, minWidth: 'auto', p: 0, mr: 1 }}
            >
              Dashboard
            </Button>
            <Typography variant="caption" sx={{ color: '#8293B0' }}>/</Typography>
            <Typography variant="overline" sx={{ color: '#1765B5', fontWeight: 700, letterSpacing: '0.06em' }}>
              CAMPUS RECRUITMENT & ATTENDANCE
            </Typography>
          </Box>
          <Typography variant="h5" fontWeight={700} sx={{ color: '#14264B', mb: 0.5 }}>
            Placement Assessment Attendance & Follow-up
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Authoritative tracking of candidate participation, non-attendance detection upon window closure, and automated reminder delivery.
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.25, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<HistoryIcon />}
            onClick={() => setIsRepeatedInsightsOpen(true)}
            sx={{ fontWeight: 600, borderColor: '#D1DEF0', color: '#14264B' }}
          >
            Repeated Absence
          </Button>

          {!isSuperAdmin && (
            <>
              <Button
                variant="outlined"
                size="small"
                startIcon={<SettingsIcon />}
                onClick={() => setIsConfigDialogOpen(true)}
                sx={{ fontWeight: 600, borderColor: '#D1DEF0', color: '#14264B' }}
              >
                Automation Rules
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<SyncIcon />}
                onClick={() => syncAssessmentsMutation.mutate()}
                disabled={syncAssessmentsMutation.isPending}
                sx={{ fontWeight: 600, borderColor: '#D1DEF0', color: '#14264B' }}
              >
                Sync Closures
              </Button>
            </>
          )}

          <Button
            variant="outlined"
            size="small"
            startIcon={<FileDownloadIcon />}
            onClick={handleExportExcel}
            disabled={!overview || overview.notAttended === 0}
            sx={{ fontWeight: 600, borderColor: '#D1DEF0', color: '#14264B' }}
          >
            Export Not Attended
          </Button>

          {!isSuperAdmin && (
            <Button
              variant="contained"
              size="small"
              startIcon={<SendIcon />}
              onClick={() => setIsReminderDialogOpen(true)}
              disabled={!overview || overview.notAttended === 0}
              sx={{ bgcolor: '#1765B5', '&:hover': { bgcolor: '#104B91' }, fontWeight: 600 }}
            >
              Send Reminders
            </Button>
          )}
        </Box>
      </Box>

      {/* 2. Active Attendance Alerts Banner (Attention Required) */}
      {activeAlerts.length > 0 && (
        <Card
          elevation={0}
          sx={{
            mb: 3,
            p: 2.25,
            bgcolor: '#ffffff',
            border: '1px solid #fecaca',
            borderLeft: '4px solid #b91c1c',
            borderRadius: '8px',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <WarningAmberIcon sx={{ color: '#b91c1c', fontSize: 22 }} />
              <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#b91c1c', letterSpacing: '0.04em' }}>
                ATTENTION REQUIRED ({activeAlerts.length} ASSESSMENTS WITH NON-ATTENDANCE)
              </Typography>
            </Box>
          </Box>

          <Grid container spacing={1.5}>
            {activeAlerts.map((alert) => (
              <Grid item xs={12} md={6} key={alert.id}>
                <Box
                  sx={{
                    p: 2,
                    bgcolor: '#fef2f2',
                    border: '1px solid #fee2e2',
                    borderRadius: '6px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 1.5,
                  }}
                >
                  <Box>
                    <Typography variant="body2" fontWeight={700} sx={{ color: '#14264B' }}>
                      {alert.alertMessage}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#7182A0' }}>
                      Assigned: {alert.assignedCount} | Absent: {alert.notAttendedCount} candidates
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => handleAssessmentChange(alert.assessmentId)}
                      sx={{ fontSize: '0.75rem', py: 0.5, bgcolor: '#ffffff' }}
                    >
                      View
                    </Button>
                    {!isSuperAdmin && (
                      <Button
                        size="small"
                        variant="contained"
                        onClick={() => {
                          handleAssessmentChange(alert.assessmentId);
                          setIsReminderDialogOpen(true);
                        }}
                        sx={{ fontSize: '0.75rem', py: 0.5, bgcolor: '#1765B5' }}
                      >
                        Reminder
                      </Button>
                    )}
                    <IconButton
                      size="small"
                      onClick={() => resolveAlertMutation.mutate(alert.id)}
                      title="Dismiss alert"
                    >
                      <CloseIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Box>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Card>
      )}

      {/* 3. Assessment Selector Card */}
      <Card
        elevation={0}
        sx={{
          mb: 3,
          p: 2.5,
          bgcolor: '#ffffff',
          border: '1px solid #DCE6F5',
          borderRadius: '8px',
        }}
      >
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <FormControl fullWidth size="small">
              <InputLabel id="assessment-select-label">Select Placement Assessment</InputLabel>
              <Select
                labelId="assessment-select-label"
                value={effectiveAssessmentId}
                label="Select Placement Assessment"
                onChange={(e) => handleAssessmentChange(e.target.value)}
                disabled={isLoadingAssessments}
              >
                {allAssessments.map((asmt: any) => (
                  <MenuItem key={asmt.id} value={asmt.id}>
                    {asmt.name} {asmt.company ? `(${asmt.company.name})` : ''} - [{asmt.status}]
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            {overview && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                <Chip
                  label={overview.isWindowClosed ? 'TESTING WINDOW CLOSED' : 'TESTING WINDOW ACTIVE'}
                  size="small"
                  sx={{
                    fontWeight: 700,
                    fontSize: '0.72rem',
                    bgcolor: overview.isWindowClosed ? '#fef2f2' : '#f0fdf4',
                    color: overview.isWindowClosed ? '#b91c1c' : '#15803d',
                    border: '1px solid',
                    borderColor: overview.isWindowClosed ? '#fecaca' : '#bbf7d0',
                    borderRadius: '4px',
                  }}
                />
                <Typography variant="caption" sx={{ color: '#7182A0' }}>
                  {overview.endDate
                    ? `End Date: ${new Date(overview.endDate).toLocaleString()}`
                    : 'No end date scheduled'}
                </Typography>
              </Box>
            )}
          </Grid>
        </Grid>
      </Card>

      {/* 4. Real Database Values KPI Grid (8 Standard Cards) */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#1765B5', letterSpacing: '0.04em', mb: 1.5 }}>
          REAL DATABASE ATTENDANCE & CONVERSION METRICS
        </Typography>

        {isLoadingOverview ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 5, bgcolor: '#ffffff', border: '1px solid #DCE6F5', borderRadius: '8px' }}>
            <CircularProgress size={28} />
          </Box>
        ) : isOverviewError || !overview ? (
          <Alert severity="warning">Please select an assessment to view real attendance analytics.</Alert>
        ) : (
          <Grid container spacing={1.5}>
            {/* 1. Total Registered */}
            <Grid item xs={6} sm={4} md={3} lg={1.5}>
              <Card elevation={0} sx={{ p: 2, bgcolor: '#ffffff', border: '1px solid #DCE6F5', borderRadius: '8px' }}>
                <Typography variant="caption" sx={{ color: '#7182A0', fontWeight: 600 }}>REGISTERED</Typography>
                <Typography variant="h5" fontWeight={700} sx={{ color: '#14264B', my: 0.25 }}>
                  {overview.totalRegistered}
                </Typography>
                <Typography variant="caption" color="text.secondary">Active campus pool</Typography>
              </Card>
            </Grid>

            {/* 2. Eligible Students */}
            <Grid item xs={6} sm={4} md={3} lg={1.5}>
              <Card elevation={0} sx={{ p: 2, bgcolor: '#ffffff', border: '1px solid #DCE6F5', borderRadius: '8px' }}>
                <Typography variant="caption" sx={{ color: '#7182A0', fontWeight: 600 }}>ELIGIBLE</Typography>
                <Typography variant="h5" fontWeight={700} sx={{ color: '#14264B', my: 0.25 }}>
                  {overview.eligibleStudents}
                </Typography>
                <Typography variant="caption" color="text.secondary">Targeted cohort</Typography>
              </Card>
            </Grid>

            {/* 3. Assigned Students */}
            <Grid item xs={6} sm={4} md={3} lg={1.5}>
              <Card elevation={0} sx={{ p: 2, bgcolor: '#ffffff', border: '1px solid #DCE6F5', borderRadius: '8px' }}>
                <Typography variant="caption" sx={{ color: '#7182A0', fontWeight: 600 }}>ASSIGNED</Typography>
                <Typography variant="h5" fontWeight={700} sx={{ color: '#1765B5', my: 0.25 }}>
                  {overview.assignedStudents}
                </Typography>
                <Typography variant="caption" color="text.secondary">Tests allocated</Typography>
              </Card>
            </Grid>

            {/* 4. Attended */}
            <Grid item xs={6} sm={4} md={3} lg={1.5}>
              <Card elevation={0} sx={{ p: 2, bgcolor: '#ffffff', border: '1px solid #DCE6F5', borderRadius: '8px' }}>
                <Typography variant="caption" sx={{ color: '#7182A0', fontWeight: 600 }}>ATTENDED</Typography>
                <Typography variant="h5" fontWeight={700} sx={{ color: '#1765B5', my: 0.25 }}>
                  {overview.attended}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {overview.attendanceRate}% participation
                </Typography>
              </Card>
            </Grid>

            {/* 5. Not Attended */}
            <Grid item xs={6} sm={4} md={3} lg={1.5}>
              <Card
                elevation={0}
                sx={{
                  p: 2,
                  bgcolor: '#ffffff',
                  border: '1px solid',
                  borderColor: overview.notAttended > 0 ? '#fecaca' : '#DCE6F5',
                  borderRadius: '8px',
                }}
              >
                <Typography variant="caption" sx={{ color: '#b91c1c', fontWeight: 700 }}>NOT ATTENDED</Typography>
                <Typography variant="h5" fontWeight={700} sx={{ color: '#b91c1c', my: 0.25 }}>
                  {overview.notAttended}
                </Typography>
                <Typography variant="caption" sx={{ color: '#7182A0' }}>
                  {overview.isWindowClosed ? 'Window closed' : 'Pending start'}
                </Typography>
              </Card>
            </Grid>

            {/* 6. Completed */}
            <Grid item xs={6} sm={4} md={3} lg={1.5}>
              <Card elevation={0} sx={{ p: 2, bgcolor: '#ffffff', border: '1px solid #DCE6F5', borderRadius: '8px' }}>
                <Typography variant="caption" sx={{ color: '#7182A0', fontWeight: 600 }}>COMPLETED</Typography>
                <Typography variant="h5" fontWeight={700} sx={{ color: '#14264B', my: 0.25 }}>
                  {overview.completed}
                </Typography>
                <Typography variant="caption" color="text.secondary">Submissions evaluated</Typography>
              </Card>
            </Grid>

            {/* 7. Passed */}
            <Grid item xs={6} sm={4} md={3} lg={1.5}>
              <Card elevation={0} sx={{ p: 2, bgcolor: '#ffffff', border: '1px solid #DCE6F5', borderRadius: '8px' }}>
                <Typography variant="caption" sx={{ color: '#15803d', fontWeight: 700 }}>PASSED</Typography>
                <Typography variant="h5" fontWeight={700} sx={{ color: '#15803d', my: 0.25 }}>
                  {overview.passed}
                </Typography>
                <Typography variant="caption" color="text.secondary">{overview.passRate}% pass rate</Typography>
              </Card>
            </Grid>

            {/* 8. Failed */}
            <Grid item xs={6} sm={4} md={3} lg={1.5}>
              <Card elevation={0} sx={{ p: 2, bgcolor: '#ffffff', border: '1px solid #DCE6F5', borderRadius: '8px' }}>
                <Typography variant="caption" sx={{ color: '#b91c1c', fontWeight: 600 }}>FAILED</Typography>
                <Typography variant="h5" fontWeight={700} sx={{ color: '#b91c1c', my: 0.25 }}>
                  {overview.failed}
                </Typography>
                <Typography variant="caption" color="text.secondary">Needs preparation</Typography>
              </Card>
            </Grid>
          </Grid>
        )}
      </Box>

      {/* 5. Filterable & Paginated Student Attendance Table */}
      <Card
        elevation={0}
        sx={{
          bgcolor: '#ffffff',
          border: '1px solid #DCE6F5',
          borderRadius: '8px',
          overflow: 'hidden',
        }}
      >
        {/* Table Filters Header */}
        <Box sx={{ p: 2, borderBottom: '1px solid #DCE6F5', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
            <Tabs
              value={statusFilter}
              onChange={(_, val) => setStatusFilter(val)}
              sx={{
                minHeight: 36,
                '& .MuiTab-root': {
                  minHeight: 36,
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  py: 0.5,
                  px: 2,
                },
              }}
            >
              <Tab label="All Assigned" value="ALL" />
              <Tab
                label={`Not Attended (${overview?.notAttended || 0})`}
                value="NOT_ATTENDED"
                sx={{ '&.Mui-selected': { color: '#b91c1c' } }}
              />
              <Tab label="Attended" value="ATTENDED" />
              <Tab label="Completed" value="COMPLETED" />
              <Tab label="Not Started" value="NOT_STARTED" />
            </Tabs>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel id="dept-filter-label">Department</InputLabel>
                <Select
                  labelId="dept-filter-label"
                  value={departmentFilter}
                  label="Department"
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                >
                  <MenuItem value="">All Departments</MenuItem>
                  {Array.from(new Set((recordsData?.records || []).map((r) => r.departmentCode).filter(Boolean))).map((dept) => (
                    <MenuItem key={dept} value={dept}>{dept}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                size="small"
                placeholder="Search candidate, reg no, email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ color: '#8293B0', fontSize: 18, mr: 0.5 }} />,
                }}
                sx={{ width: 280 }}
              />
            </Box>
          </Box>
        </Box>

        {/* Table Content */}
        {isLoadingRecords ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress size={28} />
          </Box>
        ) : !recordsData?.records || recordsData.records.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              No student attendance records match the selected criteria.
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead sx={{ bgcolor: '#EDF2FF' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#526584' }}>CANDIDATE</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#526584' }}>REGISTER NO</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#526584' }}>DEPT & COURSE</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#526584' }}>CLASS / SECTION</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#526584' }}>ATTENDANCE STATUS</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#526584' }}>PERFORMANCE</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#526584' }}>FOLLOW-UP STATUS</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {recordsData.records.map((row) => (
                  <TableRow key={row.studentId} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600} color="#14264B">
                        {row.studentName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {row.collegeEmail}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                        {row.registerNumber}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{row.departmentCode || row.departmentName}</Typography>
                      <Typography variant="caption" color="text.secondary">{row.courseCode}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{row.className}</Typography>
                      <Typography variant="caption" color="text.secondary">Sec {row.sectionName}</Typography>
                    </TableCell>
                    <TableCell>{getStatusChip(row.attendanceStatus)}</TableCell>
                    <TableCell>
                      {row.isPassed !== null && row.isPassed !== undefined ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                          <Chip
                            label={row.isPassed ? 'PASSED' : 'NEEDS PREP'}
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              bgcolor: row.isPassed ? '#f0fdf4' : '#fef2f2',
                              color: row.isPassed ? '#15803d' : '#b91c1c',
                              borderRadius: '3px',
                            }}
                          />
                          <Typography variant="caption" fontWeight={600}>
                            {row.percentage}%
                          </Typography>
                        </Box>
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          {row.attemptStatus ? `Attempt: ${row.attemptStatus}` : 'No submission'}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {row.reminderSentCount > 0 ? (
                        <Tooltip title={`Last sent: ${row.lastReminderSentAt ? new Date(row.lastReminderSentAt).toLocaleString() : 'N/A'}`}>
                          <Chip
                            icon={<EmailOutlinedIcon sx={{ fontSize: '14px !important' }} />}
                            label={`Notified (${row.reminderSentCount})`}
                            size="small"
                            sx={{ height: 22, fontSize: '0.7rem', bgcolor: '#E7EEFA', color: '#405678' }}
                          />
                        </Tooltip>
                      ) : row.attendanceStatus === 'NOT_ATTENDED' ? (
                        <Typography variant="caption" sx={{ color: '#b91c1c', fontWeight: 600 }}>
                          Action Pending
                        </Typography>
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          —
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>

      {/* 6. Send Reminders Confirmation Dialog */}
      <Dialog
        open={isReminderDialogOpen}
        onClose={() => setIsReminderDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: '8px' } }}
      >
        <DialogTitle sx={{ borderBottom: '1px solid #DCE6F5', bgcolor: '#ffffff', color: '#14264B', fontWeight: 700 }}>
          Dispatch Attendance Follow-up Reminders
        </DialogTitle>
        <DialogContent sx={{ pt: 2.5 }}>
          <Alert severity="info" sx={{ mb: 2 }}>
            You are preparing to send official follow-up notifications to{' '}
            <strong>{overview?.notAttended || 0} candidate(s)</strong> who did not attend{' '}
            <strong>{overview?.assessmentName}</strong>.
          </Alert>

          <Typography variant="body2" sx={{ color: '#405678', mb: 2 }}>
            <strong>Idempotency Notice:</strong> The system automatically verifies delivery history and skips candidates who have already been sent a follow-up notice for this assessment.
          </Typography>

          <TextField
            label="Optional Note / Officer Directive"
            fullWidth
            multiline
            rows={3}
            value={customReminderMessage}
            onChange={(e) => setCustomReminderMessage(e.target.value)}
            placeholder="e.g. Please submit written explanation to Placement Officer Room 204 within 24 hours."
            sx={{ mb: 1 }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '1px solid #DCE6F5' }}>
          <Button onClick={() => setIsReminderDialogOpen(false)} sx={{ color: '#7182A0' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => sendRemindersMutation.mutate(customReminderMessage)}
            disabled={sendRemindersMutation.isPending || !overview || overview.notAttended === 0}
            startIcon={<SendIcon />}
            sx={{ bgcolor: '#1765B5', '&:hover': { bgcolor: '#104B91' } }}
          >
            {sendRemindersMutation.isPending ? 'Sending...' : 'Send Official Reminders'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 7. Automation Configuration Dialog */}
      <Dialog
        open={isConfigDialogOpen}
        onClose={() => setIsConfigDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: '8px' } }}
      >
        <DialogTitle sx={{ borderBottom: '1px solid #DCE6F5', bgcolor: '#ffffff', color: '#14264B', fontWeight: 700 }}>
          Attendance Automation & Reminder Configuration
        </DialogTitle>
        <DialogContent sx={{ pt: 2.5 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Configure automated reminder rules and follow-up triggers for <strong>{overview?.assessmentName}</strong>.
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ p: 2, bgcolor: '#EDF2FF', border: '1px solid #DCE6F5', borderRadius: '6px' }}>
              <Typography variant="subtitle2" fontWeight={700} color="#14264B">
                Follow-up Reminders Active
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Enables or disables delivery of follow-up notifications to not-attended students.
              </Typography>
              <Box sx={{ mt: 1 }}>
                <Chip
                  label={configData?.isEmailReminderEnabled ? 'ENABLED' : 'DISABLED'}
                  size="small"
                  color={configData?.isEmailReminderEnabled ? 'success' : 'default'}
                />
              </Box>
            </Box>

            <Box sx={{ p: 2, bgcolor: '#EDF2FF', border: '1px solid #DCE6F5', borderRadius: '6px' }}>
              <Typography variant="subtitle2" fontWeight={700} color="#14264B">
                Auto-closure Follow-up Delivery
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Automatically triggers email follow-up dispatch immediately when assessment window concludes.
              </Typography>
              <Box sx={{ mt: 1 }}>
                <Chip
                  label={configData?.autoClosureReminder ? 'ACTIVE' : 'MANUAL APPROVAL REQUIRED'}
                  size="small"
                  color={configData?.autoClosureReminder ? 'primary' : 'default'}
                />
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '1px solid #DCE6F5' }}>
          <Button onClick={() => setIsConfigDialogOpen(false)} sx={{ color: '#7182A0' }}>
            Close
          </Button>
          <Button
            variant="contained"
            onClick={() =>
              updateConfigMutation.mutate({
                isEmailReminderEnabled: !configData?.isEmailReminderEnabled,
              })
            }
            sx={{ bgcolor: '#1765B5' }}
          >
            Toggle Reminders
          </Button>
        </DialogActions>
      </Dialog>

      {/* 8. Repeated Non-Attendance Insights Dialog */}
      <Dialog
        open={isRepeatedInsightsOpen}
        onClose={() => setIsRepeatedInsightsOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: '8px' } }}
      >
        <DialogTitle sx={{ borderBottom: '1px solid #DCE6F5', bgcolor: '#ffffff', color: '#14264B', fontWeight: 700 }}>
          Historical Repeated Non-Attendance Audit
        </DialogTitle>
        <DialogContent sx={{ pt: 2.5 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Candidates who were assigned to 2 or more concluded placement assessments without recording an active attempt.
          </Typography>

          {isLoadingRepeated ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={24} />
            </Box>
          ) : repeatedInsights.length === 0 ? (
            <Alert severity="success">
              No candidates have accumulated 2 or more unexcused placement assessment absences.
            </Alert>
          ) : (
            <TableContainer sx={{ border: '1px solid #DCE6F5', borderRadius: '6px' }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: '#EDF2FF' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>CANDIDATE</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>REGISTER NO</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>DEPT & CLASS</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>MISSED ASSESSMENTS</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>CONCLUDED DRIVES</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {repeatedInsights.map((stu) => (
                    <TableRow key={stu.studentId}>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600} color="#14264B">{stu.studentName}</Typography>
                        <Typography variant="caption" color="text.secondary">{stu.collegeEmail}</Typography>
                      </TableCell>
                      <TableCell sx={{ fontFamily: 'monospace' }}>{stu.registerNumber}</TableCell>
                      <TableCell>{stu.departmentCode} - {stu.className}</TableCell>
                      <TableCell>
                        <Chip
                          label={`${stu.missedAssessmentsCount} Missed`}
                          size="small"
                          sx={{ bgcolor: '#fee2e2', color: '#b91c1c', fontWeight: 700 }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {stu.missedAssessments.map((m) => m.name).join(', ')}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '1px solid #DCE6F5' }}>
          <Button onClick={() => setIsRepeatedInsightsOpen(false)} sx={{ color: '#1765B5' }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={notificationSnackbar.open}
        autoHideDuration={5000}
        onClose={() => setNotificationSnackbar((prev) => ({ ...prev, open: false }))}
        message={notificationSnackbar.message}
      />
    </Box>
  );
};

export default AdminAttendancePage;
