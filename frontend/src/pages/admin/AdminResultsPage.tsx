import React, { useState, useMemo } from 'react';
import {
  Typography,
  Box,
  Card,
  Grid,
  Chip,
  Button,
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
  CircularProgress,
  Alert,
  IconButton,
  Drawer,
  Divider,
  LinearProgress,
} from '@mui/material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  Cell,
} from 'recharts';

import SearchIcon from '@mui/icons-material/Search';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import PersonSearchIcon from '@mui/icons-material/PersonSearch';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import BusinessIcon from '@mui/icons-material/Business';
import AssignmentIcon from '@mui/icons-material/Assignment';
import BarChartIcon from '@mui/icons-material/BarChart';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import TableChartIcon from '@mui/icons-material/TableChart';
import DownloadIcon from '@mui/icons-material/Download';
import CloseIcon from '@mui/icons-material/Close';
import ClearIcon from '@mui/icons-material/Clear';
import VisibilityIcon from '@mui/icons-material/Visibility';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import LayersIcon from '@mui/icons-material/Layers';
import DescriptionIcon from '@mui/icons-material/Description';

import { analyticsService } from '../../services/analytics.service.js';
import { managementService } from '../../services/management.service.js';
import { assessmentService } from '../../services/assessment.service.js';
import { companyService } from '../../services/company.service.js';
import { reportService } from '../../services/report.service.js';
import { ResultsFilterQuery } from '../../types/analytics.types.js';
import { ExportFormat } from '../../types/report.types.js';

// Color Palette Tokens
const BRAND_NAVY = '#06182F';
const BRAND_MIDNIGHT = '#0A2342';
const BRAND_BLUE = '#1479D1';
const BRAND_CYAN = '#08B8D9';
const BRAND_GREEN = '#35D98A';
const BRAND_RED = '#EF4444';
const BRAND_AMBER = '#F59E0B';
const CARD_BG = '#FFFFFF';
const BORDER_COLOR = '#DCE6F5';

type ActiveModuleTab =
  | 'student-registry'
  | 'departments'
  | 'topics'
  | 'assessment-summary'
  | 'charts'
  | 'reports-export';

