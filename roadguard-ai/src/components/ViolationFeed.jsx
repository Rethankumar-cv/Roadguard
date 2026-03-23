import { useState, useEffect, useRef, memo } from 'react';

const API = 'http://localhost:5000';

const VEHICLE_ICONS = { car: '🚗', bike: '🛵', truck: '🚚', bus: '🚌', auto: '🛺' };

const VIOLATION_CLASS = {
    'Overspeeding': 'overspeed',
    'overspeed': 'overspeed',
    'Wrong-Side Driving': 'signal',
    'Helmetless Driving': 'helmet',
    'No Seatbelt': 'lane',
    'Triple Riding': 'helmet',
    'Illegal Racing': 'overspeed',
    'Overloading': 'lane',
    'Improper Lane Usage': 'lane',
    'No Violation': 'no-viol',
};

// ── Fallback mock generation ──
const PLATES = ['TN38AB1234', 'TN37BC7812', 'TN39DE5621', 'TN11FR9201', 'TN32GH4512'];
const VIOL_TYP = [
    { label: 'Overspeeding', cls: 'overspeed' },
    { label: 'Wrong-Side Driving', cls: 'signal' },
    { label: 'Helmetless Driving', cls: 'helmet' },
    { label: 'Improper Lane Usage', cls: 'lane' },
];
const LOCS = ['GD Flyover', 'GD Naidu Bridge', 'Avinashi Road', 'Singanallur'];
const randItem = arr => arr[Math.floor(Math.random() * arr.length)];
function makeMock() {
    const now = new Date();
    const ts = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    const vt = randItem(VIOL_TYP);
    return { id: Date.now() + Math.random(), icon: '🚗', plate: randItem(PLATES), violation: vt, location: randItem(LOCS), time: ts };
}
const INITIAL = Array.from({ length: 8 }, makeMock);

function formatTimestamp(ts) {
    if (!ts) return '—';
    try {
        const d = new Date(ts);
        return d.toLocaleString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
        });
    } catch {
        return ts.replace('T', ' ').slice(0, 19);
    }
}

const ViolationRow = memo(function ViolationRow({ v }) {
    return (
        <div className="violation-row">
            <span className="veh-icon">{v.icon}</span>
            <div className="viol-info">
                <div className="viol-plate">{v.plate}</div>
                <div className="viol-meta">{v.location}</div>
            </div>
            <div className={`viol-type-badge ${v.violation.cls}`}>
                {v.violation.label}
            </div>
            <div className="viol-time">{v.time}</div>
        </div>
    );
});

export default function ViolationFeed({ onToast }) {
    const [violations, setViolations] = useState(INITIAL);
    const [liveMode, setLiveMode] = useState(false);
    const listRef = useRef(null);

    const fetchLive = async () => {
        try {
            const res = await fetch(`${API}/analytics/live-feed`, { signal: AbortSignal.timeout(4000) });
            if (!res.ok) throw new Error('non-2xx');
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
                // Sort descending by timestamp
                const sorted = [...data].sort((a, b) => {
                    const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0;
                    const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0;
                    return tb - ta;
                });
                const mapped = sorted.slice(0, 20).map((r, i) => ({
                    id: `${i}-${Date.now()}`,
                    icon: VEHICLE_ICONS[r.vehicle_type] || '🚗',
                    plate: r.vehicle_number || '—',
                    violation: {
                        label: r.violation_type || 'Unknown',
                        cls: VIOLATION_CLASS[r.violation_type] || 'lane',
                    },
                    location: r.location || '—',
                    time: formatTimestamp(r.timestamp),
                }));
                setViolations(mapped);
                setLiveMode(true);
                return;
            }
        } catch {
            if (onToast) onToast('Failed to fetch surveillance data');
        }

        // Fallback — keep adding mock entries
        setLiveMode(false);
        setViolations(prev => [makeMock(), ...prev.slice(0, 19)]);
    };

    useEffect(() => {
        fetchLive();
        const id = setInterval(fetchLive, 5_000); // 5-second refresh
        return () => clearInterval(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="glass-panel" style={{ minHeight: 320 }}>
            <div className="panel-header">
                <span className="panel-title">⚡ Live Violation Feed</span>
                <span className="panel-badge" style={{ color: liveMode ? '#22c55e' : '#f59e0b' }}>
                    {liveMode ? '● ATHENA LIVE' : '● SIMULATED'}
                </span>
            </div>

            <div className="violation-list" ref={listRef}>
                {violations.length === 0 ? (
                    <div style={{ padding: 20, textAlign: 'center', color: '#475569', fontSize: 12 }}>
                        No data available
                    </div>
                ) : (
                    violations.map(v => <ViolationRow key={v.id} v={v} />)
                )}
            </div>
        </div>
    );
}
