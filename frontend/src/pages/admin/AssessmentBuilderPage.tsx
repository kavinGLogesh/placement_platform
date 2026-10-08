import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Grid,
  TextField,
  FormControlLabel,
  Switch,
  MenuItem,
  Chip,
  IconButton,
  Divider,
  Alert,
  CircularProgress,
  Card,
  Stepper,
  Step,
  StepLabel,
  Checkbox,
  FormControl,
  InputLabel,
  Select,
} from '@mui/material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import TuneIcon from '@mui/icons-material/Tune';
import BusinessIcon from '@mui/icons-material/Business';
import { assessmentService } from '../../services/assessment.service.js';
import { managementService } from '../../services/management.service.js';
import { companyService } from '../../services/company.service.js';
import { Department } from '../../types/management.types.js';
import { CompanyDto } from '../../types/company.types.js';
import {
  AssessmentComponent,
  CreateAssessmentDto,
  CreateAssessmentSectionDto,
  COMPONENT_LABELS,
  COMPONENT_TOPICS_MAP,
} from '../../types/assessment.types.js';
import { QuestionDifficulty, QuestionType } from '../../types/question.types.js';

const AVAILABLE_COMPONENTS: AssessmentComponent[] = [
  'APTITUDE',
  'LOGICAL_REASONING',
  'VERBAL_ABILITY',
  'TECHNICAL_MCQ',
  'CODING',
  'COMMUNICATION',
  'PSYCHOMETRIC',
];

const STEPS = [
  'Basic Details',
  'Sections & Topics',
  'Review & Schedule',
];

