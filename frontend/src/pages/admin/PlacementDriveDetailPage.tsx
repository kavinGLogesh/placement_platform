import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Card,
  Grid,
  Chip,
  Button,
  CircularProgress,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Paper,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  InputAdornment,
  Popover,
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CurrencyRupeeIcon from '@mui/icons-material/CurrencyRupee';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import SchoolIcon from '@mui/icons-material/School';

import { placementDriveService } from '../../services/placement-drive.service.js';
import {
  StudentEligibilityResult,
  SelectionStage,
} from '../../types/placement-drive.types.js';

const SELECTION_STAGES: Array<{ value: SelectionStage; label: string; color: string; bg: string }> = [
  { value: 'REGISTERED', label: 'Registered for Drive', color: '#0369a1', bg: '#e0f2fe' },
  { value: 'ASSESSMENT_SHORTLISTED', label: 'Assessment Shortlisted', color: '#7c3aed', bg: '#ede9fe' },
  { value: 'TECHNICAL_ROUND', label: 'Technical Interview', color: '#d97706', bg: '#fef3c7' },
  { value: 'HR_ROUND', label: 'HR / Leadership Round', color: '#0284c7', bg: '#e0f2fe' },
  { value: 'SELECTED', label: 'Selected / Offer Extended', color: '#15803d', bg: '#dcfce7' },
  { value: 'REJECTED', label: 'Rejected', color: '#b91c1c', bg: '#fee2e2' },
  { value: 'OPTED_OUT', label: 'Candidate Opted Out', color: '#475569', bg: '#f1f5f9' },
];

