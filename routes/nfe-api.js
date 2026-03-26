'use strict';

/**
 * NFe API routes — extracted from server.js
 * Endpoints: preview, emitir, validar, configuracoes
 */
const express = require('express');

module.exports = function createNfeApiRouter({ authenticateToken, pool }) {
    const router = express.Router();

    // Escapa caracteres especiais XML para prevenir XML injection
    function escapeXml(str) {
        if (str == null) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }

    // POST /api/nfe/preview
    router.post('/preview', authenticateToken, async (req, res) => {
        try {
            const nfeData = req.body;
            if (!nfeData || !nfeData.itens || !nfeData.itens.length) {
                return res.status(400).json({ success: false, message: 'Dados da NFe inválidos. Adicione ao menos um item.' });
            }

            const dest = nfeData.destinatario || {};
            const totalValue = nfeData.totais?.valorTotal || nfeData.itens.reduce((s, i) => s + (i.valorTotal || 0), 0);
            const now = new Date().toISOString();

            let itensXml = '';
            (nfeData.itens || []).forEach((item, idx) => {
                itensXml += `
    <det nItem="${parseInt(item.numero, 10) || idx + 1}">
      <prod>
        <cProd>${escapeXml(item.codigo)}</cProd>
        <xProd>${escapeXml(item.descricao)}</xProd>
        <NCM>${escapeXml(item.ncm)}</NCM>
        <CFOP>${escapeXml(item.cfop || '5102')}</CFOP>
        <uCom>${escapeXml(item.unidade || 'UN')}</uCom>
        <qCom>${parseFloat(item.quantidade) || 0}</qCom>
        <vUnCom>${(parseFloat(item.valorUnitario) || 0).toFixed(2)}</vUnCom>
        <vProd>${(parseFloat(item.valorTotal) || 0).toFixed(2)}</vProd>
      </prod>
      <imposto>
        <ICMS><ICMS00><orig>0</orig><CST>00</CST></ICMS00></ICMS>
      </imposto>
    </det>`;
            });

            const tipoDoc = ['CNPJ', 'CPF'].includes(dest.tipoDocumento) ? dest.tipoDocumento : 'CNPJ';

            const xml = `<?xml version="1.0" encoding="UTF-8"?>
<NFe xmlns="http://www.portalfiscal.inf.br/nfe">
  <infNFe versao="4.00">
    <ide>
      <natOp>${escapeXml(nfeData.naturezaOperacao || 'Venda de mercadoria')}</natOp>
      <tpNF>${['0', '1'].includes(String(nfeData.tipoOperacao)) ? nfeData.tipoOperacao : '1'}</tpNF>
      <dhEmi>${escapeXml(nfeData.dataEmissao || now)}</dhEmi>
      <tpAmb>2</tpAmb>
    </ide>
    <dest>
      <${tipoDoc}>${escapeXml(dest.documento)}</${tipoDoc}>
      <xNome>${escapeXml(dest.nome)}</xNome>
      <enderDest>
        <xLgr>${escapeXml(dest.endereco)}</xLgr>
        <nro>${escapeXml(dest.numero)}</nro>
        <xCpl>${escapeXml(dest.complemento)}</xCpl>
        <xBairro>${escapeXml(dest.bairro)}</xBairro>
        <cMun>${escapeXml(dest.codigoMunicipio)}</cMun>
        <xMun>${escapeXml(dest.municipio)}</xMun>
        <UF>${escapeXml(dest.uf)}</UF>
        <CEP>${(dest.cep || '').replace(/\D/g, '')}</CEP>
      </enderDest>
      <email>${escapeXml(dest.email)}</email>
    </dest>${itensXml}
    <total>
      <ICMSTot>
        <vProd>${(parseFloat(nfeData.totais?.totalProdutos) || totalValue).toFixed(2)}</vProd>
        <vDesc>${(parseFloat(nfeData.totais?.totalDesconto) || 0).toFixed(2)}</vDesc>
        <vFrete>${(parseFloat(nfeData.totais?.totalFrete) || 0).toFixed(2)}</vFrete>
        <vNF>${totalValue.toFixed(2)}</vNF>
      </ICMSTot>
    </total>
  </infNFe>
</NFe>`;

            res.json({ success: true, xml });
        } catch (err) {
            console.error('[NFe Preview] Erro:', err);
            res.status(500).json({ success: false, message: 'Erro interno ao gerar preview da NFe.' });
        }
    });

    // POST /api/nfe/emitir
    router.post('/emitir', authenticateToken, async (req, res) => {
        try {
            const nfeData = req.body;
            if (!nfeData || !nfeData.itens || !nfeData.itens.length) {
                return res.status(400).json({ success: false, message: 'Dados da NFe inválidos. Adicione ao menos um item.' });
            }

            try {
                const http = require('http');
                const payload = JSON.stringify(nfeData);
                const faturamentoReq = http.request({
                    hostname: 'localhost',
                    port: 3003,
                    path: '/api/faturamento/enviar-sefaz',
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Content-Length': Buffer.byteLength(payload),
                        'Authorization': req.headers['authorization'] || ''
                    },
                    timeout: 30000
                }, (faturamentoRes) => {
                    let body = '';
                    faturamentoRes.on('data', chunk => body += chunk);
                    faturamentoRes.on('end', () => {
                        try {
                            const result = JSON.parse(body);
                            res.status(faturamentoRes.statusCode).json(result);
                        } catch {
                            res.status(502).json({ success: false, message: 'Resposta inválida do serviço de faturamento.' });
                        }
                    });
                });
                faturamentoReq.on('error', () => {
                    res.status(503).json({
                        success: false,
                        message: 'Serviço de faturamento (SEFAZ) não está disponível no momento. Verifique se o módulo de Faturamento está em execução (porta 3003) e tente novamente.',
                        code: 'FATURAMENTO_OFFLINE'
                    });
                });
                faturamentoReq.on('timeout', () => {
                    faturamentoReq.destroy();
                    res.status(504).json({ success: false, message: 'Timeout ao conectar com serviço de faturamento.' });
                });
                faturamentoReq.write(payload);
                faturamentoReq.end();
            } catch (proxyErr) {
                console.error('[NFe Emitir] Erro de proxy:', proxyErr);
                res.status(503).json({
                    success: false,
                    message: 'Serviço de faturamento indisponível. Configure o módulo de Faturamento para emissão de NFe.',
                    code: 'FATURAMENTO_OFFLINE'
                });
            }
        } catch (err) {
            console.error('[NFe Emitir] Erro:', err);
            res.status(500).json({ success: false, message: 'Erro interno ao emitir NFe.' });
        }
    });

    // POST /api/nfe/validar
    router.post('/validar', authenticateToken, async (req, res) => {
        try {
            const nfeData = req.body;
            const erros = [];

            if (!nfeData) {
                return res.status(400).json({ valid: false, errors: ['Dados da NFe não fornecidos.'] });
            }

            if (!nfeData.naturezaOperacao) erros.push('Natureza da operação é obrigatória.');
            if (!nfeData.dataEmissao) erros.push('Data de emissão é obrigatória.');

            const dest = nfeData.destinatario || {};
            if (!dest.documento) erros.push('Documento do destinatário (CNPJ/CPF) é obrigatório.');
            if (!dest.nome) erros.push('Nome/Razão Social do destinatário é obrigatório.');
            if (!dest.endereco) erros.push('Endereço do destinatário é obrigatório.');
            if (!dest.numero) erros.push('Número do endereço é obrigatório.');
            if (!dest.bairro) erros.push('Bairro é obrigatório.');
            if (!dest.municipio) erros.push('Município é obrigatório.');
            if (!dest.uf) erros.push('UF é obrigatória.');
            if (!dest.cep) erros.push('CEP é obrigatório.');

            if (dest.documento) {
                const doc = dest.documento.replace(/\D/g, '');
                if (dest.tipoDocumento === 'CNPJ' && doc.length !== 14) erros.push('CNPJ inválido (deve ter 14 dígitos).');
                if (dest.tipoDocumento === 'CPF' && doc.length !== 11) erros.push('CPF inválido (deve ter 11 dígitos).');
            }

            if (!nfeData.itens || !nfeData.itens.length) {
                erros.push('Adicione ao menos um item à NFe.');
            } else {
                nfeData.itens.forEach((item, idx) => {
                    const n = idx + 1;
                    if (!item.descricao) erros.push(`Item ${n}: descrição é obrigatória.`);
                    if (!item.ncm) erros.push(`Item ${n}: NCM é obrigatório.`);
                    if (!item.cfop) erros.push(`Item ${n}: CFOP é obrigatório.`);
                    if (!item.quantidade || item.quantidade <= 0) erros.push(`Item ${n}: quantidade deve ser maior que zero.`);
                    if (!item.valorUnitario || item.valorUnitario <= 0) erros.push(`Item ${n}: valor unitário deve ser maior que zero.`);
                });
            }

            if (erros.length > 0) {
                return res.json({ valid: false, success: false, errors: erros });
            }

            res.json({ valid: true, success: true, message: 'XML validado com sucesso! Nenhum erro encontrado.' });
        } catch (err) {
            console.error('[NFe Validar] Erro:', err);
            res.status(500).json({ valid: false, errors: ['Erro interno ao validar NFe.'] });
        }
    });

    // GET /api/nfe/listar — Lista NF-es para espelho/consulta
    router.get('/listar', authenticateToken, async (req, res) => {
        try {
            const limite = Math.min(parseInt(req.query.limite) || 100, 500);
            const offset = Math.max(parseInt(req.query.offset) || 0, 0);
            let rows = [];

            // Tabelas com schema de NF-e produto (DANFE)
            const queries = [
                { table: 'notas_fiscais', sql: `SELECT id, numero, serie, chave_acesso, cliente_nome AS destinatario_nome, cliente_cnpj AS destinatario_cnpj, data_emissao, valor_total, status, protocolo_autorizacao AS numero_protocolo, pedido_numero FROM notas_fiscais ORDER BY id DESC LIMIT ? OFFSET ?` },
                { table: 'nfes', sql: `SELECT id, numero, serie, chave_acesso, destinatario_nome, destinatario_cnpj_cpf AS destinatario_cnpj, data_emissao, valor_total, status, protocolo_autorizacao AS numero_protocolo, NULL AS pedido_numero FROM nfes ORDER BY id DESC LIMIT ? OFFSET ?` }
            ];

            for (const q of queries) {
                try {
                    const [result] = await pool.query(q.sql, [limite, offset]);
                    if (result && result.length > 0) {
                        rows = rows.concat(result);
                    }
                } catch (_) {}
            }

            // Ordenar por id desc (merge das tabelas)
            rows.sort((a, b) => (b.id || 0) - (a.id || 0));
            rows = rows.slice(0, limite);

            const notas = rows.map(row => ({
                id:           row.id,
                numero:       row.numero || '',
                serie:        row.serie || '1',
                destinatario: row.destinatario_nome || '',
                cnpj:         row.destinatario_cnpj || '',
                dataEmissao:  row.data_emissao || null,
                valor:        parseFloat(row.valor_total || 0),
                status:       row.status || 'rascunho',
                chave:        row.chave_acesso || '',
                protocolo:    row.numero_protocolo || '',
                pedido:       row.pedido_numero || ''
            }));

            res.json({ notas, total: notas.length });
        } catch (err) {
            console.error('[NFe Listar] Erro:', err);
            res.status(500).json({ success: false, message: err.message });
        }
    });

    // GET /api/nfe/:id/espelho — Pré-visualização HTML sem valor fiscal
    router.get('/:id/espelho', authenticateToken, async (req, res) => {
        try {
            const nfeId = req.params.id;
            let row = null;

            const tryTables = async (whereClause, params) => {
                for (const table of ['nfes', 'nfe']) {
                    try {
                        const [rows] = await pool.query(`SELECT * FROM \`${table}\` WHERE ${whereClause} LIMIT 1`, params);
                        if (rows && rows[0]) return rows[0];
                    } catch (_) { /* table may not exist */ }
                }
                return null;
            };

            if (/^\d{44}$/.test(nfeId)) {
                row = await tryTables('chave_acesso = ?', [nfeId]);
            } else if (/^\d+$/.test(nfeId)) {
                row = await tryTables('id = ?', [parseInt(nfeId)]);
                if (!row) row = await tryTables('numero = ? OR numero_nfe = ?', [nfeId, nfeId]);
            } else {
                row = await tryTables('numero = ? OR numero_nfe = ?', [nfeId, nfeId]);
                if (!row && /^\d+$/.test(nfeId.replace(/\D/g, ''))) {
                    row = await tryTables('id = ?', [parseInt(nfeId.replace(/\D/g, ''))]);
                }
            }

            if (!row) {
                return res.status(404).send('<html><body style="font-family:sans-serif;padding:40px;"><h2 style="color:#ef4444;">NF-e não encontrada</h2><p>ID/Chave: ' + escapeXml(nfeId) + '</p></body></html>');
            }

            // Normaliza campos entre tabelas nfes e nfe
            const nfe = {
                id: row.id,
                numero: row.numero || row.numero_nfe || '',
                serie: row.serie || '1',
                chave_acesso: row.chave_acesso || '',
                status: row.status || 'pendente',
                data_emissao: row.data_emissao,
                protocolo: row.protocolo_nfe || row.numero_protocolo || '',
                natureza_operacao: row.natureza_operacao || 'Venda de Produtos',
                tipo_operacao: row.tipo_operacao || row.tpNF || '1',
                modalidade_frete: row.modalidade_frete,
                destinatario_nome: row.destinatario_nome || row.destinatario || '',
                destinatario_cnpj: row.destinatario_cnpj || row.cli_cnpj || '',
                destinatario_ie: row.destinatario_ie || row.cli_ie || '',
                destinatario_end: (row.destinatario_logradouro || row.cli_endereco || '') + (row.destinatario_bairro || row.cli_bairro ? ', ' + (row.destinatario_bairro || row.cli_bairro) : ''),
                destinatario_cidade: row.destinatario_municipio || row.destinatario_cidade || row.cli_cidade || '',
                destinatario_uf: row.destinatario_uf || row.cli_uf || '',
                destinatario_cep: row.destinatario_cep || row.cli_cep || '',
                destinatario_email: row.destinatario_email || row.cli_email || '',
                valor_total: row.valor_total || row.valor || 0
            };

            // Itens
            let itens = [];
            try {
                const nfeIdNum = parseInt(row.id);
                for (const table of ['nfe_itens', 'nfes_itens']) {
                    try {
                        const [rows] = await pool.query(`SELECT * FROM \`${table}\` WHERE nfe_id = ?`, [nfeIdNum]);
                        if (rows && rows.length) { itens = rows; break; }
                    } catch (_) {}
                }
            } catch (_) {}
            // Fallback: busca itens via pedido_itens se NF-e não tem itens próprios
            if (!itens.length && (row.pedido_id || row.venda_id)) {
                try {
                    const pedidoId = row.pedido_id || row.venda_id;
                    const [rows] = await pool.query(
                        'SELECT codigo AS codigo_produto, descricao, ncm, unidade, quantidade, preco_unitario AS valor_unitario, desconto AS valor_desconto, subtotal AS valor_total FROM pedido_itens WHERE pedido_id = ? ORDER BY id ASC',
                        [pedidoId]
                    );
                    if (rows && rows.length) itens = rows;
                } catch (_) {}
            }

            // Emitente (cascata: configuracoes → configuracoes_nfe → empresas)
            let emit = { razaoSocial: 'ALUFORCE INDÚSTRIA E COMÉRCIO LTDA', nomeFantasia: 'ALUFORCE', cnpj: '', ie: '', logradouro: '', numero: '', bairro: '', cidade: '', uf: 'MG', cep: '', telefone: '' };
            let emitFilled = false;
            try {
                const [cfgRows] = await pool.query("SELECT * FROM configuracoes WHERE chave = 'empresa_emitente' LIMIT 1");
                if (cfgRows && cfgRows[0]) {
                    const c = JSON.parse(cfgRows[0].valor || '{}');
                    if (c.cnpj) {
                        emit = { ...emit, ...c, cidade: c.cidade || c.municipio || '', logradouro: c.logradouro || c.endereco || '' };
                        emitFilled = true;
                    }
                }
            } catch (_) {}
            if (!emitFilled) {
                try {
                    const [cfgRows] = await pool.query("SELECT * FROM configuracoes_nfe WHERE ativo = 1 LIMIT 1");
                    if (cfgRows && cfgRows[0]) {
                        const c = cfgRows[0];
                        if (c.cnpj) {
                            emit = { razaoSocial: c.razao_social || emit.razaoSocial, nomeFantasia: c.nome_fantasia || emit.nomeFantasia, cnpj: c.cnpj || '', ie: c.inscricao_estadual || '', logradouro: c.endereco || '', numero: c.numero || '', bairro: c.bairro || '', cidade: c.municipio || '', uf: c.uf || 'MG', cep: c.cep || '', telefone: '' };
                            emitFilled = true;
                        }
                    }
                } catch (_) {}
            }
            if (!emitFilled) {
                try {
                    const [empresaRows] = await pool.query("SELECT * FROM empresas LIMIT 1");
                    if (empresaRows && empresaRows[0]) {
                        const e = empresaRows[0];
                        emit = { razaoSocial: e.razao_social || e.nome || emit.razaoSocial, nomeFantasia: e.nome_fantasia || e.nome_comercial || emit.nomeFantasia, cnpj: e.cnpj || '', ie: e.inscricao_estadual || '', logradouro: e.endereco || e.logradouro || '', numero: e.numero || '', bairro: e.bairro || '', cidade: e.municipio || e.cidade || '', uf: e.uf || 'MG', cep: e.cep || '', telefone: e.telefone || '' };
                    }
                } catch (_) {}
            }

            const fmt = (v) => v ? parseFloat(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0,00';
            const fmtD = (d) => d ? new Date(d).toLocaleDateString('pt-BR') : '—';
            const statusLabel = { pendente: 'Pendente', autorizada: 'Autorizada', cancelada: 'Cancelada', rejeitada: 'Rejeitada', denegada: 'Denegada' };
            const freteLabel = { '0': 'CIF (Emitente)', '1': 'FOB (Destinatário)', '9': 'Sem Frete' };

            const itensRows = itens.map((item, i) => `
              <tr>
                <td style="padding:5px 8px;font-size:11px;text-align:center;">${i + 1}</td>
                <td style="padding:5px 8px;font-size:11px;">${escapeXml(item.codigo_produto || item.codigo || '—')}</td>
                <td style="padding:5px 8px;font-size:11px;">${escapeXml(item.descricao || '—')}</td>
                <td style="padding:5px 8px;font-size:11px;">${escapeXml(item.ncm || '—')}</td>
                <td style="padding:5px 8px;font-size:11px;text-align:center;">${escapeXml(item.unidade || 'UN')}</td>
                <td style="padding:5px 8px;font-size:11px;text-align:right;">${fmt(item.quantidade)}</td>
                <td style="padding:5px 8px;font-size:11px;text-align:right;">R$ ${fmt(item.valor_unitario)}</td>
                <td style="padding:5px 8px;font-size:11px;text-align:right;">R$ ${fmt(item.valor_desconto || 0)}</td>
                <td style="padding:5px 8px;font-size:11px;text-align:right;font-weight:600;">R$ ${fmt(item.valor_total)}</td>
              </tr>`).join('');

            const totalItens = itens.reduce((s, i) => s + parseFloat(i.valor_total || 0), 0);
            const totalDesc  = itens.reduce((s, i) => s + parseFloat(i.valor_desconto || 0), 0);

            const html = `<!DOCTYPE html><html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Espelho NF-e #${escapeXml(String(nfe.numero))}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:'Segoe UI',Arial,sans-serif; background:#f0f4f8; color:#1e293b; padding:24px; }
    .danfe { background:white; max-width:980px; margin:0 auto; border:2px solid #1e40af; border-radius:4px; position:relative; z-index:1; }
    .danfe-header { background:#1e40af; color:white; padding:12px 20px; display:flex; justify-content:space-between; align-items:center; }
    .danfe-header h1 { font-size:22px; font-weight:800; letter-spacing:2px; }
    .espelho-badge { background:#fbbf24; color:#1e3a8a; padding:4px 12px; border-radius:20px; font-size:11px; font-weight:700; letter-spacing:1px; margin-top:6px; display:inline-block; }
    .section { border:1px solid #d1d5db; margin:8px; border-radius:4px; overflow:hidden; }
    .section-title { background:#f8fafc; border-bottom:1px solid #d1d5db; padding:6px 12px; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; color:#64748b; }
    .grid-2 { display:grid; grid-template-columns:1fr 1fr; }
    .grid-3 { display:grid; grid-template-columns:1fr 1fr 1fr; }
    .field { padding:8px 12px; border-right:1px solid #e5e7eb; }
    .field:last-child { border-right:none; }
    .field label { display:block; font-size:9px; font-weight:700; text-transform:uppercase; color:#9ca3af; margin-bottom:2px; }
    .field span { font-size:12px; color:#1e293b; font-weight:500; }
    .watermark { position:fixed; top:50%; left:50%; transform:translate(-50%,-50%) rotate(-35deg); font-size:90px; font-weight:900; color:rgba(30,64,175,0.05); pointer-events:none; white-space:nowrap; z-index:0; }
    table.items { width:100%; border-collapse:collapse; font-size:11px; }
    table.items thead th { background:#f1f5f9; padding:6px 8px; text-align:left; font-size:10px; font-weight:700; text-transform:uppercase; color:#64748b; border-bottom:2px solid #cbd5e1; }
    table.items tbody tr { border-bottom:1px solid #e5e7eb; }
    .totais-row { display:flex; justify-content:flex-end; gap:24px; padding:12px 20px; background:#f8fafc; border-top:2px solid #1e40af; flex-wrap:wrap; }
    .t-item { text-align:right; }
    .t-item label { font-size:9px; font-weight:700; text-transform:uppercase; color:#9ca3af; display:block; }
    .t-item span { font-size:14px; font-weight:700; color:#1e40af; }
    .footer-bar { background:#1e40af; color:rgba(255,255,255,0.8); text-align:center; padding:8px; font-size:10px; }
    .status-badge { display:inline-block; padding:3px 10px; border-radius:20px; font-size:10px; font-weight:700; }
    .status-pendente { background:#fef3c7; color:#d97706; }
    .status-autorizada { background:#d1fae5; color:#059669; }
    .status-cancelada { background:#fee2e2; color:#dc2626; }
    @media print { body { background:white; padding:0; } .no-print { display:none !important; } .danfe { border:1px solid #000; max-width:none; } }
  </style>
</head>
<body>
<div class="watermark">ESPELHO SEM VALOR FISCAL</div>
<div class="no-print" style="max-width:980px;margin:0 auto 12px;display:flex;gap:8px;justify-content:flex-end;">
  <button onclick="window.print()" style="background:#1e40af;color:white;border:none;padding:8px 18px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600;">🖨 Imprimir</button>
  <button onclick="window.close()" style="background:#6b7280;color:white;border:none;padding:8px 18px;border-radius:8px;cursor:pointer;font-size:13px;">Fechar</button>
</div>
<div class="danfe">
  <div class="danfe-header">
    <div><h1>ALUFORCE</h1><div style="font-size:11px;opacity:0.8;">${escapeXml(emit.razaoSocial)}</div></div>
    <div style="text-align:center;">
      <div style="font-size:16px;font-weight:700;letter-spacing:2px;">ESPELHO DE NF-e</div>
      <span class="espelho-badge">⚠ SEM VALOR FISCAL — PRÉ-AUTORIZAÇÃO</span>
    </div>
    <div style="text-align:right;">
      <div style="font-size:20px;font-weight:800;">Nº ${escapeXml(String(nfe.numero || '—'))}</div>
      <div style="font-size:12px;opacity:0.8;">Série: ${escapeXml(String(nfe.serie))}</div>
      <span class="status-badge status-${escapeXml(String(nfe.status).toLowerCase())}" style="margin-top:4px;display:inline-block;">${escapeXml(statusLabel[nfe.status] || nfe.status)}</span>
    </div>
  </div>
  <div class="section">
    <div class="section-title">📦 Emitente</div>
    <div class="grid-2">
      <div class="field"><label>Razão Social / Nome Fantasia</label><span>${escapeXml(emit.razaoSocial)} / ${escapeXml(emit.nomeFantasia)}</span></div>
      <div class="field" style="display:grid;grid-template-columns:1fr 1fr;">
        <div><label>CNPJ</label><span>${escapeXml(emit.cnpj || '—')}</span></div>
        <div><label>Inscrição Estadual</label><span>${escapeXml(emit.ie || '—')}</span></div>
      </div>
    </div>
    <div class="grid-3">
      <div class="field"><label>Endereço</label><span>${escapeXml(emit.logradouro + ' ' + emit.numero + (emit.bairro ? ', ' + emit.bairro : ''))}</span></div>
      <div class="field"><label>Município / UF</label><span>${escapeXml(emit.cidade + ' — ' + emit.uf)}</span></div>
      <div class="field"><label>CEP / Telefone</label><span>${escapeXml(emit.cep + ' / ' + (emit.telefone || '—'))}</span></div>
    </div>
  </div>
  <div class="section">
    <div class="section-title">🏢 Destinatário</div>
    <div class="grid-2">
      <div class="field"><label>Nome / Razão Social</label><span>${escapeXml(nfe.destinatario_nome || '—')}</span></div>
      <div class="field" style="display:grid;grid-template-columns:1fr 1fr;">
        <div><label>CNPJ / CPF</label><span>${escapeXml(nfe.destinatario_cnpj || '—')}</span></div>
        <div><label>Inscrição Estadual</label><span>${escapeXml(nfe.destinatario_ie || '—')}</span></div>
      </div>
    </div>
    <div class="grid-3">
      <div class="field"><label>Endereço</label><span>${escapeXml(nfe.destinatario_end || '—')}</span></div>
      <div class="field"><label>Município / UF</label><span>${escapeXml(nfe.destinatario_cidade + ' — ' + nfe.destinatario_uf)}</span></div>
      <div class="field"><label>CEP / E-mail</label><span>${escapeXml(nfe.destinatario_cep + ' / ' + (nfe.destinatario_email || '—'))}</span></div>
    </div>
  </div>
  <div class="section">
    <div class="section-title">📋 Dados da NF-e</div>
    <div style="display:grid;grid-template-columns:repeat(5,1fr);">
      <div class="field"><label>Data Emissão</label><span>${fmtD(nfe.data_emissao)}</span></div>
      <div class="field"><label>Natureza da Operação</label><span>${escapeXml(nfe.natureza_operacao)}</span></div>
      <div class="field"><label>Tipo</label><span>${nfe.tipo_operacao === '1' ? 'Saída' : 'Entrada'}</span></div>
      <div class="field"><label>Modalidade Frete</label><span>${escapeXml(freteLabel[nfe.modalidade_frete] || '—')}</span></div>
      <div class="field"><label>Protocolo / Chave</label><span style="font-size:9px;">${escapeXml(nfe.protocolo || nfe.chave_acesso || '—')}</span></div>
    </div>
  </div>
  <div class="section">
    <div class="section-title">📦 Itens da NF-e (${itens.length} produto(s))</div>
    <table class="items">
      <thead><tr>
        <th>#</th><th>Código</th><th>Descrição</th><th>NCM</th><th>UN</th>
        <th style="text-align:right;">Qtd.</th><th style="text-align:right;">Vl. Unit.</th>
        <th style="text-align:right;">Desconto</th><th style="text-align:right;">Total</th>
      </tr></thead>
      <tbody>${itensRows || '<tr><td colspan="9" style="padding:16px;text-align:center;color:#9ca3af;">Nenhum item lançado</td></tr>'}</tbody>
    </table>
  </div>
  <div class="totais-row">
    <div class="t-item"><label>Qtd. Itens</label><span>${itens.length}</span></div>
    <div class="t-item"><label>Descontos</label><span style="color:#ef4444;">R$ ${fmt(totalDesc)}</span></div>
    <div class="t-item"><label>Subtotal</label><span>R$ ${fmt(totalItens)}</span></div>
    <div class="t-item"><label>VALOR TOTAL NF-e</label><span style="font-size:18px;">R$ ${fmt(nfe.valor_total || totalItens)}</span></div>
  </div>
  <div class="footer-bar">
    Documento sem valor fiscal &nbsp;|&nbsp; Gerado em ${new Date().toLocaleString('pt-BR')} &nbsp;|&nbsp; Sistema Zyntra / Aluforce
    &nbsp;|&nbsp; NF-e Nº ${escapeXml(String(nfe.numero || '—'))} — Série ${escapeXml(String(nfe.serie))}
  </div>
</div>
</body></html>`;

            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            return res.send(html);

        } catch (err) {
            console.error('[NFe Espelho] Erro:', err);
            res.status(500).json({ success: false, message: err.message });
        }
    });

    // GET /api/nfe/configuracoes
    router.get('/configuracoes', authenticateToken, async (req, res) => {
        try {
            let emitente = {};
            try {
                const [rows] = await pool.query(
                    "SELECT id, cnpj, razao_social, nome_fantasia, inscricao_estadual, endereco, numero, bairro, codigo_municipio, municipio, uf, cep, crt, ativo FROM configuracoes_nfe WHERE ativo = 1 ORDER BY id DESC LIMIT 1"
                );
                if (rows && rows.length > 0) {
                    emitente = rows[0];
                }
            } catch (dbErr) {
                console.warn('[NFe Config] Tabela configuracoes_nfe não encontrada, usando fallback.');
            }

            if (!emitente.cnpj) {
                try {
                    const [empresaRows] = await pool.query(
                        "SELECT id, cnpj, razao_social, nome, nome_fantasia, fantasia, inscricao_estadual, ie, endereco, logradouro, numero, bairro, codigo_municipio, municipio, uf, cep FROM empresa ORDER BY id LIMIT 1"
                    );
                    if (empresaRows && empresaRows.length > 0) {
                        const emp = empresaRows[0];
                        emitente = {
                            cnpj: emp.cnpj || '',
                            razao_social: emp.razao_social || emp.nome || '',
                            nome_fantasia: emp.nome_fantasia || emp.fantasia || '',
                            inscricao_estadual: emp.inscricao_estadual || emp.ie || '',
                            endereco: emp.endereco || emp.logradouro || '',
                            numero: emp.numero || '',
                            bairro: emp.bairro || '',
                            municipio: emp.municipio || emp.cidade || '',
                            uf: emp.uf || emp.estado || '',
                            cep: emp.cep || '',
                            ambiente: 2
                        };
                    }
                } catch {
                    console.warn('[NFe Config] Tabela empresa não encontrada.');
                }
            }

            res.json({ success: true, emitente });
        } catch (err) {
            console.error('[NFe Config] Erro:', err);
            res.status(500).json({ success: false, message: 'Erro ao carregar configurações NFe.' });
        }
    });

    return router;
};
