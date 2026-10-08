import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
  IconButton,
  Button,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import CheckBoxOutlinedIcon from '@mui/icons-material/CheckBoxOutlined';
import CodeOutlinedIcon from '@mui/icons-material/CodeOutlined';
import TrendingUpOutlinedIcon from '@mui/icons-material/TrendingUpOutlined';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import TrackChangesOutlinedIcon from '@mui/icons-material/TrackChangesOutlined';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import BoltOutlinedIcon from '@mui/icons-material/BoltOutlined';
import WbSunnyOutlinedIcon from '@mui/icons-material/WbSunnyOutlined';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import ErrorOutlineOutlinedIcon from '@mui/icons-material/ErrorOutlineOutlined';
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined';
import ManageAccountsOutlinedIcon from '@mui/icons-material/ManageAccountsOutlined';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';

import { useAuth } from '../hooks/useAuth.js';
import { Role } from '../types/auth.types.js';
import { CareerOsLogo } from '../components/common/CareerOsLogo.js';
import campusBg from '../assets/career-os-campus-bg.jpg';

type RoleTab = 'STUDENT' | 'PLACEMENT_ADMIN' | 'SUPER_ADMIN';

interface RoleConfig {
  label: string;
  shortLabel: string;
  heading: string;
  subtitle: string;
  description: string;
  identifierPlaceholder: string;
  defaultEmail: string;
  defaultPassword: string;
  icon: React.ReactElement;
  dashboardPath: string;
}

const ROLE_CONFIGS: Record<RoleTab, RoleConfig> = {
  STUDENT: {
    label: 'Student Login',
    shortLabel: 'Student',
    heading: 'Welcome Back',
    subtitle: 'Sign in to access your assessments & placement portal',
    description: 'Assessments, Coding Tests & Placement Prep',
    identifierPlaceholder: 'College email or register number (e.g., 2026CS101)',
    defaultEmail: 'student@placement.edu',
    defaultPassword: 'Student@123',
    icon: <SchoolOutlinedIcon sx={{ fontSize: 16 }} />,
    dashboardPath: '/student/dashboard',
  },
  PLACEMENT_ADMIN: {
    label: 'Placement Admin Login',
    shortLabel: 'Placement Admin',
    heading: 'Placement Admin',
    subtitle: 'Sign in to manage institutional placements and evaluations',
    description: 'Manage Drives, Question Banks & Student Tracking',
    identifierPlaceholder: 'Admin email (e.g., placementadmin@placement.edu)',
    defaultEmail: 'placementadmin@placement.edu',
    defaultPassword: 'PlacementAdmin@123',
    icon: <ManageAccountsOutlinedIcon sx={{ fontSize: 16 }} />,
    dashboardPath: '/admin/dashboard',
  },
  SUPER_ADMIN: {
    label: 'Super Admin Login',
    shortLabel: 'Super Admin',
    heading: 'Super Admin',
    subtitle: 'Sign in to monitor institutional performance & system health',
    description: 'Executive Portal • Institutional Funnel & Audit Oversight',
    identifierPlaceholder: 'Super admin email (e.g., superadmin@placement.edu)',
    defaultEmail: 'superadmin@placement.edu',
    defaultPassword: 'SuperAdmin@123',
    icon: <AdminPanelSettingsOutlinedIcon sx={{ fontSize: 16 }} />,
    dashboardPath: '/admin/dashboard',
  },
};

