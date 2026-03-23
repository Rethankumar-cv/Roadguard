import { useState, useEffect, useCallback } from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend,
    BarChart, Bar,
} from 'recharts';

const API = 'http://localhost:5000';

/* ── Fallback / mock data ── */
const MOCK_HOURLY = [
    { hour: '00', vehicles: 120 }, { hour: '02', vehicles: 80 },
    { hour: '04', vehicles: 60 }, { hour: '06', vehicles: 210 },
    { hour: '08', vehicles: 680 }, { hour: '10', vehicles: 920 },
    { hour: '12', vehicles: 1100 }, { hour: '14', vehicles: 980 },
    { hour: '16', vehicles: 1350 }, { hour: '18', vehicles: 1420 },
    { hour: '20', vehicles: 870 }, { hour: '22', vehicles: 430 },
];

const VIOLATION_COLORS_MAP = {
    'Overspeeding': '#ef4444',
    'Wrong-Side Driving': '#f97316',
    'Helmetless Driving': '#a855f7',
    'No Seatbelt': '#f59e0b',
    'Triple Riding': '#ec4899',
    'Illegal Racing': '#dc2626',
    'Overloading': '#0ea5e9',
    'Improper Lane Usage': '#6366f1',
    'No Violation': '#22c55e',
};

const MOCK_VIOLATIONS = [
    { name: 'Overspeeding', value: 38, color: '#ef4444' },
    { name: 'Wrong-Side Driving', value: 26, color: '#f97316' },
    { name: 'Helmetless Driving', value: 22, color: '#a855f7' },
    { name: 'No Seatbelt', value: 14, color: '#f59e0b' },
];

const MOCK_LOCATIONS = [
    { location: 'GD Flyover', count: 58 },
    { location: 'GD Naidu Bridge', count: 42 },
    { location: 'Avinashi Rd', count: 31 },
    { location: 'Singanallur', count: 27 },
    { location: 'Ukkadam', count: 18 },
];

/* ── Tooltip styles ── */
const TT = {
    contentStyle: {
        background: 'rgba(30,41,59,0.95)', border: '1px solid rgba(148,163,184,0.15)',
        borderRadius: 8, color: '#e2e8f0', fontSize: 12, fontFamily: 'Inter',
    },
    labelStyle: { color: '#94a3b8', fontFamily: 'Orbitron', fontSize: 10 },
};

const CustomTooltip = ({ active, payload, label }) =>
    active && payload?.length ? (
        <div style={TT.contentStyle}>
            <p style={{ ...TT.labelStyle, marginBottom: 4 }}>{label}:00</p>
            <p style={{ color: '#22c55e', fontWeight: 600 }}>Vehicles: {payload[0]?.value}</p>
        </div>
    ) : null;

const BarTooltip = ({ active, payload, label }) =>
    active && payload?.length ? (
        <div style={TT.contentStyle}>
            <p style={{ ...TT.labelStyle, marginBottom: 4 }}>{label}</p>
            <p style={{ color: '#0ea5e9', fontWeight: 600 }}>Violations: {payload[0]?.value}</p>
        </div>
    ) : null;

const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    const R = innerRadius + (outerRadius - innerRadius) * 0.5;
    const rad = Math.PI / 180;
    const x = cx + R * Math.cos(-midAngle * rad);
    const y = cy + R * Math.sin(-midAngle * rad);
    return percent > 0.08 ? (
        <text x={x} y={y} fill="#e2e8f0" textAnchor="middle" dominantBaseline="central" fontSize="11" fontWeight="600">
            {`${(percent * 100).toFixed(0)}%`}
        </text>
    ) : null;
};

