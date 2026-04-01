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

        // Step 1: Login
        console.log('=== Step 1: Login ===');
        const loginResp = await axios.post('https://www.rhid.com.br/v2/login.svc/', {
            email, password: pw
        }, { timeout: 20000, headers: { 'Content-Type': 'application/json' }, validateStatus: () => true });
        console.log('Status:', loginResp.status);
        if (loginResp.status !== 200 || !loginResp.data.accessToken) {
            console.log('Login FAILED:', JSON.stringify(loginResp.data).substring(0, 200));
            process.exit(0);
        }
        const token = loginResp.data.accessToken;
        console.log('Token OK, length:', token.length);

        const headers = { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' };

        // Step 2: Get devices
        console.log('\n=== Step 2: GET devices ===');
        const devResp = await axios.get('https://www.rhid.com.br/v2/customerdb/device.svc/a', {
            headers, timeout: 15000, validateStatus: () => true
        });
        console.log('Devices status:', devResp.status);
        console.log('Devices response:', JSON.stringify(devResp.data).substring(0, 300));

        // Step 3: Get persons
        console.log('\n=== Step 3: GET persons ===');
        const persResp = await axios.get('https://www.rhid.com.br/v2/customerdb/person.svc/a', {
            headers, timeout: 25000, validateStatus: () => true
        });
        console.log('Persons status:', persResp.status);
        if (Array.isArray(persResp.data)) {
            console.log('Persons count:', persResp.data.length);
        } else {
            console.log('Persons response:', JSON.stringify(persResp.data).substring(0, 300));
        }

        // Step 4: Test with WRONG credentials (simulate user entering wrong pw)
        console.log('\n=== Step 4: Login with WRONG credentials ===');
        const wrongResp = await axios.post('https://www.rhid.com.br/v2/login.svc/', {
            email, password: 'wrongpassword123'
        }, { timeout: 10000, headers: { 'Content-Type': 'application/json' }, validateStatus: () => true });
        console.log('Wrong creds status:', wrongResp.status);
        console.log('Wrong creds response:', JSON.stringify(wrongResp.data).substring(0, 200));

        await pool.end();
    } catch (e) {
        console.log('FATAL ERROR:', e.message);
    }
})();
