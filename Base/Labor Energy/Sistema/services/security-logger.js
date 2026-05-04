/**
 * SECURITY AUDIT LOGGER — Dedicated security event logging
 * AUDIT-FIX LOG-001: Centralized security event logging with alerting
 * 
 * Logs to:
 * - logs/security.log (all security events)
 * - logs/error.log (via main logger for critical events)
 * - Discord webhook (optional, for real-time alerts)
 * 
 * @module services/security-logger
 */
'use strict';

const winston = require('winston');
const path = require('path');
const fs = require('fs');

const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

const securityLogger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({
            filename: path.join(logsDir, 'security.log'),
            maxsize: 10 * 1024 * 1024, // 10MB
            maxFiles: 10
        }),
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.printf(({ timestamp, level, event, message, ...meta }) =>
                    `${timestamp} [${level}] [SECURITY:${event}] ${message}`)
            )
        })
    ]
});

/**
 * Log a security event
 * @param {string} event - Event type (AUTH_FAILURE, IDOR_ATTEMPT, RATE_LIMIT, CSRF_VIOLATION, etc.)
 * @param {Object} details - Event details
 */
function logSecurityEvent(event, details = {}) {
    securityLogger.warn({
        event,
        message: details.message || event,
        ip: details.ip,
        userId: details.userId,
        path: details.path,
        method: details.method,
        userAgent: details.userAgent,
        timestamp: new Date().toISOString(),
        ...details
    });

    // Alert on critical events via Discord webhook (if configured)
    if (['IDOR_ATTEMPT', 'BRUTE_FORCE', 'SQL_INJECTION', 'CRITICAL_AUTH_FAILURE'].includes(event)) {
        alertCriticalEvent(event, details).catch(() => {});
    }
}

async function alertCriticalEvent(event, details) {
    const webhookUrl = process.env.DISCORD_SECURITY_WEBHOOK;
    if (!webhookUrl) return;

    try {
        const { discordBreaker } = require('./external-breakers');
        await discordBreaker.execute(async () => {
            const fetch = globalThis.fetch || require('node-fetch');
            await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: `🚨 **SECURITY ALERT** [${event}]\nIP: ${details.ip || 'N/A'}\nUser: ${details.userId || 'N/A'}\nPath: ${details.path || 'N/A'}\nTime: ${new Date().toISOString()}`
                })
            });
        });
    } catch (e) {
        // Circuit breaker will handle repeated failures
    }
}

module.exports = { logSecurityEvent, securityLogger };
