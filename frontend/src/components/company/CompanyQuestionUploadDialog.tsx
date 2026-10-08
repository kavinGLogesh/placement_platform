import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Card,
  CardContent,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import QuizIcon from '@mui/icons-material/Quiz';
import { companyService } from '../../services/company.service.js';
import { CompanyDto, CompanyQuestionUploadResult } from '../../types/company.types.js';

interface CompanyQuestionUploadDialogProps {
  open: boolean;
  company: CompanyDto | null;
  onClose: () => void;
  onSuccess: () => void;
  onViewQuestions: (company: CompanyDto) => void;
}

export const CompanyQuestionUploadDialog: React.FC<CompanyQuestionUploadDialogProps> = ({
  open,
  company,
  onClose,
  onSuccess,
  onViewQuestions,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CompanyQuestionUploadResult | null>(null);
  const [reportTab, setReportTab] = useState(0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setError(null);
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!company || !selectedFile) return;

    setUploading(true);
    setError(null);

    try {
      const res = await companyService.uploadQuestions(company.id, selectedFile);
      setResult(res);
      onSuccess();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || err?.message || 'Failed to upload and process question file';
      setError(msg);
    } finally {
      setUploading(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setResult(null);
    setError(null);
    setReportTab(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDialogClose = () => {
    handleReset();
    onClose();
  };

  if (!company) return null;

  return (
    <Dialog open={open} onClose={handleDialogClose} maxWidth="md" fullWidth>
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#ffffff',
          color: '#14264B',
          borderBottom: '1px solid #DCE6F5',
          py: 2,
          px: 2.5,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <CloudUploadIcon sx={{ color: '#1765B5', fontSize: 22 }} />
          <Box>
            <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.2, color: '#14264B', fontSize: '1.05rem' }}>
              Upload Question Bank — {company.name} ({company.code})
            </Typography>
            <Typography variant="caption" sx={{ color: '#7182A0', fontSize: '0.74rem' }}>
              Multi-Level Duplicate Detection & Integrity Pipeline
            </Typography>
          </Box>
        </Box>
        <IconButton size="small" onClick={handleDialogClose} sx={{ color: '#7182A0', '&:hover': { color: '#14264B' } }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 2.5, backgroundColor: '#EDF2FF' }}>
        {/* Upload Pipeline Stepper */}
        <Paper
          elevation={0}
          sx={{
            p: 1.5,
            mb: 2.5,
            backgroundColor: '#ffffff',
            border: '1px solid #DCE6F5',
            borderRadius: 1.5,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
            {[
              { num: '1', title: 'Upload File' },
              { num: '2', title: 'Validate Format' },
              { num: '3', title: 'Exact Hash Check' },
              { num: '4', title: 'Semantic Similarity' },
              { num: '5', title: 'Review Report' },
            ].map((step, idx) => (
              <Box key={step.num} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box
                  sx={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    backgroundColor: result ? '#15803d' : uploading ? '#1765B5' : '#DCE6F5',
                    color: result || uploading ? '#ffffff' : '#526584',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                  }}
                >
                  {step.num}
                </Box>
                <Typography variant="caption" sx={{ fontWeight: 600, color: '#405678', fontSize: '0.78rem' }}>
                  {step.title}
                </Typography>
                {idx < 4 && <Typography variant="caption" sx={{ color: '#D1DEF0', mx: 0.5 }}>→</Typography>}
              </Box>
            ))}
          </Box>
        </Paper>

        {error && (
          <Alert severity="error" sx={{ mb: 2.5 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {!result ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* File Dropzone */}
            <Box
              sx={{
                border: '2px dashed #D1DEF0',
                borderRadius: 1.5,
                p: 4,
                textAlign: 'center',
                backgroundColor: '#ffffff',
                cursor: 'pointer',
                transition: 'border-color 0.15s ease, background-color 0.15s ease',
                '&:hover': {
                  borderColor: '#1765B5',
                  backgroundColor: '#EDF2FF',
                },
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv,.json"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              <CloudUploadIcon sx={{ fontSize: 44, color: selectedFile ? '#15803d' : '#1765B5', mb: 1 }} />
              {selectedFile ? (
                <Box>
                  <Typography variant="subtitle2" fontWeight={700} color="#14264B">
                    {selectedFile.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {(selectedFile.size / 1024).toFixed(1)} KB — Click to choose a different file
                  </Typography>
                </Box>
              ) : (
                <Box>
                  <Typography variant="subtitle2" fontWeight={600} color="#14264B" sx={{ mb: 0.5 }}>
                    Click or drag question dataset here
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Supports Microsoft Excel (.xlsx, .xls), CSV (.csv), or JSON format (Max 1,000 questions per batch)
                  </Typography>
                </Box>
              )}
            </Box>

            {/* Template Information Card */}
            <Card variant="outlined" sx={{ backgroundColor: '#ffffff', borderRadius: 1.5, borderColor: '#DCE6F5' }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Typography variant="subtitle2" fontWeight={600} color="#14264B" sx={{ mb: 0.5 }}>
                  Supported Dataset Columns
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.82rem', mb: 0.5 }}>
                  Required: <strong>Question Text</strong>, <strong>Category</strong>, <strong>Topic</strong>,{' '}
                  <strong>Option 1</strong>, <strong>Option 2</strong>, <strong>Option 3</strong>,{' '}
                  <strong>Option 4</strong>, <strong>Correct Option</strong>
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  Optional metadata: <strong>Difficulty</strong> (Easy, Medium, Hard), <strong>Marks</strong>,{' '}
                  <strong>Negative Marks</strong>, <strong>Explanation</strong>, <strong>Source</strong> (e.g. NQT 2024),{' '}
                  <strong>Year</strong> (e.g. 2024).
                </Typography>
              </CardContent>
            </Card>
          </Box>
        ) : (
          /* Upload Result Report */
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Alert
              severity={result.invalidCount > 0 ? 'warning' : 'success'}
              icon={<CheckCircleOutlineIcon fontSize="inherit" />}
              sx={{ fontWeight: 600 }}
            >
              Upload processed with duplicate detection. Total processed: {result.totalRows} row(s).
            </Alert>

            {/* Counts Grid */}
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1.5 }}>
              <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', backgroundColor: '#f0fdf4', borderColor: '#bbf7d0', borderRadius: 1.5 }}>
                <Typography variant="caption" sx={{ color: '#166534', fontWeight: 600, letterSpacing: '0.04em' }}>
                  ACCEPTED
                </Typography>
                <Typography variant="h5" fontWeight={700} color="#166534" sx={{ my: 0.25 }}>
                  {result.acceptedCount}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Unique records created
                </Typography>
              </Paper>

              <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', backgroundColor: '#EDF2FF', borderColor: '#D1DEF0', borderRadius: 1.5 }}>
                <Typography variant="caption" sx={{ color: '#1765B5', fontWeight: 600, letterSpacing: '0.04em' }}>
                  EXACT DUPLICATES
                </Typography>
                <Typography variant="h5" fontWeight={700} color="#1765B5" sx={{ my: 0.25 }}>
                  {result.exactDuplicatesCount}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Linked (skipped DB insert)
                </Typography>
              </Paper>

              <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', backgroundColor: '#fffbeb', borderColor: '#fde68a', borderRadius: 1.5 }}>
                <Typography variant="caption" sx={{ color: '#b45309', fontWeight: 600, letterSpacing: '0.04em' }}>
                  POSSIBLE DUPLICATES
                </Typography>
                <Typography variant="h5" fontWeight={700} color="#b45309" sx={{ my: 0.25 }}>
                  {result.possibleDuplicatesCount}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Flagged for Admin review
                </Typography>
              </Paper>

              <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', backgroundColor: '#fef2f2', borderColor: '#fecaca', borderRadius: 1.5 }}>
                <Typography variant="caption" sx={{ color: '#b91c1c', fontWeight: 600, letterSpacing: '0.04em' }}>
                  INVALID / FAILED
                </Typography>
                <Typography variant="h5" fontWeight={700} color="#b91c1c" sx={{ my: 0.25 }}>
                  {result.invalidCount}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Validation rejected
                </Typography>
              </Paper>
            </Box>

            {/* Report Breakdown Tabs */}
            <Paper variant="outlined" sx={{ backgroundColor: '#ffffff', borderRadius: 1.5, borderColor: '#DCE6F5' }}>
              <Tabs
                value={reportTab}
                onChange={(_, v) => setReportTab(v)}
                sx={{ borderBottom: 1, borderColor: '#DCE6F5', px: 2 }}
              >
                <Tab
                  label={`Exact Duplicates (${result.exactDuplicates.length})`}
                  icon={<ContentCopyIcon sx={{ fontSize: 16 }} />}
                  iconPosition="start"
                  sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.8rem' }}
                />
                <Tab
                  label={`Possible Duplicates (${result.possibleDuplicates.length})`}
                  icon={<WarningAmberIcon sx={{ fontSize: 16 }} />}
                  iconPosition="start"
                  sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.8rem' }}
                />
                <Tab
                  label={`Invalid Rows (${result.invalidQuestions.length})`}
                  icon={<ErrorOutlineIcon sx={{ fontSize: 16 }} />}
                  iconPosition="start"
                  sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.8rem' }}
                />
              </Tabs>

              <Box sx={{ p: 2 }}>
                {reportTab === 0 && (
                  result.exactDuplicates.length > 0 ? (
                    <TableContainer sx={{ maxHeight: 240 }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 600 }}>Row</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Question Text</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Resolution Action</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {result.exactDuplicates.map((item, idx) => (
                            <TableRow key={idx}>
                              <TableCell>{item.row}</TableCell>
                              <TableCell sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {item.questionText}
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label="Linked Existing Question"
                                  size="small"
                                  sx={{ backgroundColor: '#f0f4f9', color: '#1765B5', fontWeight: 600, border: '1px solid #D1DEF0' }}
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                      No exact duplicates detected. All uploaded questions had unique fingerprints.
                    </Typography>
                  )
                )}

                {reportTab === 1 && (
                  result.possibleDuplicates.length > 0 ? (
                    <TableContainer sx={{ maxHeight: 240 }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 600 }}>Row</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Uploaded Question</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Matched Existing Question</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Similarity</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {result.possibleDuplicates.map((item, idx) => (
                            <TableRow key={idx}>
                              <TableCell>{item.row}</TableCell>
                              <TableCell sx={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {item.questionText}
                              </TableCell>
                              <TableCell sx={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {item.matchedQuestionText}
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={`${Math.round(item.similarityScore * 100)}% match`}
                                  size="small"
                                  sx={{ backgroundColor: '#fffbeb', color: '#b45309', fontWeight: 600, border: '1px solid #fde68a' }}
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                      No semantic duplicate candidates flagged.
                    </Typography>
                  )
                )}

                {reportTab === 2 && (
                  result.invalidQuestions.length > 0 ? (
                    <TableContainer sx={{ maxHeight: 240 }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 600 }}>Row</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Question Text</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Validation Error</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {result.invalidQuestions.map((item, idx) => (
                            <TableRow key={idx}>
                              <TableCell>{item.row}</TableCell>
                              <TableCell sx={{ maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {item.questionText || '—'}
                              </TableCell>
                              <TableCell sx={{ color: '#b91c1c', fontWeight: 600 }}>
                                {item.error}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                      All rows passed structural and category-topic validation!
                    </Typography>
                  )
                )}
              </Box>
            </Paper>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, backgroundColor: '#ffffff', borderTop: '1px solid #DCE6F5', display: 'flex', justifyContent: 'space-between' }}>
        <Box>
          {result && (
            <Button variant="text" onClick={handleReset} sx={{ color: '#7182A0' }}>
              Upload Another File
            </Button>
          )}
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" color="secondary" onClick={handleDialogClose}>
            {result ? 'Done' : 'Cancel'}
          </Button>

          {!result ? (
            <Button
              variant="contained"
              color="primary"
              disabled={!selectedFile || uploading}
              startIcon={uploading ? <CircularProgress size={16} color="inherit" /> : <CloudUploadIcon />}
              onClick={handleUpload}
            >
              {uploading ? 'Processing & Detecting Duplicates...' : 'Upload & Analyze'}
            </Button>
          ) : (
            <Button
              variant="contained"
              color="primary"
              startIcon={<QuizIcon />}
              onClick={() => {
                handleDialogClose();
                onViewQuestions(company);
              }}
            >
              View in Question Bank
            </Button>
          )}
        </Box>
      </DialogActions>
    </Dialog>
  );
};
