import React, { useState, useMemo, useEffect } from 'react';
import { Outlet, Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
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
  BottomNavigation,
  BottomNavigationAction,
  Collapse,
  Button,
  Paper,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
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
import ViewSidebarIcon from '@mui/icons-material/ViewSidebar';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';

import { useHealthCheck } from '../hooks/useHealthCheck.js';
import { useAuth } from '../hooks/useAuth.js';
import { assessmentService } from '../services/assessment.service.js';
import { questionService } from '../services/question.service.js';
import { attemptService } from '../services/attempt.service.js';
import { NotificationBell } from '../components/common/NotificationBell.js';

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

export const RootLayout: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { isLoading: isHealthLoading, isError: isHealthError } = useHealthCheck();
  const { user, isAuthenticated, logout } = useAuth();
  const isStudent = user?.role === 'STUDENT';
  const navigate = useNavigate();
  const location = useLocation();

  // Student streak query
  const { data: attendanceStreak, isError: isAttendanceStreakError } = useQuery({
    queryKey: ['studentAttendanceStreak', user?.student?.id],
    queryFn: () => attemptService.getStudentAttendanceStreak(),
    enabled: isAuthenticated && isStudent,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  // Floating Submenu Overlay State
  const [floatingMenuOpen, setFloatingMenuOpen] = useState(false);
  const [floatingModuleId, setFloatingModuleId] = useState<string | null>(null);
  const [floatingMenuTop, setFloatingMenuTop] = useState<number>(80);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [mobileExpandedModules, setMobileExpandedModules] = useState<Record<string, boolean>>({});

  const isExamMode = location.pathname.startsWith('/student/attempt/');
  const isLoginPage = location.pathname === '/login';

  const currentBottomNavIndex = useMemo(() => {
    const path = location.pathname;
    if (isStudent) {
      if (path === '/student/dashboard') return 0;
      if (path.startsWith('/student/drives')) return 1;
      if (path.startsWith('/student/tests')) return 2;
      if (path.startsWith('/student/results')) return 3;
      return -1;
    } else {
      if (path === '/admin/dashboard') return 0;
      if (path.startsWith('/admin/placement-drives')) return 1;
      if (path.startsWith('/admin/students')) return 2;
      if (path.startsWith('/admin/results')) return 3;
      return -1;
    }
  }, [location.pathname, isStudent]);

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
    enabled: isAuthenticated && (user?.role === 'PLACEMENT_ADMIN' || user?.role === 'SUPER_ADMIN'),
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
    enabled: isAuthenticated && (user?.role === 'PLACEMENT_ADMIN' || user?.role === 'SUPER_ADMIN'),
  });

  // Navigation Modules structured for Main Rail + Floating Overlay
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
            },
            {
              id: 'overview-analytics',
              label: 'Placement Analytics',
              path: '/admin/analytics',
              icon: <BarChartIcon sx={{ fontSize: 18 }} />,
            },
            {
              id: 'overview-reports',
              label: 'Audit Reports',
              path: '/admin/reports',
              icon: <DescriptionIcon sx={{ fontSize: 18 }} />,
            },
            {
              id: 'overview-attendance',
              label: 'Attendance Oversight',
              path: '/admin/attendance',
              icon: <HowToRegIcon sx={{ fontSize: 18 }} />,
            },
          ],
        },
        {
          id: 'assessments',
          label: 'Assessments',
          shortLabel: 'Assessments',
          category: 'EVALUATION ENGINE',
          primaryPath: '/admin/assessments',
          icon: <AssignmentIcon fontSize="small" />,
          badge: totalAsmts > 0 ? String(totalAsmts) : undefined,
          badgeColor: 'primary',
          subtopics: [
            {
              id: 'assessments-create',
              label: 'Create Assessment',
              path: '/admin/assessments/create',
              icon: <AddCircleOutlineIcon sx={{ fontSize: 18 }} />,
              badge: 'New',
              badgeColor: 'success',
            },
            {
              id: 'assessments-manage',
              label: 'Manage Assessments',
              path: '/admin/assessments',
              icon: <FactCheckIcon sx={{ fontSize: 18 }} />,
              badge: totalAsmts > 0 ? totalAsmts : undefined,
            },
            {
              id: 'assessments-upcoming',
              label: 'Upcoming Assessments',
              path: '/admin/assessments?status=SCHEDULED',
              icon: <CalendarMonthIcon sx={{ fontSize: 18 }} />,
              badge: schedAsmts > 0 ? schedAsmts : undefined,
            },
            {
              id: 'assessments-ongoing',
              label: 'Ongoing Assessments',
              path: '/admin/assessments?status=PUBLISHED',
              icon: <LocalFireDepartmentIcon sx={{ fontSize: 18 }} />,
              badge: pubAsmts > 0 ? pubAsmts : undefined,
            },
            {
              id: 'assessments-completed',
              label: 'Completed Assessments',
              path: '/admin/assessments?status=ARCHIVED',
              icon: <CheckCircleOutlineIcon sx={{ fontSize: 18 }} />,
            },
            {
              id: 'assessments-cancelled',
              label: 'Cancelled / Drafts',
              path: '/admin/assessments?status=DRAFT',
              icon: <EditNoteIcon sx={{ fontSize: 18 }} />,
              badge: draftAsmts > 0 ? draftAsmts : undefined,
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
            },
            {
              id: 'questions-quant',
              label: 'Quantitative Aptitude',
              path: '/admin/questions?category=QUANTITATIVE_APTITUDE',
              icon: <CalculateIcon sx={{ fontSize: 18 }} />,
            },
            {
              id: 'questions-logical',
              label: 'Logical Reasoning',
              path: '/admin/questions?category=LOGICAL_REASONING',
              icon: <PsychologyIcon sx={{ fontSize: 18 }} />,
            },
            {
              id: 'questions-verbal',
              label: 'Verbal Ability',
              path: '/admin/questions?category=VERBAL_ABILITY',
              icon: <SpellcheckIcon sx={{ fontSize: 18 }} />,
            },
            {
              id: 'questions-tech',
              label: 'Technical MCQs',
              path: '/admin/questions?category=TECHNICAL_MCQ',
              icon: <CodeIcon sx={{ fontSize: 18 }} />,
            },
            {
              id: 'questions-coding',
              label: 'Coding Challenges',
              path: '/admin/questions?category=CODING',
              icon: <TerminalIcon sx={{ fontSize: 18 }} />,
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
              label: 'All Students',
              path: '/admin/students',
              icon: <PeopleAltIcon sx={{ fontSize: 18 }} />,
            },
            {
              id: 'students-departments',
              label: 'Academic Departments',
              path: '/admin/departments',
              icon: <AccountBalanceIcon sx={{ fontSize: 18 }} />,
            },
            {
              id: 'students-courses',
              label: 'Degree Courses',
              path: '/admin/courses',
              icon: <SchoolIcon sx={{ fontSize: 18 }} />,
            },
            {
              id: 'students-classes',
              label: 'Classes & Years',
              path: '/admin/classes',
              icon: <CalendarMonthIcon sx={{ fontSize: 18 }} />,
            },
            {
              id: 'students-sections',
              label: 'Class Sections',
              path: '/admin/sections',
              icon: <GroupsIcon sx={{ fontSize: 18 }} />,
            },
            {
              id: 'students-college',
              label: 'College Profile',
              path: '/admin/college',
              icon: <BusinessIcon sx={{ fontSize: 18 }} />,
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
            },
            {
              id: 'drives-upcoming',
              label: 'Upcoming Drives',
              path: '/admin/placement-drives?status=UPCOMING',
              icon: <CalendarMonthIcon sx={{ fontSize: 18 }} />,
              badge: 'Scheduled',
            },
            {
              id: 'drives-ongoing',
              label: 'Ongoing Drives',
              path: '/admin/placement-drives?status=ONGOING',
              icon: <LocalFireDepartmentIcon sx={{ fontSize: 18 }} />,
              badge: 'Live',
            },
            {
              id: 'drives-completed',
              label: 'Completed Drives',
              path: '/admin/placement-drives?status=COMPLETED',
              icon: <CheckCircleOutlineIcon sx={{ fontSize: 18 }} />,
            },
            {
              id: 'drives-companies',
              label: 'Partner Companies',
              path: '/admin/companies',
              icon: <BusinessIcon sx={{ fontSize: 18 }} />,
            },
          ],
        },
        {
          id: 'chat',
          label: 'Campus Chat',
          shortLabel: 'Chat',
          category: 'COMMUNICATION & GROUPS',
          primaryPath: '/chat',
          icon: <ChatBubbleOutlineIcon fontSize="small" />,
          subtopics: [
            {
              id: 'chat-all',
              label: 'All Conversations',
              path: '/chat',
              icon: <ChatBubbleOutlineIcon sx={{ fontSize: 18 }} />,
            },
            {
              id: 'chat-departments',
              label: 'Department Groups',
              path: '/chat?filter=DEPARTMENT',
              icon: <SchoolIcon sx={{ fontSize: 18 }} />,
            },
            {
              id: 'chat-drives',
              label: 'Placement Channels',
              path: '/chat?filter=PLACEMENT_DRIVE',
              icon: <WorkIcon sx={{ fontSize: 18 }} />,
            },
            {
              id: 'chat-custom',
              label: 'Custom Channels',
              path: '/chat?filter=CUSTOM',
              icon: <GroupsIcon sx={{ fontSize: 18 }} />,
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
            },
            {
              id: 'gd-scheduled',
              label: 'Scheduled GDs',
              path: '/admin/gd?status=SCHEDULED',
              icon: <CalendarMonthIcon sx={{ fontSize: 18 }} />,
              badge: 'Upcoming',
            },
            {
              id: 'gd-in-progress',
              label: 'Live Evaluation Sheet',
              path: '/admin/gd?status=IN_PROGRESS',
              icon: <RateReviewIcon sx={{ fontSize: 18 }} />,
              badge: 'Live',
            },
            {
              id: 'gd-completed',
              label: 'Completed GD Rounds',
              path: '/admin/gd?status=COMPLETED',
              icon: <CheckCircleOutlineIcon sx={{ fontSize: 18 }} />,
            },
            {
              id: 'gd-results',
              label: 'GD Scores & Merit',
              path: '/admin/results',
              icon: <FactCheckIcon sx={{ fontSize: 18 }} />,
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
            },
            {
              id: 'tech-all-rounds',
              label: 'All Interview Rounds',
              path: '/admin/interviews',
              icon: <WorkOutlineIcon sx={{ fontSize: 18 }} />,
            },
            {
              id: 'tech-attendance',
              label: 'Candidate Attendance',
              path: '/admin/attendance',
              icon: <HowToRegIcon sx={{ fontSize: 18 }} />,
            },
            {
              id: 'tech-results',
              label: 'Evaluation Results',
              path: '/admin/results',
              icon: <FactCheckIcon sx={{ fontSize: 18 }} />,
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
            },
            {
              id: 'hr-all-rounds',
              label: 'All Interview Schedules',
              path: '/admin/interviews',
              icon: <WorkOutlineIcon sx={{ fontSize: 18 }} />,
            },
            {
              id: 'hr-attendance',
              label: 'Candidate Attendance',
              path: '/admin/attendance',
              icon: <HowToRegIcon sx={{ fontSize: 18 }} />,
            },
            {
              id: 'hr-offers',
              label: 'Final Shortlists & Offers',
              path: '/admin/results',
              icon: <FactCheckIcon sx={{ fontSize: 18 }} />,
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
            },
            {
              id: 'mock-questions',
              label: 'Question Bank Prep',
              path: '/admin/questions',
              icon: <QuizIcon sx={{ fontSize: 18 }} />,
            },
            {
              id: 'mock-analytics',
              label: 'Readiness Analytics',
              path: '/admin/analytics',
              icon: <BarChartIcon sx={{ fontSize: 18 }} />,
            },
            {
              id: 'mock-reports',
              label: 'Diagnostic Feedback',
              path: '/admin/reports',
              icon: <DescriptionIcon sx={{ fontSize: 18 }} />,
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
            },
            {
              id: 'scoring-attendance',
              label: 'Attendance Records',
              path: '/admin/attendance',
              icon: <HowToRegIcon sx={{ fontSize: 18 }} />,
            },
            {
              id: 'scoring-performance',
              label: 'Performance Analysis',
              path: '/admin/analytics',
              icon: <BarChartIcon sx={{ fontSize: 18 }} />,
            },
            {
              id: 'scoring-exports',
              label: 'Audit & Export Sheets',
              path: '/admin/reports',
              icon: <DescriptionIcon sx={{ fontSize: 18 }} />,
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
            },
            {
              id: 'st-profile',
              label: 'My Profile',
              path: '/student/profile',
              icon: <PersonOutlineIcon sx={{ fontSize: 18 }} />,
            },
          ],
        },
        {
          id: 'student-drives',
          label: 'Campus Drives',
          shortLabel: 'Drives',
          category: 'PLACEMENTS',
          primaryPath: '/student/drives',
          icon: <WorkIcon fontSize="small" />,
          subtopics: [
            {
              id: 'st-drives-all',
              label: 'All Campus Drives',
              path: '/student/drives',
              icon: <WorkIcon sx={{ fontSize: 18 }} />,
            },
            {
              id: 'st-drives-eligible',
              label: 'Eligible For Me',
              path: '/student/drives?tab=eligible',
              icon: <CheckCircleOutlineIcon sx={{ fontSize: 18 }} />,
            },
            {
              id: 'st-drives-applied',
              label: 'My Applications',
              path: '/student/drives?tab=applied',
              icon: <HowToRegIcon sx={{ fontSize: 18 }} />,
            },
          ],
        },
        {
          id: 'student-chat',
          label: 'Campus Chat',
          shortLabel: 'Chat',
          category: 'COMMUNICATION & GROUPS',
          primaryPath: '/chat',
          icon: <ChatBubbleOutlineIcon fontSize="small" />,
          subtopics: [
            {
              id: 'st-chat-all',
              label: 'All Conversations',
              path: '/chat',
              icon: <ChatBubbleOutlineIcon sx={{ fontSize: 18 }} />,
            },
            {
              id: 'st-chat-departments',
              label: 'Department Groups',
              path: '/chat?filter=DEPARTMENT',
              icon: <SchoolIcon sx={{ fontSize: 18 }} />,
            },
            {
              id: 'st-chat-drives',
              label: 'Placement Channels',
              path: '/chat?filter=PLACEMENT_DRIVE',
              icon: <WorkIcon sx={{ fontSize: 18 }} />,
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
              icon: <QuizIcon sx={{ fontSize: 18 }} />,
            },
            {
              id: 'st-tests-results',
              label: 'Test Results & Scorecards',
              path: '/student/results',
              icon: <FactCheckIcon sx={{ fontSize: 18 }} />,
            },
          ],
        },
        {
          id: 'student-gd-interviews',
          label: 'GD & Interviews',
          shortLabel: 'Interviews',
          category: 'RECRUITMENT ROUNDS',
          primaryPath: '/student/gd',
          icon: <GroupsIcon fontSize="small" />,
          subtopics: [
            {
              id: 'st-gd',
              label: 'GD Rounds',
              path: '/student/gd',
              icon: <GroupsIcon sx={{ fontSize: 18 }} />,
            },
            {
              id: 'st-interviews',
              label: 'Interview Schedules',
              path: '/student/interviews',
              icon: <WorkOutlineIcon sx={{ fontSize: 18 }} />,
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
            },
            {
              id: 'st-analytics-results',
              label: 'Results & Records',
              path: '/student/results',
              icon: <FactCheckIcon sx={{ fontSize: 18 }} />,
            },
            {
              id: 'st-analytics-reports',
              label: 'Diagnostic Reports',
              path: '/student/reports',
              icon: <DescriptionIcon sx={{ fontSize: 18 }} />,
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
            },
            {
              id: 'st-settings-password',
              label: 'Change Password',
              path: '/student/change-password',
              icon: <CheckCircleOutlineIcon sx={{ fontSize: 18 }} />,
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

    // 4. Prefix match on pathname
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

  // Close floating menu on route change
  useEffect(() => {
    setFloatingMenuOpen(false);
  }, [location.pathname, location.search]);

  // Dismiss floating menu on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setFloatingMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Currently active module for floating menu overlay
  const activeFloatingModule = useMemo(() => {
    return navModules.find((m) => m.id === floatingModuleId) || null;
  }, [navModules, floatingModuleId]);

  // Handle module click in Main Rail (Column 1)
  const handleModuleClick = (mod: NavigationModule, event: React.MouseEvent<HTMLElement>) => {
    // If clicking the module that already has floating menu open, toggle it closed
    if (floatingMenuOpen && floatingModuleId === mod.id) {
      setFloatingMenuOpen(false);
      return;
    }

    // If module has subtopics, position and open floating submenu directly adjacent to clicked item
    if (mod.subtopics && mod.subtopics.length > 0) {
      const rect = event.currentTarget.getBoundingClientRect();
      setFloatingMenuTop(rect.top);
      setFloatingModuleId(mod.id);
      setFloatingMenuOpen(true);
    } else if (mod.primaryPath) {
      setFloatingMenuOpen(false);
      navigate(mod.primaryPath);
    }
  };

  // Handle direct navigation on subtopic click
  const handleSubtopicClick = (path: string) => {
    navigate(path);
    setFloatingMenuOpen(false);
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

  // Dark Navy Main Sidebar Content (Column 1 Rail - 80px)
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
        onClick={() => {
          setFloatingMenuOpen(false);
          navigate(isStudent ? '/student/dashboard' : '/admin/dashboard');
        }}
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

      {/* Primary Modules List (Vertical Rail) */}
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
          const isRouteActive = mod.id === activeRouteInfo.moduleId;
          const isMenuOpenForMod = floatingMenuOpen && floatingModuleId === mod.id;
          const isActive = isMenuOpenForMod || isRouteActive;

          return (
            <Tooltip
              key={mod.id}
              title={
                <Box sx={{ p: 0.5 }}>
                  <Typography sx={{ fontWeight: 700, fontSize: '0.8rem' }}>{mod.label}</Typography>
                  {mod.category && (
                    <Typography sx={{ fontSize: '0.7rem', color: '#5EEAD4' }}>
                      {mod.category}
                    </Typography>
                  )}
                </Box>
              }
              placement="right"
              arrow
            >
              <Box
                onClick={(e) => handleModuleClick(mod, e)}
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
                    ? '#0D9488'
                    : 'transparent',
                  color: isActive ? '#FFFFFF' : '#94A3B8',
                  boxShadow: isActive
                    ? '0 4px 14px rgba(13, 148, 136, 0.45)'
                    : 'none',
                  '&:hover': {
                    bgcolor: isActive
                      ? '#0F766E'
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
                      bgcolor: '#2DD4BF',
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
                        bgcolor: isActive ? '#FFFFFF' : '#0D9488',
                        color: isActive ? '#0D9488' : '#FFFFFF',
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
              bgcolor: '#0D9488',
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

        {/* API Connection Dot */}
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

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: isStudent ? '#F8F9FB' : '#EDF2FF' }}>
      {/* Desktop Main Sidebar (Column 1 Rail - 80px) */}
      {!isMobile && (
        <Box
          component="nav"
          sx={{
            width: COLUMN_1_WIDTH,
            flexShrink: 0,
          }}
        >
          <Box
            sx={{
              position: 'fixed',
              top: 0,
              bottom: 0,
              left: 0,
              width: COLUMN_1_WIDTH,
              zIndex: 1200,
              display: 'flex',
              overflow: 'hidden',
            }}
          >
            {column1Content}
          </Box>
        </Box>
      )}

      {/* Mobile Drawer */}
      {isMobile && (
        <Drawer
          anchor="left"
          open={mobileDrawerOpen}
          onClose={() => {
            setMobileDrawerOpen(false);
            setFloatingMenuOpen(false);
          }}
          PaperProps={{
            sx: {
              width: { xs: 290, sm: 320 },
              bgcolor: isStudent ? '#0B132B' : '#0E1726',
              color: '#FFFFFF',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '4px 0 24px rgba(0,0,0,0.4)',
            },
          }}
        >
          {/* Mobile Drawer Header */}
          <Box
            sx={{
              p: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: isStudent ? '1px solid #14223E' : '1px solid #1E293B',
            }}
          >
            <Box
              sx={{ display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer' }}
              onClick={() => {
                setMobileDrawerOpen(false);
                navigate(isStudent ? '/student/dashboard' : '/admin/dashboard');
              }}
            >
              <Box
                sx={{
                  width: 38,
                  height: 38,
                  borderRadius: '8px',
                  bgcolor: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  p: 0.5,
                }}
              >
                <Box
                  component="img"
                  src="/vetname.png"
                  alt="VETIAS"
                  sx={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              </Box>
              <Box>
                <Typography sx={{ fontWeight: 800, fontSize: '0.88rem', color: '#FFFFFF', lineHeight: 1.2 }}>
                  VETIAS Placements
                </Typography>
                <Typography sx={{ fontSize: '0.68rem', color: '#94A3B8' }}>
                  {isStudent ? 'Candidate Portal' : 'Administration Portal'}
                </Typography>
              </Box>
            </Box>

            <IconButton
              size="small"
              onClick={() => setMobileDrawerOpen(false)}
              sx={{ color: '#94A3B8', '&:hover': { color: '#FFFFFF' } }}
            >
              <CloseIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Box>

          {/* User Profile Card in Drawer */}
          <Box
            sx={{
              mx: 1.75,
              my: 1.5,
              p: 1.5,
              borderRadius: '10px',
              bgcolor: isStudent ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.04)',
              border: isStudent ? '1px solid #14223E' : '1px solid #1E293B',
              display: 'flex',
              alignItems: 'center',
              gap: 1.25,
            }}
          >
            <Avatar
              sx={{
                width: 36,
                height: 36,
                bgcolor: '#0D9488',
                fontWeight: 700,
                fontSize: '0.85rem',
                color: '#FFFFFF',
              }}
            >
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </Avatar>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography
                sx={{
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  color: '#FFFFFF',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {isStudent ? studentDisplayName : user?.email || 'User'}
              </Typography>
              <Chip
                label={isStudent ? 'Student' : user?.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Placement Admin'}
                size="small"
                sx={{
                  height: 18,
                  fontSize: '0.62rem',
                  fontWeight: 700,
                  bgcolor: '#0D9488',
                  color: '#FFFFFF',
                  mt: 0.3,
                }}
              />
            </Box>
          </Box>

          {/* Navigation Items (Scrollable) */}
          <Box
            sx={{
              flex: 1,
              overflowY: 'auto',
              px: 1.25,
              py: 0.5,
              scrollbarWidth: 'thin',
              scrollbarColor: '#334155 transparent',
            }}
          >
            <List dense disablePadding>
              {navModules.map((mod) => {
                const isRouteActive = mod.id === activeRouteInfo.moduleId;
                const isExpanded = !!mobileExpandedModules[mod.id] || isRouteActive;

                return (
                  <Box key={mod.id} sx={{ mb: 0.75 }}>
                    <ListItemButton
                      onClick={() => {
                        if (mod.subtopics && mod.subtopics.length > 0) {
                          setMobileExpandedModules((prev) => ({
                            ...prev,
                            [mod.id]: !prev[mod.id],
                          }));
                        } else {
                          navigate(mod.primaryPath);
                          setMobileDrawerOpen(false);
                        }
                      }}
                      sx={{
                        borderRadius: '8px',
                        py: 0.9,
                        px: 1.5,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        bgcolor: isRouteActive ? 'rgba(13, 148, 136, 0.15)' : 'transparent',
                        color: isRouteActive ? '#2DD4BF' : '#CBD5E1',
                        borderLeft: isRouteActive ? '3.5px solid #0D9488' : '3.5px solid transparent',
                        '&:hover': {
                          bgcolor: 'rgba(255, 255, 255, 0.08)',
                          color: '#FFFFFF',
                        },
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
                        <ListItemIcon
                          sx={{
                            minWidth: 24,
                            color: isRouteActive ? '#2DD4BF' : '#94A3B8',
                          }}
                        >
                          {mod.icon}
                        </ListItemIcon>
                        <ListItemText
                          primary={mod.label}
                          primaryTypographyProps={{
                            fontSize: '0.84rem',
                            fontWeight: isRouteActive ? 700 : 500,
                            color: 'inherit',
                            noWrap: true,
                          }}
                        />
                      </Box>

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        {mod.badge !== undefined && (
                          <Chip
                            label={mod.badge}
                            size="small"
                            sx={{
                              height: 18,
                              fontSize: '0.64rem',
                              fontWeight: 700,
                              bgcolor: '#0D9488',
                              color: '#FFFFFF',
                            }}
                          />
                        )}
                        {mod.subtopics && mod.subtopics.length > 0 && (
                          isExpanded ? <ExpandLess sx={{ fontSize: 18, color: '#94A3B8' }} /> : <ExpandMore sx={{ fontSize: 18, color: '#94A3B8' }} />
                        )}
                      </Box>
                    </ListItemButton>

                    {/* Subtopics Collapse */}
                    {mod.subtopics && mod.subtopics.length > 0 && (
                      <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                        <List dense disablePadding sx={{ pl: 2, pt: 0.25 }}>
                          {mod.subtopics.map((subtopic) => {
                            const isSubActive = isSubtopicActive(subtopic.path);

                            return (
                              <ListItemButton
                                key={subtopic.id}
                                onClick={() => {
                                  navigate(subtopic.path);
                                  setMobileDrawerOpen(false);
                                }}
                                sx={{
                                  borderRadius: '6px',
                                  py: 0.7,
                                  px: 1.25,
                                  my: 0.25,
                                  bgcolor: isSubActive ? '#0D9488' : 'transparent',
                                  color: isSubActive ? '#FFFFFF' : '#94A3B8',
                                  '&:hover': {
                                    bgcolor: isSubActive ? '#0D9488' : 'rgba(255, 255, 255, 0.05)',
                                    color: '#FFFFFF',
                                  },
                                }}
                              >
                                <ListItemIcon
                                  sx={{
                                    minWidth: 20,
                                    color: isSubActive ? '#FFFFFF' : '#64748B',
                                    fontSize: 16,
                                  }}
                                >
                                  {subtopic.icon || <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: 'currentColor' }} />}
                                </ListItemIcon>
                                <ListItemText
                                  primary={subtopic.label}
                                  primaryTypographyProps={{
                                    fontSize: '0.78rem',
                                    fontWeight: isSubActive ? 700 : 400,
                                    color: 'inherit',
                                    noWrap: true,
                                  }}
                                />
                                {subtopic.badge !== undefined && (
                                  <Chip
                                    label={subtopic.badge}
                                    size="small"
                                    sx={{
                                      height: 16,
                                      fontSize: '0.6rem',
                                      fontWeight: 700,
                                      bgcolor: isSubActive ? '#FFFFFF' : '#334155',
                                      color: isSubActive ? '#0D9488' : '#CBD5E1',
                                    }}
                                  />
                                )}
                              </ListItemButton>
                            );
                          })}
                        </List>
                      </Collapse>
                    )}
                  </Box>
                );
              })}
            </List>
          </Box>

          {/* Drawer Footer */}
          <Box
            sx={{
              p: 1.75,
              borderTop: isStudent ? '1px solid #14223E' : '1px solid #1E293B',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Button
              variant="outlined"
              size="small"
              startIcon={<LogoutIcon sx={{ fontSize: 16 }} />}
              onClick={() => {
                setMobileDrawerOpen(false);
                handleLogout();
              }}
              sx={{
                color: '#EF4444',
                borderColor: 'rgba(239, 68, 68, 0.3)',
                fontSize: '0.75rem',
                textTransform: 'none',
                fontWeight: 600,
                borderRadius: '8px',
                '&:hover': {
                  borderColor: '#EF4444',
                  bgcolor: 'rgba(239, 68, 68, 0.1)',
                },
              }}
            >
              Sign Out
            </Button>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: isHealthError ? '#EF4444' : '#10B981',
                }}
              />
              <Typography sx={{ fontSize: '0.7rem', color: '#94A3B8' }}>
                {isHealthError ? 'Offline' : 'Online'}
              </Typography>
            </Box>
          </Box>
        </Drawer>
      )}

      {/* Floating Submenu Overlay & Backdrop */}
      {floatingMenuOpen && activeFloatingModule && (
        <>
          {/* Subtle dim overlay behind the floating panel */}
          <Box
            onClick={() => setFloatingMenuOpen(false)}
            sx={{
              position: 'fixed',
              top: 0,
              left: isMobile ? 0 : COLUMN_1_WIDTH,
              right: 0,
              bottom: 0,
              bgcolor: 'rgba(15, 23, 42, 0.28)',
              backdropFilter: 'blur(1.5px)',
              zIndex: 1250,
              animation: 'fadeInBackdrop 0.15s ease-out',
              '@keyframes fadeInBackdrop': {
                from: { opacity: 0 },
                to: { opacity: 1 },
              },
            }}
          />

          {/* Compact Floating White Panel positioned directly adjacent to clicked item */}
          <Box
            sx={{
              position: 'fixed',
              left: isMobile ? 86 : COLUMN_1_WIDTH + 6,
              top: Math.max(12, Math.min(floatingMenuTop - 8, typeof window !== 'undefined' ? window.innerHeight - 380 : 80)),
              width: 256,
              maxHeight: 'calc(100vh - 24px)',
              bgcolor: '#FFFFFF',
              borderRadius: '14px',
              border: '1px solid #E2E8F0',
              boxShadow: '0 20px 35px -8px rgba(15, 23, 42, 0.18), 0 8px 16px -4px rgba(15, 23, 42, 0.08)',
              zIndex: 1300,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              animation: 'popInSubmenu 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
              '@keyframes popInSubmenu': {
                from: { opacity: 0, transform: 'translateX(-10px) scale(0.97)' },
                to: { opacity: 1, transform: 'translateX(0) scale(1)' },
              },
            }}
          >
            {/* Submenu Header */}
            <Box
              sx={{
                px: 2,
                py: 1.25,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid #F1F5F9',
                bgcolor: '#FAFBFC',
              }}
            >
              <Box sx={{ minWidth: 0, flex: 1, pr: 1 }}>
                <Typography
                  sx={{
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    color: '#0F172A',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {activeFloatingModule.label}
                </Typography>
                <Typography
                  sx={{
                    fontSize: '0.66rem',
                    fontWeight: 700,
                    color: '#0D9488',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    mt: 0.1,
                  }}
                >
                  {activeFloatingModule.category || 'Navigation'}
                </Typography>
              </Box>

              <IconButton
                size="small"
                onClick={() => setFloatingMenuOpen(false)}
                sx={{
                  p: 0.5,
                  color: '#64748B',
                  borderRadius: '6px',
                  border: '1px solid transparent',
                  '&:hover': {
                    bgcolor: '#F1F5F9',
                    color: '#0F172A',
                    borderColor: '#E2E8F0',
                  },
                }}
              >
                <CloseIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Box>

            {/* Vertically Stacked Subtopics List */}
            <Box
              sx={{
                p: 1,
                overflowY: 'auto',
                maxHeight: 'calc(100vh - 120px)',
                scrollbarWidth: 'thin',
                scrollbarColor: '#CBD5E1 transparent',
                '&::-webkit-scrollbar': { width: 5 },
                '&::-webkit-scrollbar-thumb': { bgcolor: '#CBD5E1', borderRadius: 4 },
              }}
            >
              <List dense disablePadding>
                {activeFloatingModule.subtopics.map((subtopic) => {
                  const isActive = isSubtopicActive(subtopic.path);

                  return (
                    <ListItem key={subtopic.id} disablePadding sx={{ mb: 0.5 }}>
                      <ListItemButton
                        onClick={() => handleSubtopicClick(subtopic.path)}
                        sx={{
                          borderRadius: '8px',
                          py: 0.85,
                          px: 1.25,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1.25,
                          bgcolor: isActive ? '#F0FDFA' : 'transparent',
                          color: isActive ? '#0D9488' : '#334155',
                          border: isActive ? '1px solid #CCFBF1' : '1px solid transparent',
                          borderLeft: isActive ? '3.5px solid #0D9488' : '3.5px solid transparent',
                          boxShadow: isActive ? '0 1px 3px rgba(13, 148, 136, 0.12)' : 'none',
                          transition: 'all 0.15s ease',
                          '&:hover': {
                            bgcolor: isActive ? '#CCFBF1' : '#F8FAFC',
                            color: isActive ? '#0F766E' : '#0F172A',
                            '& .subtopic-icon': {
                              color: '#0D9488',
                            },
                          },
                        }}
                      >
                        <ListItemIcon
                          className="subtopic-icon"
                          sx={{
                            minWidth: 20,
                            color: isActive ? '#0D9488' : '#64748B',
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
                            fontWeight: isActive ? 600 : 500,
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
                            sx={{
                              height: 18,
                              fontSize: '0.64rem',
                              fontWeight: 700,
                              borderRadius: '4px',
                              ml: 0.5,
                              px: 0.4,
                              bgcolor: isActive ? '#0D9488' : '#F1F5F9',
                              color: isActive ? '#FFFFFF' : '#475569',
                            }}
                          />
                        )}
                      </ListItemButton>
                    </ListItem>
                  );
                })}
              </List>
            </Box>
          </Box>
        </>
      )}

      {/* Main Content Area */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          ml: { xs: 0, md: `${COLUMN_1_WIDTH}px` },
          width: { xs: '100%', md: `calc(100% - ${COLUMN_1_WIDTH}px)` },
        }}
      >
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
          {/* Left: Mobile Menu Toggle / Breadcrumbs */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, overflow: 'hidden' }}>
            <Tooltip
              title={
                isMobile
                  ? 'Open Navigation Menu'
                  : floatingMenuOpen
                    ? 'Close Navigation Submenu'
                    : 'Open Navigation Submenu'
              }
            >
              <Box
                onClick={() => {
                  if (isMobile) {
                    setMobileDrawerOpen(true);
                  } else {
                    if (floatingMenuOpen) {
                      setFloatingMenuOpen(false);
                    } else {
                      const mod = navModules.find((m) => m.id === activeRouteInfo.moduleId) || navModules[0];
                      if (mod) {
                        setFloatingModuleId(mod.id);
                        setFloatingMenuTop(70);
                        setFloatingMenuOpen(true);
                      }
                    }
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
                ) : (
                  <ViewSidebarIcon sx={{ fontSize: 18, color: floatingMenuOpen ? '#0D9488' : '#374151' }} />
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
                  {studentDisplayName}!
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
              <Tooltip
                title={
                  isAttendanceStreakError
                    ? 'Could not load your attendance streak'
                    : 'Consecutive days you have started an assessment'
                }
              >
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
                    {isAttendanceStreakError ? '—' : attendanceStreak ?? 0}
                  </Typography>
                </Box>
              </Tooltip>

              <NotificationBell isStudent={isStudent} />

              <Avatar
                component={RouterLink}
                to="/student/profile"
                sx={{
                  width: 36,
                  height: 36,
                  bgcolor: '#0D9488',
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
            p: isStudent ? { xs: 1.5, sm: 2.5, md: 4 } : { xs: 1.5, sm: 2.5, md: 3.5 },
            pb: isStudent ? { xs: 9.5, sm: 9.5, md: 4 } : { xs: 9.5, sm: 9.5, md: 3.5 },
            bgcolor: isStudent ? '#F8F9FB' : '#EDF2FF',
            maxWidth: 1600,
            width: '100%',
            mx: 'auto',
            overflowX: 'hidden',
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

      {/* Mobile Bottom Navigation Bar */}
      {isMobile && !isLoginPage && !isExamMode && (
        <Paper
          elevation={8}
          sx={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 1200,
            borderTop: '1px solid #E2E8F0',
            bgcolor: '#FFFFFF',
            boxShadow: '0 -4px 16px rgba(0, 0, 0, 0.08)',
          }}
        >
          <BottomNavigation
            value={currentBottomNavIndex}
            onChange={(_event, newValue) => {
              if (newValue === 4) {
                setMobileDrawerOpen(true);
              } else if (isStudent) {
                if (newValue === 0) navigate('/student/dashboard');
                else if (newValue === 1) navigate('/student/drives');
                else if (newValue === 2) navigate('/student/tests');
                else if (newValue === 3) navigate('/student/results');
              } else {
                if (newValue === 0) navigate('/admin/dashboard');
                else if (newValue === 1) navigate('/admin/placement-drives');
                else if (newValue === 2) navigate('/admin/students');
                else if (newValue === 3) navigate('/admin/results');
              }
            }}
            showLabels
            sx={{
              height: 58,
              bgcolor: '#FFFFFF',
              '& .MuiBottomNavigationAction-root': {
                minWidth: 0,
                px: 0.5,
                py: '4px',
                color: '#64748B',
                '&.Mui-selected': {
                  color: '#0D9488',
                },
              },
              '& .MuiBottomNavigationAction-label': {
                fontSize: '0.67rem',
                fontWeight: 600,
                lineHeight: 1.1,
                mt: 0.2,
                '&.Mui-selected': {
                  fontSize: '0.70rem',
                  fontWeight: 700,
                },
              },
            }}
          >
            {isStudent ? [
              <BottomNavigationAction key="m-dash" label="Home" icon={<DashboardIcon sx={{ fontSize: 21 }} />} />,
              <BottomNavigationAction key="m-drives" label="Drives" icon={<WorkIcon sx={{ fontSize: 21 }} />} />,
              <BottomNavigationAction key="m-tests" label="Tests" icon={<QuizIcon sx={{ fontSize: 21 }} />} />,
              <BottomNavigationAction key="m-results" label="Results" icon={<FactCheckIcon sx={{ fontSize: 21 }} />} />,
              <BottomNavigationAction key="m-menu" label="More" icon={<MenuIcon sx={{ fontSize: 21 }} />} />,
            ] : [
              <BottomNavigationAction key="m-dash" label="Overview" icon={<DashboardIcon sx={{ fontSize: 21 }} />} />,
              <BottomNavigationAction key="m-drives" label="Drives" icon={<WorkIcon sx={{ fontSize: 21 }} />} />,
              <BottomNavigationAction key="m-students" label="Students" icon={<PeopleAltIcon sx={{ fontSize: 21 }} />} />,
              <BottomNavigationAction key="m-results" label="Results" icon={<FactCheckIcon sx={{ fontSize: 21 }} />} />,
              <BottomNavigationAction key="m-menu" label="Menu" icon={<MenuIcon sx={{ fontSize: 21 }} />} />,
            ]}
          </BottomNavigation>
        </Paper>
      )}
    </Box>
  );
};
