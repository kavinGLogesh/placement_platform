import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Button,
  CircularProgress,
  Alert,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tabs,
  Tab,
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import SchoolIcon from '@mui/icons-material/School';
import GradeIcon from '@mui/icons-material/Grade';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DownloadIcon from '@mui/icons-material/Download';
import AssessmentIcon from '@mui/icons-material/Assessment';
import TimelineIcon from '@mui/icons-material/Timeline';
import SmartphoneIcon from '@mui/icons-material/Smartphone';
import PeopleIcon from '@mui/icons-material/People';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import VideocamOffIcon from '@mui/icons-material/VideocamOff';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import LaunchIcon from '@mui/icons-material/Launch';
import SecurityIcon from '@mui/icons-material/Security';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import HistoryIcon from '@mui/icons-material/History';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

import { managementService } from '../../services/management.service.js';
import { analyticsService } from '../../services/analytics.service.js';
import { Student, StudentStatus } from '../../types/management.types.js';
import { StudentAcademicRecordsSection } from '../../components/admin/StudentAcademicRecordsSection.js';
import { StudentPersonalEmailManager } from '../../components/admin/StudentPersonalEmailManager.js';
import { AcademicBulkImportDialog } from '../../components/admin/AcademicBulkImportDialog.js';
import { StudentSkillsCard } from '../../components/student/StudentSkillsCard.js';

