/**
 * ============================================================================
 * ALUFORCE - SERVIÇO DE EMAILS DE ANIVERSÁRIO
 * ============================================================================
 * 
 * Sistema de envio automático de emails de aniversário para funcionários.
 * Utiliza templates de marketing cards e assuntos personalizados.
 * 
 * Autor: Sistema ALUFORCE
 * Data: Janeiro 2026
 * ============================================================================
 */

const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// Configuração do transporter de email
let transporter = null;

/**
 * Lista de assuntos criativos para emails de aniversário
 * Simulando geração por IA com variação e personalização
 */
const BIRTHDAY_SUBJECTS = [
    "🎂 Feliz Aniversário, {nome}! Que seu dia seja incrível!",
    "🎉 Parabéns, {nome}! A ALUFORCE celebra você hoje!",
    "🌟 {nome}, hoje é seu dia especial! Felicidades!",
    "🎁 Desejamos um Feliz Aniversário, {nome}!",
    "🎊 Comemore! É o aniversário de {nome}!",
    "✨ {nome}, que venha um ano cheio de conquistas! Parabéns!",
    "🎈 Feliz Aniversário! Você faz parte da nossa história, {nome}!",
    "🥳 {nome}, a equipe ALUFORCE deseja muitas felicidades!",
    "🎂 Um brinde a você, {nome}! Feliz Aniversário!",
    "💫 {nome}, que este novo ciclo traga muita alegria! Parabéns!",
    "🎉 Hoje é dia de festa! Parabéns, {nome}!",
    "🌈 {nome}, a ALUFORCE comemora seu aniversário com você!",
    "🎁 Muitas realizações para você, {nome}! Feliz Aniversário!",
    "🎊 {nome}, você merece o melhor! Parabéns pelo seu dia!",
    "✨ Celebrando você hoje, {nome}! Feliz Aniversário!"
];

/**
 * Inicializa o transporter de email
 */
function initTransporter() {
    if (transporter) return transporter;
    
    try {
        transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER || 'sistema@aluforce.ind.br',
                pass: process.env.SMTP_PASS || ''
            },
            tls: {
                rejectUnauthorized: false
            }
        });
        
        console.log('[BIRTHDAY-EMAIL] ✅ Transporter inicializado');
        return transporter;
    } catch (error) {
        console.error('[BIRTHDAY-EMAIL] ❌ Erro ao inicializar transporter:', error);
        return null;
    }
}

/**
 * Gera um assunto personalizado para o email de aniversário
 * @param {string} nome - Nome do aniversariante
 * @returns {string} - Assunto personalizado
 */
function generateSubject(nome) {
    const primeiroNome = nome.split(' ')[0];
    const randomIndex = Math.floor(Math.random() * BIRTHDAY_SUBJECTS.length);
    return BIRTHDAY_SUBJECTS[randomIndex].replace(/{nome}/g, primeiroNome);
}

/**
 * Gera o HTML do email de aniversário
 * @param {Object} funcionario - Dados do funcionário
 * @param {string} imagePath - Caminho da imagem do card (opcional)
 * @returns {string} - HTML do email
 */