export const AssessmentBuilderPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlCompanyId = searchParams.get('companyId') || '';

  // Active Wizard Step (0: Details, 1: Sections, 2: Review)
  const [activeStep, setActiveStep] = useState(0);

  // Form State - Company Integration
  const [companyId, setCompanyId] = useState<string>(urlCompanyId);
  const [companies, setCompanies] = useState<CompanyDto[]>([]);

  // Form State - Step 1: Details
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState<number>(60);
  const [maximumAttempts, setMaximumAttempts] = useState<number>(1);
  const [passingPercentage, setPassingPercentage] = useState<number>(50);
  const [numberOfPapers, setNumberOfPapers] = useState<number>(1);
  const [negativeMarking, setNegativeMarking] = useState<boolean>(false);
  const [randomQuestions, setRandomQuestions] = useState<boolean>(true);
  const [randomOptions, setRandomOptions] = useState<boolean>(true);

  // Form State - Department Targeting
  const [departmentTargeting, setDepartmentTargeting] = useState<'ALL' | 'SPECIFIC'>('ALL');
  const [selectedDepartmentIds, setSelectedDepartmentIds] = useState<string[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  React.useEffect(() => {
    managementService.getDepartments().then(setDepartments).catch(() => {});
    companyService
      .getCompanies({ limit: 100, isActive: true })
      .then((res) => {
        const list = Array.isArray(res?.data) ? res.data : [];
        setCompanies(list);
        if (urlCompanyId && !name) {
          const found = list.find((c) => c.id === urlCompanyId);
          if (found) {
            setName(`${found.name} Placement Mock Assessment`);
            if (found.description && !description) {
              setDescription(found.description);
            }
          }
        }
      })
      .catch(() => setCompanies([]));
  }, [urlCompanyId]);

  // Form State - Step 2: Sections
  const [sections, setSections] = useState<CreateAssessmentSectionDto[]>([
    {
      component: 'APTITUDE',
      name: 'Quantitative Aptitude Section',
      topics: ['Percentage', 'Profit & Loss', 'Ratio & Proportion'],
      difficulty: 'MEDIUM',
      questionType: 'SINGLE_CHOICE',
      questionsCount: 10,
      marksPerQuestion: 1.0,
      negativeMarks: 0.25,
      sectionOrder: 1,
    },
  ]);

  // Form State - Step 3: Schedule
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Helper to add section
  const handleAddSection = (component: AssessmentComponent) => {
    const defaultTopics = [...COMPONENT_TOPICS_MAP[component]].slice(0, 3);
    const newSection: CreateAssessmentSectionDto = {
      component,
      name: `${COMPONENT_LABELS[component]} Section`,
      topics: defaultTopics as string[],
      difficulty: null,
      questionType: 'SINGLE_CHOICE',
      questionsCount: 5,
      marksPerQuestion: 1.0,
      negativeMarks: negativeMarking ? 0.25 : 0.0,
      sectionOrder: sections.length + 1,
    };
    setSections([...sections, newSection]);
  };

  const handleRemoveSection = (index: number) => {
    if (sections.length <= 1) {
      setErrorMessage('Assessment must retain at least one configured section');
      return;
    }
    const updated = sections.filter((_, i) => i !== index).map((s, idx) => ({
      ...s,
      sectionOrder: idx + 1,
    }));
    setSections(updated);
  };

  const handleUpdateSection = (index: number, patch: Partial<CreateAssessmentSectionDto>) => {
    const updated = [...sections];
    updated[index] = { ...updated[index], ...patch };
    setSections(updated);
  };

  const handleToggleTopic = (sectionIndex: number, topic: string) => {
    const sec = sections[sectionIndex];
    let newTopics: string[];
    if (sec.topics.includes(topic)) {
      newTopics = sec.topics.filter((t) => t !== topic);
    } else {
      newTopics = [...sec.topics, topic];
    }
    handleUpdateSection(sectionIndex, { topics: newTopics });
  };

  const handleSelectAllTopics = (sectionIndex: number) => {
    const sec = sections[sectionIndex];
    const allTopics = [...COMPONENT_TOPICS_MAP[sec.component]];
    handleUpdateSection(sectionIndex, { topics: allTopics as string[] });
  };

  const handleClearTopics = (sectionIndex: number) => {
    handleUpdateSection(sectionIndex, { topics: [] });
  };

  // Calculations
  const questionsPerPaper = sections.reduce((acc, s) => acc + (s.questionsCount || 0), 0);
  const marksPerPaper = sections.reduce(
    (acc, s) => acc + (s.questionsCount || 0) * (s.marksPerQuestion || 1.0),
    0
  );
  const totalUniqueQuestionsNeeded = numberOfPapers * questionsPerPaper;

  // Validation
  const validateStep = (step: number): boolean => {
    setErrorMessage(null);
    if (step === 0) {
      if (!name.trim()) {
        setErrorMessage('Assessment name is required');
        return false;
      }
      if (duration <= 0) {
        setErrorMessage('Duration must be greater than 0 minutes');
        return false;
      }
      if (maximumAttempts < 1) {
        setErrorMessage('Maximum attempts must be at least 1');
        return false;
      }
      if (numberOfPapers < 1 || numberOfPapers > 20) {
        setErrorMessage('Number of papers must be between 1 and 20');
        return false;
      }
      if (departmentTargeting === 'SPECIFIC' && selectedDepartmentIds.length === 0) {
        setErrorMessage('Please select at least one department for Specific Department targeting');
        return false;
      }
      return true;
    }

    if (step === 1) {
      if (sections.length === 0) {
        setErrorMessage('At least one section must be added');
        return false;
      }
      for (let i = 0; i < sections.length; i++) {
        const s = sections[i];
        if (!s.name.trim()) {
          setErrorMessage(`Section #${i + 1} name cannot be empty`);
          return false;
        }
        if (s.topics.length === 0) {
          setErrorMessage(`Section #${i + 1} (${s.name}) requires at least one topic selected`);
          return false;
        }
        if (s.questionsCount < 1) {
          setErrorMessage(`Section #${i + 1} questions count must be at least 1`);
          return false;
        }
      }
      return true;
    }

    if (step === 2) {
      if (startDate && endDate) {
        const s = new Date(startDate);
        const e = new Date(endDate);
        if (e.getTime() <= s.getTime()) {
          setErrorMessage('End date must be strictly after start date');
          return false;
        }
      }
      return true;
    }

    return true;
  };

  const handleNext = () => {
    if (validateStep(activeStep)) {
      setActiveStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setErrorMessage(null);
    setActiveStep((prev) => prev - 1);
  };

  // Submit Handler
  const handleSubmit = async () => {
    if (!validateStep(activeStep)) return;

    try {
      setSubmitting(true);
      setErrorMessage(null);

      const payload: CreateAssessmentDto = {
        name: name.trim(),
        companyId: companyId ? companyId : null,
        isCompanyAssessment: Boolean(companyId),
        description: description.trim() || null,
        duration,
        maximumAttempts,
        negativeMarking,
        randomQuestions,
        randomOptions,
        passingPercentage,
        numberOfPapers,
        startDate: startDate || null,
        endDate: endDate || null,
        departmentTargeting,
        departmentIds: departmentTargeting === 'SPECIFIC' ? selectedDepartmentIds : [],
        sections,
      };

      const created = await assessmentService.createAssessment(payload);
      navigate(`/admin/assessments/${created.id}`);
    } catch (err: unknown) {
      const errObj = err as {
        message?: string;
        response?: { data?: { message?: string; error?: { details?: Record<string, string> } } };
        data?: { message?: string; error?: { details?: Record<string, string> } };
        details?: Record<string, string>;
      };
      const responseData = errObj?.response?.data || errObj?.data;
      const details = errObj?.details || responseData?.error?.details;

      if (details && typeof details === 'object') {
        const detailMsgs = Object.entries(details)
          .map(([k, v]) => `${k}: ${v}`)
          .join('; ');
        setErrorMessage(`Validation error: ${detailMsgs}`);
      } else if (responseData?.message) {
        setErrorMessage(responseData.message);
      } else if (errObj?.message) {
        setErrorMessage(errObj.message);
      } else {
        setErrorMessage('Failed to create assessment. Please verify your parameters.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <IconButton onClick={() => navigate('/admin/assessments')} sx={{ color: '#526584', bgcolor: '#ffffff', border: '1px solid #DCE6F5', borderRadius: '6px' }}>
          <ArrowBackIcon fontSize="small" />
        </IconButton>
        <Box>
          <Typography variant="h5" fontWeight={700} sx={{ color: '#14264B' }}>
            Assessment Configuration Wizard
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Set up assessment parameters, select question topics, and generate deterministic test papers.
          </Typography>
        </Box>
      </Box>

      {/* Error Alert */}
      {errorMessage && (
        <Alert severity="error" sx={{ mb: 2.5 }} onClose={() => setErrorMessage(null)}>
          {errorMessage}
        </Alert>
      )}

      {/* Stepper Header */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 3,
          borderRadius: '8px',
          bgcolor: '#ffffff',
          border: '1px solid #DCE6F5',
        }}
      >
        <Stepper activeStep={activeStep}>
          {STEPS.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Paper>

      {/* STEP 1: GENERAL PARAMETERS */}
      {activeStep === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                borderRadius: '8px',
                bgcolor: '#ffffff',
                border: '1px solid #DCE6F5',
              }}
            >
              <Typography variant="h6" fontWeight={700} color="#14264B" sx={{ mb: 2.5 }}>
                1. Basic Details & Examination Rules
              </Typography>

              <Grid container spacing={2.5}>
                <Grid item xs={12}>
                  <FormControl fullWidth size="small">
                    <InputLabel id="target-company-label">Target Company (Optional Practice Track)</InputLabel>
                    <Select
                      labelId="target-company-label"
                      value={companyId}
                      label="Target Company (Optional Practice Track)"
                      onChange={(e) => {
                        const newId = e.target.value;
                        setCompanyId(newId);
                        if (newId) {
                          const found = companies.find((c) => c.id === newId);
                          if (found && (!name || name.includes('Placement Mock Assessment'))) {
                            setName(`${found.name} Placement Mock Assessment`);
                          }
                        }
                      }}
                    >
                      <MenuItem value="">
                        <em>General Placement Assessment (No Specific Company)</em>
                      </MenuItem>
                      {companies.map((comp) => (
                        <MenuItem key={comp.id} value={comp.id}>
                          🏢 {comp.name} ({comp.code})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {companyId && (
                  <Grid item xs={12}>
                    {(() => {
                      const selectedComp = companies.find((c) => c.id === companyId);
                      return (
                        <Alert
                          severity="info"
                          icon={<BusinessIcon fontSize="inherit" />}
                          sx={{
                            backgroundColor: '#eff6ff',
                            border: '1px solid #bfdbfe',
                            borderRadius: 2,
                            '& .MuiAlert-message': { width: '100%' },
                          }}
                        >
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1e40af' }}>
                              Company Preparation Assessment: {selectedComp?.name} ({selectedComp?.code})
                            </Typography>
                            <Chip label="Prep / Practice Mode" size="small" color="primary" sx={{ fontWeight: 600, fontSize: '0.75rem' }} />
                          </Box>
                          <Typography variant="body2" sx={{ color: '#3B82D0', mt: 0.5 }}>
                            {selectedComp?.description || 'Tailored mock assessment for recruitment pattern readiness.'} The automated paper generator will prioritize questions tagged with this company from the Question Bank.
                          </Typography>
                        </Alert>
                      );
                    })()}
                  </Grid>
                )}

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Assessment Name"
                    placeholder="e.g. Campus Placement Drive 2026 - Phase 1"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="Description & Instructions"
                    placeholder="Provide candidate guidelines, calculator rules, timing warnings..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </Grid>

                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Duration (Minutes)"
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    inputProps={{ min: 1 }}
                    required
                  />
                </Grid>

                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Max Attempts Allowed"
                    value={maximumAttempts}
                    onChange={(e) => setMaximumAttempts(Number(e.target.value))}
                    inputProps={{ min: 1 }}
                    required
                  />
                </Grid>

                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Passing Score (%)"
                    value={passingPercentage}
                    onChange={(e) => setPassingPercentage(Number(e.target.value))}
                    inputProps={{ min: 0, max: 100 }}
                    required
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Paper Sets to Generate (e.g. Set A, B)"
                    value={numberOfPapers}
                    onChange={(e) => setNumberOfPapers(Number(e.target.value))}
                    inputProps={{ min: 1, max: 10 }}
                    helperText="Generates distinct question sets to minimize cheating"
                    required
                  />
                </Grid>
              </Grid>

              <Divider sx={{ my: 3.5, borderColor: '#DCE6F5' }} />

              <Typography variant="h6" fontWeight={700} color="#14264B" sx={{ mb: 1 }}>
                Department Targeting
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Select whether this assessment is targeted for specific departments or open to all departments.
              </Typography>

              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6}>
                  <Card
                    onClick={() => {
                      setDepartmentTargeting('SPECIFIC');
                    }}
                    sx={{
                      p: 2.5,
                      cursor: 'pointer',
                      border: '2px solid',
                      borderColor: departmentTargeting === 'SPECIFIC' ? '#318992' : '#DCE6F5',
                      bgcolor: departmentTargeting === 'SPECIFIC' ? '#eff6ff' : '#ffffff',
                      borderRadius: 2,
                      transition: 'all 0.15s ease',
                      '&:hover': { borderColor: '#93c5fd' },
                    }}
                  >
                    <Typography variant="subtitle1" fontWeight={700} color="#14264B">
                      Specific Department
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontSize: '0.85rem' }}>
                      Restrict assessment eligibility to one or more selected departments.
                    </Typography>
                  </Card>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Card
                    onClick={() => {
                      setDepartmentTargeting('ALL');
                      setSelectedDepartmentIds([]);
                    }}
                    sx={{
                      p: 2.5,
                      cursor: 'pointer',
                      border: '2px solid',
                      borderColor: departmentTargeting === 'ALL' ? '#318992' : '#DCE6F5',
                      bgcolor: departmentTargeting === 'ALL' ? '#eff6ff' : '#ffffff',
                      borderRadius: 2,
                      transition: 'all 0.15s ease',
                      '&:hover': { borderColor: '#93c5fd' },
                    }}
                  >
                    <Typography variant="subtitle1" fontWeight={700} color="#14264B">
                      All Departments
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontSize: '0.85rem' }}>
                      Assessment is accessible and assignable across all departments.
                    </Typography>
                  </Card>
                </Grid>

                {departmentTargeting === 'SPECIFIC' && (
                  <Grid item xs={12}>
                    <FormControl fullWidth size="small" sx={{ mt: 1 }}>
                      <InputLabel id="target-departments-label">Select Applicable Departments</InputLabel>
                      <Select
                        labelId="target-departments-label"
                        multiple
                        value={selectedDepartmentIds}
                        label="Select Applicable Departments"
                        onChange={(e) => {
                          const val = e.target.value;
                          setSelectedDepartmentIds(typeof val === 'string' ? val.split(',') : val);
                        }}
                        renderValue={(selected) => (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {selected.map((val) => {
                              const dept = departments.find((d) => d.id === val);
                              return (
                                <Chip
                                  key={val}
                                  label={dept ? `${dept.code} — ${dept.name}` : val}
                                  size="small"
                                />
                              );
                            })}
                          </Box>
                        )}
                      >
                        {departments.map((dept) => (
                          <MenuItem key={dept.id} value={dept.id}>
                            <Checkbox checked={selectedDepartmentIds.indexOf(dept.id) > -1} />
                            <Typography variant="body2">
                              {dept.code} — {dept.name}
                            </Typography>
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                )}
              </Grid>

              <Divider sx={{ my: 3.5, borderColor: '#DCE6F5' }} />

              <Typography variant="h6" fontWeight={700} color="#14264B" sx={{ mb: 2 }}>
                Evaluation Options
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={negativeMarking}
                        onChange={(e) => setNegativeMarking(e.target.checked)}
                        color="primary"
                      />
                    }
                    label="Negative Marking"
                  />
                  <Typography variant="caption" display="block" color="text.secondary">
                    Deduct partial marks for incorrect MCQ submissions
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={4}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={randomQuestions}
                        onChange={(e) => setRandomQuestions(e.target.checked)}
                        color="primary"
                      />
                    }
                    label="Shuffle Questions"
                  />
                  <Typography variant="caption" display="block" color="text.secondary">
                    Randomize question order for each candidate
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={4}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={randomOptions}
                        onChange={(e) => setRandomOptions(e.target.checked)}
                        color="primary"
                      />
                    }
                    label="Shuffle MCQ Options"
                  />
                  <Typography variant="caption" display="block" color="text.secondary">
                    Permute answer choice order per candidate
                  </Typography>
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* Side Summary Card */}
          <Grid item xs={12} md={4}>
            <Card
              elevation={0}
              sx={{
                p: 2.5,
                bgcolor: '#ffffff',
                border: '1px solid #DCE6F5',
                borderRadius: '8px',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <TuneIcon sx={{ color: '#1765B5' }} />
                <Typography variant="h6" fontWeight={700} color="#14264B">
                  Assessment Blueprint
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                The selection engine will automatically fetch unique questions from your bank matching these criteria.
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Paper Sets:</Typography>
                  <Typography variant="body2" fontWeight={700} color="#14264B">{numberOfPapers} Paper(s)</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Test Duration:</Typography>
                  <Typography variant="body2" fontWeight={700} color="#14264B">{duration} mins</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Passing Score:</Typography>
                  <Typography variant="body2" fontWeight={700} color="#14264B">{passingPercentage}%</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Negative Marking:</Typography>
                  <Typography variant="body2" fontWeight={700} color={negativeMarking ? '#d97706' : '#7182A0'}>
                    {negativeMarking ? 'Active' : 'Disabled'}
                  </Typography>
                </Box>
              </Box>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* STEP 2: SECTION & TOPIC CONFIGURATION */}
      {activeStep === 1 && (
        <Box>
          {/* Quick Component Addition Toolbar */}
          <Paper
            elevation={0}
            sx={{
              p: 2,
              mb: 3,
              borderRadius: '8px',
              bgcolor: '#ffffff',
              border: '1px solid #DCE6F5',
            }}
          >
            <Typography variant="subtitle2" fontWeight={700} color="#14264B" sx={{ mb: 1.5 }}>
              Add Assessment Section:
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {AVAILABLE_COMPONENTS.map((comp) => (
                <Button
                  key={comp}
                  size="small"
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={() => handleAddSection(comp)}
                  sx={{
                    borderRadius: '6px',
                    textTransform: 'none',
                    bgcolor: '#ffffff',
                  }}
                >
                  {COMPONENT_LABELS[comp]}
                </Button>
              ))}
            </Box>
          </Paper>

          {/* Configured Sections List */}
          <Grid container spacing={3}>
            {sections.map((sec, idx) => (
              <Grid item xs={12} key={idx}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2.5,
                    borderRadius: '8px',
                    bgcolor: '#ffffff',
                    border: '1px solid #DCE6F5',
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Chip
                        label={`Section ${idx + 1}`}
                        size="small"
                        color="primary"
                        sx={{ fontWeight: 700 }}
                      />
                      <Chip
                        label={COMPONENT_LABELS[sec.component]}
                        size="small"
                        variant="outlined"
                        sx={{ fontWeight: 600, color: '#318992', borderColor: '#bfdbfe' }}
                      />
                    </Box>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleRemoveSection(idx)}
                      disabled={sections.length <= 1}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Box>

                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Section Title"
                        value={sec.name}
                        onChange={(e) => handleUpdateSection(idx, { name: e.target.value })}
                        required
                      />
                    </Grid>

                    <Grid item xs={12} sm={3}>
                      <TextField
                        fullWidth
                        size="small"
                        type="number"
                        label="Questions per Paper"
                        value={sec.questionsCount}
                        onChange={(e) => handleUpdateSection(idx, { questionsCount: Number(e.target.value) })}
                        inputProps={{ min: 1 }}
                        required
                      />
                    </Grid>

                    <Grid item xs={12} sm={3}>
                      <TextField
                        fullWidth
                        size="small"
                        type="number"
                        label="Marks per Question"
                        value={sec.marksPerQuestion}
                        onChange={(e) => handleUpdateSection(idx, { marksPerQuestion: Number(e.target.value) })}
                        inputProps={{ min: 0.5, step: 0.5 }}
                      />
                    </Grid>

                    <Grid item xs={12} sm={4}>
                      <TextField
                        fullWidth
                        size="small"
                        select
                        label="Target Difficulty"
                        value={sec.difficulty || ''}
                        onChange={(e) =>
                          handleUpdateSection(idx, {
                            difficulty: (e.target.value as QuestionDifficulty) || null,
                          })
                        }
                      >
                        <MenuItem value="">Any Difficulty (Mixed)</MenuItem>
                        <MenuItem value="EASY">EASY Only</MenuItem>
                        <MenuItem value="MEDIUM">MEDIUM Only</MenuItem>
                        <MenuItem value="HARD">HARD Only</MenuItem>
                      </TextField>
                    </Grid>

                    <Grid item xs={12} sm={4}>
                      <TextField
                        fullWidth
                        size="small"
                        select
                        label="Question Type"
                        value={sec.questionType || ''}
                        onChange={(e) =>
                          handleUpdateSection(idx, {
                            questionType: (e.target.value as QuestionType) || null,
                          })
                        }
                      >
                        <MenuItem value="">Any Question Type</MenuItem>
                        <MenuItem value="SINGLE_CHOICE">Single Choice (Radio)</MenuItem>
                        <MenuItem value="MULTIPLE_CHOICE">Multiple Choice</MenuItem>
                        <MenuItem value="TRUE_FALSE">True / False</MenuItem>
                        <MenuItem value="FILL_BLANK">Fill in Blanks</MenuItem>
                        <MenuItem value="DESCRIPTIVE">Descriptive / Subjective</MenuItem>
                      </TextField>
                    </Grid>

                    <Grid item xs={12} sm={4}>
                      <TextField
                        fullWidth
                        size="small"
                        type="number"
                        label="Negative Marks"
                        value={sec.negativeMarks}
                        onChange={(e) => handleUpdateSection(idx, { negativeMarks: Number(e.target.value) })}
                        inputProps={{ min: 0, step: 0.25 }}
                      />
                    </Grid>

                    {/* Topic Matrix Selector */}
                    <Grid item xs={12}>
                      <Box sx={{ mt: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Typography variant="caption" sx={{ color: '#526584', fontWeight: 600 }}>
                            Select Target Topics for {COMPONENT_LABELS[sec.component]}:
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button size="small" onClick={() => handleSelectAllTopics(idx)}>
                              Select All
                            </Button>
                            <Button size="small" color="inherit" onClick={() => handleClearTopics(idx)}>
                              Clear
                            </Button>
                          </Box>
                        </Box>

                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8 }}>
                          {COMPONENT_TOPICS_MAP[sec.component].map((topic) => {
                            const selected = sec.topics.includes(topic);
                            return (
                              <Chip
                                key={topic}
                                label={topic}
                                size="small"
                                clickable
                                color={selected ? 'primary' : 'default'}
                                variant={selected ? 'filled' : 'outlined'}
                                onClick={() => handleToggleTopic(idx, topic)}
                                sx={{
                                  borderRadius: 1.5,
                                  fontSize: '0.78rem',
                                  fontWeight: selected ? 600 : 400,
                                }}
                              />
                            );
                          })}
                        </Box>
                      </Box>
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* STEP 3: REVIEW & SCHEDULE */}
      {activeStep === 2 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                borderRadius: '8px',
                bgcolor: '#ffffff',
                border: '1px solid #DCE6F5',
              }}
            >
              <Typography variant="h6" fontWeight={700} color="#14264B" sx={{ mb: 1 }}>
                Optional Window Scheduling
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                You can specify an exam schedule now, or leave blank to launch it manually at any time.
              </Typography>

              <Grid container spacing={2.5}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="datetime-local"
                    label="Start Date & Time"
                    InputLabelProps={{ shrink: true }}
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="datetime-local"
                    label="End Date & Time"
                    InputLabelProps={{ shrink: true }}
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </Grid>
              </Grid>

              <Divider sx={{ my: 3.5, borderColor: '#DCE6F5' }} />

              <Typography variant="h6" fontWeight={700} color="#14264B" sx={{ mb: 2 }}>
                Configured Sections Breakdown
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {sections.map((sec, idx) => (
                  <Box
                    key={idx}
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      bgcolor: '#EDF2FF',
                      border: '1px solid #DCE6F5',
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="subtitle2" fontWeight={700} color="#14264B">
                        {idx + 1}. {sec.name} ({COMPONENT_LABELS[sec.component]})
                      </Typography>
                      <Typography variant="caption" color="text.secondary" fontWeight={600}>
                        {sec.questionsCount} Qs × {numberOfPapers} Papers = {sec.questionsCount * numberOfPapers} Total
                      </Typography>
                    </Box>
                    <Typography variant="caption" display="block" color="text.secondary" sx={{ mb: 1 }}>
                      Difficulty: {sec.difficulty || 'Any'} | Type: {sec.questionType || 'Any'} | Marks: {sec.marksPerQuestion} ea.
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {sec.topics.map((t) => (
                        <Chip key={t} label={t} size="small" variant="outlined" sx={{ fontSize: '0.7rem', bgcolor: '#ffffff' }} />
                      ))}
                    </Box>
                  </Box>
                ))}
              </Box>
            </Paper>
          </Grid>

          {/* Final Summary Card */}
          <Grid item xs={12} md={4}>
            <Card
              elevation={0}
              sx={{
                p: 2.5,
                bgcolor: '#ffffff',
                border: '1px solid #DCE6F5',
                borderRadius: '8px',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <CheckCircleOutlineIcon sx={{ color: '#047857' }} />
                <Typography variant="h6" fontWeight={700} color="#14264B">
                  Summary & Verification
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 3 }}>
                {companyId && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" color="text.secondary">Target Company:</Typography>
                    <Chip
                      label={companies.find((c) => c.id === companyId)?.code || 'Company Track'}
                      size="small"
                      color="primary"
                      sx={{ fontWeight: 700, fontSize: '0.75rem' }}
                    />
                  </Box>
                )}
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Questions per Paper:</Typography>
                  <Typography variant="body2" fontWeight={700} color="#14264B">{questionsPerPaper}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Total Marks per Paper:</Typography>
                  <Typography variant="body2" fontWeight={700} color="#14264B">{marksPerPaper}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Paper Sets:</Typography>
                  <Typography variant="body2" fontWeight={700} color="#14264B">{numberOfPapers}</Typography>
                </Box>
                <Divider sx={{ my: 1, borderColor: '#DCE6F5' }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" fontWeight={600} color="#318992">
                    Questions Required:
                  </Typography>
                  <Typography variant="body2" fontWeight={800} color="#318992">
                    {totalUniqueQuestionsNeeded} Questions
                  </Typography>
                </Box>
              </Box>

              <Alert severity="info" sx={{ fontSize: '0.8rem' }}>
                The question selection engine will verify that your bank has at least {totalUniqueQuestionsNeeded} eligible questions before creating the test papers.
              </Alert>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Navigation Buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
        <Button
          variant="outlined"
          onClick={activeStep === 0 ? () => navigate('/admin/assessments') : handleBack}
          disabled={submitting}
        >
          {activeStep === 0 ? 'Cancel' : 'Back'}
        </Button>

        {activeStep < STEPS.length - 1 ? (
          <Button variant="contained" color="primary" onClick={handleNext}>
            Proceed to {STEPS[activeStep + 1]}
          </Button>
        ) : (
          <Button
            variant="contained"
            color="primary"
            onClick={handleSubmit}
            disabled={submitting}
            startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : <CheckCircleOutlineIcon />}
          >
            {submitting ? 'Creating Assessment...' : 'Create Assessment'}
          </Button>
        )}
      </Box>
    </Box>
  );
};
