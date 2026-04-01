/**
 * Script para definir EXATAMENTE os 5 vendedores corretos
 * Vendedores: Augusto (5), Fabiano (12), Fabíola (13), Márcia (22), Renata (38)
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const mysql = require('mysql2/promise');

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || process.env.DB_PASSWORD || 'CHANGE_ME',
    database: process.env.DB_NAME || 'aluforce_vendas'
};

async function definirVendedores() {
    const connection = await mysql.createConnection(dbConfig);
    
    try {
        console.log('🔧 Definindo exatamente os 5 vendedores corretos...\n');
        
        // IDs exatos dos vendedores
        const idsVendedoresCorretos = [5, 12, 13, 22, 38];
        
        // Primeiro, remover role='comercial' de TODOS que não são os 5 vendedores
        const [removed] = await connection.execute(`
            UPDATE usuarios 
            SET role = 'user', departamento = 'Administrativo'
            WHERE role = 'comercial' 
              AND id NOT IN (5, 12, 13, 22, 38)
        `);
        console.log(`✅ ${removed.affectedRows} usuários removidos de role='comercial'`);
        
        // Agora, definir os 5 vendedores corretos
        const [added] = await connection.execute(`
            UPDATE usuarios 
            SET role = 'comercial', departamento = 'Comercial'
            WHERE id IN (5, 12, 13, 22, 38)
        `);
        console.log(`✅ ${added.affectedRows} vendedores definidos com role='comercial'`);
        
        // Verificar resultado final
        console.log('\n📋 Lista final de vendedores:');
        console.log('─'.repeat(60));
        
        const [vendedores] = await connection.execute(`
            SELECT id, nome, role, departamento 
            FROM usuarios 
            WHERE role = 'comercial' OR departamento = 'Comercial'
            ORDER BY nome
        `);
        
        vendedores.forEach(v => {
            console.log(`ID: ${v.id.toString().padStart(2)} | ${v.nome.padEnd(40)} | ${v.role}`);
        });
        
        console.log('─'.repeat(60));
        console.log(`\n✅ Total: ${vendedores.length} vendedores`);
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
    } finally {
        await connection.end();
    }
}

definirVendedores();
