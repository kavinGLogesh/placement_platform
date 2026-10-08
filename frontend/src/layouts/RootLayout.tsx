import React, { useState, useMemo } from 'react';
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
  Divider,
  Chip,
  Breadcrumbs,
  Link,
  Avatar,
  useMediaQuery,
  useTheme,
} from '@mui/material';
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
import BusinessIcon from '@mui/icons-material/Business';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import SpeedIcon from '@mui/icons-material/Speed';
import { useHealthCheck } from '../hooks/useHealthCheck.js';
import { useAuth } from '../hooks/useAuth.js';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactElement;
  badge?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const SIDEBAR_WIDTH = 280;
const SIDEBAR_COLLAPSED_WIDTH = 68;

export const RootLayout: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { isLoading: isHealthLoading, isError: isHealthError } = useHealthCheck();
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const isExamMode = location.pathname.startsWith('/student/attempt/');
  const isLoginPage = location.pathname === '/login';

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Nav sections tailored by role
  const navSections: NavSection[] = useMemo(() => {
    if (!isAuthenticated || !user) return [];

    if (user.role === 'SUPER_ADMIN') {
      return [
        {
          title: 'GOVERNANCE',
          items: [
            {
              label: 'Executive Dashboard',
              path: '/admin/dashboard',
              icon: <DashboardIcon fontSize="small" />,
            },
            {
              label: 'Analytics Hub',
              path: '/admin/analytics',
              icon: <BarChartIcon fontSize="small" />,
            },
            {
              label: 'Audit Reports',
              path: '/admin/reports',
              icon: <DescriptionIcon fontSize="small" />,
            },
          ],
        },
        {
          title: 'CAMPUS DIRECTORY',
          items: [
            {
              label: 'Students Directory',
              path: '/admin/students',
              icon: <PeopleAltIcon fontSize="small" />,
            },
            {
              label: 'Company Profiles',
              path: '/admin/companies',
              icon: <BusinessIcon fontSize="small" />,
            },
            {
              label: 'Departments & Setup',
              path: '/admin/departments',
              icon: <AccountBalanceIcon fontSize="small" />,
            },
          ],
        },
        {
          title: 'EVALUATION OVERSIGHT',
          items: [
            { label: 'GD Rounds', path: '/admin/gd', icon: <GroupsIcon fontSize="small" /> },
            {
              label: 'Interviews',
              path: '/admin/interviews',
              icon: <WorkOutlineIcon fontSize="small" />,
            },
            {
              label: 'Scoring & Results',
              path: '/admin/results',
              icon: <FactCheckIcon fontSize="small" />,
            },
            {
              label: 'Attendance Oversight',
              path: '/admin/attendance',
              icon: <HowToRegIcon fontSize="small" />,
            },
          ],
        },
      ];
    }

    if (user.role === 'PLACEMENT_ADMIN') {
      return [
        {
          title: 'RECRUITMENT & TESTING',
          items: [
            {
              label: 'Dashboard',
              path: '/admin/dashboard',
              icon: <DashboardIcon fontSize="small" />,
            },
            {
              label: 'Company Assessment',
              path: '/admin/companies',
              icon: <BusinessIcon fontSize="small" />,
            },
            {
              label: 'Assessments',
              path: '/admin/assessments',
              icon: <AssignmentIcon fontSize="small" />,
            },
            {
              label: 'Question Bank',
              path: '/admin/questions',
              icon: <QuizIcon fontSize="small" />,
            },
          ],
        },
        {
          title: 'EVALUATION & DRIVES',
          items: [
            { label: 'GD Rounds', path: '/admin/gd', icon: <GroupsIcon fontSize="small" /> },
            {
              label: 'Technical Interviews',
              path: '/admin/interviews',
              icon: <WorkOutlineIcon fontSize="small" />,
            },
            {
              label: 'Results & Scoring',
              path: '/admin/results',
              icon: <FactCheckIcon fontSize="small" />,
            },
            {
              label: 'Attendance & Follow-up',
              path: '/admin/attendance',
              icon: <HowToRegIcon fontSize="small" />,
            },
          ],
        },
        {
          title: 'CAMPUS STRUCTURE',
          items: [
            {
              label: 'Students Directory',
              path: '/admin/students',
              icon: <PeopleAltIcon fontSize="small" />,
            },
            {
              label: 'Institutional Setup',
              path: '/admin/departments',
              icon: <AccountBalanceIcon fontSize="small" />,
            },
          ],
        },
        {
          title: 'INTELLIGENCE & AUDIT',
          items: [
            {
              label: 'Analytics Hub',
              path: '/admin/analytics',
              icon: <BarChartIcon fontSize="small" />,
            },
            {
              label: 'Reports & Exports',
              path: '/admin/reports',
              icon: <DescriptionIcon fontSize="small" />,
            },
          ],
        },
      ];
    }

    if (user.role === 'STUDENT') {
      return [
        {
          title: '',
          items: [
            {
              label: 'Dashboard',
              path: '/student/dashboard',
              icon: <SpeedIcon fontSize="small" />,
            },
            {
              label: 'My Assessment',
              path: '/student/tests',
              icon: <QuizIcon fontSize="small" />,
            },
            {
              label: 'Lab Test',
              path: '/student/gd',
              icon: <AccountBalanceIcon fontSize="small" />,
            },
            {
              label: 'Recruit',
              path: '/student/interviews',
              icon: <AssignmentIcon fontSize="small" />,
            },
            {
              label: 'My Analytics',
              path: '/student/performance',
              icon: <BarChartIcon fontSize="small" />,
            },
            {
              label: 'Results & Records',
              path: '/student/results',
              icon: <FactCheckIcon fontSize="small" />,
            },
            {
              label: 'My Profile',
              path: '/student/profile',
              icon: <PersonOutlineIcon fontSize="small" />,
            },
          ],
        },
      ];
    }

    return [];
  }, [user, isAuthenticated]);

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

  // If login or locked exam attempt mode, render edge-to-edge
  if (isLoginPage || isExamMode) {
    return <Outlet />;
  }

  const isStudent = user?.role === 'STUDENT';
  const studentDisplayName = user?.email
    ? user.email.split('@')[0].replace(/[._-]/g, ' ')
    : 'Student';

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Sidebar content component (reused for desktop and mobile drawer)
  const sidebarContent = (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: isStudent ? '#0B132B' : '#ffffff',
        borderRight: isStudent ? '1px solid #14223E' : '1px solid #DCE6F5',
      }}
    >
      {/* Brand Header */}
      {isStudent ? (
        <Box
          sx={{
            p: (!sidebarCollapsed || isMobile) ? '12px 14px' : '14px 10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: (!sidebarCollapsed || isMobile) ? 'flex-start' : 'center',
            cursor: 'pointer',
            borderBottom: '1px solid #14223E',
            minHeight: 68,
          }}
          onClick={() => navigate('/student/dashboard')}
        >
          {sidebarCollapsed && !isMobile ? (
            <Box
              sx={{
                width: 42,
                height: 42,
                borderRadius: '10px',
                bgcolor: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                p: 0.6,
                flexShrink: 0,
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.35)',
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
          ) : (
            <Box
              sx={{
                width: '100%',
                bgcolor: '#FFFFFF',
                borderRadius: '10px',
                p: '6px 10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.25)',
              }}
            >
              <Box
                component="img"
                src="/vet-college-logo.png"
                alt="VET Institute of Arts and Science"
                sx={{
                  width: '100%',
                  height: 'auto',
                  maxHeight: 44,
                  objectFit: 'contain',
                  display: 'block',
                }}
              />
            </Box>
          )}
        </Box>
      ) : (
        <Box
          sx={{
            p: (!sidebarCollapsed || isMobile) ? '12px 14px' : '14px 10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: (!sidebarCollapsed || isMobile) ? 'flex-start' : 'center',
            borderBottom: '1px solid #DCE6F5',
            minHeight: 68,
            cursor: 'pointer',
          }}
          onClick={() => navigate('/admin/dashboard')}
        >
          {sidebarCollapsed && !isMobile ? (
            <Box
              sx={{
                width: 42,
                height: 42,
                borderRadius: '8px',
                bgcolor: '#F0F4FA',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                p: 0.6,
                border: '1px solid #E2E8F0',
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
          ) : (
            <Box
              sx={{
                width: '100%',
                bgcolor: '#FFFFFF',
                borderRadius: '8px',
                p: '5px 8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid #E2E8F0',
              }}
            >
              <Box
                component="img"
                src="/vet-college-logo.png"
                alt="VET Institute of Arts and Science"
                sx={{
                  width: '100%',
                  height: 'auto',
                  maxHeight: 44,
                  objectFit: 'contain',
                  display: 'block',
                }}
              />
            </Box>
          )}
        </Box>
      )}

      {/* Role Pill Banner for Staff only */}
      {(!sidebarCollapsed || isMobile) && user && !isStudent && (
        <Box
          sx={{
            px: 2,
            py: 1.25,
            bgcolor: '#EDF2FF',
            borderBottom: '1px solid #DCE6F5',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Chip
              label={
                user.role === 'SUPER_ADMIN'
                  ? 'Super Administrator'
                  : 'Placement Admin'
              }
              size="small"
              sx={{
                height: 22,
                fontSize: '0.7rem',
                fontWeight: 600,
                borderRadius: '4px',
                bgcolor: '#EDF2FF',
                color: '#1765B5',
                border: '1px solid #D1DEF0',
              }}
            />
            <Tooltip
              title={
                isHealthLoading
                  ? 'Connecting to API...'
                  : isHealthError
                    ? 'System API Offline'
                    : 'API Online'
              }
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box
                  sx={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    bgcolor: isHealthLoading ? '#b45309' : isHealthError ? '#b91c1c' : '#10B981',
                  }}
                />
              </Box>
            </Tooltip>
          </Box>
        </Box>
      )}

      {/* Navigation Links */}
      <Box sx={{ flex: 1, overflowY: 'auto', py: isStudent ? 1 : 1.5 }}>
        {navSections.map((section, sIdx) => (
          <Box key={section.title || sIdx} sx={{ mb: section.title ? 2 : 0.5 }}>
            {(!sidebarCollapsed || isMobile) && section.title && (
              <Typography
                variant="caption"
                sx={{
                  display: 'block',
                  px: 2.25,
                  mb: 0.5,
                  color: '#8293B0',
                  fontWeight: 700,
                  fontSize: '0.68rem',
                  letterSpacing: '0.06em',
                }}
              >
                {section.title}
              </Typography>
            )}
            <List dense disablePadding>
              {section.items.map((item) => {
                const isActive =
                  location.pathname === item.path ||
                  (item.path !== '/admin/dashboard' &&
                    item.path !== '/student/dashboard' &&
                    location.pathname.startsWith(item.path));

                return (
                  <ListItem key={item.path} disablePadding sx={{ px: isStudent ? 1.5 : 1, mb: 0.5 }}>
                    <Tooltip
                      title={sidebarCollapsed && !isMobile ? item.label : ''}
                      placement="right"
                    >
                      <ListItemButton
                        component={RouterLink}
                        to={item.path}
                        onClick={() => isMobile && setMobileDrawerOpen(false)}
                        sx={{
                          borderRadius: isStudent ? '8px' : 999,
                          py: isStudent ? 1.15 : 1.1,
                          px: sidebarCollapsed && !isMobile ? 1.5 : 2,
                          justifyContent: sidebarCollapsed && !isMobile ? 'center' : 'flex-start',
                          bgcolor: isActive
                            ? isStudent
                              ? '#1E6BFF'
                              : '#1765B5'
                            : 'transparent',
                          color: isActive
                            ? '#ffffff'
                            : isStudent
                              ? '#8A99AD'
                              : '#526584',
                          fontWeight: isActive ? 600 : 500,
                          boxShadow: 'none',
                          '&:hover': {
                            bgcolor: isActive
                              ? isStudent
                                ? '#1D4ED8'
                                : '#104B91'
                              : isStudent
                                ? 'rgba(255, 255, 255, 0.06)'
                                : '#F1F5FC',
                            color: isActive
                              ? '#ffffff'
                              : isStudent
                                ? '#FFFFFF'
                                : '#14264B',
                            '& .MuiListItemIcon-root': {
                              color: isStudent ? '#FFFFFF' : '#14264B',
                            },
                          },
                        }}
                      >
                        <ListItemIcon
                          sx={{
                            minWidth: sidebarCollapsed && !isMobile ? 'auto' : 32,
                            color: isActive
                              ? '#ffffff'
                              : isStudent
                                ? '#8A99AD'
                                : '#7385A2',
                            justifyContent: 'center',
                          }}
                        >
                          {item.icon}
                        </ListItemIcon>
                        {(!sidebarCollapsed || isMobile) && (
                          <ListItemText
                            primary={item.label}
                            primaryTypographyProps={{
                              fontSize: '0.86rem',
                              fontWeight: isActive ? 600 : 500,
                              color: 'inherit',
                              whiteSpace: 'nowrap',
                              textOverflow: 'ellipsis',
                              overflow: 'hidden',
                            }}
                          />
                        )}
                      </ListItemButton>
                    </Tooltip>
                  </ListItem>
                );
              })}
            </List>
            {sIdx < navSections.length - 1 && section.title && (
              <Divider
                sx={{
                  my: 1.5,
                  borderColor: '#DCE6F5',
                }}
              />
            )}
          </Box>
        ))}
      </Box>

      {/* User Footer Profile & Sign Out */}
      <Box
        sx={{
          p: 1.5,
          borderTop: isStudent ? '1px solid #14223E' : '1px solid #DCE6F5',
          bgcolor: isStudent ? '#0B132B' : '#ffffff',
        }}
      >
        {!sidebarCollapsed || isMobile ? (
          <Box
            sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}
          >
            <Box
              component={isStudent ? RouterLink : 'div'}
              to={isStudent ? '/student/profile' : undefined}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.25,
                overflow: 'hidden',
                textDecoration: 'none',
                color: 'inherit',
                cursor: isStudent ? 'pointer' : 'default',
              }}
            >
              <Avatar
                sx={{
                  width: 32,
                  height: 32,
                  bgcolor: isStudent ? '#009688' : '#1765B5',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: '#ffffff',
                }}
              >
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </Avatar>
              <Box sx={{ overflow: 'hidden' }}>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 600,
                    fontSize: '0.8rem',
                    color: isStudent ? '#F8FAFC' : '#14264B',
                    lineHeight: 1.2,
                    textOverflow: 'ellipsis',
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {studentDisplayName}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color: isStudent ? '#94A3B8' : '#8293B0',
                    fontSize: '0.7rem',
                  }}
                >
                  {isStudent ? 'Candidate' : 'Staff Admin'}
                </Typography>
              </Box>
            </Box>

            <Tooltip title="Sign Out">
              <IconButton
                size="small"
                onClick={handleLogout}
                sx={{
                  color: isStudent ? '#94A3B8' : '#7182A0',
                  '&:hover': { color: '#EF4444' },
                }}
              >
                <LogoutIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <Tooltip title="Sign Out">
              <IconButton
                size="small"
                onClick={handleLogout}
                sx={{
                  color: isStudent ? '#94A3B8' : '#7182A0',
                  '&:hover': { color: '#EF4444' },
                }}
              >
                <LogoutIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        )}
      </Box>
    </Box>
  );

  const effectiveSidebarWidth = isStudent ? 240 : SIDEBAR_WIDTH;

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: isStudent ? '#F8F9FB' : '#EDF2FF' }}>
      {/* Desktop Sidebar */}
      {!isMobile && (
        <Box
          component="nav"
          sx={{
            width: sidebarCollapsed ? SIDEBAR_COLLAPSED_WIDTH : effectiveSidebarWidth,
            flexShrink: 0,
            transition: 'width 0.2s ease',
          }}
        >
          <Box
            sx={{
              position: 'fixed',
              top: 0,
              bottom: 0,
              width: sidebarCollapsed ? SIDEBAR_COLLAPSED_WIDTH : effectiveSidebarWidth,
              zIndex: 1100,
              transition: 'width 0.2s ease',
            }}
          >
            {sidebarContent}
          </Box>
        </Box>
      )}

      {/* Mobile Drawer */}
      {isMobile && (
        <Drawer
          anchor="left"
          open={mobileDrawerOpen}
          onClose={() => setMobileDrawerOpen(false)}
          PaperProps={{ sx: { width: effectiveSidebarWidth } }}
        >
          {sidebarContent}
        </Drawer>
      )}

      {/* Main Content Area */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top Header Bar */}
        <Box
          component="header"
          sx={{
            height: 64,
            px: { xs: 2, sm: 3, md: 4 },
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
            <Box
              onClick={() => (isMobile ? setMobileDrawerOpen(true) : setSidebarCollapsed(!sidebarCollapsed))}
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
                '&:hover': { bgcolor: '#F8FAFC' },
              }}
            >
              <MenuIcon sx={{ fontSize: 20, color: '#374151' }} />
            </Box>

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
