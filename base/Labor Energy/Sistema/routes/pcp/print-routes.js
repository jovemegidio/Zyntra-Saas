/**
 * PCP Domain Module: Sistema de Impressao (fila, impressoras, configuracoes)
 * Extraido de pcp-routes.js em 10/03/2026
 * Padrao Mixin: registra rotas no router compartilhado do PCP
 * @module routes/pcp/print-routes
 */

module.exports = function registerPrintRoutes(router, deps) {
    const { pool, authenticateToken, authorizeAdmin } = deps;

    const path = require('path');
    const multer = require('multer');
    const upload = multer({ dest: path.join(__dirname, '..', '..', 'uploads'), limits: { fileSize: 10 * 1024 * 1024 } });

    // =================================================================
    // ROTAS DA API DE IMPRESSÃO
    // =================================================================

    // Obter fila de impressão
    // SECURITY: Requer autenticação
    router.get('/api/print/queue', authenticateToken, async (req, res) => {
        try {
            const autoPrintSystem = require('../../scripts/auto-print-system');
            const queue = await autoPrintSystem.getQueue();

            res.json({
                success: true,
                queue: queue
            });
        } catch (error) {
            console.error('❌ Erro ao obter fila de impressão:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    // Obter histórico de impressões
    // SECURITY: Requer autenticação
    router.get('/api/print/queue/history', authenticateToken, async (req, res) => {
        try {
            const autoPrintSystem = require('../../scripts/auto-print-system');
            const history = await autoPrintSystem.getHistory();

            res.json({
                success: true,
                history: history
            });
        } catch (error) {
            console.error('❌ Erro ao obter histórico:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    // Obter impressoras disponíveis (SECURITY: Added authenticateToken)
    router.get('/api/print/printers', authenticateToken, async (req, res) => {
        try {
            const autoPrintSystem = require('../../scripts/auto-print-system');
            const printers = await autoPrintSystem.detectPrinters();

            res.json({
                success: true,
                printers: printers
            });
        } catch (error) {
            console.error('❌ Erro ao obter impressoras:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    // Detectar impressoras (SECURITY: Added authenticateToken)
    router.post('/api/print/printers/detect', authenticateToken, async (req, res) => {
        try {
            const autoPrintSystem = require('../../scripts/auto-print-system');
            const printers = await autoPrintSystem.detectPrinters();

            res.json({
                success: true,
                count: printers.length,
                printers: printers
            });
        } catch (error) {
            console.error('❌ Erro ao detectar impressoras:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    // Adicionar job à fila de impressão
    // SECURITY: Requer autenticação
    router.post('/api/print/add', authenticateToken, upload.single('file'), async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    error: 'Nenhum arquivo fornecido'
                });
            }

            const settings = JSON.parse(req.body.settings || '{}');
            const autoPrintSystem = require('../../scripts/auto-print-system');

            const job = await autoPrintSystem.addToQueue(req.file.path, {
                printer: settings.printer,
                copies: settings.copies || 1,
                paperSize: settings.paperSize || 'A4',
                orientation: settings.orientation || 'portrait',
                colorMode: settings.colorMode || 'color',
                priority: settings.priority || 'normal',
                metadata: {
                    originalName: req.file.originalname,
                    documentName: req.file.originalname,
                    fileSize: req.file.size,
                    mimeType: req.file.mimetype
                }
            });

            res.json({
                success: true,
                jobId: job.id,
                message: 'Arquivo adicionado à fila de impressão'
            });
        } catch (error) {
            console.error('❌ Erro ao adicionar à fila:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    // Cancelar job de impressão
    // SECURITY: Requer autenticação
    router.post('/api/print/cancel', authenticateToken, async (req, res) => {
        try {
            const { jobId } = req.body;

            if (!jobId) {
                return res.status(400).json({
                    success: false,
                    error: 'ID do job não fornecido'
                });
            }

            const autoPrintSystem = require('../../scripts/auto-print-system');
            const result = await autoPrintSystem.cancelJob(jobId);

            res.json({
                success: true,
                cancelled: result
            });
        } catch (error) {
            console.error('❌ Erro ao cancelar job:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    // Limpar fila de impressão
    // SECURITY: Requer autenticação de administrador
    router.post('/api/print/queue/clear', authenticateToken, authorizeAdmin, async (req, res) => {
        try {
            const autoPrintSystem = require('../../scripts/auto-print-system');
            const result = await autoPrintSystem.clearQueue();

            res.json({
                success: true,
                cancelledCount: result.cancelledCount
            });
        } catch (error) {
            console.error('❌ Erro ao limpar fila:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    // Obter estatísticas de impressão
    router.get('/api/print/stats', async (req, res) => {
        try {
            const autoPrintSystem = require('../../scripts/auto-print-system');
            const stats = await autoPrintSystem.getStatistics();

            res.json({
                success: true,
                stats: stats
            });
        } catch (error) {
            console.error('❌ Erro ao obter estatísticas:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    // Definir impressora padrão
    // 🔐 SECURITY AUDIT: Added authenticateToken - system settings require auth
    router.post('/api/print/settings/default-printer', authenticateToken, async (req, res) => {
        try {
            const { printerName } = req.body;

            if (!printerName) {
                return res.status(400).json({
                    success: false,
                    error: 'Nome da impressora não fornecido'
                });
            }

            const autoPrintSystem = require('../../scripts/auto-print-system');
            const result = await autoPrintSystem.setDefaultPrinter(printerName);

            res.json({
                success: true,
                defaultPrinter: result
            });
        } catch (error) {
            console.error('❌ Erro ao definir impressora padrão:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    // Atualizar configurações do sistema de impressão
    // 🔐 SECURITY AUDIT: Added authenticateToken
    router.post('/api/print/settings', authenticateToken, async (req, res) => {
        try {
            const settings = req.body;
            const autoPrintSystem = require('../../scripts/auto-print-system');
            const result = await autoPrintSystem.updateSettings(settings);

            res.json({
                success: true,
                settings: result
            });
        } catch (error) {
            console.error('❌ Erro ao atualizar configurações:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });


};
