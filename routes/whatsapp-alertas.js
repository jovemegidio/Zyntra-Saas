// ============================================
// ALUFORCE - Rotas de Alertas WhatsApp
// Endpoints que o n8n chama para disparar alertas
// ============================================

const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');
const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const WHATSAPP_API = process.env.WHATSAPP_API_URL || 'http://localhost:3002';

// Pool de conexão
let pool = null;
function getPool() {
    if (!pool) {
        pool = mysql.createPool({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'aluforce',
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME || 'aluforce_vendas',
            waitForConnections: true,
            connectionLimit: 5,
            queueLimit: 0
        });
    }
    return pool;
}

// ============================================
// HELPER: Buscar configuração do banco
// ============================================
async function getConfig(chave) {
    try {
        const [rows] = await getPool().query(
            'SELECT valor FROM whatsapp_config WHERE chave = ? AND ativo = 1',
            [chave]
        );
        return rows.length > 0 ? rows[0].valor : null;
    } catch (err) {
        console.error(`[WhatsApp Config] Erro ao buscar ${chave}:`, err.message);
        return null;
    }
}

// ============================================
// HELPER: Buscar destinatários
// ============================================
async function getDestinatarios(grupo) {
    const modoTeste = await getConfig('MODO_TESTE');
    
    if (modoTeste === '1') {
        // Em modo teste, enviar apenas para DESTINATARIOS_TESTE
        const teste = await getConfig('DESTINATARIOS_TESTE');
        try { return JSON.parse(teste || '[]'); } catch { return []; }
    }
    
    const valor = await getConfig(`DESTINATARIOS_${grupo.toUpperCase()}`);
    try { return JSON.parse(valor || '[]'); } catch { return []; }
}

// ============================================
// HELPER: Enviar WhatsApp
// ============================================
async function enviarWhatsApp(telefone, mensagem) {
    try {
        const resp = await axios.post(`${WHATSAPP_API}/api/whatsapp/enviar`, {
            telefone,
            mensagem
        }, { timeout: 30000 });
        return resp.data;
    } catch (err) {
        console.error(`[WhatsApp] Erro ao enviar para ${telefone}:`, err.message);
        return { success: false, error: err.message };
    }
}

