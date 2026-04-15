const pool = require('./db');
(async () => {
    const [cols] = await pool.query('SHOW COLUMNS FROM clientes');
    cols.forEach(c => console.log(c.Field + ' | ' + c.Type));
    process.exit();
})();
