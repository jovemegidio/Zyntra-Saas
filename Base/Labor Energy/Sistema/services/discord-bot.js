// =====================================================
// DISCORD BOT - ALUFORCE SISTEMA
// Bot real do Discord para canal #atualizações
// Publica automaticamente implementações e alterações
// =====================================================

'use strict';

const { Client, GatewayIntentBits, EmbedBuilder, ChannelType, ActivityType } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Arquivo de changelog local para persistência
const CHANGELOG_FILE = path.join(__dirname, '..', 'logs', 'changelog.json');

class DiscordBot {
    constructor() {
        this.client = null;
        this.ready = false;
        this.channelId = process.env.DISCORD_CHANNEL_ATUALIZACOES || null;
        this.channelName = process.env.DISCORD_CHANNEL_NAME || 'atualizações';
        this.guildId = process.env.DISCORD_GUILD_ID || null;
        this.enabled = process.env.DISCORD_BOT_ENABLED === 'true';
        this.token = process.env.DISCORD_BOT_TOKEN || null;
        this.changelog = [];
        this._loadChangelog();
    }

    // =========================================================
    // INICIALIZAÇÃO DO BOT
    // =========================================================

    /**
     * Inicializa o bot Discord
     * @returns {Promise<boolean>}
     */
    async init() {
        if (!this.enabled) {
            console.log('🤖 [Discord Bot] Desabilitado via DISCORD_BOT_ENABLED');
            return false;
        }

        if (!this.token) {
            console.warn('⚠️  [Discord Bot] DISCORD_BOT_TOKEN não configurado');
            return false;
        }

        try {
            this.client = new Client({
                intents: [
                    GatewayIntentBits.Guilds,
                    GatewayIntentBits.GuildMessages
                ]
            });

            // Eventos do bot
            this._registerEvents();

            // Login
            await this.client.login(this.token);
            console.log('✅ [Discord Bot] Conectando ao Discord...');
            return true;
        } catch (error) {
            console.error('❌ [Discord Bot] Erro ao inicializar:', error.message);
            return false;
        }
    }

