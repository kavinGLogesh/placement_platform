import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  TextField,
  MenuItem,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Checkbox,
  Chip,
  Button,
  Stack,
  CircularProgress,
  InputAdornment,
  IconButton,
  FormControlLabel,
  Switch,
  Alert,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { managementService } from '../../services/management.service.js';
import { Department, Student } from '../../types/management.types.js';

export interface StudentSelectorProps {
  // Array of selected student IDs
  selectedStudentIds: string[];
  // Callback when selected student IDs change
  onSelectionChange: (selectedIds: string[]) => void;
  // Student IDs that are already participants in the current round
  alreadyAssignedStudentIds?: string[];
  // Optional pre-selected department ID
  initialDepartmentId?: string;
  // Deprecated course ID kept for prop compatibility
  initialCourseId?: string;
  // Optional max height for table container
  maxHeight?: number | string;
  // Title or descriptive header
  title?: string;
  // Subtitle or guidance text
  helperText?: string;
}

export const StudentSelector: React.FC<StudentSelectorProps> = ({
  selectedStudentIds,
  onSelectionChange,
  alreadyAssignedStudentIds = [],
  initialDepartmentId = '',
  maxHeight = 400,
  title = 'Student Selection',
  helperText,
}) => {
  // Department options
  const [departments, setDepartments] = useState<Department[]>([]);

  // Filter state
  const [selectedDeptId, setSelectedDeptId] = useState<string>(initialDepartmentId);
  const [selectedYear, setSelectedYear] = useState<number | ''>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);

  // UI state
  const [loadingLookups, setLoadingLookups] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Student cache to remember student objects across filter switches
  const [studentCache, setStudentCache] = useState<Map<string, Student>>(new Map());

  // Set of already assigned IDs for O(1) lookup
  const alreadyAssignedSet = useMemo(
    () => new Set(alreadyAssignedStudentIds),
    [alreadyAssignedStudentIds]
  );

  // Set of selected IDs for O(1) lookup
  const selectedSet = useMemo(
    () => new Set(selectedStudentIds),
    [selectedStudentIds]
  );

  // 1. Load departments dynamically from database
  useEffect(() => {
    let isMounted = true;
    const loadDepartments = async () => {
      try {
        setLoadingLookups(true);
        const data = await managementService.getDepartments();
        if (isMounted) {
          // Ensure canonical uniqueness by department name
          const uniqueMap = new Map<string, Department>();
          (data || []).forEach((d) => {
            const key = d.name.trim().toLowerCase();
            if (!uniqueMap.has(key)) {
              uniqueMap.set(key, d);
            }
          });
          setDepartments(Array.from(uniqueMap.values()));
        }
      } catch (err: unknown) {
        if (isMounted) setError('Failed to load departments');
      } finally {
        if (isMounted) setLoadingLookups(false);
      }
    };
    loadDepartments();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Load Students matching current Department and Year filters
  const fetchStudents = useCallback(async () => {
    try {
      setLoadingStudents(true);
      setError(null);

      let allLoaded: Student[] = [];
      let currentPage = 1;
      let hasMore = true;

      // Safely fetch students matching active filters
      while (hasMore && currentPage <= 5) {
        const res = await managementService.getStudents({
          departmentId: selectedDeptId || undefined,
          year: selectedYear !== '' ? Number(selectedYear) : undefined,
          search: searchQuery.trim() || undefined,
          page: currentPage,
          limit: 100,
        });

        const list = Array.isArray(res) ? res : res?.data || [];
        allLoaded = allLoaded.concat(list);

        if (!res?.pagination?.hasNextPage || list.length === 0) {
          hasMore = false;
        } else {
          currentPage++;
        }
      }

      setStudents(allLoaded);

      // Cache newly loaded students
      setStudentCache((prev) => {
        const next = new Map(prev);
        allLoaded.forEach((s) => next.set(s.id, s));
        return next;
      });
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load students');
    } finally {
      setLoadingStudents(false);
    }
  }, [selectedDeptId, selectedYear, searchQuery]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // List of students to display (filtering by "Show Selected Only" if enabled)
  const displayedStudents = useMemo(() => {
    if (showSelectedOnly) {
      const allSelected: Student[] = [];
      const seen = new Set<string>();

      // From current list
      students.forEach((s) => {
        if ((selectedSet.has(s.id) || alreadyAssignedSet.has(s.id)) && !seen.has(s.id)) {
          allSelected.push(s);
          seen.add(s.id);
        }
      });

      // From cache for cross-filter selected students
      selectedStudentIds.forEach((id) => {
        if (!seen.has(id) && studentCache.has(id)) {
          allSelected.push(studentCache.get(id)!);
          seen.add(id);
        }
      });

      return allSelected;
    }

    return students;
  }, [students, showSelectedOnly, selectedSet, alreadyAssignedSet, selectedStudentIds, studentCache]);

  // Selection handlers
  const handleToggleStudent = (studentId: string) => {
    if (alreadyAssignedSet.has(studentId)) {
      return; // Cannot toggle already assigned students
    }

    if (selectedSet.has(studentId)) {
      onSelectionChange(selectedStudentIds.filter((id) => id !== studentId));
    } else {
      onSelectionChange([...selectedStudentIds, studentId]);
    }
  };

  const handleSelectAllVisible = () => {
    const unassignedVisibleIds = displayedStudents
      .filter((s) => !alreadyAssignedSet.has(s.id))
      .map((s) => s.id);

    const areAllVisibleSelected =
      unassignedVisibleIds.length > 0 &&
      unassignedVisibleIds.every((id) => selectedSet.has(id));

    if (areAllVisibleSelected) {
      const unassignedVisibleSet = new Set(unassignedVisibleIds);
      onSelectionChange(selectedStudentIds.filter((id) => !unassignedVisibleSet.has(id)));
    } else {
      const merged = Array.from(new Set([...selectedStudentIds, ...unassignedVisibleIds]));
      onSelectionChange(merged);
    }
  };

  const handleClearSelection = () => {
    onSelectionChange([]);
  };

  // Unassigned visible students
  const unassignedVisible = displayedStudents.filter((s) => !alreadyAssignedSet.has(s.id));
  const isAllVisibleSelected =
    unassignedVisible.length > 0 &&
    unassignedVisible.every((s) => selectedSet.has(s.id));
  const isSomeVisibleSelected =
    unassignedVisible.some((s) => selectedSet.has(s.id)) && !isAllVisibleSelected;

  const totalSelectedCount = selectedStudentIds.filter(
    (id) => !alreadyAssignedSet.has(id)
  ).length;

  const visibleSelectedCount = displayedStudents.filter(
    (s) => selectedSet.has(s.id) && !alreadyAssignedSet.has(s.id)
  ).length;

  // Active filter naming
  const activeDept = departments.find((d) => d.id === selectedDeptId);
  const activeDeptName = activeDept ? activeDept.name : 'All Departments';
  const activeYearLabel = selectedYear !== '' ? ` (Year ${selectedYear})` : '';

  return (
    <Box sx={{ width: '100%' }}>
      {/* Title & Stats */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#14264B' }}>
            {title}
          </Typography>
          <Typography variant="caption" sx={{ color: '#7182A0' }}>
            {helperText || 'Filter by Department and Academic Year to select participant candidates'}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip
            icon={<PersonOutlineIcon />}
            label={`${totalSelectedCount} Selected`}
            color={totalSelectedCount > 0 ? 'primary' : 'default'}
            size="small"
            sx={{ fontWeight: 700 }}
          />
          {alreadyAssignedStudentIds.length > 0 && (
            <Chip
              icon={<CheckCircleOutlineIcon />}
              label={`${alreadyAssignedStudentIds.length} Already in Round`}
              color="success"
              variant="outlined"
              size="small"
            />
          )}
        </Stack>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Simplified Filters (Department, Year, Search & Toggle) */}
      <Paper variant="outlined" sx={{ p: 2, mb: 2, backgroundColor: '#F8FAFC', borderColor: '#E2E8F0', borderRadius: 2 }}>
        <Grid container spacing={2} alignItems="center">
          {/* Department Filter with All Departments at the top */}
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              select
              size="small"
              fullWidth
              label="Department"
              value={selectedDeptId}
              onChange={(e) => setSelectedDeptId(e.target.value)}
              disabled={loadingLookups}
              sx={{ bgcolor: '#ffffff' }}
              SelectProps={{
                displayEmpty: true,
                renderValue: (selected) => {
                  if (!selected || selected === '') {
                    return 'All Departments';
                  }
                  const dept = departments.find((d) => d.id === selected);
                  return dept ? dept.name : 'All Departments';
                },
              }}
              InputLabelProps={{ shrink: true }}
            >
              <MenuItem value="">
                <em>All Departments</em>
              </MenuItem>
              {departments.map((d) => (
                <MenuItem key={d.id} value={d.id}>
                  {d.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          {/* Academic Year Filter */}
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              select
              size="small"
              fullWidth
              label="Academic Year"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value as number | '')}
              sx={{ bgcolor: '#ffffff' }}
              SelectProps={{
                displayEmpty: true,
                renderValue: (selected) => {
                  if (!selected || selected === '') {
                    return 'All Years';
                  }
                  const yearLabels: Record<number, string> = {
                    1: '1st Year',
                    2: '2nd Year',
                    3: '3rd Year',
                    4: '4th Year',
                  };
                  return yearLabels[Number(selected)] || `${selected} Year`;
                },
              }}
              InputLabelProps={{ shrink: true }}
            >
              <MenuItem value="">
                <em>All Years</em>
              </MenuItem>
              <MenuItem value={1}>1st Year</MenuItem>
              <MenuItem value={2}>2nd Year</MenuItem>
              <MenuItem value={3}>3rd Year</MenuItem>
              <MenuItem value={4}>4th Year</MenuItem>
            </TextField>
          </Grid>

          {/* Student Search */}
          <Grid item xs={12} sm={8} md={5}>
            <TextField
              size="small"
              fullWidth
              placeholder="Search by student name or register number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{ bgcolor: '#ffffff' }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" sx={{ color: '#94A3B8' }} />
                  </InputAdornment>
                ),
                endAdornment: searchQuery ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearchQuery('')}>
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ) : null,
              }}
            />
          </Grid>
        </Grid>

        {/* Clear Selection Status & Filter Indicators (Requirement 4) */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mt: 2,
            pt: 1.5,
            borderTop: '1px solid #E2E8F0',
            flexWrap: 'wrap',
            gap: 1.5,
          }}
        >
          {/* Active Filter and Student Counts */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 700, color: '#1E293B' }}>
                Student list:
              </Typography>
              <Chip
                label={`${activeDeptName}${activeYearLabel} — ${students.length} student${students.length !== 1 ? 's' : ''}`}
                size="small"
                sx={{
                  backgroundColor: '#E0F2FE',
                  color: '#0369A1',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                }}
              />
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 700, color: '#1E293B' }}>
                Selected:
              </Typography>
              <Chip
                label={
                  selectedDeptId === ''
                    ? `${totalSelectedCount} students across all departments`
                    : `${visibleSelectedCount} of ${students.length} in ${activeDeptName} (${totalSelectedCount} total)`
                }
                size="small"
                color={totalSelectedCount > 0 ? 'primary' : 'default'}
                variant={totalSelectedCount > 0 ? 'filled' : 'outlined'}
                sx={{ fontWeight: 700, fontSize: '0.8rem' }}
              />
            </Box>
          </Box>

          {/* Show Selected Only Toggle */}
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={showSelectedOnly}
                onChange={(e) => setShowSelectedOnly(e.target.checked)}
              />
            }
            label={
              <Typography variant="caption" sx={{ fontWeight: 600, color: '#475569' }}>
                Show Selected Only
              </Typography>
            }
          />
        </Box>
      </Paper>

      {/* Action Toolbar */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
        <Typography variant="body2" sx={{ color: '#64748B' }}>
          Showing <strong>{displayedStudents.length}</strong> eligible student{displayedStudents.length !== 1 ? 's' : ''}
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button
            size="small"
            variant="outlined"
            onClick={handleSelectAllVisible}
            disabled={unassignedVisible.length === 0 || loadingStudents}
            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 1.5 }}
          >
            {isAllVisibleSelected ? 'Deselect Visible' : 'Select All Visible'}
          </Button>
          <Button
            size="small"
            variant="text"
            color="error"
            onClick={handleClearSelection}
            disabled={totalSelectedCount === 0}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Clear Selection
          </Button>
        </Stack>
      </Box>

      {/* Students Table */}
      <TableContainer
        component={Paper}
        variant="outlined"
        sx={{
          maxHeight,
          overflowY: 'auto',
          borderRadius: 2,
          borderColor: '#E2E8F0',
          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        }}
      >
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: '#F1F5F9' }}>
              <TableCell padding="checkbox" sx={{ backgroundColor: '#F1F5F9' }}>
                <Checkbox
                  size="small"
                  indeterminate={isSomeVisibleSelected}
                  checked={isAllVisibleSelected}
                  onChange={handleSelectAllVisible}
                  disabled={unassignedVisible.length === 0 || loadingStudents}
                />
              </TableCell>
              <TableCell sx={{ fontWeight: 700, backgroundColor: '#F1F5F9', color: '#334155' }}>Student Name</TableCell>
              <TableCell sx={{ fontWeight: 700, backgroundColor: '#F1F5F9', color: '#334155' }}>Register Number</TableCell>
              <TableCell sx={{ fontWeight: 700, backgroundColor: '#F1F5F9', color: '#334155' }}>Department</TableCell>
              <TableCell sx={{ fontWeight: 700, backgroundColor: '#F1F5F9', color: '#334155', textAlign: 'center' }}>Academic Year</TableCell>
              <TableCell sx={{ fontWeight: 700, backgroundColor: '#F1F5F9', color: '#334155', textAlign: 'center' }}>CGPA</TableCell>
              <TableCell sx={{ fontWeight: 700, backgroundColor: '#F1F5F9', color: '#334155', textAlign: 'center' }}>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loadingStudents ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                  <CircularProgress size={28} />
                  <Typography variant="body2" sx={{ color: '#64748B', mt: 1.5 }}>
                    Loading students matching filters...
                  </Typography>
                </TableCell>
              </TableRow>
            ) : displayedStudents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                  <Typography variant="body2" sx={{ color: '#64748B', fontWeight: 600 }}>
                    {showSelectedOnly
                      ? 'No students selected yet.'
                      : 'No students found matching current Department and Year filters.'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              displayedStudents.map((student) => {
                const isSelected = selectedSet.has(student.id);
                const isAlreadyAssigned = alreadyAssignedSet.has(student.id);

                return (
                  <TableRow
                    key={student.id}
                    hover={!isAlreadyAssigned}
                    onClick={() => handleToggleStudent(student.id)}
                    sx={{
                      cursor: isAlreadyAssigned ? 'default' : 'pointer',
                      backgroundColor: isSelected
                        ? 'rgba(14, 165, 233, 0.08)'
                        : isAlreadyAssigned
                        ? '#F8FAFC'
                        : 'inherit',
                      '&:hover': {
                        backgroundColor: isAlreadyAssigned
                          ? '#F8FAFC'
                          : isSelected
                          ? 'rgba(14, 165, 233, 0.12)'
                          : 'rgba(241, 245, 249, 0.6)',
                      },
                    }}
                  >
                    <TableCell padding="checkbox">
                      <Checkbox
                        size="small"
                        checked={isSelected || isAlreadyAssigned}
                        disabled={isAlreadyAssigned}
                        onChange={() => handleToggleStudent(student.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#1E293B' }}>
                      {student.name}
                    </TableCell>
                    <TableCell sx={{ color: '#475569', fontFamily: 'monospace', fontSize: '0.825rem' }}>
                      {student.registerNumber}
                    </TableCell>
                    <TableCell sx={{ color: '#475569' }}>
                      {student.department?.name || '—'}
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center', color: '#475569' }}>
                      {student.year ? `Year ${student.year}` : '—'}
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center', color: '#475569', fontWeight: 600 }}>
                      {student.cgpa !== undefined && student.cgpa !== null ? Number(student.cgpa).toFixed(2) : '—'}
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
                      {isAlreadyAssigned ? (
                        <Chip
                          label="Already in Round"
                          size="small"
                          color="success"
                          variant="outlined"
                          sx={{ fontSize: '0.72rem', height: 22 }}
                        />
                      ) : (
                        <Chip
                          label={student.status || 'ACTIVE'}
                          size="small"
                          color={student.status === 'ACTIVE' ? 'primary' : 'default'}
                          variant="outlined"
                          sx={{ fontSize: '0.72rem', height: 22 }}
                        />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};
