import { useEffect, useRef, memo } from 'react';
import * as THREE from 'three';
import { useState } from 'react';
import { useCountUp } from '../hooks/useCountUp';

// ── Static location map (fallback / enrichment) ──
const LOCATION_MAP = {
    CAM01: 'GD Naidu Bridge',
    CAM02: 'Avinashi Road',
    CAM03: 'Gandhipuram',
    CAM04: 'Singanallur',
    CAM05: 'Ukkadam Jn.',
    CAM06: 'RS Puram',
};

function ThreeBackground({ containerRef }) {
    useEffect(() => {
        if (!containerRef.current) return;
        const container = containerRef.current;
        const w = container.clientWidth;
        const h = container.clientHeight;

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(w, h);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.domElement.style.position = 'absolute';
        renderer.domElement.style.inset = '0';
        container.appendChild(renderer.domElement);

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 1000);
        camera.position.z = 5;

        // Particles
        const count = 180;
        const positions = new Float32Array(count * 3);
        const velocities = [];
        for (let i = 0; i < count; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 20;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 10;
            velocities.push({ x: (Math.random() - 0.5) * 0.003, y: (Math.random() - 0.5) * 0.003 });
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const mat = new THREE.PointsMaterial({ color: 0x22c55e, size: 0.05, transparent: true, opacity: 0.6 });
        const points = new THREE.Points(geo, mat);
        scene.add(points);

        // Grid lines
        const gridHelper = new THREE.GridHelper(20, 20, 0x0ea5e9, 0x0f172a);
        gridHelper.position.y = -3;
        gridHelper.material.opacity = 0.15;
        gridHelper.material.transparent = true;
        scene.add(gridHelper);

        let animId;
        const animate = () => {
            animId = requestAnimationFrame(animate);
            const pos = geo.attributes.position.array;
            for (let i = 0; i < count; i++) {
                pos[i * 3] += velocities[i].x;
                pos[i * 3 + 1] += velocities[i].y;
                if (Math.abs(pos[i * 3]) > 10) velocities[i].x *= -1;
                if (Math.abs(pos[i * 3 + 1]) > 5) velocities[i].y *= -1;
            }
            geo.attributes.position.needsUpdate = true;
            points.rotation.y += 0.0005;
            gridHelper.rotation.y += 0.001;
            renderer.render(scene, camera);
        };
        animate();

        return () => {
            cancelAnimationFrame(animId);
            renderer.dispose();
            if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
        };
    }, [containerRef]);

    return null;
}

function AnimatedNumber({ value }) {
    const count = useCountUp(value, 1500);
    return <span>{count.toLocaleString()}</span>;
}

const CameraCard = memo(function CameraCard({ cam, index }) {
    return (
        <div className="camera-card fade-in-up" style={{ animationDelay: `${index * 0.08}s` }}>
            <div className="cam-feed-preview">
                <div className="scan-line" />
                <div className="crosshair" />
                <span className="cam-feed-label">LIVE ● {cam.camera_id}</span>
            </div>

            <div className="cam-header">
                <div>
                    <div className="cam-name">{cam.camera_id}</div>
                    <div className="cam-location">{cam.location || LOCATION_MAP[cam.camera_id] || '—'}</div>
                </div>
                <div className={`cam-status-badge ${cam.status ? cam.status.toLowerCase() : 'offline'}`}>
                    {cam.status || 'Offline'}
                </div>
            </div>

            <div className="cam-divider" />

            <div className="cam-stats">
                <div className="cam-stat">
                    <div className="cam-stat-value">
                        {cam.status === 'Online' || cam.status === 'online'
                            ? <AnimatedNumber value={cam.vehicles_detected ?? 0} />
                            : '—'}
                    </div>
                    <div className="cam-stat-label">Vehicles Today</div>
                </div>
                <div className="cam-stat">
                    <div className={`cam-stat-value ${(cam.violations_detected ?? 0) > 0 ? 'violation' : ''}`}>
                        {cam.status === 'Online' || cam.status === 'online'
                            ? <AnimatedNumber value={cam.violations_detected ?? 0} />
                            : '—'}
                    </div>
                    <div className="cam-stat-label">Violations</div>
                </div>
            </div>
        </div>
    );
});

export default function CameraGrid({ cameras = [], loading = false }) {
    const bgRef = useRef(null);

    const onlineCount = cameras.filter(c =>
        (c.status || '').toLowerCase() === 'online'
    ).length;

    return (
        <div className="camera-grid-section" style={{ minHeight: 320 }}>
            <div className="camera-grid-bg" ref={bgRef}>
                <ThreeBackground containerRef={bgRef} />
            </div>

            <div className="section-label" style={{ padding: '16px 16px 0', position: 'relative', zIndex: 2 }}>
                <span className="label-text">Camera Feed Network</span>
                <div className="label-line" />
                <span style={{ fontSize: 10, color: '#22c55e', fontFamily: 'Orbitron', letterSpacing: 1 }}>
                    {loading ? 'LOADING…' : `${onlineCount}/${cameras.length} ONLINE`}
                </span>
            </div>

            {loading && cameras.length === 0 ? (
                <div style={{
                    padding: '40px 16px', textAlign: 'center', position: 'relative', zIndex: 2,
                    color: '#475569', fontFamily: 'Orbitron', fontSize: 11, letterSpacing: 1,
                }}>
                    Loading camera data…
                </div>
            ) : cameras.length === 0 ? (
                <div style={{
                    padding: '40px 16px', textAlign: 'center', position: 'relative', zIndex: 2,
                    color: '#334155', fontFamily: 'Orbitron', fontSize: 11, letterSpacing: 1,
                }}>
                    No data available
                </div>
            ) : (
                <div className="camera-grid">
                    {cameras.map((cam, i) => (
                        <CameraCard key={cam.camera_id} cam={cam} index={i} />
                    ))}
                </div>
            )}
        </div>
    );
}
