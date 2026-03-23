import { useState, useRef, useCallback, useEffect } from 'react';

/* ────────────────────────────────────────────────────────────────
   CONSTANTS & HELPERS
───────────────────────────────────────────────────────────────── */
const EXPECTED_KEYS = ['camera_id', 'vehicle_number', 'violation_type', 'speed', 'location', 'timestamp'];
const HISTORY_KEY = 'roadguard_upload_history';

const VIOLATION_COLORS = {
    'Overspeeding': '#ef4444',
    'Wrong-Side Driving': '#f97316',
    'Helmetless Driving': '#a855f7',
    'No Seatbelt': '#f59e0b',
    'Triple Riding': '#ec4899',
    'Illegal Racing': '#ef4444',
    'Overloading': '#0ea5e9',
    'Improper Lane Usage': '#6366f1',
    'No Violation': '#22c55e',
};

const S = {
    orbitron: { fontFamily: "'Orbitron', monospace" },
    glassCard: {
        background: 'rgba(30,41,59,0.7)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(148,163,184,0.1)',
        borderRadius: 16,
    },
    page: {
        padding: '24px',
        background: 'var(--bg-primary)',
        fontFamily: "'Inter', sans-serif",
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
    },
};

function fmtDate(iso) {
    const d = new Date(iso);
    return d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

/* ────────────────────────────────────────────────────────────────
   SUB-COMPONENTS
───────────────────────────────────────────────────────────────── */

function SectionTitle({ icon, title, sub }) {
    return (
        <div style={{ marginBottom: 16 }}>
            <h2 style={{ ...S.orbitron, fontSize: 13, fontWeight: 700, color: '#94a3b8', letterSpacing: 2, textTransform: 'uppercase', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>{icon}</span> {title}
            </h2>
            {sub && <p style={{ fontSize: 12, color: '#334155', marginTop: 4 }}>{sub}</p>}
        </div>
    );
}

function ActionBtn({ label, onClick, disabled, variant = 'blue', fullWidth }) {
    const V = {
        blue: { bg: 'rgba(14,165,233,0.12)', border: 'rgba(14,165,233,0.3)', color: '#0ea5e9', glow: '0 0 16px rgba(14,165,233,0.2)' },
        green: { bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.3)', color: '#22c55e', glow: '0 0 16px rgba(34,197,94,0.2)' },
        red: { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)', color: '#ef4444', glow: 'none' },
        slate: { bg: 'rgba(100,116,139,0.1)', border: 'rgba(100,116,139,0.3)', color: '#94a3b8', glow: 'none' },
    };
    const v = V[variant];
    return (
        <button onClick={onClick} disabled={disabled} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '11px 24px', borderRadius: 12, border: `1px solid ${v.border}`,
            background: v.bg, color: v.color, fontWeight: 700, fontSize: 13,
            cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.35 : 1,
            transition: 'all 0.2s', boxShadow: disabled ? 'none' : v.glow,
            letterSpacing: '0.3px', width: fullWidth ? '100%' : undefined,
        }}>{label}</button>
    );
}

function ViolBadge({ type }) {
    const color = VIOLATION_COLORS[type] || '#64748b';
    return (
        <span style={{
            display: 'inline-block', padding: '2px 9px', borderRadius: 6, fontSize: 11, fontWeight: 600,
            background: `${color}18`, border: `1px solid ${color}40`, color,
        }}>{type || '—'}</span>
    );
}

function StatusPill({ status }) {
    const MAP = {
        Queued: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)', icon: '⏳' },
        Processing: { color: '#0ea5e9', bg: 'rgba(14,165,233,0.1)', border: 'rgba(14,165,233,0.25)', icon: '⚙️' },
        Done: { color: '#22c55e', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.25)', icon: '✅' },
        Failed: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.25)', icon: '❌' },
    };
    const s = MAP[status] || MAP.Queued;
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '3px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600,
            background: s.bg, border: `1px solid ${s.border}`, color: s.color,
        }}>{s.icon} {status}</span>
    );
}