    /**
     * Registra os event listeners do bot
     */
    _registerEvents() {
        // Bot pronto
        this.client.once('ready', async () => {
            console.log(`✅ [Discord Bot] Logado como ${this.client.user.tag}`);
            this.ready = true;

            // Define status do bot
            this.client.user.setActivity('ALUFORCE Sistema', { type: ActivityType.Watching });

            // Tenta encontrar o canal de atualizações automaticamente
            await this._findUpdateChannel();

            console.log(`📢 [Discord Bot] Canal de atualizações: ${this.channelId ? `#${this.channelName} (${this.channelId})` : 'NÃO ENCONTRADO'}`);
        });

        // Reconexão
        this.client.on('shardReconnecting', () => {
            console.log('🔄 [Discord Bot] Reconectando...');
            this.ready = false;
        });

        this.client.on('shardResume', () => {
            console.log('✅ [Discord Bot] Reconectado com sucesso');
            this.ready = true;
        });

        // Erro
        this.client.on('error', (error) => {
            console.error('❌ [Discord Bot] Erro:', error.message);
        });

        // Escuta comandos no canal (opcional)
        this.client.on('messageCreate', async (message) => {
            if (message.author.bot) return;
            await this._handleCommand(message);
        });
    }

    /**
     * Busca automaticamente o canal "atualizações" no servidor
     */
    async _findUpdateChannel() {
        if (this.channelId) return; // Já configurado via env

        try {
            let guild;
            if (this.guildId) {
                guild = this.client.guilds.cache.get(this.guildId);
            } else {
                // Pega o primeiro servidor
                guild = this.client.guilds.cache.first();
            }

            if (!guild) {
                console.warn('⚠️  [Discord Bot] Nenhum servidor encontrado');
                return;
            }

            this.guildId = guild.id;

            // Busca canal por nome
            const channel = guild.channels.cache.find(
                ch => ch.type === ChannelType.GuildText &&
                    (ch.name === this.channelName ||
                     ch.name === 'atualizacoes' ||
                     ch.name === 'atualizações' ||
                     ch.name === 'updates' ||
                     ch.name === 'changelog')
            );

            if (channel) {
                this.channelId = channel.id;
                this.channelName = channel.name;
            } else {
                console.warn(`⚠️  [Discord Bot] Canal "${this.channelName}" não encontrado. Crie o canal ou configure DISCORD_CHANNEL_ATUALIZACOES`);
            }
        } catch (error) {
            console.error('❌ [Discord Bot] Erro ao buscar canal:', error.message);
        }
    }

    // =========================================================
    // COMANDOS DO BOT
    // =========================================================

    /**
     * Processa comandos enviados no Discord
     */
    async _handleCommand(message) {
        const prefix = '!alu';
        if (!message.content.startsWith(prefix)) return;

        const args = message.content.slice(prefix.length).trim().split(/\s+/);
        const command = args.shift()?.toLowerCase();

        switch (command) {
            case 'status':
                await this._cmdStatus(message);
                break;
            case 'versao':
            case 'version':
                await this._cmdVersao(message);
                break;
            case 'changelog':
            case 'historico':
                await this._cmdChangelog(message, args);
                break;
            case 'help':
            case 'ajuda':
                await this._cmdHelp(message);
                break;
        }
    }

    async _cmdStatus(message) {
        const uptime = process.uptime();
        const hours = Math.floor(uptime / 3600);
        const mins = Math.floor((uptime % 3600) / 60);

        const embed = new EmbedBuilder()
            .setTitle('📊 Status do Sistema ALUFORCE')
            .setColor(0x00ff00)
            .addFields(
                { name: '🟢 Status', value: 'Online', inline: true },
                { name: '⏱️ Uptime', value: `${hours}h ${mins}m`, inline: true },
                { name: '🌐 Ambiente', value: (process.env.NODE_ENV || 'development').toUpperCase(), inline: true },
                { name: '📌 Versão', value: this._getVersion(), inline: true },
                { name: '📊 Atualizações', value: `${this.changelog.length} registradas`, inline: true }
            )
            .setFooter({ text: 'ALUFORCE Sistema' })
            .setTimestamp();

        await message.reply({ embeds: [embed] });
    }

    async _cmdVersao(message) {
        const embed = new EmbedBuilder()
            .setTitle('📌 Versão do Sistema')
            .setDescription(`**ALUFORCE v${this._getVersion()}**`)
            .setColor(0x0099ff)
            .setFooter({ text: 'ALUFORCE Sistema' })
            .setTimestamp();

        await message.reply({ embeds: [embed] });
    }

    async _cmdChangelog(message, args) {
        const limit = parseInt(args[0]) || 5;
        const recent = this.changelog.slice(-limit).reverse();

        if (recent.length === 0) {
            await message.reply('📋 Nenhuma atualização registrada ainda.');
            return;
        }

        const embed = new EmbedBuilder()
            .setTitle(`📋 Últimas ${recent.length} Atualizações`)
            .setColor(0x9b59b6)
            .setFooter({ text: 'ALUFORCE Sistema' })
            .setTimestamp();

        for (const entry of recent) {
            const data = new Date(entry.timestamp).toLocaleDateString('pt-BR', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });
            embed.addFields({
                name: `${entry.emoji || '🔄'} ${entry.titulo} (${data})`,
                value: entry.descricao?.substring(0, 200) || 'Sem descrição',
                inline: false
            });
        }

        await message.reply({ embeds: [embed] });
    }