export const AdminResultsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Active module tab
  const [activeTab, setActiveTab] = useState<ActiveModuleTab>('student-registry');

  // Global Filter States
  const [page, setPage] = useState<number>(0); // 0-indexed for MUI TablePagination
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);
  const [search, setSearch] = useState<string>('');
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>('');
  const [selectedDeptId, setSelectedDeptId] = useState<string>('');
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>(
    searchParams.get('assessmentId') || ''
  );
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [selectedAttemptStatus, setSelectedAttemptStatus] = useState<string>('');
  const [selectedResultStatus, setSelectedResultStatus] = useState<string>('ALL'); // ALL, PASSED, FAILED, PENDING
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [sortBy, setSortBy] = useState<ResultsFilterQuery['sortBy']>('percentage');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Student Drilldown Drawer State
  const [drilldownStudentId, setDrilldownStudentId] = useState<string | null>(null);

  // Export Loading Feedback
  const [exportLoading, setExportLoading] = useState<string | null>(null);
  const [exportFeedback, setExportFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // ===========================================================================
  // AUXILIARY DROPDOWN QUERIES
  // ===========================================================================
  const { data: departments = [] } = useQuery({
    queryKey: ['filterDepartmentsDropdown'],
    queryFn: () => managementService.getDepartments(),
    staleTime: 300000,
  });

  const { data: courses = [] } = useQuery({
    queryKey: ['filterCoursesDropdown', selectedDeptId],
    queryFn: () => (selectedDeptId ? managementService.getCourses(selectedDeptId) : Promise.resolve([])),
    enabled: Boolean(selectedDeptId),
    staleTime: 300000,
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['filterClassesDropdown', selectedCourseId],
    queryFn: () => (selectedCourseId ? managementService.getClasses(selectedCourseId) : Promise.resolve([])),
    enabled: Boolean(selectedCourseId),
    staleTime: 300000,
  });

  const { data: sections = [] } = useQuery({
    queryKey: ['filterSectionsDropdown', selectedClassId],
    queryFn: () => (selectedClassId ? managementService.getSections(selectedClassId) : Promise.resolve([])),
    enabled: Boolean(selectedClassId),
    staleTime: 300000,
  });

  const { data: assessmentsData } = useQuery({
    queryKey: ['filterAssessmentsDropdown'],
    queryFn: () => assessmentService.getAssessments({ limit: 100 }),
    staleTime: 300000,
  });

  const { data: companiesData } = useQuery({
    queryKey: ['filterCompaniesDropdown'],
    queryFn: () => companyService.getCompanies({ limit: 100 }),
    staleTime: 300000,
  });

  // ===========================================================================
  // FILTER PAYLOAD COMPOSITION
  // ===========================================================================
  const filterQuery: ResultsFilterQuery = useMemo(
    () => ({
      page: page + 1,
      limit: rowsPerPage,
      search: search.trim() || undefined,
      departmentId: selectedDeptId || undefined,
      courseId: selectedCourseId || undefined,
      classId: selectedClassId || undefined,
      sectionId: selectedSectionId || undefined,
      academicYear: selectedAcademicYear ? parseInt(selectedAcademicYear, 10) : undefined,
      assessmentId: selectedAssessmentId || undefined,
      category: selectedCategory || undefined,
      companyId: selectedCompanyId || undefined,
      status: selectedAttemptStatus || undefined,
      resultStatus: selectedResultStatus !== 'ALL' ? selectedResultStatus : undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      sortBy,
      sortOrder,
    }),
    [
      page,
      rowsPerPage,
      search,
      selectedDeptId,
      selectedCourseId,
      selectedClassId,
      selectedSectionId,
      selectedAcademicYear,
      selectedAssessmentId,
      selectedCategory,
      selectedCompanyId,
      selectedAttemptStatus,
      selectedResultStatus,
      startDate,
      endDate,
      sortBy,
      sortOrder,
    ]
  );

  // Filter params without pagination for overview KPIs and charts
  const overviewFilters: ResultsFilterQuery = useMemo(() => {
    const { page: _p, limit: _l, sortBy: _s, sortOrder: _so, ...rest } = filterQuery;
    return rest;
  }, [filterQuery]);

  // ===========================================================================
  // DATA QUERIES
  // ===========================================================================
  // 1. Executive 9 KPIs Overview
  const {
    data: overviewData,
    isLoading: loadingOverview,
    refetch: refetchOverview,
  } = useQuery({
    queryKey: ['adminResultsOverviewKPIs', overviewFilters],
    queryFn: () => analyticsService.getAdminOverview(overviewFilters),
  });

  // 2. Paginated Student Results List
  const {
    data: resultsData,
    isLoading: loadingResults,
    isError: isResultsError,
    error: resultsError,
    refetch: refetchResults,
  } = useQuery({
    queryKey: ['adminPaginatedResults', filterQuery],
    queryFn: () => analyticsService.getResults(filterQuery),
  });

  // 3. Department Analytics
  const {
    data: departmentAnalytics = [],
    isLoading: loadingDept,
    refetch: refetchDept,
  } = useQuery({
    queryKey: ['adminDeptAnalytics', overviewFilters],
    queryFn: () =>
      analyticsService.getDepartmentAnalytics({
        assessmentId: overviewFilters.assessmentId,
        startDate: overviewFilters.startDate,
        endDate: overviewFilters.endDate,
      }),
  });

  // 4. Topic Analytics
  const {
    data: topicAnalytics,
    isLoading: loadingTopics,
    refetch: refetchTopics,
  } = useQuery({
    queryKey: ['adminTopicAnalytics', overviewFilters],
    queryFn: () =>
      analyticsService.getTopicAnalytics({
        assessmentId: overviewFilters.assessmentId,
        departmentId: overviewFilters.departmentId,
        startDate: overviewFilters.startDate,
        endDate: overviewFilters.endDate,
      }),
  });

  // 5. Assessment-Wise Summary (when assessment is selected)
  const { data: assessmentSummary, isLoading: loadingAsmtSummary } = useQuery({
    queryKey: ['adminAssessmentSummary', selectedAssessmentId],
    queryFn: () =>
      selectedAssessmentId
        ? analyticsService.getAssessmentSummary(selectedAssessmentId)
        : Promise.resolve(null),
    enabled: Boolean(selectedAssessmentId),
  });

  // 6. Student Drilldown Query (for Drawer)
  const { data: drilldownData, isLoading: loadingDrilldown } = useQuery({
    queryKey: ['studentDrilldownData', drilldownStudentId],
    queryFn: () =>
      drilldownStudentId ? analyticsService.getStudentDrilldown(drilldownStudentId) : Promise.resolve(null),
    enabled: Boolean(drilldownStudentId),
  });

  // ===========================================================================
  // FILTER HANDLERS
  // ===========================================================================
  const handleResetFilters = () => {
    setSearch('');
    setSelectedAcademicYear('');
    setSelectedDeptId('');
    setSelectedCourseId('');
    setSelectedClassId('');
    setSelectedSectionId('');
    setSelectedAssessmentId('');
    setSelectedCategory('');
    setSelectedCompanyId('');
    setSelectedAttemptStatus('');
    setSelectedResultStatus('ALL');
    setStartDate('');
    setEndDate('');
    setSortBy('percentage');
    setSortOrder('desc');
    setPage(0);
    setSearchParams({});
  };

  const handleRefreshAll = () => {
    refetchOverview();
    refetchResults();
    refetchDept();
    refetchTopics();
  };

  const handleExportReport = async (reportType: string, format: ExportFormat) => {
    try {
      setExportFeedback(null);
      setExportLoading(`${reportType}-${format}`);
      const filename = await reportService.downloadReport(reportType, format, overviewFilters);
      setExportFeedback({
        type: 'success',
        message: `Official report successfully downloaded: ${filename}`,
      });
    } catch (err: any) {
      console.error('Export error:', err);
      setExportFeedback({
        type: 'error',
        message: err?.message || 'Failed to generate report export. Please retry.',
      });
    } finally {
      setExportLoading(null);
    }
  };

  // Scope summary tags
  const activeScopeSummary = useMemo(() => {
    const parts: string[] = [];
    if (selectedDeptId) {
      const d = departments.find((dept) => dept.id === selectedDeptId);
      parts.push(`Dept: ${d?.code || 'Selected'}`);
    }
    if (selectedCourseId) parts.push('Course Filtered');
    if (selectedAcademicYear) parts.push(`Year ${selectedAcademicYear}`);
    if (selectedAssessmentId) {
      const a = assessmentsData?.data?.find((asmt) => asmt.id === selectedAssessmentId);
      parts.push(`Assessment: ${a?.name || 'Selected'}`);
    }
    if (selectedCategory) parts.push(`Category: ${selectedCategory.replace('_', ' ')}`);
    if (selectedCompanyId) {
      const c = companiesData?.data?.find((comp) => comp.id === selectedCompanyId);
      parts.push(`Company: ${c?.name || 'Selected'}`);
    }
    if (selectedResultStatus !== 'ALL') parts.push(`Result: ${selectedResultStatus}`);
    if (selectedAttemptStatus) parts.push(`Attempt: ${selectedAttemptStatus}`);
    if (startDate || endDate) parts.push('Date Filtered');
    return parts.length > 0 ? parts.join(' • ') : 'All Campus Cohorts & Assessments';
  }, [
    selectedDeptId,
    selectedCourseId,
    selectedAcademicYear,
    selectedAssessmentId,
    selectedCategory,
    selectedCompanyId,
    selectedResultStatus,
    selectedAttemptStatus,
    startDate,
    endDate,
    departments,
    assessmentsData,
    companiesData,
  ]);

  // Topic charts data
  const topicChartData = useMemo(() => {
    if (!topicAnalytics?.topics) return [];
    return topicAnalytics.topics.slice(0, 10).map((t) => ({
      name: t.topic.length > 15 ? `${t.topic.slice(0, 15)}...` : t.topic,
      fullName: t.topic,
      accuracy: t.accuracy,
      averageScore: t.averageScore,
      questions: t.totalQuestions,
      strength: t.strength,
    }));
  }, [topicAnalytics]);

  const strongestTopics = useMemo(() => {
    if (!topicAnalytics?.topics) return [];
    return [...topicAnalytics.topics]
      .filter((t) => t.attemptedCount > 0)
      .sort((a, b) => b.accuracy - a.accuracy)
      .slice(0, 3);
  }, [topicAnalytics]);

  const weakestTopics = useMemo(() => {
    if (!topicAnalytics?.topics) return [];
    return [...topicAnalytics.topics]
      .filter((t) => t.attemptedCount > 0)
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 3);
  }, [topicAnalytics]);

  // Department chart data
  const deptChartData = useMemo(() => {
    return departmentAnalytics.map((d) => ({
      name: d.departmentCode || d.departmentName,
      fullName: d.departmentName,
      avgScore: d.averageScore,
      passRate: d.passPercentage,
      failRate: d.failPercentage,
      participation: d.participationRate,
      totalStudents: d.totalStudents,
      appeared: d.participatingStudents,
      notAppeared: d.notAppeared,
    }));
  }, [departmentAnalytics]);

  return (
    <Box sx={{ pb: 6 }}>
      {/* 1. HEADER SECTION */}
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
          <Typography
            variant="overline"
            sx={{ color: BRAND_BLUE, fontWeight: 700, letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: 0.75 }}
          >
            <FactCheckIcon sx={{ fontSize: 16 }} />
            CAREER OS • EVALUATION & RESULTS INTELLIGENCE
          </Typography>
          <Typography variant="h4" fontWeight={800} letterSpacing="-0.02em" sx={{ color: BRAND_NAVY, mb: 0.5 }}>
            Results & Reports Hub
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748B' }}>
            Official examination registry, department scorecards, topic psychometrics, and automated audit exports.
          </Typography>
        </div>

        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<RefreshIcon />}
            onClick={handleRefreshAll}
            sx={{
              borderColor: BORDER_COLOR,
              color: BRAND_MIDNIGHT,
              textTransform: 'none',
              fontWeight: 600,
              bgcolor: '#FFFFFF',
              '&:hover': { bgcolor: '#F8FAFC', borderColor: BRAND_BLUE },
            }}
          >
            Refresh Data
          </Button>

          <Button
            variant="contained"
            size="small"
            startIcon={<DownloadIcon />}
            onClick={() => setActiveTab('reports-export')}
            sx={{
              bgcolor: BRAND_BLUE,
              color: '#FFFFFF',
              textTransform: 'none',
              fontWeight: 700,
              boxShadow: '0 2px 8px rgba(20, 121, 209, 0.25)',
              '&:hover': { bgcolor: '#0D62AD' },
            }}
          >
            Generate Reports
          </Button>
        </Box>
      </Box>

      {/* ACTIVE SCOPE INDICATOR BANNER */}
      <Paper
        elevation={0}
        sx={{
          p: 1.5,
          mb: 3,
          bgcolor: '#F1F6FD',
          border: '1px solid #D1E2F7',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 1.5,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip
            size="small"
            label="ACTIVE SCOPE"
            sx={{ bgcolor: BRAND_MIDNIGHT, color: '#FFFFFF', fontWeight: 700, fontSize: '0.68rem', height: 22 }}
          />
          <Typography variant="body2" fontWeight={600} color={BRAND_MIDNIGHT}>
            {activeScopeSummary}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {overviewData && (
            <Typography variant="caption" sx={{ color: '#475569', fontWeight: 600 }}>
              Matched Cohort: <strong>{overviewData.totalStudents} Students</strong> •{' '}
              <strong>{overviewData.completedAssessments} Completed Tests</strong>
            </Typography>
          )}
          {(selectedDeptId || selectedAssessmentId || selectedCategory || selectedCompanyId || startDate || endDate || search) && (
            <Button
              size="small"
              variant="text"
              startIcon={<ClearIcon fontSize="small" />}
              onClick={handleResetFilters}
              sx={{ color: BRAND_RED, textTransform: 'none', py: 0, minHeight: 24, fontSize: '0.78rem' }}
            >
              Clear Scope
            </Button>
          )}
        </Box>
      </Paper>

      {/* FEEDBACK ALERT */}
      {exportFeedback && (
        <Alert
          severity={exportFeedback.type}
          onClose={() => setExportFeedback(null)}
          sx={{ mb: 3, borderRadius: '8px' }}
        >
          {exportFeedback.message}
        </Alert>
      )}

      {/* ======================================================================= */}
      {/* 2. TOP EXECUTIVE 9 KPI CARDS (Calculated per Section 2 Rules)           */}
      {/* ======================================================================= */}
      <Grid container spacing={2} sx={{ mb: 3.5 }}>
        {/* KPI 1: Total Students */}
        <Grid item xs={12} sm={6} md={4} lg={1.33}>
          <Card
            elevation={0}
            sx={{
              p: 2,
              height: '100%',
              bgcolor: CARD_BG,
              border: `1px solid ${BORDER_COLOR}`,
              borderRadius: '8px',
              borderTop: `3px solid ${BRAND_BLUE}`,
            }}
          >
            <Typography variant="caption" fontWeight={700} color="#64748B" letterSpacing={0.4}>
              TOTAL STUDENTS
            </Typography>
            <Typography variant="h5" fontWeight={800} sx={{ color: BRAND_MIDNIGHT, my: 0.5 }}>
              {loadingOverview ? <CircularProgress size={20} /> : overviewData?.totalStudents ?? 0}
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748B', fontSize: '0.7rem' }}>
              In Filter Scope
            </Typography>
          </Card>
        </Grid>

        {/* KPI 2: Appeared Students */}
        <Grid item xs={12} sm={6} md={4} lg={1.33}>
          <Card
            elevation={0}
            sx={{
              p: 2,
              height: '100%',
              bgcolor: CARD_BG,
              border: `1px solid ${BORDER_COLOR}`,
              borderRadius: '8px',
              borderTop: `3px solid ${BRAND_CYAN}`,
            }}
          >
            <Typography variant="caption" fontWeight={700} color="#64748B" letterSpacing={0.4}>
              APPEARED
            </Typography>
            <Typography variant="h5" fontWeight={800} sx={{ color: BRAND_MIDNIGHT, my: 0.5 }}>
              {loadingOverview ? <CircularProgress size={20} /> : overviewData?.appearedStudents ?? 0}
            </Typography>
            <Typography variant="caption" sx={{ color: BRAND_CYAN, fontWeight: 600, fontSize: '0.7rem' }}>
              In-Progress: {overviewData?.startedIncompleteCount ?? 0}
            </Typography>
          </Card>
        </Grid>

        {/* KPI 3: Not Appeared Students */}
        <Grid item xs={12} sm={6} md={4} lg={1.33}>
          <Card
            elevation={0}
            sx={{
              p: 2,
              height: '100%',
              bgcolor: CARD_BG,
              border: `1px solid ${BORDER_COLOR}`,
              borderRadius: '8px',
              borderTop: '3px solid #94A3B8',
            }}
          >
            <Typography variant="caption" fontWeight={700} color="#64748B" letterSpacing={0.4}>
              NOT APPEARED
            </Typography>
            <Typography variant="h5" fontWeight={800} sx={{ color: BRAND_MIDNIGHT, my: 0.5 }}>
              {loadingOverview ? <CircularProgress size={20} /> : overviewData?.notAppearedStudents ?? 0}
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748B', fontSize: '0.7rem' }}>
              Pending Candidate
            </Typography>
          </Card>
        </Grid>

        {/* KPI 4: Completed Assessments */}
        <Grid item xs={12} sm={6} md={4} lg={1.33}>
          <Card
            elevation={0}
            sx={{
              p: 2,
              height: '100%',
              bgcolor: CARD_BG,
              border: `1px solid ${BORDER_COLOR}`,
              borderRadius: '8px',
              borderTop: `3px solid ${BRAND_MIDNIGHT}`,
            }}
          >
            <Typography variant="caption" fontWeight={700} color="#64748B" letterSpacing={0.4}>
              COMPLETED TESTS
            </Typography>
            <Typography variant="h5" fontWeight={800} sx={{ color: BRAND_MIDNIGHT, my: 0.5 }}>
              {loadingOverview ? <CircularProgress size={20} /> : overviewData?.completedAssessments ?? 0}
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748B', fontSize: '0.7rem' }}>
              Submitted Attempts
            </Typography>
          </Card>
        </Grid>

        {/* KPI 5: Average Score */}
        <Grid item xs={12} sm={6} md={4} lg={1.33}>
          <Card
            elevation={0}
            sx={{
              p: 2,
              height: '100%',
              bgcolor: CARD_BG,
              border: `1px solid ${BORDER_COLOR}`,
              borderRadius: '8px',
              borderTop: `3px solid ${BRAND_BLUE}`,
            }}
          >
            <Typography variant="caption" fontWeight={700} color="#64748B" letterSpacing={0.4}>
              AVERAGE SCORE
            </Typography>
            <Typography variant="h5" fontWeight={800} sx={{ color: BRAND_BLUE, my: 0.5 }}>
              {loadingOverview ? <CircularProgress size={20} /> : `${overviewData?.averageScore ?? 0}%`}
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748B', fontSize: '0.7rem' }}>
              Cohort Mean %
            </Typography>
          </Card>
        </Grid>

        {/* KPI 6: Highest Score */}
        <Grid item xs={12} sm={6} md={4} lg={1.33}>
          <Card
            elevation={0}
            sx={{
              p: 2,
              height: '100%',
              bgcolor: CARD_BG,
              border: `1px solid ${BORDER_COLOR}`,
              borderRadius: '8px',
              borderTop: `3px solid ${BRAND_GREEN}`,
            }}
          >
            <Typography variant="caption" fontWeight={700} color="#64748B" letterSpacing={0.4}>
              HIGHEST SCORE
            </Typography>
            <Typography variant="h5" fontWeight={800} sx={{ color: '#059669', my: 0.5 }}>
              {loadingOverview ? <CircularProgress size={20} /> : `${overviewData?.highestScore ?? 0}%`}
            </Typography>
            <Typography variant="caption" sx={{ color: '#059669', fontSize: '0.7rem', fontWeight: 600 }}>
              Top Performance
            </Typography>
          </Card>
        </Grid>

        {/* KPI 7: Lowest Score */}
        <Grid item xs={12} sm={6} md={4} lg={1.33}>
          <Card
            elevation={0}
            sx={{
              p: 2,
              height: '100%',
              bgcolor: CARD_BG,
              border: `1px solid ${BORDER_COLOR}`,
              borderRadius: '8px',
              borderTop: `3px solid ${BRAND_AMBER}`,
            }}
          >
            <Typography variant="caption" fontWeight={700} color="#64748B" letterSpacing={0.4}>
              LOWEST SCORE
            </Typography>
            <Typography variant="h5" fontWeight={800} sx={{ color: BRAND_MIDNIGHT, my: 0.5 }}>
              {loadingOverview ? <CircularProgress size={20} /> : `${overviewData?.lowestScore ?? 0}%`}
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748B', fontSize: '0.7rem' }}>
              Minimum Score %
            </Typography>
          </Card>
        </Grid>

        {/* KPI 8: Pass Percentage */}
        <Grid item xs={12} sm={6} md={4} lg={1.33}>
          <Card
            elevation={0}
            sx={{
              p: 2,
              height: '100%',
              bgcolor: CARD_BG,
              border: `1px solid ${BORDER_COLOR}`,
              borderRadius: '8px',
              borderTop: `3px solid ${BRAND_GREEN}`,
            }}
          >
            <Typography variant="caption" fontWeight={700} color="#64748B" letterSpacing={0.4}>
              PASS PERCENTAGE
            </Typography>
            <Typography variant="h5" fontWeight={800} sx={{ color: '#059669', my: 0.5 }}>
              {loadingOverview ? <CircularProgress size={20} /> : `${overviewData?.passPercentage ?? 0}%`}
            </Typography>
            <Typography variant="caption" sx={{ color: '#059669', fontSize: '0.7rem', fontWeight: 600 }}>
              Passed: {overviewData?.passedCount ?? 0}
            </Typography>
          </Card>
        </Grid>

        {/* KPI 9: Fail Percentage */}
        <Grid item xs={12} sm={6} md={4} lg={1.33}>
          <Card
            elevation={0}
            sx={{
              p: 2,
              height: '100%',
              bgcolor: CARD_BG,
              border: `1px solid ${BORDER_COLOR}`,
              borderRadius: '8px',
              borderTop: `3px solid ${BRAND_RED}`,
            }}
          >
            <Typography variant="caption" fontWeight={700} color="#64748B" letterSpacing={0.4}>
              FAIL PERCENTAGE
            </Typography>
            <Typography variant="h5" fontWeight={800} sx={{ color: BRAND_RED, my: 0.5 }}>
              {loadingOverview ? <CircularProgress size={20} /> : `${overviewData?.failPercentage ?? 0}%`}
            </Typography>
            <Typography variant="caption" sx={{ color: BRAND_RED, fontSize: '0.7rem', fontWeight: 600 }}>
              Failed: {overviewData?.failedCount ?? 0}
            </Typography>
          </Card>
        </Grid>
      </Grid>

      {/* ======================================================================= */}
      {/* 3. GLOBAL FILTERS TOOLBAR                                               */}
      {/* ======================================================================= */}
      <Card
        elevation={0}
        sx={{
          mb: 3.5,
          p: 2.5,
          bgcolor: CARD_BG,
          border: `1px solid ${BORDER_COLOR}`,
          borderRadius: '8px',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FilterAltIcon sx={{ color: BRAND_BLUE, fontSize: 20 }} />
            <Typography variant="subtitle2" fontWeight={700} sx={{ color: BRAND_MIDNIGHT }}>
              Institutional Filters & Cohort Slicing
            </Typography>
          </Box>
          <Button
            size="small"
            variant="text"
            onClick={handleResetFilters}
            sx={{ textTransform: 'none', color: '#64748B', fontWeight: 600 }}
          >
            Reset Filters
          </Button>
        </Box>

        <Grid container spacing={1.5}>
          {/* Row 1: Search & Institutional Hierarchy */}
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

          <Grid item xs={12} sm={6} md={2}>
            <TextField
              select
              fullWidth
              size="small"
              label="Department"
              value={selectedDeptId}
              onChange={(e) => {
                setSelectedDeptId(e.target.value);
                setSelectedCourseId('');
                setSelectedClassId('');
                setSelectedSectionId('');
                setPage(0);
              }}
            >
              <MenuItem value="">All Departments</MenuItem>
              {departments.map((d) => (
                <MenuItem key={d.id} value={d.id}>
                  {d.code} - {d.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12} sm={6} md={2}>
            <TextField
              select
              fullWidth
              size="small"
              label="Course"
              value={selectedCourseId}
              disabled={!selectedDeptId || courses.length === 0}
              onChange={(e) => {
                setSelectedCourseId(e.target.value);
                setSelectedClassId('');
                setSelectedSectionId('');
                setPage(0);
              }}
            >
              <MenuItem value="">All Courses</MenuItem>
              {courses.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.code} - {c.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12} sm={6} md={1.5}>
            <TextField
              select
              fullWidth
              size="small"
              label="Academic Year"
              value={selectedAcademicYear}
              onChange={(e) => {
                setSelectedAcademicYear(e.target.value);
                setPage(0);
              }}
            >
              <MenuItem value="">All Years</MenuItem>
              <MenuItem value="1">Year 1</MenuItem>
              <MenuItem value="2">Year 2</MenuItem>
              <MenuItem value="3">Year 3</MenuItem>
              <MenuItem value="4">Year 4</MenuItem>
            </TextField>
          </Grid>

          <Grid item xs={12} sm={6} md={1.75}>
            <TextField
              select
              fullWidth
              size="small"
              label="Class"
              value={selectedClassId}
              disabled={!selectedCourseId || classes.length === 0}
              onChange={(e) => {
                setSelectedClassId(e.target.value);
                setSelectedSectionId('');
                setPage(0);
              }}
            >
              <MenuItem value="">All Classes</MenuItem>
              {classes.map((cls) => (
                <MenuItem key={cls.id} value={cls.id}>
                  {cls.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12} sm={6} md={1.75}>
            <TextField
              select
              fullWidth
              size="small"
              label="Section"
              value={selectedSectionId}
              disabled={!selectedClassId || sections.length === 0}
              onChange={(e) => {
                setSelectedSectionId(e.target.value);
                setPage(0);
              }}
            >
              <MenuItem value="">All Sections</MenuItem>
              {sections.map((sec) => (
                <MenuItem key={sec.id} value={sec.id}>
                  Section {sec.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          {/* Row 2: Assessment Attributes, Company, Status, and Date Range */}
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

          <Grid item xs={12} sm={6} md={2}>
            <TextField
              select
              fullWidth
              size="small"
              label="Category"
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setPage(0);
              }}
            >
              <MenuItem value="">All Categories</MenuItem>
              <MenuItem value="APTITUDE">Aptitude</MenuItem>
              <MenuItem value="LOGICAL_REASONING">Logical Reasoning</MenuItem>
              <MenuItem value="VERBAL_ABILITY">Verbal Ability</MenuItem>
              <MenuItem value="TECHNICAL_MCQ">Technical MCQ</MenuItem>
              <MenuItem value="CODING">Coding</MenuItem>
            </TextField>
          </Grid>

          <Grid item xs={12} sm={6} md={2}>
            <TextField
              select
              fullWidth
              size="small"
              label="Company"
              value={selectedCompanyId}
              onChange={(e) => {
                setSelectedCompanyId(e.target.value);
                setPage(0);
              }}
            >
              <MenuItem value="">All Companies</MenuItem>
              {(companiesData?.data || []).map((comp) => (
                <MenuItem key={comp.id} value={comp.id}>
                  {comp.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12} sm={6} md={1.75}>
            <TextField
              select
              fullWidth
              size="small"
              label="Result Status"
              value={selectedResultStatus}
              onChange={(e) => {
                setSelectedResultStatus(e.target.value);
                setPage(0);
              }}
            >
              <MenuItem value="ALL">All Results</MenuItem>
              <MenuItem value="PASSED">Passed</MenuItem>
              <MenuItem value="FAILED">Failed</MenuItem>
            </TextField>
          </Grid>

          <Grid item xs={12} sm={6} md={1.75}>
            <TextField
              select
              fullWidth
              size="small"
              label="Attempt Status"
              value={selectedAttemptStatus}
              onChange={(e) => {
                setSelectedAttemptStatus(e.target.value);
                setPage(0);
              }}
            >
              <MenuItem value="">All Attempts</MenuItem>
              <MenuItem value="SUBMITTED">Submitted</MenuItem>
              <MenuItem value="IN_PROGRESS">In Progress</MenuItem>
              <MenuItem value="EXPIRED">Expired</MenuItem>
            </TextField>
          </Grid>

          <Grid item xs={12} sm={6} md={1}>
            <TextField
              fullWidth
              size="small"
              type="date"
              label="From"
              InputLabelProps={{ shrink: true }}
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(0);
              }}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={1}>
            <TextField
              fullWidth
              size="small"
              type="date"
              label="To"
              InputLabelProps={{ shrink: true }}
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(0);
              }}
            />
          </Grid>
        </Grid>
      </Card>

      {/* ======================================================================= */}
      {/* MODULE TABS                                                             */}
      {/* ======================================================================= */}
      <Paper
        elevation={0}
        sx={{
          mb: 3,
          backgroundColor: CARD_BG,
          border: `1px solid ${BORDER_COLOR}`,
          borderRadius: '8px',
        }}
      >
        <Tabs
          value={activeTab}
          onChange={(_, val) => setActiveTab(val)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            minHeight: 46,
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.86rem',
              py: 1.5,
              minHeight: 46,
              color: '#64748B',
              '&.Mui-selected': {
                color: BRAND_BLUE,
                fontWeight: 700,
              },
            },
          }}
        >
          <Tab
            value="student-registry"
            label="Student Performance Registry"
            icon={<PersonSearchIcon sx={{ fontSize: 18 }} />}
            iconPosition="start"
          />
          <Tab
            value="departments"
            label="Department-Wise Performance"
            icon={<BusinessIcon sx={{ fontSize: 18 }} />}
            iconPosition="start"
          />
          <Tab
            value="topics"
            label="Topic-Wise Competency"
            icon={<LayersIcon sx={{ fontSize: 18 }} />}
            iconPosition="start"
          />
          <Tab
            value="assessment-summary"
            label="Assessment-Wise Results"
            icon={<AssignmentIcon sx={{ fontSize: 18 }} />}
            iconPosition="start"
          />
          <Tab
            value="charts"
            label="Performance & Distribution Charts"
            icon={<BarChartIcon sx={{ fontSize: 18 }} />}
            iconPosition="start"
          />
          <Tab
            value="reports-export"
            label="Official Reports & Exports"
            icon={<DescriptionIcon sx={{ fontSize: 18 }} />}
            iconPosition="start"
          />
        </Tabs>
      </Paper>

      {/* ======================================================================= */}
      {/* TAB 1: STUDENT PERFORMANCE REGISTRY (Section 6)                         */}
      {/* ======================================================================= */}
      {activeTab === 'student-registry' && (
        <Box>
          {isResultsError && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {resultsError instanceof Error ? resultsError.message : 'Failed to fetch assessment results'}
            </Alert>
          )}

          {loadingResults ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress />
            </Box>
          ) : resultsData && resultsData.items.length > 0 ? (
            <Card sx={{ bgcolor: CARD_BG, border: `1px solid ${BORDER_COLOR}`, borderRadius: '8px' }}>
              <TableContainer component={Paper} sx={{ bgcolor: 'transparent', boxShadow: 'none' }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, width: 70, color: BRAND_MIDNIGHT }}>Rank</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: BRAND_MIDNIGHT }}>Student ID</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: BRAND_MIDNIGHT }}>Candidate Name</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: BRAND_MIDNIGHT }}>Department</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: BRAND_MIDNIGHT }}>Course / Class</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: BRAND_MIDNIGHT }}>Assessment Name</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: BRAND_MIDNIGHT }}>Attempt Status</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: BRAND_MIDNIGHT }}>Score Obtained</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: BRAND_MIDNIGHT }}>Percentage</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: BRAND_MIDNIGHT }}>Result Status</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: BRAND_MIDNIGHT }}>Time Taken</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: BRAND_MIDNIGHT }}>Integrity</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: BRAND_MIDNIGHT }}>Date</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: BRAND_MIDNIGHT, textAlign: 'center' }}>Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {resultsData.items.map((r, idx) => {
                      const rankNum = page * rowsPerPage + idx + 1;
                      return (
                        <TableRow key={r.id} hover>
                          <TableCell sx={{ fontWeight: 800 }}>
                            <Chip
                              label={`#${rankNum}`}
                              size="small"
                              sx={{
                                fontWeight: 800,
                                fontSize: '0.72rem',
                                height: 22,
                                bgcolor: rankNum === 1 ? '#FEF3C7' : rankNum <= 3 ? '#E0F2FE' : '#F1F5F9',
                                color: rankNum === 1 ? '#92400E' : rankNum <= 3 ? '#0369A1' : '#475569',
                              }}
                            />
                          </TableCell>
                          <TableCell sx={{ color: '#475569', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                            {r.registerNumber}
                          </TableCell>
                          <TableCell sx={{ fontWeight: 600, color: BRAND_MIDNIGHT }}>
                            {r.studentName}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={r.departmentCode || r.departmentName || 'ENG'}
                              size="small"
                              variant="outlined"
                              sx={{ fontSize: '0.7rem', height: 20, borderColor: '#CBD5E1' }}
                            />
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.78rem', color: '#64748B' }}>
                            {r.courseCode || 'BE'} • {r.className || r.sectionName || 'Class'}
                          </TableCell>
                          <TableCell sx={{ fontWeight: 500, color: BRAND_MIDNIGHT }}>
                            {r.assessmentTitle}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={r.attemptStatus || 'SUBMITTED'}
                              size="small"
                              sx={{
                                height: 20,
                                fontSize: '0.68rem',
                                fontWeight: 700,
                                bgcolor:
                                  r.attemptStatus === 'IN_PROGRESS'
                                    ? '#E0F2FE'
                                    : r.attemptStatus === 'EXPIRED'
                                    ? '#F1F5F9'
                                    : '#ECFDF5',
                                color:
                                  r.attemptStatus === 'IN_PROGRESS'
                                    ? '#0369A1'
                                    : r.attemptStatus === 'EXPIRED'
                                    ? '#64748B'
                                    : '#047857',
                              }}
                            />
                          </TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>
                            {r.obtainedMarks} / {r.totalMarks}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={`${r.percentage}%`}
                              size="small"
                              sx={{
                                fontWeight: 700,
                                fontSize: '0.75rem',
                                bgcolor: r.percentage >= 60 ? '#ECFDF5' : '#FEF2F2',
                                color: r.percentage >= 60 ? '#047857' : '#B91C1C',
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              icon={
                                r.isPassed ? (
                                  <CheckCircleOutlineIcon style={{ fontSize: 14 }} />
                                ) : (
                                  <CancelOutlinedIcon style={{ fontSize: 14 }} />
                                )
                              }
                              label={r.isPassed ? 'PASSED' : 'FAILED'}
                              size="small"
                              sx={{
                                fontWeight: 700,
                                fontSize: '0.72rem',
                                height: 22,
                                bgcolor: r.isPassed ? '#ECFDF5' : '#FEF2F2',
                                color: r.isPassed ? '#047857' : '#B91C1C',
                                border: `1px solid ${r.isPassed ? '#A7F3D0' : '#FECACA'}`,
                              }}
                            />
                          </TableCell>
                          <TableCell sx={{ color: '#64748B', fontSize: '0.78rem' }}>
                            {r.timeTakenMinutes ? `${r.timeTakenMinutes} mins` : '—'}
                          </TableCell>
                          <TableCell>
                            {r.violationCount && r.violationCount > 0 ? (
                              <Chip
                                icon={<WarningAmberIcon style={{ fontSize: 14, color: '#B91C1C' }} />}
                                label={`${r.violationCount} Violations`}
                                size="small"
                                sx={{
                                  bgcolor: '#FEE2E2',
                                  color: '#B91C1C',
                                  fontWeight: 700,
                                  fontSize: '0.7rem',
                                  height: 20,
                                }}
                              />
                            ) : (
                              <Chip
                                label="Clean"
                                size="small"
                                sx={{ bgcolor: '#F0FDF4', color: '#15803D', fontWeight: 600, fontSize: '0.7rem', height: 20 }}
                              />
                            )}
                          </TableCell>
                          <TableCell sx={{ color: '#64748B', fontSize: '0.78rem' }}>
                            {new Date(r.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell sx={{ textAlign: 'center' }}>
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<VisibilityIcon sx={{ fontSize: 14 }} />}
                              onClick={() => setDrilldownStudentId(r.studentId)}
                              sx={{
                                py: 0.25,
                                px: 1,
                                fontSize: '0.75rem',
                                textTransform: 'none',
                                borderColor: BORDER_COLOR,
                                color: BRAND_BLUE,
                                '&:hover': { bgcolor: '#F0F7FF', borderColor: BRAND_BLUE },
                              }}
                            >
                              Drilldown
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>

              <TablePagination
                rowsPerPageOptions={[5, 10, 25, 50]}
                component="div"
                count={resultsData.pagination.totalCount}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={(_, newPage) => setPage(newPage)}
                onRowsPerPageChange={(e) => {
                  setRowsPerPage(parseInt(e.target.value, 10));
                  setPage(0);
                }}
                sx={{ borderTop: `1px solid ${BORDER_COLOR}` }}
              />
            </Card>
          ) : (
            <Card sx={{ p: 6, textAlign: 'center', border: `1px dashed ${BORDER_COLOR}`, borderRadius: '8px' }}>
              <Typography variant="h6" color="#64748B" gutterBottom>
                No assessment records match the active query.
              </Typography>
              <Typography variant="body2" color="#94A3B8" sx={{ mb: 2 }}>
                Try adjusting or resetting your search, department, or date range filters.
              </Typography>
              <Button variant="outlined" size="small" onClick={handleResetFilters}>
                Reset Filters
              </Button>
            </Card>
          )}
        </Box>
      )}

      {/* ======================================================================= */}
      {/* TAB 2: DEPARTMENT-WISE PERFORMANCE (Section 4)                          */}
      {/* ======================================================================= */}
      {activeTab === 'departments' && (
        <Box>
          {loadingDept ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <Grid container spacing={3} sx={{ mb: 3 }}>
            {/* Chart 1: Average Score Comparison */}
            <Grid item xs={12} lg={6}>
              <Card elevation={0} sx={{ p: 2.5, bgcolor: CARD_BG, border: `1px solid ${BORDER_COLOR}`, borderRadius: '8px' }}>
                <Typography variant="subtitle2" fontWeight={700} color={BRAND_MIDNIGHT} gutterBottom>
                  Department Average Score Comparison (%)
                </Typography>
                <Typography variant="caption" color="#64748B" sx={{ mb: 2, display: 'block' }}>
                  Weighted cohort scoring across all valid completed examinations.
                </Typography>
                <Box sx={{ width: '100%', height: 280 }}>
                  <ResponsiveContainer>
                    <BarChart data={deptChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-25} textAnchor="end" />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                      <RechartsTooltip formatter={(val: any) => [`${val}%`, 'Average Score']} />
                      <Bar dataKey="avgScore" fill={BRAND_BLUE} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </Card>
            </Grid>

            {/* Chart 2: Pass vs Fail Percentage */}
            <Grid item xs={12} lg={6}>
              <Card elevation={0} sx={{ p: 2.5, bgcolor: CARD_BG, border: `1px solid ${BORDER_COLOR}`, borderRadius: '8px' }}>
                <Typography variant="subtitle2" fontWeight={700} color={BRAND_MIDNIGHT} gutterBottom>
                  Department Pass vs. Fail Rate Distribution (%)
                </Typography>
                <Typography variant="caption" color="#64748B" sx={{ mb: 2, display: 'block' }}>
                  Proportion of passing candidates vs. candidates requiring remedial training.
                </Typography>
                <Box sx={{ width: '100%', height: 280 }}>
                  <ResponsiveContainer>
                    <BarChart data={deptChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-25} textAnchor="end" />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                      <RechartsTooltip formatter={(val: any, name: any) => [`${val}%`, name === 'passRate' ? 'Pass Rate' : 'Fail Rate']} />
                      <Legend />
                      <Bar dataKey="passRate" name="Pass Rate" fill={BRAND_GREEN} stackId="a" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="failRate" name="Fail Rate" fill={BRAND_RED} stackId="a" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </Card>
            </Grid>
          </Grid>

          {/* Department Performance Ranking Table */}
          <Card elevation={0} sx={{ bgcolor: CARD_BG, border: `1px solid ${BORDER_COLOR}`, borderRadius: '8px' }}>
            <Box sx={{ p: 2, borderBottom: `1px solid ${BORDER_COLOR}` }}>
              <Typography variant="subtitle2" fontWeight={700} color={BRAND_MIDNIGHT}>
                Department Performance Ranking & Audit Table
              </Typography>
              <Typography variant="caption" color="#64748B">
                Click any department row to automatically filter the entire dashboard by that department.
              </Typography>
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Department Name</TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>Total Enrolled</TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>Appeared</TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>Not Appeared</TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>Completed Tests</TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>Average Score</TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>Highest</TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>Lowest</TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>Pass %</TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>Fail %</TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>Filter Cohort</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {departmentAnalytics.map((d) => (
                    <TableRow
                      key={d.departmentId}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => {
                        setSelectedDeptId(d.departmentId);
                        setActiveTab('student-registry');
                      }}
                    >
                      <TableCell sx={{ fontWeight: 600, color: BRAND_MIDNIGHT }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Chip label={d.departmentCode} size="small" sx={{ fontWeight: 700, height: 20, fontSize: '0.7rem' }} />
                          {d.departmentName}
                        </Box>
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>{d.totalStudents}</TableCell>
                      <TableCell sx={{ textAlign: 'center', color: BRAND_BLUE, fontWeight: 700 }}>
                        {d.participatingStudents}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center', color: '#64748B' }}>{d.notAppeared}</TableCell>
                      <TableCell sx={{ textAlign: 'center', fontWeight: 600 }}>{d.completedAssessments}</TableCell>
                      <TableCell sx={{ textAlign: 'center', fontWeight: 700, color: BRAND_BLUE }}>
                        {d.averageScore}%
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center', color: '#059669', fontWeight: 600 }}>
                        {d.highestScore}%
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center', color: '#64748B' }}>{d.lowestScore}%</TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>
                        <Chip
                          label={`${d.passPercentage}%`}
                          size="small"
                          sx={{
                            fontWeight: 700,
                            height: 20,
                            fontSize: '0.7rem',
                            bgcolor: d.passPercentage >= 50 ? '#ECFDF5' : '#FEF2F2',
                            color: d.passPercentage >= 50 ? '#047857' : '#B91C1C',
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>
                        <Chip
                          label={`${d.failPercentage}%`}
                          size="small"
                          sx={{
                            fontWeight: 700,
                            height: 20,
                            fontSize: '0.7rem',
                            bgcolor: d.failPercentage > 50 ? '#FEF2F2' : '#F1F5F9',
                            color: d.failPercentage > 50 ? '#B91C1C' : '#64748B',
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>
                        <Button
                          size="small"
                          variant="text"
                          sx={{ textTransform: 'none', fontSize: '0.75rem', color: BRAND_BLUE }}
                        >
                          View Students →
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
            </>
          )}
        </Box>
      )}

      {/* ======================================================================= */}
      {/* TAB 3: TOPIC-WISE COMPETENCY (Section 5)                                */}
      {/* ======================================================================= */}
      {activeTab === 'topics' && (
        <Box>
          {loadingTopics ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {/* Highlights: Strongest and Weakest topics */}
          <Grid container spacing={2.5} sx={{ mb: 3 }}>
            <Grid item xs={12} md={6}>
              <Card
                elevation={0}
                sx={{
                  p: 2.5,
                  bgcolor: '#F0FDF4',
                  border: '1px solid #BBF7D0',
                  borderRadius: '8px',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                  <TrendingUpIcon sx={{ color: '#15803D' }} />
                  <Typography variant="subtitle2" fontWeight={700} color="#15803D">
                    Strongest Competency Topics (Top Accuracy)
                  </Typography>
                </Box>
                {strongestTopics.length > 0 ? (
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {strongestTopics.map((t) => (
                      <Chip
                        key={t.topic}
                        label={`${t.topic}: ${t.accuracy}% Accuracy`}
                        sx={{ bgcolor: '#DCFCE7', color: '#14532D', fontWeight: 700 }}
                      />
                    ))}
                  </Box>
                ) : (
                  <Typography variant="body2" color="#64748B">
                    Awaiting candidate topic responses.
                  </Typography>
                )}
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card
                elevation={0}
                sx={{
                  p: 2.5,
                  bgcolor: '#FEF2F2',
                  border: '1px solid #FECACA',
                  borderRadius: '8px',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                  <TrendingDownIcon sx={{ color: '#B91C1C' }} />
                  <Typography variant="subtitle2" fontWeight={700} color="#B91C1C">
                    Critical Remedial Topics (Lowest Accuracy)
                  </Typography>
                </Box>
                {weakestTopics.length > 0 ? (
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {weakestTopics.map((t) => (
                      <Chip
                        key={t.topic}
                        label={`${t.topic}: ${t.accuracy}% Accuracy`}
                        sx={{ bgcolor: '#FEE2E2', color: '#7F1D1D', fontWeight: 700 }}
                      />
                    ))}
                  </Box>
                ) : (
                  <Typography variant="body2" color="#64748B">
                    Awaiting candidate topic responses.
                  </Typography>
                )}
              </Card>
            </Grid>
          </Grid>

          {/* Charts */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} lg={6}>
              <Card elevation={0} sx={{ p: 2.5, bgcolor: CARD_BG, border: `1px solid ${BORDER_COLOR}`, borderRadius: '8px' }}>
                <Typography variant="subtitle2" fontWeight={700} color={BRAND_MIDNIGHT} gutterBottom>
                  Topic-Wise Accuracy (%)
                </Typography>
                <Typography variant="caption" color="#64748B" sx={{ mb: 2, display: 'block' }}>
                  Percentage of attempted questions answered accurately.
                </Typography>
                <Box sx={{ width: '100%', height: 280 }}>
                  <ResponsiveContainer>
                    <BarChart data={topicChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-25} textAnchor="end" />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                      <RechartsTooltip formatter={(val: any) => [`${val}%`, 'Accuracy']} />
                      <Bar dataKey="accuracy" fill={BRAND_CYAN} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </Card>
            </Grid>

            <Grid item xs={12} lg={6}>
              <Card elevation={0} sx={{ p: 2.5, bgcolor: CARD_BG, border: `1px solid ${BORDER_COLOR}`, borderRadius: '8px' }}>
                <Typography variant="subtitle2" fontWeight={700} color={BRAND_MIDNIGHT} gutterBottom>
                  Topic-Wise Average Score (%)
                </Typography>
                <Typography variant="caption" color="#64748B" sx={{ mb: 2, display: 'block' }}>
                  Normalized points achieved per topic component.
                </Typography>
                <Box sx={{ width: '100%', height: 280 }}>
                  <ResponsiveContainer>
                    <BarChart data={topicChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-25} textAnchor="end" />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                      <RechartsTooltip formatter={(val: any) => [`${val}%`, 'Average Score']} />
                      <Bar dataKey="averageScore" fill={BRAND_BLUE} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </Card>
            </Grid>
          </Grid>

          {/* Full Topic Table */}
          <Card elevation={0} sx={{ bgcolor: CARD_BG, border: `1px solid ${BORDER_COLOR}`, borderRadius: '8px' }}>
            <Box sx={{ p: 2, borderBottom: `1px solid ${BORDER_COLOR}` }}>
              <Typography variant="subtitle2" fontWeight={700} color={BRAND_MIDNIGHT}>
                Curriculum Topic Competency Master Table
              </Typography>
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Topic Name</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Assessment Category</TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>Questions Attempted</TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>Correct Answers</TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>Incorrect Answers</TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>Average Score</TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>Accuracy %</TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>Proficiency</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(topicAnalytics?.topics || []).map((t) => (
                    <TableRow key={`${t.category}-${t.topic}`} hover>
                      <TableCell sx={{ fontWeight: 600, color: BRAND_MIDNIGHT }}>{t.topic}</TableCell>
                      <TableCell>
                        <Chip
                          label={t.category.replace('_', ' ')}
                          size="small"
                          sx={{ fontSize: '0.7rem', height: 20 }}
                        />
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>{t.attemptedCount}</TableCell>
                      <TableCell sx={{ textAlign: 'center', color: '#059669', fontWeight: 600 }}>
                        {t.correctCount}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center', color: '#B91C1C' }}>
                        {t.attemptedCount - t.correctCount}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center', fontWeight: 600 }}>{t.averageScore}%</TableCell>
                      <TableCell sx={{ textAlign: 'center', fontWeight: 700, color: BRAND_BLUE }}>
                        {t.accuracy}%
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>
                        <Chip
                          label={t.strength}
                          size="small"
                          sx={{
                            fontWeight: 700,
                            height: 20,
                            fontSize: '0.7rem',
                            bgcolor:
                              t.strength === 'STRONG'
                                ? '#ECFDF5'
                                : t.strength === 'WEAK'
                                ? '#FEF2F2'
                                : '#FEF3C7',
                            color:
                              t.strength === 'STRONG'
                                ? '#047857'
                                : t.strength === 'WEAK'
                                ? '#B91C1C'
                                : '#92400E',
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
            </>
          )}
        </Box>
      )}

      {/* ======================================================================= */}
      {/* TAB 4: ASSESSMENT-WISE RESULTS (Section 7)                              */}
      {/* ======================================================================= */}
      {activeTab === 'assessment-summary' && (
        <Box>
          {/* Assessment Selector Bar */}
          <Card elevation={0} sx={{ p: 2, mb: 3, bgcolor: CARD_BG, border: `1px solid ${BORDER_COLOR}`, borderRadius: '8px' }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={6}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Select Assessment to Inspect"
                  value={selectedAssessmentId}
                  onChange={(e) => setSelectedAssessmentId(e.target.value)}
                >
                  <MenuItem value="">Choose an Assessment...</MenuItem>
                  {(assessmentsData?.data || []).map((a) => (
                    <MenuItem key={a.id} value={a.id}>
                      {a.name} ({a.status})
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="#64748B">
                  Inspect candidate appearance ratios, pass rates, cutoff compliance, and examination metrics.
                </Typography>
              </Grid>
            </Grid>
          </Card>

          {loadingAsmtSummary ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress />
            </Box>
          ) : selectedAssessmentId && assessmentSummary ? (
            <Box>
              {/* Executive Summary Card */}
              <Card elevation={0} sx={{ p: 3, mb: 3, bgcolor: '#F8FAFC', border: `1px solid ${BORDER_COLOR}`, borderRadius: '8px' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2, mb: 2 }}>
                  <div>
                    <Typography variant="overline" color={BRAND_BLUE} fontWeight={700}>
                      ASSESSMENT AUDIT BREAKDOWN
                    </Typography>
                    <Typography variant="h5" fontWeight={800} color={BRAND_MIDNIGHT}>
                      {assessmentSummary.assessmentName}
                    </Typography>
                    <Typography variant="body2" color="#64748B">
                      Category: <strong>{assessmentSummary.category}</strong> • Duration: <strong>{assessmentSummary.durationMinutes} mins</strong> • Total Marks: <strong>{assessmentSummary.totalMarks}</strong> • Passing Threshold: <strong>{assessmentSummary.passingPercentage}%</strong>
                    </Typography>
                  </div>
                  <Chip
                    label={`Eligibility Scope: ${assessmentSummary.eligibleScope}`}
                    size="small"
                    sx={{ bgcolor: BRAND_MIDNIGHT, color: '#FFFFFF', fontWeight: 700 }}
                  />
                </Box>

                <Grid container spacing={2}>
                  <Grid item xs={6} sm={4} md={2}>
                    <Paper elevation={0} sx={{ p: 1.5, bgcolor: '#FFFFFF', border: `1px solid ${BORDER_COLOR}`, textAlign: 'center' }}>
                      <Typography variant="caption" color="#64748B">Eligible</Typography>
                      <Typography variant="h6" fontWeight={800} color={BRAND_MIDNIGHT}>{assessmentSummary.totalEligibleStudents}</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6} sm={4} md={2}>
                    <Paper elevation={0} sx={{ p: 1.5, bgcolor: '#FFFFFF', border: `1px solid ${BORDER_COLOR}`, textAlign: 'center' }}>
                      <Typography variant="caption" color="#64748B">Appeared</Typography>
                      <Typography variant="h6" fontWeight={800} color={BRAND_BLUE}>{assessmentSummary.appearedStudents}</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6} sm={4} md={2}>
                    <Paper elevation={0} sx={{ p: 1.5, bgcolor: '#FFFFFF', border: `1px solid ${BORDER_COLOR}`, textAlign: 'center' }}>
                      <Typography variant="caption" color="#64748B">Not Appeared</Typography>
                      <Typography variant="h6" fontWeight={800} color="#64748B">{assessmentSummary.notAppearedStudents}</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6} sm={4} md={2}>
                    <Paper elevation={0} sx={{ p: 1.5, bgcolor: '#FFFFFF', border: `1px solid ${BORDER_COLOR}`, textAlign: 'center' }}>
                      <Typography variant="caption" color="#64748B">Completed</Typography>
                      <Typography variant="h6" fontWeight={800} color={BRAND_MIDNIGHT}>{assessmentSummary.completedAssessments}</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6} sm={4} md={2}>
                    <Paper elevation={0} sx={{ p: 1.5, bgcolor: '#FFFFFF', border: `1px solid ${BORDER_COLOR}`, textAlign: 'center' }}>
                      <Typography variant="caption" color="#64748B">Average Score</Typography>
                      <Typography variant="h6" fontWeight={800} color={BRAND_BLUE}>{assessmentSummary.averageScore}%</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6} sm={4} md={2}>
                    <Paper elevation={0} sx={{ p: 1.5, bgcolor: '#FFFFFF', border: `1px solid ${BORDER_COLOR}`, textAlign: 'center' }}>
                      <Typography variant="caption" color="#64748B">Pass Rate</Typography>
                      <Typography variant="h6" fontWeight={800} color="#059669">{assessmentSummary.passPercentage}%</Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </Card>

              {/* Assessment Student Results Table */}
              <Card elevation={0} sx={{ bgcolor: CARD_BG, border: `1px solid ${BORDER_COLOR}`, borderRadius: '8px' }}>
                <Box sx={{ p: 2, borderBottom: `1px solid ${BORDER_COLOR}` }}>
                  <Typography variant="subtitle2" fontWeight={700} color={BRAND_MIDNIGHT}>
                    Student Score Records for {assessmentSummary.assessmentName}
                  </Typography>
                </Box>
                <TableContainer>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>Student ID</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Candidate Name</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Department</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Marks</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Percentage</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Accuracy</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Result</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                        <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>Action</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(resultsData?.items || []).map((r) => (
                        <TableRow key={r.id} hover>
                          <TableCell sx={{ fontFamily: 'monospace' }}>{r.registerNumber}</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>{r.studentName}</TableCell>
                          <TableCell>{r.departmentCode || 'ENG'}</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>{r.obtainedMarks} / {r.totalMarks}</TableCell>
                          <TableCell>
                            <Chip
                              label={`${r.percentage}%`}
                              size="small"
                              sx={{
                                fontWeight: 700,
                                bgcolor: r.percentage >= (assessmentSummary?.passingPercentage || 50) ? '#ECFDF5' : '#FEF2F2',
                                color: r.percentage >= (assessmentSummary?.passingPercentage || 50) ? '#047857' : '#B91C1C',
                              }}
                            />
                          </TableCell>
                          <TableCell>{r.accuracy}%</TableCell>
                          <TableCell>
                            <Chip
                              label={r.isPassed ? 'PASSED' : 'FAILED'}
                              size="small"
                              sx={{
                                fontWeight: 700,
                                bgcolor: r.isPassed ? '#ECFDF5' : '#FEF2F2',
                                color: r.isPassed ? '#047857' : '#B91C1C',
                              }}
                            />
                          </TableCell>
                          <TableCell sx={{ color: '#64748B' }}>{new Date(r.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell sx={{ textAlign: 'center' }}>
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => setDrilldownStudentId(r.studentId)}
                              sx={{ textTransform: 'none', py: 0.25, fontSize: '0.75rem' }}
                            >
                              Drilldown
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Card>
            </Box>
          ) : (
            <Card sx={{ p: 6, textAlign: 'center', border: `1px dashed ${BORDER_COLOR}`, borderRadius: '8px' }}>
              <Typography variant="body1" color="#64748B" sx={{ mb: 1.5 }}>
                Please select an assessment from the dropdown above to view its detailed audit metrics.
              </Typography>
            </Card>
          )}
        </Box>
      )}

      {/* ======================================================================= */}
      {/* TAB 5: INTERACTIVE PERFORMANCE CHARTS (Section 8)                       */}
      {/* ======================================================================= */}
      {activeTab === 'charts' && (
        <Box>
          <Grid container spacing={3}>
            {/* Chart 1: Score Distribution Histogram */}
            <Grid item xs={12} lg={6}>
              <Card elevation={0} sx={{ p: 2.5, bgcolor: CARD_BG, border: `1px solid ${BORDER_COLOR}`, borderRadius: '8px' }}>
                <Typography variant="subtitle2" fontWeight={700} color={BRAND_MIDNIGHT} gutterBottom>
                  Overall Score Distribution Histogram
                </Typography>
                <Typography variant="caption" color="#64748B" sx={{ mb: 2, display: 'block' }}>
                  Distribution of student scores across standardized 20% score intervals.
                </Typography>
                <Box sx={{ width: '100%', height: 280 }}>
                  <ResponsiveContainer>
                    <BarChart
                      data={overviewData?.scoreDistribution || []}
                      margin={{ top: 10, right: 10, left: -20, bottom: 10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <RechartsTooltip formatter={(val: any) => [`${val} Candidates`, 'Frequency']} />
                      <Bar dataKey="count" fill={BRAND_BLUE} radius={[4, 4, 0, 0]}>
                        {(overviewData?.scoreDistribution || []).map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={index === 0 ? BRAND_RED : index < 3 ? BRAND_AMBER : BRAND_GREEN}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </Card>
            </Grid>

            {/* Chart 2: Participation & Completion Rates */}
            <Grid item xs={12} lg={6}>
              <Card elevation={0} sx={{ p: 2.5, bgcolor: CARD_BG, border: `1px solid ${BORDER_COLOR}`, borderRadius: '8px' }}>
                <Typography variant="subtitle2" fontWeight={700} color={BRAND_MIDNIGHT} gutterBottom>
                  Assessment Participation & Completion Ratios
                </Typography>
                <Typography variant="caption" color="#64748B" sx={{ mb: 2, display: 'block' }}>
                  Cohort appearance vs non-appearance counts.
                </Typography>
                <Box sx={{ width: '100%', height: 280 }}>
                  <ResponsiveContainer>
                    <BarChart
                      data={[
                        { name: 'Appeared', count: overviewData?.appearedStudents || 0 },
                        { name: 'Not Appeared', count: overviewData?.notAppearedStudents || 0 },
                        { name: 'Completed Tests', count: overviewData?.completedAssessments || 0 },
                        { name: 'Passed Results', count: overviewData?.passedCount || 0 },
                        { name: 'Failed Results', count: overviewData?.failedCount || 0 },
                      ]}
                      margin={{ top: 10, right: 10, left: -20, bottom: 10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <RechartsTooltip />
                      <Bar dataKey="count" fill={BRAND_MIDNIGHT} radius={[4, 4, 0, 0]}>
                        <Cell fill={BRAND_BLUE} />
                        <Cell fill="#94A3B8" />
                        <Cell fill={BRAND_MIDNIGHT} />
                        <Cell fill={BRAND_GREEN} />
                        <Cell fill={BRAND_RED} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* ======================================================================= */}
      {/* TAB 6: OFFICIAL REPORTS & EXPORTS (Section 9)                           */}
      {/* ======================================================================= */}
      {activeTab === 'reports-export' && (
        <Box>
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" fontWeight={700} color={BRAND_MIDNIGHT}>
              Official Placement Audit & Statutory Reports
            </Typography>
            <Typography variant="body2" color="#64748B">
              Generate and download certified institutional reports in Excel (.xlsx), CSV, and PDF formats. All exports respect currently active filters.
            </Typography>
          </Box>

          <Grid container spacing={2.5}>
            {[
              {
                id: 'overall',
                title: '1. Overall Results Report',
                desc: 'Comprehensive candidate assessment merit list with percentage, accuracy, and rank.',
                type: 'overall',
              },
              {
                id: 'departments',
                title: '2. Department-Wise Performance Report',
                desc: 'Comparative department scorecards, pass percentages, and participation quotas.',
                type: 'departments',
              },
              {
                id: 'topics',
                title: '3. Topic-Wise Performance Report',
                desc: 'Curriculum mastery audit by topic, accuracy percentage, and difficulty breakdown.',
                type: 'topics',
              },
              {
                id: 'students',
                title: '4. Student-Wise Performance Report',
                desc: 'Individual student transcripts across all assigned and completed examinations.',
                type: 'students',
              },
              {
                id: 'assessments',
                title: '5. Assessment-Wise Results Report',
                desc: 'Complete examination score registry filtered by assessment title and passing criteria.',
                type: 'assessments',
              },
              {
                id: 'appeared-not-appeared',
                title: '6. Appeared & Not Appeared Students Report',
                desc: 'Compliance roster of candidates who attended versus those who missed assessments.',
                type: 'appeared-not-appeared',
              },
              {
                id: 'pass-fail',
                title: '7. Pass and Fail Report',
                desc: 'Qualification audit classifying students strictly by passing cutoff threshold.',
                type: 'pass-fail',
              },
            ].map((report) => (
              <Grid item xs={12} md={6} lg={4} key={report.id}>
                <Card
                  elevation={0}
                  sx={{
                    p: 2.5,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    bgcolor: CARD_BG,
                    border: `1px solid ${BORDER_COLOR}`,
                    borderRadius: '8px',
                    transition: 'all 0.2s',
                    '&:hover': { borderColor: BRAND_BLUE, boxShadow: '0 4px 12px rgba(20, 121, 209, 0.08)' },
                  }}
                >
                  <div>
                    <Typography variant="subtitle2" fontWeight={700} color={BRAND_MIDNIGHT} gutterBottom>
                      {report.title}
                    </Typography>
                    <Typography variant="body2" color="#64748B" sx={{ mb: 2, fontSize: '0.84rem' }}>
                      {report.desc}
                    </Typography>
                  </div>

                  <Box sx={{ display: 'flex', gap: 1, pt: 1, borderTop: `1px solid #F1F5F9`, flexWrap: 'wrap' }}>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={
                        exportLoading === `${report.type}-xlsx` ? (
                          <CircularProgress size={12} />
                        ) : (
                          <TableChartIcon sx={{ fontSize: 14 }} />
                        )
                      }
                      disabled={Boolean(exportLoading)}
                      onClick={() => handleExportReport(report.type, 'xlsx')}
                      sx={{
                        color: '#047857',
                        borderColor: '#A7F3D0',
                        bgcolor: '#ECFDF5',
                        textTransform: 'none',
                        fontWeight: 600,
                        fontSize: '0.75rem',
                        '&:hover': { bgcolor: '#D1FAE5' },
                      }}
                    >
                      Excel (.xlsx)
                    </Button>

                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={
                        exportLoading === `${report.type}-csv` ? (
                          <CircularProgress size={12} />
                        ) : (
                          <DownloadIcon sx={{ fontSize: 14 }} />
                        )
                      }
                      disabled={Boolean(exportLoading)}
                      onClick={() => handleExportReport(report.type, 'csv')}
                      sx={{
                        color: '#0369A1',
                        borderColor: '#BAE6FD',
                        bgcolor: '#F0F9FF',
                        textTransform: 'none',
                        fontWeight: 600,
                        fontSize: '0.75rem',
                        '&:hover': { bgcolor: '#E0F2FE' },
                      }}
                    >
                      CSV
                    </Button>

                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={
                        exportLoading === `${report.type}-pdf` ? (
                          <CircularProgress size={12} />
                        ) : (
                          <PictureAsPdfIcon sx={{ fontSize: 14 }} />
                        )
                      }
                      disabled={Boolean(exportLoading)}
                      onClick={() => handleExportReport(report.type, 'pdf')}
                      sx={{
                        color: '#B91C1C',
                        borderColor: '#FECACA',
                        bgcolor: '#FEF2F2',
                        textTransform: 'none',
                        fontWeight: 600,
                        fontSize: '0.75rem',
                        '&:hover': { bgcolor: '#FEE2E2' },
                      }}
                    >
                      PDF
                    </Button>
                  </Box>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* ======================================================================= */}
      {/* STUDENT PERFORMANCE DRILLDOWN DRAWER                                    */}
      {/* ======================================================================= */}
      <Drawer
        anchor="right"
        open={Boolean(drilldownStudentId)}
        onClose={() => setDrilldownStudentId(null)}
        PaperProps={{
          sx: { width: { xs: '100%', sm: 540, md: 620 }, p: 3, bgcolor: '#FFFFFF' },
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" fontWeight={800} color={BRAND_MIDNIGHT}>
            Candidate Examination Drilldown
          </Typography>
          <IconButton size="small" onClick={() => setDrilldownStudentId(null)}>
            <CloseIcon />
          </IconButton>
        </Box>
        <Divider sx={{ mb: 2.5 }} />

        {loadingDrilldown ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : drilldownData ? (
          <Box>
            {/* Student Overview Header */}
            <Paper elevation={0} sx={{ p: 2, mb: 3, bgcolor: '#F8FAFC', border: `1px solid ${BORDER_COLOR}` }}>
              <Typography variant="subtitle1" fontWeight={700} color={BRAND_MIDNIGHT}>
                {drilldownData.student.name}
              </Typography>
              <Typography variant="body2" color="#64748B">
                Reg No: <strong>{drilldownData.student.registerNumber}</strong> • Email: {drilldownData.student.email}
              </Typography>
              <Typography variant="body2" color="#64748B">
                Dept: {drilldownData.student.departmentName} • Course: {drilldownData.student.courseName} • Class: {drilldownData.student.className}
              </Typography>
            </Paper>

            {/* Lifetime Performance Stats */}
            <Grid container spacing={1.5} sx={{ mb: 3 }}>
              <Grid item xs={4}>
                <Paper elevation={0} sx={{ p: 1.5, textAlign: 'center', bgcolor: '#F1F5F9' }}>
                  <Typography variant="caption" color="#64748B">Completed</Typography>
                  <Typography variant="h6" fontWeight={800} color={BRAND_MIDNIGHT}>{drilldownData.summary.totalCompleted}</Typography>
                </Paper>
              </Grid>
              <Grid item xs={4}>
                <Paper elevation={0} sx={{ p: 1.5, textAlign: 'center', bgcolor: '#ECFDF5' }}>
                  <Typography variant="caption" color="#047857">Avg Score</Typography>
                  <Typography variant="h6" fontWeight={800} color="#047857">{drilldownData.summary.averageScore}%</Typography>
                </Paper>
              </Grid>
              <Grid item xs={4}>
                <Paper elevation={0} sx={{ p: 1.5, textAlign: 'center', bgcolor: '#E0F2FE' }}>
                  <Typography variant="caption" color="#0369A1">Pass Rate</Typography>
                  <Typography variant="h6" fontWeight={800} color="#0369A1">{drilldownData.summary.passRate}%</Typography>
                </Paper>
              </Grid>
            </Grid>

            {/* Assessment History Table */}
            <Typography variant="subtitle2" fontWeight={700} color={BRAND_MIDNIGHT} gutterBottom>
              Assessment History
            </Typography>
            <TableContainer component={Paper} elevation={0} sx={{ border: `1px solid ${BORDER_COLOR}`, mb: 3 }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Assessment</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Score</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Percentage</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Result</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {drilldownData.assessmentHistory.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell sx={{ fontWeight: 600 }}>{item.assessmentTitle}</TableCell>
                      <TableCell>{item.obtainedMarks} / {item.totalMarks}</TableCell>
                      <TableCell>{item.percentage}%</TableCell>
                      <TableCell>
                        <Chip
                          label={item.isPassed ? 'PASS' : 'FAIL'}
                          size="small"
                          sx={{
                            height: 20,
                            fontWeight: 700,
                            fontSize: '0.68rem',
                            bgcolor: item.isPassed ? '#ECFDF5' : '#FEF2F2',
                            color: item.isPassed ? '#047857' : '#B91C1C',
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Category Performance Breakdown */}
            <Typography variant="subtitle2" fontWeight={700} color={BRAND_MIDNIGHT} gutterBottom>
              Category Competency Breakdown
            </Typography>
            <Box sx={{ mb: 3 }}>
              {drilldownData.categoryPerformance.map((c) => (
                <Box key={c.category} sx={{ mb: 1.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2" fontWeight={600} color={BRAND_MIDNIGHT}>
                      {c.displayName || c.category}
                    </Typography>
                    <Typography variant="body2" fontWeight={700} color={BRAND_BLUE}>
                      {c.accuracy}% Accuracy
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(100, Math.max(0, c.accuracy))}
                    sx={{ height: 6, borderRadius: 3, bgcolor: '#E2E8F0' }}
                  />
                </Box>
              ))}
            </Box>

            {/* Full Profile Link */}
            <Button
              fullWidth
              variant="contained"
              onClick={() => {
                navigate(`/admin/students/${drilldownStudentId}/performance`);
              }}
              sx={{ bgcolor: BRAND_BLUE, textTransform: 'none', fontWeight: 700 }}
            >
              Open Full Candidate Performance Dossier →
            </Button>
          </Box>
        ) : (
          <Typography variant="body2" color="#64748B">
            Student record not found.
          </Typography>
        )}
      </Drawer>
    </Box>
  );
};

export default AdminResultsPage;
