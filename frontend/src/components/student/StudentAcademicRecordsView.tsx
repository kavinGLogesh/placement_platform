import React, { useState, useEffect } from 'react';
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
import VisibilityIcon from '@mui/icons-material/Visibility';
import DownloadIcon from '@mui/icons-material/Download';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { StudentAcademicRecord } from '../../types/academic.types.js';
import { academicService } from '../../services/academic.service.js';

interface Props {
  studentRegisterNumber: string;
}

export const StudentAcademicRecordsView: React.FC<Props> = ({ studentRegisterNumber }) => {
  const [record, setRecord] = useState<StudentAcademicRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingDoc, setDownloadingDoc] = useState<string | null>(null);

  useEffect(() => {
    const fetchRecord = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await academicService.getOwnAcademicRecord();
        setRecord(data);
      } catch (err: any) {
        const msg = err?.response?.data?.message || err?.message || 'Unable to load academic records';
        setError(msg);
      } finally {
        setLoading(false);
      }
    };
    fetchRecord();
  }, []);

  const handleViewOrDownloadDoc = async (
    docType: 'tenth' | 'twelfth' | 'semester',
    semesterNumber?: number,
    isInline: boolean = false
  ) => {
    const key = `${docType}_${semesterNumber || ''}_${isInline ? 'view' : 'dl'}`;
    setDownloadingDoc(key);
    setError(null);
    try {
      const { blob, filename } = await academicService.downloadOwnMarksheetBlob(
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
      const msg = err?.response?.data?.message || err?.message || 'Unable to open marksheet file';
      setError(msg);
    } finally {
      setDownloadingDoc(null);
    }
  };

  if (loading) {
    return (
      <Card elevation={0} sx={{ border: '1px solid #DCE6F5', borderRadius: 2.5, p: 4, textAlign: 'center' }}>
        <CircularProgress size={28} sx={{ color: '#1765B5' }} />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
          Loading your verified academic records...
        </Typography>
      </Card>
    );
  }

  return (
    <Card elevation={0} sx={{ border: '1px solid #DCE6F5', borderRadius: 2.5, bgcolor: '#ffffff', mb: 3.5 }}>
      <CardContent sx={{ p: 3.5 }}>
        {/* Section Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
          <SchoolIcon sx={{ color: '#1765B5', fontSize: 26 }} />
          <div>
            <Typography variant="h6" fontWeight={700} sx={{ color: '#14264B' }}>
              Academic Records & Marksheet Dossier
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Verified educational background, secondary marks, semester CGPA progression, and official marksheets.
            </Typography>
          </div>
        </Box>
        <Divider sx={{ my: 2.5, borderColor: '#E7EEFA' }} />

        {error && (
          <Alert severity="error" sx={{ mb: 2.5 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* 10th & 12th Standard Cards */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {/* 10th Standard */}
          <Grid item xs={12} md={6}>
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
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="subtitle1" fontWeight={700} color="#1E293B">
                    Secondary (10th Standard)
                  </Typography>
                  <Chip
                    label={record?.hasTenthMarksheet ? 'Marksheet Verified' : 'No Marksheet'}
                    size="small"
                    color={record?.hasTenthMarksheet ? 'success' : 'default'}
                    icon={record?.hasTenthMarksheet ? <CheckCircleIcon /> : <WarningAmberIcon />}
                    sx={{ fontWeight: 600, fontSize: '0.72rem' }}
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

              {record?.hasTenthMarksheet && (
                <Box sx={{ mt: 2, pt: 1.5, borderTop: '1px solid #E2E8F0', display: 'flex', gap: 1 }}>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={
                      downloadingDoc === 'tenth__view' ? <CircularProgress size={14} /> : <VisibilityIcon fontSize="small" />
                    }
                    onClick={() => handleViewOrDownloadDoc('tenth', undefined, true)}
                    disabled={Boolean(downloadingDoc)}
                    sx={{ textTransform: 'none' }}
                  >
                    View Marksheet
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={
                      downloadingDoc === 'tenth__dl' ? <CircularProgress size={14} /> : <DownloadIcon fontSize="small" />
                    }
                    onClick={() => handleViewOrDownloadDoc('tenth', undefined, false)}
                    disabled={Boolean(downloadingDoc)}
                    sx={{ textTransform: 'none' }}
                  >
                    Download
                  </Button>
                </Box>
              )}
            </Box>
          </Grid>

          {/* 12th Standard */}
          <Grid item xs={12} md={6}>
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
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="subtitle1" fontWeight={700} color="#1E293B">
                    Higher Secondary / 12th Standard
                  </Typography>
                  <Chip
                    label={record?.hasTwelfthMarksheet ? 'Marksheet Verified' : 'No Marksheet'}
                    size="small"
                    color={record?.hasTwelfthMarksheet ? 'success' : 'default'}
                    icon={record?.hasTwelfthMarksheet ? <CheckCircleIcon /> : <WarningAmberIcon />}
                    sx={{ fontWeight: 600, fontSize: '0.72rem' }}
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

              {record?.hasTwelfthMarksheet && (
                <Box sx={{ mt: 2, pt: 1.5, borderTop: '1px solid #E2E8F0', display: 'flex', gap: 1 }}>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={
                      downloadingDoc === 'twelfth__view' ? <CircularProgress size={14} /> : <VisibilityIcon fontSize="small" />
                    }
                    onClick={() => handleViewOrDownloadDoc('twelfth', undefined, true)}
                    disabled={Boolean(downloadingDoc)}
                    sx={{ textTransform: 'none' }}
                  >
                    View Marksheet
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={
                      downloadingDoc === 'twelfth__dl' ? <CircularProgress size={14} /> : <DownloadIcon fontSize="small" />
                    }
                    onClick={() => handleViewOrDownloadDoc('twelfth', undefined, false)}
                    disabled={Boolean(downloadingDoc)}
                    sx={{ textTransform: 'none' }}
                  >
                    Download
                  </Button>
                </Box>
              )}
            </Box>
          </Grid>
        </Grid>

        {/* UG Standing */}
        <Box
          sx={{
            p: 2.5,
            borderRadius: 2,
            bgcolor: '#F0F9FF',
            border: '1px solid #BAE6FD',
            mb: 3,
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <MenuBookIcon sx={{ color: '#0369A1' }} />
              <Typography variant="subtitle1" fontWeight={700} color="#0369A1">
                Undergraduate Degree Profile
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
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
                Overall Cumulative CGPA
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
                  ? 'All Tier-1 Direct Criteria Met'
                  : 'Eligible for Regular Drives'}
              </Typography>
            </Grid>
          </Grid>
        </Box>

        {/* Semester-Wise Records */}
        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5, color: '#1E293B' }}>
          Semester-Wise Progression & Verified Marksheets
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
                      {sem?.hasMarksheet ? (
                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
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
                        </Box>
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          —
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
};
