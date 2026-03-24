/**
 * Test RHiD API - endpoint /c returned 405, meaning it exists!
 * Test with different methods and proper data
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

    const BASE = 'https://www.rhid.com.br/v2';

    // /c returned 405 - try other methods on it
    console.log('=== Testing /customerdb/person.svc/c with all methods ===');
    for (const method of ['GET', 'PUT', 'PATCH', 'DELETE']) {
        try {
            const r = await axios({ method, url: BASE + '/customerdb/person.svc/c', headers, timeout: 10000, validateStatus: () => true, data: method !== 'GET' && method !== 'DELETE' ? { name: 'TEST' } : undefined });
            console.log(method, '→', r.status, typeof r.data === 'string' ? r.data.substring(0, 120) : JSON.stringify(r.data).substring(0, 120));
        } catch (e) { console.log(method, '→ ERR', e.message.substring(0, 80)); }
    }

    // Try single-letter endpoints (RESTful WCF pattern: a=all, c=create, u=update, d=delete, r=read)
    console.log('\n=== Testing single-letter endpoints for person ===');
    const letters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'];
    for (const l of letters) {
        try {
            const r = await axios.get(BASE + '/customerdb/person.svc/' + l, { headers, timeout: 8000, validateStatus: () => true });
            if (r.status !== 404) {
                console.log('GET /' + l, '→', r.status, typeof r.data === 'string' ? r.data.substring(0, 80) : JSON.stringify(r.data).substring(0, 80));
            }
        } catch (e) { /* skip */ }
    }

    // Try PUT on /c (create/update pattern)
    console.log('\n=== Testing PUT/PATCH on person endpoints ===');
    // Get a real person to test safe update (same data)
    const persons = await axios.get(BASE + '/customerdb/person.svc/a', { headers, timeout: 15000 });
    const plist = Array.isArray(persons.data) ? persons.data : persons.data.data || persons.data.result || [];
    const testPerson = plist[0];

    // Try PUT /customerdb/person.svc/c with full person object
    try {
        const r = await axios.put(BASE + '/customerdb/person.svc/c', testPerson, { headers, timeout: 15000, validateStatus: () => true });
        console.log('PUT /c (full person):', r.status, typeof r.data === 'string' ? r.data.substring(0, 150) : JSON.stringify(r.data).substring(0, 150));
    } catch (e) { console.log('PUT /c error:', e.message); }

    // Try PUT /customerdb/person.svc/u (update)
    try {
        const r = await axios.put(BASE + '/customerdb/person.svc/u', testPerson, { headers, timeout: 15000, validateStatus: () => true });
        console.log('PUT /u (full person):', r.status, typeof r.data === 'string' ? r.data.substring(0, 150) : JSON.stringify(r.data).substring(0, 150));
    } catch (e) { console.log('PUT /u error:', e.message); }

    // Try photo endpoints for department (which we know works)
    console.log('\n=== Testing department write ===');
    try {
        const depts = await axios.get(BASE + '/customerdb/department.svc/a', { headers, timeout: 10000 });
        const deptList = depts.data.data || depts.data || [];
        console.log('Departments:', deptList.length);
        
        // Try single letters on department
        for (const l of ['c', 'u', 'd', 'r', 'e']) {
            const r = await axios({ method: 'GET', url: BASE + '/customerdb/department.svc/' + l, headers, timeout: 8000, validateStatus: () => true });
            if (r.status !== 404) {
                console.log('GET dept/' + l, '→', r.status);
            }
        }
    } catch (e) { console.log('dept error:', e.message); }

    await pool.end();
    console.log('\n=== DONE ===');
}

main().catch(e => console.error('FATAL:', e.message));
