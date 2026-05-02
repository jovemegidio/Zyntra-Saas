'use strict';

const fs = require('fs');
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const compression = require('compression');

const app = express();
const PORT = parseInt(process.env.PORT || process.env.SERVER_PORT || '3020', 10);
const configPath = path.join(__dirname, 'config', 'verticals.json');
const verticals = JSON.parse(fs.readFileSync(configPath, 'utf8'));

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.use(compression());
app.use(express.json({ limit: '1mb' }));
const publicDir = path.join(__dirname, 'public');
const staticOptions = {
  maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0,
  etag: true
};
app.use('/assets', express.static(publicDir, staticOptions));
app.use('/ramos/assets', express.static(publicDir, staticOptions));

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function iconSvg(name) {
  const icons = {
    heart: '<path d="M12 21s-7-4.6-9.3-8.5C.7 9.2 2.5 5 6.4 5c2 0 3.4 1.1 4.1 2.1C11.2 6.1 12.6 5 14.6 5c3.9 0 5.7 4.2 3.7 7.5C19 16.4 12 21 12 21z"/>',
    spark: '<path d="M12 2l1.9 6.1L20 10l-6.1 1.9L12 18l-1.9-6.1L4 10l6.1-1.9L12 2z"/><path d="M19 16l.9 2.6L22 19l-2.1.4L19 22l-.9-2.6L16 19l2.1-.4L19 16z"/>',
    book: '<path d="M4 5.5A2.5 2.5 0 016.5 3H20v17H6.5A2.5 2.5 0 014 17.5v-12z"/><path d="M8 7h8M8 11h8"/>',
    hands: '<path d="M7 11l3 3 7-7"/><path d="M4 13l5 5a4 4 0 005.7 0L20 12"/>',
    coin: '<circle cx="12" cy="12" r="8"/><path d="M12 8v8M9.5 10.5C10.2 9.5 13.8 9.5 14.5 10.5S13.8 12 12 12s-2.5.5-2.5 1.5S10.2 15.5 12 15.5s2.5-.5 2.5-1.5"/>',
    users: '<path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 00-3-3.9"/><path d="M16 3.1a4 4 0 010 7.8"/>',
    cart: '<path d="M3 3h2l2.2 10.4A2 2 0 009.2 15H18a2 2 0 001.9-1.4L21 7H6"/><circle cx="9" cy="20" r="1"/><circle cx="18" cy="20" r="1"/>',
    bottle: '<path d="M10 2h4v4l1 2v12a2 2 0 01-2 2h-2a2 2 0 01-2-2V8l1-2V2z"/><path d="M9 13h6"/>',
    boxes: '<path d="M3 7l9-4 9 4-9 4-9-4z"/><path d="M3 7v10l9 4 9-4V7"/><path d="M12 11v10"/>',
    truck: '<path d="M3 6h11v10H3z"/><path d="M14 10h4l3 3v3h-7z"/><circle cx="7" cy="19" r="2"/><circle cx="17" cy="19" r="2"/>',
    chart: '<path d="M4 19V5"/><path d="M4 19h16"/><path d="M8 15l3-4 3 2 4-7"/>',
    register: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 8h8M8 12h8M8 16h3M15 16h1"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/>',
    clipboard: '<path d="M9 4h6l1 2h3v16H5V6h3l1-2z"/><path d="M9 12h6M9 16h6"/>',
    tag: '<path d="M20 13l-7 7L4 11V4h7l9 9z"/><circle cx="8" cy="8" r="1"/>',
    receipt: '<path d="M6 2h12v20l-3-2-3 2-3-2-3 2V2z"/><path d="M9 7h6M9 11h6M9 15h4"/>',
    cross: '<path d="M10 3h4v7h7v4h-7v7h-4v-7H3v-4h7z"/>',
    file: '<path d="M6 2h8l4 4v16H6z"/><path d="M14 2v5h5M9 12h6M9 16h6"/>',
    shield: '<path d="M12 2l8 4v6c0 5-3.4 8.6-8 10-4.6-1.4-8-5-8-10V6l8-4z"/><path d="M9 12l2 2 4-5"/>',
    card: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h4"/>'
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[name] || icons.spark}</svg>`;
}

function pageShell(title, body, accent, accentSoft) {
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)} | Zyntra</title>
  <link rel="stylesheet" href="/ramos/assets/app.css">
  <style>:root{--accent:${escapeHtml(accent || '#2563eb')};--accent-soft:${escapeHtml(accentSoft || '#dbeafe')};}</style>
</head>
<body>
${body}
<script src="/ramos/assets/app.js" defer></script>
</body>
</html>`;
}

