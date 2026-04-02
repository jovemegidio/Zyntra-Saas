// ============================================
// ZYNTRA BRANDING MIDDLEWARE
// Ativado via env BRAND=zyntra
// Substitui referências Aluforce → Zyntra
// em respostas HTML servidas pelo Express
// ============================================

const BRAND = process.env.BRAND || '';
const IS_ZYNTRA = BRAND.toLowerCase() === 'zyntra';
const IS_DEMO = process.env.DEMO_MODE === 'true';

// Logo paths
const ZYNTRA_LOGO_BRANCO = '/images/zyntra-branco.png';
const ZYNTRA_LOGO_AZUL = '/images/zyntra-branco.png'; // usar branco como fallback

// Banner de demo injetado no topo das páginas HTML
const DEMO_BANNER = IS_DEMO ? `
<style>
.zyntra-demo-banner {
    position: fixed; top: 0; left: 0; right: 0; z-index: 99999;
    background: linear-gradient(135deg, #6C5CE7 0%, #4834d4 100%);
    color: white; text-align: center; padding: 6px 16px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 13px; font-weight: 500; letter-spacing: 0.3px;
    box-shadow: 0 2px 8px rgba(108,92,231,0.3);
    display: flex; align-items: center; justify-content: center; gap: 12px;
}
.zyntra-demo-banner a {
    color: white; background: rgba(255,255,255,0.2); padding: 3px 12px;
    border-radius: 20px; text-decoration: none; font-weight: 600;
    transition: background 0.2s;
}
.zyntra-demo-banner a:hover { background: rgba(255,255,255,0.35); }
body { padding-top: 36px !important; }
/* Ajustar sidebar e header */
.sidebar, .nav-sidebar, [class*="sidebar"] { top: 36px !important; }
header, .header, .top-bar, [class*="header"] { top: 36px !important; }
</style>
<div class="zyntra-demo-banner">
    🚀 <strong>Modo Demonstração</strong> — Explore todas as funcionalidades do Zyntra SGE livremente
    <a href="https://aluforce.api.br/Zyntra-SGE/" target="_blank">← Assinar Plano</a>
</div>
` : '';

// CSS overrides para branding Zyntra
const ZYNTRA_CSS = IS_ZYNTRA ? `
<style id="zyntra-brand-override">
/* Override cores primárias para Zyntra */
:root {
    --primary: #6C5CE7 !important;
    --primary-hover: #5A4BD1 !important;
    --accent: #A29BFE !important;
}
/* Login page overrides */
.login-card .logo-img, .login-logo img {
    filter: hue-rotate(260deg) saturate(1.3) !important;
}
/* Title overrides */
.brand-name, .app-title { font-family: 'Inter', sans-serif !important; }
</style>
` : '';

/**
 * Middleware que intercepta respostas HTML e aplica branding Zyntra
 */
