// Criar usuário representantes@aluforce.ind.br como vendedor
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

(async () => {
    const conn = await mysql.createConnection({
        host: 'localhost',
        port: 3306,
        user: 'aluforce',
        password: 'Aluforce2026VpsDB',
        database: 'aluforce_vendas'
    });

    const EMAIL = 'representantes@aluforce.ind.br';
    const NOME  = 'Leidiene Oliveira';
    const SENHA = 'alu0103';
    const AREAS = JSON.stringify(['vendas', 'rh']);
    const LOGIN = 'representantes@aluforce.ind.br';

    // Hash da senha com bcrypt
    const hash = await bcrypt.hash(SENHA, 12);

    // Verificar se já existe
    const [rows] = await conn.execute(
        'SELECT id, email, areas FROM usuarios WHERE email = ? LIMIT 1',
        [EMAIL]
    );

    if (rows.length > 0) {
        // Atualizar: senha, areas, status
        await conn.execute(
            `UPDATE usuarios
             SET senha_hash = ?, password_hash = ?, areas = ?, role = 'user',
                 is_admin = 0, status = 'ativo', senha_temporaria = 0, nome = ?
             WHERE email = ?`,
            [hash, hash, AREAS, NOME, EMAIL]
        );
        console.log(`✅ Usuário ATUALIZADO: ${EMAIL}`);
        console.log(`   areas: ${AREAS}`);
    } else {
        // Criar novo
        await conn.execute(
            `INSERT INTO usuarios (nome, email, senha_hash, password_hash, role, login, areas, is_admin, senha_temporaria, status)
             VALUES (?, ?, ?, ?, 'user', ?, ?, 0, 0, 'ativo')`,
            [NOME, EMAIL, hash, hash, LOGIN, AREAS]
        );
        console.log(`✅ Usuário CRIADO: ${EMAIL}`);
        console.log(`   areas: ${AREAS}`);
    }

    // Verificar resultado
    const [check] = await conn.execute(
        'SELECT id, nome, email, role, areas, is_admin, status FROM usuarios WHERE email = ? LIMIT 1',
        [EMAIL]
    );
    console.log('\n📋 Registro final:');
    console.log(JSON.stringify(check[0], null, 2));

    await conn.end();
})().catch(err => {
    console.error('❌ Erro:', err.message);
    process.exit(1);
});
