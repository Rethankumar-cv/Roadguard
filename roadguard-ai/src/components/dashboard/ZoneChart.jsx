import React, { useState, useEffect } from 'react';
import { Card, Typography, Box } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts';

const API = 'http://localhost:5000';

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <Box sx={{ bgcolor: 'rgba(30,41,59,0.95)', border: '1px solid #334155', borderRadius: '8px', p: 1.5, color: '#E2E8F0' }}>
                <Typography variant="caption" sx={{ color: '#94A3B8' }}>{label}</Typography>
                <Typography variant="body2" sx={{ color: '#38BDF8', fontWeight: 600, mt: 0.5 }}>Violations: {payload[0].value}</Typography>
            </Box>
        );
    }
    return null;
};

export default function ZoneChart() {
    const [data, setData] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch(`${API}/analytics/locations`);
                const json = await res.json();
                if (Array.isArray(json)) setData(json);
            } catch (err) {
                console.error('Fetch locations chart err', err);
            }
        };
        fetchData();
        const id = setInterval(fetchData, 15000);
        return () => clearInterval(id);
    }, []);

    return (
        <Card sx={{ minHeight: 280, p: '20px', display: 'flex', flexDirection: 'column', width: '100%' }}>
            <Typography variant="h6" sx={{ color: '#E2E8F0', mb: 2 }}>Top Violation Zones</Typography>
            <Box sx={{ flexGrow: 1, height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 20, right: 10, left: -20, bottom: 0 }} barSize={40}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                        <XAxis dataKey="location" tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                        <Bar
                            dataKey="violations"
                            fill="#38BDF8"
                            radius={[6, 6, 0, 0]}
                            style={{ filter: 'drop-shadow(0 4px 8px rgba(56, 189, 248, 0.3))' }}
                        >
                            <LabelList dataKey="violations" position="top" fill="#E2E8F0" fontSize={11} fontWeight={600} />
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </Box>
        </Card>
    );
}
