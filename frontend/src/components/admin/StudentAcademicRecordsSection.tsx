import React, { useState } from 'react';
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
  IconButton,
  Tooltip,
} from '@mui/material';
import SchoolIcon from '@mui/icons-material/School';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import EditIcon from '@mui/icons-material/Edit';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DownloadIcon from '@mui/icons-material/Download';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { StudentAcademicRecord, UpsertAcademicRecordInput } from '../../types/academic.types.js';
import { academicService } from '../../services/academic.service.js';

interface Props {
  studentId: string;
  studentRegisterNumber: string;
  initialRecord: StudentAcademicRecord | null;
  onRecordUpdated: () => void;
}

export const StudentAcademicRecordsSection: React.FC<Props> = ({
  studentId,
  studentRegisterNumber,
  initialRecord,
  onRecordUpdated,
}) => {
  const [record, setRecord] = useState<StudentAcademicRecord | null>(initialRecord);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Marksheet Upload Modal State
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadDocType, setUploadDocType] = useState<'tenth' | 'twelfth' | 'semester'>('tenth');
  const [uploadSemesterNumber, setUploadSemesterNumber] = useState<number | undefined>(undefined);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // View / Download Loading State
  const [downloadingDoc, setDownloadingDoc] = useState<string | null>(null);

  // Edit Form State
  const [editForm, setEditForm] = useState<UpsertAcademicRecordInput>({
    tenthBoard: initialRecord?.tenthBoard || '',
    tenthPassingYear: initialRecord?.tenthPassingYear || 2020,
    tenthTotalMarks: initialRecord?.tenthTotalMarks || 500,
    tenthObtainedMarks: initialRecord?.tenthObtainedMarks || 450,
    tenthPercentage: initialRecord?.tenthPercentage || 90.0,

    twelfthBoard: initialRecord?.twelfthBoard || '',
    twelfthPassingYear: initialRecord?.twelfthPassingYear || 2022,
    twelfthTotalMarks: initialRecord?.twelfthTotalMarks || 600,
    twelfthObtainedMarks: initialRecord?.twelfthObtainedMarks || 540,
    twelfthPercentage: initialRecord?.twelfthPercentage || 90.0,

    ugDegree: initialRecord?.ugDegree || 'B.Tech',
    ugBranch: initialRecord?.ugBranch || 'Computer Science & Engineering',
    degreeLevel: initialRecord?.degreeLevel || 'UG',
    studyStatus: initialRecord?.studyStatus || 'STUDYING',
    currentSemester: initialRecord?.currentSemester || 1,
    currentCgpa: initialRecord?.currentCgpa || 8.5,
    activeBacklogs: initialRecord?.activeBacklogs || 0,
    historyOfBacklogs: initialRecord?.historyOfBacklogs || 0,

    semesters: Array.from({ length: 8 }, (_, i) => {
      const existing = initialRecord?.semesters?.find((s) => s.semesterNumber === i + 1);
      return {
        semesterNumber: i + 1,
        sgpa: existing?.sgpa ?? (i < 4 ? 8.5 : null),
        cgpa: existing?.cgpa ?? (i < 4 ? 8.5 : null),
        totalCredits: existing?.totalCredits ?? 24,
        creditsEarned: existing?.creditsEarned ?? 24,
        backlogsCount: existing?.backlogsCount ?? 0,
      };
    }),
  });

  const openEditDialog = () => {
    setEditForm({
      tenthBoard: record?.tenthBoard || '',
      tenthPassingYear: record?.tenthPassingYear || 2020,
      tenthTotalMarks: record?.tenthTotalMarks || 500,
      tenthObtainedMarks: record?.tenthObtainedMarks || 450,
      tenthPercentage: record?.tenthPercentage || 90.0,

      twelfthBoard: record?.twelfthBoard || '',
      twelfthPassingYear: record?.twelfthPassingYear || 2022,
      twelfthTotalMarks: record?.twelfthTotalMarks || 600,
      twelfthObtainedMarks: record?.twelfthObtainedMarks || 540,
      twelfthPercentage: record?.twelfthPercentage || 90.0,

      ugDegree: record?.ugDegree || 'B.Tech',
      ugBranch: record?.ugBranch || 'Computer Science & Engineering',
      degreeLevel: record?.degreeLevel || 'UG',
      studyStatus: record?.studyStatus || 'STUDYING',
      currentSemester: record?.currentSemester || 1,
      currentCgpa: record?.currentCgpa || 8.5,
      activeBacklogs: record?.activeBacklogs || 0,
      historyOfBacklogs: record?.historyOfBacklogs || 0,

      semesters: Array.from({ length: 8 }, (_, i) => {
        const existing = record?.semesters?.find((s) => s.semesterNumber === i + 1);
        return {
          semesterNumber: i + 1,
          sgpa: existing?.sgpa ?? null,
          cgpa: existing?.cgpa ?? null,
          totalCredits: existing?.totalCredits ?? 24,
          creditsEarned: existing?.creditsEarned ?? 24,
          backlogsCount: existing?.backlogsCount ?? 0,
        };
      }),
    });
    setEditOpen(true);
  };

  const handleSaveAcademicRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setActionError(null);
    try {
      const updated = await academicService.updateAdminAcademicRecord(studentId, editForm);
      setRecord(updated);
      setEditOpen(false);
      setActionSuccess('Academic records saved and synchronized successfully.');
      onRecordUpdated();
      setTimeout(() => setActionSuccess(null), 5000);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to save academic records';
      setActionError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleOpenUploadModal = (docType: 'tenth' | 'twelfth' | 'semester', semNo?: number) => {
    setUploadDocType(docType);
    setUploadSemesterNumber(semNo);
    setSelectedFile(null);
    setUploadModalOpen(true);
  };

  const handleUploadSubmit = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setActionError(null);
    try {
      const updated = await academicService.uploadMarksheet(
        studentId,
        uploadDocType,
        selectedFile,
        uploadSemesterNumber
      );
      setRecord(updated);
      setUploadModalOpen(false);
      setActionSuccess(
        `Marksheet for ${
          uploadDocType === 'tenth'
            ? '10th Standard'
            : uploadDocType === 'twelfth'
            ? '12th Standard'
            : `Semester ${uploadSemesterNumber}`
        } uploaded securely.`
      );
      onRecordUpdated();
      setTimeout(() => setActionSuccess(null), 5000);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to upload marksheet file';
      setActionError(msg);
    } finally {
      setUploading(false);
    }
  };

  const handleViewOrDownloadDoc = async (
    docType: 'tenth' | 'twelfth' | 'semester',
    semesterNumber?: number,
    isInline: boolean = false
  ) => {
    const key = `${docType}_${semesterNumber || ''}_${isInline ? 'view' : 'dl'}`;
    setDownloadingDoc(key);
    setActionError(null);
    try {
      const { blob, filename } = await academicService.downloadMarksheetBlob(
        studentId,
        docType,
        semesterNumber
      );
      const fileUrl = window.URL.createObjectURL(blob);
      if (isInline) {
        window.open(fileUrl, '_blank');
      } else {
        const link = document.createElement('a');
        link.href = fileUrl;
        link.download = filename || `${studentRegisterNumber}_${docType}_Marksheet.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      setTimeout(() => window.URL.revokeObjectURL(fileUrl), 10000);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || err?.message || 'Unable to retrieve marksheet document';
      setActionError(msg);
    } finally {
      setDownloadingDoc(null);
    }
  };

  return (
    <Card sx={{ border: '1px solid #DCE6F5', borderRadius: '8px', bgcolor: '#ffffff' }}>
      <CardContent sx={{ p: 3.5 }}>
        {/* Section Header */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 2,
            mb: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <SchoolIcon sx={{ color: '#1765B5', fontSize: 28 }} />
            <div>
              <Typography variant="h6" fontWeight={700} sx={{ color: '#14264B' }}>
                Student Academic Records & Marksheets
              </Typography>
              <Typography variant="body2" color="text.secondary">
                10th, 12th, and Undergraduate semester-wise credentials with verified marksheets.
              </Typography>
            </div>
          </Box>

          <Button
            variant="contained"
            size="small"
            startIcon={<EditIcon fontSize="small" />}
            onClick={openEditDialog}
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
            Manage Academic Records
          </Button>
        </Box>

        {actionSuccess && (
          <Alert severity="success" sx={{ mb: 2.5 }} onClose={() => setActionSuccess(null)}>
            {actionSuccess}
          </Alert>
        )}

        {actionError && (
          <Alert severity="error" sx={{ mb: 2.5 }} onClose={() => setActionError(null)}>
            {actionError}
          </Alert>
        )}

        <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
          <Typography variant="body2" fontWeight={600}>
            University Grading & Marksheets Policy
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Cumulative Grade Point Average (CGPA) is calculated strictly in accordance with applicable university grading rules from completed semester SGPAs. Marksheet document uploads are strictly optional and are not required to complete academic records or compute CGPA.
          </Typography>
        </Alert>

        {/* Top Cards: 10th Standard & 12th Standard */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {/* 10th Standard Card */}
          <Grid item xs={12} md={6}>
            <Box
              sx={{
                p: 3,
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
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="subtitle1" fontWeight={700} color="#1E293B">
                    Secondary (10th Standard)
                  </Typography>
                  <Chip
                    label={record?.hasTenthMarksheet ? 'Marksheet Verified' : 'No Marksheet'}
                    size="small"
                    color={record?.hasTenthMarksheet ? 'success' : 'default'}
                    icon={record?.hasTenthMarksheet ? <CheckCircleIcon /> : <WarningAmberIcon />}
                    sx={{ fontWeight: 600 }}
                  />
                </Box>

                <Grid container spacing={1.5}>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Board / Council
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {record?.tenthBoard || '—'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Passing Year
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {record?.tenthPassingYear || '—'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Marks (Obtained / Total)
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {record?.tenthObtainedMarks != null && record?.tenthTotalMarks != null
                        ? `${record.tenthObtainedMarks} / ${record.tenthTotalMarks}`
                        : '—'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Percentage
                    </Typography>
                    <Typography variant="h6" fontWeight={800} color="#0284C7">
                      {record?.tenthPercentage != null ? `${record.tenthPercentage.toFixed(2)}%` : '—'}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>

              <Box sx={{ mt: 2.5, pt: 2, borderTop: '1px solid #E2E8F0', display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<CloudUploadIcon fontSize="small" />}
                  onClick={() => handleOpenUploadModal('tenth')}
                  sx={{ textTransform: 'none', fontWeight: 600 }}
                >
                  {record?.hasTenthMarksheet ? 'Replace Marksheet' : 'Upload Marksheet'}
                </Button>
                {record?.hasTenthMarksheet && (
                  <>
                    <Button
                      size="small"
                      variant="outlined"
                      color="primary"
                      startIcon={
                        downloadingDoc === 'tenth__view' ? (
                          <CircularProgress size={14} />
                        ) : (
                          <VisibilityIcon fontSize="small" />
                        )
                      }
                      onClick={() => handleViewOrDownloadDoc('tenth', undefined, true)}
                      disabled={Boolean(downloadingDoc)}
                      sx={{ textTransform: 'none' }}
                    >
                      View
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      color="primary"
                      startIcon={
                        downloadingDoc === 'tenth__dl' ? (
                          <CircularProgress size={14} />
                        ) : (
                          <DownloadIcon fontSize="small" />
                        )
                      }
                      onClick={() => handleViewOrDownloadDoc('tenth', undefined, false)}
                      disabled={Boolean(downloadingDoc)}
                      sx={{ textTransform: 'none' }}
                    >
                      Download
                    </Button>
                  </>
                )}
              </Box>
            </Box>
          </Grid>

          {/* 12th Standard Card */}
          <Grid item xs={12} md={6}>
            <Box
              sx={{
                p: 3,
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
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="subtitle1" fontWeight={700} color="#1E293B">
                    Higher Secondary / 12th Standard / Diploma
                  </Typography>
                  <Chip
                    label={record?.hasTwelfthMarksheet ? 'Marksheet Verified' : 'No Marksheet'}
                    size="small"
                    color={record?.hasTwelfthMarksheet ? 'success' : 'default'}
                    icon={record?.hasTwelfthMarksheet ? <CheckCircleIcon /> : <WarningAmberIcon />}
                    sx={{ fontWeight: 600 }}
                  />
                </Box>

                <Grid container spacing={1.5}>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Board / Institution
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {record?.twelfthBoard || '—'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Passing Year
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {record?.twelfthPassingYear || '—'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Marks (Obtained / Total)
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {record?.twelfthObtainedMarks != null && record?.twelfthTotalMarks != null
                        ? `${record.twelfthObtainedMarks} / ${record.twelfthTotalMarks}`
                        : '—'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Percentage
                    </Typography>
                    <Typography variant="h6" fontWeight={800} color="#0284C7">
                      {record?.twelfthPercentage != null ? `${record.twelfthPercentage.toFixed(2)}%` : '—'}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>

              <Box sx={{ mt: 2.5, pt: 2, borderTop: '1px solid #E2E8F0', display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<CloudUploadIcon fontSize="small" />}
                  onClick={() => handleOpenUploadModal('twelfth')}
                  sx={{ textTransform: 'none', fontWeight: 600 }}
                >
                  {record?.hasTwelfthMarksheet ? 'Replace Marksheet' : 'Upload Marksheet'}
                </Button>
                {record?.hasTwelfthMarksheet && (
                  <>
                    <Button
                      size="small"
                      variant="outlined"
                      color="primary"
                      startIcon={
                        downloadingDoc === 'twelfth__view' ? (
                          <CircularProgress size={14} />
                        ) : (
                          <VisibilityIcon fontSize="small" />
                        )
                      }
                      onClick={() => handleViewOrDownloadDoc('twelfth', undefined, true)}
                      disabled={Boolean(downloadingDoc)}
                      sx={{ textTransform: 'none' }}
                    >
                      View
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      color="primary"
                      startIcon={
                        downloadingDoc === 'twelfth__dl' ? (
                          <CircularProgress size={14} />
                        ) : (
                          <DownloadIcon fontSize="small" />
                        )
                      }
                      onClick={() => handleViewOrDownloadDoc('twelfth', undefined, false)}
                      disabled={Boolean(downloadingDoc)}
                      sx={{ textTransform: 'none' }}
                    >
                      Download
                    </Button>
                  </>
                )}
              </Box>
            </Box>
          </Grid>
        </Grid>

        {/* Undergraduate Degree Overview Card */}
        <Box
          sx={{
            p: 3,
            borderRadius: 2,
            bgcolor: '#F0F9FF',
            border: '1px solid #BAE6FD',
            mb: 3,
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <MenuBookIcon sx={{ color: '#0369A1' }} />
              <Typography variant="subtitle1" fontWeight={700} color="#0369A1">
                Degree Program & Academic Standing
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
              <Chip
                label={record?.degreeLevel || 'UG'}
                size="small"
                color="primary"
                sx={{ fontWeight: 700 }}
              />
              <Chip
                label={record?.studyStatus || 'STUDYING'}
                size="small"
                color={record?.studyStatus === 'COMPLETED' ? 'success' : 'default'}
                sx={{ fontWeight: 700 }}
              />
              <Chip
                label={`Current: Sem ${record?.currentSemester || 1}`}
                size="small"
                variant="outlined"
                color="info"
                sx={{ fontWeight: 700 }}
              />
              <Chip
                label={`Active Backlogs: ${record?.activeBacklogs || 0}`}
                size="small"
                color={record?.activeBacklogs && record.activeBacklogs > 0 ? 'error' : 'success'}
                sx={{ fontWeight: 700 }}
              />
              <Chip
                label={`Backlog History: ${record?.historyOfBacklogs || 0}`}
                size="small"
                variant="outlined"
                sx={{ fontWeight: 600 }}
              />
            </Box>
          </Box>

          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <Typography variant="caption" color="text.secondary">
                Degree & Branch
              </Typography>
              <Typography variant="body1" fontWeight={600} color="#1E293B">
                {record?.ugDegree || 'B.Tech'} - {record?.ugBranch || 'Computer Science & Engineering'}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Typography variant="caption" color="text.secondary">
                Cumulative CGPA (Overall)
              </Typography>
              <Typography variant="h5" fontWeight={800} color="#0D9488">
                {record?.currentCgpa != null ? Number(record.currentCgpa).toFixed(2) : '—'}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Typography variant="caption" color="text.secondary">
                Placement Drive Standing
              </Typography>
              <Typography variant="body2" fontWeight={600} color="#0369A1">
                {(!record?.activeBacklogs || record.activeBacklogs === 0) && (record?.currentCgpa || 0) >= 7.5
                  ? 'All Tier-1 Direct Eligibility Criteria Met'
                  : 'Review Drive-Specific Eligibility'}
              </Typography>
            </Grid>
          </Grid>
        </Box>

        {/* Semester-Wise Records Table */}
        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5, color: '#1E293B' }}>
          Semester-Wise Progression (Semesters 1 to 8)
        </Typography>

        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: '#F8FAFC' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Semester</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">SGPA</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">CGPA</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">Credits (Earned / Total)</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">Arrears / Backlogs</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">Marksheet Document</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {Array.from({ length: 8 }, (_, i) => {
                const semNo = i + 1;
                const sem = record?.semesters?.find((s) => s.semesterNumber === semNo);
                return (
                  <TableRow key={semNo} hover>
                    <TableCell sx={{ fontWeight: 700, color: '#1E293B' }}>
                      Semester {semNo}
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600 }}>
                      {sem?.sgpa != null ? Number(sem.sgpa).toFixed(2) : '—'}
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600 }}>
                      {sem?.cgpa != null ? Number(sem.cgpa).toFixed(2) : '—'}
                    </TableCell>
                    <TableCell align="center">
                      {sem?.creditsEarned != null && sem?.totalCredits != null
                        ? `${sem.creditsEarned} / ${sem.totalCredits}`
                        : '—'}
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={sem?.backlogsCount ? `${sem.backlogsCount} Backlogs` : '0 Backlogs'}
                        size="small"
                        color={sem?.backlogsCount && sem.backlogsCount > 0 ? 'error' : 'default'}
                        variant={sem?.backlogsCount ? 'filled' : 'outlined'}
                        sx={{ fontWeight: 600, fontSize: '0.72rem' }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      {sem?.hasMarksheet ? (
                        <Chip
                          icon={<PictureAsPdfIcon fontSize="small" />}
                          label="Verified File"
                          size="small"
                          color="success"
                          sx={{ fontWeight: 600, fontSize: '0.72rem' }}
                        />
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          Not uploaded
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                        <Tooltip title={sem?.hasMarksheet ? 'Replace Marksheet' : 'Upload Marksheet'}>
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleOpenUploadModal('semester', semNo)}
                          >
                            <CloudUploadIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {sem?.hasMarksheet && (
                          <>
                            <Tooltip title="View Marksheet">
                              <IconButton
                                size="small"
                                onClick={() => handleViewOrDownloadDoc('semester', semNo, true)}
                                disabled={Boolean(downloadingDoc)}
                              >
                                {downloadingDoc === `semester_${semNo}_view` ? (
                                  <CircularProgress size={16} />
                                ) : (
                                  <VisibilityIcon fontSize="small" />
                                )}
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Download Marksheet">
                              <IconButton
                                size="small"
                                onClick={() => handleViewOrDownloadDoc('semester', semNo, false)}
                                disabled={Boolean(downloadingDoc)}
                              >
                                {downloadingDoc === `semester_${semNo}_dl` ? (
                                  <CircularProgress size={16} />
                                ) : (
                                  <DownloadIcon fontSize="small" />
                                )}
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>

      {/* Edit Academic Records Dialog */}
      <Dialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2.5 } }}
      >
        <form onSubmit={handleSaveAcademicRecord}>
          <DialogTitle sx={{ fontWeight: 700, color: '#14264B', borderBottom: '1px solid #E2E8F0' }}>
            Edit Student Academic Credentials
          </DialogTitle>
          <DialogContent sx={{ pt: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* 10th Standard Inputs */}
            <Box>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5, color: '#1E293B' }}>
                10th Standard Details
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Board / Council"
                    fullWidth
                    size="small"
                    value={editForm.tenthBoard || ''}
                    onChange={(e) => setEditForm({ ...editForm, tenthBoard: e.target.value })}
                  />
                </Grid>
                <Grid item xs={6} sm={2}>
                  <TextField
                    label="Passing Year"
                    type="number"
                    fullWidth
                    size="small"
                    value={editForm.tenthPassingYear || ''}
                    onChange={(e) =>
                      setEditForm({ ...editForm, tenthPassingYear: Number(e.target.value) || null })
                    }
                  />
                </Grid>
                <Grid item xs={6} sm={2}>
                  <TextField
                    label="Total Marks"
                    type="number"
                    fullWidth
                    size="small"
                    value={editForm.tenthTotalMarks || ''}
                    onChange={(e) => {
                      const total = Number(e.target.value) || null;
                      const obt = editForm.tenthObtainedMarks || 0;
                      const pct = total && total > 0 ? Number(((obt / total) * 100).toFixed(2)) : null;
                      setEditForm({ ...editForm, tenthTotalMarks: total, tenthPercentage: pct });
                    }}
                  />
                </Grid>
                <Grid item xs={6} sm={2}>
                  <TextField
                    label="Obtained Marks"
                    type="number"
                    fullWidth
                    size="small"
                    value={editForm.tenthObtainedMarks || ''}
                    onChange={(e) => {
                      const obt = Number(e.target.value) || null;
                      const total = editForm.tenthTotalMarks || 0;
                      const pct = total && total > 0 && obt ? Number(((obt / total) * 100).toFixed(2)) : null;
                      setEditForm({ ...editForm, tenthObtainedMarks: obt, tenthPercentage: pct });
                    }}
                  />
                </Grid>
                <Grid item xs={6} sm={2}>
                  <TextField
                    label="Percentage (%)"
                    type="number"
                    fullWidth
                    size="small"
                    inputProps={{ step: 0.01, min: 0, max: 100 }}
                    value={editForm.tenthPercentage || ''}
                    onChange={(e) =>
                      setEditForm({ ...editForm, tenthPercentage: Number(e.target.value) || null })
                    }
                  />
                </Grid>
              </Grid>
            </Box>

            <Divider />

            {/* 12th Standard Inputs */}
            <Box>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5, color: '#1E293B' }}>
                12th Standard / Diploma Details
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Board / Institution"
                    fullWidth
                    size="small"
                    value={editForm.twelfthBoard || ''}
                    onChange={(e) => setEditForm({ ...editForm, twelfthBoard: e.target.value })}
                  />
                </Grid>
                <Grid item xs={6} sm={2}>
                  <TextField
                    label="Passing Year"
                    type="number"
                    fullWidth
                    size="small"
                    value={editForm.twelfthPassingYear || ''}
                    onChange={(e) =>
                      setEditForm({ ...editForm, twelfthPassingYear: Number(e.target.value) || null })
                    }
                  />
                </Grid>
                <Grid item xs={6} sm={2}>
                  <TextField
                    label="Total Marks"
                    type="number"
                    fullWidth
                    size="small"
                    value={editForm.twelfthTotalMarks || ''}
                    onChange={(e) => {
                      const total = Number(e.target.value) || null;
                      const obt = editForm.twelfthObtainedMarks || 0;
                      const pct = total && total > 0 ? Number(((obt / total) * 100).toFixed(2)) : null;
                      setEditForm({ ...editForm, twelfthTotalMarks: total, twelfthPercentage: pct });
                    }}
                  />
                </Grid>
                <Grid item xs={6} sm={2}>
                  <TextField
                    label="Obtained Marks"
                    type="number"
                    fullWidth
                    size="small"
                    value={editForm.twelfthObtainedMarks || ''}
                    onChange={(e) => {
                      const obt = Number(e.target.value) || null;
                      const total = editForm.twelfthTotalMarks || 0;
                      const pct = total && total > 0 && obt ? Number(((obt / total) * 100).toFixed(2)) : null;
                      setEditForm({ ...editForm, twelfthObtainedMarks: obt, twelfthPercentage: pct });
                    }}
                  />
                </Grid>
                <Grid item xs={6} sm={2}>
                  <TextField
                    label="Percentage (%)"
                    type="number"
                    fullWidth
                    size="small"
                    inputProps={{ step: 0.01, min: 0, max: 100 }}
                    value={editForm.twelfthPercentage || ''}
                    onChange={(e) =>
                      setEditForm({ ...editForm, twelfthPercentage: Number(e.target.value) || null })
                    }
                  />
                </Grid>
              </Grid>
            </Box>

            <Divider />

            {/* Degree & Program Info */}
            <Box>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5, color: '#1E293B' }}>
                Degree Program, Status & Current Standing
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={3}>
                  <TextField
                    select
                    label="Degree Level"
                    fullWidth
                    size="small"
                    value={editForm.degreeLevel || 'UG'}
                    onChange={(e) => setEditForm({ ...editForm, degreeLevel: e.target.value })}
                  >
                    <MenuItem value="UG">Undergraduate (UG)</MenuItem>
                    <MenuItem value="PG">Postgraduate (PG)</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <TextField
                    select
                    label="Study Status"
                    fullWidth
                    size="small"
                    value={editForm.studyStatus || 'STUDYING'}
                    onChange={(e) => setEditForm({ ...editForm, studyStatus: e.target.value })}
                  >
                    <MenuItem value="STUDYING">Currently Studying</MenuItem>
                    <MenuItem value="COMPLETED">Graduated / Completed</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={2}>
                  <TextField
                    label="Current Semester"
                    type="number"
                    fullWidth
                    size="small"
                    inputProps={{ min: 1, max: 8 }}
                    value={editForm.currentSemester || 1}
                    onChange={(e) =>
                      setEditForm({ ...editForm, currentSemester: Number(e.target.value) || 1 })
                    }
                  />
                </Grid>
                <Grid item xs={12} sm={2}>
                  <TextField
                    label="Degree (e.g., B.Tech / M.Tech)"
                    fullWidth
                    size="small"
                    value={editForm.ugDegree || ''}
                    onChange={(e) => setEditForm({ ...editForm, ugDegree: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={2}>
                  <TextField
                    label="Branch / Specialization"
                    fullWidth
                    size="small"
                    value={editForm.ugBranch || ''}
                    onChange={(e) => setEditForm({ ...editForm, ugBranch: e.target.value })}
                  />
                </Grid>
                <Grid item xs={4} sm={4}>
                  <TextField
                    label="Overall CGPA"
                    type="number"
                    fullWidth
                    size="small"
                    inputProps={{ step: 0.01, min: 0, max: 10 }}
                    value={editForm.currentCgpa ?? ''}
                    onChange={(e) =>
                      setEditForm({ ...editForm, currentCgpa: Number(e.target.value) || null })
                    }
                    helperText="Calculated via university grading rules"
                  />
                </Grid>
                <Grid item xs={4} sm={4}>
                  <TextField
                    label="Active Backlogs / Arrears"
                    type="number"
                    fullWidth
                    size="small"
                    inputProps={{ min: 0 }}
                    value={editForm.activeBacklogs ?? 0}
                    onChange={(e) =>
                      setEditForm({ ...editForm, activeBacklogs: Number(e.target.value) || 0 })
                    }
                  />
                </Grid>
                <Grid item xs={4} sm={4}>
                  <TextField
                    label="Backlog History"
                    type="number"
                    fullWidth
                    size="small"
                    inputProps={{ min: 0 }}
                    value={editForm.historyOfBacklogs ?? 0}
                    onChange={(e) =>
                      setEditForm({ ...editForm, historyOfBacklogs: Number(e.target.value) || 0 })
                    }
                  />
                </Grid>
              </Grid>
            </Box>

            <Divider />

            {/* Semester-wise details */}
            <Box>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5, color: '#1E293B' }}>
                Semester-Wise SGPA / CGPA / Backlogs (Semesters 1-8)
              </Typography>
              <Grid container spacing={1.5}>
                {editForm.semesters?.map((sem, idx) => (
                  <Grid item xs={12} sm={6} md={3} key={sem.semesterNumber}>
                    <Box sx={{ p: 1.5, borderRadius: 1.5, bgcolor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                      <Typography variant="caption" fontWeight={700} color="#1E293B" sx={{ display: 'block', mb: 1 }}>
                        Semester {sem.semesterNumber}
                      </Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <TextField
                          label="SGPA (0-10)"
                          size="small"
                          type="number"
                          inputProps={{ step: 0.01, min: 0, max: 10 }}
                          value={sem.sgpa ?? ''}
                          onChange={(e) => {
                            const newSems = [...(editForm.semesters || [])];
                            newSems[idx].sgpa = e.target.value !== '' ? Number(e.target.value) : null;
                            setEditForm({ ...editForm, semesters: newSems });
                          }}
                        />
                        <TextField
                          label="CGPA (0-10)"
                          size="small"
                          type="number"
                          inputProps={{ step: 0.01, min: 0, max: 10 }}
                          value={sem.cgpa ?? ''}
                          onChange={(e) => {
                            const newSems = [...(editForm.semesters || [])];
                            newSems[idx].cgpa = e.target.value !== '' ? Number(e.target.value) : null;
                            setEditForm({ ...editForm, semesters: newSems });
                          }}
                        />
                        <TextField
                          label="Backlogs"
                          size="small"
                          type="number"
                          inputProps={{ min: 0 }}
                          value={sem.backlogsCount ?? 0}
                          onChange={(e) => {
                            const newSems = [...(editForm.semesters || [])];
                            newSems[idx].backlogsCount = Number(e.target.value) || 0;
                            setEditForm({ ...editForm, semesters: newSems });
                          }}
                        />
                      </Box>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 2.5, borderTop: '1px solid #E2E8F0' }}>
            <Button onClick={() => setEditOpen(false)} color="inherit">
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={saving} sx={{ bgcolor: '#1765B5' }}>
              {saving ? <CircularProgress size={20} color="inherit" /> : 'Save Academic Record'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Upload Marksheet Modal */}
      <Dialog
        open={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2.5 } }}
      >
        <DialogTitle sx={{ fontWeight: 700, color: '#14264B', borderBottom: '1px solid #E2E8F0' }}>
          Upload Marksheet Document
        </DialogTitle>
        <DialogContent sx={{ pt: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Target Document:{' '}
            <strong>
              {uploadDocType === 'tenth'
                ? '10th Standard Marksheet'
                : uploadDocType === 'twelfth'
                ? '12th Standard Marksheet'
                : `Semester ${uploadSemesterNumber} Marksheet`}
            </strong>
          </Typography>

          <Alert severity="info" variant="outlined" sx={{ fontSize: '0.8125rem' }}>
            Supported formats: PDF documents (.pdf) or images (.png, .jpg, .jpeg). Maximum size: 10 MB.
          </Alert>

          <Button
            variant="outlined"
            component="label"
            startIcon={<CloudUploadIcon />}
            sx={{ py: 2, borderStyle: 'dashed' }}
          >
            {selectedFile ? selectedFile.name : 'Choose Marksheet File'}
            <input
              type="file"
              hidden
              accept=".pdf,image/png,image/jpeg,image/jpg"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setSelectedFile(file);
              }}
            />
          </Button>

          {selectedFile && (
            <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
              Selected file: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2.5, borderTop: '1px solid #E2E8F0' }}>
          <Button onClick={() => setUploadModalOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={!selectedFile || uploading}
            onClick={handleUploadSubmit}
            sx={{ bgcolor: '#1765B5' }}
          >
            {uploading ? <CircularProgress size={20} color="inherit" /> : 'Upload Marksheet'}
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};
