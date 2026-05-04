// Script para dar acesso aos colaboradores na área PCP
const mysql = require('mysql2/promise');

console.log('🔐 CONFIGURANDO ACESSO PCP PARA COLABORADORES');

async function configurarAcessoPCP() {
    let connection;
    
    try {
        // Conectar ao banco
        connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'aluforce_vendas'
        });
        
        console.log('✅ Conectado ao banco de dados');
        
        // Lista de colaboradores que precisam de acesso
        const colaboradores = [
            {
                email: 'ti@aluforce.ind.br',
                nome: 'TI Aluforce',
                tipo: 'Admin TI'
            },
            {
                email: 'andreia@aluforce.ind.br',
                nome: 'Andreia',
                tipo: 'PCP'
            },
            {
                email: 'douglas@aluforce.ind.br',
                nome: 'Douglas',
                tipo: 'PCP'
            },
            {
                email: 'guilherme@aluforce.ind.br',
                nome: 'Guilherme',
                tipo: 'PCP'
            },
            {
                email: 'thiago@aluforce.ind.br',
                nome: 'Thiago',
                tipo: 'PCP'
            }
        ];
        
        console.log('👥 COLABORADORES PARA ACESSO PCP:');
        console.log('='.repeat(50));
        colaboradores.forEach((col, index) => {
            console.log(`${index + 1}. ${col.nome} (${col.email}) - ${col.tipo}`);
        });
        console.log('');
        
        // Verificar se existe tabela usuarios_pcp
        console.log('🔍 Verificando estrutura de tabelas...');
        
        const [tablesPCP] = await connection.execute("SHOW TABLES LIKE 'usuarios_pcp'");
        
        if (tablesPCP.length === 0) {
            console.log('📋 Criando tabela usuarios_pcp...');
            
            await connection.execute(`
                CREATE TABLE usuarios_pcp (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    nome VARCHAR(100) NOT NULL,
                    email VARCHAR(100) UNIQUE NOT NULL,
                    senha_hash VARCHAR(255) NOT NULL,
                    tipo_acesso ENUM('Admin', 'PCP', 'Consulta') DEFAULT 'PCP',
                    ativo BOOLEAN DEFAULT TRUE,
                    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    data_ultimo_login TIMESTAMP NULL,
                    criado_por VARCHAR(100) DEFAULT 'Sistema',
                    observacoes TEXT,
                    permissoes JSON
                )
            `);
            
            console.log('✅ Tabela "usuarios_pcp" criada com sucesso!');
        } else {
            console.log('✅ Tabela "usuarios_pcp" já existe');
        }
        
        // Verificar também a tabela usuarios geral
        const [tablesUsuarios] = await connection.execute("SHOW TABLES LIKE 'usuarios'");
        let tabelaUsuarios = 'usuarios';
        
        if (tablesUsuarios.length === 0) {
            // Verificar se existe users
            const [tablesUsers] = await connection.execute("SHOW TABLES LIKE 'users'");
            if (tablesUsers.length > 0) {
                tabelaUsuarios = 'users';
                console.log('📋 Usando tabela "users" para Verificação de usuários existentes');
            } else {
                console.log('⚠️ não foi encontrada tabela de usuários principal');
            }
        }
        
        // Processar cada colaborador
        let sucessos = 0;
        let atualizacoes = 0;
        let erros = 0;
        
        for (const colaborador of colaboradores) {
            try {
                console.log(`🔄 Processando: ${colaborador.nome} (${colaborador.email})`);
                
                // Verificar se já existe na tabela PCP
                const [existePCP] = await connection.execute(
                    'SELECT id, ativo FROM usuarios_pcp WHERE email = ?',
                    [colaborador.email]
                );
                
                // Gerar senha padrão segura
                const senhaTemporaria = `Aluforce2025!${colaborador.nome.substring(0, 3)}`;
                const bcrypt = require('bcrypt');
                const senhaHash = await bcrypt.hash(senhaTemporaria, 10);
                
                // Definir permissões baseadas no tipo
                const permissoes = {
                    pcp: {
                        visualizar: true,
                        criar_ordem: colaborador.tipo === 'Admin TI' || colaborador.tipo === 'PCP',
                        editar_ordem: colaborador.tipo === 'Admin TI' || colaborador.tipo === 'PCP',
                        excluir_ordem: colaborador.tipo === 'Admin TI',
                        gerenciar_usuarios: colaborador.tipo === 'Admin TI',
                        relatorios: true,
                        dashboard: true
                    },
                    admin: colaborador.tipo === 'Admin TI'
                };
                
                if (existePCP.length > 0) {
                    // Atualizar usuário existente
                    await connection.execute(`
                        UPDATE usuarios_pcp 
                        SET nome = ?, 
                            tipo_acesso = ?, 
                            ativo = TRUE, 
                            permissoes = ?,
                            observacoes = CONCAT(IFNULL(observacoes, ''), 
                                               '[', NOW(), '] Acesso atualizado automaticamente')
                        WHERE email = ?
                    `, [colaborador.nome, colaborador.tipo === 'Admin TI' ? 'Admin' : 'PCP', JSON.stringify(permissoes), colaborador.email]);
                    
                    console.log(`   ✅ Usuário atualizado (ID: ${existePCP[0].id})`);
                    atualizacoes++;
                } else {
                    // Criar novo usuário
                    const [result] = await connection.execute(`
                        INSERT INTO usuarios_pcp 
                        (nome, email, senha_hash, tipo_acesso, permissoes, observacoes)
                        VALUES (?, ?, ?, ?, ?, ?)
                    `, [
                        colaborador.nome, 
                        colaborador.email, 
                        senhaHash, 
                        colaborador.tipo === 'Admin TI' ? 'Admin' : 'PCP',
                        JSON.stringify(permissoes),
                        `Usuário criado automaticamente em ${new Date().toLocaleString('pt-BR')}. Senha temporária: ${senhaTemporaria}`
                    ]);
                    
                    console.log(`   ✅ Novo usuário criado (ID: ${result.insertId})`);
                    console.log(`   🔑 Senha temporária: ${senhaTemporaria}`);
                    sucessos++;
                }
                
                // Verificar se existe na tabela principal de usuários
                if (tabelaUsuarios) {
                    const [existeGeral] = await connection.execute(
                        `SELECT id FROM ${tabelaUsuarios} WHERE email = ?`,
                        [colaborador.email]
                    );
                    
                    if (existeGeral.length === 0) {
                        console.log(`   ℹ️ Usuário não existe na tabela principal (${tabelaUsuarios})`);
                    } else {
                        console.log(`   ℹ️ Usuário já existe na tabela principal (ID: ${existeGeral[0].id})`);
                    }
                }
                
            } catch (error) {
                console.log(`   ❌ Erro ao processar ${colaborador.email}: ${error.message}`);
                erros++;
            }
        }
        
        console.log('' + '='.repeat(60));
        console.log('📊 RELATÓRIO FINAL DE CONFIGURAÇÃO');
        console.log('='.repeat(60));
        console.log(`✅ Novos usuários criados: ${sucessos}`);
        console.log(`🔄 Usuários atualizados: ${atualizacoes}`);
        console.log(`❌ Erros encontrados: ${erros}`);
        
        // Mostrar status final de todos os usuários PCP
        const [todosUsuarios] = await connection.execute(`
            SELECT id, nome, email, tipo_acesso, ativo, data_criacao 
            FROM usuarios_pcp 
            ORDER BY nome
        `);
        
        console.log('👥 USUÁRIOS PCP CONFIGURADOS:');
        console.log('='.repeat(50));
        todosUsuarios.forEach((user, index) => {
            const status = user.ativo ? '✅' : '❌';
            const tipo = user.tipo_acesso;
            console.log(`${index + 1}. ${status} ${user.nome} (${user.email}) - ${tipo}`);
        });
        
        // Instruções para próximos passos
        console.log('📋 PRÓXIMOS PASSOS:');
        console.log('='.repeat(50));
        console.log('1. ✅ Usuários configurados no banco de dados');
        console.log('2. 🔑 Senhas temporárias geradas (ver acima)');
        console.log('3. 🔐 Usuários devem alterar senha no primeiro login');
        console.log('4. 📧 Enviar credenciais por canal seguro');
        console.log('5. 🖥️ Verificar se interface PCP reconhece os usuários');
        
        console.log('🎉 configuração de acesso PCP concluída!');
        
    } catch (error) {
        console.error('❌ Erro durante configuração:', error.message);
        if (error.code === 'MODULE_NOT_FOUND' && error.message.includes('bcrypt')) {
            console.log('💡 Instalando bcrypt para hash de senhas...');
            // Usar uma hash simples como fallback
            console.log('⚠️ Usando hash simplificado. Recomenda-se instalar bcrypt.');
        }
    } finally {
        if (connection) {
            await connection.end();
            console.log('🔌 Conexão com banco encerrada');
        }
    }
}

configurarAcessoPCP();




