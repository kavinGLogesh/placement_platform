import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Chip,
  Alert,
  CircularProgress,
  Divider,
  Paper,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import SecurityIcon from '@mui/icons-material/Security';
import GradeIcon from '@mui/icons-material/Grade';
import SpeedIcon from '@mui/icons-material/Speed';
import { useParams, useNavigate } from 'react-router-dom';
import { attemptService } from '../../services/attempt.service.js';
import { AssessmentResultDto } from '../../types/attempt.types.js';

export const StudentResultDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [result, setResult] = useState<AssessmentResultDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    loadResultDetail(id);
  }, [id]);

  const loadResultDetail = async (resultId: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await attemptService.getResultDetail(resultId);
      setResult(data);
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : 'Failed to load result details';
      setError(msg || 'Failed to load result details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !result) {
    return (
      <Box sx={{ p: 4, maxWidth: 600, mx: 'auto' }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error || 'Result not found or access denied.'}
        </Alert>
        <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate('/student/results')}>
          Back to Results
        </Button>
      </Box>
    );
  }

  const isPassed = result.isPassed;
  const passingPercentage = result.assessment?.passingPercentage ?? 50;

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1000, mx: 'auto' }}>
      {/* Top Breadcrumb / Navigation */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button
          variant="text"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/student/results')}
          sx={{ fontWeight: 600 }}
        >
          Back to Results
        </Button>
        <Button variant="outlined" size="small" onClick={() => navigate('/student/tests')}>
          Assigned Tests
        </Button>
      </Box>

      {/* Main Performance Card */}
      <Card
        sx={{
          mb: 4,
          border: '1px solid rgba(255, 255, 255, 0.08)',
          background: isPassed
            ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(20, 38, 75, 0.95) 100%)'
            : 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(20, 38, 75, 0.95) 100%)',
        }}
      >
        <CardContent sx={{ p: { xs: 3, md: 4 } }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2, mb: 3 }}>
            <div>
              <Typography variant="overline" color="text.secondary" fontWeight={700}>
                Assessment Evaluation
              </Typography>
              <Typography variant="h4" fontWeight={800} letterSpacing="-0.02em">
                {result.assessment?.name || 'Assessment Performance Report'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Completed on {new Date(result.createdAt).toLocaleDateString()} at{' '}
                {new Date(result.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Typography>
            </div>

            <Chip
              icon={isPassed ? <CheckCircleIcon /> : <CancelIcon />}
              label={isPassed ? 'PASSED' : 'FAILED'}
              color={isPassed ? 'success' : 'error'}
              sx={{ py: 2.5, px: 2, fontSize: '1rem', fontWeight: 800 }}
            />
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* 4 Key Metrics */}
          <Grid container spacing={3}>
            {/* 1. Score */}
            <Grid item xs={12} sm={6} md={3}>
              <Paper variant="outlined" sx={{ p: 2.5, bgcolor: 'rgba(255, 255, 255, 0.02)', textAlign: 'center' }}>
                <GradeIcon sx={{ color: 'primary.light', fontSize: 32, mb: 1 }} />
                <Typography variant="caption" color="text.secondary" display="block">
                  Marks Obtained
                </Typography>
                <Typography variant="h4" fontWeight={800} sx={{ my: 0.5 }}>
                  {result.obtainedMarks}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  out of {result.totalMarks} total
                </Typography>
              </Paper>
            </Grid>

            {/* 2. Percentage */}
            <Grid item xs={12} sm={6} md={3}>
              <Paper variant="outlined" sx={{ p: 2.5, bgcolor: 'rgba(255, 255, 255, 0.02)', textAlign: 'center' }}>
                <Typography variant="h5" sx={{ color: isPassed ? 'success.main' : 'error.main', mb: 1 }}>
                  %
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  Score Percentage
                </Typography>
                <Typography variant="h4" fontWeight={800} color={isPassed ? 'success.main' : 'error.main'} sx={{ my: 0.5 }}>
                  {result.percentage}%
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Target: {passingPercentage}%
                </Typography>
              </Paper>
            </Grid>

            {/* 3. Accuracy */}
            <Grid item xs={12} sm={6} md={3}>
              <Paper variant="outlined" sx={{ p: 2.5, bgcolor: 'rgba(255, 255, 255, 0.02)', textAlign: 'center' }}>
                <SpeedIcon sx={{ color: 'info.light', fontSize: 32, mb: 1 }} />
                <Typography variant="caption" color="text.secondary" display="block">
                  Accuracy Rate
                </Typography>
                <Typography variant="h4" fontWeight={800} sx={{ my: 0.5 }}>
                  {result.accuracy}%
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  correct vs answered
                </Typography>
              </Paper>
            </Grid>

            {/* 4. Question Status */}
            <Grid item xs={12} sm={6} md={3}>
              <Paper variant="outlined" sx={{ p: 2.5, bgcolor: 'rgba(255, 255, 255, 0.02)', textAlign: 'center' }}>
                <HelpOutlineIcon sx={{ color: 'warning.light', fontSize: 32, mb: 1 }} />
                <Typography variant="caption" color="text.secondary" display="block">
                  Questions Answered
                </Typography>
                <Typography variant="h4" fontWeight={800} sx={{ my: 0.5 }}>
                  {result.correctCount + result.incorrectCount}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {result.unansweredCount} unanswered
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          {/* Breakdown Pills */}
          <Box sx={{ mt: 4, display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Chip
              icon={<CheckCircleIcon />}
              label={`${result.correctCount} Correct`}
              color="success"
              variant="outlined"
              sx={{ fontWeight: 700, px: 1 }}
            />
            <Chip
              icon={<CancelIcon />}
              label={`${result.incorrectCount} Incorrect`}
              color="error"
              variant="outlined"
              sx={{ fontWeight: 700, px: 1 }}
            />
            <Chip
              icon={<HelpOutlineIcon />}
              label={`${result.unansweredCount} Unanswered`}
              variant="outlined"
              sx={{ fontWeight: 700, px: 1 }}
            />
          </Box>
        </CardContent>
      </Card>

      {/* Security & Confidentiality Banner */}
      <Paper
        variant="outlined"
        sx={{
          p: 2.5,
          bgcolor: 'rgba(255, 255, 255, 0.02)',
          display: 'flex',
          alignItems: 'center',
          gap: 2,
        }}
      >
        <SecurityIcon color="primary" sx={{ fontSize: 32 }} />
        <Box>
          <Typography variant="subtitle2" fontWeight={700}>
            Protected Candidate Record
          </Typography>
          <Typography variant="caption" color="text.secondary">
            In compliance with examination security policies, answer keys and internal rubrics remain protected. Your individual performance metrics are authoritatively recorded in the institution placement repository.
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};
