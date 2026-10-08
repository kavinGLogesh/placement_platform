import React, { useState } from 'react';
import {
  Typography,
  Box,
  Card,
  Grid,
  Chip,
  Button,
  CircularProgress,
  Alert,
  TextField,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TablePagination,
  InputAdornment,
  Tabs,
  Tab,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import SearchIcon from '@mui/icons-material/Search';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import PersonSearchIcon from '@mui/icons-material/PersonSearch';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import BusinessIcon from '@mui/icons-material/Business';
import AssignmentIcon from '@mui/icons-material/Assignment';
import { analyticsService } from '../../services/analytics.service.js';
import { managementService } from '../../services/management.service.js';
import { assessmentService } from '../../services/assessment.service.js';
import { ResultsFilterQuery } from '../../types/analytics.types.js';

export const AdminResultsPage: React.FC = () => {
  const navigate = useNavigate();

  // 4 Result Views: 'overall' | 'department' | 'assessment' | 'student'
  const [activeView, setActiveView] = useState<'overall' | 'department' | 'assessment' | 'student'>('overall');

  // State
  const [page, setPage] = useState<number>(0); // 0-indexed for MUI TablePagination
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);
  const [search, setSearch] = useState<string>('');
  const [selectedDeptId, setSelectedDeptId] = useState<string>('');
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>('');
  const [passFilter, setPassFilter] = useState<string>(''); // '', 'true', 'false'
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [sortBy, setSortBy] = useState<ResultsFilterQuery['sortBy']>('percentage');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Filter dropdown data
  const { data: departments } = useQuery({
    queryKey: ['filterDepartmentsResults'],
    queryFn: () => managementService.getDepartments(),
    staleTime: 300000,
  });

  const { data: assessmentsData } = useQuery({
    queryKey: ['filterAssessmentsResults'],
    queryFn: () => assessmentService.getAssessments({ limit: 100 }),
    staleTime: 300000,
  });

  // Query results
  const filterQuery: ResultsFilterQuery = {
    page: page + 1,
    limit: rowsPerPage,
    search: search.trim() || undefined,
    departmentId: activeView === 'department' ? selectedDeptId || undefined : (activeView === 'overall' ? undefined : selectedDeptId || undefined),
    assessmentId: activeView === 'assessment' ? selectedAssessmentId || undefined : (activeView === 'overall' ? undefined : selectedAssessmentId || undefined),
    isPassed: passFilter === 'true' ? true : passFilter === 'false' ? false : undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    sortBy,
    sortOrder,
  };

  const {
    data: resultsData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['adminResultsList', filterQuery],
    queryFn: () => analyticsService.getResults(filterQuery),
  });

  const handleViewChange = (newView: 'overall' | 'department' | 'assessment' | 'student') => {
    setActiveView(newView);
    setPage(0);
    if (newView === 'overall') {
      setSortBy('percentage');
      setSortOrder('desc');
      setSelectedDeptId('');
      setSelectedAssessmentId('');
      setSearch('');
    } else if (newView === 'department') {
      setSortBy('percentage');
      setSortOrder('desc');
      setSelectedAssessmentId('');
      setSearch('');
      if (!selectedDeptId && departments && departments.length > 0) {
        setSelectedDeptId(departments[0].id);
      }
    } else if (newView === 'assessment') {
      setSortBy('percentage');
      setSortOrder('desc');
      setSelectedDeptId('');
      setSearch('');
      if (!selectedAssessmentId && assessmentsData?.data && assessmentsData.data.length > 0) {
        setSelectedAssessmentId(assessmentsData.data[0].id);
      }
    } else if (newView === 'student') {
      setSortBy('createdAt');
      setSortOrder('desc');
      setSelectedDeptId('');
      setSelectedAssessmentId('');
    }
  };

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleResetFilters = () => {
    setSearch('');
    if (activeView === 'department') {
      setSelectedDeptId(departments?.[0]?.id || '');
    } else {
      setSelectedDeptId('');
    }
    if (activeView === 'assessment') {
      setSelectedAssessmentId(assessmentsData?.data?.[0]?.id || '');
    } else {
      setSelectedAssessmentId('');
    }
    setPassFilter('');
    setStartDate('');
    setEndDate('');
    setSortBy(activeView === 'student' ? 'createdAt' : 'percentage');
    setSortOrder('desc');
    setPage(0);
  };

  return (
    <Box>
      {/* Header */}
      <Box
        sx={{
          mb: 3,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', md: 'center' },
          flexDirection: { xs: 'column', md: 'row' },
          gap: 2,
        }}
      >
        <div>
          <Typography variant="overline" sx={{ color: '#1765B5', fontWeight: 700, letterSpacing: '0.06em' }}>
            EXAMINATION EVALUATION REGISTRY
          </Typography>
          <Typography variant="h5" fontWeight={700} sx={{ color: '#14264B', mb: 0.5 }}>
            Assessment Results & Scoring Registry
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Authoritative examination records, candidate scorecards, departmental benchmarks, and qualification status.
          </Typography>
        </div>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => refetch()}
          >
            Refresh Feed
          </Button>
        </Box>
      </Box>

      {/* 4-View Result Mode Selector */}
      <Paper
        elevation={0}
        sx={{
          mb: 2.5,
          backgroundColor: '#ffffff',
          border: '1px solid #DCE6F5',
          borderRadius: '8px',
        }}
      >
        <Tabs
          value={activeView}
          onChange={(_, val) => handleViewChange(val)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            minHeight: 40,
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.84rem',
              py: 1.25,
              minHeight: 40,
              display: 'flex',
              flexDirection: 'row',
              gap: 1,
            },
          }}
        >
          <Tab value="overall" label="Overall Results (Toppers Ranked)" icon={<EmojiEventsIcon sx={{ fontSize: 16 }} />} iconPosition="start" />
          <Tab value="department" label="Department Cohort Results" icon={<BusinessIcon sx={{ fontSize: 16 }} />} iconPosition="start" />
          <Tab value="assessment" label="Assessment-wise Results" icon={<AssignmentIcon sx={{ fontSize: 16 }} />} iconPosition="start" />
          <Tab value="student" label="Student History Search" icon={<PersonSearchIcon sx={{ fontSize: 16 }} />} iconPosition="start" />
        </Tabs>
      </Paper>

      {/* Filters & Search Toolbar */}
      <Card
        elevation={0}
        sx={{
          mb: 3,
          p: 2,
          bgcolor: '#ffffff',
          border: '1px solid #DCE6F5',
          borderRadius: '8px',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <FilterAltIcon sx={{ color: '#1765B5', fontSize: 18 }} />
          <Typography variant="subtitle2" fontWeight={700} color="#14264B">
            Search, Filter & Sort Records
          </Typography>
        </Box>
        <Grid container spacing={2} alignItems="center">
          {/* Search Input */}
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search candidate name, reg no, assessment..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" color="action" />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          {/* Department Filter */}
          <Grid item xs={12} sm={6} md={2.5}>
            <TextField
              select
              fullWidth
              size="small"
              label="Department"
              value={selectedDeptId}
              onChange={(e) => {
                setSelectedDeptId(e.target.value);
                setPage(0);
              }}
            >
              <MenuItem value="">All Departments</MenuItem>
              {(departments || []).map((d) => (
                <MenuItem key={d.id} value={d.id}>
                  {d.code} - {d.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          {/* Assessment Filter */}
          <Grid item xs={12} sm={6} md={2.5}>
            <TextField
              select
              fullWidth
              size="small"
              label="Assessment"
              value={selectedAssessmentId}
              onChange={(e) => {
                setSelectedAssessmentId(e.target.value);
                setPage(0);
              }}
            >
              <MenuItem value="">All Assessments</MenuItem>
              {(assessmentsData?.data || []).map((a) => (
                <MenuItem key={a.id} value={a.id}>
                  {a.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          {/* Pass / Fail Filter */}
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              select
              fullWidth
              size="small"
              label="Status"
              value={passFilter}
              onChange={(e) => {
                setPassFilter(e.target.value);
                setPage(0);
              }}
            >
              <MenuItem value="">All Statuses</MenuItem>
              <MenuItem value="true">PASSED</MenuItem>
              <MenuItem value="false">FAILED</MenuItem>
            </TextField>
          </Grid>

          {/* Sort By */}
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              select
              fullWidth
              size="small"
              label="Sort By"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
            >
              <MenuItem value="createdAt">Date Created</MenuItem>
              <MenuItem value="percentage">Percentage</MenuItem>
              <MenuItem value="obtainedMarks">Marks</MenuItem>
              <MenuItem value="accuracy">Accuracy</MenuItem>
              <MenuItem value="studentName">Student Name</MenuItem>
            </TextField>
          </Grid>

          {/* Start Date */}
          <Grid item xs={12} sm={6} md={2.5}>
            <TextField
              fullWidth
              size="small"
              type="date"
              label="Start Date"
              InputLabelProps={{ shrink: true }}
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(0);
              }}
            />
          </Grid>

          {/* End Date */}
          <Grid item xs={12} sm={6} md={2.5}>
            <TextField
              fullWidth
              size="small"
              type="date"
              label="End Date"
              InputLabelProps={{ shrink: true }}
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(0);
              }}
            />
          </Grid>

          {/* Order */}
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              select
              fullWidth
              size="small"
              label="Order"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as any)}
            >
              <MenuItem value="desc">Descending (High to Low)</MenuItem>
              <MenuItem value="asc">Ascending (Low to High)</MenuItem>
            </TextField>
          </Grid>

          <Grid item xs={12} sm={12} md={1}>
            <Button
              fullWidth
              variant="text"
              color="inherit"
              size="small"
              onClick={handleResetFilters}
            >
              Reset
            </Button>
          </Grid>
        </Grid>
      </Card>

      {/* Results Table */}
      {isError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error instanceof Error ? error.message : 'Failed to fetch assessment results'}
        </Alert>
      )}

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : resultsData && resultsData.items.length > 0 ? (
        <Card sx={{ bgcolor: 'background.paper', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <TableContainer component={Paper} sx={{ bgcolor: 'transparent', boxShadow: 'none' }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: 'rgba(255, 255, 255, 0.03)' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, width: 80 }}>Rank</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Candidate Name</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Register Number</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Department</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Assessment Title</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Marks</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Percentage</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Accuracy</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Pass / Fail</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Integrity</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {resultsData.items.map((r, idx) => (
                  <TableRow key={r.id} hover>
                    <TableCell sx={{ fontWeight: 800 }}>
                      <Chip
                        label={`#${page * rowsPerPage + idx + 1}`}
                        size="small"
                        color={page * rowsPerPage + idx === 0 ? 'warning' : page * rowsPerPage + idx < 3 ? 'primary' : 'default'}
                        sx={{ fontWeight: 800, fontSize: '0.75rem' }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{r.studentName}</TableCell>
                    <TableCell color="text.secondary">{r.registerNumber}</TableCell>
                    <TableCell>
                      <Chip
                        label={r.departmentCode || r.departmentName || 'ENG'}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: '0.7rem' }}
                      />
                    </TableCell>
                    <TableCell>{r.assessmentTitle}</TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={700}>
                        {r.obtainedMarks} / {r.totalMarks}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={`${r.percentage}%`}
                        size="small"
                        color={r.percentage >= 60 ? 'primary' : 'default'}
                        sx={{ fontWeight: 700 }}
                      />
                    </TableCell>
                    <TableCell>{r.accuracy}%</TableCell>
                    <TableCell>
                      <Chip
                        icon={r.isPassed ? <CheckCircleOutlineIcon /> : <CancelOutlinedIcon />}
                        label={r.isPassed ? 'PASS' : 'FAIL'}
                        size="small"
                        color={r.isPassed ? 'success' : 'error'}
                        sx={{ fontWeight: 700 }}
                      />
                    </TableCell>
                    <TableCell>
                      {r.violationCount && r.violationCount > 0 ? (
                        <Chip
                          icon={<WarningAmberIcon style={{ fontSize: 16, color: '#b91c1c' }} />}
                          label={`${r.violationCount} Violation${r.violationCount > 1 ? 's' : ''}`}
                          size="small"
                          sx={{
                            bgcolor: '#fee2e2',
                            color: '#b91c1c',
                            fontWeight: 700,
                            fontSize: '0.72rem',
                            border: '1px solid #fecaca',
                          }}
                          title={
                            r.violations && r.violations.length > 0
                              ? r.violations
                                  .map(
                                    (v) =>
                                      `${v.violationType}: ${v.details || 'Detected'} (${new Date(v.timestamp).toLocaleTimeString()})`
                                  )
                                  .join('\n')
                              : `${r.violationCount} integrity violations recorded`
                          }
                        />
                      ) : (
                        <Chip
                          icon={<CheckCircleOutlineIcon style={{ fontSize: 16, color: '#15803d' }} />}
                          label="Clean"
                          size="small"
                          sx={{
                            bgcolor: '#f0fdf4',
                            color: '#15803d',
                            fontWeight: 600,
                            fontSize: '0.72rem',
                            border: '1px solid #bbf7d0',
                          }}
                        />
                      )}
                    </TableCell>
                    <TableCell color="text.secondary">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="small"
                        variant="text"
                        startIcon={<PersonSearchIcon />}
                        onClick={() => navigate(`/admin/students/${r.studentId}/performance`)}
                      >
                        Drilldown
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Server Pagination Controls */}
          <TablePagination
            rowsPerPageOptions={[5, 10, 25, 50]}
            component="div"
            count={resultsData.pagination.totalCount}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            sx={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}
          />
        </Card>
      ) : (
        <Card sx={{ p: 6, textAlign: 'center', border: '1px dashed rgba(255, 255, 255, 0.1)' }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No assessment results match the active query.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Try adjusting or resetting your search, department, or date filters.
          </Typography>
          <Button variant="outlined" size="small" onClick={handleResetFilters}>
            Reset Filters
          </Button>
        </Card>
      )}
    </Box>
  );
};
