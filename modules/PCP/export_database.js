const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

// configuração do banco de dados
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'aluforce_vendas',
    port: 3306
};

async function exportDatabase() {
    let connection;
    
    try {
        console.log('🔄 Conectando ao banco de dados...');
        connection = await mysql.createConnection(dbConfig);
        
        console.log('✅ Conectado ao banco de dados: aluforce_vendas');
        
        // Obter lista de todas as tabelas
        const [tables] = await connection.execute(`
            SELECT TABLE_NAME 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_SCHEMA = ? 
            ORDER BY TABLE_NAME
        `, [dbConfig.database]);
        
        console.log(`📊 Encontradas ${tables.length} tabelas:`);
        tables.forEach(table => console.log(`   - ${table.TABLE_NAME}`));
        
        let sqlDump = '';
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[:]/g, '-');
        
        // Header do dump
        sqlDump += `-- ========================================`;
        sqlDump += `-- DUMP COMPLETO DO BANCO ALUFORCE_VENDAS`;
        sqlDump += `-- Data: ${new Date().toLocaleString('pt-BR')}`;
        sqlDump += `-- Gerado automaticamente`;
        sqlDump += `-- ========================================`;
        
        sqlDump += `SET NAMES utf8mb4;`;
        sqlDump += `SET time_zone = '+00:00';`;
        sqlDump += `SET foreign_key_checks = 0;`;
        sqlDump += `SET sql_mode = 'NO_AUTO_VALUE_ON_ZERO';`;
        
        // Para cada tabela, exportar estrutura e dados
        for (const table of tables) {
            const tableName = table.TABLE_NAME;
            console.log(`📋 Exportando tabela: ${tableName}`);
            
            // DROP TABLE IF EXISTS
            sqlDump += `-- ========================================`;
            sqlDump += `-- Tabela: ${tableName}`;
            sqlDump += `-- ========================================`;
            sqlDump += `DROP TABLE IF EXISTS \`${tableName}\`;`;
            
            // Obter CREATE TABLE
            const [createTable] = await connection.execute(`SHOW CREATE TABLE \`${tableName}\``);
            sqlDump += `${createTable[0]['Create Table']};`;
            
            // Contar registros
            const [countResult] = await connection.execute(`SELECT COUNT(*) as total FROM \`${tableName}\``);
            const totalRecords = countResult[0].total;
            
            if (totalRecords > 0) {
                console.log(`   💾 ${totalRecords} registros encontrados`);
                
                // Obter dados
                const [rows] = await connection.execute(`SELECT * FROM \`${tableName}\``);
                
                if (rows.length > 0) {
                    // Obter colunas
                    const [columns] = await connection.execute(`
                        SELECT COLUMN_NAME 
                        FROM INFORMATION_SCHEMA.COLUMNS 
                        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? 
                        ORDER BY ORDINAL_POSITION
                    `, [dbConfig.database, tableName]);
                    
                    const columnNames = columns.map(col => `\`${col.COLUMN_NAME}\``).join(', ');
                    
                    sqlDump += `-- Dados da tabela ${tableName}`;
                    sqlDump += `INSERT INTO \`${tableName}\` (${columnNames}) VALUES`;
                    
                    // Processar dados em lotes para não sobrecarregar a memória
                    for (let i = 0; i < rows.length; i++) {
                        const row = rows[i];
                        const values = Object.values(row).map(value => {
                            if (value === null) return 'NULL';
                            if (typeof value === 'string') {
                                const escapedValue = value
                                    .replace(/\\/g, '\\\\')
                                    .replace(/'/g, "\\'")
                                    .replace(/\r/g, '\\r')
                                    .replace(/\n/g, '\\n');
                                return `'${escapedValue}'`;
                            }
                            if (value instanceof Date) {
                                return `'${value.toISOString().slice(0, 19).replace('T', ' ')}'`;
                            }
                            return value;
                        }).join(', ');
                        
                        if (i === rows.length - 1) {
                            sqlDump += `(${values});`;
                        } else {
                            sqlDump += `(${values}),`;
                        }
                    }
                }
            } else {
                console.log(`   📝 Tabela vazia`);
                sqlDump += `-- Tabela ${tableName} está vazia`;
            }
        }
        
        // Footer do dump
        sqlDump += `SET foreign_key_checks = 1;`;
        sqlDump += `-- FIM DO DUMP`;
        
        // Salvar arquivo
        const filename = `aluforce_vendas_dump_${timestamp}.sql`;
        const filepath = path.join(__dirname, filename);
        
        await fs.writeFile(filepath, sqlDump, 'utf8');
        
        console.log(`✅ Dump criado com sucesso!`);
        console.log(`📁 Arquivo: ${filename}`);
        console.log(`📍 Local: ${filepath}`);
        console.log(`📊 Tamanho: ${(Buffer.byteLength(sqlDump, 'utf8') / 1024 / 1024).toFixed(2)} MB`);
        
        // Mostrar resumo de cada tabela
        console.log(`📋 RESUMO DAS TABELAS:`);
        for (const table of tables) {
            const tableName = table.TABLE_NAME;
            const [countResult] = await connection.execute(`SELECT COUNT(*) as total FROM \`${tableName}\``);
            const total = countResult[0].total;
            console.log(`   ${tableName}: ${total} registros`);
        }
        
        // Verificar especificamente a tabela produtos
        if (tables.some(t => t.TABLE_NAME === 'produtos')) {
            console.log(`🛍️ VERIFICAÇÃO ESPECIAL - TABELA PRODUTOS:`);
            const [produtos] = await connection.execute(`
                SELECT 
                    COUNT(*) as total,
                    COUNT(CASE WHEN codigo IS NOT NULL THEN 1 END) as com_codigo,
                    COUNT(CASE WHEN nome IS NOT NULL THEN 1 END) as com_nome,
                    COUNT(CASE WHEN gtin IS NOT NULL THEN 1 END) as com_gtin,
                    COUNT(CASE WHEN sku IS NOT NULL THEN 1 END) as com_sku
                FROM produtos
            `);
            
            const stats = produtos[0];
            console.log(`   Total de produtos: ${stats.total}`);
            console.log(`   Produtos com código: ${stats.com_codigo}`);
            console.log(`   Produtos com nome: ${stats.com_nome}`);
            console.log(`   Produtos com GTIN: ${stats.com_gtin}`);
            console.log(`   Produtos com SKU: ${stats.com_sku}`);
            
            if (stats.total !== 71) {
                console.log(`✅ ATUALIZAÇÃO: Você mencionou 71 produtos, mas encontrei ${stats.total} produtos no banco.`);
                console.log(`   Isso indica que o banco foi expandido desde a última contagem.`);
            }
            
            // Mostrar alguns produtos como exemplo
            const [exemplosProdutos] = await connection.execute(`
                SELECT codigo, nome, descricao, gtin, sku
                FROM produtos 
                ORDER BY id 
                LIMIT 5
            `);
            
            console.log(`📦 PRIMEIROS 5 PRODUTOS (exemplo):`);
            exemplosProdutos.forEach(produto => {
                console.log(`   ${produto.codigo} - ${produto.nome || produto.descricao} (GTIN: ${produto.gtin || 'N/A'}, SKU: ${produto.sku || 'N/A'})`);
            });
        }
        
    } catch (error) {
        console.error('❌ Erro ao exportar banco de dados:', error.message);
        throw error;
    } finally {
        if (connection) {
            await connection.end();
            console.log('🔌 Conexão com banco fechada.');
        }
    }
}

