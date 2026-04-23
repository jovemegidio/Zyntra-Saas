const m = require('mysql2/promise');
(async () => {
    const c = await m.createConnection({
        host: 'localhost', user: 'aluforce',
        password: 'Aluforce2026VpsDB', database: 'aluforce_vendas'
    });
    const [r] = await c.execute(
        'SELECT id, nome, email, role, areas, ativo FROM usuarios WHERE nome LIKE ? OR nome LIKE ?',
        ['%Lorena%', '%arcia%']
    );
    r.forEach(u => console.log(JSON.stringify(u)));
    await c.end();
})();
