const mysql = require('mysql2/promise');

async function migrateProdutosTable() {
    let connection;
    
    try {
        // Configuração de conexão
        connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: process.env.DB_PASSWORD || 'FILL_IN_PASSWORD',
            database: 'aluforce_vendas',
            multipleStatements: true
        });

        console.log('✅ Conectado ao banco de dados aluforce_vendas');
        console.log('🔄 Iniciando migração da tabela produtos...');

        // Lista de colunas para adicionar
        const migrations = [
            {
                name: 'categoria',
                sql: "ALTER TABLE produtos ADD COLUMN categoria VARCHAR(100) DEFAULT 'GERAL' AFTER descricao"
            },
            {
                name: 'gtin',
                sql: "ALTER TABLE produtos ADD COLUMN gtin VARCHAR(20) DEFAULT NULL AFTER categoria"
            },
            {
                name: 'ncm',
                sql: "ALTER TABLE produtos ADD COLUMN ncm VARCHAR(20) DEFAULT NULL AFTER sku"
            },
            {
                name: 'estoque_atual',
                sql: "ALTER TABLE produtos ADD COLUMN estoque_atual DECIMAL(10,2) DEFAULT 0 AFTER ncm"
            },
            {
                name: 'estoque_minimo',
                sql: "ALTER TABLE produtos ADD COLUMN estoque_minimo DECIMAL(10,2) DEFAULT 0 AFTER estoque_atual"
            },
            {
                name: 'preco_custo',
                sql: "ALTER TABLE produtos ADD COLUMN preco_custo DECIMAL(10,2) DEFAULT 0 AFTER estoque_minimo"
            },
            {
                name: 'preco_venda',
                sql: "ALTER TABLE produtos ADD COLUMN preco_venda DECIMAL(10,2) DEFAULT 0 AFTER preco_custo"
            },
            {
                name: 'unidade_medida',
                sql: "ALTER TABLE produtos ADD COLUMN unidade_medida VARCHAR(10) DEFAULT 'UN' AFTER preco_venda"
            },
            {
                name: 'imagem_url',
                sql: "ALTER TABLE produtos ADD COLUMN imagem_url VARCHAR(255) DEFAULT NULL AFTER unidade_medida"
            },
            {
                name: 'status',
                sql: "ALTER TABLE produtos ADD COLUMN status VARCHAR(20) DEFAULT 'ativo' AFTER imagem_url"
            },
            {
                name: 'data_criacao',
                sql: "ALTER TABLE produtos ADD COLUMN data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP AFTER status"
            }
        ];

        // Verificar quais colunas já existem
        const [columns] = await connection.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = 'aluforce_vendas' 
            AND TABLE_NAME = 'produtos'
        `);

        const existingColumns = columns.map(col => col.COLUMN_NAME.toLowerCase());
        console.log('📋 Colunas existentes:', existingColumns.join(', '));
        console.log('');

        // Adicionar colunas faltantes
        let addedCount = 0;
        for (const migration of migrations) {
            if (!existingColumns.includes(migration.name.toLowerCase())) {
                try {
                    await connection.query(migration.sql);
                    console.log(`✅ Coluna '${migration.name}' adicionada com sucesso`);
                    addedCount++;
                } catch (error) {
                    if (error.code === 'ER_DUP_FIELDNAME') {
                        console.log(`⚠️  Coluna '${migration.name}' já existe`);
                    } else {
                        console.error(`❌ Erro ao adicionar coluna '${migration.name}':`, error.message);
                    }
                }
            } else {
                console.log(`⏭️  Coluna '${migration.name}' já existe`);
            }
        }

        console.log('');
        console.log(`📊 Total de colunas adicionadas: ${addedCount}`);

        // Atualizar produtos existentes com valores padrão
        console.log('🔄 Atualizando produtos existentes...');

        await connection.query(`
            UPDATE produtos 
            SET categoria = 'GERAL' 
            WHERE categoria IS NULL OR categoria = ''
        `);
        console.log('✅ Categoria atualizada');

        await connection.query(`
            UPDATE produtos 
            SET unidade_medida = 'UN'
            WHERE unidade_medida IS NULL OR unidade_medida = ''
        `);
        console.log('✅ Unidade de medida atualizada');

        await connection.query(`
            UPDATE produtos 
            SET status = 'ativo'
            WHERE status IS NULL OR status = ''
        `);
        console.log('✅ Status atualizado');

        // Criar índices
        console.log('🔄 Criando índices...');
        
        const indexes = [
            { name: 'idx_produtos_categoria', sql: 'CREATE INDEX idx_produtos_categoria ON produtos(categoria)' },
            { name: 'idx_produtos_gtin', sql: 'CREATE INDEX idx_produtos_gtin ON produtos(gtin)' },
            { name: 'idx_produtos_sku', sql: 'CREATE INDEX idx_produtos_sku ON produtos(sku)' },
            { name: 'idx_produtos_ncm', sql: 'CREATE INDEX idx_produtos_ncm ON produtos(ncm)' },
            { name: 'idx_produtos_status', sql: 'CREATE INDEX idx_produtos_status ON produtos(status)' },
            { name: 'idx_produtos_estoque', sql: 'CREATE INDEX idx_produtos_estoque ON produtos(estoque_atual)' }
        ];

        for (const index of indexes) {
            try {
                await connection.query(index.sql);
                console.log(`✅ Índice '${index.name}' criado`);
            } catch (error) {
                if (error.code === 'ER_DUP_KEYNAME') {
                    console.log(`⏭️  Índice '${index.name}' já existe`);
                } else {
                    console.error(`⚠️  Erro ao criar índice '${index.name}':`, error.message);
                }
            }
        }

        // Migrar coluna ativo para clientes se necessário
        console.log('🔄 Verificando tabela clientes...');
        
        try {
            await connection.query(`
                ALTER TABLE clientes 
                ADD COLUMN ativo TINYINT(1) DEFAULT 1 AFTER status
            `);
            console.log('✅ Coluna ativo adicionada à tabela clientes');
        } catch (error) {
            if (error.code === 'ER_DUP_FIELDNAME') {
                console.log('⏭️  Coluna ativo já existe na tabela clientes');
            } else {
                console.error('⚠️  Erro ao adicionar coluna ativo:', error.message);
            }
        }

        console.log('✅ Migração concluída com sucesso!');
        console.log('🎉 A tabela produtos está pronta para o módulo PCP');

    } catch (error) {
        console.error('❌ Erro durante a migração:', error);
        throw error;
    } finally {
        if (connection) {
            await connection.end();
            console.log('🔌 Conexão com o banco de dados encerrada');
        }
    }
}

// Executar migração
migrateProdutosTable()
    .then(() => {
        console.log('✅ Script finalizado com sucesso');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Script finalizado com erro:', error.message);
        process.exit(1);
    });
