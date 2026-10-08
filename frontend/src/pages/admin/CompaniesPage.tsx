import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Alert,
  Chip,
  Grid,
  Switch,
  FormControlLabel,
  InputAdornment,
  Tabs,
  Tab,
  Paper,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import BusinessIcon from '@mui/icons-material/Business';
import PostAddIcon from '@mui/icons-material/PostAdd';
import QuizIcon from '@mui/icons-material/Quiz';
import AssignmentIcon from '@mui/icons-material/Assignment';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import LanguageIcon from '@mui/icons-material/Language';
import LayersIcon from '@mui/icons-material/Layers';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import InsightsIcon from '@mui/icons-material/Insights';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import BlockIcon from '@mui/icons-material/Block';
import { DataTable, Column } from '../../components/management/DataTable.js';
import { ConfirmDialog } from '../../components/management/ConfirmDialog.js';
import { companyService } from '../../services/company.service.js';
import { CompanyDto, CreateCompanyDto, UpdateCompanyDto } from '../../types/company.types.js';
import { CompanyIntelligenceDialog } from '../../components/company/CompanyIntelligenceDialog.js';
import { CompanyQuestionUploadDialog } from '../../components/company/CompanyQuestionUploadDialog.js';
import { DuplicateReviewDialog } from '../../components/company/DuplicateReviewDialog.js';

const PRESET_COMPANIES = [
  {
    code: 'TCS',
    name: 'Tata Consultancy Services',
    description: 'NQT (National Qualifier Test) preparation covering Numerical Ability, Reasoning, Verbal, and Hands-on Coding.',
    website: 'https://www.tcs.com',
  },
  {
    code: 'WIPRO',
    name: 'Wipro Limited',
    description: 'Elite National Talent Hunt & Velocity preparation pattern including Quantitative, Logical, English, and Coding.',
    website: 'https://www.wipro.com',
  },
  {
    code: 'CTS',
    name: 'Cognizant Technology Solutions',
    description: 'GenC & GenC Next recruitment track with Analytical, Quantitative, Verbal ability and Technical assessments.',
    website: 'https://www.cognizant.com',
  },
  {
    code: 'INFY',
    name: 'Infosys Limited',
    description: 'InfyTQ & Campus Connect aptitude, pseudocode, reasoning, and algorithmic problem solving.',
    website: 'https://www.infosys.com',
  },
  {
    code: 'ACCN',
    name: 'Accenture',
    description: 'Cognitive and Technical Assessment covering Critical Thinking, Abstract Reasoning, and Coding Challenges.',
    website: 'https://www.accenture.com',
  },
  {
    code: 'HCL',
    name: 'HCL Technologies',
    description: 'First Careers recruitment pattern including Logical reasoning, Quantitative ability, and Domain fundamentals.',
    website: 'https://www.hcltech.com',
  },
];

