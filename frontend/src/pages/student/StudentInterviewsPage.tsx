import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Button,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Divider,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import WorkIcon from '@mui/icons-material/Work';
import RefreshIcon from '@mui/icons-material/Refresh';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import PsychologyIcon from '@mui/icons-material/Psychology';
import TerminalIcon from '@mui/icons-material/Terminal';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';
import BusinessCenterIcon from '@mui/icons-material/BusinessCenter';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import { evaluationService } from '../../services/evaluation.service.js';
import { StudentEvaluationItemDto, InterviewEvaluationDto, InterviewType } from '../../types/evaluation.types.js';

export const StudentInterviewsPage: React.FC = () => {
  const [items, setItems] = useState<StudentEvaluationItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected item detail dialog
  const [selectedItem, setSelectedItem] = useState<StudentEvaluationItemDto | null>(null);

  const fetchStudentInterviews = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await evaluationService.getStudentInterviewEvaluations();
      setItems(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load your interview evaluations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentInterviews();
  }, []);

  const evaluatedItems = items.filter((i) => i.evaluation !== null);
  const avgScore =
    evaluatedItems.length > 0
      ? Math.round(
          evaluatedItems.reduce((acc, curr) => acc + (curr.evaluation?.percentage || 0), 0) /
            evaluatedItems.length
        )
      : null;

  const getTypeIcon = (type?: InterviewType) => {
    switch (type) {
      case 'TECHNICAL':
        return <TerminalIcon fontSize="small" />;
      case 'HR':
        return <SupervisorAccountIcon fontSize="small" />;
      case 'MANAGERIAL':
        return <BusinessCenterIcon fontSize="small" />;
      default:
        return <PsychologyIcon fontSize="small" />;
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1200, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#14264B' }}>
            My Structured Interviews
          </Typography>
          <Typography variant="body2" sx={{ color: '#7182A0' }}>
            View your scheduled Technical, HR, Mock, and Managerial interviews, criterion scores, strengths, and areas for improvement.
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={fetchStudentInterviews}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Card variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
            <Typography variant="caption" sx={{ color: '#7182A0', fontWeight: 600 }}>
              ASSIGNED INTERVIEWS
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, color: '#14264B' }}>
              {items.length}
            </Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
            <Typography variant="caption" sx={{ color: '#7182A0', fontWeight: 600 }}>
              COMPLETED EVALUATIONS
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, color: '#16a34a' }}>
              {evaluatedItems.length}
            </Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
            <Typography variant="caption" sx={{ color: '#7182A0', fontWeight: 600 }}>
              AVERAGE INTERVIEW SCORE
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, color: '#318992' }}>
              {avgScore !== null ? `${avgScore}%` : '—'}
            </Typography>
          </Card>
        </Grid>
      </Grid>

      {/* Interview Rounds List */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : items.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 6, textAlign: 'center', borderRadius: 2 }}>
          <WorkIcon sx={{ fontSize: 56, color: '#8293B0', mb: 1.5 }} />
          <Typography variant="h6" sx={{ color: '#526584' }}>
            No Interviews Assigned
          </Typography>
          <Typography variant="body2" sx={{ color: '#7182A0', mt: 0.5 }}>
            You have not been scheduled for any mock or placement interviews yet.
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={2.5}>
          {items.map((item) => {
            const ev = item.evaluation as InterviewEvaluationDto | null;
            return (
              <Grid item xs={12} md={6} key={item.participantId}>
                <Card
                  variant="outlined"
                  sx={{
                    borderRadius: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                    transition: 'box-shadow 0.2s',
                    '&:hover': { boxShadow: '0 4px 12px rgba(0,0,0,0.06)' },
                  }}
                >
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#14264B' }}>
                        {item.title}
                      </Typography>
                      <Stack direction="row" spacing={1}>
                        <Chip
                          icon={getTypeIcon(item.interviewType)}
                          label={item.interviewType || 'INTERVIEW'}
                          size="small"
                          color={
                            item.interviewType === 'TECHNICAL'
                              ? 'primary'
                              : item.interviewType === 'HR'
                              ? 'secondary'
                              : 'default'
                          }
                          sx={{ fontWeight: 600, fontSize: '0.75rem' }}
                        />
                        <Chip
                          label={item.attendance}
                          size="small"
                          icon={
                            item.attendance === 'PRESENT' ? (
                              <CheckCircleIcon />
                            ) : item.attendance === 'ABSENT' ? (
                              <CancelIcon />
                            ) : (
                              <HourglassEmptyIcon />
                            )
                          }
                          color={
                            item.attendance === 'PRESENT'
                              ? 'success'
                              : item.attendance === 'ABSENT'
                              ? 'error'
                              : 'warning'
                          }
                        />
                      </Stack>
                    </Box>

                    <Stack direction="row" spacing={2} sx={{ color: '#7182A0', fontSize: '0.8rem', mb: 1.5 }}>
                      <span>📅 {new Date(item.scheduledDate).toLocaleString()}</span>
                      <span>⏱ {item.durationMinutes} mins</span>
                    </Stack>

                    {item.instructions && (
                      <Typography variant="caption" sx={{ color: '#7182A0', display: 'block', mb: 1.5 }}>
                        <strong>Instructions:</strong> {item.instructions}
                      </Typography>
                    )}

                    <Divider sx={{ my: 1.5 }} />

                    {/* Evaluation Result if available */}
                    {ev ? (
                      <Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: '#16a34a' }}>
                            Score: {ev.percentage}% ({ev.totalScore}/{ev.maxPossibleMarks})
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#7182A0' }}>
                            Interviewer: {ev.evaluatorName}
                          </Typography>
                        </Box>

                        {/* Progression Badge */}
                        {ev.comparison && (
                          <Chip
                            icon={<TrendingUpIcon />}
                            label={ev.comparison.displayText}
                            size="small"
                            color={
                              ev.comparison.difference && ev.comparison.difference > 0
                                ? 'success'
                                : 'default'
                            }
                            sx={{ fontWeight: 600, mb: 1 }}
                          />
                        )}

                        {ev.strengths && (
                          <Box sx={{ mt: 1 }}>
                            <Typography variant="caption" sx={{ fontWeight: 700, color: '#166534', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <ThumbUpIcon fontSize="inherit" /> Strengths:
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#405678', fontSize: '0.85rem' }}>
                              {ev.strengths}
                            </Typography>
                          </Box>
                        )}

                        {ev.areasForImprovement && (
                          <Box sx={{ mt: 1 }}>
                            <Typography variant="caption" sx={{ fontWeight: 700, color: '#c2410c', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <LightbulbIcon fontSize="inherit" /> Areas for Improvement:
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#405678', fontSize: '0.85rem' }}>
                              {ev.areasForImprovement}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    ) : (
                      <Typography variant="body2" sx={{ color: '#8293B0', fontStyle: 'italic' }}>
                        Evaluation pending after interview session.
                      </Typography>
                    )}
                  </CardContent>

                  <Box sx={{ p: 2, pt: 0, textAlign: 'right' }}>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<VisibilityIcon />}
                      onClick={() => setSelectedItem(item)}
                    >
                      View Details & Criteria
                    </Button>
                  </Box>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Criterion Breakdown Dialog */}
      <Dialog
        open={Boolean(selectedItem)}
        onClose={() => setSelectedItem(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          {selectedItem?.title} - Interview Evaluation Details
        </DialogTitle>
        <DialogContent dividers>
          {selectedItem && (
            <Stack spacing={2.5}>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#14264B' }}>
                  {selectedItem.interviewType} Interview
                </Typography>
                <Typography variant="caption" sx={{ color: '#7182A0' }}>
                  Scheduled: {new Date(selectedItem.scheduledDate).toLocaleString()} ({selectedItem.durationMinutes} mins)
                </Typography>
              </Box>

              {selectedItem.evaluation?.comparison && (
                <Alert severity="info" icon={<TrendingUpIcon />}>
                  <strong>Improvement History: </strong>
                  {selectedItem.evaluation.comparison.displayText}
                </Alert>
              )}

              {selectedItem.evaluation ? (
                (() => {
                  const intEval = selectedItem.evaluation as InterviewEvaluationDto;
                  return (
                    <>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#14264B' }}>
                        Criterion-wise Marks (Human Evaluated)
                      </Typography>

                      <TableContainer component={Paper} variant="outlined">
                        <Table size="small">
                          <TableHead sx={{ backgroundColor: '#EDF2FF' }}>
                            <TableRow>
                              <TableCell sx={{ fontWeight: 600 }}>Criterion</TableCell>
                              <TableCell sx={{ fontWeight: 600, width: 140 }}>Score</TableCell>
                              <TableCell sx={{ fontWeight: 600 }}>Evaluator Notes</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {intEval.criterionScores.map((cs) => (
                              <TableRow key={cs.id}>
                                <TableCell sx={{ fontWeight: 600 }}>{cs.criterionName}</TableCell>
                                <TableCell>
                                  <Typography variant="body2" sx={{ fontWeight: 700, color: '#16a34a' }}>
                                    {cs.score} / {cs.maxMarks}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Typography variant="body2" sx={{ color: '#526584' }}>
                                    {cs.comment || '—'}
                                  </Typography>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>

                      {/* Summary Box */}
                      <Card variant="outlined" sx={{ p: 2, backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: '#166534' }}>
                              Total Interview Performance:
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#15803d' }}>
                              Human evaluation source of truth
                            </Typography>
                          </Box>
                          <Typography variant="h5" sx={{ fontWeight: 800, color: '#166534' }}>
                            {intEval.totalScore} / {intEval.maxPossibleMarks} ({intEval.percentage}%)
                          </Typography>
                        </Box>
                      </Card>

                      {/* Strengths & Improvement Areas */}
                      <Grid container spacing={2}>
                        {intEval.strengths && (
                          <Grid item xs={12} sm={6}>
                            <Paper variant="outlined" sx={{ p: 2, backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }}>
                              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#166534', mb: 0.5 }}>
                                Key Strengths:
                              </Typography>
                              <Typography variant="body2" sx={{ color: '#405678' }}>
                                {intEval.strengths}
                              </Typography>
                            </Paper>
                          </Grid>
                        )}
                        {intEval.areasForImprovement && (
                          <Grid item xs={12} sm={6}>
                            <Paper variant="outlined" sx={{ p: 2, backgroundColor: '#fff7ed', borderColor: '#fed7aa' }}>
                              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#c2410c', mb: 0.5 }}>
                                Areas for Improvement:
                              </Typography>
                              <Typography variant="body2" sx={{ color: '#405678' }}>
                                {intEval.areasForImprovement}
                              </Typography>
                            </Paper>
                          </Grid>
                        )}
                      </Grid>

                      {intEval.overallFeedback && (
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                            Overall Evaluator Feedback:
                          </Typography>
                          <Paper variant="outlined" sx={{ p: 2, backgroundColor: '#EDF2FF' }}>
                            <Typography variant="body2" sx={{ color: '#405678' }}>
                              {intEval.overallFeedback}
                            </Typography>
                          </Paper>
                        </Box>
                      )}
                    </>
                  );
                })()
              ) : (
                <Alert severity="warning">
                  This interview has not yet been evaluated by your interviewer.
                </Alert>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setSelectedItem(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
