const db = require('./database');
(async () => {
    const c = await db.getDatabase().getConnection();
    try {
        const [r1] = await c.query("SHOW TABLES LIKE '%requisic%'");
        console.log('=== TABELAS REQUISICOES ===');
        r1.forEach(row => console.log(Object.values(row)[0]));

        const [r2] = await c.query("SHOW TABLES LIKE '%cotac%'");
        console.log('=== TABELAS COTACOES ===');
        r2.forEach(row => console.log(Object.values(row)[0]));

        const [r3] = await c.query("SHOW TABLES LIKE '%centro%'");
        console.log('=== TABELAS CENTROS ===');
        r3.forEach(row => console.log(Object.values(row)[0]));

        const [r4] = await c.query("SHOW TABLES LIKE '%propost%'");
        console.log('=== TABELAS PROPOSTAS ===');
        r4.forEach(row => console.log(Object.values(row)[0]));

        // Check columns of requisicoes_compras
        try {
            const [cols] = await c.query("DESCRIBE requisicoes_compras");
            console.log('\n=== COLUNAS requisicoes_compras ===');
            cols.forEach(col => console.log(`${col.Field} | ${col.Type} | ${col.Null} | ${col.Default}`));
        } catch(e) { console.log('requisicoes_compras NAO EXISTE:', e.message); }

        // Check columns of cotacoes
        try {
            const [cols] = await c.query("DESCRIBE cotacoes");
            console.log('\n=== COLUNAS cotacoes ===');
            cols.forEach(col => console.log(`${col.Field} | ${col.Type} | ${col.Null} | ${col.Default}`));
        } catch(e) { console.log('cotacoes NAO EXISTE:', e.message); }

        // Check columns of propostas_cotacao
        try {
            const [cols] = await c.query("DESCRIBE propostas_cotacao");
            console.log('\n=== COLUNAS propostas_cotacao ===');
            cols.forEach(col => console.log(`${col.Field} | ${col.Type} | ${col.Null} | ${col.Default}`));
        } catch(e) { console.log('propostas_cotacao NAO EXISTE:', e.message); }

        // Check centros_custo
        try {
            const [cols] = await c.query("DESCRIBE centros_custo");
            console.log('\n=== COLUNAS centros_custo ===');
            cols.forEach(col => console.log(`${col.Field} | ${col.Type} | ${col.Null} | ${col.Default}`));
            const [count] = await c.query("SELECT COUNT(*) as n FROM centros_custo");
            console.log('Total registros:', count[0].n);
        } catch(e) { console.log('centros_custo NAO EXISTE:', e.message); }

    } finally {
        c.release();
        process.exit(0);
    }
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
