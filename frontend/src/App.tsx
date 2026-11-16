import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from './theme/theme.js';
import { AppRoutes } from './routes/AppRoutes.js';
import { AuthProvider } from './context/AuthContext.js';
import { ErrorBoundary } from './components/common/ErrorBoundary.js';

// TanStack Query Client instance with production defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5000,
    },
  },
});

// Automatic HTTPS redirection for LAN IP access so physical camera is enabled (requires Secure Context)
if (
  typeof window !== 'undefined' &&
  window.location.protocol === 'http:' &&
  !['localhost', '127.0.0.1'].includes(window.location.hostname)
) {
  window.location.href = window.location.href.replace('http:', 'https:');
}

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
