import React, { useState, useMemo } from 'react';
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
  Tabs,
  Tab,
} from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PsychologyIcon from '@mui/icons-material/Psychology';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import CodeIcon from '@mui/icons-material/Code';
import LayersOutlinedIcon from '@mui/icons-material/LayersOutlined';
import BuildOutlinedIcon from '@mui/icons-material/BuildOutlined';
import RecordVoiceOverOutlinedIcon from '@mui/icons-material/RecordVoiceOverOutlined';
import WorkOutlineIcon from '@mui/icons-material/WorkOutline';
import { managementService } from '../../services/management.service.js';
import { StudentSkill } from '../../types/management.types.js';
import { useAuth } from '../../hooks/useAuth.js';

export interface SkillCategoryConfig {
  value: string;
  label: string;
  shortLabel: string;
  description: string;
  color: { bg: string; color: string; border: string };
  icon: React.ReactElement;
}

export const SKILL_CATEGORIES: SkillCategoryConfig[] = [
  {
    value: 'PROGRAMMING_LANGUAGE',
    label: 'Programming Languages',
    shortLabel: 'Languages',
    description: 'Core languages (e.g. Python, Java, C++, TypeScript, Go)',
    color: { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
    icon: <CodeIcon sx={{ fontSize: 16 }} />,
  },
  {
    value: 'FRAMEWORK',
    label: 'Frameworks & Libraries',
    shortLabel: 'Frameworks',
    description: 'Development frameworks (e.g. React, Node.js, Spring Boot, Django, Next.js)',
    color: { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
    icon: <LayersOutlinedIcon sx={{ fontSize: 16 }} />,
  },
  {
    value: 'TECHNICAL',
    label: 'Technical Skills & Tools',
    shortLabel: 'Technical',
    description: 'Databases, Cloud & DevOps (e.g. SQL, Git, Docker, AWS, Linux, REST APIs)',
    color: { bg: '#e0f2fe', color: '#0369a1', border: '#bae6fd' },
    icon: <BuildOutlinedIcon sx={{ fontSize: 16 }} />,
  },
  {
    value: 'PROBLEM_SOLVING',
    label: 'Problem Solving & Competencies',
    shortLabel: 'Problem Solving',
    description: 'Data Structures, Algorithms, System Design & Analytical Problem Solving',
    color: { bg: '#fef3c7', color: '#b45309', border: '#fde68a' },
    icon: <PsychologyIcon sx={{ fontSize: 16 }} />,
  },
  {
    value: 'COMMUNICATION',
    label: 'Communication & Soft Skills',
    shortLabel: 'Communication',
    description: 'Professional communication, presentation, leadership & team collaboration',
    color: { bg: '#f3e8ff', color: '#7e22ce', border: '#e9d5ff' },
    icon: <RecordVoiceOverOutlinedIcon sx={{ fontSize: 16 }} />,
  },
  {
    value: 'DOMAIN',
    label: 'Domain & Core Engineering',
    shortLabel: 'Domain',
    description: 'Machine Learning, Data Science, Embedded Systems, Cyber Security, etc.',
    color: { bg: '#f1f5f9', color: '#475569', border: '#e2e8f0' },
    icon: <WorkOutlineIcon sx={{ fontSize: 16 }} />,
  },
];

export const SKILL_LEVELS = [
  { value: 'BEGINNER', label: 'Beginner (Basic Awareness)', shortLabel: 'Beginner', percent: 25, color: '#3b82f6', badgeBg: '#eff6ff' },
  { value: 'INTERMEDIATE', label: 'Intermediate (Working Knowledge)', shortLabel: 'Intermediate', percent: 50, color: '#0ea5e9', badgeBg: '#f0f9ff' },
  { value: 'PROFICIENT', label: 'Proficient (Hands-on Competency)', shortLabel: 'Proficient', percent: 75, color: '#0d9488', badgeBg: '#f0fdfa' },
  { value: 'ADVANCED', label: 'Advanced (Expert / Production Ready)', shortLabel: 'Advanced', percent: 100, color: '#059669', badgeBg: '#ecfdf5' },
];

const SUGGESTED_SKILLS = [
  { name: 'Python', category: 'PROGRAMMING_LANGUAGE' },
  { name: 'Java', category: 'PROGRAMMING_LANGUAGE' },
  { name: 'C++', category: 'PROGRAMMING_LANGUAGE' },
  { name: 'JavaScript / TypeScript', category: 'PROGRAMMING_LANGUAGE' },
  { name: 'React', category: 'FRAMEWORK' },
  { name: 'Node.js / Express', category: 'FRAMEWORK' },
  { name: 'Spring Boot', category: 'FRAMEWORK' },
  { name: 'SQL & Database Design', category: 'TECHNICAL' },
  { name: 'Data Structures & Algorithms', category: 'PROBLEM_SOLVING' },
  { name: 'Git & GitHub', category: 'TECHNICAL' },
  { name: 'Docker & Containers', category: 'TECHNICAL' },
  { name: 'Cloud Computing (AWS/GCP)', category: 'TECHNICAL' },
  { name: 'System Design', category: 'PROBLEM_SOLVING' },
  { name: 'Technical Presentation', category: 'COMMUNICATION' },
];

interface Props {
  studentId?: string;
  readOnly?: boolean;
}

export const StudentSkillsCard: React.FC<Props> = ({ studentId, readOnly = false }) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Strict Role-Based Access Control:
  // Placement Admins and Super Admins ALWAYS have read-only access to candidate skills.
  // Only students can add, edit, or remove skills in their portal.
  const isStudent = user?.role === 'STUDENT';
  const isAdmin = user?.role === 'PLACEMENT_ADMIN' || user?.role === 'SUPER_ADMIN';
  const isReadOnly = readOnly || isAdmin || !isStudent;

  const queryKey = studentId ? ['admin-student-skills', studentId] : ['student-skills'];

  const { data: skills = [], isLoading, isError } = useQuery({
    queryKey,
    queryFn: () => managementService.getStudentSkills(studentId),
    staleTime: 5000,
    refetchOnWindowFocus: true,
  });

  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingSkill, setEditingSkill] = useState<StudentSkill | null>(null);
  const [skillName, setSkillName] = useState('');
  const [category, setCategory] = useState('PROGRAMMING_LANGUAGE');
  const [level, setLevel] = useState('INTERMEDIATE');
  const [formError, setFormError] = useState<string | null>(null);

  // Add Mutation (Available only to students)
  const addMutation = useMutation({
    mutationFn: (data: { name: string; category: string; level: string }) =>
      managementService.addStudentSkill(data, studentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ['student-skills'] });
      queryClient.invalidateQueries({ queryKey: ['admin-student-skills'] });
      queryClient.invalidateQueries({ queryKey: ['student-profile'] });
      handleCloseModal();
    },
    onError: (err: any) => {
      setFormError(err?.response?.data?.message || err?.message || 'Failed to add skill');
    },
  });

  // Update Mutation (Available only to students)
  const updateMutation = useMutation({
    mutationFn: (data: { skillId: string; name: string; category: string; level: string }) =>
      managementService.updateStudentSkill(
        data.skillId,
        { name: data.name, category: data.category, level: data.level },
        studentId
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ['student-skills'] });
      queryClient.invalidateQueries({ queryKey: ['admin-student-skills'] });
      queryClient.invalidateQueries({ queryKey: ['student-profile'] });
      handleCloseModal();
    },
    onError: (err: any) => {
      setFormError(err?.response?.data?.message || err?.message || 'Failed to update skill');
    },
  });

  // Delete Mutation (Available only to students)
  const deleteMutation = useMutation({
    mutationFn: (skillId: string) => managementService.deleteStudentSkill(skillId, studentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ['student-skills'] });
      queryClient.invalidateQueries({ queryKey: ['admin-student-skills'] });
      queryClient.invalidateQueries({ queryKey: ['student-profile'] });
    },
  });

  const handleOpenAdd = () => {
    if (isReadOnly) return;
    setEditingSkill(null);
    setSkillName('');
    setCategory('PROGRAMMING_LANGUAGE');
    setLevel('INTERMEDIATE');
    setFormError(null);
    setAddModalOpen(true);
  };

  const handleOpenEdit = (skill: StudentSkill) => {
    if (isReadOnly) return;
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
    if (isReadOnly) return;

    if (!skillName.trim()) {
      setFormError('Please enter a skill or competency name');
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
    if (isReadOnly) return;
    if (window.confirm(`Are you sure you want to remove "${name}" from your competency matrix?`)) {
      deleteMutation.mutate(skillId);
    }
  };

  const getLevelConfig = (lvl: string) => {
    const found = SKILL_LEVELS.find((l) => l.value === (lvl || '').toUpperCase());
    return found || SKILL_LEVELS[1];
  };

  const getCategoryConfig = (cat: string): SkillCategoryConfig => {
    const normalized = (cat || '').toUpperCase();
    if (normalized === 'APTITUDE') {
      return SKILL_CATEGORIES.find((c) => c.value === 'PROBLEM_SOLVING')!;
    }
    const found = SKILL_CATEGORIES.find((c) => c.value === normalized);
    return found || SKILL_CATEGORIES[2]; // Default to Technical
  };

  // Filter skills by active category tab
  const filteredSkills = useMemo(() => {
    if (filterCategory === 'ALL') return skills;
    return skills.filter((s) => {
      const catConfig = getCategoryConfig(s.category);
      return catConfig.value === filterCategory;
    });
  }, [skills, filterCategory]);

  // Metric counts per category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: skills.length };
    SKILL_CATEGORIES.forEach((c) => {
      counts[c.value] = 0;
    });
    skills.forEach((s) => {
      const cfg = getCategoryConfig(s.category);
      counts[cfg.value] = (counts[cfg.value] || 0) + 1;
    });
    return counts;
  }, [skills]);

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
      {/* Header Bar */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, flexWrap: 'wrap', gap: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flexWrap: 'wrap' }}>
          <PsychologyIcon sx={{ color: '#0284c7', fontSize: 24 }} />
          <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#14264B' }}>
            Candidate Skills & Competency Matrix
          </Typography>

          <Chip
            size="small"
            label={`${skills.length} Competencies`}
            sx={{
              bgcolor: '#e0f2fe',
              color: '#0369a1',
              fontWeight: 700,
              fontSize: '0.75rem',
            }}
          />

          {isReadOnly && (
            <Chip
              size="small"
              icon={<LockOutlinedIcon sx={{ fontSize: '13px !important', color: '#64748B' }} />}
              label="Read Only • Student Self-Managed"
              sx={{
                bgcolor: '#F1F5F9',
                color: '#475569',
                fontWeight: 600,
                fontSize: '0.72rem',
                border: '1px solid #E2E8F0',
              }}
            />
          )}
        </Box>

        {/* Action Button: Visible exclusively to Students */}
        {!isReadOnly && (
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

      {/* Description */}
      <Typography variant="body2" sx={{ color: '#64748b', mb: 2 }}>
        {isReadOnly
          ? 'Candidate technical capabilities, programming languages, frameworks, and problem-solving proficiencies self-managed by the student through their portal.'
          : 'Maintain your programming languages, frameworks, technical skills, and problem-solving competencies. These are verified and analyzed for campus placement criteria.'}
      </Typography>

      {/* Category Filter Tabs */}
      {skills.length > 0 && (
        <Box sx={{ borderBottom: '1px solid #E2E8F0', mb: 2.5 }}>
          <Tabs
            value={filterCategory}
            onChange={(_, val) => setFilterCategory(val)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              minHeight: 38,
              '& .MuiTab-root': {
                minHeight: 38,
                fontSize: '0.78rem',
                fontWeight: 600,
                textTransform: 'none',
                py: 0.75,
                px: 1.5,
              },
            }}
          >
            <Tab label={`All (${categoryCounts.ALL})`} value="ALL" />
            {SKILL_CATEGORIES.map((cat) => {
              const count = categoryCounts[cat.value] || 0;
              if (count === 0 && isReadOnly) return null; // Don't crowd empty category tabs in Admin view
              return (
                <Tab
                  key={cat.value}
                  value={cat.value}
                  label={`${cat.shortLabel} (${count})`}
                  icon={cat.icon}
                  iconPosition="start"
                />
              );
            })}
          </Tabs>
        </Box>
      )}

      {/* Content Area */}
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={32} />
        </Box>
      ) : isError ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          Failed to load candidate skills. Please refresh.
        </Alert>
      ) : skills.length === 0 ? (
        /* Empty State */
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
          <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mt: 0.5, maxWidth: 500, mx: 'auto' }}>
            {isReadOnly
              ? 'Candidate has not added skills to their profile yet. Skills added or updated by the student in their Student Portal will automatically synchronize and appear here in real time.'
              : 'Add programming languages, frameworks, technical skills, or problem-solving competencies to showcase your credentials to recruiters.'}
          </Typography>

          {/* Student Quick Add CTA */}
          {!isReadOnly && (
            <Box sx={{ mt: 2.5 }}>
              <Button
                variant="contained"
                size="small"
                startIcon={<AddCircleOutlineIcon />}
                onClick={handleOpenAdd}
                sx={{
                  textTransform: 'none',
                  borderRadius: 2,
                  bgcolor: '#0284c7',
                  '&:hover': { bgcolor: '#0369a1' },
                  fontWeight: 600,
                  mb: 2,
                }}
              >
                Add First Skill
              </Button>

              <Typography variant="caption" sx={{ display: 'block', color: '#64748b', mb: 1, fontWeight: 600 }}>
                Popular placement skills:
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.75, justifyContent: 'center', flexWrap: 'wrap', maxWidth: 600, mx: 'auto' }}>
                {SUGGESTED_SKILLS.slice(0, 8).map((sugg) => (
                  <Chip
                    key={sugg.name}
                    label={`+ ${sugg.name}`}
                    size="small"
                    onClick={() => {
                      setSkillName(sugg.name);
                      setCategory(sugg.category);
                      setLevel('INTERMEDIATE');
                      setAddModalOpen(true);
                    }}
                    sx={{
                      cursor: 'pointer',
                      bgcolor: '#ffffff',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      '&:hover': { bgcolor: '#f1f5f9', borderColor: '#0284c7' },
                    }}
                  />
                ))}
              </Box>
            </Box>
          )}
        </Box>
      ) : (
        /* Competency Matrix Grid */
        <Grid container spacing={2}>
          {filteredSkills.map((skill) => {
            const lvlConfig = getLevelConfig(skill.level);
            const catConfig = getCategoryConfig(skill.category);

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
                      boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                    },
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minHeight: 124,
                  }}
                >
                  <Box>
                    {/* Skill Name & Action Controls */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Typography variant="body2" fontWeight={700} sx={{ color: '#0f172a' }}>
                        {skill.name}
                      </Typography>

                      {/* Action buttons rendered ONLY for Students */}
                      {!isReadOnly && (
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Tooltip title="Edit Proficiency">
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

                    {/* Category & Level Badges */}
                    <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center', mb: 1.5, flexWrap: 'wrap' }}>
                      <Chip
                        size="small"
                        icon={catConfig.icon}
                        label={catConfig.shortLabel}
                        sx={{
                          bgcolor: catConfig.color.bg,
                          color: catConfig.color.color,
                          border: `1px solid ${catConfig.color.border}`,
                          fontWeight: 700,
                          fontSize: '0.68rem',
                          height: 22,
                          '& .MuiChip-icon': { color: catConfig.color.color },
                        }}
                      />

                      <Chip
                        size="small"
                        label={lvlConfig.shortLabel}
                        sx={{
                          bgcolor: lvlConfig.badgeBg,
                          color: lvlConfig.color,
                          fontWeight: 700,
                          fontSize: '0.68rem',
                          height: 22,
                        }}
                      />

                      {skill.verified && (
                        <Tooltip title="Institutional Verified Skill">
                          <CheckCircleIcon sx={{ fontSize: 16, color: '#10b981' }} />
                        </Tooltip>
                      )}
                    </Box>
                  </Box>

                  {/* Proficiency Level Progress Bar */}
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.7rem', fontWeight: 500 }}>
                        Proficiency
                      </Typography>
                      <Typography variant="caption" fontWeight={700} sx={{ color: lvlConfig.color, fontSize: '0.7rem' }}>
                        {lvlConfig.shortLabel} ({lvlConfig.percent}%)
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={lvlConfig.percent}
                      sx={{
                        height: 6,
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

      {/* Add / Edit Skill Modal: Available exclusively in Student Portal */}
      {!isReadOnly && (
        <Dialog open={addModalOpen} onClose={handleCloseModal} maxWidth="xs" fullWidth>
          <form onSubmit={handleSubmit}>
            <DialogTitle sx={{ fontWeight: 700, color: '#0f172a' }}>
              {editingSkill ? 'Edit Skill Proficiency' : 'Add New Skill / Competency'}
            </DialogTitle>
            <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 2 }}>
              {formError && <Alert severity="error">{formError}</Alert>}

              {/* Skill Name */}
              <Box>
                <TextField
                  label="Skill or Competency Name"
                  required
                  fullWidth
                  size="small"
                  value={skillName}
                  onChange={(e) => setSkillName(e.target.value)}
                  placeholder="e.g. Python, React, SQL, Problem Solving"
                />

                {!editingSkill && (
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 1 }}>
                    {SUGGESTED_SKILLS.slice(0, 5).map((sugg) => (
                      <Chip
                        key={sugg.name}
                        label={sugg.name}
                        size="small"
                        onClick={() => {
                          setSkillName(sugg.name);
                          setCategory(sugg.category);
                        }}
                        sx={{ fontSize: '0.68rem', cursor: 'pointer' }}
                      />
                    ))}
                  </Box>
                )}
              </Box>

              {/* Skill Category */}
              <TextField
                select
                label="Competency Category"
                fullWidth
                size="small"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {SKILL_CATEGORIES.map((c) => (
                  <MenuItem key={c.value} value={c.value}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {c.icon}
                      <Box>
                        <Typography variant="body2" fontWeight={600}>
                          {c.label}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#64748B', display: 'block' }}>
                          {c.description}
                        </Typography>
                      </Box>
                    </Box>
                  </MenuItem>
                ))}
              </TextField>

              {/* Proficiency Level */}
              <TextField
                select
                label="Proficiency Level"
                fullWidth
                size="small"
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                helperText="Select your realistic competency level (verified during evaluations)"
              >
                {SKILL_LEVELS.map((lvl) => (
                  <MenuItem key={lvl.value} value={lvl.value}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                      <Typography variant="body2">{lvl.label}</Typography>
                      <Chip
                        label={`${lvl.percent}%`}
                        size="small"
                        sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700, bgcolor: lvl.badgeBg, color: lvl.color }}
                      />
                    </Box>
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
      )}
    </Card>
  );
};