// ============================================
// HELPER: Enviar para grupo e logar
// ============================================
async function enviarParaGrupoELogar(grupo, mensagem, tipo, refId, refTipo) {
    const destinatarios = await getDestinatarios(grupo);
    const resultados = [];
    
    if (destinatarios.length === 0) {
        console.log(`[WhatsApp Alerta] Sem destinatários para grupo ${grupo}`);
        return [{ success: false, error: 'Sem destinatários configurados' }];
    }
    
    for (const tel of destinatarios) {
        const result = await enviarWhatsApp(tel, mensagem);
        
        // Logar no banco
        try {
            await getPool().query(
                `INSERT INTO whatsapp_alertas_log (tipo, destinatario, mensagem, status, erro, referencia_id, referencia_tipo)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [tipo, tel, mensagem.substring(0, 500), result.success ? 'enviado' : 'erro', 
                 result.error || null, refId || null, refTipo || null]
            );
        } catch (logErr) {
            console.error('[WhatsApp Log] Erro ao logar:', logErr.message);
        }
        
        resultados.push({ telefone: tel, ...result });
        
        // Delay entre mensagens
        await new Promise(r => setTimeout(r, 1500));
    }
    
    return resultados;
}

// ============================================
// HELPER: Formatar moeda BRL
// ============================================
function formatBRL(valor) {
    return Number(valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(date) {
    if (!date) return '-';
    const d = new Date(date);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

// ============================================
// POST /api/whatsapp-alertas/contas-pagar
// Alerta de contas a pagar (vencendo + vencidas)
// ============================================
router.post('/contas-pagar', async (req, res) => {
    try {
        const ativo = await getConfig('ALERTA_FINANCEIRO_ATIVO');
        if (ativo !== '1') {
            return res.json({ success: true, message: 'Alertas financeiros desativados' });
        }

        const [contas] = await getPool().query('SELECT * FROM vw_contas_pagar_alertar ORDER BY data_vencimento ASC LIMIT 30');
        
        if (contas.length === 0) {
            return res.json({ success: true, message: 'Nenhuma conta a pagar para alertar', total: 0 });
        }

        // Separar por nível
        const vencidas = contas.filter(c => c.nivel_alerta === 'VENCIDA');
        const urgentes = contas.filter(c => c.nivel_alerta === 'URGENTE');
        const atencao = contas.filter(c => c.nivel_alerta === 'ATENCAO');
        const normais = contas.filter(c => c.nivel_alerta === 'NORMAL');

        let msg = `💳 *ALERTA FINANCEIRO - CONTAS A PAGAR*\n📅 ${formatDate(new Date())}\n\n`;

        if (vencidas.length > 0) {
            msg += `🚨 *VENCIDAS (${vencidas.length}):*\n`;
            vencidas.slice(0, 5).forEach(c => {
                msg += `  ❌ ${c.descricao || c.fornecedor_nome || 'S/Desc'}\n     R$ ${formatBRL(c.valor)} | Venc: ${formatDate(c.data_vencimento)} (${Math.abs(c.dias_ate_vencimento)}d atraso)\n`;
            });
            if (vencidas.length > 5) msg += `  ... e mais ${vencidas.length - 5}\n`;
            msg += '\n';
        }

        if (urgentes.length > 0) {
            msg += `⚠️ *VENCEM AMANHÃ (${urgentes.length}):*\n`;
            urgentes.slice(0, 5).forEach(c => {
                msg += `  🔴 ${c.descricao || c.fornecedor_nome || 'S/Desc'}\n     R$ ${formatBRL(c.valor)} | Venc: ${formatDate(c.data_vencimento)}\n`;
            });
            msg += '\n';
        }

        if (atencao.length > 0) {
            msg += `📋 *PRÓXIMOS 3 DIAS (${atencao.length}):*\n`;
            atencao.slice(0, 5).forEach(c => {
                msg += `  🟡 ${c.descricao || c.fornecedor_nome || 'S/Desc'}\n     R$ ${formatBRL(c.valor)} | Venc: ${formatDate(c.data_vencimento)}\n`;
            });
            msg += '\n';
        }

        if (normais.length > 0) {
            msg += `📝 *PRÓXIMOS 7 DIAS (${normais.length}):*\n`;
            normais.slice(0, 3).forEach(c => {
                msg += `  🟢 ${c.descricao || c.fornecedor_nome || 'S/Desc'} - R$ ${formatBRL(c.valor)} - ${formatDate(c.data_vencimento)}\n`;
            });
        }

        const totalValor = contas.reduce((acc, c) => acc + Number(c.valor || 0), 0);
        msg += `\n💰 *Total: R$ ${formatBRL(totalValor)}*\n_Financeiro - ALUFORCE ERP_`;

        const resultados = await enviarParaGrupoELogar('FINANCEIRO', msg, 'conta_pagar', null, 'contas_pagar');
        
        res.json({ success: true, total: contas.length, vencidas: vencidas.length, urgentes: urgentes.length, resultados });
    } catch (err) {
        console.error('[Alerta Contas Pagar]', err);
        res.status(500).json({ success: false, error: 'Erro interno no servidor. Tente novamente.' });
    }
});

// ============================================
// POST /api/whatsapp-alertas/contas-receber
// Alerta de contas a receber (vencendo + vencidas)
// ============================================
router.post('/contas-receber', async (req, res) => {
    try {
        const ativo = await getConfig('ALERTA_FINANCEIRO_ATIVO');
        if (ativo !== '1') {
            return res.json({ success: true, message: 'Alertas financeiros desativados' });
        }

        const [contas] = await getPool().query('SELECT * FROM vw_contas_receber_alertar ORDER BY data_vencimento ASC LIMIT 30');
        
        if (contas.length === 0) {
            return res.json({ success: true, message: 'Nenhuma conta a receber para alertar', total: 0 });
        }

        const vencidas = contas.filter(c => c.nivel_alerta === 'VENCIDA');
        const urgentes = contas.filter(c => c.nivel_alerta === 'URGENTE');
        const normais = contas.filter(c => ['ATENCAO', 'NORMAL'].includes(c.nivel_alerta));

        let msg = `💰 *ALERTA FINANCEIRO - CONTAS A RECEBER*\n📅 ${formatDate(new Date())}\n\n`;

        if (vencidas.length > 0) {
            msg += `🚨 *INADIMPLENTES (${vencidas.length}):*\n`;
            vencidas.slice(0, 5).forEach(c => {
                msg += `  ❌ ${c.cliente_nome || c.descricao || 'S/Cliente'}\n     R$ ${formatBRL(c.valor)} | Venc: ${formatDate(c.data_vencimento)} (${Math.abs(c.dias_ate_vencimento)}d atraso)\n`;
            });
            if (vencidas.length > 5) msg += `  ... e mais ${vencidas.length - 5}\n`;
            msg += '\n';
        }

        if (urgentes.length > 0) {
            msg += `⚠️ *VENCEM AMANHÃ (${urgentes.length}):*\n`;
            urgentes.slice(0, 5).forEach(c => {
                msg += `  🔴 ${c.cliente_nome || c.descricao || 'S/Cliente'} - R$ ${formatBRL(c.valor)}\n`;
            });
            msg += '\n';
        }

        if (normais.length > 0) {
            msg += `📋 *PRÓXIMOS 7 DIAS (${normais.length}):*\n`;
            normais.slice(0, 5).forEach(c => {
                msg += `  🟢 ${c.cliente_nome || c.descricao || 'S/Cliente'} - R$ ${formatBRL(c.valor)} - ${formatDate(c.data_vencimento)}\n`;
            });
        }

        const totalValor = contas.reduce((acc, c) => acc + Number(c.valor || 0), 0);
        msg += `\n💵 *Total a Receber: R$ ${formatBRL(totalValor)}*\n_Financeiro - ALUFORCE ERP_`;

        const resultados = await enviarParaGrupoELogar('FINANCEIRO', msg, 'conta_receber', null, 'contas_receber');
        
        res.json({ success: true, total: contas.length, vencidas: vencidas.length, resultados });
    } catch (err) {
        console.error('[Alerta Contas Receber]', err);
        res.status(500).json({ success: false, error: 'Erro interno no servidor. Tente novamente.' });
    }
});

// ============================================
// POST /api/whatsapp-alertas/aniversariantes
// Alerta de aniversários do dia - SOMENTE na data exata
// ============================================
router.post('/aniversariantes', async (req, res) => {
    try {
        const ativo = await getConfig('ALERTA_ANIVERSARIO_ATIVO');
        if (ativo !== '1') {
            return res.json({ success: true, message: 'Alertas de aniversário desativados' });
        }

        // Buscar aniversariantes de HOJE (view já filtra por dia e mês exatos)
        const [aniversariantes] = await getPool().query('SELECT * FROM vw_aniversariantes_hoje');
        
        if (aniversariantes.length === 0) {
            return res.json({ success: true, message: 'Nenhum aniversariante hoje', total: 0 });
        }

        // Verificar se já enviou hoje (evitar duplicatas)
        const hoje = new Date().toISOString().split('T')[0];
        const [jaEnviou] = await getPool().query(
            `SELECT COUNT(*) as total FROM whatsapp_alertas_log 
             WHERE tipo = 'aniversario' AND DATE(created_at) = ? AND status = 'enviado'`,
            [hoje]
        );
        
        if (jaEnviou[0].total > 0) {
            return res.json({ success: true, message: 'Alertas de aniversário já enviados hoje', total: 0 });
        }

        const resultadosTodos = [];

        for (const func of aniversariantes) {
            // 1. Mensagem individual para o aniversariante (se tiver telefone)
            if (func.telefone) {
                const msgPessoal = `🎂 *Feliz Aniversário, ${func.nome_completo.split(' ')[0]}!* 🎉\n\nA família *ALUFORCE* deseja a você um dia incrível, repleto de alegria e realizações!\n\n🎈🎁 Que este novo ciclo de ${func.idade} anos seja cheio de conquistas!\n\nUm forte abraço de toda a equipe! 🤗\n\n_Mensagem automática - ALUFORCE_`;
                
                const resPessoal = await enviarWhatsApp(func.telefone, msgPessoal);
                
                await getPool().query(
                    `INSERT INTO whatsapp_alertas_log (tipo, destinatario, mensagem, status, erro, referencia_id, referencia_tipo)
                     VALUES ('aniversario_pessoal', ?, ?, ?, ?, ?, 'funcionarios')`,
                    [func.telefone, msgPessoal.substring(0, 500), resPessoal.success ? 'enviado' : 'erro', 
                     resPessoal.error || null, func.id]
                );
                
                resultadosTodos.push({ tipo: 'pessoal', nome: func.nome_completo, ...resPessoal });
                await new Promise(r => setTimeout(r, 2000));
            }

            // 2. Notificação para o grupo (RH e Diretoria)
            const msgGrupo = `🎂 *ANIVERSARIANTE DO DIA!*\n\n👤 *${func.nome_completo}*\n💼 ${func.cargo || 'Colaborador'} - ${func.departamento || ''}\n🎈 Completa *${func.idade} anos* hoje!\n\nNão esqueça de parabenizar! 🎉\n\n_RH - ALUFORCE_`;

            const resRH = await enviarParaGrupoELogar('RH', msgGrupo, 'aniversario', func.id, 'funcionarios');
            resultadosTodos.push(...resRH.map(r => ({ tipo: 'grupo_rh', nome: func.nome_completo, ...r })));
            
            const resDiretoria = await enviarParaGrupoELogar('DIRETORIA', msgGrupo, 'aniversario', func.id, 'funcionarios');
            resultadosTodos.push(...resDiretoria.map(r => ({ tipo: 'grupo_diretoria', nome: func.nome_completo, ...r })));
        }

        // 3. Enviar email de aniversário também
        try {
            const nodemailer = require('nodemailer');
            const transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST || 'mail.aluforce.ind.br',
                port: parseInt(process.env.SMTP_PORT || '465'),
                secure: true,
                auth: {
                    user: process.env.SMTP_USER || 'sistema@aluforce.ind.br',
                    pass: process.env.SMTP_PASS || process.env.N8N_SMTP_PASS
                }
            });

            for (const func of aniversariantes) {
                if (func.email) {
                    await transporter.sendMail({
                        from: `"ALUFORCE" <${process.env.SMTP_USER || 'sistema@aluforce.ind.br'}>`,
                        to: func.email,
                        subject: `🎂 Feliz Aniversário, ${func.nome_completo.split(' ')[0]}! - ALUFORCE`,
                        html: `
                            <div style="font-family: Arial; max-width: 600px; margin: auto; padding: 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 15px;">
                                <div style="text-align: center; color: white;">
                                    <h1 style="font-size: 48px; margin: 0;">🎂</h1>
                                    <h2>Feliz Aniversário, ${func.nome_completo.split(' ')[0]}!</h2>
                                    <p style="font-size: 18px;">A família <strong>ALUFORCE</strong> deseja a você um dia incrível!</p>
                                    <p style="font-size: 60px; margin: 20px 0;">🎉🎈🎁</p>
                                    <p>Que este novo ciclo de <strong>${func.idade} anos</strong> seja repleto de conquistas e felicidade!</p>
                                    <p style="margin-top: 30px; font-size: 12px; opacity: 0.8;">Equipe ALUFORCE</p>
                                </div>
                            </div>
                        `
                    });
                    console.log(`[Aniversário Email] Enviado para ${func.email}`);
                }
            }
        } catch (emailErr) {
            console.error('[Aniversário Email] Erro:', emailErr.message);
        }

        res.json({ 
            success: true, 
            total: aniversariantes.length,
            aniversariantes: aniversariantes.map(a => ({ nome: a.nome_completo, idade: a.idade, cargo: a.cargo })),
            resultados: resultadosTodos 
        });
    } catch (err) {
        console.error('[Alerta Aniversariantes]', err);
        res.status(500).json({ success: false, error: 'Erro interno no servidor. Tente novamente.' });
    }
});

// ============================================
// POST /api/whatsapp-alertas/estoque
// Alerta de estoque crítico
// ============================================
router.post('/estoque', async (req, res) => {
    try {
        const ativo = await getConfig('ALERTA_ESTOQUE_ATIVO');
        if (ativo !== '1') {
            return res.json({ success: true, message: 'Alertas de estoque desativados' });
        }

        const [items] = await getPool().query('SELECT * FROM vw_estoque_critico LIMIT 20');
        
        if (items.length === 0) {
            return res.json({ success: true, message: 'Nenhum item em estoque crítico', total: 0 });
        }

        let msg = `⚠️ *ALERTA DE ESTOQUE CRÍTICO*\n📅 ${formatDate(new Date())}\n\n`;

        items.forEach((item, i) => {
            msg += `${i + 1}. 📦 *${item.titulo || 'Item #' + item.produto_id}*\n`;
            msg += `   ${item.descricao || item.tipo_alerta}\n`;
            if (item.quantidade_atual !== null) {
                msg += `   Qtd atual: ${item.quantidade_atual}\n`;
            }
            msg += '\n';
        });

        msg += `📊 *Total: ${items.length} item(ns) em alerta*\n_PCP/Compras - ALUFORCE ERP_`;

        const resultados = await enviarParaGrupoELogar('PCP', msg, 'estoque_critico', null, 'estoque');
        
        res.json({ success: true, total: items.length, resultados });
    } catch (err) {
        console.error('[Alerta Estoque]', err);
        res.status(500).json({ success: false, error: 'Erro interno no servidor. Tente novamente.' });
    }
});

// ============================================
// POST /api/whatsapp-alertas/pedidos-atrasados
// Alerta de pedidos em atraso
// ============================================
router.post('/pedidos-atrasados', async (req, res) => {
    try {
        const [pedidos] = await getPool().query('SELECT * FROM vw_pedidos_atrasados LIMIT 20');
        
        if (pedidos.length === 0) {
            return res.json({ success: true, message: 'Nenhum pedido atrasado', total: 0 });
        }

        let msg = `🚨 *PEDIDOS EM ATRASO*\n📅 ${formatDate(new Date())}\n\n`;

        pedidos.forEach((p, i) => {
            msg += `${i + 1}. 📋 *Pedido #${p.numero_pedido || p.id}*\n`;
            msg += `   👤 ${p.cliente_nome || 'S/Cliente'}\n`;
            msg += `   💰 R$ ${formatBRL(p.valor_total)}\n`;
            msg += `   ⏰ *${p.dias_atraso} dia(s) de atraso*\n`;
            msg += `   Status: ${p.status} ${p.status_logistica ? '/ ' + p.status_logistica : ''}\n\n`;
        });

        msg += `📊 *Total: ${pedidos.length} pedido(s) atrasado(s)*\n_Logística/Vendas - ALUFORCE ERP_`;

        const resultados = await enviarParaGrupoELogar('COMERCIAL', msg, 'pedido_atrasado', null, 'pedidos');
        
        res.json({ success: true, total: pedidos.length, resultados });
    } catch (err) {
        console.error('[Alerta Pedidos]', err);
        res.status(500).json({ success: false, error: 'Erro interno no servidor. Tente novamente.' });
    }
});

