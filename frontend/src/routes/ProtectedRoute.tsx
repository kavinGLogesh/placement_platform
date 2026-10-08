import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Box, CircularProgress, Typography, Button, Card, CardContent } from '@mui/material';
import BlockIcon from '@mui/icons-material/Block';
import { useAuth } from '../hooks/useAuth.js';
import { Role } from '../types/auth.types.js';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Role[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Enforce first-time password change for students with temporary credentials
  if (user.role === 'STUDENT' && user.mustChangePassword) {
    if (location.pathname !== '/student/change-password') {
      return <Navigate to="/student/change-password" replace />;
    }
  } else if (user.role === 'STUDENT' && !user.mustChangePassword) {
    if (location.pathname === '/student/change-password') {
      return <Navigate to="/student/dashboard" replace />;
    }
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const hasRole = allowedRoles.includes(user.role);

    if (!hasRole) {
      return (
        <Box sx={{ maxWidth: 500, mx: 'auto', mt: 8 }}>
          <Card sx={{ border: '1px solid rgba(239, 68, 68, 0.3)', backgroundColor: 'rgba(239, 68, 68, 0.05)' }}>
            <CardContent sx={{ p: 4, textAlign: 'center' }}>
              <BlockIcon sx={{ fontSize: 56, color: 'error.main', mb: 2 }} />
              <Typography variant="h5" fontWeight={700} gutterBottom>
                403 Access Denied
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Your current role (<strong>{user.role}</strong>) does not have permission to access this resource.
              </Typography>
              <Button variant="contained" color="primary" onClick={() => window.history.back()}>
                Go Back
              </Button>
            </CardContent>
          </Card>
        </Box>
      );
    }
  }

  return <>{children}</>;
};
