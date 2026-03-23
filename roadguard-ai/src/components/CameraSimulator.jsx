import { useState, useEffect, useRef, useCallback } from 'react';

/* ─────────────────────────────────────────────────────────
   GD Flyover — location-specific violations with vehicle rules
   ─────────────────────────────────────────────────────────── */
const LOCATION = 'GD Flyover';
const CAMERAS = [
    { id: 'CAM01' }, { id: 'CAM02' }, { id: 'CAM03' },
    { id: 'CAM04' }, { id: 'CAM05' }, { id: 'CAM06' },
];

// Violation meta: icon, badge colors
const VIOLATION_META = {
    'Overspeeding': { color: '#ef4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.25)', icon: '⚡' },
    'Wrong-Side Driving': { color: '#f97316', bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.25)', icon: '↩️' },
    'Helmetless Driving': { color: '#a855f7', bg: 'rgba(168,85,247,0.12)', border: 'rgba(168,85,247,0.25)', icon: '🪖' },
    'No Seatbelt': { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.25)', icon: '🚫' },
    'Triple Riding': { color: '#ec4899', bg: 'rgba(236,72,153,0.12)', border: 'rgba(236,72,153,0.25)', icon: '👥' },
    'Illegal Racing': { color: '#ef4444', bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.35)', icon: '🏁' },
    'Overloading': { color: '#0ea5e9', bg: 'rgba(14,165,233,0.12)', border: 'rgba(14,165,233,0.25)', icon: '⚖️' },
    'Improper Lane Usage': { color: '#6366f1', bg: 'rgba(99,102,241,0.12)', border: 'rgba(99,102,241,0.25)', icon: '🛣️' },
    'No Violation': { color: '#22c55e', bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.2)', icon: '✅' },
};

// Which violations each vehicle type CAN receive
const VEHICLE_VIOLATIONS = {
    bike: ['Overspeeding', 'Wrong-Side Driving', 'Helmetless Driving', 'Triple Riding', 'Illegal Racing', 'Improper Lane Usage'],
    car: ['Overspeeding', 'Wrong-Side Driving', 'No Seatbelt', 'Improper Lane Usage'],
    truck: ['Overspeeding', 'Wrong-Side Driving', 'Overloading', 'Improper Lane Usage'],
    bus: ['Overspeeding', 'Wrong-Side Driving', 'Overloading', 'No Seatbelt', 'Improper Lane Usage'],
    auto: ['Overspeeding', 'Wrong-Side Driving', 'Triple Riding', 'Improper Lane Usage'],
};

// GD Flyover speed context
// Limit: 30–60 km/h. Normal pass: 20–58 km/h. Violation: 65–110 km/h
const VEHICLE_TYPES = ['bike', 'car', 'truck', 'bus', 'auto'];
const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const DISTRICT_CODES = ['38', '37', '39', '11', '32', '45', '63', '22', '09', '71', '58', '14'];
const SPEED_MS = { Slow: 4000, Normal: 2000, Fast: 1000 };
const CLEAR_PROB = 0.35; // 35% clean passes, 65% violations
const VTYPE_ICON = { car: '🚗', bike: '🛵', truck: '🚚', bus: '🚌', auto: '🛺' };

/* ─────────────────── GENERATORS ─────────────────── */
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randItem = arr => arr[Math.floor(Math.random() * arr.length)];

function genPlate() {
    const dist = randItem(DISTRICT_CODES);
    const l1 = ALPHA[rand(0, ALPHA.length - 1)];
    const l2 = ALPHA[rand(0, ALPHA.length - 1)];
    return `TN${dist}${l1}${l2}${rand(1000, 9999)}`;
}

function genEvent() {
    const cam = randItem(CAMERAS);
    const vType = randItem(VEHICLE_TYPES);
    const isClear = Math.random() < CLEAR_PROB;

    // Pick a violation that is valid for this vehicle type
    const violation = isClear
        ? 'No Violation'
        : randItem(VEHICLE_VIOLATIONS[vType]);

    // Illegal racing only happens at very high speed
    const isRacing = violation === 'Illegal Racing';
    // Overspeeding: above 60 km/h. Racing: 90–110 km/h. Normal clear: 20–58 km/h
    const speed = isClear
        ? rand(20, 58)
        : isRacing
            ? rand(90, 110)
            : violation === 'Overspeeding'
                ? rand(65, 110)
                : rand(30, 65); // other violations at normal-ish speed

    return {
        id: Date.now() + Math.random(),
        camera_id: cam.id,
        location: LOCATION,
        vehicle_number: genPlate(),
        vehicle_type: vType,
        speed,
        violation_type: violation,
        timestamp: new Date().toISOString().slice(0, 19),
    };
}

