import React, { useState, useMemo } from 'react';
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
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  InputAdornment,
} from '@mui/material';
import SchoolIcon from '@mui/icons-material/School';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import EditIcon from '@mui/icons-material/Edit';
import CalculateIcon from '@mui/icons-material/Calculate';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import { StudentAcademicRecord, UpsertAcademicRecordInput } from '../../types/academic.types.js';
import { academicService } from '../../services/academic.service.js';
import { getAcademicStructure } from '../../utils/academic-structure.util.js';

interface Props {
  studentId: string;
  studentRegisterNumber: string;
  initialRecord: StudentAcademicRecord | null;
  onRecordUpdated: () => void;
}

export const StudentAcademicRecordsSection: React.FC<Props> = ({
  studentId,
  studentRegisterNumber,
  initialRecord,
  onRecordUpdated,
}) => {
  const [record, setRecord] = useState<StudentAcademicRecord | null>(initialRecord);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [formValidationErrors, setFormValidationErrors] = useState<string[]>([]);

  // Synchronize internal record state when initialRecord prop updates
  React.useEffect(() => {
    if (initialRecord) {
      setRecord(initialRecord);
    }
  }, [initialRecord]);

  // Fallback fetch: If initialRecord was missing or null on first load, fetch directly
  React.useEffect(() => {
    if (!initialRecord && studentId) {
      let isMounted = true;
      academicService
        .getAdminAcademicRecord(studentId)
        .then((rec) => {
          if (isMounted && rec) {
            setRecord(rec);
          }
        })
        .catch(() => {
          // handled gracefully
        });
      return () => {
        isMounted = false;
      };
    }
  }, [initialRecord, studentId]);

  // Active student academic structure (Arts & Science 6 sem, PG 4 sem, Engineering 8 sem)
  const activeStructure = useMemo(() => {
    return getAcademicStructure({
      degreeLevel: record?.degreeLevel,
      degreeName: record?.ugDegree || record?.pgDegree,
    });
  }, [record?.degreeLevel, record?.ugDegree, record?.pgDegree]);

  // Direct Academic Entry Form State
  const [editForm, setEditForm] = useState<UpsertAcademicRecordInput>({
    tenthBoard: initialRecord?.tenthBoard || '',
    tenthPassingYear: initialRecord?.tenthPassingYear || new Date().getFullYear() - 4,
    tenthTotalMarks: initialRecord?.tenthTotalMarks ?? 500,
    tenthObtainedMarks: initialRecord?.tenthObtainedMarks ?? 450,
    tenthPercentage: initialRecord?.tenthPercentage ?? 90.0,

    twelfthBoard: initialRecord?.twelfthBoard || '',
    twelfthPassingYear: initialRecord?.twelfthPassingYear || new Date().getFullYear() - 2,
    twelfthTotalMarks: initialRecord?.twelfthTotalMarks ?? 600,
    twelfthObtainedMarks: initialRecord?.twelfthObtainedMarks ?? 540,
    twelfthPercentage: initialRecord?.twelfthPercentage ?? 90.0,

    ugDegree: initialRecord?.ugDegree || 'B.Sc IT',
    ugBranch: initialRecord?.ugBranch || 'Information Technology',
    ugStatus: initialRecord?.ugStatus || initialRecord?.studyStatus || 'STUDYING',
    ugCgpa: initialRecord?.ugCgpa ?? initialRecord?.currentCgpa ?? 8.5,
    ugPercentage: initialRecord?.ugPercentage ?? initialRecord?.overallPercentage ?? 80.75,

    pgDegree: initialRecord?.pgDegree || '',
    pgStatus: initialRecord?.pgStatus || '',
    pgCgpa: initialRecord?.pgCgpa ?? null,
    pgPercentage: initialRecord?.pgPercentage ?? null,

    degreeLevel: initialRecord?.degreeLevel || 'UG',
    studyStatus: initialRecord?.studyStatus || initialRecord?.ugStatus || 'STUDYING',
    currentSemester: initialRecord?.currentSemester || 1,
    currentCgpa: initialRecord?.currentCgpa ?? initialRecord?.ugCgpa ?? 8.5,
    overallPercentage: initialRecord?.overallPercentage ?? initialRecord?.ugPercentage ?? 80.75,
    activeBacklogs: initialRecord?.activeBacklogs || 0,
    historyOfBacklogs: initialRecord?.historyOfBacklogs || 0,

    semesters: Array.from(
      {
        length: getAcademicStructure({
          degreeLevel: initialRecord?.degreeLevel,
          degreeName: initialRecord?.ugDegree || initialRecord?.pgDegree,
        }).totalSemesters,
      },
      (_, i) => {
      const existing = initialRecord?.semesters?.find((s) => s.semesterNumber === i + 1);
      return {
        semesterNumber: i + 1,
        sgpa: existing?.sgpa ?? null,
        cgpa: existing?.cgpa ?? null,
        totalCredits: existing?.totalCredits ?? 24,
        creditsEarned: existing?.creditsEarned ?? 24,
        backlogsCount: existing?.backlogsCount ?? 0,
      };
    }),
  });

  // Dynamic Structure in Edit Modal based on user selection
  const formStructure = useMemo(() => {
    return getAcademicStructure({
      degreeLevel: editForm.degreeLevel,
      degreeName: editForm.degreeLevel === 'PG' ? editForm.pgDegree : editForm.ugDegree,
    });
  }, [editForm.degreeLevel, editForm.ugDegree, editForm.pgDegree]);

  const openEditDialog = () => {
    setFormValidationErrors([]);
    const currStructure = getAcademicStructure({
      degreeLevel: record?.degreeLevel,
      degreeName: record?.ugDegree || record?.pgDegree,
    });

    setEditForm({
      tenthBoard: record?.tenthBoard || '',
      tenthPassingYear: record?.tenthPassingYear || new Date().getFullYear() - 4,
      tenthTotalMarks: record?.tenthTotalMarks ?? null,
      tenthObtainedMarks: record?.tenthObtainedMarks ?? null,
      tenthPercentage: record?.tenthPercentage ?? null,

      twelfthBoard: record?.twelfthBoard || '',
      twelfthPassingYear: record?.twelfthPassingYear || new Date().getFullYear() - 2,
      twelfthTotalMarks: record?.twelfthTotalMarks ?? null,
      twelfthObtainedMarks: record?.twelfthObtainedMarks ?? null,
      twelfthPercentage: record?.twelfthPercentage ?? null,

      ugDegree: record?.ugDegree || 'B.Sc IT',
      ugBranch: record?.ugBranch || 'Information Technology',
      ugStatus: record?.ugStatus || record?.studyStatus || 'STUDYING',
      ugCgpa: record?.ugCgpa ?? record?.currentCgpa ?? null,
      ugPercentage: record?.ugPercentage ?? record?.overallPercentage ?? null,

      pgDegree: record?.pgDegree || '',
      pgStatus: record?.pgStatus || '',
      pgCgpa: record?.pgCgpa ?? null,
      pgPercentage: record?.pgPercentage ?? null,

      degreeLevel: record?.degreeLevel || 'UG',
      studyStatus: record?.studyStatus || record?.ugStatus || 'STUDYING',
      currentSemester: record?.currentSemester || 1,
      currentCgpa: record?.currentCgpa ?? record?.ugCgpa ?? null,
      overallPercentage: record?.overallPercentage ?? record?.ugPercentage ?? null,
      activeBacklogs: record?.activeBacklogs || 0,
      historyOfBacklogs: record?.historyOfBacklogs || 0,

      semesters: Array.from(
        { length: currStructure.totalSemesters },
        (_, i) => {
          const existing = record?.semesters?.find((s) => s.semesterNumber === i + 1);
          return {
            semesterNumber: i + 1,
            sgpa: existing?.sgpa ?? null,
            cgpa: existing?.cgpa ?? null,
            totalCredits: existing?.totalCredits ?? 24,
            creditsEarned: existing?.creditsEarned ?? 24,
            backlogsCount: existing?.backlogsCount ?? 0,
          };
        }
      ),
    });
    setEditOpen(true);
  };

  // 10th Marks auto-calculation
  const handleTenthMarksChange = (total: number | null, obtained: number | null) => {
    let calculatedPct = editForm.tenthPercentage;
    if (total !== null && total > 0 && obtained !== null && obtained >= 0) {
      calculatedPct = parseFloat(((obtained / total) * 100).toFixed(2));
    }
    setEditForm((prev) => ({
      ...prev,
      tenthTotalMarks: total,
      tenthObtainedMarks: obtained,
      tenthPercentage: calculatedPct,
    }));
  };

  // 12th Marks auto-calculation
  const handleTwelfthMarksChange = (total: number | null, obtained: number | null) => {
    let calculatedPct = editForm.twelfthPercentage;
    if (total !== null && total > 0 && obtained !== null && obtained >= 0) {
      calculatedPct = parseFloat(((obtained / total) * 100).toFixed(2));
    }
    setEditForm((prev) => ({
      ...prev,
      twelfthTotalMarks: total,
      twelfthObtainedMarks: obtained,
      twelfthPercentage: calculatedPct,
    }));
  };

  // UG CGPA & Percentage handling
  const handleUgCgpaChange = (cgpa: number | null) => {
    let calculatedPct = editForm.ugPercentage;
    if (cgpa !== null && cgpa >= 0 && cgpa <= 10 && (!editForm.ugPercentage || editForm.ugPercentage === 0)) {
      calculatedPct = parseFloat((cgpa * 9.5).toFixed(2));
    }
    setEditForm((prev) => ({
      ...prev,
      ugCgpa: cgpa,
      currentCgpa: cgpa,
      ugPercentage: calculatedPct,
      overallPercentage: calculatedPct,
    }));
  };

  // PG CGPA & Percentage handling
  const handlePgCgpaChange = (cgpa: number | null) => {
    let calculatedPct = editForm.pgPercentage;
    if (cgpa !== null && cgpa >= 0 && cgpa <= 10 && (!editForm.pgPercentage || editForm.pgPercentage === 0)) {
      calculatedPct = parseFloat((cgpa * 9.5).toFixed(2));
    }
    setEditForm((prev) => ({
      ...prev,
      pgCgpa: cgpa,
      pgPercentage: calculatedPct,
    }));
  };

  // Calculate Cumulative CGPA strictly within the program's semesters
  const calculateProgramCgpa = (semList: any[]) => {
    const relevantSemesters = semList.filter(
      (s) => s.semesterNumber <= formStructure.totalSemesters && s.sgpa !== null && s.sgpa !== undefined && s.sgpa > 0
    );
    if (relevantSemesters.length === 0) return null;
    let totalQualityPoints = 0;
    let totalCredits = 0;
    for (const sem of relevantSemesters) {
      const credits = sem.totalCredits || 24;
      totalQualityPoints += Number(sem.sgpa) * credits;
      totalCredits += credits;
    }
    return totalCredits > 0 ? parseFloat((totalQualityPoints / totalCredits).toFixed(2)) : null;
  };

  // Validate form prior to save
  const validateForm = (): boolean => {
    const errors: string[] = [];

    // 10th Validation
    if (editForm.tenthTotalMarks !== null && editForm.tenthTotalMarks !== undefined) {
      if (editForm.tenthTotalMarks <= 0) {
        errors.push('10th Total Marks must be greater than 0.');
      }
      if (
        editForm.tenthObtainedMarks !== null &&
        editForm.tenthObtainedMarks !== undefined &&
        editForm.tenthObtainedMarks > editForm.tenthTotalMarks
      ) {
        errors.push('10th Obtained Marks cannot exceed Total Marks.');
      }
    }
    if (editForm.tenthPercentage !== null && editForm.tenthPercentage !== undefined) {
      if (editForm.tenthPercentage < 0 || editForm.tenthPercentage > 100) {
        errors.push('10th Percentage must be between 0 and 100%.');
      }
    }

    // 12th Validation
    if (editForm.twelfthTotalMarks !== null && editForm.twelfthTotalMarks !== undefined) {
      if (editForm.twelfthTotalMarks <= 0) {
        errors.push('12th Total Marks must be greater than 0.');
      }
      if (
        editForm.twelfthObtainedMarks !== null &&
        editForm.twelfthObtainedMarks !== undefined &&
        editForm.twelfthObtainedMarks > editForm.twelfthTotalMarks
      ) {
        errors.push('12th Obtained Marks cannot exceed Total Marks.');
      }
    }
    if (editForm.twelfthPercentage !== null && editForm.twelfthPercentage !== undefined) {
      if (editForm.twelfthPercentage < 0 || editForm.twelfthPercentage > 100) {
        errors.push('12th Percentage must be between 0 and 100%.');
      }
    }

    // UG Validation
    if (editForm.ugCgpa !== null && editForm.ugCgpa !== undefined) {
      if (editForm.ugCgpa < 0 || editForm.ugCgpa > 10) {
        errors.push('UG CGPA must be between 0.00 and 10.00.');
      }
    }
    if (editForm.ugPercentage !== null && editForm.ugPercentage !== undefined) {
      if (editForm.ugPercentage < 0 || editForm.ugPercentage > 100) {
        errors.push('UG Percentage must be between 0 and 100%.');
      }
    }

    // PG Validation
    if (editForm.pgCgpa !== null && editForm.pgCgpa !== undefined) {
      if (editForm.pgCgpa < 0 || editForm.pgCgpa > 10) {
        errors.push('PG CGPA must be between 0.00 and 10.00.');
      }
    }
    if (editForm.pgPercentage !== null && editForm.pgPercentage !== undefined) {
      if (editForm.pgPercentage < 0 || editForm.pgPercentage > 100) {
        errors.push('PG Percentage must be between 0 and 100%.');
      }
    }

    setFormValidationErrors(errors);
    return errors.length === 0;
  };

  const handleSaveAcademicRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }

    setSaving(true);
    setActionError(null);
    try {
      // Filter semesters strictly up to the program's configured totalSemesters
      const filteredSemesters = editForm.semesters
        ?.filter((s) => s.semesterNumber <= formStructure.totalSemesters)
        .map((s) => ({
          ...s,
          semesterNumber: s.semesterNumber,
          sgpa: s.sgpa != null && !isNaN(Number(s.sgpa)) ? Number(s.sgpa) : null,
          cgpa: s.cgpa != null && !isNaN(Number(s.cgpa)) ? Number(s.cgpa) : null,
          totalCredits: s.totalCredits ? Number(s.totalCredits) : 24,
          creditsEarned: s.creditsEarned ? Number(s.creditsEarned) : 24,
          backlogsCount: s.backlogsCount ? Number(s.backlogsCount) : 0,
        }));

      const payload: UpsertAcademicRecordInput = {
        ...editForm,
        degreeLevel: editForm.degreeLevel || formStructure.degreeLevel,
        studyStatus: editForm.ugStatus || editForm.studyStatus,
        currentCgpa: editForm.ugCgpa ?? editForm.currentCgpa,
        overallPercentage: editForm.ugPercentage ?? editForm.overallPercentage,
        pgDegree: editForm.pgDegree?.trim() || null,
        pgStatus: editForm.pgStatus?.trim() || null,
        pgCgpa:
          editForm.pgCgpa !== undefined && editForm.pgCgpa !== null && !isNaN(Number(editForm.pgCgpa))
            ? Number(editForm.pgCgpa)
            : null,
        pgPercentage:
          editForm.pgPercentage !== undefined && editForm.pgPercentage !== null && !isNaN(Number(editForm.pgPercentage))
            ? Number(editForm.pgPercentage)
            : null,
        semesters: filteredSemesters,
      };

      const updated = await academicService.updateAdminAcademicRecord(studentId, payload);
      setRecord(updated);
      setEditOpen(false);
      setActionSuccess('Student academic records saved and synchronized successfully.');
      onRecordUpdated();
      setTimeout(() => setActionSuccess(null), 5000);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to save academic records';
      setActionError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card sx={{ border: '1px solid #DCE6F5', borderRadius: '10px', bgcolor: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <CardContent sx={{ p: 3.5 }}>
        {/* Section Header */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 2,
            mb: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <SchoolIcon sx={{ color: '#0284c7', fontSize: 28 }} />
            <div>
              <Typography variant="h6" fontWeight={700} sx={{ color: '#0f172a' }}>
                Student Academic Records ({studentRegisterNumber})
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {activeStructure.streamLabel} &bull; {activeStructure.totalSemesters} Semesters Curriculum
              </Typography>
            </div>
          </Box>

          <Button
            variant="contained"
            size="small"
            startIcon={<EditIcon fontSize="small" />}
            onClick={openEditDialog}
            sx={{
              bgcolor: '#0284c7',
              color: '#ffffff',
              borderRadius: '6px',
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.8125rem',
              '&:hover': { bgcolor: '#0369a1' },
            }}
          >
            Direct Academic Entry / Edit
          </Button>
        </Box>

        {actionSuccess && (
          <Alert severity="success" sx={{ mb: 2.5 }} onClose={() => setActionSuccess(null)}>
            {actionSuccess}
          </Alert>
        )}

        {actionError && (
          <Alert severity="error" sx={{ mb: 2.5 }} onClose={() => setActionError(null)}>
            {actionError}
          </Alert>
        )}

        {/* Informational Guidance Banner */}
        <Alert severity="info" variant="outlined" sx={{ mb: 3, borderRadius: 2, bgcolor: '#f0f9ff', borderColor: '#bae6fd' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AssignmentTurnedInIcon sx={{ color: '#0284c7', fontSize: 20 }} />
            <Typography variant="body2" fontWeight={700} color="#0369a1">
              Dynamic Stream Structure & Real-Time Eligibility Engine
            </Typography>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
            {activeStructure.streamLabel}: Configured for {activeStructure.durationYears} years ({activeStructure.totalSemesters} semesters).
            Academic marks, percentages, and CGPA synchronize dynamically with Placement Drive eligibility criteria without requiring document uploads.
          </Typography>
        </Alert>

        {/* 4 Academic Metric Cards: 10th, 12th, UG, PG */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {/* 1. 10th Standard Card */}
          <Grid item xs={12} md={6}>
            <Box
              sx={{
                p: 3,
                borderRadius: 2,
                bgcolor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="subtitle1" fontWeight={700} color="#1E293B">
                    Secondary (10th Standard)
                  </Typography>
                  <Chip
                    label="Direct Academic Entry"
                    size="small"
                    color="primary"
                    variant="outlined"
                    icon={<CheckCircleOutlineIcon />}
                    sx={{ fontWeight: 600, fontSize: '0.72rem' }}
                  />
                </Box>

                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Board / Council
                    </Typography>
                    <Typography variant="body2" fontWeight={600} color="#0f172a">
                      {record?.tenthBoard || 'State Board'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Passing Year
                    </Typography>
                    <Typography variant="body2" fontWeight={600} color="#0f172a">
                      {record?.tenthPassingYear || 'Not Provided'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Marks (Obtained / Total)
                    </Typography>
                    <Typography variant="body2" fontWeight={700} color="#1e293b">
                      {record?.tenthObtainedMarks != null && record?.tenthTotalMarks != null
                        ? `${record.tenthObtainedMarks} / ${record.tenthTotalMarks}`
                        : 'Not Provided'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Percentage
                    </Typography>
                    <Typography variant="h6" fontWeight={800} color="#0284c7">
                      {record?.tenthPercentage != null ? `${Number(record.tenthPercentage).toFixed(2)}%` : 'Not Provided'}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>

              <Box sx={{ mt: 2.5, pt: 1.5, borderTop: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: 1 }}>
                <CalculateIcon sx={{ fontSize: 16, color: '#64748b' }} />
                <Typography variant="caption" color="text.secondary">
                  Percentage automatically verified for placement drive eligibility.
                </Typography>
              </Box>
            </Box>
          </Grid>

          {/* 2. 12th Standard Card */}
          <Grid item xs={12} md={6}>
            <Box
              sx={{
                p: 3,
                borderRadius: 2,
                bgcolor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="subtitle1" fontWeight={700} color="#1E293B">
                    Higher Secondary / 12th Standard
                  </Typography>
                  <Chip
                    label="Direct Academic Entry"
                    size="small"
                    color="primary"
                    variant="outlined"
                    icon={<CheckCircleOutlineIcon />}
                    sx={{ fontWeight: 600, fontSize: '0.72rem' }}
                  />
                </Box>

                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Board / Institution
                    </Typography>
                    <Typography variant="body2" fontWeight={600} color="#0f172a">
                      {record?.twelfthBoard || 'State Board'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Passing Year
                    </Typography>
                    <Typography variant="body2" fontWeight={600} color="#0f172a">
                      {record?.twelfthPassingYear || 'Not Provided'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Marks (Obtained / Total)
                    </Typography>
                    <Typography variant="body2" fontWeight={700} color="#1e293b">
                      {record?.twelfthObtainedMarks != null && record?.twelfthTotalMarks != null
                        ? `${record.twelfthObtainedMarks} / ${record.twelfthTotalMarks}`
                        : 'Not Provided'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Percentage
                    </Typography>
                    <Typography variant="h6" fontWeight={800} color="#0284c7">
                      {record?.twelfthPercentage != null ? `${Number(record.twelfthPercentage).toFixed(2)}%` : 'Not Provided'}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>

              <Box sx={{ mt: 2.5, pt: 1.5, borderTop: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: 1 }}>
                <CalculateIcon sx={{ fontSize: 16, color: '#64748b' }} />
                <Typography variant="caption" color="text.secondary">
                  Percentage automatically verified for placement drive eligibility.
                </Typography>
              </Box>
            </Box>
          </Grid>

          {/* 3. Undergraduate (UG) Card */}
          <Grid item xs={12} md={6}>
            <Box
              sx={{
                p: 3,
                borderRadius: 2,
                bgcolor: '#F0F9FF',
                border: '1px solid #BAE6FD',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <MenuBookIcon sx={{ color: '#0369A1' }} />
                    <Typography variant="subtitle1" fontWeight={700} color="#0369A1">
                      Undergraduate (UG)
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Chip
                      label={
                        (record?.ugStatus || record?.studyStatus) === 'COMPLETED'
                          ? 'Completed'
                          : 'Studying'
                      }
                      size="small"
                      color={(record?.ugStatus || record?.studyStatus) === 'COMPLETED' ? 'success' : 'info'}
                      sx={{ fontWeight: 700 }}
                    />
                    {record?.currentSemester && (
                      <Chip
                        label={`Sem ${record.currentSemester} of ${activeStructure.totalSemesters}`}
                        size="small"
                        variant="outlined"
                        sx={{ fontWeight: 600 }}
                      />
                    )}
                  </Box>
                </Box>

                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Degree & Program
                    </Typography>
                    <Typography variant="body2" fontWeight={700} color="#0f172a">
                      {record?.ugDegree || 'B.Sc IT'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Branch / Specialization
                    </Typography>
                    <Typography variant="body2" fontWeight={600} color="#0f172a">
                      {record?.ugBranch || 'Information Technology'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Cumulative CGPA (0-10)
                    </Typography>
                    <Typography variant="h6" fontWeight={800} color="#0D9488">
                      {record?.ugCgpa != null
                        ? Number(record.ugCgpa).toFixed(2)
                        : record?.currentCgpa != null
                        ? Number(record.currentCgpa).toFixed(2)
                        : 'Not Provided'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Overall Percentage
                    </Typography>
                    <Typography variant="h6" fontWeight={800} color="#0284C7">
                      {record?.ugPercentage != null
                        ? `${Number(record.ugPercentage).toFixed(2)}%`
                        : record?.overallPercentage != null
                        ? `${Number(record.overallPercentage).toFixed(2)}%`
                        : 'Not Provided'}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>

              <Box sx={{ mt: 2.5, pt: 1.5, borderTop: '1px solid #BAE6FD', display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip
                  label={`Active Backlogs: ${record?.activeBacklogs || 0}`}
                  size="small"
                  color={record?.activeBacklogs && record.activeBacklogs > 0 ? 'error' : 'success'}
                  sx={{ fontWeight: 600 }}
                />
                <Chip
                  label={`Backlog History: ${record?.historyOfBacklogs || 0}`}
                  size="small"
                  variant="outlined"
                  sx={{ fontWeight: 600 }}
                />
              </Box>
            </Box>
          </Grid>

          {/* 4. Postgraduate (PG) Card */}
          <Grid item xs={12} md={6}>
            <Box
              sx={{
                p: 3,
                borderRadius: 2,
                bgcolor: record?.pgDegree || record?.pgCgpa != null || record?.pgPercentage != null ? '#FAF5FF' : '#F8FAFC',
                border: '1px solid',
                borderColor: record?.pgDegree || record?.pgCgpa != null || record?.pgPercentage != null ? '#E9D5FF' : '#E2E8F0',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SchoolIcon sx={{ color: record?.pgDegree ? '#7E22CE' : '#64748B' }} />
                    <Typography
                      variant="subtitle1"
                      fontWeight={700}
                      color={record?.pgDegree ? '#7E22CE' : '#475569'}
                    >
                      Postgraduate (PG)
                    </Typography>
                  </Box>
                  <Chip
                    label={
                      record?.pgStatus === 'COMPLETED'
                        ? 'Completed'
                        : record?.pgStatus === 'STUDYING'
                        ? 'Studying'
                        : record?.pgDegree
                        ? 'Enrolled'
                        : 'Not Enrolled'
                    }
                    size="small"
                    color={
                      record?.pgStatus === 'COMPLETED'
                        ? 'success'
                        : record?.pgStatus === 'STUDYING'
                        ? 'info'
                        : 'default'
                    }
                    variant={record?.pgDegree ? 'filled' : 'outlined'}
                    sx={{ fontWeight: 700 }}
                  />
                </Box>

                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Degree
                    </Typography>
                    <Typography variant="body2" fontWeight={600} color="#0f172a">
                      {record?.pgDegree || 'None / Not Enrolled'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Education Status
                    </Typography>
                    <Typography variant="body2" fontWeight={600} color="#0f172a">
                      {record?.pgStatus === 'COMPLETED'
                        ? 'Completed'
                        : record?.pgStatus === 'STUDYING'
                        ? 'Studying'
                        : 'Not Enrolled'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      PG CGPA (0-10)
                    </Typography>
                    <Typography
                      variant="h6"
                      fontWeight={800}
                      color={record?.pgCgpa != null ? '#7E22CE' : 'text.secondary'}
                    >
                      {record?.pgCgpa != null ? Number(record.pgCgpa).toFixed(2) : '—'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      PG Percentage
                    </Typography>
                    <Typography
                      variant="h6"
                      fontWeight={800}
                      color={record?.pgPercentage != null ? '#7E22CE' : 'text.secondary'}
                    >
                      {record?.pgPercentage != null ? `${Number(record.pgPercentage).toFixed(2)}%` : '—'}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>

              <Box sx={{ mt: 2.5, pt: 1.5, borderTop: '1px solid #E2E8F0' }}>
                <Typography variant="caption" color="text.secondary">
                  {record?.pgDegree || record?.pgCgpa != null || record?.pgPercentage != null
                    ? 'Postgraduate credentials recorded and managed directly (2 Years, 4 Semesters).'
                    : 'Optional for students who have not enrolled in a PG program.'}
                </Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>

        {/* Dynamic Semester-Wise Records Table */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
          <div>
            <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#1E293B' }}>
              {activeStructure.streamLabel} Progression (Semesters 1 to {activeStructure.totalSemesters})
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Showing only the {activeStructure.totalSemesters} semesters configured for this academic stream.
            </Typography>
          </div>
          <Chip
            label={`${activeStructure.totalSemesters} Semesters Total`}
            size="small"
            color="primary"
            variant="outlined"
            sx={{ fontWeight: 700 }}
          />
        </Box>

        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: '#F8FAFC' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Semester</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">SGPA (0-10)</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">CGPA (0-10)</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">Credits (Earned / Total)</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">Arrears / Backlogs</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">Academic Standing</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {Array.from({ length: activeStructure.totalSemesters }, (_, i) => {
                const semNo = i + 1;
                const sem = record?.semesters?.find((s) => s.semesterNumber === semNo);
                const hasArrears = sem?.backlogsCount && sem.backlogsCount > 0;
                const isCompleted = sem?.sgpa != null && sem?.cgpa != null;

                return (
                  <TableRow key={semNo} hover>
                    <TableCell sx={{ fontWeight: 700, color: '#1E293B' }}>
                      Semester {semNo}
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600 }}>
                      {sem?.sgpa != null ? Number(sem.sgpa).toFixed(2) : '—'}
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600 }}>
                      {sem?.cgpa != null ? Number(sem.cgpa).toFixed(2) : '—'}
                    </TableCell>
                    <TableCell align="center">
                      {sem?.creditsEarned != null && sem?.totalCredits != null
                        ? `${sem.creditsEarned} / ${sem.totalCredits}`
                        : '—'}
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={hasArrears ? `${sem?.backlogsCount} Backlog(s)` : '0 Backlogs'}
                        size="small"
                        color={hasArrears ? 'error' : 'default'}
                        variant={hasArrears ? 'filled' : 'outlined'}
                        sx={{ fontWeight: 600, fontSize: '0.72rem' }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      {isCompleted ? (
                        <Chip
                          label={hasArrears ? 'Arrears Pending' : 'Clear / Passed'}
                          size="small"
                          color={hasArrears ? 'warning' : 'success'}
                          sx={{ fontWeight: 600, fontSize: '0.72rem' }}
                        />
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          Upcoming / Inactive
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>

      {/* Edit Academic Records Dialog */}
      <Dialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2.5 } }}
      >
        <form onSubmit={handleSaveAcademicRecord}>
          <DialogTitle sx={{ fontWeight: 700, color: '#14264B', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Direct Academic Entry & Management</span>
            <Chip
              label={formStructure.streamLabel}
              size="small"
              color="primary"
              sx={{ fontWeight: 700 }}
            />
          </DialogTitle>
          <DialogContent sx={{ pt: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
            {formValidationErrors.length > 0 && (
              <Alert severity="error" sx={{ mb: 1 }}>
                <Typography variant="subtitle2" fontWeight={700}>
                  Please resolve the following input issues:
                </Typography>
                <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                  {formValidationErrors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </Alert>
            )}

            {/* Program Stream Selector */}
            <Box sx={{ p: 2, borderRadius: 2, bgcolor: '#f0f9ff', border: '1px solid #bae6fd' }}>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1, color: '#0369a1' }}>
                Academic Program Stream Configuration
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    select
                    label="Degree Level"
                    fullWidth
                    size="small"
                    value={editForm.degreeLevel || 'UG'}
                    onChange={(e) => {
                      const newLevel = e.target.value as 'UG' | 'PG';
                      setEditForm((prev) => ({
                        ...prev,
                        degreeLevel: newLevel,
                        studyStatus: newLevel === 'PG' ? 'COMPLETED' : prev.studyStatus,
                      }));
                    }}
                  >
                    <MenuItem value="UG">Undergraduate (UG)</MenuItem>
                    <MenuItem value="PG">Postgraduate (PG)</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', height: '100%', gap: 1 }}>
                    <Chip
                      label={formStructure.streamLabel}
                      color="info"
                      sx={{ fontWeight: 700 }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      Active: {formStructure.totalSemesters} Semesters only
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Box>

            {/* 10th Standard Inputs */}
            <Box>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5, color: '#1E293B' }}>
                1. 10th Standard (Secondary) Records
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Board / Council"
                    fullWidth
                    size="small"
                    placeholder="e.g. CBSE, ICSE, State Board"
                    value={editForm.tenthBoard || ''}
                    onChange={(e) => setEditForm({ ...editForm, tenthBoard: e.target.value })}
                  />
                </Grid>
                <Grid item xs={6} sm={2}>
                  <TextField
                    label="Passing Year"
                    type="number"
                    fullWidth
                    size="small"
                    value={editForm.tenthPassingYear || ''}
                    onChange={(e) =>
                      setEditForm({ ...editForm, tenthPassingYear: Number(e.target.value) || null })
                    }
                  />
                </Grid>
                <Grid item xs={6} sm={2}>
                  <TextField
                    label="Total Marks"
                    type="number"
                    fullWidth
                    size="small"
                    placeholder="500"
                    value={editForm.tenthTotalMarks ?? ''}
                    onChange={(e) => {
                      const total = e.target.value !== '' ? Number(e.target.value) : null;
                      handleTenthMarksChange(total, editForm.tenthObtainedMarks ?? null);
                    }}
                  />
                </Grid>
                <Grid item xs={6} sm={2}>
                  <TextField
                    label="Obtained Marks"
                    type="number"
                    fullWidth
                    size="small"
                    placeholder="450"
                    value={editForm.tenthObtainedMarks ?? ''}
                    onChange={(e) => {
                      const obtained = e.target.value !== '' ? Number(e.target.value) : null;
                      handleTenthMarksChange(editForm.tenthTotalMarks ?? null, obtained);
                    }}
                  />
                </Grid>
                <Grid item xs={6} sm={2}>
                  <TextField
                    label="Percentage"
                    type="number"
                    fullWidth
                    size="small"
                    InputProps={{
                      endAdornment: <InputAdornment position="end">%</InputAdornment>,
                    }}
                    inputProps={{ step: 0.01, min: 0, max: 100 }}
                    value={editForm.tenthPercentage ?? ''}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        tenthPercentage: e.target.value !== '' ? Number(e.target.value) : null,
                      })
                    }
                    helperText="Auto-calculated from marks"
                  />
                </Grid>
              </Grid>
            </Box>

            <Divider />

            {/* 12th Standard Inputs */}
            <Box>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5, color: '#1E293B' }}>
                2. 12th Standard / Higher Secondary Records
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Board / Institution"
                    fullWidth
                    size="small"
                    placeholder="e.g. CBSE, State Board, Diploma"
                    value={editForm.twelfthBoard || ''}
                    onChange={(e) => setEditForm({ ...editForm, twelfthBoard: e.target.value })}
                  />
                </Grid>
                <Grid item xs={6} sm={2}>
                  <TextField
                    label="Passing Year"
                    type="number"
                    fullWidth
                    size="small"
                    value={editForm.twelfthPassingYear || ''}
                    onChange={(e) =>
                      setEditForm({ ...editForm, twelfthPassingYear: Number(e.target.value) || null })
                    }
                  />
                </Grid>
                <Grid item xs={6} sm={2}>
                  <TextField
                    label="Total Marks"
                    type="number"
                    fullWidth
                    size="small"
                    placeholder="600"
                    value={editForm.twelfthTotalMarks ?? ''}
                    onChange={(e) => {
                      const total = e.target.value !== '' ? Number(e.target.value) : null;
                      handleTwelfthMarksChange(total, editForm.twelfthObtainedMarks ?? null);
                    }}
                  />
                </Grid>
                <Grid item xs={6} sm={2}>
                  <TextField
                    label="Obtained Marks"
                    type="number"
                    fullWidth
                    size="small"
                    placeholder="540"
                    value={editForm.twelfthObtainedMarks ?? ''}
                    onChange={(e) => {
                      const obtained = e.target.value !== '' ? Number(e.target.value) : null;
                      handleTwelfthMarksChange(editForm.twelfthTotalMarks ?? null, obtained);
                    }}
                  />
                </Grid>
                <Grid item xs={6} sm={2}>
                  <TextField
                    label="Percentage"
                    type="number"
                    fullWidth
                    size="small"
                    InputProps={{
                      endAdornment: <InputAdornment position="end">%</InputAdornment>,
                    }}
                    inputProps={{ step: 0.01, min: 0, max: 100 }}
                    value={editForm.twelfthPercentage ?? ''}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        twelfthPercentage: e.target.value !== '' ? Number(e.target.value) : null,
                      })
                    }
                    helperText="Auto-calculated from marks"
                  />
                </Grid>
              </Grid>
            </Box>

            <Divider />

            {/* Undergraduate (UG) Details */}
            <Box>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5, color: '#1E293B' }}>
                3. Undergraduate (UG) Academic Credentials
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={3}>
                  <TextField
                    label="UG Degree"
                    fullWidth
                    size="small"
                    placeholder="e.g. B.Sc IT / B.Com / BCA"
                    value={editForm.ugDegree || ''}
                    onChange={(e) => setEditForm({ ...editForm, ugDegree: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={3}>
                  <TextField
                    label="Branch / Specialization"
                    fullWidth
                    size="small"
                    placeholder="e.g. Information Technology"
                    value={editForm.ugBranch || ''}
                    onChange={(e) => setEditForm({ ...editForm, ugBranch: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={3}>
                  <TextField
                    select
                    label="UG Education Status"
                    fullWidth
                    size="small"
                    value={editForm.ugStatus || editForm.studyStatus || 'STUDYING'}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditForm({ ...editForm, ugStatus: val, studyStatus: val });
                    }}
                  >
                    <MenuItem value="STUDYING">Studying (Ongoing)</MenuItem>
                    <MenuItem value="COMPLETED">Completed (Graduated)</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <TextField
                    label="Current Semester"
                    type="number"
                    fullWidth
                    size="small"
                    inputProps={{ min: 1, max: formStructure.totalSemesters }}
                    value={editForm.currentSemester || 1}
                    onChange={(e) =>
                      setEditForm({ ...editForm, currentSemester: Number(e.target.value) || 1 })
                    }
                    helperText={`1 to ${formStructure.totalSemesters}`}
                  />
                </Grid>

                <Grid item xs={12} sm={3}>
                  <TextField
                    label="UG CGPA (0.00 - 10.00)"
                    type="number"
                    fullWidth
                    size="small"
                    inputProps={{ step: 0.01, min: 0, max: 10 }}
                    value={editForm.ugCgpa ?? editForm.currentCgpa ?? ''}
                    onChange={(e) => {
                      const val = e.target.value !== '' ? Number(e.target.value) : null;
                      handleUgCgpaChange(val);
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={3}>
                  <TextField
                    label="UG Percentage (%)"
                    type="number"
                    fullWidth
                    size="small"
                    InputProps={{
                      endAdornment: <InputAdornment position="end">%</InputAdornment>,
                    }}
                    inputProps={{ step: 0.01, min: 0, max: 100 }}
                    value={editForm.ugPercentage ?? editForm.overallPercentage ?? ''}
                    onChange={(e) => {
                      const val = e.target.value !== '' ? Number(e.target.value) : null;
                      setEditForm({ ...editForm, ugPercentage: val, overallPercentage: val });
                    }}
                  />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <TextField
                    label="Active Backlogs"
                    type="number"
                    fullWidth
                    size="small"
                    inputProps={{ min: 0 }}
                    value={editForm.activeBacklogs ?? 0}
                    onChange={(e) =>
                      setEditForm({ ...editForm, activeBacklogs: Number(e.target.value) || 0 })
                    }
                  />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <TextField
                    label="Backlog History"
                    type="number"
                    fullWidth
                    size="small"
                    inputProps={{ min: 0 }}
                    value={editForm.historyOfBacklogs ?? 0}
                    onChange={(e) =>
                      setEditForm({ ...editForm, historyOfBacklogs: Number(e.target.value) || 0 })
                    }
                  />
                </Grid>
              </Grid>
            </Box>

            <Divider />

            {/* Postgraduate (PG) Details (Optional) */}
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#1E293B' }}>
                  4. Postgraduate (PG) Credentials (Optional)
                </Typography>
                <Chip label="2 Years, 4 Semesters" size="small" variant="outlined" />
              </Box>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={3}>
                  <TextField
                    label="PG Degree"
                    fullWidth
                    size="small"
                    placeholder="e.g. M.Sc / MBA / M.Com"
                    value={editForm.pgDegree || ''}
                    onChange={(e) => setEditForm({ ...editForm, pgDegree: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={3}>
                  <TextField
                    select
                    label="PG Education Status"
                    fullWidth
                    size="small"
                    value={editForm.pgStatus || ''}
                    onChange={(e) => setEditForm({ ...editForm, pgStatus: e.target.value })}
                  >
                    <MenuItem value="">Not Started / None</MenuItem>
                    <MenuItem value="STUDYING">Studying (Ongoing)</MenuItem>
                    <MenuItem value="COMPLETED">Completed (Graduated)</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <TextField
                    label="PG CGPA (0.00 - 10.00)"
                    type="number"
                    fullWidth
                    size="small"
                    inputProps={{ step: 0.01, min: 0, max: 10 }}
                    value={editForm.pgCgpa ?? ''}
                    onChange={(e) => {
                      const val = e.target.value !== '' ? Number(e.target.value) : null;
                      handlePgCgpaChange(val);
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={3}>
                  <TextField
                    label="PG Percentage (%)"
                    type="number"
                    fullWidth
                    size="small"
                    InputProps={{
                      endAdornment: <InputAdornment position="end">%</InputAdornment>,
                    }}
                    inputProps={{ step: 0.01, min: 0, max: 100 }}
                    value={editForm.pgPercentage ?? ''}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        pgPercentage: e.target.value !== '' ? Number(e.target.value) : null,
                      })
                    }
                  />
                </Grid>
              </Grid>
            </Box>

            <Divider />

            {/* Dynamic Semester-wise details for relevant stream */}
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
                <div>
                  <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#1E293B' }}>
                    5. {formStructure.streamLabel} (Semesters 1 to {formStructure.totalSemesters})
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Displaying only the {formStructure.totalSemesters} semesters configured for this program.
                  </Typography>
                </div>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<CalculateIcon fontSize="small" />}
                  onClick={() => {
                    const autoCgpa = calculateProgramCgpa(editForm.semesters || []);
                    if (autoCgpa !== null) {
                      const autoPct = parseFloat((autoCgpa * 9.5).toFixed(2));
                      setEditForm((prev) => ({
                        ...prev,
                        ugCgpa: autoCgpa,
                        currentCgpa: autoCgpa,
                        ugPercentage: autoPct,
                        overallPercentage: autoPct,
                      }));
                      setActionSuccess(`Calculated Cumulative CGPA: ${autoCgpa} (${autoPct}%) from completed semesters.`);
                      setTimeout(() => setActionSuccess(null), 4000);
                    }
                  }}
                  sx={{ textTransform: 'none', fontWeight: 600 }}
                >
                  Calculate Overall CGPA from Semesters
                </Button>
              </Box>

              <Grid container spacing={1.5}>
                {Array.from({ length: formStructure.totalSemesters }, (_, idx) => {
                  const semNo = idx + 1;
                  const sem = editForm.semesters?.find((s) => s.semesterNumber === semNo) || {
                    semesterNumber: semNo,
                    sgpa: null,
                    cgpa: null,
                    totalCredits: 24,
                    creditsEarned: 24,
                    backlogsCount: 0,
                  };

                  return (
                    <Grid item xs={12} sm={6} md={3} key={semNo}>
                      <Box sx={{ p: 1.5, borderRadius: 1.5, bgcolor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                        <Typography variant="caption" fontWeight={700} color="#1E293B" sx={{ display: 'block', mb: 1 }}>
                          Semester {semNo}
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          <TextField
                            label="SGPA (0-10)"
                            size="small"
                            type="number"
                            inputProps={{ step: 0.01, min: 0, max: 10 }}
                            value={sem.sgpa ?? ''}
                            onChange={(e) => {
                              const newSems = [...(editForm.semesters || [])];
                              const existingIdx = newSems.findIndex((s) => s.semesterNumber === semNo);
                              const parsedVal = e.target.value !== '' ? Number(e.target.value) : null;
                              if (existingIdx >= 0) {
                                newSems[existingIdx].sgpa = parsedVal;
                              } else {
                                newSems.push({
                                  semesterNumber: semNo,
                                  sgpa: parsedVal,
                                  cgpa: parsedVal,
                                  totalCredits: 24,
                                  creditsEarned: 24,
                                  backlogsCount: 0,
                                });
                              }
                              setEditForm({ ...editForm, semesters: newSems });
                            }}
                          />
                          <TextField
                            label="Cumulative CGPA"
                            size="small"
                            type="number"
                            inputProps={{ step: 0.01, min: 0, max: 10 }}
                            value={sem.cgpa ?? ''}
                            onChange={(e) => {
                              const newSems = [...(editForm.semesters || [])];
                              const existingIdx = newSems.findIndex((s) => s.semesterNumber === semNo);
                              const parsedVal = e.target.value !== '' ? Number(e.target.value) : null;
                              if (existingIdx >= 0) {
                                newSems[existingIdx].cgpa = parsedVal;
                              } else {
                                newSems.push({
                                  semesterNumber: semNo,
                                  sgpa: parsedVal,
                                  cgpa: parsedVal,
                                  totalCredits: 24,
                                  creditsEarned: 24,
                                  backlogsCount: 0,
                                });
                              }
                              setEditForm({ ...editForm, semesters: newSems });
                            }}
                          />
                          <TextField
                            label="Backlogs"
                            size="small"
                            type="number"
                            inputProps={{ min: 0 }}
                            value={sem.backlogsCount ?? 0}
                            onChange={(e) => {
                              const newSems = [...(editForm.semesters || [])];
                              const existingIdx = newSems.findIndex((s) => s.semesterNumber === semNo);
                              const parsedVal = Number(e.target.value) || 0;
                              if (existingIdx >= 0) {
                                newSems[existingIdx].backlogsCount = parsedVal;
                              } else {
                                newSems.push({
                                  semesterNumber: semNo,
                                  sgpa: null,
                                  cgpa: null,
                                  totalCredits: 24,
                                  creditsEarned: 24,
                                  backlogsCount: parsedVal,
                                });
                              }
                              setEditForm({ ...editForm, semesters: newSems });
                            }}
                          />
                        </Box>
                      </Box>
                    </Grid>
                  );
                })}
              </Grid>
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 2.5, borderTop: '1px solid #E2E8F0' }}>
            <Button onClick={() => setEditOpen(false)} color="inherit" sx={{ textTransform: 'none' }}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={saving}
              sx={{ bgcolor: '#0284c7', textTransform: 'none', fontWeight: 600, '&:hover': { bgcolor: '#0369a1' } }}
            >
              {saving ? <CircularProgress size={20} color="inherit" /> : 'Save Academic Record'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Card>
  );
};
