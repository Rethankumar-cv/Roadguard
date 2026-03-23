import React from 'react';
import { Card, Box, Typography } from '@mui/material';

export default function StatCard({ title, value, icon, color, subtext }) {
    return (
        <Card sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                    sx={{
                        display: 'flex', p: 1, borderRadius: '8px',
                        bgcolor: `${color}15`, color: color
                    }}
                >
                    {icon}
                </Box>
                <Typography variant="body2" sx={{ color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    {title}
                </Typography>
            </Box>
            <Box sx={{ mt: 1 }}>
                <Typography variant="h4" sx={{ color: '#E2E8F0', fontWeight: 700 }}>
                    {value}
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748B', mt: 0.5, display: 'block' }}>
                    {subtext}
                </Typography>
            </Box>
        </Card>
    );
}
