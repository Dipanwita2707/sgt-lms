import { createTheme } from '@mui/material/styles';

export const getTheme = (mode = 'light') =>
  createTheme({
    breakpoints: {
      values: {
        xs: 0,
        sm: 600,
        md: 900,
        lg: 1200,
        xl: 1536,
      },
    },
    palette: {
      mode,
      primary: {
        main: '#005b96',        // Primary Blue
        dark: '#011f4b',        // Primary Dark
        light: '#6497b1',       // Light Blue
        contrastText: '#ffffff',
      },
      secondary: {
        main: '#03396c',        // Primary Mid
        light: '#b3cde0',       // Very Light Blue
        contrastText: '#ffffff',
      },
      background: mode === 'light'
        ? {
            default: '#f8fafc',
            paper: '#ffffff',
          }
        : {
            default: '#0f172a',
            paper: '#1e293b',
          },
      text: {
        primary: mode === 'light' ? '#011f4b' : '#f8fafc',
        secondary: mode === 'light' ? '#03396c' : '#b3cde0',
      },
    },
    shape: { 
      borderRadius: 12 
    },
    typography: {
      fontFamily: '"Inter", "Roboto", "Arial", sans-serif',
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: ({ theme }) => ({
            textTransform: 'none',
            fontWeight: 600,
            borderRadius: 12,
            padding: '12px 24px',
            fontSize: '0.95rem',
            lineHeight: 1.5,
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: 'none',
            '&:hover': {
              boxShadow: '0 8px 25px rgba(0, 91, 150, 0.15)',
              transform: 'translateY(-2px)',
            },
            '&:active': {
              transform: 'translateY(0)',
              boxShadow: '0 4px 12px rgba(0, 91, 150, 0.2)',
            },
            // Responsive button sizing
            [theme.breakpoints.down('md')]: {
              padding: '10px 20px',
              fontSize: '0.9rem',
            },
            [theme.breakpoints.down('sm')]: {
              padding: '8px 16px',
              fontSize: '0.85rem',
              borderRadius: 8,
            },
          }),
          sizeSmall: ({ theme }) => ({
            padding: '8px 16px',
            fontSize: '0.85rem',
            borderRadius: 8,
            [theme.breakpoints.down('sm')]: {
              padding: '6px 12px',
              fontSize: '0.8rem',
            },
          }),
          sizeLarge: ({ theme }) => ({
            padding: '16px 32px',
            fontSize: '1.05rem',
            borderRadius: 16,
            [theme.breakpoints.down('md')]: {
              padding: '14px 28px',
              fontSize: '1rem',
            },
            [theme.breakpoints.down('sm')]: {
              padding: '12px 24px',
              fontSize: '0.95rem',
              borderRadius: 12,
            },
          }),
          contained: {
            background: 'linear-gradient(135deg, #005b96 0%, #03396c 100%)',
            color: '#ffffff',
            '&:hover': {
              background: 'linear-gradient(135deg, #03396c 0%, #011f4b 100%)',
              boxShadow: '0 12px 30px rgba(0, 91, 150, 0.25)',
            },
            '&:disabled': {
              background: 'linear-gradient(135deg, #6497b1 0%, #b3cde0 100%)',
              color: 'rgba(255, 255, 255, 0.7)',
            },
          },
          outlined: {
            borderWidth: '2px',
            borderColor: '#005b96',
            color: '#005b96',
            '&:hover': {
              borderColor: '#03396c',
              backgroundColor: 'rgba(0, 91, 150, 0.05)',
              borderWidth: '2px',
            },
          },
          text: {
            color: '#005b96',
            '&:hover': {
              backgroundColor: 'rgba(0, 91, 150, 0.05)',
            },
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            padding: '12px',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              backgroundColor: 'rgba(0, 91, 150, 0.08)',
              transform: 'scale(1.05)',
            },
            '&:active': {
              transform: 'scale(0.95)',
            },
          },
          colorPrimary: {
            color: '#005b96',
            '&:hover': {
              backgroundColor: 'rgba(0, 91, 150, 0.12)',
            },
          },
          colorSecondary: {
            color: '#03396c',
            '&:hover': {
              backgroundColor: 'rgba(3, 57, 108, 0.12)',
            },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: ({ theme }) => ({
            borderRadius: 16,
            boxShadow: '0 4px 20px rgba(0, 91, 150, 0.08)',
            border: '1px solid rgba(0, 91, 150, 0.12)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              boxShadow: '0 8px 32px rgba(0, 91, 150, 0.15)',
              transform: 'translateY(-4px)',
              borderColor: 'rgba(0, 91, 150, 0.2)',
            },
            // Responsive card styling
            [theme.breakpoints.down('md')]: {
              borderRadius: 12,
              '&:hover': {
                transform: 'translateY(-2px)',
              },
            },
            [theme.breakpoints.down('sm')]: {
              borderRadius: 8,
              boxShadow: '0 2px 12px rgba(0, 91, 150, 0.08)',
              '&:hover': {
                boxShadow: '0 4px 20px rgba(0, 91, 150, 0.12)',
                transform: 'translateY(-1px)',
              },
            },
          }),
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: ({ theme }) => ({
            '& .MuiOutlinedInput-root': {
              borderRadius: 12,
              fontSize: '0.95rem',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '& fieldset': {
                borderColor: 'rgba(0, 91, 150, 0.23)',
                borderWidth: '2px',
              },
              '&:hover fieldset': {
                borderColor: 'rgba(0, 91, 150, 0.4)',
                borderWidth: '2px',
              },
              '&.Mui-focused fieldset': {
                borderColor: '#005b96',
                borderWidth: '2px',
                boxShadow: '0 0 0 3px rgba(0, 91, 150, 0.1)',
              },
              '&.Mui-error fieldset': {
                borderColor: '#dc2626',
                borderWidth: '2px',
              },
              // Responsive input sizing
              [theme.breakpoints.down('md')]: {
                fontSize: '0.9rem',
              },
              [theme.breakpoints.down('sm')]: {
                borderRadius: 8,
                fontSize: '0.85rem',
              },
            },
            '& .MuiInputLabel-root': {
              color: '#03396c',
              fontSize: '0.95rem',
              fontWeight: 500,
              '&.Mui-focused': {
                color: '#005b96',
              },
              '&.Mui-error': {
                color: '#dc2626',
              },
              // Responsive label sizing
              [theme.breakpoints.down('md')]: {
                fontSize: '0.9rem',
              },
              [theme.breakpoints.down('sm')]: {
                fontSize: '0.85rem',
              },
            },
            '& .MuiOutlinedInput-input': {
              padding: '14px 16px',
              [theme.breakpoints.down('sm')]: {
                padding: '12px 14px',
              },
            },
            '& .MuiFormHelperText-root': {
              fontSize: '0.85rem',
              marginLeft: 4,
              marginTop: 8,
              [theme.breakpoints.down('sm')]: {
                fontSize: '0.8rem',
              },
            },
          }),
        },
      },
      MuiFormControl: {
        styleOverrides: {
          root: {
            '& .MuiInputLabel-root': {
              color: '#03396c',
              fontSize: '0.95rem',
              fontWeight: 500,
              '&.Mui-focused': {
                color: '#005b96',
              },
            },
          },
        },
      },
      MuiSelect: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: '#005b96',
              borderWidth: '2px',
              boxShadow: '0 0 0 3px rgba(0, 91, 150, 0.1)',
            },
          },
          outlined: {
            borderRadius: 12,
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: 'rgba(0, 91, 150, 0.23)',
              borderWidth: '2px',
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: 'rgba(0, 91, 150, 0.4)',
              borderWidth: '2px',
            },
          },
        },
      },
      MuiMenuItem: {
        styleOverrides: {
          root: {
            fontSize: '0.95rem',
            padding: '12px 16px',
            borderRadius: 8,
            margin: '4px 8px',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              backgroundColor: 'rgba(0, 91, 150, 0.08)',
              transform: 'translateX(4px)',
            },
            '&.Mui-selected': {
              backgroundColor: 'rgba(0, 91, 150, 0.12)',
              color: '#005b96',
              fontWeight: 600,
              '&:hover': {
                backgroundColor: 'rgba(0, 91, 150, 0.16)',
              },
            },
          },
        },
      },
      MuiCheckbox: {
        styleOverrides: {
          root: {
            borderRadius: 6,
            padding: 8,
            '&:hover': {
              backgroundColor: 'rgba(0, 91, 150, 0.04)',
            },
            '&.Mui-checked': {
              color: '#005b96',
            },
          },
        },
      },
      MuiFormControlLabel: {
        styleOverrides: {
          root: {
            marginLeft: 0,
            marginRight: 16,
            '& .MuiFormControlLabel-label': {
              fontSize: '0.95rem',
              fontWeight: 500,
              color: '#03396c',
            },
          },
        },
      },
      MuiCardContent: {
        styleOverrides: {
          root: ({ theme }) => ({
            padding: '24px',
            '&:last-child': {
              paddingBottom: '24px',
            },
            // Responsive card content padding
            [theme.breakpoints.down('md')]: {
              padding: '20px',
              '&:last-child': {
                paddingBottom: '20px',
              },
            },
            [theme.breakpoints.down('sm')]: {
              padding: '16px',
              '&:last-child': {
                paddingBottom: '16px',
              },
            },
          }),
        },
      },
      MuiCardHeader: {
        styleOverrides: {
          root: {
            padding: '20px 24px',
            '& .MuiCardHeader-title': {
              fontSize: '1.25rem',
              fontWeight: 600,
              color: '#011f4b',
            },
            '& .MuiCardHeader-subheader': {
              fontSize: '0.9rem',
              color: '#03396c',
              marginTop: '4px',
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            '&.MuiDialog-paper': {
              borderRadius: 16,
            },
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: ({ theme }) => ({
            borderRadius: 16,
            boxShadow: '0 24px 60px rgba(0, 91, 150, 0.15), 0 8px 32px rgba(0, 0, 0, 0.12)',
            border: '1px solid rgba(0, 91, 150, 0.08)',
            // Responsive dialog sizing
            [theme.breakpoints.down('md')]: {
              borderRadius: 12,
              margin: '16px',
              width: 'calc(100% - 32px)',
              maxHeight: 'calc(100% - 32px)',
            },
            [theme.breakpoints.down('sm')]: {
              borderRadius: 8,
              margin: '8px',
              width: 'calc(100% - 16px)',
              maxHeight: 'calc(100% - 16px)',
            },
          }),
        },
      },
      MuiDialogTitle: {
        styleOverrides: {
          root: {
            fontSize: '1.5rem',
            fontWeight: 600,
            padding: '20px 24px 16px',
            color: '#011f4b',
            borderBottom: '1px solid rgba(0, 91, 150, 0.08)',
          },
        },
      },
      MuiDialogContent: {
        styleOverrides: {
          root: {
            padding: '20px 24px',
            '&.MuiDialogContent-dividers': {
              borderTop: '1px solid rgba(0, 91, 150, 0.08)',
              borderBottom: '1px solid rgba(0, 91, 150, 0.08)',
            },
          },
        },
      },
      MuiDialogActions: {
        styleOverrides: {
          root: {
            padding: '16px 24px 20px',
            gap: '12px',
            borderTop: '1px solid rgba(0, 91, 150, 0.08)',
          },
        },
      },
      MuiBackdrop: {
        styleOverrides: {
          root: {
            backgroundColor: 'rgba(1, 31, 75, 0.5)',
            backdropFilter: 'blur(4px)',
          },
        },
      },
    },
  });
