// routes/analyticsRoutes.js — All analytics + upload endpoints
const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const { runQuery } = require('../athenaService');
const { s3Client } = require('../config/awsConfig');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

const RAW_BUCKET = process.env.S3_RAW_BUCKET || 'roadguard-traffic-data';
const RAW_PREFIX = process.env.S3_RAW_PREFIX || 'raw/';

/* ─────────────────────────────────────────────────────────────
   HELPER — wrap Athena call with standardised error handling
───────────────────────────────────────────────────────────── */
async function athenaHandler(res, sql, transform) {
    try {
        const rows = await runQuery(sql);
        res.json(transform(rows));
    } catch (err) {
        console.error('[Athena Error]', err.message);
        res.status(500).json({ error: 'Analytics query failed', detail: err.message });
    }
}

/* ─────────────────────────────────────────────────────────────
   1. GET /analytics/vehicles — total vehicle count
───────────────────────────────────────────────────────────── */
router.get('/vehicles', async (req, res) => {
    await athenaHandler(
        res,
        `SELECT COUNT(*) AS total_vehicles FROM traffic_processed`,
        rows => ({ total_vehicles: parseInt(rows[0]?.total_vehicles || 0, 10) })
    );
});

/* ─────────────────────────────────────────────────────────────
   2. GET /analytics/violations — violation type distribution
───────────────────────────────────────────────────────────── */
router.get('/violations', async (req, res) => {
    await athenaHandler(
        res,
        `SELECT violation_type, COUNT(*) AS count
         FROM traffic_processed
         WHERE violation_type IS NOT NULL AND violation_type != ''
         GROUP BY violation_type
         ORDER BY count DESC`,
        rows => rows.map(r => ({ violation_type: r.violation_type, count: parseInt(r.count, 10) }))
    );
});

/* ─────────────────────────────────────────────────────────────
   3. GET /analytics/locations — top violation locations
───────────────────────────────────────────────────────────── */
router.get('/locations', async (req, res) => {
    await athenaHandler(
        res,
        `SELECT location, COUNT(*) AS violations
         FROM traffic_processed
         GROUP BY location
         ORDER BY violations DESC
         LIMIT 10`,
        rows => rows.map(r => ({ location: r.location, violations: parseInt(r.violations, 10) }))
    );
});

/* ─────────────────────────────────────────────────────────────
   4. GET /analytics/hourly — vehicles per hour
───────────────────────────────────────────────────────────── */
router.get('/hourly', async (req, res) => {
    await athenaHandler(
        res,
        `SELECT hour(from_iso8601_timestamp(timestamp)) AS hour,
                COUNT(*) AS vehicles
         FROM traffic_processed
         GROUP BY hour(from_iso8601_timestamp(timestamp))
         ORDER BY hour`,
        rows => rows.map(r => ({
            hour: String(r.hour).padStart(2, '0'),
            vehicles: parseInt(r.vehicles, 10),
        }))
    );
});

/* ─────────────────────────────────────────────────────────────
   5. GET /analytics/cameras — per-camera stats
───────────────────────────────────────────────────────────── */
router.get('/cameras', async (req, res) => {
    await athenaHandler(
        res,
        `SELECT camera_id,
                COUNT(*) AS vehicles_detected,
                SUM(CASE WHEN violation_type IS NOT NULL
                          AND violation_type != ''
                          AND violation_type != 'No Violation'
                     THEN 1 ELSE 0 END) AS violations
         FROM traffic_processed
         GROUP BY camera_id
         ORDER BY camera_id`,
        rows => rows.map(r => ({
            camera_id: r.camera_id,
            vehicles_detected: parseInt(r.vehicles_detected, 10),
            violations: parseInt(r.violations, 10),
        }))
    );
});

/* ─────────────────────────────────────────────────────────────
   6. GET /analytics/live-feed — 20 most recent violations
───────────────────────────────────────────────────────────── */
router.get('/live-feed', async (req, res) => {
    await athenaHandler(
        res,
        `SELECT vehicle_number, violation_type, location, speed, camera_id, timestamp
         FROM traffic_processed
         ORDER BY timestamp DESC
         LIMIT 20`,
        rows => rows.map(r => ({
            vehicle_number: r.vehicle_number,
            violation_type: r.violation_type,
            location: r.location,
            speed: parseFloat(r.speed),
            camera_id: r.camera_id,
            timestamp: r.timestamp,
        }))
    );
});

/* ─────────────────────────────────────────────────────────────
   7. POST /upload — upload JSON file to S3 raw/
───────────────────────────────────────────────────────────── */
router.post('/upload', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file provided. Send the JSON as form-data field "file".' });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const key = `${RAW_PREFIX}${timestamp}_${uuidv4()}.json`;

    try {
        await s3Client.send(new PutObjectCommand({
            Bucket: RAW_BUCKET,
            Key: key,
            Body: req.file.buffer,
            ContentType: 'application/json',
            Metadata: {
                'original-name': req.file.originalname,
                'uploaded-at': new Date().toISOString(),
            },
        }));

        console.log(`[S3 Upload] File uploaded → s3://${RAW_BUCKET}/${key}`);

        res.json({
            status: 'uploaded',
            message: 'File uploaded successfully. Processing started.',
            bucket: RAW_BUCKET,
            key,
        });
    } catch (err) {
        console.error('[S3 Upload Error]', err.message);
        res.status(500).json({ error: 'S3 upload failed', detail: err.message });
    }
});

module.exports = router;
