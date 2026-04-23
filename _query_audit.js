const m = require('mysql2/promise');
(async () => {
    const c = await m.createConnection({
        host: 'localhost', user: 'aluforce',
        password: 'Aluforce2026VpsDB', database: 'aluforce_vendas'
    });
    const [r] = await c.execute(
        'SELECT acao, modulo, descricao FROM auditoria_logs ORDER BY created_at DESC LIMIT 8'
    );
    r.forEach(x => console.log(JSON.stringify(x)));
    const [r2] = await c.execute(
        'SELECT action, resource_type, resource_id, meta FROM audit_logs ORDER BY created_at DESC LIMIT 8'
    );
    console.log('--- audit_logs ---');
    r2.forEach(x => console.log(JSON.stringify(x)));
    await c.end();
})();
