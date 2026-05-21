/**
 * RHiD Browser Sync - Rotas Internas (Developer Only)
 * 
 * Rotas OCULTAS para controlar a sincronização via browser com RHiD Cloud.
 * Todas protegidas por token de desenvolvedor e/ou IP whitelist.
 * 
 * Endpoints:
 *   GET  /api/dev/rhid-sync/status          - Status do serviço
 *   POST /api/dev/rhid-sync/start           - Iniciar browser + processador
 *   POST /api/dev/rhid-sync/stop            - Parar browser + processador
 *   POST /api/dev/rhid-sync/login           - Testar login no RHiD
 *   POST /api/dev/rhid-sync/discovery       - Discovery mode (mapear interface)
 *   POST /api/dev/rhid-sync/update-photo    - Forçar update de foto
 *   POST /api/dev/rhid-sync/update-marcacao - Forçar update de marcação
 *   POST /api/dev/rhid-sync/delete-marcacao - Forçar exclusão de marcação
 *   GET  /api/dev/rhid-sync/queue           - Ver fila de tarefas
 *   GET  /api/dev/rhid-sync/screenshots     - Listar screenshots
 *   GET  /api/dev/rhid-sync/screenshots/:f  - Ver screenshot específico
 *   GET  /api/dev/rhid-sync/logs            - Ver logs recentes
 * 
 * @internal Developer-only — NÃO expor ao usuário final
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

// Importar serviço
let rhidSync;
try {
    rhidSync = require('../services/rhid-browser-sync');
} catch (e) {
    console.error('[RHiD-Sync-Routes] Serviço não carregado:', e.message);
}

// ==================== MIDDLEWARE DE SEGURANÇA ====================

/**
 * Middleware: Apenas desenvolvedores podem acessar
 * Verifica token de dev OU IP local OU header especial
 */
function devOnly(req, res, next) {
    // 1. Verificar header secreto
    const devToken = req.headers['x-dev-token'] || req.query.dev_token;
    if (devToken === 'aluforce-dev-2026-rhid-sync') {
        return next();
    }

    // 2. Verificar se é requisição local (localhost ou IPs privados)
    const ip = req.ip || req.connection.remoteAddress || '';
    const localIps = ['127.0.0.1', '::1', '::ffff:127.0.0.1', 'localhost'];
    if (localIps.includes(ip)) {
        return next();
    }

    // 3. Verificar se o usuário logado é admin
    if (req.user && (req.user.role === 'admin' || req.user.tipo === 'admin' || req.user.perfil === 'Administrador')) {
        return next();
    }

    // 4. Verificar via autenticação JWT (se existir middleware auth)
    const authHeader = req.headers.authorization;
    if (authHeader) {
        try {
            const jwt = require('jsonwebtoken');
            const token = authHeader.replace('Bearer ', '');
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'aluforce-secret-key-2024');
            if (decoded && (decoded.role === 'admin' || decoded.tipo === 'admin')) {
                req.user = decoded;
                return next();
            }
        } catch (e) { /* not valid */ }
    }

    res.status(403).json({ 
        error: 'Acesso restrito a desenvolvedores',
        hint: 'Envie header X-Dev-Token ou faça login como admin' 
    });
}

// Aplicar middleware em todas as rotas
router.use(devOnly);

// ==================== STATUS ====================

router.get('/status', (req, res) => {
    if (!rhidSync) {
        return res.json({ error: 'Serviço não carregado', available: false });
    }
    res.json({ available: true, ...rhidSync.getStatus() });
});

// ==================== LIFECYCLE ====================

