import { useState, useEffect } from 'react';
import { useCountUp } from '../hooks/useCountUp';

const API = 'http://localhost:5000';

// ── Fallback mock data (used when backend is offline) ──
const MOCK_STATS = [
    { label: 'Total Vehicles Today', value: 5692, icon: '🚗', color: 'green', trend: '+12% vs yesterday' },
    { label: 'Active Cameras', value: 5, icon: '📷', color: 'blue', trend: '1 offline' },
    { label: 'Violations Detected', value: 193, icon: '⚠️', color: 'yellow', trend: '+8 last hour' },
    { label: 'Critical Alerts', value: 14, icon: '🚨', color: 'red', trend: 'Requires action' },
];

function StatCard({ stat, index }) {
    const count = useCountUp(stat.value, 1400 + index * 200);
    return (
        <div className={`stat-card ${stat.color} fade-in-up`} style={{ animationDelay: `${index * 0.1}s` }}>
            <div className="stat-icon">{stat.icon}</div>
            <div className={`stat-value ${stat.color}`}>{count.toLocaleString()}</div>
            <div className="stat-label">{stat.label}</div>
            <div className="stat-trend">↑ {stat.trend}</div>
        </div>
    );
}

export default function StatCounters() {
    const [stats, setStats] = useState(MOCK_STATS);

    const fetchStats = async () => {
        try {
            const res = await fetch(`${API}/analytics/vehicles`, { signal: AbortSignal.timeout(4000) });
            const data = await res.json();
            if (data.total_vehicles !== undefined) {
                setStats(prev => prev.map((s, i) =>
                    i === 0
                        ? { ...s, value: data.total_vehicles, trend: 'Live from Athena' }
                        : s
                ));
            }
        } catch {
            // Backend offline — keep showing mock/last values silently
        }
    };

    useEffect(() => {
        fetchStats();
        const id = setInterval(fetchStats, 10_000); // refresh every 10s
        return () => clearInterval(id);
    }, []);

    return (
        <div>
            <div className="section-label">
                <span className="label-text">System Overview</span>
                <div className="label-line" />
            </div>
            <div className="stat-counters">
                {stats.map((s, i) => <StatCard key={s.label} stat={s} index={i} />)}
            </div>
        </div>
    );
}
