import React from 'react';
import { Card, CardContent, Typography, Box, Chip, Grid } from '@mui/material';
import LayersIcon from '@mui/icons-material/Layers';
import StorageIcon from '@mui/icons-material/Storage';
import DnsIcon from '@mui/icons-material/Dns';
import CloudQueueIcon from '@mui/icons-material/CloudQueue';

interface StackTier {
  name: string;
  category: string;
  icon: React.ReactNode;
  technologies: string[];
  color: string;
}

const STACK_TIERS: StackTier[] = [
  {
    name: 'Frontend Tier',
    category: 'Client Application',
    icon: <LayersIcon fontSize="small" />,
    technologies: ['React 18', 'TypeScript', 'Vite', 'Material UI', 'TanStack Query', 'Axios'],
    color: '#38bdf8',
  },
  {
    name: 'Backend Tier',
    category: 'REST Microservice',
    icon: <DnsIcon fontSize="small" />,
    technologies: ['Node.js', 'Express.js', 'TypeScript', 'Helmet', 'CORS', 'Dotenv'],
    color: '#818cf8',
  },
  {
    name: 'Database Tier',
    category: 'Data Persistence',
    icon: <StorageIcon fontSize="small" />,
    technologies: ['MySQL 8.x', 'Prisma ORM', 'utf8mb4', 'InnoDB Engine'],
    color: '#34d399',
  },
  {
    name: 'Infrastructure Tier',
    category: 'Container Orchestration',
    icon: <CloudQueueIcon fontSize="small" />,
    technologies: ['Docker', 'Docker Compose', 'Multi-stage Builds', 'Bridge Network'],
    color: '#fbbf24',
  },
];

export const TechStackCard: React.FC = () => {
  return (
    <Card sx={{ mt: 4 }}>
      <CardContent sx={{ p: 3 }}>
        <Typography variant="h6" fontWeight={700} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LayersIcon sx={{ color: 'primary.main' }} /> Platform Architecture Stack (Phase 1)
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Verified production foundations adhering to architectural separation of concerns and zero-domain-bloat principles.
        </Typography>

        <Grid container spacing={2}>
          {STACK_TIERS.map((tier) => (
            <Grid item xs={12} sm={6} md={3} key={tier.name}>
              <Box
                sx={{
                  p: 2,
                  borderRadius: 2,
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1.5,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box
                    sx={{
                      width: 28,
                      height: 28,
                      borderRadius: 1,
                      backgroundColor: `${tier.color}20`,
                      color: tier.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {tier.icon}
                  </Box>
                  <div>
                    <Typography variant="subtitle2" fontWeight={700} sx={{ lineHeight: 1.2 }}>
                      {tier.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {tier.category}
                    </Typography>
                  </div>
                </Box>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.6, mt: 'auto' }}>
                  {tier.technologies.map((tech) => (
                    <Chip
                      key={tech}
                      label={tech}
                      size="small"
                      sx={{
                        fontSize: '0.72rem',
                        height: 22,
                        backgroundColor: 'rgba(255, 255, 255, 0.06)',
                        color: 'text.secondary',
                      }}
                    />
                  ))}
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </Card>
  );
};
