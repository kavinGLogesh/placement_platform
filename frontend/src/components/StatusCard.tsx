import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  CircularProgress,
  Alert,
  AlertTitle,
  Chip,
  Divider,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import RefreshIcon from '@mui/icons-material/Refresh';
import WifiTetheringIcon from '@mui/icons-material/WifiTethering';
import { HealthCheckState } from '../hooks/useHealthCheck.js';
import { formatTimestamp, formatLatency } from '../utils/formatters.js';

interface StatusCardProps {
  health: HealthCheckState;
}

export const StatusCard: React.FC<StatusCardProps> = ({ health }) => {
  const { data, isLoading, isError, error, latencyMs, lastChecked, refetch, isFetching } = health;

  return (
    <Card
      sx={{
        overflow: 'hidden',
        position: 'relative',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 4,
          background: isError
            ? 'linear-gradient(90deg, #ef4444, #f87171)'
            : isLoading
            ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
            : 'linear-gradient(90deg, #10b981, #06b6d4)',
        },
      }}
    >
      <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'flex-start', sm: 'center' },
            justifyContent: 'space-between',
            gap: 2,
            mb: 3,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: isError
                  ? 'rgba(239, 68, 68, 0.15)'
                  : isLoading
                  ? 'rgba(245, 158, 11, 0.15)'
                  : 'rgba(16, 185, 129, 0.15)',
                color: isError ? 'error.main' : isLoading ? 'warning.main' : 'success.main',
              }}
            >
              {isLoading ? (
                <CircularProgress size={26} color="inherit" />
              ) : isError ? (
                <ErrorOutlineIcon sx={{ fontSize: 32 }} />
              ) : (
                <CheckCircleIcon sx={{ fontSize: 32 }} />
              )}
            </Box>
            <div>
              <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1.2 }}>
                Service Integration Link
              </Typography>
              <Typography variant="h5" fontWeight={700} sx={{ color: 'text.primary' }}>
                Backend REST API Link
              </Typography>
            </div>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, alignSelf: { xs: 'stretch', sm: 'auto' } }}>
            <Button
              id="refresh-health-btn"
              variant="outlined"
              size="medium"
              startIcon={
                <RefreshIcon
                  sx={{
                    animation: isFetching ? 'spin 1s linear infinite' : 'none',
                    '@keyframes spin': {
                      '0%': { transform: 'rotate(0deg)' },
                      '100%': { transform: 'rotate(360deg)' },
                    },
                  }}
                />
              }
              onClick={() => refetch()}
              disabled={isFetching}
              sx={{ flexGrow: { xs: 1, sm: 0 } }}
            >
              {isFetching ? 'Pinging...' : 'Ping API'}
            </Button>
          </Box>
        </Box>

        {/* LOADING STATE */}
        {isLoading && (
          <Box sx={{ py: 3, textAlign: 'center' }}>
            <CircularProgress size={36} sx={{ color: 'primary.light', mb: 2 }} />
            <Typography variant="body1" color="text.secondary">
              Connecting to Express Backend API...
            </Typography>
          </Box>
        )}

        {/* ERROR STATE */}
        {isError && (
          <Alert
            severity="error"
            variant="outlined"
            sx={{
              backgroundColor: 'rgba(239, 68, 68, 0.08)',
              borderColor: 'rgba(239, 68, 68, 0.3)',
              mb: 2,
            }}
          >
            <AlertTitle sx={{ fontWeight: 700 }}>Connection Error</AlertTitle>
            <Typography variant="body2" sx={{ mb: 1 }}>
              Unable to establish communication with the backend service at{' '}
              <code>{import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}/health</code>.
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Error: {error?.message || 'ECONNREFUSED / Network Failure'}. Ensure the backend service is running on port 5000.
            </Typography>
          </Alert>
        )}

        {/* SUCCESS STATE - Required Text Displayed */}
        {!isLoading && !isError && data && (
          <Box>
            <Box
              sx={{
                p: 2.5,
                borderRadius: 2,
                backgroundColor: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                display: 'flex',
                flexDirection: { xs: 'column', md: 'row' },
                alignItems: { xs: 'flex-start', md: 'center' },
                justifyContent: 'space-between',
                gap: 2,
                mb: 3,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                  sx={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    backgroundColor: '#10b981',
                    boxShadow: '0 0 10px #10b981',
                    animation: 'pulse 2s infinite',
                    '@keyframes pulse': {
                      '0%': { transform: 'scale(0.95)', boxShadow: '0 0 0 0 rgba(16, 185, 129, 0.7)' },
                      '70%': { transform: 'scale(1)', boxShadow: '0 0 0 10px rgba(16, 185, 129, 0)' },
                      '100%': { transform: 'scale(0.95)', boxShadow: '0 0 0 0 rgba(16, 185, 129, 0)' },
                    },
                  }}
                />
                <Typography
                  id="backend-status-message"
                  variant="h6"
                  sx={{
                    fontWeight: 700,
                    color: '#34d399',
                    letterSpacing: '-0.01em',
                  }}
                >
                  Backend connected successfully.
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Chip
                  icon={<WifiTetheringIcon />}
                  label={`Latency: ${formatLatency(latencyMs)}`}
                  size="small"
                  color="success"
                  variant="filled"
                  sx={{ fontWeight: 600 }}
                />
                <Chip
                  label="HTTP 200 OK"
                  size="small"
                  sx={{
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    color: 'text.secondary',
                    fontWeight: 600,
                  }}
                />
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* RESPONSE PAYLOAD INSPECTOR */}
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, fontWeight: 600 }}>
                RAW RESPONSE PAYLOAD (GET /api/health)
              </Typography>
              <Box
                component="pre"
                sx={{
                  m: 0,
                  p: 2,
                  borderRadius: 1.5,
                  backgroundColor: '#070a13',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  color: '#38bdf8',
                  fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                  fontSize: '0.85rem',
                  overflowX: 'auto',
                }}
              >
                {JSON.stringify(data, null, 2)}
              </Box>
            </Box>
          </Box>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 3, pt: 2, borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
          <Typography variant="caption" color="text.secondary">
            Last Checked: {formatTimestamp(lastChecked)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Protocol: REST / JSON
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};
