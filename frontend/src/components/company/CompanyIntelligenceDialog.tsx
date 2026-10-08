import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Grid,
  Card,
  CardContent,
  Chip,
  Divider,
  LinearProgress,
  IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import QuizIcon from '@mui/icons-material/Quiz';
import AssignmentIcon from '@mui/icons-material/Assignment';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import RepeatIcon from '@mui/icons-material/Repeat';
import HistoryIcon from '@mui/icons-material/History';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import LanguageIcon from '@mui/icons-material/Language';
import { companyService } from '../../services/company.service.js';
import { CompanyDto, CompanyQuestionIntelligenceDto } from '../../types/company.types.js';

interface CompanyIntelligenceDialogProps {
  open: boolean;
  company: CompanyDto | null;
  onClose: () => void;
  onOpenUpload: (company: CompanyDto) => void;
  onViewQuestions: (company: CompanyDto) => void;
  onCreateAssessment: (company: CompanyDto) => void;
  onReviewDuplicates?: (company: CompanyDto) => void;
}

export const CompanyIntelligenceDialog: React.FC<CompanyIntelligenceDialogProps> = ({
  open,
  company,
  onClose,
  onOpenUpload,
  onViewQuestions,
  onCreateAssessment,
  onReviewDuplicates,
}) => {
  const [loading, setLoading] = useState(false);
  const [intelligence, setIntelligence] = useState<CompanyQuestionIntelligenceDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && company) {
      setLoading(true);
      setError(null);
      companyService
        .getIntelligence(company.id)
        .then((data) => setIntelligence(data))
        .catch((err: any) => {
          const msg = err?.response?.data?.message || 'Failed to load company question intelligence';
          setError(msg);
        })
        .finally(() => setLoading(false));
    } else {
      setIntelligence(null);
    }
  }, [open, company]);

  if (!company) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#ffffff',
          color: '#14264B',
          borderBottom: '1px solid #DCE6F5',
          py: 2,
          px: 2.5,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Chip
            label={company.code}
            size="small"
            sx={{
              fontWeight: 700,
              backgroundColor: '#1765B5',
              color: '#ffffff',
              borderRadius: '4px',
              fontSize: '0.74rem',
              height: 24,
            }}
          />
          <Box>
            <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.2, color: '#14264B', fontSize: '1.05rem' }}>
              {company.name}
            </Typography>
            <Typography variant="caption" sx={{ color: '#7182A0', fontSize: '0.74rem' }}>
              Company Question Intelligence & Historical Drive Analytics
            </Typography>
          </Box>
        </Box>
        <IconButton size="small" onClick={onClose} sx={{ color: '#7182A0', '&:hover': { color: '#14264B' } }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 2.5, backgroundColor: '#EDF2FF' }}>
        {loading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8 }}>
            <CircularProgress size={32} sx={{ color: '#1765B5' }} />
            <Typography variant="body2" sx={{ mt: 2, color: '#7182A0' }}>
              Aggregating company questions, drive history, and pattern analytics...
            </Typography>
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : intelligence ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {/* Top KPI Cards */}
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <Card variant="outlined" sx={{ backgroundColor: '#ffffff', borderRadius: 1.5, borderColor: '#DCE6F5' }}>
                  <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Typography variant="caption" sx={{ color: '#7182A0', fontWeight: 600, letterSpacing: '0.04em' }}>
                      TOTAL QUESTIONS
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mt: 0.5 }}>
                      <Typography variant="h4" fontWeight={700} color="#14264B">
                        {intelligence.totalQuestions}
                      </Typography>
                      <QuizIcon sx={{ fontSize: 18, color: '#1765B5' }} />
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      Tagged corporate pool
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card variant="outlined" sx={{ backgroundColor: '#ffffff', borderRadius: 1.5, borderColor: '#DCE6F5' }}>
                  <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Typography variant="caption" sx={{ color: '#7182A0', fontWeight: 600, letterSpacing: '0.04em' }}>
                      REPEATED QUESTIONS
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mt: 0.5 }}>
                      <Typography variant="h4" fontWeight={700} color="#14264B">
                        {intelligence.repeatedQuestionsCount}
                      </Typography>
                      <RepeatIcon sx={{ fontSize: 18, color: '#526584' }} />
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      Multi-year / multi-drive occurrences
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card variant="outlined" sx={{ backgroundColor: '#ffffff', borderRadius: 1.5, borderColor: '#DCE6F5' }}>
                  <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Typography variant="caption" sx={{ color: '#7182A0', fontWeight: 600, letterSpacing: '0.04em' }}>
                      FREQUENTLY USED
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mt: 0.5 }}>
                      <Typography variant="h4" fontWeight={700} color="#14264B">
                        {intelligence.frequentlyUsedCount}
                      </Typography>
                      <VerifiedUserIcon sx={{ fontSize: 18, color: '#15803d' }} />
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      Used in &ge; 3 assessments
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card
                  variant="outlined"
                  sx={{
                    backgroundColor: intelligence.possibleDuplicatesCount > 0 ? '#fffbeb' : '#ffffff',
                    borderColor: intelligence.possibleDuplicatesCount > 0 ? '#fde68a' : '#DCE6F5',
                    borderRadius: 1.5,
                  }}
                >
                  <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Typography variant="caption" sx={{ color: '#7182A0', fontWeight: 600, letterSpacing: '0.04em' }}>
                      POSSIBLE DUPLICATES
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mt: 0.5 }}>
                      <Typography
                        variant="h4"
                        fontWeight={700}
                        color={intelligence.possibleDuplicatesCount > 0 ? '#b45309' : '#14264B'}
                      >
                        {intelligence.possibleDuplicatesCount}
                      </Typography>
                      <WarningAmberIcon
                        sx={{
                          fontSize: 18,
                          color: intelligence.possibleDuplicatesCount > 0 ? '#b45309' : '#8293B0',
                        }}
                      />
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      Flagged for Admin review
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Category Breakdown & Difficulty */}
            <Grid container spacing={2}>
              <Grid item xs={12} md={7}>
                <Card variant="outlined" sx={{ backgroundColor: '#ffffff', borderRadius: 1.5, borderColor: '#DCE6F5', height: '100%' }}>
                  <CardContent sx={{ p: 2.25 }}>
                    <Typography variant="subtitle2" fontWeight={600} sx={{ color: '#14264B', mb: 2 }}>
                      Component & Category Distribution
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                      {[
                        {
                          name: 'Quantitative Aptitude',
                          count: intelligence.categoryBreakdown.quantitativeAptitude,
                          color: '#1765B5',
                        },
                        {
                          name: 'Logical Reasoning',
                          count: intelligence.categoryBreakdown.logicalReasoning,
                          color: '#3B82D0',
                        },
                        {
                          name: 'Verbal Ability',
                          count: intelligence.categoryBreakdown.verbalAbility,
                          color: '#526584',
                        },
                        {
                          name: 'Technical MCQ',
                          count: intelligence.categoryBreakdown.technicalMcq,
                          color: '#0284c7',
                        },
                        {
                          name: 'Coding & Algorithmic',
                          count: intelligence.categoryBreakdown.coding,
                          color: '#15803d',
                        },
                      ].map((cat) => {
                        const pct =
                          intelligence.totalQuestions > 0
                            ? Math.round((cat.count / intelligence.totalQuestions) * 100)
                            : 0;
                        return (
                          <Box key={cat.name}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                              <Typography variant="body2" sx={{ fontWeight: 500, color: '#405678', fontSize: '0.84rem' }}>
                                {cat.name}
                              </Typography>
                              <Typography variant="body2" sx={{ fontWeight: 600, color: '#14264B', fontSize: '0.84rem' }}>
                                {cat.count} <span style={{ color: '#8293B0', fontWeight: 400 }}>({pct}%)</span>
                              </Typography>
                            </Box>
                            <LinearProgress
                              variant="determinate"
                              value={pct}
                              sx={{
                                height: 5,
                                borderRadius: 2,
                                backgroundColor: '#E7EEFA',
                                '& .MuiLinearProgress-bar': {
                                  backgroundColor: cat.color,
                                  borderRadius: 2,
                                },
                              }}
                            />
                          </Box>
                        );
                      })}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={5}>
                <Card variant="outlined" sx={{ backgroundColor: '#ffffff', borderRadius: 1.5, borderColor: '#DCE6F5', height: '100%' }}>
                  <CardContent sx={{ p: 2.25 }}>
                    <Typography variant="subtitle2" fontWeight={600} sx={{ color: '#14264B', mb: 2 }}>
                      Difficulty Distribution
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.25, backgroundColor: '#f0fdf4', borderRadius: 1, border: '1px solid #bbf7d0' }}>
                        <Typography variant="body2" fontWeight={600} color="#166534">
                          Easy
                        </Typography>
                        <Typography variant="subtitle1" fontWeight={700} color="#166534">
                          {intelligence.difficultyDistribution.easy}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.25, backgroundColor: '#eff6ff', borderRadius: 1, border: '1px solid #bfdbfe' }}>
                        <Typography variant="body2" fontWeight={600} color="#1e40af">
                          Medium
                        </Typography>
                        <Typography variant="subtitle1" fontWeight={700} color="#1e40af">
                          {intelligence.difficultyDistribution.medium}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.25, backgroundColor: '#fef2f2', borderRadius: 1, border: '1px solid #fecaca' }}>
                        <Typography variant="body2" fontWeight={600} color="#991b1b">
                          Hard
                        </Typography>
                        <Typography variant="subtitle1" fontWeight={700} color="#991b1b">
                          {intelligence.difficultyDistribution.hard}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Historical Years & Evidence Integrity */}
            <Card variant="outlined" sx={{ backgroundColor: '#ffffff', borderRadius: 1.5, borderColor: '#DCE6F5' }}>
              <CardContent sx={{ p: 2.25 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                  <HistoryIcon sx={{ fontSize: 18, color: '#526584' }} />
                  <Typography variant="subtitle2" fontWeight={600} color="#14264B">
                    Drive Years & Source Distribution
                  </Typography>
                </Box>
                {intelligence.yearDistribution.length > 0 ? (
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {intelligence.yearDistribution.map((yr) => (
                      <Chip
                        key={yr.year}
                        label={`${yr.year} Drive: ${yr.count} Questions`}
                        variant="outlined"
                        size="small"
                        sx={{ fontWeight: 500, color: '#405678', backgroundColor: '#EDF2FF', borderColor: '#D1DEF0' }}
                      />
                    ))}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No specific drive year records attached. Defaulting to general preparation pool.
                  </Typography>
                )}

                <Divider sx={{ my: 2, borderColor: '#E7EEFA' }} />

                <Typography variant="caption" sx={{ color: '#7182A0', fontWeight: 600, display: 'block', mb: 1, letterSpacing: '0.04em' }}>
                  QUESTION EVIDENCE CLASSIFICATION
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip
                    label={`Company Tagged: ${intelligence.evidenceLabels.companyTagged}`}
                    size="small"
                    sx={{ backgroundColor: '#EDF2FF', color: '#526584', fontWeight: 600, border: '1px solid #DCE6F5' }}
                  />
                  <Chip
                    label={`Reported Question: ${intelligence.evidenceLabels.reportedQuestion}`}
                    size="small"
                    sx={{ backgroundColor: '#f0fdf4', color: '#15803d', fontWeight: 600, border: '1px solid #bbf7d0' }}
                  />
                  <Chip
                    label={`Repeated Question: ${intelligence.evidenceLabels.repeatedQuestion}`}
                    size="small"
                    sx={{ backgroundColor: '#EDF2FF', color: '#1765B5', fontWeight: 600, border: '1px solid #D1DEF0' }}
                  />
                  <Chip
                    label={`Frequently Used: ${intelligence.evidenceLabels.frequentlyUsed}`}
                    size="small"
                    sx={{ backgroundColor: '#eff6ff', color: '#267D86', fontWeight: 600, border: '1px solid #bfdbfe' }}
                  />
                </Box>
              </CardContent>
            </Card>

            {/* Top Topics */}
            {intelligence.topicDistribution.length > 0 && (
              <Card variant="outlined" sx={{ backgroundColor: '#ffffff', borderRadius: 1.5, borderColor: '#DCE6F5' }}>
                <CardContent sx={{ p: 2.25 }}>
                  <Typography variant="subtitle2" fontWeight={600} color="#14264B" sx={{ mb: 1.5 }}>
                    Top Tagged Topics ({intelligence.topicDistribution.length} distinct topics)
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {intelligence.topicDistribution.slice(0, 15).map((t) => (
                      <Chip
                        key={`${t.category}-${t.topic}`}
                        label={`${t.topic} (${t.count})`}
                        size="small"
                        sx={{
                          fontWeight: 500,
                          backgroundColor: '#EDF2FF',
                          border: '1px solid #DCE6F5',
                          color: '#405678',
                          fontSize: '0.74rem',
                        }}
                      />
                    ))}
                  </Box>
                </CardContent>
              </Card>
            )}
          </Box>
        ) : null}
      </DialogContent>

      <DialogActions sx={{ p: 2, backgroundColor: '#ffffff', borderTop: '1px solid #DCE6F5', display: 'flex', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {company.website && (
            <Button
              size="small"
              variant="text"
              startIcon={<LanguageIcon />}
              href={company.website}
              target="_blank"
              rel="noopener noreferrer"
              sx={{ color: '#7182A0' }}
            >
              Corporate Portal
            </Button>
          )}
          {intelligence && intelligence.possibleDuplicatesCount > 0 && onReviewDuplicates && (
            <Button
              size="small"
              variant="outlined"
              color="warning"
              startIcon={<WarningAmberIcon />}
              onClick={() => onReviewDuplicates(company)}
            >
              Review Duplicates ({intelligence.possibleDuplicatesCount})
            </Button>
          )}
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            color="secondary"
            startIcon={<QuizIcon />}
            onClick={() => onViewQuestions(company)}
          >
            Question Bank
          </Button>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<CloudUploadIcon />}
            onClick={() => onOpenUpload(company)}
          >
            Upload Questions
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AssignmentIcon />}
            onClick={() => onCreateAssessment(company)}
          >
            Create Assessment
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};
