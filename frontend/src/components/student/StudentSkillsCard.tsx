import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  Grid,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  LinearProgress,
} from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PsychologyIcon from '@mui/icons-material/Psychology';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { managementService } from '../../services/management.service.js';
import { StudentSkill } from '../../types/management.types.js';

const SKILL_CATEGORIES = [
  { value: 'TECHNICAL', label: 'Technical Skills' },
  { value: 'APTITUDE', label: 'Quantitative / Aptitude' },
  { value: 'COMMUNICATION', label: 'Communication' },
  { value: 'DOMAIN', label: 'Domain & Core' },
];

const SKILL_LEVELS = [
  { value: 'BEGINNER', label: 'Beginner (Basic Awareness)', percent: 25, color: '#3b82f6' },
  { value: 'INTERMEDIATE', label: 'Intermediate (Working Knowledge)', percent: 50, color: '#0ea5e9' },
  { value: 'PROFICIENT', label: 'Proficient (Hands-on Competency)', percent: 75, color: '#10b981' },
  { value: 'ADVANCED', label: 'Advanced (Expert / Production Ready)', percent: 100, color: '#059669' },
];

interface Props {
  studentId?: string;
  readOnly?: boolean;
}

export const StudentSkillsCard: React.FC<Props> = ({ studentId, readOnly = false }) => {
  const queryClient = useQueryClient();
  const queryKey = studentId ? ['admin-student-skills', studentId] : ['student-skills'];

  const { data: skills = [], isLoading, isError } = useQuery({
    queryKey,
    queryFn: () => managementService.getStudentSkills(studentId),
  });

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingSkill, setEditingSkill] = useState<StudentSkill | null>(null);
  const [skillName, setSkillName] = useState('');
  const [category, setCategory] = useState('TECHNICAL');
  const [level, setLevel] = useState('INTERMEDIATE');
  const [formError, setFormError] = useState<string | null>(null);

  // Add Mutation
  const addMutation = useMutation({
    mutationFn: (data: { name: string; category: string; level: string }) =>
      managementService.addStudentSkill(data, studentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ['student-profile'] });
      handleCloseModal();
    },
    onError: (err: any) => {
      setFormError(err?.response?.data?.message || err?.message || 'Failed to add skill');
    },
  });

  // Update Mutation
  const updateMutation = useMutation({
    mutationFn: (data: { skillId: string; name: string; category: string; level: string }) =>
      managementService.updateStudentSkill(
        data.skillId,
        { name: data.name, category: data.category, level: data.level },
        studentId
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ['student-profile'] });
      handleCloseModal();
    },
    onError: (err: any) => {
      setFormError(err?.response?.data?.message || err?.message || 'Failed to update skill');
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (skillId: string) => managementService.deleteStudentSkill(skillId, studentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ['student-profile'] });
    },
  });

  const handleOpenAdd = () => {
    setEditingSkill(null);
    setSkillName('');
    setCategory('TECHNICAL');
    setLevel('INTERMEDIATE');
    setFormError(null);
    setAddModalOpen(true);
  };

  const handleOpenEdit = (skill: StudentSkill) => {
    setEditingSkill(skill);
    setSkillName(skill.name);
    setCategory(skill.category);
    setLevel(skill.level);
    setFormError(null);
    setAddModalOpen(true);
  };

  const handleCloseModal = () => {
    setAddModalOpen(false);
    setEditingSkill(null);
    setSkillName('');
    setFormError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!skillName.trim()) {
      setFormError('Please enter a skill name');
      return;
    }

    if (editingSkill) {
      updateMutation.mutate({
        skillId: editingSkill.id,
        name: skillName.trim(),
        category,
        level,
      });
    } else {
      addMutation.mutate({
        name: skillName.trim(),
        category,
        level,
      });
    }
  };

  const handleDelete = (skillId: string, name: string) => {
    if (window.confirm(`Are you sure you want to remove "${name}" from your profile?`)) {
      deleteMutation.mutate(skillId);
    }
  };

  const getLevelConfig = (lvl: string) => {
    const found = SKILL_LEVELS.find((l) => l.value === lvl?.toUpperCase());
    return found || SKILL_LEVELS[1];
  };

  const getCategoryColor = (cat: string) => {
    switch (cat?.toUpperCase()) {
      case 'TECHNICAL':
        return { bg: '#e0f2fe', color: '#0369a1', border: '#bae6fd' };
      case 'APTITUDE':
        return { bg: '#fef3c7', color: '#b45309', border: '#fde68a' };
      case 'COMMUNICATION':
        return { bg: '#f3e8ff', color: '#7e22ce', border: '#e9d5ff' };
      default:
        return { bg: '#f1f5f9', color: '#475569', border: '#e2e8f0' };
    }
  };

  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: 2.5,
        backgroundColor: '#ffffff',
        border: '1px solid #DCE6F5',
        p: 3,
        mb: 3.5,
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PsychologyIcon sx={{ color: '#0284c7', fontSize: 24 }} />
          <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#14264B' }}>
            Candidate Skills & Competency Matrix
          </Typography>
          <Chip
            size="small"
            label={`${skills.length} Skills`}
            sx={{
              bgcolor: '#e0f2fe',
              color: '#0369a1',
              fontWeight: 700,
              fontSize: '0.75rem',
            }}
          />
        </Box>

        {!readOnly && (
          <Button
            variant="contained"
            size="small"
            startIcon={<AddCircleOutlineIcon />}
            onClick={handleOpenAdd}
            sx={{
              backgroundColor: '#0284c7',
              '&:hover': { backgroundColor: '#0369a1' },
              textTransform: 'none',
              fontWeight: 600,
              borderRadius: 2,
              px: 2,
            }}
          >
            Add Skill
          </Button>
        )}
      </Box>

      <Typography variant="body2" sx={{ color: '#64748b', mb: 2.5 }}>
        Maintain your technical capabilities, programming languages, and problem solving skills.
        These are verified and analyzed for campus placement criteria.
      </Typography>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={32} />
        </Box>
      ) : isError ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          Failed to load candidate skills. Please refresh.
        </Alert>
      ) : skills.length === 0 ? (
        <Box
          sx={{
            py: 4,
            px: 2,
            textAlign: 'center',
            bgcolor: '#f8fafc',
            borderRadius: 2,
            border: '1px dashed #cbd5e1',
          }}
        >
          <PsychologyIcon sx={{ fontSize: 40, color: '#94a3b8', mb: 1 }} />
          <Typography variant="body2" fontWeight={600} sx={{ color: '#334155' }}>
            No skills added yet
          </Typography>
          <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mt: 0.5 }}>
            Add programming languages, frameworks, or problem solving proficiencies to showcase your credentials.
          </Typography>
          {!readOnly && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<AddCircleOutlineIcon />}
              onClick={handleOpenAdd}
              sx={{ mt: 2, textTransform: 'none', borderRadius: 2 }}
            >
              Add First Skill
            </Button>
          )}
        </Box>
      ) : (
        <Grid container spacing={2}>
          {skills.map((skill) => {
            const lvlConfig = getLevelConfig(skill.level);
            const catStyle = getCategoryColor(skill.category);

            return (
              <Grid item xs={12} sm={6} md={4} key={skill.id}>
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    border: '1px solid #e2e8f0',
                    backgroundColor: '#ffffff',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      borderColor: '#94a3b8',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
                    },
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minHeight: 120,
                  }}
                >
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Typography variant="body2" fontWeight={700} sx={{ color: '#0f172a' }}>
                        {skill.name}
                      </Typography>
                      {!readOnly && (
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Tooltip title="Edit Skill">
                            <IconButton size="small" onClick={() => handleOpenEdit(skill)} sx={{ color: '#64748b' }}>
                              <EditIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Remove Skill">
                            <IconButton
                              size="small"
                              onClick={() => handleDelete(skill.id, skill.name)}
                              sx={{ color: '#ef4444' }}
                            >
                              <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      )}
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1.5, flexWrap: 'wrap' }}>
                      <Chip
                        size="small"
                        label={skill.category}
                        sx={{
                          bgcolor: catStyle.bg,
                          color: catStyle.color,
                          border: `1px solid ${catStyle.border}`,
                          fontWeight: 700,
                          fontSize: '0.68rem',
                          height: 20,
                        }}
                      />
                      <Chip
                        size="small"
                        label={skill.level}
                        sx={{
                          bgcolor: '#f1f5f9',
                          color: lvlConfig.color,
                          fontWeight: 700,
                          fontSize: '0.68rem',
                          height: 20,
                        }}
                      />
                      {skill.verified && (
                        <Tooltip title="Institutional Verified Skill">
                          <CheckCircleIcon sx={{ fontSize: 16, color: '#10b981' }} />
                        </Tooltip>
                      )}
                    </Box>
                  </Box>

                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.7rem' }}>
                        Proficiency
                      </Typography>
                      <Typography variant="caption" fontWeight={700} sx={{ color: lvlConfig.color, fontSize: '0.7rem' }}>
                        {lvlConfig.label.split(' ')[0]}
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={lvlConfig.percent}
                      sx={{
                        height: 5,
                        borderRadius: 3,
                        bgcolor: '#e2e8f0',
                        '& .MuiLinearProgress-bar': {
                          bgcolor: lvlConfig.color,
                          borderRadius: 3,
                        },
                      }}
                    />
                  </Box>
                </Box>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Add / Edit Skill Modal */}
      <Dialog open={addModalOpen} onClose={handleCloseModal} maxWidth="xs" fullWidth>
        <form onSubmit={handleSubmit}>
          <DialogTitle sx={{ fontWeight: 700, color: '#0f172a' }}>
            {editingSkill ? 'Edit Skill Proficiency' : 'Add New Skill'}
          </DialogTitle>
          <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 2 }}>
            {formError && <Alert severity="error">{formError}</Alert>}

            <TextField
              label="Skill Name"
              required
              fullWidth
              size="small"
              value={skillName}
              onChange={(e) => setSkillName(e.target.value)}
              placeholder="e.g. Python, React, SQL, Problem Solving"
            />

            <TextField
              select
              label="Skill Category"
              fullWidth
              size="small"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {SKILL_CATEGORIES.map((c) => (
                <MenuItem key={c.value} value={c.value}>
                  {c.label}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label="Proficiency Level"
              fullWidth
              size="small"
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              helperText="Select your realistic competency level"
            >
              {SKILL_LEVELS.map((lvl) => (
                <MenuItem key={lvl.value} value={lvl.value}>
                  {lvl.label}
                </MenuItem>
              ))}
            </TextField>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={handleCloseModal} sx={{ textTransform: 'none' }}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={addMutation.isPending || updateMutation.isPending}
              sx={{
                bgcolor: '#0284c7',
                '&:hover': { bgcolor: '#0369a1' },
                textTransform: 'none',
                fontWeight: 600,
              }}
            >
              {addMutation.isPending || updateMutation.isPending ? (
                <CircularProgress size={20} color="inherit" />
              ) : editingSkill ? (
                'Save Changes'
              ) : (
                'Add Skill'
              )}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Card>
  );
};
