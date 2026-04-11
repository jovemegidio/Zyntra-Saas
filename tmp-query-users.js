const m = require('mysql2/promise');
(async () => {
    const c = await m.createPool({ host: 'localhost', user: 'aluforce', password: 'Aluforce2026VpsDB', database: 'aluforce_vendas' });
    const [r] = await c.query('SELECT id, email, nome FROM usuarios_pcp LIMIT 5');
    console.log(JSON.stringify(r, null, 2));
    await c.end();
})();
