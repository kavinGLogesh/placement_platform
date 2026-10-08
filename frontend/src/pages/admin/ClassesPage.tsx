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
  Grid,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import RefreshIcon from '@mui/icons-material/Refresh';
import { AdminNavTabs } from '../../components/management/AdminNavTabs.js';
import { DataTable, Column } from '../../components/management/DataTable.js';
import { ConfirmDialog } from '../../components/management/ConfirmDialog.js';
import { managementService } from '../../services/management.service.js';
import { ClassEntity, Course, Department } from '../../types/management.types.js';

export const ClassesPage: React.FC = () => {
  const [classes, setClasses] = useState<ClassEntity[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Dialog State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassEntity | null>(null);
  const [formData, setFormData] = useState({
    departmentId: '',
    courseId: '',
    batchYear: new Date().getFullYear(),
    currentYear: 1,
    name: '',
  });

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState<ClassEntity | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [classList, courseList, deptList] = await Promise.all([
        managementService.getClasses(selectedCourseFilter || undefined),
        managementService.getCourses(),
        managementService.getDepartments(),
      ]);
      setClasses(classList);
      setCourses(courseList);
      setDepartments(deptList);
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'message' in err ? String((err as { message: unknown }).message) : 'Failed to load classes';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [selectedCourseFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenDialog = (cls?: ClassEntity) => {
    if (cls) {
      setEditingClass(cls);
      setFormData({
        departmentId: cls.departmentId,
        courseId: cls.courseId,
        batchYear: cls.batchYear,
        currentYear: cls.currentYear,
        name: cls.name,
      });
    } else {
      const defaultCourse = courses[0];
      const defaultDept = departments.find((d) => d.id === defaultCourse?.departmentId) || departments[0];
      const currentYr = 1;
      const batchYr = new Date().getFullYear();
      setEditingClass(null);
      setFormData({
        departmentId: defaultDept?.id || '',
        courseId: defaultCourse?.id || '',
        batchYear: batchYr,
        currentYear: currentYr,
        name: defaultCourse ? `${defaultCourse.code} Batch ${batchYr} Year ${currentYr}` : '',
      });
    }
    setDialogOpen(true);
  };

  const handleCourseChange = (courseId: string) => {
    const course = courses.find((c) => c.id === courseId);
    setFormData((prev) => ({
      ...prev,
      courseId,
      departmentId: course?.departmentId || prev.departmentId,
      name: course ? `${course.code} Batch ${prev.batchYear} Year ${prev.currentYear}` : prev.name,
    }));
  };

  const handleYearChange = (field: 'batchYear' | 'currentYear', value: number) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      const course = courses.find((c) => c.id === updated.courseId);
      return {
        ...updated,
        name: course ? `${course.code} Batch ${updated.batchYear} Year ${updated.currentYear}` : prev.name,
      };
    });
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingClass(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (editingClass) {
        await managementService.updateClass(editingClass.id, {
          name: formData.name,
          batchYear: Number(formData.batchYear),
          currentYear: Number(formData.currentYear),
        });
      } else {
        await managementService.createClass({
          departmentId: formData.departmentId,
          courseId: formData.courseId,
          batchYear: Number(formData.batchYear),
          currentYear: Number(formData.currentYear),
          name: formData.name,
        });
      }
      handleCloseDialog();
      fetchData();
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'message' in err ? String((err as { message: unknown }).message) : 'Failed to save class';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await managementService.deleteClass(deleteTarget.id);
      setDeleteTarget(null);
      fetchData();
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'message' in err ? String((err as { message: unknown }).message) : 'Failed to delete class';
      setError(msg);
    } finally {
      setDeleting(false);
    }
  };

  const filteredClasses = useMemo(() => {
    if (!search.trim()) return classes;
    const q = search.toLowerCase();
    return classes.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.course?.name.toLowerCase().includes(q) ||
        c.department?.name.toLowerCase().includes(q) ||
        String(c.batchYear).includes(q)
    );
  }, [classes, search]);

  const columns: Column<ClassEntity>[] = [
    {
      id: 'name',
      label: 'Class Group Name',
      minWidth: 220,
      render: (c) => (
        <Typography variant="body2" fontWeight={600}>
          {c.name}
        </Typography>
      ),
    },
    {
      id: 'course',
      label: 'Degree Course',
      minWidth: 160,
      render: (c) => (
        <Chip label={c.course?.code || '—'} size="small" color="secondary" sx={{ fontWeight: 700 }} />
      ),
    },
    {
      id: 'batchYear',
      label: 'Batch Year',
      minWidth: 120,
      render: (c) => c.batchYear,
    },
    {
      id: 'currentYear',
      label: 'Current Year',
      minWidth: 120,
      render: (c) => `Year ${c.currentYear}`,
    },
    {
      id: 'sections',
      label: 'Sections',
      minWidth: 100,
      render: (c) => c._count?.sections ?? 0,
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
          <Tooltip title="Edit Class">
            <IconButton size="small" onClick={() => handleOpenDialog(c)} sx={{ color: 'primary.light' }}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete Class">
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
            Institutional Hierarchy — Tier 4
          </Typography>
          <Typography variant="h4" fontWeight={800} letterSpacing="-0.02em">
            Academic Classes & Batches
          </Typography>
        </div>

        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel id="course-filter-label">Filter Course</InputLabel>
            <Select
              labelId="course-filter-label"
              value={selectedCourseFilter}
              label="Filter Course"
              onChange={(e) => setSelectedCourseFilter(e.target.value)}
            >
              <MenuItem value="">All Courses</MenuItem>
              {courses.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.code} - {c.name}
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
            disabled={courses.length === 0}
          >
            Create Class
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" variant="outlined" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {courses.length === 0 && !loading && (
        <Alert severity="warning" variant="outlined" sx={{ mb: 3 }}>
          No Degree Courses found. Please add a Course under <b>Courses</b> first before creating classes.
        </Alert>
      )}

      <DataTable
        columns={columns}
        data={filteredClasses}
        loading={loading}
        searchValue={search}
        searchPlaceholder="Search classes by name, batch, course..."
        onSearchChange={setSearch}
        emptyMessage="No classes found. Create your first academic class."
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
            {editingClass ? 'Edit Academic Class' : 'Create Academic Class'}
          </DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 2.5 }}>
            {!editingClass && (
              <TextField
                select
                label="Parent Course"
                required
                fullWidth
                value={formData.courseId}
                onChange={(e) => handleCourseChange(e.target.value)}
              >
                {courses.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.code} — {c.name}
                  </MenuItem>
                ))}
              </TextField>
            )}

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Graduation Batch Year"
                  type="number"
                  required
                  fullWidth
                  value={formData.batchYear}
                  onChange={(e) => handleYearChange('batchYear', Number(e.target.value))}
                  placeholder="e.g. 2026"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Current Academic Year"
                  type="number"
                  required
                  fullWidth
                  inputProps={{ min: 1, max: 6 }}
                  value={formData.currentYear}
                  onChange={(e) => handleYearChange('currentYear', Number(e.target.value))}
                  placeholder="1, 2, 3, 4"
                />
              </Grid>
            </Grid>

            <TextField
              label="Class Group Name"
              required
              fullWidth
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. CSE 2022-2026 - Year 3"
              helperText="Unique identifier label for this batch and academic year"
            />
          </DialogContent>
          <DialogActions sx={{ p: 2.5 }}>
            <Button onClick={handleCloseDialog} color="inherit">
              Cancel
            </Button>
            <Button type="submit" variant="contained" color="primary" disabled={saving}>
              {saving ? <CircularProgress size={20} color="inherit" /> : 'Save Class'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Class"
        message={`Are you sure you want to delete class "${deleteTarget?.name}"?`}
        loading={deleting}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </Box>
  );
};
