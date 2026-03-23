import React, { useState, useEffect } from 'react';
import { Card, Typography, Box, List, ListItem, Chip, Divider, Avatar } from '@mui/material';
import VideocamIcon from '@mui/icons-material/Videocam';

const API = 'http://localhost:5000';

const LOCATION_MAP = {
    CAM01: 'GD Naidu Bridge',
    CAM02: 'Avinashi Road',
    CAM03: 'Gandhipuram',
    CAM04: 'Singanallur',
    CAM05: 'Ukkadam Jn.',
    CAM06: 'RS Puram',
};

export default function CameraStatusWidget() {
    const [cameras, setCameras] = useState([
        { id: 'CAM01' }, { id: 'CAM02' }, { id: 'CAM03' },
        { id: 'CAM04' }, { id: 'CAM05' }, { id: 'CAM06' },
    ]);

    useEffect(() => {
        const fetchCameras = async () => {
            try {
                const res = await fetch(`${API}/analytics/cameras`);
                const data = await res.json();
                if (Array.isArray(data) && data.length > 0) {
                    const enriched = data.map(cam => ({
                        id: cam.camera_id || cam.id,
                        location: LOCATION_MAP[cam.camera_id || cam.id] || 'Unknown Location',
                        status: 'Online',
                    }));
                    setCameras(enriched);
                }
            } catch (err) {
                console.error('Fetch cameras err', err);
            }
        };
        fetchCameras();
        const id = setInterval(fetchCameras, 15000);
        return () => clearInterval(id);
    }, []);

    const onlineCount = cameras.filter(c => c.status !== 'Offline').length;

    return (
        <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 0 }}>
            <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #334155' }}>
                <Typography variant="h6" sx={{ color: '#E2E8F0' }}>Active Cameras</Typography>
                <Typography variant="body2" sx={{ color: '#94A3B8', fontWeight: 600 }}>
                    <Box component="span" sx={{ color: onlineCount === cameras.length ? '#22C55E' : '#F59E0B' }}>{onlineCount}/{cameras.length}</Box> ONLINE
                </Typography>
            </Box>

            <List sx={{ flexGrow: 1, overflowY: 'auto', p: 0 }}>
                {cameras.map((cam, i) => (
                    <React.Fragment key={cam.id || i}>
                        <ListItem sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
                            <Avatar sx={{ bgcolor: 'rgba(34, 197, 94, 0.1)', color: '#22C55E', width: 36, height: 36, border: '1px solid rgba(34, 197, 94, 0.3)' }}>
                                <VideocamIcon fontSize="small" />
                            </Avatar>
                            <Box sx={{ flexGrow: 1 }}>
                                <Typography variant="body1" sx={{ color: '#E2E8F0', fontWeight: 600 }}>
                                    {cam.id} – {cam.location || LOCATION_MAP[cam.id]}
                                </Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                    <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: cam.status === 'Offline' ? '#EF4444' : '#22C55E' }} />
                                    <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 500 }}>
                                        {cam.status || 'Online'}
                                    </Typography>
                                </Box>
                            </Box>
                        </ListItem>
                        {i < cameras.length - 1 && <Divider sx={{ borderColor: '#1E293B' }} />}
                    </React.Fragment>
                ))}
            </List>
        </Card>
    );
}
