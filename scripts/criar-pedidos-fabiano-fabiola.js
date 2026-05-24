const mysql = require('mysql2/promise');

async function criarPedidosVendedores() {
    const conn = await mysql.createConnection({
        host: 'interchange.proxy.rlwy.net',
        port: 19396,
        user: 'root',
        password: process.env.DB_PASSWORD || '',
        database: 'railway'
    });
    
    console.log('=== CRIANDO PEDIDOS PARA FABIANO E FABÍOLA ===\n');
    
    // Buscar empresa_id padrão
    const [empresas] = await conn.query('SELECT id FROM empresas LIMIT 1');
    const empresaId = empresas[0]?.id || 1;
    console.log(`Usando empresa_id: ${empresaId}\n`);
    
    // Buscar alguns clientes existentes
    const [clientes] = await conn.query('SELECT id, nome FROM clientes LIMIT 10');
    const clienteIds = clientes.map(c => c.id);
    
    // Pedidos para Fabiano (ID: 12)
    const pedidosFabiano = [
        { valor: 15000.00, status: 'faturado', descricao: 'Venda de materiais elétricos' },
        { valor: 28500.00, status: 'faturado', descricao: 'Fornecimento industrial' },
        { valor: 42000.00, status: 'faturado', descricao: 'Projeto completo instalação' },
        { valor: 8900.00, status: 'orcamento', descricao: 'Orçamento cabos e fios' },
        { valor: 35000.00, status: 'analise-credito', descricao: 'Pedido grande cliente novo' },
    ];
    
    // Pedidos para Fabíola (ID: 13)
    const pedidosFabiola = [
        { valor: 22000.00, status: 'faturado', descricao: 'Venda equipamentos iluminação' },
        { valor: 18500.00, status: 'faturado', descricao: 'Material para obra comercial' },
        { valor: 55000.00, status: 'faturado', descricao: 'Contrato manutenção anual' },
        { valor: 12300.00, status: 'orcamento', descricao: 'Orçamento retrofit LED' },
        { valor: 31000.00, status: 'aprovado', descricao: 'Pedido aprovado cliente fiel' },
    ];
    
    let criados = 0;
    let idx = 0;
    
    // Criar pedidos para Fabiano
    console.log('📦 Criando pedidos para Fabiano Marques (ID: 12)...');
    for (const pedido of pedidosFabiano) {
        try {
            const clienteId = clienteIds[idx % clienteIds.length] || 1;
            await conn.query(`
                INSERT INTO pedidos (empresa_id, vendedor_id, cliente_id, valor, status, descricao, observacao, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
            `, [empresaId, 12, clienteId, pedido.valor, pedido.status, pedido.descricao, `Pedido criado automaticamente - ${pedido.descricao}`]);
            console.log(`   ✅ R$ ${pedido.valor.toLocaleString('pt-BR')} - ${pedido.status}`);
            criados++;
            idx++;
        } catch (err) {
            console.error(`   ❌ Erro: ${err.message}`);
        }
    }
    
    // Criar pedidos para Fabíola
    console.log('\n📦 Criando pedidos para Fabíola Souza (ID: 13)...');
    for (const pedido of pedidosFabiola) {
        try {
            const clienteId = clienteIds[idx % clienteIds.length] || 1;
            await conn.query(`
                INSERT INTO pedidos (empresa_id, vendedor_id, cliente_id, valor, status, descricao, observacao, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
            `, [empresaId, 13, clienteId, pedido.valor, pedido.status, pedido.descricao, `Pedido criado automaticamente - ${pedido.descricao}`]);
            console.log(`   ✅ R$ ${pedido.valor.toLocaleString('pt-BR')} - ${pedido.status}`);
            criados++;
            idx++;
        } catch (err) {
            console.error(`   ❌ Erro: ${err.message}`);
        }
    }
    
    console.log(`\n✅ ${criados} pedidos criados com sucesso!`);
    
    // Mostrar resumo
    const [resumo] = await conn.query(`
        SELECT 
            u.nome as vendedor,
            COUNT(p.id) as total_pedidos,
            SUM(CASE WHEN p.status = 'faturado' THEN p.valor ELSE 0 END) as valor_faturado
        FROM usuarios u
        LEFT JOIN pedidos p ON p.vendedor_id = u.id
        WHERE u.id IN (12, 13)
        GROUP BY u.id, u.nome
    `);
    
    console.log('\n=== RESUMO ===');
    resumo.forEach(r => {
        console.log(`${r.vendedor}: ${r.total_pedidos} pedidos, R$ ${parseFloat(r.valor_faturado || 0).toLocaleString('pt-BR')} faturado`);
    });
    
    await conn.end();
}

criarPedidosVendedores().catch(console.error);
