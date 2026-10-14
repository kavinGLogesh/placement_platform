import React, { useState } from 'react';
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
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
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
import {
  PlacementDrive,
  CreatePlacementDriveInput,
  DriveStatus,
  RequiredSkillCriterion,
} from '../../types/placement-drive.types.js';

const AVAILABLE_DEPARTMENTS = [
  { code: 'CSE', name: 'Computer Science and Engineering' },
  { code: 'ECE', name: 'Electronics and Communication Engineering' },
  { code: 'IT', name: 'Information Technology' },
  { code: 'MECH', name: 'Mechanical Engineering' },
  { code: 'EEE', name: 'Electrical & Electronics Engineering' },
  { code: 'CIVIL', name: 'Civil Engineering' },
];

const AVAILABLE_BATCHES = [2024, 2025, 2026, 2027];

const DEFAULT_STAGES = [
  'Online Coding Assessment',
  'Technical Interview Round 1',
  'Technical Interview Round 2',
  'HR & Leadership Round',
];

export const PlacementDrivesPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Dialog State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDrive, setEditingDrive] = useState<PlacementDrive | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Form Fields State
  const [companyName, setCompanyName] = useState('');
  const [jobRole, setJobRole] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [location, setLocation] = useState('');
  const [packageDetails, setPackageDetails] = useState('');
  const [vacancies, setVacancies] = useState<number>(5);
  const [driveDate, setDriveDate] = useState('2026-11-20');
  const [registrationDeadline, setRegistrationDeadline] = useState('2026-11-15');
  const [status, setStatus] = useState<DriveStatus>('UPCOMING');
  const [minTenthPercentage, setMinTenthPercentage] = useState<number>(75);
  const [minTwelfthPercentage, setMinTwelfthPercentage] = useState<number>(75);
  const [minCgpa, setMinCgpa] = useState<number>(7.5);
  const [maxActiveBacklogs, setMaxActiveBacklogs] = useState<number>(0);
  const [selectedDepts, setSelectedDepts] = useState<string[]>(['CSE', 'ECE', 'IT']);
  const [selectedBatches, setSelectedBatches] = useState<number[]>([2026]);

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

  // Create / Update Mutation
  const saveMutation = useMutation({
    mutationFn: (payload: CreatePlacementDriveInput) => {
      if (editingDrive) {
        return placementDriveService.updateDrive(editingDrive.id, payload);
      }
      return placementDriveService.createDrive(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['placement-drives'] });
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
    },
  });

  const handleOpenCreate = () => {
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
    setMinTenthPercentage(70);
    setMinTwelfthPercentage(70);
    setMinCgpa(7.5);
    setMaxActiveBacklogs(0);
    setSelectedDepts(['CSE', 'ECE', 'IT']);
    setSelectedBatches([2026]);
    setRequiredSkills([
      { name: 'Python Programming', minLevel: 'INTERMEDIATE' },
      { name: 'Data Structures & Algorithms', minLevel: 'INTERMEDIATE' },
    ]);
    setFormError(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (drive: PlacementDrive) => {
    setEditingDrive(drive);
    setCompanyName(drive.companyName);
    setJobRole(drive.jobRole);
    setJobDescription(drive.jobDescription || '');
    setLocation(drive.location || '');
    setPackageDetails(drive.packageDetails || '');
    setVacancies(drive.vacancies || 1);
    setDriveDate(new Date(drive.driveDate).toISOString().split('T')[0]);
    setRegistrationDeadline(new Date(drive.registrationDeadline).toISOString().split('T')[0]);
    setStatus(drive.status);
    setMinTenthPercentage(drive.minTenthPercentage ?? 70);
    setMinTwelfthPercentage(drive.minTwelfthPercentage ?? 70);
    setMinCgpa(drive.minCgpa ?? 7.5);
    setMaxActiveBacklogs(drive.maxActiveBacklogs ?? 0);
    setSelectedDepts(drive.eligibleDepartments || ['CSE']);
    setSelectedBatches(drive.eligibleBatchYears || [2026]);
    setRequiredSkills(drive.requiredSkills || []);
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

    const payload: CreatePlacementDriveInput = {
      companyName: companyName.trim(),
      jobRole: jobRole.trim(),
      jobDescription: jobDescription.trim() || undefined,
      location: location.trim() || undefined,
      packageDetails: packageDetails.trim() || undefined,
      vacancies: Number(vacancies),
      driveDate: new Date(driveDate).toISOString(),
      registrationDeadline: new Date(registrationDeadline).toISOString(),
      status,
      minTenthPercentage: Number(minTenthPercentage),
      minTwelfthPercentage: Number(minTwelfthPercentage),
      minCgpa: Number(minCgpa),
      maxActiveBacklogs: Number(maxActiveBacklogs),
      eligibleDepartments: selectedDepts,
      eligibleBatchYears: selectedBatches,
      requiredSkills,
      selectionProcess: DEFAULT_STAGES,
    };

    saveMutation.mutate(payload);
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete the placement drive for "${name}"?`)) {
      deleteMutation.mutate(id);
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
          onChange={(_, val) => setActiveTab(val)}
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
                          onClick={() => handleDelete(drive.id, drive.companyName)}
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
                  value={vacancies}
                  onChange={(e) => setVacancies(Number(e.target.value))}
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
                  value={minTenthPercentage}
                  onChange={(e) => setMinTenthPercentage(Number(e.target.value))}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField
                  label="Min 12th Percentage (%)"
                  type="number"
                  fullWidth
                  size="small"
                  value={minTwelfthPercentage}
                  onChange={(e) => setMinTwelfthPercentage(Number(e.target.value))}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField
                  label="Min Current CGPA"
                  type="number"
                  inputProps={{ step: 0.1, min: 0, max: 10 }}
                  fullWidth
                  size="small"
                  value={minCgpa}
                  onChange={(e) => setMinCgpa(Number(e.target.value))}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField
                  label="Max Active Backlogs"
                  type="number"
                  fullWidth
                  size="small"
                  value={maxActiveBacklogs}
                  onChange={(e) => setMaxActiveBacklogs(Number(e.target.value))}
                />
              </Grid>

              {/* Department Checkboxes */}
              <Grid item xs={12}>
                <Typography variant="caption" fontWeight={700} sx={{ color: '#475569', display: 'block', mb: 0.5 }}>
                  Eligible Departments:
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {AVAILABLE_DEPARTMENTS.map((dept) => {
                    const isSelected = selectedDepts.includes(dept.code);
                    return (
                      <Chip
                        key={dept.code}
                        label={`${dept.code} - ${dept.name}`}
                        clickable
                        color={isSelected ? 'primary' : 'default'}
                        variant={isSelected ? 'filled' : 'outlined'}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedDepts(selectedDepts.filter((c) => c !== dept.code));
                          } else {
                            setSelectedDepts([...selectedDepts, dept.code]);
                          }
                        }}
                      />
                    );
                  })}
                </Box>
              </Grid>

              {/* Batch Years */}
              <Grid item xs={12}>
                <Typography variant="caption" fontWeight={700} sx={{ color: '#475569', display: 'block', mb: 0.5 }}>
                  Eligible Graduation Batch Years:
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  {AVAILABLE_BATCHES.map((batch) => {
                    const isSelected = selectedBatches.includes(batch);
                    return (
                      <Chip
                        key={batch}
                        label={`Class of ${batch}`}
                        clickable
                        color={isSelected ? 'primary' : 'default'}
                        variant={isSelected ? 'filled' : 'outlined'}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedBatches(selectedBatches.filter((b) => b !== batch));
                          } else {
                            setSelectedBatches([...selectedBatches, batch]);
                          }
                        }}
                      />
                    );
                  })}
                </Box>
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
    </Box>
  );
};