// ============================================
// POST /api/whatsapp-alertas/nfe-pendentes
// Alerta de NFe pendentes/rejeitadas
// ============================================
router.post('/nfe-pendentes', async (req, res) => {
    try {
        const [nfes] = await getPool().query('SELECT * FROM vw_nfe_pendentes LIMIT 20');
        
        if (nfes.length === 0) {
            return res.json({ success: true, message: 'Nenhuma NFe pendente', total: 0 });
        }

        let msg = `📄 *NFe PENDENTES/REJEITADAS*\n📅 ${formatDate(new Date())}\n\n`;

        nfes.forEach((nf, i) => {
            const icone = nf.status === 'rejeitada' ? '❌' : '⏳';
            msg += `${i + 1}. ${icone} *NF ${nf.numero}* (${nf.status})\n`;
            msg += `   👤 ${nf.cliente_nome || 'S/Cliente'}\n`;
            msg += `   💰 R$ ${formatBRL(nf.valor_total)}\n\n`;
        });

        msg += `📊 *Total: ${nfes.length} NFe(s)*\n_Faturamento - ALUFORCE ERP_`;

        const resultados = await enviarParaGrupoELogar('FINANCEIRO', msg, 'nfe_pendente', null, 'notas_fiscais');
        
        res.json({ success: true, total: nfes.length, resultados });
    } catch (err) {
        console.error('[Alerta NFe]', err);
        res.status(500).json({ success: false, error: 'Erro interno no servidor. Tente novamente.' });
    }
});

