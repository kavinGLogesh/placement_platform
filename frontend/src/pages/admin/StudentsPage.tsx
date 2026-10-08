import React, { useState, useEffect, useCallback } from 'react';
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
  MenuItem,
  CircularProgress,
  Alert,
  Chip,
  FormControl,
  InputLabel,
  Select,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import VisibilityIcon from '@mui/icons-material/Visibility';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import RefreshIcon from '@mui/icons-material/Refresh';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DownloadIcon from '@mui/icons-material/Download';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import FilterListIcon from '@mui/icons-material/FilterList';
import LockResetIcon from '@mui/icons-material/LockReset';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import KeyIcon from '@mui/icons-material/Key';
import CheckIcon from '@mui/icons-material/Check';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import HistoryIcon from '@mui/icons-material/History';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import InputAdornment from '@mui/material/InputAdornment';
import { DataTable, Column } from '../../components/management/DataTable.js';
import { ConfirmDialog } from '../../components/management/ConfirmDialog.js';
import { AiStudentImportDialog } from '../../components/management/AiStudentImportDialog.js';
import { StudentImportHistoryTab } from '../../components/management/StudentImportHistoryTab.js';
import { StudentAccountsTab } from '../../components/management/StudentAccountsTab.js';
import { managementService } from '../../services/management.service.js';
import {
  Student,
  CreateStudentInput,
  UpdateStudentInput,
  Department,
  Course,
  ClassEntity,
  Section,
  StudentStatus,
  ExcelImportResult,
} from '../../types/management.types.js';

