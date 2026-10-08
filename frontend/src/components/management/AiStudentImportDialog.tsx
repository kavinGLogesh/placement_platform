import React, { useState, useRef, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  IconButton,
  Chip,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  LinearProgress,
  Alert,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Switch,
  FormControlLabel,
  InputAdornment,
  Divider,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import SyncProblemIcon from '@mui/icons-material/SyncProblem';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import SearchIcon from '@mui/icons-material/Search';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DownloadIcon from '@mui/icons-material/Download';
import SchoolIcon from '@mui/icons-material/School';
import KeyIcon from '@mui/icons-material/Key';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import SortByAlphaIcon from '@mui/icons-material/SortByAlpha';
import { managementService } from '../../services/management.service.js';
import {
  AiStudentImportPreviewResponse,
  AiStudentImportConfirmResponse,
  StudentImportRecordStatus,
} from '../../types/management.types.js';

interface AiStudentImportDialogProps {
  open: boolean;
  onClose: () => void;
  onImportComplete?: () => void;
}

const PROCESSING_STEPS = [
  'Uploading student spreadsheet...',
  'Reading student data rows...',
  'Understanding columns with Gemini AI...',
  'Validating deterministic backend constraints...',
  'Grouping students department-wise...',
  'Grouping courses inside each department...',
  'Applying natural numeric register-number sorting...',
  'Scanning in-file & database duplicates...',
  'Preparing organized preview for review...',
];

export const AiStudentImportDialog: React.FC<AiStudentImportDialogProps> = ({
  open,
  onClose,
  onImportComplete,
}) => {
  // Step: 0 = Upload, 1 = Processing, 2 = Preview/Review, 3 = Confirming, 4 = Result
  const [step, setStep] = useState<0 | 1 | 2 | 3 | 4>(0);
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Processing state
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Preview Data
  const [previewData, setPreviewData] = useState<AiStudentImportPreviewResponse | null>(null);

  // Review Filters
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [selectedCourse, setSelectedCourse] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [skipDuplicates, setSkipDuplicates] = useState<boolean>(true);

  // Confirmation modal inside preview
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [commonPassword, setCommonPassword] = useState<string>('Student@123');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<AiStudentImportConfirmResponse | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset state when closing
  const handleClose = () => {
    if (importing) return;
    setStep(0);
    setFile(null);
    setErrorMsg(null);
    setPreviewData(null);
    setImportResult(null);
    setConfirmModalOpen(false);
    setCommonPassword('Student@123');
    onClose();
  };

  const handleFileSelect = (selectedFile: File) => {
    const validExts = ['.xlsx', '.xls', '.csv'];
    const fileNameLower = selectedFile.name.toLowerCase();
    const isValid = validExts.some((ext) => fileNameLower.endsWith(ext));

    if (!isValid) {
      setErrorMsg('Invalid file format. Please upload an Excel (.xlsx, .xls) or CSV (.csv) file.');
      return;
    }

    setFile(selectedFile);
    setErrorMsg(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  // Start AI Processing
  const handleStartProcessing = async () => {
    if (!file) return;

    setStep(1);
    setCurrentStepIndex(0);
    setErrorMsg(null);

    // Animate real processing steps
    let idx = 0;
    const interval = setInterval(() => {
      idx++;
      if (idx < PROCESSING_STEPS.length) {
        setCurrentStepIndex(idx);
      }
    }, 450);

    try {
      const preview = await managementService.getAiImportPreview(file);
      clearInterval(interval);
      setPreviewData(preview);
      setStep(2); // Jump to preview
    } catch (err: any) {
      clearInterval(interval);
      setStep(0);
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to process student file.');
    }
  };

  // Confirm Import
  const handleExecuteImport = async () => {
    if (!previewData) return;

    setImporting(true);
    setErrorMsg(null);

    try {
      const result = await managementService.confirmAiImport({
        importSessionId: previewData.importSessionId,
        fileName: previewData.fileName,
        skipDuplicates,
        commonTemporaryPassword: commonPassword.trim() || 'Student@123',
      });

      setImportResult(result);
      setConfirmModalOpen(false);
      setStep(4); // Success step
      if (onImportComplete) {
        onImportComplete();
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to confirm student import.');
    } finally {
      setImporting(false);
    }
  };

  // Filtered students in preview
  const filteredStudents = useMemo(() => {
    if (!previewData) return [];
    return previewData.flatRecords.filter((item) => {
      if (selectedDept !== 'ALL' && item.department !== selectedDept) return false;
      if (selectedCourse !== 'ALL' && item.course !== selectedCourse) return false;
      if (selectedStatus !== 'ALL' && item.status !== selectedStatus) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = item.studentName.toLowerCase().includes(q);
        const matchesReg = item.registerNumber.toLowerCase().includes(q);
        const matchesEmail = item.collegeEmail.toLowerCase().includes(q);
        if (!matchesName && !matchesReg && !matchesEmail) return false;
      }
      return true;
    });
  }, [previewData, selectedDept, selectedCourse, selectedStatus, searchQuery]);

  // Unique departments & courses in preview
  const departmentOptions = useMemo(() => {
    if (!previewData) return [];
    return Array.from(new Set(previewData.flatRecords.map((r) => r.department))).filter(Boolean);
  }, [previewData]);

  const courseOptions = useMemo(() => {
    if (!previewData) return [];
    return Array.from(new Set(previewData.flatRecords.map((r) => r.course))).filter(Boolean);
  }, [previewData]);

  // Download Sample Template
  const handleDownloadSample = async () => {
    try {
      const blob = await managementService.downloadTemplate();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Students_Import_Template.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setErrorMsg('Failed to download sample template.');
    }
  };

  // Copy temporary credentials to clipboard
  const handleCopyCredentials = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Render Status Badge
  const renderStatusBadge = (status: StudentImportRecordStatus, reasons?: string[]) => {
    switch (status) {
      case 'VALID':
        return (
          <Chip
            size="small"
            icon={<CheckCircleIcon sx={{ fontSize: 16, color: '#10b981 !important' }} />}
            label="Valid"
            sx={{
              bgcolor: 'rgba(16, 185, 129, 0.12)',
              color: '#059669',
              fontWeight: 600,
              fontSize: '0.75rem',
            }}
          />
        );
      case 'WARNING':
        return (
          <Tooltip title={reasons?.join(', ') || 'Warning'}>
            <Chip
              size="small"
              icon={<WarningAmberIcon sx={{ fontSize: 16, color: '#f59e0b !important' }} />}
              label="Warning"
              sx={{
                bgcolor: 'rgba(245, 158, 11, 0.12)',
                color: '#d97706',
                fontWeight: 600,
                fontSize: '0.75rem',
              }}
            />
          </Tooltip>
        );
      case 'DUPLICATE':
        return (
          <Tooltip title={reasons?.join(', ') || 'Duplicate Record'}>
            <Chip
              size="small"
              icon={<SyncProblemIcon sx={{ fontSize: 16, color: '#8b5cf6 !important' }} />}
              label="Duplicate"
              sx={{
                bgcolor: 'rgba(139, 92, 246, 0.12)',
                color: '#7c3aed',
                fontWeight: 600,
                fontSize: '0.75rem',
              }}
            />
          </Tooltip>
        );
      case 'INVALID':
        return (
          <Tooltip title={reasons?.join(', ') || 'Invalid'}>
            <Chip
              size="small"
              icon={<ErrorOutlineIcon sx={{ fontSize: 16, color: '#ef4444 !important' }} />}
              label="Invalid"
              sx={{
                bgcolor: 'rgba(239, 68, 68, 0.12)',
                color: '#dc2626',
                fontWeight: 600,
                fontSize: '0.75rem',
              }}
            />
          </Tooltip>
        );
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
          bgcolor: '#f8fafc',
          maxHeight: '92vh',
        },
      }}
    >
      {/* HEADER */}
      <DialogTitle
        sx={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          color: '#ffffff',
          px: 3,
          py: 2.2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              p: 0.8,
              borderRadius: 2,
              bgcolor: 'rgba(6, 182, 212, 0.18)',
              color: '#38bdf8',
              display: 'flex',
            }}
          >
            <AutoAwesomeIcon />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.15rem', color: '#f8fafc' }}>
              AI Student Import & Organization
            </Typography>
            <Typography variant="caption" sx={{ color: '#94a3b8' }}>
              Gemini Intelligent Schema Understanding • Department & Course Grouping • Natural Numeric Sorting
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={handleClose} sx={{ color: '#94a3b8', '&:hover': { color: '#ffffff' } }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 3, bgcolor: '#f8fafc' }}>
        {errorMsg && (
          <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }} onClose={() => setErrorMsg(null)}>
            {errorMsg}
          </Alert>
        )}

        {/* ================= STEP 0: FILE UPLOAD ================= */}
        {step === 0 && (
          <Box>
            <Box
              sx={{
                border: '2px dashed',
                borderColor: isDragging ? '#0ea5e9' : '#cbd5e1',
                borderRadius: 3,
                bgcolor: isDragging ? 'rgba(14, 165, 233, 0.04)' : '#ffffff',
                p: 5,
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                '&:hover': {
                  borderColor: '#0284c7',
                  bgcolor: 'rgba(2, 132, 199, 0.02)',
                },
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                style={{ display: 'none' }}
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileSelect(e.target.files[0]);
                  }
                }}
              />
              <Box
                sx={{
                  width: 68,
                  height: 68,
                  borderRadius: '50%',
                  bgcolor: 'rgba(14, 165, 233, 0.1)',
                  color: '#0284c7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                }}
              >
                <CloudUploadIcon sx={{ fontSize: 36 }} />
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b', mb: 0.5 }}>
                {file ? file.name : 'Upload Student Spreadsheet'}
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b', mb: 2 }}>
                Drag & drop your Excel or CSV file here, or click to browse
              </Typography>
              <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block' }}>
                Supported formats: .XLSX, .XLS, .CSV (Max 10 MB)
              </Typography>

              {file && (
                <Chip
                  label={`Selected: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`}
                  color="primary"
                  sx={{ mt: 2, fontWeight: 600 }}
                  onDelete={(e) => {
                    e.stopPropagation();
                    setFile(null);
                  }}
                />
              )}
            </Box>

            {/* AI Mapping Guidance Card */}
            <Card sx={{ mt: 3, borderRadius: 2.5, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                  <AutoAwesomeIcon sx={{ color: '#0284c7', fontSize: 20 }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                    Gemini AI Column Understanding Assistant
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ color: '#475569', mb: 2 }}>
                  Your spreadsheet column headers do not need to be strict. Gemini AI will automatically detect headers like:
                </Typography>
                <Grid container spacing={1.5}>
                  {[
                    { source: '“Dept” or “Department Name”', target: 'Department' },
                    { source: '“Programme” or “Course”', target: 'Course' },
                    { source: '“Reg No” or “Registration Number”', target: 'Register Number' },
                    { source: '“Phone” or “Mobile”', target: 'Mobile Number' },
                    { source: '“DOB” or “Birth Date”', target: 'Date of Birth' },
                    { source: '“Mail” or “College Email”', target: 'College Email (Login ID)' },
                  ].map((item, idx) => (
                    <Grid item xs={12} sm={6} md={4} key={idx}>
                      <Box
                        sx={{
                          p: 1.2,
                          bgcolor: '#f1f5f9',
                          borderRadius: 1.5,
                          border: '1px solid #e2e8f0',
                        }}
                      >
                        <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                          {item.source}
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#0f172a' }}>
                          ↓ {item.target}
                        </Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>

                <Box sx={{ mt: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="caption" sx={{ color: '#64748b' }}>
                    Note: College email from file will be used as login. All students are provisioned with the common default password (Student@123) and will set their own new password upon first login.
                  </Typography>
                  <Button
                    size="small"
                    startIcon={<DownloadIcon />}
                    onClick={handleDownloadSample}
                    sx={{ textTransform: 'none', color: '#0284c7', fontWeight: 600 }}
                  >
                    Download Template
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Box>
        )}

        {/* ================= STEP 1: REAL PROCESSING PROGRESS ================= */}
        {step === 1 && (
          <Box sx={{ py: 6, px: 3, textAlign: 'center' }}>
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                bgcolor: 'rgba(14, 165, 233, 0.1)',
                color: '#0284c7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px',
                animation: 'pulse 2s infinite',
                '@keyframes pulse': {
                  '0%': { transform: 'scale(0.95)', boxShadow: '0 0 0 0 rgba(14, 165, 233, 0.4)' },
                  '70%': { transform: 'scale(1)', boxShadow: '0 0 0 16px rgba(14, 165, 233, 0)' },
                  '100%': { transform: 'scale(0.95)', boxShadow: '0 0 0 0 rgba(14, 165, 233, 0)' },
                },
              }}
            >
              <AutoAwesomeIcon sx={{ fontSize: 40 }} />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#0f172a', mb: 1 }}>
              {PROCESSING_STEPS[currentStepIndex]}
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b', mb: 4, maxWidth: 520, mx: 'auto' }}>
              Gemini AI is reading headers, organizing records by Department → Course → Register Number, and validating backend integrity rules.
            </Typography>

            <Box sx={{ maxWidth: 500, mx: 'auto', mb: 4 }}>
              <LinearProgress
                variant="determinate"
                value={((currentStepIndex + 1) / PROCESSING_STEPS.length) * 100}
                sx={{
                  height: 10,
                  borderRadius: 5,
                  bgcolor: '#e2e8f0',
                  '& .MuiLinearProgress-bar': {
                    background: 'linear-gradient(90deg, #0284c7 0%, #38bdf8 100%)',
                    borderRadius: 5,
                  },
                }}
              />
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, maxWidth: 440, mx: 'auto', textAlign: 'left' }}>
              {PROCESSING_STEPS.slice(0, currentStepIndex + 1).map((s, idx) => (
                <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <CheckCircleIcon sx={{ fontSize: 18, color: idx === currentStepIndex ? '#0284c7' : '#10b981' }} />
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: idx === currentStepIndex ? 700 : 500,
                      color: idx === currentStepIndex ? '#0284c7' : '#475569',
                    }}
                  >
                    {s}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        )}

        {/* ================= STEP 2: AI IMPORT PREVIEW ================= */}
        {step === 2 && previewData && (
          <Box>
            {/* KPI STATS */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={6} sm={4} md={2}>
                <Paper sx={{ p: 2, borderRadius: 2.5, bgcolor: '#ffffff', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                  <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>Total Records</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: '#0f172a', mt: 0.5 }}>
                    {previewData.totalRecords.toLocaleString()}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <Paper sx={{ p: 2, borderRadius: 2.5, bgcolor: '#ffffff', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                  <Typography variant="caption" sx={{ color: '#059669', fontWeight: 600 }}>Valid Records</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: '#059669', mt: 0.5 }}>
                    {previewData.validRecords.toLocaleString()}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <Paper sx={{ p: 2, borderRadius: 2.5, bgcolor: '#ffffff', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                  <Typography variant="caption" sx={{ color: '#7c3aed', fontWeight: 600 }}>Duplicates</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: '#7c3aed', mt: 0.5 }}>
                    {previewData.duplicateRecords.toLocaleString()}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <Paper sx={{ p: 2, borderRadius: 2.5, bgcolor: '#ffffff', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                  <Typography variant="caption" sx={{ color: '#dc2626', fontWeight: 600 }}>Invalid Records</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: '#dc2626', mt: 0.5 }}>
                    {previewData.invalidRecords.toLocaleString()}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <Paper sx={{ p: 2, borderRadius: 2.5, bgcolor: '#ffffff', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                  <Typography variant="caption" sx={{ color: '#0284c7', fontWeight: 600 }}>Departments</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: '#0284c7', mt: 0.5 }}>
                    {previewData.departmentsFound}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <Paper sx={{ p: 2, borderRadius: 2.5, bgcolor: '#ffffff', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                  <Typography variant="caption" sx={{ color: '#0284c7', fontWeight: 600 }}>Courses Found</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: '#0284c7', mt: 0.5 }}>
                    {previewData.coursesFound}
                  </Typography>
                </Paper>
              </Grid>
            </Grid>

            {/* AI COLUMN UNDERSTANDING ACCORDION */}
            <Accordion defaultExpanded sx={{ mb: 2.5, borderRadius: '12px !important', border: '1px solid #e2e8f0', boxShadow: 'none', '&:before': { display: 'none' } }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%' }}>
                  <AutoAwesomeIcon sx={{ color: '#0284c7' }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                    AI Column Mapping Recognition
                  </Typography>
                  <Chip
                    size="small"
                    label={previewData.aiAssisted ? 'Gemini AI Verified' : 'Deterministic Matcher'}
                    color={previewData.aiAssisted ? 'primary' : 'default'}
                    sx={{ fontWeight: 600, fontSize: '0.7rem' }}
                  />
                  <Typography variant="caption" sx={{ color: '#64748b', ml: 'auto', mr: 2 }}>
                    Confidence: {previewData.columnMapping.confidence}%
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 0 }}>
                <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mb: 1.5 }}>
                  {previewData.aiNotes}
                </Typography>
                <Grid container spacing={1.5}>
                  {[
                    { target: 'Department', raw: previewData.columnMapping.department },
                    { target: 'Course', raw: previewData.columnMapping.course },
                    { target: 'Student Name', raw: previewData.columnMapping.studentName },
                    { target: 'Register Number', raw: previewData.columnMapping.registerNumber },
                    { target: 'Mobile Number', raw: previewData.columnMapping.mobileNumber || 'Not present' },
                    { target: 'Date of Birth', raw: previewData.columnMapping.dateOfBirth || 'Not present' },
                    { target: 'College Email', raw: previewData.columnMapping.collegeEmail },
                  ].map((m, idx) => (
                    <Grid item xs={12} sm={6} md={3} key={idx}>
                      <Box sx={{ p: 1.2, bgcolor: '#f8fafc', borderRadius: 1.5, border: '1px solid #e2e8f0' }}>
                        <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                          Standard Field: <strong>{m.target}</strong>
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: m.raw ? '#0284c7' : '#94a3b8' }}>
                          ← “{m.raw || 'N/A'}”
                        </Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </AccordionDetails>
            </Accordion>

            {/* HIERARCHICAL ORGANIZATION TREE SUMMARY */}
            <Card sx={{ mb: 2.5, borderRadius: 2.5, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                  <AccountTreeIcon sx={{ color: '#0284c7' }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                    Department & Course Organization Structure
                  </Typography>
                  <Chip
                    size="small"
                    icon={<SortByAlphaIcon />}
                    label="Sorted by Register Number"
                    sx={{ ml: 1, bgcolor: '#f1f5f9', fontWeight: 600, fontSize: '0.7rem' }}
                  />
                </Box>

                <Grid container spacing={2}>
                  {previewData.hierarchicalData.map((dept, dIdx) => (
                    <Grid item xs={12} md={6} key={dIdx}>
                      <Paper
                        sx={{
                          p: 2,
                          borderRadius: 2,
                          bgcolor: '#ffffff',
                          border: '1px solid #cbd5e1',
                          height: '100%',
                        }}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <SchoolIcon sx={{ color: '#0f172a', fontSize: 20 }} />
                            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a' }}>
                              {dept.departmentName}
                            </Typography>
                          </Box>
                          <Chip
                            size="small"
                            label={`${dept.studentCount} students`}
                            sx={{ fontWeight: 700, bgcolor: 'rgba(2, 132, 199, 0.1)', color: '#0284c7' }}
                          />
                        </Box>

                        <Divider sx={{ my: 1 }} />

                        <Box sx={{ pl: 2, display: 'flex', flexDirection: 'column', gap: 0.8 }}>
                          {dept.courses.map((crs, cIdx) => (
                            <Box
                              key={cIdx}
                              sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                py: 0.4,
                              }}
                            >
                              <Typography variant="body2" sx={{ color: '#334155', fontWeight: 500 }}>
                                └── {crs.courseName}
                              </Typography>
                              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                                {crs.studentCount} students
                              </Typography>
                            </Box>
                          ))}
                        </Box>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>

            {/* STUDENT PREVIEW TABLE WITH FILTERS */}
            <Card sx={{ borderRadius: 2.5, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Box
                  sx={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 1.5,
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    mb: 2,
                  }}
                >
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                    Student Records ({filteredStudents.length} of {previewData.flatRecords.length})
                  </Typography>

                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center' }}>
                    {/* Search */}
                    <TextField
                      size="small"
                      placeholder="Search name, reg no, email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchIcon sx={{ color: '#94a3b8', fontSize: 18 }} />
                          </InputAdornment>
                        ),
                      }}
                      sx={{ width: 220 }}
                    />

                    {/* Department Filter */}
                    <FormControl size="small" sx={{ minWidth: 140 }}>
                      <InputLabel>Department</InputLabel>
                      <Select
                        value={selectedDept}
                        label="Department"
                        onChange={(e) => setSelectedDept(e.target.value)}
                      >
                        <MenuItem value="ALL">All Departments</MenuItem>
                        {departmentOptions.map((d) => (
                          <MenuItem key={d} value={d}>
                            {d}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    {/* Course Filter */}
                    <FormControl size="small" sx={{ minWidth: 140 }}>
                      <InputLabel>Course</InputLabel>
                      <Select
                        value={selectedCourse}
                        label="Course"
                        onChange={(e) => setSelectedCourse(e.target.value)}
                      >
                        <MenuItem value="ALL">All Courses</MenuItem>
                        {courseOptions.map((c) => (
                          <MenuItem key={c} value={c}>
                            {c}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    {/* Status Filter */}
                    <FormControl size="small" sx={{ minWidth: 130 }}>
                      <InputLabel>Status</InputLabel>
                      <Select
                        value={selectedStatus}
                        label="Status"
                        onChange={(e) => setSelectedStatus(e.target.value)}
                      >
                        <MenuItem value="ALL">All Status</MenuItem>
                        <MenuItem value="VALID">✓ Valid</MenuItem>
                        <MenuItem value="WARNING">⚠ Warning</MenuItem>
                        <MenuItem value="DUPLICATE">↻ Duplicate</MenuItem>
                        <MenuItem value="INVALID">✕ Invalid</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                </Box>

                {/* Table */}
                <TableContainer component={Paper} sx={{ maxHeight: 380, border: '1px solid #e2e8f0', borderRadius: 2 }}>
                  <Table stickyHeader size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700, bgcolor: '#f1f5f9' }}>Status</TableCell>
                        <TableCell sx={{ fontWeight: 700, bgcolor: '#f1f5f9' }}>Department</TableCell>
                        <TableCell sx={{ fontWeight: 700, bgcolor: '#f1f5f9' }}>Course</TableCell>
                        <TableCell sx={{ fontWeight: 700, bgcolor: '#f1f5f9' }}>Register No</TableCell>
                        <TableCell sx={{ fontWeight: 700, bgcolor: '#f1f5f9' }}>Student Name</TableCell>
                        <TableCell sx={{ fontWeight: 700, bgcolor: '#f1f5f9' }}>Mobile</TableCell>
                        <TableCell sx={{ fontWeight: 700, bgcolor: '#f1f5f9' }}>DOB</TableCell>
                        <TableCell sx={{ fontWeight: 700, bgcolor: '#f1f5f9' }}>College Email</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredStudents.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} align="center" sx={{ py: 4, color: '#94a3b8' }}>
                            No student records match the selected filters.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredStudents.map((row) => (
                          <TableRow key={row.id} hover>
                            <TableCell>{renderStatusBadge(row.status, row.statusReasons)}</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>{row.department}</TableCell>
                            <TableCell>{row.course}</TableCell>
                            <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700, color: '#0369a1' }}>
                              {row.registerNumber}
                            </TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>{row.studentName}</TableCell>
                            <TableCell>{row.mobileNumber || '-'}</TableCell>
                            <TableCell>{row.dateOfBirth || '-'}</TableCell>
                            <TableCell sx={{ color: '#0f172a' }}>{row.collegeEmail}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>

                {/* Duplicate Handling Option */}
                {previewData.duplicateRecords > 0 && (
                  <Box
                    sx={{
                      mt: 2,
                      p: 1.5,
                      bgcolor: 'rgba(139, 92, 246, 0.06)',
                      borderRadius: 2,
                      border: '1px solid rgba(139, 92, 246, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <SyncProblemIcon sx={{ color: '#7c3aed' }} />
                      <Typography variant="body2" sx={{ color: '#5b21b6', fontWeight: 600 }}>
                        {previewData.duplicateRecords} duplicate records detected. The system will NOT overwrite existing accounts.
                      </Typography>
                    </Box>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={skipDuplicates}
                          onChange={(e) => setSkipDuplicates(e.target.checked)}
                          color="secondary"
                        />
                      }
                      label={<Typography variant="body2" sx={{ fontWeight: 600 }}>Skip duplicates during import</Typography>}
                    />
                  </Box>
                )}
              </CardContent>
            </Card>
          </Box>
        )}

        {/* ================= STEP 4: IMPORT RESULT ================= */}
        {step === 4 && importResult && (
          <Box sx={{ py: 4, px: 2, textAlign: 'center' }}>
            <Box
              sx={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                bgcolor: 'rgba(16, 185, 129, 0.1)',
                color: '#10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
              }}
            >
              <CheckCircleIcon sx={{ fontSize: 44 }} />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#0f172a', mb: 1 }}>
              Student Accounts Successfully Imported!
            </Typography>
            <Typography variant="body1" sx={{ color: '#475569', mb: 3 }}>
              {importResult.message}
            </Typography>

            <Grid container spacing={2} sx={{ maxWidth: 640, mx: 'auto', mb: 4 }}>
              <Grid item xs={4}>
                <Paper sx={{ p: 2, bgcolor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 2 }}>
                  <Typography variant="caption" sx={{ color: '#166534', fontWeight: 600 }}>Accounts Created</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: '#166534', mt: 0.5 }}>
                    {importResult.importedCount}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={4}>
                <Paper sx={{ p: 2, bgcolor: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 2 }}>
                  <Typography variant="caption" sx={{ color: '#5b21b6', fontWeight: 600 }}>Duplicates Skipped</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: '#5b21b6', mt: 0.5 }}>
                    {importResult.duplicateCount}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={4}>
                <Paper sx={{ p: 2, bgcolor: '#fef2f2', border: '1px solid #fecaca', borderRadius: 2 }}>
                  <Typography variant="caption" sx={{ color: '#991b1b', fontWeight: 600 }}>Invalid Skipped</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: '#991b1b', mt: 0.5 }}>
                    {importResult.invalidCount}
                  </Typography>
                </Paper>
              </Grid>
            </Grid>

            {/* Common Temporary Password Highlight Banner */}
            <Box
              sx={{
                maxWidth: 740,
                mx: 'auto',
                p: 2,
                mb: 2.5,
                bgcolor: '#f0f9ff',
                border: '1px solid #bae6fd',
                borderRadius: 2.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 1.5,
                textAlign: 'left',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <KeyIcon sx={{ color: '#0284c7', fontSize: 28 }} />
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0369a1' }}>
                    Common Temporary Password for All Students
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#0284c7', display: 'block', mt: 0.25 }}>
                    Students sign in with their College Email and this common temporary password, then are immediately forced to set a new password.
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: '#ffffff', px: 2, py: 0.75, borderRadius: 2, border: '1px solid #bae6fd' }}>
                <Typography variant="body1" sx={{ fontFamily: 'monospace', fontWeight: 800, color: '#0284c7', fontSize: '1.05rem' }}>
                  {importResult.commonTemporaryPassword || commonPassword || 'Student@123'}
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => handleCopyCredentials(importResult.commonTemporaryPassword || commonPassword || 'Student@123', 'COMMON_KEY')}
                >
                  {copiedKey === 'COMMON_KEY' ? <CheckIcon sx={{ fontSize: 18, color: '#10b981' }} /> : <ContentCopyIcon sx={{ fontSize: 18 }} />}
                </IconButton>
              </Box>
            </Box>

            {/* Temporary Passwords Preview */}
            {importResult.credentials && importResult.credentials.length > 0 && (
              <Card sx={{ maxWidth: 740, mx: 'auto', borderRadius: 2.5, border: '1px solid #e2e8f0', boxShadow: 'none', textAlign: 'left', mb: 3 }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                    <KeyIcon sx={{ color: '#0284c7' }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                      Sample Generated Temporary Credentials
                    </Typography>
                    <Chip
                      size="small"
                      label="Forced Password Change on First Login"
                      color="warning"
                      sx={{ ml: 'auto', fontWeight: 600, fontSize: '0.7rem' }}
                    />
                  </Box>

                  <TableContainer component={Paper} sx={{ maxHeight: 220, border: '1px solid #e2e8f0', borderRadius: 1.5 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700 }}>Register No</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Student Name</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Login Email</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Temporary Password</TableCell>
                          <TableCell sx={{ fontWeight: 700 }} align="center">Copy</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {importResult.credentials.slice(0, 8).map((c, idx) => (
                          <TableRow key={idx}>
                            <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700 }}>{c.registerNumber}</TableCell>
                            <TableCell>{c.name}</TableCell>
                            <TableCell>{c.email}</TableCell>
                            <TableCell sx={{ fontFamily: 'monospace', color: '#0284c7', fontWeight: 600 }}>
                              {c.temporaryPassword}
                            </TableCell>
                            <TableCell align="center">
                              <IconButton
                                size="small"
                                onClick={() => handleCopyCredentials(`${c.email} / ${c.temporaryPassword}`, c.registerNumber)}
                              >
                                {copiedKey === c.registerNumber ? <CheckIcon sx={{ fontSize: 16, color: '#10b981' }} /> : <ContentCopyIcon sx={{ fontSize: 16 }} />}
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            )}
          </Box>
        )}
      </DialogContent>

      {/* FOOTER ACTIONS */}
      <DialogActions
        sx={{
          px: 3,
          py: 2,
          bgcolor: '#ffffff',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        {step === 0 && (
          <>
            <Button onClick={handleClose} sx={{ textTransform: 'none', color: '#64748b' }}>
              Cancel
            </Button>
            <Button
              variant="contained"
              disabled={!file}
              onClick={handleStartProcessing}
              startIcon={<AutoAwesomeIcon />}
              sx={{
                textTransform: 'none',
                fontWeight: 700,
                px: 3,
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)',
              }}
            >
              Understand & Organize with AI
            </Button>
          </>
        )}

        {step === 1 && (
          <Box sx={{ width: '100%', textAlign: 'center' }}>
            <Typography variant="caption" sx={{ color: '#64748b' }}>
              Processing spreadsheet... Please do not close this window.
            </Typography>
          </Box>
        )}

        {step === 2 && (
          <>
            <Button onClick={handleClose} sx={{ textTransform: 'none', color: '#64748b' }}>
              Cancel
            </Button>
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <Button
                variant="outlined"
                onClick={() => setStep(0)}
                sx={{ textTransform: 'none', fontWeight: 600 }}
              >
                Upload Different File
              </Button>
              <Button
                variant="contained"
                onClick={() => setConfirmModalOpen(true)}
                disabled={!previewData || previewData.validRecords === 0}
                sx={{
                  textTransform: 'none',
                  fontWeight: 700,
                  px: 3.5,
                  background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                  boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)',
                }}
              >
                Confirm Import ({previewData?.validRecords} Students)
              </Button>
            </Box>
          </>
        )}

        {step === 4 && (
          <Box sx={{ width: '100%', display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              onClick={handleClose}
              sx={{
                textTransform: 'none',
                fontWeight: 700,
                px: 3,
                background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
              }}
            >
              Done & View Student Directory
            </Button>
          </Box>
        )}
      </DialogActions>

      {/* CONFIRMATION DIALOG MODAL */}
      <Dialog
        open={confirmModalOpen}
        onClose={() => !importing && setConfirmModalOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: '#0f172a', pb: 1 }}>
          Confirm Student Import
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ color: '#334155', mb: 2 }}>
            You are about to create <strong>{previewData?.validRecords}</strong> student accounts.
          </Typography>

          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: '#334155', display: 'block', mb: 0.75 }}>
              Common Temporary Password
            </Typography>
            <TextField
              size="small"
              fullWidth
              value={commonPassword}
              onChange={(e) => setCommonPassword(e.target.value)}
              placeholder="Student@123"
              helperText="All students will use this common password to sign in initially and then be forced to change it."
              FormHelperTextProps={{ sx: { fontSize: '0.72rem', color: '#64748b' } }}
              InputProps={{
                sx: { fontFamily: 'monospace', fontWeight: 600, bgcolor: '#ffffff' },
              }}
            />
          </Box>

          <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0', mb: 2 }}>
            <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
              • Role: Automatically enforced as <strong>STUDENT</strong>
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mt: 0.5 }}>
              • Login Identifier: Student College Email
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mt: 0.5 }}>
              • Initial Password: <strong>{commonPassword || 'Student@123'}</strong> (Bcrypt-hashed)
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mt: 0.5 }}>
              • First Login Policy: Force <em>Create New Password</em>
            </Typography>
          </Box>

          {skipDuplicates && previewData && previewData.duplicateRecords > 0 && (
            <Typography variant="caption" sx={{ color: '#7c3aed', display: 'block', mb: 1 }}>
              Note: {previewData.duplicateRecords} duplicate records will be skipped safely.
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setConfirmModalOpen(false)}
            disabled={importing}
            sx={{ textTransform: 'none', color: '#64748b' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleExecuteImport}
            disabled={importing}
            sx={{
              textTransform: 'none',
              fontWeight: 700,
              px: 3,
              background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
            }}
          >
            {importing ? 'Creating Accounts...' : 'Confirm & Import'}
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
};
