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

            // Usar danfe-renderer.js para layout DANFE oficial A4
            const { renderDanfe } = require('./danfe-renderer');

            const fmtMoney = v => (parseFloat(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            const fmtQty   = v => (parseFloat(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
            const fmtDate  = d => { if (!d) return ''; const dt = new Date(d); return isNaN(dt.getTime()) ? '' : dt.toLocaleDateString('pt-BR'); };
            const fmtTime  = d => { if (!d) return ''; const dt = new Date(d); return isNaN(dt.getTime()) ? '' : dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); };

            const isPreview  = !nfe.chave_acesso && !nfe.protocolo;
            const chave      = nfe.chave_acesso || '';
            const valorTotal = parseFloat(nfe.valor_total) || 0;
            const totalItens = itens.reduce((s, i) => s + parseFloat(i.valor_total || 0), 0);
            const valorNF    = valorTotal || totalItens;

            // Separar logradouro / número do destinatário
            const splitEnd = str => { const m = (str || '').match(/^(.+?),\s*(\S+.*)$/); return m ? [m[1].trim(), m[2].trim()] : [(str || ''), '']; };
            const [dstLgr, dstNro] = splitEnd(nfe.destinatario_end);

            // Duplicatas (se tabela existir)
            let dups = [];
            try {
                const [dupRows] = await pool.query('SELECT * FROM nfe_duplicatas WHERE nfe_id = ? ORDER BY numero', [row.id]);
                dups = dupRows.map(d => ({ nDup: d.numero || '', dVenc: fmtDate(d.vencimento), vDup: fmtMoney(d.valor) }));
            } catch (_) { /* tabela pode não existir */ }

            const ctx = {
                marcaAguaClasse: isPreview ? '' : 'hidden',
                marcaAguaTexto: isPreview ? 'ESPELHO SEM VALOR FISCAL' : '',
                avisoTopo: isPreview ? 'DOCUMENTO DE PRÉVIA — NÃO POSSUI VALOR FISCAL' : '',
                paginaAtual: '1',
                paginaTotal: '1',
                codigoBarrasUrl: chave ? `https://barcodeapi.org/api/128/${chave}` : '',
                emitenteLogoUrl: '/api/empresa/1/logo',
                portalConsultaUrl: 'www.nfe.fazenda.gov.br/portal',
                NFe: {
                    infNFe: {
                        ide: {
                            nNF: nfe.numero || '',
                            serie: nfe.serie || '1',
                            tpNF: nfe.tipo_operacao || '1',
                            natOp: nfe.natureza_operacao || 'Venda de Mercadoria',
                            dhEmi: fmtDate(nfe.data_emissao),
                            dhSaiEnt: fmtDate(row.data_saida || nfe.data_emissao),
                            _danfeHoraSaida: fmtTime(row.data_saida || nfe.data_emissao)
                        },
                        emit: {
                            xNome: emit.razaoSocial,
                            xFant: emit.nomeFantasia,
                            CNPJ: emit.cnpj, CPF: '',
                            IE: emit.ie, IEST: '', CRT: row.crt || '', IM: '', email: '',
                            enderEmit: {
                                xLgr: emit.logradouro, nro: emit.numero, xCpl: '',
                                xBairro: emit.bairro, xMun: emit.cidade, UF: emit.uf,
                                CEP: emit.cep, fone: emit.telefone
                            }
                        },
                        dest: {
                            xNome: nfe.destinatario_nome || '',
                            CNPJ: (nfe.destinatario_cnpj || '').length > 11 ? (nfe.destinatario_cnpj || '') : '',
                            CPF: (nfe.destinatario_cnpj || '').length <= 11 ? (nfe.destinatario_cnpj || '') : '',
                            IE: nfe.destinatario_ie || '',
                            indIEDest: nfe.destinatario_ie ? '1' : '9',
                            enderDest: {
                                xLgr: dstLgr, nro: dstNro, xCpl: '',
                                xBairro: row.destinatario_bairro || row.cli_bairro || '',
                                xMun: nfe.destinatario_cidade || '',
                                UF: nfe.destinatario_uf || '',
                                CEP: nfe.destinatario_cep || '',
                                fone: row.destinatario_telefone || row.cli_telefone || ''
                            }
                        },
                        cobr: {
                            fat: { nFat: nfe.numero || '', vOrig: fmtMoney(valorNF), vLiq: fmtMoney(valorNF) },
                            dup: dups
                        },
                        det: itens.map((item, i) => ({
                            prod: {
                                cProd: item.codigo_produto || item.codigo || String(i + 1).padStart(3, '0'),
                                xProd: item.descricao || '',
                                NCM: item.ncm || '',
                                CFOP: item.cfop || '',
                                uCom: item.unidade || 'UN',
                                qCom: fmtQty(item.quantidade),
                                vUnCom: fmtMoney(item.valor_unitario),
                                vProd: fmtMoney(item.valor_total)
                            },
                            _danfeCstCsosn: item.cst || item.csosn || '',
                            _danfeBcIcms: fmtMoney(item.base_icms || item.valor_total || 0),
                            _danfeVIcms: fmtMoney(item.valor_icms || 0),
                            _danfePIcms: item.aliquota_icms ? fmtMoney(item.aliquota_icms) : '',
                            _danfeVIpi: fmtMoney(item.valor_ipi || 0),
                            _danfePIpi: item.aliquota_ipi ? fmtMoney(item.aliquota_ipi) : ''
                        })),
                        total: {
                            ICMSTot: {
                                vBC: fmtMoney(row.base_calculo_icms || 0),
                                vICMS: fmtMoney(row.valor_icms || 0),
                                vBCST: fmtMoney(row.base_calculo_st || 0),
                                vST: fmtMoney(row.valor_icms_st || 0),
                                vTotTrib: fmtMoney(row.valor_tributos || 0),
                                vProd: fmtMoney(totalItens),
                                vFCPSTRet: '0,00',
                                vFrete: fmtMoney(row.valor_frete || 0),
                                vSeg: fmtMoney(row.valor_seguro || 0),
                                vDesc: fmtMoney(row.valor_desconto || 0),
                                vOutro: fmtMoney(row.outras_despesas || 0),
                                vIPI: fmtMoney(row.valor_ipi || 0),
                                vNF: fmtMoney(valorNF),
                                vII: '0,00'
                            },
                            ISSQNtot: { vServ: '', vBC: '', vISS: '', cMunFG: '' }
                        },
                        transp: {
                            modFrete: { '0': '0 - Emitente', '1': '1 - Destinatário', '9': '9 - Sem Frete' }[nfe.modalidade_frete] || '',
                            transporta: { xNome: row.transportadora_nome || '', CNPJ: '', CPF: '', IE: '', xEnder: '', xMun: '', UF: '' },
                            veicTransp: { placa: '', UF: '', RNTC: '' },
                            _danfeQVol: row.qtd_volumes || '', _danfeEsp: row.especie_volumes || '',
                            _danfeMarca: '', _danfeNVol: '',
                            _danfePesoB: row.peso_bruto ? fmtMoney(row.peso_bruto) : '',
                            _danfePesoL: row.peso_liquido ? fmtMoney(row.peso_liquido) : ''
                        },
                        infAdProd: '',
                        infAdic: {
                            infCpl: row.informacoes_complementares || row.observacao || '',
                            infAdFisco: row.informacoes_fisco || ''
                        }
                    }
                },
                protNFe: {
                    infProt: {
                        chNFe: chave,
                        nProt: nfe.protocolo || (isPreview ? 'Pré-autorização' : ''),
                        dhRecbto: fmtDate(row.data_autorizacao || nfe.data_emissao)
                    }
                }
            };

            const html = renderDanfe(ctx);
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