function generateEmailHTML(funcionario, imagePath = null) {
    const primeiroNome = (funcionario.nome || funcionario.nome_completo || 'Colaborador').split(' ')[0];
    
    // Template com logo e cartão digital
    return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Feliz Aniversário!</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
            <tr>
                <td align="center">
                    <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
                        <!-- Header com Logo -->
                        <tr>
                            <td align="center" style="padding: 24px 20px; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);">
                                <img src="https://sistema.aluforce.ind.br/images/Logo%20Monocromatico%20-%20Branco%20-%20Aluforce.png" alt="ALUFORCE" style="height: 40px; width: auto;">
                            </td>
                        </tr>
                        <!-- Cartão Digital de Aniversário -->
                        <tr>
                            <td align="center" style="padding: 0;">
                                <img src="cid:birthday-card" alt="Feliz Aniversário, ${primeiroNome}!" style="max-width: 600px; width: 100%; height: auto; display: block;">
                            </td>
                        </tr>
                        <!-- Footer -->
                        <tr>
                            <td align="center" style="padding: 20px; background-color: #f8f9fa; border-top: 1px solid #e9ecef;">
                                <p style="margin: 0; font-size: 12px; color: #6c757d;">Este é um email automático enviado pelo Sistema ALUFORCE.</p>
                                <p style="margin: 8px 0 0 0; font-size: 12px; color: #6c757d;">© ${new Date().getFullYear()} ALUFORCE Esquadrias de Alumínio</p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    `;
}

/**
 * Envia email de aniversário para um funcionário
 * @param {Object} funcionario - Dados do funcionário
 * @param {Object} options - Opções adicionais
 * @returns {Promise<Object>} - Resultado do envio
 */
async function sendBirthdayEmail(funcionario, options = {}) {
    const trans = initTransporter();
    
    if (!trans) {
        return { 
            success: false, 
            error: 'Transporter de email não configurado',
            funcionario: funcionario.nome 
        };
    }
    
    if (!funcionario.email) {
        return { 
            success: false, 
            error: 'Email do funcionário não informado',
            funcionario: funcionario.nome 
        };
    }
    
    try {
        const subject = generateSubject(funcionario.nome || funcionario.nome_completo);
        const html = generateEmailHTML(funcionario);
        
        // Configurar anexos - apenas o cartão digital de aniversário
        const attachments = [];
        
        // Anexar card de marketing se existir (personalizado ou genérico)
        const cardPath = path.join(__dirname, '..', 'emails-sge', 'Aniversariantes', `Feliz Aniversário - ${funcionario.nome.split(' ')[0]}.jpg`);
        if (fs.existsSync(cardPath)) {
            attachments.push({
                filename: 'aniversario-card.jpg',
                path: cardPath,
                cid: 'birthday-card'
            });
        } else {
            // Usar card genérico se disponível
            const genericCardPath = path.join(__dirname, '..', 'emails-sge', 'Aniversariantes', 'Feliz Aniversário - Antonio.jpg');
            if (fs.existsSync(genericCardPath)) {
                attachments.push({
                    filename: 'aniversario-card.jpg',
                    path: genericCardPath,
                    cid: 'birthday-card'
                });
            }
        }
        
        const mailOptions = {
            from: `"Sistema" <${process.env.SMTP_USER || 'sistema@aluforce.ind.br'}>`,
            to: funcionario.email,
            subject: subject,
            html: html,
            attachments: attachments
        };
        
        // Adicionar CC se especificado
        if (options.cc) {
            mailOptions.cc = options.cc;
        }
        
        const info = await trans.sendMail(mailOptions);
        
        console.log(`[BIRTHDAY-EMAIL] ✅ Email enviado para ${funcionario.nome} <${funcionario.email}> - MessageId: ${info.messageId}`);
        
        return {
            success: true,
            messageId: info.messageId,
            funcionario: funcionario.nome,
            email: funcionario.email,
            subject: subject
        };
        
    } catch (error) {
        console.error(`[BIRTHDAY-EMAIL] ❌ Erro ao enviar para ${funcionario.nome}:`, error);
        return {
            success: false,
            error: error.message,
            funcionario: funcionario.nome,
            email: funcionario.email
        };
    }
}

/**
 * Busca aniversariantes do dia no banco de dados
 * @param {Object} pool - Pool de conexão MySQL
 * @returns {Promise<Array>} - Lista de aniversariantes
 */
async function getBirthdayEmployees(pool) {
    try {
        const [rows] = await pool.execute(`
            SELECT 
                id,
                nome_completo as nome,
                email,
                departamento,
                cargo,
                data_nascimento
            FROM funcionarios 
            WHERE 
                DAY(data_nascimento) = DAY(CURDATE())
                AND MONTH(data_nascimento) = MONTH(CURDATE())
                AND status = 'ativo'
                AND email IS NOT NULL
                AND email != ''
        `);
        
        return rows;
    } catch (error) {
        console.error('[BIRTHDAY-EMAIL] ❌ Erro ao buscar aniversariantes:', error);
        return [];
    }
}

/**
 * Processa e envia emails para todos os aniversariantes do dia
 * @param {Object} pool - Pool de conexão MySQL
 * @returns {Promise<Object>} - Resumo do processamento
 */
async function processAllBirthdays(pool) {
    console.log('[BIRTHDAY-EMAIL] 🎂 Iniciando processamento de aniversários...');
    
    const aniversariantes = await getBirthdayEmployees(pool);
    
    if (aniversariantes.length === 0) {
        console.log('[BIRTHDAY-EMAIL] ℹ️ Nenhum aniversariante hoje');
        return { total: 0, sent: 0, failed: 0, results: [] };
    }
    
    console.log(`[BIRTHDAY-EMAIL] 🎉 Encontrados ${aniversariantes.length} aniversariante(s) hoje`);
    
    const results = [];
    let sent = 0;
    let failed = 0;
    
    for (const funcionario of aniversariantes) {
        const result = await sendBirthdayEmail(funcionario);
        results.push(result);
        
        if (result.success) {
            sent++;
        } else {
            failed++;
        }
        
        // Aguardar 1 segundo entre envios para não sobrecarregar
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(`[BIRTHDAY-EMAIL] 📊 Resumo: ${sent} enviados, ${failed} falhas`);
    
    return {
        total: aniversariantes.length,
        sent,
        failed,
        results
    };
}

/**
 * Envia email de teste para verificar configuração
 * @param {string} email - Email de destino para teste
 * @param {string} nome - Nome para teste
 * @returns {Promise<Object>} - Resultado do teste
 */
async function sendTestEmail(email, nome = 'Teste') {
    console.log(`[BIRTHDAY-EMAIL] 🧪 Enviando email de teste para ${email}...`);
    
    return await sendBirthdayEmail({
        nome: nome,
        email: email
    });
}

// Exportar funções
module.exports = {
    initTransporter,
    generateSubject,
    generateEmailHTML,
    sendBirthdayEmail,
    getBirthdayEmployees,
    processAllBirthdays,
    sendTestEmail,
    BIRTHDAY_SUBJECTS
};

// Se executado diretamente, fazer teste
if (require.main === module) {
    const testEmail = process.argv[2] || 'antonio.egidio2004@hotmail.com';
    const testName = process.argv[3] || 'Antonio';
    
    console.log('='.repeat(60));
    console.log('ALUFORCE - TESTE DE EMAIL DE ANIVERSÁRIO');
    console.log('='.repeat(60));
    
    // Carregar variáveis de ambiente
    require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
    
    sendTestEmail(testEmail, testName)
        .then(result => {
            console.log('\nResultado:', JSON.stringify(result, null, 2));
            process.exit(result.success ? 0 : 1);
        })
        .catch(error => {
            console.error('Erro:', error);
            process.exit(1);
        });
}
