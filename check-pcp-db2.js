require('dotenv').config();
const mysql = require('mysql2/promise');
(async () => {
    const pool = await mysql.createPool({
        host: 'localhost', user: 'aluforce', 
        password: 'CHANGE_ME_DB_PASSWORD', database: 'aluforce_vendas'
    });
    
    // Check funcionarios table
    try {
        const [rows] = await pool.query("SHOW TABLES LIKE 'funcionarios'");
        console.log('funcionarios table exists:', rows.length > 0);
        if (rows.length > 0) {
            const [cols] = await pool.query('DESCRIBE funcionarios');
            cols.forEach(c => console.log('  ' + c.Field + ' (' + c.Type + ')'));
        }
    } catch(e) { console.log('ERROR funcionarios:', e.message); }

    // Check what the actual health error is
    try {
        const pkg = require('./package.json');
        console.log('\npackage.json version:', pkg.version);
    } catch(e) { console.log('\npackage.json error:', e.message); }

    // Check routes/package.json
    try {
        const pkg = require('./routes/package.json');
        console.log('routes/package.json version:', pkg.version);
    } catch(e) { console.log('routes/package.json error:', e.message); }
    
    await pool.end();
})();
