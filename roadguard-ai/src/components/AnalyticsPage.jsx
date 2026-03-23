import { useState, useEffect, useCallback } from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend,
    BarChart, Bar,
} from 'recharts';

const API = 'http://localhost:5000';

const VIOLATION_COLORS_MAP = {
    'overspeed': '#ef4444',
    'helmetless': '#a855f7',
    'signal_jump': '#f59e0b',
    // fallbacks
    'Overspeeding': '#ef4444',
    'Wrong-Side Driving': '#f97316',
    'Helmetless Driving': '#a855f7',
    'No Seatbelt': '#f59e0b',
};

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

async function fetchJSON(url) {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

export default function AnalyticsPage() {
    const [vehicles, setVehicles] = useState({ total_vehicles: 0 });
    const [violations, setViolations] = useState([]);
    const [hourly, setHourly] = useState([]);
    const [locations, setLocations] = useState([]);
    const [cameras, setCameras] = useState([]);

    const fetchAll = useCallback(async () => {
        // Section 1 - Vehicles
        try {
            const data = await fetchJSON(`${API}/analytics/vehicles`);
            setVehicles(data);
        } catch { }

        // Section 2 - Violations
        try {
            const data = await fetchJSON(`${API}/analytics/violations`);
            if (Array.isArray(data)) {
                setViolations(data.map(d => ({
                    name: d.violation_type,
                    value: d.count,
                    color: VIOLATION_COLORS_MAP[d.violation_type] || '#64748b'
                })));
            }
        } catch { }

        // Section 3 - Hourly
        try {
            const data = await fetchJSON(`${API}/analytics/hourly`);
            if (Array.isArray(data)) setHourly(data);
        } catch { }

        // Section 4 - Locations
        try {
            const data = await fetchJSON(`${API}/analytics/locations`);
            if (Array.isArray(data)) setLocations(data);
        } catch { }

        // Section 5 - Cameras
        try {
            const data = await fetchJSON(`${API}/analytics/cameras`);
            if (Array.isArray(data)) setCameras(data);
        } catch { }
    }, []);

    useEffect(() => {
        fetchAll();
        const id = setInterval(fetchAll, 15000);
        return () => clearInterval(id);
    }, [fetchAll]);

    return (
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Page header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 20 }}>📊</span>
                <div>
                    <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 14, fontWeight: 700, color: '#e2e8f0', letterSpacing: 2 }}>
                        TRAFFIC ANALYTICS
                    </div>
                </div>
            </div>

            {/* SECTION 1 — KPI CARDS */}
            <div className="stat-counters">
                <div className="stat-card green fade-in-up">
                    <div className="stat-icon">🚗</div>
                    <div className="stat-value green">{vehicles.total_vehicles || 0}</div>
                    <div className="stat-label">Total Vehicles Detected</div>
                </div>
            </div>

            {/* CHARTS SECTIONS */}
            <div className="analytics-section">
                {/* SECTION 3 — VEHICLES PER HOUR */}
                <div className="glass-panel">
                    <div className="chart-title">📈 Vehicles Per Hour</div>
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

                {/* SECTION 2 — VIOLATION TYPE DISTRIBUTION */}
                <div className="glass-panel">
                    <div className="chart-title">🍩 Violation Types</div>
                    <ResponsiveContainer width="100%" height={180}>
                        <PieChart>
                            <Pie data={violations} cx="50%" cy="50%"
                                innerRadius={45} outerRadius={72} paddingAngle={3}
                                dataKey="value" labelLine={false} label={renderCustomLabel}>
                                {violations.map((e, i) => (
                                    <Cell key={i} fill={e.color} style={{ filter: `drop-shadow(0 0 4px ${e.color})` }} />
                                ))}
                            </Pie>
                            <Legend iconSize={8} iconType="circle"
                                formatter={v => <span style={{ color: '#94a3b8', fontSize: 10 }}>{v}</span>} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* SECTION 4 — TOP VIOLATION LOCATIONS */}
                <div className="glass-panel">
                    <div className="chart-title">📊 Top Violation Zones</div>
                    <ResponsiveContainer width="100%" height={180}>
                        <BarChart data={locations} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                            <XAxis dataKey="location" tick={{ fill: '#475569', fontSize: 9 }} />
                            <YAxis dataKey="violations" tick={{ fill: '#475569', fontSize: 10 }} />
                            <Tooltip content={<BarTooltip />} />
                            <Bar dataKey="violations" radius={[4, 4, 0, 0]} fill="#0ea5e9"
                                style={{ filter: 'drop-shadow(0 0 4px #0ea5e9)' }} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* SECTION 5 — CAMERA PERFORMANCE TABLE */}
            <div className="glass-panel" style={{ marginTop: '20px' }}>
                <div className="chart-title">📷 Camera Performance</div>
                <div style={{ overflowX: 'auto', marginTop: '10px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                        <thead>
                            <tr style={{ background: 'rgba(15, 23, 42, 0.6)', color: '#94a3b8', textAlign: 'left', fontFamily: 'Orbitron' }}>
                                <th style={{ padding: '10px' }}>Camera ID</th>
                                <th style={{ padding: '10px' }}>Vehicles Detected</th>
                                <th style={{ padding: '10px' }}>Violations</th>
                                <th style={{ padding: '10px' }}>Violation Rate %</th>
                            </tr>
                        </thead>
                        <tbody>
                            {cameras.map((cam, idx) => {
                                const rate = cam.vehicles_detected > 0 ? ((cam.violations / cam.vehicles_detected) * 100).toFixed(1) : 0;
                                return (
                                    <tr key={idx} style={{ borderBottom: '1px solid rgba(148,163,184,0.06)' }}>
                                        <td style={{ padding: '10px', color: '#e2e8f0', fontWeight: 'bold' }}>{cam.camera_id}</td>
                                        <td style={{ padding: '10px', color: '#22c55e' }}>{cam.vehicles_detected}</td>
                                        <td style={{ padding: '10px', color: '#ef4444' }}>{cam.violations}</td>
                                        <td style={{ padding: '10px', color: '#f59e0b' }}>{rate}%</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