/* ─────────────────── INLINE STYLE HELPERS ─────────────────── */
const S = {
    page: {
        padding: '24px',
        background: 'var(--bg-primary)',
        fontFamily: "'Inter', sans-serif",
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
    },
    glassCard: {
        background: 'rgba(30, 41, 59, 0.7)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(148,163,184,0.1)',
        borderRadius: 16,
    },
    orbitron: { fontFamily: "'Orbitron', monospace" },
};

/* ─────────────────── SUB COMPONENTS ─────────────────── */

function StatusBadge({ running }) {
    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '6px 16px', borderRadius: 20,
            background: running ? 'rgba(34,197,94,0.1)' : 'rgba(100,116,139,0.15)',
            border: `1px solid ${running ? 'rgba(34,197,94,0.3)' : 'rgba(100,116,139,0.25)'}`,
            ...S.orbitron,
        }}>
            <span style={{
                width: 8, height: 8, borderRadius: '50%',
                background: running ? '#22c55e' : '#64748b',
                boxShadow: running ? '0 0 8px #22c55e' : 'none',
                animation: running ? 'pulse-live 2s infinite' : 'none',
            }} />
            <span style={{
                fontSize: 11, fontWeight: 600, letterSpacing: 2,
                color: running ? '#22c55e' : '#64748b',
            }}>
                {running ? 'SIMULATING' : 'IDLE'}
            </span>
        </div>
    );
}

function SpeedBtn({ label, active, disabled, onClick }) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            style={{
                padding: '6px 16px', borderRadius: 10, border: 'none',
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.4 : 1,
                fontSize: 12, fontWeight: 600, letterSpacing: '0.5px',
                transition: 'all 0.2s',
                background: active ? 'rgba(14,165,233,0.15)' : 'transparent',
                color: active ? '#0ea5e9' : '#64748b',
                boxShadow: active ? 'inset 0 0 0 1px rgba(14,165,233,0.35), 0 0 10px rgba(14,165,233,0.15)' : 'none',
            }}
        >{label}</button>
    );
}

function ControlBtn({ label, onClick, disabled, variant }) {
    const VARIANTS = {
        green: { bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.3)', color: '#22c55e', glow: '0 0 14px rgba(34,197,94,0.25)' },
        red: { bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)', color: '#ef4444', glow: '0 0 14px rgba(239,68,68,0.25)' },
        slate: { bg: 'rgba(100,116,139,0.1)', border: 'rgba(100,116,139,0.3)', color: '#94a3b8', glow: 'none' },
        blue: { bg: 'rgba(14,165,233,0.1)', border: 'rgba(14,165,233,0.3)', color: '#0ea5e9', glow: '0 0 14px rgba(14,165,233,0.2)' },
    };
    const v = VARIANTS[variant] || VARIANTS.slate;
    return (
        <button
            disabled={disabled}
            onClick={onClick}
            style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 22px', borderRadius: 12, cursor: disabled ? 'not-allowed' : 'pointer',
                background: v.bg, border: `1px solid ${v.border}`, color: v.color,
                fontWeight: 600, fontSize: 13, opacity: disabled ? 0.35 : 1,
                transition: 'all 0.2s', letterSpacing: '0.3px',
                boxShadow: disabled ? 'none' : v.glow,
            }}
        >{label}</button>
    );
}

