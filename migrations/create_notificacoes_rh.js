const mysql = require('mysql2/promise');

async function createNotificacoesRH() {
    const conn = await mysql.createConnection({
        host: 'interchange.proxy.rlwy.net',
        port: 19396,
        user: 'root',
        password: process.env.RAILWAY_DB_PASSWORD || process.env.DB_PASSWORD || '',
        database: 'railway'
    });

    try {
        console.log('🔧 Criando tabela de notificações RH...');

        // Criar tabela de notificações RH
        await conn.execute(`
            CREATE TABLE IF NOT EXISTS notificacoes_rh (
                id INT AUTO_INCREMENT PRIMARY KEY,
                funcionario_id INT COMMENT 'ID do funcionário destinatário (NULL = todos)',
                tipo ENUM('holerite', 'ferias', 'beneficio', 'cadastro', 'admissao', 'demissao', 'aviso', 'geral') NOT NULL,
                titulo VARCHAR(255) NOT NULL,
                mensagem TEXT,
                link VARCHAR(255) COMMENT 'Link para ação relacionada',
                lida BOOLEAN DEFAULT FALSE,
                data_leitura DATETIME,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (funcionario_id) REFERENCES funcionarios(id) ON DELETE CASCADE,
                INDEX idx_funcionario (funcionario_id),
                INDEX idx_tipo (tipo),
                INDEX idx_lida (lida),
                INDEX idx_created (created_at DESC)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✅ Tabela notificacoes_rh criada!');

        // Inserir algumas notificações de exemplo
        await conn.execute(`
            INSERT INTO notificacoes_rh (funcionario_id, tipo, titulo, mensagem, created_at) VALUES
            (NULL, 'geral', 'Bem-vindo ao novo Portal', 'O novo portal do funcionário está disponível com melhorias na interface.', DATE_SUB(NOW(), INTERVAL 30 DAY)),
            (NULL, 'aviso', 'Recadastramento 2026', 'Favor atualizar seus dados cadastrais até o final do mês.', DATE_SUB(NOW(), INTERVAL 7 DAY))
            ON DUPLICATE KEY UPDATE titulo = VALUES(titulo)
        `);

        console.log('✅ Notificações de exemplo inseridas!');

        // Verificar estrutura
        const [cols] = await conn.execute('DESCRIBE notificacoes_rh');
        console.log('\n📋 Estrutura da tabela:');
        cols.forEach(c => console.log(`  - ${c.Field}: ${c.Type}`));

    } finally {
        await conn.end();
        console.log('\n🔌 Conexão encerrada.');
    }
}

createNotificacoesRH().catch(console.error);
