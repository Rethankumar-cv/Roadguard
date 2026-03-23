const express = require('express');
const { runQuery } = require('../athenaService');
const router = express.Router();

/* ─────────────────────────────────────────────────────────────
   HELPER — wrap Athena call with standardised error handling
───────────────────────────────────────────────────────────── */
async function athenaHandler(res, sql, transform) {
    try {
        const rows = await runQuery(sql);
        res.json(transform(rows));
    } catch (err) {
        console.error('[Athena Error]', err.message);
        res.status(500).json({ error: 'Query failed', detail: err.message });
    }
}

/* ─────────────────────────────────────────────────────────────
   HELPER — Build WHERE clause from query params
───────────────────────────────────────────────────────────── */
function buildWhereClause(req) {
    const conditions = [];
    // Only include rows where violation_type is valid (not empty and not 'No Violation')
    conditions.push(`violation_type IS NOT NULL`);
    conditions.push(`violation_type != ''`);
    conditions.push(`violation_type != 'No Violation'`);

    if (req.query.vehicle_number) {
        conditions.push(`LOWER(vehicle_number) LIKE LOWER('%${req.query.vehicle_number}%')`);
    }
    if (req.query.location) {
        conditions.push(`location = '${req.query.location}'`);
    }
    if (req.query.camera_id) {
        conditions.push(`camera_id = '${req.query.camera_id}'`);
    }
    if (req.query.violation_type) {
        conditions.push(`violation_type = '${req.query.violation_type}'`);
    }
    if (req.query.date_from) {
        conditions.push(`from_iso8601_timestamp(timestamp) >= from_iso8601_timestamp('${req.query.date_from}')`);
    }
    if (req.query.date_to) {
        conditions.push(`from_iso8601_timestamp(timestamp) <= from_iso8601_timestamp('${req.query.date_to}')`);
    }

    return conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
}

/* ─────────────────────────────────────────────────────────────
   1. GET /violations — Fetch paginated violations
───────────────────────────────────────────────────────────── */
router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;

        const whereClause = buildWhereClause(req);

        // 1. Get total count for pagination
        const countSql = `SELECT COUNT(*) AS total FROM traffic_processed ${whereClause}`;
        const countResult = await runQuery(countSql);
        const total = parseInt(countResult[0]?.total || 0, 10);

        // 2. Get paginated data
        const dataSql = `
            SELECT vehicle_number, violation_type, location, speed, camera_id, timestamp
            FROM traffic_processed
            ${whereClause}
            ORDER BY timestamp DESC
            OFFSET ${offset} LIMIT ${limit}
        `;

        const rows = await runQuery(dataSql);

        // Return both data and total for frontend pagination
        res.json({
            data: rows.map(r => ({
                vehicle_number: r.vehicle_number,
                violation_type: r.violation_type,
                location: r.location,
                speed: parseFloat(r.speed) || null,
                camera_id: r.camera_id,
                timestamp: r.timestamp,
            })),
            total
        });
    } catch (err) {
        console.error('[Violations API Error]', err.message);
        res.status(500).json({ error: 'Failed to fetch violations', detail: err.message });
    }
});

/* ─────────────────────────────────────────────────────────────
   2. GET /violations/export — Export to CSV/JSON
───────────────────────────────────────────────────────────── */
router.get('/export', async (req, res) => {
    try {
        const format = req.query.format || 'csv';
        const whereClause = buildWhereClause(req);

        const dataSql = `
            SELECT vehicle_number, violation_type, location, speed, camera_id, timestamp
            FROM traffic_processed
            ${whereClause}
            ORDER BY timestamp DESC
        `;

        const rows = await runQuery(dataSql);

        if (format === 'json') {
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', 'attachment; filename="violations.json"');
            return res.send(JSON.stringify(rows, null, 2));
        } else {
            // CSV EXPORT
            if (rows.length === 0) {
                return res.send('vehicle_number,violation_type,location,speed,camera_id,timestamp\n');
            }

            const headers = Object.keys(rows[0]).join(',');
            const csvRows = rows.map(row => {
                return Object.values(row).map(val => {
                    // Escape quotes and commas
                    const str = String(val);
                    return str.includes(',') || str.includes('"')
                        ? `"${str.replace(/"/g, '""')}"`
                        : str;
                }).join(',');
            });

            const csvData = [headers, ...csvRows].join('\n');
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename="violations.csv"');
            return res.send(csvData);
        }
    } catch (err) {
        console.error('[Export API Error]', err.message);
        res.status(500).json({ error: 'Export failed', detail: err.message });
    }
});

module.exports = router;