export const CompaniesPage: React.FC = () => {
  const navigate = useNavigate();

  const [companies, setCompanies] = useState<CompanyDto[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Active View Tab (0: Corporate Directory, 1: Recruitment Workflow Guide)
  const [activeTab, setActiveTab] = useState(0);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Add / Edit Dialog State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingCompany, setEditingCompany] = useState<CompanyDto | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    website: '',
    logoUrl: '',
    isActive: true,
  });
  const [dialogError, setDialogError] = useState<string | null>(null);

  // Safe Deletion & Deactivation Dialogs
  const [deleteTarget, setDeleteTarget] = useState<CompanyDto | null>(null);
  const [deactivatePromptTarget, setDeactivatePromptTarget] = useState<CompanyDto | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Intelligence & Upload Dialog States
  const [intelligenceTarget, setIntelligenceTarget] = useState<CompanyDto | null>(null);
  const [uploadTarget, setUploadTarget] = useState<CompanyDto | null>(null);
  const [duplicatesTarget, setDuplicatesTarget] = useState<CompanyDto | null>(null);

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filters = {
        search: search.trim() || undefined,
        isActive: activeFilter === 'ALL' ? undefined : activeFilter === 'ACTIVE',
        page: page + 1,
        limit: rowsPerPage,
        sortBy: 'name' as const,
        sortOrder: 'asc' as const,
      };
      const result = await companyService.getCompanies(filters);
      setCompanies(Array.isArray(result?.data) ? result.data : []);
      setTotalCount(result?.pagination?.totalCount ?? (Array.isArray(result?.data) ? result.data.length : 0));
    } catch (err: unknown) {
      setCompanies([]);
      setTotalCount(0);
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to load companies';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [search, activeFilter, page, rowsPerPage]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const handleOpenDialog = (comp?: CompanyDto) => {
    setDialogError(null);
    if (comp) {
      setEditingCompany(comp);
      setFormData({
        code: comp.code,
        name: comp.name,
        description: comp.description || '',
        website: comp.website || '',
        logoUrl: comp.logoUrl || '',
        isActive: comp.isActive,
      });
    } else {
      setEditingCompany(null);
      setFormData({
        code: '',
        name: '',
        description: '',
        website: '',
        logoUrl: '',
        isActive: true,
      });
    }
    setDialogOpen(true);
  };

  const handleApplyPreset = (preset: (typeof PRESET_COMPANIES)[0]) => {
    setDialogError(null);
    setEditingCompany(null);
    setFormData({
      code: preset.code,
      name: preset.name,
      description: preset.description,
      website: preset.website,
      logoUrl: '',
      isActive: true,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.code.trim()) {
      setDialogError('Company code is required (e.g. TCS)');
      return;
    }
    if (!formData.name.trim()) {
      setDialogError('Company name is required');
      return;
    }

    setSaving(true);
    setDialogError(null);

    try {
      if (editingCompany) {
        const payload: UpdateCompanyDto = {
          code: formData.code.trim().toUpperCase(),
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          website: formData.website.trim() || null,
          logoUrl: formData.logoUrl.trim() || null,
          isActive: formData.isActive,
        };
        await companyService.updateCompany(editingCompany.id, payload);
        setSuccessMessage(`Company "${payload.name}" updated successfully.`);
      } else {
        const payload: CreateCompanyDto = {
          code: formData.code.trim().toUpperCase(),
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          website: formData.website.trim() || null,
          logoUrl: formData.logoUrl.trim() || null,
          isActive: formData.isActive,
        };
        await companyService.createCompany(payload);
        setSuccessMessage(`Company "${payload.name}" added successfully.`);
      }
      setDialogOpen(false);
      await fetchCompanies();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to save company';
      setDialogError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (comp: CompanyDto, newStatus: boolean) => {
    try {
      await companyService.updateStatus(comp.id, newStatus);
      setSuccessMessage(`Company "${comp.name}" ${newStatus ? 'activated' : 'deactivated'}.`);
      await fetchCompanies();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to update company status';
      setError(msg);
    }
  };

  const handleDeleteClick = (comp: CompanyDto) => {
    const assessmentCount = comp._count?.assessments ?? 0;
    const questionCount = (comp._count?.questions ?? 0) + (comp._count?.companyQuestions ?? 0);

    if (assessmentCount > 0 || questionCount > 0) {
      // Historical dependencies exist: prompt for safe deactivation
      setDeactivatePromptTarget(comp);
    } else {
      // No dependencies: safe to hard delete
      setDeleteTarget(comp);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await companyService.deleteCompany(deleteTarget.id);
      setSuccessMessage(`Company "${deleteTarget.name}" deleted successfully.`);
      setDeleteTarget(null);
      await fetchCompanies();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to delete company.';
      setError(msg);
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const handleDeactivateFromPrompt = async () => {
    if (!deactivatePromptTarget) return;
    try {
      await companyService.updateStatus(deactivatePromptTarget.id, false);
      setSuccessMessage(`Company "${deactivatePromptTarget.name}" has been safely deactivated to protect historical academic records.`);
      setDeactivatePromptTarget(null);
      await fetchCompanies();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to deactivate company';
      setError(msg);
    }
  };

  // Stats calculation
  const totalAssessments = useMemo(
    () => (Array.isArray(companies) ? companies.reduce((acc, c) => acc + (c._count?.assessments || 0), 0) : 0),
    [companies]
  );
  const totalQuestions = useMemo(
    () => (Array.isArray(companies) ? companies.reduce((acc, c) => acc + (c._count?.questions || 0), 0) : 0),
    [companies]
  );
  const activeCompaniesCount = useMemo(
    () => (Array.isArray(companies) ? companies.filter((c) => c?.isActive).length : 0),
    [companies]
  );

  const columns: Column<CompanyDto>[] = [
    {
      id: 'code',
      label: 'Recruiter Code',
      minWidth: 120,
      render: (c) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip
            label={c.code}
            size="small"
            sx={{
              fontWeight: 700,
              backgroundColor: '#E4EEFC',
              color: '#1765B5',
              border: '1px solid #D1DEF0',
              borderRadius: '4px',
              fontSize: '0.78rem',
              letterSpacing: '0.04em',
            }}
          />
        </Box>
      ),
    },
    {
      id: 'name',
      label: 'Corporate Entity',
      minWidth: 260,
      render: (c) => (
        <Box>
          <Typography
            variant="body2"
            sx={{
              fontWeight: 700,
              color: '#14264B',
              cursor: 'pointer',
              '&:hover': { color: '#3b82f6' },
            }}
            onClick={() => setIntelligenceTarget(c)}
          >
            {c.name}
          </Typography>
          {c.description && (
            <Typography
              variant="caption"
              sx={{
                color: '#7182A0',
                display: '-webkit-box',
                WebkitLineClamp: 1,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                lineHeight: 1.4,
                mt: 0.25,
              }}
            >
              {c.description}
            </Typography>
          )}
          {c.website && (
            <Box
              component="a"
              href={c.website}
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.5,
                color: '#0284c7',
                fontSize: '0.75rem',
                textDecoration: 'none',
                '&:hover': { textDecoration: 'underline' },
                mt: 0.5,
              }}
            >
              <LanguageIcon sx={{ fontSize: '0.85rem' }} />
              {c.website.replace(/^https?:\/\//, '')}
            </Box>
          )}
        </Box>
      ),
    },
    {
      id: 'assessments',
      label: 'Assessments',
      minWidth: 120,
      render: (c) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <AssignmentIcon sx={{ fontSize: 16, color: '#526584' }} />
          <Typography variant="body2" sx={{ fontWeight: 600, color: '#33466A' }}>
            {c._count?.assessments ?? 0}
          </Typography>
        </Box>
      ),
    },
    {
      id: 'questions',
      label: 'Questions Pool',
      minWidth: 140,
      render: (c) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <QuizIcon sx={{ fontSize: 16, color: '#3b82f6' }} />
            <Typography variant="body2" sx={{ fontWeight: 700, color: '#33466A' }}>
              {c._count?.questions ?? 0}
            </Typography>
          </Box>
          <Tooltip title="View Question Intelligence">
            <IconButton
              size="small"
              onClick={() => setIntelligenceTarget(c)}
              sx={{ color: '#0284c7', p: 0.5 }}
            >
              <InsightsIcon sx={{ fontSize: 17 }} />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
    {
      id: 'status',
      label: 'Track Status',
      minWidth: 140,
      render: (c) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip
            label={c.isActive ? 'Active Track' : 'Deactivated'}
            size="small"
            sx={{
              fontWeight: 600,
              fontSize: '0.72rem',
              backgroundColor: c.isActive ? '#ecfdf5' : '#E7EEFA',
              color: c.isActive ? '#047857' : '#7182A0',
              border: '1px solid',
              borderColor: c.isActive ? '#a7f3d0' : '#D1DEF0',
              borderRadius: '4px',
            }}
          />
          <Tooltip title={c.isActive ? 'Deactivate Track' : 'Activate Track'}>
            <Switch
              size="small"
              checked={c.isActive}
              onChange={(e) => handleToggleStatus(c, e.target.checked)}
            />
          </Tooltip>
        </Box>
      ),
    },
    {
      id: 'actions',
      label: 'Recruitment & Assessment Actions',
      minWidth: 320,
      align: 'right',
      render: (c) => (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.75 }}>
          <Tooltip title="Company Question Intelligence">
            <Button
              size="small"
              variant="outlined"
              color="inherit"
              startIcon={<InsightsIcon sx={{ fontSize: 15 }} />}
              onClick={() => setIntelligenceTarget(c)}
              sx={{
                fontSize: '0.72rem',
                fontWeight: 600,
                py: 0.4,
                px: 1,
                borderColor: '#D1DEF0',
              }}
            >
              Intelligence
            </Button>
          </Tooltip>

          <Tooltip title="Upload Question Bank (Excel / CSV / JSON)">
            <Button
              size="small"
              variant="outlined"
              color="primary"
              startIcon={<CloudUploadIcon sx={{ fontSize: 15 }} />}
              onClick={() => setUploadTarget(c)}
              sx={{
                fontSize: '0.72rem',
                fontWeight: 600,
                py: 0.4,
                px: 1,
              }}
            >
              Upload
            </Button>
          </Tooltip>

          <Tooltip title="View Filtered Question Bank">
            <IconButton
              size="small"
              onClick={() => navigate(`/admin/questions?companyId=${c.id}`)}
              sx={{ color: '#526584' }}
            >
              <QuizIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>

          <Tooltip title="Build Assessment for this Company">
            <IconButton
              size="small"
              color="primary"
              onClick={() => navigate(`/admin/assessments/create?companyId=${c.id}`)}
            >
              <PostAddIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>

          <Tooltip title="Edit Company Details">
            <IconButton size="small" onClick={() => handleOpenDialog(c)} sx={{ color: '#526584' }}>
              <EditIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>

          <Tooltip title="Delete or Deactivate Company">
            <IconButton
              size="small"
              onClick={() => handleDeleteClick(c)}
              sx={{ color: '#dc2626' }}
            >
              <DeleteOutlineIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  return (
    <Box>
      {/* Enterprise Page Header */}
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
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 0.5 }}>
            <BusinessIcon sx={{ fontSize: 24, color: '#1765B5' }} />
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#14264B' }}>
              Company Question Intelligence & Assessment Tracks
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ color: '#7182A0' }}>
            Corporate recruitment patterns, question bank intelligence, multi-level duplicate protection, and automated test set generation.
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchCompanies}
            disabled={loading}
            sx={{ fontWeight: 600 }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            sx={{
              fontWeight: 600,
              backgroundColor: '#1765B5',
              '&:hover': { backgroundColor: '#104B91' },
            }}
          >
            Add Company
          </Button>
        </Box>
      </Box>

      {/* Global Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: 2.5 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {successMessage && (
        <Alert severity="success" sx={{ mb: 2.5 }} onClose={() => setSuccessMessage(null)}>
          {successMessage}
        </Alert>
      )}

      {/* Enterprise Operational Metrics */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={0}
            sx={{
              p: 2.25,
              backgroundColor: '#ffffff',
              border: '1px solid #DCE6F5',
              borderRadius: '8px',
            }}
          >
            <Typography variant="caption" sx={{ color: '#7182A0', fontWeight: 600, letterSpacing: '0.04em' }}>
              REGISTERED RECRUITERS
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#14264B', mt: 0.5 }}>
              {totalCount}
            </Typography>
            <Typography variant="caption" sx={{ color: '#15803D', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
              <CheckCircleOutlineIcon sx={{ fontSize: 13 }} />
              {activeCompaniesCount} active corporate tracks
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={0}
            sx={{
              p: 2.25,
              backgroundColor: '#ffffff',
              border: '1px solid #DCE6F5',
              borderRadius: '8px',
            }}
          >
            <Typography variant="caption" sx={{ color: '#7182A0', fontWeight: 600, letterSpacing: '0.04em' }}>
              ACTIVE PREPARATION TRACKS
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#1765B5', mt: 0.5 }}>
              {activeCompaniesCount}
            </Typography>
            <Typography variant="caption" sx={{ color: '#7182A0', mt: 0.5, display: 'block' }}>
              Assigned to practice pathways
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={0}
            sx={{
              p: 2.25,
              backgroundColor: '#ffffff',
              border: '1px solid #DCE6F5',
              borderRadius: '8px',
            }}
          >
            <Typography variant="caption" sx={{ color: '#7182A0', fontWeight: 600, letterSpacing: '0.04em' }}>
              CONFIGURED ASSESSMENTS
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#14264B', mt: 0.5 }}>
              {totalAssessments}
            </Typography>
            <Typography variant="caption" sx={{ color: '#7182A0', mt: 0.5, display: 'block' }}>
              Company-tailored assessments
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={0}
            sx={{
              p: 2.25,
              backgroundColor: '#ffffff',
              border: '1px solid #DCE6F5',
              borderRadius: '8px',
            }}
          >
            <Typography variant="caption" sx={{ color: '#7182A0', fontWeight: 600, letterSpacing: '0.04em' }}>
              QUESTION BANK ITEMS
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#14264B', mt: 0.5 }}>
              {totalQuestions}
            </Typography>
            <Typography variant="caption" sx={{ color: '#7182A0', mt: 0.5, display: 'block' }}>
              Tagged across company pools
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: '#DCE6F5', mb: 2.5 }}>
        <Tabs
          value={activeTab}
          onChange={(_, val) => setActiveTab(val)}
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.88rem',
              color: '#7182A0',
              minHeight: 44,
              '&.Mui-selected': { color: '#1765B5' },
            },
            '& .MuiTabs-indicator': { backgroundColor: '#1765B5', height: 2 },
          }}
        >
          <Tab
            icon={<LayersIcon sx={{ fontSize: 18 }} />}
            iconPosition="start"
            label="Corporate Recruitment Directory"
          />
          <Tab
            icon={<AutoStoriesIcon sx={{ fontSize: 18 }} />}
            iconPosition="start"
            label="Recruitment Pattern & Workflow Guide"
          />
        </Tabs>
      </Box>

      {/* TAB 0: Corporate Directory */}
      {activeTab === 0 && (
        <Box>
          {/* Quick Corporate Presets */}
          <Paper
            elevation={0}
            sx={{
              p: 2,
              mb: 2.5,
              backgroundColor: '#ffffff',
              border: '1px solid #DCE6F5',
              borderRadius: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <FlashOnIcon sx={{ fontSize: 18, color: '#f59e0b' }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#14264B' }}>
                Instant Recruiter Templates
              </Typography>
              <Typography variant="caption" sx={{ color: '#7182A0' }}>
                Pre-populate standard IT placement preparation profiles
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {PRESET_COMPANIES.map((preset) => {
                const alreadyExists = companies.some((c) => c.code.toUpperCase() === preset.code.toUpperCase());
                return (
                  <Chip
                    key={preset.code}
                    label={`+ ${preset.code} (${preset.name})`}
                    onClick={() => handleApplyPreset(preset)}
                    disabled={alreadyExists}
                    variant="outlined"
                    size="small"
                    sx={{
                      fontWeight: 600,
                      borderColor: alreadyExists ? '#DCE6F5' : '#D1DEF0',
                      color: alreadyExists ? '#8293B0' : '#1765B5',
                      backgroundColor: alreadyExists ? '#EDF2FF' : '#E4EEFC',
                      cursor: alreadyExists ? 'default' : 'pointer',
                      '&:hover': {
                        backgroundColor: alreadyExists ? '#EDF2FF' : '#E2EAF4',
                      },
                    }}
                  />
                );
              })}
            </Box>
          </Paper>

          {/* Search & Filter Toolbar */}
          <Paper
            elevation={0}
            sx={{
              p: 2,
              mb: 2.5,
              backgroundColor: '#ffffff',
              border: '1px solid #DCE6F5',
              borderRadius: 2,
            }}
          >
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={7} md={8}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Search by recruiter code, name, or track description..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(0);
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon sx={{ color: '#8293B0', fontSize: 20 }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ backgroundColor: '#ffffff' }}
                />
              </Grid>
              <Grid item xs={12} sm={5} md={4}>
                <Box sx={{ display: 'flex', gap: 1, justifyContent: { xs: 'flex-start', sm: 'flex-end' } }}>
                  {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map((status) => (
                    <Button
                      key={status}
                      size="small"
                      variant={activeFilter === status ? 'contained' : 'outlined'}
                      color={activeFilter === status ? 'primary' : 'inherit'}
                      onClick={() => {
                        setActiveFilter(status);
                        setPage(0);
                      }}
                      sx={{
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        textTransform: 'none',
                        py: 0.6,
                        px: 1.5,
                        borderColor: '#D1DEF0',
                        color: activeFilter === status ? '#ffffff' : '#526584',
                      }}
                    >
                      {status === 'ALL' ? 'All' : status === 'ACTIVE' ? 'Active' : 'Inactive'}
                    </Button>
                  ))}
                </Box>
              </Grid>
            </Grid>
          </Paper>

          {/* Companies Table */}
          <Paper
            elevation={0}
            sx={{
              border: '1px solid #DCE6F5',
              borderRadius: 2,
              overflow: 'hidden',
              backgroundColor: '#ffffff',
            }}
          >
            <DataTable
              columns={columns}
              data={companies}
              totalCount={totalCount}
              page={page}
              rowsPerPage={rowsPerPage}
              loading={loading}
              onPageChange={setPage}
              onRowsPerPageChange={(rpp) => {
                setRowsPerPage(rpp);
                setPage(0);
              }}
              emptyMessage="No corporate tracks found matching the specified search criteria."
            />
          </Paper>
        </Box>
      )}

      {/* TAB 1: Recruitment Workflow Guide */}
      {activeTab === 1 && (
        <Paper elevation={0} sx={{ p: 3, border: '1px solid #DCE6F5', borderRadius: 2, backgroundColor: '#ffffff' }}>
          <Typography variant="h6" fontWeight={700} color="#14264B" sx={{ mb: 1 }}>
            Corporate Recruitment & Assessment Engine Pipeline
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Structured institutional placement workflow connecting recruiter patterns to student readiness evaluation.
          </Typography>

          <Grid container spacing={2}>
            {[
              { step: '1', title: 'Recruiter Track', desc: 'Define corporate profile with hiring pattern metadata', icon: <BusinessIcon sx={{ fontSize: 16 }} /> },
              { step: '2', title: 'Question Intelligence', desc: 'Upload question bank with exact & semantic duplicate detection', icon: <QuizIcon sx={{ fontSize: 16 }} /> },
              { step: '3', title: 'Assessment Builder', desc: 'Configure multi-component papers with randomized test sets', icon: <AssignmentIcon sx={{ fontSize: 16 }} /> },
              { step: '4', title: 'Candidate Assignment', desc: 'Assign student cohorts by department, class, or CGPA cutoffs', icon: <HowToRegIcon sx={{ fontSize: 16 }} /> },
              { step: '5', title: 'Evaluation & Analytics', desc: 'Real-time proctoring, score calculation, and performance reports', icon: <InsightsIcon sx={{ fontSize: 16 }} /> },
            ].map((st) => (
              <Grid item xs={12} sm={6} md={2.4} key={st.step}>
                <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', height: '100%', backgroundColor: '#EDF2FF' }}>
                  <Box
                    sx={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      backgroundColor: '#1765B5',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '0.8rem',
                      mx: 'auto',
                      mb: 1,
                    }}
                  >
                    {st.step}
                  </Box>
                  <Typography variant="subtitle2" fontWeight={700} color="#14264B">
                    {st.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                    {st.desc}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Paper>
      )}

      {/* Add / Edit Company Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle
          sx={{
            color: '#14264B',
            fontWeight: 700,
            borderBottom: '1px solid #DCE6F5',
            py: 2,
            px: 3,
            bgcolor: '#ffffff',
          }}
        >
          <Typography variant="h6" fontWeight={700} color="#14264B">
            {editingCompany ? `Edit Company — ${editingCompany.name}` : 'Add New Placement Recruiter'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {editingCompany ? 'Modify corporate track details' : 'Configure dynamic recruiter entity'}
          </Typography>
        </DialogTitle>

        <DialogContent sx={{ p: 3, pt: 3, backgroundColor: '#ffffff' }}>
          {dialogError && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setDialogError(null)}>
              {dialogError}
            </Alert>
          )}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Recruiter Code"
                  placeholder="e.g. TCS"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  disabled={Boolean(editingCompany)}
                  required
                  helperText="Unique uppercase identifier"
                />
              </Grid>
              <Grid item xs={12} sm={8}>
                <TextField
                  fullWidth
                  label="Corporate Entity Name"
                  placeholder="e.g. Tata Consultancy Services"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </Grid>
            </Grid>

            <TextField
              fullWidth
              multiline
              rows={3}
              label="Recruitment Track & Pattern Description"
              placeholder="e.g. NQT pattern covering Numerical Ability, Reasoning, Verbal, and Hands-on Coding."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />

            <TextField
              fullWidth
              label="Corporate Website / Career Portal"
              placeholder="https://www.company.com/careers"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                />
              }
              label={
                <Box>
                  <Typography variant="body2" fontWeight={600}>
                    Active Preparation Track
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Enabled companies appear in assessment builders, question banks, and student preparation tracks
                  </Typography>
                </Box>
              }
            />
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 2.5, backgroundColor: '#EDF2FF', borderTop: '1px solid #DCE6F5' }}>
          <Button variant="outlined" onClick={() => setDialogOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSave}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}
          >
            {saving ? 'Saving...' : editingCompany ? 'Update Company' : 'Add Company'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Safe Deactivation Prompt Dialog */}
      <Dialog
        open={Boolean(deactivatePromptTarget)}
        onClose={() => setDeactivatePromptTarget(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, color: '#b45309' }}>
          <WarningAmberIcon sx={{ fontSize: 28, color: '#d97706' }} />
          <Typography variant="h6" fontWeight={700}>
            Cannot Permanently Delete Company
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <Typography variant="body1" sx={{ color: '#14264B', mb: 1.5 }}>
            <strong>{deactivatePromptTarget?.name} ({deactivatePromptTarget?.code})</strong> contains active academic dependencies:
          </Typography>

          <Box sx={{ p: 2, backgroundColor: '#fffbeb', borderRadius: 2, border: '1px solid #fde68a', mb: 2 }}>
            <Typography variant="body2" sx={{ color: '#92400e', mb: 0.5 }}>
              • <strong>{deactivatePromptTarget?._count?.assessments ?? 0}</strong> configured assessment(s)
            </Typography>
            <Typography variant="body2" sx={{ color: '#92400e' }}>
              • <strong>{(deactivatePromptTarget?._count?.questions ?? 0) + (deactivatePromptTarget?._count?.companyQuestions ?? 0)}</strong> linked question bank item(s)
            </Typography>
          </Box>

          <Typography variant="body2" color="text.secondary">
            Permanently deleting this corporate record would corrupt historical student attempts, audit logs, and analytics. To safely hide this track from students and new assessments without breaking existing data, deactivate the company instead.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, backgroundColor: '#EDF2FF' }}>
          <Button variant="outlined" onClick={() => setDeactivatePromptTarget(null)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="warning"
            startIcon={<BlockIcon />}
            onClick={handleDeactivateFromPrompt}
          >
            Deactivate Company Instead
          </Button>
        </DialogActions>
      </Dialog>

      {/* Hard Delete Confirmation Dialog (for safe companies without dependencies) */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Confirm Recruiter Track Deletion"
        message={`Are you sure you want to delete "${deleteTarget?.name}" (${deleteTarget?.code})? This action is permanent.`}
        confirmText="Delete Recruiter"
        confirmColor="error"
        loading={deleting}
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeleteTarget(null)}
      />

      {/* Company Question Intelligence Dialog */}
      <CompanyIntelligenceDialog
        open={Boolean(intelligenceTarget)}
        company={intelligenceTarget}
        onClose={() => setIntelligenceTarget(null)}
        onOpenUpload={(comp) => {
          setIntelligenceTarget(null);
          setUploadTarget(comp);
        }}
        onViewQuestions={(comp) => {
          setIntelligenceTarget(null);
          navigate(`/admin/questions?companyId=${comp.id}`);
        }}
        onCreateAssessment={(comp) => {
          setIntelligenceTarget(null);
          navigate(`/admin/assessments/create?companyId=${comp.id}`);
        }}
        onReviewDuplicates={(comp) => {
          setIntelligenceTarget(null);
          setDuplicatesTarget(comp);
        }}
      />

      {/* Company Question Upload Dialog */}
      <CompanyQuestionUploadDialog
        open={Boolean(uploadTarget)}
        company={uploadTarget}
        onClose={() => setUploadTarget(null)}
        onSuccess={() => {
          fetchCompanies();
        }}
        onViewQuestions={(comp) => {
          setUploadTarget(null);
          navigate(`/admin/questions?companyId=${comp.id}`);
        }}
      />

      {/* Duplicate Review Dialog */}
      <DuplicateReviewDialog
        open={Boolean(duplicatesTarget)}
        company={duplicatesTarget}
        onClose={() => setDuplicatesTarget(null)}
        onResolved={() => {
          fetchCompanies();
        }}
      />
    </Box>
  );
};