export const PlacementDriveDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<number>(1); // default to Eligibility Checker (Tab 1)

  // Filters State
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'ELIGIBLE' | 'NOT_ELIGIBLE' | 'MISSING_DATA'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('ALL');
  const [selectedStageFilter, setSelectedStageFilter] = useState('ALL');

  // Candidate Selection State
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [bulkRegisterOpen, setBulkRegisterOpen] = useState(false);
  const [registrationRemarks, setRegistrationRemarks] = useState('');

  // Failure details popover state
  const [popoverAnchor, setPopoverAnchor] = useState<HTMLElement | null>(null);
  const [activeReasons, setActiveReasons] = useState<{ title: string; items: string[]; type: 'failure' | 'missing' } | null>(null);

  // Stage update modal state
  const [stageUpdateOpen, setStageUpdateOpen] = useState(false);
  const [selectedRegistrationId, setSelectedRegistrationId] = useState<string>('');
  const [selectedCandidateName, setSelectedCandidateName] = useState<string>('');
  const [newStage, setNewStage] = useState<SelectionStage>('REGISTERED');
  const [stageRemarks, setStageRemarks] = useState<string>('');

  // 1. Fetch Eligibility Data
  const {
    data: eligibilityData,
    isLoading: isEligibilityLoading,
    refetch: refetchEligibility,
  } = useQuery({
    queryKey: ['placement-drive-eligibility', id],
    queryFn: () => placementDriveService.getEligibility(id!),
    enabled: !!id,
  });

  // 2. Fetch Registrations
  const {
    data: registrations = [],
    isLoading: isRegistrationsLoading,
    refetch: refetchRegistrations,
  } = useQuery({
    queryKey: ['placement-drive-registrations', id],
    queryFn: () => placementDriveService.getRegistrations(id!),
    enabled: !!id,
  });

  const drive = eligibilityData?.drive;

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: (data: { studentIds: string[]; remarks?: string }) =>
      placementDriveService.registerStudents(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['placement-drive-eligibility', id] });
      queryClient.invalidateQueries({ queryKey: ['placement-drive-registrations', id] });
      setSelectedStudentIds([]);
      setBulkRegisterOpen(false);
      setRegistrationRemarks('');
    },
  });

  // Stage update mutation
  const updateStageMutation = useMutation({
    mutationFn: (data: { registrationId: string; stage: SelectionStage; remarks?: string }) =>
      placementDriveService.updateRegistrationStage(id!, data.registrationId, {
        stage: data.stage,
        remarks: data.remarks,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['placement-drive-eligibility', id] });
      queryClient.invalidateQueries({ queryKey: ['placement-drive-registrations', id] });
      setStageUpdateOpen(false);
      setStageRemarks('');
    },
  });

  const handleOpenPopover = (
    event: React.MouseEvent<HTMLElement>,
    student: StudentEligibilityResult
  ) => {
    setPopoverAnchor(event.currentTarget);
    if (student.category === 'MISSING_DATA') {
      setActiveReasons({
        title: `Missing Academic Details (${student.name})`,
        items: student.missingDetails,
        type: 'missing',
      });
    } else {
      setActiveReasons({
        title: `Eligibility Failure Reasons (${student.name})`,
        items: student.failureReasons,
        type: 'failure',
      });
    }
  };

  const handleClosePopover = () => {
    setPopoverAnchor(null);
    setActiveReasons(null);
  };

  // Filtered Students in Eligibility Table
  const filteredStudents = useMemo(() => {
    if (!eligibilityData?.students) return [];
    let list = eligibilityData.students;

    if (categoryFilter !== 'ALL') {
      list = list.filter((s) => s.category === categoryFilter);
    }

    if (selectedDeptFilter !== 'ALL') {
      list = list.filter(
        (s) =>
          s.department.toLowerCase().includes(selectedDeptFilter.toLowerCase()) ||
          s.departmentId === selectedDeptFilter
      );
    }

    if (searchTerm.trim()) {
      const lower = searchTerm.toLowerCase();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(lower) ||
          s.registerNumber.toLowerCase().includes(lower) ||
          s.collegeEmail.toLowerCase().includes(lower)
      );
    }

    return list;
  }, [eligibilityData, categoryFilter, selectedDeptFilter, searchTerm]);

  // Select / deselect logic
  const handleToggleSelect = (studentId: string) => {
    if (selectedStudentIds.includes(studentId)) {
      setSelectedStudentIds(selectedStudentIds.filter((id) => id !== studentId));
    } else {
      setSelectedStudentIds([...selectedStudentIds, studentId]);
    }
  };

  const handleSelectAllEligible = () => {
    const eligibleIds = filteredStudents
      .filter((s) => s.isEligible && !s.isRegistered)
      .map((s) => s.studentId);
    setSelectedStudentIds(eligibleIds);
  };

  const handleClearSelection = () => {
    setSelectedStudentIds([]);
  };

  const handleSingleRegister = (studentId: string) => {
    setSelectedStudentIds([studentId]);
    setBulkRegisterOpen(true);
  };

  const handleOpenStageUpdate = (regId: string, name: string, currentStage: SelectionStage, currentRemarks?: string | null) => {
    setSelectedRegistrationId(regId);
    setSelectedCandidateName(name);
    setNewStage(currentStage);
    setStageRemarks(currentRemarks || '');
    setStageUpdateOpen(true);
  };

  const getStageBadge = (stage: SelectionStage) => {
    const conf = SELECTION_STAGES.find((s) => s.value === stage);
    return conf || SELECTION_STAGES[0];
  };

  return (
    <Box sx={{ maxWidth: 1440, mx: 'auto', p: { xs: 2, sm: 3 } }}>
      {/* Top Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<ArrowBackIcon fontSize="small" />}
            onClick={() => navigate('/admin/placement-drives')}
            sx={{
              color: '#0284c7',
              borderColor: '#bae6fd',
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
            }}
          >
            All Placement Drives
          </Button>

          <Box>
            <Typography variant="caption" sx={{ color: '#0284c7', fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase' }}>
              CAMPUS RECRUITMENT DRIVE
            </Typography>
            <Typography variant="h4" fontWeight={800} sx={{ color: '#0f172a', letterSpacing: '-0.02em', mt: 0.2 }}>
              {drive?.companyName || 'Loading Drive...'}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
          {drive && (
            <Chip
              size="medium"
              label={drive.status}
              sx={{
                bgcolor:
                  drive.status === 'UPCOMING'
                    ? '#e0f2fe'
                    : drive.status === 'ONGOING'
                    ? '#dcfce7'
                    : '#f1f5f9',
                color:
                  drive.status === 'UPCOMING'
                    ? '#0369a1'
                    : drive.status === 'ONGOING'
                    ? '#15803d'
                    : '#475569',
                fontWeight: 800,
                fontSize: '0.8rem',
                border: '1px solid #cbd5e1',
              }}
            />
          )}

          <Button
            variant="outlined"
            size="small"
            startIcon={<RefreshIcon fontSize="small" />}
            onClick={() => {
              refetchEligibility();
              refetchRegistrations();
            }}
            sx={{ textTransform: 'none', borderRadius: 2 }}
          >
            Recalculate Eligibility
          </Button>
        </Box>
      </Box>

      {/* Drive Quick Summary Banner */}
      {drive && (
        <Card
          elevation={0}
          sx={{
            p: 2.5,
            mb: 3,
            borderRadius: 2.5,
            border: '1px solid #DCE6F5',
            bgcolor: '#ffffff',
          }}
        >
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                JOB DESIGNATION
              </Typography>
              <Typography variant="h6" fontWeight={700} sx={{ color: '#0f172a' }}>
                {drive.jobRole}
              </Typography>
            </Grid>

            <Grid item xs={6} sm={3} md={2}>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                PACKAGE / CTC
              </Typography>
              <Typography variant="h6" fontWeight={800} sx={{ color: '#059669', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <CurrencyRupeeIcon sx={{ fontSize: 18 }} />
                {drive.packageDetails || 'Competitive'}
              </Typography>
            </Grid>

            <Grid item xs={6} sm={3} md={2}>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                VACANCIES
              </Typography>
              <Typography variant="h6" fontWeight={800} sx={{ color: '#0f172a' }}>
                {drive.vacancies || 1} Positions
              </Typography>
            </Grid>

            <Grid item xs={6} sm={3} md={2.5}>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                DRIVE DATE
              </Typography>
              <Typography variant="body1" fontWeight={700} sx={{ color: '#0f172a' }}>
                {new Date(drive.driveDate).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </Typography>
            </Grid>

            <Grid item xs={6} sm={3} md={2.5}>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                REGISTRATION DEADLINE
              </Typography>
              <Typography variant="body1" fontWeight={700} sx={{ color: '#b91c1c' }}>
                {new Date(drive.registrationDeadline).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </Typography>
            </Grid>
          </Grid>
        </Card>
      )}

      {/* Tabs Header */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: 2.5,
          border: '1px solid #DCE6F5',
          bgcolor: '#ffffff',
          mb: 3,
        }}
      >
        <Tabs
          value={activeTab}
          onChange={(_, val) => setActiveTab(val)}
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 700,
              fontSize: '0.9rem',
              minHeight: 52,
            },
            '& .Mui-selected': {
              color: '#0284c7',
            },
            '& .MuiTabs-indicator': {
              bgcolor: '#0284c7',
              height: 3,
            },
          }}
        >
          <Tab
            icon={<InfoOutlinedIcon sx={{ fontSize: 18 }} />}
            iconPosition="start"
            label="Drive Overview & Criteria"
          />
          <Tab
            icon={<AssignmentTurnedInIcon sx={{ fontSize: 18 }} />}
            iconPosition="start"
            label={`Eligibility Checker & Student Selection (${eligibilityData?.eligibleCount ?? 0} Eligible)`}
          />
          <Tab
            icon={<HowToRegIcon sx={{ fontSize: 18 }} />}
            iconPosition="start"
            label={`Recruitment Stage Tracker (${registrations.length} Registered)`}
          />
        </Tabs>
      </Paper>

      {/* ===================================================================== */}
      {/* TAB 0: DRIVE OVERVIEW & CONFIGURED CRITERIA                            */}
      {/* ===================================================================== */}
      {activeTab === 0 && drive && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={7}>
            <Card
              elevation={0}
              sx={{
                p: 3,
                borderRadius: 2.5,
                border: '1px solid #DCE6F5',
                bgcolor: '#ffffff',
                mb: 3,
              }}
            >
              <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#0f172a', mb: 1.5 }}>
                Job Description & Scope
              </Typography>
              <Typography variant="body2" sx={{ color: '#475569', lineHeight: 1.7, whiteSpace: 'pre-line' }}>
                {drive.jobDescription || 'No detailed description provided for this placement drive.'}
              </Typography>
            </Card>

            <Card
              elevation={0}
              sx={{
                p: 3,
                borderRadius: 2.5,
                border: '1px solid #DCE6F5',
                bgcolor: '#ffffff',
              }}
            >
              <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#0f172a', mb: 2 }}>
                Recruitment & Selection Process Workflow
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {(drive.selectionProcess || ['Online Assessment', 'Technical Interview', 'HR Round']).map(
                  (stage, idx) => (
                    <Box
                      key={idx}
                      sx={{
                        p: 1.5,
                        borderRadius: 2,
                        bgcolor: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                      }}
                    >
                      <Box
                        sx={{
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          bgcolor: '#0284c7',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '0.8rem',
                        }}
                      >
                        {idx + 1}
                      </Box>
                      <Typography variant="body2" fontWeight={600} sx={{ color: '#1e293b' }}>
                        {stage}
                      </Typography>
                    </Box>
                  )
                )}
              </Box>
            </Card>
          </Grid>

          <Grid item xs={12} md={5}>
            <Card
              elevation={0}
              sx={{
                p: 3,
                borderRadius: 2.5,
                border: '1px solid #DCE6F5',
                bgcolor: '#ffffff',
              }}
            >
              <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#0f172a', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <SchoolIcon sx={{ color: '#0284c7' }} /> Configured Eligibility Thresholds
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', pb: 1.5, borderBottom: '1px solid #f1f5f9' }}>
                  <Typography variant="body2" sx={{ color: '#64748b' }}>
                    Minimum CGPA (Scale 10.0)
                  </Typography>
                  <Typography variant="body2" fontWeight={800} sx={{ color: '#0f172a' }}>
                    {drive.minCgpa != null ? Number(drive.minCgpa).toFixed(2) : 'No Minimum'}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', pb: 1.5, borderBottom: '1px solid #f1f5f9' }}>
                  <Typography variant="body2" sx={{ color: '#64748b' }}>
                    Minimum 10th Percentage
                  </Typography>
                  <Typography variant="body2" fontWeight={800} sx={{ color: '#0f172a' }}>
                    {drive.minTenthPercentage != null ? `${drive.minTenthPercentage}%` : 'No Minimum'}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', pb: 1.5, borderBottom: '1px solid #f1f5f9' }}>
                  <Typography variant="body2" sx={{ color: '#64748b' }}>
                    Minimum 12th / Diploma Percentage
                  </Typography>
                  <Typography variant="body2" fontWeight={800} sx={{ color: '#0f172a' }}>
                    {drive.minTwelfthPercentage != null ? `${drive.minTwelfthPercentage}%` : 'No Minimum'}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', pb: 1.5, borderBottom: '1px solid #f1f5f9' }}>
                  <Typography variant="body2" sx={{ color: '#64748b' }}>
                    Maximum Active Backlogs Permitted
                  </Typography>
                  <Typography variant="body2" fontWeight={800} sx={{ color: '#0f172a' }}>
                    {drive.maxActiveBacklogs ?? 0}
                  </Typography>
                </Box>

                <Box sx={{ pt: 1 }}>
                  <Typography variant="caption" fontWeight={700} sx={{ color: '#64748b', display: 'block', mb: 1 }}>
                    ELIGIBLE DEPARTMENTS
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.8, flexWrap: 'wrap' }}>
                    {(drive.eligibleDepartments || []).map((dept) => (
                      <Chip key={dept} size="small" label={dept} sx={{ bgcolor: '#e0f2fe', color: '#0369a1', fontWeight: 700 }} />
                    ))}
                  </Box>
                </Box>

                <Box sx={{ pt: 1 }}>
                  <Typography variant="caption" fontWeight={700} sx={{ color: '#64748b', display: 'block', mb: 1 }}>
                    ELIGIBLE GRADUATION BATCHES
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.8, flexWrap: 'wrap' }}>
                    {(drive.eligibleBatchYears || []).map((batch) => (
                      <Chip key={batch} size="small" label={`Class of ${batch}`} sx={{ bgcolor: '#f1f5f9', fontWeight: 600 }} />
                    ))}
                  </Box>
                </Box>

                <Box sx={{ pt: 1 }}>
                  <Typography variant="caption" fontWeight={700} sx={{ color: '#64748b', display: 'block', mb: 1 }}>
                    MANDATORY SKILLS & COMPETENCY
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {(drive.requiredSkills || []).map((sk, idx) => (
                      <Box
                        key={idx}
                        sx={{
                          p: 1.5,
                          borderRadius: 2,
                          bgcolor: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <Typography variant="body2" fontWeight={700} sx={{ color: '#0f172a' }}>
                          {sk.name}
                        </Typography>
                        <Chip
                          size="small"
                          label={`Min: ${sk.minLevel || 'BEGINNER'}`}
                          sx={{ bgcolor: '#f0fdf4', color: '#166534', fontWeight: 700, fontSize: '0.7rem' }}
                        />
                      </Box>
                    ))}
                  </Box>
                </Box>
              </Box>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* ===================================================================== */}
      {/* TAB 1: AUTOMATIC ELIGIBILITY CHECKER & CANDIDATE SELECTION            */}
      {/* ===================================================================== */}
      {activeTab === 1 && (
        <Box>
          {/* Eligibility Metric Counters */}
          <Grid container spacing={2.5} sx={{ mb: 3 }}>
            <Grid item xs={6} sm={3}>
              <Paper
                elevation={0}
                sx={{
                  p: 2.5,
                  borderRadius: 2.5,
                  border: '1px solid #bbf7d0',
                  bgcolor: '#f0fdf4',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  '&:hover': { transform: 'scale(1.02)' },
                }}
                onClick={() => setCategoryFilter('ELIGIBLE')}
              >
                <Typography variant="caption" fontWeight={700} sx={{ color: '#166534', textTransform: 'uppercase' }}>
                  Eligible Students
                </Typography>
                <Typography variant="h4" fontWeight={800} sx={{ color: '#15803d', mt: 0.5 }}>
                  {eligibilityData?.eligibleCount ?? 0}
                </Typography>
                <Typography variant="caption" sx={{ color: '#16a34a' }}>
                  Meet all academic & skill criteria
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={6} sm={3}>
              <Paper
                elevation={0}
                sx={{
                  p: 2.5,
                  borderRadius: 2.5,
                  border: '1px solid #fecaca',
                  bgcolor: '#fef2f2',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  '&:hover': { transform: 'scale(1.02)' },
                }}
                onClick={() => setCategoryFilter('NOT_ELIGIBLE')}
              >
                <Typography variant="caption" fontWeight={700} sx={{ color: '#991b1b', textTransform: 'uppercase' }}>
                  Not Eligible
                </Typography>
                <Typography variant="h4" fontWeight={800} sx={{ color: '#b91c1c', mt: 0.5 }}>
                  {eligibilityData?.notEligibleCount ?? 0}
                </Typography>
                <Typography variant="caption" sx={{ color: '#dc2626' }}>
                  Below threshold or missing skills
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={6} sm={3}>
              <Paper
                elevation={0}
                sx={{
                  p: 2.5,
                  borderRadius: 2.5,
                  border: '1px solid #fed7aa',
                  bgcolor: '#fff7ed',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  '&:hover': { transform: 'scale(1.02)' },
                }}
                onClick={() => setCategoryFilter('MISSING_DATA')}
              >
                <Typography variant="caption" fontWeight={700} sx={{ color: '#9a3412', textTransform: 'uppercase' }}>
                  Missing Academic Info
                </Typography>
                <Typography variant="h4" fontWeight={800} sx={{ color: '#c2410c', mt: 0.5 }}>
                  {eligibilityData?.missingDataCount ?? 0}
                </Typography>
                <Typography variant="caption" sx={{ color: '#ea580c' }}>
                  Mandatory marks/CGPA missing
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={6} sm={3}>
              <Paper
                elevation={0}
                sx={{
                  p: 2.5,
                  borderRadius: 2.5,
                  border: '1px solid #bae6fd',
                  bgcolor: '#f0f9ff',
                  cursor: 'pointer',
                }}
                onClick={() => setActiveTab(2)}
              >
                <Typography variant="caption" fontWeight={700} sx={{ color: '#0369a1', textTransform: 'uppercase' }}>
                  Registered Candidates
                </Typography>
                <Typography variant="h4" fontWeight={800} sx={{ color: '#0284c7', mt: 0.5 }}>
                  {eligibilityData?.registeredCount ?? 0}
                </Typography>
                <Typography variant="caption" sx={{ color: '#0284c7' }}>
                  Enrolled in recruitment pipeline
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          {/* Filtering Bar */}
          <Card
            elevation={0}
            sx={{
              p: 2,
              mb: 3,
              borderRadius: 2.5,
              border: '1px solid #DCE6F5',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 2,
            }}
          >
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip
                label={`All (${eligibilityData?.totalStudentsEvaluated ?? 0})`}
                clickable
                color={categoryFilter === 'ALL' ? 'primary' : 'default'}
                onClick={() => setCategoryFilter('ALL')}
              />
              <Chip
                label={`Eligible Only (${eligibilityData?.eligibleCount ?? 0})`}
                clickable
                color={categoryFilter === 'ELIGIBLE' ? 'success' : 'default'}
                onClick={() => setCategoryFilter('ELIGIBLE')}
              />
              <Chip
                label={`Not Eligible (${eligibilityData?.notEligibleCount ?? 0})`}
                clickable
                color={categoryFilter === 'NOT_ELIGIBLE' ? 'error' : 'default'}
                onClick={() => setCategoryFilter('NOT_ELIGIBLE')}
              />
              <Chip
                label={`Missing Info (${eligibilityData?.missingDataCount ?? 0})`}
                clickable
                color={categoryFilter === 'MISSING_DATA' ? 'warning' : 'default'}
                onClick={() => setCategoryFilter('MISSING_DATA')}
              />
            </Box>

            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
              <TextField
                select
                size="small"
                label="Department"
                value={selectedDeptFilter}
                onChange={(e) => setSelectedDeptFilter(e.target.value)}
                sx={{ width: 150 }}
              >
                <MenuItem value="ALL">All Departments</MenuItem>
                <MenuItem value="CSE">CSE</MenuItem>
                <MenuItem value="ECE">ECE</MenuItem>
                <MenuItem value="IT">IT</MenuItem>
                <MenuItem value="MECH">MECH</MenuItem>
              </TextField>

              <TextField
                size="small"
                placeholder="Search candidate name or reg no..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                sx={{ width: { xs: '100%', sm: 260 } }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: '#94a3b8', fontSize: 18 }} />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>
          </Card>

          {/* Bulk Selection Bar */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 2,
              p: 1.5,
              borderRadius: 2,
              bgcolor: selectedStudentIds.length > 0 ? '#f0f9ff' : '#f8fafc',
              border: `1px solid ${selectedStudentIds.length > 0 ? '#bae6fd' : '#e2e8f0'}`,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Button
                size="small"
                variant="outlined"
                onClick={handleSelectAllEligible}
                sx={{ textTransform: 'none', borderRadius: 1.5 }}
              >
                Select All Eligible
              </Button>
              {selectedStudentIds.length > 0 && (
                <Button
                  size="small"
                  onClick={handleClearSelection}
                  sx={{ textTransform: 'none', color: '#64748b' }}
                >
                  Clear Selection
                </Button>
              )}
              <Typography variant="body2" fontWeight={700} sx={{ color: '#0369a1' }}>
                {selectedStudentIds.length} candidate(s) selected
              </Typography>
            </Box>

            <Button
              variant="contained"
              size="small"
              startIcon={<HowToRegIcon />}
              disabled={selectedStudentIds.length === 0}
              onClick={() => setBulkRegisterOpen(true)}
              sx={{
                bgcolor: '#0284c7',
                '&:hover': { bgcolor: '#0369a1' },
                textTransform: 'none',
                fontWeight: 700,
                borderRadius: 1.5,
              }}
            >
              Register Selected ({selectedStudentIds.length}) Candidates
            </Button>
          </Box>

          {/* Candidates Evaluation Table */}
          {isEligibilityLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress size={36} />
            </Box>
          ) : (
            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #DCE6F5', borderRadius: 2.5 }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: '#f8fafc' }}>
                  <TableRow>
                    <TableCell padding="checkbox">
                      {/* Placeholder */}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '0.75rem' }}>CANDIDATE</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '0.75rem' }}>DEPT & BATCH</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '0.75rem' }}>10TH / 12TH %</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '0.75rem' }}>CURRENT CGPA</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '0.75rem' }}>SKILLS & PROFICIENCY</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '0.75rem' }}>ELIGIBILITY STATUS</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '0.75rem' }} align="right">DRIVE ACTION</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredStudents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                        <Typography variant="body2" sx={{ color: '#64748b' }}>
                          No candidates matching the selected filters.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredStudents.map((student) => {
                      const isSelected = selectedStudentIds.includes(student.studentId);

                      return (
                        <TableRow
                          key={student.studentId}
                          hover
                          sx={{
                            bgcolor: isSelected ? '#f0f9ff' : student.isRegistered ? '#fafafa' : '#ffffff',
                          }}
                        >
                          <TableCell padding="checkbox">
                            <Checkbox
                              checked={isSelected}
                              disabled={student.isRegistered}
                              onChange={() => handleToggleSelect(student.studentId)}
                            />
                          </TableCell>

                          <TableCell>
                            <Typography variant="body2" fontWeight={700} sx={{ color: '#0f172a' }}>
                              {student.name}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#0284c7', fontFamily: 'monospace' }}>
                              {student.registerNumber}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                              {student.collegeEmail}
                            </Typography>
                          </TableCell>

                          <TableCell>
                            <Typography variant="body2" fontWeight={600} sx={{ color: '#334155' }}>
                              {student.department || '—'}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#64748b' }}>
                              Batch {student.batchYear || '—'}
                            </Typography>
                          </TableCell>

                          <TableCell>
                            <Typography variant="body2" sx={{ color: '#334155' }}>
                              10th: <strong>{student.tenthPercentage != null ? `${student.tenthPercentage}%` : 'N/A'}</strong>
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#334155' }}>
                              12th: <strong>{student.twelfthPercentage != null ? `${student.twelfthPercentage}%` : 'N/A'}</strong>
                            </Typography>
                          </TableCell>

                          <TableCell>
                            <Typography variant="body2" fontWeight={800} sx={{ color: '#0f172a' }}>
                              {student.cgpa != null ? Number(student.cgpa).toFixed(2) : 'N/A'}
                            </Typography>
                            {student.overallPercentage != null && (
                              <Typography variant="caption" sx={{ color: '#059669', fontWeight: 600 }}>
                                {Number(student.overallPercentage).toFixed(1)}% (Univ)
                              </Typography>
                            )}
                            <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                              Backlogs: {student.activeBacklogs}
                            </Typography>
                          </TableCell>

                          <TableCell sx={{ maxWidth: 220 }}>
                            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                              {student.skills.slice(0, 3).map((sk) => (
                                <Chip
                                  key={sk.id}
                                  size="small"
                                  label={`${sk.name} (${sk.level.slice(0, 3)})`}
                                  sx={{ fontSize: '0.65rem', height: 20 }}
                                />
                              ))}
                              {student.skills.length > 3 && (
                                <Chip
                                  size="small"
                                  label={`+${student.skills.length - 3}`}
                                  sx={{ fontSize: '0.65rem', height: 20 }}
                                />
                              )}
                            </Box>
                          </TableCell>

                          {/* ELIGIBILITY CHIP WITH FAILURE POPUP */}
                          <TableCell>
                            {student.category === 'ELIGIBLE' ? (
                              <Chip
                                size="small"
                                icon={<CheckCircleIcon sx={{ fontSize: '14px !important' }} />}
                                label="Eligible"
                                sx={{
                                  bgcolor: '#dcfce7',
                                  color: '#15803d',
                                  fontWeight: 800,
                                  fontSize: '0.75rem',
                                  border: '1px solid #bbf7d0',
                                }}
                              />
                            ) : student.category === 'MISSING_DATA' ? (
                              <Chip
                                size="small"
                                icon={<WarningAmberIcon sx={{ fontSize: '14px !important' }} />}
                                label="Missing Academic Info"
                                onClick={(e) => handleOpenPopover(e, student)}
                                sx={{
                                  bgcolor: '#fff7ed',
                                  color: '#c2410c',
                                  fontWeight: 800,
                                  fontSize: '0.72rem',
                                  border: '1px solid #fed7aa',
                                  cursor: 'pointer',
                                  '&:hover': { bgcolor: '#ffedd5' },
                                }}
                              />
                            ) : (
                              <Chip
                                size="small"
                                icon={<CancelIcon sx={{ fontSize: '14px !important' }} />}
                                label="Not Eligible"
                                onClick={(e) => handleOpenPopover(e, student)}
                                sx={{
                                  bgcolor: '#fee2e2',
                                  color: '#b91c1c',
                                  fontWeight: 800,
                                  fontSize: '0.75rem',
                                  border: '1px solid #fecaca',
                                  cursor: 'pointer',
                                  '&:hover': { bgcolor: '#fecaca' },
                                }}
                              />
                            )}
                          </TableCell>

                          {/* Action */}
                          <TableCell align="right">
                            {student.isRegistered ? (
                              <Chip
                                size="small"
                                label={student.currentStage || 'Registered'}
                                sx={{
                                  bgcolor: '#e0f2fe',
                                  color: '#0369a1',
                                  fontWeight: 700,
                                  fontSize: '0.7rem',
                                }}
                              />
                            ) : (
                              <Button
                                size="small"
                                variant="outlined"
                                disabled={student.isRegistered}
                                onClick={() => handleSingleRegister(student.studentId)}
                                sx={{
                                  textTransform: 'none',
                                  borderRadius: 1.5,
                                  fontSize: '0.75rem',
                                  color: '#0284c7',
                                  borderColor: '#bae6fd',
                                }}
                              >
                                Register
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* Popover for Failure & Missing Data Explanations */}
          <Popover
            open={Boolean(popoverAnchor)}
            anchorEl={popoverAnchor}
            onClose={handleClosePopover}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          >
            <Box sx={{ p: 2, maxWidth: 360 }}>
              <Typography variant="subtitle2" fontWeight={800} sx={{ color: '#0f172a', mb: 1 }}>
                {activeReasons?.title}
              </Typography>
              <Divider sx={{ mb: 1.5 }} />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {activeReasons?.items.map((item, idx) => (
                  <Box key={idx} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                    {activeReasons.type === 'missing' ? (
                      <WarningAmberIcon sx={{ color: '#ea580c', fontSize: 16, mt: 0.2 }} />
                    ) : (
                      <CancelIcon sx={{ color: '#dc2626', fontSize: 16, mt: 0.2 }} />
                    )}
                    <Typography variant="caption" sx={{ color: '#334155', lineHeight: 1.4 }}>
                      {item}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          </Popover>
        </Box>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: RECRUITMENT STAGE TRACKER & SELECTION HISTORY                  */}
      {/* ===================================================================== */}
      {activeTab === 2 && (
        <Box>
          {/* Stage Overview Chips */}
          <Card
            elevation={0}
            sx={{
              p: 2,
              mb: 3,
              borderRadius: 2.5,
              border: '1px solid #DCE6F5',
              display: 'flex',
              gap: 1.5,
              flexWrap: 'wrap',
              alignItems: 'center',
            }}
          >
            <Typography variant="body2" fontWeight={700} sx={{ color: '#475569', mr: 1 }}>
              Filter by Stage:
            </Typography>
            <Chip
              label={`All Registered (${registrations.length})`}
              clickable
              color={selectedStageFilter === 'ALL' ? 'primary' : 'default'}
              onClick={() => setSelectedStageFilter('ALL')}
            />
            {SELECTION_STAGES.map((st) => {
              const count = registrations.filter((r) => r.currentStage === st.value).length;
              return (
                <Chip
                  key={st.value}
                  label={`${st.label} (${count})`}
                  clickable
                  variant={selectedStageFilter === st.value ? 'filled' : 'outlined'}
                  color={selectedStageFilter === st.value ? 'primary' : 'default'}
                  onClick={() => setSelectedStageFilter(st.value)}
                />
              );
            })}
          </Card>

          {isRegistrationsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress size={36} />
            </Box>
          ) : registrations.length === 0 ? (
            <Card
              elevation={0}
              sx={{
                py: 8,
                px: 3,
                textAlign: 'center',
                borderRadius: 2.5,
                border: '1px dashed #cbd5e1',
                bgcolor: '#ffffff',
              }}
            >
              <HowToRegIcon sx={{ fontSize: 50, color: '#94a3b8', mb: 1.5 }} />
              <Typography variant="h6" fontWeight={700} sx={{ color: '#1e293b' }}>
                No students registered yet for this drive
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5, mb: 2 }}>
                Switch to the "Eligibility Checker & Student Selection" tab to select eligible candidates and enroll them.
              </Typography>
              <Button
                variant="contained"
                onClick={() => setActiveTab(1)}
                sx={{ bgcolor: '#0284c7', textTransform: 'none', borderRadius: 2 }}
              >
                Go to Eligibility Checker
              </Button>
            </Card>
          ) : (
            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #DCE6F5', borderRadius: 2.5 }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: '#f8fafc' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '0.75rem' }}>CANDIDATE</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '0.75rem' }}>DEPARTMENT</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '0.75rem' }}>CURRENT STAGE</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '0.75rem' }}>RECRUITMENT REMARKS</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '0.75rem' }}>REGISTERED BY</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '0.75rem' }}>ENROLLED AT</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '0.75rem' }} align="right">STAGE ACTION</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {registrations
                    .filter((r) => selectedStageFilter === 'ALL' || r.currentStage === selectedStageFilter)
                    .map((reg) => {
                      const badge = getStageBadge(reg.currentStage);

                      return (
                        <TableRow key={reg.id} hover>
                          <TableCell>
                            <Typography variant="body2" fontWeight={700} sx={{ color: '#0f172a' }}>
                              {reg.student?.name || 'Candidate'}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#0284c7', fontFamily: 'monospace' }}>
                              {reg.student?.registerNumber}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                              {reg.student?.collegeEmail}
                            </Typography>
                          </TableCell>

                          <TableCell>
                            <Typography variant="body2" fontWeight={600} sx={{ color: '#334155' }}>
                              {reg.student?.department?.code || reg.student?.department?.name || '—'}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#059669', fontWeight: 700 }}>
                              CGPA: {reg.student?.cgpa != null ? Number(reg.student.cgpa).toFixed(2) : 'N/A'}
                            </Typography>
                          </TableCell>

                          <TableCell>
                            <Chip
                              size="small"
                              label={badge.label}
                              sx={{
                                bgcolor: badge.bg,
                                color: badge.color,
                                fontWeight: 800,
                                fontSize: '0.72rem',
                                border: `1px solid ${badge.color}30`,
                              }}
                            />
                          </TableCell>

                          <TableCell sx={{ maxWidth: 260 }}>
                            <Typography variant="caption" sx={{ color: '#475569', lineHeight: 1.4 }}>
                              {reg.stageRemarks || 'No stage remarks recorded'}
                            </Typography>
                          </TableCell>

                          <TableCell>
                            <Typography variant="caption" sx={{ color: '#64748b' }}>
                              {reg.registeredBy}
                            </Typography>
                          </TableCell>

                          <TableCell>
                            <Typography variant="caption" sx={{ color: '#64748b' }}>
                              {new Date(reg.createdAt).toLocaleDateString()}
                            </Typography>
                          </TableCell>

                          <TableCell align="right">
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() =>
                                handleOpenStageUpdate(
                                  reg.id,
                                  reg.student?.name || 'Candidate',
                                  reg.currentStage,
                                  reg.stageRemarks
                                )
                              }
                              sx={{
                                textTransform: 'none',
                                borderRadius: 1.5,
                                fontSize: '0.75rem',
                              }}
                            >
                              Update Stage
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      )}

      {/* Bulk Register Confirmation Dialog */}
      <Dialog open={bulkRegisterOpen} onClose={() => setBulkRegisterOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, color: '#0f172a' }}>
          Enroll Candidates for {drive?.companyName}
        </DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="body2" sx={{ color: '#475569' }}>
            You are registering <strong>{selectedStudentIds.length} candidate(s)</strong> for the placement drive:
          </Typography>
          <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
            <Typography variant="subtitle2" fontWeight={800} sx={{ color: '#0284c7' }}>
              {drive?.companyName} - {drive?.jobRole}
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748b' }}>
              Drive Date: {drive ? new Date(drive.driveDate).toLocaleDateString() : ''}
            </Typography>
          </Box>

          <TextField
            label="Enrollment / Shortlist Remarks (Optional)"
            multiline
            rows={2}
            fullWidth
            size="small"
            placeholder="e.g. Cleared internal pre-screening; registered for round 1."
            value={registrationRemarks}
            onChange={(e) => setRegistrationRemarks(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setBulkRegisterOpen(false)} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={registerMutation.isPending}
            onClick={() =>
              registerMutation.mutate({
                studentIds: selectedStudentIds,
                remarks: registrationRemarks.trim() || undefined,
              })
            }
            sx={{
              bgcolor: '#0284c7',
              '&:hover': { bgcolor: '#0369a1' },
              textTransform: 'none',
              fontWeight: 700,
            }}
          >
            {registerMutation.isPending ? <CircularProgress size={20} color="inherit" /> : 'Confirm Registration'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Stage Update Dialog */}
      <Dialog open={stageUpdateOpen} onClose={() => setStageUpdateOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, color: '#0f172a' }}>
          Update Recruitment Stage
        </DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 2 }}>
          <Box>
            <Typography variant="caption" sx={{ color: '#64748b' }}>
              CANDIDATE
            </Typography>
            <Typography variant="subtitle2" fontWeight={800} sx={{ color: '#0f172a' }}>
              {selectedCandidateName}
            </Typography>
          </Box>

          <TextField
            select
            label="Recruitment Stage"
            fullWidth
            size="small"
            value={newStage}
            onChange={(e) => setNewStage(e.target.value as SelectionStage)}
          >
            {SELECTION_STAGES.map((st) => (
              <MenuItem key={st.value} value={st.value}>
                {st.label}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Stage Remarks / Interview Feedback"
            multiline
            rows={3}
            fullWidth
            size="small"
            placeholder="e.g. Shortlisted for Bar Raiser round; score 85% in technical assessment."
            value={stageRemarks}
            onChange={(e) => setStageRemarks(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setStageUpdateOpen(false)} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={updateStageMutation.isPending}
            onClick={() =>
              updateStageMutation.mutate({
                registrationId: selectedRegistrationId,
                stage: newStage,
                remarks: stageRemarks.trim() || undefined,
              })
            }
            sx={{
              bgcolor: '#0284c7',
              '&:hover': { bgcolor: '#0369a1' },
              textTransform: 'none',
              fontWeight: 700,
            }}
          >
            {updateStageMutation.isPending ? <CircularProgress size={20} color="inherit" /> : 'Save Stage'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
