import React, { useState, useMemo, useEffect } from 'react';
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
  TablePagination,
  Snackbar,
  Alert,
  FormControl,
  Select,
  OutlinedInput,
  ListItemText,
  SelectChangeEvent,
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
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';

import { placementDriveService } from '../../services/placement-drive.service.js';
import { managementService } from '../../services/management.service.js';
import {
  StudentEligibilityResult,
  SelectionStage,
  DriveStatus,
  RequiredSkillCriterion,
  CreatePlacementDriveInput,
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

  // 3. Fetch college departments for dynamic dropdown filter
  const { data: collegeDepartments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: () => managementService.getDepartments(),
    staleTime: 60000,
  });

  // 4. Fetch college classes for batch options
  const { data: collegeClasses = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: () => managementService.getClasses(),
    staleTime: 60000,
  });

  // Candidate Table Pagination State
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // Edit Drive Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editFormError, setEditFormError] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [jobRole, setJobRole] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [location, setLocation] = useState('');
  const [packageDetails, setPackageDetails] = useState('');
  const [vacancies, setVacancies] = useState<number | ''>(5);
  const [driveDate, setDriveDate] = useState('');
  const [registrationDeadline, setRegistrationDeadline] = useState('');
  const [status, setStatus] = useState<DriveStatus>('UPCOMING');
  const [minTenthPercentage, setMinTenthPercentage] = useState<number | ''>('');
  const [minTwelfthPercentage, setMinTwelfthPercentage] = useState<number | ''>('');
  const [minCgpa, setMinCgpa] = useState<number | ''>(7.0);
  const [maxActiveBacklogs, setMaxActiveBacklogs] = useState<number | ''>(0);
  const [selectedDepts, setSelectedDepts] = useState<string[]>([]);
  const [selectedBatches, setSelectedBatches] = useState<number[]>([]);
  const [requiredSkills, setRequiredSkills] = useState<RequiredSkillCriterion[]>([]);
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillLevel, setNewSkillLevel] = useState('INTERMEDIATE');

  // Delete Drive Confirmation & Feedback State
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const drive = eligibilityData?.drive;

  // Dynamically compute department options for filtering
  const departmentOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const d of collegeDepartments) {
      if (d && d.code) {
        map.set(d.code.toUpperCase().trim(), d.name || d.code);
      }
    }
    if (eligibilityData?.students) {
      for (const s of eligibilityData.students) {
        if (s.department) {
          const upper = s.department.toUpperCase().trim();
          if (!map.has(upper)) {
            map.set(upper, s.department);
          }
        }
      }
    }
    return Array.from(map.entries())
      .map(([code, name]) => ({ code, name }))
      .sort((a, b) => a.code.localeCompare(b.code));
  }, [collegeDepartments, eligibilityData]);

  // Dynamically compute department options for modal multi-select
  const modalDepartmentOptions = useMemo(() => {
    const map = new Map<string, { code: string; name: string }>();
    for (const dept of collegeDepartments) {
      if (dept && dept.code) {
        const codeUpper = dept.code.toUpperCase().trim();
        map.set(codeUpper, {
          code: codeUpper,
          name: dept.name || codeUpper,
        });
      }
    }
    for (const code of selectedDepts) {
      if (code) {
        const codeUpper = code.toUpperCase().trim();
        if (!map.has(codeUpper)) {
          map.set(codeUpper, { code: codeUpper, name: codeUpper });
        }
      }
    }
    return Array.from(map.values()).sort((a, b) => a.code.localeCompare(b.code));
  }, [collegeDepartments, selectedDepts]);

  // Dynamically compute batch year options for modal multi-select
  const modalBatchOptions = useMemo(() => {
    const set = new Set<number>();
    for (const cls of collegeClasses) {
      if (cls && typeof cls.batchYear === 'number' && !isNaN(cls.batchYear) && cls.batchYear > 0) {
        set.add(cls.batchYear);
      }
    }
    for (const batch of selectedBatches) {
      if (typeof batch === 'number' && !isNaN(batch) && batch > 0) {
        set.add(batch);
      }
    }
    if (set.size === 0) {
      const currentYear = new Date().getFullYear();
      for (let y = currentYear - 1; y <= currentYear + 3; y++) {
        set.add(y);
      }
    }
    return Array.from(set).sort((a, b) => b - a);
  }, [collegeClasses, selectedBatches]);

  // All eligible candidates for this drive who are not yet registered
  const allEligibleStudents = useMemo(() => {
    if (!eligibilityData?.students) return [];
    return eligibilityData.students.filter(
      (s) => s.category === 'ELIGIBLE' && !s.isRegistered
    );
  }, [eligibilityData]);

  // Candidates filtered by search & department
  const matchingEligibleStudents = useMemo(() => {
    if (!eligibilityData?.students) return [];
    let list = eligibilityData.students.filter(
      (s) => s.category === 'ELIGIBLE' && !s.isRegistered
    );

    if (selectedDeptFilter !== 'ALL') {
      const lower = selectedDeptFilter.toLowerCase();
      list = list.filter(
        (s) =>
          s.department.toLowerCase().includes(lower) ||
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
  }, [eligibilityData, selectedDeptFilter, searchTerm]);

  // Target candidates for "Select All Eligible" button
  const eligibleTargetStudents = useMemo(() => {
    if (selectedDeptFilter !== 'ALL' || searchTerm.trim()) {
      return matchingEligibleStudents;
    }
    return allEligibleStudents;
  }, [selectedDeptFilter, searchTerm, matchingEligibleStudents, allEligibleStudents]);

  const areAllEligibleSelected = useMemo(() => {
    if (eligibleTargetStudents.length === 0) return false;
    return eligibleTargetStudents.every((s) => selectedStudentIds.includes(s.studentId));
  }, [eligibleTargetStudents, selectedStudentIds]);

  // Filtered Students currently shown in the table
  const filteredStudents = useMemo(() => {
    if (!eligibilityData?.students) return [];
    let list = eligibilityData.students;

    if (categoryFilter !== 'ALL') {
      list = list.filter((s) => s.category === categoryFilter);
    }

    if (selectedDeptFilter !== 'ALL') {
      const lower = selectedDeptFilter.toLowerCase();
      list = list.filter(
        (s) =>
          s.department.toLowerCase().includes(lower) ||
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

  // Reset pagination page when filters change
  useEffect(() => {
    setPage(0);
  }, [categoryFilter, selectedDeptFilter, searchTerm]);

  // Paginated students displayed in the table
  const paginatedStudents = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredStudents.slice(start, start + rowsPerPage);
  }, [filteredStudents, page, rowsPerPage]);

  // Eligible candidates displayed in current table view
  const eligibleInTable = useMemo(() => {
    return filteredStudents.filter((s) => s.category === 'ELIGIBLE' && !s.isRegistered);
  }, [filteredStudents]);

  // Keep selectedStudentIds synchronized: ensure only currently valid, unregistered eligible candidates remain selected
  useEffect(() => {
    if (eligibilityData?.students && selectedStudentIds.length > 0) {
      const validEligibleSet = new Set(
        eligibilityData.students
          .filter((s) => s.category === 'ELIGIBLE' && !s.isRegistered)
          .map((s) => s.studentId)
      );
      setSelectedStudentIds((prev) => {
        const next = prev.filter((id) => validEligibleSet.has(id));
        return next.length === prev.length ? prev : next;
      });
    }
  }, [eligibilityData]);

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

  // Update drive mutation
  const updateDriveMutation = useMutation({
    mutationFn: (payload: CreatePlacementDriveInput) =>
      placementDriveService.updateDrive(id!, payload),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['placement-drives'] });
      queryClient.invalidateQueries({ queryKey: ['placement-drive', id] });
      queryClient.invalidateQueries({ queryKey: ['placement-drive-eligibility', id] });
      queryClient.invalidateQueries({ queryKey: ['placement-drive-registrations', id] });
      setSnackbar({
        open: true,
        message: `Placement drive "${updated.companyName}" successfully updated!`,
        severity: 'success',
      });
      setEditModalOpen(false);
    },
    onError: (err: any) => {
      setEditFormError(err?.response?.data?.message || err?.message || 'Failed to update placement drive');
    },
  });

  // Delete drive mutation
  const deleteDriveMutation = useMutation({
    mutationFn: () => placementDriveService.deleteDrive(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['placement-drives'] });
      navigate('/admin/placement-drives');
    },
    onError: (err: any) => {
      setSnackbar({
        open: true,
        message: err?.response?.data?.message || err?.message || 'Failed to delete placement drive',
        severity: 'error',
      });
      setDeleteConfirmOpen(false);
    },
  });

  const handleOpenEdit = () => {
    if (!drive) return;
    setCompanyName(drive.companyName);
    setJobRole(drive.jobRole);
    setJobDescription(drive.jobDescription || '');
    setLocation(drive.location || '');
    setPackageDetails(drive.packageDetails || '');
    setVacancies(drive.vacancies != null ? drive.vacancies : 1);
    setDriveDate(new Date(drive.driveDate).toISOString().split('T')[0]);
    setRegistrationDeadline(new Date(drive.registrationDeadline).toISOString().split('T')[0]);
    setStatus(drive.status);
    setMinTenthPercentage(drive.minTenthPercentage != null ? drive.minTenthPercentage : '');
    setMinTwelfthPercentage(drive.minTwelfthPercentage != null ? drive.minTwelfthPercentage : '');
    setMinCgpa(drive.minCgpa != null ? drive.minCgpa : '');
    setMaxActiveBacklogs(drive.maxActiveBacklogs != null ? drive.maxActiveBacklogs : 0);
    setSelectedDepts(drive.eligibleDepartments || []);
    setSelectedBatches(drive.eligibleBatchYears || []);
    setRequiredSkills(drive.requiredSkills ? [...drive.requiredSkills] : []);
    setEditFormError(null);
    setEditModalOpen(true);
  };

  const handleAddSkill = () => {
    if (!newSkillName.trim()) return;
    const trimmed = newSkillName.trim();
    if (requiredSkills.some((s) => s.name.toLowerCase() === trimmed.toLowerCase())) {
      setEditFormError('This skill is already in the requirements list');
      return;
    }
    setRequiredSkills([...requiredSkills, { name: trimmed, minLevel: newSkillLevel }]);
    setNewSkillName('');
    setEditFormError(null);
  };

  const handleRemoveSkill = (index: number) => {
    setRequiredSkills(requiredSkills.filter((_, i) => i !== index));
  };

  const handleUpdateDriveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) {
      setEditFormError('Company name is required');
      return;
    }
    if (!jobRole.trim()) {
      setEditFormError('Job role is required');
      return;
    }
    if (new Date(registrationDeadline) > new Date(driveDate)) {
      setEditFormError('Registration deadline cannot be after the drive date');
      return;
    }

    const payload: CreatePlacementDriveInput = {
      companyName: companyName.trim(),
      jobRole: jobRole.trim(),
      jobDescription: jobDescription.trim() || undefined,
      location: location.trim() || undefined,
      packageDetails: packageDetails.trim() || undefined,
      vacancies: vacancies === '' ? 1 : Number(vacancies),
      driveDate: new Date(driveDate).toISOString(),
      registrationDeadline: new Date(registrationDeadline).toISOString(),
      status,
      minTenthPercentage: minTenthPercentage === '' ? null : Number(minTenthPercentage),
      minTwelfthPercentage: minTwelfthPercentage === '' ? null : Number(minTwelfthPercentage),
      minCgpa: minCgpa === '' ? null : Number(minCgpa),
      maxActiveBacklogs: maxActiveBacklogs === '' ? 0 : Number(maxActiveBacklogs),
      eligibleDepartments: selectedDepts,
      eligibleBatchYears: selectedBatches,
      requiredSkills,
      selectionProcess: drive?.selectionProcess || undefined,
    };

    updateDriveMutation.mutate(payload);
  };

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

  // Select / deselect logic for "Select All Eligible" button
  const handleSelectAllEligible = () => {
    if (eligibleTargetStudents.length === 0) return;
    const targetIds = eligibleTargetStudents.map((s) => s.studentId);

    if (areAllEligibleSelected) {
      // Toggle off / deselect all targeted eligible candidates
      setSelectedStudentIds((prev) => prev.filter((id) => !targetIds.includes(id)));
    } else {
      // Select all targeted eligible candidates without duplicates
      setSelectedStudentIds((prev) => Array.from(new Set([...prev, ...targetIds])));
      // If currently on an ineligible tab, switch to ELIGIBLE so selected rows are visible
      if (categoryFilter === 'NOT_ELIGIBLE' || categoryFilter === 'MISSING_DATA') {
        setCategoryFilter('ELIGIBLE');
      }
    }
  };

  // Individual row selection toggle
  const handleToggleSelect = (studentId: string) => {
    if (selectedStudentIds.includes(studentId)) {
      // Deselect is always allowed
      setSelectedStudentIds((prev) => prev.filter((id) => id !== studentId));
    } else {
      // Strictly permit selecting ONLY students whose category is ELIGIBLE and not yet registered
      const candidate = eligibilityData?.students?.find((s) => s.studentId === studentId);
      if (candidate && candidate.category === 'ELIGIBLE' && !candidate.isRegistered) {
        setSelectedStudentIds((prev) => [...prev, studentId]);
      }
    }
  };

  // Table header master checkbox toggle
  const handleToggleHeaderSelect = () => {
    if (eligibleInTable.length === 0) return;
    const tableEligibleIds = eligibleInTable.map((s) => s.studentId);
    const areAllInTableSelected = tableEligibleIds.every((id) => selectedStudentIds.includes(id));

    if (areAllInTableSelected) {
      // Deselect eligible candidates shown in this table
      setSelectedStudentIds((prev) => prev.filter((id) => !tableEligibleIds.includes(id)));
    } else {
      // Select all eligible candidates shown in this table
      setSelectedStudentIds((prev) => Array.from(new Set([...prev, ...tableEligibleIds])));
    }
  };

  const handleClearSelection = () => {
    setSelectedStudentIds([]);
  };

  const handleSingleRegister = (studentId: string) => {
    const candidate = eligibilityData?.students?.find((s) => s.studentId === studentId);
    if (candidate && candidate.category === 'ELIGIBLE' && !candidate.isRegistered) {
      setSelectedStudentIds([studentId]);
      setBulkRegisterOpen(true);
    }
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

          <Button
            variant="outlined"
            size="small"
            startIcon={<EditIcon fontSize="small" />}
            onClick={handleOpenEdit}
            disabled={!drive}
            sx={{
              color: '#0284c7',
              borderColor: '#bae6fd',
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              '&:hover': { bgcolor: '#f0f9ff', borderColor: '#0284c7' },
            }}
          >
            Edit Drive
          </Button>

          <Button
            variant="outlined"
            size="small"
            color="error"
            startIcon={<DeleteOutlineIcon fontSize="small" />}
            onClick={() => setDeleteConfirmOpen(true)}
            disabled={!drive}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
            }}
          >
            Delete
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
                sx={{ minWidth: 160 }}
              >
                <MenuItem value="ALL">All Departments</MenuItem>
                {departmentOptions.map((dept) => (
                  <MenuItem key={dept.code} value={dept.code}>
                    {dept.code} {dept.name && dept.name !== dept.code ? `(${dept.name})` : ''}
                  </MenuItem>
                ))}
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
              flexWrap: 'wrap',
              gap: 1.5,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              <Button
                size="small"
                variant={areAllEligibleSelected ? 'contained' : 'outlined'}
                onClick={handleSelectAllEligible}
                disabled={eligibleTargetStudents.length === 0}
                sx={{
                  textTransform: 'none',
                  borderRadius: 1.5,
                  fontWeight: 700,
                  bgcolor: areAllEligibleSelected ? '#0284c7' : undefined,
                  '&:hover': areAllEligibleSelected ? { bgcolor: '#0369a1' } : undefined,
                }}
              >
                {areAllEligibleSelected
                  ? 'Deselect All Eligible'
                  : `Select All Eligible (${eligibleTargetStudents.length})`}
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
            <Paper elevation={0} sx={{ border: '1px solid #DCE6F5', borderRadius: 2.5, overflow: 'hidden' }}>
              <TableContainer>
              <Table size="small">
                <TableHead sx={{ bgcolor: '#f8fafc' }}>
                  <TableRow>
                    <TableCell padding="checkbox">
                      <Checkbox
                        size="small"
                        indeterminate={
                          eligibleInTable.length > 0 &&
                          eligibleInTable.some((s) => selectedStudentIds.includes(s.studentId)) &&
                          !eligibleInTable.every((s) => selectedStudentIds.includes(s.studentId))
                        }
                        checked={
                          eligibleInTable.length > 0 &&
                          eligibleInTable.every((s) => selectedStudentIds.includes(s.studentId))
                        }
                        disabled={eligibleInTable.length === 0}
                        onChange={handleToggleHeaderSelect}
                        inputProps={{
                          'aria-label': 'Select or deselect all eligible candidates in view',
                        }}
                      />
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
                    paginatedStudents.map((student) => {
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
                              disabled={student.isRegistered || student.category !== 'ELIGIBLE'}
                              onChange={() => handleToggleSelect(student.studentId)}
                              inputProps={{
                                'aria-label': `Select candidate ${student.name}`,
                              }}
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
                                disabled={student.isRegistered || student.category !== 'ELIGIBLE'}
                                onClick={() => handleSingleRegister(student.studentId)}
                                sx={{
                                  textTransform: 'none',
                                  borderRadius: 1.5,
                                  fontSize: '0.75rem',
                                  color: student.category === 'ELIGIBLE' ? '#0284c7' : '#94a3b8',
                                  borderColor: student.category === 'ELIGIBLE' ? '#bae6fd' : '#e2e8f0',
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
              <TablePagination
                rowsPerPageOptions={[10, 25, 50, 100]}
                component="div"
                count={filteredStudents.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={(_, newPage) => setPage(newPage)}
                onRowsPerPageChange={(e) => {
                  setRowsPerPage(parseInt(e.target.value, 10));
                  setPage(0);
                }}
                sx={{ borderTop: '1px solid #E2E8F0', bgcolor: '#ffffff' }}
              />
            </Paper>
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

      {/* Edit Placement Drive Dialog */}
      <Dialog open={editModalOpen} onClose={() => !updateDriveMutation.isPending && setEditModalOpen(false)} maxWidth="md" fullWidth>
        <form onSubmit={handleUpdateDriveSubmit}>
          <DialogTitle sx={{ fontWeight: 800, color: '#0f172a', borderBottom: '1px solid #E2E8F0' }}>
            Edit Placement Drive
          </DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 3 }}>
            {editFormError && <Alert severity="error">{editFormError}</Alert>}

            <Typography variant="subtitle2" fontWeight={800} color="#0284c7" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
              1. Basic Drive & Role Details
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Company Name"
                  required
                  fullWidth
                  size="small"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Job Role"
                  required
                  fullWidth
                  size="small"
                  value={jobRole}
                  onChange={(e) => setJobRole(e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="Package Details / CTC"
                  fullWidth
                  size="small"
                  value={packageDetails}
                  onChange={(e) => setPackageDetails(e.target.value)}
                  placeholder="e.g. 15-22 LPA CTC"
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="Vacancies"
                  type="number"
                  fullWidth
                  size="small"
                  inputProps={{ min: 1 }}
                  value={vacancies}
                  onChange={(e) => setVacancies(e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value, 10)))}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="Job Location"
                  fullWidth
                  size="small"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Bengaluru / Hybrid"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Job Description & Responsibilities"
                  multiline
                  rows={2}
                  fullWidth
                  size="small"
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Overview of candidate responsibilities..."
                />
              </Grid>
            </Grid>

            <Divider sx={{ my: 1 }} />

            <Typography variant="subtitle2" fontWeight={800} color="#0284c7" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
              2. Timeline & Schedule
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="Drive Date"
                  type="date"
                  required
                  fullWidth
                  size="small"
                  InputLabelProps={{ shrink: true }}
                  value={driveDate}
                  onChange={(e) => setDriveDate(e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="Registration Deadline"
                  type="date"
                  required
                  fullWidth
                  size="small"
                  InputLabelProps={{ shrink: true }}
                  value={registrationDeadline}
                  onChange={(e) => setRegistrationDeadline(e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  select
                  label="Drive Status"
                  fullWidth
                  size="small"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as DriveStatus)}
                >
                  <MenuItem value="UPCOMING">Upcoming</MenuItem>
                  <MenuItem value="ONGOING">Ongoing</MenuItem>
                  <MenuItem value="COMPLETED">Completed</MenuItem>
                  <MenuItem value="CANCELLED">Cancelled</MenuItem>
                </TextField>
              </Grid>
            </Grid>

            <Divider sx={{ my: 1 }} />

            <Typography variant="subtitle2" fontWeight={800} color="#0284c7" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
              3. Automatic Eligibility Criteria Configuration
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={3}>
                <TextField
                  label="Min 10th Percentage (%)"
                  type="number"
                  fullWidth
                  size="small"
                  placeholder="Leave empty for none"
                  inputProps={{ min: 0, max: 100, step: 0.1 }}
                  value={minTenthPercentage}
                  onChange={(e) => setMinTenthPercentage(e.target.value === '' ? '' : Number(e.target.value))}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField
                  label="Min 12th Percentage (%)"
                  type="number"
                  fullWidth
                  size="small"
                  placeholder="Leave empty for none"
                  inputProps={{ min: 0, max: 100, step: 0.1 }}
                  value={minTwelfthPercentage}
                  onChange={(e) => setMinTwelfthPercentage(e.target.value === '' ? '' : Number(e.target.value))}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField
                  label="Min Current CGPA"
                  type="number"
                  inputProps={{ step: 0.1, min: 0, max: 10 }}
                  fullWidth
                  size="small"
                  placeholder="e.g. 7.5 (Empty = none)"
                  value={minCgpa}
                  onChange={(e) => setMinCgpa(e.target.value === '' ? '' : Number(e.target.value))}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField
                  label="Max Active Backlogs"
                  type="number"
                  fullWidth
                  size="small"
                  inputProps={{ min: 0, step: 1 }}
                  value={maxActiveBacklogs}
                  onChange={(e) => setMaxActiveBacklogs(e.target.value === '' ? '' : Number(e.target.value))}
                />
              </Grid>

              {/* Eligible Departments Dropdown */}
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
                  <Typography variant="caption" fontWeight={700} sx={{ color: '#475569' }}>
                    Eligible Departments:
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1.5 }}>
                    {modalDepartmentOptions.length > 0 && (
                      <>
                        <Button
                          size="small"
                          variant="text"
                          onClick={() => setSelectedDepts(modalDepartmentOptions.map((d) => d.code))}
                          sx={{ p: 0, minWidth: 'auto', fontSize: '0.72rem', textTransform: 'none', color: '#0284c7', fontWeight: 600 }}
                        >
                          Select All ({modalDepartmentOptions.length})
                        </Button>
                        {selectedDepts.length > 0 && (
                          <Button
                            size="small"
                            variant="text"
                            onClick={() => setSelectedDepts([])}
                            sx={{ p: 0, minWidth: 'auto', fontSize: '0.72rem', textTransform: 'none', color: '#64748b', fontWeight: 600 }}
                          >
                            Clear
                          </Button>
                        )}
                      </>
                    )}
                  </Box>
                </Box>
                <FormControl fullWidth size="small">
                  <Select
                    multiple
                    displayEmpty
                    value={selectedDepts}
                    onChange={(e: SelectChangeEvent<string[]>) => {
                      const val = e.target.value;
                      setSelectedDepts(typeof val === 'string' ? val.split(',') : val);
                    }}
                    input={<OutlinedInput />}
                    renderValue={(selected) => {
                      if (selected.length === 0) {
                        return <Typography variant="body2" sx={{ color: '#94a3b8' }}>All Departments Eligible (None restricted)</Typography>;
                      }
                      return (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {selected.map((code) => (
                            <Chip key={code} label={code} size="small" sx={{ height: 22, fontSize: '0.72rem', bgcolor: '#e0f2fe', color: '#0369a1', fontWeight: 700 }} />
                          ))}
                        </Box>
                      );
                    }}
                  >
                    {modalDepartmentOptions.map((dept) => (
                      <MenuItem key={dept.code} value={dept.code}>
                        <Checkbox size="small" checked={selectedDepts.includes(dept.code)} />
                        <ListItemText primary={`${dept.code} — ${dept.name}`} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Eligible Batch Years Dropdown */}
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
                  <Typography variant="caption" fontWeight={700} sx={{ color: '#475569' }}>
                    Eligible Graduation Batch Years:
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1.5 }}>
                    {modalBatchOptions.length > 0 && (
                      <>
                        <Button
                          size="small"
                          variant="text"
                          onClick={() => setSelectedBatches([...modalBatchOptions])}
                          sx={{ p: 0, minWidth: 'auto', fontSize: '0.72rem', textTransform: 'none', color: '#0284c7', fontWeight: 600 }}
                        >
                          Select All ({modalBatchOptions.length})
                        </Button>
                        {selectedBatches.length > 0 && (
                          <Button
                            size="small"
                            variant="text"
                            onClick={() => setSelectedBatches([])}
                            sx={{ p: 0, minWidth: 'auto', fontSize: '0.72rem', textTransform: 'none', color: '#64748b', fontWeight: 600 }}
                          >
                            Clear
                          </Button>
                        )}
                      </>
                    )}
                  </Box>
                </Box>
                <FormControl fullWidth size="small">
                  <Select
                    multiple
                    displayEmpty
                    value={selectedBatches}
                    onChange={(e: SelectChangeEvent<number[]>) => {
                      const val = e.target.value;
                      setSelectedBatches(typeof val === 'string' ? val.split(',').map(Number) : (val as number[]));
                    }}
                    input={<OutlinedInput />}
                    renderValue={(selected) => {
                      if (selected.length === 0) {
                        return <Typography variant="body2" sx={{ color: '#94a3b8' }}>All Graduation Years Eligible</Typography>;
                      }
                      return (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {selected.map((year) => (
                            <Chip key={year} label={`Batch ${year}`} size="small" sx={{ height: 22, fontSize: '0.72rem', bgcolor: '#f0fdf4', color: '#15803d', fontWeight: 700 }} />
                          ))}
                        </Box>
                      );
                    }}
                  >
                    {modalBatchOptions.map((year) => (
                      <MenuItem key={year} value={year}>
                        <Checkbox size="small" checked={selectedBatches.includes(year)} />
                        <ListItemText primary={`Class of ${year} (Graduating ${year})`} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            <Divider sx={{ my: 1 }} />

            <Typography variant="subtitle2" fontWeight={800} color="#0284c7" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
              4. Skill & Proficiency Requirements
            </Typography>

            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
              <TextField
                size="small"
                label="Skill Name"
                value={newSkillName}
                onChange={(e) => setNewSkillName(e.target.value)}
                placeholder="e.g. React.js, Python, SQL"
                sx={{ flex: 1, minWidth: 180 }}
              />
              <TextField
                select
                size="small"
                label="Minimum Level"
                value={newSkillLevel}
                onChange={(e) => setNewSkillLevel(e.target.value)}
                sx={{ width: { xs: '100%', sm: 180 } }}
              >
                <MenuItem value="BEGINNER">Beginner</MenuItem>
                <MenuItem value="INTERMEDIATE">Intermediate</MenuItem>
                <MenuItem value="PROFICIENT">Proficient</MenuItem>
                <MenuItem value="ADVANCED">Advanced</MenuItem>
              </TextField>
              <Button
                variant="outlined"
                onClick={handleAddSkill}
                sx={{ textTransform: 'none', borderRadius: 2 }}
              >
                Add Skill
              </Button>
            </Box>

            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
              {requiredSkills.map((sk, index) => (
                <Chip
                  key={index}
                  label={`${sk.name} (${sk.minLevel})`}
                  onDelete={() => handleRemoveSkill(index)}
                  sx={{ bgcolor: '#f0f9ff', border: '1px solid #bae6fd', color: '#0369a1', fontWeight: 600 }}
                />
              ))}
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 2.5, borderTop: '1px solid #E2E8F0' }}>
            <Button onClick={() => setEditModalOpen(false)} sx={{ textTransform: 'none' }}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={updateDriveMutation.isPending}
              sx={{
                bgcolor: '#0284c7',
                '&:hover': { bgcolor: '#0369a1' },
                textTransform: 'none',
                fontWeight: 700,
                borderRadius: 2,
                px: 3,
              }}
            >
              {updateDriveMutation.isPending ? <CircularProgress size={20} color="inherit" /> : 'Save Changes'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Delete Drive Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => !deleteDriveMutation.isPending && setDeleteConfirmOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 800, color: '#b91c1c', display: 'flex', alignItems: 'center', gap: 1 }}>
          <DeleteOutlineIcon color="error" />
          Delete Placement Drive
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" sx={{ color: '#334155', mb: 1.5 }}>
            Are you sure you want to permanently delete the placement drive for <strong>{drive?.companyName}</strong>?
          </Typography>
          <Alert severity="warning" sx={{ fontSize: '0.8rem' }}>
            This will permanently remove this drive, all evaluated eligibility records, and registered candidate history. This action cannot be undone.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => setDeleteConfirmOpen(false)}
            disabled={deleteDriveMutation.isPending}
            sx={{ textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            disabled={deleteDriveMutation.isPending}
            onClick={() => deleteDriveMutation.mutate()}
            sx={{ textTransform: 'none', fontWeight: 700 }}
          >
            {deleteDriveMutation.isPending ? <CircularProgress size={20} color="inherit" /> : 'Yes, Delete Drive'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar Feedback */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%', fontWeight: 600 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};
