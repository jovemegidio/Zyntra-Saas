require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
﻿const mysql = require('mysql2/promise');

async function configurarAcessoPCP() {
    console.log('🔧 Configurando acesso PCP para usuários específicos...');
    console.log('=' .repeat(60));
    
    const conn = await mysql.createConnection({
        host: 'localhost', 
        user: 'root', 
        password: process.env.DB_PASSWORD || '', 
        database: 'aluforce_vendas'
    });
    
    // Lista de usuários que devem ter acesso ao PCP
    const usuariosParaConfigurar = [
        'andreia@aluforce.ind.br',
        'douglas@aluforce.ind.br', 
        'guilherme@aluforce.ind.br',
        'ti@aluforce.ind.br'
    ];
    
    console.log('👥 Usuários a serem configurados para PCP:');
    usuariosParaConfigurar.forEach((email, index) => {
        console.log(`  ${index + 1}. ${email}`);
    });
    console.log('');
    
    try {
        // Primeiro, verificar se os usuários existem
        console.log('🔍 Verificando usuários existentes...');
        for (const email of usuariosParaConfigurar) {
            const [user] = await conn.execute(
                'SELECT id, nome, email FROM usuarios WHERE email = ?',
                [email]
            );
            
            if (user.length > 0) {
                console.log(`✅ ${user[0].nome} (${email}) - Usuário encontrado (ID: ${user[0].id})`);
            } else {
                console.log(`❌ ${email} - Usuário NÃO encontrado no banco`);
            }
        }
        
        console.log('');
        console.log('🔧 Configurando permissões de acesso ao PCP...');
        
        // Verificar se existe coluna de permissões ou setor
        const [columns] = await conn.execute("DESCRIBE usuarios");
        const hasPermissoes = columns.some(col => col.Field === 'permissoes');
        const hasSetor = columns.some(col => col.Field === 'setor');
        
        console.log(`📋 Estrutura da tabela:`);
        console.log(`   - Campo 'permissoes': ${hasPermissoes ? 'Existe' : 'NÃO existe'}`);
        console.log(`   - Campo 'setor': ${hasSetor ? 'Existe' : 'NÃO existe'}`);
        
        // Se não existir coluna de permissões, criar
        if (!hasPermissoes) {
            console.log('⚠️  Criando coluna permissoes...');
            await conn.execute('ALTER TABLE usuarios ADD COLUMN permissoes VARCHAR(255) DEFAULT NULL');
            console.log('✅ Coluna permissoes criada');
        }
        
        // Se não existir coluna setor, criar
        if (!hasSetor) {
            console.log('⚠️  Criando coluna setor...');
            await conn.execute('ALTER TABLE usuarios ADD COLUMN setor VARCHAR(100) DEFAULT NULL');
            console.log('✅ Coluna setor criada');
        }
        
        console.log('');
        
        // Configurar permissões PCP para cada usuário
        let configurados = 0;
        for (const email of usuariosParaConfigurar) {
            try {
                const [result] = await conn.execute(`
                    UPDATE usuarios 
                    SET setor = 'PCP', permissoes = 'pcp,admin' 
                    WHERE email = ?
                `, [email]);
                
                if (result.affectedRows > 0) {
                    console.log(`✅ ${email} - Permissões PCP configuradas`);
                    configurados++;
                } else {
                    console.log(`⚠️  ${email} - Usuário não encontrado para Atualização`);
                }
            } catch (error) {
                console.log(`❌ ${email} - Erro ao configurar: ${error.message}`);
            }
        }
        
        console.log('');
        console.log('📊 Verificando configurações finais...');
        
        // Verificar as configurações aplicadas
        const [users] = await conn.execute(`
            SELECT id, nome, email, setor, permissoes 
            FROM usuarios 
            WHERE email IN (?, ?, ?, ?)
            ORDER BY nome
        `, usuariosParaConfigurar);
        
        if (users.length > 0) {
            console.log('👤 Usuários com acesso PCP configurado:');
            users.forEach(user => {
                console.log(`  ${user.id}. ${user.nome}`);
                console.log(`     📧 Email: ${user.email}`);
                console.log(`     🏢 Setor: ${user.setor || 'N/A'}`);
                console.log(`     🔑 Permissões: ${user.permissoes || 'N/A'}`);
                console.log('');
            });
        }
        
        console.log('✅ RESUMO:');
        console.log(`   - Usuários configurados: ${configurados}`);
        console.log(`   - Total de usuários: ${usuariosParaConfigurar.length}`);
        
        if (configurados === usuariosParaConfigurar.length) {
            console.log('🎉 TODOS OS USUÁRIOS FORAM CONFIGURADOS COM SUCESSO!');
        } else {
            console.log('⚠️  Alguns usuários podem não ter sido encontrados no banco.');
        }
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
    } finally {
        await conn.end();
        console.log('🔚 Processo concluído!');
    }
}

// Executar
configurarAcessoPCP().catch(console.error);


