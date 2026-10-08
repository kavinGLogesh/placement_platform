import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  TextField,
  InputAdornment,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import LockResetIcon from '@mui/icons-material/LockReset';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import { Student } from '../../types/management.types.js';
import { managementService } from '../../services/management.service.js';

interface StudentAccountsTabProps {
  students: Student[];
  onRefresh: () => void;
}

export const StudentAccountsTab: React.FC<StudentAccountsTabProps> = ({ students, onRefresh }) => {
  const [search, setSearch] = useState('');
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [resetting, setResetting] = useState(false);
  const [resetResult, setResetResult] = useState<{ email: string; temporaryPassword: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredStudents = students.filter((s) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.registerNumber.toLowerCase().includes(q) ||
      s.collegeEmail.toLowerCase().includes(q) ||
      (s.department?.name && s.department.name.toLowerCase().includes(q))
    );
  });

  const handleOpenReset = (student: Student) => {
    setSelectedStudent(student);
    setResetResult(null);
    setError(null);
    setResetModalOpen(true);
  };

  const handleExecuteReset = async () => {
    if (!selectedStudent) return;
    setResetting(true);
    setError(null);
    try {
      const res = await managementService.resetStudentPassword(selectedStudent.id);
      setResetResult(res);
      onRefresh();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to reset student password.');
    } finally {
      setResetting(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <PeopleAltIcon sx={{ color: '#0284c7' }} />
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#0f172a', fontSize: '1.1rem' }}>
            Student Authentication Accounts & Credentials
          </Typography>
        </Box>
        <TextField
          size="small"
          placeholder="Search by student, register no, or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: '#94a3b8', fontSize: 18 }} />
              </InputAdornment>
            ),
          }}
          sx={{ width: 320 }}
        />
      </Box>

      <TableContainer component={Paper} sx={{ borderRadius: 2.5, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: '#f8fafc' }}>
              <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Register Number</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Student Name</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#475569' }}>College Email (Login Identifier)</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Department</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Account Status</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Role</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#475569' }} align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredStudents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 6, color: '#94a3b8' }}>
                  No student accounts found.
                </TableCell>
              </TableRow>
            ) : (
              filteredStudents.map((s) => (
                <TableRow key={s.id} hover>
                  <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700, color: '#0369a1' }}>
                    {s.registerNumber}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#0f172a' }}>{s.name}</TableCell>
                  <TableCell sx={{ color: '#334155' }}>{s.collegeEmail}</TableCell>
                  <TableCell>{s.department?.code || s.department?.name || '-'}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={s.status}
                      color={s.status === 'ACTIVE' ? 'success' : 'default'}
                      sx={{ fontWeight: 600, fontSize: '0.72rem' }}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label="STUDENT"
                      sx={{ bgcolor: '#f1f5f9', color: '#475569', fontWeight: 600, fontSize: '0.72rem' }}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Reset Temporary Password">
                      <Button
                        size="small"
                        startIcon={<LockResetIcon sx={{ fontSize: 16 }} />}
                        onClick={() => handleOpenReset(s)}
                        sx={{ textTransform: 'none', color: '#0284c7', fontWeight: 600, fontSize: '0.75rem' }}
                      >
                        Reset Password
                      </Button>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* RESET PASSWORD MODAL */}
      <Dialog
        open={resetModalOpen}
        onClose={() => !resetting && setResetModalOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 700, color: '#0f172a' }}>
          Reset Student Password
        </DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          {selectedStudent && !resetResult && (
            <Box>
              <Typography variant="body2" sx={{ color: '#475569', mb: 2 }}>
                Are you sure you want to reset the password for{' '}
                <strong>{selectedStudent.name}</strong> ({selectedStudent.registerNumber})?
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b' }}>
                A secure temporary password will be generated. The student will be forced to create a new password on their next login.
              </Typography>
            </Box>
          )}

          {resetResult && (
            <Box sx={{ mt: 1, p: 2, bgcolor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 2 }}>
              <Typography variant="subtitle2" sx={{ color: '#166534', fontWeight: 700, mb: 1 }}>
                Password Successfully Reset!
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                Login Email: <strong>{resetResult.email}</strong>
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1 }}>
                <Typography variant="body1" sx={{ fontFamily: 'monospace', fontWeight: 700, color: '#0284c7' }}>
                  {resetResult.temporaryPassword}
                </Typography>
                <Button
                  size="small"
                  startIcon={copied ? <CheckIcon /> : <ContentCopyIcon />}
                  onClick={() => handleCopy(resetResult.temporaryPassword)}
                  sx={{ textTransform: 'none' }}
                >
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setResetModalOpen(false)} sx={{ textTransform: 'none', color: '#64748b' }}>
            {resetResult ? 'Close' : 'Cancel'}
          </Button>
          {!resetResult && (
            <Button
              variant="contained"
              onClick={handleExecuteReset}
              disabled={resetting}
              sx={{
                textTransform: 'none',
                fontWeight: 700,
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              }}
            >
              {resetting ? 'Resetting...' : 'Reset Password'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};
