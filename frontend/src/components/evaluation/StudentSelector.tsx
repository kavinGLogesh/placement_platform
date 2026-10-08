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
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import { managementService } from '../../services/management.service.js';
import {
  Department,
  Course,
  ClassEntity,
  Section,
  Student,
} from '../../types/management.types.js';

export interface StudentSelectorProps {
  // Array of newly selected student IDs
  selectedStudentIds: string[];
  // Callback when selected student IDs change
  onSelectionChange: (selectedIds: string[]) => void;
  // Student IDs that are already participants in the current round
  alreadyAssignedStudentIds?: string[];
  // Optional pre-selected department ID
  initialDepartmentId?: string;
  // Optional pre-selected course ID
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
  initialCourseId = '',
  maxHeight = 360,
  title = 'Student Selection',
  helperText,
}) => {
  // Cascading Hierarchy state
  const [departments, setDepartments] = useState<Department[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [classes, setClasses] = useState<ClassEntity[]>([]);
  const [sections, setSections] = useState<Section[]>([]);

  // Selected filter values
  const [selectedDeptId, setSelectedDeptId] = useState<string>(initialDepartmentId);
  const [selectedCourseId, setSelectedCourseId] = useState<string>(initialCourseId);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // UI state
  const [loadingLookups, setLoadingLookups] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);
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

  // 1. Initial Load: Load departments
  useEffect(() => {
    let isMounted = true;
    const loadDepartments = async () => {
      try {
        setLoadingLookups(true);
        const data = await managementService.getDepartments();
        if (isMounted) {
          setDepartments(data || []);
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

  // 2. Cascade: Department -> Courses
  useEffect(() => {
    let isMounted = true;
    const loadCourses = async () => {
      try {
        if (!selectedDeptId) {
          // If no department selected, load all courses or empty
          const data = await managementService.getCourses();
          if (isMounted) setCourses(data || []);
        } else {
          const data = await managementService.getCourses(selectedDeptId);
          if (isMounted) setCourses(data || []);
        }
      } catch (err: unknown) {
        if (isMounted) setCourses([]);
      }
    };
    loadCourses();
    return () => {
      isMounted = false;
    };
  }, [selectedDeptId]);

  // 3. Cascade: Course / Dept -> Classes
  useEffect(() => {
    let isMounted = true;
    const loadClasses = async () => {
      try {
        if (!selectedCourseId && !selectedDeptId) {
          if (isMounted) setClasses([]);
          return;
        }
        const data = await managementService.getClasses(
          selectedCourseId || undefined,
          selectedDeptId || undefined
        );
        if (isMounted) setClasses(data || []);
      } catch (err: unknown) {
        if (isMounted) setClasses([]);
      }
    };
    loadClasses();
    return () => {
      isMounted = false;
    };
  }, [selectedDeptId, selectedCourseId]);

  // 4. Cascade: Class -> Sections
  useEffect(() => {
    let isMounted = true;
    const loadSections = async () => {
      try {
        if (!selectedClassId) {
          if (isMounted) setSections([]);
          return;
        }
        const data = await managementService.getSections(selectedClassId);
        if (isMounted) setSections(data || []);
      } catch (err: unknown) {
        if (isMounted) setSections([]);
      }
    };
    loadSections();
    return () => {
      isMounted = false;
    };
  }, [selectedClassId]);

  // Handle department filter change
  const handleDepartmentChange = (deptId: string) => {
    setSelectedDeptId(deptId);
    setSelectedCourseId('');
    setSelectedClassId('');
    setSelectedSectionId('');
  };

  // Handle course filter change
  const handleCourseChange = (courseId: string) => {
    setSelectedCourseId(courseId);
    setSelectedClassId('');
    setSelectedSectionId('');
  };

  // Handle class filter change
  const handleClassChange = (classId: string) => {
    setSelectedClassId(classId);
    setSelectedSectionId('');
  };

  // 5. Load Students matching the current filter
  const fetchStudents = useCallback(async () => {
    try {
      setLoadingStudents(true);
      setError(null);

      let allLoaded: Student[] = [];
      let currentPage = 1;
      let hasMore = true;

      // Safely fetch up to 300 students in batches of 100
      while (hasMore && currentPage <= 3) {
        const res = await managementService.getStudents({
          departmentId: selectedDeptId || undefined,
          courseId: selectedCourseId || undefined,
          classId: selectedClassId || undefined,
          sectionId: selectedSectionId || undefined,
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
  }, [selectedDeptId, selectedCourseId, selectedClassId, selectedSectionId, searchQuery]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // List of students to display (filtering by "Show Selected Only" if enabled)
  const displayedStudents = useMemo(() => {
    if (showSelectedOnly) {
      // Gather all selected students from studentCache and students
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
    // Collect all visible unassigned student IDs
    const unassignedVisibleIds = displayedStudents
      .filter((s) => !alreadyAssignedSet.has(s.id))
      .map((s) => s.id);

    const areAllVisibleSelected = unassignedVisibleIds.length > 0 &&
      unassignedVisibleIds.every((id) => selectedSet.has(id));

    if (areAllVisibleSelected) {
      // Deselect all visible
      const unassignedVisibleSet = new Set(unassignedVisibleIds);
      onSelectionChange(selectedStudentIds.filter((id) => !unassignedVisibleSet.has(id)));
    } else {
      // Select all visible (preserving existing selections from other filters)
      const merged = Array.from(new Set([...selectedStudentIds, ...unassignedVisibleIds]));
      onSelectionChange(merged);
    }
  };

  const handleClearSelection = () => {
    onSelectionChange([]);
  };

  // Header checkbox state
  const unassignedVisible = displayedStudents.filter((s) => !alreadyAssignedSet.has(s.id));
  const isAllVisibleSelected =
    unassignedVisible.length > 0 &&
    unassignedVisible.every((s) => selectedSet.has(s.id));
  const isSomeVisibleSelected =
    unassignedVisible.some((s) => selectedSet.has(s.id)) && !isAllVisibleSelected;

  const newSelectedCount = selectedStudentIds.filter(
    (id) => !alreadyAssignedSet.has(id)
  ).length;

  return (
    <Box sx={{ width: '100%' }}>
      {/* Title & Stats */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#14264B' }}>
            {title}
          </Typography>
          <Typography variant="caption" sx={{ color: '#7182A0' }}>
            {helperText || 'Filter by Department → Course → Class → Section to select students across cohorts'}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip
            icon={<PersonOutlineIcon />}
            label={`${newSelectedCount} Selected`}
            color={newSelectedCount > 0 ? 'primary' : 'default'}
            size="small"
            sx={{ fontWeight: 600 }}
          />
          {alreadyAssignedStudentIds.length > 0 && (
            <Chip
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

      {/* Dynamic Cascading Filters */}
      <Paper variant="outlined" sx={{ p: 2, mb: 2, backgroundColor: '#EDF2FF', borderRadius: 1.5 }}>
        <Grid container spacing={1.5} alignItems="center">
          {/* 1. Department */}
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              select
              size="small"
              fullWidth
              label="1. Department"
              value={selectedDeptId}
              onChange={(e) => handleDepartmentChange(e.target.value)}
              disabled={loadingLookups}
            >
              <MenuItem value="">
                <em>All Departments</em>
              </MenuItem>
              {departments.map((d) => (
                <MenuItem key={d.id} value={d.id}>
                  {d.name} ({d.code})
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          {/* 2. Course */}
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              select
              size="small"
              fullWidth
              label="2. Course"
              value={selectedCourseId}
              onChange={(e) => handleCourseChange(e.target.value)}
              disabled={courses.length === 0}
            >
              <MenuItem value="">
                <em>All Courses</em>
              </MenuItem>
              {courses.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name} ({c.code})
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          {/* 3. Class */}
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              select
              size="small"
              fullWidth
              label="3. Class"
              value={selectedClassId}
              onChange={(e) => handleClassChange(e.target.value)}
              disabled={classes.length === 0}
            >
              <MenuItem value="">
                <em>All Classes</em>
              </MenuItem>
              {classes.map((cl) => (
                <MenuItem key={cl.id} value={cl.id}>
                  {cl.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          {/* 4. Section */}
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              select
              size="small"
              fullWidth
              label="4. Section"
              value={selectedSectionId}
              onChange={(e) => setSelectedSectionId(e.target.value)}
              disabled={sections.length === 0}
            >
              <MenuItem value="">
                <em>All Sections</em>
              </MenuItem>
              {sections.map((sec) => (
                <MenuItem key={sec.id} value={sec.id}>
                  Section {sec.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          {/* Search bar & toggles */}
          <Grid item xs={12} sm={8} md={8}>
            <TextField
              size="small"
              fullWidth
              placeholder="Search by student name or register number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" sx={{ color: '#8293B0' }} />
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

          <Grid item xs={12} sm={4} md={4} sx={{ textAlign: 'right' }}>
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={showSelectedOnly}
                  onChange={(e) => setShowSelectedOnly(e.target.checked)}
                />
              }
              label={
                <Typography variant="caption" sx={{ fontWeight: 600 }}>
                  Show Selected Only
                </Typography>
              }
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Action Toolbar */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="body2" sx={{ color: '#7182A0' }}>
          Showing <strong>{displayedStudents.length}</strong> student{displayedStudents.length !== 1 ? 's' : ''}
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button
            size="small"
            variant="outlined"
            onClick={handleSelectAllVisible}
            disabled={unassignedVisible.length === 0 || loadingStudents}
          >
            {isAllVisibleSelected ? 'Deselect Visible' : 'Select All Visible'}
          </Button>
          <Button
            size="small"
            color="secondary"
            onClick={handleClearSelection}
            disabled={newSelectedCount === 0}
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
          borderRadius: 1.5,
          borderColor: '#DCE6F5',
        }}
      >
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: '#E7EEFA' }}>
              <TableCell padding="checkbox" sx={{ backgroundColor: '#E7EEFA' }}>
                <Checkbox
                  size="small"
                  indeterminate={isSomeVisibleSelected}
                  checked={isAllVisibleSelected}
                  onChange={handleSelectAllVisible}
                  disabled={unassignedVisible.length === 0 || loadingStudents}
                />
              </TableCell>
              <TableCell sx={{ fontWeight: 700, backgroundColor: '#E7EEFA' }}>Student Name</TableCell>
              <TableCell sx={{ fontWeight: 700, backgroundColor: '#E7EEFA' }}>Register Number</TableCell>
              <TableCell sx={{ fontWeight: 700, backgroundColor: '#E7EEFA' }}>Department</TableCell>
              <TableCell sx={{ fontWeight: 700, backgroundColor: '#E7EEFA' }}>Course</TableCell>
              <TableCell sx={{ fontWeight: 700, backgroundColor: '#E7EEFA' }}>Class</TableCell>
              <TableCell sx={{ fontWeight: 700, backgroundColor: '#E7EEFA' }}>Section</TableCell>
              <TableCell sx={{ fontWeight: 700, backgroundColor: '#E7EEFA', textAlign: 'center' }}>
                Status
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loadingStudents ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                  <CircularProgress size={28} />
                  <Typography variant="body2" sx={{ color: '#7182A0', mt: 1 }}>
                    Loading students...
                  </Typography>
                </TableCell>
              </TableRow>
            ) : displayedStudents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" sx={{ color: '#7182A0' }}>
                    {showSelectedOnly
                      ? 'No students currently selected.'
                      : 'No students found matching the selected filters.'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              displayedStudents.map((st) => {
                const isAlreadyAssigned = alreadyAssignedSet.has(st.id);
                const isSelected = selectedSet.has(st.id);
                const isChecked = isAlreadyAssigned || isSelected;

                return (
                  <TableRow
                    key={st.id}
                    hover={!isAlreadyAssigned}
                    onClick={() => handleToggleStudent(st.id)}
                    sx={{
                      cursor: isAlreadyAssigned ? 'default' : 'pointer',
                      backgroundColor: isAlreadyAssigned
                        ? '#EDF2FF'
                        : isSelected
                        ? '#eff6ff'
                        : 'inherit',
                    }}
                  >
                    <TableCell padding="checkbox">
                      <Checkbox
                        size="small"
                        checked={isChecked}
                        disabled={isAlreadyAssigned}
                        icon={<CheckBoxOutlineBlankIcon fontSize="small" />}
                        checkedIcon={<CheckBoxIcon fontSize="small" />}
                      />
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#14264B' }}>
                          {st.name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#7182A0' }}>
                          {st.collegeEmail}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={st.registerNumber}
                        size="small"
                        variant="outlined"
                        sx={{ fontFamily: 'monospace', fontWeight: 600 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ color: '#405678' }}>
                        {st.department?.name || st.department?.code || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ color: '#405678' }}>
                        {st.course?.code || st.course?.name || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ color: '#405678' }}>
                        {st.class?.name || (st.class?.batchYear ? `Batch ${st.class.batchYear}` : '-')}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ color: '#405678' }}>
                        {st.section?.name ? `Sec ${st.section.name}` : '-'}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      {isAlreadyAssigned ? (
                        <Chip
                          label="Already in Round"
                          size="small"
                          color="success"
                          variant="outlined"
                          sx={{ fontWeight: 600 }}
                        />
                      ) : isSelected ? (
                        <Chip
                          label="Selected"
                          size="small"
                          color="primary"
                          sx={{ fontWeight: 600 }}
                        />
                      ) : (
                        <Chip label="Available" size="small" variant="outlined" />
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