// ============================================
// POST /api/whatsapp-alertas/resumo-diario
// Resumo completo do dia (todos os módulos)
// ============================================
router.post('/resumo-diario', async (req, res) => {
    try {
        const [pagar] = await getPool().query('SELECT COUNT(*) as t, SUM(valor) as v FROM vw_contas_pagar_alertar');
        const [receber] = await getPool().query('SELECT COUNT(*) as t, SUM(valor) as v FROM vw_contas_receber_alertar');
        const [estoque] = await getPool().query('SELECT COUNT(*) as t FROM vw_estoque_critico');
        const [atrasados] = await getPool().query('SELECT COUNT(*) as t FROM vw_pedidos_atrasados');
        const [nfes] = await getPool().query('SELECT COUNT(*) as t FROM vw_nfe_pendentes');
        const [aniver] = await getPool().query('SELECT COUNT(*) as t FROM vw_aniversariantes_hoje');

        let msg = `📊 *RESUMO DIÁRIO ALUFORCE*\n📅 ${formatDate(new Date())}\n\n`;

        msg += `💳 *Contas a Pagar:* ${pagar[0].t || 0} (R$ ${formatBRL(pagar[0].v)})\n`;
        msg += `💰 *Contas a Receber:* ${receber[0].t || 0} (R$ ${formatBRL(receber[0].v)})\n`;
        msg += `📦 *Estoque Crítico:* ${estoque[0].t || 0} item(ns)\n`;
        msg += `🚨 *Pedidos Atrasados:* ${atrasados[0].t || 0}\n`;
        msg += `📄 *NFe Pendentes:* ${nfes[0].t || 0}\n`;
        
        if (aniver[0].t > 0) {
            const [aniverDados] = await getPool().query('SELECT nome_completo, idade FROM vw_aniversariantes_hoje');
            msg += `\n🎂 *Aniversariantes:*\n`;
            aniverDados.forEach(a => {
                msg += `  🎈 ${a.nome_completo} (${a.idade} anos)\n`;
            });
        }

        msg += `\n_ALUFORCE ERP - Relatório Automático_`;

        const resultados = await enviarParaGrupoELogar('DIRETORIA', msg, 'resumo_diario', null, 'sistema');
        
        res.json({ success: true, resumo: { pagar: pagar[0].t, receber: receber[0].t, estoque: estoque[0].t, atrasados: atrasados[0].t, nfes: nfes[0].t, aniversariantes: aniver[0].t }, resultados });
    } catch (err) {
        console.error('[Resumo Diário]', err);
        res.status(500).json({ success: false, error: 'Erro interno no servidor. Tente novamente.' });
    }
});

