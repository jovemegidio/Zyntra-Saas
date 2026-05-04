/**
 * INTEGRAÇÃO BANCÁRIA API ROUTES
 * Gerenciamento de credenciais de API bancária, testes de conexão,
 * configurações de boleto, CNAB remessa/retorno e webhooks
 * @module routes/integracao-bancaria
 */
const express = require('express');
const crypto = require('crypto');

// Chave para criptografia dos secrets (usar variável de ambiente em produção)
const ENCRYPT_KEY = process.env.INTEGRACAO_ENCRYPT_KEY || 'aluforce-integracao-bancaria-2026-key!';
const ENCRYPT_IV_LENGTH = 16;

function encrypt(text) {
    if (!text) return '';
    const key = crypto.scryptSync(ENCRYPT_KEY, 'salt', 32);
    const iv = crypto.randomBytes(ENCRYPT_IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
}

function decrypt(text) {
    if (!text || !text.includes(':')) return '';
    try {
        const key = crypto.scryptSync(ENCRYPT_KEY, 'salt', 32);
        const parts = text.split(':');
        const iv = Buffer.from(parts.shift(), 'hex');
        const encrypted = parts.join(':');
        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch {
        return '';
    }
}

module.exports = function createIntegracaoBancariaRoutes(deps) {
    const { pool, authenticateToken } = deps;
    const router = express.Router();

    // ============================================================
    // Garantir que a tabela existe
    // ============================================================
    async function ensureTable() {
        try {
            await pool.query(`
                CREATE TABLE IF NOT EXISTS integracoes_bancarias (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    banco_id INT NOT NULL,
                    provedor VARCHAR(50),
                    ambiente VARCHAR(20) DEFAULT 'sandbox',
                    client_id VARCHAR(255),
                    client_secret_encrypted TEXT,
                    url_base VARCHAR(500),
                    url_auth VARCHAR(500),
                    access_token TEXT,
                    refresh_token TEXT,
                    token_expires_at DATETIME,
                    certificado_path VARCHAR(500),
                    certificado_senha_encrypted VARCHAR(500),
                    sync_automatico TINYINT(1) DEFAULT 0,
                    webhook_ativo TINYINT(1) DEFAULT 0,
                    webhook_secret VARCHAR(255),
                    escopos JSON,
                    status VARCHAR(20) DEFAULT 'desconectado',
                    ultima_sync DATETIME,
                    -- Boletos
                    boleto_carteira VARCHAR(20),
                    boleto_convenio VARCHAR(50),
                    boleto_variacao VARCHAR(20),
                    boleto_nosso_numero_inicio VARCHAR(30),
                    boleto_nosso_numero_proximo VARCHAR(30),
                    boleto_instrucao1 VARCHAR(255),
                    boleto_instrucao2 VARCHAR(255),
                    boleto_multa DECIMAL(5,2),
                    boleto_juros DECIMAL(5,2),
                    boleto_protesto INT DEFAULT 0,
                    boleto_registrado TINYINT(1) DEFAULT 1,
                    boleto_pix_qrcode TINYINT(1) DEFAULT 0,
                    -- CNAB
                    cnab_layout VARCHAR(20),
                    cnab_servico VARCHAR(50),
                    cnab_cod_transmissao VARCHAR(50),
                    cnab_seq_remessa INT DEFAULT 1,
                    cnab_auto_processar TINYINT(1) DEFAULT 0,
                    -- Timestamps
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    UNIQUE KEY uk_banco_id (banco_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            `);
        } catch (err) {
            console.error('[Integração Bancária] Erro ao criar tabela:', err.message);
        }
    }

    // Criar tabela na inicialização
    ensureTable();

    // ============================================================
    // GET - Buscar integração de um banco
    // ============================================================
    router.get('/:bancoId', authenticateToken, async (req, res) => {
        try {
            const [rows] = await pool.query(
                'SELECT * FROM integracoes_bancarias WHERE banco_id = ?',
                [req.params.bancoId]
            );

            if (rows.length === 0) {
                return res.json({ success: true, integracao: null });
            }

            const integracao = rows[0];
            // Descriptografar client_secret para exibição mascarada
            if (integracao.client_secret_encrypted) {
                const decrypted = decrypt(integracao.client_secret_encrypted);
                // Retornar apenas parte do secret por segurança
                integracao.client_secret = decrypted ? ('•'.repeat(Math.max(0, decrypted.length - 4)) + decrypted.slice(-4)) : '';
                delete integracao.client_secret_encrypted;
            }
            // Não enviar tokens
            delete integracao.access_token;
            delete integracao.refresh_token;
            delete integracao.certificado_senha_encrypted;

            res.json({ success: true, integracao });
        } catch (err) {
            console.error('[Integração Bancária] Erro ao buscar:', err);
            res.status(500).json({ success: false, error: 'Erro ao buscar integração' });
        }
    });

    // ============================================================
    // POST - Salvar/atualizar integração de um banco
    // ============================================================
    router.post('/', authenticateToken, async (req, res) => {
        try {
            const data = req.body;
            const bancoId = data.banco_id;

            if (!bancoId) {
                return res.status(400).json({ success: false, error: 'banco_id é obrigatório' });
            }

            // Verificar se já existe
            const [existing] = await pool.query(
                'SELECT id, client_secret_encrypted FROM integracoes_bancarias WHERE banco_id = ?',
                [bancoId]
            );

            // Criptografar client_secret se fornecido (e não for mascarado)
            let clientSecretEncrypted = existing.length > 0 ? existing[0].client_secret_encrypted : '';
            if (data.client_secret && !data.client_secret.startsWith('•')) {
                clientSecretEncrypted = encrypt(data.client_secret);
            }

            // Gerar webhook secret se necessário
            const webhookSecret = existing.length > 0 && existing[0].webhook_secret 
                ? undefined  // manter existente
                : crypto.randomBytes(32).toString('hex');

            const campos = {
                banco_id: bancoId,
                provedor: data.provedor || null,
                ambiente: data.ambiente || 'sandbox',
                client_id: data.client_id || null,
                client_secret_encrypted: clientSecretEncrypted,
                url_base: data.url_base || null,
                url_auth: data.url_auth || null,
                sync_automatico: data.sync_automatico ? 1 : 0,
                webhook_ativo: data.webhook_ativo ? 1 : 0,
                escopos: data.escopos || null,
                // Boletos
                boleto_carteira: data.boleto_carteira || null,
                boleto_convenio: data.boleto_convenio || null,
                boleto_variacao: data.boleto_variacao || null,
                boleto_nosso_numero_inicio: data.boleto_nosso_numero_inicio || null,
                boleto_nosso_numero_proximo: data.boleto_nosso_numero_proximo || null,
                boleto_instrucao1: data.boleto_instrucao1 || null,
                boleto_instrucao2: data.boleto_instrucao2 || null,
                boleto_multa: data.boleto_multa ? parseFloat(data.boleto_multa) : null,
                boleto_juros: data.boleto_juros ? parseFloat(data.boleto_juros) : null,
                boleto_protesto: data.boleto_protesto ? parseInt(data.boleto_protesto) : 0,
                boleto_registrado: data.boleto_registrado ? 1 : 0,
                boleto_pix_qrcode: data.boleto_pix_qrcode ? 1 : 0,
                // CNAB
                cnab_layout: data.cnab_layout || null,
                cnab_servico: data.cnab_servico || null,
                cnab_cod_transmissao: data.cnab_cod_transmissao || null,
                cnab_seq_remessa: data.cnab_seq_remessa ? parseInt(data.cnab_seq_remessa) : 1,
                cnab_auto_processar: data.cnab_auto_processar ? 1 : 0,
            };

            if (webhookSecret) {
                campos.webhook_secret = webhookSecret;
            }

            if (existing.length > 0) {
                // UPDATE
                const setClauses = Object.keys(campos).map(k => `${k} = ?`).join(', ');
                const values = Object.values(campos);
                values.push(bancoId);
                await pool.query(
                    `UPDATE integracoes_bancarias SET ${setClauses} WHERE banco_id = ?`,
                    values
                );
            } else {
                // INSERT
                const keys = Object.keys(campos).join(', ');
                const placeholders = Object.keys(campos).map(() => '?').join(', ');
                await pool.query(
                    `INSERT INTO integracoes_bancarias (${keys}) VALUES (${placeholders})`,
                    Object.values(campos)
                );
            }

            res.json({ success: true, message: 'Integração salva com sucesso' });
        } catch (err) {
            console.error('[Integração Bancária] Erro ao salvar:', err);
            res.status(500).json({ success: false, error: 'Erro ao salvar integração' });
        }
    });

    // ============================================================
    // POST - Testar conexão com API bancária
    // ============================================================
    router.post('/testar', authenticateToken, async (req, res) => {
        try {
            const { provedor, client_id, client_secret, url_base, url_auth, ambiente } = req.body;

            if (!client_id || !client_secret) {
                return res.status(400).json({ success: false, error: 'Client ID e Client Secret são obrigatórios' });
            }

            // Simular teste de conexão OAuth2
            // Em produção, faria a chamada real ao endpoint de token
            let testResult = { success: false, message: '' };

            if (url_auth && provedor !== 'custom') {
                // Tentar obter token OAuth2
                try {
                    const https = require('https');
                    const http = require('http');
                    const url = new URL(url_auth);
                    const isHttps = url.protocol === 'https:';
                    const lib = isHttps ? https : http;

                    const postData = `grant_type=client_credentials&client_id=${encodeURIComponent(client_id)}&client_secret=${encodeURIComponent(client_secret)}`;

                    const tokenResult = await new Promise((resolve, reject) => {
                        const options = {
                            hostname: url.hostname,
                            port: url.port || (isHttps ? 443 : 80),
                            path: url.pathname + url.search,
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/x-www-form-urlencoded',
                                'Content-Length': Buffer.byteLength(postData)
                            },
                            timeout: 10000,
                            rejectUnauthorized: ambiente === 'producao'
                        };

                        const req = lib.request(options, (response) => {
                            let data = '';
                            response.on('data', chunk => data += chunk);
                            response.on('end', () => {
                                try {
                                    const parsed = JSON.parse(data);
                                    resolve({
                                        statusCode: response.statusCode,
                                        data: parsed
                                    });
                                } catch {
                                    resolve({ statusCode: response.statusCode, data: data });
                                }
                            });
                        });

                        req.on('error', reject);
                        req.on('timeout', () => reject(new Error('Timeout de conexão (10s)')));
                        req.write(postData);
                        req.end();
                    });

                    if (tokenResult.statusCode >= 200 && tokenResult.statusCode < 300) {
                        testResult = {
                            success: true,
                            message: `Autenticação OK • Token obtido com sucesso (${provedor.toUpperCase()}, ${ambiente})`
                        };

                        // Salvar token se tiver banco_id
                        if (req.body.banco_id && tokenResult.data?.access_token) {
                            const tokenExpires = tokenResult.data.expires_in 
                                ? new Date(Date.now() + tokenResult.data.expires_in * 1000) 
                                : null;
                            await pool.query(
                                `UPDATE integracoes_bancarias SET 
                                    access_token = ?, refresh_token = ?, token_expires_at = ?, status = 'conectado'
                                WHERE banco_id = ?`,
                                [
                                    encrypt(tokenResult.data.access_token),
                                    tokenResult.data.refresh_token ? encrypt(tokenResult.data.refresh_token) : null,
                                    tokenExpires,
                                    req.body.banco_id
                                ]
                            );
                        }
                    } else {
                        testResult = {
                            success: false,
                            message: `HTTP ${tokenResult.statusCode}: ${typeof tokenResult.data === 'string' ? tokenResult.data : JSON.stringify(tokenResult.data?.error_description || tokenResult.data?.error || 'Credenciais inválidas')}`
                        };
                    }
                } catch (httpErr) {
                    testResult = {
                        success: false,
                        message: `Erro de conexão: ${httpErr.message}`
                    };
                }
            } else {
                // API sem OAuth2 (ex: Asaas, Pagar.me) - testar URL base
                if (url_base) {
                    try {
                        const https = require('https');
                        const http = require('http');
                        const url = new URL(url_base);
                        const isHttps = url.protocol === 'https:';
                        const lib = isHttps ? https : http;

                        const pingResult = await new Promise((resolve, reject) => {
                            const req = lib.get({
                                hostname: url.hostname,
                                port: url.port || (isHttps ? 443 : 80),
                                path: url.pathname,
                                headers: {
                                    'Authorization': `Bearer ${client_secret}`,
                                    'access_token': client_secret
                                },
                                timeout: 10000,
                                rejectUnauthorized: false
                            }, (response) => {
                                resolve({ statusCode: response.statusCode });
                            });
                            req.on('error', reject);
                            req.on('timeout', () => reject(new Error('Timeout')));
                        });

                        testResult = {
                            success: pingResult.statusCode < 500,
                            message: pingResult.statusCode < 500
                                ? `API acessível (HTTP ${pingResult.statusCode}) • ${provedor.toUpperCase()}`
                                : `API retornou erro ${pingResult.statusCode}`
                        };
                    } catch (err) {
                        testResult = { success: false, message: `Erro: ${err.message}` };
                    }
                } else {
                    // Sem URL para testar - validar apenas formato
                    testResult = {
                        success: true,
                        message: `Credenciais salvas (${provedor || 'custom'}). Configure a URL para teste real.`
                    };
                }
            }

            res.json(testResult);
        } catch (err) {
            console.error('[Integração Bancária] Erro no teste:', err);
            res.status(500).json({ success: false, error: 'Erro interno ao testar conexão' });
        }
    });

    // ============================================================
    // POST - Gerar arquivo de remessa CNAB
    // ============================================================
    router.post('/:bancoId/remessa', authenticateToken, async (req, res) => {
        try {
            const { bancoId } = req.params;
            const { layout } = req.body;

            // Buscar dados do banco
            const [bancos] = await pool.query('SELECT * FROM bancos WHERE id = ?', [bancoId]);
            if (bancos.length === 0) {
                return res.status(404).json({ success: false, error: 'Banco não encontrado' });
            }

            // Buscar config de integração
            const [configs] = await pool.query(
                'SELECT * FROM integracoes_bancarias WHERE banco_id = ?', [bancoId]
            );

            const banco = bancos[0];
            const config = configs[0] || {};
            const dataAtual = new Date();

            // Buscar movimentações pendentes de remessa
            const [movimentacoes] = await pool.query(
                `SELECT * FROM movimentacoes_bancarias 
                 WHERE banco_id = ? AND tipo = 'entrada' AND (cnab_enviado IS NULL OR cnab_enviado = 0)
                 ORDER BY data ASC LIMIT 100`,
                [bancoId]
            );

            let conteudo = '';

            if (layout === 'cnab240') {
                // CNAB 240 - Header do Arquivo
                const headerArquivo = [
                    (banco.codigo || '000').padStart(3, '0'),         // Código do banco
                    '0000',                                           // Lote
                    '0',                                              // Registro
                    ' '.repeat(9),                                    // Uso FEBRABAN
                    '2',                                              // Tipo inscrição (CNPJ)
                    '00000000000000',                                  // CNPJ
                    (config.cnab_cod_transmissao || '').padStart(20, '0'),
                    (banco.agencia || '').padStart(5, '0'),
                    ' ',
                    (banco.conta || '').padStart(12, '0'),
                    ' ',
                    ' '.repeat(1),
                    (banco.nome || '').padEnd(30, ' ').substring(0, 30),
                    'ALUFORCE ERP'.padEnd(30, ' '),
                    ' '.repeat(10),
                    '1',                                              // Código remessa
                    dataAtual.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, ''),
                    dataAtual.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(/:/g, ''),
                    (config.cnab_seq_remessa || 1).toString().padStart(6, '0'),
                    '103',                                            // Versão layout
                    '00000',
                    ' '.repeat(20),
                    ' '.repeat(20),
                    ' '.repeat(29),
                ].join('');
                conteudo += headerArquivo.padEnd(240, ' ') + '\r\n';

                // Detalhes simplificados
                movimentacoes.forEach((mov, i) => {
                    const detalhe = [
                        (banco.codigo || '000').padStart(3, '0'),
                        '0001',
                        '3',
                        (i + 1).toString().padStart(5, '0'),
                        'P',
                        ' ',
                        '01',
                        (banco.agencia || '').padStart(5, '0'),
                        ' ',
                        (banco.conta || '').padStart(12, '0'),
                        ' ',
                        ' ',
                        (mov.id || '').toString().padStart(20, '0'),
                        (config.boleto_carteira || '1').padStart(1, ' '),
                        '1',
                        '2',
                        (mov.numero_documento || mov.id || '').toString().padStart(15, '0'),
                        (mov.data ? new Date(mov.data).toLocaleDateString('pt-BR').replace(/\//g, '') : '00000000'),
                        Math.abs(mov.valor * 100).toFixed(0).padStart(15, '0'),
                    ].join('');
                    conteudo += detalhe.padEnd(240, ' ') + '\r\n';
                });

                // Trailer
                conteudo += (banco.codigo || '000').padStart(3, '0') + '9999' + '9' + ' '.repeat(233) + '\r\n';
            } else {
                // CNAB 400 - Header
                conteudo += '0' + '1' + 'REMESSA' + '01' + 'COBRANCA'.padEnd(15, ' ');
                conteudo += (config.cnab_cod_transmissao || '').padStart(20, '0');
                conteudo += 'ALUFORCE ERP'.padEnd(30, ' ');
                conteudo += (banco.codigo || '000').padStart(3, '0');
                conteudo += (banco.nome || '').padEnd(15, ' ');
                conteudo += dataAtual.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '');
                conteudo += ' '.repeat(8);
                conteudo += 'MX';
                conteudo += (config.cnab_seq_remessa || 1).toString().padStart(7, '0');
                conteudo = conteudo.padEnd(400, ' ') + '\r\n';

                // Detalhes
                movimentacoes.forEach((mov, i) => {
                    let linha = '1'; // Tipo registro
                    linha += '02'; // Inscrição
                    linha += '00000000000000'; // CNPJ
                    linha += (config.cnab_cod_transmissao || '').padStart(20, '0');
                    linha += (mov.id || '').toString().padStart(25, '0');
                    linha += (mov.numero_documento || '').toString().padStart(10, '0');
                    linha += Math.abs(mov.valor * 100).toFixed(0).padStart(13, '0');
                    linha += (i + 2).toString().padStart(6, '0');
                    conteudo += linha.padEnd(400, ' ') + '\r\n';
                });

                // Trailer
                conteudo += '9' + ' '.repeat(393) + (movimentacoes.length + 2).toString().padStart(6, '0') + '\r\n';
            }

            // Atualizar sequencial
            if (config.id) {
                await pool.query(
                    'UPDATE integracoes_bancarias SET cnab_seq_remessa = cnab_seq_remessa + 1 WHERE id = ?',
                    [config.id]
                );
            }

            // Marcar movimentações como enviadas
            if (movimentacoes.length > 0) {
                const ids = movimentacoes.map(m => m.id);
                await pool.query(
                    'UPDATE movimentacoes_bancarias SET cnab_enviado = 1 WHERE id IN (?)',
                    [ids]
                );
            }

            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="REMESSA_${layout.toUpperCase()}_${dataAtual.toISOString().slice(0,10)}.txt"`);
            res.send(conteudo);
        } catch (err) {
            console.error('[Integração Bancária] Erro ao gerar remessa:', err);
            res.status(500).json({ success: false, error: 'Erro ao gerar arquivo de remessa' });
        }
    });

    // ============================================================
    // POST - Importar arquivo de retorno CNAB
    // ============================================================
    router.post('/retorno', authenticateToken, async (req, res) => {
        try {
            // Para upload de arquivo, usar multer ou receber como base64
            // Simplificado: receber conteúdo como texto
            const { banco_id, conteudo } = req.body;

            if (!banco_id) {
                return res.status(400).json({ success: false, error: 'banco_id é obrigatório' });
            }

            let processados = 0;

            // Se recebeu como arquivo via multipart, processar
            // Se recebeu como texto, parsear
            if (conteudo) {
                const linhas = conteudo.split('\n').filter(l => l.trim());
                
                for (const linha of linhas) {
                    // Ignorar header e trailer
                    if (linha.startsWith('0') || linha.startsWith('9')) continue;

                    // Extrair dados do retorno (simplificado)
                    try {
                        const nossoNumero = linha.substring(62, 82).trim();
                        const valorPago = parseFloat(linha.substring(253, 266)) / 100;
                        const dataPagamento = linha.substring(295, 303);

                        if (nossoNumero && valorPago > 0) {
                            // Tentar conciliar com movimentação existente
                            const [movs] = await pool.query(
                                `UPDATE movimentacoes_bancarias SET 
                                    cnab_retorno_processado = 1, 
                                    cnab_data_retorno = NOW()
                                WHERE banco_id = ? AND id = ?`,
                                [banco_id, parseInt(nossoNumero)]
                            );
                            if (movs.affectedRows > 0) processados++;
                        }
                    } catch {
                        // Ignorar linhas inválidas
                    }
                }
            }

            res.json({ 
                success: true, 
                message: `Retorno processado com sucesso`,
                processados 
            });
        } catch (err) {
            console.error('[Integração Bancária] Erro ao processar retorno:', err);
            res.status(500).json({ success: false, error: 'Erro ao processar arquivo de retorno' });
        }
    });

    // ============================================================
    // POST - Webhook para receber notificações do banco
    // ============================================================
    router.post('/webhook/banco/:bancoId', async (req, res) => {
        try {
            const { bancoId } = req.params;
            const payload = req.body;

            console.log(`[Webhook Bancário] Recebido para banco ${bancoId}:`, JSON.stringify(payload).substring(0, 500));

            // Verificar se a integração existe e webhook está ativo
            const [configs] = await pool.query(
                'SELECT * FROM integracoes_bancarias WHERE banco_id = ? AND webhook_ativo = 1',
                [bancoId]
            );

            if (configs.length === 0) {
                return res.status(404).json({ error: 'Webhook não configurado' });
            }

            // Processar diferentes tipos de webhook
            const tipo = payload.type || payload.event || payload.webhookType || '';

            if (tipo.includes('pix') || tipo.includes('PIX')) {
                // PIX recebido
                if (payload.pix && Array.isArray(payload.pix)) {
                    for (const pix of payload.pix) {
                        await pool.query(
                            `INSERT INTO movimentacoes_bancarias 
                                (banco_id, tipo, valor, data, descricao, categoria, numero_documento) 
                             VALUES (?, 'entrada', ?, NOW(), ?, 'PIX Recebido', ?)`,
                            [bancoId, pix.valor, `PIX de ${pix.pagador?.nome || 'N/A'}: ${pix.infoPagador || ''}`, pix.endToEndId || pix.txid]
                        );
                    }
                }
            } else if (tipo.includes('boleto') || tipo.includes('payment')) {
                // Boleto pago
                const valor = payload.value || payload.amount || payload.valor;
                const nossoNumero = payload.ourNumber || payload.nossoNumero || payload.externalReference;
                if (valor && nossoNumero) {
                    await pool.query(
                        `UPDATE movimentacoes_bancarias SET 
                            cnab_retorno_processado = 1, cnab_data_retorno = NOW()
                         WHERE banco_id = ? AND numero_documento = ?`,
                        [bancoId, nossoNumero]
                    );
                }
            }

            // Atualizar última sincronização
            await pool.query(
                'UPDATE integracoes_bancarias SET ultima_sync = NOW() WHERE banco_id = ?',
                [bancoId]
            );

            res.json({ received: true });
        } catch (err) {
            console.error('[Webhook Bancário] Erro:', err);
            res.status(500).json({ error: 'Erro ao processar webhook' });
        }
    });

    // ============================================================
    // DELETE - Remover integração de um banco
    // ============================================================
    router.delete('/:bancoId', authenticateToken, async (req, res) => {
        try {
            await pool.query('DELETE FROM integracoes_bancarias WHERE banco_id = ?', [req.params.bancoId]);
            res.json({ success: true, message: 'Integração removida' });
        } catch (err) {
            console.error('[Integração Bancária] Erro ao remover:', err);
            res.status(500).json({ success: false, error: 'Erro ao remover integração' });
        }
    });

    return router;
};