function MiniStat({ icon, label, value, color }) {
    const COLOR_MAP = {
        green: { text: '#22c55e', border: 'rgba(34,197,94,0.2)', bg: 'rgba(34,197,94,0.05)' },
        blue: { text: '#0ea5e9', border: 'rgba(14,165,233,0.2)', bg: 'rgba(14,165,233,0.05)' },
        yellow: { text: '#f59e0b', border: 'rgba(245,158,11,0.2)', bg: 'rgba(245,158,11,0.05)' },
        red: { text: '#ef4444', border: 'rgba(239,68,68,0.2)', bg: 'rgba(239,68,68,0.05)' },
        purple: { text: '#a855f7', border: 'rgba(168,85,247,0.2)', bg: 'rgba(168,85,247,0.05)' },
    };
    const c = COLOR_MAP[color] || COLOR_MAP.blue;
    return (
        <div style={{
            display: 'flex', flexDirection: 'column', gap: 4,
            padding: '12px 18px', borderRadius: 12,
            background: c.bg, border: `1px solid ${c.border}`,
            minWidth: 110,
        }}>
            <span style={{ fontSize: 18 }}>{icon}</span>
            <span style={{ ...S.orbitron, fontSize: 20, fontWeight: 700, color: c.text }}>{value}</span>
            <span style={{ fontSize: 10, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
        </div>
    );
}

function SpeedBar({ speed }) {
    const pct = Math.min((speed / 120) * 100, 100);
    const color = speed > 90 ? '#ef4444' : speed > 70 ? '#f59e0b' : '#22c55e';
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 60, height: 5, background: 'rgba(148,163,184,0.1)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3 }} />
            </div>
            <span style={{ ...S.orbitron, fontSize: 12, fontWeight: 700, color, minWidth: 60 }}>
                {speed} <span style={{ fontSize: 10, fontWeight: 400, color: '#475569' }}>km/h</span>
            </span>
        </div>
    );
}

function ViolationBadge({ type }) {
    const m = VIOLATION_META[type] || VIOLATION_META['Overspeed'];
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '3px 10px', borderRadius: 7, fontSize: 11, fontWeight: 600,
            background: m.bg, border: `1px solid ${m.border}`, color: m.color,
            letterSpacing: '0.3px',
        }}>
            {m.icon} {type}
        </span>
    );
}

function CamBadge({ id }) {
    return (
        <span style={{
            ...S.orbitron, fontSize: 11, fontWeight: 600,
            padding: '3px 10px', borderRadius: 7,
            background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.25)',
            color: '#38bdf8', letterSpacing: '0.5px',
        }}>{id}</span>
    );
}

function EventRow({ event, isNew }) {
    return (
        <tr style={{
            borderBottom: '1px solid rgba(148,163,184,0.06)',
            transition: 'background 0.2s',
            animation: isNew ? 'slideInRow 0.4s ease' : 'none',
        }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(148,163,184,0.04)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
            <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                <CamBadge id={event.camera_id} />
            </td>
            <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 18 }}>{VTYPE_ICON[event.vehicle_type] || '🚗'}</span>
                    <div>
                        <div style={{ ...S.orbitron, fontSize: 12, fontWeight: 700, color: '#e2e8f0', letterSpacing: '0.5px' }}>
                            {event.vehicle_number}
                        </div>
                        <div style={{ fontSize: 10, color: '#475569', textTransform: 'capitalize', marginTop: 2 }}>
                            {event.vehicle_type}
                        </div>
                    </div>
                </div>
            </td>
            <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                <ViolationBadge type={event.violation_type} />
            </td>
            <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                <SpeedBar speed={event.speed} />
            </td>
            <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                <span style={{ fontSize: 12, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ color: '#475569' }}>📍</span> {event.location}
                </span>
            </td>
            <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                <span style={{ ...S.orbitron, fontSize: 10, color: '#64748b', letterSpacing: '0.5px' }}>
                    {event.timestamp.replace('T', ' ')}
                </span>
            </td>
        </tr>
    );
}