// ============================================
// GET /api/whatsapp-alertas/config
// Ver configuração atual
// ============================================
router.get('/config', async (req, res) => {
    try {
        const [configs] = await getPool().query('SELECT chave, valor, descricao, ativo FROM whatsapp_config ORDER BY chave');
        res.json({ success: true, configs });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Erro interno no servidor. Tente novamente.' });
    }
});

// ============================================
// PUT /api/whatsapp-alertas/config
// Atualizar configuração
// ============================================
router.put('/config', async (req, res) => {
    try {
        const { chave, valor } = req.body;
        if (!chave) return res.status(400).json({ error: 'Chave é obrigatória' });
        
        await getPool().query(
            'INSERT INTO whatsapp_config (chave, valor) VALUES (?, ?) ON DUPLICATE KEY UPDATE valor = ?',
            [chave, valor, valor]
        );
        
        res.json({ success: true, message: `Config ${chave} atualizada` });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Erro interno no servidor. Tente novamente.' });
    }
});

// ============================================
// GET /api/whatsapp-alertas/log
// Ver log de alertas enviados
// ============================================
router.get('/log', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const tipo = req.query.tipo;
        
        let query = 'SELECT * FROM whatsapp_alertas_log ORDER BY created_at DESC LIMIT ?';
        let params = [limit];
        
        if (tipo) {
            query = 'SELECT * FROM whatsapp_alertas_log WHERE tipo = ? ORDER BY created_at DESC LIMIT ?';
            params = [tipo, limit];
        }
        
        const [logs] = await getPool().query(query, params);
        res.json({ success: true, total: logs.length, logs });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Erro interno no servidor. Tente novamente.' });
    }
});