    async _cmdHelp(message) {
        const embed = new EmbedBuilder()
            .setTitle('🤖 Comandos ALUFORCE Bot')
            .setColor(0x3498db)
            .setDescription('Comandos disponíveis para o bot ALUFORCE:')
            .addFields(
                { name: '`!alustatus`', value: 'Mostra o status atual do sistema', inline: false },
                { name: '`!aluversao`', value: 'Mostra a versão atual do sistema', inline: false },
                { name: '`!aluchangelog [N]`', value: 'Mostra as últimas N atualizações (padrão: 5)', inline: false },
                { name: '`!aluhelp`', value: 'Mostra esta mensagem de ajuda', inline: false }
            )
            .setFooter({ text: 'ALUFORCE Sistema | Prefixo: !alu' })
            .setTimestamp();

        await message.reply({ embeds: [embed] });
    }

    // =========================================================
    // PUBLICAÇÃO DE ATUALIZAÇÕES
    // =========================================================

    /**
     * Publica uma atualização no canal #atualizações
     * @param {Object} update - Dados da atualização
     * @param {string} update.tipo - Tipo: 'feature', 'fix', 'improvement', 'security', 'deploy', 'hotfix', 'refactor', 'docs'
     * @param {string} update.titulo - Título da atualização
     * @param {string} update.descricao - Descrição detalhada
     * @param {string} update.modulo - Módulo afetado (Vendas, Financeiro, PCP, RH, etc.)
     * @param {string[]} [update.alteracoes] - Lista de alterações específicas
     * @param {string} [update.autor] - Quem fez a alteração
     * @param {string} [update.versao] - Versão do sistema
     * @param {string[]} [update.arquivos] - Arquivos alterados
     * @returns {Promise<boolean>}
     */
    async publicarAtualizacao(update) {
        // Salva no changelog local independente do Discord
        this._saveToChangelog(update);

        if (!this.ready || !this.channelId) {
            console.log('📢 [Discord Bot] Bot não pronto ou canal não configurado. Atualização salva localmente.');
            return false;
        }

        try {
            const channel = await this.client.channels.fetch(this.channelId);
            if (!channel) {
                console.error('❌ [Discord Bot] Canal não encontrado:', this.channelId);
                return false;
            }

            const embed = this._buildUpdateEmbed(update);
            await channel.send({ embeds: [embed] });
            console.log(`✅ [Discord Bot] Atualização publicada: ${update.titulo}`);
            return true;
        } catch (error) {
            console.error('❌ [Discord Bot] Erro ao publicar atualização:', error.message);
            return false;
        }
    }

    /**
     * Publica uma nota de deploy no canal
     */
    async publicarDeploy(info) {
        const update = {
            tipo: 'deploy',
            titulo: `🚀 Deploy ${info.ambiente || 'Produção'} - v${info.versao || this._getVersion()}`,
            descricao: info.descricao || 'Novo deploy realizado com sucesso.',
            modulo: 'Sistema',
            alteracoes: info.alteracoes || [],
            autor: info.autor || 'Deploy Automático',
            versao: info.versao || this._getVersion()
        };

        return await this.publicarAtualizacao(update);
    }

    /**
     * Publica atualização a partir de commits do Git
     * @param {Object[]} commits - Lista de commits
     */
    async publicarCommits(commits) {
        if (!commits || commits.length === 0) return false;

        const tipoMap = {
            'feat': { tipo: 'feature', emoji: '✨', label: 'Nova Funcionalidade' },
            'fix': { tipo: 'fix', emoji: '🐛', label: 'Correção de Bug' },
            'perf': { tipo: 'improvement', emoji: '⚡', label: 'Melhoria de Performance' },
            'refactor': { tipo: 'refactor', emoji: '♻️', label: 'Refatoração' },
            'security': { tipo: 'security', emoji: '🔒', label: 'Segurança' },
            'style': { tipo: 'improvement', emoji: '🎨', label: 'Interface/Estilo' },
            'docs': { tipo: 'docs', emoji: '📝', label: 'Documentação' },
            'hotfix': { tipo: 'hotfix', emoji: '🚑', label: 'Hotfix Urgente' },
            'chore': { tipo: 'improvement', emoji: '🔧', label: 'Manutenção' }
        };

        // Agrupa commits por tipo
        const grouped = {};
        for (const commit of commits) {
            const prefix = commit.message.split(':')[0]?.split('(')[0]?.trim().toLowerCase();
            const info = tipoMap[prefix] || { tipo: 'improvement', emoji: '🔄', label: 'Atualização' };

            if (!grouped[info.label]) {
                grouped[info.label] = { ...info, items: [] };
            }
            // Remove prefixo "feat: ", "fix: " etc.
            const cleanMsg = commit.message.replace(/^[a-z]+(\([^)]*\))?:\s*/i, '');
            grouped[info.label].items.push({
                message: cleanMsg,
                author: commit.author,
                hash: commit.hash?.substring(0, 7)
            });
        }

