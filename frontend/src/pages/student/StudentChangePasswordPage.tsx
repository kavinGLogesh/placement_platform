import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import LockResetIcon from '@mui/icons-material/LockReset';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import SecurityIcon from '@mui/icons-material/Security';
import { authService } from '../../services/auth.service.js';
import { useAuth } from '../../hooks/useAuth.js';

export const StudentChangePasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, updatePasswordCompleted } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Password Policy Rules
  const hasMinLength = newPassword.length >= 8;
  const hasUpperCase = /[A-Z]/.test(newPassword);
  const hasLowerCase = /[a-z]/.test(newPassword);
  const hasNumber = /\d/.test(newPassword);
  const hasSpecialChar = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(newPassword);
  const isDifferentFromCurrent = newPassword.length > 0 && newPassword !== currentPassword;
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  const isFormValid =
    hasMinLength &&
    hasUpperCase &&
    hasLowerCase &&
    hasNumber &&
    hasSpecialChar &&
    isDifferentFromCurrent &&
    passwordsMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) {
      setError('Please satisfy all password policy criteria before submitting.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await authService.changePassword(currentPassword, newPassword);
      setSuccess('Your password has been successfully established! Redirecting to your dashboard...');
      updatePasswordCompleted();
      setTimeout(() => {
        navigate('/student/dashboard', { replace: true });
      }, 1500);
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to change password'
          : err instanceof Error
          ? err.message
          : 'Failed to change password';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '85vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        py: 4,
        px: 2,
      }}
    >
      <Card
        sx={{
          maxWidth: 540,
          width: '100%',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          borderRadius: 3,
          border: '1px solid #DCE6F5',
          overflow: 'hidden',
        }}
      >
        {/* Card Header Banner */}
        <Box
          sx={{
            bgcolor: '#33466A',
            color: '#ffffff',
            px: 3.5,
            py: 3,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <Box
            sx={{
              bgcolor: 'rgba(59, 130, 246, 0.2)',
              p: 1.5,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(59, 130, 246, 0.4)',
            }}
          >
            <SecurityIcon sx={{ color: '#60a5fa', fontSize: 32 }} />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={700}>
              Set Permanent Password
            </Typography>
            <Typography variant="body2" sx={{ color: '#8293B0' }}>
              First-time login setup for {user?.email}
            </Typography>
          </Box>
        </Box>

        <CardContent sx={{ p: 3.5 }}>
          <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
            You are logged in with temporary credentials. For your security, you must set a permanent password before
            accessing placement assessments and candidate reports.
          </Alert>

          {error && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>
              {success}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            {/* Current (Temporary) Password */}
            <TextField
              fullWidth
              label="Temporary / Current Password"
              type={showCurrentPassword ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              margin="normal"
              required
              disabled={loading || !!success}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowCurrentPassword(!showCurrentPassword)} edge="end" size="small">
                      {showCurrentPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            {/* New Password */}
            <TextField
              fullWidth
              label="New Permanent Password"
              type={showNewPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              margin="normal"
              required
              disabled={loading || !!success}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowNewPassword(!showNewPassword)} edge="end" size="small">
                      {showNewPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            {/* Confirm New Password */}
            <TextField
              fullWidth
              label="Confirm New Password"
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              margin="normal"
              required
              disabled={loading || !!success}
              error={confirmPassword.length > 0 && !passwordsMatch}
              helperText={confirmPassword.length > 0 && !passwordsMatch ? 'Passwords do not match' : ''}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowConfirmPassword(!showConfirmPassword)} edge="end" size="small">
                      {showConfirmPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            {/* Password Policy Visual Checklist */}
            <Box
              sx={{
                mt: 2.5,
                mb: 3,
                p: 2,
                bgcolor: '#EDF2FF',
                borderRadius: 2,
                border: '1px solid #DCE6F5',
              }}
            >
              <Typography variant="caption" fontWeight={700} color="text.secondary" textTransform="uppercase">
                Password Security Requirements
              </Typography>
              <List dense disablePadding sx={{ mt: 1 }}>
                <ListItem disableGutters sx={{ py: 0.2 }}>
                  <ListItemIcon sx={{ minWidth: 26 }}>
                    {hasMinLength ? (
                      <CheckCircleIcon color="success" sx={{ fontSize: 16 }} />
                    ) : (
                      <CancelIcon color="disabled" sx={{ fontSize: 16 }} />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary="At least 8 characters long"
                    primaryTypographyProps={{
                      variant: 'caption',
                      color: hasMinLength ? 'success.main' : 'text.secondary',
                      fontWeight: hasMinLength ? 600 : 400,
                    }}
                  />
                </ListItem>
                <ListItem disableGutters sx={{ py: 0.2 }}>
                  <ListItemIcon sx={{ minWidth: 26 }}>
                    {hasUpperCase && hasLowerCase ? (
                      <CheckCircleIcon color="success" sx={{ fontSize: 16 }} />
                    ) : (
                      <CancelIcon color="disabled" sx={{ fontSize: 16 }} />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary="Includes uppercase (A-Z) and lowercase (a-z) letters"
                    primaryTypographyProps={{
                      variant: 'caption',
                      color: hasUpperCase && hasLowerCase ? 'success.main' : 'text.secondary',
                      fontWeight: hasUpperCase && hasLowerCase ? 600 : 400,
                    }}
                  />
                </ListItem>
                <ListItem disableGutters sx={{ py: 0.2 }}>
                  <ListItemIcon sx={{ minWidth: 26 }}>
                    {hasNumber ? (
                      <CheckCircleIcon color="success" sx={{ fontSize: 16 }} />
                    ) : (
                      <CancelIcon color="disabled" sx={{ fontSize: 16 }} />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary="Includes at least one numeric digit (0-9)"
                    primaryTypographyProps={{
                      variant: 'caption',
                      color: hasNumber ? 'success.main' : 'text.secondary',
                      fontWeight: hasNumber ? 600 : 400,
                    }}
                  />
                </ListItem>
                <ListItem disableGutters sx={{ py: 0.2 }}>
                  <ListItemIcon sx={{ minWidth: 26 }}>
                    {hasSpecialChar ? (
                      <CheckCircleIcon color="success" sx={{ fontSize: 16 }} />
                    ) : (
                      <CancelIcon color="disabled" sx={{ fontSize: 16 }} />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary="Includes at least one special character (!@#$%^&*...)"
                    primaryTypographyProps={{
                      variant: 'caption',
                      color: hasSpecialChar ? 'success.main' : 'text.secondary',
                      fontWeight: hasSpecialChar ? 600 : 400,
                    }}
                  />
                </ListItem>
                <ListItem disableGutters sx={{ py: 0.2 }}>
                  <ListItemIcon sx={{ minWidth: 26 }}>
                    {isDifferentFromCurrent ? (
                      <CheckCircleIcon color="success" sx={{ fontSize: 16 }} />
                    ) : (
                      <CancelIcon color="disabled" sx={{ fontSize: 16 }} />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary="Different from current temporary password"
                    primaryTypographyProps={{
                      variant: 'caption',
                      color: isDifferentFromCurrent ? 'success.main' : 'text.secondary',
                      fontWeight: isDifferentFromCurrent ? 600 : 400,
                    }}
                  />
                </ListItem>
              </List>
            </Box>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={!isFormValid || loading || !!success}
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <LockResetIcon />}
              sx={{
                py: 1.4,
                borderRadius: 2,
                fontWeight: 700,
                textTransform: 'none',
                fontSize: '1rem',
              }}
            >
              {loading ? 'Establishing Password...' : 'Save Password & Continue'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
};
