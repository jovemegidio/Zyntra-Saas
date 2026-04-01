/**
 * Grant PCP access to Ana Paula (excluding relatorios pages)
 * 
 * Run on VPS: node setup-permissions-ana-paula.js
 */
const mysql = require('mysql2/promise');

async function main() {
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'aluforce',
        password: process.env.DB_PASS || 'CHANGE_ME_DB_PASSWORD',
        database: process.env.DB_NAME || 'aluforce_vendas'
    });

    console.log('='.padEnd(70, '='));
    console.log('GRANT PCP ACCESS — ANA PAULA');
    console.log('='.padEnd(70, '='));

    // 1. Find Ana Paula in usuarios
    const [users] = await conn.query(
        `SELECT id, nome, email, role, is_admin, areas, departamento, status
         FROM usuarios
         WHERE nome LIKE '%Ana Paula%' OR email LIKE '%ana.paula%' OR email LIKE '%anapaula%'`
    );

    if (users.length === 0) {
        console.log('❌ Ana Paula not found in usuarios table. Checking funcionarios...');
        const [funcs] = await conn.query(
            `SELECT id, nome_completo, nome, email, cargo, departamento
             FROM funcionarios
             WHERE nome_completo LIKE '%Ana Paula%' OR nome LIKE '%Ana Paula%' OR email LIKE '%ana.paula%'`
        );
        console.table(funcs);
        console.log('\n⚠️  Ana Paula needs to exist in the `usuarios` table to have login access.');
        console.log('If she only exists in funcionarios, create a login in usuarios first.');
        await conn.end();
        return;
    }

    console.log('\n📋 Found Ana Paula:');
    console.table(users);

    const anaPaula = users[0];
    const userId = anaPaula.id;

    // 2. Check existing permissions
    const [existingPerms] = await conn.query(
        'SELECT * FROM permissoes_modulos WHERE usuario_id = ?', [userId]
    );
    console.log('\n📋 Current permissions:');
    console.table(existingPerms);

    // 3. Add PCP module access (INSERT IGNORE to avoid duplicates)
    await conn.query(
        `INSERT INTO permissoes_modulos (usuario_id, modulo, visualizar, criar, editar, excluir, aprovar)
         VALUES (?, 'pcp', 1, 1, 1, 0, 0)
         ON DUPLICATE KEY UPDATE visualizar = 1, criar = 1, editar = 1`,
        [userId]
    );
    console.log('✅ PCP module access added to permissoes_modulos');

    // 4. Add granular PCP action permissions (EXCLUDING relatorios)
    const pcpActions = [
        'page.dashboard',
        'page.ordens',
        'page.apontamentos',
        'page.maquinas',
        'page.produtos',
        'page.estoque',
        'page.qualidade',
        'page.planejamento',
        // 'page.relatorios' — EXCLUDED per request
        'page.configuracoes',
        'ordem.criar',
        'ordem.editar',
        'ordem.excluir',
        'ordem.iniciar',
        'ordem.finalizar',
        'apontamento.criar',
        'apontamento.editar',
        'estoque.ajustar',
        'estoque.transferir',
        'produto.criar',
        'produto.editar',
        'maquina.criar',
        'maquina.editar',
        'exportar.excel'
    ];

    for (const acao of pcpActions) {
        await conn.query(
            `INSERT INTO permissoes_acoes (usuario_id, modulo, acao, permitido)
             VALUES (?, 'pcp', ?, 1)
             ON DUPLICATE KEY UPDATE permitido = 1`,
            [userId, acao]
        );
    }
    console.log(`✅ ${pcpActions.length} PCP action permissions added (relatorios EXCLUDED)`);

    // Explicitly deny relatorios pages
    for (const denied of ['page.relatorios', 'page.central_relatorios']) {
        await conn.query(
            `INSERT INTO permissoes_acoes (usuario_id, modulo, acao, permitido)
             VALUES (?, 'pcp', ?, 0)
             ON DUPLICATE KEY UPDATE permitido = 0`,
            [userId, denied]
        );
    }
    console.log('✅ page.relatorios and page.central_relatorios explicitly DENIED');

    // 5. Update areas JSON on usuarios table
    let currentAreas = [];
    try {
        currentAreas = typeof anaPaula.areas === 'string'
            ? JSON.parse(anaPaula.areas || '[]')
            : (anaPaula.areas || []);
    } catch (e) {
        currentAreas = [];
    }

    if (!currentAreas.includes('pcp')) {
        currentAreas.push('pcp');
    }

    await conn.query(
        'UPDATE usuarios SET areas = ? WHERE id = ?',
        [JSON.stringify(currentAreas), userId]
    );
    console.log(`✅ usuarios.areas updated to ${JSON.stringify(currentAreas)}`);

    // 6. Verify final state
    console.log('\n' + '='.padEnd(70, '='));
    console.log('VERIFICATION');
    console.log('='.padEnd(70, '='));

    const [finalPerms] = await conn.query(
        'SELECT modulo, visualizar, criar, editar, excluir, aprovar FROM permissoes_modulos WHERE usuario_id = ? ORDER BY modulo',
        [userId]
    );
    console.log('\n📋 Final module permissions:');
    console.table(finalPerms);

    const [finalActions] = await conn.query(
        'SELECT modulo, acao, permitido FROM permissoes_acoes WHERE usuario_id = ? AND modulo = ? ORDER BY acao',
        [userId, 'pcp']
    );
    console.log('\n📋 Final PCP action permissions:');
    console.table(finalActions);

    const [finalUser] = await conn.query(
        'SELECT id, nome, areas FROM usuarios WHERE id = ?', [userId]
    );
    console.log('\n📋 Final user record:');
    console.table(finalUser);

    await conn.end();
    console.log('\n✅ Done! Ana Paula now has PCP access (excluding relatorios).');
    console.log('⚠️  Remember to also update the hardcoded permissions files (see below).');
}

main().catch(err => { console.error('❌ Error:', err); process.exit(1); });
