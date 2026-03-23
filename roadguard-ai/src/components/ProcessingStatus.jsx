import { useState, useEffect, useRef, useCallback } from 'react';

/* ──────────────────────────────────────────────────────────────
   PIPELINE DEFINITION
   Each step has an id, label, icon, and a list of log lines
   that appear while it is "Processing".
────────────────────────────────────────────────────────────── */
const PIPELINE_STEPS = [
    {
        id: 'upload',
        label: 'File Uploaded',
        sub: 'Amazon S3',
        icon: '🪣',
        awsIcon: '☁️',
        durationMs: 1800,
        logs: [
            'Initiating S3 multipart upload…',
            'File uploaded to s3://roadguard-ai-raw/uploads/',
            'S3 ETag verified. Upload integrity confirmed.',
            'S3 event notification published to SNS topic.',
        ],
    },
    {
        id: 'lambda',
        label: 'Lambda Processing',
        sub: 'AWS Lambda',
        icon: 'λ',
        awsIcon: '⚙️',
        durationMs: 2400,
        logs: [
            'Lambda function arn:roadguard-processor triggered.',
            'Cold-start initialisation: 312 ms',
            'Reading JSON payload from S3 event…',
            'JSON parsed successfully — 127 records found.',
            'Data schema validated. All fields present.',
            'Dispatching records to Parquet converter…',
        ],
    },
    {
        id: 'parquet',
        label: 'Parquet Conversion',
        sub: 'Apache Arrow',
        icon: '🗜️',
        awsIcon: '📦',
        durationMs: 2200,
        logs: [
            'Initialising PyArrow schema for traffic records…',
            'Writing column: camera_id  (STRING)',
            'Writing column: vehicle_number  (STRING)',
            'Writing column: violation_type  (STRING)',
            'Writing column: speed  (INT32)',
            'Writing column: location  (STRING)',
            'Writing column: timestamp  (TIMESTAMP[ms])',
            'Parquet file created → 34 KB (snappy compressed).',
            'Uploading Parquet to s3://roadguard-ai-processed/',
        ],
    },
    {
        id: 'glue',
        label: 'Glue Crawler',
        sub: 'AWS Glue',
        icon: '🕷️',
        awsIcon: '🔍',
        durationMs: 3000,
        logs: [
            'Starting AWS Glue crawler: roadguard-crawler…',
            'Crawler state: RUNNING',
            'Connecting to S3 data store…',
            'Discovering schema from Parquet files…',
            'New partitions detected: date=2026-03-07',
            'Updating Data Catalog table: roadguard_violations…',
            'Crawler finished. Tables updated: 1. Partitions added: 1.',
        ],
    },
    {
        id: 'athena',
        label: 'Athena Table',
        sub: 'Amazon Athena',
        icon: '🔭',
        awsIcon: '📊',
        durationMs: 1600,
        logs: [
            'Executing Athena MSCK REPAIR TABLE roadguard_violations…',
            'Query execution id: ae9f4b12-7c3e-4f1a-ab23-9d0c1e2f3a4b',
            'Scanning 1 partition(s)…',
            'Athena table updated successfully.',
            '✅ Pipeline complete — data ready for query at Athena.',
        ],
    },
];

const STATUS = { PENDING: 'Pending', PROCESSING: 'Processing', COMPLETED: 'Completed', FAILED: 'Failed' };

