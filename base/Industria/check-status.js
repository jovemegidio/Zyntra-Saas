require('dotenv').config();
const m = require('mysql2/promise');
(async () => {
    const p = await m.createPool({host:'localhost',user:'aluforce',password:'Aluforce2026VpsDB',database:'aluforce_vendas'});
    const [r] = await p.query('SELECT DISTINCT status, COUNT(*) as cnt FROM ordens_producao GROUP BY status');
    console.log('Status values:', JSON.stringify(r));
    const [c] = await p.query('SELECT COUNT(*) as total FROM ordens_producao');
    console.log('Total rows:', c[0].total);
    await p.end();
})();
