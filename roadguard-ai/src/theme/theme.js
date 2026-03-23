import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
    palette: {
        mode: 'dark',
        primary: { main: '#6366F1' },
        background: {
            default: '#0F172A',
            paper: '#1E293B',
        },
        text: {
            primary: '#E2E8F0',
            secondary: '#94A3B8',
        },
        success: { main: '#22C55E' },
        warning: { main: '#F59E0B' },
        error: { main: '#EF4444' },
        info: { main: '#38BDF8' },
        divider: '#334155',
    },
    typography: {
        fontFamily: '"Inter", sans-serif',
        h1: { fontSize: '24px', fontWeight: 600 },
        h2: { fontSize: '20px', fontWeight: 600 },
        h6: { fontSize: '16px', fontWeight: 600 },
        body1: { fontSize: '14px' },
        body2: { fontSize: '12px' },
    },
    components: {
        MuiCard: {
            styleOverrides: {
                root: {
                    borderRadius: '16px',
                    border: '1px solid #334155',
                    padding: '20px',
                    backgroundColor: '#1E293B',
                    backgroundImage: 'none',
                    boxShadow: 'none',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                    '&:hover': {
                        transform: 'translateY(-3px)',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                    },
                },
            },
        },
        MuiCssBaseline: {
            styleOverrides: {
                body: {
                    backgroundColor: '#0F172A',
                    color: '#E2E8F0',
                },
                '*::-webkit-scrollbar': {
                    width: '6px',
                    height: '6px',
                },
                '*::-webkit-scrollbar-thumb': {
                    backgroundColor: '#334155',
                    borderRadius: '3px',
                },
            },
        },
    },
});
