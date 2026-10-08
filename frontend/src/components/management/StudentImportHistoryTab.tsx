import React, { useState, useEffect } from 'react';
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
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Tooltip,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import RefreshIcon from '@mui/icons-material/Refresh';
import HistoryIcon from '@mui/icons-material/History';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import CloseIcon from '@mui/icons-material/Close';
import { managementService } from '../../services/management.service.js';
import { StudentImportHistoryRecord } from '../../types/management.types.js';

export const StudentImportHistoryTab: React.FC = () => {
  const [historyList, setHistoryList] = useState<StudentImportHistoryRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Detail Modal
  const [selectedRecord, setSelectedRecord] = useState<StudentImportHistoryRecord | null>(null);

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await managementService.getImportHistory();
      setHistoryList(data);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load import history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const renderStatus = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <Chip
            size="small"
            icon={<CheckCircleIcon sx={{ fontSize: 16, color: '#10b981 !important' }} />}
            label="Completed"
            sx={{ bgcolor: 'rgba(16, 185, 129, 0.12)', color: '#059669', fontWeight: 600 }}
          />
        );
      case 'PARTIAL':
        return (
          <Chip
            size="small"
            icon={<WarningAmberIcon sx={{ fontSize: 16, color: '#f59e0b !important' }} />}
            label="Partial"
            sx={{ bgcolor: 'rgba(245, 158, 11, 0.12)', color: '#d97706', fontWeight: 600 }}
          />
        );
      default:
        return (
          <Chip
            size="small"
            icon={<ErrorOutlineIcon sx={{ fontSize: 16, color: '#ef4444 !important' }} />}
            label={status || 'Failed'}
            sx={{ bgcolor: 'rgba(239, 68, 68, 0.12)', color: '#dc2626', fontWeight: 600 }}
          />
        );
    }
  };

  const parsedDetails = selectedRecord?.detailsJson ? JSON.parse(selectedRecord.detailsJson) : null;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <HistoryIcon sx={{ color: '#0284c7' }} />
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#0f172a', fontSize: '1.1rem' }}>
            AI Student Import Audit & History
          </Typography>
        </Box>
        <Button
          size="small"
          startIcon={<RefreshIcon />}
          onClick={fetchHistory}
          disabled={loading}
          sx={{ textTransform: 'none', color: '#0284c7', fontWeight: 600 }}
        >
          Refresh
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress size={36} sx={{ color: '#0284c7' }} />
        </Box>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 2.5, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#f8fafc' }}>
                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Import ID</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>File Name</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Uploaded By</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Date & Time</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569' }} align="center">Total</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569' }} align="center">Imported</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569' }} align="center">Duplicates</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569' }} align="center">Invalid</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569' }} align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {historyList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 6, color: '#94a3b8' }}>
                    No import history records found. Upload a student file using the AI Import Students feature to see records here.
                  </TableCell>
                </TableRow>
              ) : (
                historyList.map((rec) => (
                  <TableRow key={rec.id} hover>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#64748b' }}>
                      {rec.id.slice(0, 8)}...
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#0f172a' }}>{rec.fileName}</TableCell>
                    <TableCell sx={{ color: '#475569' }}>{rec.uploadedByEmail}</TableCell>
                    <TableCell sx={{ color: '#64748b', fontSize: '0.8rem' }}>
                      {new Date(rec.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700 }}>{rec.totalRecords}</TableCell>
                    <TableCell align="center" sx={{ color: '#059669', fontWeight: 700 }}>
                      {rec.importedCount}
                    </TableCell>
                    <TableCell align="center" sx={{ color: '#7c3aed', fontWeight: 600 }}>
                      {rec.duplicateCount}
                    </TableCell>
                    <TableCell align="center" sx={{ color: '#dc2626', fontWeight: 600 }}>
                      {rec.invalidCount}
                    </TableCell>
                    <TableCell>{renderStatus(rec.status)}</TableCell>
                    <TableCell align="center">
                      <Tooltip title="View Import Details">
                        <IconButton size="small" onClick={() => setSelectedRecord(rec)}>
                          <VisibilityIcon sx={{ fontSize: 18, color: '#0284c7' }} />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* DETAIL MODAL */}
      <Dialog
        open={Boolean(selectedRecord)}
        onClose={() => setSelectedRecord(null)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#0f172a' }}>
            Import Audit Details
          </Typography>
          <IconButton onClick={() => setSelectedRecord(null)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {selectedRecord && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
              <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                <Typography variant="body2" sx={{ color: '#64748b' }}>
                  File Name: <strong style={{ color: '#0f172a' }}>{selectedRecord.fileName}</strong>
                </Typography>
                <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>
                  Uploaded By: <strong style={{ color: '#0f172a' }}>{selectedRecord.uploadedByEmail}</strong>
                </Typography>
                <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>
                  Date: <strong style={{ color: '#0f172a' }}>{new Date(selectedRecord.createdAt).toLocaleString()}</strong>
                </Typography>
                <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>
                  Status: {renderStatus(selectedRecord.status)}
                </Typography>
              </Box>

              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1 }}>
                <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <Typography variant="caption" sx={{ color: '#64748b' }}>Total</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>{selectedRecord.totalRecords}</Typography>
                </Paper>
                <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                  <Typography variant="caption" sx={{ color: '#166534' }}>Imported</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: '#166534' }}>{selectedRecord.importedCount}</Typography>
                </Paper>
                <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: '#f5f3ff', border: '1px solid #ddd6fe' }}>
                  <Typography variant="caption" sx={{ color: '#5b21b6' }}>Duplicates</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: '#5b21b6' }}>{selectedRecord.duplicateCount}</Typography>
                </Paper>
                <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: '#fef2f2', border: '1px solid #fecaca' }}>
                  <Typography variant="caption" sx={{ color: '#991b1b' }}>Invalid</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: '#991b1b' }}>{selectedRecord.invalidCount}</Typography>
                </Paper>
              </Box>

              {parsedDetails && (
                <Box sx={{ p: 2, bgcolor: '#ffffff', borderRadius: 2, border: '1px solid #e2e8f0', mt: 1 }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#475569', display: 'block', mb: 1 }}>
                    Session Metadata
                  </Typography>
                  <Typography variant="caption" sx={{ fontFamily: 'monospace', color: '#334155', display: 'block' }}>
                    Session ID: {parsedDetails.importSessionId || 'N/A'}
                  </Typography>
                  <Typography variant="caption" sx={{ fontFamily: 'monospace', color: '#334155', display: 'block', mt: 0.5 }}>
                    Import Timestamp: {parsedDetails.importedAt || 'N/A'}
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setSelectedRecord(null)} sx={{ textTransform: 'none', color: '#64748b' }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
