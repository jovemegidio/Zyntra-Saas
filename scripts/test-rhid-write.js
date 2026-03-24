/**
 * Script para testar escrita na API RHiD Cloud v2
 * Testar variações de endpoints PUT/POST para person
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

    // Get first person to use as test subject
    const persons = await axios.get('https://www.rhid.com.br/v2/customerdb/person.svc/a', { headers, timeout: 15000 });
    const plist = Array.isArray(persons.data) ? persons.data : persons.data.data || persons.data.result || [];
    const testPerson = plist[0];
    console.log('Test person:', testPerson.id, testPerson.name);
    console.log('Has photo field:', !!testPerson.foto);
    console.log('Photo value:', testPerson.foto ? String(testPerson.foto).substring(0, 100) : 'null');
    console.log('Has hasPicture:', testPerson.hasPicture);

    // Test various URL patterns for person update
    const urlPatterns = [
        { method: 'PUT', url: '/customerdb/person.svc/' + testPerson.id },
        { method: 'POST', url: '/customerdb/person.svc/' + testPerson.id },
        { method: 'PUT', url: '/customerdb/person.svc/update' },
        { method: 'POST', url: '/customerdb/person.svc/update' },
        { method: 'POST', url: '/customerdb/person.svc/save' },
        { method: 'PUT', url: '/customerdb.svc/person/' + testPerson.id },
        { method: 'POST', url: '/customerdb.svc/person/' + testPerson.id },
        { method: 'PUT', url: '/customerdb.svc/person' },
        { method: 'POST', url: '/customerdb.svc/person' },
        { method: 'POST', url: '/customerdb/person.svc/u' },
        { method: 'PUT', url: '/customerdb/person.svc/u' },
        { method: 'POST', url: '/customerdb/person.svc/photo/' + testPerson.id },
        { method: 'PUT', url: '/customerdb/person.svc/photo/' + testPerson.id },
        { method: 'POST', url: '/customerdb/photo.svc/' + testPerson.id },
    ];

    // Send only safe data (same as original)
    const safeData = { id: testPerson.id, name: testPerson.name, phone: testPerson.phone };

    for (const pattern of urlPatterns) {
        try {
            const r = await axios({
                method: pattern.method,
                url: 'https://www.rhid.com.br/v2' + pattern.url,
                data: safeData,
                headers,
                timeout: 10000,
                validateStatus: () => true
            });
            const isSuccess = r.status >= 200 && r.status < 300;
            const label = isSuccess ? '✅' : '❌';
            console.log(label, pattern.method, pattern.url, '→', r.status, typeof r.data === 'string' ? r.data.substring(0, 80) : JSON.stringify(r.data).substring(0, 80));
        } catch (e) {
            console.log('💥', pattern.method, pattern.url, '→', e.message.substring(0, 80));
        }
    }

    await pool.end();
    console.log('\n=== DONE ===');
}

main().catch(e => console.error('FATAL:', e.message));
