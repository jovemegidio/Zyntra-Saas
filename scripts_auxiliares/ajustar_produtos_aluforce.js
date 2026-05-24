const mysql = require('mysql2/promise');

async function ajustarProdutosAluforce() {
    const c = await mysql.createConnection({
        host: 'interchange.proxy.rlwy.net',
        port: 19396,
        user: 'root',
        password: process.env.RAILWAY_DB_PASSWORD || process.env.DB_PASSWORD || '',
        database: 'railway'
    });

    try {
        console.log('🚀 AJUSTANDO PRODUTOS ALUFORCE CB');
        console.log('='.repeat(60));

        // 1. GERAR SKU PARA PRODUTOS SEM SKU
        console.log('📦 GERANDO SKU PARA PRODUTOS SEM SKU...');

        const [produtosSemSku] = await c.execute(`
            SELECT id, codigo, nome
            FROM produtos
            WHERE sku IS NULL OR sku = ''
        `);

        console.log(`   Produtos sem SKU: ${produtosSemSku.length}`);

        let skuAtualizados = 0;
        for (const produto of produtosSemSku) {
            // Gerar SKU baseado no código do produto
            let sku = '';

            if (produto.codigo) {
                // SKU padrão: SKU-{CODIGO}
                sku = `SKU-${produto.codigo.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()}`;
            } else {
                // Fallback: SKU-PRD{ID}
                sku = `SKU-PRD${produto.id.toString().padStart(6, '0')}`;
            }

            await c.execute('UPDATE produtos SET sku = ? WHERE id = ?', [sku, produto.id]);
            skuAtualizados++;

            if (skuAtualizados % 100 === 0) {
                console.log(`   Progresso: ${skuAtualizados} SKUs gerados...`);
            }
        }

        console.log(`   ✅ ${skuAtualizados} SKUs gerados com sucesso!`);

        // 2. ATUALIZAR CATEGORIA DOS PRODUTOS ALUFORCE CB
        console.log('🏷️  ATUALIZANDO CATEGORIA DOS PRODUTOS ALUFORCE CB...');

        // Produtos ALUFORCE CB
        const [resultAluforce] = await c.execute(`
            UPDATE produtos
            SET categoria = 'ALUFORCE CB',
                tipo_produto = '04 - Produto Acabado'
            WHERE UPPER(nome) LIKE '%ALUFORCE CB%'
        `);
        console.log(`   ✅ ${resultAluforce.affectedRows} produtos marcados como ALUFORCE CB`);

        // Produtos VIMACOM
        const [resultVimacom] = await c.execute(`
            UPDATE produtos
            SET categoria = 'VIMACOM CB',
                tipo_produto = '04 - Produto Acabado'
            WHERE UPPER(nome) LIKE '%VIMACOM CB%'
        `);
        console.log(`   ✅ ${resultVimacom.affectedRows} produtos marcados como VIMACOM CB`);

        // Produtos MATRIX
        const [resultMatrix] = await c.execute(`
            UPDATE produtos
            SET categoria = 'MATRIX',
                tipo_produto = '04 - Produto Acabado'
            WHERE UPPER(nome) LIKE '%MATRIX%'
        `);
        console.log(`   ✅ ${resultMatrix.affectedRows} produtos marcados como MATRIX`);

        // Produtos de Potência
        const [resultPotencia] = await c.execute(`
            UPDATE produtos
            SET categoria = 'CABOS DE POTENCIA'
            WHERE UPPER(nome) LIKE '%POTENCIA%' AND categoria = 'GERAL'
        `);
        console.log(`   ✅ ${resultPotencia.affectedRows} produtos marcados como CABOS DE POTENCIA`);

        // 3. ESTATÍSTICAS FINAIS
        console.log('📊 ESTATÍSTICAS FINAIS');
        console.log('='.repeat(60));

        const [categorias] = await c.execute(`
            SELECT categoria, COUNT(*) as qtd
            FROM produtos
            GROUP BY categoria
            ORDER BY qtd DESC
        `);

        console.log('   Categorias:');
        categorias.forEach(cat => {
            console.log(`     - ${cat.categoria || 'SEM CATEGORIA'}: ${cat.qtd}`);
        });

        // Contar produtos ALUFORCE CB
        const [aluforceCount] = await c.execute(`
            SELECT COUNT(*) as total FROM produtos
            WHERE UPPER(nome) LIKE '%ALUFORCE CB%'
        `);
        console.log(`   Total de produtos ALUFORCE CB: ${aluforceCount[0].total}`);

        // Verificar SKUs
        const [comSku] = await c.execute('SELECT COUNT(*) as total FROM produtos WHERE sku IS NOT NULL AND sku != ""');
        const [semSkuFinal] = await c.execute('SELECT COUNT(*) as total FROM produtos WHERE sku IS NULL OR sku = ""');
        console.log(`   Produtos com SKU: ${comSku[0].total}`);
        console.log(`   Produtos sem SKU: ${semSkuFinal[0].total}`);

        console.log('✅ AJUSTES CONCLUÍDOS COM SUCESSO!');

    } catch (e) {
        console.error('❌ ERRO:', e.message);
    } finally {
        await c.end();
    }
}

ajustarProdutosAluforce();
