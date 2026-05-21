/**
 * Script COMPLETO para reimportar pedidos do Excel pivot (1).xlsx
 * - Atualiza produtos com descrição real
 * - Mapeia vendedores corretamente (Lorena/REPRESENTANTE = Márcia)
 * - Atualiza previsão de faturamento
 */

require('dotenv').config();
const XLSX = require('xlsx');
const mysql = require('mysql2/promise');

const localConfig = {
    host: 'localhost',
    user: 'root',
    password: process.env.DB_PASSWORD || 'CHANGE_ME',
    database: 'aluforce_vendas',
    charset: 'utf8mb4'
};

// Mapeamento de vendedores do Excel para IDs do banco
// Lorena Silva e REPRESENTANTE = Márcia (ID 22)
const VENDEDOR_MAP = {
    'lorena silva': 22,           // Márcia
    'lorena': 22,                 // Márcia
    'representante': 22,          // Márcia
    'ariel silva': 4,             // Ariel da Silva Leandro
    'ariel': 4,
    'fabíola souza': 13,          // Fabíola de Souza Santos
    'fabiola souza': 13,
    'fabiola': 13,
    'renata alves': 38,           // Renata Maria Batista do Nascimento
    'renata': 38,
    'augusto santos': 5,          // Augusto Ladeira dos Santos
    'augusto': 5,
    'márcia scarcella': 22,       // Márcia do Nascimento Oliveira Scarcella
    'marcia scarcella': 22,
    'marcia': 22,
    'elaine freitas': 30,         // Thainá Cabral Freitas (mais próximo)
    'sarah souza': 40,            // Sarah (Ex-colaborador)
    'sarah': 40,
    'fabiano marques': 12,        // Fabiano Marques de Oliveira
    'fabiano': 12,
    'marcos oliveira': 23,        // Marcos Alexandre de Lima Oliveira Filho
    'marcos': 23,
    'lais da silva': 20,          // Laís da Silva Luna
    'lais': 20,
    'nayane amabila': 2,          // Andreia Trovão (padrão)
    'nayane': 2,
    'n/d': 2,                     // Usar padrão (Andreia)
};

