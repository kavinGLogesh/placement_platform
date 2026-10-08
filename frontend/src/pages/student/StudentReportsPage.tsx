import React from 'react';
import {
  Typography,
  Box,
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
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

import { reportService } from '../../services/report.service.js';
import { attendanceService } from '../../services/attendance.service.js';

export const StudentReportsPage: React.FC = () => {
  const navigate = useNavigate();

  const {
    data: report,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['studentOwnReport'],
    queryFn: () => reportService.getStudentOwnReport(),
    staleTime: 30000,
  });

  const { data: attendanceHistory = [] } = useQuery({
    queryKey: ['studentOwnAttendance'],
    queryFn: () => attendanceService.getStudentOwnAttendance(),
    staleTime: 30000,
  });

  return (
    <Box>
      {/* Header & Back Button */}
      <Box
        sx={{
          mb: 3,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <div>
          <Button
            variant="outlined"
            size="small"
            startIcon={<ArrowBackIcon fontSize="small" />}
            onClick={() => navigate('/student/dashboard')}
            sx={{
              mb: 1.5,
              color: '#1765B5',
              borderColor: '#D1DEF0',
              borderRadius: '6px',
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.8125rem',
              '&:hover': { borderColor: '#1765B5', bgcolor: 'rgba(23, 101, 181, 0.04)' },
            }}
          >
            Back to Dashboard
          </Button>
          <Typography variant="overline" color="#1765B5" fontWeight={700} letterSpacing={1.2}>
            INSTITUTIONAL TRANSCRIPT & EVALUATION
          </Typography>
          <Typography variant="h4" fontWeight={800} letterSpacing="-0.02em" sx={{ color: '#14264B' }}>
            Placement Performance Transcript
          </Typography>
          <Typography variant="body2" sx={{ color: '#7182A0' }}>
            Official record of proctored assessment attempts, cumulative scores, and topic-level competency ratings.
          </Typography>
        </div>
      </Box>

      {/* Error Alert */}
      {isError && (
        <Alert
          severity="error"
          sx={{ mb: 3, borderRadius: '8px' }}
          action={
            <Button color="inherit" size="small" onClick={() => refetch()}>
              Retry
            </Button>
          }
        >
          {error instanceof Error ? error.message : 'Failed to load student performance report'}
        </Alert>
      )}

      {/* Loading State */}
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress size={32} sx={{ color: '#1765B5' }} />
        </Box>
      ) : (
        report && (
          <>
            {/* Student Profile Info Card */}
            <Card
              elevation={0}
              sx={{
                mb: 3,
                bgcolor: '#ffffff',
                border: '1px solid #DCE6F5',
                borderRadius: '8px',
              }}
            >
              <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} sm={6} md={3}>
                    <Typography variant="caption" sx={{ color: '#7182A0', fontWeight: 600 }}>
                      Candidate Name
                    </Typography>
                    <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#14264B' }}>
                      {report.student.name}
                    </Typography>
                  </Grid>
                  <Grid item xs={6} sm={3} md={2}>
                    <Typography variant="caption" sx={{ color: '#7182A0', fontWeight: 600 }}>
                      Register Number
                    </Typography>
                    <Typography variant="subtitle2" sx={{ fontFamily: 'monospace', fontWeight: 600, color: '#14264B' }}>
                      {report.student.registerNumber}
                    </Typography>
                  </Grid>
                  <Grid item xs={6} sm={3} md={2}>
                    <Typography variant="caption" sx={{ color: '#7182A0', fontWeight: 600 }}>
                      Department
                    </Typography>
                    <Typography variant="subtitle2" sx={{ color: '#14264B' }}>
                      {report.student.departmentName} ({report.student.departmentCode})
                    </Typography>
                  </Grid>
                  <Grid item xs={6} sm={3} md={2}>
                    <Typography variant="caption" sx={{ color: '#7182A0', fontWeight: 600 }}>
                      Course & Year
                    </Typography>
                    <Typography variant="subtitle2" sx={{ color: '#14264B' }}>
                      {report.student.courseCode} • Year {report.student.year}
                    </Typography>
                  </Grid>
                  <Grid item xs={6} sm={3} md={3}>
                    <Typography variant="caption" sx={{ color: '#7182A0', fontWeight: 600 }}>
                      Institutional Email
                    </Typography>
                    <Typography variant="subtitle2" sx={{ color: '#14264B' }}>
                      {report.student.collegeEmail}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Performance KPIs */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={6} sm={4} md={2.4}>
                <Card elevation={0} sx={{ bgcolor: '#ffffff', border: '1px solid #DCE6F5', borderRadius: '8px' }}>
                  <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                    <Typography variant="caption" sx={{ color: '#7182A0', fontWeight: 600, textTransform: 'uppercase' }}>
                      Tests Completed
                    </Typography>
                    <Typography variant="h5" fontWeight={800} sx={{ mt: 0.5, color: '#14264B' }}>
                      {report.summary.totalAssessmentsCompleted} / {report.summary.totalAssessmentsAssigned}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={6} sm={4} md={2.4}>
                <Card elevation={0} sx={{ bgcolor: '#ffffff', border: '1px solid #DCE6F5', borderRadius: '8px' }}>
                  <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                    <Typography variant="caption" sx={{ color: '#7182A0', fontWeight: 600, textTransform: 'uppercase' }}>
                      Average Score
                    </Typography>
                    <Typography variant="h5" fontWeight={800} sx={{ mt: 0.5, color: '#1765B5' }}>
                      {report.summary.averageScore}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={6} sm={4} md={2.4}>
                <Card elevation={0} sx={{ bgcolor: '#ffffff', border: '1px solid #DCE6F5', borderRadius: '8px' }}>
                  <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                    <Typography variant="caption" sx={{ color: '#7182A0', fontWeight: 600, textTransform: 'uppercase' }}>
                      Average Percentage
                    </Typography>
                    <Typography variant="h5" fontWeight={800} sx={{ mt: 0.5, color: '#14264B' }}>
                      {report.summary.averagePercentage}%
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={6} sm={4} md={2.4}>
                <Card elevation={0} sx={{ bgcolor: '#ffffff', border: '1px solid #DCE6F5', borderRadius: '8px' }}>
                  <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                    <Typography variant="caption" sx={{ color: '#7182A0', fontWeight: 600, textTransform: 'uppercase' }}>
                      Overall Accuracy
                    </Typography>
                    <Typography variant="h5" fontWeight={800} sx={{ mt: 0.5, color: '#0369a1' }}>
                      {report.summary.overallAccuracy}%
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={6} sm={4} md={2.4}>
                <Card elevation={0} sx={{ bgcolor: '#ffffff', border: '1px solid #DCE6F5', borderRadius: '8px' }}>
                  <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                    <Typography variant="caption" sx={{ color: '#7182A0', fontWeight: 600, textTransform: 'uppercase' }}>
                      Pass Rate
                    </Typography>
                    <Typography
                      variant="h5"
                      fontWeight={800}
                      sx={{
                        mt: 0.5,
                        color: report.summary.passRate >= 60 ? '#047857' : '#b91c1c',
                      }}
                    >
                      {report.summary.passRate}%
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Assessment History Table */}
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5, color: '#14264B' }}>
              Assessment Results History
            </Typography>
            <TableContainer
              component={Paper}
              elevation={0}
              sx={{
                bgcolor: '#ffffff',
                border: '1px solid #DCE6F5',
                borderRadius: '8px',
                mb: 4,
              }}
            >
              <Table size="small">
                <TableHead sx={{ bgcolor: '#EDF2FF', borderBottom: '2px solid #DCE6F5' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, color: '#526584', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Assessment Title</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, color: '#526584', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total Marks</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, color: '#526584', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Obtained Marks</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, color: '#526584', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Percentage</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, color: '#526584', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Accuracy</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600, color: '#526584', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Result</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#526584', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Submitted At</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {report.assessments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                        <Typography variant="body2" sx={{ color: '#7182A0' }}>
                          No assessment results on record.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    report.assessments.map((a) => (
                      <TableRow key={a.assessmentId} hover sx={{ '&:hover': { bgcolor: '#EDF2FF' } }}>
                        <TableCell sx={{ fontWeight: 600, color: '#14264B', fontSize: '0.82rem' }}>{a.assessmentTitle}</TableCell>
                        <TableCell align="right" sx={{ fontSize: '0.82rem' }}>{a.totalMarks}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.82rem', color: '#14264B' }}>{a.obtainedMarks}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.82rem', color: '#14264B' }}>{a.percentage}%</TableCell>
                        <TableCell align="right" sx={{ fontSize: '0.82rem' }}>{a.accuracy}%</TableCell>
                        <TableCell align="center">
                          <Chip
                            size="small"
                            label={a.isPassed ? 'PASSED' : 'FAILED'}
                            sx={{
                              fontWeight: 700,
                              fontSize: '0.7rem',
                              borderRadius: '4px',
                              bgcolor: a.isPassed ? '#ecfdf5' : '#fef2f2',
                              color: a.isPassed ? '#047857' : '#b91c1c',
                              border: '1px solid',
                              borderColor: a.isPassed ? '#a7f3d0' : '#fecaca',
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.75rem', color: '#7182A0' }}>
                          {a.submittedAt ? new Date(a.submittedAt).toLocaleString() : '-'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Assessment Attendance & Participation History */}
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5, color: '#14264B' }}>
              Assessment Attendance &amp; Participation History
            </Typography>
            <TableContainer
              component={Paper}
              elevation={0}
              sx={{
                bgcolor: '#ffffff',
                border: '1px solid #DCE6F5',
                borderRadius: '8px',
                mb: 4,
              }}
            >
              <Table size="small">
                <TableHead sx={{ bgcolor: '#EDF2FF', borderBottom: '2px solid #DCE6F5' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, color: '#526584', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Assessment Title</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#526584', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Scheduled Window</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600, color: '#526584', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Attempts Taken</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600, color: '#526584', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Attendance Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {attendanceHistory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                        <Typography variant="body2" sx={{ color: '#7182A0' }}>
                          No assigned placement examinations found.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    attendanceHistory.map((rec) => {
                      const isNotAttended = rec.attendanceStatus === 'NOT_ATTENDED';
                      const isCompleted = rec.attendanceStatus === 'COMPLETED';
                      const isAttended = rec.attendanceStatus === 'ATTENDED';

                      return (
                        <TableRow key={rec.assessmentId} hover sx={{ '&:hover': { bgcolor: '#EDF2FF' } }}>
                          <TableCell sx={{ fontWeight: 600, color: '#14264B', fontSize: '0.82rem' }}>
                            {rec.assessmentName}
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.78rem', color: '#7182A0' }}>
                            {rec.assessmentDate || 'Flexible Window'}
                          </TableCell>
                          <TableCell align="center" sx={{ fontSize: '0.82rem', fontWeight: 600 }}>
                            {rec.attemptCount}
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              size="small"
                              label={rec.attendanceStatus.replace(/_/g, ' ')}
                              sx={{
                                fontWeight: 700,
                                fontSize: '0.7rem',
                                borderRadius: '4px',
                                bgcolor: isNotAttended
                                  ? '#fef2f2'
                                  : isCompleted
                                  ? '#ecfdf5'
                                  : isAttended
                                  ? '#eff6ff'
                                  : '#EDF2FF',
                                color: isNotAttended
                                  ? '#b91c1c'
                                  : isCompleted
                                  ? '#047857'
                                  : isAttended
                                  ? '#0369a1'
                                  : '#7182A0',
                                border: '1px solid',
                                borderColor: isNotAttended
                                  ? '#fecaca'
                                  : isCompleted
                                  ? '#a7f3d0'
                                  : isAttended
                                  ? '#bfdbfe'
                                  : '#D1DEF0',
                              }}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Topic & Skill Proficiency Breakdown */}
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5, color: '#14264B' }}>
              Topic & Skill Competency Profile
            </Typography>
            <TableContainer
              component={Paper}
              elevation={0}
              sx={{
                bgcolor: '#ffffff',
                border: '1px solid #DCE6F5',
                borderRadius: '8px',
                mb: 4,
              }}
            >
              <Table size="small">
                <TableHead sx={{ bgcolor: '#EDF2FF', borderBottom: '2px solid #DCE6F5' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, color: '#526584', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Category</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#526584', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Topic Name</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, color: '#526584', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Accuracy Rate</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600, color: '#526584', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Proficiency Assessment</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {report.topicProficiency.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                        <Typography variant="body2" sx={{ color: '#7182A0' }}>
                          No topic competency data available yet. Complete an assessment to generate your skill profile.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    report.topicProficiency.map((t, idx) => (
                      <TableRow key={idx} hover sx={{ '&:hover': { bgcolor: '#EDF2FF' } }}>
                        <TableCell sx={{ fontWeight: 600, fontSize: '0.82rem', color: '#14264B' }}>{t.category.replace(/_/g, ' ')}</TableCell>
                        <TableCell sx={{ fontSize: '0.82rem', color: '#14264B' }}>{t.topic}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.82rem', color: '#14264B' }}>{t.accuracyPercentage}%</TableCell>
                        <TableCell align="center">
                          <Chip
                            size="small"
                            label={t.proficiencyRating}
                            sx={{
                              fontWeight: 700,
                              fontSize: '0.7rem',
                              borderRadius: '4px',
                              bgcolor:
                                t.proficiencyRating === 'Strong'
                                  ? '#ecfdf5'
                                  : t.proficiencyRating === 'Moderate'
                                  ? '#fef3c7'
                                  : '#fef2f2',
                              color:
                                t.proficiencyRating === 'Strong'
                                  ? '#047857'
                                  : t.proficiencyRating === 'Moderate'
                                  ? '#b45309'
                                  : '#b91c1c',
                              border: '1px solid',
                              borderColor:
                                t.proficiencyRating === 'Strong'
                                  ? '#a7f3d0'
                                  : t.proficiencyRating === 'Moderate'
                                  ? '#fde68a'
                                  : '#fecaca',
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )
      )}
    </Box>
  );
};

export default StudentReportsPage;
