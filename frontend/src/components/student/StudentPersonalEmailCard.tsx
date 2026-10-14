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
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Tooltip,
} from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import LockIcon from '@mui/icons-material/Lock';
import EditIcon from '@mui/icons-material/Edit';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import RefreshIcon from '@mui/icons-material/Refresh';
import { academicService } from '../../services/academic.service.js';

interface Props {
  collegeEmail: string;
  initialPersonalEmail?: string | null;
  initialIsVerified?: boolean;
  phone?: string | null;
  onEditPhone: () => void;
  onProfileUpdated?: () => void;
}

export const StudentPersonalEmailCard: React.FC<Props> = ({
  collegeEmail,
  initialPersonalEmail,
  initialIsVerified,
  phone,
  onEditPhone,
  onProfileUpdated,
}) => {
  const [personalEmail, setPersonalEmail] = useState<string | null>(initialPersonalEmail || null);
  const [isVerified, setIsVerified] = useState<boolean>(Boolean(initialIsVerified));

  // Edit / Request Modal
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [emailInput, setEmailInput] = useState(personalEmail || '');
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  // OTP Verification Modal
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifySuccess, setVerifySuccess] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | undefined>(undefined);
  const [resending, setResending] = useState(false);

  // Global card notification
  const [cardSuccess, setCardSuccess] = useState<string | null>(null);

  const handleOpenRequestModal = () => {
    setEmailInput(personalEmail || '');
    setRequestError(null);
    setRequestModalOpen(true);
  };

  const handleSendVerificationRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = emailInput.trim().toLowerCase();
    if (!cleanEmail) {
      setRequestError('Please provide a valid email address');
      return;
    }
    if (cleanEmail === collegeEmail.toLowerCase()) {
      setRequestError('Personal email must be distinct from your official college login email');
      return;
    }

    setRequestLoading(true);
    setRequestError(null);
    try {
      const res = await academicService.requestPersonalEmailUpdate(cleanEmail);
      setPersonalEmail(res.personalEmail);
      setIsVerified(false);
      setDevCode(res.devCode);
      setRequestModalOpen(false);

      // Open OTP verify modal
      setOtpCode(res.devCode || '');
      setVerifyError(null);
      setVerifySuccess(null);
      setVerifyModalOpen(true);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to request email update';
      setRequestError(msg);
    } finally {
      setRequestLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim()) {
      setVerifyError('Please enter the 6-digit verification code');
      return;
    }

    setVerifyLoading(true);
    setVerifyError(null);
    try {
      const res = await academicService.verifyPersonalEmail(otpCode.trim());
      setIsVerified(true);
      setVerifySuccess(res.message);
      setCardSuccess('Your personal email has been verified successfully!');
      setTimeout(() => {
        setVerifyModalOpen(false);
        setCardSuccess(null);
      }, 2000);
      if (onProfileUpdated) onProfileUpdated();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Invalid or expired verification code';
      setVerifyError(msg);
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setResending(true);
    setVerifyError(null);
    try {
      const res = await academicService.resendPersonalEmailCode();
      if (res.devCode) {
        setDevCode(res.devCode);
        setOtpCode(res.devCode);
      }
      setVerifySuccess('New verification code generated and dispatched.');
      setTimeout(() => setVerifySuccess(null), 3500);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to resend verification code';
      setVerifyError(msg);
    } finally {
      setResending(false);
    }
  };

  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: 2.5,
        backgroundColor: '#ffffff',
        border: '1px solid #DCE6F5',
        p: 3,
        mb: 3.5,
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Typography
          variant="subtitle1"
          fontWeight={700}
          sx={{ color: '#14264B', display: 'flex', alignItems: 'center', gap: 1 }}
        >
          <EmailIcon sx={{ color: '#318992', fontSize: 22 }} /> Contact Details & Identity Verification
        </Typography>
        <Chip
          icon={<LockIcon sx={{ fontSize: 14 }} />}
          label="Single Sign-On Security"
          size="small"
          sx={{ bgcolor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', fontWeight: 600, fontSize: '0.72rem' }}
        />
      </Box>
      <Divider sx={{ mb: 2.5, borderColor: '#E7EEFA' }} />

      {cardSuccess && (
        <Alert severity="success" sx={{ mb: 2.5 }} onClose={() => setCardSuccess(null)}>
          {cardSuccess}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* College Email - Immutable Login Email */}
        <Grid item xs={12} md={4}>
          <Box
            sx={{
              p: 2.5,
              borderRadius: 2,
              bgcolor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Institutional College Email
                </Typography>
                <Chip
                  icon={<LockIcon sx={{ fontSize: 13 }} />}
                  label="Login Account"
                  size="small"
                  color="primary"
                  sx={{ height: 22, fontSize: '0.7rem', fontWeight: 700 }}
                />
              </Box>

              <Typography variant="body1" fontWeight={700} sx={{ color: '#0F172A', wordBreak: 'break-all' }}>
                {collegeEmail}
              </Typography>
            </Box>

            <Box sx={{ mt: 2, pt: 1.5, borderTop: '1px dashed #CBD5E1' }}>
              <Typography variant="caption" color="#64748B" sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                <VpnKeyIcon sx={{ fontSize: 14, color: '#3B82F6' }} />
                Sole account login credential.
              </Typography>
            </Box>
          </Box>
        </Grid>

        {/* Personal Email - Contact Details with Verification */}
        <Grid item xs={12} md={4}>
          <Box
            sx={{
              p: 2.5,
              borderRadius: 2,
              bgcolor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Personal Email (Contact Info)
                </Typography>
                {personalEmail ? (
                  <Chip
                    icon={isVerified ? <CheckCircleIcon sx={{ fontSize: 13 }} /> : <WarningAmberIcon sx={{ fontSize: 13 }} />}
                    label={isVerified ? 'Verified' : 'Pending'}
                    size="small"
                    color={isVerified ? 'success' : 'warning'}
                    sx={{ height: 22, fontSize: '0.7rem', fontWeight: 700 }}
                  />
                ) : (
                  <Chip
                    label="Not Set"
                    size="small"
                    variant="outlined"
                    sx={{ height: 22, fontSize: '0.7rem', color: '#64748B' }}
                  />
                )}
              </Box>

              <Typography
                variant="body1"
                fontWeight={700}
                sx={{ color: personalEmail ? '#0F172A' : '#94A3B8', wordBreak: 'break-all' }}
              >
                {personalEmail || 'No personal email configured'}
              </Typography>
            </Box>

            <Box
              sx={{
                mt: 2,
                pt: 1.5,
                borderTop: '1px dashed #CBD5E1',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 1,
              }}
            >
              <Box sx={{ display: 'flex', gap: 1 }}>
                {personalEmail && !isVerified && (
                  <Button
                    size="small"
                    variant="contained"
                    color="warning"
                    onClick={() => {
                      setVerifyError(null);
                      setVerifySuccess(null);
                      setVerifyModalOpen(true);
                    }}
                    sx={{ textTransform: 'none', fontSize: '0.75rem', py: 0.3 }}
                  >
                    Verify Code
                  </Button>
                )}
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<EditIcon fontSize="small" />}
                  onClick={handleOpenRequestModal}
                  sx={{ textTransform: 'none', fontSize: '0.75rem', py: 0.3 }}
                >
                  {personalEmail ? 'Update' : 'Add Email'}
                </Button>
              </Box>
            </Box>
          </Box>
        </Grid>

        {/* Mobile Phone Contact Number */}
        <Grid item xs={12} md={4}>
          <Box
            sx={{
              p: 2.5,
              borderRadius: 2,
              bgcolor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Mobile Phone Number
                </Typography>
                <Chip
                  icon={<PhoneIcon sx={{ fontSize: 13 }} />}
                  label="SMS Alerts"
                  size="small"
                  sx={{ height: 22, fontSize: '0.7rem', fontWeight: 600 }}
                />
              </Box>

              <Typography variant="body1" fontWeight={700} sx={{ color: phone ? '#0F172A' : '#94A3B8' }}>
                {phone || 'No phone registered'}
              </Typography>
            </Box>

            <Box
              sx={{
                mt: 2,
                pt: 1.5,
                borderTop: '1px dashed #CBD5E1',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Typography variant="caption" color="#64748B">
                Interview call scheduling.
              </Typography>
              <Tooltip title="Update phone number">
                <IconButton size="small" onClick={onEditPhone} sx={{ color: '#318992' }}>
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </Grid>
      </Grid>

      {/* Request / Update Personal Email Dialog */}
      <Dialog
        open={requestModalOpen}
        onClose={() => setRequestModalOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2.5 } }}
      >
        <form onSubmit={handleSendVerificationRequest}>
          <DialogTitle sx={{ fontWeight: 700, color: '#14264B', borderBottom: '1px solid #E2E8F0' }}>
            {personalEmail ? 'Update Personal Email' : 'Add Personal Email'}
          </DialogTitle>
          <DialogContent sx={{ pt: 3, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Alert severity="warning" variant="outlined" sx={{ fontSize: '0.8125rem' }}>
              <strong>Critical Security Notice:</strong> Adding or changing your personal email will{' '}
              <strong>never</strong> change your login credentials or password. You must continue to sign in using
              your official college email (<strong>{collegeEmail}</strong>).
            </Alert>

            {requestError && (
              <Alert severity="error" onClose={() => setRequestError(null)}>
                {requestError}
              </Alert>
            )}

            <TextField
              label="Personal Email Address"
              type="email"
              required
              fullWidth
              placeholder="e.g., yourname@gmail.com"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              helperText="We will send a 6-digit verification code to confirm ownership."
            />
          </DialogContent>
          <DialogActions sx={{ p: 2.5, borderTop: '1px solid #E2E8F0' }}>
            <Button onClick={() => setRequestModalOpen(false)} color="inherit">
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={requestLoading || !emailInput.trim()}
              sx={{ bgcolor: '#1765B5' }}
            >
              {requestLoading ? <CircularProgress size={20} color="inherit" /> : 'Send Verification Code'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Enter OTP Verification Code Dialog */}
      <Dialog
        open={verifyModalOpen}
        onClose={() => setVerifyModalOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2.5 } }}
      >
        <form onSubmit={handleVerifyOtp}>
          <DialogTitle sx={{ fontWeight: 700, color: '#14264B', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: 1 }}>
            <MarkEmailReadIcon sx={{ color: '#1765B5' }} /> Verify Personal Email
          </DialogTitle>
          <DialogContent sx={{ pt: 3, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Typography variant="body2" color="text.secondary">
              Please enter the 6-digit verification code dispatched to <strong>{personalEmail}</strong>.
            </Typography>

            {devCode && (
              <Alert severity="info" sx={{ fontSize: '0.8125rem' }}>
                <strong>Test/Dev Code:</strong> <code>{devCode}</code>
              </Alert>
            )}

            {verifyError && (
              <Alert severity="error" onClose={() => setVerifyError(null)}>
                {verifyError}
              </Alert>
            )}

            {verifySuccess && (
              <Alert severity="success">
                {verifySuccess}
              </Alert>
            )}

            <TextField
              label="6-Digit Verification Code"
              required
              fullWidth
              autoFocus
              inputProps={{ maxLength: 6, style: { textAlign: 'center', letterSpacing: '0.3em', fontSize: '1.25rem', fontWeight: 700 } }}
              placeholder="123456"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
            />

            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <Button
                size="small"
                variant="text"
                startIcon={resending ? <CircularProgress size={14} /> : <RefreshIcon fontSize="small" />}
                onClick={handleResendOtp}
                disabled={resending}
                sx={{ textTransform: 'none', fontSize: '0.75rem' }}
              >
                Resend Verification Code
              </Button>
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 2.5, borderTop: '1px solid #E2E8F0' }}>
            <Button onClick={() => setVerifyModalOpen(false)} color="inherit">
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={verifyLoading || otpCode.trim().length < 4}
              sx={{ bgcolor: '#1765B5' }}
            >
              {verifyLoading ? <CircularProgress size={20} color="inherit" /> : 'Confirm & Verify'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Card>
  );
};
