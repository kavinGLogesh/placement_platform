import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Card,
  Grid,
  Chip,
  Button,
  TextField,
  InputAdornment,
  Tabs,
  Tab,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Divider,
  Paper,
  Tooltip,
  IconButton,
  Snackbar,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import WorkIcon from '@mui/icons-material/Work';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PeopleIcon from '@mui/icons-material/People';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import SendIcon from '@mui/icons-material/Send';
import CloseIcon from '@mui/icons-material/Close';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import RefreshIcon from '@mui/icons-material/Refresh';
import StarIcon from '@mui/icons-material/Star';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import LinkIcon from '@mui/icons-material/Link';
import {
  placementStudentService,
  StudentDriveListing,
} from '../../services/placement-student.service.js';

export const StudentDrivesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabParam = searchParams.get('tab');
  const initialTab = tabParam === 'applied' ? 2 : tabParam === 'eligible' ? 1 : 0;
  const [activeTab, setActiveTab] = useState<number>(initialTab);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDriveForApply, setSelectedDriveForApply] = useState<StudentDriveListing | null>(null);
  const [detailsDrive, setDetailsDrive] = useState<StudentDriveListing | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastSeverity, setToastSeverity] = useState<'success' | 'error' | 'info'>('success');

  // Fetch student placement drives
  const {
    data: drives = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['studentPlacementDrives'],
    queryFn: () => placementStudentService.getStudentDrives(),
    staleTime: 30_000,
  });

  // Apply mutation
  const applyMutation = useMutation({
    mutationFn: (driveId: string) => placementStudentService.applyForDrive(driveId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studentPlacementDrives'] });
      queryClient.invalidateQueries({ queryKey: ['studentNotifications'] });
      setToastSeverity('success');
      setToastMessage('Application submitted successfully! Check your notifications for confirmation.');
      setSelectedDriveForApply(null);
    },
    onError: (err: any) => {
      setToastSeverity('error');
      setToastMessage(err?.response?.data?.message || err?.message || 'Failed to submit application');
    },
  });

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
    const param = newValue === 2 ? 'applied' : newValue === 1 ? 'eligible' : 'all';
    setSearchParams({ tab: param });
  };

  // Metrics computation
  const metrics = useMemo(() => {
    const total = drives.length;
    const eligible = drives.filter((d) => d.isEligible).length;
    const applied = drives.filter((d) => d.isApplied).length;
    const selected = drives.filter((d) => d.currentStage === 'SELECTED').length;
    return { total, eligible, applied, selected };
  }, [drives]);

  // Filtered drives
  const filteredDrives = useMemo(() => {
    return drives.filter((item) => {
      // Tab filter
      if (activeTab === 1 && !item.isEligible) return false;
      if (activeTab === 2 && !item.isApplied) return false;

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesCompany = item.drive.companyName.toLowerCase().includes(q);
        const matchesRole = item.drive.jobRole.toLowerCase().includes(q);
        const matchesLoc = item.drive.location?.toLowerCase().includes(q) ?? false;
        if (!matchesCompany && !matchesRole && !matchesLoc) return false;
      }

      return true;
    });
  }, [drives, activeTab, searchQuery]);

  const getStageDisplay = (stage?: string) => {
    switch (stage) {
      case 'SHORTLISTED':
        return {
          label: 'Shortlisted by Placement Cell',
          color: '#b45309',
          bg: '#fef3c7',
          icon: <StarIcon sx={{ fontSize: 16 }} />,
        };
      case 'APPLIED':
        return {
          label: 'Application Confirmed / Under Review',
          color: '#4338ca',
          bg: '#e0e7ff',
          icon: <CheckCircleIcon sx={{ fontSize: 16 }} />,
        };
      case 'SELECTED':
        return { label: 'Offer Received / Selected', color: '#059669', bg: '#ecfdf5', icon: <EmojiEventsIcon sx={{ fontSize: 16 }} /> };
      case 'TECHNICAL_ROUND':
        return { label: 'Technical Interview Scheduled', color: '#7c3aed', bg: '#f5f3ff', icon: <WorkIcon sx={{ fontSize: 16 }} /> };
      case 'HR_ROUND':
        return { label: 'HR Interview Scheduled', color: '#0284c7', bg: '#f0f9ff', icon: <WorkIcon sx={{ fontSize: 16 }} /> };
      case 'ASSESSMENT_SHORTLISTED':
        return { label: 'Shortlisted for Next Round', color: '#0d9488', bg: '#f0fdfa', icon: <CheckCircleIcon sx={{ fontSize: 16 }} /> };
      case 'REJECTED':
        return { label: 'Not Selected', color: '#dc2626', bg: '#fef2f2', icon: <CancelIcon sx={{ fontSize: 16 }} /> };
      case 'REGISTERED':
      default:
        return { label: 'Application Submitted', color: '#2563eb', bg: '#eff6ff', icon: <CheckCircleIcon sx={{ fontSize: 16 }} /> };
    }
  };

  return (
    <Box sx={{ p: { xs: 2, sm: 3, md: 4 }, maxWidth: 1400, mx: 'auto' }}>
      {/* Page Header */}
      <Box sx={{ mb: 3.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5, flexWrap: 'wrap', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 42,
                height: 42,
                borderRadius: 2.5,
                bgcolor: '#0D948815',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#0D9488',
              }}
            >
              <WorkIcon sx={{ fontSize: 24 }} />
            </Box>
            <Box>
              <Typography variant="h5" fontWeight={800} sx={{ color: '#0f172a' }}>
                Campus Placement Drives
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b' }}>
                Real-time eligibility evaluation, verified company opportunities, and direct portal applications
              </Typography>
            </Box>
          </Box>
          <Tooltip title="Refresh placement drives">
            <IconButton
              onClick={() => refetch()}
              size="small"
              sx={{
                bgcolor: '#ffffff',
                border: '1px solid #E2E8F0',
                color: '#475569',
                '&:hover': { bgcolor: '#F8FAFC' },
              }}
            >
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Metric Cards Banner */}
      <Grid container spacing={2.5} sx={{ mb: 3.5 }}>
        <Grid item xs={6} sm={3}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 3,
              border: '1px solid #E2E8F0',
              bgcolor: '#ffffff',
            }}
          >
            <Typography variant="caption" fontWeight={700} sx={{ color: '#64748b', textTransform: 'uppercase' }}>
              Available Drives
            </Typography>
            <Typography variant="h4" fontWeight={800} sx={{ color: '#0f172a', mt: 0.5 }}>
              {metrics.total}
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={6} sm={3}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 3,
              border: '1px solid #A7F3D0',
              bgcolor: '#F0FDF4',
            }}
          >
            <Typography variant="caption" fontWeight={700} sx={{ color: '#047857', textTransform: 'uppercase' }}>
              Eligible For Me
            </Typography>
            <Typography variant="h4" fontWeight={800} sx={{ color: '#059669', mt: 0.5 }}>
              {metrics.eligible}
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={6} sm={3}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 3,
              border: '1px solid #BAE6FD',
              bgcolor: '#F0F9FF',
            }}
          >
            <Typography variant="caption" fontWeight={700} sx={{ color: '#0369a1', textTransform: 'uppercase' }}>
              My Applications
            </Typography>
            <Typography variant="h4" fontWeight={800} sx={{ color: '#0284c7', mt: 0.5 }}>
              {metrics.applied}
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={6} sm={3}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 3,
              border: '1px solid #FED7AA',
              bgcolor: '#FFF7ED',
            }}
          >
            <Typography variant="caption" fontWeight={700} sx={{ color: '#C2410C', textTransform: 'uppercase' }}>
              Offers Received
            </Typography>
            <Typography variant="h4" fontWeight={800} sx={{ color: '#EA580C', mt: 0.5 }}>
              {metrics.selected}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Control Bar: Tabs & Search */}
      <Card
        elevation={0}
        sx={{
          p: 2,
          mb: 3,
          borderRadius: 3,
          border: '1px solid #E2E8F0',
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'stretch', sm: 'center' },
          gap: 2,
        }}
      >
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{
            minHeight: 40,
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 700,
              fontSize: '0.875rem',
              minHeight: 40,
              px: 2,
            },
            '& .Mui-selected': {
              color: '#0D9488',
            },
            '& .MuiTabs-indicator': {
              bgcolor: '#0D9488',
              height: 3,
              borderRadius: '3px 3px 0 0',
            },
          }}
        >
          <Tab label={`All Drives (${metrics.total})`} />
          <Tab label={`Eligible For Me (${metrics.eligible})`} />
          <Tab label={`My Applications (${metrics.applied})`} />
        </Tabs>

        <TextField
          size="small"
          placeholder="Search company, job role, location..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ minWidth: { xs: '100%', sm: 320 } }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: '#94a3b8', fontSize: 20 }} />
              </InputAdornment>
            ),
          }}
        />
      </Card>

      {/* Main Content Area */}
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress size={42} sx={{ color: '#0D9488' }} />
        </Box>
      ) : isError ? (
        <Alert severity="error" sx={{ borderRadius: 2.5 }}>
          Could not load placement drives. Please verify your connection or try again.
        </Alert>
      ) : filteredDrives.length === 0 ? (
        <Card
          elevation={0}
          sx={{
            py: 8,
            px: 3,
            textAlign: 'center',
            borderRadius: 3,
            border: '1px dashed #cbd5e1',
            bgcolor: '#ffffff',
          }}
        >
          <WorkIcon sx={{ fontSize: 50, color: '#94a3b8', mb: 1.5 }} />
          <Typography variant="h6" fontWeight={700} sx={{ color: '#1e293b' }}>
            No placement drives found
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>
            {activeTab === 2
              ? "You haven't submitted any placement drive applications yet."
              : activeTab === 1
              ? 'No placement drives currently match your department and academic criteria.'
              : 'There are currently no active placement drives scheduled.'}
          </Typography>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {filteredDrives.map((item) => {
            const drive = item.drive;
            const isDeadlinePassed = new Date(drive.registrationDeadline).getTime() < Date.now();
            const stageBadge = getStageDisplay(item.currentStage);

            return (
              <Grid item xs={12} md={6} key={drive.id}>
                <Card
                  elevation={0}
                  sx={{
                    p: 3,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    borderRadius: 3,
                    border: '1px solid #E2E8F0',
                    transition: 'all 0.2s ease',
                    bgcolor: item.isApplied ? '#F8FAFC' : '#FFFFFF',
                    '&:hover': {
                      boxShadow: '0 8px 24px -4px rgba(15, 23, 42, 0.08)',
                      borderColor: '#CBD5E1',
                    },
                  }}
                >
                  <Box>
                    {/* Top row: Company, Role & Badges */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                        <Box
                          sx={{
                            width: 52,
                            height: 52,
                            borderRadius: 2.5,
                            bgcolor: '#F1F5F9',
                            border: '1px solid #E2E8F0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#0D9488',
                            fontWeight: 800,
                            fontSize: '1.25rem',
                          }}
                        >
                          {drive.companyName.charAt(0).toUpperCase()}
                        </Box>
                        <Box>
                          <Typography variant="h6" fontWeight={800} sx={{ color: '#0f172a', lineHeight: 1.2 }}>
                            {drive.companyName}
                          </Typography>
                          <Typography variant="body2" fontWeight={600} sx={{ color: '#0D9488', mt: 0.25 }}>
                            {drive.jobRole}
                          </Typography>
                        </Box>
                      </Box>

                      {/* Status Badges */}
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.75 }}>
                        {item.isApplied ? (
                          <Chip
                            size="small"
                            icon={stageBadge.icon}
                            label={stageBadge.label}
                            sx={{
                              fontWeight: 800,
                              fontSize: '0.75rem',
                              bgcolor: stageBadge.bg,
                              color: stageBadge.color,
                              border: `1px solid ${stageBadge.color}30`,
                            }}
                          />
                        ) : item.isEligible ? (
                          <Chip
                            size="small"
                            icon={<CheckCircleIcon sx={{ fontSize: 15 }} />}
                            label="Eligible"
                            sx={{
                              fontWeight: 800,
                              fontSize: '0.75rem',
                              bgcolor: '#ecfdf5',
                              color: '#059669',
                              border: '1px solid #a7f3d0',
                            }}
                          />
                        ) : item.category === 'MISSING_DATA' ? (
                          <Chip
                            size="small"
                            icon={<HelpOutlineIcon sx={{ fontSize: 15 }} />}
                            label="Missing Academic Info"
                            sx={{
                              fontWeight: 800,
                              fontSize: '0.75rem',
                              bgcolor: '#fffbeb',
                              color: '#d97706',
                              border: '1px solid #fde68a',
                            }}
                          />
                        ) : (
                          <Chip
                            size="small"
                            icon={<CancelIcon sx={{ fontSize: 15 }} />}
                            label="Not Eligible"
                            sx={{
                              fontWeight: 800,
                              fontSize: '0.75rem',
                              bgcolor: '#fef2f2',
                              color: '#dc2626',
                              border: '1px solid #fecaca',
                            }}
                          />
                        )}

                        {drive.packageDetails && (
                          <Chip
                            size="small"
                            label={drive.packageDetails}
                            sx={{
                              fontWeight: 700,
                              fontSize: '0.72rem',
                              bgcolor: '#F1F5F9',
                              color: '#334155',
                            }}
                          />
                        )}
                      </Box>
                    </Box>

                    {/* Metadata Grid */}
                    <Grid container spacing={1.5} sx={{ mb: 2, color: '#64748b', fontSize: '0.825rem' }}>
                      {drive.location && (
                        <Grid item xs={6} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                          <LocationOnIcon sx={{ fontSize: 16, color: '#94a3b8' }} />
                          <Typography variant="caption" fontWeight={600} sx={{ color: '#475569' }}>
                            {drive.location}
                          </Typography>
                        </Grid>
                      )}
                      <Grid item xs={6} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <PeopleIcon sx={{ fontSize: 16, color: '#94a3b8' }} />
                        <Typography variant="caption" fontWeight={600} sx={{ color: '#475569' }}>
                          {drive.vacancies ? `${drive.vacancies} Vacancies` : 'Open Vacancies'}
                        </Typography>
                      </Grid>
                      <Grid item xs={6} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <CalendarMonthIcon sx={{ fontSize: 16, color: '#94a3b8' }} />
                        <Typography variant="caption" fontWeight={600} sx={{ color: '#475569' }}>
                          Drive: {new Date(drive.driveDate).toLocaleDateString()}
                        </Typography>
                      </Grid>
                      <Grid item xs={6} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <AccessTimeIcon sx={{ fontSize: 16, color: isDeadlinePassed ? '#dc2626' : '#94a3b8' }} />
                        <Typography
                          variant="caption"
                          fontWeight={700}
                          sx={{ color: isDeadlinePassed ? '#dc2626' : '#475569' }}
                        >
                          Deadline: {new Date(drive.registrationDeadline).toLocaleDateString()}
                        </Typography>
                      </Grid>
                    </Grid>

                    {/* Shortlisted Candidate Alert Banner */}
                    {item.isShortlisted && (
                      <Box
                        sx={{
                          p: 2,
                          mb: 2,
                          borderRadius: 2.5,
                          bgcolor: '#FEFCE8',
                          border: '1px solid #FEF08A',
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
                          <StarIcon sx={{ fontSize: 18, color: '#A16207' }} />
                          <Typography variant="subtitle2" fontWeight={800} sx={{ color: '#A16207' }}>
                            You are Shortlisted for this Drive!
                          </Typography>
                        </Box>
                        {drive.instructions && (
                          <Box sx={{ mb: 1 }}>
                            <Typography variant="caption" fontWeight={700} sx={{ color: '#854D0E', display: 'block' }}>
                              Placement Cell Instructions:
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#713F12', whiteSpace: 'pre-line' }}>
                              {drive.instructions}
                            </Typography>
                          </Box>
                        )}
                        {drive.registrationLink && (
                          <Button
                            size="small"
                            variant="outlined"
                            href={
                              drive.registrationLink.startsWith('http')
                                ? drive.registrationLink
                                : `https://${drive.registrationLink}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            startIcon={<LinkIcon sx={{ fontSize: 14 }} />}
                            endIcon={<OpenInNewIcon sx={{ fontSize: 13 }} />}
                            sx={{
                              textTransform: 'none',
                              fontSize: '0.72rem',
                              py: 0.25,
                              px: 1.5,
                              borderColor: '#FDE047',
                              color: '#854D0E',
                              fontWeight: 700,
                              '&:hover': { borderColor: '#EAB308', bgcolor: '#FEF9C3' },
                            }}
                          >
                            Open Registration Link
                          </Button>
                        )}
                      </Box>
                    )}

                    {/* Criteria / Failure Notice */}
                    {!item.isEligible && item.failureReasons.length > 0 && (
                      <Box
                        sx={{
                          p: 1.5,
                          mb: 2,
                          borderRadius: 2,
                          bgcolor: '#FEF2F2',
                          border: '1px solid #FECACA',
                        }}
                      >
                        <Typography variant="caption" fontWeight={700} sx={{ color: '#991B1B', display: 'block', mb: 0.25 }}>
                          Criteria Not Met:
                        </Typography>
                        {item.failureReasons.slice(0, 2).map((reason, idx) => (
                          <Typography key={idx} variant="caption" sx={{ color: '#B91C1C', display: 'block' }}>
                            • {reason}
                          </Typography>
                        ))}
                        {item.failureReasons.length > 2 && (
                          <Typography variant="caption" sx={{ color: '#991B1B', fontWeight: 600 }}>
                            + {item.failureReasons.length - 2} more criteria
                          </Typography>
                        )}
                      </Box>
                    )}

                    {item.stageRemarks && item.isApplied && (
                      <Box
                        sx={{
                          p: 1.5,
                          mb: 2,
                          borderRadius: 2,
                          bgcolor: '#F8FAFC',
                          border: '1px solid #E2E8F0',
                        }}
                      >
                        <Typography variant="caption" fontWeight={700} sx={{ color: '#475569', display: 'block', mb: 0.25 }}>
                          Recruitment Remarks:
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#334155' }}>
                          {item.stageRemarks}
                        </Typography>
                      </Box>
                    )}
                  </Box>

                  {/* Actions Bar */}
                  <Divider sx={{ my: 1.5 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1.5 }}>
                    <Button
                      size="small"
                      variant="text"
                      onClick={() => setDetailsDrive(item)}
                      sx={{ textTransform: 'none', color: '#475569', fontWeight: 700, fontSize: '0.8rem' }}
                    >
                      View Details
                    </Button>

                    {item.isShortlisted ? (
                      <Button
                        size="small"
                        variant="contained"
                        disabled={isDeadlinePassed || applyMutation.isPending}
                        onClick={() => setSelectedDriveForApply(item)}
                        startIcon={<StarIcon sx={{ fontSize: 16 }} />}
                        sx={{
                          bgcolor: '#b45309',
                          '&:hover': { bgcolor: '#92400e' },
                          textTransform: 'none',
                          fontWeight: 700,
                          borderRadius: 2,
                          px: 2.5,
                        }}
                      >
                        {isDeadlinePassed ? 'Deadline Closed' : 'Confirm Application'}
                      </Button>
                    ) : item.isApplied ? (
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                          Applied on: {item.appliedAt ? new Date(item.appliedAt).toLocaleDateString() : 'Active'}
                        </Typography>
                      </Box>
                    ) : item.isEligible ? (
                      <Button
                        size="small"
                        variant="contained"
                        disabled={isDeadlinePassed || applyMutation.isPending}
                        onClick={() => setSelectedDriveForApply(item)}
                        startIcon={<SendIcon sx={{ fontSize: 16 }} />}
                        sx={{
                          bgcolor: '#0D9488',
                          '&:hover': { bgcolor: '#0f766e' },
                          textTransform: 'none',
                          fontWeight: 700,
                          borderRadius: 2,
                          px: 2.5,
                        }}
                      >
                        {isDeadlinePassed ? 'Deadline Closed' : 'Apply Now'}
                      </Button>
                    ) : (
                      <Tooltip title={item.failureReasons.join(', ') || 'Academic or skill criteria not satisfied'}>
                        <span>
                          <Button
                            size="small"
                            variant="outlined"
                            disabled
                            sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 700 }}
                          >
                            Ineligible
                          </Button>
                        </span>
                      </Tooltip>
                    )}
                  </Box>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Direct Application Confirmation Modal */}
      <Dialog
        open={!!selectedDriveForApply}
        onClose={() => setSelectedDriveForApply(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 800, color: '#0f172a' }}>
          {selectedDriveForApply?.isShortlisted
            ? 'Confirm Application (Shortlisted Candidate)'
            : 'Confirm Application Submission'}
        </DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {selectedDriveForApply && (
            <>
              <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2.5, border: '1px solid #e2e8f0' }}>
                <Typography variant="h6" fontWeight={800} sx={{ color: '#0D9488' }}>
                  {selectedDriveForApply.drive.companyName}
                </Typography>
                <Typography variant="body2" fontWeight={700} sx={{ color: '#1e293b' }}>
                  Role: {selectedDriveForApply.drive.jobRole}
                </Typography>
                {selectedDriveForApply.drive.packageDetails && (
                  <Typography variant="caption" sx={{ color: '#475569', display: 'block', mt: 0.5 }}>
                    CTC: <strong>{selectedDriveForApply.drive.packageDetails}</strong> | Location: {selectedDriveForApply.drive.location || 'Pan India'}
                  </Typography>
                )}
              </Box>

              {selectedDriveForApply.isShortlisted && (
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    bgcolor: '#FEFCE8',
                    border: '1px solid #FEF08A',
                  }}
                >
                  <Typography variant="subtitle2" fontWeight={800} sx={{ color: '#A16207', mb: 0.5 }}>
                    Shortlisted Application Confirmation
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#854D0E', mb: 1 }}>
                    You have been shortlisted by your placement administration for this recruitment drive.
                  </Typography>
                  {selectedDriveForApply.drive.instructions && (
                    <Box sx={{ p: 1.5, bgcolor: '#ffffff', borderRadius: 1.5, border: '1px solid #FEF08A', mb: 1 }}>
                      <Typography variant="caption" fontWeight={700} sx={{ color: '#713F12', display: 'block' }}>
                        Instructions:
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#854D0E', whiteSpace: 'pre-line' }}>
                        {selectedDriveForApply.drive.instructions}
                      </Typography>
                    </Box>
                  )}
                  {selectedDriveForApply.drive.registrationLink && (
                    <Button
                      size="small"
                      variant="outlined"
                      href={
                        selectedDriveForApply.drive.registrationLink.startsWith('http')
                          ? selectedDriveForApply.drive.registrationLink
                          : `https://${selectedDriveForApply.drive.registrationLink}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      startIcon={<LinkIcon sx={{ fontSize: 14 }} />}
                      endIcon={<OpenInNewIcon sx={{ fontSize: 13 }} />}
                      sx={{
                        textTransform: 'none',
                        fontSize: '0.75rem',
                        py: 0.3,
                        px: 1.5,
                        borderColor: '#EAB308',
                        color: '#854D0E',
                        fontWeight: 700,
                      }}
                    >
                      Open Official Registration Link
                    </Button>
                  )}
                </Box>
              )}

              <Alert severity="success" sx={{ borderRadius: 2 }}>
                <strong>Eligibility Confirmed:</strong> You meet all academic, CGPA, department, and skill criteria configured for this placement drive.
              </Alert>

              <Typography variant="body2" sx={{ color: '#475569', lineHeight: 1.5 }}>
                By clicking <strong>{selectedDriveForApply.isShortlisted ? 'Confirm & Submit Application' : 'Submit Application'}</strong>, your verified student profile, academic records, CGPA, and competency skills will be confirmed for the recruitment process.
              </Typography>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => setSelectedDriveForApply(null)}
            sx={{ textTransform: 'none', color: '#64748b', fontWeight: 600 }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={applyMutation.isPending}
            onClick={() => {
              if (selectedDriveForApply) {
                applyMutation.mutate(selectedDriveForApply.drive.id);
              }
            }}
            startIcon={
              applyMutation.isPending ? (
                <CircularProgress size={16} color="inherit" />
              ) : selectedDriveForApply?.isShortlisted ? (
                <StarIcon sx={{ fontSize: 16 }} />
              ) : (
                <SendIcon sx={{ fontSize: 16 }} />
              )
            }
            sx={{
              bgcolor: selectedDriveForApply?.isShortlisted ? '#b45309' : '#0D9488',
              '&:hover': {
                bgcolor: selectedDriveForApply?.isShortlisted ? '#92400e' : '#0f766e',
              },
              textTransform: 'none',
              fontWeight: 700,
              borderRadius: 2,
              px: 3,
            }}
          >
            {applyMutation.isPending
              ? 'Submitting...'
              : selectedDriveForApply?.isShortlisted
              ? 'Confirm Application'
              : 'Submit Application'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Drive Details & Criteria Breakdown Dialog */}
      <Dialog
        open={!!detailsDrive}
        onClose={() => setDetailsDrive(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" fontWeight={800} sx={{ color: '#0f172a' }}>
            {detailsDrive?.drive.companyName} - Placement Details
          </Typography>
          <IconButton onClick={() => setDetailsDrive(null)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {detailsDrive && (
            <>
              {/* Overview Details */}
              <Grid container spacing={2}>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" sx={{ color: '#64748b' }}>Designation</Typography>
                  <Typography variant="body2" fontWeight={700}>{detailsDrive.drive.jobRole}</Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" sx={{ color: '#64748b' }}>Package Details</Typography>
                  <Typography variant="body2" fontWeight={700}>{detailsDrive.drive.packageDetails || 'Competitive'}</Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" sx={{ color: '#64748b' }}>Drive Date</Typography>
                  <Typography variant="body2" fontWeight={700}>
                    {new Date(detailsDrive.drive.driveDate).toLocaleDateString()}
                  </Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" sx={{ color: '#64748b' }}>Application Deadline</Typography>
                  <Typography variant="body2" fontWeight={700}>
                    {new Date(detailsDrive.drive.registrationDeadline).toLocaleDateString()}
                  </Typography>
                </Grid>
              </Grid>

              {detailsDrive.drive.jobDescription && (
                <Box>
                  <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#0f172a', mb: 0.5 }}>
                    Job Description & Overview
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#475569', whiteSpace: 'pre-wrap' }}>
                    {detailsDrive.drive.jobDescription}
                  </Typography>
                </Box>
              )}

              {(detailsDrive.drive.instructions || detailsDrive.drive.registrationLink) && (
                <Box sx={{ p: 2, bgcolor: '#fefce8', border: '1px solid #fef08a', borderRadius: 2 }}>
                  <Typography variant="subtitle2" fontWeight={800} sx={{ color: '#a16207', mb: 0.5 }}>
                    Registration Instructions & Guidelines
                  </Typography>
                  {detailsDrive.drive.instructions && (
                    <Typography variant="body2" sx={{ color: '#854d0e', whiteSpace: 'pre-line', mb: 1 }}>
                      {detailsDrive.drive.instructions}
                    </Typography>
                  )}
                  {detailsDrive.drive.registrationLink && (
                    <Button
                      size="small"
                      variant="outlined"
                      href={
                        detailsDrive.drive.registrationLink.startsWith('http')
                          ? detailsDrive.drive.registrationLink
                          : `https://${detailsDrive.drive.registrationLink}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      startIcon={<LinkIcon sx={{ fontSize: 14 }} />}
                      endIcon={<OpenInNewIcon sx={{ fontSize: 13 }} />}
                      sx={{
                        textTransform: 'none',
                        fontSize: '0.75rem',
                        py: 0.3,
                        px: 1.5,
                        borderColor: '#eab308',
                        color: '#854d0e',
                        fontWeight: 700,
                      }}
                    >
                      Open Official Registration Link
                    </Button>
                  )}
                </Box>
              )}

              {/* Eligibility Thresholds */}
              <Box>
                <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#0f172a', mb: 1 }}>
                  Configured Criteria & Thresholds
                </Typography>
                <Grid container spacing={1.5}>
                  <Grid item xs={6} sm={3}>
                    <Paper elevation={0} sx={{ p: 1.5, bgcolor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 2 }}>
                      <Typography variant="caption" sx={{ color: '#64748b' }}>Min CGPA</Typography>
                      <Typography variant="body2" fontWeight={700}>
                        {detailsDrive.drive.minCgpa != null ? detailsDrive.drive.minCgpa : 'No minimum'}
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Paper elevation={0} sx={{ p: 1.5, bgcolor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 2 }}>
                      <Typography variant="caption" sx={{ color: '#64748b' }}>Min 10th Marks</Typography>
                      <Typography variant="body2" fontWeight={700}>
                        {detailsDrive.drive.minTenthPercentage ? `${detailsDrive.drive.minTenthPercentage}%` : 'No minimum'}
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Paper elevation={0} sx={{ p: 1.5, bgcolor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 2 }}>
                      <Typography variant="caption" sx={{ color: '#64748b' }}>Min 12th Marks</Typography>
                      <Typography variant="body2" fontWeight={700}>
                        {detailsDrive.drive.minTwelfthPercentage ? `${detailsDrive.drive.minTwelfthPercentage}%` : 'No minimum'}
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Paper elevation={0} sx={{ p: 1.5, bgcolor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 2 }}>
                      <Typography variant="caption" sx={{ color: '#64748b' }}>Max Backlogs</Typography>
                      <Typography variant="body2" fontWeight={700}>
                        {detailsDrive.drive.maxActiveBacklogs ?? 0}
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </Box>

              {/* Personal Status Breakdown */}
              <Box sx={{ p: 2, bgcolor: detailsDrive.isEligible ? '#ecfdf5' : '#fef2f2', borderRadius: 2.5 }}>
                <Typography
                  variant="subtitle2"
                  fontWeight={800}
                  sx={{ color: detailsDrive.isEligible ? '#065f46' : '#991b1b', mb: 0.5 }}
                >
                  Your Eligibility Evaluation: {detailsDrive.isEligible ? 'ELIGIBLE' : 'NOT ELIGIBLE'}
                </Typography>
                {detailsDrive.isEligible ? (
                  <Typography variant="body2" sx={{ color: '#047857' }}>
                    You fulfill all requirements for this placement drive. You can apply directly through this portal.
                  </Typography>
                ) : (
                  <Box sx={{ mt: 0.5 }}>
                    {detailsDrive.failureReasons.map((r, i) => (
                      <Typography key={i} variant="caption" sx={{ color: '#b91c1c', display: 'block' }}>
                        • {r}
                      </Typography>
                    ))}
                  </Box>
                )}
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDetailsDrive(null)} sx={{ textTransform: 'none' }}>
            Close
          </Button>
          {detailsDrive && detailsDrive.isEligible && !detailsDrive.isApplied && (
            <Button
              variant="contained"
              onClick={() => {
                setSelectedDriveForApply(detailsDrive);
                setDetailsDrive(null);
              }}
              sx={{ bgcolor: '#0D9488', textTransform: 'none', fontWeight: 700 }}
            >
              Apply Now
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Global Snackbar Toast */}
      <Snackbar
        open={!!toastMessage}
        autoHideDuration={4000}
        onClose={() => setToastMessage(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setToastMessage(null)}
          severity={toastSeverity}
          sx={{ width: '100%', borderRadius: 2, fontWeight: 600 }}
        >
          {toastMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};
