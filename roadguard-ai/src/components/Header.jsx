import { useState, useEffect } from 'react';
import { BellOutlined, UserOutlined, EnvironmentOutlined } from '@ant-design/icons';

export default function Header() {
  const [time, setTime] = useState('');
  const [date, setDate] = useState('');

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('en-IN', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setDate(now.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="header">
      <div className="header-left">
        <div className="header-title">🚦 RoadGuard AI</div>
        <div className="header-subtitle">GD Naidu Bridge Surveillance</div>
      </div>

      <div className="header-center">
        <EnvironmentOutlined style={{ color: '#0ea5e9', fontSize: 13 }} />
        <span className="location-label">LOCATION:</span>
        <span className="location-value">GD Naidu Bridge – Coimbatore</span>
      </div>

      <div className="header-right">
        <div className="live-badge">
          <div className="live-dot" />
          <span className="live-text">LIVE</span>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div className="header-time">{time}</div>
          <div style={{ fontSize: 10, color: '#475569', letterSpacing: '0.5px', marginTop: 1 }}>{date}</div>
        </div>

        <div className="icon-btn" title="Notifications">
          <BellOutlined style={{ fontSize: 15 }} />
        </div>

        <div className="avatar-btn" title="Admin User">
          A
        </div>
      </div>
    </header>
  );
}
