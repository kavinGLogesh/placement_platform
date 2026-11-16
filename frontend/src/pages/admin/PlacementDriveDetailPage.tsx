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
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Stepper,
  Step,
  StepLabel,
  FormControlLabel,
  Switch,
  IconButton,
  Tooltip,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
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
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import HistoryIcon from '@mui/icons-material/History';
import GavelIcon from '@mui/icons-material/Gavel';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import LinkIcon from '@mui/icons-material/Link';
import DescriptionIcon from '@mui/icons-material/Description';
import SendIcon from '@mui/icons-material/Send';
import StarIcon from '@mui/icons-material/Star';
import CloseIcon from '@mui/icons-material/Close';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import CheckIcon from '@mui/icons-material/Check';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';

import { placementDriveService } from '../../services/placement-drive.service.js';
import { managementService } from '../../services/management.service.js';
import { placementStudentService } from '../../services/placement-student.service.js';
import {
  StudentEligibilityResult,
  SelectionStage,
  DriveStatus,
  RequiredSkillCriterion,
  CreatePlacementDriveInput,
} from '../../types/placement-drive.types.js';

const SELECTION_STAGES: Array<{ value: SelectionStage; label: string; color: string; bg: string }> = [
  { value: 'SHORTLISTED', label: 'Shortlisted by Admin', color: '#b45309', bg: '#fef3c7' },
  { value: 'APPLIED', label: 'Applied via Portal', color: '#4338ca', bg: '#e0e7ff' },
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
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Tab state - default to Eligibility Checker (Tab 1), or read URL parameter
  const initialTab =
    searchParams.get('tab') === 'overview'
      ? 0
      : searchParams.get('tab') === 'tracker'
      ? 2
      : searchParams.get('tab') === 'selected'
      ? 3
      : 1;
  const [activeTab, setActiveTab] = useState<number>(initialTab);

  useEffect(() => {
    const t = searchParams.get('tab');
    if (t === 'overview') setActiveTab(0);
    else if (t === 'tracker') setActiveTab(2);
    else if (t === 'selected') setActiveTab(3);
    else if (t === 'eligibility') setActiveTab(1);
  }, [searchParams]);

  const handleTabChange = (_: React.SyntheticEvent, newVal: number) => {
    setActiveTab(newVal);
    const tabParam =
      newVal === 0 ? 'overview' : newVal === 2 ? 'tracker' : newVal === 3 ? 'selected' : 'eligibility';
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('tab', tabParam);
        return next;
      },
      { replace: true }
    );
  };

  // Filters State
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'ELIGIBLE' | 'NOT_ELIGIBLE' | 'MISSING_DATA'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('ALL');
  const [selectedBatchFilter, setSelectedBatchFilter] = useState('ALL');
  const [selectedStageFilter, setSelectedStageFilter] = useState('ALL');

  // Candidate Selection & Shortlisting Workflow State
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [shortlistWorkflowOpen, setShortlistWorkflowOpen] = useState(false);
  const [workflowStep, setWorkflowStep] = useState<0 | 1>(0);
  const [workflowRegLink, setWorkflowRegLink] = useState('');
  const [workflowInstructions, setWorkflowInstructions] = useState('');
  const [workflowPackage, setWorkflowPackage] = useState('');
  const [workflowJobDescription, setWorkflowJobDescription] = useState('');
  const [workflowLocation, setWorkflowLocation] = useState('');
  const [workflowNotifyCandidates, setWorkflowNotifyCandidates] = useState(true);

  // Failure details popover state
  const [popoverAnchor, setPopoverAnchor] = useState<HTMLElement | null>(null);
  const [activeReasons, setActiveReasons] = useState<{
    candidateName: string;
    registerNumber: string;
    category: 'ELIGIBLE' | 'NOT_ELIGIBLE' | 'MISSING_DATA';
    missingDetails: string[];
    failureReasons: string[];
  } | null>(null);

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

  // Dynamically compute department options for filtering: ONLY departments selected for this drive!
  const departmentOptions = useMemo(() => {
    if (eligibilityData?.departmentBreakdown && eligibilityData.departmentBreakdown.length > 0) {
      return eligibilityData.departmentBreakdown
        .map((d) => ({ code: d.departmentCode, name: d.departmentName }))
        .sort((a, b) => a.code.localeCompare(b.code));
    }
    const map = new Map<string, string>();
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
  }, [eligibilityData]);

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

  // Dynamically compute batch year options for filter
  const batchFilterOptions = useMemo(() => {
    const set = new Set<number>();
    if (eligibilityData?.students) {
      for (const s of eligibilityData.students) {
        if (s.batchYear && !isNaN(s.batchYear) && s.batchYear > 0) {
          set.add(s.batchYear);
        }
      }
    }
    return Array.from(set).sort((a, b) => b - a);
  }, [eligibilityData]);

  // All eligible candidates for this drive
  const allEligibleStudents = useMemo(() => {
    if (!eligibilityData?.students) return [];
    return eligibilityData.students.filter(
      (s) => s.category === 'ELIGIBLE' || s.isEligible === true
    );
  }, [eligibilityData]);

  // Candidates filtered by search, department & batch
  const matchingEligibleStudents = useMemo(() => {
    if (!eligibilityData?.students) return [];
    let list = eligibilityData.students.filter(
      (s) => s.category === 'ELIGIBLE' || s.isEligible === true
    );

    if (selectedDeptFilter !== 'ALL') {
      const lower = selectedDeptFilter.toLowerCase().trim();
      list = list.filter(
        (s) =>
          (s.department && s.department.toLowerCase().includes(lower)) ||
          s.departmentId === selectedDeptFilter ||
          ((s as any).departmentCode && String((s as any).departmentCode).toLowerCase() === lower)
      );
    }

    if (selectedBatchFilter !== 'ALL') {
      const bNum = Number(selectedBatchFilter);
      list = list.filter((s) => s.batchYear === bNum);
    }

    if (searchTerm.trim()) {
      const lower = searchTerm.toLowerCase().trim();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(lower) ||
          s.registerNumber.toLowerCase().includes(lower) ||
          s.collegeEmail.toLowerCase().includes(lower)
      );
    }

    return list;
  }, [eligibilityData, selectedDeptFilter, selectedBatchFilter, searchTerm]);

  // Target candidates for "Select All Eligible" button
  const eligibleTargetStudents = useMemo(() => {
    if (selectedDeptFilter !== 'ALL' || selectedBatchFilter !== 'ALL' || searchTerm.trim()) {
      return matchingEligibleStudents;
    }
    return allEligibleStudents;
  }, [selectedDeptFilter, selectedBatchFilter, searchTerm, matchingEligibleStudents, allEligibleStudents]);

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
      const lower = selectedDeptFilter.toLowerCase().trim();
      list = list.filter(
        (s) =>
          (s.department && s.department.toLowerCase().includes(lower)) ||
          s.departmentId === selectedDeptFilter ||
          ((s as any).departmentCode && String((s as any).departmentCode).toLowerCase() === lower)
      );
    }

    if (selectedBatchFilter !== 'ALL') {
      const bNum = Number(selectedBatchFilter);
      list = list.filter((s) => s.batchYear === bNum);
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
  }, [eligibilityData, categoryFilter, selectedDeptFilter, selectedBatchFilter, searchTerm]);

  // Reset pagination page when filters change
  useEffect(() => {
    setPage(0);
  }, [categoryFilter, selectedDeptFilter, selectedBatchFilter, searchTerm]);

  // Paginated students displayed in the table
  const paginatedStudents = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredStudents.slice(start, start + rowsPerPage);
  }, [filteredStudents, page, rowsPerPage]);

  // Keep selectedStudentIds synchronized: ensure only currently existing candidates remain selected
  useEffect(() => {
    if (eligibilityData?.students && selectedStudentIds.length > 0) {
      const allStudentIdSet = new Set(
        eligibilityData.students.map((s) => s.studentId)
      );
      setSelectedStudentIds((prev) => {
        const next = prev.filter((id) => allStudentIdSet.has(id));
        return next.length === prev.length ? prev : next;
      });
    }
  }, [eligibilityData]);

  // Candidates selected for review in the workflow
  const selectedStudentsForReview = useMemo(() => {
    const all = eligibilityData?.students || [];
    return all.filter((s) => selectedStudentIds.includes(s.studentId));
  }, [eligibilityData, selectedStudentIds]);

  const handleOpenShortlistWorkflow = () => {
    if (selectedStudentIds.length === 0) return;
    setWorkflowStep(0);
    setWorkflowRegLink(drive?.registrationLink || '');
    setWorkflowInstructions(drive?.instructions || '');
    setWorkflowPackage(drive?.packageDetails || '');
    setWorkflowJobDescription(drive?.jobDescription || '');
    setWorkflowLocation(drive?.location || '');
    setWorkflowNotifyCandidates(true);
    setShortlistWorkflowOpen(true);
  };

  const shortlistMutation = useMutation({
    mutationFn: (data: {
      studentIds: string[];
      registrationLink?: string;
      instructions?: string;
      packageDetails?: string;
      jobDescription?: string;
      location?: string;
      notifyCandidates?: boolean;
    }) => placementStudentService.shortlistCandidates(id!, data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['placement-drive', id] });
      queryClient.invalidateQueries({ queryKey: ['placement-drive-eligibility', id] });
      queryClient.invalidateQueries({ queryKey: ['placement-drive-registrations', id] });
      queryClient.invalidateQueries({ queryKey: ['placement-drive-stats', id] });
      queryClient.invalidateQueries({ queryKey: ['placement-drive-audit-logs', id] });
      setSelectedStudentIds([]);
      setShortlistWorkflowOpen(false);
      setSnackbar({
        open: true,
        message: `Successfully shortlisted ${res.shortlistedCount} candidate(s) and published registration details to Student Portals!`,
        severity: 'success',
      });
    },
    onError: (err: any) => {
      setSnackbar({
        open: true,
        message: err?.response?.data?.message || err?.message || 'Failed to shortlist candidates',
        severity: 'error',
      });
    },
  });


  // Stage update mutation with real-time feedback
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
      setSnackbar({
        open: true,
        message: 'Candidate recruitment stage updated successfully.',
        severity: 'success',
      });
    },
    onError: (err: any) => {
      setSnackbar({
        open: true,
        message: err?.response?.data?.message || err?.message || 'Failed to update recruitment stage',
        severity: 'error',
      });
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

  // Candidate Selection & Management in Tracker
  const [selectedRegistrationIds, setSelectedRegistrationIds] = useState<string[]>([]);
  const [bulkStageDialogOpen, setBulkStageDialogOpen] = useState(false);
  const [bulkTargetStage, setBulkTargetStage] = useState<SelectionStage>('ASSESSMENT_SHORTLISTED');
  const [bulkStageRemarks, setBulkStageRemarks] = useState('');
  const [finalizeDialogOpen, setFinalizeDialogOpen] = useState(false);
  const [auditLogsDialogOpen, setAuditLogsDialogOpen] = useState(false);

  // Stats query
  const { data: driveStats } = useQuery({
    queryKey: ['placement-drive-stats', id],
    queryFn: () => placementStudentService.getDriveCandidateStats(id!),
    enabled: !!id,
  });

  // Audit logs query
  const { data: auditLogs = [] } = useQuery({
    queryKey: ['placement-drive-audit-logs', id],
    queryFn: () => placementStudentService.getDriveAuditLogs(id!),
    enabled: !!id,
  });

  // Bulk stage update mutation
  const bulkStageMutation = useMutation({
    mutationFn: (data: { registrationIds: string[]; stage: string; remarks?: string }) =>
      placementStudentService.bulkUpdateCandidateStage(id!, data.registrationIds, data.stage, data.remarks),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['placement-drive-registrations', id] });
      queryClient.invalidateQueries({ queryKey: ['placement-drive-eligibility', id] });
      queryClient.invalidateQueries({ queryKey: ['placement-drive-stats', id] });
      queryClient.invalidateQueries({ queryKey: ['placement-drive-audit-logs', id] });
      setSelectedRegistrationIds([]);
      setBulkStageDialogOpen(false);
      setBulkStageRemarks('');
      setSnackbar({
        open: true,
        message: `Updated ${res.updatedCount} candidates to stage ${bulkTargetStage}`,
        severity: 'success',
      });
    },
    onError: (err: any) => {
      setSnackbar({
        open: true,
        message: err?.response?.data?.message || err?.message || 'Failed to update candidates in bulk',
        severity: 'error',
      });
    },
  });

  // Finalize selections mutation (auto-reject unselected)
  const finalizeMutation = useMutation({
    mutationFn: () => placementStudentService.finalizeDriveSelections(id!),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['placement-drive', id] });
      queryClient.invalidateQueries({ queryKey: ['placement-drive-registrations', id] });
      queryClient.invalidateQueries({ queryKey: ['placement-drive-eligibility', id] });
      queryClient.invalidateQueries({ queryKey: ['placement-drive-stats', id] });
      queryClient.invalidateQueries({ queryKey: ['placement-drive-audit-logs', id] });
      setFinalizeDialogOpen(false);
      setSnackbar({
        open: true,
        message: `Selections finalized! ${res.selectedCount} selected, ${res.rejectedCount} unselected candidate(s) marked as Rejected.`,
        severity: 'success',
      });
    },
    onError: (err: any) => {
      setSnackbar({
        open: true,
        message: err?.response?.data?.message || err?.message || 'Failed to finalize selections',
        severity: 'error',
      });
    },
  });

  // Notify eligible students mutation
  const notifyEligibleMutation = useMutation({
    mutationFn: () => placementStudentService.notifyEligibleStudents(id!),
    onSuccess: (res) => {
      setSnackbar({
        open: true,
        message: `Notifications successfully sent to ${res.notifiedCount} eligible student(s)!`,
        severity: 'success',
      });
    },
    onError: (err: any) => {
      setSnackbar({
        open: true,
        message: err?.response?.data?.message || err?.message || 'Failed to notify candidates',
        severity: 'error',
      });
    },
  });

  // ===========================================================================
  // TAB 3: DEDICATED SELECTED CANDIDATES MANAGEMENT STATE & MUTATIONS
  // ===========================================================================
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>([]);
  const [selectionSearch, setSelectionSearch] = useState<string>('');
  const [selectionStatusFilter, setSelectionStatusFilter] = useState<'ALL' | 'SELECTED' | 'NOT_SELECTED' | 'PENDING'>('ALL');
  const [selectionDeptFilter, setSelectionDeptFilter] = useState<string>('ALL');
  const [selectionPage, setSelectionPage] = useState<number>(0);
  const [selectionRowsPerPage, setSelectionRowsPerPage] = useState<number>(25);

  const [selectionRemarksModalOpen, setSelectionRemarksModalOpen] = useState<boolean>(false);
  const [pendingSelectionAction, setPendingSelectionAction] = useState<{
    registrationIds: string[];
    status: 'SELECTED' | 'NOT_SELECTED' | 'RESET';
    studentName?: string;
  } | null>(null);
  const [selectionRemarks, setSelectionRemarks] = useState<string>('');
  const [selectionNotifyStudents, setSelectionNotifyStudents] = useState<boolean>(true);

  // Query Tab 3: Selected Candidates Overview
  const {
    data: selectionOverview,
    isLoading: isSelectionLoading,
    refetch: refetchSelection,
  } = useQuery({
    queryKey: ['placement-drive-selection', id],
    queryFn: () => placementDriveService.getSelectionOverview(id!),
    enabled: !!id,
  });

  // Mutation to mark candidate selection
  const markSelectionMutation = useMutation({
    mutationFn: (data: {
      registrationIds: string[];
      status: 'SELECTED' | 'NOT_SELECTED' | 'RESET';
      remarks?: string;
      notifyStudents?: boolean;
    }) => placementDriveService.markCandidatesSelection(id!, data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['placement-drive-selection', id] });
      queryClient.invalidateQueries({ queryKey: ['placement-drive-registrations', id] });
      queryClient.invalidateQueries({ queryKey: ['placement-drive-eligibility', id] });
      queryClient.invalidateQueries({ queryKey: ['placement-drive-stats', id] });
      queryClient.invalidateQueries({ queryKey: ['placement-drive', id] });
      setSelectedCandidateIds([]);
      setSelectionRemarksModalOpen(false);
      setSelectionRemarks('');
      setPendingSelectionAction(null);
      setSnackbar({
        open: true,
        message: `Successfully marked ${res.updatedCount} candidate(s) as ${
          res.status === 'SELECTED' ? 'Selected' : res.status === 'NOT_SELECTED' ? 'Not Selected' : 'Reset to Shortlisted'
        }!`,
        severity: 'success',
      });
    },
    onError: (err: any) => {
      setSnackbar({
        open: true,
        message: err?.response?.data?.message || err?.message || 'Failed to update candidate selection status',
        severity: 'error',
      });
    },
  });

  const handleOpenSingleSelectionModal = (
    registrationId: string,
    status: 'SELECTED' | 'NOT_SELECTED' | 'RESET',
    studentName: string
  ) => {
    setPendingSelectionAction({
      registrationIds: [registrationId],
      status,
      studentName,
    });
    setSelectionRemarks(
      status === 'SELECTED'
        ? `Candidate selected after final rounds for ${drive?.companyName || 'placement drive'}`
        : status === 'NOT_SELECTED'
        ? `Candidate not selected in final evaluation`
        : `Candidate selection status reset to Shortlisted`
    );
    setSelectionNotifyStudents(true);
    setSelectionRemarksModalOpen(true);
  };

  const handleOpenBulkSelectionModal = (status: 'SELECTED' | 'NOT_SELECTED' | 'RESET') => {
    if (selectedCandidateIds.length === 0) return;
    setPendingSelectionAction({
      registrationIds: selectedCandidateIds,
      status,
    });
    setSelectionRemarks(
      status === 'SELECTED'
        ? `Bulk candidates marked as Selected for ${drive?.companyName || 'placement drive'}`
        : status === 'NOT_SELECTED'
        ? `Bulk candidates marked as Not Selected`
        : `Candidate selection status reset to Shortlisted`
    );
    setSelectionNotifyStudents(true);
    setSelectionRemarksModalOpen(true);
  };

  const handleConfirmSelectionAction = () => {
    if (!pendingSelectionAction) return;
    markSelectionMutation.mutate({
      registrationIds: pendingSelectionAction.registrationIds,
      status: pendingSelectionAction.status,
      remarks: selectionRemarks,
      notifyStudents: selectionNotifyStudents,
    });
  };

  // Tab 3 Filtered Candidates
  const filteredSelectedCandidates = useMemo(() => {
    const list = selectionOverview?.candidates || [];
    return list.filter((c) => {
      if (selectionStatusFilter !== 'ALL' && c.selectionStatus !== selectionStatusFilter) {
        return false;
      }
      if (selectionDeptFilter !== 'ALL') {
        const matchesDept =
          c.departmentCode === selectionDeptFilter ||
          c.departmentName === selectionDeptFilter ||
          c.departmentId === selectionDeptFilter;
        if (!matchesDept) return false;
      }
      if (selectionSearch.trim()) {
        const term = selectionSearch.toLowerCase().trim();
        const matchesName = c.name?.toLowerCase().includes(term);
        const matchesReg = c.registerNumber?.toLowerCase().includes(term);
        const matchesEmail = c.collegeEmail?.toLowerCase().includes(term);
        if (!matchesName && !matchesReg && !matchesEmail) return false;
      }
      return true;
    });
  }, [selectionOverview, selectionStatusFilter, selectionDeptFilter, selectionSearch]);

  const selectionAvailableDepartments = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of selectionOverview?.candidates || []) {
      if (c.departmentCode) {
        map.set(c.departmentCode, c.departmentName || c.departmentCode);
      }
    }
    return Array.from(map.entries()).map(([code, name]) => ({ code, name }));
  }, [selectionOverview]);

  const paginatedSelectedCandidates = useMemo(() => {
    const start = selectionPage * selectionRowsPerPage;
    return filteredSelectedCandidates.slice(start, start + selectionRowsPerPage);
  }, [filteredSelectedCandidates, selectionPage, selectionRowsPerPage]);

  useEffect(() => {
    setSelectionPage(0);
  }, [selectionStatusFilter, selectionDeptFilter, selectionSearch]);

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
    setActiveReasons({
      candidateName: student.name,
      registerNumber: student.registerNumber,
      category: student.category,
      missingDetails: student.missingDetails || [],
      failureReasons: student.failureReasons || [],
    });
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

  // Individual row selection toggle: allows selecting any candidate
  const handleToggleSelect = (studentId: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  };

  // Table header master checkbox toggle: selects/deselects all candidates currently in view
  const handleToggleHeaderSelect = () => {
    if (paginatedStudents.length === 0) return;
    const currentTableIds = paginatedStudents.map((s) => s.studentId);
    const areAllInTableSelected = currentTableIds.every((id) => selectedStudentIds.includes(id));

    if (areAllInTableSelected) {
      // Deselect candidates shown in this table
      setSelectedStudentIds((prev) => prev.filter((id) => !currentTableIds.includes(id)));
    } else {
      // Select all candidates shown in this table
      setSelectedStudentIds((prev) => Array.from(new Set([...prev, ...currentTableIds])));
    }
  };

  const handleClearSelection = () => {
    setSelectedStudentIds([]);
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
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
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
          <Tab
            icon={<EmojiEventsIcon sx={{ fontSize: 18 }} />}
            iconPosition="start"
            label={`Selected Students (${selectionOverview?.selectedCount ?? 0} Selected)`}
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
          {/* Overall College Statistics & Drive Department Scope Banner */}
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              mb: 3,
              borderRadius: 3,
              border: '1px solid #e2e8f0',
              bgcolor: '#ffffff',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: { xs: 'flex-start', sm: 'center' },
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 2,
                mb: 2,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 2,
                    bgcolor: '#0284c715',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#0284c7',
                  }}
                >
                  <SchoolIcon sx={{ fontSize: 24 }} />
                </Box>
                <Box>
                  <Typography variant="subtitle1" fontWeight={800} sx={{ color: '#0f172a' }}>
                    College Academic Scope & Drive Eligibility
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#64748b' }}>
                    Department-filtered eligibility analysis. Candidates from unselected departments are excluded from evaluation.
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
                <Box
                  sx={{
                    px: 2,
                    py: 1,
                    borderRadius: 2,
                    bgcolor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    textAlign: 'center',
                  }}
                >
                  <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, display: 'block' }}>
                    COLLEGE STUDENTS
                  </Typography>
                  <Typography variant="h6" fontWeight={800} sx={{ color: '#0f172a' }}>
                    {eligibilityData?.collegeTotalStudents ?? 0}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    px: 2,
                    py: 1,
                    borderRadius: 2,
                    bgcolor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    textAlign: 'center',
                  }}
                >
                  <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, display: 'block' }}>
                    COLLEGE DEPTS
                  </Typography>
                  <Typography variant="h6" fontWeight={800} sx={{ color: '#0f172a' }}>
                    {eligibilityData?.collegeDepartmentsCount ?? 0}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    px: 2,
                    py: 1,
                    borderRadius: 2,
                    bgcolor: '#f0f9ff',
                    border: '1px solid #bae6fd',
                    textAlign: 'center',
                  }}
                >
                  <Typography variant="caption" sx={{ color: '#0369a1', fontWeight: 700, display: 'block' }}>
                    SELECTED DEPTS POOL
                  </Typography>
                  <Typography variant="h6" fontWeight={800} sx={{ color: '#0284c7' }}>
                    {eligibilityData?.selectedDeptTotalStudents ?? 0}
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* Department chips list */}
            <Box sx={{ pt: 1.5, borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Typography variant="caption" fontWeight={700} sx={{ color: '#475569' }}>
                Selected Drive Departments:
              </Typography>
              {eligibilityData?.selectedDepartments && eligibilityData.selectedDepartments.length > 0 ? (
                eligibilityData.selectedDepartments.map((deptName, idx) => (
                  <Chip
                    key={idx}
                    size="small"
                    label={deptName}
                    sx={{
                      bgcolor: '#e0f2fe',
                      color: '#0369a1',
                      fontWeight: 700,
                      fontSize: '0.72rem',
                    }}
                  />
                ))
              ) : (
                <Chip size="small" label="All College Departments Eligible" sx={{ bgcolor: '#f1f5f9', color: '#475569', fontWeight: 700 }} />
              )}
            </Box>
          </Paper>

          {/* Selected Departments Eligibility Metric Counters */}
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
                  Selected departments meeting criteria
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
                  Below threshold or criteria unmet
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
                  Shortlisted & Applied
                </Typography>
                <Typography variant="h4" fontWeight={800} sx={{ color: '#0284c7', mt: 0.5 }}>
                  {eligibilityData?.shortlistedCount ?? 0}
                  <Typography component="span" variant="body1" sx={{ color: '#4338ca', ml: 1, fontWeight: 700 }}>
                    / {eligibilityData?.appliedCount ?? 0} Applied
                  </Typography>
                </Typography>
                <Typography variant="caption" sx={{ color: '#0284c7' }}>
                  Total enrolled in drive: {eligibilityData?.registeredCount ?? 0}
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          {/* Department-Wise Statistics Breakdown Accordion */}
          {eligibilityData?.departmentBreakdown && eligibilityData.departmentBreakdown.length > 0 && (
            <Accordion
              elevation={0}
              defaultExpanded={false}
              sx={{
                mb: 3,
                border: '1px solid #e2e8f0',
                borderRadius: '12px !important',
                '&:before': { display: 'none' },
                bgcolor: '#ffffff',
              }}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: '#64748b' }} />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                  <Typography variant="subtitle2" fontWeight={800} sx={{ color: '#0f172a' }}>
                    Department-Wise Breakdown ({eligibilityData.departmentBreakdown.length} Selected Departments)
                  </Typography>
                  <Chip
                    size="small"
                    label={`${eligibilityData.selectedDeptTotalStudents} Students in Pool`}
                    sx={{ bgcolor: '#f1f5f9', color: '#475569', fontWeight: 600, fontSize: '0.72rem' }}
                  />
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 0, pb: 2.5 }}>
                <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #f1f5f9', borderRadius: 2, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: '#f8fafc' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem', color: '#475569' }}>DEPARTMENT</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem', color: '#475569' }}>TOTAL STUDENTS</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem', color: '#475569' }}>ELIGIBLE</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem', color: '#475569' }}>NOT ELIGIBLE</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem', color: '#475569' }}>MISSING INFO</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem', color: '#475569' }}>SHORTLISTED</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem', color: '#475569' }}>APPLIED</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem', color: '#475569' }} align="right">FILTER</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {eligibilityData.departmentBreakdown.map((dept) => (
                        <TableRow key={dept.departmentId} hover>
                          <TableCell>
                            <Typography variant="body2" fontWeight={700} sx={{ color: '#0f172a' }}>
                              {dept.departmentName}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#64748b' }}>
                              Code: {dept.departmentCode}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight={700}>
                              {dept.totalStudents}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={dept.eligibleCount}
                              sx={{ bgcolor: '#dcfce7', color: '#15803d', fontWeight: 800, minWidth: 32 }}
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={dept.notEligibleCount}
                              sx={{ bgcolor: '#fee2e2', color: '#b91c1c', fontWeight: 800, minWidth: 32 }}
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={dept.missingDataCount}
                              sx={{ bgcolor: '#ffedd5', color: '#c2410c', fontWeight: 800, minWidth: 32 }}
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={dept.shortlistedCount}
                              sx={{ bgcolor: '#fef3c7', color: '#b45309', fontWeight: 800, minWidth: 32 }}
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={dept.appliedCount}
                              sx={{ bgcolor: '#e0e7ff', color: '#4338ca', fontWeight: 800, minWidth: 32 }}
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Button
                              size="small"
                              variant={selectedDeptFilter === dept.departmentCode ? 'contained' : 'outlined'}
                              onClick={() => setSelectedDeptFilter(dept.departmentCode)}
                              sx={{
                                textTransform: 'none',
                                fontSize: '0.72rem',
                                borderRadius: 1.5,
                                py: 0.25,
                                px: 1.5,
                              }}
                            >
                              {selectedDeptFilter === dept.departmentCode ? 'Active Filter' : 'Filter Candidates'}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </AccordionDetails>
            </Accordion>
          )}

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
                select
                size="small"
                label="Graduation Batch"
                value={selectedBatchFilter}
                onChange={(e) => setSelectedBatchFilter(e.target.value)}
                sx={{ minWidth: 150 }}
              >
                <MenuItem value="ALL">All Batches</MenuItem>
                {batchFilterOptions.map((batch) => (
                  <MenuItem key={batch} value={String(batch)}>
                    Class of {batch}
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
              <Button
                size="small"
                variant="outlined"
                onClick={handleToggleHeaderSelect}
                disabled={paginatedStudents.length === 0}
                sx={{
                  textTransform: 'none',
                  borderRadius: 1.5,
                  fontWeight: 600,
                  color: '#475569',
                  borderColor: '#cbd5e1',
                }}
              >
                {paginatedStudents.length > 0 && paginatedStudents.every((s) => selectedStudentIds.includes(s.studentId))
                  ? 'Deselect Page'
                  : `Select All on Page (${paginatedStudents.length})`}
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

            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
              <Button
                variant="outlined"
                size="small"
                color="primary"
                startIcon={notifyEligibleMutation.isPending ? <CircularProgress size={16} /> : <NotificationsActiveIcon />}
                disabled={notifyEligibleMutation.isPending || (eligibilityData?.eligibleCount ?? 0) === 0}
                onClick={() => notifyEligibleMutation.mutate()}
                sx={{ textTransform: 'none', borderRadius: 1.5, fontWeight: 700 }}
              >
                {notifyEligibleMutation.isPending ? 'Sending...' : 'Notify Eligible Students'}
              </Button>

              <Button
                variant="contained"
                size="small"
                startIcon={<FactCheckIcon />}
                disabled={selectedStudentIds.length === 0}
                onClick={handleOpenShortlistWorkflow}
                sx={{
                  bgcolor: '#0284c7',
                  '&:hover': { bgcolor: '#0369a1' },
                  textTransform: 'none',
                  fontWeight: 700,
                  borderRadius: 1.5,
                  px: 2,
                }}
              >
                Review & Shortlist Selected ({selectedStudentIds.length})
              </Button>
            </Box>
          </Box>

          {/* Candidates Evaluation Table */}
          {isEligibilityLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress size={36} />
            </Box>
          ) : (
            <Paper elevation={0} sx={{ border: '1px solid #DCE6F5', borderRadius: 2.5, overflow: 'hidden' }}>
              {isMobile ? (
                <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5, bgcolor: '#F8FAFC' }}>
                  {paginatedStudents.length === 0 ? (
                    <Box sx={{ py: 6, textAlign: 'center' }}>
                      <Typography variant="body2" color="text.secondary">
                        No candidates match the specified department and category filters.
                      </Typography>
                    </Box>
                  ) : (
                    paginatedStudents.map((student) => {
                      const isSelected = selectedStudentIds.includes(student.studentId);

                      return (
                        <Card
                          key={student.studentId}
                          variant="outlined"
                          onClick={() => handleToggleSelect(student.studentId)}
                          sx={{
                            p: 2,
                            borderRadius: 2,
                            borderColor: isSelected ? '#0284c7' : '#E2E8F0',
                            bgcolor: isSelected ? '#F0F9FF' : '#FFFFFF',
                            boxShadow: isSelected ? '0 0 0 1px #0284c7' : '0 1px 3px rgba(0,0,0,0.03)',
                            cursor: 'pointer',
                          }}
                        >
                          {/* Card Header: Checkbox + Name + Status Chip */}
                          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1, mb: 1.25 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                              <Checkbox
                                size="small"
                                checked={isSelected}
                                onChange={() => handleToggleSelect(student.studentId)}
                                onClick={(e) => e.stopPropagation()}
                                sx={{ p: 0.5 }}
                              />
                              <Box sx={{ minWidth: 0 }}>
                                <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#0F172A', lineHeight: 1.2 }}>
                                  {student.name}
                                </Typography>
                                <Typography variant="caption" sx={{ color: '#64748B', display: 'block' }}>
                                  {student.registerNumber}
                                </Typography>
                              </Box>
                            </Box>

                            <Box sx={{ flexShrink: 0 }}>
                              {student.category === 'ELIGIBLE' ? (
                                <Chip
                                  size="small"
                                  icon={<CheckCircleIcon sx={{ fontSize: '14px !important' }} />}
                                  label="Eligible"
                                  sx={{
                                    bgcolor: '#dcfce7',
                                    color: '#15803d',
                                    fontWeight: 800,
                                    fontSize: '0.72rem',
                                    border: '1px solid #bbf7d0',
                                  }}
                                />
                              ) : student.category === 'MISSING_DATA' ? (
                                <Chip
                                  size="small"
                                  icon={<WarningAmberIcon sx={{ fontSize: '14px !important' }} />}
                                  label="Missing Info"
                                  onClick={(e) => handleOpenPopover(e, student)}
                                  sx={{
                                    bgcolor: '#fff7ed',
                                    color: '#c2410c',
                                    fontWeight: 800,
                                    fontSize: '0.72rem',
                                    border: '1px solid #fed7aa',
                                    cursor: 'pointer',
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
                                    fontSize: '0.72rem',
                                    border: '1px solid #fca5a5',
                                    cursor: 'pointer',
                                  }}
                                />
                              )}
                            </Box>
                          </Box>

                          <Divider sx={{ my: 1, borderColor: '#F1F5F9' }} />

                          {/* Details Grid */}
                          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.25, fontSize: '0.82rem' }}>
                            <Box>
                              <Typography variant="caption" sx={{ color: '#64748B', fontSize: '0.67rem', fontWeight: 600, display: 'block' }}>
                                DEPARTMENT
                              </Typography>
                              <Typography variant="body2" sx={{ fontWeight: 600, color: '#334155' }}>
                                {student.department || '—'} ({student.batchYear || '—'})
                              </Typography>
                            </Box>
                            <Box>
                              <Typography variant="caption" sx={{ color: '#64748B', fontSize: '0.67rem', fontWeight: 600, display: 'block' }}>
                                CGPA & BACKLOGS
                              </Typography>
                              <Typography variant="body2" sx={{ fontWeight: 700, color: '#0F172A' }}>
                                {student.cgpa != null ? Number(student.cgpa).toFixed(2) : 'N/A'} CGPA
                                <Box component="span" sx={{ color: student.activeBacklogs > 0 ? '#DC2626' : '#16A34A', ml: 0.5, fontWeight: 600 }}>
                                  ({student.activeBacklogs} backlogs)
                                </Box>
                              </Typography>
                            </Box>
                            <Box>
                              <Typography variant="caption" sx={{ color: '#64748B', fontSize: '0.67rem', fontWeight: 600, display: 'block' }}>
                                10TH / 12TH MARKS
                              </Typography>
                              <Typography variant="body2" sx={{ color: '#334155' }}>
                                10th: {student.tenthPercentage != null ? `${student.tenthPercentage}%` : 'N/A'} | 12th: {student.twelfthPercentage != null ? `${student.twelfthPercentage}%` : 'N/A'}
                              </Typography>
                            </Box>
                            <Box>
                              <Typography variant="caption" sx={{ color: '#64748B', fontSize: '0.67rem', fontWeight: 600, display: 'block' }}>
                                SELECTION STATUS
                              </Typography>
                              {student.isRegistered ? (
                                <Chip size="small" label="Shortlisted" sx={{ height: 20, fontSize: '0.66rem', bgcolor: '#e0f2fe', color: '#0369a1', fontWeight: 700 }} />
                              ) : (
                                <Typography variant="caption" sx={{ color: '#64748B' }}>Not Shortlisted</Typography>
                              )}
                            </Box>
                          </Box>
                        </Card>
                      );
                    })
                  )}
                </Box>
              ) : (
              <TableContainer sx={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: '#f8fafc' }}>
                  <TableRow>
                    <TableCell
                      padding="checkbox"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Checkbox
                        size="small"
                        indeterminate={
                          paginatedStudents.length > 0 &&
                          paginatedStudents.some((s) => selectedStudentIds.includes(s.studentId)) &&
                          !paginatedStudents.every((s) => selectedStudentIds.includes(s.studentId))
                        }
                        checked={
                          paginatedStudents.length > 0 &&
                          paginatedStudents.every((s) => selectedStudentIds.includes(s.studentId))
                        }
                        disabled={paginatedStudents.length === 0}
                        onChange={handleToggleHeaderSelect}
                        inputProps={{
                          'aria-label': 'Select or deselect all candidates in view',
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '0.75rem' }}>CANDIDATE</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '0.75rem' }}>DEPT & BATCH</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '0.75rem' }}>10TH / 12TH %</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '0.75rem' }}>CURRENT CGPA</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '0.75rem' }}>SKILLS & PROFICIENCY</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '0.75rem' }}>ELIGIBILITY STATUS</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '0.75rem' }} align="right">RECRUITMENT STATUS</TableCell>
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
                          onClick={() => handleToggleSelect(student.studentId)}
                          sx={{
                            bgcolor: isSelected ? '#f0f9ff' : student.isRegistered ? '#fafafa' : '#ffffff',
                            cursor: 'pointer',
                          }}
                        >
                          <TableCell
                            padding="checkbox"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Checkbox
                              checked={isSelected}
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
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenPopover(e, student);
                                }}
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
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenPopover(e, student);
                                }}
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

                          {/* Recruitment Status */}
                          <TableCell align="right">
                            {student.isShortlisted || student.currentStage === 'SHORTLISTED' ? (
                              <Chip
                                size="small"
                                icon={<StarIcon sx={{ fontSize: '13px !important', color: '#b45309 !important' }} />}
                                label="Shortlisted"
                                sx={{
                                  bgcolor: '#fef3c7',
                                  color: '#b45309',
                                  fontWeight: 700,
                                  fontSize: '0.7rem',
                                  border: '1px solid #fde68a',
                                }}
                              />
                            ) : student.isApplied || student.currentStage === 'APPLIED' ? (
                              <Chip
                                size="small"
                                icon={<CheckCircleIcon sx={{ fontSize: '13px !important', color: '#4338ca !important' }} />}
                                label="Applied via Portal"
                                sx={{
                                  bgcolor: '#e0e7ff',
                                  color: '#4338ca',
                                  fontWeight: 700,
                                  fontSize: '0.7rem',
                                  border: '1px solid #c7d2fe',
                                }}
                              />
                            ) : student.isRegistered ? (
                              <Chip
                                size="small"
                                label={student.currentStage || 'Registered'}
                                sx={{
                                  bgcolor: '#e0f2fe',
                                  color: '#0369a1',
                                  fontWeight: 700,
                                  fontSize: '0.7rem',
                                  border: '1px solid #bae6fd',
                                }}
                              />
                            ) : (
                              <Chip
                                size="small"
                                label="Not Shortlisted"
                                sx={{
                                  bgcolor: '#f1f5f9',
                                  color: '#64748b',
                                  fontWeight: 600,
                                  fontSize: '0.7rem',
                                  border: '1px solid #e2e8f0',
                                }}
                              />
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
            transformOrigin={{ vertical: 'top', horizontal: 'left' }}
            PaperProps={{
              sx: { p: 2.5, maxWidth: 380, borderRadius: 2.5, boxShadow: '0 10px 28px rgba(0,0,0,0.12)' },
            }}
          >
            <Box>
              <Typography variant="subtitle2" fontWeight={800} sx={{ color: '#0f172a' }}>
                {activeReasons?.candidateName}
              </Typography>
              <Typography variant="caption" sx={{ color: '#0284c7', fontFamily: 'monospace', display: 'block', mb: 1 }}>
                Register No: {activeReasons?.registerNumber}
              </Typography>
              <Chip
                size="small"
                label={
                  activeReasons?.category === 'MISSING_DATA'
                    ? 'Missing Academic Information'
                    : 'Not Eligible for Drive'
                }
                color={activeReasons?.category === 'MISSING_DATA' ? 'warning' : 'error'}
                sx={{ fontWeight: 800, fontSize: '0.72rem', mb: 1.5 }}
              />

              <Divider sx={{ mb: 1.5 }} />

              {/* Missing Details section */}
              {(activeReasons?.missingDetails || []).length > 0 && (
                <Box sx={{ mb: (activeReasons?.failureReasons || []).length > 0 ? 2 : 0 }}>
                  <Typography variant="caption" fontWeight={800} color="#c2410c" sx={{ display: 'block', mb: 0.8, textTransform: 'uppercase' }}>
                    Missing Academic Information:
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                    {activeReasons?.missingDetails.map((item, idx) => (
                      <Box key={idx} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                        <WarningAmberIcon sx={{ color: '#ea580c', fontSize: 16, mt: 0.2, flexShrink: 0 }} />
                        <Typography variant="caption" sx={{ color: '#334155', lineHeight: 1.4 }}>
                          {item}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}

              {/* Failure Reasons section */}
              {(activeReasons?.failureReasons || []).length > 0 && (
                <Box>
                  <Typography variant="caption" fontWeight={800} color="#b91c1c" sx={{ display: 'block', mb: 0.8, textTransform: 'uppercase' }}>
                    Drive Criteria Not Met:
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                    {activeReasons?.failureReasons.map((item, idx) => (
                      <Box key={idx} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                        <CancelIcon sx={{ color: '#dc2626', fontSize: 16, mt: 0.2, flexShrink: 0 }} />
                        <Typography variant="caption" sx={{ color: '#334155', lineHeight: 1.4 }}>
                          {item}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}
            </Box>
          </Popover>
        </Box>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: RECRUITMENT STAGE TRACKER & SELECTION HISTORY                  */}
      {/* ===================================================================== */}
      {activeTab === 2 && (
        <Box>
          {/* Real-Time Candidate Statistics Banner */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} sm={4} md={1.7}>
              <Paper elevation={0} sx={{ p: 2, borderRadius: 2.5, border: '1px solid #BBF7D0', bgcolor: '#F0FDF4' }}>
                <Typography variant="caption" fontWeight={700} sx={{ color: '#166534', textTransform: 'uppercase' }}>
                  Eligible
                </Typography>
                <Typography variant="h5" fontWeight={800} sx={{ color: '#15803D', mt: 0.5 }}>
                  {eligibilityData?.eligibleCount ?? driveStats?.totalEligible ?? 0}
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={6} sm={4} md={1.7}>
              <Paper elevation={0} sx={{ p: 2, borderRadius: 2.5, border: '1px solid #BAE6FD', bgcolor: '#F0F9FF' }}>
                <Typography variant="caption" fontWeight={700} sx={{ color: '#0369A1', textTransform: 'uppercase' }}>
                  Total Pipeline
                </Typography>
                <Typography variant="h5" fontWeight={800} sx={{ color: '#0284C7', mt: 0.5 }}>
                  {registrations.length}
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={6} sm={4} md={1.7}>
              <Paper elevation={0} sx={{ p: 2, borderRadius: 2.5, border: '1px solid #FEF08A', bgcolor: '#FEFCE8' }}>
                <Typography variant="caption" fontWeight={700} sx={{ color: '#A16207', textTransform: 'uppercase' }}>
                  Shortlisted
                </Typography>
                <Typography variant="h5" fontWeight={800} sx={{ color: '#CA8A04', mt: 0.5 }}>
                  {registrations.filter((r) => r.currentStage === 'SHORTLISTED').length}
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={6} sm={4} md={1.7}>
              <Paper elevation={0} sx={{ p: 2, borderRadius: 2.5, border: '1px solid #C7D2FE', bgcolor: '#EEF2FF' }}>
                <Typography variant="caption" fontWeight={700} sx={{ color: '#4338CA', textTransform: 'uppercase' }}>
                  Applied / Confirmed
                </Typography>
                <Typography variant="h5" fontWeight={800} sx={{ color: '#4F46E5', mt: 0.5 }}>
                  {registrations.filter((r) => r.currentStage === 'APPLIED').length}
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={6} sm={4} md={1.7}>
              <Paper elevation={0} sx={{ p: 2, borderRadius: 2.5, border: '1px solid #DDD6FE', bgcolor: '#F5F3FF' }}>
                <Typography variant="caption" fontWeight={700} sx={{ color: '#6D28D9', textTransform: 'uppercase' }}>
                  Assessment
                </Typography>
                <Typography variant="h5" fontWeight={800} sx={{ color: '#7C3AED', mt: 0.5 }}>
                  {registrations.filter((r) => r.currentStage === 'ASSESSMENT_SHORTLISTED').length}
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={6} sm={4} md={1.7}>
              <Paper elevation={0} sx={{ p: 2, borderRadius: 2.5, border: '1px solid #FED7AA', bgcolor: '#FFF7ED' }}>
                <Typography variant="caption" fontWeight={700} sx={{ color: '#C2410C', textTransform: 'uppercase' }}>
                  Interviewing
                </Typography>
                <Typography variant="h5" fontWeight={800} sx={{ color: '#EA580C', mt: 0.5 }}>
                  {
                    registrations.filter(
                      (r) => r.currentStage === 'TECHNICAL_ROUND' || r.currentStage === 'HR_ROUND'
                    ).length
                  }
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={6} sm={4} md={1.7}>
              <Paper elevation={0} sx={{ p: 2, borderRadius: 2.5, border: '1px solid #A7F3D0', bgcolor: '#ECFDF5' }}>
                <Typography variant="caption" fontWeight={700} sx={{ color: '#047857', textTransform: 'uppercase' }}>
                  Selected
                </Typography>
                <Typography variant="h5" fontWeight={800} sx={{ color: '#059669', mt: 0.5 }}>
                  {registrations.filter((r) => r.currentStage === 'SELECTED').length}
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={6} sm={4} md={1.8}>
              <Paper elevation={0} sx={{ p: 2, borderRadius: 2.5, border: '1px solid #FECACA', bgcolor: '#FEF2F2' }}>
                <Typography variant="caption" fontWeight={700} sx={{ color: '#B91C1C', textTransform: 'uppercase' }}>
                  Rejected
                </Typography>
                <Typography variant="h5" fontWeight={800} sx={{ color: '#DC2626', mt: 0.5 }}>
                  {registrations.filter((r) => r.currentStage === 'REJECTED').length}
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          {/* Action Toolbar & Filters */}
          <Card
            elevation={0}
            sx={{
              p: 2,
              mb: 3,
              borderRadius: 2.5,
              border: '1px solid #DCE6F5',
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              justifyContent: 'space-between',
              alignItems: { xs: 'stretch', md: 'center' },
              gap: 2,
            }}
          >
            {/* Filter by Stage Chips */}
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
              <Typography variant="caption" fontWeight={700} sx={{ color: '#475569', mr: 0.5 }}>
                Filter Stage:
              </Typography>
              <Chip
                size="small"
                label={`All (${registrations.length})`}
                clickable
                color={selectedStageFilter === 'ALL' ? 'primary' : 'default'}
                onClick={() => setSelectedStageFilter('ALL')}
              />
              {SELECTION_STAGES.map((st) => {
                const count = registrations.filter((r) => r.currentStage === st.value).length;
                return (
                  <Chip
                    key={st.value}
                    size="small"
                    label={`${st.label} (${count})`}
                    clickable
                    variant={selectedStageFilter === st.value ? 'filled' : 'outlined'}
                    color={selectedStageFilter === st.value ? 'primary' : 'default'}
                    onClick={() => setSelectedStageFilter(st.value)}
                  />
                );
              })}
            </Box>

            {/* Dedicated Action Controls */}
            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
              <Button
                size="small"
                variant="outlined"
                startIcon={<HistoryIcon />}
                onClick={() => setAuditLogsDialogOpen(true)}
                sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 700 }}
              >
                Audit Trail ({auditLogs.length})
              </Button>

              <Button
                size="small"
                variant="outlined"
                color="primary"
                startIcon={notifyEligibleMutation.isPending ? <CircularProgress size={16} /> : <NotificationsActiveIcon />}
                disabled={notifyEligibleMutation.isPending || (eligibilityData?.eligibleCount ?? 0) === 0}
                onClick={() => notifyEligibleMutation.mutate()}
                sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 700 }}
              >
                Notify Eligible
              </Button>

              <Button
                size="small"
                variant="contained"
                startIcon={<EmojiEventsIcon />}
                onClick={() => setActiveTab(3)}
                sx={{
                  bgcolor: '#059669',
                  '&:hover': { bgcolor: '#047857' },
                  textTransform: 'none',
                  borderRadius: 2,
                  fontWeight: 700,
                }}
              >
                Selected Students ({selectionOverview?.selectedCount ?? 0})
              </Button>

              <Button
                size="small"
                variant="contained"
                color="error"
                startIcon={<GavelIcon />}
                onClick={() => setFinalizeDialogOpen(true)}
                disabled={finalizeMutation.isPending || registrations.length === 0}
                sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 700, px: 2 }}
              >
                Finalize Selections
              </Button>
            </Box>
          </Card>

          {/* Bulk Selection Bar for Registered Candidates */}
          {selectedRegistrationIds.length > 0 && (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 2,
                p: 1.75,
                borderRadius: 2.5,
                bgcolor: '#eff6ff',
                border: '1px solid #bfdbfe',
                flexWrap: 'wrap',
                gap: 1.5,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Typography variant="body2" fontWeight={800} sx={{ color: '#1e40af' }}>
                  {selectedRegistrationIds.length} candidate(s) selected
                </Typography>
                <Button
                  size="small"
                  onClick={() => setSelectedRegistrationIds([])}
                  sx={{ textTransform: 'none', color: '#64748b', fontSize: '0.75rem' }}
                >
                  Clear Selection
                </Button>
              </Box>

              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Button
                  size="small"
                  variant="contained"
                  onClick={() => {
                    setBulkTargetStage('ASSESSMENT_SHORTLISTED');
                    setBulkStageDialogOpen(true);
                  }}
                  sx={{ bgcolor: '#7c3aed', textTransform: 'none', borderRadius: 1.5, fontSize: '0.75rem' }}
                >
                  Bulk Shortlist
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  onClick={() => {
                    setBulkTargetStage('TECHNICAL_ROUND');
                    setBulkStageDialogOpen(true);
                  }}
                  sx={{ bgcolor: '#d97706', textTransform: 'none', borderRadius: 1.5, fontSize: '0.75rem' }}
                >
                  Technical Round
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  onClick={() => {
                    setBulkTargetStage('HR_ROUND');
                    setBulkStageDialogOpen(true);
                  }}
                  sx={{ bgcolor: '#0284c7', textTransform: 'none', borderRadius: 1.5, fontSize: '0.75rem' }}
                >
                  HR Round
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  onClick={() => {
                    setBulkTargetStage('SELECTED');
                    setBulkStageDialogOpen(true);
                  }}
                  sx={{ bgcolor: '#15803d', textTransform: 'none', borderRadius: 1.5, fontSize: '0.75rem' }}
                >
                  Select / Offer
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  onClick={() => {
                    setBulkTargetStage('REJECTED');
                    setBulkStageDialogOpen(true);
                  }}
                  sx={{ bgcolor: '#dc2626', textTransform: 'none', borderRadius: 1.5, fontSize: '0.75rem' }}
                >
                  Bulk Reject
                </Button>
              </Box>
            </Box>
          )}

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
          ) : isMobile ? (
            <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5, bgcolor: '#F8FAFC' }}>
              {registrations
                .filter((r) => selectedStageFilter === 'ALL' || r.currentStage === selectedStageFilter)
                .map((reg) => {
                  const badge = getStageBadge(reg.currentStage);
                  const isSelected = selectedRegistrationIds.includes(reg.id);

                  return (
                    <Card
                      key={reg.id}
                      variant="outlined"
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        borderColor: isSelected ? '#0284c7' : '#E2E8F0',
                        bgcolor: isSelected ? '#F0F9FF' : '#FFFFFF',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.25 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Checkbox
                            size="small"
                            checked={isSelected}
                            onChange={() => {
                              setSelectedRegistrationIds((prev) =>
                                prev.includes(reg.id) ? prev.filter((i) => i !== reg.id) : [...prev, reg.id]
                              );
                            }}
                            sx={{ p: 0.5 }}
                          />
                          <Box>
                            <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#0F172A', lineHeight: 1.2 }}>
                              {reg.student?.name || 'Candidate'}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#0284c7', fontFamily: 'monospace' }}>
                              {reg.student?.registerNumber}
                            </Typography>
                          </Box>
                        </Box>

                        <Chip
                          size="small"
                          label={badge.label}
                          sx={{
                            bgcolor: badge.bg,
                            color: badge.color,
                            fontWeight: 800,
                            fontSize: '0.7rem',
                          }}
                        />
                      </Box>

                      <Divider sx={{ my: 1, borderColor: '#F1F5F9' }} />

                      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1, mb: 1.5 }}>
                        <Box>
                          <Typography variant="caption" sx={{ color: '#64748B', fontSize: '0.66rem', fontWeight: 600, display: 'block' }}>
                            DEPARTMENT & CGPA
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: '#334155' }}>
                            {reg.student?.department?.code || reg.student?.department?.name || '—'} (CGPA {reg.student?.cgpa != null ? Number(reg.student.cgpa).toFixed(2) : 'N/A'})
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" sx={{ color: '#64748B', fontSize: '0.66rem', fontWeight: 600, display: 'block' }}>
                            RECRUITMENT REMARKS
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#475569', fontSize: '0.78rem' }}>
                            {reg.stageRemarks || 'No notes added'}
                          </Typography>
                        </Box>
                      </Box>

                      <Button
                        size="small"
                        fullWidth
                        variant="outlined"
                        onClick={() => handleOpenStageUpdate(reg.id, reg.student?.name || 'Candidate', reg.currentStage, reg.stageRemarks)}
                        sx={{ textTransform: 'none', borderRadius: 1.5, fontWeight: 700, fontSize: '0.75rem', py: 0.75 }}
                      >
                        Update Stage Status
                      </Button>
                    </Card>
                  );
                })}
            </Box>
          ) : (
            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #DCE6F5', borderRadius: 2.5, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: '#f8fafc' }}>
                  <TableRow>
                    <TableCell padding="checkbox">
                      <Checkbox
                        size="small"
                        checked={
                          registrations.filter(
                            (r) => selectedStageFilter === 'ALL' || r.currentStage === selectedStageFilter
                          ).length > 0 &&
                          registrations
                            .filter((r) => selectedStageFilter === 'ALL' || r.currentStage === selectedStageFilter)
                            .every((r) => selectedRegistrationIds.includes(r.id))
                        }
                        indeterminate={
                          selectedRegistrationIds.length > 0 &&
                          !registrations
                            .filter((r) => selectedStageFilter === 'ALL' || r.currentStage === selectedStageFilter)
                            .every((r) => selectedRegistrationIds.includes(r.id))
                        }
                        onChange={() => {
                          const visible = registrations.filter(
                            (r) => selectedStageFilter === 'ALL' || r.currentStage === selectedStageFilter
                          );
                          const allSelected = visible.every((r) => selectedRegistrationIds.includes(r.id));
                          if (allSelected) {
                            setSelectedRegistrationIds((prev) =>
                              prev.filter((id) => !visible.some((v) => v.id === id))
                            );
                          } else {
                            const newIds = Array.from(
                              new Set([...selectedRegistrationIds, ...visible.map((v) => v.id)])
                            );
                            setSelectedRegistrationIds(newIds);
                          }
                        }}
                      />
                    </TableCell>
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
                      const isSelected = selectedRegistrationIds.includes(reg.id);

                      return (
                        <TableRow key={reg.id} hover selected={isSelected}>
                          <TableCell padding="checkbox">
                            <Checkbox
                              size="small"
                              checked={isSelected}
                              onChange={() => {
                                setSelectedRegistrationIds((prev) =>
                                  prev.includes(reg.id) ? prev.filter((i) => i !== reg.id) : [...prev, reg.id]
                                );
                              }}
                            />
                          </TableCell>
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

      {/* ===================================================================== */}
      {/* TAB 3: DEDICATED SELECTED CANDIDATES MANAGEMENT                        */}
      {/* ===================================================================== */}
      {activeTab === 3 && (
        <Box>
          {/* Header Banner */}
          <Card
            elevation={0}
            sx={{
              p: 2.5,
              mb: 3,
              borderRadius: 2.5,
              background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
              color: '#ffffff',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 2.5,
                  bgcolor: 'rgba(245, 158, 11, 0.15)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fbbf24',
                }}
              >
                <EmojiEventsIcon sx={{ fontSize: 28 }} />
              </Box>
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="h6" fontWeight={800} sx={{ color: '#ffffff' }}>
                    Drive-Specific Selected Candidates Management
                  </Typography>
                  <Chip
                    size="small"
                    label="Drive Scoped"
                    sx={{ bgcolor: 'rgba(2, 132, 199, 0.25)', color: '#38bdf8', fontWeight: 700, fontSize: '0.7rem' }}
                  />
                </Box>
                <Typography variant="body2" sx={{ color: '#94a3b8', mt: 0.25 }}>
                  Manage final selection outcomes for <strong>{drive?.companyName}</strong> ({drive?.jobRole}). Selection updates here are isolated to this drive and never affect other placement drives.
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
              <Button
                size="small"
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={() => refetchSelection()}
                sx={{
                  color: '#e2e8f0',
                  borderColor: 'rgba(255,255,255,0.2)',
                  '&:hover': { borderColor: '#ffffff', bgcolor: 'rgba(255,255,255,0.05)' },
                  textTransform: 'none',
                  fontWeight: 600,
                  borderRadius: 2,
                }}
              >
                Refresh
              </Button>
            </Box>
          </Card>

          {/* 5 Real-Time Selection Statistics Metric Cards */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={2.4}>
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  borderRadius: 2.5,
                  border: '1px solid #cbd5e1',
                  bgcolor: '#f8fafc',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 0.5,
                }}
              >
                <Typography variant="caption" fontWeight={700} sx={{ color: '#475569', textTransform: 'uppercase' }}>
                  Total Shortlisted
                </Typography>
                <Typography variant="h4" fontWeight={800} sx={{ color: '#0f172a' }}>
                  {selectionOverview?.totalShortlisted ?? registrations.length}
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b' }}>
                  Shortlisted candidates in pool
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={12} sm={6} md={2.4}>
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  borderRadius: 2.5,
                  border: '1px solid #6ee7b7',
                  bgcolor: '#ecfdf5',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 0.5,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="caption" fontWeight={700} sx={{ color: '#065f46', textTransform: 'uppercase' }}>
                    Selected
                  </Typography>
                  <CheckCircleIcon sx={{ fontSize: 18, color: '#059669' }} />
                </Box>
                <Typography variant="h4" fontWeight={800} sx={{ color: '#059669' }}>
                  {selectionOverview?.selectedCount ?? registrations.filter((r) => r.currentStage === 'SELECTED').length}
                </Typography>
                <Typography variant="caption" sx={{ color: '#047857' }}>
                  Confirmed offers extended
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={12} sm={6} md={2.4}>
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  borderRadius: 2.5,
                  border: '1px solid #fca5a5',
                  bgcolor: '#fef2f2',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 0.5,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="caption" fontWeight={700} sx={{ color: '#991b1b', textTransform: 'uppercase' }}>
                    Not Selected
                  </Typography>
                  <CancelIcon sx={{ fontSize: 18, color: '#dc2626' }} />
                </Box>
                <Typography variant="h4" fontWeight={800} sx={{ color: '#dc2626' }}>
                  {selectionOverview?.notSelectedCount ?? registrations.filter((r) => r.currentStage === 'REJECTED').length}
                </Typography>
                <Typography variant="caption" sx={{ color: '#b91c1c' }}>
                  Did not clear drive rounds
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={12} sm={6} md={2.4}>
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  borderRadius: 2.5,
                  border: '1px solid #fde68a',
                  bgcolor: '#fffbeb',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 0.5,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="caption" fontWeight={700} sx={{ color: '#92400e', textTransform: 'uppercase' }}>
                    Pending Decision
                  </Typography>
                  <HourglassEmptyIcon sx={{ fontSize: 18, color: '#d97706' }} />
                </Box>
                <Typography variant="h4" fontWeight={800} sx={{ color: '#d97706' }}>
                  {selectionOverview?.pendingCount ?? 0}
                </Typography>
                <Typography variant="caption" sx={{ color: '#b45309' }}>
                  In pipeline / Awaiting outcome
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={12} sm={6} md={2.4}>
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  borderRadius: 2.5,
                  border: '1px solid #d8b4fe',
                  bgcolor: '#faf5ff',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 0.5,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="caption" fontWeight={700} sx={{ color: '#5b21b6', textTransform: 'uppercase' }}>
                    Selection Rate
                  </Typography>
                  <StarIcon sx={{ fontSize: 18, color: '#7c3aed' }} />
                </Box>
                <Typography variant="h4" fontWeight={800} sx={{ color: '#7c3aed' }}>
                  {selectionOverview?.selectionRate ?? 0}%
                </Typography>
                <Typography variant="caption" sx={{ color: '#6d28d9' }}>
                  Offer conversion rate
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          {/* Search, Filter Toolbar */}
          <Card
            elevation={0}
            sx={{
              p: 2,
              mb: 3,
              borderRadius: 2.5,
              border: '1px solid #DCE6F5',
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              justifyContent: 'space-between',
              alignItems: { xs: 'stretch', md: 'center' },
              gap: 2,
            }}
          >
            {/* Search Input */}
            <Box sx={{ display: 'flex', gap: 1.5, flex: 1, flexWrap: 'wrap', alignItems: 'center' }}>
              <TextField
                size="small"
                placeholder="Search by Register Number or Student Name..."
                value={selectionSearch}
                onChange={(e) => setSelectionSearch(e.target.value)}
                sx={{
                  minWidth: { xs: '100%', sm: 320 },
                  bgcolor: '#ffffff',
                  '& .MuiOutlinedInput-root': { borderRadius: 2 },
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: '#94a3b8', fontSize: 20 }} />
                    </InputAdornment>
                  ),
                  endAdornment: selectionSearch ? (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setSelectionSearch('')}>
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ) : null,
                }}
              />

              {/* Status Filter Chips */}
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                <Chip
                  size="small"
                  label={`All (${selectionOverview?.totalShortlisted ?? 0})`}
                  clickable
                  color={selectionStatusFilter === 'ALL' ? 'primary' : 'default'}
                  onClick={() => setSelectionStatusFilter('ALL')}
                />
                <Chip
                  size="small"
                  label={`Selected (${selectionOverview?.selectedCount ?? 0})`}
                  clickable
                  variant={selectionStatusFilter === 'SELECTED' ? 'filled' : 'outlined'}
                  sx={{
                    bgcolor: selectionStatusFilter === 'SELECTED' ? '#15803d' : undefined,
                    color: selectionStatusFilter === 'SELECTED' ? '#ffffff' : '#15803d',
                    borderColor: '#86efac',
                    fontWeight: 700,
                  }}
                  onClick={() => setSelectionStatusFilter('SELECTED')}
                />
                <Chip
                  size="small"
                  label={`Not Selected (${selectionOverview?.notSelectedCount ?? 0})`}
                  clickable
                  variant={selectionStatusFilter === 'NOT_SELECTED' ? 'filled' : 'outlined'}
                  sx={{
                    bgcolor: selectionStatusFilter === 'NOT_SELECTED' ? '#dc2626' : undefined,
                    color: selectionStatusFilter === 'NOT_SELECTED' ? '#ffffff' : '#dc2626',
                    borderColor: '#fca5a5',
                    fontWeight: 700,
                  }}
                  onClick={() => setSelectionStatusFilter('NOT_SELECTED')}
                />
                <Chip
                  size="small"
                  label={`Pending Decision (${selectionOverview?.pendingCount ?? 0})`}
                  clickable
                  variant={selectionStatusFilter === 'PENDING' ? 'filled' : 'outlined'}
                  sx={{
                    bgcolor: selectionStatusFilter === 'PENDING' ? '#d97706' : undefined,
                    color: selectionStatusFilter === 'PENDING' ? '#ffffff' : '#d97706',
                    borderColor: '#fde68a',
                    fontWeight: 700,
                  }}
                  onClick={() => setSelectionStatusFilter('PENDING')}
                />
              </Box>
            </Box>

            {/* Department Dropdown Filter */}
            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <Select
                  value={selectionDeptFilter}
                  onChange={(e) => setSelectionDeptFilter(e.target.value)}
                  displayEmpty
                  sx={{ borderRadius: 2 }}
                >
                  <MenuItem value="ALL">All Departments</MenuItem>
                  {selectionAvailableDepartments.map((dept) => (
                    <MenuItem key={dept.code} value={dept.code}>
                      {dept.code} — {dept.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {(selectionSearch || selectionStatusFilter !== 'ALL' || selectionDeptFilter !== 'ALL') && (
                <Button
                  size="small"
                  onClick={() => {
                    setSelectionSearch('');
                    setSelectionStatusFilter('ALL');
                    setSelectionDeptFilter('ALL');
                  }}
                  sx={{ textTransform: 'none', color: '#64748b' }}
                >
                  Clear Filters
                </Button>
              )}
            </Box>
          </Card>

          {/* Bulk Selection Bar */}
          {selectedCandidateIds.length > 0 && (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 2,
                p: 1.75,
                borderRadius: 2.5,
                bgcolor: '#eff6ff',
                border: '1px solid #bfdbfe',
                flexWrap: 'wrap',
                gap: 1.5,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Typography variant="body2" fontWeight={800} sx={{ color: '#1e40af' }}>
                  {selectedCandidateIds.length} candidate(s) selected
                </Typography>
                <Button
                  size="small"
                  onClick={() => setSelectedCandidateIds([])}
                  sx={{ textTransform: 'none', color: '#64748b', fontSize: '0.75rem' }}
                >
                  Clear Selection
                </Button>
              </Box>

              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<CheckCircleIcon sx={{ fontSize: 16 }} />}
                  onClick={() => handleOpenBulkSelectionModal('SELECTED')}
                  sx={{ bgcolor: '#15803d', '&:hover': { bgcolor: '#166534' }, textTransform: 'none', borderRadius: 2, fontWeight: 700 }}
                >
                  Mark as Selected ({selectedCandidateIds.length})
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<CancelIcon sx={{ fontSize: 16 }} />}
                  onClick={() => handleOpenBulkSelectionModal('NOT_SELECTED')}
                  sx={{ bgcolor: '#dc2626', '&:hover': { bgcolor: '#b91c1c' }, textTransform: 'none', borderRadius: 2, fontWeight: 700 }}
                >
                  Mark as Not Selected ({selectedCandidateIds.length})
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<RestartAltIcon sx={{ fontSize: 16 }} />}
                  onClick={() => handleOpenBulkSelectionModal('RESET')}
                  sx={{
                    color: '#b45309',
                    borderColor: '#fcd34d',
                    '&:hover': { bgcolor: '#fef3c7' },
                    textTransform: 'none',
                    borderRadius: 2,
                    fontWeight: 700,
                  }}
                >
                  Reset Status ({selectedCandidateIds.length})
                </Button>
              </Box>
            </Box>
          )}

          {/* Table Container */}
          {isSelectionLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress size={36} />
            </Box>
          ) : (selectionOverview?.totalShortlisted ?? 0) === 0 ? (
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
              <EmojiEventsIcon sx={{ fontSize: 50, color: '#94a3b8', mb: 1.5 }} />
              <Typography variant="h6" fontWeight={700} sx={{ color: '#1e293b' }}>
                No students shortlisted yet for this placement drive
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5, mb: 2 }}>
                Switch to the "Eligibility & Shortlisting" tab to evaluate eligible candidates and shortlist them for this drive.
              </Typography>
              <Button
                variant="contained"
                onClick={() => setActiveTab(1)}
                sx={{ bgcolor: '#0284c7', textTransform: 'none', borderRadius: 2 }}
              >
                Go to Eligibility & Shortlisting
              </Button>
            </Card>
          ) : filteredSelectedCandidates.length === 0 ? (
            <Card
              elevation={0}
              sx={{
                py: 6,
                px: 3,
                textAlign: 'center',
                borderRadius: 2.5,
                border: '1px dashed #cbd5e1',
                bgcolor: '#ffffff',
              }}
            >
              <Typography variant="h6" fontWeight={700} sx={{ color: '#1e293b' }}>
                No candidates match your search or filter criteria
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5, mb: 2 }}>
                Try adjusting your search query, status filter, or department selection.
              </Typography>
              <Button
                variant="outlined"
                onClick={() => {
                  setSelectionSearch('');
                  setSelectionStatusFilter('ALL');
                  setSelectionDeptFilter('ALL');
                }}
                sx={{ textTransform: 'none', borderRadius: 2 }}
              >
                Reset Search Filters
              </Button>
            </Card>
          ) : isMobile ? (
            <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5, bgcolor: '#F8FAFC' }}>
              {paginatedSelectedCandidates.map((c) => {
                const isRowSelected = selectedCandidateIds.includes(c.registrationId);
                const stageConf = getStageBadge(c.currentStage);

                return (
                  <Card
                    key={c.registrationId}
                    variant="outlined"
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      borderColor: isRowSelected ? '#0284c7' : '#E2E8F0',
                      bgcolor: isRowSelected ? '#F0F9FF' : '#FFFFFF',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Checkbox
                          size="small"
                          checked={isRowSelected}
                          onChange={() => {
                            setSelectedCandidateIds((prev) =>
                              prev.includes(c.registrationId)
                                ? prev.filter((id) => id !== c.registrationId)
                                : [...prev, c.registrationId]
                            );
                          }}
                          sx={{ p: 0.5 }}
                        />
                        <Box>
                          <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#0F172A', lineHeight: 1.2 }}>
                            {c.name}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#0284c7', fontFamily: 'monospace' }}>
                            {c.registerNumber}
                          </Typography>
                        </Box>
                      </Box>

                      {/* Status Chip */}
                      {c.selectionStatus === 'SELECTED' ? (
                        <Chip
                          size="small"
                          icon={<CheckCircleIcon sx={{ fontSize: '13px !important' }} />}
                          label="Selected"
                          sx={{ bgcolor: '#dcfce7', color: '#15803d', fontWeight: 800, fontSize: '0.72rem', border: '1px solid #bbf7d0' }}
                        />
                      ) : c.selectionStatus === 'NOT_SELECTED' ? (
                        <Chip
                          size="small"
                          icon={<CancelIcon sx={{ fontSize: '13px !important' }} />}
                          label="Not Selected"
                          sx={{ bgcolor: '#fee2e2', color: '#b91c1c', fontWeight: 800, fontSize: '0.72rem', border: '1px solid #fecaca' }}
                        />
                      ) : (
                        <Chip
                          size="small"
                          label="Shortlisted"
                          sx={{ bgcolor: '#f1f5f9', color: '#475569', fontWeight: 700, fontSize: '0.72rem', border: '1px solid #e2e8f0' }}
                        />
                      )}
                    </Box>

                    <Divider sx={{ my: 1, borderColor: '#F1F5F9' }} />

                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1, mb: 1.5, fontSize: '0.8rem' }}>
                      <Box>
                        <Typography variant="caption" sx={{ color: '#64748B', fontSize: '0.66rem', fontWeight: 600, display: 'block' }}>
                          DEPARTMENT & BATCH
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#334155' }}>
                          {c.departmentCode || c.departmentName || '—'} ({c.year ? `Year ${c.year}` : 'Student'})
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" sx={{ color: '#64748B', fontSize: '0.66rem', fontWeight: 600, display: 'block' }}>
                          ACADEMIC STATS
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: '#0F172A' }}>
                          CGPA: {c.cgpa != null ? Number(c.cgpa).toFixed(2) : 'N/A'}
                        </Typography>
                      </Box>
                      <Box sx={{ gridColumn: 'span 2' }}>
                        <Typography variant="caption" sx={{ color: '#64748B', fontSize: '0.66rem', fontWeight: 600, display: 'block' }}>
                          CURRENT STAGE: <Box component="span" sx={{ color: stageConf.color, fontWeight: 700 }}>{stageConf.label}</Box>
                        </Typography>
                        {c.stageRemarks && (
                          <Typography variant="caption" sx={{ color: '#64748b', fontStyle: 'italic', display: 'block' }}>
                            "{c.stageRemarks}"
                          </Typography>
                        )}
                      </Box>
                    </Box>

                    {/* Action Buttons for Selection */}
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        size="small"
                        variant="contained"
                        color="success"
                        fullWidth
                        onClick={() => handleOpenSingleSelectionModal(c.registrationId, 'SELECTED', c.name)}
                        sx={{ textTransform: 'none', borderRadius: 1.5, fontWeight: 700, fontSize: '0.72rem', py: 0.6 }}
                      >
                        Select
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        fullWidth
                        onClick={() => handleOpenSingleSelectionModal(c.registrationId, 'NOT_SELECTED', c.name)}
                        sx={{ textTransform: 'none', borderRadius: 1.5, fontWeight: 700, fontSize: '0.72rem', py: 0.6 }}
                      >
                        Not Select
                      </Button>
                      {(c.selectionStatus === 'SELECTED' || c.selectionStatus === 'NOT_SELECTED') && (
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => handleOpenSingleSelectionModal(c.registrationId, 'RESET', c.name)}
                          sx={{ textTransform: 'none', borderRadius: 1.5, fontWeight: 600, fontSize: '0.72rem', py: 0.6, color: '#64748b', borderColor: '#cbd5e1' }}
                        >
                          Reset
                        </Button>
                      )}
                    </Box>
                  </Card>
                );
              })}
            </Box>
          ) : (
            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #DCE6F5', borderRadius: 2.5, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: '#f8fafc' }}>
                  <TableRow>
                    <TableCell padding="checkbox">
                      <Checkbox
                        size="small"
                        checked={
                          paginatedSelectedCandidates.length > 0 &&
                          paginatedSelectedCandidates.every((c) => selectedCandidateIds.includes(c.registrationId))
                        }
                        indeterminate={
                          paginatedSelectedCandidates.some((c) => selectedCandidateIds.includes(c.registrationId)) &&
                          !paginatedSelectedCandidates.every((c) => selectedCandidateIds.includes(c.registrationId))
                        }
                        onChange={() => {
                          const pageIds = paginatedSelectedCandidates.map((c) => c.registrationId);
                          const allPageSelected = pageIds.every((id) => selectedCandidateIds.includes(id));
                          if (allPageSelected) {
                            setSelectedCandidateIds((prev) => prev.filter((id) => !pageIds.includes(id)));
                          } else {
                            setSelectedCandidateIds((prev) => Array.from(new Set([...prev, ...pageIds])));
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '0.75rem' }}>CANDIDATE DETAILS</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '0.75rem' }}>DEPARTMENT & YEAR</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '0.75rem' }}>ACADEMIC PERFORMANCE</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '0.75rem' }}>RECRUITMENT STAGE</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '0.75rem' }}>SELECTION STATUS</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '0.75rem' }}>STAGE REMARKS / DATE</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '0.75rem' }} align="right">
                      MANUAL SELECTION ACTIONS
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedSelectedCandidates.map((c) => {
                    const isRowSelected = selectedCandidateIds.includes(c.registrationId);
                    const stageConf = getStageBadge(c.currentStage);

                    return (
                      <TableRow key={c.registrationId} hover selected={isRowSelected}>
                        {/* Checkbox */}
                        <TableCell padding="checkbox">
                          <Checkbox
                            size="small"
                            checked={isRowSelected}
                            onChange={() => {
                              setSelectedCandidateIds((prev) =>
                                prev.includes(c.registrationId)
                                  ? prev.filter((id) => id !== c.registrationId)
                                  : [...prev, c.registrationId]
                              );
                            }}
                          />
                        </TableCell>

                        {/* Candidate Details */}
                        <TableCell>
                          <Typography variant="body2" fontWeight={700} sx={{ color: '#0f172a' }}>
                            {c.name}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#0284c7', fontFamily: 'monospace', fontWeight: 700 }}>
                            {c.registerNumber}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                            {c.collegeEmail}
                          </Typography>
                        </TableCell>

                        {/* Department & Year */}
                        <TableCell>
                          <Typography variant="body2" fontWeight={600} sx={{ color: '#334155' }}>
                            {c.departmentCode || c.departmentName || '—'}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#64748b' }}>
                            {c.year ? `Year ${c.year}` : 'Student'}
                          </Typography>
                        </TableCell>

                        {/* Academic Performance */}
                        <TableCell>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                              <Typography variant="caption" sx={{ color: '#059669', fontWeight: 700 }}>
                                CGPA: {c.cgpa != null ? Number(c.cgpa).toFixed(2) : 'N/A'}
                              </Typography>
                              <Chip
                                size="small"
                                label={
                                  (c.standingArrears ?? c.activeBacklogs ?? 0) === 0
                                    ? '0 Arrears'
                                    : `${c.standingArrears ?? c.activeBacklogs} Arrear(s)`
                                }
                                sx={{
                                  height: 18,
                                  fontSize: '0.65rem',
                                  fontWeight: 700,
                                  bgcolor: (c.standingArrears ?? c.activeBacklogs ?? 0) === 0 ? '#dcfce7' : '#fee2e2',
                                  color: (c.standingArrears ?? c.activeBacklogs ?? 0) === 0 ? '#15803d' : '#b91c1c',
                                }}
                              />
                            </Box>
                            <Typography variant="caption" sx={{ color: '#64748b' }}>
                              10th: {c.tenthPercentage != null ? `${Number(c.tenthPercentage).toFixed(1)}%` : '—'} • 12th:{' '}
                              {c.twelfthPercentage != null ? `${Number(c.twelfthPercentage).toFixed(1)}%` : '—'}
                            </Typography>
                          </Box>
                        </TableCell>

                        {/* Recruitment Stage Badge */}
                        <TableCell>
                          <Chip
                            size="small"
                            label={stageConf.label}
                            sx={{
                              bgcolor: stageConf.bg,
                              color: stageConf.color,
                              fontWeight: 700,
                              fontSize: '0.72rem',
                            }}
                          />
                        </TableCell>

                        {/* Selection Status Badge */}
                        <TableCell>
                          {c.selectionStatus === 'SELECTED' ? (
                            <Chip
                              size="small"
                              icon={<CheckCircleIcon sx={{ fontSize: 14 }} />}
                              label="Selected"
                              sx={{
                                bgcolor: '#dcfce7',
                                color: '#15803d',
                                fontWeight: 800,
                                fontSize: '0.75rem',
                                border: '1px solid #86efac',
                              }}
                            />
                          ) : c.selectionStatus === 'NOT_SELECTED' ? (
                            <Chip
                              size="small"
                              icon={<CancelIcon sx={{ fontSize: 14 }} />}
                              label="Not Selected"
                              sx={{
                                bgcolor: '#fee2e2',
                                color: '#b91c1c',
                                fontWeight: 800,
                                fontSize: '0.75rem',
                                border: '1px solid #fca5a5',
                              }}
                            />
                          ) : (
                            <Chip
                              size="small"
                              icon={<HourglassEmptyIcon sx={{ fontSize: 14 }} />}
                              label="Pending Decision"
                              sx={{
                                bgcolor: '#fef3c7',
                                color: '#b45309',
                                fontWeight: 700,
                                fontSize: '0.75rem',
                                border: '1px solid #fde68a',
                              }}
                            />
                          )}
                        </TableCell>

                        {/* Remarks / Date */}
                        <TableCell>
                          <Typography
                            variant="caption"
                            sx={{
                              color: '#475569',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              fontStyle: c.stageRemarks ? 'italic' : 'normal',
                            }}
                          >
                            {c.stageRemarks || 'Registered in candidate pool'}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', fontSize: '0.68rem', mt: 0.25 }}>
                            {new Date(c.updatedAt).toLocaleDateString()}
                          </Typography>
                        </TableCell>

                        {/* Individual Manual Selection Actions */}
                        <TableCell align="right">
                          <Box sx={{ display: 'flex', gap: 0.75, justifyContent: 'flex-end', alignItems: 'center' }}>
                            {c.selectionStatus !== 'SELECTED' && (
                              <Button
                                size="small"
                                variant="contained"
                                startIcon={<CheckIcon sx={{ fontSize: 14 }} />}
                                onClick={() => handleOpenSingleSelectionModal(c.registrationId, 'SELECTED', c.name)}
                                sx={{
                                  bgcolor: '#15803d',
                                  '&:hover': { bgcolor: '#166534' },
                                  textTransform: 'none',
                                  borderRadius: 1.5,
                                  fontSize: '0.72rem',
                                  py: 0.4,
                                  px: 1,
                                  fontWeight: 700,
                                }}
                              >
                                Select
                              </Button>
                            )}

                            {c.selectionStatus !== 'NOT_SELECTED' && (
                              <Button
                                size="small"
                                variant="outlined"
                                color="error"
                                startIcon={<CloseIcon sx={{ fontSize: 14 }} />}
                                onClick={() => handleOpenSingleSelectionModal(c.registrationId, 'NOT_SELECTED', c.name)}
                                sx={{
                                  textTransform: 'none',
                                  borderRadius: 1.5,
                                  fontSize: '0.72rem',
                                  py: 0.4,
                                  px: 1,
                                  fontWeight: 700,
                                }}
                              >
                                Not Selected
                              </Button>
                            )}

                            {(c.selectionStatus === 'SELECTED' || c.selectionStatus === 'NOT_SELECTED') && (
                              <Tooltip title="Reset selection decision back to Shortlisted / Pending">
                                <IconButton
                                  size="small"
                                  onClick={() => handleOpenSingleSelectionModal(c.registrationId, 'RESET', c.name)}
                                  sx={{ color: '#94a3b8', '&:hover': { color: '#0284c7' } }}
                                >
                                  <RestartAltIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {/* Table Pagination */}
              <TablePagination
                rowsPerPageOptions={[10, 25, 50, 100]}
                component="div"
                count={filteredSelectedCandidates.length}
                rowsPerPage={selectionRowsPerPage}
                page={selectionPage}
                onPageChange={(_, newPage) => setSelectionPage(newPage)}
                onRowsPerPageChange={(e) => {
                  setSelectionRowsPerPage(parseInt(e.target.value, 10));
                  setSelectionPage(0);
                }}
              />
            </TableContainer>
          )}
        </Box>
      )}

      {/* SELECTION DECISION CONFIRMATION DIALOG */}
      <Dialog
        open={selectionRemarksModalOpen}
        onClose={() => !markSelectionMutation.isPending && setSelectionRemarksModalOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {pendingSelectionAction?.status === 'SELECTED' ? (
            <CheckCircleIcon sx={{ color: '#15803d', fontSize: 26 }} />
          ) : pendingSelectionAction?.status === 'NOT_SELECTED' ? (
            <CancelIcon sx={{ color: '#dc2626', fontSize: 26 }} />
          ) : (
            <RestartAltIcon sx={{ color: '#d97706', fontSize: 26 }} />
          )}
          {pendingSelectionAction?.status === 'SELECTED'
            ? 'Mark Candidate(s) as Selected'
            : pendingSelectionAction?.status === 'NOT_SELECTED'
            ? 'Mark Candidate(s) as Not Selected'
            : 'Reset Candidate Selection Status'}
        </DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, py: 2.5 }}>
          <Alert
            severity={
              pendingSelectionAction?.status === 'SELECTED'
                ? 'success'
                : pendingSelectionAction?.status === 'NOT_SELECTED'
                ? 'error'
                : 'warning'
            }
            sx={{ borderRadius: 2 }}
          >
            {pendingSelectionAction?.studentName ? (
              <span>
                You are updating selection for <strong>{pendingSelectionAction.studentName}</strong> in <strong>{drive?.companyName}</strong>.
              </span>
            ) : (
              <span>
                You are updating selection for <strong>{pendingSelectionAction?.registrationIds.length} candidate(s)</strong> in <strong>{drive?.companyName}</strong>.
              </span>
            )}
            <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
              This selection update is drive-specific and will strictly affect only this placement drive record.
            </Typography>
          </Alert>

          <TextField
            label="Selection Remarks / Reason (Optional)"
            multiline
            rows={3}
            fullWidth
            size="small"
            placeholder={
              pendingSelectionAction?.status === 'SELECTED'
                ? 'e.g. Cleared all technical and HR rounds. Offered Software Engineer role at 14 LPA.'
                : pendingSelectionAction?.status === 'NOT_SELECTED'
                ? 'e.g. Did not meet minimum score in technical assessment round.'
                : 'e.g. Reset status back to shortlisted for re-evaluation.'
            }
            value={selectionRemarks}
            onChange={(e) => setSelectionRemarks(e.target.value)}
          />

          <FormControlLabel
            control={
              <Switch
                checked={selectionNotifyStudents}
                onChange={(e) => setSelectionNotifyStudents(e.target.checked)}
                color={pendingSelectionAction?.status === 'SELECTED' ? 'success' : 'primary'}
              />
            }
            label={
              <Box>
                <Typography variant="body2" fontWeight={700} sx={{ color: '#0f172a' }}>
                  Send Notification to Student(s)
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b' }}>
                  Dispatches an automated in-app placement notification to candidate student portals
                </Typography>
              </Box>
            }
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => setSelectionRemarksModalOpen(false)}
            disabled={markSelectionMutation.isPending}
            sx={{ textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={markSelectionMutation.isPending}
            onClick={handleConfirmSelectionAction}
            sx={{
              bgcolor:
                pendingSelectionAction?.status === 'SELECTED'
                  ? '#15803d'
                  : pendingSelectionAction?.status === 'NOT_SELECTED'
                  ? '#dc2626'
                  : '#d97706',
              '&:hover': {
                bgcolor:
                  pendingSelectionAction?.status === 'SELECTED'
                    ? '#166534'
                    : pendingSelectionAction?.status === 'NOT_SELECTED'
                    ? '#b91c1c'
                    : '#b45309',
              },
              textTransform: 'none',
              fontWeight: 700,
              px: 3,
            }}
          >
            {markSelectionMutation.isPending ? (
              <CircularProgress size={20} color="inherit" />
            ) : pendingSelectionAction?.status === 'SELECTED' ? (
              'Confirm Selection'
            ) : pendingSelectionAction?.status === 'NOT_SELECTED' ? (
              'Confirm Not Selected'
            ) : (
              'Confirm Reset'
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 2-STEP CANDIDATE SHORTLISTING & PORTAL PUBLISHING WORKFLOW DIALOG */}
      <Dialog
        open={shortlistWorkflowOpen}
        onClose={() => setShortlistWorkflowOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 800, color: '#0f172a', pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: 2,
                  bgcolor: '#0284c715',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#0284c7',
                }}
              >
                <FactCheckIcon sx={{ fontSize: 22 }} />
              </Box>
              <Box>
                <Typography variant="h6" fontWeight={800} sx={{ color: '#0f172a', lineHeight: 1.2 }}>
                  Candidate Shortlisting & Portal Publishing
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b' }}>
                  {drive?.companyName} — {drive?.jobRole}
                </Typography>
              </Box>
            </Box>
            <IconButton size="small" onClick={() => setShortlistWorkflowOpen(false)}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        </DialogTitle>

        <Box sx={{ px: 3, pt: 1, pb: 2 }}>
          <Stepper activeStep={workflowStep} alternativeLabel>
            <Step>
              <StepLabel>
                <Typography variant="caption" fontWeight={700}>
                  1. Candidate Review ({selectedStudentsForReview.length} Selected)
                </Typography>
              </StepLabel>
            </Step>
            <Step>
              <StepLabel>
                <Typography variant="caption" fontWeight={700}>
                  2. Registration Link & Portal Setup
                </Typography>
              </StepLabel>
            </Step>
          </Stepper>
        </Box>

        <DialogContent dividers sx={{ p: 3, maxHeight: '65vh', overflowY: 'auto' }}>
          {workflowStep === 0 ? (
            /* STEP 1: CANDIDATE REVIEW SCREEN */
            <Box>
              <Box
                sx={{
                  p: 2,
                  mb: 2.5,
                  borderRadius: 2,
                  bgcolor: '#f0f9ff',
                  border: '1px solid #bae6fd',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 1.5,
                }}
              >
                <Box>
                  <Typography variant="subtitle2" fontWeight={800} sx={{ color: '#0369a1' }}>
                    Candidate Shortlist Verification ({selectedStudentsForReview.length} Candidates)
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#0284c7' }}>
                    Carefully review candidate academic records, departments, and eligibility details before proceeding.
                  </Typography>
                </Box>
                <Chip
                  size="small"
                  label="All Candidates Verified Eligible"
                  icon={<CheckCircleIcon sx={{ fontSize: 15 }} />}
                  sx={{ bgcolor: '#dcfce7', color: '#15803d', fontWeight: 700 }}
                />
              </Box>

              {selectedStudentsForReview.length === 0 ? (
                <Box sx={{ py: 6, textAlign: 'center' }}>
                  <Typography variant="body2" sx={{ color: '#64748b' }}>
                    No candidates currently selected for review. Please select eligible candidates from the table.
                  </Typography>
                </Box>
              ) : (
                <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: '#f8fafc' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem', color: '#475569' }}>CANDIDATE</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem', color: '#475569' }}>DEPARTMENT</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem', color: '#475569' }}>10TH / 12TH %</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem', color: '#475569' }}>CGPA / BACKLOGS</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem', color: '#475569' }}>STATUS</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem', color: '#475569' }} align="right">ACTION</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedStudentsForReview.map((s) => (
                        <TableRow key={s.studentId} hover>
                          <TableCell>
                            <Typography variant="body2" fontWeight={700} sx={{ color: '#0f172a' }}>
                              {s.name}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#0284c7', fontFamily: 'monospace' }}>
                              {s.registerNumber}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                              {s.collegeEmail}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600} sx={{ color: '#334155' }}>
                              {s.department || '—'}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#64748b' }}>
                              Batch {s.batchYear || '—'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption" sx={{ display: 'block', color: '#334155' }}>
                              10th: <strong>{s.tenthPercentage != null ? `${s.tenthPercentage}%` : 'N/A'}</strong>
                            </Typography>
                            <Typography variant="caption" sx={{ display: 'block', color: '#334155' }}>
                              12th: <strong>{s.twelfthPercentage != null ? `${s.twelfthPercentage}%` : 'N/A'}</strong>
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight={700} sx={{ color: '#0f172a' }}>
                              {s.cgpa != null ? Number(s.cgpa).toFixed(2) : 'N/A'} CGPA
                            </Typography>
                            <Typography variant="caption" sx={{ color: s.activeBacklogs > 0 ? '#dc2626' : '#16a34a', display: 'block' }}>
                              Backlogs: {s.activeBacklogs}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={s.category === 'ELIGIBLE' ? 'Eligible' : s.category === 'NOT_ELIGIBLE' ? 'Not Eligible' : 'Missing Info'}
                              icon={s.category === 'ELIGIBLE' ? <CheckCircleIcon sx={{ fontSize: 13 }} /> : undefined}
                              sx={{
                                bgcolor: s.category === 'ELIGIBLE' ? '#dcfce7' : '#fee2e2',
                                color: s.category === 'ELIGIBLE' ? '#15803d' : '#b91c1c',
                                fontWeight: 700,
                                fontSize: '0.7rem',
                              }}
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Tooltip title="Remove candidate from shortlist">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => setSelectedStudentIds((prev) => prev.filter((id) => id !== s.studentId))}
                              >
                                <DeleteOutlineIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          ) : (
            /* STEP 2: REGISTRATION LINK & PORTAL SETUP */
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <Box
                sx={{
                  p: 2,
                  borderRadius: 2,
                  bgcolor: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                }}
              >
                <Typography variant="subtitle2" fontWeight={800} sx={{ color: '#166534', mb: 0.5 }}>
                  Publish Drive to Student Portals
                </Typography>
                <Typography variant="caption" sx={{ color: '#15803d', display: 'block' }}>
                  The <strong>{selectedStudentIds.length} selected candidates</strong> will be marked as <strong>SHORTLISTED</strong>.
                  Registration links, guidelines, and package information configured below will immediately be visible on their Student Portals for application confirmation.
                </Typography>
              </Box>

              <TextField
                label="Registration / Application Link (URL)"
                placeholder="https://forms.gle/... or https://company.hirepro.in/..."
                value={workflowRegLink}
                onChange={(e) => setWorkflowRegLink(e.target.value)}
                fullWidth
                size="small"
                helperText="External application URL or registration form link for shortlisted candidates (optional)"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LinkIcon sx={{ color: '#0284c7', fontSize: 20 }} />
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                label="Registration & Drive Instructions"
                placeholder="e.g. Please bring 2 updated copies of your resume, college ID card, and all original marksheets. Formal dress code mandatory. Online assessment starts at 10:00 AM."
                value={workflowInstructions}
                onChange={(e) => setWorkflowInstructions(e.target.value)}
                multiline
                rows={3}
                fullWidth
                size="small"
                helperText="Visible to shortlisted candidates on their Student Portal drive page"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start" sx={{ alignSelf: 'flex-start', mt: 1 }}>
                      <DescriptionIcon sx={{ color: '#64748b', fontSize: 20 }} />
                    </InputAdornment>
                  ),
                }}
              />

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Package Details / CTC"
                    value={workflowPackage}
                    onChange={(e) => setWorkflowPackage(e.target.value)}
                    fullWidth
                    size="small"
                    placeholder="e.g. 6.5 LPA - 8.5 LPA"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <CurrencyRupeeIcon sx={{ color: '#16a34a', fontSize: 18 }} />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Drive Location / Venue"
                    value={workflowLocation}
                    onChange={(e) => setWorkflowLocation(e.target.value)}
                    fullWidth
                    size="small"
                    placeholder="e.g. Campus Placement Cell / Auditorium"
                  />
                </Grid>
              </Grid>

              <TextField
                label="Job Description Summary"
                value={workflowJobDescription}
                onChange={(e) => setWorkflowJobDescription(e.target.value)}
                multiline
                rows={2}
                fullWidth
                size="small"
                placeholder="Brief role responsibilities and requirements..."
              />

              <Box sx={{ p: 1.5, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={workflowNotifyCandidates}
                      onChange={(e) => setWorkflowNotifyCandidates(e.target.checked)}
                      color="primary"
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2" fontWeight={700} sx={{ color: '#0f172a' }}>
                        Notify shortlisted candidates immediately
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#64748b' }}>
                        Sends in-app notifications and portal alerts prompting students to confirm registration
                      </Typography>
                    </Box>
                  }
                />
              </Box>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2.5, justifyContent: 'space-between' }}>
          {workflowStep === 0 ? (
            <>
              <Button onClick={() => setShortlistWorkflowOpen(false)} sx={{ textTransform: 'none', color: '#64748b' }}>
                Cancel
              </Button>
              <Button
                variant="contained"
                disabled={selectedStudentIds.length === 0}
                endIcon={<ArrowForwardIcon />}
                onClick={() => setWorkflowStep(1)}
                sx={{
                  bgcolor: '#0284c7',
                  '&:hover': { bgcolor: '#0369a1' },
                  textTransform: 'none',
                  fontWeight: 700,
                  px: 3,
                }}
              >
                Continue to Registration Setup ({selectedStudentIds.length})
              </Button>
            </>
          ) : (
            <>
              <Button
                startIcon={<ArrowBackIcon />}
                onClick={() => setWorkflowStep(0)}
                sx={{ textTransform: 'none', color: '#475569' }}
              >
                Back to Candidate Review
              </Button>
              <Button
                variant="contained"
                disabled={shortlistMutation.isPending || selectedStudentIds.length === 0}
                startIcon={shortlistMutation.isPending ? <CircularProgress size={18} color="inherit" /> : <SendIcon />}
                onClick={() =>
                  shortlistMutation.mutate({
                    studentIds: selectedStudentIds,
                    registrationLink: workflowRegLink.trim() || undefined,
                    instructions: workflowInstructions.trim() || undefined,
                    packageDetails: workflowPackage.trim() || undefined,
                    jobDescription: workflowJobDescription.trim() || undefined,
                    location: workflowLocation.trim() || undefined,
                    notifyCandidates: workflowNotifyCandidates,
                  })
                }
                sx={{
                  bgcolor: '#059669',
                  '&:hover': { bgcolor: '#047857' },
                  textTransform: 'none',
                  fontWeight: 700,
                  px: 3,
                }}
              >
                {shortlistMutation.isPending ? 'Publishing...' : `Publish to Student Portal & Shortlist (${selectedStudentIds.length})`}
              </Button>
            </>
          )}
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

      {/* Bulk Stage Update Dialog */}
      <Dialog
        open={bulkStageDialogOpen}
        onClose={() => !bulkStageMutation.isPending && setBulkStageDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 800, color: '#0f172a' }}>
          Bulk Update Stage ({selectedRegistrationIds.length} Candidates Selected)
        </DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 2 }}>
          <Alert severity="info" sx={{ fontSize: '0.825rem' }}>
            All selected students will be moved to the chosen recruitment stage. They will receive automated notifications in their student portal.
          </Alert>

          <TextField
            select
            label="Target Recruitment Stage"
            fullWidth
            size="small"
            value={bulkTargetStage}
            onChange={(e) => setBulkTargetStage(e.target.value as SelectionStage)}
          >
            {SELECTION_STAGES.map((st) => (
              <MenuItem key={st.value} value={st.value}>
                {st.label}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Stage Remarks / Instructions (Optional)"
            multiline
            rows={3}
            fullWidth
            size="small"
            placeholder="e.g. Cleared round 1 coding test; shortlisted for technical interview round on Friday."
            value={bulkStageRemarks}
            onChange={(e) => setBulkStageRemarks(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => setBulkStageDialogOpen(false)}
            disabled={bulkStageMutation.isPending}
            sx={{ textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={bulkStageMutation.isPending || selectedRegistrationIds.length === 0}
            onClick={() =>
              bulkStageMutation.mutate({
                registrationIds: selectedRegistrationIds,
                stage: bulkTargetStage,
                remarks: bulkStageRemarks.trim() || undefined,
              })
            }
            sx={{
              bgcolor: '#0284c7',
              '&:hover': { bgcolor: '#0369a1' },
              textTransform: 'none',
              fontWeight: 700,
            }}
          >
            {bulkStageMutation.isPending ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              `Update ${selectedRegistrationIds.length} Candidate(s)`
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Finalize Selections Confirmation Dialog */}
      <Dialog
        open={finalizeDialogOpen}
        onClose={() => !finalizeMutation.isPending && setFinalizeDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 800, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 1 }}>
          <GavelIcon color="error" />
          Finalize Placement Drive Selections
        </DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <Alert severity="warning" sx={{ fontSize: '0.85rem' }}>
            <strong>Important Action:</strong> Finalizing the drive closes candidate selection.
            <br />
            • Any candidate already marked as <strong>Selected</strong> will retain their offer.
            <br />
            • <strong>All other active registered candidates</strong> who were not selected will be automatically classified as <strong>Rejected</strong>.
            <br />
            • The drive status will transition to <strong>Completed</strong>.
            <br />
            • Candidate status audit logs will be permanently recorded.
          </Alert>

          <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
            <Typography variant="subtitle2" fontWeight={800} sx={{ color: '#0f172a', mb: 1 }}>
              Drive Candidates Summary:
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="caption" sx={{ color: '#64748b' }}>Selected Candidates</Typography>
                <Typography variant="h6" fontWeight={800} sx={{ color: '#15803d' }}>
                  {driveStats?.selected ?? 0}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" sx={{ color: '#64748b' }}>To Be Marked as Rejected</Typography>
                <Typography variant="h6" fontWeight={800} sx={{ color: '#dc2626' }}>
                  {Math.max(0, (driveStats?.applied ?? 0) - (driveStats?.selected ?? 0) - (driveStats?.rejected ?? 0))}
                </Typography>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => setFinalizeDialogOpen(false)}
            disabled={finalizeMutation.isPending}
            sx={{ textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            disabled={finalizeMutation.isPending}
            onClick={() => finalizeMutation.mutate()}
            sx={{ textTransform: 'none', fontWeight: 700 }}
          >
            {finalizeMutation.isPending ? <CircularProgress size={20} color="inherit" /> : 'Confirm Finalize & Auto-Reject'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Candidate Status Audit Trail Dialog */}
      <Dialog
        open={auditLogsDialogOpen}
        onClose={() => setAuditLogsDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <HistoryIcon sx={{ color: '#0284c7' }} />
            Candidate Selection & Status Audit Trail
          </Box>
          <Chip label={`${auditLogs.length} Records`} size="small" sx={{ fontWeight: 700 }} />
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
          {auditLogs.length === 0 ? (
            <Box sx={{ py: 6, textAlign: 'center' }}>
              <HistoryIcon sx={{ fontSize: 48, color: '#cbd5e1', mb: 1 }} />
              <Typography variant="body2" sx={{ color: '#64748b' }}>
                No candidate status transitions or audit logs recorded yet for this drive.
              </Typography>
            </Box>
          ) : (
            <TableContainer sx={{ maxHeight: 450, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f8fafc' }}>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#475569' }}>DATE & TIME</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#475569' }}>CANDIDATE</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#475569' }}>STAGE TRANSITION</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#475569' }}>CHANGED BY</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#475569' }}>REMARKS</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {auditLogs.map((log) => {
                    const prevBadge = log.previousStage ? getStageBadge(log.previousStage as SelectionStage) : null;
                    const newBadge = getStageBadge(log.newStage as SelectionStage);
                    return (
                      <TableRow key={log.id} hover>
                        <TableCell sx={{ whiteSpace: 'nowrap', fontSize: '0.75rem', color: '#64748b' }}>
                          {new Date(log.createdAt).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={700} sx={{ color: '#0f172a' }}>
                            {log.student?.name || 'Candidate'}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#0284c7', fontFamily: 'monospace' }}>
                            {log.student?.registerNumber}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                            {prevBadge ? (
                              <Chip
                                size="small"
                                label={prevBadge.label}
                                sx={{ height: 20, fontSize: '0.68rem', bgcolor: prevBadge.bg, color: prevBadge.color, fontWeight: 700 }}
                              />
                            ) : (
                              <Chip size="small" label="INITIAL" sx={{ height: 20, fontSize: '0.68rem', bgcolor: '#f1f5f9', color: '#64748b' }} />
                            )}
                            <Typography variant="caption" sx={{ color: '#94a3b8' }}>→</Typography>
                            <Chip
                              size="small"
                              label={newBadge.label}
                              sx={{ height: 20, fontSize: '0.68rem', bgcolor: newBadge.bg, color: newBadge.color, fontWeight: 800 }}
                            />
                          </Box>
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.75rem', color: '#475569', fontWeight: 600 }}>
                          {log.changedBy}
                        </TableCell>
                        <TableCell sx={{ maxWidth: 220 }}>
                          <Typography variant="caption" sx={{ color: '#64748b' }}>
                            {log.remarks || '—'}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setAuditLogsDialogOpen(false)} sx={{ textTransform: 'none' }}>
            Close
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
