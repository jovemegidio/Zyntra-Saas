const mysql = require('mysql2/promise');

async function syncVendedoresParaRailway() {
    const railway = await mysql.createConnection({
        host: 'interchange.proxy.rlwy.net',
        port: 19396,
        user: 'root',
        password: 'iiilOZutDOnPCwxgiTKeMuEaIzSwplcu',
        database: 'railway'
    });

    const local = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: process.env.DB_PASSWORD || 'CHANGE_ME',
        database: 'aluforce_vendas'
    });

    console.log('🔄 SINCRONIZANDO VENDEDORES PARA O RAILWAY...\n');

    // Buscar pedidos com vendedores no local
    const [pedidosLocal] = await local.query(`
        SELECT id, vendedor_id, data_prevista, cenario_fiscal_id
        FROM pedidos
        WHERE status = 'orcamento'
    `);
    console.log(`📦 Pedidos em orçamento no local: ${pedidosLocal.length}`);

    let atualizados = 0;
    let erros = 0;

    for (const pedido of pedidosLocal) {
        try {
            await railway.query(`
                UPDATE pedidos 
                SET vendedor_id = ?,
                    data_prevista = ?,
                    cenario_fiscal_id = ?
                WHERE id = ?
            `, [
                pedido.vendedor_id,
                pedido.data_prevista,
                pedido.cenario_fiscal_id,
                pedido.id
            ]);
            atualizados++;
        } catch (err) {
            console.error(`❌ Erro pedido ${pedido.id}:`, err.message);
            erros++;
        }
    }

    console.log(`\n✅ Pedidos atualizados: ${atualizados}`);
    console.log(`❌ Erros: ${erros}`);

    // Verificar resultado
    console.log('\n' + '='.repeat(60));
    console.log('📊 VERIFICAÇÁO PÓS-SYNC');
    console.log('='.repeat(60));

    const [amostra] = await railway.query(`
        SELECT p.id, p.vendedor_id, u.nome as vendedor
        FROM pedidos p
        LEFT JOIN usuarios u ON p.vendedor_id = u.id
        WHERE p.status = 'orcamento'
        ORDER BY p.id DESC
        LIMIT 15
    `);
    console.log('\n📦 VENDEDORES NO RAILWAY AGORA:');
    console.table(amostra);

    await railway.end();
    await local.end();
}

syncVendedoresParaRailway();
