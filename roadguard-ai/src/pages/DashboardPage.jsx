import React, { useState, useEffect } from 'react';
import { Box, Container, Grid } from '@mui/material';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import VideocamIcon from '@mui/icons-material/Videocam';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

// Components
import TopNav from '../components/dashboard/TopNav';
import StatCard from '../components/dashboard/StatCard';
import ViolationFeedWidget from '../components/dashboard/ViolationFeedWidget';
import CameraStatusWidget from '../components/dashboard/CameraStatusWidget';
import VehiclesChart from '../components/dashboard/VehiclesChart';
import ViolationChart from '../components/dashboard/ViolationChart';
import ZoneChart from '../components/dashboard/ZoneChart';

const API = 'http://localhost:5000';

export default function DashboardPage() {
    const [stats, setStats] = useState({
        vehicles: 0,
        camerasOffline: 0,
        violations: 0,
        critical: 0
    });

    useEffect(() => {
        const fetchKPIs = async () => {
            try {
                const [vRes, cRes, violRes] = await Promise.all([
                    fetch(`${API}/analytics/vehicles`),
                    fetch(`${API}/analytics/cameras`),
                    fetch(`${API}/analytics/violations`)
                ]);

                const vData = await vRes.json();
                const cData = await cRes.json();
                const violData = await violRes.json();

                let totalViolations = 0;
                let criticalViolations = 0;

                if (Array.isArray(violData)) {
                    totalViolations = violData.reduce((acc, curr) => acc + curr.count, 0);
                    criticalViolations = violData
                        .filter(v => v.violation_type === 'Overspeeding' || v.violation_type === 'Illegal Racing')
                        .reduce((acc, curr) => acc + curr.count, 0);
                }

                let offlineCounts = 0;
                if (Array.isArray(cData)) {
                    offlineCounts = cData.filter(c => c.status === 'Offline').length;
                }

                setStats({
                    vehicles: vData.total_vehicles || 0,
                    camerasOffline: offlineCounts,
                    violations: totalViolations,
                    critical: criticalViolations
                });

            } catch (err) {
                console.error('Fetch KPI err', err);
            }
        };

        fetchKPIs();
        const id = setInterval(fetchKPIs, 15000);
        return () => clearInterval(id);
    }, []);

    return (
        <Box sx={{ height: '100%', flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <TopNav />
            <Box component="main" sx={{ flexGrow: 1, p: { xs: 2, md: 3, lg: 4 }, overflowY: 'auto' }}>
                <Container maxWidth="xl" disableGutters>

                    {/* KPI Row */}
                    <Grid container spacing={3} sx={{ mb: 4 }}>
                        <Grid item xs={12} sm={6} lg={3}>
                            <StatCard
                                title="Total Vehicles Today"
                                value={stats.vehicles}
                                icon={<DirectionsCarIcon fontSize="medium" />}
                                color="#22C55E"
                                subtext="Tracking operational capacity"
                            />
                        </Grid>
                        <Grid item xs={12} sm={6} lg={3}>
                            <StatCard
                                title="Active Cameras"
                                value={stats.camerasOffline > 0 ? `6 (${stats.camerasOffline} OFF)` : '6'}
                                icon={<VideocamIcon fontSize="medium" />}
                                color="#38BDF8"
                                subtext="100% network uptime"
                            />
                        </Grid>
                        <Grid item xs={12} sm={6} lg={3}>
                            <StatCard
                                title="Violations Detected"
                                value={stats.violations}
                                icon={<WarningAmberIcon fontSize="medium" />}
                                color="#F59E0B"
                                subtext="Total processed incidents"
                            />
                        </Grid>
                        <Grid item xs={12} sm={6} lg={3}>
                            <StatCard
                                title="Critical Alerts"
                                value={stats.critical}
                                icon={<ErrorOutlineIcon fontSize="medium" />}
                                color="#EF4444"
                                subtext="High speed & racing events"
                            />
                        </Grid>
                    </Grid>

                    {/* Main Content Layout - 6 / 3 / 3 Split */}
                    <Grid container spacing={3}>

                        {/* Left Column (6): Live Violations Feed */}
                        <Grid item xs={12} md={6}>
                            <Box sx={{ height: 'calc(100vh - 200px)', minHeight: 800 }}>
                                <ViolationFeedWidget />
                            </Box>
                        </Grid>

                        {/* Middle Column (3): Cameras + Top Zones */}
                        <Grid item xs={12} md={3}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

                                {/* Active Cameras */}
                                <Box sx={{ height: 350 }}>
                                    <CameraStatusWidget />
                                </Box>

                                {/* Top Violation Zones Chart */}
                                <Box sx={{ flexGrow: 1 }}>
                                    <ZoneChart />
                                </Box>

                            </Box>
                        </Grid>

                        {/* Right Column (3): Violation Types + Vehicles Per Hour */}
                        <Grid item xs={12} md={3}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

                                {/* Violation Types Chart */}
                                <Box sx={{ height: 350 }}>
                                    <ViolationChart />
                                </Box>

                                {/* Vehicles Per Hour Chart */}
                                <Box sx={{ flexGrow: 1 }}>
                                    <VehiclesChart />
                                </Box>

                            </Box>
                        </Grid>

                    </Grid>

                </Container>
            </Box>
        </Box>
    );
}
