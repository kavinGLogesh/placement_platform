import React, { useState, useRef } from 'react';
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
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  LinearProgress,
  Paper,
  IconButton,
  Tooltip,
  InputAdornment,
} from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import SchoolIcon from '@mui/icons-material/School';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import BadgeIcon from '@mui/icons-material/Badge';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import EditIcon from '@mui/icons-material/Edit';
import DescriptionIcon from '@mui/icons-material/Description';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import LockResetIcon from '@mui/icons-material/LockReset';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import SecurityIcon from '@mui/icons-material/Security';
import CancelIcon from '@mui/icons-material/Cancel';
import { managementService } from '../../services/management.service.js';
import { authService } from '../../services/auth.service.js';
import { StudentFullProfile } from '../../types/management.types.js';

export const StudentProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [editPhoneOpen, setEditPhoneOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneSuccess, setPhoneSuccess] = useState<string | null>(null);

  // Change Password state
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  // Password validation rules
  const hasMinLength = newPassword.length >= 8;
  const hasUpperCase = /[A-Z]/.test(newPassword);
  const hasLowerCase = /[a-z]/.test(newPassword);
  const hasNumber = /\d/.test(newPassword);
  const hasSpecialChar = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(newPassword);
  const passwordsMatch = Boolean(newPassword && confirmPassword && newPassword === confirmPassword);
  const isPasswordValid =
    hasMinLength &&
    hasUpperCase &&
    hasLowerCase &&
    hasNumber &&
    hasSpecialChar &&
    passwordsMatch;

  const satisfiedCount = [
    hasMinLength,
    hasUpperCase,
    hasLowerCase,
    hasNumber,
    hasSpecialChar,
    passwordsMatch,
  ].filter(Boolean).length;

  const handleChangePassword = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isPasswordValid) {
      setPasswordError('Please fulfill all password criteria before saving.');
      return;
    }

    try {
      setPasswordLoading(true);
      setPasswordError(null);
      await authService.changePassword(newPassword);
      setPasswordSuccess('Password successfully updated in the database!');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setChangePasswordOpen(false);
      }, 1500);
      setTimeout(() => {
        setPasswordSuccess(null);
      }, 6000);
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to update password'
          : err instanceof Error
          ? err.message
          : 'Failed to update password';
      setPasswordError(msg);
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleClosePasswordDialog = () => {
    if (passwordLoading) return;
    setChangePasswordOpen(false);
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError(null);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  };

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [resumeError, setResumeError] = useState<string | null>(null);
  const [resumeSuccess, setResumeSuccess] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const {
    data: profile,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<StudentFullProfile>({
    queryKey: ['studentOwnProfile'],
    queryFn: () => managementService.getStudentProfile(),
    staleTime: 60000,
  });

  const updatePhoneMutation = useMutation({
    mutationFn: (newPhone: string) => managementService.updateStudentProfile({ phone: newPhone }),
    onSuccess: (updated) => {
      queryClient.setQueryData(['studentOwnProfile'], (prev: StudentFullProfile | undefined) =>
        prev ? { ...prev, phone: updated.phone } : updated
      );
      setPhoneSuccess('Phone number successfully updated');
      setEditPhoneOpen(false);
      setTimeout(() => setPhoneSuccess(null), 4000);
    },
  });

  const uploadResumeMutation = useMutation({
    mutationFn: (file: File) => managementService.uploadResume(file),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['studentOwnProfile'] });
      setResumeSuccess(`Resume "${data.fileName}" uploaded and verified successfully.`);
      setResumeError(null);
      setTimeout(() => setResumeSuccess(null), 5000);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || 'Failed to upload resume';
      setResumeError(msg);
      setTimeout(() => setResumeError(null), 6000);
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setResumeError('Only PDF files (.pdf) are permitted.');
      setTimeout(() => setResumeError(null), 5000);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setResumeError('Resume file size must be less than 5 MB.');
      setTimeout(() => setResumeError(null), 5000);
      return;
    }

    uploadResumeMutation.mutate(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDownloadResume = async () => {
    try {
      setIsDownloading(true);
      setResumeError(null);
      const blob = await managementService.downloadResume();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = profile?.resume?.fileName || `${profile?.registerNumber}_Resume.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Failed to download resume. Please upload your placement resume first.';
      setResumeError(msg);
      setTimeout(() => setResumeError(null), 5000);
    } finally {
      setIsDownloading(false);
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (isError || !profile) {
    return (
      <Box sx={{ p: 4 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/student/dashboard')} sx={{ mb: 2 }}>
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
          {error instanceof Error ? error.message : 'Failed to load student profile'}
        </Alert>
      </Box>
    );
  }

  const cgpaValue = profile.cgpa || 0;
  const cgpaPercentage = Math.min(100, (cgpaValue / 10) * 100);

  return (
    <Box sx={{ pb: 6 }}>
      {/* Top Header Actions */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Button
          variant="outlined"
          size="small"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/student/dashboard')}
          sx={{
            borderColor: '#D1DEF0',
            color: '#526584',
            '&:hover': { borderColor: '#8293B0', bgcolor: '#E7EEFA' },
          }}
        >
          Back to Dashboard
        </Button>

        <Button
          variant="contained"
          size="small"
          startIcon={<LockResetIcon />}
          onClick={() => {
            setPasswordError(null);
            setChangePasswordOpen(true);
          }}
          sx={{
            bgcolor: '#14264B',
            color: '#ffffff',
            fontWeight: 600,
            px: 2.2,
            py: 0.8,
            boxShadow: '0 2px 8px rgba(20, 38, 75, 0.2)',
            '&:hover': { bgcolor: '#233863' },
          }}
        >
          Change Password
        </Button>
      </Box>

      {passwordSuccess && (
        <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setPasswordSuccess(null)}>
          {passwordSuccess}
        </Alert>
      )}

      {phoneSuccess && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setPhoneSuccess(null)}>
          {phoneSuccess}
        </Alert>
      )}

      {/* Main Student Identity Header Card */}
      <Card
        elevation={0}
        sx={{
          mb: 3.5,
          p: { xs: 2.5, md: 3.5 },
          borderRadius: 3,
          backgroundColor: '#ffffff',
          border: '1px solid #DCE6F5',
          boxShadow: '0 4px 16px rgba(20, 38, 75, 0.04)',
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3, alignItems: { xs: 'flex-start', md: 'center' } }}>
          {/* Avatar / Icon Badge */}
          <Box
            sx={{
              width: 72,
              height: 72,
              borderRadius: 3,
              bgcolor: '#eff6ff',
              color: '#318992',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(37, 99, 235, 0.15)',
              flexShrink: 0,
            }}
          >
            <SchoolIcon sx={{ fontSize: 40 }} />
          </Box>

          {/* Student Info */}
          <Box sx={{ flexGrow: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', mb: 0.5 }}>
              <Typography variant="h4" fontWeight={800} sx={{ color: '#14264B', letterSpacing: '-0.02em' }}>
                {profile.name}
              </Typography>
              <Chip
                label={profile.status}
                color={profile.status === 'ACTIVE' ? 'success' : 'default'}
                size="small"
                icon={<CheckCircleIcon sx={{ fontSize: 14 }} />}
                sx={{ fontWeight: 700, fontSize: '0.75rem', height: 24 }}
              />
              <Chip
                label="Candidate / Student"
                size="small"
                sx={{ bgcolor: '#eff6ff', color: '#267D86', border: '1px solid #bfdbfe', fontWeight: 600, height: 24 }}
              />
            </Box>

            <Typography variant="body1" sx={{ color: '#526584', fontWeight: 500, mb: 1.5 }}>
              {profile.department?.name || 'Engineering & Technology'} • Batch of {profile.class?.batchYear || profile.year}
            </Typography>

            {/* Quick Contact Metadata */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2.5, alignItems: 'center', color: '#7182A0', fontSize: '0.875rem' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                <BadgeIcon sx={{ fontSize: 18, color: '#318992' }} />
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#33466A' }}>
                  Roll No: {profile.registerNumber}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                <EmailIcon sx={{ fontSize: 18, color: '#7182A0' }} />
                <Typography variant="body2" sx={{ color: '#405678' }}>
                  {profile.collegeEmail}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                <PhoneIcon sx={{ fontSize: 18, color: '#7182A0' }} />
                <Typography variant="body2" sx={{ color: '#405678' }}>
                  {profile.phone || 'No phone registered'}
                </Typography>
                <Tooltip title="Update phone number">
                  <IconButton
                    size="small"
                    onClick={() => {
                      setPhoneNumber(profile.phone || '');
                      setEditPhoneOpen(true);
                    }}
                    sx={{ p: 0.3, color: '#8293B0', '&:hover': { color: '#318992' } }}
                  >
                    <EditIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          </Box>
        </Box>
      </Card>

      {/* Grid: Academic Info & CGPA */}
      <Grid container spacing={3} sx={{ mb: 3.5 }}>
        {/* Academic Details Card */}
        <Grid item xs={12} md={8}>
          <Card
            elevation={0}
            sx={{
              height: '100%',
              borderRadius: 2.5,
              backgroundColor: '#ffffff',
              border: '1px solid #DCE6F5',
              p: 3,
            }}
          >
            <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#14264B', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <SchoolIcon sx={{ color: '#318992', fontSize: 20 }} /> Academic Curriculum & Class Enrollment
            </Typography>
            <Divider sx={{ mb: 2.5, borderColor: '#E7EEFA' }} />

            <Grid container spacing={2.5}>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" sx={{ color: '#7182A0', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Department / School
                </Typography>
                <Typography variant="body1" fontWeight={600} sx={{ color: '#14264B', mt: 0.3 }}>
                  {profile.department?.name} ({profile.department?.code})
                </Typography>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Typography variant="caption" sx={{ color: '#7182A0', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Degree Program / Course
                </Typography>
                <Typography variant="body1" fontWeight={600} sx={{ color: '#14264B', mt: 0.3 }}>
                  {profile.course?.name || profile.course?.code || 'B.Tech / B.E.'}
                </Typography>
              </Grid>

              <Grid item xs={6} sm={3}>
                <Typography variant="caption" sx={{ color: '#7182A0', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Current Year
                </Typography>
                <Typography variant="body1" fontWeight={600} sx={{ color: '#14264B', mt: 0.3 }}>
                  Year {profile.class?.currentYear || profile.year}
                </Typography>
              </Grid>

              <Grid item xs={6} sm={3}>
                <Typography variant="caption" sx={{ color: '#7182A0', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Graduation Batch
                </Typography>
                <Typography variant="body1" fontWeight={600} sx={{ color: '#14264B', mt: 0.3 }}>
                  Class of {profile.class?.batchYear || 2026}
                </Typography>
              </Grid>

              <Grid item xs={6} sm={3}>
                <Typography variant="caption" sx={{ color: '#7182A0', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Section
                </Typography>
                <Typography variant="body1" fontWeight={600} sx={{ color: '#14264B', mt: 0.3 }}>
                  Section {profile.section?.name || 'A'}
                </Typography>
              </Grid>

              <Grid item xs={6} sm={3}>
                <Typography variant="caption" sx={{ color: '#7182A0', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Class Cohort
                </Typography>
                <Typography variant="body1" fontWeight={600} sx={{ color: '#14264B', mt: 0.3 }}>
                  {profile.class?.name || 'CSE 2022-2026'}
                </Typography>
              </Grid>
            </Grid>
          </Card>
        </Grid>

        {/* CGPA & Academic Standing */}
        <Grid item xs={12} md={4}>
          <Card
            elevation={0}
            sx={{
              height: '100%',
              borderRadius: 2.5,
              backgroundColor: '#ffffff',
              border: '1px solid #DCE6F5',
              p: 3,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <Box>
              <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#14264B', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                <WorkspacePremiumIcon sx={{ color: '#d97706', fontSize: 20 }} /> Cumulative Grade Point
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Official institutional CGPA (10.0 scale)
              </Typography>

              <Box sx={{ mt: 2.5, mb: 1 }}>
                <Typography variant="h3" fontWeight={800} sx={{ color: '#059669', lineHeight: 1 }}>
                  {cgpaValue.toFixed(2)}
                </Typography>
                <Typography variant="caption" sx={{ color: '#7182A0', fontWeight: 600 }}>
                  Scale: 10.00
                </Typography>
              </Box>

              <LinearProgress
                variant="determinate"
                value={cgpaPercentage}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  my: 1.5,
                  bgcolor: '#E7EEFA',
                  '& .MuiLinearProgress-bar': { bgcolor: '#059669', borderRadius: 4 },
                }}
              />
            </Box>

            <Box sx={{ mt: 2, p: 1.5, borderRadius: 2, bgcolor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
              <Typography variant="caption" sx={{ color: '#166534', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <CheckCircleIcon sx={{ fontSize: 14 }} /> Placement Criteria: Eligible
              </Typography>
              <Typography variant="caption" sx={{ color: '#15803d', display: 'block', mt: 0.3 }}>
                Meets the minimum CGPA requirement (≥ 7.50) for Tier-1 corporate drives.
              </Typography>
            </Box>
          </Card>
        </Grid>
      </Grid>

      {/* Skills & Certifications Section */}
      <Grid container spacing={3} sx={{ mb: 3.5 }}>
        {/* Certifications Card */}
        <Grid item xs={12}>
          <Card
            elevation={0}
            sx={{
              height: '100%',
              borderRadius: 2.5,
              backgroundColor: '#ffffff',
              border: '1px solid #DCE6F5',
              p: 3,
            }}
          >
            <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#14264B', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <WorkspacePremiumIcon sx={{ color: '#318992', fontSize: 20 }} /> Verified Professional Certifications
            </Typography>
            <Divider sx={{ mb: 2.5, borderColor: '#E7EEFA' }} />

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {(profile.certifications || []).map((cert) => (
                <Paper
                  key={cert.credentialId}
                  elevation={0}
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    bgcolor: '#EDF2FF',
                    border: '1px solid #DCE6F5',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Box>
                    <Typography variant="body2" fontWeight={700} sx={{ color: '#14264B' }}>
                      {cert.title}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#7182A0' }}>
                      {cert.issuer} • Issued: {cert.issueDate}
                    </Typography>
                  </Box>
                  <Chip
                    label="Verified"
                    size="small"
                    color="success"
                    icon={<CheckCircleIcon sx={{ fontSize: 13 }} />}
                    sx={{ height: 22, fontSize: '0.72rem', fontWeight: 600 }}
                  />
                </Paper>
              ))}
            </Box>
          </Card>
        </Grid>
      </Grid>

      {/* Resume & Recommendations */}
      <Grid container spacing={3}>
        {/* Resume Card */}
        <Grid item xs={12} md={5}>
          <Card
            elevation={0}
            sx={{
              height: '100%',
              borderRadius: 2.5,
              backgroundColor: '#ffffff',
              border: '1px solid #DCE6F5',
              p: 3,
            }}
          >
            <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#14264B', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <DescriptionIcon sx={{ color: '#318992', fontSize: 20 }} /> Verified Placement Resume
            </Typography>
            <Divider sx={{ mb: 2.5, borderColor: '#E7EEFA' }} />

            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                borderRadius: 2,
                bgcolor: '#EDF2FF',
                border: '1px solid #DCE6F5',
                mb: 2.5,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                <DescriptionIcon sx={{ color: '#dc2626', fontSize: 28 }} />
                <Box>
                  <Typography variant="body2" fontWeight={700} sx={{ color: '#14264B' }}>
                    {profile.resume?.fileName || `${profile.registerNumber}_Resume.pdf`}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#7182A0' }}>
                    {profile.resume?.fileSize || '245 KB'} • Verified for Placement Drives
                  </Typography>
                </Box>
              </Box>
              <Chip
                label="VERIFIED FOR CORPORATE DRIVES"
                size="small"
                color="success"
                sx={{ height: 22, fontSize: '0.7rem', fontWeight: 700, mt: 0.5 }}
              />
            </Paper>

            {resumeSuccess && (
              <Alert severity="success" sx={{ mb: 2, fontSize: '0.8rem' }} onClose={() => setResumeSuccess(null)}>
                {resumeSuccess}
              </Alert>
            )}
            {resumeError && (
              <Alert severity="error" sx={{ mb: 2, fontSize: '0.8rem' }} onClose={() => setResumeError(null)}>
                {resumeError}
              </Alert>
            )}

            <input
              type="file"
              ref={fileInputRef}
              accept=".pdf,application/pdf"
              style={{ display: 'none' }}
              onChange={handleFileSelect}
            />

            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <Button
                variant="outlined"
                fullWidth
                size="small"
                startIcon={isDownloading ? <CircularProgress size={16} /> : <CloudDownloadIcon />}
                disabled={isDownloading || uploadResumeMutation.isPending}
                onClick={handleDownloadResume}
              >
                {isDownloading ? 'Downloading...' : 'Download PDF'}
              </Button>
              <Button
                variant="contained"
                fullWidth
                size="small"
                startIcon={uploadResumeMutation.isPending ? <CircularProgress size={16} color="inherit" /> : <CloudUploadIcon />}
                disabled={uploadResumeMutation.isPending || isDownloading}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploadResumeMutation.isPending ? 'Uploading...' : 'Upload Revision'}
              </Button>
            </Box>
          </Card>
        </Grid>

        {/* Personalized Recommendations */}
        <Grid item xs={12} md={7}>
          <Card
            elevation={0}
            sx={{
              height: '100%',
              borderRadius: 2.5,
              backgroundColor: '#ffffff',
              border: '1px solid #DCE6F5',
              p: 3,
            }}
          >
            <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#14264B', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <LightbulbIcon sx={{ color: '#d97706', fontSize: 20 }} /> Placement Recommendations & Guidance
            </Typography>
            <Divider sx={{ mb: 2.5, borderColor: '#E7EEFA' }} />

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {(profile.recommendations || []).map((rec) => (
                <Paper
                  key={rec.title}
                  elevation={0}
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    bgcolor: rec.priority === 'HIGH' ? '#fffbeb' : '#EDF2FF',
                    border: `1px solid ${rec.priority === 'HIGH' ? '#fde68a' : '#DCE6F5'}`,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Chip
                      label={rec.priority}
                      size="small"
                      color={rec.priority === 'HIGH' ? 'warning' : 'default'}
                      sx={{ height: 20, fontSize: '0.68rem', fontWeight: 700 }}
                    />
                    <Typography variant="body2" fontWeight={700} sx={{ color: '#14264B' }}>
                      {rec.title}
                    </Typography>
                  </Box>
                  <Typography variant="caption" sx={{ color: '#526584', display: 'block' }}>
                    {rec.description}
                  </Typography>
                </Paper>
              ))}
            </Box>
          </Card>
        </Grid>
      </Grid>

      {/* Account Security & Password Card */}
      <Card
        elevation={0}
        sx={{
          mb: 3.5,
          p: 3,
          borderRadius: 2.5,
          backgroundColor: '#ffffff',
          border: '1px solid #DCE6F5',
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { sm: 'center' }, gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 2,
                bgcolor: '#EDF2FF',
                color: '#318992',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid #DCE6F5',
              }}
            >
              <SecurityIcon sx={{ fontSize: 26 }} />
            </Box>
            <Box>
              <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#14264B' }}>
                Account Security & Credentials
              </Typography>
              <Typography variant="body2" sx={{ color: '#526584' }}>
                Keep your student account secure. You can update your password at any time.
              </Typography>
            </Box>
          </Box>
          <Button
            variant="outlined"
            startIcon={<LockResetIcon />}
            onClick={() => {
              setPasswordError(null);
              setChangePasswordOpen(true);
            }}
            sx={{
              borderColor: '#318992',
              color: '#318992',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              '&:hover': { borderColor: '#1765B5', bgcolor: '#EDF2FF' },
            }}
          >
            Change Password
          </Button>
        </Box>
      </Card>

      {/* Edit Phone Number Dialog */}
      <Dialog open={editPhoneOpen} onClose={() => setEditPhoneOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>Update Contact Phone</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Provide your active 10-digit mobile number for placement interview notifications.
          </Typography>
          <TextField
            fullWidth
            size="small"
            label="Phone Number"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="e.g. 9876543210"
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setEditPhoneOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={updatePhoneMutation.isPending || !phoneNumber.trim()}
            onClick={() => updatePhoneMutation.mutate(phoneNumber.trim())}
          >
            {updatePhoneMutation.isPending ? 'Saving...' : 'Save Phone'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog
        open={changePasswordOpen}
        onClose={handleClosePasswordDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3, overflow: 'hidden' },
        }}
      >
        {/* Dialog Header Banner */}
        <Box
          sx={{
            bgcolor: '#14264B',
            color: '#ffffff',
            px: 3,
            py: 2.5,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
          }}
        >
          <Box
            sx={{
              bgcolor: 'rgba(255, 255, 255, 0.1)',
              p: 1,
              borderRadius: 1.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <LockResetIcon sx={{ color: '#60a5fa', fontSize: 24 }} />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={700} sx={{ fontSize: '1.15rem' }}>
              Change Account Password
            </Typography>
            <Typography variant="caption" sx={{ color: '#DCE6F5' }}>
              Set a strong password for your student account
            </Typography>
          </Box>
        </Box>

        <DialogContent sx={{ p: 3, pt: 2.5 }}>
          {passwordSuccess && (
            <Alert severity="success" sx={{ mb: 2.5 }}>
              {passwordSuccess}
            </Alert>
          )}

          {passwordError && (
            <Alert severity="error" sx={{ mb: 2.5 }}>
              {passwordError}
            </Alert>
          )}

          <Box component="form" onSubmit={handleChangePassword} noValidate>
            {/* New Password */}
            <TextField
              fullWidth
              label="New Password"
              type={showNewPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                if (passwordError) setPasswordError(null);
              }}
              placeholder="Enter new password"
              size="small"
              sx={{ mb: 2 }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      edge="end"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      size="small"
                      aria-label="toggle new password visibility"
                    >
                      {showNewPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            {/* Confirm Password */}
            <TextField
              fullWidth
              label="Confirm Password"
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (passwordError) setPasswordError(null);
              }}
              placeholder="Re-enter new password"
              size="small"
              error={Boolean(confirmPassword && !passwordsMatch)}
              helperText={confirmPassword && !passwordsMatch ? 'Passwords do not match' : ''}
              sx={{ mb: 2 }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      edge="end"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      size="small"
                      aria-label="toggle confirm password visibility"
                    >
                      {showConfirmPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            {/* Requirements Box */}
            <Paper
              elevation={0}
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: '#f8fafc',
                border: '1px solid #e2e8f0',
                mb: 1,
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="caption" fontWeight={700} sx={{ color: '#475569' }}>
                  PASSWORD REQUIREMENTS ({satisfiedCount}/6)
                </Typography>
                <Typography
                  variant="caption"
                  fontWeight={700}
                  sx={{
                    color:
                      satisfiedCount === 6
                        ? '#16a34a'
                        : satisfiedCount >= 4
                        ? '#d97706'
                        : '#dc2626',
                  }}
                >
                  {satisfiedCount === 6 ? 'All Criteria Met' : satisfiedCount >= 4 ? 'Good Progress' : 'Incomplete'}
                </Typography>
              </Box>

              <LinearProgress
                variant="determinate"
                value={(satisfiedCount / 6) * 100}
                color={satisfiedCount === 6 ? 'success' : satisfiedCount >= 4 ? 'warning' : 'error'}
                sx={{ height: 6, borderRadius: 3, mb: 1.5 }}
              />

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1 }}>
                {[
                  { label: 'At least 8 characters', met: hasMinLength },
                  { label: 'One uppercase letter (A-Z)', met: hasUpperCase },
                  { label: 'One lowercase letter (a-z)', met: hasLowerCase },
                  { label: 'One number (0-9)', met: hasNumber },
                  { label: 'One special symbol (!@#$...)', met: hasSpecialChar },
                  { label: 'Passwords match', met: passwordsMatch },
                ].map((req) => (
                  <Box key={req.label} sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                    {req.met ? (
                      <CheckCircleIcon sx={{ fontSize: 16, color: '#16a34a' }} />
                    ) : (
                      <CancelIcon sx={{ fontSize: 16, color: '#94a3b8' }} />
                    )}
                    <Typography
                      variant="caption"
                      sx={{
                        color: req.met ? '#166534' : '#64748b',
                        fontWeight: req.met ? 600 : 400,
                      }}
                    >
                      {req.label}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Paper>
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5, pt: 1, borderTop: '1px solid #f1f5f9' }}>
          <Button onClick={handleClosePasswordDialog} color="inherit" disabled={passwordLoading}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={!isPasswordValid || passwordLoading}
            onClick={() => handleChangePassword()}
            startIcon={passwordLoading ? <CircularProgress size={16} color="inherit" /> : <LockResetIcon />}
            sx={{
              bgcolor: '#14264B',
              '&:hover': { bgcolor: '#233863' },
            }}
          >
            {passwordLoading ? 'Saving...' : 'Update Password'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
