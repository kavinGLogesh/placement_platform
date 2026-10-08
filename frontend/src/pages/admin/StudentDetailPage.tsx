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
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import SchoolIcon from '@mui/icons-material/School';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import BusinessIcon from '@mui/icons-material/Business';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import ClassIcon from '@mui/icons-material/Class';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import GradeIcon from '@mui/icons-material/Grade';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DownloadIcon from '@mui/icons-material/Download';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import HorizontalRuleIcon from '@mui/icons-material/HorizontalRule';
import AssessmentIcon from '@mui/icons-material/Assessment';
import TimelineIcon from '@mui/icons-material/Timeline';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import LaunchIcon from '@mui/icons-material/Launch';
import GroupsIcon from '@mui/icons-material/Groups';

import { managementService } from '../../services/management.service.js';
import { analyticsService } from '../../services/analytics.service.js';
import { Student, StudentStatus } from '../../types/management.types.js';

export const StudentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Resume Action State
  const [downloadingResume, setDownloadingResume] = useState(false);
  const [viewingResume, setViewingResume] = useState(false);
  const [resumeActionError, setResumeActionError] = useState<string | null>(null);

  // Edit Dialog State
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    cgpa: 8.0,
    status: 'ACTIVE' as StudentStatus,
  });

  const fetchStudent = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await managementService.getStudentById(id);
      setStudent(data);
      setEditForm({
        name: data.name,
        phone: data.phone || '',
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

  // Fetch Student Performance Drilldown & Resume Metadata
  const { data: drilldown, isLoading: drilldownLoading } = useQuery({
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
        phone: editForm.phone,
        cgpa: Number(editForm.cgpa),
        status: editForm.status,
      });
      setStudent(updated);
      setEditDialogOpen(false);
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

  // Safe Resume Download Handler
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
        `${student?.registerNumber || 'Student'}_Resume.pdf`;
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

  const progress = drilldown?.performanceProgress;

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
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

        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
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
              Full Analytics Drilldown
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
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Identity & Hierarchy Placement Cards */}
          <Grid container spacing={3}>
            {/* Identity & Basic Details */}
            <Grid item xs={12} md={5}>
              <Card elevation={0} sx={{ height: '100%', border: '1px solid #DCE6F5', borderRadius: '8px', bgcolor: '#ffffff' }}>
                <CardContent sx={{ p: 3.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
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
                      <Chip
                        label={student.registerNumber}
                        size="small"
                        color="primary"
                        sx={{ fontFamily: 'monospace', fontWeight: 700, mt: 0.5 }}
                      />
                    </div>
                  </Box>

                  <Divider sx={{ my: 2, borderColor: '#DCE6F5' }} />

                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <EmailIcon sx={{ color: 'secondary.light', fontSize: 20 }} />
                      <div>
                        <Typography variant="caption" color="text.secondary">
                          College Email
                        </Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {student.collegeEmail}
                        </Typography>
                      </div>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <PhoneIcon sx={{ color: 'warning.light', fontSize: 20 }} />
                      <div>
                        <Typography variant="caption" color="text.secondary">
                          Phone Number
                        </Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {student.phone || 'Not provided'}
                        </Typography>
                      </div>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <CheckCircleIcon sx={{ color: 'success.light', fontSize: 20 }} />
                      <div>
                        <Typography variant="caption" color="text.secondary">
                          Placement Account Status
                        </Typography>
                        <div>
                          <Chip
                            label={student.status}
                            size="small"
                            color={
                              student.status === 'ACTIVE'
                                ? 'success'
                                : student.status === 'PLACED'
                                ? 'secondary'
                                : student.status === 'BLOCKED'
                                ? 'error'
                                : 'default'
                            }
                            sx={{ fontWeight: 700, mt: 0.5 }}
                          />
                        </div>
                      </div>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <GradeIcon sx={{ color: 'warning.main', fontSize: 20 }} />
                      <div>
                        <Typography variant="caption" color="text.secondary">
                          Cumulative CGPA
                        </Typography>
                        <Typography variant="h6" fontWeight={800} color="#b45309">
                          {student.cgpa !== null && student.cgpa !== undefined ? Number(student.cgpa).toFixed(2) : 'N/A'}
                        </Typography>
                      </div>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Hierarchy Placement & Academic Progress */}
            <Grid item xs={12} md={7}>
              <Card sx={{ height: '100%' }}>
                <CardContent sx={{ p: 4 }}>
                  <Typography variant="h6" fontWeight={700} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <BusinessIcon sx={{ color: 'primary.light' }} /> Academic Hierarchy Placement
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Strict 6-tier institutional mapping verifying student cohort association.
                  </Typography>

                  <Grid container spacing={3}>
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ p: 2, borderRadius: 2, bgcolor: '#EDF2FF', border: '1px solid #DCE6F5' }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <BusinessIcon fontSize="inherit" /> Department
                        </Typography>
                        <Typography variant="body1" fontWeight={700} color="primary.main">
                          {student.department?.code}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {student.department?.name}
                        </Typography>
                      </Box>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <Box sx={{ p: 2, borderRadius: 2, bgcolor: '#EDF2FF', border: '1px solid #DCE6F5' }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <MenuBookIcon fontSize="inherit" /> Degree Course
                        </Typography>
                        <Typography variant="body1" fontWeight={700} color="secondary.main">
                          {student.course?.code}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {student.course?.name}
                        </Typography>
                      </Box>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <Box sx={{ p: 2, borderRadius: 2, bgcolor: '#EDF2FF', border: '1px solid #DCE6F5' }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <ClassIcon fontSize="inherit" /> Academic Class
                        </Typography>
                        <Typography variant="body1" fontWeight={700} color="text.primary">
                          {student.class?.name || '—'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Year {student.year} • Batch {student.class?.batchYear}
                        </Typography>
                      </Box>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <Box sx={{ p: 2, borderRadius: 2, bgcolor: '#EDF2FF', border: '1px solid #DCE6F5' }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <ViewModuleIcon fontSize="inherit" /> Section
                        </Typography>
                        <Typography variant="body1" fontWeight={700} color="success.main">
                          Section {student.section?.name || '—'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Assigned Cohort Group
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>

                  <Divider sx={{ my: 3, borderColor: '#DCE6F5' }} />

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      Registered: {new Date(student.createdAt).toLocaleDateString()}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Last Profile Update: {new Date(student.updatedAt).toLocaleDateString()}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* ================================================================= */}
          {/* SECTION: VERIFIED PLACEMENT RESUME                                */}
          {/* ================================================================= */}
          <Card sx={{ border: '1px solid #DCE6F5' }}>
            <CardContent sx={{ p: 3.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                <PictureAsPdfIcon sx={{ color: '#ef4444', fontSize: 26 }} />
                <Typography variant="h6" fontWeight={700}>
                  Verified Placement Resume
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Official candidate resume uploaded to the placement portal for campus recruitment drives.
              </Typography>

              {resumeActionError && (
                <Alert severity="error" sx={{ mb: 2.5 }} onClose={() => setResumeActionError(null)}>
                  {resumeActionError}
                </Alert>
              )}

              {drilldownLoading ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2 }}>
                  <CircularProgress size={24} />
                  <Typography variant="body2" color="text.secondary">Loading resume details...</Typography>
                </Box>
              ) : drilldown?.resume?.exists ? (
                <Box
                  sx={{
                    p: 2.5,
                    borderRadius: 2.5,
                    bgcolor: '#EDF2FF',
                    border: '1px solid #DCE6F5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 2,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: 2,
                        bgcolor: 'rgba(239, 68, 68, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <PictureAsPdfIcon sx={{ color: '#ef4444', fontSize: 28 }} />
                    </Box>
                    <div>
                      <Typography variant="subtitle1" fontWeight={700} color="text.primary">
                        {drilldown.resume.fileName || `${student.registerNumber}_Resume.pdf`}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {drilldown.resume.uploadedAt
                          ? `Uploaded: ${new Date(drilldown.resume.uploadedAt).toLocaleDateString()}`
                          : 'Uploaded to platform'}{' '}
                        • {drilldown.resume.fileSize || 'PDF Document'}
                      </Typography>
                    </div>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                    <Chip
                      icon={<CheckCircleIcon />}
                      label={drilldown.resume.status || 'Verified'}
                      size="small"
                      color={drilldown.resume.status === 'VERIFIED' ? 'success' : 'warning'}
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
            </CardContent>
          </Card>

          {/* ================================================================= */}
          {/* SECTION: STUDENT PERFORMANCE PROGRESS                             */}
          {/* ================================================================= */}
          <Card sx={{ border: '1px solid #DCE6F5' }}>
            <CardContent sx={{ p: 3.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <TimelineIcon color="primary" sx={{ fontSize: 26 }} />
                  <Typography variant="h6" fontWeight={700}>
                    Student Performance Progress
                  </Typography>
                </Box>

                {progress?.canCompare && (
                  <Chip
                    label={`Performance Status: ${progress.status}`}
                    color={
                      progress.status === 'Improved'
                        ? 'success'
                        : progress.status === 'Decreased'
                        ? 'error'
                        : 'default'
                    }
                    sx={{ fontWeight: 700 }}
                  />
                )}
              </Box>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Chronological assessment score trajectory comparing the latest completed assessment against the immediately previous test.
              </Typography>

              {drilldownLoading ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 3 }}>
                  <CircularProgress size={24} />
                  <Typography variant="body2" color="text.secondary">Calculating performance progress...</Typography>
                </Box>
              ) : !progress || !progress.hasCompletedAssessments ? (
                <Alert severity="info" variant="outlined">
                  No completed assessment data available.
                </Alert>
              ) : !progress.canCompare ? (
                <Box>
                  <Alert severity="info" variant="outlined" sx={{ mb: 2.5 }}>
                    {progress.statusMessage || 'Previous assessment comparison is not available.'}
                  </Alert>

                  {progress.currentTest && (
                    <Box sx={{ p: 2.5, borderRadius: 2.5, bgcolor: '#EDF2FF', border: '1px solid #DCE6F5', maxWidth: 420 }}>
                      <Typography variant="overline" color="primary.main" fontWeight={700}>
                        Latest Completed Assessment
                      </Typography>
                      <Typography variant="subtitle1" fontWeight={700}>
                        {progress.currentTest.assessmentTitle}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                        Completed on {new Date(progress.currentTest.date).toLocaleDateString()}
                      </Typography>
                      <Typography variant="h4" fontWeight={800} color="primary.main">
                        {progress.currentTest.score} / {progress.currentTest.totalMarks}
                      </Typography>
                      <Typography variant="body2" fontWeight={600} color="text.secondary">
                        Overall: {progress.currentTest.percentage}%
                      </Typography>
                    </Box>
                  )}
                </Box>
              ) : (
                <Box>
                  {/* Side-by-Side Test Comparison Cards */}
                  <Grid container spacing={3} sx={{ mb: 3 }}>
                    {/* Previous Test */}
                    <Grid item xs={12} md={5}>
                      <Box
                        sx={{
                          p: 3,
                          borderRadius: 2.5,
                          bgcolor: '#EDF2FF',
                          border: '1px solid #DCE6F5',
                          height: '100%',
                        }}
                      >
                        <Typography variant="overline" color="text.secondary" fontWeight={700} letterSpacing={1}>
                          Previous Assessment
                        </Typography>
                        <Typography variant="h6" fontWeight={700} sx={{ mt: 0.5 }}>
                          {progress.previousTest?.assessmentTitle}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                          Completed: {progress.previousTest?.date ? new Date(progress.previousTest.date).toLocaleDateString() : '—'}
                        </Typography>

                        <Divider sx={{ my: 1.5 }} />

                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                          <div>
                            <Typography variant="caption" color="text.secondary">
                              Awarded Marks
                            </Typography>
                            <Typography variant="h4" fontWeight={800} color="text.primary">
                              {progress.previousTest?.score} / {progress.previousTest?.totalMarks}
                            </Typography>
                          </div>
                          <div>
                            <Typography variant="caption" color="text.secondary">
                              Percentage
                            </Typography>
                            <Typography variant="h5" fontWeight={700} color="text.secondary">
                              {progress.previousTest?.percentage}%
                            </Typography>
                          </div>
                        </Box>
                      </Box>
                    </Grid>

                    {/* Progress Indicator & Trend */}
                    <Grid item xs={12} md={2} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <Box
                        sx={{
                          width: 56,
                          height: 56,
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor:
                            progress.status === 'Improved'
                              ? 'rgba(16, 185, 129, 0.12)'
                              : progress.status === 'Decreased'
                              ? 'rgba(239, 68, 68, 0.12)'
                              : 'rgba(100, 116, 139, 0.12)',
                          mb: 1.5,
                        }}
                      >
                        {progress.status === 'Improved' ? (
                          <TrendingUpIcon sx={{ color: '#10b981', fontSize: 32 }} />
                        ) : progress.status === 'Decreased' ? (
                          <TrendingDownIcon sx={{ color: '#ef4444', fontSize: 32 }} />
                        ) : (
                          <HorizontalRuleIcon sx={{ color: '#7182A0', fontSize: 32 }} />
                        )}
                      </Box>

                      <Typography
                        variant="h6"
                        fontWeight={800}
                        sx={{
                          color:
                            progress.status === 'Improved'
                              ? '#10b981'
                              : progress.status === 'Decreased'
                              ? '#ef4444'
                              : '#7182A0',
                          textAlign: 'center',
                        }}
                      >
                        {progress.status === 'Improved'
                          ? `↑ Improved by ${progress.percentageChange ? Math.abs(progress.percentageChange).toFixed(2) + '%' : progress.percentageChangeDisplay}`
                          : progress.status === 'Decreased'
                          ? `↓ Decreased by ${progress.percentageChange ? Math.abs(progress.percentageChange).toFixed(2) + '%' : progress.percentageChangeDisplay}`
                          : progress.percentageChangeDisplay}
                      </Typography>

                      <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', mt: 0.5 }}>
                        Score Change: {progress.scoreChange !== undefined && progress.scoreChange > 0 ? `+${progress.scoreChange}` : progress.scoreChange} marks
                      </Typography>
                    </Grid>

                    {/* Current Test */}
                    <Grid item xs={12} md={5}>
                      <Box
                        sx={{
                          p: 3,
                          borderRadius: 2.5,
                          bgcolor: '#f0fdf4',
                          border: '1px solid #bbf7d0',
                          height: '100%',
                        }}
                      >
                        <Typography variant="overline" color="success.main" fontWeight={700} letterSpacing={1}>
                          Current Assessment (Latest)
                        </Typography>
                        <Typography variant="h6" fontWeight={700} sx={{ mt: 0.5 }}>
                          {progress.currentTest?.assessmentTitle}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                          Completed: {progress.currentTest?.date ? new Date(progress.currentTest.date).toLocaleDateString() : '—'}
                        </Typography>

                        <Divider sx={{ my: 1.5 }} />

                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                          <div>
                            <Typography variant="caption" color="text.secondary">
                              Awarded Marks
                            </Typography>
                            <Typography variant="h4" fontWeight={800} color="success.main">
                              {progress.currentTest?.score} / {progress.currentTest?.totalMarks}
                            </Typography>
                          </div>
                          <div>
                            <Typography variant="caption" color="text.secondary">
                              Percentage
                            </Typography>
                            <Typography variant="h5" fontWeight={700} color="success.dark">
                              {progress.currentTest?.percentage}%
                            </Typography>
                          </div>
                        </Box>
                      </Box>
                    </Grid>
                  </Grid>
                </Box>
              )}
            </CardContent>
          </Card>

          {/* ================================================================= */}
          {/* SECTION: CATEGORY / PERFORMANCE COMPARISON                        */}
          {/* ================================================================= */}
          {progress?.canCompare && (
            <Card sx={{ border: '1px solid #DCE6F5' }}>
              <CardContent sx={{ p: 3.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                  <CompareArrowsIcon color="primary" sx={{ fontSize: 26 }} />
                  <Typography variant="h6" fontWeight={700}>
                    Performance Comparison
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
                  Deterministic category-level score comparison calculated from actual completed attempt answers.
                </Typography>

                {progress.categoryComparison && progress.categoryComparison.length > 0 ? (
                  <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                    <Table size="small">
                      <TableHead sx={{ bgcolor: '#EDF2FF' }}>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700 }}>Assessment Category</TableCell>
                          <TableCell sx={{ fontWeight: 700 }} align="right">Previous Score</TableCell>
                          <TableCell sx={{ fontWeight: 700 }} align="right">Current Score</TableCell>
                          <TableCell sx={{ fontWeight: 700 }} align="right">Score Change</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {progress.categoryComparison.map((cat) => (
                          <TableRow key={cat.category} hover>
                            <TableCell sx={{ fontWeight: 600 }}>{cat.displayName}</TableCell>
                            <TableCell align="right">{cat.previousScore}</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 600 }}>{cat.currentScore}</TableCell>
                            <TableCell align="right">
                              <Chip
                                label={cat.change > 0 ? `+${cat.change}` : `${cat.change}`}
                                size="small"
                                color={cat.change > 0 ? 'success' : cat.change < 0 ? 'error' : 'default'}
                                sx={{ fontWeight: 700, minWidth: 50 }}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Alert severity="info" variant="outlined">
                    Category-level breakdown is not available for these assessments.
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}

          {/* ================================================================= */}
          {/* SECTION: ASSESSMENT HISTORY                                       */}
          {/* ================================================================= */}
          <Card sx={{ border: '1px solid #DCE6F5' }}>
            <CardContent sx={{ p: 3.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <AssessmentIcon color="primary" sx={{ fontSize: 26 }} />
                  <Typography variant="h6" fontWeight={700}>
                    Complete Assessment History ({drilldown?.assessmentHistory?.length || 0})
                  </Typography>
                </Box>
                {student && (
                  <Button
                    size="small"
                    variant="text"
                    endIcon={<LaunchIcon />}
                    onClick={() => navigate(`/admin/students/${student.id}/performance`)}
                  >
                    View Analytics Drilldown
                  </Button>
                )}
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
                Chronological list of all completed assessments, ordered latest first.
              </Typography>

              {drilldownLoading ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 3 }}>
                  <CircularProgress size={24} />
                  <Typography variant="body2" color="text.secondary">Loading assessment records...</Typography>
                </Box>
              ) : drilldown?.assessmentHistory && drilldown.assessmentHistory.length > 0 ? (
                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: '#EDF2FF' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>Assessment</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                        <TableCell sx={{ fontWeight: 700 }} align="right">Score</TableCell>
                        <TableCell sx={{ fontWeight: 700 }} align="right">Percentage</TableCell>
                        <TableCell sx={{ fontWeight: 700 }} align="center">Result</TableCell>
                        <TableCell sx={{ fontWeight: 700 }} align="center">Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {drilldown.assessmentHistory.map((item) => (
                        <TableRow key={item.id} hover>
                          <TableCell sx={{ fontWeight: 600 }}>{item.assessmentTitle}</TableCell>
                          <TableCell color="text.secondary">
                            {new Date(item.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600 }}>
                            {item.obtainedMarks} / {item.totalMarks}
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700 }}>
                            {item.percentage}%
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              icon={item.isPassed ? <CheckCircleOutlineIcon /> : <CancelOutlinedIcon />}
                              label={item.isPassed ? 'PASS' : 'FAIL'}
                              size="small"
                              color={item.isPassed ? 'success' : 'error'}
                              sx={{ fontWeight: 700 }}
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Chip label="COMPLETED" size="small" variant="outlined" color="primary" sx={{ fontWeight: 600 }} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Alert severity="info" variant="outlined">
                  No completed assessments recorded for this candidate yet.
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* ================================================================= */}
          {/* SECTION: HUMAN EVALUATION (GD & STRUCTURED INTERVIEWS)           */}
          {/* ================================================================= */}
          <Card sx={{ border: '1px solid #DCE6F5' }}>
            <CardContent sx={{ p: 3.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                <GroupsIcon sx={{ color: '#16a34a', fontSize: 26 }} />
                <Typography variant="h6" fontWeight={700}>
                  Human Evaluation Summary (GD & Interviews)
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Human evaluator placement rounds showing communication, technical depth, confidence, and sequential improvement.
              </Typography>

              <Grid container spacing={3}>
                {/* GD Summary */}
                <Grid item xs={12} md={6}>
                  <Box sx={{ p: 2.5, borderRadius: 2, bgcolor: '#EDF2FF', border: '1px solid #DCE6F5' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                      <Typography variant="subtitle1" fontWeight={700} color="#166534">
                        Group Discussion (GD)
                      </Typography>
                      <Chip
                        label={`${drilldown?.humanEvaluation?.gd?.totalEvaluated || 0} Evaluated`}
                        size="small"
                        color="success"
                      />
                    </Box>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>Average Score:</strong> {drilldown?.humanEvaluation?.gd?.averagePercentage ? `${drilldown.humanEvaluation.gd.averagePercentage}%` : '—'}
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1.5 }}>
                      <strong>Latest Score:</strong> {drilldown?.humanEvaluation?.gd?.latestPercentage ? `${drilldown.humanEvaluation.gd.latestPercentage}%` : '—'}
                    </Typography>

                    <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" sx={{ mb: 0.5 }}>
                      Evaluation Improvement:
                    </Typography>
                    {drilldown?.humanEvaluation?.gd?.progression && drilldown.humanEvaluation.gd.progression.length > 0 ? (
                      drilldown.humanEvaluation.gd.progression.map((p: any, idx: number) => (
                        <Box key={idx} sx={{ p: 1, my: 0.5, bgcolor: '#ffffff', borderRadius: 1, border: '1px solid #DCE6F5' }}>
                          <Typography variant="caption" fontWeight={600}>
                            {p.displayText}
                          </Typography>
                        </Box>
                      ))
                    ) : (
                      <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                        No previous evaluation available.
                      </Typography>
                    )}
                  </Box>
                </Grid>

                {/* Interview Summary */}
                <Grid item xs={12} md={6}>
                  <Box sx={{ p: 2.5, borderRadius: 2, bgcolor: '#EDF2FF', border: '1px solid #DCE6F5' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                      <Typography variant="subtitle1" fontWeight={700} color="#1e40af">
                        Structured Interviews
                      </Typography>
                      <Chip
                        label={`${drilldown?.humanEvaluation?.interview?.totalEvaluated || 0} Evaluated`}
                        size="small"
                        color="primary"
                      />
                    </Box>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>Average Score:</strong> {drilldown?.humanEvaluation?.interview?.averagePercentage ? `${drilldown.humanEvaluation.interview.averagePercentage}%` : '—'}
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1.5 }}>
                      <strong>Latest Score:</strong> {drilldown?.humanEvaluation?.interview?.latestPercentage ? `${drilldown.humanEvaluation.interview.latestPercentage}%` : '—'}
                    </Typography>

                    <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" sx={{ mb: 0.5 }}>
                      Evaluation Improvement:
                    </Typography>
                    {drilldown?.humanEvaluation?.interview?.progression && drilldown.humanEvaluation.interview.progression.length > 0 ? (
                      drilldown.humanEvaluation.interview.progression.map((p: any, idx: number) => (
                        <Box key={idx} sx={{ p: 1, my: 0.5, bgcolor: '#ffffff', borderRadius: 1, border: '1px solid #DCE6F5' }}>
                          <Typography variant="caption" fontWeight={600}>
                            {p.displayText}
                          </Typography>
                        </Box>
                      ))
                    ) : (
                      <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                        No previous evaluation available.
                      </Typography>
                    )}
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Box>
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
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
          },
        }}
      >
        <form onSubmit={handleUpdate}>
          <DialogTitle sx={{ color: '#14264B', fontWeight: 700, borderBottom: '1px solid #DCE6F5', pb: 2 }}>
            Edit Student Information
          </DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 2.5 }}>
            <TextField
              label="Full Name"
              required
              fullWidth
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
            />
            <TextField
              label="Phone Number"
              fullWidth
              value={editForm.phone}
              onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
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
    </Box>
  );
};
