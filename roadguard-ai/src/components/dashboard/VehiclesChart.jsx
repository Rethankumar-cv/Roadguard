import React, { useState, useEffect } from 'react';
import { Card, Typography, Box } from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const API = 'http://localhost:5000';

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <Box sx={{ bgcolor: 'rgba(30,41,59,0.95)', border: '1px solid #334155', borderRadius: '8px', p: 1.5, color: '#E2E8F0' }}>
                <Typography variant="caption" sx={{ color: '#94A3B8', fontFamily: 'monospace' }}>{label}:00</Typography>
                <Typography variant="body2" sx={{ color: '#22C55E', fontWeight: 600, mt: 0.5 }}>Vehicles: {payload[0].value}</Typography>
            </Box>
        );
    }
    return null;
};

export default function VehiclesChart() {
    const [data, setData] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch(`${API}/analytics/hourly`);
                const json = await res.json();
                if (Array.isArray(json)) setData(json);
            } catch (err) {
                console.error('Fetch vehicles chart err', err);
            }
        };
        fetchData();
        const id = setInterval(fetchData, 15000);
        return () => clearInterval(id);
    }, []);

    return (
        <Card sx={{ minHeight: 280, p: '20px', display: 'flex', flexDirection: 'column', width: '100%' }}>
            <Typography variant="h6" sx={{ color: '#E2E8F0', mb: 2 }}>Vehicles Per Hour</Typography>
            <Box sx={{ flexGrow: 1, height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={true} />
                        <XAxis dataKey="hour" tick={{ fill: '#94A3B8', fontSize: 11 }} tickFormatter={v => `${v}h`} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <Line
                            type="monotone"
                            dataKey="vehicles"
                            stroke="#22C55E"
                            strokeWidth={4}
                            dot={false}
                            activeDot={{ r: 6, fill: '#22C55E', strokeWidth: 0 }}
                            style={{ filter: 'drop-shadow(0 4px 10px rgba(34, 197, 94, 0.4))' }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </Box>
        </Card>
    );
}
