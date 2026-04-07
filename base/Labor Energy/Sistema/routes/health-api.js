'use strict';

/**
 * Health & Status API
 * Endpoints: /status, /readiness, /api/admin/circuit-breakers
 */
const express = require('express');

function normalizeIp(value) {
    return String(value || '').trim().replace(/^::ffff:/, '');
}

function isPrivateNetworkIp(value) {
    const ip = normalizeIp(value);
    if (!ip) return false;

    return ip === '127.0.0.1' ||
        ip === '::1' ||
        ip.startsWith('10.') ||
        ip.startsWith('192.168.') ||
        /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip);
}

function canAccessInternalStatus(req) {
    if (process.env.NODE_ENV !== 'production') {
        return true;
    }

    const forwardedFor = String(req.headers['x-forwarded-for'] || '')
        .split(',')[0]
        .trim();
    const authHeader = req.headers.authorization;
    const internalToken = process.env.INTERNAL_STATUS_TOKEN || process.env.METRICS_TOKEN;

    return isPrivateNetworkIp(req.ip) ||
        isPrivateNetworkIp(req.socket?.remoteAddress) ||
        isPrivateNetworkIp(forwardedFor) ||
        Boolean(internalToken && authHeader === `Bearer ${internalToken}`);
}

function requireInternalStatus(req, res, next) {
    if (canAccessInternalStatus(req)) {
        return next();
    }

    return res.status(403).json({
        error: 'Acesso nao autorizado'
    });
}

module.exports = function createHealthRouter({
    authenticateToken,
    authorizeAdmin,
    pool,
    getDbAvailable,
    getAllBreakerStates
}) {
    const router = express.Router();

    router.get('/status', requireInternalStatus, async (req, res) => {
        const dbAvailable = Boolean(getDbAvailable());
        const info = {
            status: 'ok',
            uptime_seconds: Math.floor(process.uptime()),
            dbAvailable,
            timestamp: new Date().toISOString()
        };

        if (dbAvailable) {
            try {
                await pool.query('SELECT 1');
                info.dbPing = true;
            } catch (err) {
                info.dbPing = false;
                if (process.env.NODE_ENV === 'development') {
                    info.dbError = String(err?.message || err).slice(0, 200);
                }
            }
        }

        res.setHeader('X-DB-Available', dbAvailable ? '1' : '0');
        return res.json(info);
    });

    router.get('/readiness', requireInternalStatus, async (req, res) => {
        if (!getDbAvailable()) {
            return res.status(503).json({ ready: false, reason: 'database_unavailable' });
        }

        try {
            await pool.query('SELECT 1');
            return res.json({ ready: true });
        } catch (err) {
            return res.status(503).json({ ready: false, reason: 'database_unreachable' });
        }
    });

    router.get('/api/admin/circuit-breakers', authenticateToken, authorizeAdmin, (req, res) => {
        return res.json(getAllBreakerStates());
    });

    return router;
};
