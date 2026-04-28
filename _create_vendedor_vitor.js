// Criar usuário Vitor Santos como vendedor nas 3 empresas
// Padrão: mesmo perfil de Márcia, Fabiano, Fabíola
// role=comercial | areas=["rh","vendas"] | is_admin=0 | status=ativo
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

const NOME  = 'Vitor Santos';
const EMAIL = 'vitor.santos@aluforce.ind.br';
const LOGIN = 'vitor.santos';
const SENHA = 'alu0103';      // senha temporária — pedir troca no primeiro login
const AREAS = JSON.stringify(['rh', 'vendas']);
const ROLE  = 'comercial';

const DATABASES = [
    { database: 'aluforce_vendas',      label: 'Aluforce (Principal)' },
    { database: 'labor_eletric_vendas', label: 'Labor Eletric'        },
    { database: 'labor_energy_vendas',  label: 'Labor Energy'         },
];

const DB_CONN = {
    host    : 'localhost',
    port    : 3306,
    user    : 'aluforce',
    password: 'Aluforce2026VpsDB',
};

(async () => {
    const hash = await bcrypt.hash(SENHA, 12);
    console.log('\n══════════════════════════════════════════');
    console.log('  Criar Vitor Santos - Vendedor (3 empresas)');
    console.log('══════════════════════════════════════════\n');

    for (const cfg of DATABASES) {
        console.log(`\n📦 ${cfg.label} (${cfg.database})`);
        const conn = await mysql.createConnection({ ...DB_CONN, database: cfg.database });

        try {
            // ── 1. Verificar se já existe ──────────────────────
            const [rows] = await conn.execute(
                'SELECT id, email, areas FROM usuarios WHERE email = ? OR login = ? LIMIT 1',
                [EMAIL, LOGIN]
            );

            let userId;
            if (rows.length > 0) {
                userId = rows[0].id;
                await conn.execute(
                    `UPDATE usuarios
                     SET nome = ?, senha_hash = ?, password_hash = ?, areas = ?,
                         role = ?, is_admin = 0, status = 'ativo', senha_temporaria = 0,
                         login = ?
                     WHERE id = ?`,
                    [NOME, hash, hash, AREAS, ROLE, LOGIN, userId]
                );
                console.log(`   ✅ ATUALIZADO  id=${userId}  (${EMAIL})`);
            } else {
                const [res] = await conn.execute(
                    `INSERT INTO usuarios
                         (nome, email, senha_hash, password_hash, role, login, areas, is_admin, senha_temporaria, status)
                     VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, 'ativo')`,
                    [NOME, EMAIL, hash, hash, ROLE, LOGIN, AREAS]
                );
                userId = res.insertId;
                console.log(`   ✅ CRIADO      id=${userId}  (${EMAIL})`);
            }

            // ── 2. usuarios_empresas (empresa_id=1, igual Fabiano/Fabiola/Márcia) ──
            const [ueRows] = await conn.execute(
                'SELECT id FROM usuarios_empresas WHERE usuario_id = ? AND empresa_id = 1 LIMIT 1',
                [userId]
            );
            if (ueRows.length === 0) {
                await conn.execute(
                    `INSERT INTO usuarios_empresas (usuario_id, empresa_id, role, is_admin, is_default, ativo)
                     VALUES (?, 1, '', 0, 1, 1)`,
                    [userId]
                );
                console.log(`   ✅ usuarios_empresas inserido (empresa_id=1)`);
            } else {
                console.log(`   ℹ️  usuarios_empresas já existe (empresa_id=1)`);
            }

            // ── 3. vendedores (somente na aluforce_vendas, onde Fabiano/Fabiola/Márcia existem) ──
            if (cfg.database === 'aluforce_vendas') {
                const [vRows] = await conn.execute(
                    'SELECT id FROM vendedores WHERE email = ? OR nome = ? LIMIT 1',
                    [EMAIL, NOME]
                );
                if (vRows.length === 0) {
                    await conn.execute(
                        `INSERT INTO vendedores (nome, email, usuario_id, situacao, comissao)
                         VALUES (?, ?, ?, 'ativo', 1.0)`,
                        [NOME, EMAIL, userId]
                    );
                    console.log(`   ✅ vendedores inserido`);
                } else {
                    // Garantir que usuario_id esteja vinculado
                    await conn.execute(
                        'UPDATE vendedores SET usuario_id = ?, situacao = \'ativo\' WHERE id = ?',
                        [userId, vRows[0].id]
                    );
                    console.log(`   ✅ vendedores atualizado (id=${vRows[0].id})`);
                }
            }

            // ── 4. Verificar resultado final ──────────────────
            const [check] = await conn.execute(
                'SELECT id, nome, email, login, role, areas, is_admin, status FROM usuarios WHERE id = ? LIMIT 1',
                [userId]
            );
            console.log(`   📋 ${JSON.stringify(check[0])}`);

        } catch (err) {
            console.error(`   ❌ Erro em ${cfg.database}: ${err.message}`);
        } finally {
            await conn.end();
        }
    }

    console.log('\n══════════════════════════════════════════');
    console.log('  Concluído!');
    console.log(`  Login: ${LOGIN}`);
    console.log(`  Senha temporária: ${SENHA}`);
    console.log('══════════════════════════════════════════\n');
})().catch(err => {
    console.error('❌ Erro fatal:', err.message);
    process.exit(1);
});
