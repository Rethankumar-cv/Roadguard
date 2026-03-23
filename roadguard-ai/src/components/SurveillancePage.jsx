import { useState, useEffect, useCallback, useRef, memo } from 'react';
import CameraGrid from './CameraGrid';
import ViolationFeed from './ViolationFeed';
import CameraStatus from './CameraStatus';

const API = 'http://localhost:5000';

// ── Static location map for enriching camera data ──
const LOCATION_MAP = {
    CAM01: 'GD Naidu Bridge',
    CAM02: 'Avinashi Road',
    CAM03: 'Gandhipuram',
    CAM04: 'Singanallur',
    CAM05: 'Ukkadam Jn.',
    CAM06: 'RS Puram',
};

// ── Toast notification component ──
const Toast = memo(function Toast({ message, visible }) {
    return (
        <div style={{
            position: 'fixed', bottom: 28, right: 28, zIndex: 9999,
            background: 'rgba(239,68,68,0.95)', color: '#fff',
            padding: '12px 20px', borderRadius: 10,
            fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 500,
            boxShadow: '0 4px 24px rgba(239,68,68,0.4)',
            border: '1px solid rgba(255,255,255,0.15)',
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(20px)',
            transition: 'opacity 0.3s ease, transform 0.3s ease',
            pointerEvents: 'none',
        }}>
            ⚠️ {message}
        </div>
    );
});

export default function SurveillancePage() {
    const [cameras, setCameras] = useState([]);
    const [networkHealth, setNetworkHealth] = useState(null);
    const [loadingCams, setLoadingCams] = useState(true);
    const [loadingNet, setLoadingNet] = useState(true);

    // Toast state
    const [toast, setToast] = useState('');
    const [toastVisible, setToastVisible] = useState(false);
    const toastTimer = useRef(null);

    const showToast = useCallback((msg) => {
        setToast(msg);
        setToastVisible(true);
        clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => setToastVisible(false), 4000);
    }, []);

    // ── Fetch camera data ──
    const fetchCameras = useCallback(async () => {
        try {
            const res = await fetch(`${API}/analytics/cameras`, { signal: AbortSignal.timeout(5000) });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
                // Enrich with location and normalise field names
                const enriched = data.map(cam => ({
                    camera_id: cam.camera_id || cam.id || '—',
                    location: cam.location || LOCATION_MAP[cam.camera_id] || LOCATION_MAP[cam.id] || '—',
                    vehicles_detected: cam.vehicles_detected ?? cam.vehicles ?? 0,
                    violations_detected: cam.violations_detected ?? cam.violations ?? 0,
                    status: cam.status || 'Online',
                }));
                setCameras(enriched);
            }
        } catch {
            showToast('Failed to fetch surveillance data');
        } finally {
            setLoadingCams(false);
        }
    }, [showToast]);

    // ── Fetch network health ──
    const fetchNetworkHealth = useCallback(async () => {
        try {
            const res = await fetch(`${API}/analytics/network-health`, { signal: AbortSignal.timeout(5000) });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            setNetworkHealth(data);
        } catch {
            // Network health failure is non-critical; don't show toast again if camera fetch already failed
        } finally {
            setLoadingNet(false);
        }
    }, []);

    // ── Initial fetch + 10-second polling ──
    useEffect(() => {
        fetchCameras();
        fetchNetworkHealth();

        const interval = setInterval(() => {
            fetchCameras();
            fetchNetworkHealth();
        }, 10_000);

        return () => {
            clearInterval(interval);
            clearTimeout(toastTimer.current);
        };
    }, [fetchCameras, fetchNetworkHealth]);

    return (
        <div className="dashboard-area">
            {/* Page header */}
            <div style={{
                padding: '20px 20px 4px',
                display: 'flex', alignItems: 'center', gap: 10,
            }}>
                <span style={{ fontSize: 20 }}>👁️</span>
                <div>
                    <div style={{
                        fontFamily: 'Orbitron, monospace', fontSize: 14,
                        fontWeight: 700, color: '#e2e8f0', letterSpacing: 2,
                    }}>
                        SURVEILLANCE MONITOR
                    </div>
                    <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>
                        Real-time camera network &amp; violation tracking
                    </div>
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: '#22c55e',
                        boxShadow: '0 0 8px #22c55e',
                        animation: 'pulse 2s infinite',
                    }} />
                    <span style={{ fontFamily: 'Orbitron', fontSize: 9, color: '#22c55e', letterSpacing: 2 }}>
                        LIVE
                    </span>
                </div>
            </div>

            {/* Section 1 — Camera Grid */}
            <CameraGrid cameras={cameras} loading={loadingCams} />

            {/* Section 2 & 3 — Violation Feed + Camera Status */}
            <div className="mid-section">
                <ViolationFeed onToast={showToast} />
                <CameraStatus
                    networkHealth={networkHealth}
                    cameras={cameras}
                    loading={loadingNet && loadingCams}
                />
            </div>

            <div style={{ height: 16 }} />

            {/* Toast notification */}
            <Toast message={toast} visible={toastVisible} />
        </div>
    );
}