function renderHub() {
  const cards = Object.entries(verticals).map(([slug, item]) => `
    <a class="hub-card" href="/${escapeHtml(slug)}/">
      <span class="hub-pill">${escapeHtml(item.sector)}</span>
      <strong>${escapeHtml(item.name)}</strong>
      <small>${escapeHtml(item.description)}</small>
    </a>`).join('');

  const body = `
<main class="hub">
  <section class="hub-hero">
    <div>
      <p class="eyebrow">Zyntra Ramos</p>
      <h1>Verticais configuradas por ramo de atuacao</h1>
      <p class="lead">Centro Espirita, Adega, Mercado e Farmacia agora tem entrada propria, modulos esperados e linguagem operacional do segmento.</p>
    </div>
  </section>
  <section class="hub-grid">${cards}</section>
  <section class="hub-note">
    <strong>Igrejas</strong>
    <span>A plataforma de igreja ja esta publicada em <a href="/igreja/login.html">/igreja/login.html</a>.</span>
  </section>
</main>`;
  return pageShell('Ramos', body, '#4f46e5', '#e0e7ff');
}

function renderVertical(slug, item) {
  const metrics = item.metrics.map(metric => `
    <div class="metric">
      <span>${escapeHtml(metric.label)}</span>
      <strong>${escapeHtml(metric.value)}</strong>
    </div>`).join('');

  const modules = item.modules.map(module => `
    <article class="module-card">
      <div class="module-icon">${iconSvg(module.icon)}</div>
      <div>
        <h3>${escapeHtml(module.title)}</h3>
        <p>${escapeHtml(module.text)}</p>
      </div>
    </article>`).join('');

  const workflows = item.workflows.map(flow => `<li>${escapeHtml(flow)}</li>`).join('');

  const body = `
<main class="vertical-page">
  <nav class="topbar">
    <a href="/ramos/" class="brand">Zyntra Ramos</a>
    <div class="topbar-actions">
      <a href="/${escapeHtml(slug)}/login" class="ghost-link">Login</a>
      <a href="/${escapeHtml(slug)}/api/config" class="ghost-link">Config JSON</a>
    </div>
  </nav>
  <section class="hero">
    <div class="hero-copy">
      <p class="eyebrow">${escapeHtml(item.sector)}</p>
      <h1>${escapeHtml(item.name)}</h1>
      <p class="lead">${escapeHtml(item.headline)}</p>
      <p>${escapeHtml(item.description)}</p>
      <div class="hero-actions">
        <a class="primary-button" href="/${escapeHtml(slug)}/login">${escapeHtml(item.primaryAction)}</a>
        <a class="secondary-button" href="/ramos/">Ver todos</a>
      </div>
    </div>
    <div class="metrics-panel">${metrics}</div>
  </section>
  <section class="section-heading">
    <p class="eyebrow">Modulos ativos</p>
    <h2>Configurado para ${escapeHtml(item.audience)}</h2>
  </section>
  <section class="module-grid">${modules}</section>
  <section class="workflow-band">
    <div>
      <p class="eyebrow">Fluxos principais</p>
      <h2>Rotina operacional pronta para evoluir</h2>
    </div>
    <ul>${workflows}</ul>
  </section>
</main>`;
  return pageShell(item.name, body, item.accent, item.accentSoft);
}

function renderLogin(slug, item) {
  const body = `
<main class="login-page">
  <section class="login-card">
    <a href="/${escapeHtml(slug)}/" class="back-link">Voltar</a>
    <p class="eyebrow">${escapeHtml(item.sector)}</p>
    <h1>${escapeHtml(item.name)}</h1>
    <p>${escapeHtml(item.loginHint)}</p>
    <form class="login-form" onsubmit="return window.ZyntraRamos.fakeLogin(event)">
      <label>Email<input type="email" name="email" placeholder="usuario@empresa.com.br" required></label>
      <label>Senha<input type="password" name="password" placeholder="Senha" required></label>
      <button class="primary-button" type="submit">Entrar</button>
      <output id="login-output" aria-live="polite"></output>
    </form>
  </section>
</main>`;
  return pageShell(`${item.name} Login`, body, item.accent, item.accentSoft);
}

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    app: 'zyntra-ramos',
    verticals: Object.keys(verticals),
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

app.get('/ramos/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    app: 'zyntra-ramos',
    verticals: Object.keys(verticals),
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

app.get('/api/verticals', (_req, res) => {
  res.json({ success: true, verticals });
});

app.get('/ramos/api/verticals', (_req, res) => {
  res.json({ success: true, verticals });
});

app.get('/', (_req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.send(renderHub());
});

app.get('/ramos/?', (_req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.send(renderHub());
});

app.get('/:slug/api/config', (req, res) => {
  const item = verticals[req.params.slug];
  if (!item) return res.status(404).json({ success: false, message: 'Ramo nao encontrado' });
  res.json({ success: true, slug: req.params.slug, config: item });
});

app.get('/:slug/login', (req, res) => {
  const item = verticals[req.params.slug];
  if (!item) return res.redirect('/ramos/');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.send(renderLogin(req.params.slug, item));
});

app.get('/:slug/?', (req, res) => {
  const item = verticals[req.params.slug];
  if (!item) return res.redirect('/ramos/');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.send(renderVertical(req.params.slug, item));
});

app.use((_req, res) => {
  res.status(404).send(renderHub());
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Zyntra Ramos online on port ${PORT}`);
  });
}

module.exports = app;