async function reimportarPedidos() {
    const pool = await mysql.createPool(localConfig);
    
    try {
        console.log('🚀 Reimportando pedidos do Excel...\n');
        
        // Ler arquivo Excel
        const filePath = 'ordens-emitidas/Pedidos/pivot (1).xlsx';
        const workbook = XLSX.readFile(filePath);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
        
        // Dados começam na linha 6 (índice 6)
        // Cabeçalhos na linha 5
        const headers = data[5];
        console.log('📋 Colunas do Excel:');
        console.log('  [0] Cliente:', headers[0]);
        console.log('  [1] Previsão:', headers[1]);
        console.log('  [2] Produto:', headers[2]);
        console.log('  [3] Vendedor:', headers[3]);
        console.log('  [4] Quantidade:', headers[4]);
        console.log('  [5] Valor:', headers[5]);
        
        const linhasData = data.slice(6);
        console.log(`\n📊 Linhas de dados: ${linhasData.length}`);
        
        // Buscar clientes
        const [clientes] = await pool.query(`
            SELECT id, razao_social, nome_fantasia 
            FROM clientes
        `);
        
        const clientesPorNome = new Map();
        clientes.forEach(c => {
            const nomeFantasia = normalizar(c.nome_fantasia || '');
            const razaoSocial = normalizar(c.razao_social || '');
            if (nomeFantasia) {
                clientesPorNome.set(nomeFantasia, c);
                // Primeiras palavras
                const palavras = nomeFantasia.split(/\s+/);
                if (palavras.length >= 2) {
                    clientesPorNome.set(palavras.slice(0, 2).join(' '), c);
                }
            }
            if (razaoSocial) {
                clientesPorNome.set(razaoSocial, c);
            }
        });
        console.log(`👥 Clientes mapeados: ${clientesPorNome.size}`);
        
        // Buscar pedidos existentes
        const [pedidos] = await pool.query(`
            SELECT p.id, p.cliente_id, p.valor, c.nome_fantasia, c.razao_social
            FROM pedidos p
            JOIN clientes c ON c.id = p.cliente_id
            WHERE p.status = 'orcamento'
        `);
        
        // Mapa de pedidos por nome do cliente
        const pedidosPorCliente = new Map();
        pedidos.forEach(p => {
            const nomeFantasia = normalizar(p.nome_fantasia || '');
            const razaoSocial = normalizar(p.razao_social || '');
            if (nomeFantasia) {
                pedidosPorCliente.set(nomeFantasia, p);
                const palavras = nomeFantasia.split(/\s+/);
                if (palavras.length >= 2) {
                    pedidosPorCliente.set(palavras.slice(0, 2).join(' '), p);
                }
            }
            if (razaoSocial) {
                pedidosPorCliente.set(razaoSocial, p);
            }
        });
        console.log(`📦 Pedidos em orçamento: ${pedidos.length}`);
        
        // Limpar itens antigos
        console.log('\n🧹 Limpando itens antigos...');
        const pedidoIds = pedidos.map(p => p.id);
        if (pedidoIds.length > 0) {
            const [deleted] = await pool.query(`DELETE FROM pedido_itens WHERE pedido_id IN (?)`, [pedidoIds]);
            console.log(`   Removidos: ${deleted.affectedRows} itens`);
        }
        
        // Estatísticas
        let itensInseridos = 0;
        let pedidosAtualizados = new Set();
        let vendedoresEncontrados = new Map();
        let clientesNaoEncontrados = new Set();
        let erros = 0;
        
        // Processar cada linha
        for (const row of linhasData) {
            const clienteNomeOriginal = (row[0] || '').toString().trim();
            if (!clienteNomeOriginal || clienteNomeOriginal === '' || 
                clienteNomeOriginal.toLowerCase().includes('total')) {
                continue;
            }
            
            // Extrair nome do cliente (remover CNPJ se presente)
            let nomeCliente = clienteNomeOriginal;
            const cnpjMatch = clienteNomeOriginal.match(/^[\d\.\/\-]+\s+(.+)$/);
            if (cnpjMatch) {
                nomeCliente = cnpjMatch[1];
            }
            
            // Dados da linha
            const previsaoFaturamento = row[1];
            const descricaoProduto = (row[2] || '').toString().trim();
            const vendedorNome = (row[3] || '').toString().trim();
            const quantidade = parseFloat(row[4]) || 0;
            const totalMercadoria = parseFloat(row[5]) || 0;
            const desconto = parseFloat(row[6]) || 0;
            const icmsST = parseFloat(row[7]) || 0;
            const frete = parseFloat(row[8]) || 0;
            const ipi = parseFloat(row[11]) || 0;
            const icms = parseFloat(row[13]) || 0;
            const pis = parseFloat(row[14]) || 0;
            const cofins = parseFloat(row[15]) || 0;
            
            // Pular linhas sem quantidade ou valor
            if (quantidade === 0 || totalMercadoria === 0) {
                continue;
            }
            
            // Encontrar pedido do cliente
            const pedido = encontrarPedido(nomeCliente, pedidosPorCliente);
            
            if (!pedido) {
                clientesNaoEncontrados.add(nomeCliente);
                continue;
            }
            
            // Mapear vendedor
            const vendedorKey = vendedorNome.toLowerCase().trim();
            let vendedorId = VENDEDOR_MAP[vendedorKey];
            
            // Se não encontrou exato, tentar parcial
            if (vendedorId === undefined) {
                for (const [key, id] of Object.entries(VENDEDOR_MAP)) {
                    if (vendedorKey.includes(key) || key.includes(vendedorKey)) {
                        vendedorId = id;
                        break;
                    }
                }
            }
            
            // Contar vendedores
            if (vendedorNome) {
                vendedoresEncontrados.set(vendedorNome, (vendedoresEncontrados.get(vendedorNome) || 0) + 1);
            }
            
            // Converter data de previsão
            let dataPrevista = null;
            if (previsaoFaturamento) {
                if (typeof previsaoFaturamento === 'number') {
                    const d = new Date((previsaoFaturamento - 25569) * 86400 * 1000);
                    dataPrevista = d.toISOString().split('T')[0];
                } else if (typeof previsaoFaturamento === 'string' && previsaoFaturamento.includes('/')) {
                    const partes = previsaoFaturamento.split('/');
                    if (partes.length === 3) {
                        dataPrevista = `${partes[2]}-${partes[1].padStart(2,'0')}-${partes[0].padStart(2,'0')}`;
                    }
                }
            }
            
            // Atualizar pedido com vendedor e data
            try {
                const updates = [];
                const params = [];
                
                if (vendedorId) {
                    updates.push('vendedor_id = ?');
                    params.push(vendedorId);
                }
                
                if (dataPrevista) {
                    updates.push('data_prevista = ?');
                    params.push(dataPrevista);
                }
                
                // Atualizar cenário fiscal
                updates.push('cenario_fiscal_id = 1');
                
                if (updates.length > 0) {
                    params.push(pedido.id);
                    await pool.query(
                        `UPDATE pedidos SET ${updates.join(', ')} WHERE id = ?`,
                        params
                    );
                }
                
                // Extrair código do produto da descrição
                let codigoProduto = '';
                let descricaoItem = descricaoProduto;
                
                const match = descricaoProduto.match(/^([A-Z0-9]+)\s*-\s*(.+)$/i);
                if (match) {
                    codigoProduto = match[1].trim();
                    descricaoItem = descricaoProduto; // Manter completo
                }
                
                // Calcular valores
                const precoUnitario = quantidade > 0 ? totalMercadoria / quantidade : 0;
                const icmsPercent = totalMercadoria > 0 ? (icms / totalMercadoria) * 100 : 0;
                const pisPercent = totalMercadoria > 0 ? (pis / totalMercadoria) * 100 : 0;
                const cofinsPercent = totalMercadoria > 0 ? (cofins / totalMercadoria) * 100 : 0;
                
                // Inserir item
                await pool.query(`
                    INSERT INTO pedido_itens (
                        pedido_id, produto_id, codigo, descricao, quantidade,
                        unidade, preco_unitario, desconto, subtotal,
                        icms_percent, icms_value, pis_percent, pis_value,
                        cofins_percent, cofins_value
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    pedido.id,
                    null,
                    codigoProduto,
                    descricaoItem || `Produtos - ${quantidade} un`,
                    quantidade,
                    'UN',
                    precoUnitario,
                    desconto,
                    totalMercadoria,
                    icmsPercent,
                    icms,
                    pisPercent,
                    pis,
                    cofinsPercent,
                    cofins
                ]);
                
                itensInseridos++;
                pedidosAtualizados.add(pedido.id);
                
            } catch (err) {
                console.error(`❌ Erro pedido ${pedido.id}: ${err.message}`);
                erros++;
            }
        }
        
        console.log('\n' + '='.repeat(60));
        console.log('📊 RESUMO DA IMPORTAÇÁO:');
        console.log('='.repeat(60));
        console.log(`✅ Itens inseridos: ${itensInseridos}`);
        console.log(`📦 Pedidos atualizados: ${pedidosAtualizados.size}`);
        console.log(`⚠️ Clientes não encontrados: ${clientesNaoEncontrados.size}`);
        console.log(`❌ Erros: ${erros}`);
        
        console.log('\n👤 VENDEDORES ENCONTRADOS NO EXCEL:');
        for (const [nome, count] of vendedoresEncontrados) {
            const id = VENDEDOR_MAP[nome.toLowerCase().trim()];
            console.log(`  - ${nome}: ${count} pedidos -> ID ${id || 'não mapeado'}`);
        }
        
        if (clientesNaoEncontrados.size > 0 && clientesNaoEncontrados.size <= 10) {
            console.log('\n⚠️ Clientes não encontrados:');
            [...clientesNaoEncontrados].forEach(c => console.log(`  - ${c}`));
        }
        
        // Verificação final
        console.log('\n📋 AMOSTRA DE PEDIDOS ATUALIZADOS:');
        const [amostra] = await pool.query(`
            SELECT p.id, 
                   SUBSTRING(c.nome_fantasia, 1, 25) as cliente,
                   u.nome as vendedor,
                   DATE_FORMAT(p.data_prevista, '%d/%m/%Y') as previsao,
                   COUNT(pi.id) as itens,
                   ROUND(p.valor, 2) as valor
            FROM pedidos p
            JOIN clientes c ON c.id = p.cliente_id
            LEFT JOIN usuarios u ON u.id = p.vendedor_id
            LEFT JOIN pedido_itens pi ON pi.pedido_id = p.id
            WHERE p.status = 'orcamento'
            GROUP BY p.id
            ORDER BY p.id DESC
            LIMIT 15
        `);
        console.table(amostra);
        
        // Total
        const [totais] = await pool.query(`
            SELECT 
                COUNT(DISTINCT p.id) as pedidos,
                COUNT(DISTINCT CASE WHEN p.vendedor_id IS NOT NULL THEN p.id END) as com_vendedor,
                COUNT(DISTINCT CASE WHEN p.data_prevista IS NOT NULL THEN p.id END) as com_previsao,
                COUNT(pi.id) as itens
            FROM pedidos p
            LEFT JOIN pedido_itens pi ON pi.pedido_id = p.id
            WHERE p.status = 'orcamento'
        `);
        console.log('\n📊 TOTAIS FINAIS:');
        console.table(totais);
        
    } finally {
        await pool.end();
    }
}

// Função para normalizar nome
function normalizar(nome) {
    if (!nome) return '';
    return nome
        .toUpperCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\w\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

// Função para encontrar pedido
function encontrarPedido(nomeCliente, mapaPedidos) {
    const nomeNorm = normalizar(nomeCliente);
    
    // Busca direta
    let pedido = mapaPedidos.get(nomeNorm);
    if (pedido) return pedido;
    
    // Busca por primeiras palavras
    const palavras = nomeNorm.split(/\s+/);
    if (palavras.length >= 2) {
        pedido = mapaPedidos.get(palavras.slice(0, 2).join(' '));
        if (pedido) return pedido;
    }
    
    // Busca parcial
    for (const [nome, p] of mapaPedidos) {
        if (nomeNorm.includes(nome) || nome.includes(nomeNorm)) {
            return p;
        }
    }
    
    return null;
}

reimportarPedidos();
