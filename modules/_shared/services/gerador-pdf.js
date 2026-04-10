/**
 * SERVIÇO DE GERAÇÍO DE PDF
 * Gera PDFs para pedidos, orçamentos, relatórios e documentos diversos
 * 
 * @author Zyntra ERP
 * @version 1.0.0
 * @date 2025-12-19
 */

class GeradorPDF {
    constructor(config = {}) {
        this.empresa = config.empresa || {
            nome: 'ZYNTRA ERP',
            cnpj: '00.000.000/0001-00',
            endereco: 'Rua Example, 123 - Centro',
            cidade: 'São Paulo - SP',
            telefone: '(11) 0000-0000',
            email: 'contato@aluforce.com.br',
            logo: null
        };
    }

    /**
     * Gera PDF de Pedido de Venda / Orçamento
     */
    async gerarPedidoVenda(pedido, opcoes = {}) {
        const {
            tipo = 'orcamento', // 'orcamento' ou 'pedido'
            incluirValores = true,
            incluirImpostos = false
        } = opcoes;

        const titulo = tipo === 'orcamento' ? 'ORÇAMENTO' : 'PEDIDO DE VENDA';
        const numero = pedido.id || pedido.numero;

        const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${titulo} #${numero}</title>
    <style>
        ${this.getEstilosBase()}
        .titulo-doc { color: ${tipo === 'orcamento' ? '#2563eb' : '#059669'}; }
    </style>
</head>
<body>
    ${this.renderCabecalho(titulo, numero)}
    
    <div class="secao">
        <div class="secao-titulo">DADOS DO CLIENTE</div>
        <table class="tabela-info">
            <tr>
                <td><strong>Razão Social:</strong></td>
                <td>${pedido.cliente_nome || pedido.empresa_nome || '-'}</td>
                <td><strong>CNPJ/CPF:</strong></td>
                <td>${pedido.cliente_cnpj || pedido.empresa_cnpj || '-'}</td>
            </tr>
            <tr>
                <td><strong>Endereço:</strong></td>
                <td colspan="3">${this.formatarEndereco(pedido)}</td>
            </tr>
            <tr>
                <td><strong>Contato:</strong></td>
                <td>${pedido.cliente_contato || '-'}</td>
                <td><strong>Telefone:</strong></td>
                <td>${pedido.cliente_telefone || '-'}</td>
            </tr>
        </table>
    </div>

    <div class="secao">
        <div class="secao-titulo">INFORMAÇÕES DO ${titulo}</div>
        <table class="tabela-info">
            <tr>
                <td><strong>Data:</strong></td>
                <td>${this.formatarData(pedido.created_at || pedido.data)}</td>
                <td><strong>Validade:</strong></td>
                <td>${this.formatarData(pedido.data_validade) || '30 dias'}</td>
            </tr>
            <tr>
                <td><strong>Vendedor:</strong></td>
                <td>${pedido.vendedor_nome || '-'}</td>
                <td><strong>Cond. Pagamento:</strong></td>
                <td>${pedido.condicao_pagamento || '-'}</td>
            </tr>
            <tr>
                <td><strong>Previsão Entrega:</strong></td>
                <td>${this.formatarData(pedido.data_previsao) || 'A combinar'}</td>
                <td><strong>Frete:</strong></td>
                <td>${pedido.tipo_frete || 'CIF'}</td>
            </tr>
        </table>
    </div>

    <div class="secao">
        <div class="secao-titulo">ITENS</div>
        <table class="tabela-itens">
            <thead>
                <tr>
                    <th style="width: 8%">Item</th>
                    <th style="width: 15%">Código</th>
                    <th style="width: 37%">Descrição</th>
                    <th style="width: 8%">UN</th>
                    <th style="width: 8%">Qtd</th>
                    ${incluirValores ? `
                    <th style="width: 12%">Vl. Unit.</th>
                    <th style="width: 12%">Total</th>
                    ` : ''}
                </tr>
            </thead>
            <tbody>
                ${(pedido.itens || []).map((item, idx) => `
                <tr>
                    <td class="center">${idx + 1}</td>
                    <td>${item.codigo || '-'}</td>
                    <td>${item.descricao || '-'}</td>
                    <td class="center">${item.unidade || 'UN'}</td>
                    <td class="right">${this.formatarNumero(item.quantidade, 2)}</td>
                    ${incluirValores ? `
                    <td class="right">${this.formatarMoeda(item.preco_unitario || item.valor_unitario)}</td>
                    <td class="right">${this.formatarMoeda(item.total || (item.quantidade * (item.preco_unitario || item.valor_unitario)))}</td>
                    ` : ''}
                </tr>
                `).join('')}
            </tbody>
        </table>
    </div>

    ${incluirValores ? this.renderTotais(pedido) : ''}

    ${pedido.observacoes ? `
    <div class="secao">
        <div class="secao-titulo">OBSERVAÇÕES</div>
        <p class="observacoes">${pedido.observacoes}</p>
    </div>
    ` : ''}

    ${this.renderRodape()}
</body>
</html>`;

        return this.htmlToPDF(html, `${tipo}_${numero}.pdf`);
    }

    /**
     * Gera PDF de Pedido de Compra
     */
    async gerarPedidoCompra(pedido, opcoes = {}) {
        const numero = pedido.numero_pedido || pedido.id;

        const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>PEDIDO DE COMPRA #${numero}</title>
    <style>
        ${this.getEstilosBase()}
        .titulo-doc { color: #7c3aed; }
    </style>
</head>
<body>
    ${this.renderCabecalho('PEDIDO DE COMPRA', numero)}
    
    <div class="secao">
        <div class="secao-titulo">DADOS DO FORNECEDOR</div>
        <table class="tabela-info">
            <tr>
                <td><strong>Razão Social:</strong></td>
                <td>${pedido.fornecedor_nome || '-'}</td>
                <td><strong>CNPJ:</strong></td>
                <td>${pedido.fornecedor_cnpj || '-'}</td>
            </tr>
            <tr>
                <td><strong>Contato:</strong></td>
                <td>${pedido.fornecedor_contato || '-'}</td>
                <td><strong>Telefone:</strong></td>
                <td>${pedido.fornecedor_telefone || '-'}</td>
            </tr>
            <tr>
                <td><strong>Email:</strong></td>
                <td colspan="3">${pedido.fornecedor_email || '-'}</td>
            </tr>
        </table>
    </div>

    <div class="secao">
        <div class="secao-titulo">INFORMAÇÕES DO PEDIDO</div>
        <table class="tabela-info">
            <tr>
                <td><strong>Data Emissão:</strong></td>
                <td>${this.formatarData(pedido.data_emissao || pedido.created_at)}</td>
                <td><strong>Previsão Entrega:</strong></td>
                <td>${this.formatarData(pedido.data_previsao)}</td>
            </tr>
            <tr>
                <td><strong>Solicitante:</strong></td>
                <td>${pedido.solicitante_nome || '-'}</td>
                <td><strong>Cond. Pagamento:</strong></td>
                <td>${pedido.condicao_pagamento || '-'}</td>
            </tr>
        </table>
    </div>

    <div class="secao">
        <div class="secao-titulo">ITENS DO PEDIDO</div>
        <table class="tabela-itens">
            <thead>
                <tr>
                    <th style="width: 8%">Item</th>
                    <th style="width: 15%">Código</th>
                    <th style="width: 37%">Descrição</th>
                    <th style="width: 8%">UN</th>
                    <th style="width: 10%">Qtd</th>
                    <th style="width: 11%">Vl. Unit.</th>
                    <th style="width: 11%">Total</th>
                </tr>
            </thead>
            <tbody>
                ${(pedido.itens || []).map((item, idx) => `
                <tr>
                    <td class="center">${idx + 1}</td>
                    <td>${item.codigo || '-'}</td>
                    <td>${item.descricao || '-'}</td>
                    <td class="center">${item.unidade || 'UN'}</td>
                    <td class="right">${this.formatarNumero(item.quantidade, 2)}</td>
                    <td class="right">${this.formatarMoeda(item.preco_unitario)}</td>
                    <td class="right">${this.formatarMoeda(item.total)}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
    </div>

    ${this.renderTotaisCompra(pedido)}

    ${pedido.observacoes ? `
    <div class="secao">
        <div class="secao-titulo">OBSERVAÇÕES</div>
        <p class="observacoes">${pedido.observacoes}</p>
    </div>
    ` : ''}

    <div class="assinaturas">
        <div class="assinatura">
            <div class="linha-assinatura"></div>
            <p>Comprador</p>
        </div>
        <div class="assinatura">
            <div class="linha-assinatura"></div>
            <p>Aprovação</p>
        </div>
    </div>

    ${this.renderRodape()}
</body>
</html>`;

        return this.htmlToPDF(html, `pedido_compra_${numero}.pdf`);
    }

    /**
     * Gera PDF de Ordem de Produção
     */
    async gerarOrdemProducao(op, opcoes = {}) {
        const numero = op.numero || op.id;

        const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>ORDEM DE PRODUÇÍO #${numero}</title>
    <style>
        ${this.getEstilosBase()}
        .titulo-doc { color: #ea580c; }
        .prioridade-alta { background: #fef2f2; color: #dc2626; }
        .prioridade-normal { background: #f0f9ff; color: #0284c7; }
        .prioridade-baixa { background: #f0fdf4; color: #16a34a; }
    </style>
</head>
<body>
    ${this.renderCabecalho('ORDEM DE PRODUÇÍO', numero)}
    
    <div class="secao">
        <div class="secao-titulo">INFORMAÇÕES GERAIS</div>
        <table class="tabela-info">
            <tr>
                <td><strong>Data Emissão:</strong></td>
                <td>${this.formatarData(op.created_at || op.data_emissao)}</td>
                <td><strong>Previsão:</strong></td>
                <td>${this.formatarData(op.data_previsao)}</td>
            </tr>
            <tr>
                <td><strong>Cliente:</strong></td>
                <td>${op.cliente_nome || '-'}</td>
                <td><strong>Pedido Venda:</strong></td>
                <td>${op.pedido_vendas_id ? `#${op.pedido_vendas_id}` : '-'}</td>
            </tr>
            <tr>
                <td><strong>Prioridade:</strong></td>
                <td><span class="badge prioridade-${op.prioridade || 'normal'}">${(op.prioridade || 'normal').toUpperCase()}</span></td>
                <td><strong>Status:</strong></td>
                <td>${this.formatarStatus(op.status)}</td>
            </tr>
        </table>
    </div>

    <div class="secao">
        <div class="secao-titulo">ITENS A PRODUZIR</div>
        <table class="tabela-itens">
            <thead>
                <tr>
                    <th style="width: 8%">Item</th>
                    <th style="width: 15%">Código</th>
                    <th style="width: 42%">Descrição</th>
                    <th style="width: 10%">UN</th>
                    <th style="width: 12%">Qtd</th>
                    <th style="width: 13%">Status</th>
                </tr>
            </thead>
            <tbody>
                ${(op.itens || []).map((item, idx) => `
                <tr>
                    <td class="center">${idx + 1}</td>
                    <td>${item.codigo || item.produto_codigo || '-'}</td>
                    <td>${item.descricao || item.produto_descricao || '-'}</td>
                    <td class="center">${item.unidade || 'UN'}</td>
                    <td class="right">${this.formatarNumero(item.quantidade, 2)}</td>
                    <td class="center">${this.formatarStatus(item.status || 'pendente')}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
    </div>

    ${op.observacoes ? `
    <div class="secao">
        <div class="secao-titulo">OBSERVAÇÕES</div>
        <p class="observacoes">${op.observacoes}</p>
    </div>
    ` : ''}

    <div class="secao">
        <div class="secao-titulo">CONTROLE DE PRODUÇÍO</div>
        <table class="tabela-controle">
            <tr>
                <td style="width: 25%"><strong>Início:</strong> ___/___/_____ ___:___</td>
                <td style="width: 25%"><strong>Término:</strong> ___/___/_____ ___:___</td>
                <td style="width: 25%"><strong>Operador:</strong> ______________</td>
                <td style="width: 25%"><strong>Visto QC:</strong> ______________</td>
            </tr>
        </table>
    </div>

    ${this.renderRodape()}
</body>
</html>`;

        return this.htmlToPDF(html, `op_${numero}.pdf`);
    }

    /**
     * Gera PDF de Relatório Genérico
     */
    async gerarRelatorio(dados, opcoes = {}) {
        const {
            titulo = 'RELATÓRIO',
            subtitulo = '',
            periodo = '',
            colunas = [],
            linhas = [],
            totais = null,
            orientacao = 'portrait'
        } = opcoes;

        const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${titulo}</title>
    <style>
        ${this.getEstilosBase()}
        @page { size: A4 ${orientacao}; }
        .titulo-doc { color: var(--ink); }
    </style>
</head>
<body>
    ${this.renderCabecalho(titulo, '')}

    ${subtitulo || periodo ? `
    <div class="doc-card">
        ${subtitulo ? `<h2>${subtitulo}</h2>` : ''}
        ${periodo ? `<div class="subtitle">Período: ${periodo}</div>` : ''}
    </div>
    ` : ''}

    <div class="section-card">
        <div class="s-head">Detalhamento</div>
        <table class="tabela-itens">
            <thead>
                <tr>
                    ${colunas.map(col => `
                        <th style="width: ${col.width || 'auto'}; text-align: ${col.align || 'left'}">${col.label}</th>
                    `).join('')}
                </tr>
            </thead>
            <tbody>
                ${linhas.map(linha => `
                <tr>
                    ${colunas.map(col => `
                        <td class="${col.align || 'left'}">${this.formatarCelula(linha[col.campo], col.tipo)}</td>
                    `).join('')}
                </tr>
                `).join('')}
            </tbody>
            ${totais ? `
            <tfoot>
                <tr class="totais">
                    ${colunas.map(col => `
                        <td class="${col.align || 'left'} total">${totais[col.campo] !== undefined ? this.formatarCelula(totais[col.campo], col.tipo) : ''}</td>
                    `).join('')}
                </tr>
            </tfoot>
            ` : ''}
        </table>
    </div>

    <div class="resumo-relatorio">
        <p>Total de registros: ${linhas.length}</p>
    </div>

    ${this.renderRodape()}
</body>
</html>`;

        return this.htmlToPDF(html, `relatorio_${Date.now()}.pdf`);
    }

    // ==================== MÉTODOS AUXILIARES ====================

    getEstilosBase() {
        return `
            :root{--ink:#0c1726;--text:#385062;--muted:#6d8092;--line:#d8e4ed;--soft:#f6fafc;--brand:#0b2842;--brand-2:#103758;--accent:#18b6c8;--accent-soft:#e7fbfd}
            @page{margin:8mm;size:A4}
            @media print{@page{margin:8mm}html,body{margin:0;padding:0}body::before,body::after{display:none!important}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
            *{margin:0;padding:0;box-sizing:border-box}
            body{font-family:Inter,'Segoe UI',Arial,Helvetica,sans-serif;color:var(--text);background:#eef4f8;display:flex;justify-content:center;font-size:10px;line-height:1.4}
            .page-shell{width:190mm;margin:8mm auto;background:#fff;border:1px solid var(--line);border-radius:20px;box-shadow:0 18px 42px rgba(11,40,66,.08);padding:7mm}
            .top-rule{height:5px;background:linear-gradient(90deg,var(--brand) 0%,var(--brand-2) 62%,var(--accent) 100%);border-radius:999px;margin-bottom:14px}
            
            .cabecalho{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:14px;border-bottom:1px solid var(--line);margin-bottom:14px}
            .empresa-info .brand-name{font-size:18px;font-weight:900;color:var(--brand);letter-spacing:.08em;text-transform:uppercase}
            .empresa-info .brand-sub{font-size:8px;color:var(--muted);margin-top:2px}
            .empresa-info p{font-size:8px;color:var(--muted);line-height:1.6;margin-top:4px}
            .doc-info{text-align:right}
            .doc-info h1{font-size:14px;font-weight:900;color:var(--ink);margin-bottom:4px}
            .doc-info .numero{font-size:10px;color:var(--accent);font-weight:600}
            .doc-info .data-emissao{font-size:8px;color:var(--muted);margin-top:4px}
            
            .doc-card{border:1px solid var(--accent);border-radius:14px;background:linear-gradient(135deg,var(--accent-soft) 0%,#fff 100%);padding:12px 16px;margin-bottom:14px;text-align:center}
            .doc-card h2{font-size:13px;font-weight:800;color:var(--ink);letter-spacing:.5px;margin:0}
            .doc-card .subtitle{font-size:9px;color:var(--accent);margin-top:3px;font-weight:600}
            
            .secao{margin-bottom:14px}
            .secao-titulo,.s-head{background:var(--brand);color:#fff;padding:7px 14px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;border-radius:14px 14px 0 0}
            .section-card{border:1px solid var(--line);border-radius:14px;overflow:hidden;margin-bottom:14px}
            .s-body{padding:10px 14px}
            
            .tabela-info{width:100%;border-collapse:collapse}
            .tabela-info td{padding:6px 10px;border-bottom:1px solid var(--line);font-size:9px}
            .tabela-info td:first-child{color:var(--muted);font-weight:700;min-width:110px}
            .tabela-info td strong{color:var(--muted);font-weight:700}
            
            .tabela-itens{width:100%;border-collapse:collapse}
            .tabela-itens th{background:var(--brand);color:#fff;padding:7px 10px;font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;text-align:left}
            .tabela-itens td{padding:6px 10px;border-bottom:1px solid var(--line);font-size:9px}
            .tabela-itens tbody tr:nth-child(even){background:var(--soft)}
            .tabela-itens .center{text-align:center}
            .tabela-itens .right{text-align:right}
            
            .totais-box{margin-top:14px;display:flex;justify-content:flex-end}
            .totais-card{border:1px solid var(--line);border-radius:14px;overflow:hidden;min-width:260px}
            .totais-row{display:flex;justify-content:space-between;padding:6px 14px;font-size:9px;border-bottom:1px solid var(--line)}
            .totais-row .lbl{color:var(--muted);font-weight:600}
            .totais-row .val{color:var(--ink);font-weight:600}
            .totais-row.neg .val{color:#dc2626}
            .totais-row.grand{background:linear-gradient(135deg,var(--brand) 0%,var(--brand-2) 60%,var(--accent) 100%);border-bottom:none;padding:10px 14px}
            .totais-row.grand .lbl{color:#fff;font-size:11px;font-weight:800}
            .totais-row.grand .val{color:#fff;font-size:12px;font-weight:900}
            
            .totais-tabela{width:100%}
            .totais-tabela td{padding:6px 14px;font-size:9px}
            .totais-tabela td:first-child{text-align:right;color:var(--muted);font-weight:600}
            .totais-tabela td:last-child{text-align:right;color:var(--ink);font-weight:600}
            .totais-tabela tr.total-geral td{background:linear-gradient(135deg,var(--brand) 0%,var(--brand-2) 60%,var(--accent) 100%);color:#fff;font-size:11px;font-weight:800;padding:10px 14px}
            
            .observacoes{background:var(--accent-soft);border:1px solid var(--accent);padding:12px 14px;border-radius:12px;font-size:9px;color:var(--text);line-height:1.5}
            
            .assinaturas{display:flex;justify-content:space-around;margin-top:40px}
            .assinatura{text-align:center}
            .linha-assinatura{width:200px;border-top:1px solid var(--line);margin-bottom:5px}
            .assinatura p{font-size:8px;color:var(--muted)}
            
            .rodape{margin-top:14px;padding-top:10px;border-top:1px dashed var(--line);font-size:7px;color:var(--muted);text-align:center;line-height:1.8}
            
            .badge{padding:3px 8px;border-radius:8px;font-size:8px;font-weight:700}
            
            .meta-grid{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px;margin-bottom:14px}
            .meta-item{background:var(--soft);border:1px solid var(--line);border-radius:12px;padding:8px 10px}
            .meta-item .lbl{font-size:7px;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:.08em;margin-bottom:2px}
            .meta-item .val{font-size:10px;color:var(--ink);font-weight:600}
            
            .tabela-controle{width:100%;border-collapse:collapse}
            .tabela-controle td{padding:15px 10px;border:1px solid var(--line)}
            
            .resumo-relatorio{background:var(--soft);border:1px solid var(--line);border-radius:12px;padding:10px 14px;font-size:9px;margin-bottom:14px}
            .resumo-relatorio p{color:var(--muted);font-weight:600}
        `;
    }

    renderCabecalho(titulo, numero) {
        return `
        <div class="page-shell">
        <div class="top-rule"></div>
        <div class="cabecalho">
            <div class="empresa-info">
                <div class="brand-name">${this.empresa.nome}</div>
                <div class="brand-sub">${this.empresa.cnpj}</div>
                <p>${this.empresa.endereco}<br>${this.empresa.cidade}<br>Tel: ${this.empresa.telefone}</p>
            </div>
            <div class="doc-info">
                <h1 class="titulo-doc">${titulo}</h1>
                <p class="numero">Nº ${numero}</p>
                <p class="data-emissao">Emitido em: ${this.formatarDataHora(new Date())}</p>
            </div>
        </div>`;
    }

    renderTotais(pedido) {
        const subtotal = parseFloat(pedido.subtotal) || parseFloat(pedido.valor_total) || 0;
        const desconto = parseFloat(pedido.desconto) || 0;
        const frete = parseFloat(pedido.valor_frete) || parseFloat(pedido.frete) || 0;
        const ipi = parseFloat(pedido.total_ipi) || 0;
        const icmsST = parseFloat(pedido.total_icms_st) || 0;
        const difal = parseFloat(pedido.total_difal) || 0;
        const total = subtotal - desconto + frete + ipi + icmsST + difal;

        return `
        <div class="totais-box">
            <div class="totais-card">
                <div class="totais-row"><span class="lbl">Subtotal:</span><span class="val">${this.formatarMoeda(subtotal)}</span></div>
                ${desconto > 0 ? `<div class="totais-row neg"><span class="lbl">Desconto:</span><span class="val">- ${this.formatarMoeda(desconto)}</span></div>` : ''}
                ${frete > 0 ? `<div class="totais-row"><span class="lbl">Frete:</span><span class="val">${this.formatarMoeda(frete)}</span></div>` : ''}
                ${ipi > 0 ? `<div class="totais-row"><span class="lbl">IPI:</span><span class="val">${this.formatarMoeda(ipi)}</span></div>` : ''}
                ${icmsST > 0 ? `<div class="totais-row"><span class="lbl">ICMS ST:</span><span class="val">${this.formatarMoeda(icmsST)}</span></div>` : ''}
                ${difal > 0 ? `<div class="totais-row"><span class="lbl">DIFAL:</span><span class="val">${this.formatarMoeda(difal)}</span></div>` : ''}
                <div class="totais-row grand"><span class="lbl">TOTAL:</span><span class="val">${this.formatarMoeda(total)}</span></div>
            </div>
        </div>`;
    }

    renderTotaisCompra(pedido) {
        const subtotal = parseFloat(pedido.subtotal) || parseFloat(pedido.valor_total) || 0;
        const desconto = parseFloat(pedido.desconto) || 0;
        const frete = parseFloat(pedido.valor_frete) || parseFloat(pedido.frete) || 0;
        const total = parseFloat(pedido.valor_final) || (subtotal - desconto + frete);

        return `
        <div class="totais-box">
            <div class="totais-card">
                <div class="totais-row"><span class="lbl">Subtotal:</span><span class="val">${this.formatarMoeda(subtotal)}</span></div>
                ${desconto > 0 ? `<div class="totais-row neg"><span class="lbl">Desconto (${pedido.desconto_percentual || 0}%):</span><span class="val">- ${this.formatarMoeda(desconto)}</span></div>` : ''}
                ${frete > 0 ? `<div class="totais-row"><span class="lbl">Frete:</span><span class="val">${this.formatarMoeda(frete)}</span></div>` : ''}
                <div class="totais-row grand"><span class="lbl">VALOR TOTAL:</span><span class="val">${this.formatarMoeda(total)}</span></div>
            </div>
        </div>`;
    }

    renderRodape() {
        return `
        <div class="rodape">
            <div>Documento gerado automaticamente pelo sistema ALUFORCE</div>
            <div>${this.empresa.nome} | ${this.empresa.email}</div>
            <div style="font-style:italic;margin-top:2px;">Este documento é válido apenas para fins de consulta interna.</div>
        </div>
        </div><!-- /.page-shell -->`;
    }

    formatarData(data) {
        if (!data) return '-';
        const d = new Date(data);
        return d.toLocaleDateString('pt-BR');
    }

    formatarDataHora(data) {
        if (!data) return '-';
        const d = new Date(data);
        return d.toLocaleString('pt-BR');
    }

    formatarMoeda(valor) {
        if (valor === null || valor === undefined) return '-';
        return parseFloat(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    formatarNumero(valor, decimais = 2) {
        if (valor === null || valor === undefined) return '-';
        return parseFloat(valor).toLocaleString('pt-BR', { minimumFractionDigits: decimais, maximumFractionDigits: decimais });
    }

    formatarEndereco(dados) {
        const partes = [];
        if (dados.endereco || dados.cliente_endereco) partes.push(dados.endereco || dados.cliente_endereco);
        if (dados.bairro || dados.cliente_bairro) partes.push(dados.bairro || dados.cliente_bairro);
        if (dados.cidade || dados.cliente_cidade) partes.push(dados.cidade || dados.cliente_cidade);
        if (dados.estado || dados.cliente_uf) partes.push(dados.estado || dados.cliente_uf);
        if (dados.cep || dados.cliente_cep) partes.push(`CEP: ${dados.cep || dados.cliente_cep}`);
        return partes.join(' - ') || '-';
    }

    formatarStatus(status) {
        const statusMap = {
            'pendente': '⏳ Pendente',
            'a_produzir': '📋 A Produzir',
            'produzindo': '🔨 Produzindo',
            'qualidade': '🔍 Qualidade',
            'conferido': '✓ Conferido',
            'concluido': '✅ Concluído',
            'armazenado': '📦 Armazenado',
            'aprovado': '✅ Aprovado',
            'cancelado': '❌ Cancelado'
        };
        return statusMap[status] || status || '-';
    }

    formatarCelula(valor, tipo) {
        switch (tipo) {
            case 'moeda': return this.formatarMoeda(valor);
            case 'numero': return this.formatarNumero(valor);
            case 'data': return this.formatarData(valor);
            case 'dataHora': return this.formatarDataHora(valor);
            default: return valor || '-';
        }
    }

    /**
     * Converte HTML para PDF (usando biblioteca no navegador ou servidor)
     */
    async htmlToPDF(html, filename) {
        // Em ambiente de navegador, usa window.print() ou biblioteca como html2pdf
        if (typeof window !== 'undefined') {
            // Abre em nova janela para impressão
            const printWindow = window.open('', '_blank');
            printWindow.document.write(html);
            printWindow.document.close();
            
            // Adiciona evento para imprimir após carregar
            printWindow.onload = function() {
                printWindow.print();
            };

            return { success: true, method: 'print', filename };
        }

        // Em ambiente Node.js, retorna o HTML para processamento com puppeteer ou similar
        return { success: true, html, filename };
    }

    /**
     * Gera e baixa o PDF (para uso no navegador)
     */
    async baixarPDF(html, filename) {
        if (typeof window !== 'undefined' && window.html2pdf) {
            // Usar html2pdf.js se disponível
            const element = document.createElement('div');
            element.innerHTML = html;
            document.body.appendChild(element);

            const opt = {
                margin: 10,
                filename: filename,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2 },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };

            await window.html2pdf().set(opt).from(element).save();
            document.body.removeChild(element);

            return { success: true };
        }

        // Fallback: abrir para impressão
        return this.htmlToPDF(html, filename);
    }
}

// Exportar para uso em Node.js e Browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GeradorPDF;
}

if (typeof window !== 'undefined') {
    window.GeradorPDF = GeradorPDF;
}
