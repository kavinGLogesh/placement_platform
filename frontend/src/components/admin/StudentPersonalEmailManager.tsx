import React, { useState } from 'react';
import {
  Box,
  Typography,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Checkbox,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tooltip,
} from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';
import EditIcon from '@mui/icons-material/Edit';
import HistoryIcon from '@mui/icons-material/History';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import SecurityIcon from '@mui/icons-material/Security';
import { StudentAuditLog } from '../../types/academic.types.js';
import { academicService } from '../../services/academic.service.js';

interface Props {
  studentId: string;
  collegeEmail: string;
  personalEmail: string | null | undefined;
  isPersonalEmailVerified: boolean | undefined;
  onUpdated: (newEmail: string | null, isVerified: boolean) => void;
}

export const StudentPersonalEmailManager: React.FC<Props> = ({
  studentId,
  collegeEmail,
  personalEmail,
  isPersonalEmailVerified,
  onUpdated,
}) => {
  const [editOpen, setEditOpen] = useState(false);
  const [emailInput, setEmailInput] = useState(personalEmail || '');
  const [isVerifiedInput, setIsVerifiedInput] = useState(Boolean(isPersonalEmailVerified));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Audit Logs State
  const [auditOpen, setAuditOpen] = useState(false);
  const [auditLogs, setAuditLogs] = useState<StudentAuditLog[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);

  const handleOpenEdit = () => {
    setEmailInput(personalEmail || '');
    setIsVerifiedInput(Boolean(isPersonalEmailVerified));
    setError(null);
    setEditOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const cleanEmail = emailInput.trim() ? emailInput.trim().toLowerCase() : null;
      const res = await academicService.updateAdminPersonalEmail(studentId, cleanEmail, isVerifiedInput);
      onUpdated(res.personalEmail, res.isPersonalEmailVerified);
      setEditOpen(false);
      setSuccess('Personal email record and audit trail updated successfully.');
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to update personal email';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleOpenAuditLogs = async () => {
    setAuditOpen(true);
    setAuditLoading(true);
    setAuditError(null);
    try {
      const logs = await academicService.getStudentAuditLogs(studentId);
      setAuditLogs(logs);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to load audit logs';
      setAuditError(msg);
    } finally {
      setAuditLoading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {success && (
        <Alert severity="success" sx={{ mb: 1 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Personal Email Row */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
          <EmailIcon sx={{ color: '#0284C7', fontSize: 20, mt: 0.3 }} />
          <div>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              Personal Email (Contact Info Only)
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mt: 0.2 }}>
              <Typography variant="body2" fontWeight={600} sx={{ color: personalEmail ? '#1E293B' : '#64748B' }}>
                {personalEmail || 'Not Provided'}
              </Typography>
              {personalEmail ? (
                <Chip
                  icon={isPersonalEmailVerified ? <CheckCircleIcon /> : <WarningAmberIcon />}
                  label={isPersonalEmailVerified ? 'Verified' : 'Unverified'}
                  size="small"
                  color={isPersonalEmailVerified ? 'success' : 'warning'}
                  sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700 }}
                />
              ) : (
                <Chip
                  label="Not Set"
                  size="small"
                  variant="outlined"
                  sx={{ height: 20, fontSize: '0.7rem', color: '#64748B' }}
                />
              )}
            </Box>
            <Typography variant="caption" color="#64748B" sx={{ display: 'block', fontSize: '0.72rem', mt: 0.5 }}>
              Strictly non-login. College email (<strong>{collegeEmail}</strong>) remains the sole login credential.
            </Typography>
          </div>
        </Box>

        <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
          <Tooltip title="Manage Personal Email">
            <Button
              size="small"
              variant="outlined"
              startIcon={<EditIcon fontSize="small" />}
              onClick={handleOpenEdit}
              sx={{ textTransform: 'none', fontSize: '0.75rem', py: 0.4 }}
            >
              Manage
            </Button>
          </Tooltip>
          <Tooltip title="View Modification Audit Logs">
            <Button
              size="small"
              variant="text"
              startIcon={<HistoryIcon fontSize="small" />}
              onClick={handleOpenAuditLogs}
              sx={{ textTransform: 'none', fontSize: '0.75rem', py: 0.4 }}
            >
              Audit Log
            </Button>
          </Tooltip>
        </Box>
      </Box>

      {/* Edit Personal Email Dialog */}
      <Dialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2.5 } }}
      >
        <form onSubmit={handleSave}>
          <DialogTitle sx={{ fontWeight: 700, color: '#14264B', borderBottom: '1px solid #E2E8F0' }}>
            Manage Student Personal Email
          </DialogTitle>
          <DialogContent sx={{ pt: 3, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Alert severity="info" variant="outlined" sx={{ fontSize: '0.8125rem' }}>
              <strong>Critical Security Policy:</strong> Personal email is contact information only. It will never
              be used for login, authentication, or password recovery. Login remains exclusively bound to the official
              college email: <strong>{collegeEmail}</strong>.
            </Alert>

            {error && (
              <Alert severity="error" onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            <TextField
              label="Personal Email Address"
              type="email"
              fullWidth
              placeholder="e.g., student.personal@gmail.com"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              helperText="Leave empty to clear personal email record."
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={isVerifiedInput}
                  onChange={(e) => setIsVerifiedInput(e.target.checked)}
                  color="primary"
                />
              }
              label={
                <Typography variant="body2" fontWeight={600}>
                  Mark Personal Email as Verified (Administrative Authorization)
                </Typography>
              }
            />
          </DialogContent>
          <DialogActions sx={{ p: 2.5, borderTop: '1px solid #E2E8F0' }}>
            <Button onClick={() => setEditOpen(false)} color="inherit">
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={saving} sx={{ bgcolor: '#1765B5' }}>
              {saving ? <CircularProgress size={20} color="inherit" /> : 'Save Personal Email'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Audit Logs Dialog */}
      <Dialog
        open={auditOpen}
        onClose={() => setAuditOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2.5 } }}
      >
        <DialogTitle sx={{ fontWeight: 700, color: '#14264B', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: 1 }}>
          <SecurityIcon sx={{ color: '#1765B5' }} />
          Student Profile Modification Audit Trail
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          {auditError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {auditError}
            </Alert>
          )}

          {auditLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={28} />
            </Box>
          ) : auditLogs.length === 0 ? (
            <Alert severity="info" variant="outlined">
              No audit logs recorded for this student yet.
            </Alert>
          ) : (
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Timestamp</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Action</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Performed By</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Field</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Details</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {auditLogs.map((log) => (
                    <TableRow key={log.id} hover>
                      <TableCell sx={{ whiteSpace: 'nowrap', fontSize: '0.75rem', color: '#64748B' }}>
                        {new Date(log.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={log.action}
                          size="small"
                          color={log.action.includes('EMAIL') ? 'primary' : 'default'}
                          sx={{ fontWeight: 600, fontSize: '0.7rem' }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem' }}>{log.performedBy}</TableCell>
                      <TableCell sx={{ fontSize: '0.75rem' }}>{log.fieldChanged || '—'}</TableCell>
                      <TableCell sx={{ fontSize: '0.75rem' }}>{log.details || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2.5, borderTop: '1px solid #E2E8F0' }}>
          <Button onClick={() => setAuditOpen(false)} variant="contained">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
