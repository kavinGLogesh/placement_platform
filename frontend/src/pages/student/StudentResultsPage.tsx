import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActions,
  Grid,
  Button,
  Chip,
  Alert,
  CircularProgress,
  Divider,
} from '@mui/material';
import AssessmentIcon from '@mui/icons-material/Assessment';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import { useNavigate } from 'react-router-dom';
import { attemptService } from '../../services/attempt.service.js';
import { AssessmentResultDto } from '../../types/attempt.types.js';

export const StudentResultsPage: React.FC = () => {
  const navigate = useNavigate();
  const [results, setResults] = useState<AssessmentResultDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadResults();
  }, []);

  const loadResults = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await attemptService.getStudentResults();
      setResults(data);
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : 'Failed to load results';
      setError(msg || 'Failed to load results');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <div>
          <Typography variant="overline" sx={{ color: '#318992', fontWeight: 700, letterSpacing: '0.08em' }}>
            PERFORMANCE & QUALIFICATION EVALUATION
          </Typography>
          <Typography variant="h4" fontWeight={800} sx={{ color: '#14264B', letterSpacing: '-0.02em', mb: 0.5 }}>
            My Assessment Results
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Authoritative test scores, pass/fail status, and detailed question-by-question performance breakdowns.
          </Typography>
        </div>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" size="small" onClick={() => navigate('/student/tests')}>
            Assigned Tests
          </Button>
          <Button variant="text" size="small" onClick={() => navigate('/student/dashboard')}>
            Dashboard
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8, bgcolor: '#ffffff', borderRadius: 2.5, border: '1px solid #DCE6F5' }}>
          <CircularProgress size={32} />
        </Box>
      ) : results.length === 0 ? (
        <Card sx={{ textAlign: 'center', py: 8, px: 3, bgcolor: '#ffffff', border: '1px solid #DCE6F5', borderRadius: 2.5 }}>
          <AssessmentIcon sx={{ fontSize: 48, color: '#8293B0', mb: 2 }} />
          <Typography variant="h6" fontWeight={700} color="#14264B" gutterBottom>
            No Completed Results Yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            You haven't completed any assessments yet. Visit your assigned tests to begin.
          </Typography>
          <Button variant="contained" onClick={() => navigate('/student/tests')}>
            View Assigned Tests
          </Button>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {results.map((result) => {
            const isPassed = result.isPassed;
            return (
              <Grid item xs={12} sm={6} lg={4} key={result.id}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    bgcolor: '#ffffff',
                    border: '1px solid #DCE6F5',
                    borderRadius: 2.5,
                    boxShadow: '0 1px 3px rgba(20, 38, 75, 0.04)',
                    transition: 'all 0.15s ease',
                    '&:hover': {
                      borderColor: isPassed ? '#10b981' : '#f87171',
                      boxShadow: '0 6px 20px rgba(20, 38, 75, 0.08)',
                    },
                  }}
                >
                  <CardContent sx={{ flexGrow: 1, p: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Typography variant="h6" fontWeight={700} color="#14264B" sx={{ pr: 1 }}>
                        {result.assessment?.name || 'Assessment Result'}
                      </Typography>
                      <Chip
                        size="small"
                        icon={isPassed ? <CheckCircleIcon sx={{ '&&': { fontSize: 16 } }} /> : <CancelIcon sx={{ '&&': { fontSize: 16 } }} />}
                        label={isPassed ? 'PASSED' : 'FAILED'}
                        sx={{
                          fontWeight: 700,
                          fontSize: '0.72rem',
                          bgcolor: isPassed ? '#ecfdf5' : '#fef2f2',
                          color: isPassed ? '#059669' : '#dc2626',
                          border: '1px solid',
                          borderColor: isPassed ? '#a7f3d0' : '#fecaca',
                        }}
                      />
                    </Box>

                    {/* Big Score Display */}
                    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, my: 2 }}>
                      <Typography variant="h3" fontWeight={800} sx={{ color: isPassed ? '#059669' : '#14264B' }}>
                        {result.percentage}%
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        ({result.obtainedMarks} / {result.totalMarks} marks)
                      </Typography>
                    </Box>

                    <Divider sx={{ my: 2, borderColor: '#DCE6F5' }} />

                    {/* Breakdown Metrics */}
                    <Grid container spacing={1}>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">
                          Correct Answers
                        </Typography>
                        <Typography variant="body2" fontWeight={700} sx={{ color: '#059669' }}>
                          {result.correctCount}
                        </Typography>
                      </Grid>

                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">
                          Accuracy
                        </Typography>
                        <Typography variant="body2" fontWeight={700} color="#14264B">
                          {result.accuracy}%
                        </Typography>
                      </Grid>

                      <Grid item xs={6} sx={{ mt: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                          Incorrect
                        </Typography>
                        <Typography variant="body2" fontWeight={700} sx={{ color: '#dc2626' }}>
                          {result.incorrectCount}
                        </Typography>
                      </Grid>

                      <Grid item xs={6} sx={{ mt: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                          Unanswered
                        </Typography>
                        <Typography variant="body2" fontWeight={700} color="text.secondary">
                          {result.unansweredCount}
                        </Typography>
                      </Grid>
                    </Grid>

                    <Box sx={{ mt: 2, pt: 1, borderTop: '1px dashed #DCE6F5' }}>
                      <Typography variant="caption" color="text.secondary">
                        Date: {new Date(result.createdAt).toLocaleDateString()} at{' '}
                        {new Date(result.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Typography>
                    </Box>
                  </CardContent>

                  <CardActions sx={{ p: 2.5, pt: 0 }}>
                    <Button
                      fullWidth
                      variant="outlined"
                      endIcon={<ArrowForwardIcon />}
                      onClick={() => navigate(`/student/results/${result.id}`)}
                      sx={{ fontWeight: 600 }}
                    >
                      View Detailed Scorecard
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}
    </Box>
  );
};
