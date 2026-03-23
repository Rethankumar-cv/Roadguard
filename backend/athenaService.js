// athenaService.js — Athena query runner with polling + 5-second cache
const {
    StartQueryExecutionCommand,
    GetQueryExecutionCommand,
    GetQueryResultsCommand,
} = require('@aws-sdk/client-athena');
const { athenaClient } = require('./config/awsConfig');
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const DATABASE = process.env.ATHENA_DATABASE || 'roadguard_db';
const OUTPUT = process.env.ATHENA_OUTPUT || 's3://roadguard-traffic-data/athena-results/';

// ── 5-second in-memory cache ──
const cache = new Map(); // key: sql, value: { data, expiresAt }
const CACHE_TTL_MS = 5000;

/**
 * Run an Athena SQL query and return rows as [{ col: value }].
 * Results are cached for 5 seconds to reduce Athena costs.
 * @param {string} sql
 * @returns {Promise<Array<Object>>}
 */
async function runQuery(sql) {
    // Cache hit?
    const cached = cache.get(sql);
    if (cached && Date.now() < cached.expiresAt) {
        console.log(`[Athena Cache] HIT for: ${sql.slice(0, 60)}…`);
        return cached.data;
    }

    console.log(`[Athena] Running query: ${sql.slice(0, 80)}…`);

    // 1. Start query
    const startCmd = new StartQueryExecutionCommand({
        QueryString: sql,
        QueryExecutionContext: { Database: DATABASE },
        ResultConfiguration: { OutputLocation: OUTPUT },
    });
    const { QueryExecutionId } = await athenaClient.send(startCmd);
    console.log(`[Athena] QueryExecutionId: ${QueryExecutionId}`);

    // 2. Poll until SUCCEEDED / FAILED / CANCELLED
    await waitForQuery(QueryExecutionId);

    // 3. Fetch results
    const rows = await fetchResults(QueryExecutionId);

    // 4. Cache and return
    cache.set(sql, { data: rows, expiresAt: Date.now() + CACHE_TTL_MS });
    return rows;
}

/** Poll Athena until the query reaches a terminal state */
async function waitForQuery(queryId) {
    const POLL_INTERVAL = 800; // ms
    const MAX_WAIT_MS = 30_000;
    const deadline = Date.now() + MAX_WAIT_MS;

    while (Date.now() < deadline) {
        const { QueryExecution } = await athenaClient.send(
            new GetQueryExecutionCommand({ QueryExecutionId: queryId })
        );
        const state = QueryExecution?.Status?.State;

        if (state === 'SUCCEEDED') return;
        if (state === 'FAILED' || state === 'CANCELLED') {
            const reason = QueryExecution?.Status?.StateChangeReason || 'Unknown reason';
            throw new Error(`Athena query ${queryId} ${state}: ${reason}`);
        }

        await sleep(POLL_INTERVAL);
    }
    throw new Error(`Athena query ${queryId} timed out after ${MAX_WAIT_MS / 1000}s`);
}

/** Fetch all result pages and return as [{col: val}] */
async function fetchResults(queryId) {
    const rows = [];
    let NextToken;
    let isFirstPage = true;
    let columns = [];

    do {
        const { ResultSet, NextToken: next } = await athenaClient.send(
            new GetQueryResultsCommand({
                QueryExecutionId: queryId,
                ...(NextToken ? { NextToken } : {}),
            })
        );

        const pageRows = ResultSet?.Rows || [];

        // First row on first page is the header
        if (isFirstPage && pageRows.length > 0) {
            columns = pageRows[0].Data.map(d => d.VarCharValue);
            pageRows.slice(1).forEach(row => {
                const obj = {};
                row.Data.forEach((cell, i) => { obj[columns[i]] = cell.VarCharValue; });
                rows.push(obj);
            });
            isFirstPage = false;
        } else {
            pageRows.forEach(row => {
                const obj = {};
                row.Data.forEach((cell, i) => { obj[columns[i]] = cell.VarCharValue; });
                rows.push(obj);
            });
        }

        NextToken = next;
    } while (NextToken);

    return rows;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

module.exports = { runQuery };
