/**
 * CLOUDFLARE INTEGRATION MIDDLEWARE
 * Garante que o sistema funcione corretamente atrás do Cloudflare proxy.
 * 
 * Funcionalidades:
 * - Extrai IP real do visitante via CF-Connecting-IP
 * - Valida headers Cloudflare
 * - Geo-localização via CF-IPCountry
 * - Proteção contra bypass de Cloudflare
 * - Headers de segurança compatíveis com CF
 * 
 * Criado: 30/03/2026
 */

'use strict';

// Ranges de IPs do Cloudflare (IPv4 + IPv6)
// Fonte: https://www.cloudflare.com/ips/
const CF_IPV4_RANGES = [
    '173.245.48.0/20',
    '103.21.244.0/22',
    '103.22.200.0/22',
    '103.31.4.0/22',
    '141.101.64.0/18',
    '108.162.192.0/18',
    '190.93.240.0/20',
    '188.114.96.0/20',
    '197.234.240.0/22',
    '198.41.128.0/17',
    '162.158.0.0/15',
    '104.16.0.0/13',
    '104.24.0.0/14',
    '172.64.0.0/13',
    '131.0.72.0/22'
];

const CF_IPV6_RANGES = [
    '2400:cb00::/32',
    '2606:4700::/32',
    '2803:f800::/32',
    '2405:b500::/32',
    '2405:8100::/32',
    '2a06:98c0::/29',
    '2c0f:f248::/32'
];

/**
 * Verifica se um IP está dentro de um range CIDR (IPv4)
 */
function ipInCIDR(ip, cidr) {
    const [range, bits] = cidr.split('/');
    const mask = ~(2 ** (32 - parseInt(bits)) - 1);
    
    const ipParts = ip.split('.').map(Number);
    const rangeParts = range.split('.').map(Number);
    
    const ipNum = (ipParts[0] << 24) | (ipParts[1] << 16) | (ipParts[2] << 8) | ipParts[3];
    const rangeNum = (rangeParts[0] << 24) | (rangeParts[1] << 16) | (rangeParts[2] << 8) | rangeParts[3];
    
    return (ipNum & mask) === (rangeNum & mask);
}

/**
 * Verifica se o request vem do Cloudflare
 */
function isFromCloudflare(req) {
    const remoteIp = req.socket?.remoteAddress || req.connection?.remoteAddress || '';
    const cleanIp = remoteIp.replace('::ffff:', '');
    
    // Verificar IPv4
    if (cleanIp.includes('.')) {
        return CF_IPV4_RANGES.some(range => ipInCIDR(cleanIp, range));
    }
    
    // IPv6 - verificar prefixo
    return CF_IPV6_RANGES.some(range => {
        const prefix = range.split('/')[0].replace(/:0+/g, ':').replace(/::+/, '::');
        return cleanIp.startsWith(prefix.split('::')[0]);
    });
}

/**
 * Middleware principal do Cloudflare
 * Deve ser aplicado ANTES de outros middlewares de segurança
 */
function cloudflareMiddleware(options = {}) {
    const {
        // Se true, rejeita requests que não venham do CF em produção
        enforceCloudflare = false,
        // Se true, loga informações de debug
        debug = process.env.NODE_ENV !== 'production'
    } = options;

    return function(req, res, next) {
        const cfConnectingIp = req.headers['cf-connecting-ip'];
        const cfRay = req.headers['cf-ray'];
        const cfCountry = req.headers['cf-ipcountry'];
        const cfVisitor = req.headers['cf-visitor'];

        // Detectar se está passando pelo Cloudflare
        const isCF = !!(cfRay || cfConnectingIp);
        req.isCloudflare = isCF;

        if (isCF) {
            // Extrair IP real do visitante (CF-Connecting-IP é o mais confiável)
            if (cfConnectingIp) {
                req.realIp = cfConnectingIp;
                // Sobrescrever req.ip para que rate-limiters usem o IP correto
                Object.defineProperty(req, 'ip', {
                    get: () => cfConnectingIp,
                    configurable: true
                });
            }

            // Geo-localização
            if (cfCountry) {
                req.cfCountry = cfCountry;
            }

            // Ray ID para tracking/debug
            if (cfRay) {
                req.cfRayId = cfRay;
                res.setHeader('X-CF-Ray', cfRay);
            }

            // Detectar protocolo real (HTTPS via CF)
            if (cfVisitor) {
                try {
                    const visitor = JSON.parse(cfVisitor);
                    if (visitor.scheme === 'https') {
                        req.headers['x-forwarded-proto'] = 'https';
                    }
                } catch (e) { /* ignore parse errors */ }
            }

            if (debug) {
                console.log(`[CF] Request via Cloudflare: IP=${cfConnectingIp} Country=${cfCountry || 'N/A'} Ray=${cfRay}`);
            }
        } else if (enforceCloudflare && process.env.NODE_ENV === 'production') {
            // Em produção com enforce, rejeitar requests diretos (bypass CF)
            // Exceção: health checks e localhost
            const directIp = req.socket?.remoteAddress || '';
            const isLocal = directIp.includes('127.0.0.1') || directIp.includes('::1');
            const isHealthCheck = req.path === '/api/health' || req.path === '/health';
            
            if (!isLocal && !isHealthCheck) {
                console.warn(`[CF] ⚠️ Request direto bloqueado (bypass CF): ${directIp} → ${req.path}`);
                return res.status(403).json({
                    error: 'Acesso direto não permitido. Use o domínio configurado.',
                    code: 'CF_BYPASS_BLOCKED'
                });
            }
        }

        next();
    };
}

