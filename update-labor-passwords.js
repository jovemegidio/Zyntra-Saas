const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

async function run() {
    const pool = mysql.createPool({
        host: 'localhost',
        user: 'aluforce',
        password: 'Aluforce2026VpsDB'
    });

    const hash = await bcrypt.hash('alu0103', 10);
    console.log('Generated hash:', hash);

    for (const db of ['labor_eletric_vendas', 'labor_energy_vendas']) {
        const [r] = await pool.query(
            `UPDATE ${db}.usuarios SET senha_hash=?, password_hash=?, login_attempts=0, locked_until=NULL WHERE ativo=1`,
            [hash, hash]
        );
        console.log(`${db}: ${r.affectedRows} rows updated`);
    }

    await pool.end();
    console.log('Done!');
}

run().catch(e => { console.error(e); process.exit(1); });