        // Cria embed
        const embed = new EmbedBuilder()
            .setTitle(`📦 Atualização do Sistema - v${this._getVersion()}`)
            .setColor(0x2ecc71)
            .setDescription(`**${commits.length} alteração(ões)** aplicadas ao sistema`)
            .setFooter({ text: `ALUFORCE Sistema | ${(process.env.NODE_ENV || 'dev').toUpperCase()}` })
            .setTimestamp();

        for (const [label, group] of Object.entries(grouped)) {
            const items = group.items
                .map(i => `${group.emoji} ${i.message}${i.hash ? ` (\`${i.hash}\`)` : ''}`)
                .join('\n');
            embed.addFields({
                name: `${group.emoji} ${label} (${group.items.length})`,
                value: items.substring(0, 1024),
                inline: false
            });
        }

        // Autores
        const autores = [...new Set(commits.map(c => c.author).filter(Boolean))];
        if (autores.length > 0) {
            embed.addFields({
                name: '👨‍💻 Desenvolvedores',
                value: autores.join(', '),
                inline: false
            });
        }

        if (!this.ready || !this.channelId) {
            this._saveToChangelog({
                tipo: 'deploy',
                titulo: `Atualização v${this._getVersion()} (${commits.length} commits)`,
                descricao: Object.entries(grouped).map(([k, v]) => `${k}: ${v.items.length}`).join(', '),
                modulo: 'Sistema'
            });
            return false;
        }

        try {
            const channel = await this.client.channels.fetch(this.channelId);
            await channel.send({ embeds: [embed] });
            console.log(`✅ [Discord Bot] ${commits.length} commits publicados no Discord`);
            return true;
        } catch (error) {
            console.error('❌ [Discord Bot] Erro ao publicar commits:', error.message);
            return false;
        }
    }

    // =========================================================
    // BUILDERS DE EMBEDS
    // =========================================================

    _buildUpdateEmbed(update) {
        const typeConfig = {
            'feature': { emoji: '✨', color: 0x2ecc71, label: 'Nova Funcionalidade' },
            'fix': { emoji: '🐛', color: 0xe74c3c, label: 'Correção de Bug' },
            'improvement': { emoji: '⚡', color: 0xf39c12, label: 'Melhoria' },
            'security': { emoji: '🔒', color: 0xe91e63, label: 'Segurança' },
            'deploy': { emoji: '🚀', color: 0x3498db, label: 'Deploy' },
            'hotfix': { emoji: '🚑', color: 0xff0000, label: 'Hotfix Urgente' },
            'refactor': { emoji: '♻️', color: 0x9b59b6, label: 'Refatoração' },
            'docs': { emoji: '📝', color: 0x95a5a6, label: 'Documentação' },
            'breaking': { emoji: '💥', color: 0xff0000, label: 'Mudança Importante' }
        };

        const config = typeConfig[update.tipo] || typeConfig['improvement'];
        const versao = update.versao || this._getVersion();

        const embed = new EmbedBuilder()
            .setTitle(`${config.emoji} ${update.titulo}`)
            .setColor(config.color)
            .setFooter({ text: `ALUFORCE v${versao} | ${(process.env.NODE_ENV || 'dev').toUpperCase()}` })
            .setTimestamp();

        // Descrição
        if (update.descricao) {
            embed.setDescription(update.descricao);
        }

        // Campos principais
        embed.addFields(
            { name: '📂 Tipo', value: config.label, inline: true },
            { name: '📦 Módulo', value: update.modulo || 'Sistema', inline: true },
            { name: '📌 Versão', value: versao, inline: true }
        );

        // Lista de alterações
        if (update.alteracoes && update.alteracoes.length > 0) {
            const lista = update.alteracoes
                .map(a => `• ${a}`)
                .join('\n')
                .substring(0, 1024);
            embed.addFields({ name: '📋 Alterações', value: lista, inline: false });
        }

        // Arquivos alterados
        if (update.arquivos && update.arquivos.length > 0) {
            const arquivos = update.arquivos
                .map(f => `\`${f}\``)
                .join(', ')
                .substring(0, 1024);
            embed.addFields({ name: '📁 Arquivos', value: arquivos, inline: false });
        }

