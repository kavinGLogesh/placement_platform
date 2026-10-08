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
import { Section, ClassEntity } from '../../types/management.types.js';

export const SectionsPage: React.FC = () => {
  const [sections, setSections] = useState<Section[]>([]);
  const [classes, setClasses] = useState<ClassEntity[]>([]);
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Dialog State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [formData, setFormData] = useState({ classId: '', name: '' });

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState<Section | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sectionList, classList] = await Promise.all([
        managementService.getSections(selectedClassFilter || undefined),
        managementService.getClasses(),
      ]);
      setSections(sectionList);
      setClasses(classList);
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'message' in err ? String((err as { message: unknown }).message) : 'Failed to load sections';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [selectedClassFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenDialog = (sec?: Section) => {
    if (sec) {
      setEditingSection(sec);
      setFormData({
        classId: sec.classId,
        name: sec.name,
      });
    } else {
      setEditingSection(null);
      setFormData({
        classId: selectedClassFilter || classes[0]?.id || '',
        name: '',
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingSection(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (editingSection) {
        await managementService.updateSection(editingSection.id, {
          name: formData.name,
        });
      } else {
        await managementService.createSection({
          classId: formData.classId,
          name: formData.name,
        });
      }
      handleCloseDialog();
      fetchData();
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'message' in err ? String((err as { message: unknown }).message) : 'Failed to save section';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await managementService.deleteSection(deleteTarget.id);
      setDeleteTarget(null);
      fetchData();
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'message' in err ? String((err as { message: unknown }).message) : 'Failed to delete section';
      setError(msg);
    } finally {
      setDeleting(false);
    }
  };

  const filteredSections = useMemo(() => {
    if (!search.trim()) return sections;
    const q = search.toLowerCase();
    return sections.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.class?.name.toLowerCase().includes(q)
    );
  }, [sections, search]);

  const columns: Column<Section>[] = [
    {
      id: 'name',
      label: 'Section Name',
      minWidth: 140,
      render: (s) => (
        <Chip label={`Section ${s.name}`} size="small" color="primary" sx={{ fontWeight: 700 }} />
      ),
    },
    {
      id: 'class',
      label: 'Parent Class',
      minWidth: 260,
      render: (s) => (
        <Typography variant="body2" fontWeight={600}>
          {s.class?.name || '—'}
        </Typography>
      ),
    },
    {
      id: 'students',
      label: 'Enrolled Students',
      minWidth: 140,
      render: (s) => (
        <Chip
          label={s._count?.students ?? 0}
          size="small"
          color={s._count?.students ? 'success' : 'default'}
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
      render: (s) => (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          <Tooltip title="Edit Section">
            <IconButton size="small" onClick={() => handleOpenDialog(s)} sx={{ color: 'primary.light' }}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete Section">
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
      <AdminNavTabs />

      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <div>
          <Typography variant="overline" color="primary.light" fontWeight={700} letterSpacing={1.2}>
            Institutional Hierarchy — Tier 5
          </Typography>
          <Typography variant="h4" fontWeight={800} letterSpacing="-0.02em">
            Class Sections
          </Typography>
        </div>

        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel id="class-filter-label">Filter Class</InputLabel>
            <Select
              labelId="class-filter-label"
              value={selectedClassFilter}
              label="Filter Class"
              onChange={(e) => setSelectedClassFilter(e.target.value)}
            >
              <MenuItem value="">All Classes</MenuItem>
              {classes.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name}
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
            disabled={classes.length === 0}
          >
            Add Section
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" variant="outlined" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {classes.length === 0 && !loading && (
        <Alert severity="warning" variant="outlined" sx={{ mb: 3 }}>
          No Classes found. Please create a Class under <b>Classes</b> first before adding sections.
        </Alert>
      )}

      <DataTable
        columns={columns}
        data={filteredSections}
        loading={loading}
        searchValue={search}
        searchPlaceholder="Search sections by name..."
        onSearchChange={setSearch}
        emptyMessage="No sections found. Add your first class section."
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
            {editingSection ? 'Edit Class Section' : 'Add Class Section'}
          </DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 2.5 }}>
            {!editingSection && (
              <TextField
                select
                label="Parent Class"
                required
                fullWidth
                value={formData.classId}
                onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
              >
                {classes.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.name}
                  </MenuItem>
                ))}
              </TextField>
            )}

            <TextField
              label="Section Identifier"
              required
              fullWidth
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value.toUpperCase() })}
              placeholder="e.g. A, B, C or Alpha"
              helperText="Unique section name within this class"
            />
          </DialogContent>
          <DialogActions sx={{ p: 2.5 }}>
            <Button onClick={handleCloseDialog} color="inherit">
              Cancel
            </Button>
            <Button type="submit" variant="contained" color="primary" disabled={saving}>
              {saving ? <CircularProgress size={20} color="inherit" /> : 'Save Section'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Section"
        message={`Are you sure you want to delete Section "${deleteTarget?.name}"?`}
        loading={deleting}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </Box>
  );
};
