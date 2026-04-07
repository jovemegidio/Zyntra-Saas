// =====================================================
// ROTAS API - DISCORD BOT ATUALIZAÇÕES
// Endpoints para gerenciar atualizações via API
// =====================================================

'use strict';

const express = require('express');

/**
 * Factory para criar rotas do Discord Bot
 * @param {Object} deps - Dependências injetadas
 * @param {Object} deps.pool - Pool MySQL
 * @param {Function} deps.authenticateToken - Middleware de autenticação
 * @param {Function} deps.authorizeAdmin - Middleware de autorização admin
 */
function createDiscordRoutes({ authenticateToken, authorizeAdmin }) {
    const router = express.Router();
    
    // Carrega o notifier (webhook-based, sem dependência de discord.js)
    let discordBot;
    try {
        discordBot = require('../services/discord-notifier');
        console.log('✅ [Discord Routes] Notifier (Webhook) carregado com sucesso');
    } catch (err) {
        console.warn('⚠️  [Discord Routes] Notifier não disponível:', err.message);
    }

    // =========================================================
    // GET /api/discord/status - Status do bot
    // =========================================================
    router.get('/status', authenticateToken, (req, res) => {
        if (!discordBot) {
            return res.json({ enabled: false, error: 'Bot não carregado' });
        }
        res.json(discordBot.getStatus());
    });

    // =========================================================
    // GET /api/discord/changelog - Lista atualizações
    // =========================================================
    router.get('/changelog', authenticateToken, (req, res) => {
        if (!discordBot) {
            return res.json({ success: false, error: 'Bot não carregado' });
        }
        
        const limit = parseInt(req.query.limit) || 20;
        const tipo = req.query.tipo || null;
        const modulo = req.query.modulo || null;
        
        let changelog = discordBot.getChangelog(Math.min(limit, 100));
        
        // Filtros opcionais
        if (tipo) {
            changelog = changelog.filter(c => c.tipo === tipo);
        }
        if (modulo) {
            changelog = changelog.filter(c => 
                c.modulo?.toLowerCase().includes(modulo.toLowerCase())
            );
        }
        
        res.json({
            success: true,
            total: changelog.length,
            data: changelog
        });
    });

    // =========================================================
    // POST /api/discord/atualizar - Publicar atualização manual
    // =========================================================
    router.post('/atualizar', authenticateToken, authorizeAdmin, async (req, res) => {
        if (!discordBot) {
            return res.status(503).json({ success: false, error: 'Bot não carregado' });
        }

        const { tipo, titulo, descricao, modulo, alteracoes, arquivos } = req.body;

        if (!titulo) {
            return res.status(400).json({ success: false, error: 'Título é obrigatório' });
        }

        try {
            const update = {
                tipo: tipo || 'improvement',
                titulo,
                descricao: descricao || '',
                modulo: modulo || 'Sistema',
                alteracoes: alteracoes || [],
                arquivos: arquivos || [],
                autor: req.user?.nome || req.user?.username || 'Admin',
                versao: null // Usa versão atual do package.json
            };

            const enviado = await discordBot.publicarAtualizacao(update);

            res.json({
                success: true,
                enviado,
                message: enviado 
                    ? 'Atualização publicada no Discord com sucesso!' 
                    : 'Atualização salva localmente (bot offline ou canal não configurado)'
            });
        } catch (error) {
            console.error('❌ [Discord API] Erro ao publicar:', error);
            res.status(500).json({ success: false, error: 'Erro interno no servidor. Tente novamente.' });
        }
    });

    // =========================================================
    // POST /api/discord/deploy - Registrar deploy
    // =========================================================
    router.post('/deploy', authenticateToken, authorizeAdmin, async (req, res) => {
        if (!discordBot) {
            return res.status(503).json({ success: false, error: 'Bot não carregado' });
        }

        const { versao, descricao, alteracoes, ambiente, autor } = req.body;

        try {
            const enviado = await discordBot.publicarDeploy({
                versao,
                descricao: descricao || 'Deploy realizado com sucesso',
                alteracoes: alteracoes || [],
                ambiente: ambiente || 'Produção',
                autor: autor || req.user?.nome || 'Deploy Automático'
            });

            res.json({
                success: true,
                enviado,
                message: enviado 
                    ? 'Nota de deploy publicada no Discord!' 
                    : 'Deploy registrado localmente'
            });
        } catch (error) {
            console.error('❌ [Discord API] Erro ao publicar deploy:', error);
            res.status(500).json({ success: false, error: 'Erro interno no servidor. Tente novamente.' });
        }
    });

    // =========================================================
    // POST /api/discord/commits - Publicar commits do Git
    // =========================================================
    router.post('/commits', authenticateToken, authorizeAdmin, async (req, res) => {
        if (!discordBot) {
            return res.status(503).json({ success: false, error: 'Bot não carregado' });
        }

        const { commits } = req.body;

        if (!commits || !Array.isArray(commits) || commits.length === 0) {
            return res.status(400).json({ success: false, error: 'Lista de commits é obrigatória' });
        }

        try {
            const enviado = await discordBot.publicarCommits(commits);

            res.json({
                success: true,
                enviado,
                commitsCount: commits.length,
                message: enviado
                    ? `${commits.length} commit(s) publicados no Discord!`
                    : 'Commits registrados localmente'
            });
        } catch (error) {
            console.error('❌ [Discord API] Erro ao publicar commits:', error);
            res.status(500).json({ success: false, error: 'Erro interno no servidor. Tente novamente.' });
        }
    });

    // =========================================================
    // POST /api/discord/teste - Testa conexão do bot
    // =========================================================
    router.post('/teste', authenticateToken, authorizeAdmin, async (req, res) => {
        if (!discordBot) {
            return res.status(503).json({ success: false, error: 'Bot não carregado' });
        }

        try {
            const enviado = await discordBot.publicarAtualizacao({
                tipo: 'improvement',
                titulo: '🧪 Teste de Conexão',
                descricao: 'Este é um teste de conexão do bot de atualizações do ALUFORCE.',
                modulo: 'Sistema',
                alteracoes: ['Teste de envio de mensagem para o canal de atualizações'],
                autor: req.user?.nome || 'Teste'
            });

            res.json({
                success: true,
                enviado,
                status: discordBot.getStatus(),
                message: enviado ? 'Teste enviado com sucesso!' : 'Bot offline ou canal não configurado'
            });
        } catch (error) {
            res.status(500).json({ success: false, error: 'Erro interno no servidor. Tente novamente.' });
        }
    });

    return router;
}

module.exports = createDiscordRoutes;
