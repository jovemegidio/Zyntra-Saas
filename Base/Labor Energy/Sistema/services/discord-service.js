// =====================================================
// DISCORD NOTIFICATION SERVICE - ALUFORCE
// Envia notificações em tempo real para o Discord
// =====================================================

const https = require('https');

/**
 * Serviço de notificações Discord via Webhook
 * Envia atualizações do sistema em tempo real
 */
class DiscordService {
    constructor() {
        this.webhookUrl = process.env.DISCORD_WEBHOOK_URL;
        this.enabled = process.env.DISCORD_NOTIFICATIONS_ENABLED === 'true';
        this.environment = process.env.NODE_ENV || 'development';
        
        if (this.enabled && !this.webhookUrl) {
            console.warn('⚠️  Discord notifications habilitadas mas DISCORD_WEBHOOK_URL não configurado');
            this.enabled = false;
        }
    }

    /**
     * Envia uma mensagem para o Discord
     * @param {Object} payload - Payload da mensagem (embed)
     * @returns {Promise<boolean>}
     */
    async sendMessage(payload) {
        if (!this.enabled) {
            console.log('📢 [Discord] Notificações desabilitadas');
            return false;
        }

        return new Promise((resolve, reject) => {
            const data = JSON.stringify(payload);
            const url = new URL(this.webhookUrl);

            const options = {
                hostname: url.hostname,
                path: url.pathname + url.search,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(data)
                }
            };

            const req = https.request(options, (res) => {
                let responseData = '';

                res.on('data', (chunk) => {
                    responseData += chunk;
                });

                res.on('end', () => {
                    if (res.statusCode === 204 || res.statusCode === 200) {
                        console.log('✅ [Discord] Mensagem enviada com sucesso');
                        resolve(true);
                    } else {
                        console.error(`❌ [Discord] Erro ${res.statusCode}: ${responseData}`);
                        resolve(false);
                    }
                });
            });

            req.on('error', (error) => {
                console.error('❌ [Discord] Erro ao enviar mensagem:', error.message);
                reject(error);
            });

            req.write(data);
            req.end();
        });
    }

    /**
     * Formata timestamp no padrão Discord
     * @returns {string}
     */
    getTimestamp() {
        return new Date().toISOString();
    }

    /**
     * Cores para diferentes tipos de notificação
     */
    colors = {
        success: 0x00ff00,   // Verde
        error: 0xff0000,     // Vermelho
        warning: 0xffa500,   // Laranja
        info: 0x0099ff,      // Azul
        vendas: 0x9b59b6,    // Roxo
        producao: 0xf39c12,  // Amarelo
        financeiro: 0x27ae60, // Verde escuro
        rh: 0xe91e63,        // Rosa
        sistema: 0x34495e    // Cinza
    };

    /**
     * Notificação de novo pedido de venda
     */
    async notificarNovoPedido(pedido) {
        const embed = {
            embeds: [{
                title: '🛒 Novo Pedido de Venda',
                color: this.colors.vendas,
                fields: [
                    {
                        name: '📋 Número do Pedido',
                        value: pedido.numero_pedido || 'N/A',
                        inline: true
                    },
                    {
                        name: '👤 Cliente',
                        value: pedido.cliente_nome || 'Não informado',
                        inline: true
                    },
                    {
                        name: '💰 Valor Total',
                        value: `R$ ${parseFloat(pedido.valor_total || 0).toFixed(2)}`,
                        inline: true
                    },
                    {
                        name: '👨‍💼 Vendedor',
                        value: pedido.vendedor || 'Não informado',
                        inline: true
                    },
                    {
                        name: '📅 Data de Entrega',
                        value: pedido.data_entrega || 'Não definida',
                        inline: true
                    },
                    {
                        name: '📊 Status',
                        value: this.formatStatus(pedido.status),
                        inline: true
                    }
                ],
                footer: {
                    text: `ALUFORCE Sistema - ${this.environment.toUpperCase()}`
                },
                timestamp: this.getTimestamp()
            }]
        };

        if (pedido.observacoes) {
            embed.embeds[0].fields.push({
                name: '📝 Observações',
                value: pedido.observacoes.substring(0, 200),
                inline: false
            });
        }

        return await this.sendMessage(embed);
    }

    /**
     * Notificação de ordem de produção criada
     */
    async notificarNovaOrdemProducao(ordem) {
        const embed = {
            embeds: [{
                title: '🏭 Nova Ordem de Produção',
                color: this.colors.producao,
                fields: [
                    {
                        name: '🔢 Número OP',
                        value: ordem.numero || ordem.codigo || 'N/A',
                        inline: true
                    },
                    {
                        name: '📦 Produto',
                        value: ordem.produto || ordem.produto_nome || 'Não informado',
                        inline: true
                    },
                    {
                        name: '📊 Quantidade',
                        value: `${ordem.quantidade || 0} ${ordem.unidade || 'UN'}`,
                        inline: true
                    },
                    {
                        name: '👤 Cliente',
                        value: ordem.cliente || 'Não informado',
                        inline: true
                    },
                    {
                        name: '📅 Previsão',
                        value: ordem.data_prevista || ordem.data_previsao_entrega || 'Não definida',
                        inline: true
                    },
                    {
                        name: '⚡ Prioridade',
                        value: this.formatPrioridade(ordem.prioridade),
                        inline: true
                    }
                ],
                footer: {
                    text: `ALUFORCE Sistema - ${this.environment.toUpperCase()}`
                },
                timestamp: this.getTimestamp()
            }]
        };

        if (ordem.observacoes_entrega) {
            embed.embeds[0].fields.push({
                name: '🚚 Observações de Entrega',
                value: ordem.observacoes_entrega.substring(0, 200),
                inline: false
            });
        }

        return await this.sendMessage(embed);
    }

    /**
     * Notificação de pagamento recebido
     */
    async notificarPagamentoRecebido(pagamento) {
        const embed = {
            embeds: [{
                title: '💰 Pagamento Recebido',
                color: this.colors.financeiro,
                fields: [
                    {
                        name: '👤 Cliente',
                        value: pagamento.cliente || 'Não informado',
                        inline: true
                    },
                    {
                        name: '💵 Valor',
                        value: `R$ ${parseFloat(pagamento.valor || 0).toFixed(2)}`,
                        inline: true
                    },
                    {
                        name: '💳 Forma',
                        value: pagamento.forma_pagamento || 'Não informada',
                        inline: true
                    },
                    {
                        name: '📅 Data',
                        value: pagamento.data_pagamento || new Date().toLocaleDateString('pt-BR'),
                        inline: true
                    },
                    {
                        name: '🏦 Conta',
                        value: pagamento.conta_bancaria || 'Não informada',
                        inline: true
                    }
                ],
                footer: {
                    text: `ALUFORCE Sistema - ${this.environment.toUpperCase()}`
                },
                timestamp: this.getTimestamp()
            }]
        };

        return await this.sendMessage(embed);
    }

    /**
     * Notificação de erro crítico no sistema
     */
    async notificarErroCritico(erro) {
        const embed = {
            embeds: [{
                title: '🚨 ERRO CRÍTICO NO SISTEMA',
                color: this.colors.error,
                fields: [
                    {
                        name: '❌ Tipo de Erro',
                        value: erro.type || 'Erro Desconhecido',
                        inline: true
                    },
                    {
                        name: '📍 Local',
                        value: erro.location || 'Não especificado',
                        inline: true
                    },
                    {
                        name: '⏰ Horário',
                        value: new Date().toLocaleString('pt-BR'),
                        inline: true
                    },
                    {
                        name: '📝 Mensagem',
                        value: '```' + (erro.message || 'Sem detalhes').substring(0, 500) + '```',
                        inline: false
                    }
                ],
                footer: {
                    text: `ALUFORCE Sistema - ${this.environment.toUpperCase()} - REQUER ATENÇÃO IMEDIATA`
                },
                timestamp: this.getTimestamp()
            }]
        };

        if (erro.stack) {
            embed.embeds[0].fields.push({
                name: '🔍 Stack Trace',
                value: '```' + erro.stack.substring(0, 500) + '```',
                inline: false
            });
        }

        return await this.sendMessage(embed);
    }

    /**
     * Notificação de alerta de estoque baixo
     */
    async notificarEstoqueBaixo(produto) {
        const embed = {
            embeds: [{
                title: '⚠️ Alerta de Estoque Baixo',
                color: this.colors.warning,
                fields: [
                    {
                        name: '📦 Produto',
                        value: produto.descricao || produto.nome || 'N/A',
                        inline: true
                    },
                    {
                        name: '🔢 Código',
                        value: produto.codigo || 'N/A',
                        inline: true
                    },
                    {
                        name: '📊 Estoque Atual',
                        value: `${produto.estoque_atual || 0} ${produto.unidade || 'UN'}`,
                        inline: true
                    },
                    {
                        name: '📉 Estoque Mínimo',
                        value: `${produto.estoque_minimo || 0} ${produto.unidade || 'UN'}`,
                        inline: true
                    },
                    {
                        name: '🚨 Situação',
                        value: produto.estoque_atual <= 0 ? '**ESTOQUE ZERADO**' : '**ABAIXO DO MÍNIMO**',
                        inline: false
                    }
                ],
                footer: {
                    text: `ALUFORCE Sistema - ${this.environment.toUpperCase()}`
                },
                timestamp: this.getTimestamp()
            }]
        };

        return await this.sendMessage(embed);
    }

    /**
     * Notificação de novo funcionário cadastrado
     */
    async notificarNovoFuncionario(funcionario) {
        const embed = {
            embeds: [{
                title: '👥 Novo Funcionário Cadastrado',
                color: this.colors.rh,
                fields: [
                    {
                        name: '👤 Nome',
                        value: funcionario.nome || 'Não informado',
                        inline: true
                    },
                    {
                        name: '💼 Cargo',
                        value: funcionario.cargo || 'Não informado',
                        inline: true
                    },
                    {
                        name: '🏢 Departamento',
                        value: funcionario.departamento || 'Não informado',
                        inline: true
                    },
                    {
                        name: '📅 Data de Admissão',
                        value: funcionario.data_admissao || new Date().toLocaleDateString('pt-BR'),
                        inline: true
                    },
                    {
                        name: '📧 Email',
                        value: funcionario.email || 'Não informado',
                        inline: true
                    }
                ],
                footer: {
                    text: `ALUFORCE Sistema - ${this.environment.toUpperCase()}`
                },
                timestamp: this.getTimestamp()
            }]
        };

        return await this.sendMessage(embed);
    }

    /**
     * Notificação de atualização do sistema
     */
    async notificarAtualizacaoSistema(atualizacao) {
        const embed = {
            embeds: [{
                title: '🔄 Sistema Atualizado',
                color: this.colors.sistema,
                fields: [
                    {
                        name: '📌 Versão',
                        value: atualizacao.versao || 'N/A',
                        inline: true
                    },
                    {
                        name: '⏰ Horário',
                        value: new Date().toLocaleString('pt-BR'),
                        inline: true
                    },
                    {
                        name: '👨‍💻 Módulo',
                        value: atualizacao.modulo || 'Sistema',
                        inline: true
                    },
                    {
                        name: '📝 Alterações',
                        value: atualizacao.alteracoes || 'Sem descrição',
                        inline: false
                    }
                ],
                footer: {
                    text: `ALUFORCE Sistema - ${this.environment.toUpperCase()}`
                },
                timestamp: this.getTimestamp()
            }]
        };

        return await this.sendMessage(embed);
    }

    /**
     * Notificação personalizada
     */
    async notificar(titulo, mensagem, tipo = 'info', campos = []) {
        const embed = {
            embeds: [{
                title: titulo,
                description: mensagem,
                color: this.colors[tipo] || this.colors.info,
                fields: campos,
                footer: {
                    text: `ALUFORCE Sistema - ${this.environment.toUpperCase()}`
                },
                timestamp: this.getTimestamp()
            }]
        };

        return await this.sendMessage(embed);
    }

    /**
     * Formata status para exibição
     */
    formatStatus(status) {
        const statusMap = {
            'orcamento': '📋 Orçamento',
            'pedido': '✅ Pedido Confirmado',
            'producao': '🏭 Em Produção',
            'faturado': '💰 Faturado',
            'cancelado': '❌ Cancelado',
            'ativa': '🟢 Ativa',
            'em_producao': '🔄 Em Produção',
            'concluida': '✅ Concluída',
            'pendente': '⏳ Pendente'
        };

        return statusMap[status] || status || 'N/A';
    }

    /**
     * Formata prioridade para exibição
     */
    formatPrioridade(prioridade) {
        const prioridadeMap = {
            'baixa': '🟢 Baixa',
            'media': '🟡 Média',
            'alta': '🟠 Alta',
            'urgente': '🔴 URGENTE'
        };

        return prioridadeMap[prioridade] || prioridade || '🟡 Média';
    }

    /**
     * Teste de conexão
     */
    async testarConexao() {
        const embed = {
            embeds: [{
                title: '✅ Teste de Conexão Discord',
                description: 'O sistema ALUFORCE está conectado e enviando notificações!',
                color: this.colors.success,
                fields: [
                    {
                        name: 'Ambiente',
                        value: this.environment.toUpperCase(),
                        inline: true
                    },
                    {
                        name: 'Horário',
                        value: new Date().toLocaleString('pt-BR'),
                        inline: true
                    }
                ],
                footer: {
                    text: 'ALUFORCE Sistema - Notificações Ativas'
                },
                timestamp: this.getTimestamp()
            }]
        };

        return await this.sendMessage(embed);
    }
}

module.exports = new DiscordService();
