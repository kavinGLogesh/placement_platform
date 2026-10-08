import { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Typography, Button, Paper, Alert } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import RefreshIcon from '@mui/icons-material/Refresh';
import HomeIcon from '@mui/icons-material/Home';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Unhandled React Error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleNavigateHome = () => {
    window.location.href = '/admin/dashboard';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60vh',
            p: 3,
          }}
        >
          <Paper
            elevation={0}
            sx={{
              p: 4,
              maxWidth: 600,
              width: '100%',
              borderRadius: 3,
              border: '1px solid #fee2e2',
              backgroundColor: '#fffaf0',
              textAlign: 'center',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
            }}
          >
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                bgcolor: '#fee2e2',
                color: '#dc2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 2,
              }}
            >
              <ErrorOutlineIcon sx={{ fontSize: 36 }} />
            </Box>

            <Typography variant="h5" fontWeight={700} color="#14264B" gutterBottom>
              Something Went Wrong
            </Typography>

            <Typography variant="body2" color="#7182A0" sx={{ mb: 3 }}>
              An unexpected error occurred while rendering this component. The system caught this
              error gracefully to prevent a blank screen.
            </Typography>

            {this.state.error && (
              <Alert
                severity="error"
                sx={{
                  textAlign: 'left',
                  mb: 3,
                  fontSize: '0.82rem',
                  fontFamily: 'monospace',
                  overflowX: 'auto',
                }}
              >
                {this.state.error.message || String(this.state.error)}
              </Alert>
            )}

            <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button
                variant="outlined"
                color="inherit"
                startIcon={<RefreshIcon />}
                onClick={this.handleReload}
                sx={{ textTransform: 'none', fontWeight: 600 }}
              >
                Reload Page
              </Button>
              <Button
                variant="outlined"
                color="primary"
                onClick={this.handleReset}
                sx={{ textTransform: 'none', fontWeight: 600 }}
              >
                Try Again
              </Button>
              <Button
                variant="contained"
                color="primary"
                startIcon={<HomeIcon />}
                onClick={this.handleNavigateHome}
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  bgcolor: '#318992',
                  '&:hover': { bgcolor: '#267D86' },
                }}
              >
                Go to Dashboard
              </Button>
            </Box>
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}
