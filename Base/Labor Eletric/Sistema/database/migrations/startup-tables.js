/**
 * AUDIT-FIX R-13: Migration de tabelas — ALUFORCE ERP
 * 
 * Centraliza todas as criações de tabela que antes estavam espalhadas
 * dentro de handlers GET/POST. Executar na inicialização do sistema.
 * 
 * Criado durante auditoria de segurança — 15/02/2026
 */

async function runMigrations(pool) {
    console.log('[MIGRATION] 🔄 Executando migrações de estrutura...');
    const startTime = Date.now();
    let tablesCreated = 0;

    const tables = [
        // Configurações da empresa
        `CREATE TABLE IF NOT EXISTS configuracoes_empresa (
            id INT PRIMARY KEY AUTO_INCREMENT,
            razao_social VARCHAR(255),
            nome_fantasia VARCHAR(255),
            cnpj VARCHAR(18),
            inscricao_estadual VARCHAR(50),
            inscricao_municipal VARCHAR(50),
            telefone VARCHAR(20),
            email VARCHAR(255),
            endereco TEXT,
            logo_url VARCHAR(500),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

        // Configurações de venda de produtos
        `CREATE TABLE IF NOT EXISTS configuracoes_venda_produtos (
            id INT PRIMARY KEY AUTO_INCREMENT,
            chave_config VARCHAR(100) NOT NULL,
            valor TEXT,
            descricao VARCHAR(255),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY uk_chave (chave_config)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

        // Configurações de venda de serviços
        `CREATE TABLE IF NOT EXISTS configuracoes_venda_servicos (
            id INT PRIMARY KEY AUTO_INCREMENT,
            chave_config VARCHAR(100) NOT NULL,
            valor TEXT,
            descricao VARCHAR(255),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY uk_chave (chave_config)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

        // Configurações clientes/fornecedores
        `CREATE TABLE IF NOT EXISTS configuracoes_clientes_fornecedores (
            id INT PRIMARY KEY AUTO_INCREMENT,
            chave_config VARCHAR(100) NOT NULL,
            valor TEXT,
            descricao VARCHAR(255),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY uk_chave (chave_config)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

        // Configurações de finanças
        `CREATE TABLE IF NOT EXISTS configuracoes_financas (
            id INT PRIMARY KEY AUTO_INCREMENT,
            chave_config VARCHAR(100) NOT NULL,
            valor TEXT,
            descricao VARCHAR(255),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY uk_chave (chave_config)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

        // PCP - Etapas de processo
        `CREATE TABLE IF NOT EXISTS pcp_etapas_processo (
            id INT PRIMARY KEY AUTO_INCREMENT,
            nome VARCHAR(255) NOT NULL,
            descricao TEXT,
            ordem INT DEFAULT 0,
            ativo BOOLEAN DEFAULT TRUE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

        // Configurações de impostos
        `CREATE TABLE IF NOT EXISTS configuracoes_impostos (
            id INT PRIMARY KEY AUTO_INCREMENT,
            tipo VARCHAR(50) NOT NULL,
            aliquota DECIMAL(10,4),
            base_calculo VARCHAR(100),
            descricao VARCHAR(255),
            ativo BOOLEAN DEFAULT TRUE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

        // Famílias de produtos
        `CREATE TABLE IF NOT EXISTS familias_produtos (
            id INT PRIMARY KEY AUTO_INCREMENT,
            nome VARCHAR(255) NOT NULL,
            descricao TEXT,
            ativo BOOLEAN DEFAULT TRUE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

        // Características de produtos
        `CREATE TABLE IF NOT EXISTS caracteristicas_produtos (
            id INT PRIMARY KEY AUTO_INCREMENT,
            nome VARCHAR(255) NOT NULL,
            tipo VARCHAR(50),
            valores_possiveis TEXT,
            ativo BOOLEAN DEFAULT TRUE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

        // Permissões de módulos
        `CREATE TABLE IF NOT EXISTS permissoes_modulos (
            id INT PRIMARY KEY AUTO_INCREMENT,
            usuario_id INT,
            modulo VARCHAR(100),
            pode_visualizar BOOLEAN DEFAULT FALSE,
            pode_editar BOOLEAN DEFAULT FALSE,
            pode_criar BOOLEAN DEFAULT FALSE,
            pode_excluir BOOLEAN DEFAULT FALSE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_usuario (usuario_id),
            INDEX idx_modulo (modulo)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

        // Anexos de ordem de produção
        `CREATE TABLE IF NOT EXISTS anexos_ordem_producao (
            id INT PRIMARY KEY AUTO_INCREMENT,
            ordem_producao_id INT NOT NULL,
            nome_arquivo VARCHAR(255),
            caminho VARCHAR(500),
            tipo VARCHAR(50),
            tamanho INT,
            usuario_id INT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_ordem (ordem_producao_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

        // Histórico de ordem de produção
        `CREATE TABLE IF NOT EXISTS historico_ordem_producao (
            id INT PRIMARY KEY AUTO_INCREMENT,
            ordem_producao_id INT NOT NULL,
            tipo VARCHAR(100),
            descricao TEXT,
            usuario_id INT,
            usuario_nome VARCHAR(255),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_ordem (ordem_producao_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

        // Tarefas de ordem de produção
        `CREATE TABLE IF NOT EXISTS tarefas_ordem_producao (
            id INT PRIMARY KEY AUTO_INCREMENT,
            ordem_producao_id INT NOT NULL,
            descricao TEXT,
            responsavel VARCHAR(255),
            status ENUM('pendente', 'em_andamento', 'concluida') DEFAULT 'pendente',
            prazo DATE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_ordem (ordem_producao_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

        // Ordens multiplexado
        `CREATE TABLE IF NOT EXISTS ordens_multiplexado (
            id INT PRIMARY KEY AUTO_INCREMENT,
            numero VARCHAR(50),
            descricao TEXT,
            status VARCHAR(50) DEFAULT 'pendente',
            prioridade VARCHAR(20) DEFAULT 'normal',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

        // Apontamentos de produção
        `CREATE TABLE IF NOT EXISTS apontamentos_producao (
            id INT PRIMARY KEY AUTO_INCREMENT,
            ordem_producao_id INT,
            usuario_id INT,
            operador VARCHAR(255),
            tipo_atividade VARCHAR(100),
            nome_atividade VARCHAR(255),
            hora_inicio DATETIME,
            hora_fim DATETIME,
            duracao_segundos INT DEFAULT 0,
            pedido_id INT,
            produto_descricao TEXT,
            observacoes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_ordem (ordem_producao_id),
            INDEX idx_usuario (usuario_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

        // Atestados
        `CREATE TABLE IF NOT EXISTS atestados (
            id INT PRIMARY KEY AUTO_INCREMENT,
            funcionario_id INT NOT NULL,
            tipo VARCHAR(50),
            data_inicio DATE,
            data_fim DATE,
            dias INT,
            cid VARCHAR(20),
            medico VARCHAR(255),
            crm VARCHAR(20),
            observacoes TEXT,
            arquivo_url VARCHAR(500),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_funcionario (funcionario_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

        // Avisos / Murais
        `CREATE TABLE IF NOT EXISTS avisos (
            id INT PRIMARY KEY AUTO_INCREMENT,
            titulo VARCHAR(255),
            conteudo TEXT,
            tipo VARCHAR(50),
            prioridade VARCHAR(20) DEFAULT 'normal',
            autor_id INT,
            autor_nome VARCHAR(255),
            ativo BOOLEAN DEFAULT TRUE,
            data_expiracao DATE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

        // Histórico de pedido
        `CREATE TABLE IF NOT EXISTS pedido_historico (
            id INT PRIMARY KEY AUTO_INCREMENT,
            pedido_id INT NOT NULL,
            tipo VARCHAR(100),
            descricao TEXT,
            usuario_id INT,
            usuario_nome VARCHAR(255),
            dados_json JSON,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_pedido (pedido_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

        // Faturamento parcial
        `CREATE TABLE IF NOT EXISTS pedido_faturamentos (
            id INT PRIMARY KEY AUTO_INCREMENT,
            pedido_id INT NOT NULL,
            sequencia INT DEFAULT 1,
            tipo VARCHAR(50),
            percentual DECIMAL(5,2),
            valor DECIMAL(15,2),
            nfe_numero VARCHAR(20),
            nfe_cfop VARCHAR(10),
            baixa_estoque BOOLEAN DEFAULT FALSE,
            usuario_id INT,
            usuario_nome VARCHAR(255),
            observacoes TEXT,
            conta_receber_id INT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_pedido (pedido_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

        // Estoque movimentos
        `CREATE TABLE IF NOT EXISTS estoque_movimentos (
            id INT PRIMARY KEY AUTO_INCREMENT,
            produto_id INT NOT NULL,
            tipo ENUM('entrada', 'saida', 'ajuste') NOT NULL,
            quantidade DECIMAL(10,2) NOT NULL,
            referencia_tipo VARCHAR(50),
            referencia_id INT,
            observacoes TEXT,
            usuario_id INT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_produto (produto_id),
            INDEX idx_tipo (tipo)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

        // Diário de produção
        `CREATE TABLE IF NOT EXISTS diario_producao (
            id INT PRIMARY KEY AUTO_INCREMENT,
            data DATE NOT NULL,
            turno VARCHAR(20),
            maquina VARCHAR(100),
            operador_id INT,
            operador_nome VARCHAR(255),
            hora_inicio TIME,
            hora_fim TIME,
            produto VARCHAR(255),
            quantidade DECIMAL(10,2),
            observacoes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_data (data)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

        // AUDIT-FIX: rh_holerites_gestao (moved from inline IIFE in server.js)
        `CREATE TABLE IF NOT EXISTS rh_holerites_gestao (
            id INT AUTO_INCREMENT PRIMARY KEY,
            funcionario_id INT NOT NULL,
            mes INT NOT NULL,
            ano INT NOT NULL,
            proventos JSON,
            descontos JSON,
            total_proventos DECIMAL(12,2) DEFAULT 0,
            total_descontos DECIMAL(12,2) DEFAULT 0,
            salario_liquido DECIMAL(12,2) DEFAULT 0,
            status ENUM('rascunho','publicado') DEFAULT 'rascunho',
            visualizado TINYINT(1) DEFAULT 0,
            data_primeira_visualizacao DATETIME DEFAULT NULL,
            data_ultima_visualizacao DATETIME DEFAULT NULL,
            total_visualizacoes INT DEFAULT 0,
            ip_visualizacao VARCHAR(45) DEFAULT NULL,
            confirmado_recebimento TINYINT(1) DEFAULT 0,
            data_confirmacao DATETIME DEFAULT NULL,
            arquivo_pdf VARCHAR(500) DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY uk_func_periodo (funcionario_id, mes, ano)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

        // PCP - Qualidade: Checklists de inspeção
        `CREATE TABLE IF NOT EXISTS qualidade_checklists (
            id INT AUTO_INCREMENT PRIMARY KEY,
            nome VARCHAR(255) NOT NULL,
            tipo_inspecao ENUM('recebimento','processo','final','dimensional','visual') NOT NULL DEFAULT 'visual',
            ativo BOOLEAN DEFAULT TRUE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

        // PCP - Qualidade: Itens do checklist
        `CREATE TABLE IF NOT EXISTS qualidade_checklist_itens (
            id INT AUTO_INCREMENT PRIMARY KEY,
            checklist_id INT NOT NULL,
            descricao VARCHAR(500) NOT NULL,
            ordem INT DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_checklist (checklist_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

        // PCP - Qualidade: Inspeções
        `CREATE TABLE IF NOT EXISTS qualidade_inspecoes (
            id INT AUTO_INCREMENT PRIMARY KEY,
            tipo ENUM('recebimento','processo','final','dimensional','visual') NOT NULL DEFAULT 'visual',
            checklist_id INT DEFAULT NULL,
            ordem_producao VARCHAR(100),
            produto VARCHAR(255),
            quantidade_inspecionada INT DEFAULT NULL,
            quantidade_aprovada INT DEFAULT NULL,
            observacoes TEXT,
            checklist_respostas JSON,
            status ENUM('pendente','em_andamento','aprovado','reprovado') NOT NULL DEFAULT 'pendente',
            data_inspecao DATE NOT NULL,
            inspetor_id INT DEFAULT NULL,
            inspetor_nome VARCHAR(255),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_status (status),
            INDEX idx_data (data_inspecao)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

        // PCP - Qualidade: Não Conformidades
        `CREATE TABLE IF NOT EXISTS qualidade_nao_conformidades (
            id INT AUTO_INCREMENT PRIMARY KEY,
            descricao TEXT NOT NULL,
            severidade ENUM('observacao','menor','maior','critica') NOT NULL DEFAULT 'menor',
            origem ENUM('inspecao','cliente','processo','auditoria') DEFAULT 'inspecao',
            ordem_producao VARCHAR(100),
            produto VARCHAR(255),
            causa_raiz TEXT,
            acao_corretiva TEXT,
            responsavel VARCHAR(255),
            prazo DATE DEFAULT NULL,
            status ENUM('aberta','em_analise','acao_corretiva','resolvida') NOT NULL DEFAULT 'aberta',
            inspecao_id INT DEFAULT NULL,
            registrado_por INT DEFAULT NULL,
            registrado_nome VARCHAR(255),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_status (status),
            INDEX idx_severidade (severidade)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    ];

    for (const ddl of tables) {
        try {
            await pool.query(ddl);
            tablesCreated++;
        } catch (err) {
            // Ignorar erros de tabela já existente ou DDL inválido
            if (!err.message.includes('already exists')) {
                console.warn(`[MIGRATION] ⚠️ Erro ao criar tabela: ${err.message.substring(0, 100)}`);
            }
        }
    }

    const elapsed = Date.now() - startTime;
    console.log(`[MIGRATION] ✅ Migrações concluídas: ${tablesCreated} tabelas verificadas em ${elapsed}ms`);
}

module.exports = { runMigrations };
