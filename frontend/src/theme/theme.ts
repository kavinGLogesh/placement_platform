import { createTheme, responsiveFontSizes } from '@mui/material/styles';

let theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1765B5',
      light: '#3B82D0',
      dark: '#104B91',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#1685C4',
      light: '#43A1D7',
      dark: '#12659A',
      contrastText: '#ffffff',
    },
    success: {
      main: '#15803d', // Restrained Professional Green (Emerald 700)
      light: '#16a34a',
      dark: '#14532d',
      contrastText: '#ffffff',
    },
    error: {
      main: '#b91c1c', // Controlled Crimson Red (Red 700)
      light: '#dc2626',
      dark: '#7f1d1d',
      contrastText: '#ffffff',
    },
    warning: {
      main: '#b45309', // Muted Amber (Amber 700)
      light: '#d97706',
      dark: '#78350f',
      contrastText: '#ffffff',
    },
    info: {
      main: '#267DCE',
      light: '#4B96DE',
      dark: '#1D5FA7',
      contrastText: '#ffffff',
    },
    background: {
      default: '#EDF2FF',
      paper: '#ffffff',
    },
    text: {
      primary: '#14264B',
      secondary: '#5E7191',
    },
    divider: '#DCE6F5',
  },
  typography: {
    fontFamily:
      '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
    h1: {
      fontWeight: 700,
      letterSpacing: '-0.025em',
      color: '#14264B',
    },
    h2: {
      fontWeight: 700,
      letterSpacing: '-0.02em',
      color: '#14264B',
    },
    h3: {
      fontWeight: 700,
      letterSpacing: '-0.02em',
      color: '#14264B',
    },
    h4: {
      fontWeight: 700,
      letterSpacing: '-0.02em',
      color: '#14264B',
      fontSize: '1.45rem',
      lineHeight: 1.25,
    },
    h5: {
      fontWeight: 600,
      letterSpacing: '-0.015em',
      color: '#14264B',
      fontSize: '1.2rem',
      lineHeight: 1.3,
    },
    h6: {
      fontWeight: 600,
      letterSpacing: '-0.01em',
      color: '#14264B',
      fontSize: '1rem',
      lineHeight: 1.35,
    },
    subtitle1: {
      fontWeight: 600,
      color: '#33466A',
      fontSize: '0.9rem',
    },
    subtitle2: {
      fontWeight: 600,
      color: '#526584',
      fontSize: '0.825rem',
    },
    body1: {
      color: '#33466A',
      fontSize: '0.875rem',
      lineHeight: 1.55,
    },
    body2: {
      color: '#526584',
      fontSize: '0.825rem',
      lineHeight: 1.5,
    },
    caption: {
      color: '#7182A0',
      fontSize: '0.75rem',
      lineHeight: 1.4,
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
      letterSpacing: '0.005em',
    },
  },
  shape: {
    borderRadius: 6,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#EDF2FF',
          color: '#14264B',
          minHeight: '100vh',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: '#ffffff',
          borderRadius: 18,
          border: '1px solid #DCE6F5',
          boxShadow: '0 10px 28px rgba(44, 91, 156, 0.06)',
          transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
          '&:hover': {
            borderColor: '#C5D7EF',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
        elevation0: {
          border: '1px solid #DCE6F5',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          padding: '6px 16px',
          boxShadow: 'none',
          fontWeight: 600,
          fontSize: '0.84rem',
          transition: 'all 0.15s ease-in-out',
          '&:hover': {
            boxShadow: 'none',
          },
        },
        containedPrimary: {
          backgroundColor: '#1765B5',
          color: '#ffffff',
          '&:hover': {
            backgroundColor: '#104B91',
          },
        },
        outlinedPrimary: {
          borderColor: '#C7D7EC',
          color: '#1765B5',
          backgroundColor: '#ffffff',
          '&:hover': {
            borderColor: '#1765B5',
            backgroundColor: '#F3F7FE',
          },
        },
        outlinedSecondary: {
          borderColor: '#D1DEF0',
          color: '#526584',
          backgroundColor: '#ffffff',
          '&:hover': {
            borderColor: '#8293B0',
            backgroundColor: '#EDF2FF',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          borderRadius: 4,
          fontSize: '0.74rem',
          height: 24,
        },
        outlined: {
          borderColor: '#D1DEF0',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#ffffff',
          color: '#14264B',
          borderBottom: '1px solid #DCE6F5',
          boxShadow: 'none',
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          backgroundColor: '#EDF2FF',
          '& .MuiTableCell-head': {
            backgroundColor: '#EDF2FF',
            color: '#526584',
            fontWeight: 600,
            fontSize: '0.74rem',
            borderBottom: '1px solid #DCE6F5',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            padding: '10px 16px',
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: '1px solid #E7EEFA',
          color: '#33466A',
          fontSize: '0.84rem',
          padding: '11px 16px',
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: '#EDF2FF',
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: '#ffffff',
          borderRadius: 6,
          border: '1px solid #DCE6F5',
          boxShadow:
            '0 12px 24px -4px rgba(20, 38, 75, 0.08), 0 4px 6px -2px rgba(20, 38, 75, 0.03)',
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          backgroundColor: '#ffffff',
          color: '#14264B',
          fontWeight: 600,
          fontSize: '1.05rem',
          borderBottom: '1px solid #DCE6F5',
          padding: '16px 20px',
        },
      },
    },
    MuiDialogContent: {
      styleOverrides: {
        root: {
          color: '#33466A',
          padding: '20px !important',
        },
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: {
          backgroundColor: '#EDF2FF',
          borderTop: '1px solid #DCE6F5',
          padding: '12px 20px',
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          color: '#526584',
          fontWeight: 500,
          fontSize: '0.85rem',
          '&.Mui-focused': {
            color: '#1765B5',
            fontWeight: 600,
          },
          '&.Mui-error': {
            color: '#b91c1c',
            fontWeight: 600,
          },
          '&.MuiInputLabel-shrink': {
            backgroundColor: '#ffffff',
            padding: '0 4px',
            borderRadius: '2px',
            fontWeight: 600,
            zIndex: 2,
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          backgroundColor: '#ffffff',
          color: '#14264B',
          fontSize: '0.85rem',
          fontWeight: 400,
          '& fieldset': {
            borderColor: '#D1DEF0',
          },
          '&:hover fieldset': {
            borderColor: '#8293B0',
          },
          '&.Mui-focused fieldset': {
            borderColor: '#1765B5',
            borderWidth: '1.5px',
          },
          '&.Mui-error fieldset': {
            borderColor: '#b91c1c',
            borderWidth: '1.5px',
          },
          '&.Mui-disabled': {
            backgroundColor: '#EDF2FF',
            color: '#8293B0',
            '& fieldset': {
              borderColor: '#DCE6F5',
            },
          },
        },
        input: {
          color: '#14264B',
          padding: '9px 13px',
          '&::placeholder': {
            color: '#8293B0',
            opacity: 1,
          },
        },
      },
    },
    MuiFormHelperText: {
      styleOverrides: {
        root: {
          color: '#7182A0',
          fontSize: '0.74rem',
          marginTop: '3px',
          '&.Mui-error': {
            color: '#b91c1c',
            fontWeight: 500,
          },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: {
          minHeight: 40,
        },
        indicator: {
          backgroundColor: '#1765B5',
          height: 2,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          fontSize: '0.85rem',
          minHeight: 40,
          padding: '6px 16px',
          color: '#7182A0',
          '&.Mui-selected': {
            color: '#1765B5',
            fontWeight: 600,
          },
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          fontSize: '0.84rem',
          color: '#33466A',
          fontWeight: 400,
          padding: '8px 14px',
          '&.Mui-selected': {
            backgroundColor: '#f0f4f9',
            color: '#1765B5',
            fontWeight: 600,
            '&:hover': {
              backgroundColor: '#e5ecf5',
            },
          },
          '&:hover': {
            backgroundColor: '#EDF2FF',
          },
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          fontSize: '0.84rem',
          border: '1px solid',
        },
        standardSuccess: {
          backgroundColor: '#f0fdf4',
          color: '#14532d',
          borderColor: '#bbf7d0',
          '& .MuiAlert-icon': { color: '#15803d' },
        },
        standardError: {
          backgroundColor: '#fef2f2',
          color: '#7f1d1d',
          borderColor: '#fecaca',
          '& .MuiAlert-icon': { color: '#b91c1c' },
        },
        standardWarning: {
          backgroundColor: '#fffbeb',
          color: '#78350f',
          borderColor: '#fde68a',
          '& .MuiAlert-icon': { color: '#b45309' },
        },
        standardInfo: {
          backgroundColor: '#eff6ff',
          color: '#3B82D0',
          borderColor: '#bfdbfe',
          '& .MuiAlert-icon': { color: '#267D86' },
        },
      },
    },
  },
});

theme = responsiveFontSizes(theme);

export default theme;
