import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Checkbox,
  LinearProgress,
  Tooltip,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import SchoolIcon from '@mui/icons-material/School';
import { academicService } from '../../services/academic.service.js';
import {
  AcademicBulkImportPreviewResult,
  AcademicBulkImportConfirmResult,
  AcademicBulkImportRowPreview,
} from '../../types/academic.types.js';

interface AcademicBulkImportDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AcademicBulkImportDialog: React.FC<AcademicBulkImportDialogProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const [_file, setFile] = useState<File | null>(null);
  const [previewing, setPreviewing] = useState<boolean>(false);
  const [confirming, setConfirming] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<AcademicBulkImportPreviewResult | null>(null);
  const [selectedRegNos, setSelectedRegNos] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<AcademicBulkImportConfirmResult | null>(null);

  const resetState = () => {
    setFile(null);
    setPreviewing(false);
    setConfirming(false);
    setError(null);
    setPreviewData(null);
    setSelectedRegNos(new Set());
    setResult(null);
  };

  const handleClose = () => {
    if (previewing || confirming) return;
    resetState();
    onClose();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.match(/\.(xlsx|xls)$/i)) {
      setError('Please upload an Excel file (.xlsx or .xls)');
      return;
    }

    setFile(selectedFile);
    setError(null);
    setPreviewing(true);

    try {
      const preview = await academicService.previewAcademicBulkImport(selectedFile);
      setPreviewData(preview);
      // Select all rows that are not in ERROR status
      const validNos = new Set<string>();
      preview.previewRecords.forEach((r) => {
        if (r.status !== 'ERROR') {
          validNos.add(r.registerNumber.toUpperCase());
        }
      });
      setSelectedRegNos(validNos);
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Failed to preview academic records import';
      setError(msg);
      setPreviewData(null);
    } finally {
      setPreviewing(false);
    }
  };

  const handleToggleRow = (regNo: string) => {
    const next = new Set(selectedRegNos);
    const upper = regNo.toUpperCase();
    if (next.has(upper)) {
      next.delete(upper);
    } else {
      next.add(upper);
    }
    setSelectedRegNos(next);
  };

  const handleToggleAll = () => {
    if (!previewData) return;
    const validRows = previewData.previewRecords.filter((r) => r.status !== 'ERROR');
    if (selectedRegNos.size === validRows.length) {
      setSelectedRegNos(new Set());
    } else {
      setSelectedRegNos(new Set(validRows.map((r) => r.registerNumber.toUpperCase())));
    }
  };

  const handleConfirmImport = async () => {
    if (!previewData) return;
    if (selectedRegNos.size === 0) {
      setError('Please select at least one row to import.');
      return;
    }

    setConfirming(true);
    setError(null);

    try {
      const res = await academicService.confirmAcademicBulkImport({
        importSessionId: previewData.importSessionId,
        selectedRegisterNumbers: Array.from(selectedRegNos),
      });
      setResult(res);
      onSuccess();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Failed to import academic records';
      setError(msg);
    } finally {
      setConfirming(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          borderBottom: '1px solid #e2e8f0',
          py: 2,
        }}
      >
        <SchoolIcon color="primary" />
        <div>
          <Typography variant="h6" fontWeight={700}>
            Bulk Import Academic Records
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Upload student 10th/12th percentages, UG/PG study status, semester SGPAs, and CGPA from Excel
          </Typography>
        </div>
      </DialogTitle>

      <DialogContent sx={{ py: 3 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2.5 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Step 1: Upload Box (when not previewed or when result completed) */}
        {!previewData && !result && (
          <Box sx={{ py: 3, textAlign: 'center' }}>
            <Box
              sx={{
                border: '2px dashed #cbd5e1',
                borderRadius: 3,
                p: 5,
                bgcolor: '#f8fafc',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                '&:hover': { borderColor: '#0284c7', bgcolor: '#f0f9ff' },
              }}
              component="label"
            >
              <input
                type="file"
                accept=".xlsx, .xls"
                style={{ display: 'none' }}
                onChange={handleFileChange}
                disabled={previewing}
              />
              <UploadFileIcon sx={{ fontSize: 56, color: '#64748b', mb: 1.5 }} />
              <Typography variant="h6" fontWeight={600} color="text.primary" gutterBottom>
                {previewing ? 'Analyzing Excel File...' : 'Choose or Drag & Drop Excel Spreadsheet'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 520, mx: 'auto', mb: 2 }}>
                Supports columns for Register Number, 10th Marks/Percentage, 12th Marks/Percentage, Degree Level (UG/PG), Study Status (STUDYING/COMPLETED), Current Semester, Current CGPA, and Sem 1-8 SGPAs.
              </Typography>
              <Button
                variant="contained"
                component="span"
                disabled={previewing}
                startIcon={previewing ? <CircularProgress size={18} color="inherit" /> : <UploadFileIcon />}
                sx={{
                  bgcolor: '#0284c7',
                  '&:hover': { bgcolor: '#0369a1' },
                  textTransform: 'none',
                  fontWeight: 600,
                  px: 3,
                }}
              >
                {previewing ? 'Parsing Records...' : 'Select Excel File'}
              </Button>
            </Box>

            {previewing && <LinearProgress sx={{ mt: 2, borderRadius: 1 }} />}
          </Box>
        )}

        {/* Step 2: Preview & Validation Table */}
        {previewData && !result && (
          <Box>
            {/* Header Summary Cards */}
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 3 }}>
              <Paper
                variant="outlined"
                sx={{ p: 2, flex: 1, minWidth: 150, borderRadius: 2, bgcolor: '#f8fafc' }}
              >
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  TOTAL ROWS
                </Typography>
                <Typography variant="h5" fontWeight={700}>
                  {previewData.totalRows}
                </Typography>
              </Paper>
              <Paper
                variant="outlined"
                sx={{ p: 2, flex: 1, minWidth: 150, borderRadius: 2, bgcolor: '#f0fdf4', borderColor: '#bbf7d0' }}
              >
                <Typography variant="caption" color="#16a34a" fontWeight={600}>
                  VALID READY TO IMPORT
                </Typography>
                <Typography variant="h5" fontWeight={700} color="#15803d">
                  {previewData.validRowsCount}
                </Typography>
              </Paper>
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  flex: 1,
                  minWidth: 150,
                  borderRadius: 2,
                  bgcolor: previewData.errorRowsCount > 0 ? '#fef2f2' : '#f8fafc',
                  borderColor: previewData.errorRowsCount > 0 ? '#fecaca' : '#e2e8f0',
                }}
              >
                <Typography
                  variant="caption"
                  color={previewData.errorRowsCount > 0 ? '#dc2626' : 'text.secondary'}
                  fontWeight={600}
                >
                  ERROR ROWS
                </Typography>
                <Typography
                  variant="h5"
                  fontWeight={700}
                  color={previewData.errorRowsCount > 0 ? '#b91c1c' : 'text.primary'}
                >
                  {previewData.errorRowsCount}
                </Typography>
              </Paper>
              <Paper
                variant="outlined"
                sx={{ p: 2, flex: 1, minWidth: 150, borderRadius: 2, bgcolor: '#fffbeb', borderColor: '#fef3c7' }}
              >
                <Typography variant="caption" color="#d97706" fontWeight={600}>
                  DUPLICATE ROWS
                </Typography>
                <Typography variant="h5" fontWeight={700} color="#b45309">
                  {previewData.duplicateRowsCount}
                </Typography>
              </Paper>
            </Box>

            {/* Column Mapping Notice */}
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2" fontWeight={600}>
                Detected Columns from &ldquo;{previewData.fileName}&rdquo;:
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {Object.entries(previewData.columnMapping)
                  .map(([field, col]) => `${field} → "${col}"`)
                  .join(' | ')}
              </Typography>
            </Alert>

            {/* Preview Records Table */}
            <TableContainer
              component={Paper}
              variant="outlined"
              sx={{ maxHeight: 380, borderRadius: 2 }}
            >
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox">
                      <Checkbox
                        size="small"
                        checked={
                          selectedRegNos.size > 0 &&
                          selectedRegNos.size ===
                            previewData.previewRecords.filter((r) => r.status !== 'ERROR').length
                        }
                        indeterminate={
                          selectedRegNos.size > 0 &&
                          selectedRegNos.size <
                            previewData.previewRecords.filter((r) => r.status !== 'ERROR').length
                        }
                        onChange={handleToggleAll}
                      />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Row</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Register No.</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Student Name</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>10th %</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>12th %</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Level</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Current Sem</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>CGPA</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Arrears</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Validation</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {previewData.previewRecords.map((row: AcademicBulkImportRowPreview) => {
                    const isError = row.status === 'ERROR';
                    const isWarning = row.status === 'WARNING';
                    const isSelected = selectedRegNos.has(row.registerNumber.toUpperCase());

                    return (
                      <TableRow
                        key={row.rowNumber}
                        hover
                        sx={{
                          bgcolor: isError ? '#fff5f5' : isWarning ? '#fffdf0' : undefined,
                        }}
                      >
                        <TableCell padding="checkbox">
                          <Checkbox
                            size="small"
                            disabled={isError}
                            checked={isSelected}
                            onChange={() => handleToggleRow(row.registerNumber)}
                          />
                        </TableCell>
                        <TableCell>{row.rowNumber}</TableCell>
                        <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                          {row.registerNumber}
                        </TableCell>
                        <TableCell>
                          {row.studentName ? (
                            row.studentName
                          ) : (
                            <Typography variant="caption" color="error.main" fontWeight={600}>
                              Not in Student Directory
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>{row.tenthPercentage ? `${row.tenthPercentage}%` : '-'}</TableCell>
                        <TableCell>{row.twelfthPercentage ? `${row.twelfthPercentage}%` : '-'}</TableCell>
                        <TableCell>
                          <Chip
                            label={row.degreeLevel || 'UG'}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: '0.7rem' }}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={row.studyStatus || 'STUDYING'}
                            size="small"
                            color={row.studyStatus === 'COMPLETED' ? 'success' : 'default'}
                            sx={{ fontSize: '0.7rem' }}
                          />
                        </TableCell>
                        <TableCell>Sem {row.currentSemester || 1}</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>
                          {row.currentCgpa !== undefined && row.currentCgpa !== null
                            ? Number(row.currentCgpa).toFixed(2)
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <Typography
                            variant="body2"
                            color={row.activeBacklogs && row.activeBacklogs > 0 ? 'error.main' : 'text.secondary'}
                            fontWeight={row.activeBacklogs && row.activeBacklogs > 0 ? 700 : 400}
                          >
                            {row.activeBacklogs || 0}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {isError ? (
                            <Tooltip title={row.errors?.join('; ') || 'Row has errors'}>
                              <Chip
                                icon={<ErrorOutlineIcon fontSize="small" />}
                                label="Error"
                                size="small"
                                color="error"
                              />
                            </Tooltip>
                          ) : isWarning ? (
                            <Tooltip title={row.errors?.join('; ') || 'Row has warnings'}>
                              <Chip
                                icon={<WarningAmberIcon fontSize="small" />}
                                label="Warning"
                                size="small"
                                color="warning"
                              />
                            </Tooltip>
                          ) : (
                            <Chip
                              icon={<CheckCircleOutlineIcon fontSize="small" />}
                              label="Valid"
                              size="small"
                              color="success"
                            />
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* Step 3: Success Confirmation View */}
        {result && (
          <Box sx={{ py: 3, textAlign: 'center' }}>
            <CheckCircleOutlineIcon sx={{ fontSize: 64, color: '#16a34a', mb: 1.5 }} />
            <Typography variant="h5" fontWeight={700} gutterBottom>
              Academic Records Import Completed!
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Successfully updated <strong>{result.successCount}</strong> student academic records.
              {result.failedCount > 0 && ` ${result.failedCount} records could not be updated.`}
            </Typography>

            {result.errors.length > 0 && (
              <Box sx={{ mt: 2, textAlign: 'left' }}>
                <Typography variant="subtitle2" color="error.main" fontWeight={700} gutterBottom>
                  Issues Encountered:
                </Typography>
                <Paper variant="outlined" sx={{ p: 2, maxHeight: 160, overflowY: 'auto' }}>
                  {result.errors.map((e, idx) => (
                    <Typography key={idx} variant="caption" display="block" color="text.secondary">
                      <strong>{e.registerNumber}:</strong> {e.message}
                    </Typography>
                  ))}
                </Paper>
              </Box>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2.5, borderTop: '1px solid #e2e8f0' }}>
        <Button onClick={handleClose} color="inherit">
          {result ? 'Close' : 'Cancel'}
        </Button>

        {previewData && !result && (
          <>
            <Button
              onClick={() => {
                setPreviewData(null);
                setFile(null);
              }}
              color="inherit"
            >
              Upload Different File
            </Button>
            <Button
              variant="contained"
              onClick={handleConfirmImport}
              disabled={confirming || selectedRegNos.size === 0}
              startIcon={confirming ? <CircularProgress size={18} color="inherit" /> : <CheckCircleOutlineIcon />}
              sx={{
                bgcolor: '#0284c7',
                '&:hover': { bgcolor: '#0369a1' },
                textTransform: 'none',
                fontWeight: 700,
                px: 3,
              }}
            >
              {confirming
                ? 'Importing Records...'
                : `Confirm Import (${selectedRegNos.size} Records)`}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};
