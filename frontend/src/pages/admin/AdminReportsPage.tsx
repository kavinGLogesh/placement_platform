import React, { useState } from 'react';
import {
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  Chip,
  Button,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tabs,
  Tab,
  TextField,
  MenuItem,
  Pagination,
  IconButton,
  Tooltip,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import DescriptionIcon from '@mui/icons-material/Description';
import AssessmentIcon from '@mui/icons-material/Assignment';
import BusinessIcon from '@mui/icons-material/Business';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import DownloadIcon from '@mui/icons-material/Download';
import PrintIcon from '@mui/icons-material/Print';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import TableChartIcon from '@mui/icons-material/TableChart';
import RefreshIcon from '@mui/icons-material/Refresh';
import ClearIcon from '@mui/icons-material/Clear';
import GroupsIcon from '@mui/icons-material/Groups';
import WorkOutlineIcon from '@mui/icons-material/WorkOutline';

import { reportService } from '../../services/report.service.js';
import { managementService } from '../../services/management.service.js';
import { ExportFormat } from '../../types/report.types.js';

type ReportType = 'students' | 'assessments' | 'departments' | 'gd' | 'interviews';

export const AdminReportsPage: React.FC = () => {
  const [selectedReport, setSelectedReport] = useState<ReportType>('students');

  // Unified Filter States
  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(10);
  const [departmentId, setDepartmentId] = useState<string>('');
  const [assessmentId, setAssessmentId] = useState<string>('');
  const [isPassed, setIsPassed] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [exportLoading, setExportLoading] = useState<string | null>(null);
  const [exportFeedback, setExportFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Clear filters helper
  const handleClearFilters = () => {
    setDepartmentId('');
    setAssessmentId('');
    setIsPassed('');
    setStartDate('');
    setEndDate('');
    setSearch('');
    setPage(1);
  };

  // Build active filter query
  const queryParams = {
    page,
    limit,
    departmentId: departmentId || undefined,
    assessmentId: assessmentId || undefined,
    isPassed: isPassed !== '' ? isPassed === 'true' : undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    search: search ? search.trim() : undefined,
  };

  // Fetch Report Data based on active tab
  const {
    data: reportData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['adminReport', selectedReport, queryParams],
    queryFn: async () => {
      switch (selectedReport) {
        case 'students':
          return reportService.getStudentReport(queryParams);
        case 'assessments':
          return reportService.getAssessmentReport(queryParams);
        case 'departments':
          return reportService.getDepartmentReport(queryParams);
        case 'gd':
          return reportService.getGdReport(queryParams);
        case 'interviews':
          return reportService.getInterviewReport(queryParams);
        default:
          return null;
      }
    },
    staleTime: 10000,
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['adminDepartmentsList'],
    queryFn: () => managementService.getDepartments(),
    staleTime: 60000,
  });

  // Handle Export Download
  const handleExport = async (format: ExportFormat) => {
    try {
      setExportFeedback(null);
      setExportLoading(format);
      const filename = await reportService.downloadReport(selectedReport, format, queryParams);
      setExportFeedback({
        type: 'success',
        message: `Report successfully generated and downloaded: ${filename}`,
      });
    } catch (err: any) {
      console.error('Export failed:', err);
      const errorMessage =
        err?.message ||
        err?.response?.data?.message ||
        'Failed to generate export file. Please verify parameters and try again.';
      setExportFeedback({
        type: 'error',
        message: errorMessage,
      });
    } finally {
      setExportLoading(null);
    }
  };

  const reportTabs = [
    { value: 'students', label: 'Overall Student Results', icon: <DescriptionIcon fontSize="small" /> },
    { value: 'assessments', label: 'Assessment Results', icon: <AssessmentIcon fontSize="small" /> },
    { value: 'departments', label: 'Department Performance', icon: <BusinessIcon fontSize="small" /> },
    { value: 'gd', label: 'GD Evaluations', icon: <GroupsIcon fontSize="small" /> },
    { value: 'interviews', label: 'Interview Evaluations', icon: <WorkOutlineIcon fontSize="small" /> },
  ];

  const currentData = reportData as any;
  const currentRows: any[] = currentData?.rows || [];
  const currentPagination = currentData?.pagination;

  return (
    <Box>
      {/* Header Banner */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="overline" color="#1765B5" fontWeight={700} letterSpacing={1.2}>
          INSTITUTIONAL AUDIT & EXPORT REPOSITORY
        </Typography>
        <Typography variant="h4" fontWeight={800} letterSpacing="-0.02em" sx={{ mb: 0.5, color: '#14264B' }}>
          Placement Reports & Compliance Center
        </Typography>
        <Typography variant="body2" sx={{ color: '#7182A0' }}>
          Generate official placement audit reports, psychometric evaluations, department scorecards, and multi-format exports (Excel, CSV, PDF, Print HTML).
        </Typography>
      </Box>

      {/* Report Selector Tabs */}
      <Paper
        elevation={0}
        sx={{
          mb: 3,
          backgroundColor: '#ffffff',
          border: '1px solid #DCE6F5',
          borderRadius: '8px',
        }}
      >
        <Tabs
          value={selectedReport}
          onChange={(_, val) => {
            setSelectedReport(val);
            setPage(1);
          }}
          variant="scrollable"
          scrollButtons="auto"
          textColor="primary"
          indicatorColor="primary"
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.875rem',
              py: 1.5,
              minHeight: 48,
              display: 'flex',
              flexDirection: 'row',
              gap: 1,
              color: '#7182A0',
              '&.Mui-selected': {
                color: '#1765B5',
                fontWeight: 700,
              },
            },
          }}
        >
          {reportTabs.map((tab) => (
            <Tab key={tab.value} value={tab.value} label={tab.label} icon={tab.icon} iconPosition="start" />
          ))}
        </Tabs>
      </Paper>

      {exportFeedback && (
        <Alert
          severity={exportFeedback.type}
          onClose={() => setExportFeedback(null)}
          sx={{ mb: 3, borderRadius: '8px' }}
        >
          {exportFeedback.message}
        </Alert>
      )}

      {/* Action Bar & Filter Section */}
      <Card
        elevation={0}
        sx={{
          mb: 3,
          backgroundColor: '#ffffff',
          border: '1px solid #DCE6F5',
          borderRadius: '8px',
        }}
      >
        <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
          {/* Export Buttons Bar */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 2,
              mb: 2.5,
              pb: 2,
              borderBottom: '1px solid #E7EEFA',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FilterAltIcon sx={{ color: '#1765B5' }} fontSize="small" />
              <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#14264B' }}>
                Report Filters & Export Tools
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button
                variant="outlined"
                size="small"
                startIcon={exportLoading === 'xlsx' ? <CircularProgress size={14} /> : <TableChartIcon fontSize="small" />}
                disabled={Boolean(exportLoading)}
                onClick={() => handleExport('xlsx')}
                sx={{
                  color: '#047857',
                  borderColor: '#a7f3d0',
                  bgcolor: '#ecfdf5',
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  borderRadius: '6px',
                  '&:hover': { bgcolor: '#d1fae5', borderColor: '#6ee7b7' },
                }}
              >
                Excel (.xlsx)
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={exportLoading === 'csv' ? <CircularProgress size={14} /> : <DownloadIcon fontSize="small" />}
                disabled={Boolean(exportLoading)}
                onClick={() => handleExport('csv')}
                sx={{
                  color: '#0369a1',
                  borderColor: '#bae6fd',
                  bgcolor: '#f0f9ff',
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  borderRadius: '6px',
                  '&:hover': { bgcolor: '#e0f2fe', borderColor: '#7dd3fc' },
                }}
              >
                CSV
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={exportLoading === 'pdf' ? <CircularProgress size={14} /> : <PictureAsPdfIcon fontSize="small" />}
                disabled={Boolean(exportLoading)}
                onClick={() => handleExport('pdf')}
                sx={{
                  color: '#b91c1c',
                  borderColor: '#fecaca',
                  bgcolor: '#fef2f2',
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  borderRadius: '6px',
                  '&:hover': { bgcolor: '#fee2e2', borderColor: '#fca5a5' },
                }}
              >
                PDF Document
              </Button>
              <Button
                variant="contained"
                size="small"
                startIcon={exportLoading === 'html' ? <CircularProgress size={14} /> : <PrintIcon fontSize="small" />}
                disabled={Boolean(exportLoading)}
                onClick={() => handleExport('html')}
                sx={{
                  bgcolor: '#1765B5',
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  borderRadius: '6px',
                  '&:hover': { bgcolor: '#104B91' },
                }}
              >
                Print Preview
              </Button>
            </Box>
          </Box>

          {/* Filter Inputs */}
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={2.5}>
              <TextField
                fullWidth
                size="small"
                label="Student Search"
                placeholder="Name, Reg No, Email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </Grid>

            <Grid item xs={6} sm={3} md={2.5}>
              <TextField
                fullWidth
                size="small"
                select
                label="Department"
                value={departmentId}
                onChange={(e) => {
                  setDepartmentId(e.target.value);
                  setPage(1);
                }}
              >
                <MenuItem value="">All Departments</MenuItem>
                {departments.map((d: any) => (
                  <MenuItem key={d.id} value={d.id}>
                    {d.code} — {d.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={6} sm={3} md={2}>
              <TextField
                fullWidth
                size="small"
                select
                label="Result Status"
                value={isPassed}
                onChange={(e) => setIsPassed(e.target.value)}
              >
                <MenuItem value="">All Statuses</MenuItem>
                <MenuItem value="true">Passed Only</MenuItem>
                <MenuItem value="false">Failed Only</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={6} sm={3} md={2}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="Start Date"
                InputLabelProps={{ shrink: true }}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </Grid>

            <Grid item xs={6} sm={3} md={2}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="End Date"
                InputLabelProps={{ shrink: true }}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={1} sx={{ display: 'flex', gap: 1 }}>
              <Tooltip title="Clear Filters">
                <IconButton size="small" onClick={handleClearFilters} sx={{ color: '#7182A0' }}>
                  <ClearIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Refresh Data">
                <IconButton size="small" onClick={() => refetch()} sx={{ color: '#1765B5' }}>
                  <RefreshIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Error Alert */}
      {isError && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: '8px' }}>
          {error instanceof Error ? error.message : 'Failed to fetch report data from server'}
        </Alert>
      )}

      {/* Loading State */}
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress size={32} sx={{ color: '#1765B5' }} />
        </Box>
      ) : (
        <>
          {/* KPI Summary Cards */}
          {reportData?.summary && (
            <Grid container spacing={2} sx={{ mb: 3 }}>
              {Object.entries(reportData.summary).map(([key, val]) => (
                <Grid item xs={6} sm={4} md={2.4} key={key}>
                  <Card
                    elevation={0}
                    sx={{
                      bgcolor: '#ffffff',
                      border: '1px solid #DCE6F5',
                      borderRadius: '8px',
                    }}
                  >
                    <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                      <Typography variant="caption" sx={{ color: '#7182A0', fontWeight: 600, textTransform: 'capitalize' }}>
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </Typography>
                      <Typography variant="h6" fontWeight={800} sx={{ mt: 0.5, color: '#14264B' }}>
                        {typeof val === 'number' && key.toLowerCase().includes('rate')
                          ? `${val}%`
                          : typeof val === 'number' && key.toLowerCase().includes('percentage')
                          ? `${val}%`
                          : String(val)}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}

          {/* Report Data Table */}
          <TableContainer
            component={Paper}
            elevation={0}
            sx={{
              bgcolor: '#ffffff',
              border: '1px solid #DCE6F5',
              borderRadius: '8px',
              mb: 3,
            }}
          >
            <Table size="small">
              <TableHead sx={{ bgcolor: '#EDF2FF', borderBottom: '2px solid #DCE6F5' }}>
                {selectedReport === 'students' && (
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, color: '#526584', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Register No</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#526584', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Student Name</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#526584', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Dept</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#526584', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Class</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600, color: '#526584', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Completed</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, color: '#526584', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Marks</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, color: '#526584', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Average %</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, color: '#526584', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Accuracy</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600, color: '#526584', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Status</TableCell>
                  </TableRow>
                )}

                {selectedReport === 'assessments' && (
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, color: '#526584', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Assessment</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#526584', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Register No</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#526584', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Candidate</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#526584', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Dept</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, color: '#526584', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Marks</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, color: '#526584', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Score %</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, color: '#526584', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Accuracy</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600, color: '#526584', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Result</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#526584', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Submitted At</TableCell>
                  </TableRow>
                )}

                {selectedReport === 'departments' && (
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, color: '#526584', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Code</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#526584', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Department Name</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600, color: '#526584', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Enrolled</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600, color: '#526584', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Attempts</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600, color: '#526584', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Passed</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, color: '#526584', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Pass Rate</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, color: '#526584', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Average %</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, color: '#526584', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Accuracy</TableCell>
                  </TableRow>
                )}

                {selectedReport === 'gd' && (
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, color: '#526584', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>GD Round</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#526584', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Topic</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#526584', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Register No</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#526584', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Student Name</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#526584', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Evaluator</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600, color: '#526584', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Attendance</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, color: '#526584', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Marks</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, color: '#526584', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Score %</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#526584', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Evaluated Date</TableCell>
                  </TableRow>
                )}

                {selectedReport === 'interviews' && (
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, color: '#526584', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Interview Round</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#526584', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Type</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#526584', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Register No</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#526584', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Candidate Name</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#526584', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Interviewer</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600, color: '#526584', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Attendance</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, color: '#526584', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Marks</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, color: '#526584', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Score %</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#526584', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Feedback / Strengths</TableCell>
                  </TableRow>
                )}
              </TableHead>

              <TableBody>
                {/* 1. Students Table */}
                {selectedReport === 'students' &&
                  currentRows.map((r: any) => (
                    <TableRow key={r.studentId} hover sx={{ '&:hover': { bgcolor: '#EDF2FF' } }}>
                      <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '0.82rem', color: '#14264B' }}>{r.registerNumber}</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.82rem', color: '#14264B' }}>{r.studentName}</TableCell>
                      <TableCell sx={{ fontSize: '0.82rem', color: '#7182A0' }}>{r.departmentCode}</TableCell>
                      <TableCell sx={{ fontSize: '0.82rem', color: '#7182A0' }}>{r.className || r.sectionName || '-'}</TableCell>
                      <TableCell align="center" sx={{ fontSize: '0.82rem' }}>{r.assessmentsCompleted}</TableCell>
                      <TableCell align="right" sx={{ fontSize: '0.82rem' }}>
                        {r.totalMarksObtained} / {r.totalMarksPossible}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.82rem', color: '#14264B' }}>
                        {r.averagePercentage}%
                      </TableCell>
                      <TableCell align="right" sx={{ fontSize: '0.82rem' }}>{r.averageAccuracy}%</TableCell>
                      <TableCell align="center">
                        <Chip
                          size="small"
                          label={r.overallPassed ? 'PASS' : 'FAIL'}
                          sx={{
                            fontWeight: 700,
                            fontSize: '0.7rem',
                            borderRadius: '4px',
                            bgcolor: r.overallPassed ? '#ecfdf5' : '#fef2f2',
                            color: r.overallPassed ? '#047857' : '#b91c1c',
                            border: '1px solid',
                            borderColor: r.overallPassed ? '#a7f3d0' : '#fecaca',
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}

                {/* 2. Assessments Table */}
                {selectedReport === 'assessments' &&
                  currentRows.map((r: any) => (
                    <TableRow key={r.resultId} hover sx={{ '&:hover': { bgcolor: '#EDF2FF' } }}>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.82rem', color: '#14264B' }}>{r.assessmentTitle}</TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>{r.registerNumber}</TableCell>
                      <TableCell sx={{ fontSize: '0.82rem', color: '#14264B' }}>{r.studentName}</TableCell>
                      <TableCell sx={{ fontSize: '0.82rem', color: '#7182A0' }}>{r.departmentCode}</TableCell>
                      <TableCell align="right" sx={{ fontSize: '0.82rem' }}>
                        {r.obtainedMarks} / {r.totalMarks}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.82rem', color: '#14264B' }}>
                        {r.percentage}%
                      </TableCell>
                      <TableCell align="right" sx={{ fontSize: '0.82rem' }}>{r.accuracy}%</TableCell>
                      <TableCell align="center">
                        <Chip
                          size="small"
                          label={r.isPassed ? 'PASS' : 'FAIL'}
                          sx={{
                            fontWeight: 700,
                            fontSize: '0.7rem',
                            borderRadius: '4px',
                            bgcolor: r.isPassed ? '#ecfdf5' : '#fef2f2',
                            color: r.isPassed ? '#047857' : '#b91c1c',
                            border: '1px solid',
                            borderColor: r.isPassed ? '#a7f3d0' : '#fecaca',
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.75rem', color: '#7182A0' }}>
                        {r.submittedAt ? new Date(r.submittedAt).toLocaleDateString() : '-'}
                      </TableCell>
                    </TableRow>
                  ))}

                {/* 3. Departments Table */}
                {selectedReport === 'departments' &&
                  currentRows.map((r: any) => (
                    <TableRow key={r.departmentId} hover sx={{ '&:hover': { bgcolor: '#EDF2FF' } }}>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.82rem', color: '#14264B' }}>{r.departmentCode}</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.82rem', color: '#14264B' }}>{r.departmentName}</TableCell>
                      <TableCell align="center" sx={{ fontSize: '0.82rem' }}>{r.enrolledStudents}</TableCell>
                      <TableCell align="center" sx={{ fontSize: '0.82rem' }}>{r.totalAttemptsCompleted}</TableCell>
                      <TableCell align="center" sx={{ fontSize: '0.82rem' }}>{r.totalPassed}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.82rem', color: '#14264B' }}>
                        {r.passRate}%
                      </TableCell>
                      <TableCell align="right" sx={{ fontSize: '0.82rem' }}>{r.averagePercentage}%</TableCell>
                      <TableCell align="right" sx={{ fontSize: '0.82rem' }}>{r.averageAccuracy}%</TableCell>
                    </TableRow>
                  ))}

                {/* 4. GD Table */}
                {selectedReport === 'gd' &&
                  currentRows.map((r: any, idx: number) => (
                    <TableRow key={r.roundId + r.studentId + idx} hover sx={{ '&:hover': { bgcolor: '#EDF2FF' } }}>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.82rem', color: '#14264B' }}>{r.roundTitle}</TableCell>
                      <TableCell sx={{ fontSize: '0.82rem' }}>{r.topic}</TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>{r.registerNumber}</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.82rem', color: '#14264B' }}>{r.studentName}</TableCell>
                      <TableCell sx={{ fontSize: '0.82rem', color: '#7182A0' }}>{r.evaluatorName || '—'}</TableCell>
                      <TableCell align="center">
                        <Chip
                          size="small"
                          label={r.attendance}
                          sx={{
                            fontWeight: 700,
                            fontSize: '0.7rem',
                            borderRadius: '4px',
                            bgcolor: r.attendance === 'PRESENT' ? '#ecfdf5' : r.attendance === 'ABSENT' ? '#fef2f2' : '#fef3c7',
                            color: r.attendance === 'PRESENT' ? '#047857' : r.attendance === 'ABSENT' ? '#b91c1c' : '#b45309',
                            border: '1px solid',
                            borderColor: r.attendance === 'PRESENT' ? '#a7f3d0' : r.attendance === 'ABSENT' ? '#fecaca' : '#fde68a',
                          }}
                        />
                      </TableCell>
                      <TableCell align="right" sx={{ fontSize: '0.82rem' }}>
                        {r.totalScore !== null ? `${r.totalScore} / ${r.maxPossibleMarks}` : '—'}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.82rem', color: '#14264B' }}>
                        {r.percentage !== null ? `${r.percentage}%` : 'Pending'}
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.75rem', color: '#7182A0' }}>
                        {r.evaluatedAt ? new Date(r.evaluatedAt).toLocaleDateString() : '—'}
                      </TableCell>
                    </TableRow>
                  ))}

                {/* 5. Interviews Table */}
                {selectedReport === 'interviews' &&
                  currentRows.map((r: any, idx: number) => (
                    <TableRow key={r.roundId + r.studentId + idx} hover sx={{ '&:hover': { bgcolor: '#EDF2FF' } }}>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.82rem', color: '#14264B' }}>{r.roundTitle}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={r.interviewType}
                          sx={{
                            fontWeight: 600,
                            fontSize: '0.7rem',
                            borderRadius: '4px',
                            bgcolor: '#E7EEFA',
                            color: '#405678',
                            border: '1px solid #D1DEF0',
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>{r.registerNumber}</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.82rem', color: '#14264B' }}>{r.studentName}</TableCell>
                      <TableCell sx={{ fontSize: '0.82rem', color: '#7182A0' }}>{r.interviewerName || '—'}</TableCell>
                      <TableCell align="center">
                        <Chip
                          size="small"
                          label={r.attendance}
                          sx={{
                            fontWeight: 700,
                            fontSize: '0.7rem',
                            borderRadius: '4px',
                            bgcolor: r.attendance === 'PRESENT' ? '#ecfdf5' : r.attendance === 'ABSENT' ? '#fef2f2' : '#fef3c7',
                            color: r.attendance === 'PRESENT' ? '#047857' : r.attendance === 'ABSENT' ? '#b91c1c' : '#b45309',
                            border: '1px solid',
                            borderColor: r.attendance === 'PRESENT' ? '#a7f3d0' : r.attendance === 'ABSENT' ? '#fecaca' : '#fde68a',
                          }}
                        />
                      </TableCell>
                      <TableCell align="right" sx={{ fontSize: '0.82rem' }}>
                        {r.totalScore !== null ? `${r.totalScore} / ${r.maxPossibleMarks}` : '—'}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.82rem', color: '#14264B' }}>
                        {r.percentage !== null ? `${r.percentage}%` : 'Pending'}
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.75rem', maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#7182A0' }}>
                        {r.strengths || r.overallFeedback || '—'}
                      </TableCell>
                    </TableRow>
                  ))}

                {/* Empty State */}
                {currentRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                      <Typography variant="body2" sx={{ color: '#7182A0' }}>
                        No report records found matching the specified parameters.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination Controls */}
          {currentPagination && currentPagination.totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4 }}>
              <Pagination
                count={currentPagination.totalPages}
                page={page}
                onChange={(_, val) => setPage(val)}
                color="primary"
                showFirstButton
                showLastButton
              />
            </Box>
          )}
        </>
      )}
    </Box>
  );
};

export default AdminReportsPage;
