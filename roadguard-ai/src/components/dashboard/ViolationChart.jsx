import React, { useState, useEffect } from 'react';
import { Card, Typography, Box } from '@mui/material';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const API = 'http://localhost:5000';

const VIOLATION_COLORS_MAP = {
    'Overspeeding': '#EF4444',
    'Wrong-Side Driving': '#F59E0B',
    'Helmetless Driving': '#A855F7',
    'No Seatbelt': '#F59E0B',
    'Illegal Racing': '#EF4444',
    'Triple Riding': '#A855F7',
    'Overloading': '#38BDF8',
    'Improper Lane Usage': '#38BDF8',
    'overspeed': '#EF4444',
    'helmetless': '#A855F7',
    'signal_jump': '#F59E0B',
};

const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        return (
            <Box sx={{ bgcolor: 'rgba(30,41,59,0.95)', border: '1px solid #334155', borderRadius: '8px', p: 1.5, color: '#E2E8F0' }}>
                <Typography variant="caption" sx={{ color: '#94A3B8' }}>{payload[0].name}</Typography>
                <Typography variant="body2" sx={{ color: payload[0].payload.color || '#E2E8F0', fontWeight: 600, mt: 0.5 }}>
                    Count: {payload[0].value}
                </Typography>
            </Box>
        );
    }
    return null;
};

export default function ViolationChart() {
    const [data, setData] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch(`${API}/analytics/violations`);
                const json = await res.json();
                if (Array.isArray(json)) {
                    setData(json.map(d => ({
                        name: d.violation_type,
                        value: d.count,
                        color: VIOLATION_COLORS_MAP[d.violation_type] || '#94A3B8'
                    })));
                }
            } catch (err) {
                console.error('Fetch violations chart err', err);
            }
        };
        fetchData();
        const id = setInterval(fetchData, 15000);
        return () => clearInterval(id);
    }, []);

    return (
        <Card sx={{ minHeight: 280, p: '20px', display: 'flex', flexDirection: 'column', width: '100%' }}>
            <Typography variant="h6" sx={{ color: '#E2E8F0', mb: 2 }}>Violation Types</Typography>
            <Box sx={{ flexGrow: 1, height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={90}
                            paddingAngle={4}
                            dataKey="value"
                            stroke="none"
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend
                            verticalAlign="bottom"
                            height={36}
                            iconType="circle"
                            iconSize={8}
                            formatter={(value) => <span style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 500 }}>{value}</span>}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </Box>
        </Card>
    );
}
