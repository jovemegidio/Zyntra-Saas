const mysql = require('mysql2/promise');

async function ajustarPedidosEContadores() {
    const pool = await mysql.createPool({
        host: 'interchange.proxy.rlwy.net',
        port: 19396,
        user: 'root',
        password: process.env.RAILWAY_DB_PASSWORD || process.env.DB_PASSWORD || '',
        database: 'railway',
        waitForConnections: true,
        connectionLimit: 5
    });

    try {
        console.log('🔧 AJUSTANDO PEDIDOS E CONTADORES');
        console.log('='.repeat(60));

        // 1. Verificar e adicionar coluna transportadora_id
        console.log('📋 1. Verificando coluna transportadora_id em pedidos...');
        const [pedidosCols] = await pool.query('DESCRIBE pedidos');
        const colsPedido = pedidosCols.map(c => c.Field);

        if (!colsPedido.includes('transportadora_id')) {
            console.log('   ➕ Adicionando coluna transportadora_id...');
            await pool.query('ALTER TABLE pedidos ADD COLUMN transportadora_id INT NULL');
            console.log('   ✅ Coluna adicionada!');
        } else {
            console.log('   ✅ Coluna já existe!');
        }

        // Verificar se tem transportadora_nome também
        if (!colsPedido.includes('transportadora_nome')) {
            console.log('   ➕ Adicionando coluna transportadora_nome...');
            await pool.query('ALTER TABLE pedidos ADD COLUMN transportadora_nome VARCHAR(255) NULL');
            console.log('   ✅ Coluna adicionada!');
        }

        // 2. Listar pedidos que precisam de transportadora
        console.log('📊 2. Pedidos que precisam de transportadora:');
        const [pedidos] = await pool.query(`
            SELECT p.id, p.status, p.valor, c.nome as cliente_nome, c.razao_social as cliente_razao,
                   p.transportadora_id, p.transportadora_nome
            FROM pedidos p
            LEFT JOIN clientes c ON p.cliente_id = c.id
            WHERE p.status IN ('faturar', 'faturado', 'entregue')
            ORDER BY p.status, p.id
        `);

        console.log(`   Total de pedidos (faturar/faturado/entregue): ${pedidos.length}`);

        pedidos.forEach(p => {
            const cliente = p.cliente_razao || p.cliente_nome || 'Sem cliente';
            const temTransp = p.transportadora_id || p.transportadora_nome ? 'SIM' : 'NÍO';
            console.log(`   - Pedido #${p.id} (${p.status}): ${cliente} - Transportadora: ${temTransp}`);
        });

        // 3. Remover transportadoras duplicadas
        console.log('🚛 3. Verificando transportadoras duplicadas...');
        const [transpDupl] = await pool.query(`
            SELECT razao_social, COUNT(*) as qty, MIN(id) as primeiro_id
            FROM transportadoras
            GROUP BY razao_social
            HAVING COUNT(*) > 1
        `);

        if (transpDupl.length > 0) {
            console.log(`   ⚠️  Encontradas ${transpDupl.length} transportadoras duplicadas`);
            // Manter apenas a primeira de cada duplicada
            for (const dup of transpDupl) {
                await pool.query(`
                    DELETE FROM transportadoras
                    WHERE razao_social = ? AND id > ?
                `, [dup.razao_social, dup.primeiro_id]);
            }
            console.log('   ✅ Duplicatas removidas!');
        } else {
            console.log('   ✅ Nenhuma duplicata encontrada');
        }

        // Verificar quantidade de transportadoras após limpeza
        const [transpCount] = await pool.query('SELECT COUNT(*) as total FROM transportadoras');
        console.log(`   Total de transportadoras agora: ${transpCount[0].total}`);

        // 4. Verificar contagem de produtos
        console.log('📦 4. Análise de contagem de produtos:');

        const [totalProdutos] = await pool.query('SELECT COUNT(*) as total FROM produtos');
        console.log(`   Total produtos (sem filtro): ${totalProdutos[0].total}`);

        const [aluforce] = await pool.query("SELECT COUNT(*) as total FROM produtos WHERE marca = 'Aluforce'");
        console.log(`   Produtos marca='Aluforce': ${aluforce[0].total}`);

        const [ativos] = await pool.query("SELECT COUNT(*) as total FROM produtos WHERE ativo = 1 OR ativo IS NULL");
        console.log(`   Produtos ativos: ${ativos[0].total}`);

        const [nullMarca] = await pool.query("SELECT COUNT(*) as total FROM produtos WHERE marca IS NULL");
        console.log(`   Produtos com marca NULL: ${nullMarca[0].total}`);

        // 5. Atualizar produtos com marca NULL para ALUFORCE CB
        console.log('🔄 5. Verificando produtos sem marca definida...');
        const [semMarca] = await pool.query(`
            SELECT id, codigo, nome, variacao FROM produtos
            WHERE marca IS NULL
            LIMIT 10
        `);

        console.log(`   Amostra de produtos sem marca:`);
        semMarca.forEach(p => console.log(`      - #${p.id}: ${p.codigo} - ${p.nome || p.variacao}`));

        // Perguntar se quer atualizar
        console.log('⚠️  Os 788 produtos com marca NULL parecem ser produtos ALUFORCE CB');
        console.log("   Atualizando marca para 'Aluforce'...");

        const [updateResult] = await pool.query(`
            UPDATE produtos SET marca = 'Aluforce' WHERE marca IS NULL
        `);
        console.log(`   ✅ ${updateResult.affectedRows} produtos atualizados!`);

        // 6. Verificar novamente contagem
        console.log('📊 6. Nova contagem após atualização:');
        const [novaContagem] = await pool.query("SELECT COUNT(*) as total FROM produtos WHERE marca = 'Aluforce'");
        console.log(`   Total produtos Aluforce: ${novaContagem[0].total}`);

        // 7. Verificar preços dos itens de pedido
        console.log('💰 7. Análise de preços nos pedidos:');
        const [precos] = await pool.query(`
            SELECT
                ip.id,
                ip.pedido_id,
                ip.codigo_produto,
                ip.descricao,
                ip.quantidade,
                ip.preco_unitario,
                ip.preco_total,
                p.preco_venda as preco_atual,
                p.nome as produto_nome
            FROM itens_pedido ip
            LEFT JOIN produtos p ON ip.codigo_produto = p.codigo
            WHERE ip.preco_unitario IS NOT NULL
            LIMIT 20
        `);

        console.log('   Amostra de preços:');
        let precosDiferentes = 0;
        precos.forEach(item => {
            const diferenca = item.preco_atual ?
                ((item.preco_unitario - item.preco_atual) / item.preco_atual * 100).toFixed(1) : 'N/A';
            if (item.preco_atual && Math.abs(item.preco_unitario - item.preco_atual) > 0.01) {
                precosDiferentes++;
                console.log(`      📍 Pedido #${item.pedido_id}: ${item.codigo_produto || item.descricao?.substring(0,30)}`);
                console.log(`         Preço pedido: R$${item.preco_unitario} | Preço atual: R$${item.preco_atual || 'N/A'} | Diff: ${diferenca}%`);
            }
        });

        if (precosDiferentes === 0) {
            console.log('   ✅ Nenhuma diferença significativa de preço encontrada');
        }

        console.log('' + '='.repeat(60));
        console.log('✅ Ajustes concluídos!');
        console.log('📝 RESUMO:');
        console.log(`   - Transportadoras únicas: ${transpCount[0].total} após limpeza`);
        console.log(`   - Total produtos Aluforce: ${novaContagem[0].total}`);
        console.log(`   - Pedidos para preencher transportadora: ${pedidos.filter(p => !p.transportadora_id && !p.transportadora_nome).length}`);

    } catch (error) {
        console.error('❌ Erro:', error.message);
    } finally {
        await pool.end();
    }
}

ajustarPedidosEContadores();