/* ── Fetch helper ── */
async function fetchJSON(url) {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

/* ── Main component ── */
export default function AnalyticsCharts() {
    const [hourly, setHourly] = useState(MOCK_HOURLY);
    const [violations, setViolations] = useState(MOCK_VIOLATIONS);
    const [locations, setLocations] = useState(MOCK_LOCATIONS);
    const [liveMode, setLiveMode] = useState(false);

    const fetchAll = useCallback(async () => {
        let anyLive = false;

        // Hourly
        try {
            const data = await fetchJSON(`${API}/analytics/hourly`);
            if (Array.isArray(data) && data.length > 0) {
                setHourly(data);
                anyLive = true;
            }
        } catch { /* keep mock */ }

        // Violations
        try {
            const data = await fetchJSON(`${API}/analytics/violations`);
            if (Array.isArray(data) && data.length > 0) {
                setViolations(data.map(r => ({
                    name: r.violation_type,
                    value: r.count,
                    color: VIOLATION_COLORS_MAP[r.violation_type] || '#64748b',
                })));
                anyLive = true;
            }
        } catch { /* keep mock */ }

        // Locations
        try {
            const data = await fetchJSON(`${API}/analytics/locations`);
            if (Array.isArray(data) && data.length > 0) {
                setLocations(data.map(r => ({ location: r.location, count: r.violations })));
                anyLive = true;
            }
        } catch { /* keep mock */ }

        setLiveMode(anyLive);
    }, []);

    useEffect(() => {
        fetchAll();
        const id = setInterval(fetchAll, 10_000);
        return () => clearInterval(id);
    }, [fetchAll]);

    return (
        <div>
            <div className="section-label">
                <span className="label-text">
                    Traffic Analytics
                    <span style={{
                        fontSize: 10, marginLeft: 10, fontFamily: 'Orbitron',
                        color: liveMode ? '#22c55e' : '#f59e0b', letterSpacing: 1
                    }}>
                        {liveMode ? '● ATHENA LIVE' : '● SIMULATED'}
                    </span>
                </span>
                <div className="label-line" />
            </div>

            <div className="analytics-section">
                {/* Line chart — hourly */}
                <div className="glass-panel">
                    <div className="chart-title">📈 Vehicles Per Hour</div>
                    <div className="chart-subtitle">Today's traffic flow (GD Flyover)</div>
                    <ResponsiveContainer width="100%" height={180}>
                        <LineChart data={hourly} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                            <XAxis dataKey="hour" tick={{ fill: '#475569', fontSize: 10 }} tickFormatter={v => `${v}h`} />
                            <YAxis tick={{ fill: '#475569', fontSize: 10 }} />
                            <Tooltip content={<CustomTooltip />} />
                            <Line type="monotone" dataKey="vehicles" stroke="#22c55e" strokeWidth={2.5}
                                dot={false} activeDot={{ r: 5, fill: '#22c55e', strokeWidth: 0 }}
                                style={{ filter: 'drop-shadow(0 0 6px #22c55e)' }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Pie chart — violations */}
                <div className="glass-panel">
                    <div className="chart-title">🍩 Violation Types</div>
                    <div className="chart-subtitle">Distribution today</div>
                    <ResponsiveContainer width="100%" height={180}>
                        <PieChart>
                            <Pie data={violations} cx="50%" cy="50%"
                                innerRadius={45} outerRadius={72} paddingAngle={3}
                                dataKey="value" labelLine={false} label={renderCustomLabel}>
                                {violations.map((e, i) => (
                                    <Cell key={i} fill={e.color}
                                        style={{ filter: `drop-shadow(0 0 4px ${e.color})` }} />
                                ))}
                            </Pie>
                            <Legend iconSize={8} iconType="circle"
                                formatter={v => <span style={{ color: '#94a3b8', fontSize: 10 }}>{v}</span>} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Bar chart — locations */}
                <div className="glass-panel">
                    <div className="chart-title">📊 Top Violation Zones</div>
                    <div className="chart-subtitle">Highest violation counts by location</div>
                    <ResponsiveContainer width="100%" height={180}>
                        <BarChart data={locations} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                            <XAxis dataKey="location" tick={{ fill: '#475569', fontSize: 9 }} />
                            <YAxis tick={{ fill: '#475569', fontSize: 10 }} />
                            <Tooltip content={<BarTooltip />} />
                            <Bar dataKey="count" radius={[4, 4, 0, 0]} fill="#0ea5e9"
                                style={{ filter: 'drop-shadow(0 0 4px #0ea5e9)' }} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
