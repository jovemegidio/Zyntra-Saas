/**
 * Script completo: Sincronizar clientes + pedidos do Railway para Local
 * e importar os itens do Excel
 */

require('dotenv').config();
const XLSX = require('xlsx');
const mysql = require('mysql2/promise');

const railwayConfig = {
    host: 'interchange.proxy.rlwy.net',
    port: 19396,
    user: 'root',
    password: 'iiilOZutDOnPCwxgiTKeMuEaIzSwplcu',
    database: 'railway',
    charset: 'utf8mb4'
};

const localConfig = {
    host: 'localhost',
    user: 'root',
    password: process.env.DB_PASSWORD || 'CHANGE_ME',
    database: 'aluforce_vendas',
    charset: 'utf8mb4'
};

async function sincronizarClientes() {
    const railway = await mysql.createConnection(railwayConfig);
    const local = await mysql.createConnection(localConfig);
    
    try {
        console.log('👥 Sincronizando CLIENTES do Railway para Local...\n');
        
        // Buscar clientes do Railway que não existem no local
        const [clientesRailway] = await railway.query(`
            SELECT * FROM clientes WHERE id >= 3437
        `);
        console.log(`Clientes novos no Railway: ${clientesRailway.length}`);
        
        const [clientesLocal] = await local.query(`SELECT id FROM clientes`);
        const idsLocais = new Set(clientesLocal.map(c => c.id));
        
        let inseridos = 0;
        
        for (const cliente of clientesRailway) {
            if (!idsLocais.has(cliente.id)) {
                const nome = cliente.nome_fantasia || cliente.razao_social || 'Cliente';
                await local.query(`
                    INSERT INTO clientes (
                        id, nome, razao_social, nome_fantasia, cnpj_cpf, 
                        telefone, email, endereco, cidade, estado, cep, empresa_id
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    cliente.id,
                    nome,
                    cliente.razao_social,
                    cliente.nome_fantasia,
                    cliente.cnpj_cpf,
                    cliente.telefone,
                    cliente.email,
                    cliente.endereco,
                    cliente.cidade,
                    cliente.estado,
                    cliente.cep,
                    1  // empresa_id padrão
                ]);
                inseridos++;
                console.log(`  + ${cliente.nome_fantasia || cliente.razao_social}`);
            }
        }
        
        console.log(`\n✅ Clientes inseridos: ${inseridos}`);
        
    } finally {
        await railway.end();
        await local.end();
    }
}

async function sincronizarPedidos() {
    const railway = await mysql.createConnection(railwayConfig);
    const local = await mysql.createConnection(localConfig);
    
    try {
        console.log('\n\n🚀 Sincronizando PEDIDOS do Railway para Local...\n');
        
        // Buscar pedidos do Railway
        const [pedidosRailway] = await railway.query(`SELECT * FROM pedidos`);
        console.log(`📦 Pedidos no Railway: ${pedidosRailway.length}`);
        
        // Buscar pedidos locais
        const [pedidosLocal] = await local.query(`SELECT id FROM pedidos`);
        const idsLocais = new Set(pedidosLocal.map(p => p.id));
        console.log(`📦 Pedidos no Local: ${pedidosLocal.length}`);
        
        let inseridos = 0;
        let atualizados = 0;
        let erros = 0;
        
        for (const pedido of pedidosRailway) {
            try {
                if (idsLocais.has(pedido.id)) {
                    // Atualizar
                    await local.query(`
                        UPDATE pedidos SET 
                            omie_codigo_pedido = ?,
                            omie_numero_pedido = ?,
                            valor = ?,
                            descricao = ?,
                            status = ?,
                            cliente_id = ?,
                            vendedor_id = ?,
                            empresa_id = ?,
                            frete = ?,
                            observacao = ?,
                            total_icms = ?,
                            total_pis = ?,
                            total_cofins = ?,
                            total_ipi = ?
                        WHERE id = ?
                    `, [
                        pedido.omie_codigo_pedido,
                        pedido.omie_numero_pedido,
                        pedido.valor,
                        pedido.descricao,
                        pedido.status,
                        pedido.cliente_id,
                        pedido.vendedor_id,
                        pedido.empresa_id,
                        pedido.frete,
                        pedido.observacao,
                        pedido.total_icms,
                        pedido.total_pis,
                        pedido.total_cofins,
                        pedido.total_ipi,
                        pedido.id
                    ]);
                    atualizados++;
                } else {
                    // Inserir
                    await local.query(`
                        INSERT INTO pedidos (
                            id, omie_codigo_pedido, omie_numero_pedido, valor, descricao, 
                            status, cliente_id, vendedor_id, empresa_id, frete, observacao,
                            total_icms, total_pis, total_cofins, total_ipi, created_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `, [
                        pedido.id,
                        pedido.omie_codigo_pedido,
                        pedido.omie_numero_pedido,
                        pedido.valor,
                        pedido.descricao,
                        pedido.status,
                        pedido.cliente_id,
                        pedido.vendedor_id,
                        pedido.empresa_id,
                        pedido.frete,
                        pedido.observacao,
                        pedido.total_icms,
                        pedido.total_pis,
                        pedido.total_cofins,
                        pedido.total_ipi,
                        pedido.created_at
                    ]);
                    inseridos++;
                }
            } catch (err) {
                console.error(`❌ Erro pedido ${pedido.id}: ${err.message}`);
                erros++;
            }
        }
        
        console.log(`\n✅ Pedidos inseridos: ${inseridos}`);
        console.log(`✅ Pedidos atualizados: ${atualizados}`);
        console.log(`❌ Erros: ${erros}`);
        
        // Verificar resultado
        const [verificar] = await local.query(`SELECT status, COUNT(*) as total FROM pedidos GROUP BY status`);
        console.log('\n📊 Status dos pedidos após sincronização:');
        console.table(verificar);
        
    } finally {
        await railway.end();
        await local.end();
    }
}

async function importarItens() {
    const local = await mysql.createPool(localConfig);
    
    try {
        console.log('\n\n🚀 Iniciando importação de ITENS dos pedidos...\n');
        
        // Ler arquivo Excel
        const filePath = 'ordens-emitidas/Pedidos/1316 Pedidos2.xlsx';
        const workbook = XLSX.readFile(filePath);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
        
        // Dados começam na linha 6 (índice 6)
        const linhasData = data.slice(6);
        console.log(`📊 Linhas no Excel: ${linhasData.length}`);
        
        // Buscar todos os pedidos em orçamento
        const [pedidos] = await local.query(`
            SELECT p.id, p.cliente_id, p.valor, p.status, c.nome_fantasia, c.razao_social
            FROM pedidos p
            JOIN clientes c ON c.id = p.cliente_id
            WHERE p.status = 'orcamento'
        `);
        console.log(`📦 Pedidos em orçamento: ${pedidos.length}`);
        
        // Mapa de pedidos por nome do cliente
        const pedidosPorCliente = new Map();
        pedidos.forEach(p => {
            const nomeFantasia = (p.nome_fantasia || '').toUpperCase().trim();
            const razaoSocial = (p.razao_social || '').toUpperCase().trim();
            if (nomeFantasia) pedidosPorCliente.set(nomeFantasia, p);
            if (razaoSocial) pedidosPorCliente.set(razaoSocial, p);
        });
        
        // Buscar produtos
        const [produtos] = await local.query(`SELECT id, codigo, descricao FROM produtos`);
        const produtosPorCodigo = new Map();
        const produtosPorDescricao = new Map();
        produtos.forEach(p => {
            if (p.codigo) produtosPorCodigo.set(p.codigo.toUpperCase().trim(), p);
            if (p.descricao) produtosPorDescricao.set(p.descricao.toUpperCase().trim(), p);
        });
        console.log(`🏷️ Produtos no banco: ${produtos.length}`);
        
        // Limpar itens existentes dos pedidos em orçamento
        console.log('\n🧹 Limpando itens antigos dos pedidos em orçamento...');
        const pedidoIds = pedidos.map(p => p.id);
        if (pedidoIds.length > 0) {
            const [deleted] = await local.query(`DELETE FROM pedido_itens WHERE pedido_id IN (?)`, [pedidoIds]);
            console.log(`   Removidos: ${deleted.affectedRows} itens`);
        }
        
        let itensInseridos = 0;
        let pedidosProcessados = new Set();
        let clientesNaoEncontrados = new Set();
        let erros = 0;
        
        for (const row of linhasData) {
            const clienteNomeOriginal = (row[0] || '').toString().trim();
            if (!clienteNomeOriginal || clienteNomeOriginal === '' || 
                clienteNomeOriginal.toLowerCase().includes('total')) {
                continue;
            }
            
            // Extrair nome do cliente
            let nomeCliente = clienteNomeOriginal;
            const cnpjMatch = clienteNomeOriginal.match(/^[\d\.\/\-]+\s+(.+)$/);
            if (cnpjMatch) {
                nomeCliente = cnpjMatch[1];
            }
            
            // Dados da linha
            const codigoProduto = (row[2] || '').toString().trim();
            const descricaoProduto = (row[3] || row[2] || '').toString().trim();
            const quantidade = parseFloat(row[5]) || 0;
            const totalMercadoria = parseFloat(row[6]) || 0;
            const desconto = parseFloat(row[7]) || 0;
            const icms = parseFloat(row[14]) || 0;
            const pis = parseFloat(row[15]) || 0;
            const cofins = parseFloat(row[16]) || 0;
            
            if (!descricaoProduto || quantidade === 0) continue;
            
            // Encontrar pedido do cliente
            let pedido = pedidosPorCliente.get(nomeCliente.toUpperCase());
            
            // Busca parcial
            if (!pedido) {
                for (const [nome, p] of pedidosPorCliente) {
                    if (nome.includes(nomeCliente.toUpperCase()) || 
                        nomeCliente.toUpperCase().includes(nome)) {
                        pedido = p;
                        break;
                    }
                }
            }
            
            if (!pedido) {
                clientesNaoEncontrados.add(nomeCliente);
                continue;
            }
            
            // Tentar encontrar produto
            let produto = null;
            if (codigoProduto) {
                produto = produtosPorCodigo.get(codigoProduto.toUpperCase());
            }
            if (!produto && descricaoProduto) {
                for (const [desc, p] of produtosPorDescricao) {
                    if (desc.includes(descricaoProduto.toUpperCase().substring(0, 15)) || 
                        descricaoProduto.toUpperCase().includes(desc.substring(0, 15))) {
                        produto = p;
                        break;
                    }
                }
            }
            
            const precoUnitario = quantidade > 0 ? totalMercadoria / quantidade : 0;
            const subtotal = totalMercadoria;
            
            const icmsPercent = totalMercadoria > 0 ? (icms / totalMercadoria) * 100 : 0;
            const pisPercent = totalMercadoria > 0 ? (pis / totalMercadoria) * 100 : 0;
            const cofinsPercent = totalMercadoria > 0 ? (cofins / totalMercadoria) * 100 : 0;
            
            try {
                await local.query(`
                    INSERT INTO pedido_itens (
                        pedido_id, produto_id, codigo, descricao, quantidade,
                        unidade, preco_unitario, desconto, subtotal,
                        icms_percent, icms_value, pis_percent, pis_value,
                        cofins_percent, cofins_value
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    pedido.id,
                    produto ? produto.id : null,
                    codigoProduto || (produto ? produto.codigo : ''),
                    descricaoProduto,
                    quantidade,
                    'UN',
                    precoUnitario,
                    desconto,
                    subtotal,
                    icmsPercent,
                    icms,
                    pisPercent,
                    pis,
                    cofinsPercent,
                    cofins
                ]);
                
                itensInseridos++;
                pedidosProcessados.add(pedido.id);
            } catch (err) {
                console.error(`❌ Erro: ${err.message}`);
                erros++;
            }
        }
        
        console.log('\n' + '='.repeat(60));
        console.log('📊 RESUMO DA IMPORTAÇÁO DE ITENS:');
        console.log('='.repeat(60));
        console.log(`✅ Itens inseridos: ${itensInseridos}`);
        console.log(`📦 Pedidos com itens: ${pedidosProcessados.size}`);
        console.log(`⚠️ Clientes não encontrados: ${clientesNaoEncontrados.size}`);
        console.log(`❌ Erros: ${erros}`);
        
        if (clientesNaoEncontrados.size > 0 && clientesNaoEncontrados.size <= 20) {
            console.log('\nClientes não encontrados:');
            [...clientesNaoEncontrados].forEach(c => console.log(`  - ${c}`));
        }
        
        // Verificação final
        console.log('\n📦 Verificação - Pedidos com itens (amostra):');
        const [verificacao] = await local.query(`
            SELECT p.id, 
                   SUBSTRING(c.nome_fantasia, 1, 30) as cliente,
                   p.valor as valor_pedido,
                   COUNT(pi.id) as qtd_itens,
                   ROUND(COALESCE(SUM(pi.subtotal), 0), 2) as total_itens
            FROM pedidos p
            JOIN clientes c ON c.id = p.cliente_id
            LEFT JOIN pedido_itens pi ON pi.pedido_id = p.id
            WHERE p.status = 'orcamento'
            GROUP BY p.id
            HAVING qtd_itens > 0
            ORDER BY qtd_itens DESC
            LIMIT 15
        `);
        console.table(verificacao);
        
        // Total de itens
        const [totalItens] = await local.query(`SELECT COUNT(*) as total FROM pedido_itens`);
        console.log(`\n📊 Total de itens na tabela pedido_itens: ${totalItens[0].total}`);
        
    } finally {
        await local.end();
    }
}

async function main() {
    await sincronizarClientes();
    await sincronizarPedidos();
    await importarItens();
}

main();
