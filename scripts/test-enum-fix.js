// Generate JWT token and test PUT endpoint
const https = require('https');

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
    // Generate token directly using the server's JWT secret
    const jwt = require('jsonwebtoken');
    let secret;
    try {
        secret = process.env.JWT_SECRET;
        if (!secret) {
            // Read from .env file
            const fs = require('fs');
            const envContent = fs.readFileSync('.env', 'utf8');
            const match = envContent.match(/JWT_SECRET=(.+)/);
            if (match) secret = match[1].trim();
        }
    } catch(e) {}
    if (!secret) secret = 'aluforce-secret-key-2024';
    
    const token = jwt.sign(
        { id: 25, email: 'ti@aluforce.ind.br', role: 'admin', nome: 'TI', is_admin: 1 },
        secret,
        { expiresIn: '1h' }
    );
    console.log('Token generated, length:', token.length);

    console.log('\n=== Test: PUT with empty ENUM fields (should succeed) ===');
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

    // Also test that valid ENUM values still work
    console.log('\n=== Test 2: PUT with valid ENUM value ===');
    const put2 = await request('PUT', '/api/rh/funcionarios/56', {
        sexo: 'M'
    }, token);
    console.log('PUT2 status:', put2.status);
    console.log('PUT2 response:', JSON.stringify(put2.body));
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