        // Autor
        if (update.autor) {
            embed.addFields({ name: '👨‍💻 Autor', value: update.autor, inline: true });
        }

        // Data/hora
        embed.addFields({
            name: '📅 Data',
            value: new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
            inline: true
        });

        return embed;
    }

    // =========================================================
    // CHANGELOG LOCAL
    // =========================================================

    _loadChangelog() {
        try {
            if (fs.existsSync(CHANGELOG_FILE)) {
                const data = fs.readFileSync(CHANGELOG_FILE, 'utf8');
                this.changelog = JSON.parse(data);
            }
        } catch (error) {
            console.warn('⚠️  [Discord Bot] Erro ao carregar changelog:', error.message);
            this.changelog = [];
        }
    }

    _saveToChangelog(update) {
        const entry = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            tipo: update.tipo || 'improvement',
            titulo: update.titulo,
            descricao: update.descricao || '',
            modulo: update.modulo || 'Sistema',
            alteracoes: update.alteracoes || [],
            autor: update.autor || null,
            versao: update.versao || this._getVersion(),
            emoji: this._getEmoji(update.tipo)
        };

        this.changelog.push(entry);

        // Mantém apenas últimas 500 entradas
        if (this.changelog.length > 500) {
            this.changelog = this.changelog.slice(-500);
        }

        try {
            const dir = path.dirname(CHANGELOG_FILE);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(CHANGELOG_FILE, JSON.stringify(this.changelog, null, 2), 'utf8');
        } catch (error) {
            console.error('❌ [Discord Bot] Erro ao salvar changelog:', error.message);
        }
    }

    _getEmoji(tipo) {
        const emojis = {
            'feature': '✨', 'fix': '🐛', 'improvement': '⚡',
            'security': '🔒', 'deploy': '🚀', 'hotfix': '🚑',
            'refactor': '♻️', 'docs': '📝', 'breaking': '💥'
        };
        return emojis[tipo] || '🔄';
    }

    _getVersion() {
        try {
            const pkg = require('../package.json');
            return pkg.version || '2.0.0';
        } catch {
            return '2.0.0';
        }
    }

    // =========================================================
    // GETTERS E UTILITÁRIOS
    // =========================================================

    getChangelog(limit = 20) {
        return this.changelog.slice(-limit).reverse();
    }

    isReady() {
        return this.ready && !!this.channelId;
    }

    getStatus() {
        return {
            enabled: this.enabled,
            connected: this.ready,
            channelId: this.channelId,
            channelName: this.channelName,
            guildId: this.guildId,
            botTag: this.client?.user?.tag || null,
            changelogCount: this.changelog.length
        };
    }

    /**
     * Desconecta o bot graciosamente
     */
    async shutdown() {
        if (this.client) {
            console.log('🛑 [Discord Bot] Desconectando...');
            this.client.destroy();
            this.ready = false;
        }
    }
}

// Singleton
const discordBot = new DiscordBot();

module.exports = discordBot;
