'use strict';
const path = require('path');
const fs   = require('fs');

const TEMPLATE_PATH = path.join(__dirname, '../../public/templates/relatorio-template.html');
const CHROMIUM_PATH = '/root/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome';

const BRAND_LOGOS = {
    'labor-energy':  'labor-energy-logo.png',
    'labor-eletric': 'labor-eletric-logo.png',
    'zyntra':        'zyntra-branco.png',
};
const DEFAULT_LOGO_FILE = 'Logo Monocromatico - Azul - Aluforce.png';

function getBrandLogoPath() {
    const brand = (process.env.BRAND || '').toLowerCase().trim();
    const file  = BRAND_LOGOS[brand] || DEFAULT_LOGO_FILE;
    return path.join(__dirname, '../../public/images', file);
}

const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp' };

async function generatePdfRelatorio(relatorioData, logoPath) {
    const puppeteer = require(path.join(__dirname, '../../node_modules/puppeteer'));

    let html = fs.readFileSync(TEMPLATE_PATH, 'utf8');

    const lp  = logoPath || getBrandLogoPath();
    const ext = path.extname(lp).toLowerCase();
    if (fs.existsSync(lp)) {
        const b64     = fs.readFileSync(lp).toString('base64');
        const logoSrc = 'data:' + (MIME[ext] || 'image/png') + ';base64,' + b64;
        html = html.replace(/(<img[^>]*id="tpl-logo"[^>]*src=")[^"]*"/, '$1' + logoSrc + '"');
    }

    const dataScript = '<script>window.relatorioData = ' + JSON.stringify(relatorioData) + ';</script>';
    html = html.replace('<script>', dataScript + '\n<script>');

    const browser = await puppeteer.launch({
        executablePath: CHROMIUM_PATH,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
    });
    try {
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });
        return await page.pdf({
            format: 'A4',
            landscape: true,
            printBackground: true,
            margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' }
        });
    } finally {
        await browser.close();
    }
}

module.exports = generatePdfRelatorio;
