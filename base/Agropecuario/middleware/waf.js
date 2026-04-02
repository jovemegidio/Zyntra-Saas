/**
 * WAF (Web Application Firewall) — Middleware de Aplicação
 * =========================================================
 * Bloqueia padrões de ataque conhecidos antes de alcançarem as rotas.
 * 
 * Protege contra:
 * - Path traversal (../../etc/passwd)
 * - Scanners/exploit tools (sqlmap, nikto, nmap, etc.)
 * - Paths de exploit comuns (/wp-admin, /phpmyadmin, etc.)
 * - SQL injection patterns em query strings
 * - Headers maliciosos/oversized
 * - Null bytes em URLs
 * 
 * Criado: 15/03/2026 — Sprint 6 (Application WAF)
 */
'use strict';

let logSecurityEvent;
try {
    logSecurityEvent = require('../services/security-logger').logSecurityEvent;
} catch (_) {
    logSecurityEvent = (event, details) => console.warn(`[WAF:${event}]`, details?.message || event);
}

// ============================================
// 1. SCANNER / BOT DETECTION
// ============================================

const BLOCKED_USER_AGENTS = [
    'sqlmap', 'nikto', 'nmap', 'masscan', 'zgrab',
    'gobuster', 'dirbuster', 'dirb', 'wfuzz', 'ffuf',
    'nuclei', 'httpx', 'subfinder', 'amass',
    'havij', 'acunetix', 'nessus', 'openvas',
    'burpsuite', 'zaproxy', 'owasp',
    'python-requests/', 'go-http-client/',
    'libwww-perl', 'lwp-trivial', 'wget/',
    'scrapy', 'phantom', 'headlesschrome',
];

// ============================================
// 2. EXPLOIT PATH PATTERNS
// ============================================

const BLOCKED_PATHS = [
    // CMS scanners
    '/wp-admin', '/wp-login', '/wp-content', '/wp-includes',
    '/wordpress', '/wp-json', '/xmlrpc.php',
    '/administrator', '/joomla',
    '/drupal', '/sites/default',
    // Database tools
    '/phpmyadmin', '/pma', '/myadmin', '/mysql',
    '/adminer', '/dbadmin',
    // Config / info leak
    '/.env', '/.git', '/.svn', '/.hg',
    '/.htaccess', '/.htpasswd', '/.DS_Store',
    '/web.config', '/server-status', '/server-info',
    '/phpinfo', '/info.php', '/test.php',
    '/config.php', '/configuration.php',
    // Shell uploaders
    '/shell', '/c99', '/r57', '/b374k',
    '/cmd', '/exec', '/system',
    // Common exploits
    '/cgi-bin', '/scripts/..', '/..;/',
    '/actuator', '/jolokia', '/console',
    '/solr', '/jenkins', '/manager/html',
    '/struts', '/invoker/readonly',
    '/_debug', '/__debug__',
];

// ============================================
// 3. MALICIOUS PATTERN DETECTION
// ============================================

// Path traversal patterns
const PATH_TRAVERSAL_RE = /(\.\.[\/\\]){2,}|(\.\.[\/\\])+.*(etc|passwd|shadow|hosts|windows|boot\.ini|win\.ini)/i;

// Null byte injection
const NULL_BYTE_RE = /%00|\\x00|\\0/;