router.post('/start', async (req, res) => {
    if (!rhidSync) return res.status(500).json({ error: 'Serviço não carregado' });

    try {
        const browserOk = await rhidSync.init();
        if (!browserOk) {
            return res.json({ success: false, message: 'Falha ao iniciar browser. Playwright está instalado?' });
        }

        // Criar tabela de fila se necessário
        await rhidSync.createSyncTable();

        // Iniciar processador de fila
        rhidSync.startQueueProcessor();

        res.json({ 
            success: true, 
            message: 'Serviço RHiD Browser Sync iniciado',
            status: rhidSync.getStatus()
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Erro interno no servidor. Tente novamente.' });
    }
});

router.post('/stop', async (req, res) => {
    if (!rhidSync) return res.status(500).json({ error: 'Serviço não carregado' });

    try {
        rhidSync.stopQueueProcessor();
        await rhidSync.shutdown();
        res.json({ success: true, message: 'Serviço RHiD Browser Sync encerrado' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Erro interno no servidor. Tente novamente.' });
    }
});

// ==================== LOGIN & DISCOVERY ====================

router.post('/login', async (req, res) => {
    if (!rhidSync) return res.status(500).json({ error: 'Serviço não carregado' });

    try {
        await rhidSync.init();
        await rhidSync.login(true); // force re-login
        res.json({ 
            success: true, 
            message: 'Login no RHiD realizado com sucesso',
            status: rhidSync.getStatus()
        });
    } catch (error) {
        res.json({ success: false, message: 'Falha no login: ' + error.message });
    }
});

router.post('/discovery', async (req, res) => {
    if (!rhidSync) return res.status(500).json({ error: 'Serviço não carregado' });

    try {
        const results = await rhidSync.discoveryMode();
        res.json({ 
            success: true, 
            message: 'Discovery mode concluído',
            results: results,
            screenshots: rhidSync.getScreenshots()
        });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
});

// ==================== OPERAÇÕES MANUAIS ====================

router.post('/update-photo', async (req, res) => {
    if (!rhidSync) return res.status(500).json({ error: 'Serviço não carregado' });

    const { employeeName, employeePis, photoPath, queue } = req.body;

    if (!employeeName && !employeePis) {
        return res.status(400).json({ error: 'employeeName ou employeePis é obrigatório' });
    }
    if (!photoPath) {
        return res.status(400).json({ error: 'photoPath é obrigatório (caminho absoluto da foto)' });
    }

    if (queue) {
        // Enfileirar (processamento assíncrono)
        const taskId = rhidSync.queuePhotoUpdate(employeeName, employeePis, photoPath);
        return res.json({ success: true, queued: true, taskId: taskId });
    }

    // Execução imediata
    try {
        await rhidSync.init();
        const result = await rhidSync.updateEmployeePhoto(employeeName, employeePis, photoPath);
        res.json(result);
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
});

router.post('/update-marcacao', async (req, res) => {
    if (!rhidSync) return res.status(500).json({ error: 'Serviço não carregado' });

    const { employeeName, employeePis, date, oldTime, newTime, queue } = req.body;

    if (!employeeName && !employeePis) {
        return res.status(400).json({ error: 'employeeName ou employeePis é obrigatório' });
    }
    if (!date || !oldTime || !newTime) {
        return res.status(400).json({ error: 'date, oldTime e newTime são obrigatórios' });
    }

    if (queue) {
        const taskId = rhidSync.queueMarcacaoEdit(employeeName, employeePis, date, oldTime, newTime);
        return res.json({ success: true, queued: true, taskId: taskId });
    }

    try {
        await rhidSync.init();
        const result = await rhidSync.updateMarcacao(employeeName, employeePis, date, oldTime, newTime);
        res.json(result);
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
});

router.post('/delete-marcacao', async (req, res) => {
    if (!rhidSync) return res.status(500).json({ error: 'Serviço não carregado' });

    const { employeeName, employeePis, date, time, queue } = req.body;

    if (!employeeName && !employeePis) {
        return res.status(400).json({ error: 'employeeName ou employeePis é obrigatório' });
    }
    if (!date || !time) {
        return res.status(400).json({ error: 'date e time são obrigatórios' });
    }

    if (queue) {
        const taskId = rhidSync.queueMarcacaoDelete(employeeName, employeePis, date, time);
        return res.json({ success: true, queued: true, taskId: taskId });
    }

    try {
        await rhidSync.init();
        const result = await rhidSync.deleteMarcacao(employeeName, employeePis, date, time);
        res.json(result);
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
});

// ==================== FILA ====================

router.get('/queue', (req, res) => {
    if (!rhidSync) return res.status(500).json({ error: 'Serviço não carregado' });
    res.json({ 
        queue: rhidSync.getQueue(),
        status: rhidSync.getStatus()
    });
});

// ==================== SCREENSHOTS ====================

router.get('/screenshots', (req, res) => {
    if (!rhidSync) return res.status(500).json({ error: 'Serviço não carregado' });
    res.json({ screenshots: rhidSync.getScreenshots() });
});

router.get('/screenshots/:filename', (req, res) => {
    const screenshotsDir = path.join(__dirname, '..', 'logs', 'rhid-sync-screenshots');
    const filePath = path.join(screenshotsDir, req.params.filename);

    // Security: prevent path traversal
    if (!filePath.startsWith(screenshotsDir)) {
        return res.status(403).json({ error: 'Acesso negado' });
    }

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Screenshot não encontrado' });
    }

    res.sendFile(filePath);
});

// ==================== LOGS ====================

router.get('/logs', (req, res) => {
    const logFile = path.join(__dirname, '..', 'logs', 'rhid-browser-sync.log');
    if (!fs.existsSync(logFile)) {
        return res.json({ logs: [], message: 'Arquivo de log não encontrado' });
    }

    try {
        const lines = parseInt(req.query.lines) || 100;
        const content = fs.readFileSync(logFile, 'utf8');
        const allLines = content.trim().split('\n');
        const lastLines = allLines.slice(-lines);

        res.json({ 
            logs: lastLines,
            total: allLines.length,
            showing: lastLines.length
        });
    } catch (error) {
        res.status(500).json({ error: 'Erro interno no servidor. Tente novamente.' });
    }
});

// ==================== NAVIGATE (DEBUG) ====================

router.post('/navigate-employees', async (req, res) => {
    if (!rhidSync) return res.status(500).json({ error: 'Serviço não carregado' });

    try {
        await rhidSync.init();
        const result = await rhidSync.navigateToEmployees();
        res.json({ 
            success: result, 
            screenshots: rhidSync.getScreenshots().slice(0, 5) 
        });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
});

router.post('/navigate-marcacoes', async (req, res) => {
    if (!rhidSync) return res.status(500).json({ error: 'Serviço não carregado' });

    try {
        await rhidSync.init();
        const result = await rhidSync.navigateToMarcacoes();
        res.json({ 
            success: result, 
            screenshots: rhidSync.getScreenshots().slice(0, 5) 
        });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
});

module.exports = router;
