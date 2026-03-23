import { memo } from 'react';

// ── Static location map (enrichment) ──
const LOCATION_MAP = {
    CAM01: 'GD Naidu Bridge',
    CAM02: 'Avinashi Road',
    CAM03: 'Gandhipuram',
    CAM04: 'Singanallur',
    CAM05: 'Ukkadam Jn.',
    CAM06: 'RS Puram',
};

const CameraRow = memo(function CameraRow({ cam }) {
    const isOnline = (cam.status || '').toLowerCase() === 'online';
    const location = cam.location || LOCATION_MAP[cam.camera_id] || '—';

    return (
        <div className="cam-status-row">
            <div>
                <div className="cam-id">{cam.camera_id}</div>
                <div style={{ fontSize: 10, color: '#475569', marginTop: 2 }}>{location}</div>
            </div>
            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                <div className="cam-status-info">
                    <div className={`status-dot ${isOnline ? 'online' : 'offline'}`} />
                    <span className={`status-text ${isOnline ? 'online' : 'offline'}`}>
                        {isOnline ? 'Online' : 'Offline'}
                    </span>
                </div>
            </div>
        </div>
    );
});

export default function CameraStatus({ networkHealth = null, cameras = [], loading = false }) {
    // Derive values from networkHealth API data or fall back to camera list
    const totalCameras = networkHealth?.total_cameras ?? cameras.length;
    const onlineCameras = networkHealth?.online_cameras ?? cameras.filter(c => (c.status || '').toLowerCase() === 'online').length;
    const healthPercent = networkHealth?.network_health_percent
        ?? (totalCameras > 0 ? Math.round((onlineCameras / totalCameras) * 100) : 0);

    // Build camera list — prefer networkHealth cam list if cameras prop empty
    const displayList = cameras.length > 0
        ? cameras
        : Array.from({ length: totalCameras }, (_, i) => {
            const id = `CAM0${i + 1}`;
            return { camera_id: id, status: i < onlineCameras ? 'Online' : 'Offline', location: LOCATION_MAP[id] || '' };
        });

    return (
        <div className="glass-panel" style={{ minHeight: 320 }}>
            <div className="panel-header">
                <span className="panel-title">📡 Active Cameras</span>
                <span style={{ fontSize: 10, color: '#22c55e', fontFamily: 'Orbitron', letterSpacing: 1 }}>
                    {loading ? 'LOADING…' : `${onlineCameras}/${totalCameras} ONLINE`}
                </span>
            </div>

            <div className="camera-status-list">
                {loading && displayList.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#475569', fontSize: 11 }}>
                        Loading…
                    </div>
                ) : displayList.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#334155', fontSize: 11 }}>
                        No data available
                    </div>
                ) : (
                    displayList.map(cam => (
                        <CameraRow key={cam.camera_id} cam={cam} />
                    ))
                )}
            </div>

            {/* Network Health progress bar */}
            <div style={{
                marginTop: 12, padding: '10px 14px',
                background: 'rgba(34, 197, 94, 0.06)',
                border: '1px solid rgba(34, 197, 94, 0.15)',
                borderRadius: 10,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
                <span style={{ fontSize: 11, color: '#94a3b8' }}>Network Health</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ height: 6, width: 80, background: '#1e293b', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{
                            height: '100%',
                            width: `${healthPercent}%`,
                            background: healthPercent >= 80 ? '#22c55e' : healthPercent >= 50 ? '#f59e0b' : '#ef4444',
                            borderRadius: 3,
                            boxShadow: `0 0 8px ${healthPercent >= 80 ? '#22c55e' : healthPercent >= 50 ? '#f59e0b' : '#ef4444'}`,
                            transition: 'width 0.6s ease',
                        }} />
                    </div>
                    <span style={{
                        fontSize: 11, fontFamily: 'Orbitron', fontWeight: 600,
                        color: healthPercent >= 80 ? '#22c55e' : healthPercent >= 50 ? '#f59e0b' : '#ef4444',
                    }}>
                        {healthPercent}%
                    </span>
                </div>
            </div>
        </div>
    );
}
