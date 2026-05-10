/**
 * Migration: Criar tabelas de holerites com rastreamento de visualização
 * Data: 2026-01-13
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrate() {
    const pool = await mysql.createPool({
        host: process.env.DB_HOST || 'interchange.proxy.rlwy.net',
        port: parseInt(process.env.DB_PORT || '19396'),
        user: process.env.DB_USER || 'root',
        password: process.env.RAILWAY_DB_PASSWORD || process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'railway',
        waitForConnections: true,
        connectionLimit: 5
    });

    try {
        console.log('🔄 Iniciando migration: Tabelas de Holerites...\n');

        // Tabela principal de holerites
        console.log('📋 Criando tabela holerites...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS holerites (
                id INT AUTO_INCREMENT PRIMARY KEY,
                funcionario_id INT NOT NULL,
                mes INT NOT NULL COMMENT 'Mês de referência (1-12)',
                ano INT NOT NULL COMMENT 'Ano de referência',
                competencia VARCHAR(7) AS (CONCAT(ano, '-', LPAD(mes, 2, '0'))) STORED,

                -- Valores principais
                salario_base DECIMAL(10,2) DEFAULT 0.00,
                total_proventos DECIMAL(10,2) DEFAULT 0.00,
                total_descontos DECIMAL(10,2) DEFAULT 0.00,
                salario_liquido DECIMAL(10,2) DEFAULT 0.00,

                -- Detalhes INSS/IRRF/FGTS
                inss_base DECIMAL(10,2) DEFAULT 0.00,
                inss_valor DECIMAL(10,2) DEFAULT 0.00,
                inss_aliquota DECIMAL(5,2) DEFAULT 0.00,
                irrf_base DECIMAL(10,2) DEFAULT 0.00,
                irrf_valor DECIMAL(10,2) DEFAULT 0.00,
                irrf_aliquota DECIMAL(5,2) DEFAULT 0.00,
                fgts_valor DECIMAL(10,2) DEFAULT 0.00,

                -- Arquivo PDF (opcional)
                arquivo_pdf VARCHAR(500) NULL COMMENT 'Caminho do arquivo PDF',

                -- Status e controle
                status ENUM('rascunho', 'publicado', 'cancelado') DEFAULT 'rascunho',
                data_publicacao DATETIME NULL,
                publicado_por INT NULL COMMENT 'ID do admin que publicou',

                -- Rastreamento de visualização
                visualizado TINYINT(1) DEFAULT 0,
                data_primeira_visualizacao DATETIME NULL,
                data_ultima_visualizacao DATETIME NULL,
                total_visualizacoes INT DEFAULT 0,
                ip_visualizacao VARCHAR(45) NULL,
                user_agent_visualizacao TEXT NULL,

                -- Confirmação de recebimento
                confirmado_recebimento TINYINT(1) DEFAULT 0,
                data_confirmacao DATETIME NULL,

                -- Timestamps
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

                -- Índices
                INDEX idx_funcionario (funcionario_id),
                INDEX idx_competencia (competencia),
                INDEX idx_mes_ano (mes, ano),
                INDEX idx_status (status),
                INDEX idx_visualizado (visualizado),
                UNIQUE KEY unique_holerite (funcionario_id, mes, ano),

                FOREIGN KEY (funcionario_id) REFERENCES funcionarios(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✅ Tabela holerites criada!');

        // Tabela de itens do holerite (proventos e descontos detalhados)
        console.log('📋 Criando tabela holerite_itens...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS holerite_itens (
                id INT AUTO_INCREMENT PRIMARY KEY,
                holerite_id INT NOT NULL,
                tipo ENUM('provento', 'desconto') NOT NULL,
                codigo VARCHAR(20) NULL COMMENT 'Código do evento (ex: 001, 101)',
                descricao VARCHAR(255) NOT NULL,
                referencia VARCHAR(50) NULL COMMENT 'Ex: 220h, 30%, etc',
                valor DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                ordem INT DEFAULT 0 COMMENT 'Ordem de exibição',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                INDEX idx_holerite (holerite_id),
                INDEX idx_tipo (tipo),

                FOREIGN KEY (holerite_id) REFERENCES holerites(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✅ Tabela holerite_itens criada!');

        // Tabela de log de visualizações (histórico completo)
        console.log('📋 Criando tabela holerite_visualizacoes_log...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS holerite_visualizacoes_log (
                id INT AUTO_INCREMENT PRIMARY KEY,
                holerite_id INT NOT NULL,
                funcionario_id INT NOT NULL,
                data_visualizacao DATETIME DEFAULT CURRENT_TIMESTAMP,
                ip_address VARCHAR(45) NULL,
                user_agent TEXT NULL,
                acao ENUM('visualizou', 'baixou_pdf', 'confirmou') NOT NULL DEFAULT 'visualizou',

                INDEX idx_holerite (holerite_id),
                INDEX idx_funcionario (funcionario_id),
                INDEX idx_data (data_visualizacao),

                FOREIGN KEY (holerite_id) REFERENCES holerites(id) ON DELETE CASCADE,
                FOREIGN KEY (funcionario_id) REFERENCES funcionarios(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✅ Tabela holerite_visualizacoes_log criada!');

        // Tabela de configurações de proventos/descontos padrão
        console.log('📋 Criando tabela holerite_eventos_padrao...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS holerite_eventos_padrao (
                id INT AUTO_INCREMENT PRIMARY KEY,
                codigo VARCHAR(20) NOT NULL,
                tipo ENUM('provento', 'desconto') NOT NULL,
                descricao VARCHAR(255) NOT NULL,
                referencia_padrao VARCHAR(50) NULL,
                ativo TINYINT(1) DEFAULT 1,
                ordem INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                UNIQUE KEY unique_codigo (codigo)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✅ Tabela holerite_eventos_padrao criada!');

        // Inserir eventos padrão
        console.log('📋 Inserindo eventos padrão...');
        await pool.query(`
            INSERT IGNORE INTO holerite_eventos_padrao (codigo, tipo, descricao, referencia_padrao, ordem) VALUES
            ('001', 'provento', 'Salário Base', '220h', 1),
            ('002', 'provento', 'Horas Extras 50%', '', 2),
            ('003', 'provento', 'Horas Extras 100%', '', 3),
            ('004', 'provento', 'Adicional Noturno', '', 4),
            ('005', 'provento', 'Adicional de Periculosidade', '30%', 5),
            ('006', 'provento', 'Adicional de Insalubridade', '', 6),
            ('007', 'provento', 'Comissões', '', 7),
            ('008', 'provento', 'DSR', '', 8),
            ('009', 'provento', 'Gratificação', '', 9),
            ('010', 'provento', 'Ajuda de Custo', '', 10),
            ('101', 'desconto', 'INSS', '', 1),
            ('102', 'desconto', 'IRRF', '', 2),
            ('103', 'desconto', 'Vale Transporte', '6%', 3),
            ('104', 'desconto', 'Vale Refeição', '', 4),
            ('105', 'desconto', 'Vale Alimentação', '', 5),
            ('106', 'desconto', 'Plano de Saúde', '', 6),
            ('107', 'desconto', 'Plano Odontológico', '', 7),
            ('108', 'desconto', 'Adiantamento Salarial', '', 8),
            ('109', 'desconto', 'Empréstimo Consignado', '', 9),
            ('110', 'desconto', 'Faltas/Atrasos', '', 10),
            ('111', 'desconto', 'Contribuição Sindical', '', 11),
            ('112', 'desconto', 'Pensão Alimentícia', '', 12)
        `);
        console.log('✅ Eventos padrão inseridos!');

        console.log('\n✅ Migration de Holerites concluída com sucesso!');

    } catch (error) {
        console.error('❌ Erro na migration:', error.message);
        throw error;
    } finally {
        await pool.end();
    }
}

migrate().then(() => {
    console.log('\n🎉 Processo finalizado!');
    process.exit(0);
}).catch(err => {
    console.error('\n💥 Falha na migration:', err);
    process.exit(1);
});
