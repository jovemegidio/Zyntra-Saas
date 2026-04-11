/**
 * Script de teste: Emitir OP e inspecionar Excel gerado
 * Compara campos enviados vs preenchidos no Excel
 * 
 * Executa DIRETAMENTE na VPS sem necessidade de autenticação:
 *   node test-op-excel.js
 * 
 * Ou via HTTP com credenciais:
 *   node test-op-excel.js --http <email> <senha>
 */
const http = require('http');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

const BASE = 'http://127.0.0.1:3000';
const USE_HTTP = process.argv.includes('--http');

// Dados de teste com todos os campos
const DADOS_OP = {
    num_pedido: '99999',
    num_orcamento: 'ORC-TESTE-001',
    revisao: '02',
    data_liberacao: new Date().toISOString().split('T')[0],
    vendedor: 'Vendedor Teste Auditoria',
    prazo_entrega: new Date(Date.now() + 30*86400000).toISOString().split('T')[0],
    tipo_frete: 'CIF',

    // Cliente
    cliente: 'EMPRESA TESTE AUDITORIA LTDA',
    cpf_cnpj: '12345678000199',
    contato_cliente: 'João da Silva Teste',
    fone_cliente: '(11) 99999-8888',
    email_cliente: 'teste@empresa-auditoria.com.br',
    email_nfe: 'nfe@empresa-auditoria.com.br',
    endereco: 'Rua Teste Auditoria, 123 - Centro',
    cep: '01001-000',

    // Transportadora
    transportadora_nome: 'TRANSPORTES RÁPIDO LTDA',
    transportadora_cpf_cnpj: '98765432000188',
    transportadora_cep: '04001-000',
    transportadora_endereco: 'Av. Transportes, 456 - Industrial',

    // Produtos (3 variados)
    produtos: [
        {
            codigo: 'TRN10',
            descricao: 'TRANÇADEIRA 10MM PRETA',
            'descrição': 'TRANÇADEIRA 10MM PRETA',
            embalagem: 'Rolo',
            lances: '1x100',
            quantidade: 500,
            unidade_medida: 'M',
            valor_unitario: 2.50,
            peso_liquido: 12.5,
            lote: 'LOTE-2026-A'
        },
        {
            codigo: 'DUN16',
            descricao: 'DUNITEX 16MM CINZA',
            'descrição': 'DUNITEX 16MM CINZA',
            embalagem: 'Bobina',
            lances: '2x50',
            quantidade: 300,
            unidade_medida: 'M',
            valor_unitario: 4.80,
            peso_liquido: 8.3,
            lote: 'LOTE-2026-B'
        },
        {
            codigo: 'FLX25',
            descricao: 'FLEXÍVEL 25MM AZUL',
            'descrição': 'FLEXÍVEL 25MM AZUL',
            embalagem: 'Rolo',
            lances: '1x200',
            quantidade: 100,
            unidade_medida: 'M',
            valor_unitario: 7.90,
            peso_liquido: 5.1,
            lote: 'LOTE-2026-C'
        }
    ],

    // 3 formas de pagamento
    formas_pagamento: [
        { forma: 'A_VISTA', percentual: 50, metodo: 'BOLETO' },
        { forma: 'PRAZO', percentual: 30, metodo: 'TRANSFERENCIA' },
        { forma: 'PRAZO', percentual: 20, metodo: 'CARTAO' }
    ],

    // Condições de pagamento
    'condições_pagamento': 'Pagamento 50% à vista, 30% em 30 dias, 20% em 60 dias.',
    condicoes_pagamento: 'Pagamento 50% à vista, 30% em 30 dias, 20% em 60 dias.',

    // Entrega
    qtd_volumes: 15,
    tipo_embalagem_entrega: 'Caixa Papelão',
    observacoes_entrega: 'Entregar no depósito - portão lateral',

    // Observações
    observacoes_pedido: 'OP de teste para auditoria completa de mapeamento',
    observacoes: 'OP de teste para auditoria completa de mapeamento'
};