/* ──────────────────────────────────────────────────────────────
   HELPERS
────────────────────────────────────────────────────────────── */
const S = {
    orbitron: { fontFamily: "'Orbitron', monospace" },
    glass: {
        background: 'rgba(30,41,59,0.72)',
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

const STATE_META = {
    [STATUS.PENDING]: { color: '#475569', bg: 'rgba(71,85,105,0.12)', border: 'rgba(71,85,105,0.28)', ring: '#334155', icon: '○' },
    [STATUS.PROCESSING]: { color: '#0ea5e9', bg: 'rgba(14,165,233,0.14)', border: 'rgba(14,165,233,0.35)', ring: '#0ea5e9', icon: '◎' },
    [STATUS.COMPLETED]: { color: '#22c55e', bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.3)', ring: '#22c55e', icon: '✓' },
    [STATUS.FAILED]: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)', ring: '#ef4444', icon: '✕' },
};

function nowStamp() {
    return new Date().toLocaleTimeString('en-IN', { hour12: false });
}

function ActionBtn({ label, onClick, disabled, variant = 'blue' }) {
    const V = {
        blue: { bg: 'rgba(14,165,233,0.12)', border: 'rgba(14,165,233,0.3)', color: '#0ea5e9', glow: '0 0 14px rgba(14,165,233,0.2)' },
        green: { bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.3)', color: '#22c55e', glow: '0 0 14px rgba(34,197,94,0.2)' },
        slate: { bg: 'rgba(100,116,139,0.1)', border: 'rgba(100,116,139,0.3)', color: '#94a3b8', glow: 'none' },
        red: { bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)', color: '#ef4444', glow: 'none' },
    };
    const v = V[variant] || V.blue;
    return (
        <button onClick={onClick} disabled={disabled} style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '10px 22px', borderRadius: 12, border: `1px solid ${v.border}`,
            background: v.bg, color: v.color, fontWeight: 700, fontSize: 13,
            cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.35 : 1,
            transition: 'all 0.2s', boxShadow: disabled ? 'none' : v.glow,
            letterSpacing: '0.3px',
        }}>{label}</button>
    );
}

/* ──────────────────────────────────────────────────────────────
   STEP NODE (horizontal pipeline diagram)
────────────────────────────────────────────────────────────── */
function StepNode({ step, status, isLast }) {
    const m = STATE_META[status];
    const isProcessing = status === STATUS.PROCESSING;

    return (
        <div style={{ display: 'flex', alignItems: 'center', flex: isLast ? '0 0 auto' : '1 1 0' }}>
            {/* Node card */}
            <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                padding: '14px 12px', borderRadius: 14, minWidth: 110,
                background: m.bg, border: `1px solid ${m.border}`,
                transition: 'all 0.4s',
                boxShadow: isProcessing ? `0 0 20px ${m.ring}55` : 'none',
                position: 'relative',
            }}>
                {/* Processing spin ring */}
                {isProcessing && (
                    <div style={{
                        position: 'absolute', inset: -2, borderRadius: 16,
                        border: `2px solid transparent`,
                        borderTopColor: m.ring, borderRightColor: m.ring,
                        animation: 'spin-step 1s linear infinite',
                    }} />
                )}

                {/* Step icon circle */}
                <div style={{
                    width: 44, height: 44, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: `${m.ring}22`, border: `2px solid ${m.ring}55`,
                    fontSize: isProcessing ? 16 : 20,
                    fontFamily: step.id === 'lambda' ? 'monospace' : 'inherit',
                    color: m.color, fontWeight: 900,
                    boxShadow: isProcessing ? `0 0 12px ${m.ring}55` : 'none',
                }}>
                    {status === STATUS.COMPLETED ? '✓' : status === STATUS.FAILED ? '✕' : step.awsIcon}
                </div>

                <div style={{ textAlign: 'center' }}>
                    <div style={{ ...S.orbitron, fontSize: 10, fontWeight: 700, color: m.color, letterSpacing: '0.5px', lineHeight: 1.3 }}>
                        {step.label}
                    </div>
                    <div style={{ fontSize: 10, color: '#334155', marginTop: 3 }}>{step.sub}</div>
                </div>

                {/* Status pill */}
                <div style={{
                    ...S.orbitron, fontSize: 9, fontWeight: 700,
                    padding: '2px 8px', borderRadius: 5,
                    background: `${m.ring}22`, color: m.color, letterSpacing: 1,
                }}>{status.toUpperCase()}</div>
            </div>

            {/* Connector line */}
            {!isLast && (
                <div style={{ flex: 1, height: 2, marginInline: 4, position: 'relative', background: 'rgba(148,163,184,0.1)' }}>
                    {(status === STATUS.COMPLETED) && (
                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,#22c55e,#0ea5e9)', borderRadius: 2 }} />
                    )}
                </div>
            )}
        </div>
    );
}

