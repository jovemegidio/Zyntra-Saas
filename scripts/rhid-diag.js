const axios = require('axios');
const mysql = require('mysql2/promise');

(async () => {
    try {
        const pool = mysql.createPool({
            host: 'localhost', user: 'aluforce', password: 'Aluforce2026VpsDB', database: 'aluforce_vendas'
        });
        const [rows] = await pool.query(
            'SELECT rhid_email, rhid_password, rhid_enabled FROM controlid_config WHERE ativo = TRUE ORDER BY id DESC LIMIT 1'
        );
        if (!rows.length) { console.log('NO CONFIG IN DB'); process.exit(0); }

        const email = rows[0].rhid_email;
        const pw = rows[0].rhid_password ? Buffer.from(rows[0].rhid_password, 'base64').toString() : '';
        console.log('email:', email);
        console.log('enabled:', rows[0].rhid_enabled);
        console.log('pw_length:', pw.length, '| pw_start:', pw.substring(0, 3));

        const resp = await axios.post('https://www.rhid.com.br/v2/login.svc/', {
            email: email,
            password: pw
        }, {
            timeout: 20000,
            headers: { 'Content-Type': 'application/json' },
            validateStatus: () => true
        });

        console.log('HTTP status:', resp.status);
        console.log('Response:', JSON.stringify(resp.data).substring(0, 500));
        await pool.end();
    } catch (e) {
        console.log('FATAL ERROR:', e.message);
    }
})();
