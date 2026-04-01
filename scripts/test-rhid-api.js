/**
 * Script para testar capacidades de escrita da API RHiD Cloud
 */
const axios = require('axios');
const mysql = require('mysql2/promise');

async function main() {
    const pool = mysql.createPool({
        host: 'localhost',
        user: 'aluforce',
        password: 'CHANGE_ME_DB_PASSWORD',
        database: 'aluforce_vendas'
    });

    // 1. Buscar credenciais RHiD
    const [rows] = await pool.query(
        'SELECT rhid_email, rhid_password FROM controlid_config WHERE ativo = TRUE AND rhid_enabled = TRUE LIMIT 1'
    );
    if (!rows.length) { console.log('NO CONFIG'); process.exit(1); }

    const email = rows[0].rhid_email;
    const password = Buffer.from(rows[0].rhid_password, 'base64').toString();
    console.log('Email:', email);

    // 2. Login
    const resp = await axios.post('https://www.rhid.com.br/v2/login.svc/', {
        email, password
    }, { timeout: 15000, headers: { 'Content-Type': 'application/json' } });
    const token = resp.data.accessToken;
    console.log('Token OK');

    const headers = { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' };

    // 3. Listar persons
    const persons = await axios.get('https://www.rhid.com.br/v2/customerdb/person.svc/a', {
        headers, timeout: 15000
    });
    const plist = Array.isArray(persons.data) ? persons.data : persons.data.data || persons.data.result || [];
    console.log('\n=== PERSONS ===');
    console.log('Count:', plist.length);
    if (plist.length > 0) {
        console.log('Keys:', Object.keys(plist[0]).join(', '));
        console.log('Sample:', JSON.stringify(plist[0]).substring(0, 600));
    }

    // 4. Testar endpoints de escrita - PUT person (atualizar)
    console.log('\n=== TESTING WRITE ENDPOINTS ===');

    // 4a. Tentar PUT /customerdb/person.svc/ (update person)
    if (plist.length > 0) {
        try {
            const testPerson = plist[0];
            console.log('\nTrying PUT person (id=' + testPerson.id + ', name=' + testPerson.name + ')...');
            // Enviar mesmos dados sem alterar (dry test)
            const putResp = await axios.put('https://www.rhid.com.br/v2/customerdb/person.svc/', testPerson, {
                headers, timeout: 15000
            });
            console.log('PUT person STATUS:', putResp.status);
            console.log('PUT person RESPONSE:', JSON.stringify(putResp.data).substring(0, 300));
        } catch (e) {
            console.log('PUT person ERROR:', e.response ? e.response.status + ' ' + JSON.stringify(e.response.data).substring(0, 300) : e.message);
        }
    }

    // 4b. Tentar POST /customerdb/person.svc/ (create person)
    try {
        console.log('\nTrying POST person (create - dry run with invalid data)...');
        const postResp = await axios.post('https://www.rhid.com.br/v2/customerdb/person.svc/', {
            name: '__TEST_DELETE_ME__', pis: '00000000000'
        }, { headers, timeout: 15000, validateStatus: () => true });
        console.log('POST person STATUS:', postResp.status);
        console.log('POST person RESPONSE:', JSON.stringify(postResp.data).substring(0, 300));
    } catch (e) {
        console.log('POST person ERROR:', e.response ? e.response.status + ' ' + JSON.stringify(e.response.data).substring(0, 300) : e.message);
    }

    // 4c. Tentar GET person by id
    if (plist.length > 0) {
        try {
            console.log('\nTrying GET person by id (' + plist[0].id + ')...');
            const getResp = await axios.get('https://www.rhid.com.br/v2/customerdb/person.svc/' + plist[0].id, {
                headers, timeout: 15000, validateStatus: () => true
            });
            console.log('GET person STATUS:', getResp.status);
            console.log('GET person RESPONSE:', JSON.stringify(getResp.data).substring(0, 500));
        } catch (e) {
            console.log('GET person ERROR:', e.message);
        }
    }

    // 4d. Testar endpoints de photo
    if (plist.length > 0) {
        try {
            console.log('\nTrying GET person photo (id=' + plist[0].id + ')...');
            const photoResp = await axios.get('https://www.rhid.com.br/v2/customerdb/person.svc/' + plist[0].id + '/photo', {
                headers, timeout: 15000, validateStatus: () => true
            });
            console.log('GET photo STATUS:', photoResp.status);
            console.log('GET photo RESPONSE type:', typeof photoResp.data);
            console.log('GET photo RESPONSE:', JSON.stringify(photoResp.data).substring(0, 200));
        } catch (e) {
            console.log('GET photo ERROR:', e.message);
        }
    }

    // 4e. Testar outros services
    const services = [
        'customerdb/person.svc/fields',
        'customerdb/group.svc/a',
        'customerdb/department.svc/a',
    ];
    for (const svc of services) {
        try {
            console.log('\nTrying GET ' + svc + '...');
            const r = await axios.get('https://www.rhid.com.br/v2/' + svc, {
                headers, timeout: 15000, validateStatus: () => true
            });
            console.log('STATUS:', r.status);
            const d = JSON.stringify(r.data).substring(0, 300);
            console.log('RESPONSE:', d);
        } catch (e) {
            console.log('ERROR:', e.message);
        }
    }

    await pool.end();
    console.log('\n=== DONE ===');
}

main().catch(e => console.error('FATAL:', e.message));