function zyntraBrandingMiddleware(req, res, next) {
    if (!IS_ZYNTRA) return next();

    // Só processar HTML
    const originalSend = res.send;
    res.send = function(body) {
        if (typeof body === 'string' && (
            body.includes('<!DOCTYPE html') || 
            body.includes('<html') ||
            res.getHeader('content-type')?.includes('text/html')
        )) {
            // Substituições de texto
            body = body
                // Títulos e nomes
                .replace(/ALUFORCE/g, 'ZYNTRA')
                .replace(/Aluforce/g, 'Zyntra')
                .replace(/aluforce/g, 'zyntra')
                // Subtítulo específico
                .replace(/Sistema de Gestão Empresarial/g, 'Sistema de Gestão Empresarial')
                // Logos - substituir referências de logo Aluforce
                .replace(/Logo Monocromatico - Branco - Aluforce copy\.webp/g, 'zyntra-branco.png')
                .replace(/Logo Monocromatico - Azul - Aluforce\.png/g, 'zyntra-branco.png')
                .replace(/Logo Monocromatico - Branco - Aluforce\.png/g, 'zyntra-branco.png')
                .replace(/Logo Monocromatico - Branco - Aluforce\.webp/g, 'zyntra-branco.png')
                .replace(/Logo Monocromatico - Azul - Aluforce\.webp/g, 'zyntra-branco.png')
                .replace(/Interativo-Aluforce\.png/g, 'zyntra-branco.png')
                .replace(/Interativo-Aluforce\.webp/g, 'zyntra-branco.png')
                // Emails
                .replace(/@aluforce\.ind\.br/g, '@zyntra.com.br')
                // Fix: não substituir caminhos de API ou arquivos internos
                .replace(/zyntra\.api\.br/g, 'aluforce.api.br')  // reverter domínio da API
                .replace(/zyntra\.ind\.br/g, 'aluforce.ind.br'); // reverter se tiver
            
            // Injetar CSS de branding e banner de demo antes do </head>
            if (body.includes('</head>')) {
                body = body.replace('</head>', ZYNTRA_CSS + '</head>');
            }
            
            // Injetar banner de demo depois do <body>
            if (DEMO_BANNER && body.includes('<body')) {
                body = body.replace(/(<body[^>]*>)/, '$1' + DEMO_BANNER);
            }

            // Atualizar Content-Length
            res.setHeader('Content-Length', Buffer.byteLength(body));
        }
        
        return originalSend.call(this, body);
    };
    
    next();
}

/**
 * Transforma HTML string aplicando branding Zyntra
 * Pode ser chamado diretamente (ex: no sendFile interceptor do server.js)
 */
function transformHtml(html) {
    if (!IS_ZYNTRA || typeof html !== 'string') return html;
    if (!html.includes('<!DOCTYPE html') && !html.includes('<html')) return html;

    // Substituições de texto
    html = html
        .replace(/ALUFORCE/g, 'ZYNTRA')
        .replace(/Aluforce/g, 'Zyntra')
        .replace(/aluforce/g, 'zyntra')
        .replace(/Sistema de Gestão Empresarial/g, 'Sistema de Gestão Empresarial')
        .replace(/Logo Monocromatico - Branco - Aluforce copy\.webp/g, 'zyntra-branco.png')
        .replace(/Logo Monocromatico - Azul - Aluforce\.png/g, 'zyntra-branco.png')
        .replace(/Logo Monocromatico - Branco - Aluforce\.png/g, 'zyntra-branco.png')
        .replace(/Logo Monocromatico - Branco - Aluforce\.webp/g, 'zyntra-branco.png')
        .replace(/Logo Monocromatico - Azul - Aluforce\.webp/g, 'zyntra-branco.png')
        .replace(/Interativo-Aluforce\.png/g, 'zyntra-branco.png')
        .replace(/Interativo-Aluforce\.webp/g, 'zyntra-branco.png')
        .replace(/@aluforce\.ind\.br/g, '@zyntra.com.br')
        .replace(/zyntra\.api\.br/g, 'aluforce.api.br')
        .replace(/zyntra\.ind\.br/g, 'aluforce.ind.br');

    // Injetar CSS antes de </head>
    if (html.includes('</head>')) {
        html = html.replace('</head>', ZYNTRA_CSS + '</head>');
    }

    // Injetar banner demo depois de <body>
    if (DEMO_BANNER && html.includes('<body')) {
        html = html.replace(/(<body[^>]*>)/, '$1' + DEMO_BANNER);
    }

    return html;
}

/**
 * Adiciona info de branding ao request
 */
function zyntraBrandInfo(req, res, next) {
    if (IS_ZYNTRA) {
        req.brand = 'zyntra';
        req.isDemo = IS_DEMO;
        res.locals.brand = 'zyntra';
        res.locals.brandName = 'Zyntra';
        res.locals.isDemo = IS_DEMO;
    } else {
        req.brand = 'aluforce';
        req.isDemo = false;
        res.locals.brand = 'aluforce';
        res.locals.brandName = 'Aluforce';
        res.locals.isDemo = false;
    }
    next();
}

module.exports = {
    zyntraBrandingMiddleware,
    zyntraBrandInfo,
    transformHtml,
    IS_ZYNTRA,
    IS_DEMO,
    BRAND
};
