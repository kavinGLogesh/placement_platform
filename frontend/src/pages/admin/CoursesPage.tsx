import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import RefreshIcon from '@mui/icons-material/Refresh';
import { AdminNavTabs } from '../../components/management/AdminNavTabs.js';
import { DataTable, Column } from '../../components/management/DataTable.js';
import { ConfirmDialog } from '../../components/management/ConfirmDialog.js';
import { managementService } from '../../services/management.service.js';
import { Course, Department } from '../../types/management.types.js';

export const CoursesPage: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Dialog State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [formData, setFormData] = useState<{
    departmentId: string;
    code: string;
    name: string;
    durationYears: number;
    level: 'UG' | 'PG';
  }>({
    departmentId: '',
    code: '',
    name: '',
    durationYears: 3,
    level: 'UG',
  });
  const [dialogError, setDialogError] = useState<string | null>(null);

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState<Course | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [courseList, deptList] = await Promise.all([
        managementService.getCourses(selectedDeptFilter || undefined),
        managementService.getDepartments(),
      ]);
      setCourses(courseList);
      setDepartments(deptList);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to load courses';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [selectedDeptFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenDialog = (course?: Course) => {
    setDialogError(null);
    if (course) {
      const isPG = course.durationYears <= 2 || course.name.toUpperCase().startsWith('M') || course.code.toUpperCase().startsWith('M');
      setEditingCourse(course);
      setFormData({
        departmentId: course.departmentId,
        code: course.code,
        name: course.name,
        durationYears: course.durationYears,
        level: isPG ? 'PG' : 'UG',
      });
    } else {
      setEditingCourse(null);
      setFormData({
        departmentId: selectedDeptFilter || departments[0]?.id || '',
        code: '',
        name: '',
        durationYears: 3,
        level: 'UG',
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingCourse(null);
    setDialogError(null);
  };

  const handleLevelChange = (newLevel: 'UG' | 'PG') => {
    setFormData((prev) => ({
      ...prev,
      level: newLevel,
      // Smart duration preset: UG defaults to 3 years, PG defaults to 2 years
      durationYears: newLevel === 'UG' ? (prev.durationYears === 2 ? 3 : prev.durationYears) : (prev.durationYears === 3 ? 2 : prev.durationYears),
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setDialogError(null);
    setError(null);
    try {
      if (editingCourse) {
        await managementService.updateCourse(editingCourse.id, {
          code: formData.code,
          name: formData.name,
          durationYears: Number(formData.durationYears),
        });
      } else {
        await managementService.createCourse({
          departmentId: formData.departmentId,
          code: formData.code,
          name: formData.name,
          durationYears: Number(formData.durationYears),
        });
      }
      handleCloseDialog();
      fetchData();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to save course';
      setDialogError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setError(null);
    try {
      await managementService.deleteCourse(deleteTarget.id);
      setDeleteTarget(null);
      fetchData();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to delete course';
      setError(msg);
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const filteredCourses = useMemo(() => {
    if (!search.trim()) return courses;
    const q = search.toLowerCase();
    return courses.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.department?.name.toLowerCase().includes(q)
    );
  }, [courses, search]);

  const columns: Column<Course>[] = [
    {
      id: 'code',
      label: 'Course Code',
      minWidth: 120,
      render: (c) => (
        <Chip label={c.code} size="small" color="secondary" sx={{ fontWeight: 700, borderRadius: 1.5 }} />
      ),
    },
    {
      id: 'name',
      label: 'Course Degree Name',
      minWidth: 240,
      render: (c) => (
        <Typography variant="body2" fontWeight={600}>
          {c.name}
        </Typography>
      ),
    },
    {
      id: 'level',
      label: 'Level',
      minWidth: 90,
      render: (c) => {
        const isPG = c.durationYears <= 2 || c.name.toUpperCase().startsWith('M') || c.code.toUpperCase().startsWith('M');
        return (
          <Chip
            label={isPG ? 'PG' : 'UG'}
            size="small"
            color={isPG ? 'secondary' : 'primary'}
            variant="outlined"
            sx={{ fontWeight: 700, borderRadius: 1.5 }}
          />
        );
      },
    },
    {
      id: 'department',
      label: 'Department',
      minWidth: 180,
      render: (c) => (
        <Typography variant="body2" color="text.secondary">
          {c.department?.name || '—'}
        </Typography>
      ),
    },
    {
      id: 'duration',
      label: 'Duration',
      minWidth: 100,
      render: (c) => `${c.durationYears} Years`,
    },
    {
      id: 'classes',
      label: 'Classes',
      minWidth: 100,
      render: (c) => c._count?.classes ?? 0,
    },
    {
      id: 'students',
      label: 'Students',
      minWidth: 100,
      render: (c) => (
        <Chip
          label={c._count?.students ?? 0}
          size="small"
          color={c._count?.students ? 'primary' : 'default'}
          variant="outlined"
          sx={{ fontWeight: 600 }}
        />
      ),
    },
    {
      id: 'actions',
      label: 'Actions',
      minWidth: 120,
      align: 'right',
      render: (c) => (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          <Tooltip title="Edit Course">
            <IconButton size="small" onClick={() => handleOpenDialog(c)} sx={{ color: 'primary.light' }}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete Course">
            <IconButton size="small" onClick={() => setDeleteTarget(c)} sx={{ color: 'error.light' }}>
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <AdminNavTabs />

      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <div>
          <Typography variant="overline" color="primary.light" fontWeight={700} letterSpacing={1.2}>
            Institutional Hierarchy — Tier 3
          </Typography>
          <Typography variant="h4" fontWeight={800} letterSpacing="-0.02em">
            Degree Courses
          </Typography>
        </div>

        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel id="dept-filter-label">Filter Department</InputLabel>
            <Select
              labelId="dept-filter-label"
              value={selectedDeptFilter}
              label="Filter Department"
              onChange={(e) => setSelectedDeptFilter(e.target.value)}
            >
              <MenuItem value="">All Departments</MenuItem>
              {departments.map((d) => (
                <MenuItem key={d.id} value={d.id}>
                  {d.code} - {d.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Button variant="outlined" color="inherit" startIcon={<RefreshIcon />} onClick={fetchData} disabled={loading}>
            Refresh
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            disabled={departments.length === 0}
          >
            Add Course
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" variant="outlined" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {departments.length === 0 && !loading && (
        <Alert severity="warning" variant="outlined" sx={{ mb: 3 }}>
          No Department found. Please create a Department under <b>Departments</b> first before adding courses.
        </Alert>
      )}

      <DataTable
        columns={columns}
        data={filteredCourses}
        loading={loading}
        searchValue={search}
        searchPlaceholder="Search courses by name or code..."
        onSearchChange={setSearch}
        emptyMessage="No degree courses found. Create your first course."
      />

      {/* Create / Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="sm"
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
        <form onSubmit={handleSave}>
          <DialogTitle sx={{ color: '#14264B', fontWeight: 700, borderBottom: '1px solid #DCE6F5', pb: 2 }}>
            {editingCourse ? 'Edit Degree Course' : 'Add Degree Course'}
          </DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 2.5 }}>
            {dialogError && (
              <Alert severity="error" variant="outlined" onClose={() => setDialogError(null)}>
                {dialogError}
              </Alert>
            )}

            {!editingCourse ? (
              <TextField
                select
                label="Department"
                required
                fullWidth
                value={formData.departmentId}
                onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                helperText="Select the academic department this course belongs to"
              >
                {departments.map((d) => (
                  <MenuItem key={d.id} value={d.id}>
                    {d.code} — {d.name}
                  </MenuItem>
                ))}
              </TextField>
            ) : (
              <TextField
                label="Department"
                disabled
                fullWidth
                value={`${editingCourse.department?.code || ''} — ${editingCourse.department?.name || ''}`}
              />
            )}

            <TextField
              label="Course Name"
              required
              fullWidth
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. B.Sc Computer Science, M.Sc Computer Science, B.Com, BBA"
              helperText="Full degree title (e.g., B.Sc Computer Science, M.Com)"
            />

            <TextField
              label="Course Code"
              required
              fullWidth
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              placeholder="e.g. BSC-CS, MSC-CS, BCOM, BBA"
              helperText="Unique abbreviation code within the department"
            />

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              <TextField
                select
                label="Course Level"
                required
                fullWidth
                value={formData.level}
                onChange={(e) => handleLevelChange(e.target.value as 'UG' | 'PG')}
                helperText="Undergraduate (UG) or Postgraduate (PG)"
              >
                <MenuItem value="UG">UG (Undergraduate — 3 Years)</MenuItem>
                <MenuItem value="PG">PG (Postgraduate — 2 Years)</MenuItem>
              </TextField>

              <TextField
                label="Duration (Years)"
                type="number"
                required
                fullWidth
                inputProps={{ min: 1, max: 6 }}
                value={formData.durationYears}
                onChange={(e) => setFormData({ ...formData, durationYears: Number(e.target.value) })}
                helperText="Standard degree duration in years"
              />
            </Box>

            <Typography variant="caption" color="text.secondary">
              Academic batch cohorts (e.g. 2026 Batch, Year 3) and class sections are organized under this degree course in the <b>Classes</b> tab.
            </Typography>
          </DialogContent>
          <DialogActions sx={{ p: 2.5 }}>
            <Button onClick={handleCloseDialog} color="inherit">
              Cancel
            </Button>
            <Button type="submit" variant="contained" color="primary" disabled={saving}>
              {saving ? <CircularProgress size={20} color="inherit" /> : 'Save Course'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Course"
        message={`Are you sure you want to delete course "${deleteTarget?.name}" (${deleteTarget?.code})?`}
        loading={deleting}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </Box>
  );
};