/**
 * Configura trust proxy para Cloudflare
 * Deve ser chamado na inicialização do app Express
 */
function configureCloudflareProxy(app) {
    // Trust proxy com callback para validar IPs do CF
    app.set('trust proxy', function(ip) {
        const cleanIp = ip.replace('::ffff:', '');
        
        // Sempre confiar em localhost
        if (cleanIp === '127.0.0.1' || cleanIp === '::1' || cleanIp === 'localhost') {
            return true;
        }
        
        // Confiar nos IPs do Cloudflare
        if (cleanIp.includes('.')) {
            return CF_IPV4_RANGES.some(range => ipInCIDR(cleanIp, range));
        }
        
        return false;
    });
}

/**
 * Headers de cache compatíveis com Cloudflare
 * Adiciona Cache-Control e CDN-Cache-Control adequados
 */
function cloudflareCacheHeaders(options = {}) {
    const {
        // Cache de assets estáticos (CSS, JS, imagens)
        staticMaxAge = 7 * 24 * 60 * 60, // 7 dias
        // Cache de páginas HTML
        htmlMaxAge = 0, // Não cachear HTML por padrão
        // Cache no edge do CF (CDN)
        cdnMaxAge = 30 * 24 * 60 * 60 // 30 dias no edge
    } = options;

    return function(req, res, next) {
        // Pular para APIs - sem cache
        if (req.path.startsWith('/api/')) {
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
            res.setHeader('CDN-Cache-Control', 'no-store');
            return next();
        }

        const ext = req.path.split('.').pop()?.toLowerCase();
        const staticExts = ['css', 'js', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'ico', 'woff', 'woff2', 'ttf', 'eot'];
        
        if (staticExts.includes(ext)) {
            // Assets estáticos - cache agressivo
            res.setHeader('Cache-Control', `public, max-age=${staticMaxAge}, immutable`);
            res.setHeader('CDN-Cache-Control', `max-age=${cdnMaxAge}`);
        } else if (ext === 'html' || !ext || req.path.endsWith('/')) {
            // HTML - sempre revalidar
            res.setHeader('Cache-Control', `public, max-age=${htmlMaxAge}, must-revalidate`);
            res.setHeader('CDN-Cache-Control', 'max-age=60'); // 1 min no edge
        }

        next();
    };
}

/**
 * Middleware de segurança extra para Cloudflare
 * Adiciona headers que complementam os do CF
 */
function cloudflareSecurityHeaders() {
    return function(req, res, next) {
        // Prevenir que a página seja embutida em iframes de outros domínios
        // (CF já possui this, mas reforçamos)
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'SAMEORIGIN');
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        
        // Permissions Policy - restringir APIs do browser
        res.setHeader('Permissions-Policy', 
            'camera=(), microphone=(), geolocation=(self), payment=(), usb=()');

        next();
    };
}

module.exports = {
    cloudflareMiddleware,
    configureCloudflareProxy,
    cloudflareCacheHeaders,
    cloudflareSecurityHeaders,
    isFromCloudflare,
    CF_IPV4_RANGES,
    CF_IPV6_RANGES
};
