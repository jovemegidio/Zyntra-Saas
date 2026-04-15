const http = require('http');

const logins = [
    { email: 'ti@laboreletric.com.br', senha: 'teste123' },
    { email: 'ti@energy.com.br', senha: 'teste123' },
    { email: 'andreia.trovao@laboreletric.com.br', senha: 'teste123' },
    { email: 'andreia@energy.com.br', senha: 'teste123' }
];

async function testLogin(login) {
    return new Promise((resolve) => {
        const data = JSON.stringify(login);
        const req = http.request({
            hostname: 'localhost',
            port: 3000,
            path: '/api/auth/login',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, (res) => {
            let body = '';
            res.on('data', d => body += d);
            res.on('end', () => {
                console.log(`${login.email}: ${res.statusCode} - ${body.substring(0, 300)}`);
                resolve();
            });
        });
        req.on('error', e => { console.log(`${login.email}: ERROR - ${e.message}`); resolve(); });
        req.write(data);
        req.end();
    });
}

(async () => {
    for (const l of logins) await testLogin(l);
    process.exit();
})();
