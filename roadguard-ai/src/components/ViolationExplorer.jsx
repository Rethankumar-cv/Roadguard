import { useState, useEffect, useCallback, useMemo } from 'react';
import { Table, Modal, Button, Input, Select, DatePicker, message, Tag } from 'antd';
import { SearchOutlined, DownloadOutlined, CarOutlined, EnvironmentOutlined, VideoCameraOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const API = 'http://localhost:5000';

const VIOLATION_COLORS = {
    'overspeed': 'error',
    'helmetless': 'purple',
    'signal_jump': 'warning',
    'wrong_side': 'orange',
    'no_seatbelt': 'gold',
    // Fallbacks
    'Overspeeding': 'error',
    'Wrong-Side Driving': 'orange',
    'Helmetless Driving': 'purple',
    'No Seatbelt': 'gold',
};

export default function ViolationExplorer() {
    const [violations, setViolations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [total, setTotal] = useState(0);

    // Filters & Pagination
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [searchText, setSearchText] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [filters, setFilters] = useState({
        location: null,
        camera_id: null,
        violation_type: null,
        date_from: null,
        date_to: null,
    });

    // Modal
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState(null);

    // ── 1. Debounce Search ──
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchText);
            setPage(1); // Reset to page 1 on search
        }, 300);
        return () => clearTimeout(timer);
    }, [searchText]);

    // ── 2. Data Fetching ──
    const fetchViolations = useCallback(async () => {
        setLoading(true);
        try {
            // Build query params
            const params = new URLSearchParams({
                page,
                limit: pageSize,
            });

            if (debouncedSearch) params.append('vehicle_number', debouncedSearch);
            if (filters.location) params.append('location', filters.location);
            if (filters.camera_id) params.append('camera_id', filters.camera_id);
            if (filters.violation_type) params.append('violation_type', filters.violation_type);
            if (filters.date_from) params.append('date_from', filters.date_from);
            if (filters.date_to) params.append('date_to', filters.date_to);

            const res = await fetch(`${API}/violations?${params.toString()}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const data = await res.json();

            // Handle both paginated {data: [], total: 0} and flat array [] responses
            if (Array.isArray(data)) {
                setViolations(data);
                setTotal(data.length);
            } else if (data && Array.isArray(data.data)) {
                setViolations(data.data);
                setTotal(data.total || data.data.length);
            } else {
                setViolations([]);
                setTotal(0);
            }
        } catch (error) {
            console.error('Failed to fetch violations:', error);
            message.error('Failed to load violations');
        } finally {
            setLoading(false);
        }
    }, [page, pageSize, debouncedSearch, filters]);

    // Re-fetch when dependencies change
    useEffect(() => {
        fetchViolations();
    }, [fetchViolations]);

    // ── 3. Handle Exports ──
    const exportData = async (format) => {
        try {
            const params = new URLSearchParams();
            if (debouncedSearch) params.append('vehicle_number', debouncedSearch);
            if (filters.location) params.append('location', filters.location);
            if (filters.camera_id) params.append('camera_id', filters.camera_id);
            if (filters.violation_type) params.append('violation_type', filters.violation_type);
            if (filters.date_from) params.append('date_from', filters.date_from);
            if (filters.date_to) params.append('date_to', filters.date_to);
            params.append('format', format);

            const res = await fetch(`${API}/violations/export?${params.toString()}`);
            if (!res.ok) throw new Error('Export failed');

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `violations_export_${dayjs().format('YYYYMMDD')}.${format}`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Export error:', error);
            message.error('Failed to export data');
        }
    };

    // ── 4. Extract unique options for filters ──
    const locationOptions = useMemo(() => {
        const locs = [...new Set(violations.map(v => v.location).filter(Boolean))];
        return locs.map(l => ({ label: l, value: l }));
    }, [violations]);

    const cameraOptions = useMemo(() => {
        const cams = [...new Set(violations.map(v => v.camera_id).filter(Boolean))];
        return cams.map(c => ({ label: c, value: c }));
    }, [violations]);

    const typeOptions = useMemo(() => {
        const types = [...new Set(violations.map(v => v.violation_type).filter(Boolean))];
        return types.map(t => ({ label: t, value: t }));
    }, [violations]);

    // ── 5. Table Columns ──
    const columns = [
        {
            title: 'Vehicle',
            dataIndex: 'vehicle_number',
            key: 'vehicle_number',
            render: (text) => <strong style={{ color: '#0ea5e9', fontFamily: 'Orbitron' }}>{text}</strong>,
        },
        {
            title: 'Type',
            dataIndex: 'violation_type',
            key: 'violation_type',
            render: (type) => (
                <Tag color={VIOLATION_COLORS[type] || 'default'} style={{ textTransform: 'uppercase', fontSize: 10, letterSpacing: 0.5 }}>
                    {type}
                </Tag>
            ),
        },
        {
            title: 'Location',
            dataIndex: 'location',
            key: 'location',
            render: (text) => <span style={{ color: '#e2e8f0' }}>{text}</span>,
        },
        {
            title: 'Camera ID',
            dataIndex: 'camera_id',
            key: 'camera_id',
            render: (text) => <span style={{ color: '#94a3b8', fontFamily: 'monospace' }}>{text}</span>,
        },
        {
            title: 'Time',
            dataIndex: 'timestamp',
            key: 'timestamp',
            render: (time) => <span style={{ color: '#94a3b8' }}>{dayjs(time).format('DD MMM YYYY, HH:mm:ss')}</span>,
        },
    ];

    return (
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Header & Export Actions */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 20 }}>⚠️</span>
                    <div>
                        <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 14, fontWeight: 700, color: '#e2e8f0', letterSpacing: 2 }}>
                            VIOLATION EXPLORER
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                    <Button icon={<DownloadOutlined />} onClick={() => exportData('csv')} ghost style={{ borderColor: '#64748b', color: '#e2e8f0' }}>
                        Export CSV
                    </Button>
                    <Button icon={<DownloadOutlined />} onClick={() => exportData('json')} ghost style={{ borderColor: '#64748b', color: '#e2e8f0' }}>
                        Export JSON
                    </Button>
                </div>
            </div>

            {/* Filter Panel */}
            <div className="glass-panel" style={{ display: 'flex', gap: 16, flexWrap: 'wrap', padding: '16px' }}>
                <Input
                    placeholder="Search Vehicle (TN38...)"
                    prefix={<SearchOutlined style={{ color: '#64748b' }} />}
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    style={{ width: 220, background: 'rgba(15,23,42,0.8)', borderColor: '#334155', color: '#fff' }}
                />

                <Select
                    placeholder="Location"
                    allowClear
                    style={{ width: 160 }}
                    options={locationOptions}
                    onChange={(val) => {
                        setFilters(f => ({ ...f, location: val }));
                        setPage(1);
                    }}
                />

                <Select
                    placeholder="Camera ID"
                    allowClear
                    style={{ width: 140 }}
                    options={cameraOptions}
                    onChange={(val) => {
                        setFilters(f => ({ ...f, camera_id: val }));
                        setPage(1);
                    }}
                />

                <Select
                    placeholder="Violation Type"
                    allowClear
                    style={{ width: 160 }}
                    options={typeOptions}
                    onChange={(val) => {
                        setFilters(f => ({ ...f, violation_type: val }));
                        setPage(1);
                    }}
                />

                <RangePicker
                    showTime
                    style={{ background: 'rgba(15,23,42,0.8)', borderColor: '#334155' }}
                    onChange={(dates) => {
                        if (dates) {
                            setFilters(f => ({
                                ...f,
                                date_from: dates[0].toISOString(),
                                date_to: dates[1].toISOString(),
                            }));
                        } else {
                            setFilters(f => ({ ...f, date_from: null, date_to: null }));
                        }
                        setPage(1);
                    }}
                />
            </div>

            {/* Table */}
            <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
                <Table
                    columns={columns}
                    dataSource={violations}
                    rowKey="id"
                    loading={loading}
                    pagination={{
                        current: page,
                        pageSize: pageSize,
                        total: total,
                        onChange: (p, s) => { setPage(p); setPageSize(s); },
                        showSizeChanger: true,
                    }}
                    onRow={(record) => ({
                        onClick: () => {
                            setSelectedRecord(record);
                            setModalVisible(true);
                        },
                        style: { cursor: 'pointer' }
                    })}
                    rowClassName={() => 'violation-table-row'}
                />
            </div>

            {/* Detail Modal */}
            <Modal
                title={<div style={{ fontFamily: 'Orbitron', letterSpacing: 1, color: '#e2e8f0' }}>VIOLATION DETAILS</div>}
                open={modalVisible}
                onCancel={() => setModalVisible(false)}
                footer={[
                    <Button key="close" onClick={() => setModalVisible(false)} ghost style={{ borderColor: '#64748b', color: '#e2e8f0' }}>
                        Close
                    </Button>,
                    <Button key="download" type="primary" icon={<DownloadOutlined />} style={{ background: '#0ea5e9' }}>
                        Download Report
                    </Button>
                ]}
                className="dark-modal"
                bodyStyle={{ padding: '20px 0' }}
            >
                {selectedRecord && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <span style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase' }}>Vehicle Number</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, fontFamily: 'Orbitron', color: '#0ea5e9', fontWeight: 'bold' }}>
                                    <CarOutlined /> {selectedRecord.vehicle_number}
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <span style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase' }}>Violation Type</span>
                                <div>
                                    <Tag color={VIOLATION_COLORS[selectedRecord.violation_type] || 'default'} style={{ fontSize: 12, padding: '2px 8px' }}>
                                        {selectedRecord.violation_type}
                                    </Tag>
                                </div>
                            </div>
                        </div>

                        <div style={{ height: 1, background: 'rgba(148,163,184,0.1)' }} />

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <span style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase' }}>Location</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#e2e8f0' }}>
                                    <EnvironmentOutlined style={{ color: '#64748b' }} /> {selectedRecord.location}
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <span style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase' }}>Camera</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#e2e8f0', fontFamily: 'monospace' }}>
                                    <VideoCameraOutlined style={{ color: '#64748b' }} /> {selectedRecord.camera_id}
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <span style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase' }}>Speed</span>
                                <div style={{ color: selectedRecord.speed > 80 ? '#ef4444' : '#e2e8f0', fontWeight: 'bold' }}>
                                    {selectedRecord.speed ? `${selectedRecord.speed} km/h` : 'N/A'}
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <span style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase' }}>Timestamp</span>
                                <div style={{ color: '#e2e8f0' }}>
                                    {dayjs(selectedRecord.timestamp).format('DD MMM YYYY, HH:mm:ss')}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