/* ──────────────────────────────────────────────────────────────
   MAIN COMPONENT
────────────────────────────────────────────────────────────── */
const INITIAL_STEP_STATES = () =>
    Object.fromEntries(PIPELINE_STEPS.map(s => [s.id, STATUS.PENDING]));

export default function ProcessingStatus() {
    const [stepStates, setStepStates] = useState(INITIAL_STEP_STATES);
    const [logs, setLogs] = useState([]);
    const [running, setRunning] = useState(false);
    const [done, setDone] = useState(false);
    const [failed, setFailed] = useState(false);
    const logsEndRef = useRef(null);
    const timeoutRefs = useRef([]);

    // Auto-scroll logs to bottom
    useEffect(() => { logsEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [logs]);

    // Cleanup on unmount
    useEffect(() => () => timeoutRefs.current.forEach(clearTimeout), []);

    const addLog = (text, type = 'info') =>
        setLogs(prev => [...prev, { id: Date.now() + Math.random(), time: nowStamp(), text, type }]);

    const pushTimeout = (fn, ms) => {
        const t = setTimeout(fn, ms);
        timeoutRefs.current.push(t);
        return t;
    };

    const completedCount = Object.values(stepStates).filter(s => s === STATUS.COMPLETED).length;
    const progressPct = Math.round((completedCount / PIPELINE_STEPS.length) * 100);

    const runPipeline = useCallback(() => {
        // Reset
        setStepStates(INITIAL_STEP_STATES());
        setLogs([]);
        setDone(false);
        setFailed(false);
        setRunning(true);
        timeoutRefs.current.forEach(clearTimeout);
        timeoutRefs.current = [];

        let cursor = 0;

        const runStep = (idx) => {
            if (idx >= PIPELINE_STEPS.length) {
                setRunning(false);
                setDone(true);
                addLog('🎉 Pipeline completed successfully. Data is ready in Athena.', 'success');
                return;
            }

            const step = PIPELINE_STEPS[idx];

            // Mark as Processing
            setStepStates(prev => ({ ...prev, [step.id]: STATUS.PROCESSING }));
            addLog(`▶ Starting: ${step.label} (${step.sub})`, 'step');

            // Drip the log lines over the duration
            const logInterval = step.durationMs / (step.logs.length + 1);
            step.logs.forEach((line, i) => {
                pushTimeout(() => addLog(line), logInterval * (i + 1));
            });

            // Mark Completed after duration
            pushTimeout(() => {
                setStepStates(prev => ({ ...prev, [step.id]: STATUS.COMPLETED }));
                addLog(`✅ ${step.label} — completed`, 'success');
                cursor = idx + 1;
                pushTimeout(() => runStep(cursor), 350);
            }, step.durationMs);
        };

        // Small intro delay
        pushTimeout(() => {
            addLog('━━━ AWS ETL Pipeline started ━━━', 'header');
            addLog(`Pipeline ID: gwf-${Date.now().toString(36).toUpperCase()}`);
            runStep(0);
        }, 400);
    }, []);

    const reset = useCallback(() => {
        timeoutRefs.current.forEach(clearTimeout);
        timeoutRefs.current = [];
        setStepStates(INITIAL_STEP_STATES());
        setLogs([]);
        setRunning(false);
        setDone(false);
        setFailed(false);
    }, []);

    /* ── LOG LINE TYPE COLORS ── */
    const LOG_COLORS = {
        header: '#0ea5e9',
        step: '#a78bfa',
        success: '#22c55e',
        error: '#ef4444',
        info: '#94a3b8',
    };

    /* ──────────────────── RENDER ──────────────────── */
    return (
        <div style={S.page}>

            {/* Keyframes for spinner */}
            <style>{`
        @keyframes spin-step { to { transform: rotate(360deg); } }
        @keyframes pulse-dot  { 0%,100%{ opacity:1; transform:scale(1);} 50%{ opacity:0.4; transform:scale(0.85);} }
        @keyframes log-in     { from{ opacity:0; transform:translateY(6px);} to{ opacity:1; transform:translateY(0);} }
      `}</style>

            {/* ── Page Header ── */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h1 style={{ ...S.orbitron, fontSize: 20, fontWeight: 700, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: 12, margin: 0 }}>
                        <span style={{ fontSize: 26 }}>⚙️</span> Processing Status
                    </h1>
                    <p style={{ fontSize: 13, color: '#475569', marginTop: 6 }}>
                        AWS ETL pipeline monitor — S3 → Lambda → Parquet → Glue → Athena
                    </p>
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                    <ActionBtn
                        label={running ? '⏳ Running…' : '▶ Run Pipeline'}
                        onClick={runPipeline}
                        disabled={running}
                        variant="green"
                    />
                    <ActionBtn label="↺ Reset" onClick={reset} disabled={running} variant="slate" />
                </div>
            </div>

            <div style={{ height: 1, background: 'linear-gradient(90deg,transparent,rgba(14,165,233,0.35),transparent)' }} />

            {/* ── Pipeline Step Indicator ── */}
            <div style={{ ...S.glass, padding: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                    <span style={{ ...S.orbitron, fontSize: 11, color: '#64748b', letterSpacing: 2, textTransform: 'uppercase' }}>
                        Pipeline Steps
                    </span>
                    <span style={{ ...S.orbitron, fontSize: 11, color: done ? '#22c55e' : running ? '#0ea5e9' : '#475569' }}>
                        {done ? '✅ Complete' : running ? '● Live' : '○ Idle'}
                    </span>
                </div>

                {/* Steps row — scrollable on small screens */}
                <div style={{ display: 'flex', alignItems: 'center', overflowX: 'auto', paddingBottom: 4, gap: 0 }}>
                    {PIPELINE_STEPS.map((step, i) => (
                        <StepNode
                            key={step.id}
                            step={step}
                            status={stepStates[step.id]}
                            isLast={i === PIPELINE_STEPS.length - 1}
                        />
                    ))}
                </div>

                {/* Progress bar */}
                <div style={{ marginTop: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 11, color: '#475569' }}>
                        <span>Pipeline Progress</span>
                        <span style={{ ...S.orbitron, color: done ? '#22c55e' : '#0ea5e9', fontWeight: 700 }}>{progressPct}%</span>
                    </div>
                    <div style={{ height: 10, background: 'rgba(148,163,184,0.08)', borderRadius: 6, overflow: 'hidden' }}>
                        <div style={{
                            height: '100%',
                            width: `${progressPct}%`,
                            background: done
                                ? 'linear-gradient(90deg,#22c55e,#4ade80)'
                                : 'linear-gradient(90deg,#0ea5e9,#38bdf8,#818cf8)',
                            borderRadius: 6,
                            transition: 'width 0.5s cubic-bezier(.4,0,.2,1)',
                            boxShadow: `0 0 12px ${done ? '#22c55e' : '#0ea5e9'}66`,
                        }} />
                    </div>

                    {/* Step indicators below bar */}
                    <div style={{ display: 'flex', marginTop: 6 }}>
                        {PIPELINE_STEPS.map((step, i) => (
                            <div key={step.id} style={{ flex: 1, textAlign: 'center' }}>
                                <div style={{
                                    width: 8, height: 8, borderRadius: '50%', margin: '0 auto',
                                    background: stepStates[step.id] === STATUS.COMPLETED ? '#22c55e'
                                        : stepStates[step.id] === STATUS.PROCESSING ? '#0ea5e9'
                                            : stepStates[step.id] === STATUS.FAILED ? '#ef4444'
                                                : 'rgba(148,163,184,0.2)',
                                    boxShadow: stepStates[step.id] === STATUS.PROCESSING ? '0 0 8px #0ea5e9' : 'none',
                                    animation: stepStates[step.id] === STATUS.PROCESSING ? 'pulse-dot 1.2s ease infinite' : 'none',
                                    transition: 'background 0.4s',
                                }} />
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Step Detail Cards ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 12 }}>
                {PIPELINE_STEPS.map((step) => {
                    const m = STATE_META[stepStates[step.id]];
                    const st = stepStates[step.id];
                    return (
                        <div key={step.id} style={{
                            ...S.glass, padding: '16px 18px',
                            border: `1px solid ${m.border}`,
                            transition: 'all 0.4s',
                            boxShadow: st === STATUS.PROCESSING ? `0 0 18px ${m.ring}33` : 'none',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                                <span style={{ fontSize: 22 }}>{step.awsIcon}</span>
                                <div>
                                    <div style={{ ...S.orbitron, fontSize: 10, fontWeight: 700, color: '#e2e8f0', letterSpacing: '0.5px' }}>
                                        {step.label}
                                    </div>
                                    <div style={{ fontSize: 10, color: '#334155', marginTop: 2 }}>{step.sub}</div>
                                </div>
                            </div>
                            <div style={{
                                display: 'inline-flex', alignItems: 'center', gap: 5,
                                padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                                background: m.bg, border: `1px solid ${m.border}`, color: m.color,
                                ...S.orbitron, letterSpacing: 1,
                            }}>
                                {st === STATUS.PROCESSING && (
                                    <span style={{ animation: 'pulse-dot 1s infinite', display: 'inline-block' }}>●</span>
                                )}
                                {m.icon} {st}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ── Console Log Panel ── */}
            <div style={{ ...S.glass, overflow: 'hidden' }}>
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 18px',
                    background: 'rgba(15,23,42,0.6)',
                    borderBottom: '1px solid rgba(148,163,184,0.08)',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ ...S.orbitron, fontSize: 11, color: '#64748b', letterSpacing: 2, textTransform: 'uppercase' }}>
                            Pipeline Logs
                        </span>
                        {running && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: '#22c55e', ...S.orbitron }}>
                                <span style={{ animation: 'pulse-dot 1s infinite', display: 'inline-block' }}>●</span> LIVE
                            </span>
                        )}
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                        {/* Window chrome dots */}
                        {['#ef4444', '#f59e0b', '#22c55e'].map(c => (
                            <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c, opacity: 0.7 }} />
                        ))}
                    </div>
                </div>

                <div style={{
                    height: 280, overflowY: 'auto', padding: '12px 18px',
                    background: 'rgba(8,15,30,0.8)', fontFamily: 'monospace',
                }}>
                    {logs.length === 0 ? (
                        <div style={{ color: '#1e3a5f', fontSize: 12, paddingTop: 8 }}>
                            {'>'} Press <span style={{ color: '#22c55e' }}>Run Pipeline</span> to start ETL simulation…
                            <span style={{ display: 'inline-block', width: 8, height: 14, background: '#22c55e', marginLeft: 4, verticalAlign: 'middle', animation: 'pulse-dot 1s ease infinite' }} />
                        </div>
                    ) : (
                        logs.map((log) => (
                            <div key={log.id} style={{ display: 'flex', gap: 12, marginBottom: 4, animation: 'log-in 0.25s ease', fontSize: 12, lineHeight: 1.6 }}>
                                <span style={{ color: '#334155', minWidth: 70, flexShrink: 0 }}>[{log.time}]</span>
                                <span style={{ color: LOG_COLORS[log.type] || '#94a3b8', wordBreak: 'break-all' }}>
                                    {log.text}
                                </span>
                            </div>
                        ))
                    )}
                    <div ref={logsEndRef} />
                </div>
            </div>

            <div style={{ height: 8 }} />
        </div>
    );
}
