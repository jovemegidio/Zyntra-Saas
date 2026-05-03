const mysql = require('mysql2/promise');
(async () => {
  const c = await mysql.createConnection({
    host: 'localhost', user: 'aluforce',
    password: 'Aluforce2026VpsDB', database: 'aluforce_vendas'
  });
  const areas = JSON.stringify(['vendas', 'rh']);
  const [r] = await c.query(
    'UPDATE usuarios SET areas = ? WHERE email = ?',
    [areas, 'representantes@aluforce.ind.br']
  );
  const [rows] = await c.query(
    'SELECT id, nome, email, areas FROM usuarios WHERE email = ?',
    ['representantes@aluforce.ind.br']
  );
  console.log('Updated rows:', r.affectedRows);
  console.log('Record:', JSON.stringify(rows[0]));
  await c.end();
})();