/* ─────────────────── MAIN COMPONENT ─────────────────── */
export default function CameraSimulator() {
    const [running, setRunning] = useState(false);
    const [speed, setSpeed] = useState('Normal');
    const [events, setEvents] = useState([]);
    const [genCount, setGenCount] = useState(0);
    const [showModal, setShowModal] = useState(false); // JSON preview modal
    const intervalRef = useRef(null);

    /* derived stats */
    const violCounts = events.reduce((acc, e) => {
        acc[e.violation_type] = (acc[e.violation_type] || 0) + 1;
        return acc;
    }, {});
    const avgSpeed = events.length
        ? Math.round(events.reduce((s, e) => s + e.speed, 0) / events.length) : 0;

    const startSim = useCallback(() => {
        setRunning(true);
        const tick = () => {
            const ev = genEvent();
            setEvents(prev => [ev, ...prev.slice(0, 199)]);
            setGenCount(c => c + 1);
        };
        tick();
        intervalRef.current = setInterval(tick, SPEED_MS[speed]);
    }, [speed]);

    const stopSim = useCallback(() => { clearInterval(intervalRef.current); setRunning(false); }, []);
    const resetSim = useCallback(() => { stopSim(); setEvents([]); setGenCount(0); }, [stopSim]);

    useEffect(() => () => clearInterval(intervalRef.current), []);

    const buildPayload = () => {
        const now = new Date();
        const yyyymmdd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
        const payload = events.map(({ id, ...rest }) => rest);
        const json = JSON.stringify(payload, null, 2);
        const fileName = `traffic_simulation_${yyyymmdd}.json`;
        return { json, fileName };
    };

    const downloadJSON = async () => {
        const { json, fileName } = buildPayload();

        // Strategy 1: native OS Save-As dialog (Chrome 86+, Edge 86+)
        if (window.showSaveFilePicker) {
            try {
                const handle = await window.showSaveFilePicker({
                    suggestedName: fileName,
                    types: [{ description: 'JSON File', accept: { 'application/json': ['.json'] } }],
                });
                const writable = await handle.createWritable();
                await writable.write(json);
                await writable.close();
                return;
            } catch (e) {
                if (e.name === 'AbortError') return; // user cancelled
                // fall through to next strategy
            }
        }

        // Strategy 2: text/plain blob + object URL (forces download, preserves extension)
        try {
            const blob = new Blob([json], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 2000);
        } catch {
            // Strategy 3: show modal so user can copy JSON manually
            setShowModal(true);
        }
    };

    const copyJSON = () => {
        const { json } = buildPayload();
        navigator.clipboard.writeText(json).catch(() => { });
    };

    return (
        <div style={S.page}>

            {/* ── JSON Preview Modal ── */}
            {showModal && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 9999,
                    background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
                }} onClick={() => setShowModal(false)}>
                    <div style={{
                        ...S.glassCard, width: '100%', maxWidth: 760, maxHeight: '80vh',
                        display: 'flex', flexDirection: 'column', overflow: 'hidden',
                    }} onClick={e => e.stopPropagation()}>
                        <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '14px 20px', borderBottom: '1px solid rgba(148,163,184,0.1)',
                        }}>
                            <span style={{ ...S.orbitron, fontSize: 12, color: '#94a3b8', letterSpacing: 2 }}>JSON PREVIEW</span>
                            <div style={{ display: 'flex', gap: 10 }}>
                                <ControlBtn label="📋 Copy JSON" onClick={copyJSON} disabled={false} variant="blue" />
                                <ControlBtn label="✕ Close" onClick={() => setShowModal(false)} disabled={false} variant="slate" />
                            </div>
                        </div>
                        <textarea
                            readOnly
                            value={buildPayload().json}
                            style={{
                                flex: 1, background: 'rgba(15,23,42,0.8)', color: '#22c55e',
                                fontFamily: 'monospace', fontSize: 12, padding: 16,
                                border: 'none', outline: 'none', resize: 'none', overflowY: 'auto',
                                lineHeight: 1.6,
                            }}
                        />
                    </div>
                </div>
            )}

            {/* ── Page Header ── */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                    <h1 style={{ ...S.orbitron, fontSize: 20, fontWeight: 700, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: 12, margin: 0 }}>
                        <span style={{ fontSize: 26 }}>📷</span> Camera Simulator
                    </h1>
                    <p style={{ fontSize: 13, color: '#475569', marginTop: 6 }}>
                        Simulate AI cameras at <strong style={{ color: '#0ea5e9' }}>GD Flyover</strong> — mix of normal passes and violations
                    </p>
                </div>
                <StatusBadge running={running} />
            </div>

            {/* separator */}
            <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(14,165,233,0.3), transparent)' }} />

            {/* ── Control Panel ── */}
            <div style={{ ...S.glassCard, padding: 20 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
                    <ControlBtn label="▶ Start Simulation" onClick={startSim} disabled={running} variant="green" />
                    <ControlBtn label="⏹ Stop" onClick={stopSim} disabled={!running} variant="red" />
                    <ControlBtn label="🔄 Reset" onClick={resetSim} disabled={false} variant="slate" />

                    {/* Speed selector */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto' }}>
                        <span style={{ fontSize: 11, color: '#475569', letterSpacing: 1, textTransform: 'uppercase' }}>Speed</span>
                        <div style={{
                            display: 'flex', gap: 2, background: 'rgba(15,23,42,0.6)',
                            border: '1px solid rgba(148,163,184,0.1)', borderRadius: 12, padding: 4,
                        }}>
                            {['Slow', 'Normal', 'Fast'].map(o => (
                                <SpeedBtn key={o} label={o} active={speed === o} disabled={running} onClick={() => setSpeed(o)} />
                            ))}
                        </div>
                    </div>

                    <ControlBtn
                        label="⬇ Download JSON"
                        onClick={downloadJSON}
                        disabled={events.length === 0 || running}
                        variant="blue"
                    />
                    <ControlBtn
                        label="📋 View JSON"
                        onClick={() => setShowModal(true)}
                        disabled={events.length === 0 || running}
                        variant="slate"
                    />
                </div>

                {/* info strip */}
                <div style={{
                    marginTop: 16, paddingTop: 16,
                    borderTop: '1px solid rgba(148,163,184,0.07)',
                    display: 'flex', flexWrap: 'wrap', gap: 24,
                    fontSize: 12, color: '#475569',
                }}>
                    <span>Interval: <strong style={{ color: '#94a3b8' }}>{SPEED_MS[speed] / 1000}s</strong></span>
                    <span>Events generated: <strong style={{ ...S.orbitron, color: '#0ea5e9', fontSize: 13 }}>{genCount}</strong></span>
                    {events.length > 0 && !running && (
                        <span style={{ color: '#f59e0b', opacity: 0.8 }}>● Simulation stopped — download is available</span>
                    )}
                </div>
            </div>

            {/* ── Mini Stats ── */}
            {events.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, animation: 'fadeInUp 0.4s ease' }}>
                    <MiniStat icon="📊" label="Total Events" value={events.length} color="blue" />
                    <MiniStat icon="✅" label="Clear Passes" value={violCounts['No Violation'] || 0} color="green" />
                    <MiniStat icon="⚡" label="Overspeeding" value={violCounts['Overspeeding'] || 0} color="red" />
                    <MiniStat icon="↩️" label="Wrong-Side" value={violCounts['Wrong-Side Driving'] || 0} color="yellow" />
                    <MiniStat icon="🪖" label="Helmetless" value={violCounts['Helmetless Driving'] || 0} color="purple" />
                    <MiniStat icon="🚫" label="No Seatbelt" value={violCounts['No Seatbelt'] || 0} color="yellow" />
                    <MiniStat icon="👥" label="Triple Riding" value={violCounts['Triple Riding'] || 0} color="blue" />
                    <MiniStat icon="🏁" label="Racing" value={violCounts['Illegal Racing'] || 0} color="red" />
                    <MiniStat icon="⚖️" label="Overloading" value={violCounts['Overloading'] || 0} color="blue" />
                    <MiniStat icon="🛣️" label="Lane Usage" value={violCounts['Improper Lane Usage'] || 0} color="blue" />
                    <MiniStat icon="🏎️" label="Avg Speed" value={`${avgSpeed} km/h`} color="green" />
                </div>
            )}


            {/* ── Live Event Table ── */}
            <div style={{ ...S.glassCard, overflow: 'hidden', flex: 1 }}>

                {/* table header bar */}
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 20px',
                    borderBottom: '1px solid rgba(148,163,184,0.08)',
                    background: 'rgba(15,23,42,0.4)',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ ...S.orbitron, fontSize: 11, fontWeight: 600, color: '#94a3b8', letterSpacing: 2, textTransform: 'uppercase' }}>
                            Live Event Log
                        </span>
                        {running && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: '#22c55e', ...S.orbitron }}>
                                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', animation: 'pulse-live 2s infinite', display: 'inline-block' }} />
                                RECORDING
                            </span>
                        )}
                    </div>
                    <span style={{ fontSize: 11, color: '#475569' }}>{events.length} event{events.length !== 1 ? 's' : ''}</span>
                </div>

                {events.length === 0 ? (
                    /* Empty state */
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', gap: 16, color: '#334155' }}>
                        <span style={{ fontSize: 56, opacity: 0.25 }}>📷</span>
                        <p style={{ ...S.orbitron, fontSize: 13, letterSpacing: 2, color: '#334155' }}>NO EVENTS YET</p>
                        <p style={{ fontSize: 12, color: '#1e3a5f' }}>
                            Press <span style={{ color: '#22c55e' }}>Start Simulation</span> to begin generating events
                        </p>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 480 }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                            <thead>
                                <tr style={{ background: 'rgba(15,23,42,0.5)', position: 'sticky', top: 0, zIndex: 1 }}>
                                    {['Camera ID', 'Vehicle', 'Violation', 'Speed', 'Location', 'Timestamp'].map(col => (
                                        <th key={col} style={{
                                            padding: '10px 16px', textAlign: 'left',
                                            fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1.5,
                                            color: '#475569', borderBottom: '1px solid rgba(148,163,184,0.08)',
                                            whiteSpace: 'nowrap', ...S.orbitron,
                                        }}>{col}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {events.map((ev, i) => (
                                    <EventRow key={ev.id} event={ev} isNew={i === 0} />
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div style={{ height: 8 }} />
        </div>
    );
}
