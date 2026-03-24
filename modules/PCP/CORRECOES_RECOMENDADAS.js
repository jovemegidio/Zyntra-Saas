// CORREÇÕES PARA O SERVIDOR PCP
// =================================

// 1. ADICIONAR NO INÍCIO DO server_pcp.js (após as importações)

// Sistema de logs melhorado
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const logger = {
    debug: LOG_LEVEL === 'debug' ? console.log : () => {},
    info: console.log,
    warn: console.warn,
    error: console.error
};

// Tratamento global de erros para evitar crashes
process.on('uncaughtException', (err) => {
    logger.error('❌ Erro não tratado capturado:', err.message);
    logger.error('Stack:', err.stack);
    // não parar o servidor, apenas logar
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('❌ Promise rejeitada capturada:', reason);
    logger.error('Promise:', promise);
});

// 2. SUBSTITUIR console.log por logger nos locais críticos
// Exemplo:
// console.log('[LOGIN] attempt...') → logger.debug('[LOGIN] attempt...')
// console.error('Erro...') → logger.error('Erro...')

// 3. MELHORAR MIDDLEWARE DE ERRO GLOBAL
app.use((err, req, res, next) => {
    logger.error('❌ Erro global capturado:', err.message);
    logger.error('URL:', req.url);
    logger.error('Method:', req.method);
    logger.error('Stack:', err.stack);
    
    if (req.isApi) {
        return res.status(500).json({ 
            message: 'Erro interno no servidor', 
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
    res.status(500).send('Erro interno no servidor');
});

// 4. ADICIONAR TIMEOUT NAS ROTAS LONGAS
const timeoutMiddleware = (timeout = 30000) => {
    return (req, res, next) => {
        req.setTimeout(timeout, () => {
            if (!res.headersSent) {
                res.status(408).json({ message: 'Timeout da requisição' });
            }
        });
        next();
    };
};

// Usar em rotas que geram Excel/PDF
app.use('/api/pcp/ordem-producao/excel', timeoutMiddleware(60000));
app.use('/api/pcp/export/*', timeoutMiddleware(60000));

// 5. VALIDAÇÃO DE ENTRADA MAIS ROBUSTA
const validateRequired = (fields) => {
    return (req, res, next) => {
        const missing = [];
        for (const field of fields) {
            if (!req.body[field]) {
                missing.push(field);
            }
        }
        if (missing.length > 0) {
            return res.status(400).json({
                message: `Campos obrigatórios ausentes: ${missing.join(', ')}`
            });
        }
        next();
    };
};

// 6. HEALTH CHECK MAIS DETALHADO
app.get('/health', async (req, res) => {
    try {
        const health = {
            status: 'ok',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            pid: process.pid
        };
        
        // Testar banco de dados
        try {
            await db.query('SELECT 1');
            health.database = 'connected';
        } catch (e) {
            health.database = 'disconnected';
            health.status = 'warning';
        }
        
        res.json(health);
    } catch (err) {
        res.status(500).json({ status: 'error', error: err.message });
    }
});

// 7. REMOVER CÓDIGO DUPLICADO
// No server_pcp.js, remover uma das implementações das rotas:
// - /api/auth/verify-email
// - /api/auth/verify-user-data  
// - /api/auth/change-password
// (Manter apenas uma implementAção de cada)


