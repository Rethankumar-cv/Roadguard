import React, { useState, useEffect } from 'react';
import { Card, Typography, Box, List, ListItem, Chip, Divider, Avatar } from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';

const API = 'http://localhost:5000';

const TYPE_COLORS = {
    'Overspeeding': '#EF4444', // Danger Red
    'Wrong-Side Driving': '#F59E0B', // Warning Orange
    'Improper Lane Usage': '#38BDF8', // Info Blue
    'Helmetless Driving': '#A855F7', // Purple
    'No Seatbelt': '#F59E0B', // Yellow/Orange
    'Illegal Racing': '#EF4444',
    'Triple Riding': '#A855F7',
    'Overloading': '#38BDF8'
};

export default function ViolationFeedWidget() {
    const [violations, setViolations] = useState([]);

    useEffect(() => {
        const fetchLive = async () => {
            try {
                const res = await fetch(`${API}/analytics/live-feed`);
                const data = await res.json();
                setViolations(Array.isArray(data) ? data.slice(0, 15) : []);
            } catch (err) {
                console.error('Failed to fetch live feed for widget', err);
            }
        };
        fetchLive();
        const id = setInterval(fetchLive, 5000);
        return () => clearInterval(id);
    }, []);

    return (
        <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 0 }}>
            <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #334155' }}>
                <Typography variant="h6" sx={{ color: '#E2E8F0' }}>Live Violation Feed</Typography>
                <Chip
                    label="ATHENA LIVE"
                    size="small"
                    sx={{
                        bgcolor: 'rgba(99, 102, 241, 0.1)',
                        color: '#6366F1',
                        fontWeight: 700,
                        fontSize: '10px',
                        border: '1px solid rgba(99, 102, 241, 0.3)'
                    }}
                />
            </Box>

            <List sx={{ flexGrow: 1, overflowY: 'auto', p: 0, '&::-webkit-scrollbar': { width: '4px' }, '&::-webkit-scrollbar-thumb': { bgcolor: '#334155', borderRadius: '4px' } }}>
                {violations.map((v, i) => {
                    const vColor = TYPE_COLORS[v.violation_type] || '#94A3B8';

                    return (
                        <React.Fragment key={i}>
                            <ListItem sx={{ p: 2, display: 'flex', alignItems: 'flex-start', gap: 2, '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
                                <Avatar sx={{ bgcolor: `${vColor}15`, color: vColor, width: 40, height: 40, border: `1px solid ${vColor}30` }}>
                                    <DirectionsCarIcon fontSize="small" />
                                </Avatar>

                                <Box sx={{ flexGrow: 1 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                                        <Typography variant="body1" sx={{ color: '#E2E8F0', fontWeight: 600, fontFamily: 'monospace', letterSpacing: 0.5 }}>
                                            {v.vehicle_number}
                                        </Typography>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#94A3B8' }}>
                                            <AccessTimeIcon sx={{ fontSize: 14 }} />
                                            <Typography variant="caption">{new Date(v.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Typography>
                                        </Box>
                                    </Box>
                                    <Typography variant="body2" sx={{ color: '#94A3B8', mb: 1 }}>{v.location} (Cam: {v.camera_id})</Typography>
                                    <Chip
                                        label={v.violation_type}
                                        size="small"
                                        sx={{
                                            bgcolor: `${vColor}15`,
                                            color: vColor,
                                            fontWeight: 600,
                                            fontSize: '11px',
                                            border: `1px solid ${vColor}40`,
                                            borderRadius: '6px'
                                        }}
                                    />
                                </Box>
                            </ListItem>
                            {i < violations.length - 1 && <Divider sx={{ borderColor: '#1E293B' }} />}
                        </React.Fragment>
                    );
                })}
                {violations.length === 0 && (
                    <Box sx={{ p: 4, textAlign: 'center', color: '#64748B' }}>
                        <Typography variant="body2">No live violations detected</Typography>
                    </Box>
                )}
            </List>
        </Card>
    );
}
