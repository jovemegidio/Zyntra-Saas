/**
 * PCP Domain Module: Editor de Templates (CRUD, export/import, customizacao)
 * Extraido de pcp-routes.js em 10/03/2026
 * Padrao Mixin: registra rotas no router compartilhado do PCP
 * @module routes/pcp/templates-routes
 */

module.exports = function registerTemplatesRoutes(router, deps) {
    const { pool, authenticateToken, authorizeAdmin } = deps;

    const path = require('path');
    const multer = require('multer');
    const upload = multer({ dest: path.join(__dirname, '..', '..', 'uploads'), limits: { fileSize: 10 * 1024 * 1024 } });

    // SISTEMA DE TEMPLATES AVANÇADO
    const AdvancedTemplateManager = require('../../scripts/advanced-template-manager.js');
    const templateManager = new AdvancedTemplateManager();

    // Servir editor de templates
    router.get('/template-editor', (req, res) => {
        res.sendFile(path.join(__dirname, '..', '..', 'public', 'template-editor', 'index.html'));
    });

    // API para listar templates
    router.get('/api/templates/list', authenticateToken, async (req, res) => {
        try {
            const filters = {
                type: req.query.type,
                company: req.query.company,
                department: req.query.department
            };

            const templates = await templateManager.listTemplates(filters);

            res.json({
                success: true,
                templates,
                count: templates.length
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    // API para obter detalhes de um template
    router.get('/api/templates/:id', authenticateToken, async (req, res) => {
        try {
            const template = await templateManager.getTemplate(req.params.id);

            res.json({
                success: true,
                template
            });
        } catch (error) {
            res.status(404).json({
                success: false,
                error: error.message
            });
        }
    });

    // API para criar novo template
    router.post('/api/templates/create', authenticateToken, authorizeAdmin, async (req, res) => {
        try {
            const templateInfo = req.body;
            const templateId = await templateManager.registerTemplate(templateInfo);

            res.json({
                success: true,
                templateId,
                message: 'Template criado com sucesso'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    // API para atualizar template
    router.post('/api/templates/update', authenticateToken, authorizeAdmin, async (req, res) => {
        try {
            const templateData = req.body;

            if (!templateData.id) {
                return res.status(400).json({
                    success: false,
                    error: 'ID do template é obrigatório'
                });
            }

            // Atualizar template existente
            const template = await templateManager.getTemplate(templateData.id);
            Object.assign(template, templateData);

            await templateManager.saveTemplateConfig();

            res.json({
                success: true,
                message: 'Template atualizado com sucesso'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    // API para criar template personalizado
    router.post('/api/templates/customize', authenticateToken, async (req, res) => {
        try {
            const { baseTemplateId, customizations, userInfo } = req.body;

            const customTemplateId = await templateManager.createCustomTemplate(
                baseTemplateId,
                customizations,
                userInfo
            );

            res.json({
                success: true,
                customTemplateId,
                message: 'Template personalizado criado com sucesso'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    // API para definir template padrão
    router.post('/api/templates/set-default', authenticateToken, authorizeAdmin, async (req, res) => {
        try {
            const { templateId, templateType } = req.body;

            await templateManager.setDefaultTemplate(templateId, templateType);

            res.json({
                success: true,
                message: 'Template padrão definido com sucesso'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    // API para gerar Excel com template específico
    router.post('/api/templates/generate-excel', authenticateToken, async (req, res) => {
        try {
            const { templateId, data } = req.body;

            const workbook = await templateManager.generateExcelWithTemplate(templateId, data);

            // Gerar nome do arquivo
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const fileName = `documento_${templateId}_${timestamp}.xlsx`;
            const filePath = path.join(__dirname, 'temp_excel', fileName);

            // Salvar arquivo
            await workbook.xlsx.writeFile(filePath);

            // Ler e enviar arquivo
            const fileBuffer = await fs.promises.readFile(filePath);

            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Length', fileBuffer.length);

            res.send(fileBuffer);

            // Limpar arquivo temporário
            setTimeout(() => {
                fs.promises.unlink(filePath).catch(console.error);
            }, 5000);

        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    // API para obter estatísticas de templates
    router.get('/api/templates/stats', authenticateToken, async (req, res) => {
        try {
            const stats = await templateManager.getUsageStats();

            res.json({
                success: true,
                stats
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    // API para exportar template
    router.get('/api/templates/:id/export', authenticateToken, async (req, res) => {
        try {
            const templateConfig = await templateManager.exportTemplateConfig(req.params.id);

            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', `attachment; filename="template-${req.params.id}.json"`);

            res.json(templateConfig);
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    // API para importar template
    // SECURITY: Requer autenticação de administrador para import de arquivos
    router.post('/api/templates/import', authenticateToken, authorizeAdmin, upload.single('templateFile'), async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    error: 'Arquivo de template é obrigatório'
                });
            }

            const templateConfig = JSON.parse(req.file.buffer.toString());
            const newFilePath = path.join(__dirname, '..', '..', 'templates', 'custom', req.file.originalname);

            const templateId = await templateManager.importTemplate(templateConfig, newFilePath);

            res.json({
                success: true,
                templateId,
                message: 'Template importado com sucesso'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });


};
