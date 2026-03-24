/**
 * Test RHiD API - more endpoint patterns and v1 API
 */
const axios = require('axios');
const mysql = require('mysql2/promise');

async function main() {
    const pool = mysql.createPool({
        host: 'localhost', user: 'aluforce', password: 'Aluforce2026VpsDB', database: 'aluforce_vendas'
    });

    const [rows] = await pool.query('SELECT rhid_email, rhid_password FROM controlid_config WHERE ativo = TRUE AND rhid_enabled = TRUE LIMIT 1');
    const email = rows[0].rhid_email;
    const password = Buffer.from(rows[0].rhid_password, 'base64').toString();

    const resp = await axios.post('https://www.rhid.com.br/v2/login.svc/', { email, password }, { timeout: 15000, headers: { 'Content-Type': 'application/json' } });
    const token = resp.data.accessToken;
    const headers = { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' };

    // Decode JWT to see permissions/scopes
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    console.log('JWT Claims:', JSON.stringify(payload, null, 2));

    // Try various base URLs and patterns
    const tests = [
        // v2 base - person CRUD
        { m: 'POST', u: 'https://www.rhid.com.br/v2/customerdb/person.svc/', d: { name: 'TEST', pis: '00000000000' } },
        // Try without trailing slash
        { m: 'PUT', u: 'https://www.rhid.com.br/v2/customerdb/person.svc', d: { id: 2, name: 'TEST' } },
        // v1 API
        { m: 'GET', u: 'https://www.rhid.com.br/v1/customerdb/person.svc/a', d: null },
        // API without version
        { m: 'GET', u: 'https://www.rhid.com.br/customerdb/person.svc/a', d: null },
        // Try /api/
        { m: 'GET', u: 'https://www.rhid.com.br/api/customerdb/person/a', d: null },
        // Try different service pattern
        { m: 'POST', u: 'https://www.rhid.com.br/v2/person.svc/', d: { name: 'TEST' } },
        { m: 'POST', u: 'https://www.rhid.com.br/v2/person.svc/create', d: { name: 'TEST' } },
        { m: 'PUT', u: 'https://www.rhid.com.br/v2/person.svc/', d: { id: 2, name: 'TEST' } },
        // Photo upload patterns
        { m: 'POST', u: 'https://www.rhid.com.br/v2/customerdb/personphoto.svc/', d: { idPerson: 2 } },
        { m: 'POST', u: 'https://www.rhid.com.br/v2/customerdb/personphoto.svc/upload', d: { idPerson: 2 } },
        { m: 'POST', u: 'https://www.rhid.com.br/v2/customerdb/person.svc/updatephoto', d: { idPerson: 2 } },
        // WCF style operations
        { m: 'POST', u: 'https://www.rhid.com.br/v2/customerdb/person.svc/AddPerson', d: { name: 'TEST' } },
        { m: 'POST', u: 'https://www.rhid.com.br/v2/customerdb/person.svc/UpdatePerson', d: { id: 2, name: 'TEST' } },
        { m: 'POST', u: 'https://www.rhid.com.br/v2/customerdb/person.svc/SavePerson', d: { id: 2, name: 'TEST' } },
        // Person with different patterns
        { m: 'POST', u: 'https://www.rhid.com.br/v2/customerdb/person.svc/c', d: { name: 'TEST' } },
        { m: 'POST', u: 'https://www.rhid.com.br/v2/customerdb/person.svc/e', d: { id: 2 } },
    ];

    for (const t of tests) {
        try {
            const cfg = {
                method: t.m, url: t.u, headers, timeout: 10000, validateStatus: () => true
            };
            if (t.d) cfg.data = t.d;
            const r = await axios(cfg);
            const ok = r.status >= 200 && r.status < 300;
            const icon = ok ? '✅' : (r.status === 404 ? '❌' : '⚠️');
            const body = typeof r.data === 'string' ? r.data.replace(/[\r\n]/g, '').substring(0, 100) : JSON.stringify(r.data).substring(0, 100);
            console.log(icon, t.m, t.u.replace('https://www.rhid.com.br', ''), '→', r.status, body);
        } catch (e) {
            console.log('💥', t.m, t.u.replace('https://www.rhid.com.br', ''), '→', e.message.substring(0, 80));
        }
    }

    await pool.end();
    console.log('\n=== DONE ===');
}

main().catch(e => console.error('FATAL:', e.message));