// ============================================
// POST /api/whatsapp-alertas/teste
// Enviar mensagem de teste
// ============================================
router.post('/teste', async (req, res) => {
    try {
        const destinatarios = await getDestinatarios('TESTE');
        
        if (destinatarios.length === 0) {
            return res.json({ success: false, error: 'Configure DESTINATARIOS_TESTE primeiro (PUT /api/whatsapp-alertas/config com chave=DESTINATARIOS_TESTE, valor=["5511999999999"])' });
        }

        const msg = `✅ *TESTE - ALUFORCE WhatsApp Alertas*\n\n📅 ${formatDate(new Date())} ${new Date().toLocaleTimeString('pt-BR')}\n\nSistema de alertas funcionando corretamente!\n\nMódulos ativos:\n• 💳 Contas a Pagar\n• 💰 Contas a Receber\n• 📦 Estoque Crítico\n• 🚨 Pedidos Atrasados\n• 📄 NFe Pendentes\n• 🎂 Aniversários\n• 📊 Resumo Diário\n\n_ALUFORCE ERP v2.1.7_`;

        const resultados = [];
        for (const tel of destinatarios) {
            const r = await enviarWhatsApp(tel, msg);
            resultados.push({ telefone: tel, ...r });
            await new Promise(r => setTimeout(r, 1500));
        }

        res.json({ success: true, destinatarios, resultados });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Erro interno no servidor. Tente novamente.' });
    }
});

module.exports = router;
