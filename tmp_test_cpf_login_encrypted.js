const mysql = require('mysql2/promise');
const { decryptPII } = require('./lgpd-crypto.js');

function maskCpf(cpf) {
  const d = String(cpf || '').replace(/\D/g, '');
  if (d.length !== 11) return '***';
  return d.slice(0,3) + '***' + d.slice(9);
}

(async () => {
  const conn = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'aluforce',
    password: 'Aluforce2026VpsDB',
    database: 'aluforce_vendas'
  });

  const [rows] = await conn.query(
    "SELECT cpf, senha, email FROM funcionarios WHERE cpf LIKE 'ENC:%' AND email IS NOT NULL AND email <> '' AND senha IS NOT NULL AND senha <> '' AND senha NOT LIKE '$2%' LIMIT 1"
  );

  if (!rows.length) {
    console.log(JSON.stringify({ ok:false, reason:'no_candidate_encrypted_plain_password' }));
    await conn.end();
    process.exit(0);
  }

  const row = rows[0];
  const cpf = String(decryptPII(row.cpf) || '').replace(/\D/g, '');
  const password = String(row.senha || '');

  const resp = await fetch('http://127.0.0.1:3000/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cpf, password })
  });

  let body = {};
  try { body = await resp.json(); } catch (e) {}

  const emailMasked = row.email ? row.email.replace(/(^.).+(@.*$)/, '$1***$2') : null;

  console.log(JSON.stringify({
    ok: resp.ok,
    status: resp.status,
    message: body && body.message ? body.message : null,
    hasToken: !!(body && body.token),
    requires2FA: !!(body && body.requires2FA),
    userId: body && body.user ? body.user.id : null,
    emailMasked,
    cpfMasked: maskCpf(cpf)
  }));

  await conn.end();
})();