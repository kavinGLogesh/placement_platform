import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Chip,
  Divider,
} from '@mui/material';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import LanguageIcon from '@mui/icons-material/Language';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import BusinessIcon from '@mui/icons-material/Business';
import { AdminNavTabs } from '../../components/management/AdminNavTabs.js';
import { managementService } from '../../services/management.service.js';
import { College, CreateCollegeInput } from '../../types/management.types.js';

export const CollegePage: React.FC = () => {
  const [colleges, setColleges] = useState<College[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingCollege, setEditingCollege] = useState<College | null>(null);

  const [formData, setFormData] = useState<CreateCollegeInput>({
    code: '',
    name: '',
    address: '',
    website: '',
    contactEmail: '',
    contactPhone: '',
  });

  const fetchColleges = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await managementService.getColleges();
      setColleges(list);
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'message' in err ? String((err as { message: unknown }).message) : 'Failed to load college details';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchColleges();
  }, []);

  const handleOpenDialog = (college?: College) => {
    if (college) {
      setEditingCollege(college);
      setFormData({
        code: college.code,
        name: college.name,
        address: college.address || '',
        website: college.website || '',
        contactEmail: college.contactEmail || '',
        contactPhone: college.contactPhone || '',
      });
    } else {
      setEditingCollege(null);
      setFormData({
        code: '',
        name: '',
        address: '',
        website: '',
        contactEmail: '',
        contactPhone: '',
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingCollege(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (editingCollege) {
        await managementService.updateCollege(editingCollege.id, formData);
      } else {
        await managementService.createCollege(formData);
      }
      handleCloseDialog();
      fetchColleges();
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'message' in err ? String((err as { message: unknown }).message) : 'Failed to save college';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const activeCollege = colleges[0] || null;

  return (
    <Box>
      <AdminNavTabs />

      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <div>
          <Typography variant="overline" color="primary.light" fontWeight={700} letterSpacing={1.2}>
            Institutional Hierarchy — Tier 1
          </Typography>
          <Typography variant="h4" fontWeight={800} letterSpacing="-0.02em">
            College Profile & Campus Details
          </Typography>
        </div>

        {activeCollege ? (
          <Button
            variant="contained"
            color="primary"
            startIcon={<EditIcon />}
            onClick={() => handleOpenDialog(activeCollege)}
          >
            Edit College Details
          </Button>
        ) : (
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Register College
          </Button>
        )}
      </Box>

      {error && (
        <Alert severity="error" variant="outlined" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress size={40} />
        </Box>
      ) : activeCollege ? (
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent sx={{ p: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                  <Box
                    sx={{
                      width: 56,
                      height: 56,
                      borderRadius: 3,
                      background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <AccountBalanceIcon sx={{ color: '#ffffff', fontSize: 32 }} />
                  </Box>
                  <div>
                    <Typography variant="h5" fontWeight={700}>
                      {activeCollege.name}
                    </Typography>
                    <Chip label={`Institution Code: ${activeCollege.code}`} size="small" color="primary" sx={{ mt: 0.5, fontWeight: 600 }} />
                  </div>
                </Box>

                <Divider sx={{ my: 2.5, borderColor: 'rgba(255, 255, 255, 0.08)' }} />

                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <LocationOnIcon sx={{ color: 'primary.light' }} />
                      <div>
                        <Typography variant="caption" color="text.secondary">
                          Campus Address
                        </Typography>
                        <Typography variant="body2" fontWeight={500}>
                          {activeCollege.address || 'Not specified'}
                        </Typography>
                      </div>
                    </Box>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <LanguageIcon sx={{ color: 'secondary.light' }} />
                      <div>
                        <Typography variant="caption" color="text.secondary">
                          Official Website
                        </Typography>
                        <Typography variant="body2" fontWeight={500}>
                          {activeCollege.website ? (
                            <a href={activeCollege.website} target="_blank" rel="noreferrer" style={{ color: '#818cf8' }}>
                              {activeCollege.website}
                            </a>
                          ) : (
                            'Not specified'
                          )}
                        </Typography>
                      </div>
                    </Box>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <EmailIcon sx={{ color: 'success.light' }} />
                      <div>
                        <Typography variant="caption" color="text.secondary">
                          Contact Email
                        </Typography>
                        <Typography variant="body2" fontWeight={500}>
                          {activeCollege.contactEmail || 'Not specified'}
                        </Typography>
                      </div>
                    </Box>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <PhoneIcon sx={{ color: 'warning.light' }} />
                      <div>
                        <Typography variant="caption" color="text.secondary">
                          Contact Phone
                        </Typography>
                        <Typography variant="body2" fontWeight={500}>
                          {activeCollege.contactPhone || 'Not specified'}
                        </Typography>
                      </div>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ p: 4, display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%' }}>
                <Typography variant="overline" color="text.secondary" fontWeight={700}>
                  Institutional Capacity
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
                  <BusinessIcon sx={{ fontSize: 44, color: 'primary.light' }} />
                  <div>
                    <Typography variant="h3" fontWeight={800} color="primary.light">
                      {activeCollege._count?.departments ?? 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Active Departments
                    </Typography>
                  </div>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      ) : (
        <Card>
          <CardContent sx={{ p: 6, textAlign: 'center' }}>
            <AccountBalanceIcon sx={{ fontSize: 60, color: 'text.secondary', opacity: 0.5, mb: 2 }} />
            <Typography variant="h6" fontWeight={700} gutterBottom>
              No College Profile Configured
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Initialize the College record to set the root anchor for departments, courses, classes, and students.
            </Typography>
            <Button variant="contained" color="primary" onClick={() => handleOpenDialog()}>
              Register College Now
            </Button>
          </CardContent>
        </Card>
      )}

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
            {editingCollege ? 'Edit College Information' : 'Register College'}
          </DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 2.5 }}>
            <TextField
              label="College Code"
              required
              fullWidth
              disabled={!!editingCollege}
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              helperText={editingCollege ? 'College code cannot be altered once registered' : 'Unique identifier (e.g. MIT, CIT)'}
            />
            <TextField
              label="College Name"
              required
              fullWidth
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <TextField
              label="Campus Address"
              fullWidth
              multiline
              rows={2}
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
            <TextField
              label="Official Website"
              fullWidth
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              placeholder="https://..."
            />
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Contact Email"
                  type="email"
                  fullWidth
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Contact Phone"
                  fullWidth
                  value={formData.contactPhone}
                  onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 2.5 }}>
            <Button onClick={handleCloseDialog} color="inherit">
              Cancel
            </Button>
            <Button type="submit" variant="contained" color="primary" disabled={saving}>
              {saving ? <CircularProgress size={20} color="inherit" /> : 'Save Details'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};