export const StudentsPage: React.FC = () => {
  const navigate = useNavigate();

  // Data & Pagination
  const [students, setStudents] = useState<Student[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search, Filters & Sorting
  const [search, setSearch] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [courseId, setCourseId] = useState('');
  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [yearFilter, setYearFilter] = useState<number | ''>('');
  const [statusFilter, setStatusFilter] = useState<StudentStatus | ''>('');
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Relational Hierarchy Options
  const [departments, setDepartments] = useState<Department[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [classes, setClasses] = useState<ClassEntity[]>([]);
  const [sections, setSections] = useState<Section[]>([]);

  // Create / Edit Student Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [showStudentPassword, setShowStudentPassword] = useState(false);
  const [studentForm, setStudentForm] = useState<CreateStudentInput>({
    registerNumber: '',
    name: '',
    collegeEmail: '',
    phone: '',
    dob: '',
    password: '',
    departmentId: '',
    courseId: '',
    classId: '',
    sectionId: '',
    year: 1,
    cgpa: 8.0,
    status: 'ACTIVE',
  });

  // Navigation Tabs State (0 = All Students, 1 = Add Student, 2 = AI Import, 3 = History, 4 = Accounts)
  const [activeTab, setActiveTab] = useState<number>(0);
  const [aiImportDialogOpen, setAiImportDialogOpen] = useState<boolean>(false);

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Bulk Excel Import Dialog & State
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ExcelImportResult | null>(null);
  const [downloadingReport, setDownloadingReport] = useState(false);

  // Password Reset / Account Activation State
  const [resetPasswordTarget, setResetPasswordTarget] = useState<Student | null>(null);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);

  // One-Time Credentials Modal State
  const [credentialModalData, setCredentialModalData] = useState<{
    name: string;
    email: string;
    registerNumber: string;
    temporaryPassword?: string;
    title: string;
    subtitle: string;
  } | null>(null);
  const [showModalPassword, setShowModalPassword] = useState(false);
  const [copied, setCopied] = useState(false);

  // Fetch Hierarchy Lookups
  const fetchLookups = async () => {
    try {
      const [deptList, courseList, classList, secList] = await Promise.all([
        managementService.getDepartments(),
        managementService.getCourses(),
        managementService.getClasses(),
        managementService.getSections(),
      ]);
      setDepartments(deptList);
      setCourses(courseList);
      setClasses(classList);
      setSections(secList);
    } catch {
      // Non-blocking lookup load
    }
  };

  useEffect(() => {
    fetchLookups();
  }, []);

  // Fetch Paginated Students
  const fetchStudents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await managementService.getStudents({
        page: page + 1,
        limit: rowsPerPage,
        search: search.trim() || undefined,
        departmentId: departmentId || undefined,
        courseId: courseId || undefined,
        classId: classId || undefined,
        sectionId: sectionId || undefined,
        year: yearFilter !== '' ? Number(yearFilter) : undefined,
        status: statusFilter || undefined,
        sortBy: sortBy as 'name' | 'registerNumber' | 'collegeEmail' | 'cgpa' | 'year' | 'createdAt',
        sortOrder,
      });
      setStudents(res.data);
      setTotalCount(res.pagination.totalCount);
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'message' in err ? String((err as { message: unknown }).message) : 'Failed to fetch students';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, search, departmentId, courseId, classId, sectionId, yearFilter, statusFilter, sortBy, sortOrder]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const handleOpenStudentDialog = (st?: Student) => {
    setShowStudentPassword(false);
    if (st) {
      setEditingStudent(st);
      setStudentForm({
        registerNumber: st.registerNumber,
        name: st.name,
        collegeEmail: st.collegeEmail,
        phone: st.phone || '',
        dob: st.dob || '',
        password: '',
        departmentId: st.departmentId,
        courseId: st.courseId,
        classId: st.classId,
        sectionId: st.sectionId,
        year: st.year,
        cgpa: st.cgpa || 8.0,
        status: st.status,
      });
    } else {
      const defaultDept = departments[0];
      const defaultCourse = courses.find((c) => c.departmentId === defaultDept?.id);
      const defaultClass = classes.find((cl) => cl.courseId === defaultCourse?.id);
      const defaultSection = sections.find((s) => s.classId === defaultClass?.id);

      setEditingStudent(null);
      setStudentForm({
        registerNumber: '',
        name: '',
        collegeEmail: '',
        phone: '',
        dob: '',
        password: '',
        departmentId: defaultDept?.id || '',
        courseId: defaultCourse?.id || '',
        classId: defaultClass?.id || '',
        sectionId: defaultSection?.id || '',
        year: defaultClass?.currentYear || 1,
        cgpa: 8.0,
        status: 'ACTIVE',
      });
    }
    setDialogOpen(true);
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (editingStudent) {
        const updatePayload: UpdateStudentInput = {
          name: studentForm.name,
          phone: studentForm.phone,
          dob: studentForm.dob,
          departmentId: studentForm.departmentId,
          courseId: studentForm.courseId,
          classId: studentForm.classId,
          sectionId: studentForm.sectionId,
          year: Number(studentForm.year),
          cgpa: studentForm.cgpa ? Number(studentForm.cgpa) : undefined,
          status: studentForm.status,
          password: studentForm.password ? studentForm.password.trim() : undefined,
        };
        await managementService.updateStudent(editingStudent.id, updatePayload);
      } else {
        const created = await managementService.createStudent({
          ...studentForm,
          year: Number(studentForm.year),
          cgpa: studentForm.cgpa ? Number(studentForm.cgpa) : undefined,
          password: studentForm.password ? studentForm.password.trim() : undefined,
        });
        if (created.temporaryPassword) {
          setCredentialModalData({
            name: created.name,
            email: created.collegeEmail,
            registerNumber: created.registerNumber,
            temporaryPassword: created.temporaryPassword,
            title: 'Student Account Registered Successfully',
            subtitle: studentForm.password
              ? 'Student account created with your specified login password. The student can now log in directly.'
              : 'Linked login account created with temporary credentials. Please communicate these to the student.',
          });
        }
      }
      setDialogOpen(false);
      setEditingStudent(null);
      fetchStudents();
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'message' in err ? String((err as { message: unknown }).message) : 'Failed to save student';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handlePromptResetPassword = (s: Student) => {
    setResetPasswordTarget(s);
    setResetPasswordDialogOpen(true);
  };

  const handleConfirmResetPassword = async () => {
    if (!resetPasswordTarget) return;
    setResettingPassword(true);
    try {
      const res = await managementService.resetStudentPassword(resetPasswordTarget.id);
      setResetPasswordDialogOpen(false);
      setCredentialModalData({
        name: resetPasswordTarget.name,
        email: resetPasswordTarget.collegeEmail,
        registerNumber: resetPasswordTarget.registerNumber,
        temporaryPassword: res.temporaryPassword,
        title: 'Temporary Credentials Generated',
        subtitle: 'Student password reset. The student will be required to set a permanent password on next login.',
      });
      fetchStudents();
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'message' in err ? String((err as { message: unknown }).message) : 'Failed to reset password';
      setError(msg);
    } finally {
      setResettingPassword(false);
      setResetPasswordTarget(null);
    }
  };

  const handleCopyCredentials = () => {
    if (!credentialModalData) return;
    const text = `Placement Platform Login Credentials:\nEmail: ${credentialModalData.email}\nTemporary Password: ${credentialModalData.temporaryPassword}\nLogin URL: ${window.location.origin}/login\nNote: You will be required to change your password upon first login.`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDeleteStudent = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await managementService.deleteStudent(deleteTarget.id);
      setDeleteTarget(null);
      fetchStudents();
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'message' in err ? String((err as { message: unknown }).message) : 'Failed to delete student';
      setError(msg);
    } finally {
      setDeleting(false);
    }
  };

  // Excel Bulk Import Handlers
  const handleUploadExcel = async () => {
    if (!importFile) return;
    setImporting(true);
    setError(null);
    try {
      const result = await managementService.importStudents(importFile);
      setImportResult(result);
      fetchStudents();
      fetchLookups();
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'message' in err ? String((err as { message: unknown }).message) : 'Bulk import failed';
      setError(msg);
    } finally {
      setImporting(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const blob = await managementService.downloadTemplate();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Students_Import_Template.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'message' in err ? String((err as { message: unknown }).message) : 'Failed to download template';
      setError(msg);
    }
  };

  const handleDownloadErrorReport = async () => {
    if (!importResult?.errors?.length) return;
    setDownloadingReport(true);
    try {
      const blob = await managementService.downloadErrorReport(importResult.errors);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Import_Errors_Report.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'message' in err ? String((err as { message: unknown }).message) : 'Failed to download error report';
      setError(msg);
    } finally {
      setDownloadingReport(false);
    }
  };

  const handleSortChange = (colId: string) => {
    if (sortBy === colId) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(colId);
      setSortOrder('asc');
    }
  };

  const columns: Column<Student>[] = [
    {
      id: 'registerNumber',
      label: 'Register No.',
      minWidth: 140,
      sortable: true,
      render: (s) => (
        <Typography
          variant="body2"
          fontWeight={700}
          sx={{ fontFamily: 'monospace', color: 'primary.light', cursor: 'pointer' }}
          onClick={() => navigate(`/admin/students/${s.id}`)}
        >
          {s.registerNumber}
        </Typography>
      ),
    },
    {
      id: 'name',
      label: 'Student Name',
      minWidth: 180,
      sortable: true,
      render: (s) => (
        <div>
          <Typography variant="body2" fontWeight={600}>
            {s.name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {s.collegeEmail}
          </Typography>
        </div>
      ),
    },
    {
      id: 'department',
      label: 'Dept & Course',
      minWidth: 160,
      render: (s) => (
        <div>
          <Chip label={s.department?.code || '—'} size="small" sx={{ mr: 0.5, fontWeight: 600 }} />
          <Chip label={s.course?.code || '—'} size="small" variant="outlined" sx={{ fontWeight: 600 }} />
        </div>
      ),
    },
    {
      id: 'class',
      label: 'Class & Section',
      minWidth: 140,
      render: (s) => (
        <Typography variant="body2" color="text.secondary">
          {s.class?.name ? `${s.class.name} / Sec ${s.section?.name || ''}` : '—'}
        </Typography>
      ),
    },
    {
      id: 'year',
      label: 'Year',
      minWidth: 80,
      sortable: true,
      render: (s) => `Yr ${s.year}`,
    },
    {
      id: 'cgpa',
      label: 'CGPA',
      minWidth: 90,
      sortable: true,
      render: (s) => (
        <Chip
          label={s.cgpa !== null && s.cgpa !== undefined ? Number(s.cgpa).toFixed(2) : '—'}
          size="small"
          color={Number(s.cgpa) >= 8.5 ? 'success' : Number(s.cgpa) >= 7.0 ? 'primary' : 'warning'}
          sx={{ fontWeight: 700 }}
        />
      ),
    },
    {
      id: 'status',
      label: 'Account Status',
      minWidth: 150,
      render: (s) => {
        if (s.status === 'ACTIVE') {
          return <Chip label="Active" size="small" color="success" sx={{ fontWeight: 700 }} />;
        }
        if (s.status === 'INACTIVE') {
          return (
            <Chip
              label="Pending Activation"
              size="small"
              sx={{ bgcolor: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d', fontWeight: 700 }}
            />
          );
        }
        if (s.status === 'BLOCKED') {
          return <Chip label="Disabled" size="small" color="error" sx={{ fontWeight: 700 }} />;
        }
        if (s.status === 'PLACED') {
          return <Chip label="Placed" size="small" color="secondary" sx={{ fontWeight: 700 }} />;
        }
        return <Chip label={s.status} size="small" sx={{ fontWeight: 700 }} />;
      },
    },
    {
      id: 'actions',
      label: 'Actions',
      minWidth: 170,
      align: 'right',
      render: (s) => (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
          <Tooltip title={s.status === 'INACTIVE' ? 'Activate Account & Issue Credentials' : 'Reset Password'}>
            <IconButton size="small" onClick={() => handlePromptResetPassword(s)} sx={{ color: 'warning.main' }}>
              <LockResetIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="View Profile">
            <IconButton size="small" onClick={() => navigate(`/admin/students/${s.id}`)} sx={{ color: 'secondary.light' }}>
              <VisibilityIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Edit Student">
            <IconButton size="small" onClick={() => handleOpenStudentDialog(s)} sx={{ color: 'primary.light' }}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete Student">
            <IconButton size="small" onClick={() => setDeleteTarget(s)} sx={{ color: 'error.light' }}>
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  return (
    <Box>
      {/* Page Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
        <div>
          <Typography variant="overline" color="#0284c7" fontWeight={700} letterSpacing={1.2}>
            PLACEMENT ADMIN DASHBOARD → STUDENT DIRECTORY
          </Typography>
          <Typography variant="h4" fontWeight={800} letterSpacing="-0.02em" sx={{ mb: 0.5, color: '#0f172a' }}>
            Student Directory & Enrollment
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748b' }}>
            Intelligent student registry, department/course hierarchy, automated credentials, and AI-assisted import.
          </Typography>
        </div>

        {/* Main Actions */}
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
          <Button
            variant="contained"
            size="small"
            startIcon={<AutoAwesomeIcon fontSize="small" />}
            onClick={() => setAiImportDialogOpen(true)}
            sx={{
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              color: '#ffffff',
              borderRadius: '8px',
              textTransform: 'none',
              fontWeight: 700,
              fontSize: '0.85rem',
              px: 2.4,
              py: 0.9,
              boxShadow: '0 4px 14px rgba(2, 132, 199, 0.35)',
              '&:hover': {
                background: 'linear-gradient(135deg, #0369a1 0%, #075985 100%)',
              },
            }}
          >
            AI Import Students
          </Button>

          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon fontSize="small" />}
            onClick={() => handleOpenStudentDialog()}
            disabled={departments.length === 0 || sections.length === 0}
            sx={{
              bgcolor: '#0f172a',
              color: '#ffffff',
              borderRadius: '8px',
              textTransform: 'none',
              fontWeight: 700,
              fontSize: '0.85rem',
              px: 2,
              py: 0.9,
              '&:hover': { bgcolor: '#1e293b' },
            }}
          >
            + Add Student
          </Button>

          <Button
            variant="outlined"
            size="small"
            startIcon={<UploadFileIcon fontSize="small" />}
            onClick={() => {
              setImportResult(null);
              setImportFile(null);
              setImportDialogOpen(true);
            }}
            sx={{
              color: '#475569',
              borderColor: '#cbd5e1',
              borderRadius: '8px',
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.8125rem',
              py: 0.8,
              '&:hover': { borderColor: '#0284c7', bgcolor: 'rgba(2, 132, 199, 0.04)' },
            }}
          >
            Legacy Import
          </Button>
        </Box>
      </Box>

      {/* 5-Tab Navigation System */}
      <Paper
        elevation={0}
        sx={{
          mb: 3,
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: 2.5,
          overflow: 'hidden',
        }}
      >
        <Tabs
          value={activeTab}
          onChange={(_e, newTab) => {
            if (newTab === 1) {
              handleOpenStudentDialog();
              return;
            }
            if (newTab === 2) {
              setAiImportDialogOpen(true);
              return;
            }
            setActiveTab(newTab);
          }}
          sx={{
            px: 2,
            borderBottom: '1px solid #e2e8f0',
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 700,
              fontSize: '0.875rem',
              minHeight: 48,
              py: 1.5,
            },
            '& .Mui-selected': {
              color: '#0284c7',
            },
            '& .MuiTabs-indicator': {
              backgroundColor: '#0284c7',
              height: 3,
              borderRadius: '3px 3px 0 0',
            },
          }}
        >
          <Tab
            icon={<PeopleAltIcon sx={{ fontSize: 18 }} />}
            iconPosition="start"
            label={`All Students (${totalCount})`}
          />
          <Tab
            icon={<AddIcon sx={{ fontSize: 18 }} />}
            iconPosition="start"
            label="Add Student"
          />
          <Tab
            icon={<AutoAwesomeIcon sx={{ fontSize: 18, color: '#0284c7' }} />}
            iconPosition="start"
            label="AI Import Students"
          />
          <Tab
            icon={<HistoryIcon sx={{ fontSize: 18 }} />}
            iconPosition="start"
            label="Import History"
          />
          <Tab
            icon={<KeyIcon sx={{ fontSize: 18 }} />}
            iconPosition="start"
            label="Student Accounts"
          />
        </Tabs>
      </Paper>

      {error && (
        <Alert severity="error" variant="outlined" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* TAB 3: IMPORT HISTORY */}
      {activeTab === 3 && (
        <Box sx={{ mb: 4 }}>
          <StudentImportHistoryTab />
        </Box>
      )}

      {/* TAB 4: STUDENT ACCOUNTS */}
      {activeTab === 4 && (
        <Box sx={{ mb: 4 }}>
          <StudentAccountsTab students={students} onRefresh={fetchStudents} />
        </Box>
      )}

      {/* TAB 0: ALL STUDENTS (TABLE & FILTERS) */}
      {activeTab === 0 && (
        <>
          {/* Filter Bar */}
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
          mb: 3,
          backgroundColor: '#ffffff',
          border: '1px solid #DCE6F5',
          borderRadius: 2.5,
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <FilterListIcon sx={{ color: 'primary.main', fontSize: 20 }} />
          <Typography variant="subtitle2" fontWeight={700} color="text.primary">
            Server-Side Multi-Parameter Filtering
          </Typography>
        </Box>

        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={2.4}>
            <FormControl size="small" fullWidth>
              <InputLabel>Department</InputLabel>
              <Select
                value={departmentId}
                label="Department"
                onChange={(e) => {
                  setDepartmentId(e.target.value);
                  setCourseId('');
                  setClassId('');
                  setSectionId('');
                  setPage(0);
                }}
              >
                <MenuItem value="">All Departments</MenuItem>
                {departments.map((d) => (
                  <MenuItem key={d.id} value={d.id}>
                    {d.code} - {d.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={2.4}>
            <FormControl size="small" fullWidth>
              <InputLabel>Course</InputLabel>
              <Select
                value={courseId}
                label="Course"
                onChange={(e) => {
                  setCourseId(e.target.value);
                  setClassId('');
                  setSectionId('');
                  setPage(0);
                }}
              >
                <MenuItem value="">All Courses</MenuItem>
                {courses
                  .filter((c) => !departmentId || c.departmentId === departmentId)
                  .map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.code}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={4} md={2}>
            <FormControl size="small" fullWidth>
              <InputLabel>Academic Year</InputLabel>
              <Select
                value={yearFilter}
                label="Academic Year"
                onChange={(e) => {
                  setYearFilter(e.target.value as number | '');
                  setPage(0);
                }}
              >
                <MenuItem value="">All Years</MenuItem>
                <MenuItem value={1}>1st Year</MenuItem>
                <MenuItem value={2}>2nd Year</MenuItem>
                <MenuItem value={3}>3rd Year</MenuItem>
                <MenuItem value={4}>4th Year</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={4} md={2.4}>
            <FormControl size="small" fullWidth>
              <InputLabel>Placement Status</InputLabel>
              <Select
                value={statusFilter}
                label="Placement Status"
                onChange={(e) => {
                  setStatusFilter(e.target.value as StudentStatus | '');
                  setPage(0);
                }}
              >
                <MenuItem value="">All Statuses</MenuItem>
                <MenuItem value="ACTIVE">ACTIVE</MenuItem>
                <MenuItem value="PLACED">PLACED</MenuItem>
                <MenuItem value="INACTIVE">INACTIVE</MenuItem>
                <MenuItem value="BLOCKED">BLOCKED</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={4} md={2.8} sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              color="inherit"
              fullWidth
              startIcon={<RefreshIcon />}
              onClick={() => {
                setSearch('');
                setDepartmentId('');
                setCourseId('');
                setClassId('');
                setSectionId('');
                setYearFilter('');
                setStatusFilter('');
                setPage(0);
              }}
            >
              Reset Filters
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Main Student DataTable */}
      <DataTable
        columns={columns}
        data={students}
        loading={loading}
        totalCount={totalCount}
        page={page}
        rowsPerPage={rowsPerPage}
        searchValue={search}
        searchPlaceholder="Search by student name, register number, or college email..."
        onSearchChange={(val) => {
          setSearch(val);
          setPage(0);
        }}
        onPageChange={(newPage) => setPage(newPage)}
        onRowsPerPageChange={(newLimit) => {
          setRowsPerPage(newLimit);
          setPage(0);
        }}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={handleSortChange}
        emptyMessage="No students found matching current query or filters."
      />
    </>
  )}

      {/* Create / Edit Student Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: '#ffffff',
            border: '1px solid #DCE6F5',
            borderRadius: 2.5,
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
          },
        }}
      >
        <form onSubmit={handleSaveStudent}>
          <DialogTitle sx={{ color: '#14264B', fontWeight: 700, borderBottom: '1px solid #DCE6F5', pb: 2 }}>
            {editingStudent ? 'Edit Student Details' : 'Register New Student'}
          </DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Register Number"
                  required
                  fullWidth
                  disabled={!!editingStudent}
                  value={studentForm.registerNumber}
                  onChange={(e) => setStudentForm({ ...studentForm, registerNumber: e.target.value.toUpperCase() })}
                  placeholder="e.g. 717721CSR001"
                  helperText={editingStudent ? 'Register number cannot be changed' : 'Unique student register number'}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Student Full Name"
                  required
                  fullWidth
                  value={studentForm.name}
                  onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
                  placeholder="e.g. Logeshwaran K"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="College Email Address"
                  required
                  type="email"
                  fullWidth
                  disabled={!!editingStudent}
                  value={studentForm.collegeEmail}
                  onChange={(e) => setStudentForm({ ...studentForm, collegeEmail: e.target.value.toLowerCase() })}
                  placeholder="logesh@college.edu"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Contact Phone"
                  fullWidth
                  value={studentForm.phone}
                  onChange={(e) => setStudentForm({ ...studentForm, phone: e.target.value })}
                  placeholder="+91 9876543210"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Date of Birth (DOB)"
                  fullWidth
                  value={studentForm.dob || ''}
                  onChange={(e) => setStudentForm({ ...studentForm, dob: e.target.value })}
                  placeholder="DD-MM-YYYY (e.g. 15-08-2005)"
                  helperText="Student date of birth (optional)"
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  label={editingStudent ? "Update Login Password (Optional)" : "Login Password"}
                  type={showStudentPassword ? 'text' : 'password'}
                  fullWidth
                  value={studentForm.password || ''}
                  onChange={(e) => setStudentForm({ ...studentForm, password: e.target.value })}
                  placeholder={editingStudent ? "Leave blank to keep existing password" : "Leave blank for default (Student@123)"}
                  helperText={
                    editingStudent
                      ? "Enter a new password if you want to update the student's password, or leave blank to keep existing."
                      : "Common default login password for all students is Student@123 if left blank, or enter a custom password."
                  }
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowStudentPassword(!showStudentPassword)}
                          edge="end"
                          size="small"
                          aria-label="toggle student password visibility"
                        >
                          {showStudentPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              {/* Student Academic & Status Metrics */}
              <Grid item xs={12} sm={4}>
                <TextField
                  label="Current Year"
                  type="number"
                  required
                  fullWidth
                  inputProps={{ min: 1, max: 6 }}
                  value={studentForm.year}
                  onChange={(e) => setStudentForm({ ...studentForm, year: Number(e.target.value) })}
                />
              </Grid>

              <Grid item xs={12} sm={4}>
                <TextField
                  label="Current CGPA"
                  type="number"
                  fullWidth
                  inputProps={{ min: 0, max: 10, step: 0.01 }}
                  value={studentForm.cgpa ?? ''}
                  onChange={(e) => setStudentForm({ ...studentForm, cgpa: Number(e.target.value) })}
                />
              </Grid>

              <Grid item xs={12} sm={4}>
                <TextField
                  select
                  label="Account Status"
                  required
                  fullWidth
                  value={studentForm.status}
                  onChange={(e) => setStudentForm({ ...studentForm, status: e.target.value as StudentStatus })}
                >
                  <MenuItem value="ACTIVE">ACTIVE</MenuItem>
                  <MenuItem value="PLACED">PLACED</MenuItem>
                  <MenuItem value="INACTIVE">INACTIVE</MenuItem>
                  <MenuItem value="BLOCKED">BLOCKED</MenuItem>
                </TextField>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 2.5 }}>
            <Button onClick={() => setDialogOpen(false)} color="inherit">
              Cancel
            </Button>
            <Button type="submit" variant="contained" color="primary" disabled={saving}>
              {saving ? <CircularProgress size={20} color="inherit" /> : 'Save Student'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Bulk Excel Import Modal */}
      <Dialog
        open={importDialogOpen}
        onClose={() => !importing && setImportDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: '#ffffff',
            border: '1px solid #DCE6F5',
            borderRadius: 2.5,
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
          },
        }}
      >
        <DialogTitle sx={{ color: '#14264B', fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #DCE6F5', pb: 2 }}>
          <span>Bulk Student Excel Import</span>
          <Button
            size="small"
            variant="outlined"
            color="primary"
            startIcon={<DownloadIcon />}
            onClick={handleDownloadTemplate}
          >
            Download Official Template (.xlsx)
          </Button>
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 2.5 }}>
          <Typography variant="body2" color="text.secondary">
            Upload student records using <code>.xlsx</code>, <code>.xls</code>, or <code>.csv</code>. The importer automatically performs relational validation, checks email & register number uniqueness, and executes atomic batched insertion.
          </Typography>

          {/* File Picker Box */}
          <Box
            sx={{
              p: 4,
              border: '2px dashed rgba(99, 102, 241, 0.4)',
              borderRadius: 2.5,
              backgroundColor: '#EDF2FF',
              textAlign: 'center',
              cursor: 'pointer',
              '&:hover': {
                borderColor: 'primary.main',
                backgroundColor: '#E7EEFA',
              },
            }}
            onClick={() => document.getElementById('excel-file-input')?.click()}
          >
            <input
              id="excel-file-input"
              type="file"
              accept=".xlsx,.xls,.csv"
              style={{ display: 'none' }}
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  setImportFile(e.target.files[0]);
                  setImportResult(null);
                }
              }}
            />
            <UploadFileIcon sx={{ fontSize: 48, color: 'primary.light', mb: 1 }} />
            <Typography variant="h6" fontWeight={700}>
              {importFile ? importFile.name : 'Select or drop Excel/CSV spreadsheet here'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Supported formats: .xlsx, .xls, .csv (up to 10MB)
            </Typography>
          </Box>

          {/* Action Trigger */}
          {importFile && (
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5 }}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleUploadExcel}
                disabled={importing}
                startIcon={importing ? <CircularProgress size={18} color="inherit" /> : <UploadFileIcon />}
              >
                {importing ? 'Validating & Importing...' : 'Execute Bulk Import'}
              </Button>
            </Box>
          )}

          {/* Import Results Summary */}
          {importResult && (
            <Box sx={{ mt: 1 }}>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={4}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                    <CheckCircleOutlineIcon sx={{ color: 'success.main', fontSize: 28 }} />
                    <Typography variant="h4" fontWeight={800} color="success.main">
                      {importResult.importedCount}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Successfully Imported
                    </Typography>
                  </Paper>
                </Grid>

                <Grid item xs={4}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                    <ErrorOutlineIcon sx={{ color: 'error.main', fontSize: 28 }} />
                    <Typography variant="h4" fontWeight={800} color="error.main">
                      {importResult.failedCount}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Failed Rows
                    </Typography>
                  </Paper>
                </Grid>

                <Grid item xs={4}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                    <Typography variant="h4" fontWeight={800} color="warning.main" sx={{ mt: 1 }}>
                      {importResult.duplicateCount}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Duplicates Rejected
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>

              {/* Error Breakdown Table */}
              {importResult.errors?.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                    <Typography variant="subtitle2" fontWeight={700} color="error.light">
                      Row-Level Validation Rejection Details ({importResult.errors.length} issues)
                    </Typography>
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      startIcon={<DownloadIcon />}
                      onClick={handleDownloadErrorReport}
                      disabled={downloadingReport}
                    >
                      {downloadingReport ? 'Generating...' : 'Download CSV Error Report'}
                    </Button>
                  </Box>

                  <TableContainer component={Paper} sx={{ maxHeight: 240, bgcolor: '#ffffff', border: '1px solid #DCE6F5', borderRadius: 2 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ bgcolor: '#EDF2FF', color: 'text.primary', fontWeight: 700, borderBottom: '1px solid #DCE6F5' }}>Row</TableCell>
                          <TableCell sx={{ bgcolor: '#EDF2FF', color: 'text.primary', fontWeight: 700, borderBottom: '1px solid #DCE6F5' }}>Register No</TableCell>
                          <TableCell sx={{ bgcolor: '#EDF2FF', color: 'text.primary', fontWeight: 700, borderBottom: '1px solid #DCE6F5' }}>Field</TableCell>
                          <TableCell sx={{ bgcolor: '#EDF2FF', color: 'text.primary', fontWeight: 700, borderBottom: '1px solid #DCE6F5' }}>Error Reason</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {importResult.errors.map((err, idx) => (
                          <TableRow key={idx}>
                            <TableCell sx={{ fontFamily: 'monospace', color: '#b45309', fontWeight: 600 }}>{err.row}</TableCell>
                            <TableCell sx={{ fontFamily: 'monospace', color: 'text.primary' }}>{err.registerNumber || '—'}</TableCell>
                            <TableCell sx={{ color: 'text.secondary' }}>{err.field || 'General'}</TableCell>
                            <TableCell sx={{ color: 'error.main', fontWeight: 500 }}>{err.message}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setImportDialogOpen(false)} color="inherit" disabled={importing}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Student Record"
        message={`Are you sure you want to permanently delete student "${deleteTarget?.name}" (${deleteTarget?.registerNumber})?`}
        loading={deleting}
        onConfirm={handleDeleteStudent}
        onClose={() => setDeleteTarget(null)}
      />

      {/* Reset Password / Activate Account Confirmation Dialog */}
      <ConfirmDialog
        open={resetPasswordDialogOpen}
        title={resetPasswordTarget?.status === 'INACTIVE' ? 'Activate Student Account' : 'Reset Student Password'}
        message={`Generate a new temporary password for "${resetPasswordTarget?.name}" (${resetPasswordTarget?.registerNumber})? The account will be marked as Pending Activation and the student will be required to set a permanent password upon next login.`}
        confirmText="Generate Credentials"
        confirmColor="warning"
        loading={resettingPassword}
        onConfirm={handleConfirmResetPassword}
        onClose={() => {
          setResetPasswordDialogOpen(false);
          setResetPasswordTarget(null);
        }}
      />

      {/* One-Time Credentials Modal */}
      <Dialog
        open={!!credentialModalData}
        maxWidth="sm"
        fullWidth
        onClose={() => setCredentialModalData(null)}
        PaperProps={{ sx: { borderRadius: 3, border: '1px solid #DCE6F5', p: 1 } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
          <Box sx={{ bgcolor: 'primary.lighter', p: 1, borderRadius: 2, display: 'flex', color: 'primary.main' }}>
            <KeyIcon />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={700}>
              {credentialModalData?.title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {credentialModalData?.subtitle}
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Alert severity="warning" sx={{ mb: 2.5, borderRadius: 2 }}>
            These temporary credentials are provided <strong>once</strong> for administrative distribution. They are not stored in plaintext and will not be displayed again.
          </Alert>

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Student Name"
                value={credentialModalData?.name || ''}
                InputProps={{ readOnly: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Register Number"
                value={credentialModalData?.registerNumber || ''}
                InputProps={{ readOnly: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="Institutional Login Email"
                value={credentialModalData?.email || ''}
                InputProps={{ readOnly: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="Temporary Password"
                type={showModalPassword ? 'text' : 'password'}
                value={credentialModalData?.temporaryPassword || ''}
                InputProps={{
                  readOnly: true,
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowModalPassword(!showModalPassword)} size="small" edge="end">
                        {showModalPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, display: 'flex', justifyContent: 'space-between' }}>
          <Button
            variant="outlined"
            startIcon={copied ? <CheckIcon color="success" /> : <ContentCopyIcon />}
            onClick={handleCopyCredentials}
            color={copied ? 'success' : 'primary'}
            sx={{ fontWeight: 600 }}
          >
            {copied ? 'Credentials Copied!' : 'Copy Credentials'}
          </Button>
          <Button variant="contained" onClick={() => setCredentialModalData(null)} sx={{ fontWeight: 600 }}>
            Done
          </Button>
        </DialogActions>
      </Dialog>

      {/* AI Student Import & Organization Dialog */}
      <AiStudentImportDialog
        open={aiImportDialogOpen}
        onClose={() => setAiImportDialogOpen(false)}
        onImportComplete={() => {
          fetchStudents();
          fetchLookups();
        }}
      />
    </Box>
  );
};
