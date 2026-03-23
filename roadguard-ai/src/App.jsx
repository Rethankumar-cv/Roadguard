import './index.css';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import CameraSimulator from './components/CameraSimulator';
import UploadData from './components/UploadData';
import ProcessingStatus from './components/ProcessingStatus';
import SurveillancePage from './components/SurveillancePage';
import AnalyticsPage from './components/AnalyticsPage';
import ViolationExplorer from './components/ViolationExplorer';
import './components/AntdDarkOverrides.css';
import { useState } from 'react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { theme } from './theme/theme';
import DashboardPage from './pages/DashboardPage';

// ── Scrollable wrapper for non-dashboard pages ──
function PageShell({ children }) {
  return (
    <div className="dashboard-area" style={{ padding: 0 }}>
      {children}
    </div>
  );
}

// ── Page router ──
function PageContent({ activePage }) {
  switch (activePage) {
    case 'dashboard': return <DashboardPage />;
    case 'camera': return <PageShell><CameraSimulator /></PageShell>;
    case 'upload': return <PageShell><UploadData /></PageShell>;
    case 'processing': return <PageShell><ProcessingStatus /></PageShell>;
    case 'surveillance': return <SurveillancePage />;
    case 'analytics': return <PageShell><AnalyticsPage /></PageShell>;
    case 'violations': return <PageShell><ViolationExplorer /></PageShell>;
    default: return <DashboardPage />;
  }
}

export default function App() {
  const [activePage, setActivePage] = useState('dashboard');

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <div className="app-layout">
        <Sidebar activePage={activePage} onNavigate={setActivePage} />

        <div className="main-content">
          {activePage !== 'dashboard' && <Header />}
          <PageContent activePage={activePage} />
        </div>
      </div>
    </ThemeProvider>
  );
}
