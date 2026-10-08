import React, { useState, useEffect, useMemo } from 'react';
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
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import RefreshIcon from '@mui/icons-material/Refresh';
import { AdminNavTabs } from '../../components/management/AdminNavTabs.js';
import { DataTable, Column } from '../../components/management/DataTable.js';
import { ConfirmDialog } from '../../components/management/ConfirmDialog.js';
import { managementService } from '../../services/management.service.js';
import { Department, College, Course } from '../../types/management.types.js';
import SchoolIcon from '@mui/icons-material/School';
import GroupsIcon from '@mui/icons-material/Groups';
import VisibilityIcon from '@mui/icons-material/Visibility';
import Paper from '@mui/material/Paper';

export const DepartmentsPage: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [colleges, setColleges] = useState<College[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Dialog State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [formData, setFormData] = useState({ collegeId: '', code: '', name: '' });
  const [dialogError, setDialogError] = useState<string | null>(null);

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState<Department | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [deptList, collegeList, courseList] = await Promise.all([
        managementService.getDepartments(),
        managementService.getColleges(),
        managementService.getCourses(),
      ]);
      setDepartments(deptList);
      setColleges(collegeList);
      setCourses(courseList);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to load departments';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenDialog = (dept?: Department) => {
    setDialogError(null);
    if (dept) {
      setEditingDept(dept);
      setFormData({
        collegeId: dept.collegeId,
        code: dept.code,
        name: dept.name,
      });
    } else {
      setEditingDept(null);
      setFormData({
        collegeId: colleges[0]?.id || '',
        code: '',
        name: '',
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingDept(null);
    setDialogError(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setDialogError(null);
    setError(null);
    try {
      if (editingDept) {
        await managementService.updateDepartment(editingDept.id, {
          code: formData.code,
          name: formData.name,
        });
      } else {
        await managementService.createDepartment(formData);
      }
      handleCloseDialog();
      fetchData();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to save department';
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
      await managementService.deleteDepartment(deleteTarget.id);
      setDeleteTarget(null);
      fetchData();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to delete department';
      setError(msg);
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  // Client-side search filtering
  const filteredDepartments = useMemo(() => {
    if (!search.trim()) return departments;
    const q = search.toLowerCase();
    return departments.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.code.toLowerCase().includes(q) ||
        d.college?.name.toLowerCase().includes(q)
    );
  }, [departments, search]);

  const columns: Column<Department>[] = [
    {
      id: 'name',
      label: 'Department Name with Course',
      minWidth: 320,
      render: (d) => {
        const deptCourses =
          d.courses && d.courses.length > 0
            ? d.courses
            : courses.filter((c) => c.departmentId === d.id);

        return (
          <Box sx={{ py: 1 }}>
            <Box
              onClick={() => setSelectedDept(d)}
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 1,
                mb: 0.8,
                cursor: 'pointer',
                '&:hover': { textDecoration: 'underline', color: '#1765B5' },
              }}
            >
              <Chip
                label={d.code}
                size="small"
                color="primary"
                sx={{ fontWeight: 700, borderRadius: 1.5, height: 24, fontSize: '0.75rem' }}
              />
              <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#14264B' }}>
                {d.name}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8, alignItems: 'center' }}>
              <Typography variant="caption" sx={{ color: '#7182A0', fontWeight: 600 }}>
                Course:
              </Typography>
              {deptCourses.length > 0 ? (
                deptCourses.map((c) => (
                  <Chip
                    key={c.id}
                    label={`${c.code} — ${c.name}`}
                    size="small"
                    variant="outlined"
                    sx={{
                      height: 22,
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      color: '#267D86',
                      borderColor: '#93C5FD',
                      bgcolor: '#F0F9FF',
                    }}
                  />
                ))
              ) : (
                <Typography variant="caption" sx={{ color: '#94A3B8', fontStyle: 'italic' }}>
                  No courses attached
                </Typography>
              )}
            </Box>
          </Box>
        );
      },
    },
    {
      id: 'students',
      label: 'Student Strength',
      minWidth: 160,
      render: (d) => {
        const count = d._count?.students ?? 0;
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              icon={<GroupsIcon sx={{ fontSize: 16 }} />}
              label={`${count} Students`}
              size="medium"
              color={count > 0 ? 'success' : 'default'}
              sx={{
                fontWeight: 700,
                fontSize: '0.85rem',
                borderRadius: 2,
                px: 1,
              }}
            />
          </Box>
        );
      },
    },
    {
      id: 'actions',
      label: 'Actions',
      minWidth: 120,
      align: 'right',
      render: (d) => (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          <Tooltip title="View Department Info">
            <IconButton size="small" onClick={() => setSelectedDept(d)} sx={{ color: '#1765B5' }}>
              <VisibilityIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Edit Department">
            <IconButton size="small" onClick={() => handleOpenDialog(d)} sx={{ color: 'primary.light' }}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete Department">
            <IconButton size="small" onClick={() => setDeleteTarget(d)} sx={{ color: 'error.light' }}>
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
            Institutional Hierarchy — Tier 2
          </Typography>
          <Typography variant="h4" fontWeight={800} letterSpacing="-0.02em">
            Academic Departments
          </Typography>
        </div>

        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            variant="outlined"
            color="inherit"
            startIcon={<RefreshIcon />}
            onClick={fetchData}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            disabled={colleges.length === 0}
          >
            Add Department
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" variant="outlined" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {colleges.length === 0 && !loading && (
        <Alert severity="warning" variant="outlined" sx={{ mb: 3 }}>
          No College found. Please register a College first under the <b>College</b> tab before creating departments.
        </Alert>
      )}

      <DataTable
        columns={columns}
        data={filteredDepartments}
        loading={loading}
        searchValue={search}
        searchPlaceholder="Search departments by name or code..."
        onSearchChange={setSearch}
        emptyMessage="No departments found. Create your first academic department."
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
            {editingDept ? 'Edit Department' : 'Create Academic Department'}
          </DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 2.5 }}>
            {dialogError && (
              <Alert severity="error" variant="outlined" onClose={() => setDialogError(null)}>
                {dialogError}
              </Alert>
            )}

            {!editingDept && colleges.length > 1 && (
              <TextField
                select
                label="Parent College"
                required
                fullWidth
                value={formData.collegeId}
                onChange={(e) => setFormData({ ...formData, collegeId: e.target.value })}
              >
                {colleges.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </MenuItem>
                ))}
              </TextField>
            )}

            <TextField
              label="Department Name"
              required
              fullWidth
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Computer Science, Commerce, Mathematics"
              helperText="Full academic department name"
            />

            <TextField
              label="Department Code"
              required
              fullWidth
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              placeholder="e.g. CS, COM, MATH, ENG"
              helperText="Unique abbreviation code for the department"
            />
          </DialogContent>
          <DialogActions sx={{ p: 2.5 }}>
            <Button onClick={handleCloseDialog} color="inherit">
              Cancel
            </Button>
            <Button type="submit" variant="contained" color="primary" disabled={saving}>
              {saving ? <CircularProgress size={20} color="inherit" /> : 'Save Department'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Department"
        message={`Are you sure you want to delete department "${deleteTarget?.name}" (${deleteTarget?.code})? This will restrictively protect existing courses and students.`}
        loading={deleting}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />

      {/* Department Info Modal: Department Name with Course & Student Strength */}
      <Dialog
        open={!!selectedDept}
        onClose={() => setSelectedDept(null)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            border: '1px solid #DCE6F5',
            overflow: 'hidden',
          },
        }}
      >
        {selectedDept && (
          <>
            <Box
              sx={{
                bgcolor: '#14264B',
                color: '#ffffff',
                px: 3,
                py: 2.5,
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
              }}
            >
              <Box
                sx={{
                  bgcolor: 'rgba(255, 255, 255, 0.12)',
                  p: 1,
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <SchoolIcon sx={{ color: '#60a5fa', fontSize: 24 }} />
              </Box>
              <Box>
                <Typography variant="h6" fontWeight={700}>
                  Department Overview
                </Typography>
                <Typography variant="caption" sx={{ color: '#DCE6F5' }}>
                  {selectedDept.code} — {selectedDept.name}
                </Typography>
              </Box>
            </Box>

            <DialogContent sx={{ p: 3 }}>
              {/* 1. Department Name with Course */}
              <Paper
                elevation={0}
                sx={{
                  p: 2.5,
                  mb: 2.5,
                  borderRadius: 2,
                  bgcolor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                }}
              >
                <Typography variant="caption" fontWeight={700} sx={{ color: '#64748B', letterSpacing: 0.8, display: 'block', mb: 1 }}>
                  1. DEPARTMENT NAME & COURSE
                </Typography>
                <Typography variant="h6" fontWeight={800} sx={{ color: '#14264B', mb: 1 }}>
                  {selectedDept.name} ({selectedDept.code})
                </Typography>

                <Box sx={{ mt: 1.5 }}>
                  <Typography variant="body2" fontWeight={600} sx={{ color: '#475569', mb: 1 }}>
                    Enrolled Degree Courses:
                  </Typography>
                  {(() => {
                    const deptCourses =
                      selectedDept.courses && selectedDept.courses.length > 0
                        ? selectedDept.courses
                        : courses.filter((c) => c.departmentId === selectedDept.id);

                    if (deptCourses.length === 0) {
                      return (
                        <Typography variant="body2" sx={{ color: '#94A3B8', fontStyle: 'italic' }}>
                          No degree courses assigned to this department yet.
                        </Typography>
                      );
                    }

                    return (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {deptCourses.map((c) => (
                          <Chip
                            key={c.id}
                            label={`${c.code} — ${c.name}`}
                            color="primary"
                            variant="outlined"
                            sx={{ fontWeight: 600, bgcolor: '#EFF6FF', borderColor: '#BFDBFE' }}
                          />
                        ))}
                      </Box>
                    );
                  })()}
                </Box>
              </Paper>

              {/* 2. Student Strength */}
              <Paper
                elevation={0}
                sx={{
                  p: 2.5,
                  borderRadius: 2,
                  bgcolor: '#F0FDF4',
                  border: '1px solid #BBF7D0',
                }}
              >
                <Typography variant="caption" fontWeight={700} sx={{ color: '#15803D', letterSpacing: 0.8, display: 'block', mb: 1 }}>
                  2. STUDENT STRENGTH
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <GroupsIcon sx={{ color: '#16A34A', fontSize: 32 }} />
                  <Box>
                    <Typography variant="h4" fontWeight={800} sx={{ color: '#166534' }}>
                      {selectedDept._count?.students ?? 0}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#15803D', fontWeight: 500 }}>
                      Total active students enrolled under this department
                    </Typography>
                  </Box>
                </Box>
              </Paper>
            </DialogContent>

            <DialogActions sx={{ p: 2.5, pt: 1, borderTop: '1px solid #E2E8F0' }}>
              <Button variant="contained" onClick={() => setSelectedDept(null)} sx={{ bgcolor: '#14264B', '&:hover': { bgcolor: '#233863' } }}>
                Close
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};