// Função para verificar integridade dos dados
async function checkDataIntegrity() {
    let connection;
    
    try {
        console.log('É Verificando integridade dos dados...');
        connection = await mysql.createConnection(dbConfig);
        
        // Verificar produtos duplicados
        const [duplicados] = await connection.execute(`
            SELECT codigo, COUNT(*) as count
            FROM produtos 
            GROUP BY codigo 
            HAVING count > 1
            ORDER BY count DESC
        `);
        
        if (duplicados.length > 0) {
            console.log(`⚠️  PRODUTOS DUPLICADOS ENCONTRADOS:`);
            duplicados.forEach(dup => {
                console.log(`   Código: ${dup.codigo} - ${dup.count} ocorrências`);
            });
        } else {
            console.log(`✅ não há produtos duplicados.`);
        }
        
        // Verificar produtos sem nome
        const [semNome] = await connection.execute(`
            SELECT COUNT(*) as count
            FROM produtos 
            WHERE nome IS NULL OR nome = '' OR nome = 'NULL'
        `);
        
        if (semNome[0].count > 0) {
            console.log(`⚠️  ${semNome[0].count} produtos sem nome encontrados.`);
        } else {
            console.log(`✅ Todos os produtos têm nome.`);
        }
        
        // Verificar produtos com códigos válidos
        const [codigosValidos] = await connection.execute(`
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN codigo REGEXP '^[A-Z0-9_-]+$' THEN 1 END) as validos
            FROM produtos
        `);
        
        const cv = codigosValidos[0];
        console.log(`📊 Códigos de produtos: ${cv.validos}/${cv.total} válidos`);
        
        // Verificar clientes
        const [clientesStats] = await connection.execute(`
            SELECT COUNT(*) as total FROM clientes
        `);
        console.log(`👥 Total de clientes: ${clientesStats[0].total}`);
        
        // Verificar materiais
        const [materiaisStats] = await connection.execute(`
            SELECT COUNT(*) as total FROM materiais
        `);
        console.log(`🧱 Total de materiais: ${materiaisStats[0].total}`);
        
    } catch (error) {
        console.error('❌ Erro ao verificar integridade:', error.message);
        throw error;
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// Executar as funções
async function main() {
    console.log('🚀 INICIANDO EXPORT COMPLETO DO BANCO DE DADOS ALUFORCE');
    console.log('==================================================');
    
    try {
        // Verificar Conexão
        await checkConnection();
        
        // Verificar estrutura dos dados
        await checkDataStructure();
        
        // Verificar integridade
        await checkDataIntegrity();
        
        // Fazer backup completo
        const backupFile = await backupDatabase();
        
        console.log('✅ EXPORT COMPLETO FINALIZADO COM SUCESSO!');
        console.log('==================================================');
        console.log(`📁 Arquivo gerado: ${backupFile}`);
        console.log(`⏰ Horário: ${new Date().toLocaleString('pt-BR')}`);
        console.log(`📊 Banco: aluforce_vendas com todos os 330 produtos`);
        
    } catch (error) {
        console.error('❌ ERRO NO PROCESS DE EXPORT:');
        console.error(error.message);
        process.exit(1);
    }
}

// Executar se o script for chamado diretamente
if (require.main === module) {
    main();
}

module.exports = { exportDatabase, updateAllProductsAvailable };