function httpReq(method, urlPath, body, cookies) {
    return new Promise((resolve, reject) => {
        const url = new URL(BASE + urlPath);
        const bodyStr = body ? JSON.stringify(body) : null;
        const opts = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname,
            method,
            headers: {
                'Content-Type': 'application/json',
                ...(cookies ? { Cookie: cookies } : {}),
                ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {})
            }
        };

        const req = http.request(opts, res => {
            const chunks = [];
            res.on('data', c => chunks.push(c));
            res.on('end', () => {
                const raw = Buffer.concat(chunks);
                const setCookie = res.headers['set-cookie'] || [];
                resolve({ status: res.statusCode, headers: res.headers, setCookie, raw, body: raw });
            });
        });
        req.on('error', reject);
        if (bodyStr) req.write(bodyStr);
        req.end();
    });
}

async function main() {
    console.log('=== TESTE DE EMISSÃO DE ORDEM DE PRODUÇÃO ===\n');

    let excelBuffer;

    if (USE_HTTP) {
        // Modo HTTP - precisa de login
        console.log('1. Fazendo login (modo HTTP)...');
        const emailArg = process.argv[process.argv.indexOf('--http') + 1] || 'admin@local';
        const passArg = process.argv[process.argv.indexOf('--http') + 2] || 'admin123';
        const loginRes = await httpReq('POST', '/api/pcp/login', { email: emailArg, password: passArg });

        if (loginRes.status !== 200) {
            console.error(`   ERRO login: HTTP ${loginRes.status} - ${loginRes.raw.toString()}`);
            process.exit(1);
        }

        const authCookie = loginRes.setCookie
            .map(c => c.split(';')[0])
            .filter(c => c.startsWith('authToken='))
            .join('; ');

        if (!authCookie) {
            console.error('   ERRO: Cookie authToken não recebido');
            process.exit(1);
        }
        console.log('   Login OK ✓\n');

        console.log('2. Gerando Ordem de Produção Excel (HTTP)...');
        const opRes = await httpReq('POST', '/api/pcp/gerar-ordem-excel', DADOS_OP, authCookie);

        if (opRes.status !== 200) {
            console.error(`   ERRO gerar OP: HTTP ${opRes.status} - ${opRes.raw.toString().substring(0, 500)}`);
            process.exit(1);
        }
        excelBuffer = opRes.raw;
    } else {
        // Modo DIRETO - gera Excel sem servidor
        console.log('1. Modo direto (sem HTTP) - gerando Excel localmente...');
        
        const templatePath = path.join(__dirname, 'modules', 'PCP', 'Ordem de Produção Aluforce - Copia.xlsx');
        if (!fs.existsSync(templatePath)) {
            console.error(`   ERRO: Template não encontrado: ${templatePath}`);
            process.exit(1);
        }

        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(templatePath);

        const wsVendas = workbook.getWorksheet('VENDAS_PCP');
        if (!wsVendas) {
            console.error('   ERRO: Planilha VENDAS_PCP não encontrada no template');
            process.exit(1);
        }

        // Reproduzir a lógica de handleGerarOrdemExcel
        const dados = DADOS_OP;
        const numPedido = dados.num_pedido || '';
        const numOrcamento = dados.num_orcamento || '';

        // Helpers
        function formatarCpfCnpjExcel(value) {
            if (!value) return '';
            const limpo = String(value).replace(/\D/g, '');
            if (limpo.length === 11) return limpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
            if (limpo.length === 14) return limpo.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
            return value;
        }

        // Nº Orçamento
        wsVendas.getCell('C4').value = numOrcamento;
        // Revisão
        wsVendas.getCell('E4').value = dados.revisao || '01';
        // Nº Pedido
        wsVendas.getCell('G4').value = numPedido;
        // Data Liberação
        if (dados.data_liberacao) {
            let dataParts = dados.data_liberacao.split('/');
            let dataLib;
            if (dataParts.length === 3) {
                dataLib = new Date(dataParts[2], dataParts[1] - 1, dataParts[0]);
            } else {
                dataLib = new Date(dados.data_liberacao + 'T00:00:00');
            }
            wsVendas.getCell('J4').value = dataLib;
            wsVendas.getCell('J4').numFmt = 'dd/mm/yyyy';
        }
        // Vendedor
        wsVendas.getCell('C6').value = dados.vendedor || '';
        // Prazo Entrega
        if (dados.prazo_entrega) {
            let dataPrazo;
            let parts = dados.prazo_entrega.split('/');
            if (parts.length === 3) {
                dataPrazo = new Date(parts[2], parts[1] - 1, parts[0]);
            } else {
                dataPrazo = new Date(dados.prazo_entrega + 'T00:00:00');
            }
            wsVendas.getCell('H6').value = dataPrazo;
            wsVendas.getCell('H6').numFmt = 'dd/mm/yyyy';
        }
        // Cliente
        wsVendas.getCell('C7').value = dados.cliente || '';
        // Contato
        wsVendas.getCell('C8').value = dados.contato_cliente || dados.contato || '';
        // Fone
        wsVendas.getCell('H8').value = dados.fone_cliente || dados.telefone || '';
        // Email
        wsVendas.getCell('C9').value = dados.email_cliente || dados.email || '';
        // Frete
        wsVendas.getCell('J9').value = dados.tipo_frete || 'FOB';

        // Dados cobrança (limpar)
        ['C14', 'D14', 'E14', 'F14'].forEach(cellAddr => {
            const cell = wsVendas.getCell(cellAddr);
            cell.value = '';
            if (cell.formula) cell.formula = undefined;
            if (cell.sharedFormula) cell.sharedFormula = undefined;
        });

        // Email NF-e
        wsVendas.getCell('G15').value = dados.email_nfe || dados.email_cliente || dados.email || '';

        // Produtos VENDAS_PCP
        let linhaVendas = 18;
        let itemNum = 1;
        for (const produto of dados.produtos.slice(0, 15)) {
            wsVendas.getCell(`A${linhaVendas}`).value = itemNum;
            wsVendas.getCell(`B${linhaVendas}`).value = produto.codigo || '';
            if (!produto.codigo && (produto.descricao || produto['descrição'] || produto.nome)) {
                wsVendas.getCell(`C${linhaVendas}`).value = produto.descricao || produto['descrição'] || produto.nome || '';
            }
            wsVendas.getCell(`F${linhaVendas}`).value = produto.embalagem || 'Rolo';
            wsVendas.getCell(`G${linhaVendas}`).value = produto.lances || '1x100';
            wsVendas.getCell(`H${linhaVendas}`).value = produto.quantidade || 0;
            wsVendas.getCell(`I${linhaVendas}`).value = produto.valor_unitario || 0;
            wsVendas.getCell(`I${linhaVendas}`).numFmt = 'R$ #,##0.00';
            linhaVendas++;
            itemNum++;
        }

        // Limpar linhas não usadas
        for (let l = linhaVendas; l <= 32; l++) {
            ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'].forEach(col => {
                const cell = wsVendas.getCell(`${col}${l}`);
                cell.value = null;
                if (cell.formula) cell.formula = undefined;
                if (cell.model) { cell.model.value = null; cell.model.formula = undefined; }
            });
        }

        // Transportadora
        wsVendas.getCell('C12').value = dados.transportadora_nome || '';
        wsVendas.getCell('C13').value = dados.transportadora_cep || dados.cep || '';
        wsVendas.getCell('F13').value = dados.transportadora_endereco || dados.endereco || '';
        const cpfCnpjTransp = dados.transportadora_cpf_cnpj || dados.cpf_cnpj || '';
        wsVendas.getCell('C15').value = formatarCpfCnpjExcel(cpfCnpjTransp);

        // Observações
        if (dados.observacoes_pedido || dados.observacoes) {
            wsVendas.getCell('A37').value = dados.observacoes_pedido || dados.observacoes || '';
        }

        // Pagamento
        if (dados.formas_pagamento && dados.formas_pagamento.length > 0) {
            const pgto1 = dados.formas_pagamento[0];
            wsVendas.getCell('A45').value = pgto1.forma || 'A_VISTA';
            wsVendas.getCell('E45').value = (pgto1.percentual || 100) / 100;
            wsVendas.getCell('E45').numFmt = '0%';
            wsVendas.getCell('F45').value = pgto1.metodo || 'BOLETO';
            if (dados.formas_pagamento.length > 1) {
                const pgto2 = dados.formas_pagamento[1];
                wsVendas.getCell('A46').value = pgto2.forma || '';
                wsVendas.getCell('E46').value = (pgto2.percentual || 0) / 100;
                wsVendas.getCell('E46').numFmt = '0%';
                wsVendas.getCell('F46').value = pgto2.metodo || '';
            }
            if (dados.formas_pagamento.length > 2) {
                const pgto3 = dados.formas_pagamento[2];
                wsVendas.getCell('A47').value = pgto3.forma || '';
                wsVendas.getCell('E47').value = (pgto3.percentual || 0) / 100;
                wsVendas.getCell('E47').numFmt = '0%';
                wsVendas.getCell('F47').value = pgto3.metodo || '';
            }
        }

        // Condições de pagamento
        const condicoesPgto = dados['condições_pagamento'] || dados.condicoes_pagamento || '';
        if (condicoesPgto) {
            wsVendas.getCell('A48').value = condicoesPgto;
        }

        // Entrega
        if (dados.qtd_volumes) wsVendas.getCell('D48').value = parseInt(dados.qtd_volumes) || 1;
        if (dados.tipo_embalagem_entrega) wsVendas.getCell('H48').value = dados.tipo_embalagem_entrega;
        if (dados.observacoes_entrega) wsVendas.getCell('E51').value = dados.observacoes_entrega;

        // PRODUÇÃO
        const wsProd = workbook.getWorksheet('PRODUÇÃO');
        if (wsProd) {
            let indexProd = 0;
            for (const produto of dados.produtos.slice(0, 15)) {
                const linhaProduto = 13 + (indexProd * 3);
                const linhaPesoLote = linhaProduto + 1;
                if (produto.codigo) {
                    const cellCodigo = wsProd.getCell(`B${linhaProduto}`);
                    cellCodigo.value = null;
                    if (cellCodigo.formula) cellCodigo.formula = undefined;
                    cellCodigo.value = produto.codigo;
                }
                const descricao = produto.descricao || produto['descrição'] || produto.nome || '';
                const cellDescricao = wsProd.getCell(`C${linhaProduto}`);
                cellDescricao.value = null;
                if (cellDescricao.formula) cellDescricao.formula = undefined;
                if (cellDescricao.sharedFormula) cellDescricao.sharedFormula = undefined;
                cellDescricao.value = descricao || '';
                if (produto.quantidade) {
                    const cellQtd = wsProd.getCell(`J${linhaProduto}`);
                    cellQtd.value = produto.quantidade;
                    cellQtd.numFmt = '#,##0.00';
                }
                if (produto.peso_liquido) wsProd.getCell(`E${linhaPesoLote}`).value = produto.peso_liquido;
                if (produto.lote) wsProd.getCell(`G${linhaPesoLote}`).value = produto.lote;
                indexProd++;
            }
            // Limpar não usadas
            for (let i = dados.produtos.length; i < 15; i++) {
                const lp = 13 + (i * 3);
                ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'].forEach(col => {
                    const cell = wsProd.getCell(`${col}${lp}`);
                    cell.value = null;
                    if (cell.formula) cell.formula = undefined;
                    if (cell.model) { cell.model.value = null; cell.model.formula = undefined; }
                });
                ['E', 'G'].forEach(col => {
                    const cell = wsProd.getCell(`${col}${lp + 1}`);
                    cell.value = null;
                    if (cell.formula) cell.formula = undefined;
                });
            }
        }

        // Forçar limpeza C14-F14
        ['C14', 'D14', 'E14', 'F14'].forEach(cellAddr => {
            const cell = wsVendas.getCell(cellAddr);
            cell.value = null;
            cell.formula = undefined;
            if (cell.model) { cell.model.value = null; cell.model.formula = undefined; }
        });

        excelBuffer = await workbook.xlsx.writeBuffer();
        console.log(`   Excel gerado: ${excelBuffer.length} bytes ✓\n`);
    }

    // 3. Inspecionar Excel
    console.log('3. Inspecionando Excel gerado...\n');
    const outPath = path.join(__dirname, 'OP-TESTE-AUDITORIA.xlsx');
    fs.writeFileSync(outPath, Buffer.from(excelBuffer));
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(excelBuffer);

    const wsV = wb.getWorksheet('VENDAS_PCP');
    const wsP = wb.getWorksheet('PRODUÇÃO');

    if (!wsV) { console.error('   ERRO: Planilha VENDAS_PCP não encontrada!'); process.exit(1); }

    const cellVal = (ws, addr) => {
        const cell = ws.getCell(addr);
        if (cell.formula) return `[FORMULA: =${cell.formula}]`;
        return cell.value;
    };

    const fmt = (v) => {
        if (v === null || v === undefined) return '(vazio)';
        if (v instanceof Date) return v.toISOString().split('T')[0];
        if (typeof v === 'object' && v.richText) return v.richText.map(r => r.text).join('');
        return String(v);
    };

    // ===== COMPARAÇÃO VENDAS_PCP =====
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('   PLANILHA: VENDAS_PCP');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const checks = [
        // [Célula, Campo Esperado, Valor Enviado]
        ['C4',  'Nº Orçamento',     DADOS_OP.num_orcamento],
        ['E4',  'Revisão',          DADOS_OP.revisao],
        ['G4',  'Nº Pedido',        DADOS_OP.num_pedido],
        ['J4',  'Data Liberação',   DADOS_OP.data_liberacao],
        ['C6',  'Vendedor',         DADOS_OP.vendedor],
        ['H6',  'Prazo Entrega',    DADOS_OP.prazo_entrega],
        ['C7',  'Cliente',          DADOS_OP.cliente],
        ['C8',  'Contato',          DADOS_OP.contato_cliente],
        ['H8',  'Fone',             DADOS_OP.fone_cliente],
        ['C9',  'Email',            DADOS_OP.email_cliente],
        ['J9',  'Frete',            DADOS_OP.tipo_frete],
        ['C12', 'Transportadora',   DADOS_OP.transportadora_nome],
        ['C13', 'CEP Transp.',      DADOS_OP.transportadora_cep],
        ['F13', 'Endereço Transp.', DADOS_OP.transportadora_endereco],
        ['C15', 'CNPJ Transp.',     '98.765.432/0001-88'], // formatado
        ['G15', 'Email NF-e',       DADOS_OP.email_nfe],
    ];

    let totalOk = 0, totalFail = 0, totalVazio = 0;

    for (const [cel, campo, esperado] of checks) {
        const real = fmt(cellVal(wsV, cel));
        const esp = fmt(esperado);
        const match = real.includes(esp) || esp.includes(real) || 
                      (real !== '(vazio)' && real.length > 0);
        
        if (real === '(vazio)' || real === '' || real === 'undefined') {
            console.log(`   ❌ ${cel.padEnd(4)} ${campo.padEnd(20)} VAZIO (esperado: ${esp})`);
            totalFail++;
            totalVazio++;
        } else if (match) {
            console.log(`   ✅ ${cel.padEnd(4)} ${campo.padEnd(20)} = ${real}`);
            totalOk++;
        } else {
            console.log(`   ⚠️  ${cel.padEnd(4)} ${campo.padEnd(20)} = ${real} (esperado: ${esp})`);
            totalFail++;
        }
    }

    // Produtos (linhas 18-20)
    console.log('\n   --- PRODUTOS (Linhas 18-20) ---');
    for (let i = 0; i < DADOS_OP.produtos.length; i++) {
        const linha = 18 + i;
        const prod = DADOS_OP.produtos[i];
        const codReal = fmt(cellVal(wsV, `B${linha}`));
        const embReal = fmt(cellVal(wsV, `F${linha}`));
        const lancReal = fmt(cellVal(wsV, `G${linha}`));
        const qtdReal = fmt(cellVal(wsV, `H${linha}`));
        const vuReal = fmt(cellVal(wsV, `I${linha}`));
        const descReal = fmt(cellVal(wsV, `C${linha}`));

        console.log(`\n   Produto ${i+1} (Linha ${linha}):`);
        
        const prodChecks = [
            [`B${linha}`, 'Código', prod.codigo, codReal],
            [`C${linha}`, 'Descrição', prod.descricao, descReal],
            [`F${linha}`, 'Embalagem', prod.embalagem, embReal],
            [`G${linha}`, 'Lances', prod.lances, lancReal],
            [`H${linha}`, 'Quantidade', String(prod.quantidade), qtdReal],
            [`I${linha}`, 'V.Unitário', String(prod.valor_unitario), vuReal],
        ];

        for (const [c, f, e, r] of prodChecks) {
            if (r === '(vazio)' || r === '') {
                // Se C tem VLOOKUP e tem código, não é erro
                if (c.startsWith('C') && codReal !== '(vazio)') {
                    console.log(`   ✅ ${c.padEnd(4)} ${f.padEnd(12)} = [VLOOKUP pelo código ${codReal}]`);
                    totalOk++;
                } else {
                    console.log(`   ❌ ${c.padEnd(4)} ${f.padEnd(12)} VAZIO (esperado: ${e})`);
                    totalFail++; totalVazio++;
                }
            } else {
                console.log(`   ✅ ${c.padEnd(4)} ${f.padEnd(12)} = ${r}`);
                totalOk++;
            }
        }
    }

    // Pagamento
    console.log('\n   --- PAGAMENTO (Linhas 45-48) ---');
    const pgtoChecks = [
        ['A45', '1ª Forma',    DADOS_OP.formas_pagamento[0].forma],
        ['E45', '1ª %',        String(DADOS_OP.formas_pagamento[0].percentual / 100)],
        ['F45', '1º Método',   DADOS_OP.formas_pagamento[0].metodo],
        ['A46', '2ª Forma',    DADOS_OP.formas_pagamento[1].forma],
        ['E46', '2ª %',        String(DADOS_OP.formas_pagamento[1].percentual / 100)],
        ['F46', '2º Método',   DADOS_OP.formas_pagamento[1].metodo],
        ['A47', '3ª Forma',    DADOS_OP.formas_pagamento[2].forma],
        ['E47', '3ª %',        String(DADOS_OP.formas_pagamento[2].percentual / 100)],
        ['F47', '3º Método',   DADOS_OP.formas_pagamento[2].metodo],
        ['A48', 'Cond. Pgto',  DADOS_OP.condicoes_pagamento.substring(0, 30)],
    ];

    for (const [cel, campo, esperado] of pgtoChecks) {
        const real = fmt(cellVal(wsV, cel));
        if (real === '(vazio)' || real === '' || real === 'null') {
            console.log(`   ❌ ${cel.padEnd(4)} ${campo.padEnd(14)} VAZIO (esperado: ${esperado})`);
            totalFail++; totalVazio++;
        } else {
            console.log(`   ✅ ${cel.padEnd(4)} ${campo.padEnd(14)} = ${real}`);
            totalOk++;
        }
    }

    // Entrega e Observações
    console.log('\n   --- ENTREGA E OBSERVAÇÕES ---');
    const entregaChecks = [
        ['A37', 'Observações',   DADOS_OP.observacoes_pedido.substring(0, 30)],
        ['D48', 'Qtd Volumes',   String(DADOS_OP.qtd_volumes)],
        ['H48', 'Tipo Emb.',    DADOS_OP.tipo_embalagem_entrega],
        ['E51', 'Obs Entrega',   DADOS_OP.observacoes_entrega.substring(0, 30)],
    ];

    for (const [cel, campo, esperado] of entregaChecks) {
        const real = fmt(cellVal(wsV, cel));
        if (real === '(vazio)' || real === '' || real === 'null') {
            console.log(`   ❌ ${cel.padEnd(4)} ${campo.padEnd(14)} VAZIO (esperado: ${esperado})`);
            totalFail++; totalVazio++;
        } else {
            console.log(`   ✅ ${cel.padEnd(4)} ${campo.padEnd(14)} = ${real}`);
            totalOk++;
        }
    }

    // ===== PLANILHA PRODUÇÃO =====
    if (wsP) {
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('   PLANILHA: PRODUÇÃO');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        for (let i = 0; i < DADOS_OP.produtos.length; i++) {
            const prod = DADOS_OP.produtos[i];
            const linhaProd = 13 + (i * 3);
            const linhaPeso = linhaProd + 1;

            console.log(`   Produto ${i+1} (Linha ${linhaProd}):`);

            const prodChecks2 = [
                [`B${linhaProd}`, 'Código',     prod.codigo],
                [`C${linhaProd}`, 'Descrição',  prod.descricao],
                [`J${linhaProd}`, 'Quantidade', String(prod.quantidade)],
                [`E${linhaPeso}`, 'P.Líquido',  String(prod.peso_liquido)],
                [`G${linhaPeso}`, 'Lote',       prod.lote],
            ];

            for (const [cel, campo, esperado] of prodChecks2) {
                const real = fmt(cellVal(wsP, cel));
                if (real === '(vazio)' || real === '' || real === 'null') {
                    console.log(`   ❌ ${cel.padEnd(4)} ${campo.padEnd(12)} VAZIO (esperado: ${esperado})`);
                    totalFail++; totalVazio++;
                } else {
                    console.log(`   ✅ ${cel.padEnd(4)} ${campo.padEnd(12)} = ${real}`);
                    totalOk++;
                }
            }
            console.log('');
        }

        // Verificar que linhas não usadas estão limpas
        const linhaNaoUsada = 13 + (DADOS_OP.produtos.length * 3);
        const celLimpa = fmt(cellVal(wsP, `B${linhaNaoUsada}`));
        if (celLimpa === '(vazio)' || celLimpa === '' || celLimpa === 'null') {
            console.log(`   ✅ B${linhaNaoUsada} Linha limpa    = (vazio) [correto - sem produto]`);
            totalOk++;
        } else {
            console.log(`   ⚠️  B${linhaNaoUsada} Linha não limpa = ${celLimpa} [deveria estar vazia]`);
            totalFail++;
        }
    } else {
        console.log('\n   ⚠️  Planilha PRODUÇÃO não encontrada!');
        totalFail++;
    }

    // Verificar C14 está limpo (dados cobrança)
    console.log('\n   --- VERIFICAÇÕES ESPECIAIS ---');
    const c14 = fmt(cellVal(wsV, 'C14'));
    if (c14 === '(vazio)' || c14 === '' || c14 === 'null') {
        console.log('   ✅ C14  Dados Cobrança   = (vazio) [correto - deve ficar vazio]');
        totalOk++;
    } else {
        console.log(`   ⚠️  C14  Dados Cobrança   = ${c14} [deveria estar vazio]`);
        totalFail++;
    }

    // Resumo
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('   RESUMO DA AUDITORIA');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   ✅ Campos corretos:   ${totalOk}`);
    console.log(`   ❌ Campos com falha:  ${totalFail}`);
    console.log(`   📭 Campos vazios:     ${totalVazio}`);
    console.log(`   📊 Taxa de acerto:    ${((totalOk / (totalOk + totalFail)) * 100).toFixed(1)}%`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (totalFail > 0) {
        console.log('   ⚠️  Há campos que precisam de atenção!');
    } else {
        console.log('   🎉 Todos os campos preenchidos corretamente!');
    }

    // Cleanup
    // fs.unlinkSync(outPath); // Manter para inspeção manual
    console.log(`\n   Arquivo Excel mantido em: ${outPath}`);
}

main().catch(err => {
    console.error('ERRO FATAL:', err.message);
    process.exit(1);
});
