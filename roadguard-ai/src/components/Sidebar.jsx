import { useState } from 'react';
import {
    DashboardOutlined,
    CameraOutlined,
    CloudUploadOutlined,
    SyncOutlined,
    EyeOutlined,
    BarChartOutlined,
    AlertOutlined,
    LeftOutlined,
    RightOutlined,
} from '@ant-design/icons';

const navItems = [
    { key: 'dashboard', label: 'Dashboard', icon: <DashboardOutlined /> },
    { key: 'camera', label: 'Camera Simulator', icon: <CameraOutlined /> },
    { key: 'upload', label: 'Upload Data', icon: <CloudUploadOutlined /> },
    { key: 'processing', label: 'Processing Status', icon: <SyncOutlined /> },
    { key: 'surveillance', label: 'Surveillance Monitor', icon: <EyeOutlined /> },
    { key: 'analytics', label: 'Traffic Analytics', icon: <BarChartOutlined /> },
    { key: 'violations', label: 'Violation Explorer', icon: <AlertOutlined /> },
];

export default function Sidebar({ activePage, onNavigate }) {
    const [collapsed, setCollapsed] = useState(false);

    return (
        <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
            <div className="sidebar-logo">
                <span className="logo-icon">🚦</span>
                {!collapsed && (
                    <div>
                        <div className="logo-text">RoadGuard AI</div>
                        <div className="logo-sub">Traffic Command Center</div>
                    </div>
                )}
            </div>

            <nav className="sidebar-nav">
                {navItems.map(item => (
                    <div
                        key={item.key}
                        className={`nav-item ${activePage === item.key ? 'active' : ''}`}
                        onClick={() => onNavigate(item.key)}
                        title={collapsed ? item.label : ''}
                    >
                        <span className="nav-icon">{item.icon}</span>
                        {!collapsed && <span className="nav-label">{item.label}</span>}
                    </div>
                ))}
            </nav>

            <div className="sidebar-toggle" onClick={() => setCollapsed(c => !c)}>
                {collapsed ? <RightOutlined /> : <LeftOutlined />}
            </div>
        </aside>
    );
}