export const StudentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 7-Tab Navigation State (0 = Overview, 1 = Personal Details, 2 = Academic Records, 3 = Semester Results, 4 = Assessment History, 5 = Malpractice History, 6 = Improvement Recommendations)
  const [activeTab, setActiveTab] = useState<number>(0);

  // Resume Action State
  const [downloadingResume, setDownloadingResume] = useState(false);
  const [viewingResume, setViewingResume] = useState(false);
  const [resumeActionError, setResumeActionError] = useState<string | null>(null);

  // Edit Dialog State
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    personalEmail: '',
    phone: '',
    dob: '',
    cgpa: 8.0,
    status: 'ACTIVE' as StudentStatus,
  });

  // Bulk Academic Import Dialog State
  const [academicImportDialogOpen, setAcademicImportDialogOpen] = useState<boolean>(false);

  const fetchStudent = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await managementService.getStudentById(id);
      setStudent(data);
      setEditForm({
        name: data.name,
        personalEmail: data.personalEmail || '',
        phone: data.phone || '',
        dob: data.dob || '',
        cgpa: data.cgpa || 8.0,
        status: data.status,
      });
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Failed to load student details';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchStudent();
  }, [fetchStudent]);

  // Fetch Student Performance Drilldown, Proctoring Events & Recommendations
  const { data: drilldown, isLoading: drilldownLoading, refetch: refetchDrilldown } = useQuery({
    queryKey: ['studentDrilldown', id],
    queryFn: () => analyticsService.getStudentDrilldown(id || ''),
    enabled: Boolean(id),
  });

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSaving(true);
    try {
      const updated = await managementService.updateStudent(id, {
        name: editForm.name,
        personalEmail: editForm.personalEmail ? editForm.personalEmail.trim() : undefined,
        phone: editForm.phone,
        dob: editForm.dob,
        cgpa: Number(editForm.cgpa),
        status: editForm.status,
      });
      setStudent(updated);
      setEditDialogOpen(false);
      refetchDrilldown();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Failed to update student profile';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  // Safe Resume View Handler
  const handleViewResume = async () => {
    if (!id) return;
    try {
      setViewingResume(true);
      setResumeActionError(null);
      const blob = await managementService.downloadStudentResume(id, true);
      const fileUrl = window.URL.createObjectURL(blob);
      window.open(fileUrl, '_blank');
      setTimeout(() => window.URL.revokeObjectURL(fileUrl), 60000);
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Could not preview verified resume file.';
      setResumeActionError(msg);
    } finally {
      setViewingResume(false);
    }
  };

  // Safe Resume Download Handler
  const handleDownloadResume = async () => {
    if (!id) return;
    try {
      setDownloadingResume(true);
      setResumeActionError(null);
      const blob = await managementService.downloadStudentResume(id, false);
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = drilldown?.resume?.fileName || `${student?.registerNumber || 'Student'}_Resume.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Could not download verified resume.';
      setResumeActionError(msg);
    } finally {
      setDownloadingResume(false);
    }
  };

  const progress = drilldown?.performanceProgress;

  // Overview metrics derived deterministically
  const currentCgpaDisplay =
    drilldown?.summary?.currentCgpa != null
      ? Number(drilldown.summary.currentCgpa).toFixed(2)
      : student?.cgpa != null
      ? Number(student.cgpa).toFixed(2)
      : 'N/A';

  const currentYearDisplay =
    drilldown?.summary?.currentYear || student?.year || student?.class?.currentYear || 1;

  const totalAssessmentsDisplay = drilldown?.summary?.totalAttempted ?? 0;
  const passedCountDisplay = drilldown?.summary?.totalPassed ?? 0;
  const failedCountDisplay =
    drilldown?.summary?.totalFailed ??
    Math.max(0, (drilldown?.summary?.totalAttempted ?? 0) - (drilldown?.summary?.totalPassed ?? 0));

  const latestPercentageDisplay =
    drilldown?.summary?.latestPercentage != null
      ? `${Number(drilldown.summary.latestPercentage).toFixed(1)}%`
      : drilldown?.assessmentHistory?.[0]?.percentage != null
      ? `${Number(drilldown.assessmentHistory[0].percentage).toFixed(1)}%`
      : 'N/A';

  const recordedWarningsDisplay = drilldown?.summary?.recordedWarnings ?? 0;

  return (
    <Box sx={{ maxWidth: 1440, mx: 'auto', p: { xs: 2, sm: 3 } }}>
      {/* Top Header & Navigation Breadcrumb */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<ArrowBackIcon fontSize="small" />}
            onClick={() => navigate('/admin/students')}
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
            All Students
          </Button>
          <div>
            <Typography variant="overline" color="#1765B5" fontWeight={700} letterSpacing={1.2}>
              CANDIDATE DOSSIER
            </Typography>
            <Typography variant="h4" fontWeight={800} letterSpacing="-0.02em" sx={{ color: '#14264B' }}>
              {student?.name || 'Loading Student...'}
            </Typography>
          </div>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<SchoolIcon fontSize="small" />}
            onClick={() => setAcademicImportDialogOpen(true)}
            sx={{
              color: '#0284c7',
              borderColor: '#bae6fd',
              bgcolor: '#f0f9ff',
              borderRadius: '6px',
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.8125rem',
              '&:hover': { borderColor: '#0284c7', bgcolor: '#e0f2fe' },
            }}
          >
            Academic Excel Import
          </Button>
          {student && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<LaunchIcon fontSize="small" />}
              onClick={() => navigate(`/admin/students/${student.id}/performance`)}
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
              Analytics Drilldown
            </Button>
          )}
          {student && (
            <Button
              variant="contained"
              size="small"
              startIcon={<EditIcon fontSize="small" />}
              onClick={() => setEditDialogOpen(true)}
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
              Edit Profile
            </Button>
          )}
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: '8px' }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress size={32} sx={{ color: '#1765B5' }} />
        </Box>
      ) : student ? (
        <>
          {/* 7-Tab Navigation Bar */}
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
              value={activeTab}
              onChange={(_e, newTab) => setActiveTab(newTab)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                px: 2,
                borderBottom: '1px solid #e2e8f0',
                '& .MuiTab-root': {
                  textTransform: 'none',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  minHeight: 52,
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
              <Tab icon={<AssessmentIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Overview" />
              <Tab icon={<PeopleAltIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Personal Details" />
              <Tab icon={<SchoolIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Academic Records" />
              <Tab icon={<GradeIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Semester Results" />
              <Tab icon={<HistoryIcon sx={{ fontSize: 18 }} />} iconPosition="start" label={`Assessment History (${drilldown?.assessmentHistory?.length || 0})`} />
              <Tab
                icon={<SecurityIcon sx={{ fontSize: 18 }} />}
                iconPosition="start"
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <span>Malpractice History</span>
                    {(drilldown?.malpracticeHistory?.length || 0) > 0 && (
                      <Chip
                        label={drilldown?.malpracticeHistory?.length}
                        size="small"
                        color="error"
                        sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700 }}
                      />
                    )}
                  </Box>
                }
              />
              <Tab icon={<AutoAwesomeIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Improvement Recommendations" />
            </Tabs>
          </Paper>

          {/* ================================================================= */}
          {/* TAB 0: OVERVIEW                                                   */}
          {/* ================================================================= */}
          {activeTab === 0 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* Overview Metric Cards */}
              <Grid container spacing={2}>
                <Grid item xs={6} sm={4} md={2}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2.5,
                      borderRadius: 2,
                      border: '1px solid #DCE6F5',
                      bgcolor: '#ffffff',
                      height: '100%',
                    }}
                  >
                    <Typography variant="caption" color="text.secondary" fontWeight={700}>
                      CURRENT CGPA
                    </Typography>
                    <Typography variant="h4" fontWeight={800} color="#0D9488" sx={{ mt: 0.5 }}>
                      {currentCgpaDisplay}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      University grading rule
                    </Typography>
                  </Paper>
                </Grid>

                <Grid item xs={6} sm={4} md={2}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2.5,
                      borderRadius: 2,
                      border: '1px solid #DCE6F5',
                      bgcolor: '#ffffff',
                      height: '100%',
                    }}
                  >
                    <Typography variant="caption" color="text.secondary" fontWeight={700}>
                      CURRENT YEAR
                    </Typography>
                    <Typography variant="h4" fontWeight={800} color="#14264B" sx={{ mt: 0.5 }}>
                      Year {currentYearDisplay}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Batch {student.class?.batchYear || '—'}
                    </Typography>
                  </Paper>
                </Grid>

                <Grid item xs={6} sm={4} md={2}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2.5,
                      borderRadius: 2,
                      border: '1px solid #DCE6F5',
                      bgcolor: '#ffffff',
                      height: '100%',
                    }}
                  >
                    <Typography variant="caption" color="text.secondary" fontWeight={700}>
                      ASSESSMENTS
                    </Typography>
                    <Typography variant="h4" fontWeight={800} color="#0284c7" sx={{ mt: 0.5 }}>
                      {totalAssessmentsDisplay}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Total attempts taken
                    </Typography>
                  </Paper>
                </Grid>

                <Grid item xs={6} sm={4} md={2}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2.5,
                      borderRadius: 2,
                      border: '1px solid #bbf7d0',
                      bgcolor: '#f0fdf4',
                      height: '100%',
                    }}
                  >
                    <Typography variant="caption" color="#166534" fontWeight={700}>
                      PASSED / FAILED
                    </Typography>
                    <Typography variant="h5" fontWeight={800} color="#15803d" sx={{ mt: 0.5 }}>
                      {passedCountDisplay} / {failedCountDisplay}
                    </Typography>
                    <Typography variant="caption" color="#166534">
                      {totalAssessmentsDisplay > 0
                        ? `${Math.round((passedCountDisplay / totalAssessmentsDisplay) * 100)}% Pass Rate`
                        : 'No attempts'}
                    </Typography>
                  </Paper>
                </Grid>

                <Grid item xs={6} sm={4} md={2}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2.5,
                      borderRadius: 2,
                      border: '1px solid #DCE6F5',
                      bgcolor: '#ffffff',
                      height: '100%',
                    }}
                  >
                    <Typography variant="caption" color="text.secondary" fontWeight={700}>
                      LATEST PERCENTAGE
                    </Typography>
                    <Typography variant="h4" fontWeight={800} color="#6366f1" sx={{ mt: 0.5 }}>
                      {latestPercentageDisplay}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Most recent attempt
                    </Typography>
                  </Paper>
                </Grid>

                <Grid item xs={6} sm={4} md={2}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2.5,
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: recordedWarningsDisplay > 0 ? '#fecaca' : '#DCE6F5',
                      bgcolor: recordedWarningsDisplay > 0 ? '#fef2f2' : '#ffffff',
                      height: '100%',
                    }}
                  >
                    <Typography
                      variant="caption"
                      color={recordedWarningsDisplay > 0 ? '#b91c1c' : 'text.secondary'}
                      fontWeight={700}
                    >
                      RECORDED WARNINGS
                    </Typography>
                    <Typography
                      variant="h4"
                      fontWeight={800}
                      color={recordedWarningsDisplay > 0 ? '#dc2626' : '#14264B'}
                      sx={{ mt: 0.5 }}
                    >
                      {recordedWarningsDisplay}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Proctoring telemetry
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>

              {/* Snapshot Identity & Placement Resume */}
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Card elevation={0} sx={{ height: '100%', border: '1px solid #DCE6F5', borderRadius: 2 }}>
                    <CardContent sx={{ p: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2.5 }}>
                        <Box
                          sx={{
                            width: 52,
                            height: 52,
                            borderRadius: '8px',
                            bgcolor: '#1765B5',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <SchoolIcon sx={{ color: '#ffffff', fontSize: 28 }} />
                        </Box>
                        <div>
                          <Typography variant="h6" fontWeight={700} sx={{ color: '#14264B' }}>
                            {student.name}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 0.5 }}>
                            <Chip
                              label={student.registerNumber}
                              size="small"
                              color="primary"
                              sx={{ fontFamily: 'monospace', fontWeight: 700 }}
                            />
                            <Chip
                              label={student.status}
                              size="small"
                              color={student.status === 'ACTIVE' ? 'success' : 'default'}
                              sx={{ fontWeight: 700 }}
                            />
                          </Box>
                        </div>
                      </Box>

                      <Divider sx={{ my: 2 }} />

                      <Grid container spacing={1.5}>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">
                            Department
                          </Typography>
                          <Typography variant="body2" fontWeight={700}>
                            {student.department?.code} - {student.department?.name}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">
                            Course & Class
                          </Typography>
                          <Typography variant="body2" fontWeight={700}>
                            {student.course?.code} ({student.class?.name || 'Class'})
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">
                            College Login Email
                          </Typography>
                          <Typography variant="body2" fontWeight={700} sx={{ color: '#14264B' }}>
                            {student.collegeEmail}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">
                            Section / Cohort
                          </Typography>
                          <Typography variant="body2" fontWeight={700}>
                            Section {student.section?.name || '—'}
                          </Typography>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Card elevation={0} sx={{ height: '100%', border: '1px solid #DCE6F5', borderRadius: 2 }}>
                    <CardContent sx={{ p: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                        <PictureAsPdfIcon sx={{ color: '#ef4444', fontSize: 26 }} />
                        <Typography variant="h6" fontWeight={700}>
                          Verified Placement Resume
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Official candidate placement resume submitted for campus placement drives.
                      </Typography>

                      {resumeActionError && (
                        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setResumeActionError(null)}>
                          {resumeActionError}
                        </Alert>
                      )}

                      {drilldownLoading ? (
                        <CircularProgress size={20} />
                      ) : drilldown?.resume?.exists ? (
                        <Box
                          sx={{
                            p: 2,
                            borderRadius: 2,
                            bgcolor: '#EDF2FF',
                            border: '1px solid #DCE6F5',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: 1.5,
                          }}
                        >
                          <div>
                            <Typography variant="subtitle2" fontWeight={700}>
                              {drilldown.resume.fileName || 'Verified_Resume.pdf'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {drilldown.resume.uploadedAt
                                ? `Uploaded: ${new Date(drilldown.resume.uploadedAt).toLocaleDateString()}`
                                : 'Verified File Ready'}
                            </Typography>
                          </div>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<VisibilityIcon fontSize="small" />}
                              onClick={handleViewResume}
                              disabled={viewingResume}
                            >
                              {viewingResume ? 'Loading...' : 'Preview'}
                            </Button>
                            <Button
                              size="small"
                              variant="contained"
                              startIcon={<DownloadIcon fontSize="small" />}
                              onClick={handleDownloadResume}
                              disabled={downloadingResume}
                              sx={{ bgcolor: '#0284c7' }}
                            >
                              {downloadingResume ? 'Downloading...' : 'Download'}
                            </Button>
                          </Box>
                        </Box>
                      ) : (
                        <Alert severity="info" variant="outlined">
                          No verified placement resume uploaded by candidate yet.
                        </Alert>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {/* Sequential Score Progress & Trajectory */}
              {progress?.canCompare && (
                <Card elevation={0} sx={{ border: '1px solid #DCE6F5', borderRadius: 2 }}>
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                      <TimelineIcon color="primary" />
                      <Typography variant="h6" fontWeight={700}>
                        Sequential Assessment Progress
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Deterministic comparison of the two most recent completed attempts.
                    </Typography>

                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={5}>
                        <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2 }}>
                          <Typography variant="caption" color="text.secondary" fontWeight={700}>
                            PREVIOUS TEST
                          </Typography>
                          <Typography variant="subtitle1" fontWeight={700}>
                            {progress.previousTest?.assessmentTitle}
                          </Typography>
                          <Typography variant="h5" fontWeight={800} color="text.primary" sx={{ mt: 0.5 }}>
                            {progress.previousTest?.score} / {progress.previousTest?.totalMarks} ({progress.previousTest?.percentage}%)
                          </Typography>
                        </Paper>
                      </Grid>

                      <Grid item xs={12} sm={2} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <Typography
                          variant="h6"
                          fontWeight={800}
                          color={progress.status === 'Improved' ? '#16a34a' : progress.status === 'Decreased' ? '#dc2626' : '#64748b'}
                        >
                          {progress.percentageChangeDisplay}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Trajectory
                        </Typography>
                      </Grid>

                      <Grid item xs={12} sm={5}>
                        <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f0fdf4', borderColor: '#bbf7d0', borderRadius: 2 }}>
                          <Typography variant="caption" color="#166534" fontWeight={700}>
                            LATEST TEST
                          </Typography>
                          <Typography variant="subtitle1" fontWeight={700}>
                            {progress.currentTest?.assessmentTitle}
                          </Typography>
                          <Typography variant="h5" fontWeight={800} color="#15803d" sx={{ mt: 0.5 }}>
                            {progress.currentTest?.score} / {progress.currentTest?.totalMarks} ({progress.currentTest?.percentage}%)
                          </Typography>
                        </Paper>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              )}
            </Box>
          )}

          {/* ================================================================= */}
          {/* TAB 1: PERSONAL DETAILS                                           */}
          {/* ================================================================= */}
          {activeTab === 1 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* 11 Metadata Attributes Master Card */}
              <Card elevation={0} sx={{ border: '1px solid #DCE6F5', borderRadius: 2 }}>
                <CardContent sx={{ p: 3.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h6" fontWeight={700} sx={{ color: '#14264B' }}>
                      Candidate Identity & Institution Records (11 Mandatory Fields)
                    </Typography>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<EditIcon fontSize="small" />}
                      onClick={() => setEditDialogOpen(true)}
                    >
                      Edit Profile
                    </Button>
                  </Box>

                  <Grid container spacing={2.5}>
                    <Grid item xs={12} sm={6} md={4}>
                      <Typography variant="caption" color="text.secondary">
                        1. Register Number
                      </Typography>
                      <Typography variant="body1" fontWeight={700} sx={{ fontFamily: 'monospace', color: 'primary.main' }}>
                        {student.registerNumber}
                      </Typography>
                    </Grid>

                    <Grid item xs={12} sm={6} md={4}>
                      <Typography variant="caption" color="text.secondary">
                        2. Student Full Name
                      </Typography>
                      <Typography variant="body1" fontWeight={700}>
                        {student.name}
                      </Typography>
                    </Grid>

                    <Grid item xs={12} sm={6} md={4}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                          3. College Email ID (Sole Login ID)
                        </Typography>
                        <Chip
                          label="Sole Login ID"
                          size="small"
                          color="primary"
                          sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700 }}
                        />
                      </Box>
                      <Typography variant="body1" fontWeight={700} sx={{ color: '#14264B' }}>
                        {student.collegeEmail}
                      </Typography>
                    </Grid>

                    <Grid item xs={12} sm={6} md={4}>
                      <Typography variant="caption" color="text.secondary">
                        4. Department
                      </Typography>
                      <Typography variant="body1" fontWeight={700}>
                        {student.department?.code} - {student.department?.name}
                      </Typography>
                    </Grid>

                    <Grid item xs={12} sm={6} md={4}>
                      <Typography variant="caption" color="text.secondary">
                        5. Course / Degree Program
                      </Typography>
                      <Typography variant="body1" fontWeight={700}>
                        {student.course?.code} - {student.course?.name}
                      </Typography>
                    </Grid>

                    <Grid item xs={12} sm={6} md={4}>
                      <Typography variant="caption" color="text.secondary">
                        6. Academic Class
                      </Typography>
                      <Typography variant="body1" fontWeight={700}>
                        {student.class?.name || 'Class Batch'} (Batch {student.class?.batchYear})
                      </Typography>
                    </Grid>

                    <Grid item xs={12} sm={6} md={4}>
                      <Typography variant="caption" color="text.secondary">
                        7. Section / Cohort
                      </Typography>
                      <Typography variant="body1" fontWeight={700}>
                        Section {student.section?.name || '—'}
                      </Typography>
                    </Grid>

                    <Grid item xs={12} sm={6} md={4}>
                      <Typography variant="caption" color="text.secondary">
                        8. Current Year
                      </Typography>
                      <Typography variant="body1" fontWeight={700}>
                        Year {student.year} (Semester {student.academicRecord?.currentSemester || student.year * 2 - 1})
                      </Typography>
                    </Grid>

                    <Grid item xs={12} sm={6} md={4}>
                      <Typography variant="caption" color="text.secondary">
                        9. Contact Phone Number
                      </Typography>
                      <Typography variant="body1" fontWeight={700}>
                        {student.phone || 'Not provided'}
                      </Typography>
                    </Grid>

                    <Grid item xs={12} sm={6} md={4}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                          10. Personal Email (Contact Only)
                        </Typography>
                        {student.personalEmail && (
                          <Chip
                            label={student.isPersonalEmailVerified ? 'Verified' : 'Unverified'}
                            size="small"
                            color={student.isPersonalEmailVerified ? 'success' : 'warning'}
                            sx={{ height: 18, fontSize: '0.65rem' }}
                          />
                        )}
                      </Box>
                      <Typography variant="body1" fontWeight={700}>
                        {student.personalEmail || 'Not provided'}
                      </Typography>
                    </Grid>

                    <Grid item xs={12} sm={6} md={4}>
                      <Typography variant="caption" color="text.secondary">
                        11. Current Cumulative CGPA
                      </Typography>
                      <Typography variant="h6" fontWeight={800} color="#0D9488">
                        {currentCgpaDisplay}
                      </Typography>
                    </Grid>

                    <Grid item xs={12} sm={6} md={4}>
                      <Typography variant="caption" color="text.secondary">
                        Date of Birth (DOB)
                      </Typography>
                      <Typography variant="body1" fontWeight={600}>
                        {student.dob || '—'}
                      </Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              {/* Personal Email Manager & Audit Log */}
              <Box sx={{ p: 2.5, borderRadius: 2, bgcolor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                <StudentPersonalEmailManager
                  studentId={student.id}
                  collegeEmail={student.collegeEmail}
                  personalEmail={student.personalEmail}
                  isPersonalEmailVerified={student.isPersonalEmailVerified}
                  onUpdated={(newEmail, isVerified) => {
                    setStudent((prev) =>
                      prev
                        ? {
                            ...prev,
                            personalEmail: newEmail,
                            isPersonalEmailVerified: isVerified,
                          }
                        : prev
                    );
                  }}
                />
              </Box>

              {/* Student Skills & Competencies */}
              <StudentSkillsCard studentId={student.id} readOnly={false} />
            </Box>
          )}

          {/* ================================================================= */}
          {/* TAB 2: ACADEMIC RECORDS                                           */}
          {/* ================================================================= */}
          {activeTab === 2 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <StudentAcademicRecordsSection
                studentId={student.id}
                studentRegisterNumber={student.registerNumber}
                initialRecord={student.academicRecord || null}
                onRecordUpdated={fetchStudent}
              />
            </Box>
          )}

          {/* ================================================================= */}
          {/* TAB 3: SEMESTER RESULTS                                           */}
          {/* ================================================================= */}
          {activeTab === 3 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* University Grading Formula Explanation Card */}
              <Alert severity="info" sx={{ borderRadius: 2 }}>
                <Typography variant="subtitle2" fontWeight={700}>
                  University Grading Rules & Semester Calculation
                </Typography>
                <Typography variant="body2">
                  Overall Cumulative Grade Point Average (CGPA) is calculated strictly by university grading rules based on completed semester SGPAs:
                  <strong> Overall CGPA = (Sum of completed semester SGPAs × Credits) / Total Completed Credits</strong> (or arithmetic mean of completed semester SGPAs, rounded to 2 decimal places). Marksheet uploads are strictly optional.
                </Typography>
              </Alert>

              {/* Semesters 1 to 8 Table */}
              <Card elevation={0} sx={{ border: '1px solid #DCE6F5', borderRadius: 2 }}>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" fontWeight={700}>
                      Semesters 1 to 8 Results
                    </Typography>
                    <Chip
                      label={`Current: Semester ${student.academicRecord?.currentSemester || 1}`}
                      color="primary"
                      sx={{ fontWeight: 700 }}
                    />
                  </Box>

                  <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                    <Table size="small">
                      <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700 }}>Semester</TableCell>
                          <TableCell sx={{ fontWeight: 700 }} align="center">SGPA</TableCell>
                          <TableCell sx={{ fontWeight: 700 }} align="center">Cumulative CGPA</TableCell>
                          <TableCell sx={{ fontWeight: 700 }} align="center">Total Credits</TableCell>
                          <TableCell sx={{ fontWeight: 700 }} align="center">Credits Earned</TableCell>
                          <TableCell sx={{ fontWeight: 700 }} align="center">Backlogs</TableCell>
                          <TableCell sx={{ fontWeight: 700 }} align="center">Marksheet Document</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {Array.from({ length: 8 }, (_, i) => {
                          const semNum = i + 1;
                          const sem = student.academicRecord?.semesters?.find(
                            (s: any) => s.semesterNumber === semNum
                          );
                          const isCurrent = (student.academicRecord?.currentSemester || 1) === semNum;

                          return (
                            <TableRow key={semNum} hover sx={{ bgcolor: isCurrent ? '#f0f9ff' : undefined }}>
                              <TableCell sx={{ fontWeight: 700 }}>
                                Semester {semNum}
                                {isCurrent && (
                                  <Chip label="Current" size="small" color="info" sx={{ ml: 1, height: 20 }} />
                                )}
                              </TableCell>
                              <TableCell align="center" sx={{ fontWeight: 700 }}>
                                {sem?.sgpa != null ? Number(sem.sgpa).toFixed(2) : '—'}
                              </TableCell>
                              <TableCell align="center">
                                {sem?.cgpa != null ? Number(sem.cgpa).toFixed(2) : '—'}
                              </TableCell>
                              <TableCell align="center">{sem?.totalCredits ?? 24}</TableCell>
                              <TableCell align="center">{sem?.creditsEarned ?? 24}</TableCell>
                              <TableCell align="center">
                                <Typography
                                  variant="body2"
                                  color={sem?.backlogsCount && sem.backlogsCount > 0 ? 'error.main' : 'text.secondary'}
                                  fontWeight={sem?.backlogsCount && sem.backlogsCount > 0 ? 700 : 400}
                                >
                                  {sem?.backlogsCount || 0}
                                </Typography>
                              </TableCell>
                              <TableCell align="center">
                                {sem?.hasMarksheet ? (
                                  <Chip
                                    icon={<CheckCircleIcon />}
                                    label="Uploaded"
                                    size="small"
                                    color="success"
                                  />
                                ) : (
                                  <Typography variant="caption" color="text.secondary">
                                    Optional (Not Uploaded)
                                  </Typography>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Box>
          )}

          {/* ================================================================= */}
          {/* TAB 4: ASSESSMENT HISTORY                                         */}
          {/* ================================================================= */}
          {activeTab === 4 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Card elevation={0} sx={{ border: '1px solid #DCE6F5', borderRadius: 2 }}>
                <CardContent sx={{ p: 3.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <AssessmentIcon color="primary" sx={{ fontSize: 26 }} />
                      <Typography variant="h6" fontWeight={700}>
                        Complete Assessment History ({drilldown?.assessmentHistory?.length || 0})
                      </Typography>
                    </Box>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
                    Chronological list of all assessment attempts with category breakdown, status, scores, and pass/fail indicators.
                  </Typography>

                  {drilldownLoading ? (
                    <Box sx={{ py: 3, textAlign: 'center' }}>
                      <CircularProgress size={24} />
                    </Box>
                  ) : !drilldown?.assessmentHistory || drilldown.assessmentHistory.length === 0 ? (
                    <Alert severity="info" variant="outlined">
                      No assessment attempts recorded for this candidate yet.
                    </Alert>
                  ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {drilldown.assessmentHistory.map((item) => (
                        <Paper
                          key={item.id}
                          variant="outlined"
                          sx={{ p: 2.5, borderRadius: 2, bgcolor: '#ffffff' }}
                        >
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5 }}>
                            <div>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="subtitle1" fontWeight={700}>
                                  {item.assessmentTitle}
                                </Typography>
                                <Chip
                                  label={item.assessmentType || 'ASSESSMENT'}
                                  size="small"
                                  variant="outlined"
                                  sx={{ fontSize: '0.7rem' }}
                                />
                              </Box>
                              <Typography variant="caption" color="text.secondary">
                                Date: {new Date(item.createdAt).toLocaleDateString()}
                                {item.timeTakenMinutes ? ` • Duration: ${item.timeTakenMinutes} mins` : ''}
                              </Typography>
                            </div>

                            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                              <Typography variant="h6" fontWeight={800} color="text.primary">
                                {item.obtainedMarks} / {item.totalMarks} ({item.percentage}%)
                              </Typography>
                              <Chip
                                icon={item.isPassed ? <CheckCircleOutlineIcon /> : <CancelOutlinedIcon />}
                                label={item.isPassed ? 'PASS' : 'FAIL'}
                                size="small"
                                color={item.isPassed ? 'success' : 'error'}
                                sx={{ fontWeight: 700 }}
                              />
                              <Chip
                                label={item.attemptStatus || 'COMPLETED'}
                                size="small"
                                variant="outlined"
                                color="primary"
                              />
                            </Box>
                          </Box>

                          {/* Category-Wise Performance Breakdown */}
                          {item.categoryBreakdown && item.categoryBreakdown.length > 0 && (
                            <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #f1f5f9' }}>
                              <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ display: 'block', mb: 1 }}>
                                SECTION / CATEGORY PERFORMANCE BREAKDOWN:
                              </Typography>
                              <Grid container spacing={1.5}>
                                {item.categoryBreakdown.map((cat, idx) => (
                                  <Grid item xs={12} sm={4} key={idx}>
                                    <Box sx={{ p: 1.5, borderRadius: 1.5, bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                                      <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                        {cat.category}
                                      </Typography>
                                      <Typography variant="body2" fontWeight={700}>
                                        {cat.score} / {cat.maxScore} ({cat.percentage}%)
                                      </Typography>
                                    </Box>
                                  </Grid>
                                ))}
                              </Grid>
                            </Box>
                          )}
                        </Paper>
                      ))}
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Box>
          )}

          {/* ================================================================= */}
          {/* TAB 5: MALPRACTICE HISTORY                                        */}
          {/* ================================================================= */}
          {activeTab === 5 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* Telemetry Notice */}
              <Alert severity="info" sx={{ borderRadius: 2 }}>
                <Typography variant="subtitle2" fontWeight={700}>
                  Objective Browser Event Telemetry
                </Typography>
                <Typography variant="body2">
                  Proctoring history is recorded transparently from client browser window events (focus loss, tab switching, fullscreen exits, camera connectivity interruptions, and system warnings). The system only logs verified browser state events without making unverified external claims.
                </Typography>
              </Alert>

              <Card elevation={0} sx={{ border: '1px solid #DCE6F5', borderRadius: 2 }}>
                <CardContent sx={{ p: 3.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                    <SecurityIcon color="error" sx={{ fontSize: 26 }} />
                    <Typography variant="h6" fontWeight={700}>
                      Proctoring & Malpractice Event Log
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
                    Recorded chronological security warnings and suspicious activity triggers.
                  </Typography>

                  {drilldownLoading ? (
                    <Box sx={{ py: 3, textAlign: 'center' }}>
                      <CircularProgress size={24} />
                    </Box>
                  ) : !drilldown?.malpracticeHistory || drilldown.malpracticeHistory.length === 0 ? (
                    <Alert severity="success" variant="outlined">
                      Clean Proctoring Record: Zero malpractice or security warnings recorded for this candidate.
                    </Alert>
                  ) : (
                    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                      <Table size="small">
                        <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 700 }}>Timestamp</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Assessment Context</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Event Type</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Severity</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Event Details</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {drilldown.malpracticeHistory.map((evt) => (
                            <TableRow key={evt.id} hover>
                              <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                                {new Date(evt.timestamp).toLocaleString()}
                              </TableCell>
                              <TableCell sx={{ fontWeight: 600 }}>{evt.assessmentName}</TableCell>
                              <TableCell>
                                <Chip
                                  icon={
                                    evt.violationType === 'MOBILE_PHONE_DETECTED' ? (
                                      <SmartphoneIcon sx={{ fontSize: 16 }} />
                                    ) : evt.violationType === 'MULTIPLE_PERSONS_DETECTED' ? (
                                      <PeopleIcon sx={{ fontSize: 16 }} />
                                    ) : evt.violationType === 'FACE_NOT_VISIBLE' ? (
                                      <PersonOffIcon sx={{ fontSize: 16 }} />
                                    ) : evt.violationType === 'CAMERA_DISCONNECTED' ? (
                                      <VideocamOffIcon sx={{ fontSize: 16 }} />
                                    ) : undefined
                                  }
                                  label={evt.displayType}
                                  size="small"
                                  variant="outlined"
                                  color={
                                    evt.violationType === 'MOBILE_PHONE_DETECTED' ||
                                    evt.violationType === 'MULTIPLE_PERSONS_DETECTED' ||
                                    evt.violationType === 'FACE_NOT_VISIBLE' ||
                                    evt.violationType === 'CAMERA_DISCONNECTED'
                                      ? 'error'
                                      : 'default'
                                  }
                                  sx={{ fontWeight: 600 }}
                                />
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={evt.severity}
                                  size="small"
                                  color={
                                    evt.severity === 'CRITICAL'
                                      ? 'error'
                                      : evt.severity === 'HIGH'
                                      ? 'error'
                                      : evt.severity === 'MEDIUM'
                                      ? 'warning'
                                      : 'default'
                                  }
                                  sx={{ fontWeight: 700 }}
                                />
                              </TableCell>
                              <TableCell>{evt.details}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </CardContent>
              </Card>
            </Box>
          )}

          {/* ================================================================= */}
          {/* TAB 6: IMPROVEMENT RECOMMENDATIONS                                */}
          {/* ================================================================= */}
          {activeTab === 6 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* Important Advisory Disclaimer */}
              <Alert severity="info" sx={{ borderRadius: 2 }}>
                <Typography variant="subtitle2" fontWeight={700}>
                  Advisory Recommendations Disclaimer
                </Typography>
                <Typography variant="body2">
                  {drilldown?.recommendations?.disclaimer ||
                    'Advisory Notice: Improvement recommendations are strictly analytical and advisory guidance derived from assessment accuracy metrics. They do not alter candidate marks, evaluation results, or proctoring logs.'}
                </Typography>
              </Alert>

              <Grid container spacing={3}>
                {/* Weak Topics */}
                <Grid item xs={12} md={6}>
                  <Card elevation={0} sx={{ height: '100%', border: '1px solid #fecaca', borderRadius: 2, bgcolor: '#fffafa' }}>
                    <CardContent sx={{ p: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                        <WarningAmberIcon color="error" />
                        <Typography variant="h6" fontWeight={700} color="#b91c1c">
                          Focus Improvement Topics (&lt;60% Accuracy)
                        </Typography>
                      </Box>

                      {drilldown?.recommendations?.weakTopics && drilldown.recommendations.weakTopics.length > 0 ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          {drilldown.recommendations.weakTopics.map((topic, idx) => (
                            <Paper key={idx} variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: '#ffffff' }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                                <Typography variant="subtitle2" fontWeight={700}>
                                  {topic.displayName}
                                </Typography>
                                <Chip
                                  label={`${topic.accuracy}% Accuracy`}
                                  size="small"
                                  color="error"
                                  sx={{ fontWeight: 700 }}
                                />
                              </Box>
                              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                                Category: {topic.category} • Attempted: {topic.attemptedCount} questions
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                <strong>Targeted Action:</strong> {topic.recommendation}
                              </Typography>
                            </Paper>
                          ))}
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          No severe weak areas identified. Candidate demonstrates healthy baseline proficiency.
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Grid>

                {/* Strong Areas */}
                <Grid item xs={12} md={6}>
                  <Card elevation={0} sx={{ height: '100%', border: '1px solid #bbf7d0', borderRadius: 2, bgcolor: '#f0fdf4' }}>
                    <CardContent sx={{ p: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                        <CheckCircleIcon color="success" />
                        <Typography variant="h6" fontWeight={700} color="#15803d">
                          Mastered Core Strengths (&ge;75% Accuracy)
                        </Typography>
                      </Box>

                      {drilldown?.recommendations?.strongAreas && drilldown.recommendations.strongAreas.length > 0 ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          {drilldown.recommendations.strongAreas.map((topic, idx) => (
                            <Paper key={idx} variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: '#ffffff' }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                                <Typography variant="subtitle2" fontWeight={700}>
                                  {topic.displayName}
                                </Typography>
                                <Chip
                                  label={`${topic.accuracy}% Accuracy`}
                                  size="small"
                                  color="success"
                                  sx={{ fontWeight: 700 }}
                                />
                              </Box>
                              <Typography variant="caption" color="text.secondary" display="block">
                                Category: {topic.category} • Correct: {topic.correctCount} / {topic.attemptedCount}
                              </Typography>
                            </Paper>
                          ))}
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          Complete further assessments to establish established strong domains.
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {/* Actionable Placement Preparation Activities */}
              <Card elevation={0} sx={{ border: '1px solid #DCE6F5', borderRadius: 2 }}>
                <CardContent sx={{ p: 3.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                    <AutoAwesomeIcon color="primary" />
                    <Typography variant="h6" fontWeight={700}>
                      Actionable Placement Preparation Roadmaps
                    </Typography>
                  </Box>

                  {drilldown?.recommendations?.recommendedActivities &&
                  drilldown.recommendations.recommendedActivities.length > 0 ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                      {drilldown.recommendations.recommendedActivities.map((act, idx) => (
                        <Box
                          key={idx}
                          sx={{
                            p: 2,
                            borderRadius: 2,
                            bgcolor: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.5,
                          }}
                        >
                          <Typography variant="body2" fontWeight={700} color="primary.main">
                            #{idx + 1}
                          </Typography>
                          <Typography variant="body2" fontWeight={600} color="#1e293b">
                            {act}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Standard placement training curriculum recommended.
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Box>
          )}
        </>
      ) : null}

      {/* Edit Profile Modal */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: '#ffffff',
            border: '1px solid #DCE6F5',
            borderRadius: 2.5,
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
          },
        }}
      >
        <form onSubmit={handleUpdate}>
          <DialogTitle sx={{ color: '#14264B', fontWeight: 700, borderBottom: '1px solid #DCE6F5', pb: 2 }}>
            Edit Candidate Profile
          </DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 2.5 }}>
            <TextField
              label="Student Full Name"
              required
              fullWidth
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
            />
            <TextField
              label="Personal Email Address"
              type="email"
              fullWidth
              value={editForm.personalEmail}
              onChange={(e) => setEditForm({ ...editForm, personalEmail: e.target.value })}
              helperText="Candidate personal contact only (does not change login ID)"
            />
            <TextField
              label="Phone Number"
              fullWidth
              value={editForm.phone}
              onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
            />
            <TextField
              label="Date of Birth (DOB)"
              fullWidth
              value={editForm.dob}
              onChange={(e) => setEditForm({ ...editForm, dob: e.target.value })}
              placeholder="DD-MM-YYYY"
            />
            <TextField
              label="Cumulative CGPA"
              type="number"
              fullWidth
              inputProps={{ min: 0, max: 10, step: 0.01 }}
              value={editForm.cgpa}
              onChange={(e) => setEditForm({ ...editForm, cgpa: Number(e.target.value) })}
            />
            <TextField
              select
              label="Account Status"
              required
              fullWidth
              value={editForm.status}
              onChange={(e) => setEditForm({ ...editForm, status: e.target.value as StudentStatus })}
            >
              <MenuItem value="ACTIVE">ACTIVE</MenuItem>
              <MenuItem value="PLACED">PLACED</MenuItem>
              <MenuItem value="INACTIVE">INACTIVE</MenuItem>
              <MenuItem value="BLOCKED">BLOCKED</MenuItem>
            </TextField>
          </DialogContent>
          <DialogActions sx={{ p: 2.5 }}>
            <Button onClick={() => setEditDialogOpen(false)} color="inherit">
              Cancel
            </Button>
            <Button type="submit" variant="contained" color="primary" disabled={saving}>
              {saving ? <CircularProgress size={20} color="inherit" /> : 'Save Changes'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Bulk Academic Import Dialog */}
      <AcademicBulkImportDialog
        open={academicImportDialogOpen}
        onClose={() => setAcademicImportDialogOpen(false)}
        onSuccess={() => {
          fetchStudent();
          refetchDrilldown();
        }}
      />
    </Box>
  );
};
