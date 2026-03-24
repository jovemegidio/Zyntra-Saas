// Test PUT /api/rh/funcionarios/56 with empty ENUM fields
const https = require('https');
const agent = new https.Agent({ rejectUnauthorized: false });

function request(method, path, body, token) {
    return new Promise((resolve, reject) => {
        const data = body ? JSON.stringify(body) : '';
        const headers = { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) };
        if (token) headers['Authorization'] = 'Bearer ' + token;
        const req = https.request({ hostname: 'localhost', port: 443, path, method, headers, rejectUnauthorized: false }, res => {
            let b = '';
            res.on('data', c => b += c);
            res.on('end', () => {
                try { resolve({ status: res.statusCode, body: JSON.parse(b) }); }
                catch(e) { resolve({ status: res.statusCode, body: b }); }
            });
        });
        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

async function main() {
    console.log('=== Step 1: Login ===');
    const login = await request('POST', '/api/login', { email: 'ti@aluforce.ind.br', password: 'admin123' });
    console.log('Login status:', login.status);
    
    if (!login.body.token) {
        console.log('Login response:', JSON.stringify(login.body));
        // Try with another password
        const login2 = await request('POST', '/api/login', { email: 'ti@aluforce.ind.br', password: 'Aluforce@2026' });
        console.log('Login2 status:', login2.status, JSON.stringify(login2.body).substring(0, 100));
        if (!login2.body.token) {
            console.log('FAIL: Cannot login');
            process.exit(1);
        }
        var token = login2.body.token;
    } else {
        var token = login.body.token;
    }
    console.log('Token obtained, length:', token.length);

    console.log('\n=== Step 2: PUT with empty ENUM fields ===');
    const put = await request('PUT', '/api/rh/funcionarios/56', {
        tipo_chave_pix: '',
        sexo: '',
        nome_completo: 'Lúcio Brito da Silva Junior'
    }, token);
    console.log('PUT status:', put.status);
    console.log('PUT response:', JSON.stringify(put.body));
    
    if (put.status === 200) {
        console.log('\n✅ SUCCESS: PUT returned 200 - ENUM fix works!');
    } else {
        console.log('\n❌ FAIL: PUT returned', put.status);
    }
}

main().catch(e => { console.error('Error:', e); process.exit(1); });
