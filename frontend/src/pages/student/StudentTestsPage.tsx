import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Card,
  CardContent,
  CardActions,
  Grid,
  Button,
  Chip,
  Alert,
  CircularProgress,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  FormControlLabel,
  Paper,
  IconButton,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ScheduleIcon from '@mui/icons-material/Schedule';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AssignmentIcon from '@mui/icons-material/Assignment';
import AssessmentIcon from '@mui/icons-material/Assessment';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import TimerIcon from '@mui/icons-material/Timer';
import BusinessIcon from '@mui/icons-material/Business';
import SecurityIcon from '@mui/icons-material/Security';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CloseIcon from '@mui/icons-material/Close';
import SchoolIcon from '@mui/icons-material/School';
import { useNavigate, useLocation } from 'react-router-dom';
import { attemptService } from '../../services/attempt.service.js';
import { StudentAssessmentItemDto, StudentTestStatus } from '../../types/attempt.types.js';

export const StudentTestsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Determine active tab from URL path
  const getTabFromPath = (): StudentTestStatus | 'ALL' => {
    if (location.pathname.includes('/available')) return 'AVAILABLE';
    if (location.pathname.includes('/upcoming')) return 'UPCOMING';
    if (location.pathname.includes('/completed')) return 'COMPLETED';
    return 'ALL';
  };

  const [activeTab, setActiveTab] = useState<StudentTestStatus | 'ALL'>(getTabFromPath());
  const [trackFilter, setTrackFilter] = useState<'ALL' | 'GENERAL' | 'COMPANY'>('ALL');
  const [selectedCompanyCode, setSelectedCompanyCode] = useState<string>('ALL');
  const [tests, setTests] = useState<StudentAssessmentItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [startingId, setStartingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedTestForExam, setSelectedTestForExam] = useState<StudentAssessmentItemDto | null>(null);
  const [rulesAgreed, setRulesAgreed] = useState(true);

  useEffect(() => {
    setActiveTab(getTabFromPath());
  }, [location.pathname]);

  useEffect(() => {
    loadTests();
  }, [activeTab]);

  const loadTests = async () => {
    setLoading(true);
    setError(null);
    try {
      const filter = activeTab === 'ALL' ? undefined : activeTab;
      const data = await attemptService.getStudentTests(filter);
      setTests(data);
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : 'Failed to load assessments';
      setError(msg || 'Failed to load assessments');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (_: React.SyntheticEvent, newValue: StudentTestStatus | 'ALL') => {
    setActiveTab(newValue);
    if (newValue === 'AVAILABLE') navigate('/student/tests/available');
    else if (newValue === 'UPCOMING') navigate('/student/tests/upcoming');
    else if (newValue === 'COMPLETED') navigate('/student/tests/completed');
    else navigate('/student/tests');
  };

  const handleOpenConfirm = (test: StudentAssessmentItemDto) => {
    setSelectedTestForExam(test);
    setRulesAgreed(true);
    setConfirmDialogOpen(true);
  };

  const handleCloseConfirm = () => {
    if (startingId) return;
    setConfirmDialogOpen(false);
    setSelectedTestForExam(null);
  };

  const handleConfirmTakeExam = async () => {
    if (!selectedTestForExam) return;
    try {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else if ((document.documentElement as any).webkitRequestFullscreen) {
        (document.documentElement as any).webkitRequestFullscreen().catch?.(() => {});
      }
    } catch {
      // Browser will prompt in attempt page if blocked
    }

    if (selectedTestForExam.activeAttemptId) {
      setConfirmDialogOpen(false);
      navigate(`/student/attempt/${selectedTestForExam.activeAttemptId}`, { state: { autoRequestFullscreen: true } });
      return;
    }
    await handleStartTest(selectedTestForExam.id);
  };

  const handleStartTest = async (testId: string) => {
    setStartingId(testId);
    setError(null);
    try {
      const attempt = await attemptService.startAssessment(testId);
      setConfirmDialogOpen(false);
      navigate(`/student/attempt/${attempt.id}`, { state: { autoRequestFullscreen: true } });
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : 'Failed to start assessment';
      setError(msg || 'Failed to start assessment');
      setStartingId(null);
    }
  };

  // Distinct company codes present in student's tests
  const availableCompanyCodes = Array.from(
    new Set(
      tests
        .filter((t) => t.company?.code)
        .map((t) => t.company!.code.toUpperCase())
    )
  );

  // Filter tests based on track and company
  const filteredTests = tests.filter((t) => {
    if (trackFilter === 'GENERAL' && t.isCompanyAssessment) return false;
    if (trackFilter === 'COMPANY' && !t.isCompanyAssessment) return false;
    if (selectedCompanyCode !== 'ALL') {
      if (!t.company || t.company.code.toUpperCase() !== selectedCompanyCode) return false;
    }
    return true;
  });

  return (
    <Box>
      {/* Top Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
        <div>
          <Typography variant="overline" sx={{ color: '#1765B5', fontWeight: 700, letterSpacing: '0.06em' }}>
            CAMPUS PLACEMENT EXAMINATIONS
          </Typography>
          <Typography variant="h5" fontWeight={700} sx={{ color: '#14264B', mb: 0.5 }}>
            My Assessments & Examination Schedule
          </Typography>
          <Typography variant="body2" color="text.secondary">
            General placement tests, corporate recruiter mock papers, and active examination sessions.
          </Typography>
        </div>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<AssessmentIcon sx={{ fontSize: 16 }} />}
            onClick={() => navigate('/student/results')}
          >
            My Results
          </Button>
          <Button
            variant="text"
            size="small"
            onClick={() => navigate('/student/dashboard')}
            sx={{ fontWeight: 600, color: '#526584' }}
          >
            Dashboard
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2.5 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Track & Company Filter Bar */}
      <Box sx={{ mb: 2.5, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1.25 }}>
        <Typography variant="caption" sx={{ fontWeight: 700, color: '#526584', mr: 0.5, letterSpacing: '0.04em' }}>
          TRACK:
        </Typography>
        <Chip
          label="All Assessments"
          clickable
          size="small"
          onClick={() => {
            setTrackFilter('ALL');
            setSelectedCompanyCode('ALL');
          }}
          sx={{
            fontWeight: 600,
            borderRadius: '4px',
            backgroundColor: trackFilter === 'ALL' ? '#1765B5' : '#ffffff',
            color: trackFilter === 'ALL' ? '#ffffff' : '#526584',
            border: '1px solid',
            borderColor: trackFilter === 'ALL' ? '#1765B5' : '#D1DEF0',
          }}
        />
        <Chip
          label="General Placement Only"
          clickable
          size="small"
          onClick={() => {
            setTrackFilter('GENERAL');
            setSelectedCompanyCode('ALL');
          }}
          sx={{
            fontWeight: 600,
            borderRadius: '4px',
            backgroundColor: trackFilter === 'GENERAL' ? '#1765B5' : '#ffffff',
            color: trackFilter === 'GENERAL' ? '#ffffff' : '#526584',
            border: '1px solid',
            borderColor: trackFilter === 'GENERAL' ? '#1765B5' : '#D1DEF0',
          }}
        />
        <Chip
          icon={<BusinessIcon sx={{ fontSize: '14px !important' }} />}
          label="Company Mock Prep"
          clickable
          size="small"
          onClick={() => setTrackFilter('COMPANY')}
          sx={{
            fontWeight: 600,
            borderRadius: '4px',
            backgroundColor: trackFilter === 'COMPANY' ? '#1765B5' : '#ffffff',
            color: trackFilter === 'COMPANY' ? '#ffffff' : '#526584',
            border: '1px solid',
            borderColor: trackFilter === 'COMPANY' ? '#1765B5' : '#D1DEF0',
          }}
        />

        {/* Company Pills if Company Mock Prep or All */}
        {trackFilter !== 'GENERAL' && availableCompanyCodes.length > 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: { xs: 0, sm: 1 }, flexWrap: 'wrap' }}>
            <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
            <Typography variant="caption" sx={{ color: '#7182A0', fontWeight: 600 }}>
              Company:
            </Typography>
            <Chip
              label="All Companies"
              size="small"
              clickable
              onClick={() => setSelectedCompanyCode('ALL')}
              sx={{
                fontWeight: 600,
                fontSize: '0.72rem',
                borderRadius: '4px',
                backgroundColor: selectedCompanyCode === 'ALL' ? '#1765B5' : '#EDF2FF',
                color: selectedCompanyCode === 'ALL' ? '#ffffff' : '#526584',
                border: '1px solid #D1DEF0',
              }}
            />
            {availableCompanyCodes.map((code) => (
              <Chip
                key={code}
                label={code}
                size="small"
                clickable
                onClick={() => setSelectedCompanyCode(code)}
                sx={{
                  fontWeight: 600,
                  fontSize: '0.72rem',
                  borderRadius: '4px',
                  backgroundColor: selectedCompanyCode === code ? '#1765B5' : '#ffffff',
                  color: selectedCompanyCode === code ? '#ffffff' : '#526584',
                  border: '1px solid #D1DEF0',
                }}
              />
            ))}
          </Box>
        )}
      </Box>

      {/* Company Mock Prep Disclaimer Banner */}
      {(trackFilter === 'COMPANY' || filteredTests.some((t) => t.isCompanyAssessment)) && (
        <Alert
          severity="info"
          icon={<BusinessIcon sx={{ color: '#1765B5' }} />}
          sx={{
            mb: 2.5,
            backgroundColor: '#EDF2FF',
            border: '1px solid #D1DEF0',
            borderRadius: '6px',
            color: '#33466A',
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#14264B' }}>
            Company-Specific Placement Preparation & Mock Practice Module
          </Typography>
          <Typography variant="caption" sx={{ color: '#526584', mt: 0.25, display: 'block' }}>
            Assessments tagged with corporate recruiters (TCS, Wipro, Cognizant, Infosys, Accenture, HCL) are simulated mock patterns designed for placement examination preparation.
          </Typography>
        </Alert>
      )}

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: '#DCE6F5', mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          sx={{
            minHeight: 40,
            '& .MuiTab-root': {
              minHeight: 40,
              fontSize: '0.85rem',
              fontWeight: 600,
              textTransform: 'none',
              px: 2,
            },
          }}
        >
          <Tab label="All Tests" value="ALL" />
          <Tab label="Available Now" value="AVAILABLE" icon={<PlayArrowIcon sx={{ fontSize: 16 }} />} iconPosition="start" />
          <Tab label="Upcoming Scheduled" value="UPCOMING" icon={<ScheduleIcon sx={{ fontSize: 16 }} />} iconPosition="start" />
          <Tab label="Completed Scorecards" value="COMPLETED" icon={<CheckCircleIcon sx={{ fontSize: 16 }} />} iconPosition="start" />
        </Tabs>
      </Box>

      {/* Content */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6, bgcolor: '#ffffff', borderRadius: '8px', border: '1px solid #DCE6F5' }}>
          <CircularProgress size={28} />
        </Box>
      ) : filteredTests.length === 0 ? (
        <Card elevation={0} sx={{ textAlign: 'center', py: 6, px: 3, bgcolor: '#ffffff', border: '1px solid #DCE6F5', borderRadius: '8px' }}>
          <AssignmentIcon sx={{ fontSize: 40, color: '#8293B0', mb: 1.5 }} />
          <Typography variant="subtitle1" fontWeight={700} color="#14264B" gutterBottom>
            No Assessments Found
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {activeTab === 'ALL'
              ? 'You do not have any matching assessments assigned at this time.'
              : `You have no ${activeTab.toLowerCase()} assessments matching this filter.`}
          </Typography>
        </Card>
      ) : (
        <Grid container spacing={2.5}>
          {filteredTests.map((test) => {
            const isAvailable = test.status === 'AVAILABLE';
            const isUpcoming = test.status === 'UPCOMING';
            const isCompleted = test.status === 'COMPLETED';
            const hasActiveAttempt = Boolean(test.activeAttemptId);

            return (
              <Grid item xs={12} sm={6} lg={4} key={test.id}>
                <Card
                  elevation={0}
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    bgcolor: '#ffffff',
                    border: hasActiveAttempt ? '2px solid #1765B5' : '1px solid #DCE6F5',
                    borderRadius: '8px',
                    transition: 'border-color 0.15s ease',
                    '&:hover': {
                      borderColor: hasActiveAttempt ? '#1765B5' : '#8293B0',
                    },
                  }}
                >
                  <CardContent sx={{ flexGrow: 1, p: 2.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5, gap: 1 }}>
                      <Box>
                        {test.company && (
                          <Chip
                            icon={<BusinessIcon sx={{ fontSize: '13px !important' }} />}
                            label={`${test.company.name} (${test.company.code})`}
                            size="small"
                            sx={{
                              mb: 0.75,
                              fontWeight: 700,
                              fontSize: '0.7rem',
                              backgroundColor: '#E4EEFC',
                              color: '#1765B5',
                              border: '1px solid #D1DEF0',
                              borderRadius: '4px',
                            }}
                          />
                        )}
                        {test.isCompanyAssessment && !test.company && (
                          <Chip
                            icon={<BusinessIcon sx={{ fontSize: '13px !important' }} />}
                            label="Company Mock Test"
                            size="small"
                            sx={{
                              mb: 0.75,
                              fontWeight: 700,
                              fontSize: '0.7rem',
                              backgroundColor: '#E4EEFC',
                              color: '#1765B5',
                              borderRadius: '4px',
                            }}
                          />
                        )}
                        <Typography variant="subtitle1" fontWeight={700} color="#14264B" sx={{ pr: 1 }}>
                          {test.name}
                        </Typography>
                      </Box>
                      <Chip
                        size="small"
                        label={hasActiveAttempt ? 'IN PROGRESS' : test.status}
                        sx={{
                          fontWeight: 700,
                          fontSize: '0.7rem',
                          borderRadius: '4px',
                          bgcolor: hasActiveAttempt
                            ? '#fef3c7'
                            : isAvailable
                            ? '#ecfdf5'
                            : isUpcoming
                            ? '#eff6ff'
                            : '#E7EEFA',
                          color: hasActiveAttempt
                            ? '#b45309'
                            : isAvailable
                            ? '#047857'
                            : isUpcoming
                            ? '#0369a1'
                            : '#7182A0',
                          border: '1px solid',
                          borderColor: hasActiveAttempt
                            ? '#fde68a'
                            : isAvailable
                            ? '#a7f3d0'
                            : isUpcoming
                            ? '#bfdbfe'
                            : '#D1DEF0',
                        }}
                      />
                    </Box>

                    {test.description && (
                      <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', minHeight: 32 }}>
                        {test.description}
                      </Typography>
                    )}

                    <Divider sx={{ my: 1.25, borderColor: '#E7EEFA' }} />

                    {/* Metadata Grid */}
                    <Grid container spacing={1} sx={{ mt: 0.25 }}>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <TimerIcon sx={{ fontSize: 13 }} /> Duration
                        </Typography>
                        <Typography variant="body2" fontWeight={600} color="#14264B">
                          {test.duration} mins
                        </Typography>
                      </Grid>

                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <HelpOutlineIcon sx={{ fontSize: 13 }} /> Questions
                        </Typography>
                        <Typography variant="body2" fontWeight={600} color="#14264B">
                          {test.totalQuestions || 'Multiple'}
                        </Typography>
                      </Grid>

                      <Grid item xs={6} sx={{ mt: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">
                          Passing Cut-off
                        </Typography>
                        <Typography variant="body2" fontWeight={600} color="#14264B">
                          {test.passingPercentage}%
                        </Typography>
                      </Grid>

                      <Grid item xs={6} sx={{ mt: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">
                          Negative Marking
                        </Typography>
                        <Typography variant="body2" fontWeight={600} color={test.negativeMarking ? '#b45309' : '#7182A0'}>
                          {test.negativeMarking ? 'Yes (-0.25)' : 'None'}
                        </Typography>
                      </Grid>
                    </Grid>

                    <Box sx={{ mt: 1.5, pt: 1, borderTop: '1px dashed #DCE6F5' }}>
                      <Typography variant="caption" color="text.secondary">
                        Attempts: {test.attemptsCount} of {test.maximumAttempts} used
                      </Typography>
                    </Box>
                  </CardContent>

                  <CardActions sx={{ p: 2, pt: 0 }}>
                    {hasActiveAttempt ? (
                      <Button
                        fullWidth
                        variant="contained"
                        startIcon={<PlayArrowIcon />}
                        sx={{
                          bgcolor: '#b45309',
                          fontWeight: 700,
                          textTransform: 'none',
                          borderRadius: 2,
                          '&:hover': { bgcolor: '#92400e' },
                        }}
                        onClick={() => handleOpenConfirm(test)}
                      >
                        Resume Assessment
                      </Button>
                    ) : isAvailable ? (
                      <Button
                        fullWidth
                        variant="contained"
                        color="primary"
                        startIcon={<PlayArrowIcon />}
                        onClick={() => handleOpenConfirm(test)}
                        disabled={startingId === test.id}
                        sx={{
                          fontWeight: 700,
                          textTransform: 'none',
                          borderRadius: 2,
                        }}
                      >
                        {startingId === test.id ? <CircularProgress size={20} color="inherit" /> : 'Attend Test'}
                      </Button>
                    ) : isCompleted ? (
                      <Button
                        fullWidth
                        variant="outlined"
                        onClick={() => {
                          if (test.lastResultId) {
                            navigate(`/student/results/${test.lastResultId}`);
                          } else {
                            navigate('/student/results');
                          }
                        }}
                        sx={{
                          fontWeight: 600,
                          textTransform: 'none',
                          borderRadius: 2,
                        }}
                      >
                        View Scorecard
                      </Button>
                    ) : (
                      <Button fullWidth variant="outlined" disabled sx={{ textTransform: 'none', borderRadius: 2 }}>
                        Upcoming
                      </Button>
                    )}
                  </CardActions>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Confirmation Dialog: Ready for Exam? */}
      <Dialog
        open={confirmDialogOpen}
        onClose={handleCloseConfirm}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            p: 1,
            boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
          },
        }}
      >
        <DialogTitle sx={{ pb: 1, pt: 2, px: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: '12px',
                  bgcolor: '#E0F2FE',
                  color: '#0284C7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <SchoolIcon sx={{ fontSize: 26 }} />
              </Box>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800, color: '#0F172A', lineHeight: 1.2 }}>
                  Ready for Exam?
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 500 }}>
                  Review guidelines and confirm to enter the assessment
                </Typography>
              </Box>
            </Box>
            <IconButton onClick={handleCloseConfirm} size="small" sx={{ color: '#94A3B8' }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ px: 3, py: 2 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {selectedTestForExam && (
            <>
              {/* Assessment Overview Card */}
              <Paper
                elevation={0}
                sx={{
                  p: 2.5,
                  mb: 2.5,
                  borderRadius: 2.5,
                  bgcolor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                }}
              >
                <Box sx={{ mb: 1.5 }}>
                  {selectedTestForExam.company && (
                    <Chip
                      icon={<BusinessIcon sx={{ fontSize: '13px !important' }} />}
                      label={`${selectedTestForExam.company.name} (${selectedTestForExam.company.code})`}
                      size="small"
                      sx={{
                        mb: 0.75,
                        fontWeight: 700,
                        fontSize: '0.72rem',
                        backgroundColor: '#E0F2FE',
                        color: '#0284C7',
                        border: '1px solid #BAE6FD',
                        borderRadius: '4px',
                      }}
                    />
                  )}
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0F172A' }}>
                    {selectedTestForExam.name}
                  </Typography>
                  {selectedTestForExam.description && (
                    <Typography variant="body2" sx={{ color: '#64748B', mt: 0.5 }}>
                      {selectedTestForExam.description}
                    </Typography>
                  )}
                </Box>

                <Grid container spacing={1.5} sx={{ mt: 0.5 }}>
                  <Grid item xs={6} sm={3}>
                    <Box sx={{ p: 1.25, borderRadius: 2, bgcolor: '#FFFFFF', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                      <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, display: 'block' }}>
                        Duration
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 800, color: '#0F172A', mt: 0.25 }}>
                        {selectedTestForExam.duration} mins
                      </Typography>
                    </Box>
                  </Grid>

                  <Grid item xs={6} sm={3}>
                    <Box sx={{ p: 1.25, borderRadius: 2, bgcolor: '#FFFFFF', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                      <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, display: 'block' }}>
                        Questions
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 800, color: '#0F172A', mt: 0.25 }}>
                        {selectedTestForExam.totalQuestions || 'Multiple'}
                      </Typography>
                    </Box>
                  </Grid>

                  <Grid item xs={6} sm={3}>
                    <Box sx={{ p: 1.25, borderRadius: 2, bgcolor: '#FFFFFF', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                      <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, display: 'block' }}>
                        Cut-off
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 800, color: '#16A34A', mt: 0.25 }}>
                        {selectedTestForExam.passingPercentage}%
                      </Typography>
                    </Box>
                  </Grid>

                  <Grid item xs={6} sm={3}>
                    <Box sx={{ p: 1.25, borderRadius: 2, bgcolor: '#FFFFFF', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                      <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, display: 'block' }}>
                        Negative
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 800, color: selectedTestForExam.negativeMarking ? '#DC2626' : '#64748B', mt: 0.25 }}>
                        {selectedTestForExam.negativeMarking ? 'Yes (-0.25)' : 'None'}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Paper>

              {/* Instructions */}
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0F172A', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                <SecurityIcon sx={{ fontSize: 18, color: '#0284C7' }} />
                Examination Guidelines:
              </Typography>

              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  mb: 2.5,
                  borderRadius: 2.5,
                  bgcolor: '#F0F9FF',
                  border: '1px solid #BAE6FD',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1.25,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25 }}>
                  <TimerIcon sx={{ color: '#0284C7', fontSize: 18, mt: 0.2 }} />
                  <Typography variant="body2" sx={{ color: '#0C4A6E', fontSize: '0.875rem' }}>
                    <strong>Timer Starts Immediately:</strong> The exam countdown will start the moment you click <strong>Take Exam</strong> and cannot be paused.
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25 }}>
                  <SecurityIcon sx={{ color: '#0284C7', fontSize: 18, mt: 0.2 }} />
                  <Typography variant="body2" sx={{ color: '#0C4A6E', fontSize: '0.875rem' }}>
                    <strong>Secure Full-Screen Mode:</strong> The assessment runs in full-screen. Switching tabs, minimizing, or exiting full-screen is monitored and recorded.
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25 }}>
                  <CheckCircleOutlineIcon sx={{ color: '#0284C7', fontSize: 18, mt: 0.2 }} />
                  <Typography variant="body2" sx={{ color: '#0C4A6E', fontSize: '0.875rem' }}>
                    <strong>Continuous Auto-Save:</strong> All chosen answers and submitted code are safely synchronized with the server as you progress.
                  </Typography>
                </Box>
              </Paper>

              {/* Candidate Readiness Agreement */}
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={rulesAgreed}
                      onChange={(e) => setRulesAgreed(e.target.checked)}
                      sx={{ color: '#0284C7', '&.Mui-checked': { color: '#0284C7' } }}
                    />
                  }
                  label={
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#1E293B' }}>
                      I have read all instructions and I am ready to take the exam.
                    </Typography>
                  }
                />
              </Box>
            </>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5, pt: 1, gap: 1 }}>
          <Button
            variant="outlined"
            onClick={handleCloseConfirm}
            disabled={Boolean(startingId)}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 700,
              color: '#64748B',
              borderColor: '#CBD5E1',
              px: 2.5,
            }}
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            onClick={handleConfirmTakeExam}
            disabled={!rulesAgreed || Boolean(startingId)}
            startIcon={
              startingId ? <CircularProgress size={18} color="inherit" /> : <PlayArrowIcon />
            }
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 800,
              fontSize: '0.95rem',
              px: 3.5,
              py: 1,
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              boxShadow: '0 4px 14px rgba(2, 132, 199, 0.4)',
              '&:hover': {
                background: 'linear-gradient(135deg, #0369a1 0%, #075985 100%)',
              },
            }}
          >
            {startingId ? 'Launching Exam...' : 'Take Exam'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};


