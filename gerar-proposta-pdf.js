/**
 * Gerador de Proposta Comercial — Zyntra ERP
 * Gera arquivo HTML otimizado para impressão (Ctrl+P → Salvar como PDF)
 * Execução: node gerar-proposta-pdf.js
 */
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const OUTPUT = path.join(__dirname, 'Proposta-Comercial-Zyntra-ERP.html');

// Logo branca como base64
let logoTag = '';
const logoPath = path.join(__dirname, 'public', 'images', 'zyntra-branco.png');
if (fs.existsSync(logoPath)) {
    const b64 = fs.readFileSync(logoPath).toString('base64');
    logoTag = `<img src="data:image/png;base64,${b64}" class="cover-logo" alt="Zyntra">`;
}

const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Proposta Comercial — Zyntra ERP</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

  :root {
    --primary: #4F46E5;
    --primary-light: #818CF8;
    --primary-bg: #EEF2FF;
    --dark: #1E1B4B;
    --text: #1F2937;
    --muted: #6B7280;
    --green: #059669;
    --accent: #7C3AED;
    --line: #E5E7EB;
  }

  @page {
    size: A4;
    margin: 0;
  }

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    color: var(--text);
    font-size: 11px;
    line-height: 1.55;
    background: #f0f0f0;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  /* ─── BOTÃO SALVAR (só na tela) ─── */
  .save-bar {
    position: fixed; top: 0; left: 0; right: 0; z-index: 999;
    background: linear-gradient(135deg, var(--dark), #312E81);
    padding: 14px 30px;
    display: flex; align-items: center; justify-content: center; gap: 16px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
  }
  .save-bar span { color: #A5B4FC; font-size: 13px; }
  .save-bar button {
    background: var(--primary); color: white; border: none;
    padding: 10px 28px; border-radius: 8px; font-size: 13px;
    font-weight: 700; cursor: pointer; letter-spacing: 0.5px;
    transition: all 0.2s;
  }
  .save-bar button:hover { background: #4338CA; transform: translateY(-1px); }

  @media print { .save-bar { display: none !important; } body { background: white; } }

  /* ─── CAPA ─── */
  .cover {
    width: 210mm; min-height: 297mm;
    margin: 60px auto 0;
    background: linear-gradient(145deg, #1E1B4B 0%, #312E81 40%, #4338CA 100%);
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    position: relative; overflow: hidden;
    page-break-after: always;
  }

  @media print { .cover { margin: 0 auto; } }

  .cover::before {
    content: ''; position: absolute; top: 0; left: 0; right: 0; height: 6px;
    background: linear-gradient(90deg, #818CF8, #A78BFA, #C084FC);
  }
  .cover::after {
    content: ''; position: absolute;
    width: 600px; height: 600px; border-radius: 50%;
    background: rgba(99, 102, 241, 0.06);
    top: -200px; right: -200px;
  }

  .cover-logo { width: 260px; margin-bottom: 45px; filter: drop-shadow(0 4px 24px rgba(99,102,241,0.35)); }

  .cover h1 {
    font-size: 44px; font-weight: 900; color: white;
    letter-spacing: -1.5px; margin-bottom: 14px;
  }
  .cover .subtitle { font-size: 19px; color: #A5B4FC; font-weight: 400; margin-bottom: 8px; }
  .cover .subtitle2 { font-size: 13px; color: #9CA3AF; font-weight: 300; }

  .cover-info {
    margin-top: 65px;
    background: rgba(45, 42, 110, 0.65);
    border: 1px solid rgba(165, 180, 252, 0.15);
    border-radius: 14px; padding: 26px 52px;
    text-align: center; backdrop-filter: blur(12px);
  }
  .cover-info .company { font-size: 16px; font-weight: 700; color: white; margin-bottom: 8px; }
  .cover-info .details { font-size: 11.5px; color: #A5B4FC; line-height: 1.9; }
  .cover-info .date { font-size: 10px; color: #9CA3AF; margin-top: 10px; }

  /* ─── PÁGINAS ─── */
  .page {
    width: 210mm; min-height: 297mm;
    margin: 20px auto;
    background: white;
    padding: 48px 52px 60px;
    position: relative;
    page-break-after: always;
    box-shadow: 0 2px 20px rgba(0,0,0,0.08);
  }
  @media print { .page { margin: 0 auto; box-shadow: none; } }

  .page::before {
    content: ''; position: absolute; top: 0; left: 0; right: 0; height: 4px;
    background: linear-gradient(90deg, var(--primary), var(--accent));
  }

  .page-footer {
    position: absolute; bottom: 22px; left: 52px; right: 52px;
    display: flex; justify-content: space-between;
    font-size: 7.5px; color: #B0B0B0;
    border-top: 1px solid var(--line); padding-top: 8px;
  }

  /* ─── SEÇÕES ─── */
  .section-title {
    display: flex; align-items: center; gap: 12px;
    margin-top: 30px; margin-bottom: 15px;
    padding-bottom: 9px;
    border-bottom: 2.5px solid var(--primary);
  }
  .section-title.first { margin-top: 0; }

  .section-title .icon {
    width: 34px; height: 34px;
    background: var(--primary-bg); border-radius: 9px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .section-title .icon svg { width: 18px; height: 18px; }

  .td-mod svg { width: 14px; height: 14px; vertical-align: -2px; margin-right: 4px; }
  .diff-card .lbl svg { width: 13px; height: 13px; vertical-align: -2px; margin-right: 3px; }
  .section-title h2 {
    font-size: 16px; font-weight: 700; color: var(--dark);
    letter-spacing: 0.5px; text-transform: uppercase;
  }

  .intro { font-size: 11px; color: var(--text); line-height: 1.7; margin-bottom: 14px; }
  .muted-text { color: var(--muted); font-size: 10.5px; line-height: 1.6; margin-bottom: 18px; }

  /* ─── TABELAS ─── */
  table { width: 100%; border-collapse: collapse; margin: 10px 0 20px; font-size: 9.5px; }

  thead th {
    background: var(--primary); color: white; font-weight: 600;
    padding: 10px 13px; text-align: left;
    font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px;
  }
  thead th:first-child { border-radius: 7px 0 0 0; }
  thead th:last-child { border-radius: 0 7px 0 0; }

  tbody td { padding: 9px 13px; border-bottom: 1px solid #F3F4F6; vertical-align: top; }
  tbody tr:nth-child(even) { background: #F9FAFB; }
  tbody tr:nth-child(odd) { background: white; }

  .td-mod { font-weight: 600; color: var(--primary); white-space: nowrap; }
  .td-right { text-align: right; font-weight: 600; }

  /* ─── GRID DIFERENCIAIS ─── */
  .diff-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 10px 0 20px; }

  .diff-card {
    background: var(--primary-bg); border-radius: 9px;
    padding: 13px 15px; border-left: 3.5px solid var(--primary);
  }
  .diff-card .lbl { font-weight: 700; color: var(--primary); font-size: 10.5px; margin-bottom: 3px; }
  .diff-card .dsc { color: var(--text); font-size: 9.5px; line-height: 1.4; }

  /* ─── PLANOS ─── */
  .plans { display: flex; gap: 13px; margin: 16px 0 22px; }

  .plan {
    flex: 1; border: 1.5px solid var(--line); border-radius: 13px;
    padding: 22px 16px; text-align: center; position: relative; background: white;
  }
  .plan.hl {
    border-color: var(--accent);
    box-shadow: 0 4px 24px rgba(124, 58, 237, 0.13);
    transform: scale(1.02);
  }
  .plan.hl::before {
    content: '★ RECOMENDADO'; position: absolute; top: -10px; left: 50%;
    transform: translateX(-50%); background: var(--accent); color: white;
    font-size: 7px; font-weight: 700; padding: 3px 14px; border-radius: 12px;
    letter-spacing: 1px;
  }

  .plan-name { font-size: 15px; font-weight: 800; color: var(--dark); margin-bottom: 4px; }
  .plan-sub { font-size: 8.5px; color: var(--muted); margin-bottom: 14px; line-height: 1.4; }
  .plan-price { font-size: 28px; font-weight: 800; color: var(--green); margin-bottom: 2px; }
  .plan-per { font-size: 9px; color: var(--muted); margin-bottom: 14px; }

  .plan-ft { list-style: none; text-align: left; padding: 0; }
  .plan-ft li {
    font-size: 9px; padding: 4.5px 0;
    border-bottom: 1px solid #F3F4F6; color: var(--text);
  }
  .plan-ft li::before { content: '✓  '; color: var(--green); font-weight: 700; }

  /* ─── BULLETS ─── */
  .blist { list-style: none; padding: 0; margin: 8px 0 18px; }
  .blist li { padding: 5px 0 5px 20px; position: relative; font-size: 10px; line-height: 1.55; }
  .blist li::before {
    content: ''; position: absolute; left: 0; top: 11px;
    width: 7px; height: 7px; background: var(--primary); border-radius: 50%;
  }

  /* ─── PASSOS ─── */
  .steps { display: flex; gap: 14px; margin: 14px 0 26px; }
  .step {
    flex: 1; text-align: center; padding: 20px 14px;
    background: linear-gradient(135deg, var(--primary-bg), white);
    border-radius: 11px; border: 1px solid #E0E7FF;
  }
  .step-n {
    width: 34px; height: 34px; background: var(--primary); color: white;
    border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;
    font-weight: 800; font-size: 15px; margin-bottom: 9px;
  }
  .step-t { font-weight: 700; color: var(--dark); font-size: 11px; margin-bottom: 5px; }
  .step-d { font-size: 9px; color: var(--muted); line-height: 1.45; }

  /* ─── CONTATO ─── */
  .contact {
    background: linear-gradient(145deg, #1E1B4B, #312E81);
    border-radius: 13px; padding: 30px 44px; text-align: center; margin-top: 26px;
  }
  .contact h3 { color: white; font-size: 19px; margin-bottom: 16px; font-weight: 700; }
  .contact .lnk { color: #A5B4FC; font-size: 11.5px; line-height: 2; }
  .contact .leg { color: #9CA3AF; font-size: 8px; margin-top: 16px; line-height: 1.7; }
</style>
</head>
<body>

<!-- Barra de ação (só aparece na tela, some na impressão) -->
<div class="save-bar">
  <span><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:6px"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>Proposta Comercial — Zyntra ERP</span>
  <button onclick="window.print()"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:5px"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>Salvar como PDF (Ctrl+P)</button>
</div>

<!-- ══════════ CAPA ══════════ -->
<div class="cover">
  ${logoTag}
  <h1>PROPOSTA COMERCIAL</h1>
  <div class="subtitle">Plataforma de Gestão Empresarial</div>
  <div class="subtitle2">ERP Industrial SaaS — Completo e em Produção</div>
  <div class="cover-info">
    <div class="company">Agência do Japa</div>
    <div class="details">
      ti@aluforce.com.br &nbsp;|&nbsp; (11) 96239-7527<br>
      https://aluforce.api.br
    </div>
    <div class="date">Abril de 2026</div>
  </div>
</div>

<!-- ══════════ PÁG 2 — Apresentação + Módulos ══════════ -->
<div class="page">
  <div class="section-title first">
    <div class="icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg></div>
    <h2>Sobre o Zyntra ERP</h2>
  </div>

  <p class="intro">
    O <strong>Zyntra ERP</strong> é uma plataforma de gestão empresarial completa e em produção, desenvolvida para
    indústrias e empresas de médio porte que buscam eficiência operacional, controle fiscal e automação inteligente
    em uma única solução.
  </p>
  <p class="muted-text">
    Sistema em produção ativo com clientes reais desde janeiro de 2026. Cobre todo o ciclo operacional —
    do pedido de venda à emissão de NF-e fiscal, do chão de fábrica ao financeiro — em uma plataforma multi-tenant (multi-empresa).
  </p>

  <div class="section-title">
    <div class="icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg></div>
    <h2>Diferenciais</h2>
  </div>

  <div class="diff-grid">
    <div class="diff-card"><div class="lbl"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg> 100% na Nuvem</div><div class="dsc">Acesse de qualquer lugar, sem instalação de software</div></div>
    <div class="diff-card"><div class="lbl"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg> App Android Nativo</div><div class="dsc">Mobilidade total com notificações push em tempo real</div></div>
    <div class="diff-card"><div class="lbl"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><circle cx="9" cy="10" r="1.5" fill="#4F46E5"/><circle cx="15" cy="10" r="1.5" fill="#4F46E5"/><path d="M8 15h8"/><line x1="12" y1="1" x2="12" y2="4"/></svg> Inteligência Artificial</div><div class="dsc">Assistente virtual BOB I.A. integrado em todas as telas</div></div>
    <div class="diff-card"><div class="lbl"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg> Chat Corporativo</div><div class="dsc">Zyntra Teams — canais, mensagens, áudio e arquivos</div></div>
    <div class="diff-card"><div class="lbl"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> Conformidade LGPD</div><div class="dsc">Criptografia de dados sensíveis e auditoria completa</div></div>
    <div class="diff-card"><div class="lbl"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg> Funciona Offline</div><div class="dsc">PWA com sincronização automática em background</div></div>
    <div class="diff-card"><div class="lbl"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> 72+ Relatórios</div><div class="dsc">Exportação em PDF e Excel com filtros avançados</div></div>
    <div class="diff-card"><div class="lbl"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg> Multi-empresa</div><div class="dsc">Gerencie filiais e unidades em um único login</div></div>
  </div>

  <div class="section-title">
    <div class="icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg></div>
    <h2>Módulos do Sistema</h2>
  </div>

  <p class="intro">O Zyntra é composto por <strong>11 módulos integrados</strong> que cobrem todas as áreas da empresa:</p>

  <table>
    <thead><tr><th style="width:145px">Módulo</th><th>Funcionalidades Principais</th></tr></thead>
    <tbody>
      <tr><td class="td-mod"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> Dashboard</td><td>KPIs em tempo real, gráficos de desempenho, alertas automáticos, visão multi-empresa</td></tr>
      <tr><td class="td-mod"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg> Vendas</td><td>Pedidos, orçamentos, kanban, comissões automáticas, tabelas de preço, PDF automático</td></tr>
      <tr><td class="td-mod"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg> Compras</td><td>Requisições, cotações, pedidos de compra, entrada de notas, avaliação de fornecedores</td></tr>
      <tr><td class="td-mod"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg> PCP</td><td>Ordens de produção, apontamentos de mão de obra, materiais, import/export Excel</td></tr>
      <tr><td class="td-mod"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> Financeiro</td><td>C/P, C/R, CNAB 240, fluxo de caixa, DRE, conciliação bancária, boletos e PIX</td></tr>
      <tr><td class="td-mod"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> RH</td><td>Funcionários, folha, ponto eletrônico, férias, eSocial</td></tr>
      <tr><td class="td-mod"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg> NF-e / NFS-e</td><td>Emissão fiscal completa via SEFAZ, manifestação, importação XML, cancelamento</td></tr>
      <tr><td class="td-mod"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg> Estoque</td><td>Inventário, movimentações, QR Code, estoque crítico, rastreabilidade</td></tr>
      <tr><td class="td-mod"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> Clientes</td><td>Cadastro completo, análise de crédito, histórico de compras, limite de crédito</td></tr>
      <tr><td class="td-mod"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg> Logística</td><td>Romaneio, expedição, rastreamento de entregas, SLA, transportadoras</td></tr>
      <tr><td class="td-mod"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> Config.</td><td>50+ categorias: impostos, certificados, integrações, permissões</td></tr>
    </tbody>
  </table>

  <div class="page-footer">
    <span>Zyntra ERP — Proposta Comercial &nbsp;|&nbsp; Agência do Japa &nbsp;|&nbsp; Documento confidencial</span>
    <span>Página 2 de 4</span>
  </div>
</div>

<!-- ══════════ PÁG 3 — Integrações + Planos ══════════ -->
<div class="page">
  <div class="section-title first">
    <div class="icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg></div>
    <h2>Integrações Ativas</h2>
  </div>

  <table>
    <thead><tr><th style="width:170px">Integração</th><th>Descrição</th></tr></thead>
    <tbody>
      <tr><td class="td-mod"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg> Bancária</td><td>Boletos, CNAB 240 remessa/retorno, PIX, webhooks bancários</td></tr>
      <tr><td class="td-mod"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> SEFAZ</td><td>Emissão de NF-e e NFS-e em ambiente de produção</td></tr>
      <tr><td class="td-mod"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg> Email (SMTP)</td><td>Envio automático de relatórios, cobranças e notificações</td></tr>
      <tr><td class="td-mod"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg> WhatsApp Business</td><td>Mensagens automatizadas de pedidos e cobranças</td></tr>
      <tr><td class="td-mod"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><circle cx="9" cy="10" r="1.5" fill="#4F46E5"/><circle cx="15" cy="10" r="1.5" fill="#4F46E5"/><path d="M8 15h8"/><line x1="12" y1="1" x2="12" y2="4"/></svg> Inteligência Artificial</td><td>Assistente virtual BOB I.A. em todas as telas do sistema</td></tr>
      <tr><td class="td-mod"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg> Automações (n8n)</td><td>36+ workflows: cobranças, alertas, backups, relatórios automáticos</td></tr>
    </tbody>
  </table>

  <div class="section-title">
    <div class="icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></div>
    <h2>Planos e Investimento</h2>
  </div>

  <div class="plans">
    <div class="plan">
      <div class="plan-name">Starter</div>
      <div class="plan-sub">Para pequenas empresas e<br>operações enxutas</div>
      <div class="plan-price">R$ 997</div>
      <div class="plan-per">por mês</div>
      <ul class="plan-ft">
        <li>Até 5 usuários</li>
        <li>Dashboard + Vendas + Financeiro + Estoque</li>
        <li>Chat corporativo (Zyntra Teams)</li>
        <li>Relatórios PDF e Excel</li>
        <li>Suporte por email</li>
      </ul>
    </div>

    <div class="plan hl">
      <div class="plan-name">Profissional</div>
      <div class="plan-sub">Para empresas em crescimento<br>com gestão completa</div>
      <div class="plan-price">R$ 2.497</div>
      <div class="plan-per">por mês</div>
      <ul class="plan-ft">
        <li>Até 20 usuários</li>
        <li>Todos os 11 módulos incluídos</li>
        <li>NF-e/NFS-e + CNAB 240 + Bancária</li>
        <li>BOB I.A. — Assistente virtual</li>
        <li>App Android + Chat corporativo</li>
        <li>36 automações n8n</li>
        <li>Suporte prioritário (até 12h)</li>
      </ul>
    </div>

    <div class="plan">
      <div class="plan-name">Enterprise</div>
      <div class="plan-sub">Para indústrias de médio/<br>grande porte</div>
      <div class="plan-price">R$ 4.997</div>
      <div class="plan-per">por mês</div>
      <ul class="plan-ft">
        <li>Usuários ilimitados</li>
        <li>Todos os módulos + customizações</li>
        <li>SLA garantido (até 4h)</li>
        <li>Treinamento presencial incluso</li>
        <li>Gerente de conta dedicado</li>
        <li>Integrações customizadas</li>
      </ul>
    </div>
  </div>

  <div class="page-footer">
    <span>Zyntra ERP — Proposta Comercial &nbsp;|&nbsp; Agência do Japa &nbsp;|&nbsp; Documento confidencial</span>
    <span>Página 3 de 4</span>
  </div>
</div>

<!-- ══════════ PÁG 4 — Taxas + Segurança + Contato ══════════ -->
<div class="page">
  <div class="section-title first">
    <div class="icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg></div>
    <h2>Taxas de Implantação (pagamento único)</h2>
  </div>

  <table>
    <thead><tr><th>Serviço</th><th style="text-align:right;width:180px">Investimento</th></tr></thead>
    <tbody>
      <tr><td>Setup e configuração inicial</td><td class="td-right">R$ 2.500 – R$ 8.000</td></tr>
      <tr><td>Migração de dados (de outro sistema)</td><td class="td-right">R$ 3.000 – R$ 12.000</td></tr>
      <tr><td>Treinamento da equipe (remoto)</td><td class="td-right">R$ 2.000 – R$ 5.000</td></tr>
      <tr><td>Treinamento presencial (in loco)</td><td class="td-right">R$ 5.000 – R$ 10.000</td></tr>
      <tr><td>Customizações adicionais</td><td class="td-right">R$ 200 / hora</td></tr>
    </tbody>
  </table>

  <div class="section-title">
    <div class="icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div>
    <h2>Segurança e Conformidade</h2>
  </div>

  <ul class="blist">
    <li>Criptografia de dados sensíveis em conformidade com a <strong>LGPD</strong></li>
    <li>Autenticação <strong>JWT</strong> com refresh tokens e rotação automática</li>
    <li>Proteção contra <strong>CSRF, XSS</strong> e ataques de força bruta (rate limiting)</li>
    <li>Registro de <strong>auditoria completo</strong> de todas as ações no sistema</li>
    <li>Senhas criptografadas com <strong>bcrypt</strong> (hash irreversível)</li>
    <li>Infraestrutura em <strong>VPS dedicada</strong> com SSL/HTTPS e backups diários</li>
    <li>Controle de acesso granular: admin, gerente, vendedor, comprador, financeiro, produção</li>
  </ul>

  <div class="section-title">
    <div class="icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg></div>
    <h2>Próximos Passos</h2>
  </div>

  <div class="steps">
    <div class="step">
      <div class="step-n">1</div>
      <div class="step-t">Demonstração Gratuita</div>
      <div class="step-d">Agendamos uma apresentação personalizada do sistema</div>
    </div>
    <div class="step">
      <div class="step-n">2</div>
      <div class="step-t">Trial de 14 Dias</div>
      <div class="step-d">Teste o Zyntra gratuitamente com todos os recursos</div>
    </div>
    <div class="step">
      <div class="step-n">3</div>
      <div class="step-t">Proposta Personalizada</div>
      <div class="step-d">Definimos juntos o plano ideal para sua operação</div>
    </div>
  </div>

  <div class="contact">
    <h3>Entre em contato</h3>
    <div class="lnk">
      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg> &nbsp;https://aluforce.api.br<br>
      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg> &nbsp;ti@aluforce.com.br &nbsp;&nbsp;|&nbsp;&nbsp; <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg> &nbsp;(11) 96239-7527
    </div>
    <div class="leg">
      Proposta válida por 30 dias. Valores sujeitos a reajuste anual conforme IGPM.<br>
      <strong>Agência do Japa</strong> — Tecnologia que transforma gestão. &nbsp;© 2026
    </div>
  </div>

  <div class="page-footer">
    <span>Zyntra ERP — Proposta Comercial &nbsp;|&nbsp; Agência do Japa &nbsp;|&nbsp; Documento confidencial</span>
    <span>Página 4 de 4</span>
  </div>
</div>

</body>
</html>`;

fs.writeFileSync(OUTPUT, html, 'utf8');

const size = (fs.statSync(OUTPUT).size / 1024).toFixed(0);
console.log('');
console.log('  ✅ Proposta comercial gerada com sucesso!');
console.log('  📄 ' + OUTPUT);
console.log('  📦 Tamanho: ' + size + ' KB');
console.log('');
console.log('  ➡️  Abrindo no navegador...');
console.log('  ➡️  Clique em "Salvar como PDF" ou pressione Ctrl+P');
console.log('');

// Abre no navegador padrão
const cmd = process.platform === 'win32' ? 'start ""' :
            process.platform === 'darwin' ? 'open' : 'xdg-open';

exec(`${cmd} "${OUTPUT}"`, (err) => {
    if (err) console.log('  ⚠️  Abra manualmente: ' + OUTPUT);
});