// SQL injection patterns in URL/query (not body — body is handled by sanitizeInput)
const SQLI_URL_RE = /(\bunion\b.*\bselect\b|\bor\b\s+\d+=\d+|\band\b\s+\d+=\d+|;\s*drop\s+|;\s*delete\s+|;\s*insert\s+|;\s*update\s+.*\bset\b|\/\*.*\*\/|sleep\s*\(|benchmark\s*\(|load_file\s*\(|into\s+outfile|into\s+dumpfile)/i;

// XSS patterns in URL
const XSS_URL_RE = /(<script|javascript:|on(error|load|click|mouseover)\s*=|<iframe|<object|<embed|<svg\s+on|data:text\/html)/i;

// Command injection in URL
const CMDI_URL_RE = /(;\s*(ls|cat|rm|wget|curl|nc|bash|sh|python|perl|php|ruby|node)\b|\|\s*(ls|cat|rm|wget|curl|nc|bash|sh)\b|`[^`]+`|\$\([^)]+\))/i;

// ============================================
// 4. WAF MIDDLEWARE
// ============================================

/**
 * Application-level WAF middleware.
 * Should be mounted BEFORE any route handlers and AFTER trust-proxy.
 * 
 * @param {Object} options - Configuration
 * @param {boolean} options.logOnly - If true, log but don't block (dry-run mode)
 * @returns {Function} Express middleware
 */
function createWAF(options = {}) {
    const { logOnly = false } = options;

    // Pre-compile lowercase blocked paths for fast lookup
    const blockedPathsLower = new Set(BLOCKED_PATHS.map(p => p.toLowerCase()));
    // Pre-compile lowercase user agent fragments
    const blockedUALower = BLOCKED_USER_AGENTS.map(ua => ua.toLowerCase());

    function blockRequest(req, res, reason, code = 'WAF_BLOCKED') {
        logSecurityEvent('WAF_BLOCK', {
            message: reason,
            ip: req.ip,
            path: req.path,
            method: req.method,
            userAgent: (req.headers['user-agent'] || '').substring(0, 200)
        });

        if (logOnly) return false; // Don't actually block

        res.status(403).json({
            error: 'Requisição bloqueada por política de segurança.',
            code
        });
        return true;
    }

    return function wafMiddleware(req, res, next) {
        const path = req.path || '';
        const pathLower = path.toLowerCase();
        const fullUrl = req.originalUrl || '';
        const ua = (req.headers['user-agent'] || '').toLowerCase();

        // --- 1. Null byte injection ---
        if (NULL_BYTE_RE.test(fullUrl)) {
            if (blockRequest(req, res, `Null byte injection: ${fullUrl.substring(0, 100)}`, 'WAF_NULL_BYTE')) return;
        }

        // --- 2. Path traversal ---
        if (PATH_TRAVERSAL_RE.test(decodeURIComponent(fullUrl).replace(/\\/g, '/'))) {
            if (blockRequest(req, res, `Path traversal: ${fullUrl.substring(0, 100)}`, 'WAF_PATH_TRAVERSAL')) return;
        }

        // --- 3. Blocked exploit paths ---
        for (const blocked of blockedPathsLower) {
            if (pathLower === blocked || pathLower.startsWith(blocked + '/') || pathLower.startsWith(blocked + '?')) {
                if (blockRequest(req, res, `Blocked path: ${path}`, 'WAF_BLOCKED_PATH')) return;
                break;
            }
        }

        // --- 4. Scanner/bot user-agent ---
        if (ua) {
            for (const blocked of blockedUALower) {
                if (ua.includes(blocked)) {
                    if (blockRequest(req, res, `Blocked scanner: ${blocked}`, 'WAF_SCANNER')) return;
                    break;
                }
            }
        }

        // --- 5. SQL injection in URL ---
        if (SQLI_URL_RE.test(decodeURIComponent(fullUrl))) {
            if (blockRequest(req, res, `SQL injection in URL: ${fullUrl.substring(0, 100)}`, 'WAF_SQLI')) return;
        }

        // --- 6. XSS in URL ---
        if (XSS_URL_RE.test(decodeURIComponent(fullUrl))) {
            if (blockRequest(req, res, `XSS in URL: ${fullUrl.substring(0, 100)}`, 'WAF_XSS')) return;
        }

        // --- 7. Command injection in URL ---
        if (CMDI_URL_RE.test(decodeURIComponent(fullUrl))) {
            if (blockRequest(req, res, `Command injection in URL: ${fullUrl.substring(0, 100)}`, 'WAF_CMDI')) return;
        }

        // --- 8. Oversized headers (>8KB per header, >32KB total) ---
        const rawHeaders = req.rawHeaders || [];
        let totalHeaderSize = 0;
        for (let i = 0; i < rawHeaders.length; i += 2) {
            const headerSize = (rawHeaders[i] || '').length + (rawHeaders[i + 1] || '').length;
            totalHeaderSize += headerSize;
            if (headerSize > 8192) {
                if (blockRequest(req, res, `Oversized header: ${(rawHeaders[i] || '').substring(0, 50)} (${headerSize}B)`, 'WAF_HEADER_SIZE')) return;
                break;
            }
        }
        if (totalHeaderSize > 32768) {
            if (blockRequest(req, res, `Total headers too large: ${totalHeaderSize}B`, 'WAF_HEADER_SIZE')) return;
        }

        // --- 9. Suspicious double encoding ---
        if (/%25(2[eEfF]|3[bBdD]|27|22)/i.test(fullUrl)) {
            if (blockRequest(req, res, `Double encoding detected: ${fullUrl.substring(0, 100)}`, 'WAF_DOUBLE_ENCODE')) return;
        }

        next();
    };
}

module.exports = { createWAF };
