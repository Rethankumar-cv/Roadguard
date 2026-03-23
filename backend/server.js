// server.js — RoadGuard AI Express backend
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const analyticsRoutes = require('./routes/analyticsRoutes');
const { s3Client } = require('./config/awsConfig');

const app = express();
const PORT = process.env.PORT || 5000;

/* ── Middleware ── */
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

/* ── Routes ── */
app.use('/analytics', analyticsRoutes);
const violationRoutes = require('./routes/violationRoutes');
app.use('/violations', violationRoutes);

/* ── POST /upload ── (defined here so path is exactly /upload, not /upload/upload) */
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });
const RAW_BUCKET = process.env.S3_RAW_BUCKET || 'roadguard-traffic-data';
const RAW_PREFIX = process.env.S3_RAW_PREFIX || 'raw/';

app.post('/upload', upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file provided.' });
    const key = `${RAW_PREFIX}${new Date().toISOString().replace(/[:.]/g, '-')}_${uuidv4()}.json`;
    try {
        await s3Client.send(new PutObjectCommand({
            Bucket: RAW_BUCKET,
            Key: key,
            Body: req.file.buffer,
            ContentType: 'application/json',
            Metadata: { 'original-name': req.file.originalname, 'uploaded-at': new Date().toISOString() },
        }));
        console.log(`[S3 Upload] → s3://${RAW_BUCKET}/${key}`);
        res.json({ status: 'uploaded', message: 'File uploaded successfully. Processing started.', key });
    } catch (err) {
        console.error('[S3 Upload Error]', err.message);
        res.status(500).json({ error: 'S3 upload failed', detail: err.message });
    }
});

/* ── Health check ── */
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'RoadGuard AI Backend',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
    });
});

/* ── 404 fallback ── */
app.use((req, res) => {
    res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
});

/* ── Global error handler ── */
app.use((err, req, res, next) => {
    console.error('[Unhandled Error]', err);
    res.status(500).json({ error: 'Internal server error', detail: err.message });
});

/* ── Start ── */
app.listen(PORT, () => {
    console.log('');
    console.log('  ╔═══════════════════════════════════════════╗');
    console.log('  ║   🚦  RoadGuard API running on port ' + PORT + '  ║');
    console.log('  ║   Region   : ap-south-1                   ║');
    console.log('  ║   Database : roadguard_db                 ║');
    console.log('  ║   Docs     : http://localhost:' + PORT + '/health ║');
    console.log('  ╚═══════════════════════════════════════════╝');
    console.log('');
});
