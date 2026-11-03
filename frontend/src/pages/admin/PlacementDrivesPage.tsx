import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Card,
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
  IconButton,
  Tooltip,
  Paper,
  Tabs,
  Tab,
  InputAdornment,
  FormControl,
  Select,
  OutlinedInput,
  Checkbox,
  ListItemText,
  SelectChangeEvent,
  Snackbar,
} from '@mui/material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import WorkIcon from '@mui/icons-material/Work';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import SearchIcon from '@mui/icons-material/Search';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import CurrencyRupeeIcon from '@mui/icons-material/CurrencyRupee';
import GroupsIcon from '@mui/icons-material/Groups';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import BusinessIcon from '@mui/icons-material/Business';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';

import { placementDriveService } from '../../services/placement-drive.service.js';
import { managementService } from '../../services/management.service.js';
import {
  PlacementDrive,
  CreatePlacementDriveInput,
  DriveStatus,
  RequiredSkillCriterion,
} from '../../types/placement-drive.types.js';

const DEFAULT_STAGES = [
  'Online Coding Assessment',
  'Technical Interview Round 1',
  'Technical Interview Round 2',
  'HR & Leadership Round',
];

export const PlacementDrivesPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [searchParams, setSearchParams] = useSearchParams();
  const urlStatus = searchParams.get('status');
  const initialStatus =
    urlStatus && ['UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED'].includes(urlStatus.toUpperCase())
      ? urlStatus.toUpperCase()
      : 'ALL';
  const [activeTab, setActiveTab] = useState<string>(initialStatus);

  useEffect(() => {
    const s = searchParams.get('status');
    if (s && ['UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED'].includes(s.toUpperCase())) {
      setActiveTab(s.toUpperCase());
    } else if (!s) {
      setActiveTab('ALL');
    }
  }, [searchParams]);
  const [searchQuery, setSearchQuery] = useState('');

  // Dialog State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDrive, setEditingDrive] = useState<PlacementDrive | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete Confirmation & Feedback State
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [driveToDelete, setDriveToDelete] = useState<{ id: string; name: string } | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Form Fields State
  const [companyName, setCompanyName] = useState('');
  const [jobRole, setJobRole] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [location, setLocation] = useState('');
  const [packageDetails, setPackageDetails] = useState('');
  const [vacancies, setVacancies] = useState<number | ''>(5);
  const [driveDate, setDriveDate] = useState('2026-11-20');
  const [registrationDeadline, setRegistrationDeadline] = useState('2026-11-15');
  const [status, setStatus] = useState<DriveStatus>('UPCOMING');
  const [minTenthPercentage, setMinTenthPercentage] = useState<number | ''>('');
  const [minTwelfthPercentage, setMinTwelfthPercentage] = useState<number | ''>('');
  const [minCgpa, setMinCgpa] = useState<number | ''>(7.0);
  const [maxActiveBacklogs, setMaxActiveBacklogs] = useState<number | ''>(0);
  const [selectedDepts, setSelectedDepts] = useState<string[]>([]);
  const [selectedBatches, setSelectedBatches] = useState<number[]>([]);

  // Required skills list
  const [requiredSkills, setRequiredSkills] = useState<RequiredSkillCriterion[]>([
    { name: 'Python Programming', minLevel: 'INTERMEDIATE' },
    { name: 'Data Structures & Algorithms', minLevel: 'INTERMEDIATE' },
  ]);
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillLevel, setNewSkillLevel] = useState('INTERMEDIATE');

  // Fetch drives
  const { data: drives = [], isLoading, isError } = useQuery({
    queryKey: ['placement-drives', activeTab, searchQuery],
    queryFn: () =>
      placementDriveService.getDrives({
        status: activeTab === 'ALL' ? undefined : (activeTab as DriveStatus),
        search: searchQuery.trim() || undefined,
      }),
  });

  // Fetch departments dynamically from College Settings
  const {
    data: departments = [],
    isLoading: isLoadingDepartments,
    refetch: refetchDepartments,
  } = useQuery({
    queryKey: ['departments'],
    queryFn: () => managementService.getDepartments(),
    staleTime: 0,
  });

  // Fetch classes dynamically from College Settings (to extract graduation batch years)
  const {
    data: classes = [],
    isLoading: isLoadingClasses,
    refetch: refetchClasses,
  } = useQuery({
    queryKey: ['classes'],
    queryFn: () => managementService.getClasses(),
    staleTime: 0,
  });

  // Dynamically derive department options from College Settings, preserving any existing selected values
  const departmentOptions = useMemo(() => {
    const map = new Map<string, { code: string; name: string }>();

    // 1. All departments configured in College Settings
    for (const dept of departments) {
      if (dept && dept.code) {
        const codeUpper = dept.code.toUpperCase().trim();
        map.set(codeUpper, {
          code: codeUpper,
          name: dept.name || codeUpper,
        });
      }
    }

    // 2. Preserve any existing selected values
    for (const code of selectedDepts) {
      if (code) {
        const codeUpper = code.toUpperCase().trim();
        if (!map.has(codeUpper)) {
          map.set(codeUpper, {
            code: codeUpper,
            name: codeUpper,
          });
        }
      }
    }

    return Array.from(map.values()).sort((a, b) => a.code.localeCompare(b.code));
  }, [departments, selectedDepts]);

  // Dynamically derive graduation batch year options from College Settings, preserving any existing selected values
  const batchOptions = useMemo(() => {
    const set = new Set<number>();

    // 1. All graduation batch years configured in College Settings classes
    for (const cls of classes) {
      if (cls && typeof cls.batchYear === 'number' && !isNaN(cls.batchYear) && cls.batchYear > 0) {
        set.add(cls.batchYear);
      }
    }

    // 2. Preserve any existing selected batch years
    for (const batch of selectedBatches) {
      if (typeof batch === 'number' && !isNaN(batch) && batch > 0) {
        set.add(batch);
      }
    }

    // Fallback if College Settings has no classes configured yet
    if (set.size === 0) {
      const currentYear = new Date().getFullYear();
      for (let y = currentYear - 1; y <= currentYear + 3; y++) {
        set.add(y);
      }
    }

    return Array.from(set).sort((a, b) => b - a);
  }, [classes, selectedBatches]);

  // Create / Update Mutation
  const saveMutation = useMutation({
    mutationFn: (payload: CreatePlacementDriveInput) => {
      if (editingDrive) {
        return placementDriveService.updateDrive(editingDrive.id, payload);
      }
      return placementDriveService.createDrive(payload);
    },
    onSuccess: (savedDrive) => {
      queryClient.invalidateQueries({ queryKey: ['placement-drives'] });
      if (editingDrive) {
        queryClient.invalidateQueries({ queryKey: ['placement-drive', editingDrive.id] });
        queryClient.invalidateQueries({ queryKey: ['placement-drive-eligibility', editingDrive.id] });
      }
      setSnackbar({
        open: true,
        message: editingDrive
          ? `Placement drive for "${savedDrive.companyName}" successfully updated!`
          : `Placement drive for "${savedDrive.companyName}" successfully created!`,
        severity: 'success',
      });
      handleCloseModal();
    },
    onError: (err: any) => {
      setFormError(err?.response?.data?.message || err?.message || 'Failed to save placement drive');
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => placementDriveService.deleteDrive(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['placement-drives'] });
      setSnackbar({
        open: true,
        message: `Placement drive "${driveToDelete?.name || ''}" was successfully deleted.`,
        severity: 'success',
      });
      setDeleteConfirmOpen(false);
      setDriveToDelete(null);
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

  const handleOpenCreate = () => {
    refetchDepartments();
    refetchClasses();
    setEditingDrive(null);
    setCompanyName('');
    setJobRole('');
    setJobDescription('');
    setLocation('Bengaluru / Hybrid');
    setPackageDetails('12-18 LPA CTC');
    setVacancies(10);
    setDriveDate(new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0]);
    setRegistrationDeadline(new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0]);
    setStatus('UPCOMING');
    setMinTenthPercentage('');
    setMinTwelfthPercentage('');
    setMinCgpa(7.0);
    setMaxActiveBacklogs(0);
    setSelectedDepts([]);
    setSelectedBatches(batchOptions.length > 0 ? [batchOptions[0]] : [new Date().getFullYear()]);
    setRequiredSkills([
      { name: 'Python Programming', minLevel: 'INTERMEDIATE' },
      { name: 'Data Structures & Algorithms', minLevel: 'INTERMEDIATE' },
    ]);
    setFormError(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (drive: PlacementDrive) => {
    refetchDepartments();
    refetchClasses();
    setEditingDrive(drive);
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
    setFormError(null);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingDrive(null);
    setFormError(null);
  };

  const handleAddSkill = () => {
    if (!newSkillName.trim()) return;
    const trimmed = newSkillName.trim();
    if (requiredSkills.some((s) => s.name.toLowerCase() === trimmed.toLowerCase())) {
      setFormError('This skill is already in the requirements list');
      return;
    }
    setRequiredSkills([...requiredSkills, { name: trimmed, minLevel: newSkillLevel }]);
    setNewSkillName('');
    setFormError(null);
  };

  const handleRemoveSkill = (index: number) => {
    setRequiredSkills(requiredSkills.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) {
      setFormError('Company name is required');
      return;
    }
    if (!jobRole.trim()) {
      setFormError('Job role is required');
      return;
    }

    if (new Date(registrationDeadline) > new Date(driveDate)) {
      setFormError('Registration deadline cannot be after the drive date');
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
      selectionProcess: editingDrive?.selectionProcess || DEFAULT_STAGES,
    };

    saveMutation.mutate(payload);
  };

  const handleDeleteClick = (id: string, name: string) => {
    setDriveToDelete({ id, name });
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (driveToDelete) {
      deleteMutation.mutate(driveToDelete.id);
    }
  };

  // Metric counts
  const totalDrives = drives.length;
  const upcomingCount = drives.filter((d) => d.status === 'UPCOMING').length;
  const ongoingCount = drives.filter((d) => d.status === 'ONGOING').length;
  const completedCount = drives.filter((d) => d.status === 'COMPLETED').length;

  const getStatusColor = (st: DriveStatus) => {
    switch (st) {
      case 'UPCOMING':
        return { bg: '#e0f2fe', color: '#0369a1', border: '#bae6fd' };
      case 'ONGOING':
        return { bg: '#dcfce7', color: '#15803d', border: '#bbf7d0' };
      case 'COMPLETED':
        return { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' };
      case 'CANCELLED':
        return { bg: '#fee2e2', color: '#b91c1c', border: '#fecaca' };
      default:
        return { bg: '#f1f5f9', color: '#475569', border: '#e2e8f0' };
    }
  };

  return (
    <Box sx={{ maxWidth: 1440, mx: 'auto', p: { xs: 2, sm: 3 } }}>
      {/* Page Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <WorkIcon sx={{ color: '#0284c7', fontSize: 32 }} />
            <Typography variant="h4" fontWeight={800} sx={{ color: '#14264B', letterSpacing: '-0.02em' }}>
              Campus Placement Drives
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>
            Configure company-specific recruitment drives, define granular eligibility criteria, analyze candidate qualifications, and track selection stages.
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<AddCircleIcon />}
          onClick={handleOpenCreate}
          sx={{
            bgcolor: '#0284c7',
            '&:hover': { bgcolor: '#0369a1' },
            borderRadius: 2,
            px: 2.5,
            py: 1,
            textTransform: 'none',
            fontWeight: 700,
            boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)',
          }}
        >
          Create Placement Drive
        </Button>
      </Box>

      {/* Metric Counters */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 2.5,
              border: '1px solid #DCE6F5',
              bgcolor: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 2,
                bgcolor: '#f0f9ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#0284c7',
              }}
            >
              <WorkIcon />
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                Total Drives
              </Typography>
              <Typography variant="h5" fontWeight={800} sx={{ color: '#0f172a' }}>
                {totalDrives}
              </Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 2.5,
              border: '1px solid #DCE6F5',
              bgcolor: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 2,
                bgcolor: '#e0f2fe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#0369a1',
              }}
            >
              <CalendarMonthIcon />
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                Upcoming Drives
              </Typography>
              <Typography variant="h5" fontWeight={800} sx={{ color: '#0369a1' }}>
                {upcomingCount}
              </Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 2.5,
              border: '1px solid #DCE6F5',
              bgcolor: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 2,
                bgcolor: '#dcfce7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#15803d',
              }}
            >
              <VerifiedUserIcon />
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                Ongoing Drives
              </Typography>
              <Typography variant="h5" fontWeight={800} sx={{ color: '#15803d' }}>
                {ongoingCount}
              </Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 2.5,
              border: '1px solid #DCE6F5',
              bgcolor: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 2,
                bgcolor: '#f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#475569',
              }}
            >
              <CheckCircleOutlineIcon />
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                Completed Drives
              </Typography>
              <Typography variant="h5" fontWeight={800} sx={{ color: '#475569' }}>
                {completedCount}
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Search & Status Filters */}
      <Card
        elevation={0}
        sx={{
          borderRadius: 2.5,
          border: '1px solid #DCE6F5',
          p: 2,
          mb: 3,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Tabs
          value={activeTab}
          onChange={(_, val) => {
            setActiveTab(val);
            setSearchParams((prev) => {
              const next = new URLSearchParams(prev);
              if (val === 'ALL') {
                next.delete('status');
              } else {
                next.set('status', val);
              }
              return next;
            });
          }}
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 700,
              fontSize: '0.85rem',
              minHeight: 40,
            },
          }}
        >
          <Tab value="ALL" label="All Drives" />
          <Tab value="UPCOMING" label="Upcoming" />
          <Tab value="ONGOING" label="Ongoing" />
          <Tab value="COMPLETED" label="Completed" />
          <Tab value="CANCELLED" label="Cancelled" />
        </Tabs>

        <TextField
          size="small"
          placeholder="Search by company, role, location..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ width: { xs: '100%', sm: 300 } }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: '#94a3b8', fontSize: 20 }} />
              </InputAdornment>
            ),
          }}
        />
      </Card>

      {/* Drives Grid / List */}
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress size={40} />
        </Box>
      ) : isError ? (
        <Alert severity="error">Failed to load placement drives. Please try again.</Alert>
      ) : drives.length === 0 ? (
        <Card
          elevation={0}
          sx={{
            py: 8,
            px: 3,
            borderRadius: 2.5,
            border: '1px dashed #cbd5e1',
            textAlign: 'center',
            bgcolor: '#ffffff',
          }}
        >
          <BusinessIcon sx={{ fontSize: 56, color: '#94a3b8', mb: 1.5 }} />
          <Typography variant="h6" fontWeight={700} sx={{ color: '#1e293b' }}>
            No placement drives found
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748b', maxWidth: 460, mx: 'auto', mt: 0.5, mb: 2.5 }}>
            Create your first company placement drive to set up automatic eligibility rules and begin candidate selection.
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddCircleIcon />}
            onClick={handleOpenCreate}
            sx={{ bgcolor: '#0284c7', textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
          >
            Create Drive
          </Button>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {drives.map((drive) => {
            const statusStyle = getStatusColor(drive.status);

            return (
              <Grid item xs={12} md={6} lg={4} key={drive.id}>
                <Card
                  elevation={0}
                  sx={{
                    borderRadius: 2.5,
                    border: '1px solid #DCE6F5',
                    bgcolor: '#ffffff',
                    p: 2.5,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      borderColor: '#0284c7',
                      boxShadow: '0 8px 24px rgba(2, 132, 199, 0.08)',
                      transform: 'translateY(-2px)',
                    },
                  }}
                >
                  <Box>
                    {/* Top Row: Company & Status */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                      <Box>
                        <Typography variant="h6" fontWeight={800} sx={{ color: '#0f172a', lineHeight: 1.2 }}>
                          {drive.companyName}
                        </Typography>
                        <Typography variant="body2" fontWeight={600} sx={{ color: '#0284c7', mt: 0.3 }}>
                          {drive.jobRole}
                        </Typography>
                      </Box>
                      <Chip
                        size="small"
                        label={drive.status}
                        sx={{
                          bgcolor: statusStyle.bg,
                          color: statusStyle.color,
                          border: `1px solid ${statusStyle.border}`,
                          fontWeight: 700,
                          fontSize: '0.7rem',
                        }}
                      />
                    </Box>

                    {/* Metadata chips */}
                    <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mb: 2 }}>
                      {drive.packageDetails && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#059669', fontSize: '0.8rem', fontWeight: 700 }}>
                          <CurrencyRupeeIcon sx={{ fontSize: 16 }} />
                          {drive.packageDetails}
                        </Box>
                      )}
                      {drive.location && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#64748b', fontSize: '0.8rem' }}>
                          <LocationOnIcon sx={{ fontSize: 16 }} />
                          {drive.location}
                        </Box>
                      )}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#64748b', fontSize: '0.8rem' }}>
                        <GroupsIcon sx={{ fontSize: 16 }} />
                        {drive.vacancies || 1} Vacancies
                      </Box>
                    </Box>

                    <Divider sx={{ mb: 2, borderColor: '#f1f5f9' }} />

                    {/* Dates */}
                    <Grid container spacing={1.5} sx={{ mb: 2 }}>
                      <Grid item xs={6}>
                        <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                          DRIVE DATE
                        </Typography>
                        <Typography variant="body2" fontWeight={700} sx={{ color: '#1e293b' }}>
                          {new Date(drive.driveDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                          DEADLINE
                        </Typography>
                        <Typography variant="body2" fontWeight={700} sx={{ color: '#b91c1c' }}>
                          {new Date(drive.registrationDeadline).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </Typography>
                      </Grid>
                    </Grid>

                    {/* Criteria Badges */}
                    <Box sx={{ bgcolor: '#f8fafc', p: 1.5, borderRadius: 2, border: '1px solid #e2e8f0', mb: 2 }}>
                      <Typography variant="caption" fontWeight={700} sx={{ color: '#475569', display: 'block', mb: 1 }}>
                        ELIGIBILITY REQUIREMENTS
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        {drive.minCgpa != null && (
                          <Chip
                            size="small"
                            label={`Min CGPA: ${Number(drive.minCgpa).toFixed(2)}`}
                            sx={{ bgcolor: '#e0f2fe', color: '#0369a1', fontWeight: 700, fontSize: '0.7rem' }}
                          />
                        )}
                        {drive.minTenthPercentage != null && (
                          <Chip
                            size="small"
                            label={`10th: ${drive.minTenthPercentage}%`}
                            sx={{ bgcolor: '#f1f5f9', color: '#334155', fontWeight: 600, fontSize: '0.7rem' }}
                          />
                        )}
                        {drive.minTwelfthPercentage != null && (
                          <Chip
                            size="small"
                            label={`12th: ${drive.minTwelfthPercentage}%`}
                            sx={{ bgcolor: '#f1f5f9', color: '#334155', fontWeight: 600, fontSize: '0.7rem' }}
                          />
                        )}
                        <Chip
                          size="small"
                          label={`Max Backlogs: ${drive.maxActiveBacklogs ?? 0}`}
                          sx={{ bgcolor: '#f1f5f9', color: '#334155', fontWeight: 600, fontSize: '0.7rem' }}
                        />
                      </Box>

                      {/* Required skills preview */}
                      {(drive.requiredSkills || []).length > 0 && (
                        <Box sx={{ mt: 1, pt: 1, borderTop: '1px dashed #cbd5e1' }}>
                          <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.68rem', display: 'block', mb: 0.5 }}>
                            Required Skills:
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                            {(drive.requiredSkills || []).map((sk, idx) => (
                              <Chip
                                key={idx}
                                size="small"
                                label={`${sk.name}${sk.minLevel ? ` (${sk.minLevel})` : ''}`}
                                sx={{ bgcolor: '#ffffff', border: '1px solid #cbd5e1', fontSize: '0.65rem' }}
                              />
                            ))}
                          </Box>
                        </Box>
                      )}
                    </Box>
                  </Box>

                  {/* Actions Bar */}
                  <Box sx={{ pt: 1.5, borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Tooltip title="Edit Drive">
                        <IconButton size="small" onClick={() => handleOpenEdit(drive)} sx={{ color: '#64748b' }}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete Drive">
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteClick(drive.id, drive.companyName)}
                          sx={{ color: '#ef4444' }}
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>

                    <Button
                      variant="contained"
                      size="small"
                      endIcon={<ArrowForwardIcon />}
                      onClick={() => navigate(`/admin/placement-drives/${drive.id}`)}
                      sx={{
                        bgcolor: '#0284c7',
                        '&:hover': { bgcolor: '#0369a1' },
                        textTransform: 'none',
                        fontWeight: 700,
                        borderRadius: 1.5,
                        fontSize: '0.8rem',
                      }}
                    >
                      Manage & Select
                    </Button>
                  </Box>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Create / Edit Placement Drive Dialog */}
      <Dialog open={modalOpen} onClose={handleCloseModal} maxWidth="md" fullWidth>
        <form onSubmit={handleSubmit}>
          <DialogTitle sx={{ fontWeight: 800, color: '#14264B', borderBottom: '1px solid #E2E8F0' }}>
            {editingDrive ? `Edit Drive: ${editingDrive.companyName}` : 'Create New Placement Drive'}
          </DialogTitle>

          <DialogContent sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {formError && <Alert severity="error">{formError}</Alert>}

            <Typography variant="subtitle2" fontWeight={800} color="#0284c7" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
              1. Company & Job Information
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
                  placeholder="e.g. Amazon, Google, TCS Digital"
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
                  placeholder="e.g. Software Development Engineer"
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
                  placeholder="Overview of candidate responsibilities, expectations, and work scope..."
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

              {/* Eligible Departments Dropdown Multi-Select */}
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
                  <Typography variant="caption" fontWeight={700} sx={{ color: '#475569', display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    Eligible Departments:
                    {isLoadingDepartments && <CircularProgress size={12} sx={{ color: '#0284c7' }} />}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    {departmentOptions.length > 0 && (
                      <>
                        <Button
                          size="small"
                          variant="text"
                          onClick={() => setSelectedDepts(departmentOptions.map((d) => d.code))}
                          sx={{ p: 0, minWidth: 'auto', fontSize: '0.72rem', textTransform: 'none', color: '#0284c7', fontWeight: 600 }}
                        >
                          Select All ({departmentOptions.length})
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
                    id="eligible-departments-dropdown"
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
                        return (
                          <Typography variant="body2" sx={{ color: '#94a3b8', fontStyle: 'italic' }}>
                            Choose eligible departments from College Settings...
                          </Typography>
                        );
                      }
                      return (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, py: 0.25 }}>
                          {selected.map((code) => {
                            const dept = departmentOptions.find((d) => d.code === code);
                            const label = dept ? `${dept.code} - ${dept.name}` : code;
                            return (
                              <Chip
                                key={code}
                                label={label}
                                size="small"
                                onMouseDown={(e) => e.stopPropagation()}
                                onDelete={() => setSelectedDepts(selectedDepts.filter((c) => c !== code))}
                                sx={{
                                  height: 24,
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  bgcolor: '#e0f2fe',
                                  color: '#0369a1',
                                  borderColor: '#bae6fd',
                                  '& .MuiChip-deleteIcon': {
                                    color: '#0284c7',
                                    fontSize: 16,
                                    '&:hover': { color: '#0369a1' },
                                  },
                                }}
                              />
                            );
                          })}
                        </Box>
                      );
                    }}
                    MenuProps={{
                      PaperProps: {
                        sx: {
                          maxHeight: 320,
                          borderRadius: 2,
                          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.12), 0 8px 10px -6px rgba(0,0,0,0.08)',
                          border: '1px solid #e2e8f0',
                        },
                      },
                    }}
                  >
                    {departmentOptions.length === 0 ? (
                      <MenuItem disabled value="">
                        <Typography variant="body2" color="text.secondary">
                          No departments configured in College Settings.
                        </Typography>
                      </MenuItem>
                    ) : (
                      departmentOptions.map((dept) => {
                        const isSelected = selectedDepts.includes(dept.code);
                        return (
                          <MenuItem
                            key={dept.code}
                            value={dept.code}
                            sx={{
                              py: 0.75,
                              px: 1.5,
                              bgcolor: isSelected ? 'rgba(2, 132, 199, 0.08)' : 'transparent',
                              '&:hover': {
                                bgcolor: isSelected ? 'rgba(2, 132, 199, 0.14)' : 'rgba(0, 0, 0, 0.04)',
                              },
                            }}
                          >
                            <Checkbox
                              checked={isSelected}
                              size="small"
                              sx={{
                                mr: 1,
                                p: 0.5,
                                color: '#94a3b8',
                                '&.Mui-checked': { color: '#0284c7' },
                              }}
                            />
                            <ListItemText
                              primary={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Chip
                                    label={dept.code}
                                    size="small"
                                    sx={{
                                      height: 20,
                                      fontSize: '0.7rem',
                                      fontWeight: 700,
                                      bgcolor: isSelected ? '#0284c7' : '#f1f5f9',
                                      color: isSelected ? '#ffffff' : '#475569',
                                    }}
                                  />
                                  <Typography
                                    variant="body2"
                                    sx={{
                                      fontWeight: isSelected ? 700 : 500,
                                      color: isSelected ? '#0f172a' : '#334155',
                                    }}
                                  >
                                    {dept.name}
                                  </Typography>
                                </Box>
                              }
                            />
                          </MenuItem>
                        );
                      })
                    )}
                  </Select>
                </FormControl>
                <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mt: 0.5 }}>
                  {selectedDepts.length} of {departmentOptions.length} departments selected • Dynamically synced with College Settings
                </Typography>
              </Grid>

              {/* Eligible Graduation Batch Years Dropdown Multi-Select */}
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
                  <Typography variant="caption" fontWeight={700} sx={{ color: '#475569', display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    Eligible Graduation Batch Years:
                    {isLoadingClasses && <CircularProgress size={12} sx={{ color: '#0284c7' }} />}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    {batchOptions.length > 0 && (
                      <>
                        <Button
                          size="small"
                          variant="text"
                          onClick={() => setSelectedBatches(batchOptions)}
                          sx={{ p: 0, minWidth: 'auto', fontSize: '0.72rem', textTransform: 'none', color: '#0284c7', fontWeight: 600 }}
                        >
                          Select All ({batchOptions.length})
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
                    id="eligible-batches-dropdown"
                    multiple
                    displayEmpty
                    value={selectedBatches}
                    onChange={(e: SelectChangeEvent<number[]>) => {
                      const val = e.target.value;
                      const nums = (typeof val === 'string' ? val.split(',') : (val as number[])).map(Number);
                      setSelectedBatches(nums);
                    }}
                    input={<OutlinedInput />}
                    renderValue={(selected) => {
                      if (selected.length === 0) {
                        return (
                          <Typography variant="body2" sx={{ color: '#94a3b8', fontStyle: 'italic' }}>
                            Choose graduation batch years from College Settings...
                          </Typography>
                        );
                      }
                      return (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, py: 0.25 }}>
                          {selected.map((batch) => (
                            <Chip
                              key={batch}
                              label={`Class of ${batch}`}
                              size="small"
                              onMouseDown={(e) => e.stopPropagation()}
                              onDelete={() => setSelectedBatches(selectedBatches.filter((b) => b !== batch))}
                              sx={{
                                height: 24,
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                bgcolor: '#f1f5f9',
                                color: '#1e293b',
                                borderColor: '#cbd5e1',
                                '& .MuiChip-deleteIcon': {
                                  color: '#64748b',
                                  fontSize: 16,
                                  '&:hover': { color: '#0f172a' },
                                },
                              }}
                            />
                          ))}
                        </Box>
                      );
                    }}
                    MenuProps={{
                      PaperProps: {
                        sx: {
                          maxHeight: 280,
                          borderRadius: 2,
                          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.12), 0 8px 10px -6px rgba(0,0,0,0.08)',
                          border: '1px solid #e2e8f0',
                        },
                      },
                    }}
                  >
                    {batchOptions.length === 0 ? (
                      <MenuItem disabled value="">
                        <Typography variant="body2" color="text.secondary">
                          No graduation batch years configured in College Settings.
                        </Typography>
                      </MenuItem>
                    ) : (
                      batchOptions.map((batch) => {
                        const isSelected = selectedBatches.includes(batch);
                        return (
                          <MenuItem
                            key={batch}
                            value={batch}
                            sx={{
                              py: 0.75,
                              px: 1.5,
                              bgcolor: isSelected ? 'rgba(2, 132, 199, 0.08)' : 'transparent',
                              '&:hover': {
                                bgcolor: isSelected ? 'rgba(2, 132, 199, 0.14)' : 'rgba(0, 0, 0, 0.04)',
                              },
                            }}
                          >
                            <Checkbox
                              checked={isSelected}
                              size="small"
                              sx={{
                                mr: 1,
                                p: 0.5,
                                color: '#94a3b8',
                                '&.Mui-checked': { color: '#0284c7' },
                              }}
                            />
                            <ListItemText
                              primary={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Chip
                                    label={batch}
                                    size="small"
                                    sx={{
                                      height: 20,
                                      fontSize: '0.7rem',
                                      fontWeight: 700,
                                      bgcolor: isSelected ? '#0284c7' : '#f1f5f9',
                                      color: isSelected ? '#ffffff' : '#475569',
                                    }}
                                  />
                                  <Typography
                                    variant="body2"
                                    sx={{
                                      fontWeight: isSelected ? 700 : 500,
                                      color: isSelected ? '#0f172a' : '#334155',
                                    }}
                                  >
                                    Class of {batch}
                                  </Typography>
                                </Box>
                              }
                            />
                          </MenuItem>
                        );
                      })
                    )}
                  </Select>
                </FormControl>
                <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mt: 0.5 }}>
                  {selectedBatches.length} of {batchOptions.length} graduation years selected • Dynamically synced with College Settings
                </Typography>
              </Grid>
            </Grid>

            <Divider sx={{ my: 1 }} />

            {/* Required Skills Config */}
            <Typography variant="subtitle2" fontWeight={800} color="#0284c7" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
              4. Mandatory Skills & Proficiency Requirements
            </Typography>

            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
              <TextField
                size="small"
                label="Required Skill"
                placeholder="e.g. Python, SQL, Java, System Design"
                value={newSkillName}
                onChange={(e) => setNewSkillName(e.target.value)}
                sx={{ width: { xs: '100%', sm: 260 } }}
              />
              <TextField
                select
                size="small"
                label="Minimum Level"
                value={newSkillLevel}
                onChange={(e) => setNewSkillLevel(e.target.value)}
                sx={{ width: { xs: '100%', sm: 200 } }}
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
                Add Skill Rule
              </Button>
            </Box>

            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
              {requiredSkills.map((sk, index) => (
                <Chip
                  key={index}
                  label={`${sk.name} (Min Level: ${sk.minLevel})`}
                  onDelete={() => handleRemoveSkill(index)}
                  sx={{
                    bgcolor: '#f0f9ff',
                    border: '1px solid #bae6fd',
                    color: '#0369a1',
                    fontWeight: 600,
                  }}
                />
              ))}
            </Box>
          </DialogContent>

          <DialogActions sx={{ p: 2.5, borderTop: '1px solid #E2E8F0' }}>
            <Button onClick={handleCloseModal} sx={{ textTransform: 'none' }}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={saveMutation.isPending}
              sx={{
                bgcolor: '#0284c7',
                '&:hover': { bgcolor: '#0369a1' },
                textTransform: 'none',
                fontWeight: 700,
                borderRadius: 2,
                px: 3,
              }}
            >
              {saveMutation.isPending ? <CircularProgress size={20} color="inherit" /> : editingDrive ? 'Update Drive' : 'Create Drive'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => !deleteMutation.isPending && setDeleteConfirmOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 800, color: '#b91c1c', display: 'flex', alignItems: 'center', gap: 1 }}>
          <DeleteOutlineIcon color="error" />
          Delete Placement Drive
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" sx={{ color: '#334155', mb: 1.5 }}>
            Are you sure you want to permanently delete the placement drive for <strong>{driveToDelete?.name}</strong>?
          </Typography>
          <Alert severity="warning" sx={{ fontSize: '0.8rem' }}>
            This will remove this drive and all associated candidate registrations. This action cannot be undone.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => setDeleteConfirmOpen(false)}
            disabled={deleteMutation.isPending}
            sx={{ textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            disabled={deleteMutation.isPending}
            onClick={handleConfirmDelete}
            sx={{ textTransform: 'none', fontWeight: 700 }}
          >
            {deleteMutation.isPending ? <CircularProgress size={20} color="inherit" /> : 'Yes, Delete Drive'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar Notification */}
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
