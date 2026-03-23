import React, { useState, useEffect } from 'react';
import { AppBar, Toolbar, Typography, Box, Chip, Avatar } from '@mui/material';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import DirectionsCarFilledIcon from '@mui/icons-material/DirectionsCarFilled';

export default function TopNav() {
    const [time, setTime] = useState('');

    useEffect(() => {
        const tick = () => {
            const now = new Date();
            setTime(now.toLocaleTimeString('en-IN', { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        };
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, []);

    return (
        <AppBar position="sticky" sx={{ bgcolor: '#020617', borderBottom: '1px solid #334155', boxShadow: 'none' }}>
            <Toolbar sx={{ justifyContent: 'space-between', minHeight: '64px' }}>

                {/* Left Side */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ bgcolor: '#6366F1', width: 36, height: 36 }}>
                        <DirectionsCarFilledIcon fontSize="small" />
                    </Avatar>
                    <Typography variant="h6" sx={{ color: '#E2E8F0', display: { xs: 'none', sm: 'block' } }}>
                        RoadGuard AI Traffic Command Center
                    </Typography>
                </Box>

                {/* Center - Location */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LocationOnIcon sx={{ color: '#38BDF8', fontSize: 20 }} />
                    <Typography variant="body2" sx={{ color: '#E2E8F0', fontWeight: 500 }}>
                        GD Naidu Bridge – Coimbatore
                    </Typography>
                </Box>

                {/* Right Side */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Chip
                        label="LIVE"
                        size="small"
                        sx={{
                            bgcolor: 'rgba(34, 197, 94, 0.1)',
                            color: '#22C55E',
                            fontWeight: 'bold',
                            border: '1px solid rgba(34, 197, 94, 0.3)',
                            '& .MuiChip-icon': { color: '#22C55E' }
                        }}
                        icon={<Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#22C55E', ml: 1, animation: 'pulse 2s infinite' }} />}
                    />
                    <Typography variant="body2" sx={{ color: '#94A3B8', fontFamily: 'monospace', letterSpacing: 1 }}>
                        {time}
                    </Typography>
                    <Avatar sx={{ width: 32, height: 32, bgcolor: '#1E293B', border: '1px solid #334155', color: '#E2E8F0', fontSize: 14 }}>
                        PO
                    </Avatar>
                </Box>

            </Toolbar>
        </AppBar>
    );
}
