import React, { useState, useMemo, useEffect } from 'react';
import { Outlet, Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Chip,
  Breadcrumbs,
  Link,
  Avatar,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import QuizIcon from '@mui/icons-material/Quiz';
import AssignmentIcon from '@mui/icons-material/Assignment';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import BarChartIcon from '@mui/icons-material/BarChart';
import DescriptionIcon from '@mui/icons-material/Description';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import GroupsIcon from '@mui/icons-material/Groups';
import WorkOutlineIcon from '@mui/icons-material/WorkOutline';
import WorkIcon from '@mui/icons-material/Work';
import BusinessIcon from '@mui/icons-material/Business';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import SpeedIcon from '@mui/icons-material/Speed';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import EditNoteIcon from '@mui/icons-material/EditNote';
import CalculateIcon from '@mui/icons-material/Calculate';
import PsychologyIcon from '@mui/icons-material/Psychology';
import SpellcheckIcon from '@mui/icons-material/Spellcheck';
import CodeIcon from '@mui/icons-material/Code';
import TerminalIcon from '@mui/icons-material/Terminal';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import SchoolIcon from '@mui/icons-material/School';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';
import RateReviewIcon from '@mui/icons-material/RateReview';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ViewSidebarIcon from '@mui/icons-material/ViewSidebar';

import { useHealthCheck } from '../hooks/useHealthCheck.js';
import { useAuth } from '../hooks/useAuth.js';
import { assessmentService } from '../services/assessment.service.js';
import { questionService } from '../services/question.service.js';

export interface SubtopicItem {
  id: string;
  label: string;
  path: string;
  icon?: React.ReactElement;
  badge?: string | number;
  badgeColor?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'default';
  description?: string;
}

export interface NavigationModule {
  id: string;
  label: string;
  shortLabel: string;
  category?: string;
  primaryPath: string;
  icon: React.ReactElement;
  badge?: string | number;
  badgeColor?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'default';
  subtopics: SubtopicItem[];
}

const COLUMN_1_WIDTH = 80;
const COLUMN_2_WIDTH = 244;

export const RootLayout: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { isLoading: isHealthLoading, isError: isHealthError } = useHealthCheck();
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Desktop subtopic panel collapse toggle
  const [subtopicPanelCollapsed, setSubtopicPanelCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const isExamMode = location.pathname.startsWith('/student/attempt/');
  const isLoginPage = location.pathname === '/login';
  const isStudent = user?.role === 'STUDENT';

  // Live sidebar statistics queries for badges
  const { data: assessmentStats } = useQuery({
    queryKey: ['sidebar-assessments-stats'],
    queryFn: async () => {
      const res = await assessmentService.getAssessments({ limit: 100 });
      const items = res?.data || [];
      return {
        total: res?.pagination?.totalCount || items.length,
        published: items.filter((a) => a.status === 'PUBLISHED').length,
        scheduled: items.filter((a) => a.status === 'SCHEDULED').length,
        draft: items.filter((a) => a.status === 'DRAFT').length,
      };
    },
    staleTime: 60000,
    enabled: isAuthenticated && user?.role === 'PLACEMENT_ADMIN',
  });

  const { data: questionStats } = useQuery({
    queryKey: ['sidebar-questions-stats'],
    queryFn: async () => {
      const res = await questionService.getQuestions({ limit: 1 });
      return {
        total: res?.pagination?.totalCount || 0,
      };
    },
    staleTime: 60000,
    enabled: isAuthenticated && user?.role === 'PLACEMENT_ADMIN',
  });

  // Navigation Modules structured for Two-Column layout
  const navModules: NavigationModule[] = useMemo(() => {
    if (!isAuthenticated || !user) return [];

    if (user.role === 'SUPER_ADMIN' || user.role === 'PLACEMENT_ADMIN') {
      const totalAsmts = assessmentStats?.total ?? 0;
      const pubAsmts = assessmentStats?.published ?? 0;
      const schedAsmts = assessmentStats?.scheduled ?? 0;
      const draftAsmts = assessmentStats?.draft ?? 0;
      const totalQues = questionStats?.total ?? 0;

      return [
        {
          id: 'overview',
          label: 'Executive Overview',
          shortLabel: 'Overview',
          category: 'GOVERNANCE & METRICS',
          primaryPath: '/admin/dashboard',
          icon: <DashboardIcon fontSize="small" />,
          subtopics: [
            {
              id: 'overview-dashboard',
              label: 'Executive Dashboard',
              path: '/admin/dashboard',
              icon: <DashboardIcon sx={{ fontSize: 18 }} />,
              description: 'Campus placement indicators and recruitment summary',
            },
            {
              id: 'overview-analytics',
              label: 'Placement Analytics',
              path: '/admin/analytics',
              icon: <BarChartIcon sx={{ fontSize: 18 }} />,
              description: 'Performance statistics across departments and batches',
            },
            {
              id: 'overview-reports',
              label: 'Audit Reports',
              path: '/admin/reports',
              icon: <DescriptionIcon sx={{ fontSize: 18 }} />,
              description: 'Consolidated records and tabular data exports',
            },
            {
              id: 'overview-attendance',
              label: 'Attendance Oversight',
              path: '/admin/attendance',
              icon: <HowToRegIcon sx={{ fontSize: 18 }} />,
              description: 'Live candidate check-in and presence monitoring',
            },
          ],
        },
        {
          id: 'assessments',
          label: 'Assessments Hub',
          shortLabel: 'Assessments',
          category: 'EVALUATION ENGINE',
          primaryPath: '/admin/assessments',
          icon: <AssignmentIcon fontSize="small" />,
          badge: totalAsmts > 0 ? String(totalAsmts) : undefined,
          badgeColor: 'primary',
          subtopics: [
            {
              id: 'assessments-all',
              label: 'All Assessments',
              path: '/admin/assessments',
              icon: <FactCheckIcon sx={{ fontSize: 18 }} />,
              badge: totalAsmts > 0 ? totalAsmts : undefined,
              description: 'Complete inventory of recruitment tests',
            },
            {
              id: 'assessments-create',
              label: 'Create Assessment',
              path: '/admin/assessments/create',
              icon: <AddCircleOutlineIcon sx={{ fontSize: 18 }} />,
              badge: 'New',
              badgeColor: 'success',
              description: 'Design new assessment with custom sections',
            },
            {
              id: 'assessments-published',
              label: 'Published Tests',
              path: '/admin/assessments?status=PUBLISHED',
              icon: <CheckCircleOutlineIcon sx={{ fontSize: 18 }} />,
              badge: pubAsmts > 0 ? pubAsmts : undefined,
              badgeColor: 'success',
              description: 'Active tests available to candidate rosters',
            },
            {
              id: 'assessments-scheduled',
              label: 'Scheduled Tests',
              path: '/admin/assessments?status=SCHEDULED',
              icon: <CalendarMonthIcon sx={{ fontSize: 18 }} />,
              badge: schedAsmts > 0 ? schedAsmts : undefined,
              badgeColor: 'info',
              description: 'Upcoming scheduled test timeframes',
            },
            {
              id: 'assessments-draft',
              label: 'Draft Assessments',
              path: '/admin/assessments?status=DRAFT',
              icon: <EditNoteIcon sx={{ fontSize: 18 }} />,
              badge: draftAsmts > 0 ? draftAsmts : undefined,
              badgeColor: 'warning',
              description: 'Work-in-progress test configurations',
            },
            {
              id: 'assessments-company-mocks',
              label: 'Company Mock Drives',
              path: '/admin/companies',
              icon: <BusinessIcon sx={{ fontSize: 18 }} />,
              description: 'Company-specific simulation pattern tests',
            },
          ],
        },
        {
          id: 'question-bank',
          label: 'Question Bank',
          shortLabel: 'Questions',
          category: 'QUESTION REPOSITORY',
          primaryPath: '/admin/questions',
          icon: <QuizIcon fontSize="small" />,
          badge: totalQues > 0 ? String(totalQues) : undefined,
          badgeColor: 'primary',
          subtopics: [
            {
              id: 'questions-overview',
              label: 'Bank Overview',
              path: '/admin/questions',
              icon: <MenuBookIcon sx={{ fontSize: 18 }} />,
              badge: totalQues > 0 ? totalQues : undefined,
              description: 'All questions with multi-tier filters and search',
            },
            {
              id: 'questions-quant',
              label: 'Quantitative Aptitude',
              path: '/admin/questions?category=QUANTITATIVE_APTITUDE',
              icon: <CalculateIcon sx={{ fontSize: 18 }} />,
              description: 'Mathematics, arithmetic and numerical questions',
            },
            {
              id: 'questions-logical',
              label: 'Logical Reasoning',
              path: '/admin/questions?category=LOGICAL_REASONING',
              icon: <PsychologyIcon sx={{ fontSize: 18 }} />,
              description: 'Deductive, inductive and pattern problem sets',
            },
            {
              id: 'questions-verbal',
              label: 'Verbal Ability',
              path: '/admin/questions?category=VERBAL_ABILITY',
              icon: <SpellcheckIcon sx={{ fontSize: 18 }} />,
              description: 'Grammar, reading comprehension and vocabulary',
            },
            {
              id: 'questions-tech',
              label: 'Technical MCQ',
              path: '/admin/questions?category=TECHNICAL_MCQ',
              icon: <CodeIcon sx={{ fontSize: 18 }} />,
              description: 'Computer science and core engineering MCQs',
            },
            {
              id: 'questions-coding',
              label: 'Coding Challenges',
              path: '/admin/questions?category=CODING',
              icon: <TerminalIcon sx={{ fontSize: 18 }} />,
              description: 'Hands-on programming challenges with testcases',
            },
          ],
        },
        {
          id: 'student-directory',
          label: 'Student Directory',
          shortLabel: 'Students',
          category: 'CAMPUS & ACADEMIC SETUP',
          primaryPath: '/admin/students',
          icon: <PeopleAltIcon fontSize="small" />,
          subtopics: [
            {
              id: 'students-list',
              label: 'Student Master Directory',
              path: '/admin/students',
              icon: <PeopleAltIcon sx={{ fontSize: 18 }} />,
              description: 'Candidate roster, profiles, register IDs & status',
            },
            {
              id: 'students-departments',
              label: 'Academic Departments',
              path: '/admin/departments',
              icon: <AccountBalanceIcon sx={{ fontSize: 18 }} />,
              description: 'College department setup and management',
            },
            {
              id: 'students-courses',
              label: 'Degree Courses',
              path: '/admin/courses',
              icon: <SchoolIcon sx={{ fontSize: 18 }} />,
              description: 'Undergraduate and postgraduate programs',
            },
            {
              id: 'students-classes',
              label: 'Classes & Years',
              path: '/admin/classes',
              icon: <CalendarMonthIcon sx={{ fontSize: 18 }} />,
              description: 'Graduating batches and academic years',
            },
            {
              id: 'students-sections',
              label: 'Class Sections',
              path: '/admin/sections',
              icon: <GroupsIcon sx={{ fontSize: 18 }} />,
              description: 'Student classroom section divisions',
            },
            {
              id: 'students-college',
              label: 'College Profile',
              path: '/admin/college',
              icon: <BusinessIcon sx={{ fontSize: 18 }} />,
              description: 'Institutional credentials and portal settings',
            },
          ],
        },
        {
          id: 'placement-drives',
          label: 'Placement Drives',
          shortLabel: 'Drives',
          category: 'RECRUITMENT PIPELINE',
          primaryPath: '/admin/placement-drives',
          icon: <WorkIcon fontSize="small" />,
          subtopics: [
            {
              id: 'drives-all',
              label: 'All Placement Drives',
              path: '/admin/placement-drives',
              icon: <WorkIcon sx={{ fontSize: 18 }} />,
              description: 'Central campus placement drive campaigns',
            },
            {
              id: 'drives-upcoming',
              label: 'Upcoming Drives',
              path: '/admin/placement-drives?status=UPCOMING',
              icon: <CalendarMonthIcon sx={{ fontSize: 18 }} />,
              badge: 'Scheduled',
              badgeColor: 'info',
              description: 'Scheduled on-campus and virtual hiring drives',
            },
            {
              id: 'drives-ongoing',
              label: 'Ongoing Drives',
              path: '/admin/placement-drives?status=ONGOING',
              icon: <LocalFireDepartmentIcon sx={{ fontSize: 18 }} />,
              badge: 'Active',
              badgeColor: 'success',
              description: 'Currently live recruitment stages',
            },
            {
              id: 'drives-completed',
              label: 'Completed Drives',
              path: '/admin/placement-drives?status=COMPLETED',
              icon: <CheckCircleOutlineIcon sx={{ fontSize: 18 }} />,
              description: 'Concluded drives and finalized recruitments',
            },
            {
              id: 'drives-companies',
              label: 'Partner Companies',
              path: '/admin/companies',
              icon: <BusinessIcon sx={{ fontSize: 18 }} />,
              description: 'Corporate recruiter profiles and packages',
            },
          ],
        },
        {
          id: 'gd-rounds',
          label: 'GD Rounds',
          shortLabel: 'GD Rounds',
          category: 'GROUP DISCUSSIONS',
          primaryPath: '/admin/gd',
          icon: <GroupsIcon fontSize="small" />,
          subtopics: [
            {
              id: 'gd-dashboard',
              label: 'GD Dashboard',
              path: '/admin/gd',
              icon: <GroupsIcon sx={{ fontSize: 18 }} />,
              description: 'Overview of all group discussion rounds',
            },
            {
              id: 'gd-scheduled',
              label: 'Scheduled GDs',
              path: '/admin/gd?status=SCHEDULED',
              icon: <CalendarMonthIcon sx={{ fontSize: 18 }} />,
              badge: 'Upcoming',
              badgeColor: 'info',
              description: 'Upcoming GD batches and evaluator allocations',
            },
            {
              id: 'gd-in-progress',
              label: 'Live Evaluation Sheet',
              path: '/admin/gd?status=IN_PROGRESS',
              icon: <RateReviewIcon sx={{ fontSize: 18 }} />,
              badge: 'Live',
              badgeColor: 'success',
              description: 'Real-time candidate rubric grading workspace',
            },
            {
              id: 'gd-completed',
              label: 'Completed GD Rounds',
              path: '/admin/gd?status=COMPLETED',
              icon: <CheckCircleOutlineIcon sx={{ fontSize: 18 }} />,
              description: 'Concluded GD score records and feedback',
            },
            {
              id: 'gd-results',
              label: 'GD Scores & Merit',
              path: '/admin/results',
              icon: <FactCheckIcon sx={{ fontSize: 18 }} />,
              description: 'Consolidated performance in group rounds',
            },
          ],
        },
        {
          id: 'technical-interviews',
          label: 'Technical Interviews',
          shortLabel: 'Technical',
          category: 'CORE TECHNICAL EVALUATION',
          primaryPath: '/admin/interviews?type=TECHNICAL',
          icon: <TerminalIcon fontSize="small" />,
          subtopics: [
            {
              id: 'tech-hub',
              label: 'Technical Interview Hub',
              path: '/admin/interviews?type=TECHNICAL',
              icon: <TerminalIcon sx={{ fontSize: 18 }} />,
              description: 'Coding, architecture & problem-solving rounds',
            },
            {
              id: 'tech-all-rounds',
              label: 'All Interview Rounds',
              path: '/admin/interviews',
              icon: <WorkOutlineIcon sx={{ fontSize: 18 }} />,
              description: 'Consolidated view of all interview pipelines',
            },
            {
              id: 'tech-attendance',
              label: 'Candidate Attendance',
              path: '/admin/attendance',
              icon: <HowToRegIcon sx={{ fontSize: 18 }} />,
              description: 'Verify and check-in shortlisted interviewees',
            },
            {
              id: 'tech-results',
              label: 'Evaluation Results',
              path: '/admin/results',
              icon: <FactCheckIcon sx={{ fontSize: 18 }} />,
              description: 'Technical rubrics, scores and candidate rankings',
            },
          ],
        },
        {
          id: 'hr-rounds',
          label: 'HR Rounds',
          shortLabel: 'HR Rounds',
          category: 'BEHAVIORAL & CULTURE FIT',
          primaryPath: '/admin/interviews?type=HR',
          icon: <SupervisorAccountIcon fontSize="small" />,
          subtopics: [
            {
              id: 'hr-hub',
              label: 'HR Interviews Overview',
              path: '/admin/interviews?type=HR',
              icon: <SupervisorAccountIcon sx={{ fontSize: 18 }} />,
              description: 'Soft skills, behavioral and communication interviews',
            },
            {
              id: 'hr-all-rounds',
              label: 'All Interview Schedules',
              path: '/admin/interviews',
              icon: <WorkOutlineIcon sx={{ fontSize: 18 }} />,
              description: 'Rosters across technical, HR and mock panels',
            },
            {
              id: 'hr-attendance',
              label: 'Candidate Attendance',
              path: '/admin/attendance',
              icon: <HowToRegIcon sx={{ fontSize: 18 }} />,
              description: 'Candidate queue check-in and attendance',
            },
            {
              id: 'hr-offers',
              label: 'Final Shortlists & Offers',
              path: '/admin/results',
              icon: <FactCheckIcon sx={{ fontSize: 18 }} />,
              description: 'Cleared candidates and placement offer status',
            },
          ],
        },
        {
          id: 'mock-interviews',
          label: 'Mock Interviews',
          shortLabel: 'Mock',
          category: 'PRACTICE & READINESS',
          primaryPath: '/admin/interviews?type=MOCK',
          icon: <PsychologyIcon fontSize="small" />,
          subtopics: [
            {
              id: 'mock-hub',
              label: 'Mock Interview Sessions',
              path: '/admin/interviews?type=MOCK',
              icon: <PsychologyIcon sx={{ fontSize: 18 }} />,
              description: 'Simulated practice interviews with formative rubrics',
            },
            {
              id: 'mock-questions',
              label: 'Question Bank Prep',
              path: '/admin/questions',
              icon: <QuizIcon sx={{ fontSize: 18 }} />,
              description: 'Curated technical and aptitude practice questions',
            },
            {
              id: 'mock-analytics',
              label: 'Readiness Analytics',
              path: '/admin/analytics',
              icon: <BarChartIcon sx={{ fontSize: 18 }} />,
              description: 'Student improvement and skill readiness trajectories',
            },
            {
              id: 'mock-reports',
              label: 'Diagnostic Feedback',
              path: '/admin/reports',
              icon: <DescriptionIcon sx={{ fontSize: 18 }} />,
              description: 'Individual strengths and growth area reports',
            },
          ],
        },
        {
          id: 'scoring-results',
          label: 'Scoring & Results',
          shortLabel: 'Results',
          category: 'PERFORMANCE RECORDS',
          primaryPath: '/admin/results',
          icon: <FactCheckIcon fontSize="small" />,
          subtopics: [
            {
              id: 'scoring-main',
              label: 'Consolidated Results',
              path: '/admin/results',
              icon: <FactCheckIcon sx={{ fontSize: 18 }} />,
              description: 'Merit lists across tests, GD and interview rounds',
            },
            {
              id: 'scoring-attendance',
              label: 'Attendance Records',
              path: '/admin/attendance',
              icon: <HowToRegIcon sx={{ fontSize: 18 }} />,
              description: 'Multi-stage candidate appearance metrics',
            },
            {
              id: 'scoring-performance',
              label: 'Performance Analysis',
              path: '/admin/analytics',
              icon: <BarChartIcon sx={{ fontSize: 18 }} />,
              description: 'Cohort benchmarks, percentiles and pass rates',
            },
            {
              id: 'scoring-exports',
              label: 'Audit & Export Sheets',
              path: '/admin/reports',
              icon: <DescriptionIcon sx={{ fontSize: 18 }} />,
              description: 'Excel/PDF placement records and formal reports',
            },
          ],
        },
      ];
    }

    if (user.role === 'STUDENT') {
      return [
        {
          id: 'student-overview',
          label: 'Student Workspace',
          shortLabel: 'Dashboard',
          category: 'CANDIDATE PORTAL',
          primaryPath: '/student/dashboard',
          icon: <SpeedIcon fontSize="small" />,
          subtopics: [
            {
              id: 'st-dashboard',
              label: 'My Dashboard',
              path: '/student/dashboard',
              icon: <SpeedIcon sx={{ fontSize: 18 }} />,
              description: 'Upcoming tests, results summary and notifications',
            },
            {
              id: 'st-profile',
              label: 'My Profile',
              path: '/student/profile',
              icon: <PersonOutlineIcon sx={{ fontSize: 18 }} />,
              description: 'Academic details, resume info and contact profile',
            },
          ],
        },
        {
          id: 'student-tests',
          label: 'My Assessments',
          shortLabel: 'Tests',
          category: 'ONLINE EXAMINATIONS',
          primaryPath: '/student/tests',
          icon: <QuizIcon fontSize="small" />,
          subtopics: [
            {
              id: 'st-tests-available',
              label: 'Available Tests',
              path: '/student/tests',
              icon: <FactCheckIcon sx={{ fontSize: 18 }} />,
              description: 'Active placement and mock assessments ready to take',
            },
            {
              id: 'st-tests-upcoming',
              label: 'Upcoming Tests',
              path: '/student/tests/upcoming',
              icon: <CalendarMonthIcon sx={{ fontSize: 18 }} />,
              description: 'Scheduled examinations and start windows',
            },
            {
              id: 'st-tests-completed',
              label: 'Completed Tests',
              path: '/student/tests/completed',
              icon: <CheckCircleOutlineIcon sx={{ fontSize: 18 }} />,
              description: 'Attempt history, scores and review feedback',
            },
            {
              id: 'st-tests-results',
              label: 'Test Results',
              path: '/student/results',
              icon: <FactCheckIcon sx={{ fontSize: 18 }} />,
              description: 'Detailed section-wise scorecards and answer reviews',
            },
          ],
        },
        {
          id: 'student-rounds',
          label: 'Selection Rounds',
          shortLabel: 'Rounds',
          category: 'EVALUATION STAGES',
          primaryPath: '/student/gd',
          icon: <GroupsIcon fontSize="small" />,
          subtopics: [
            {
              id: 'st-rounds-gd',
              label: 'Lab Test / GD',
              path: '/student/gd',
              icon: <GroupsIcon sx={{ fontSize: 18 }} />,
              description: 'Group discussion batches, timings and feedback',
            },
            {
              id: 'st-rounds-interviews',
              label: 'Recruit / Interviews',
              path: '/student/interviews',
              icon: <WorkOutlineIcon sx={{ fontSize: 18 }} />,
              description: 'Technical, HR and Mock interview status and schedules',
            },
          ],
        },
        {
          id: 'student-analytics',
          label: 'Performance & Records',
          shortLabel: 'Analytics',
          category: 'STUDENT PROGRESS',
          primaryPath: '/student/performance',
          icon: <BarChartIcon fontSize="small" />,
          subtopics: [
            {
              id: 'st-analytics-perf',
              label: 'My Analytics',
              path: '/student/performance',
              icon: <BarChartIcon sx={{ fontSize: 18 }} />,
              description: 'Strengths, accuracy trends and skill radar',
            },
            {
              id: 'st-analytics-results',
              label: 'Results & Records',
              path: '/student/results',
              icon: <FactCheckIcon sx={{ fontSize: 18 }} />,
              description: 'Placement test scorecards and verified marks',
            },
            {
              id: 'st-analytics-reports',
              label: 'Diagnostic Reports',
              path: '/student/reports',
              icon: <DescriptionIcon sx={{ fontSize: 18 }} />,
              description: 'Downloadable performance evaluation sheets',
            },
          ],
        },
        {
          id: 'student-settings',
          label: 'Account & Security',
          shortLabel: 'Account',
          category: 'SETTINGS',
          primaryPath: '/student/profile',
          icon: <PersonOutlineIcon fontSize="small" />,
          subtopics: [
            {
              id: 'st-settings-profile',
              label: 'Profile Details',
              path: '/student/profile',
              icon: <PersonOutlineIcon sx={{ fontSize: 18 }} />,
              description: 'View and update candidate personal details',
            },
            {
              id: 'st-settings-password',
              label: 'Change Password',
              path: '/student/change-password',
              icon: <CheckCircleOutlineIcon sx={{ fontSize: 18 }} />,
              description: 'Update your portal authentication credentials',
            },
          ],
        },
      ];
    }

    return [];
  }, [user, isAuthenticated, assessmentStats, questionStats]);

  // Route matching to identify the active module and active subtopic
  const activeRouteInfo = useMemo(() => {
    const currentFull = location.pathname + (location.search || '');

    // 1. Exact match on full URL (pathname + search query)
    for (const mod of navModules) {
      for (const sub of mod.subtopics) {
        if (sub.path === currentFull) {
          return { moduleId: mod.id, subtopicPath: sub.path };
        }
      }
    }

    // 2. Match with search query param prefix
    for (const mod of navModules) {
      for (const sub of mod.subtopics) {
        if (sub.path.includes('?') && currentFull.startsWith(sub.path)) {
          return { moduleId: mod.id, subtopicPath: sub.path };
        }
      }
    }

    // 3. Exact match on pathname (for items without search parameters)
    for (const mod of navModules) {
      for (const sub of mod.subtopics) {
        const [basePath] = sub.path.split('?');
        if (basePath === location.pathname) {
          return { moduleId: mod.id, subtopicPath: sub.path };
        }
      }
    }

    // 4. Prefix match on pathname (e.g. /admin/assessments/123 matches /admin/assessments)
    for (const mod of navModules) {
      for (const sub of mod.subtopics) {
        const [basePath] = sub.path.split('?');
        if (
          basePath !== '/admin/dashboard' &&
          basePath !== '/student/dashboard' &&
          location.pathname.startsWith(basePath)
        ) {
          return { moduleId: mod.id, subtopicPath: sub.path };
        }
      }
    }

    return {
      moduleId: navModules[0]?.id || '',
      subtopicPath: navModules[0]?.subtopics[0]?.path || '',
    };
  }, [navModules, location.pathname, location.search]);

  // Selected module state (driven by click or route)
  const [selectedModuleId, setSelectedModuleId] = useState<string>('');

  // Keep selectedModuleId aligned with active route when navigating
  useEffect(() => {
    if (activeRouteInfo.moduleId) {
      setSelectedModuleId(activeRouteInfo.moduleId);
    }
  }, [activeRouteInfo.moduleId]);

  // Active module object
  const activeModule = useMemo(() => {
    const targetId = selectedModuleId || activeRouteInfo.moduleId;
    return navModules.find((m) => m.id === targetId) || navModules[0];
  }, [navModules, selectedModuleId, activeRouteInfo.moduleId]);

  // Handle module click in Column 1
  const handleModuleClick = (mod: NavigationModule) => {
    setSelectedModuleId(mod.id);
    if (subtopicPanelCollapsed) {
      setSubtopicPanelCollapsed(false);
    }

    // If current route does not belong to clicked module, navigate to primaryPath
    const isCurrentRouteInModule = mod.subtopics.some((s) => {
      const [base] = s.path.split('?');
      return location.pathname === base || location.pathname.startsWith(base + '/');
    });

    if (!isCurrentRouteInModule && mod.primaryPath) {
      navigate(mod.primaryPath);
    }
  };

  // Handle subtopic click in Column 2
  const handleSubtopicClick = (path: string) => {
    navigate(path);
    if (isMobile) {
      setMobileDrawerOpen(false);
    }
  };

  // Subtopic active checker
  const isSubtopicActive = (subtopicPath: string) => {
    const currentFull = location.pathname + (location.search || '');
    if (subtopicPath.includes('?')) {
      return currentFull === subtopicPath;
    }
    if (location.search && currentFull.startsWith(subtopicPath + '?')) {
      return false; // Specific query subtopic takes precedence
    }
    if (subtopicPath === '/admin/dashboard' || subtopicPath === '/student/dashboard') {
      return location.pathname === subtopicPath;
    }
    return location.pathname === subtopicPath || location.pathname.startsWith(subtopicPath + '/');
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Compute active breadcrumbs
  const breadcrumbs = useMemo(() => {
    const parts = location.pathname.split('/').filter(Boolean);
    if (parts.length === 0) return [{ label: 'Home', path: '/' }];

    return parts.map((part, index) => {
      const path = '/' + parts.slice(0, index + 1).join('/');
      const label = part.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      return { label, path };
    });
  }, [location.pathname]);

  const studentDisplayName = user?.email
    ? user.email.split('@')[0].replace(/[._-]/g, ' ')
    : 'Student';

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // If login or locked exam attempt mode, render edge-to-edge
  if (isLoginPage || isExamMode) {
    return <Outlet />;
  }

  // Two-column layout elements
  const column1Content = (
    <Box
      sx={{
        width: COLUMN_1_WIDTH,
        height: '100%',
        bgcolor: isStudent ? '#0B132B' : '#0E1726',
        borderRight: isStudent ? '1px solid #14223E' : '1px solid #1E293B',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        flexShrink: 0,
        zIndex: 1200,
      }}
    >
      {/* Brand Header */}
      <Box
        sx={{
          width: '100%',
          height: 68,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderBottom: isStudent ? '1px solid #14223E' : '1px solid #1E293B',
          cursor: 'pointer',
        }}
        onClick={() => navigate(isStudent ? '/student/dashboard' : '/admin/dashboard')}
      >
        <Tooltip title="VET Institute of Arts and Science" placement="right">
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: '10px',
              bgcolor: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              p: 0.6,
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.35)',
              transition: 'transform 0.15s ease',
              '&:hover': { transform: 'scale(1.05)' },
            }}
          >
            <Box
              component="img"
              src="/vetname.png"
              alt="VETIAS"
              sx={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
              }}
            />
          </Box>
        </Tooltip>
      </Box>

      {/* Primary Modules List (Vertical Column 1) */}
      <Box
        sx={{
          flex: 1,
          width: '100%',
          overflowY: 'auto',
          py: 1,
          px: 0.75,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 0.75,
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        }}
      >
        {navModules.map((mod) => {
          const isActive = mod.id === activeModule?.id;

          return (
            <Tooltip
              key={mod.id}
              title={
                <Box sx={{ p: 0.5 }}>
                  <Typography sx={{ fontWeight: 700, fontSize: '0.8rem' }}>{mod.label}</Typography>
                  {mod.category && (
                    <Typography sx={{ fontSize: '0.7rem', color: '#93C5FD' }}>
                      {mod.category}
                    </Typography>
                  )}
                </Box>
              }
              placement="right"
              arrow
            >
              <Box
                onClick={() => handleModuleClick(mod)}
                sx={{
                  width: '100%',
                  minHeight: 56,
                  borderRadius: '10px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  px: 0.5,
                  py: 0.75,
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'all 0.18s ease',
                  bgcolor: isActive
                    ? isStudent
                      ? '#1E6BFF'
                      : '#1765B5'
                    : 'transparent',
                  color: isActive ? '#FFFFFF' : '#94A3B8',
                  boxShadow: isActive
                    ? '0 4px 14px rgba(23, 101, 181, 0.45)'
                    : 'none',
                  '&:hover': {
                    bgcolor: isActive
                      ? isStudent
                        ? '#1D4ED8'
                        : '#104B91'
                      : 'rgba(255, 255, 255, 0.08)',
                    color: '#FFFFFF',
                  },
                }}
              >
                {/* Active Indicator Bar on left edge */}
                {isActive && (
                  <Box
                    sx={{
                      position: 'absolute',
                      left: -5,
                      top: '20%',
                      bottom: '20%',
                      width: 4,
                      borderRadius: '0 4px 4px 0',
                      bgcolor: '#FFFFFF',
                    }}
                  />
                )}

                {/* Module Icon with optional Badge */}
                <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {React.cloneElement(mod.icon, {
                    sx: {
                      fontSize: 22,
                      color: 'inherit',
                    },
                  })}
                  {mod.badge !== undefined && (
                    <Box
                      sx={{
                        position: 'absolute',
                        top: -6,
                        right: -10,
                        minWidth: 16,
                        height: 16,
                        borderRadius: '8px',
                        bgcolor: isActive ? '#FFFFFF' : '#1765B5',
                        color: isActive ? '#1765B5' : '#FFFFFF',
                        fontSize: '0.62rem',
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        px: 0.4,
                        boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                      }}
                    >
                      {mod.badge}
                    </Box>
                  )}
                </Box>

                {/* Short Module Label */}
                <Typography
                  sx={{
                    fontSize: '0.63rem',
                    fontWeight: isActive ? 700 : 500,
                    color: 'inherit',
                    mt: 0.5,
                    textAlign: 'center',
                    lineHeight: 1.15,
                    width: '100%',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {mod.shortLabel}
                </Typography>
              </Box>
            </Tooltip>
          );
        })}
      </Box>

      {/* Column 1 Bottom User Controls */}
      <Box
        sx={{
          width: '100%',
          p: 1,
          borderTop: isStudent ? '1px solid #14223E' : '1px solid #1E293B',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <Tooltip
          title={
            <Box>
              <Typography sx={{ fontWeight: 600, fontSize: '0.75rem' }}>{user?.email}</Typography>
              <Typography sx={{ fontSize: '0.68rem', color: '#94A3B8' }}>
                {isStudent ? 'Candidate' : user?.role === 'SUPER_ADMIN' ? 'Super Administrator' : 'Placement Admin'}
              </Typography>
            </Box>
          }
          placement="right"
        >
          <Avatar
            component={isStudent ? RouterLink : 'div'}
            to={isStudent ? '/student/profile' : undefined}
            sx={{
              width: 34,
              height: 34,
              bgcolor: isStudent ? '#009688' : '#1765B5',
              fontSize: '0.82rem',
              fontWeight: 700,
              color: '#ffffff',
              cursor: isStudent ? 'pointer' : 'default',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.25)',
            }}
          >
            {user?.email?.charAt(0).toUpperCase() || 'U'}
          </Avatar>
        </Tooltip>

        <Tooltip title="Sign Out" placement="right">
          <IconButton
            size="small"
            onClick={handleLogout}
            sx={{
              color: '#94A3B8',
              p: 0.75,
              borderRadius: '8px',
              '&:hover': { color: '#EF4444', bgcolor: 'rgba(239, 68, 68, 0.1)' },
            }}
          >
            <LogoutIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>

        {/* API Connection Indicator */}
        <Tooltip
          title={
            isHealthLoading
              ? 'Connecting to API...'
              : isHealthError
                ? 'System API Offline'
                : 'System Online'
          }
          placement="right"
        >
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor: isHealthLoading ? '#f59e0b' : isHealthError ? '#ef4444' : '#10B981',
              boxShadow: isHealthError ? '0 0 6px #ef4444' : '0 0 6px #10B981',
              mb: 0.5,
            }}
          />
        </Tooltip>
      </Box>
    </Box>
  );

  const column2Content = (
    <Box
      sx={{
        width: COLUMN_2_WIDTH,
        height: '100%',
        bgcolor: '#FFFFFF',
        borderRight: '1px solid #DCE6F5',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        boxShadow: '4px 0 16px rgba(23, 101, 181, 0.03)',
      }}
    >
      {/* Column 2 Header: Active Module Title & Collapse Action */}
      <Box
        sx={{
          minHeight: 68,
          px: 2,
          py: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #EDF2F7',
          bgcolor: '#FAFCFF',
        }}
      >
        <Box sx={{ minWidth: 0, flex: 1, pr: 1 }}>
          <Typography
            sx={{
              fontSize: '0.65rem',
              fontWeight: 800,
              color: '#1765B5',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              lineHeight: 1.2,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {activeModule?.category || 'MODULE'}
          </Typography>
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: 800,
              fontSize: '0.95rem',
              color: '#10223D',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              mt: 0.25,
            }}
          >
            {activeModule?.label}
          </Typography>
        </Box>

        {/* Desktop Collapse Button */}
        {!isMobile && (
          <Tooltip title="Collapse subtopic panel">
            <IconButton
              size="small"
              onClick={() => setSubtopicPanelCollapsed(true)}
              sx={{
                color: '#7182A0',
                p: 0.5,
                borderRadius: '6px',
                border: '1px solid #E2E8F0',
                bgcolor: '#FFFFFF',
                '&:hover': { bgcolor: '#F1F5F9', color: '#1765B5' },
              }}
            >
              <ChevronLeftIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {/* Dedicated Downward List of Subtopics */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          py: 1.5,
          px: 1.25,
        }}
      >
        <Typography
          variant="caption"
          sx={{
            display: 'block',
            px: 1,
            mb: 1,
            color: '#8293B0',
            fontWeight: 700,
            fontSize: '0.68rem',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}
        >
          Navigation Topics ({activeModule?.subtopics?.length || 0})
        </Typography>

        <List dense disablePadding>
          {activeModule?.subtopics?.map((subtopic) => {
            const isActive = isSubtopicActive(subtopic.path);

            return (
              <ListItem key={subtopic.id} disablePadding sx={{ mb: 0.5 }}>
                <Tooltip
                  title={subtopic.description || ''}
                  placement="right"
                  arrow
                  disableHoverListener={!subtopic.description}
                >
                  <ListItemButton
                    onClick={() => handleSubtopicClick(subtopic.path)}
                    sx={{
                      borderRadius: '8px',
                      py: 0.85,
                      px: 1.25,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.25,
                      bgcolor: isActive ? '#EDF4FC' : 'transparent',
                      color: isActive ? '#1765B5' : '#475569',
                      borderLeft: isActive ? '3.5px solid #1765B5' : '3.5px solid transparent',
                      boxShadow: isActive ? '0 1px 4px rgba(23, 101, 181, 0.08)' : 'none',
                      transition: 'all 0.15s ease',
                      '&:hover': {
                        bgcolor: isActive ? '#E2EEFA' : '#F6F9FD',
                        color: isActive ? '#104B91' : '#10223D',
                        '& .subtopic-icon': {
                          color: '#1765B5',
                        },
                      },
                    }}
                  >
                    <ListItemIcon
                      className="subtopic-icon"
                      sx={{
                        minWidth: 22,
                        color: isActive ? '#1765B5' : '#7182A0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'color 0.15s ease',
                      }}
                    >
                      {subtopic.icon || <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'currentColor' }} />}
                    </ListItemIcon>

                    <ListItemText
                      primary={subtopic.label}
                      primaryTypographyProps={{
                        fontSize: '0.8125rem',
                        fontWeight: isActive ? 700 : 500,
                        color: 'inherit',
                        whiteSpace: 'nowrap',
                        textOverflow: 'ellipsis',
                        overflow: 'hidden',
                      }}
                    />

                    {subtopic.badge !== undefined && (
                      <Chip
                        label={subtopic.badge}
                        size="small"
                        color={subtopic.badgeColor || (isActive ? 'primary' : 'default')}
                        sx={{
                          height: 18,
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          borderRadius: '4px',
                          ml: 0.5,
                          px: 0.4,
                          ...(isActive && !subtopic.badgeColor && {
                            bgcolor: '#1765B5',
                            color: '#FFFFFF',
                          }),
                        }}
                      />
                    )}
                  </ListItemButton>
                </Tooltip>
              </ListItem>
            );
          })}
        </List>
      </Box>

      {/* Subtopic Panel Footer Note */}
      <Box
        sx={{
          p: 1.5,
          borderTop: '1px solid #EDF2F7',
          bgcolor: '#FAFCFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Typography variant="caption" sx={{ color: '#8293B0', fontSize: '0.7rem', fontWeight: 600 }}>
          {isStudent ? 'Candidate Workspace' : 'Placement Enterprise'}
        </Typography>
        <Chip
          label="Active"
          size="small"
          sx={{
            height: 18,
            fontSize: '0.62rem',
            fontWeight: 700,
            bgcolor: '#E6F4EA',
            color: '#137333',
            borderRadius: '4px',
          }}
        />
      </Box>
    </Box>
  );

  // Total sidebar width calculation for desktop
  const effectiveSidebarWidth = subtopicPanelCollapsed
    ? COLUMN_1_WIDTH
    : COLUMN_1_WIDTH + COLUMN_2_WIDTH;

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: isStudent ? '#F8F9FB' : '#EDF2FF' }}>
      {/* Desktop Two-Column Sidebar */}
      {!isMobile && (
        <Box
          component="nav"
          sx={{
            width: effectiveSidebarWidth,
            flexShrink: 0,
            transition: 'width 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          <Box
            sx={{
              position: 'fixed',
              top: 0,
              bottom: 0,
              left: 0,
              width: effectiveSidebarWidth,
              zIndex: 1100,
              display: 'flex',
              overflow: 'hidden',
              transition: 'width 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            {/* Column 1: Main Placement Modules */}
            {column1Content}

            {/* Column 2: Dedicated Subtopic Panel */}
            {!subtopicPanelCollapsed && column2Content}
          </Box>
        </Box>
      )}

      {/* Mobile Drawer (Side-by-Side Two-Column Mobile Drawer) */}
      {isMobile && (
        <Drawer
          anchor="left"
          open={mobileDrawerOpen}
          onClose={() => setMobileDrawerOpen(false)}
          PaperProps={{
            sx: {
              width: COLUMN_1_WIDTH + COLUMN_2_WIDTH,
              maxWidth: '92vw',
              display: 'flex',
              flexDirection: 'row',
              overflow: 'hidden',
            },
          }}
        >
          {column1Content}
          {column2Content}
        </Drawer>
      )}

      {/* Main Content Area */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top Header Bar */}
        <Box
          component="header"
          sx={{
            height: 64,
            px: { xs: 2, sm: 3, md: 3.5 },
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            bgcolor: '#ffffff',
            borderBottom: '1px solid #ECEFF2',
            position: 'sticky',
            top: 0,
            zIndex: 1000,
            boxShadow: 'none',
          }}
        >
          {/* Left: Sidebar Toggle & Greeting / Breadcrumbs */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, overflow: 'hidden' }}>
            <Tooltip
              title={
                isMobile
                  ? 'Open Navigation Menu'
                  : subtopicPanelCollapsed
                    ? 'Expand Subtopic Panel'
                    : 'Collapse Subtopic Panel'
              }
            >
              <Box
                onClick={() => {
                  if (isMobile) {
                    setMobileDrawerOpen(true);
                  } else {
                    setSubtopicPanelCollapsed(!subtopicPanelCollapsed);
                  }
                }}
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: '8px',
                  border: '1px solid #E5E7EB',
                  bgcolor: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  flexShrink: 0,
                  transition: 'background-color 0.15s ease',
                  '&:hover': { bgcolor: '#F8FAFC' },
                }}
              >
                {isMobile ? (
                  <MenuIcon sx={{ fontSize: 20, color: '#374151' }} />
                ) : subtopicPanelCollapsed ? (
                  <ChevronRightIcon sx={{ fontSize: 20, color: '#1765B5' }} />
                ) : (
                  <ViewSidebarIcon sx={{ fontSize: 18, color: '#374151' }} />
                )}
              </Box>
            </Tooltip>

            {isStudent ? (
              <Typography
                sx={{
                  fontSize: { xs: '0.95rem', sm: '1.05rem' },
                  color: '#374151',
                  fontWeight: 400,
                  whiteSpace: 'nowrap',
                }}
              >
                {getGreeting()},{' '}
                <Box component="span" sx={{ fontWeight: 700, color: '#111827' }}>
                  {studentDisplayName.toUpperCase()}!
                </Box>
              </Typography>
            ) : (
              <Breadcrumbs
                separator="/"
                sx={{
                  fontSize: '0.825rem',
                  color: '#7182A0',
                  display: { xs: 'none', sm: 'flex' },
                  '& .MuiBreadcrumbs-separator': { mx: 0.75, color: '#D1DEF0' },
                }}
              >
                {breadcrumbs.map((crumb, idx) => {
                  const isLast = idx === breadcrumbs.length - 1;
                  return isLast ? (
                    <Typography
                      key={crumb.path}
                      sx={{ color: '#14264B', fontWeight: 600, fontSize: '0.825rem' }}
                    >
                      {crumb.label}
                    </Typography>
                  ) : (
                    <Link
                      key={crumb.path}
                      component={RouterLink}
                      to={crumb.path}
                      underline="hover"
                      sx={{ color: '#7182A0', fontSize: '0.825rem' }}
                    >
                      {crumb.label}
                    </Link>
                  );
                })}
              </Breadcrumbs>
            )}
          </Box>

          {/* Right Header Controls */}
          {isStudent ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {/* Flame streak badge */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.75,
                  bgcolor: '#FFF0E6',
                  borderRadius: '20px',
                  px: 1.5,
                  py: 0.5,
                  border: '1px solid #FFE4D6',
                }}
              >
                <LocalFireDepartmentIcon sx={{ color: '#FF5722', fontSize: 18 }} />
                <Typography sx={{ color: '#E65100', fontWeight: 700, fontSize: '0.85rem' }}>
                  0
                </Typography>
              </Box>

              {/* Avatar */}
              <Avatar
                component={RouterLink}
                to="/student/profile"
                sx={{
                  width: 36,
                  height: 36,
                  bgcolor: '#009688',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  color: '#FFFFFF',
                  textDecoration: 'none',
                  cursor: 'pointer',
                }}
              >
                {studentDisplayName.charAt(0).toUpperCase() || 'K'}
              </Avatar>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Chip
                label="Academic Drive 2025–26"
                size="small"
                sx={{
                  display: { xs: 'none', md: 'inline-flex' },
                  height: 26,
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  bgcolor: '#F1F5F9',
                  color: '#475569',
                  border: '1px solid #E2E8F0',
                  borderRadius: '6px',
                }}
              />

              <Tooltip title="Placement Platform Connected">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: '#10B981',
                    }}
                  />
                  <Typography
                    variant="caption"
                    sx={{ color: '#059669', fontWeight: 600, display: { xs: 'none', lg: 'inline' } }}
                  >
                    Online
                  </Typography>
                </Box>
              </Tooltip>
            </Box>
          )}
        </Box>

        {/* Page Content Viewport */}
        <Box
          component="main"
          sx={{
            flex: 1,
            p: isStudent ? { xs: 2, sm: 3, md: 4 } : { xs: 2, sm: 2.5, md: 3.5 },
            bgcolor: isStudent ? '#F8F9FB' : '#EDF2FF',
            maxWidth: 1600,
            width: '100%',
            mx: 'auto',
            '& .MuiCard-root': isStudent
              ? {
                  borderRadius: '12px',
                  borderColor: '#F1F3F5',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
                }
              : {
                  borderRadius: '22px',
                  borderColor: '#DCE6F5',
                  boxShadow: '0 12px 30px rgba(44, 91, 156, 0.06)',
                },
          }}
        >
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
};
