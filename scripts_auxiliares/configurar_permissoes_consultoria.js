const mysql = require('mysql2/promise');

(async () => {
    const pool = mysql.createPool({
        host: 'interchange.proxy.rlwy.net',
        port: 19396,
        user: 'root',
        password: process.env.RAILWAY_DB_PASSWORD || process.env.DB_PASSWORD || '',
        database: 'railway',
        waitForConnections: true,
        connectionLimit: 2
    });

    try {
        // Permissões de consultoria - acesso a todos os módulos, baixo poder de edição
        const permissoesConsultoria = {
            // PCP - visualizar e editar, sem criar/excluir
            permissoes_pcp: JSON.stringify({
                acesso: true,
                visualizar: true,
                editar: true,
                criar: false,
                excluir: false,
                aprovar: false,
                gerenciar: false
            }),
            // Vendas - visualizar tudo, editar limitado
            permissoes_vendas: JSON.stringify({
                acesso: true,
                visualizar: true,
                editar: true,
                criar: false,
                excluir: false,
                aprovar_desconto: false,
                cancelar_pedido: false
            }),
            // Financeiro - visualizar tudo, sem criar/editar/excluir
            permissoes_financeiro: JSON.stringify({
                acesso: true,
                visualizar: true,
                editar: false,
                criar: false,
                excluir: false,
                pagar: false,
                receber: false,
                conciliar: false
            }),
            // Compras - visualizar e editar, sem aprovar
            permissoes_compras: JSON.stringify({
                acesso: true,
                visualizar: true,
                editar: true,
                criar: false,
                excluir: false,
                aprovar: false,
                cotacao: true
            }),
            // RH - apenas visualizar
            permissoes_rh: JSON.stringify({
                acesso: true,
                visualizar: true,
                editar: false,
                criar: false,
                excluir: false,
                folha: false,
                admissao: false,
                demissao: false
            }),
            // NFe - visualizar e consultar
            permissoes_nfe: JSON.stringify({
                acesso: true,
                visualizar: true,
                editar: false,
                criar: false,
                excluir: false,
                emitir: false,
                cancelar: false
            })
        };

        console.log('=== Configurando Permissões de Consultoria ===');

        // Atualizar todos os usuários com role = consultoria
        const query = `
            UPDATE usuarios
            SET
                permissoes_pcp = ?,
                permissoes_vendas = ?,
                permissoes_financeiro = ?,
                permissoes_compras = ?,
                permissoes_rh = ?,
                permissoes_nfe = ?
            WHERE role = 'consultoria'
        `;

        const [result] = await pool.query(query, [
            permissoesConsultoria.permissoes_pcp,
            permissoesConsultoria.permissoes_vendas,
            permissoesConsultoria.permissoes_financeiro,
            permissoesConsultoria.permissoes_compras,
            permissoesConsultoria.permissoes_rh,
            permissoesConsultoria.permissoes_nfe
        ]);

        console.log(`✅ ${result.affectedRows} usuários atualizados com permissões de consultoria`);

        // Listar usuários atualizados
        const [users] = await pool.query(`
            SELECT id, nome, email, role,
                   permissoes_pcp, permissoes_vendas, permissoes_financeiro
            FROM usuarios
            WHERE role = 'consultoria'
        `);

        console.log('=== Usuários com Role Consultoria ===');
        users.forEach(u => {
            console.log(`ID: ${u.id} - ${u.nome}`);
            console.log(`   Email: ${u.email}`);
            console.log(`   Role: ${u.role}`);
            console.log(`   Permissões PCP: ${u.permissoes_pcp}`);
            console.log(`   Permissões Vendas: ${u.permissoes_vendas}`);
            console.log(`   Permissões Financeiro: ${u.permissoes_financeiro}`);
            console.log('---');
        });

        console.log('📋 Resumo das Permissões de Consultoria:');
        console.log('   ✅ PCP: Visualizar e Editar');
        console.log('   ✅ Vendas: Visualizar e Editar');
        console.log('   ✅ Financeiro: Apenas Visualizar');
        console.log('   ✅ Compras: Visualizar, Editar e Cotação');
        console.log('   ✅ RH: Apenas Visualizar');
        console.log('   ✅ NFe: Apenas Visualizar');
        console.log('   ❌ Sem permissão para: Criar, Excluir, Aprovar, Gerenciar');

    } catch (error) {
        console.error('Erro:', error.message);
    } finally {
        await pool.end();
        process.exit(0);
    }
})();
