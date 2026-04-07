/**
 * ══════════════════════════════════════════════════════════════════════════════
 * SERVIÇO DE ENVIO DE EMAILS - ALUFORCE ERP
 * Sistema completo com cartões digitais e templates por ocasião
 * ══════════════════════════════════════════════════════════════════════════════
 */

const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const { funcionariosEmail, destinatariosNotificacao, templates, paths, cartoesBoasVindas } = require('./config/email-templates');

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURAÇÁO DO TRANSPORTER
// ═══════════════════════════════════════════════════════════════════════════════
const transporter = nodemailer.createTransport({
    host: 'mail.aluforce.ind.br',
    port: 465,
    secure: true,
    auth: {
        user: process.env.SMTP_USER || 'noreply@aluforce.ind.br',
        pass: process.env.SMTP_PASS || 'noreplyalu'
    },
    tls: { rejectUnauthorized: false }
});

// ═══════════════════════════════════════════════════════════════════════════════
// FUNÇÕES AUXILIARES
// ═══════════════════════════════════════════════════════════════════════════════

function getFuncionarioByEmail(email) {
    return funcionariosEmail[email.toLowerCase()] || null;
}

function getDestinatarios(modulo, tipo) {
    const config = destinatariosNotificacao[modulo];
    if (!config) return [];
    return config[tipo] || config.alertas || [config.principal];
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENVIO DE EMAIL DE ANIVERSÁRIO
// ═══════════════════════════════════════════════════════════════════════════════
async function enviarEmailAniversario(emailDestino, nomePersonalizado = null) {
    const funcionario = getFuncionarioByEmail(emailDestino);
    const nome = nomePersonalizado || (funcionario ? funcionario.nome : 'Colaborador');

    let htmlContent;
    let attachments = [];

    if (funcionario && funcionario.cartaoAniversario) {
        const cartaoPath = path.join(paths.cartoes, funcionario.cartaoAniversario);

        if (fs.existsSync(cartaoPath)) {
            const cartaoBuffer = fs.readFileSync(cartaoPath);
            htmlContent = templates.aniversario.htmlComCartao(nome);
            attachments = [{
                filename: funcionario.cartaoAniversario,
                content: cartaoBuffer,
                cid: 'cartao-aniversario'
            }];
            console.log(`📎 Usando cartão: ${funcionario.cartaoAniversario}`);
        } else {
            htmlContent = templates.aniversario.htmlSemCartao(nome);
        }
    } else {
        htmlContent = templates.aniversario.htmlSemCartao(nome);
    }

    const assunto = templates.aniversario.assunto.replace('{nome}', nome);

    try {
        const info = await transporter.sendMail({
            from: '"ALUFORCE Sistema" <sistema@aluforce.ind.br>',
            to: emailDestino,
            subject: assunto,
            html: htmlContent,
            attachments
        });

        console.log(`✅ Email de aniversário enviado para: ${emailDestino}`);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error(`❌ Erro ao enviar para ${emailDestino}:`, error.message);
        return { success: false, error: error.message };
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENVIO DE EMAIL DE BOAS-VINDAS (COM CARTÁO POR SEXO)
// ═══════════════════════════════════════════════════════════════════════════════
async function enviarEmailBoasVindas(emailDestino, nome, login, senha, sexo = 'M') {
    const sexoNormalizado = (sexo || 'M').toUpperCase().charAt(0);
    const assunto = (sexoNormalizado === 'F' ? templates.boasVindas.assuntoF : templates.boasVindas.assuntoM).replace('{nome}', nome);

    let htmlContent;
    let attachments = [];

    const cartaoNome = cartoesBoasVindas[sexoNormalizado] || cartoesBoasVindas['M'];
    const cartaoPath = path.join(paths.boasVindas, cartaoNome);

    if (fs.existsSync(cartaoPath)) {
        const cartaoBuffer = fs.readFileSync(cartaoPath);
        htmlContent = templates.boasVindas.htmlComCartao(nome, login, senha, sexoNormalizado);
        attachments = [{
            filename: cartaoNome,
            content: cartaoBuffer,
            cid: 'cartao-boasvindas'
        }];
        console.log(`📎 Usando cartão: ${cartaoNome}`);
    } else {
        console.log(`⚠️ Cartão não encontrado: ${cartaoPath}`);
        htmlContent = templates.boasVindas.htmlSemCartao(nome, login, senha, sexoNormalizado);
    }

    try {
        const info = await transporter.sendMail({
            from: '"ALUFORCE" <noreply@aluforce.ind.br>',
            to: emailDestino,
            subject: assunto,
            html: htmlContent,
            attachments
        });

        console.log(`✅ Email de boas-vindas enviado para: ${emailDestino}`);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error(`❌ Erro ao enviar para ${emailDestino}:`, error.message);
        return { success: false, error: error.message };
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENVIO DE EMAIL DE RECUPERAÇÁO DE SENHA
// ═══════════════════════════════════════════════════════════════════════════════
async function enviarEmailRecuperacaoSenha(emailDestino, nome, novaSenha) {
    const htmlContent = templates.recuperacaoSenha.html(nome, novaSenha);

    try {
        const info = await transporter.sendMail({
            from: `"Zyntra" <${process.env.SMTP_USER || 'sistema@aluforce.ind.br'}>`,
            to: emailDestino,
            subject: templates.recuperacaoSenha.assunto,
            html: htmlContent
        });

        console.log(`✅ Email de recuperação enviado para: ${emailDestino}`);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error(`❌ Erro ao enviar para ${emailDestino}:`, error.message);
        return { success: false, error: error.message };
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// NOTIFICAÇÕES POR MÓDULO
// ═══════════════════════════════════════════════════════════════════════════════

async function enviarNotificacaoRH(tipo, dados) {
    const destinatarios = getDestinatarios('rh', tipo);
    const template = templates.notificacaoRH[tipo];

    if (!template) return { success: false, error: 'Template não encontrado' };

    const assunto = template.assunto.replace(/{(\w+)}/g, (_, key) => dados[key] || '');
    const htmlContent = template.html(dados);

    const resultados = [];
    for (const email of destinatarios) {
        try {
            const info = await transporter.sendMail({
                from: '"ALUFORCE RH" <noreply@aluforce.ind.br>',
                to: email,
                subject: assunto,
                html: htmlContent
            });
            console.log(`✅ Notificação RH enviada para: ${email}`);
            resultados.push({ email, success: true, messageId: info.messageId });
        } catch (error) {
            resultados.push({ email, success: false, error: error.message });
        }
    }
    return resultados;
}

async function enviarNotificacaoPCP(tipo, dados) {
    const destinatarios = getDestinatarios('pcp', tipo);
    const template = templates.notificacaoPCP[tipo];

    if (!template) return { success: false, error: 'Template não encontrado' };

    const assunto = template.assunto.replace(/{(\w+)}/g, (_, key) => dados[key] || '');
    const htmlContent = template.html(dados);

    const resultados = [];
    for (const email of destinatarios) {
        try {
            const info = await transporter.sendMail({
                from: '"ALUFORCE PCP" <noreply@aluforce.ind.br>',
                to: email,
                subject: assunto,
                html: htmlContent
            });
            console.log(`✅ Notificação PCP enviada para: ${email}`);
            resultados.push({ email, success: true, messageId: info.messageId });
        } catch (error) {
            resultados.push({ email, success: false, error: error.message });
        }
    }
    return resultados;
}

async function enviarNotificacaoCompras(tipo, dados) {
    const destinatarios = getDestinatarios('compras', tipo);
    const template = templates.notificacaoCompras[tipo];

    if (!template) return { success: false, error: 'Template não encontrado' };

    const assunto = template.assunto.replace(/{(\w+)}/g, (_, key) => dados[key] || '');
    const htmlContent = template.html(dados);

    const resultados = [];
    for (const email of destinatarios) {
        try {
            const info = await transporter.sendMail({
                from: '"ALUFORCE Compras" <noreply@aluforce.ind.br>',
                to: email,
                subject: assunto,
                html: htmlContent
            });
            console.log(`✅ Notificação Compras enviada para: ${email}`);
            resultados.push({ email, success: true, messageId: info.messageId });
        } catch (error) {
            resultados.push({ email, success: false, error: error.message });
        }
    }
    return resultados;
}

async function enviarNotificacaoFinanceiro(tipo, dados) {
    const destinatarios = getDestinatarios('financeiro', tipo);
    const template = templates.notificacaoFinanceiro[tipo];

    if (!template) return { success: false, error: 'Template não encontrado' };

    const assunto = template.assunto.replace(/{(\w+)}/g, (_, key) => dados[key] || '');
    const htmlContent = template.html(dados);

    const resultados = [];
    for (const email of destinatarios) {
        try {
            const info = await transporter.sendMail({
                from: '"ALUFORCE Financeiro" <noreply@aluforce.ind.br>',
                to: email,
                subject: assunto,
                html: htmlContent
            });
            console.log(`✅ Notificação Financeiro enviada para: ${email}`);
            resultados.push({ email, success: true, messageId: info.messageId });
        } catch (error) {
            resultados.push({ email, success: false, error: error.message });
        }
    }
    return resultados;
}

async function enviarNotificacaoGeral(destinatarios, titulo, mensagem, nome = 'Colaborador') {
    const assunto = templates.notificacaoGeral.assunto.replace('{titulo}', titulo);
    const htmlContent = templates.notificacaoGeral.html(titulo, mensagem, nome);

    const emails = Array.isArray(destinatarios) ? destinatarios : [destinatarios];

    const resultados = [];
    for (const email of emails) {
        try {
            const info = await transporter.sendMail({
                from: '"ALUFORCE Sistema" <noreply@aluforce.ind.br>',
                to: email,
                subject: assunto,
                html: htmlContent
            });
            console.log(`✅ Notificação enviada para: ${email}`);
            resultados.push({ email, success: true, messageId: info.messageId });
        } catch (error) {
            resultados.push({ email, success: false, error: error.message });
        }
    }
    return resultados;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FUNÇÕES UTILITÁRIAS
// ═══════════════════════════════════════════════════════════════════════════════

function listarCartoesDisponiveis() {
    console.log('\n📁 CARTÕES DE ANIVERSÁRIO:');
    console.log('─'.repeat(50));
    try {
        fs.readdirSync(paths.cartoes).forEach(a => console.log(`   • ${a}`));
    } catch (e) {
        console.log('   ❌ Erro ao listar');
    }

    console.log('\n📁 CARTÕES DE BOAS-VINDAS:');
    console.log('─'.repeat(50));
    try {
        fs.readdirSync(paths.boasVindas).forEach(a => console.log(`   • ${a}`));
    } catch (e) {
        console.log('   ❌ Erro ao listar');
    }

    console.log('\n📧 DESTINATÁRIOS POR MÓDULO:');
    console.log('─'.repeat(50));
    Object.entries(destinatariosNotificacao).forEach(([modulo, config]) => {
        console.log(`   ${modulo.toUpperCase()}: ${config.principal}`);
    });
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════
module.exports = {
    enviarEmailAniversario,
    enviarEmailBoasVindas,
    enviarEmailRecuperacaoSenha,
    enviarNotificacaoRH,
    enviarNotificacaoPCP,
    enviarNotificacaoCompras,
    enviarNotificacaoFinanceiro,
    enviarNotificacaoGeral,
    getFuncionarioByEmail,
    getDestinatarios,
    listarCartoesDisponiveis,
    transporter
};

if (require.main === module) {
    console.log('\n🎨 ═══════════════════════════════════════════════════════');
    console.log('   ALUFORCE - Sistema de Emails com Cartões Digitais');
    console.log('═══════════════════════════════════════════════════════════\n');
    listarCartoesDisponiveis();
}