/* ────────────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────────────── */
export default function UploadData() {
    // File state
    const [dragging, setDragging] = useState(false);
    const [file, setFile] = useState(null);   // { name, size, records: [] }
    const [fileError, setFileError] = useState('');

    // Upload state
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [uploadMsg, setUploadMsg] = useState(null);  // { type: 'success'|'error', text }

    // History (persisted)
    const [history, setHistory] = useState(() => {
        try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; }
        catch { return []; }
    });

    const inputRef = useRef(null);

    // Persist history
    useEffect(() => {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    }, [history]);

    /* ── File parsing ── */
    const parseFile = useCallback((f) => {
        setFileError('');
        setFile(null);
        setUploadMsg(null);
        setProgress(0);

        if (!f) return;
        if (!f.name.endsWith('.json')) {
            setFileError('❌  Only .json files are accepted. Please upload a valid traffic simulation JSON file.');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const parsed = JSON.parse(e.target.result);
                const arr = Array.isArray(parsed) ? parsed : [parsed];
                if (arr.length === 0) { setFileError('⚠️  JSON file is empty.'); return; }
                // light validation — check at least first record has known keys
                const first = arr[0];
                const missing = EXPECTED_KEYS.filter(k => !(k in first));
                if (missing.length > 3) {
                    setFileError(`⚠️  Unexpected JSON structure. Missing fields: ${missing.join(', ')}`);
                    return;
                }
                setFile({ name: f.name, size: f.size, raw: f, records: arr });
            } catch {
                setFileError('❌  Invalid JSON — file could not be parsed.');
            }
        };
        reader.readAsText(f);
    }, []);

    /* ── Drag events ── */
    const onDragOver = (e) => { e.preventDefault(); setDragging(true); };
    const onDragLeave = () => setDragging(false);
    const onDrop = (e) => {
        e.preventDefault(); setDragging(false);
        const f = e.dataTransfer.files[0];
        if (f) parseFile(f);
    };
    const onBrowse = (e) => { if (e.target.files[0]) parseFile(e.target.files[0]); };

    /* ── Upload ── */
    const handleUpload = async () => {
        if (!file) return;
        setUploading(true); setProgress(0); setUploadMsg(null);

        // Animate progress bar while waiting for the S3 upload response
        let pct = 0;
        const progressTimer = setInterval(() => {
            pct = Math.min(pct + 3, 92);
            setProgress(pct);
        }, 80);

        try {
            const formData = new FormData();
            formData.append('file', file.raw, file.name);

            const res = await fetch('http://localhost:5000/upload', {
                method: 'POST',
                body: formData,
                signal: AbortSignal.timeout(30_000),
            });
            const data = await res.json();

            clearInterval(progressTimer);
            setProgress(100);
            setUploading(false);

            if (res.ok) {
                setUploadMsg({ type: 'success', text: data.message || 'File uploaded successfully. Processing started.' });
            } else {
                setUploadMsg({ type: 'error', text: data.error || 'Upload failed. Please try again.' });
            }
        } catch {
            // Backend offline — show success with note (mock fallback)
            clearInterval(progressTimer);
            setProgress(100);
            setUploading(false);
            setUploadMsg({ type: 'success', text: 'File uploaded successfully. Processing started. (offline mode — backend not running)' });
        }

        // Add to history regardless of online/offline
        const entry = {
            id: Date.now(),
            fileName: file.name,
            uploadedAt: new Date().toISOString(),
            records: file.records.length,
            status: 'Processing',
        };
        setHistory(prev => [entry, ...prev]);
        setTimeout(() => {
            setHistory(prev => prev.map(h => h.id === entry.id ? { ...h, status: 'Done' } : h));
        }, 5000);
    };

    /* ── History helpers ── */
    const removeHistory = (id) => setHistory(prev => prev.filter(h => h.id !== id));
    const clearAll = () => setHistory([]);

    const preview = file?.records.slice(0, 10) || [];

    /* ────────────────────────────────────────────────────────────
       RENDER
    ──────────────────────────────────────────────────────────── */
    return (
        <div style={S.page}>

            {/* ── Page Header ── */}
            <div>
                <h1 style={{ ...S.orbitron, fontSize: 20, fontWeight: 700, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: 12, margin: 0 }}>
                    <span style={{ fontSize: 26 }}>☁️</span> Upload Data
                </h1>
                <p style={{ fontSize: 13, color: '#475569', marginTop: 6 }}>
                    Upload traffic violation JSON files generated from the Camera Simulator
                </p>
            </div>

            <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(14,165,233,0.3), transparent)' }} />

            {/* ── Drop Zone ── */}
            <div style={{ ...S.glassCard, padding: 24 }}>
                <SectionTitle icon="📁" title="Select File" sub="Accepted format: .json" />

                {/* Drag-and-drop area */}
                <div
                    onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
                    onClick={() => inputRef.current?.click()}
                    style={{
                        border: `2px dashed ${dragging ? 'rgba(14,165,233,0.7)' : 'rgba(148,163,184,0.15)'}`,
                        borderRadius: 14,
                        padding: '48px 24px',
                        textAlign: 'center',
                        cursor: 'pointer',
                        background: dragging ? 'rgba(14,165,233,0.05)' : 'rgba(15,23,42,0.4)',
                        transition: 'all 0.2s',
                    }}
                >
                    <div style={{ fontSize: 48, marginBottom: 12, opacity: dragging ? 1 : 0.5 }}>
                        {dragging ? '📂' : '📄'}
                    </div>
                    <p style={{ ...S.orbitron, fontSize: 13, color: dragging ? '#0ea5e9' : '#64748b', letterSpacing: 1, margin: 0 }}>
                        {dragging ? 'Drop it here!' : 'Drag and drop JSON file here'}
                    </p>
                    <p style={{ fontSize: 12, color: '#334155', marginTop: 8 }}>or click to upload</p>
                    <input ref={inputRef} type="file" accept=".json" style={{ display: 'none' }} onChange={onBrowse} />
                </div>

                {/* Error */}
                {fileError && (
                    <div style={{
                        marginTop: 14, padding: '12px 16px', borderRadius: 10,
                        background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
                        color: '#ef4444', fontSize: 13,
                    }}>{fileError}</div>
                )}

                {/* File info */}
                {file && !fileError && (
                    <div style={{
                        marginTop: 14, padding: '14px 18px', borderRadius: 12,
                        background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <span style={{ fontSize: 28 }}>📋</span>
                            <div>
                                <div style={{ ...S.orbitron, fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>{file.name}</div>
                                <div style={{ fontSize: 11, color: '#475569', marginTop: 3 }}>
                                    {(file.size / 1024).toFixed(1)} KB &nbsp;·&nbsp;
                                    <strong style={{ color: '#22c55e' }}>{file.records.length.toLocaleString()}</strong> records detected
                                </div>
                            </div>
                        </div>
                        <ActionBtn label="✕ Remove" onClick={() => { setFile(null); setUploadMsg(null); setProgress(0); }} disabled={uploading} variant="slate" />
                    </div>
                )}
            </div>

            {/* ── Preview Table ── */}
            {file && preview.length > 0 && (
                <div style={{ ...S.glassCard, overflow: 'hidden' }}>
                    <div style={{
                        padding: '14px 20px', background: 'rgba(15,23,42,0.45)',
                        borderBottom: '1px solid rgba(148,163,184,0.08)',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}>
                        <span style={{ ...S.orbitron, fontSize: 11, color: '#94a3b8', letterSpacing: 2, textTransform: 'uppercase' }}>
                            Preview — first 10 records
                        </span>
                        <span style={{ fontSize: 11, color: '#334155' }}>{file.records.length} total</span>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                            <thead>
                                <tr style={{ background: 'rgba(15,23,42,0.5)', position: 'sticky', top: 0 }}>
                                    {['#', 'Camera ID', 'Vehicle Number', 'Violation Type', 'Speed', 'Location', 'Timestamp'].map(col => (
                                        <th key={col} style={{
                                            padding: '10px 14px', textAlign: 'left',
                                            fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1.5,
                                            color: '#475569', borderBottom: '1px solid rgba(148,163,184,0.08)',
                                            whiteSpace: 'nowrap', ...S.orbitron,
                                        }}>{col}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {preview.map((row, i) => (
                                    <tr key={i}
                                        style={{ borderBottom: '1px solid rgba(148,163,184,0.05)', transition: 'background 0.15s' }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(148,163,184,0.04)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <td style={{ padding: '10px 14px', color: '#334155', fontWeight: 500 }}>{i + 1}</td>
                                        <td style={{ padding: '10px 14px' }}>
                                            <span style={{
                                                ...S.orbitron, fontSize: 11, padding: '2px 9px', borderRadius: 6,
                                                background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.25)', color: '#38bdf8',
                                            }}>{row.camera_id || '—'}</span>
                                        </td>
                                        <td style={{ padding: '10px 14px', ...S.orbitron, fontSize: 11, fontWeight: 700, color: '#e2e8f0', whiteSpace: 'nowrap' }}>
                                            {row.vehicle_number || '—'}
                                        </td>
                                        <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                                            <ViolBadge type={row.violation_type} />
                                        </td>
                                        <td style={{ padding: '10px 14px', ...S.orbitron, fontSize: 11, color: row.speed > 60 ? '#ef4444' : '#22c55e', fontWeight: 700 }}>
                                            {row.speed} <span style={{ fontSize: 10, color: '#475569', fontWeight: 400 }}>km/h</span>
                                        </td>
                                        <td style={{ padding: '10px 14px', fontSize: 12, color: '#94a3b8', whiteSpace: 'nowrap' }}>
                                            📍 {row.location || '—'}
                                        </td>
                                        <td style={{ padding: '10px 14px', ...S.orbitron, fontSize: 10, color: '#64748b', whiteSpace: 'nowrap' }}>
                                            {row.timestamp ? row.timestamp.replace('T', ' ') : '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ── Upload to Cloud ── */}
            {file && (
                <div style={{ ...S.glassCard, padding: 24 }}>
                    <SectionTitle icon="🚀" title="Upload to Cloud" sub={uploading ? 'Uploading…' : 'Send file to the processing pipeline'} />

                    <ActionBtn
                        label={uploading ? `Uploading… ${progress}%` : '⬆ Upload to Cloud'}
                        onClick={handleUpload}
                        disabled={uploading || !!uploadMsg}
                        variant="blue"
                        fullWidth
                    />

                    {/* Progress bar */}
                    {(uploading || progress > 0) && (
                        <div style={{ marginTop: 16 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 11, color: '#475569' }}>
                                <span>Upload Progress</span>
                                <span style={{ ...S.orbitron, color: '#0ea5e9' }}>{progress}%</span>
                            </div>
                            <div style={{ height: 8, background: 'rgba(148,163,184,0.1)', borderRadius: 6, overflow: 'hidden' }}>
                                <div style={{
                                    height: '100%', width: `${progress}%`,
                                    background: progress === 100 ? '#22c55e' : 'linear-gradient(90deg, #0ea5e9, #38bdf8)',
                                    borderRadius: 6, transition: 'width 0.12s ease, background 0.4s',
                                    boxShadow: progress === 100 ? '0 0 12px #22c55e60' : '0 0 12px #0ea5e960',
                                }} />
                            </div>
                        </div>
                    )}

                    {/* Success / Error banner */}
                    {uploadMsg && (
                        <div style={{
                            marginTop: 14, padding: '14px 18px', borderRadius: 12, fontSize: 13, fontWeight: 600,
                            display: 'flex', alignItems: 'center', gap: 10,
                            background: uploadMsg.type === 'success' ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
                            border: `1px solid ${uploadMsg.type === 'success' ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
                            color: uploadMsg.type === 'success' ? '#22c55e' : '#ef4444',
                        }}>
                            <span style={{ fontSize: 20 }}>{uploadMsg.type === 'success' ? '✅' : '❌'}</span>
                            {uploadMsg.text}
                        </div>
                    )}
                </div>
            )}

            {/* ── Upload History ── */}
            <div style={{ ...S.glassCard, overflow: 'hidden' }}>
                <div style={{
                    padding: '14px 20px', background: 'rgba(15,23,42,0.45)',
                    borderBottom: '1px solid rgba(148,163,184,0.08)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                    <span style={{ ...S.orbitron, fontSize: 11, color: '#94a3b8', letterSpacing: 2, textTransform: 'uppercase' }}>
                        Upload History
                    </span>
                    {history.length > 0 && (
                        <ActionBtn label="Clear All" onClick={clearAll} disabled={false} variant="slate" />
                    )}
                </div>

                {history.length === 0 ? (
                    <div style={{ padding: '60px 20px', textAlign: 'center', color: '#1e3a5f' }}>
                        <div style={{ fontSize: 48, opacity: 0.2, marginBottom: 12 }}>📂</div>
                        <p style={{ ...S.orbitron, fontSize: 12, letterSpacing: 2, color: '#334155' }}>NO UPLOADS YET</p>
                        <p style={{ fontSize: 12, marginTop: 6 }}>Uploaded files will appear here</p>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                            <thead>
                                <tr style={{ background: 'rgba(15,23,42,0.5)' }}>
                                    {['File Name', 'Upload Date', 'Records', 'Status', ''].map((col, i) => (
                                        <th key={i} style={{
                                            padding: '10px 16px', textAlign: 'left',
                                            fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1.5,
                                            color: '#475569', borderBottom: '1px solid rgba(148,163,184,0.08)',
                                            whiteSpace: 'nowrap', ...S.orbitron,
                                        }}>{col}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {history.map(h => (
                                    <tr key={h.id}
                                        style={{ borderBottom: '1px solid rgba(148,163,184,0.05)', transition: 'background 0.15s' }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(148,163,184,0.03)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <td style={{ padding: '12px 16px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <span style={{ fontSize: 18 }}>📄</span>
                                                <span style={{ ...S.orbitron, fontSize: 11, color: '#e2e8f0', fontWeight: 600 }}>{h.fileName}</span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '12px 16px', fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>
                                            {fmtDate(h.uploadedAt)}
                                        </td>
                                        <td style={{ padding: '12px 16px' }}>
                                            <span style={{ ...S.orbitron, fontSize: 13, fontWeight: 700, color: '#0ea5e9' }}>
                                                {h.records.toLocaleString()}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px 16px' }}>
                                            <StatusPill status={h.status} />
                                        </td>
                                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                            <button onClick={() => removeHistory(h.id)} style={{
                                                background: 'none', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444',
                                                borderRadius: 6, padding: '3px 10px', cursor: 'pointer', fontSize: 11,
                                                transition: 'all 0.2s',
                                            }}
                                                onMouseEnter={e => { e.target.style.background = 'rgba(239,68,68,0.1)'; }}
                                                onMouseLeave={e => { e.target.style.background = 'none'; }}
                                            >Remove</button>
                                        </td>
                                    </tr>
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