const REMEMBERED_EMAIL_KEY_PREFIX = 'career_os_remembered_';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, logout } = useAuth();

  const [activeRole, setActiveRole] = useState<RoleTab>('STUDENT');
  const [identifier, setIdentifier] = useState(ROLE_CONFIGS.STUDENT.defaultEmail);
  const [password, setPassword] = useState(ROLE_CONFIGS.STUDENT.defaultPassword);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

  // Handle switching role tabs
  const handleRoleChange = (newRole: RoleTab) => {
    setActiveRole(newRole);
    setErrorMessage(null);

    const savedIdentifier = localStorage.getItem(`${REMEMBERED_EMAIL_KEY_PREFIX}${newRole}`);
    if (savedIdentifier) {
      setIdentifier(savedIdentifier);
      setPassword(ROLE_CONFIGS[newRole].defaultPassword);
    } else {
      setIdentifier(ROLE_CONFIGS[newRole].defaultEmail);
      setPassword(ROLE_CONFIGS[newRole].defaultPassword);
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem(`${REMEMBERED_EMAIL_KEY_PREFIX}${activeRole}`);
    if (saved) {
      setIdentifier(saved);
    }
  }, [activeRole]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setErrorMessage('Please enter both your email/username and password.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      if (rememberMe) {
        localStorage.setItem(`${REMEMBERED_EMAIL_KEY_PREFIX}${activeRole}`, identifier.trim());
      } else {
        localStorage.removeItem(`${REMEMBERED_EMAIL_KEY_PREFIX}${activeRole}`);
      }

      // Authenticate against backend
      const loggedInUser = await login({ email: identifier.trim(), password });

      // STRICT ROLE VERIFICATION:
      // Verify that authenticated user role matches the selected role access option
      if (loggedInUser.role !== activeRole) {
        // Revoke session immediately to prevent unauthorized access
        await logout();

        const roleDisplayNames: Record<Role, string> = {
          STUDENT: 'Student',
          PLACEMENT_ADMIN: 'Placement Admin',
          SUPER_ADMIN: 'Super Admin',
        };

        const correctRoleName = roleDisplayNames[loggedInUser.role] || loggedInUser.role;
        const selectedRoleName = ROLE_CONFIGS[activeRole].shortLabel;

        setErrorMessage(
          `Role Mismatch: Your account is registered as a ${correctRoleName}. You cannot sign in under the ${selectedRoleName} option. Please select the "${correctRoleName}" tab.`
        );
        setIsSubmitting(false);
        return;
      }

      // Successful verified login: route to appropriate dashboard
      if (loggedInUser.role === 'STUDENT' && loggedInUser.mustChangePassword) {
        navigate('/student/change-password', { replace: true });
      } else if (from && from !== '/') {
        navigate(from, { replace: true });
      } else {
        navigate(ROLE_CONFIGS[activeRole].dashboardPath, { replace: true });
      }
    } catch (err: unknown) {
      const errObj = err as Record<string, unknown> | undefined;
      const message = errObj?.message ? String(errObj.message) : '';

      if (message.includes('Network Error') || message.includes('ECONNREFUSED') || message.includes('failed to fetch')) {
        setErrorMessage('Backend server unavailable (port 5000). Please ensure the API service is running.');
      } else if (errObj?.statusCode === 401 || message.includes('Invalid email') || message.includes('Invalid credentials')) {
        setErrorMessage('Invalid email, username, or password. Please verify your credentials.');
      } else if (message.includes('deactivated') || message.includes('blocked')) {
        setErrorMessage('Your account is deactivated. Please contact the college placement office.');
      } else if (errObj?.statusCode === 429) {
        setErrorMessage('Too many login attempts. Please wait a few moments before trying again.');
      } else {
        setErrorMessage(message || 'Authentication failed. Please verify your credentials.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentConfig = ROLE_CONFIGS[activeRole];

  const featureItems = [
    { label: 'Online Assessments', icon: <CheckBoxOutlinedIcon sx={{ fontSize: 17 }} /> },
    { label: 'Coding Tests', icon: <CodeOutlinedIcon sx={{ fontSize: 17 }} /> },
    { label: 'Performance Analytics', icon: <TrendingUpOutlinedIcon sx={{ fontSize: 17 }} /> },
    { label: 'Placement Readiness', icon: <GroupsOutlinedIcon sx={{ fontSize: 17 }} /> },
  ];

  return (
    <Box
      component="main"
      sx={{
        minHeight: '100dvh',
        width: '100%',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        backgroundColor: '#040b17',
        backgroundImage: `
          radial-gradient(circle at 45% 15%, rgba(6, 182, 212, 0.12) 0%, transparent 40%),
          radial-gradient(circle at 92% 92%, rgba(16, 185, 129, 0.12) 0%, transparent 45%),
          linear-gradient(90deg, rgba(3, 10, 22, 0.94) 0%, rgba(3, 10, 22, 0.88) 28%, rgba(3, 10, 22, 0.52) 52%, rgba(3, 10, 22, 0.22) 70%, rgba(3, 10, 22, 0.78) 100%),
          url(${campusBg})
        `,
        backgroundSize: 'cover',
        backgroundPosition: 'center center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
        color: '#ffffff',
        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        overflowX: 'hidden',
        px: { xs: 2.5, sm: 4, md: 6, lg: 8 },
        py: { xs: 2, sm: 2.5, md: 3 },
      }}
    >
      {/* ==================== TOP BAR ==================== */}
      <Box
        component="header"
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          zIndex: 10,
        }}
      >
        {/* Top-Left Brand Logo: Official VET College Logo + Platform Name */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1.5, sm: 2 } }}>
          <Box
            sx={{
              bgcolor: '#FFFFFF',
              borderRadius: '8px',
              p: '4px 10px',
              display: 'flex',
              alignItems: 'center',
              boxShadow: '0 2px 12px rgba(0, 0, 0, 0.35)',
            }}
          >
            <Box
              component="img"
              src="/vet-college-logo.png"
              alt="VET Institute of Arts and Science"
              sx={{
                height: { xs: 24, sm: 32 },
                width: 'auto',
                display: 'block',
              }}
            />
          </Box>
          <Box sx={{ display: { xs: 'none', sm: 'block' }, width: '1px', height: 28, bgcolor: 'rgba(255, 255, 255, 0.2)' }} />
          <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
            <CareerOsLogo size="medium" showSubtitle={true} align="left" />
          </Box>
        </Box>

        {/* Top-Right Theme Controls */}
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.5,
            p: '3px 4px',
            borderRadius: '24px',
            bgcolor: 'rgba(9, 20, 39, 0.72)',
            border: '1px solid rgba(56, 189, 248, 0.2)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <IconButton
            size="small"
            onClick={() => setIsDarkMode(false)}
            aria-label="Light mode"
            sx={{
              p: 0.75,
              borderRadius: '50%',
              color: !isDarkMode ? '#38bdf8' : '#64748b',
              bgcolor: !isDarkMode ? 'rgba(6, 182, 212, 0.18)' : 'transparent',
              border: !isDarkMode ? '1px solid rgba(56, 189, 248, 0.35)' : '1px solid transparent',
              transition: 'all 0.2s ease',
              '&:hover': {
                color: '#94a3b8',
                bgcolor: !isDarkMode ? 'rgba(6, 182, 212, 0.24)' : 'rgba(255, 255, 255, 0.05)',
              },
            }}
          >
            <WbSunnyOutlinedIcon sx={{ fontSize: 16 }} />
          </IconButton>

          <IconButton
            size="small"
            onClick={() => setIsDarkMode(true)}
            aria-label="Dark mode"
            sx={{
              p: 0.75,
              borderRadius: '50%',
              color: isDarkMode ? '#38bdf8' : '#64748b',
              bgcolor: isDarkMode ? 'rgba(6, 182, 212, 0.22)' : 'transparent',
              border: isDarkMode ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid transparent',
              boxShadow: isDarkMode ? '0 0 10px rgba(56, 189, 248, 0.25)' : 'none',
              transition: 'all 0.2s ease',
              '&:hover': {
                color: '#38bdf8',
                bgcolor: isDarkMode ? 'rgba(6, 182, 212, 0.28)' : 'rgba(255, 255, 255, 0.05)',
              },
            }}
          >
            <DarkModeOutlinedIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>
      </Box>

      {/* ==================== CENTER CONTENT (2-COLUMN) ==================== */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1.14fr 0.86fr', lg: '1.22fr 0.78fr' },
          alignItems: 'center',
          gap: { xs: 4, md: 5, lg: 8 },
          my: 'auto',
          py: { xs: 2, md: 2.5 },
          zIndex: 10,
        }}
      >
        {/* ----- LEFT SIDE: HERO CONTENT & STATS ----- */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            maxWidth: 580,
          }}
        >
          {/* Small Navigation Style Tracker */}
          <Typography
            sx={{
              color: '#38bdf8',
              fontSize: { xs: '0.72rem', sm: '0.78rem' },
              fontWeight: 700,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              mb: { xs: 1.5, sm: 2 },
            }}
          >
            LEARN &nbsp;/&nbsp; PRACTICE &nbsp;/&nbsp; GET PLACED
          </Typography>

          {/* Main Heading */}
          <Typography
            component="h1"
            sx={{
              fontWeight: 850,
              fontSize: { xs: '2.4rem', sm: '3.2rem', lg: '3.9rem' },
              lineHeight: 1.08,
              letterSpacing: '-0.025em',
              color: '#ffffff',
            }}
          >
            Your Career.
            <Box
              component="span"
              sx={{
                display: 'block',
                background: 'linear-gradient(90deg, #22c55e 0%, #06b6d4 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Our Mission.
            </Box>
          </Typography>

          {/* Supporting Text */}
          <Typography
            sx={{
              mt: 2,
              mb: 3.5,
              maxWidth: 490,
              color: '#cbd5e1',
              fontSize: { xs: '0.9rem', sm: '0.96rem', lg: '1rem' },
              lineHeight: 1.65,
              fontWeight: 400,
            }}
          >
            A complete platform to manage students, conduct assessments, evaluate performance, and
            drive better placement outcomes.
          </Typography>

          {/* 4 Feature Items */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 1.5,
              mb: { xs: 3.5, md: 4.5 },
            }}
          >
            {featureItems.map((item, idx) => (
              <Box
                key={idx}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  transition: 'transform 0.2s ease',
                  '&:hover': {
                    transform: 'translateX(3px)',
                  },
                }}
              >
                <Box
                  sx={{
                    width: 30,
                    height: 30,
                    borderRadius: '7px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#38bdf8',
                    bgcolor: 'rgba(14, 165, 233, 0.08)',
                    border: '1px solid rgba(56, 189, 248, 0.22)',
                    boxShadow: '0 2px 8px rgba(6, 182, 212, 0.1)',
                  }}
                >
                  {item.icon}
                </Box>
                <Typography
                  sx={{
                    color: '#e2e8f0',
                    fontSize: { xs: '0.88rem', sm: '0.92rem' },
                    fontWeight: 500,
                    letterSpacing: '0.01em',
                  }}
                >
                  {item.label}
                </Typography>
              </Box>
            ))}
          </Box>

          {/* Bottom Statistics Glass Panel */}
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              flexWrap: { xs: 'wrap', sm: 'nowrap' },
              gap: { xs: 2, sm: 3 },
              px: { xs: 2.2, sm: 3 },
              py: 1.5,
              borderRadius: '16px',
              bgcolor: 'rgba(9, 22, 44, 0.72)',
              border: '1px solid rgba(56, 189, 248, 0.18)',
              backdropFilter: 'blur(18px)',
              boxShadow: '0 12px 35px rgba(0, 0, 0, 0.45)',
              width: 'fit-content',
            }}
          >
            {/* Stat 1: 1000+ Students */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
              <PersonOutlineOutlinedIcon sx={{ color: '#38bdf8', fontSize: 22 }} />
              <Box>
                <Typography
                  sx={{
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: { xs: '1rem', sm: '1.15rem' },
                    lineHeight: 1.1,
                  }}
                >
                  1000+
                </Typography>
                <Typography sx={{ color: '#8fa2bd', fontSize: '0.72rem', mt: 0.2 }}>
                  Students
                </Typography>
              </Box>
            </Box>

            {/* Divider */}
            <Box
              sx={{
                display: { xs: 'none', sm: 'block' },
                width: '1px',
                height: 26,
                bgcolor: 'rgba(56, 189, 248, 0.15)',
              }}
            />

            {/* Stat 2: 50+ Companies */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
              <BusinessOutlinedIcon sx={{ color: '#38bdf8', fontSize: 22 }} />
              <Box>
                <Typography
                  sx={{
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: { xs: '1rem', sm: '1.15rem' },
                    lineHeight: 1.1,
                  }}
                >
                  50+
                </Typography>
                <Typography sx={{ color: '#8fa2bd', fontSize: '0.72rem', mt: 0.2 }}>
                  Companies
                </Typography>
              </Box>
            </Box>

            {/* Divider */}
            <Box
              sx={{
                display: { xs: 'none', sm: 'block' },
                width: '1px',
                height: 26,
                bgcolor: 'rgba(56, 189, 248, 0.15)',
              }}
            />

            {/* Stat 3: 100% Placement Focused */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
              <TrackChangesOutlinedIcon sx={{ color: '#22c55e', fontSize: 22 }} />
              <Box>
                <Typography
                  sx={{
                    color: '#22c55e',
                    fontWeight: 800,
                    fontSize: { xs: '1rem', sm: '1.15rem' },
                    lineHeight: 1.1,
                  }}
                >
                  100%
                </Typography>
                <Typography sx={{ color: '#8fa2bd', fontSize: '0.72rem', mt: 0.2 }}>
                  Placement Focused
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>

        {/* ----- RIGHT SIDE: LOGIN CARD ----- */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: { xs: 'center', md: 'flex-end' },
            width: '100%',
          }}
        >
          <Box
            component="section"
            sx={{
              width: '100%',
              maxWidth: { xs: 430, lg: 450 },
              borderRadius: '22px',
              p: { xs: 2.8, sm: 3.5, lg: 4 },
              bgcolor: 'rgba(9, 18, 38, 0.88)',
              backdropFilter: 'blur(26px)',
              border: '1px solid rgba(56, 189, 248, 0.22)',
              boxShadow:
                '0 25px 65px rgba(0, 0, 0, 0.65), 0 0 35px rgba(14, 165, 233, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Top Logo inside Card */}
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2.2 }}>
              <CareerOsLogo size="medium" showSubtitle={true} align="left" />
            </Box>

            {/* Role-Based Access Selector (3 Compact Tabs) */}
            <Box
              role="tablist"
              aria-label="Login Role Selection"
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 0.5,
                p: '3px',
                borderRadius: '12px',
                bgcolor: 'rgba(6, 14, 28, 0.75)',
                border: '1px solid rgba(56, 189, 248, 0.16)',
                mb: 2.2,
              }}
            >
              {(['STUDENT', 'PLACEMENT_ADMIN', 'SUPER_ADMIN'] as RoleTab[]).map((role) => {
                const config = ROLE_CONFIGS[role];
                const isSelected = activeRole === role;

                return (
                  <Box
                    key={role}
                    component="button"
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    onClick={() => handleRoleChange(role)}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 0.7,
                      py: 0.85,
                      px: 0.5,
                      borderRadius: '9px',
                      border: isSelected
                        ? '1px solid rgba(56, 189, 248, 0.45)'
                        : '1px solid transparent',
                      bgcolor: isSelected
                        ? 'rgba(6, 182, 212, 0.18)'
                        : 'transparent',
                      color: isSelected ? '#ffffff' : '#8fa2bd',
                      fontWeight: isSelected ? 700 : 500,
                      fontSize: { xs: '0.70rem', sm: '0.74rem' },
                      fontFamily: 'inherit',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: isSelected
                        ? '0 2px 8px rgba(6, 182, 212, 0.22)'
                        : 'none',
                      '&:hover': {
                        color: '#ffffff',
                        bgcolor: isSelected
                          ? 'rgba(6, 182, 212, 0.24)'
                          : 'rgba(255, 255, 255, 0.05)',
                      },
                      '&:focus-visible': {
                        outline: '2px solid #38bdf8',
                      },
                    }}
                  >
                    <Box
                      component="span"
                      sx={{
                        color: isSelected ? '#38bdf8' : '#64748b',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      {config.icon}
                    </Box>
                    <Box
                      component="span"
                      sx={{
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {config.shortLabel}
                    </Box>
                  </Box>
                );
              })}
            </Box>

            {/* Dynamic Heading & Subtitle per Role */}
            <Box sx={{ mb: 2.2, textAlign: 'left' }}>
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                <Typography
                  component="h2"
                  sx={{
                    color: '#ffffff',
                    fontSize: { xs: '1.35rem', sm: '1.5rem' },
                    fontWeight: 750,
                    letterSpacing: '-0.02em',
                    lineHeight: 1.2,
                  }}
                >
                  {currentConfig.heading}
                </Typography>
                <Typography
                  component="span"
                  sx={{
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    px: 1,
                    py: 0.2,
                    borderRadius: '4px',
                    bgcolor: 'rgba(56, 189, 248, 0.12)',
                    color: '#38bdf8',
                    border: '1px solid rgba(56, 189, 248, 0.2)',
                  }}
                >
                  {currentConfig.shortLabel}
                </Typography>
              </Box>
              <Typography
                sx={{
                  mt: 0.5,
                  color: '#8fa2bd',
                  fontSize: '0.82rem',
                  fontWeight: 400,
                }}
              >
                {currentConfig.subtitle}
              </Typography>
            </Box>

            {/* Error Banner */}
            {errorMessage && (
              <Box
                role="alert"
                sx={{
                  mb: 2,
                  p: 1.3,
                  borderRadius: '10px',
                  bgcolor: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 1.2,
                  color: '#fca5a5',
                  fontSize: '0.82rem',
                  animation: 'fadeIn 0.2s ease',
                  '@keyframes fadeIn': {
                    from: { opacity: 0, transform: 'translateY(-4px)' },
                    to: { opacity: 1, transform: 'translateY(0)' },
                  },
                }}
              >
                <ErrorOutlineOutlinedIcon sx={{ fontSize: 18, color: '#f87171', mt: 0.15, flexShrink: 0 }} />
                <Typography sx={{ fontSize: '0.80rem', color: '#fca5a5', lineHeight: 1.45 }}>
                  {errorMessage}
                </Typography>
              </Box>
            )}

            {/* Form */}
            <Box component="form" onSubmit={handleSubmit} noValidate>
              {/* Field 1: Email / Username */}
              <Box sx={{ mb: 1.6 }}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.4,
                    px: 1.6,
                    py: 1.15,
                    borderRadius: '12px',
                    bgcolor: 'rgba(13, 24, 46, 0.72)',
                    border: '1px solid rgba(56, 189, 248, 0.22)',
                    transition: 'all 0.25s ease',
                    '&:focus-within': {
                      borderColor: '#38bdf8',
                      boxShadow: '0 0 0 3px rgba(56, 189, 248, 0.16)',
                      bgcolor: 'rgba(13, 24, 46, 0.9)',
                    },
                  }}
                >
                  <MailOutlineIcon sx={{ color: '#5c708a', fontSize: 19 }} />
                  <Box
                    component="input"
                    type="text"
                    id="login-identifier"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder={currentConfig.identifierPlaceholder}
                    disabled={isSubmitting}
                    autoComplete="username"
                    required
                    sx={{
                      width: '100%',
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      color: '#ffffff',
                      fontSize: '0.88rem',
                      fontFamily: 'inherit',
                      '&::placeholder': {
                        color: '#5c708a',
                        opacity: 1,
                      },
                    }}
                  />
                </Box>
              </Box>

              {/* Field 2: Password */}
              <Box sx={{ mb: 1.6 }}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.4,
                    px: 1.6,
                    py: 1.15,
                    borderRadius: '12px',
                    bgcolor: 'rgba(13, 24, 46, 0.72)',
                    border: '1px solid rgba(56, 189, 248, 0.22)',
                    transition: 'all 0.25s ease',
                    '&:focus-within': {
                      borderColor: '#38bdf8',
                      boxShadow: '0 0 0 3px rgba(56, 189, 248, 0.16)',
                      bgcolor: 'rgba(13, 24, 46, 0.9)',
                    },
                  }}
                >
                  <LockOutlinedIcon sx={{ color: '#5c708a', fontSize: 19 }} />
                  <Box
                    component="input"
                    type={showPassword ? 'text' : 'password'}
                    id="login-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    disabled={isSubmitting}
                    autoComplete="current-password"
                    required
                    sx={{
                      width: '100%',
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      color: '#ffffff',
                      fontSize: '0.88rem',
                      fontFamily: 'inherit',
                      '&::placeholder': {
                        color: '#5c708a',
                        opacity: 1,
                      },
                    }}
                  />
                  <IconButton
                    type="button"
                    size="small"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    sx={{
                      p: 0.4,
                      color: '#5c708a',
                      '&:hover': { color: '#94a3b8' },
                    }}
                  >
                    {showPassword ? (
                      <VisibilityOffOutlinedIcon sx={{ fontSize: 18 }} />
                    ) : (
                      <VisibilityOutlinedIcon sx={{ fontSize: 18 }} />
                    )}
                  </IconButton>
                </Box>
              </Box>

              {/* Remember Me & Forgot Password Row */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  mb: 2.4,
                  mt: 0.3,
                }}
              >
                {/* Custom Green Checkbox */}
                <Box
                  component="label"
                  htmlFor="remember-me-checkbox"
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.1,
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}
                >
                  <Box
                    component="input"
                    type="checkbox"
                    id="remember-me-checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    sx={{ display: 'none' }}
                  />
                  <Box
                    sx={{
                      width: 17,
                      height: 17,
                      borderRadius: '5px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: rememberMe ? '#22c55e' : 'rgba(15, 23, 42, 0.6)',
                      border: rememberMe ? 'none' : '1px solid rgba(56, 189, 248, 0.3)',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {rememberMe && (
                      <svg width="11" height="9" viewBox="0 0 12 10" fill="none">
                        <path
                          d="M1 5L4.5 8.5L11 1.5"
                          stroke="#ffffff"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </Box>
                  <Typography sx={{ color: '#cbd5e1', fontSize: '0.82rem', fontWeight: 400 }}>
                    Remember me
                  </Typography>
                </Box>

                {/* Forgot Password Link */}
                <Typography
                  component="button"
                  type="button"
                  onClick={() => setForgotPasswordOpen(true)}
                  sx={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    color: '#38bdf8',
                    fontSize: '0.82rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    transition: 'color 0.2s ease',
                    '&:hover': {
                      color: '#7dd3fc',
                      textDecoration: 'underline',
                    },
                  }}
                >
                  Forgot password?
                </Typography>
              </Box>

              {/* Login CTA Button */}
              <Button
                type="submit"
                fullWidth
                disabled={isSubmitting}
                id="sign-in-button"
                sx={{
                  height: 46,
                  borderRadius: '9999px',
                  background: 'linear-gradient(90deg, #4ade80 0%, #22d3ee 50%, #38bdf8 100%)',
                  color: '#06121e',
                  fontSize: '0.94rem',
                  fontWeight: 750,
                  textTransform: 'none',
                  letterSpacing: '0.01em',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 1,
                  boxShadow: '0 4px 18px rgba(34, 211, 238, 0.32)',
                  transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                  '&:hover': {
                    filter: 'brightness(1.08)',
                    boxShadow: '0 6px 26px rgba(34, 211, 238, 0.52)',
                    transform: 'translateY(-1px)',
                  },
                  '&:active': {
                    transform: 'translateY(0)',
                  },
                  '&.Mui-disabled': {
                    background: 'linear-gradient(90deg, #34d399 0%, #38bdf8 100%)',
                    opacity: 0.65,
                    color: '#06121e',
                  },
                }}
              >
                {isSubmitting ? (
                  <>
                    <CircularProgress size={19} sx={{ color: '#06121e' }} />
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowForwardRoundedIcon sx={{ fontSize: 18 }} />
                  </>
                )}
              </Button>

              {/* Security Area */}
              <Box sx={{ mt: 2.8 }}>
                {/* Divider with Shield Icon & Label */}
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    mb: 1.4,
                  }}
                >
                  <Box
                    sx={{
                      flex: 1,
                      height: '1px',
                      bgcolor: 'rgba(56, 189, 248, 0.12)',
                    }}
                  />
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.8,
                      color: '#5c708a',
                      fontSize: '0.74rem',
                      fontWeight: 500,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <ShieldOutlinedIcon sx={{ fontSize: 14 }} />
                    <span>Secure Role-Based Access</span>
                  </Box>
                  <Box
                    sx={{
                      flex: 1,
                      height: '1px',
                      bgcolor: 'rgba(56, 189, 248, 0.12)',
                    }}
                  />
                </Box>

                {/* 3 Indicators */}
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: { xs: 1.8, sm: 2.4 },
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.6,
                      color: '#8fa2bd',
                      fontSize: '0.74rem',
                    }}
                  >
                    <ShieldOutlinedIcon sx={{ fontSize: 15, color: '#38bdf8' }} />
                    <span>Secure</span>
                  </Box>

                  <Box
                    sx={{
                      width: '1px',
                      height: 12,
                      bgcolor: 'rgba(56, 189, 248, 0.2)',
                    }}
                  />

                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.6,
                      color: '#8fa2bd',
                      fontSize: '0.74rem',
                    }}
                  >
                    <PeopleAltOutlinedIcon sx={{ fontSize: 15, color: '#38bdf8' }} />
                    <span>Role-Based</span>
                  </Box>

                  <Box
                    sx={{
                      width: '1px',
                      height: 12,
                      bgcolor: 'rgba(56, 189, 248, 0.2)',
                    }}
                  />

                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.6,
                      color: '#8fa2bd',
                      fontSize: '0.74rem',
                    }}
                  >
                    <BoltOutlinedIcon sx={{ fontSize: 15, color: '#22c55e' }} />
                    <span>Placement Ready</span>
                  </Box>
                </Box>
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* ==================== FOOTER ==================== */}
      <Box
        component="footer"
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 2,
          pt: 2,
          borderTop: '1px solid rgba(56, 189, 248, 0.08)',
          zIndex: 10,
        }}
      >
        {/* Left Footer */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ShieldOutlinedIcon sx={{ color: '#5c708a', fontSize: 16 }} />
          <Typography sx={{ color: '#5c708a', fontSize: '0.75rem', fontWeight: 400 }}>
            Built for Better Placements &nbsp;•&nbsp; College Placement Assessment Platform
          </Typography>
        </Box>

        {/* Right Footer */}
        <Typography
          sx={{
            color: '#38bdf8',
            fontSize: '0.75rem',
            fontWeight: 600,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
          }}
        >
          DREAM &nbsp;/&nbsp; PREPARE &nbsp;/&nbsp; ACHIEVE
        </Typography>
      </Box>

      {/* ==================== FORGOT PASSWORD DIALOG ==================== */}
      <Dialog
        open={forgotPasswordOpen}
        onClose={() => setForgotPasswordOpen(false)}
        slotProps={{
          paper: {
            sx: {
              bgcolor: '#09152b !important',
              backgroundImage: 'none !important',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              borderRadius: '16px',
              color: '#ffffff !important',
              maxWidth: 440,
              p: 1,
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.85)',
            },
          },
        }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            pb: 1,
            fontWeight: 700,
            fontSize: '1.15rem',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LockOutlinedIcon sx={{ color: '#38bdf8', fontSize: 20 }} />
            <span>{currentConfig.shortLabel} Credential Assistance</span>
          </Box>
          <IconButton
            size="small"
            onClick={() => setForgotPasswordOpen(false)}
            sx={{ color: '#64748b', '&:hover': { color: '#ffffff' } }}
          >
            <CloseRoundedIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          {activeRole === 'STUDENT' ? (
            <>
              <Typography sx={{ color: '#cbd5e1', fontSize: '0.88rem', lineHeight: 1.6, mb: 1.5 }}>
                Student credentials and register numbers are managed by your institution's Placement Cell.
              </Typography>
              <Typography sx={{ color: '#8fa2bd', fontSize: '0.82rem', lineHeight: 1.55 }}>
                Please contact your Department Placement Coordinator or Placement Administrator to reset your password or update your registration profile.
              </Typography>
            </>
          ) : (
            <>
              <Typography sx={{ color: '#cbd5e1', fontSize: '0.88rem', lineHeight: 1.6, mb: 1.5 }}>
                Administrator credentials are provisioned by the Institution System Administrator.
              </Typography>
              <Typography sx={{ color: '#8fa2bd', fontSize: '0.82rem', lineHeight: 1.55 }}>
                Please contact your institution's central IT administrator or Super Administrator to initiate a secure password reset.
              </Typography>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button
            onClick={() => setForgotPasswordOpen(false)}
            sx={{
              borderRadius: '9999px',
              px: 3,
              py: 0.8,
              background: 'linear-gradient(90deg, #4ade80 0%, #22d3ee 100%)',
              color: '#06121e',
              fontWeight: 700,
              textTransform: 'none',
              fontSize: '0.85rem',
              '&:hover': {
                filter: 'brightness(1.08)',
              },
            }}
          >
            Understood
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LoginPage;
