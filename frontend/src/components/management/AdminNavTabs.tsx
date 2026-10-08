import React from 'react';
import { Box, Chip } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';

export const AdminNavTabs: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Secondary sub-navigation for Student & Institutional Structure
  const structureSubNav = [
    { label: 'Departments', path: '/admin/departments' },
    { label: 'College Profile', path: '/admin/college' },
  ];

  const isStructureRoute = structureSubNav.some((item) => location.pathname.startsWith(item.path));

  // Only render on institutional structure sub-routes to avoid duplicating the sidebar
  if (!isStructureRoute) {
    return null;
  }

  return (
    <Box
      sx={{
        mb: 2.5,
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        py: 0.5,
        overflowX: 'auto',
      }}
    >
      <Box sx={{ fontSize: '0.75rem', color: '#7182A0', fontWeight: 600, mr: 0.5, whiteSpace: 'nowrap' }}>
        Organization:
      </Box>
      {structureSubNav.map((sub) => {
        const isActive =
          location.pathname === sub.path ||
          (sub.path === '/admin/students' && location.pathname.startsWith('/admin/students'));
        return (
          <Chip
            key={sub.path}
            label={sub.label}
            size="small"
            clickable
            onClick={() => navigate(sub.path)}
            sx={{
              fontWeight: isActive ? 600 : 500,
              fontSize: '0.78rem',
              backgroundColor: isActive ? '#1765B5' : '#ffffff',
              color: isActive ? '#ffffff' : '#526584',
              border: '1px solid',
              borderColor: isActive ? '#1765B5' : '#D1DEF0',
              borderRadius: '4px',
              height: 26,
              '&:hover': {
                backgroundColor: isActive ? '#104B91' : '#E7EEFA',
              },
            }}
          />
        );
      })}
    </Box>
  );
};
