// ============================================
// ALUFORCE - Serviço WhatsApp Bot v2.0
// Envia notificações em tempo real para colaboradores
// Com proteção contra crash loop e memory leak
// ============================================

const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const QRCode = require('qrcode');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: '*' }
});

const PORT = process.env.PORT || 3002;

// Estado do WhatsApp
let whatsappClient = null;
let whatsappStatus = 'disconnected';
let qrCodeData = null;
let connectedNumber = null;

// Controle de reconexão com backoff exponencial
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const BASE_RECONNECT_DELAY = 5000;   // 5s
const MAX_RECONNECT_DELAY = 300000;  // 5 minutos
let reconnectTimer = null;
let isShuttingDown = false;

// Proteção global contra crashes não-tratados
process.on('uncaughtException', (err) => {
    console.error('🔴 [WhatsApp] uncaughtException:', err.message);
    // NÃO mata o processo — apenas loga
});
process.on('unhandledRejection', (reason) => {
    console.error('🔴 [WhatsApp] unhandledRejection:', reason);
});

// ============================================
// CLIENTE WHATSAPP (com proteção anti-crash)
// ============================================
async function destroyClient() {
    if (!whatsappClient) return;
    try {
        await whatsappClient.destroy();
    } catch (e) {
        console.error('⚠️ Erro ao destruir cliente antigo:', e.message);
    }
    whatsappClient = null;
}

function scheduleReconnect() {
    if (isShuttingDown) return;
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        console.error(`🔴 Limite de ${MAX_RECONNECT_ATTEMPTS} tentativas atingido. Aguardando reconexão manual.`);
        whatsappStatus = 'max_retries';
        io.emit('whatsapp_status', { status: whatsappStatus, error: `${MAX_RECONNECT_ATTEMPTS} tentativas falharam. Use /api/whatsapp/reconectar` });
        return;
    }
    // Backoff exponencial: 5s, 10s, 20s, 40s... max 5min
    const delay = Math.min(BASE_RECONNECT_DELAY * Math.pow(2, reconnectAttempts), MAX_RECONNECT_DELAY);
    reconnectAttempts++;
    console.log(`🔄 Reconectando em ${delay / 1000}s (tentativa ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
    
    if (reconnectTimer) clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(() => {
        initializeWhatsApp();
    }, delay);
}

async function initializeWhatsApp() {
    if (isShuttingDown) return;
    
    // Destruir cliente anterior para evitar memory leak
    await destroyClient();
    
    console.log(`🟡 Iniciando cliente WhatsApp... (tentativa ${reconnectAttempts + 1})`);
    
    whatsappClient = new Client({
        authStrategy: new LocalAuth({
            dataPath: '/var/www/aluforce/.wwebjs_auth'
        }),
        puppeteer: {
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--disable-gpu'
            ],
            timeout: 90000
        },
        qrMaxRetries: 3
    });

    // Evento: QR Code gerado
    whatsappClient.on('qr', async (qr) => {
        console.log('📱 QR Code gerado! Escaneie com o WhatsApp:');
        qrcode.generate(qr, { small: true });
        
        try {
            qrCodeData = await QRCode.toDataURL(qr);
        } catch (e) {
            console.error('Erro ao gerar QR base64:', e.message);
        }
        whatsappStatus = 'qr_ready';
        io.emit('whatsapp_status', { status: whatsappStatus, qrCode: qrCodeData });
    });

    // Evento: Autenticado
    whatsappClient.on('authenticated', () => {
        console.log('✅ WhatsApp autenticado!');
        whatsappStatus = 'authenticated';
        qrCodeData = null;
        reconnectAttempts = 0; // Reset no sucesso
        io.emit('whatsapp_status', { status: whatsappStatus });
    });

    // Evento: Pronto
    whatsappClient.on('ready', async () => {
        console.log('🟢 WhatsApp Bot PRONTO!');
        whatsappStatus = 'ready';
        reconnectAttempts = 0; // Reset no sucesso
        
        try {
            const info = whatsappClient.info;
            connectedNumber = info.wid.user;
            console.log(`📱 Conectado como: ${connectedNumber}`);
        } catch (e) {
            console.error('⚠️ Não foi possível obter número:', e.message);
        }
        
        io.emit('whatsapp_status', { 
            status: whatsappStatus, 
            number: connectedNumber 
        });
    });

    // Evento: Desconectado
    whatsappClient.on('disconnected', (reason) => {
        console.log('🔴 WhatsApp desconectado:', reason);
        whatsappStatus = 'disconnected';
        connectedNumber = null;
        io.emit('whatsapp_status', { status: whatsappStatus, reason });
        
        scheduleReconnect();
    });

    // Evento: Erro de autenticação (não tenta reconectar — precisa de ação manual)
    whatsappClient.on('auth_failure', (msg) => {
        console.error('❌ Falha na autenticação:', msg);
        whatsappStatus = 'auth_failure';
        io.emit('whatsapp_status', { status: whatsappStatus, error: msg });
        // NÃO reconecta — precisa escanear QR novamente manualmente
    });

    // Inicializar cliente
    try {
        await whatsappClient.initialize();
    } catch (err) {
        console.error('❌ Erro ao inicializar WhatsApp:', err.message);
        scheduleReconnect();
    }
}

// ============================================
// FUNÇÁO: ENVIAR MENSAGEM
// ============================================
async function enviarMensagemWhatsApp(telefone, mensagem) {
    if (!whatsappClient || whatsappStatus !== 'ready') {
        console.log('⚠️ WhatsApp não está conectado');
        return { success: false, error: 'WhatsApp não conectado' };
    }

    try {
        // Formatar número (remover caracteres especiais, adicionar @c.us)
        let numero = telefone.replace(/\D/g, '');
        
        // Se começar com 0, remover
        if (numero.startsWith('0')) {
            numero = numero.substring(1);
        }
        
        // Se não tiver código do país, adicionar 55 (Brasil)
        if (!numero.startsWith('55')) {
            numero = '55' + numero;
        }
        
        // Verificar se número tem 9 dígitos no celular (padrão Brasil)
        // Formato: 55 + DDD (2) + Número (8 ou 9)
        
        const chatId = numero + '@c.us';
        
        // Verificar se número está registrado no WhatsApp
        const isRegistered = await whatsappClient.isRegisteredUser(chatId);
        if (!isRegistered) {
            console.log(`⚠️ Número ${telefone} não está no WhatsApp`);
            return { success: false, error: 'Número não registrado no WhatsApp' };
        }
        
        // Enviar mensagem
        await whatsappClient.sendMessage(chatId, mensagem);
        console.log(`✅ Mensagem enviada para ${telefone}`);
        
        return { success: true, numero: telefone };
    } catch (error) {
        console.error(`❌ Erro ao enviar mensagem para ${telefone}:`, error);
        return { success: false, error: error.message };
    }
}

// ============================================
// FUNÇÁO: ENVIAR PARA MÚLTIPLOS NÚMEROS
// ============================================
async function enviarParaMultiplos(telefones, mensagem) {
    const resultados = [];
    
    for (const telefone of telefones) {
        const resultado = await enviarMensagemWhatsApp(telefone, mensagem);
        resultados.push({ telefone, ...resultado });
        
        // Aguardar 1 segundo entre mensagens para evitar bloqueio
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return resultados;
}

// ============================================
// API REST
// ============================================
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Status do WhatsApp
app.get('/api/whatsapp/status', (req, res) => {
    res.json({
        status: whatsappStatus,
        numero: connectedNumber,
        qrCode: qrCodeData
    });
});

// Enviar mensagem individual
app.post('/api/whatsapp/enviar', async (req, res) => {
    const { telefone, mensagem } = req.body;
    
    if (!telefone || !mensagem) {
        return res.status(400).json({ error: 'Telefone e mensagem são obrigatórios' });
    }
    
    const resultado = await enviarMensagemWhatsApp(telefone, mensagem);
    res.json(resultado);
});

// Enviar para múltiplos
app.post('/api/whatsapp/enviar-multiplos', async (req, res) => {
    const { telefones, mensagem } = req.body;
    
    if (!telefones || !Array.isArray(telefones) || !mensagem) {
        return res.status(400).json({ error: 'Lista de telefones e mensagem são obrigatórios' });
    }
    
    const resultados = await enviarParaMultiplos(telefones, mensagem);
    res.json({ resultados });
});

// Notificar TI/RH via WhatsApp
app.post('/api/whatsapp/notificar-rh', async (req, res) => {
    const { assunto, mensagem, telefones } = req.body;
    
    // Números padrão do TI e RH (adicione os números reais aqui)
    const numerosRH = telefones || [
        // Adicione os números de TI e RH aqui
        // '11999999999',
        // '11888888888'
    ];
    
    if (numerosRH.length === 0) {
        return res.status(400).json({ error: 'Nenhum número configurado para RH/TI' });
    }
    
    const textoFinal = `*🏭 ALUFORCE - ${assunto}*\n\n${mensagem}\n\n_Mensagem automática_`;
    
    const resultados = await enviarParaMultiplos(numerosRH, textoFinal);
    res.json({ resultados });
});

// Desconectar WhatsApp
app.post('/api/whatsapp/desconectar', async (req, res) => {
    if (whatsappClient) {
        await whatsappClient.logout();
        whatsappStatus = 'disconnected';
        connectedNumber = null;
        res.json({ success: true, message: 'Desconectado com sucesso' });
    } else {
        res.json({ success: false, message: 'Cliente não inicializado' });
    }
});

// Reconectar WhatsApp
app.post('/api/whatsapp/reconectar', async (req, res) => {
    reconnectAttempts = 0; // Reset tentativas
    if (reconnectTimer) clearTimeout(reconnectTimer);
    await destroyClient();
    initializeWhatsApp();
    res.json({ success: true, message: 'Reconectando...' });
});

// ============================================
// PÁGINA DE CONFIGURAÇÁO
// ============================================
app.get('/whatsapp', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ALUFORCE - WhatsApp Bot</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/bootstrap-icons.css" rel="stylesheet">
    <script src="/socket.io/socket.io.js"></script>
    <style>
        body { 
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); 
            min-height: 100vh;
            color: white;
        }
        .card {
            background: rgba(255,255,255,0.1);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.2);
        }
        .status-badge {
            font-size: 1rem;
            padding: 10px 20px;
        }
        #qrcode img {
            max-width: 300px;
            border-radius: 10px;
            background: white;
            padding: 20px;
        }
        .pulse {
            animation: pulse 2s infinite;
        }
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
    </style>
</head>
<body>
    <div class="container py-5">
        <div class="text-center mb-5">
            <h1><i class="bi bi-whatsapp text-success"></i> ALUFORCE WhatsApp Bot</h1>
            <p class="text-muted">Envie notificações automáticas para colaboradores</p>
        </div>

        <div class="row justify-content-center">
            <div class="col-md-6">
                <div class="card text-center p-4">
                    <h4>Status da Conexão</h4>
                    <div id="statusBadge" class="mt-3">
                        <span class="badge bg-secondary status-badge">Verificando...</span>
                    </div>
                    
                    <div id="qrcode" class="mt-4" style="display: none;">
                        <p class="mb-3">Escaneie o QR Code com seu WhatsApp:</p>
                        <img src="" id="qrImage" alt="QR Code">
                    </div>
                    
                    <div id="connected" class="mt-4" style="display: none;">
                        <i class="bi bi-check-circle-fill text-success" style="font-size: 4rem;"></i>
                        <h5 class="mt-3">Conectado!</h5>
                        <p id="connectedNumber" class="text-success"></p>
                    </div>

                    <div class="mt-4">
                        <button id="btnReconectar" class="btn btn-outline-warning me-2" onclick="reconectar()">
                            <i class="bi bi-arrow-clockwise"></i> Reconectar
                        </button>
                        <button id="btnDesconectar" class="btn btn-outline-danger" onclick="desconectar()">
                            <i class="bi bi-power"></i> Desconectar
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <div class="row justify-content-center mt-4">
            <div class="col-md-8">
                <div class="card p-4">
                    <h4><i class="bi bi-send"></i> Enviar Mensagem de Teste</h4>
                    <div class="mb-3 mt-3">
                        <label class="form-label">Telefone (com DDD)</label>
                        <input type="text" id="telefone" class="form-control bg-dark text-white border-secondary" placeholder="Ex: 11999999999">
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Mensagem</label>
                        <textarea id="mensagem" class="form-control bg-dark text-white border-secondary" rows="3" placeholder="Digite sua mensagem..."></textarea>
                    </div>
                    <button class="btn btn-success" onclick="enviarTeste()">
                        <i class="bi bi-whatsapp"></i> Enviar Mensagem
                    </button>
                    <div id="resultado" class="mt-3"></div>
                </div>
            </div>
        </div>
    </div>

    <script>
        const socket = io();

        // Atualizar status em tempo real
        socket.on('whatsapp_status', (data) => {
            atualizarStatus(data);
        });

        function atualizarStatus(data) {
            const badge = document.getElementById('statusBadge');
            const qrDiv = document.getElementById('qrcode');
            const connectedDiv = document.getElementById('connected');
            const connectedNumber = document.getElementById('connectedNumber');

            qrDiv.style.display = 'none';
            connectedDiv.style.display = 'none';

            switch(data.status) {
                case 'disconnected':
                    badge.innerHTML = '<span class="badge bg-danger status-badge"><i class="bi bi-x-circle"></i> Desconectado</span>';
                    break;
                case 'qr_ready':
                    badge.innerHTML = '<span class="badge bg-warning status-badge pulse"><i class="bi bi-qr-code"></i> Aguardando QR Code</span>';
                    qrDiv.style.display = 'block';
                    document.getElementById('qrImage').src = data.qrCode;
                    break;
                case 'authenticated':
                    badge.innerHTML = '<span class="badge bg-info status-badge"><i class="bi bi-shield-check"></i> Autenticando...</span>';
                    break;
                case 'ready':
                    badge.innerHTML = '<span class="badge bg-success status-badge"><i class="bi bi-check-circle"></i> Conectado</span>';
                    connectedDiv.style.display = 'block';
                    if (data.number) {
                        connectedNumber.textContent = 'Número: ' + data.number;
                    }
                    break;
                case 'auth_failure':
                    badge.innerHTML = '<span class="badge bg-danger status-badge"><i class="bi bi-exclamation-triangle"></i> Falha na Autenticação</span>';
                    break;
            }
        }

        // Buscar status inicial
        fetch('/api/whatsapp/status')
            .then(res => res.json())
            .then(data => atualizarStatus(data));

        function enviarTeste() {
            const telefone = document.getElementById('telefone').value;
            const mensagem = document.getElementById('mensagem').value;
            const resultado = document.getElementById('resultado');

            if (!telefone || !mensagem) {
                resultado.innerHTML = '<div class="alert alert-warning">Preencha todos os campos</div>';
                return;
            }

            resultado.innerHTML = '<div class="alert alert-info"><i class="bi bi-hourglass-split"></i> Enviando...</div>';

            fetch('/api/whatsapp/enviar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ telefone, mensagem })
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    resultado.innerHTML = '<div class="alert alert-success"><i class="bi bi-check-circle"></i> Mensagem enviada com sucesso!</div>';
                } else {
                    resultado.innerHTML = '<div class="alert alert-danger"><i class="bi bi-x-circle"></i> Erro: ' + data.error + '</div>';
                }
            })
            .catch(err => {
                resultado.innerHTML = '<div class="alert alert-danger">Erro de conexão</div>';
            });
        }

        function reconectar() {
            fetch('/api/whatsapp/reconectar', { method: 'POST' })
                .then(res => res.json())
                .then(data => alert(data.message));
        }

        function desconectar() {
            if (confirm('Deseja realmente desconectar o WhatsApp?')) {
                fetch('/api/whatsapp/desconectar', { method: 'POST' })
                    .then(res => res.json())
                    .then(data => alert(data.message));
            }
        }
    </script>
</body>
</html>
    `);
});

// ============================================
// SOCKET.IO
// ============================================
io.on('connection', (socket) => {
    console.log('📡 Cliente conectado ao WebSocket');
    
    // Enviar status atual
    socket.emit('whatsapp_status', { 
        status: whatsappStatus, 
        number: connectedNumber,
        qrCode: qrCodeData
    });
});

// ============================================
// EXPORTAR FUNÇÁO PARA USO EXTERNO
// ============================================
module.exports = {
    enviarMensagemWhatsApp,
    enviarParaMultiplos,
    getStatus: () => ({ status: whatsappStatus, numero: connectedNumber })
};

// ============================================
// INICIAR SERVIDOR
// ============================================
server.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════╗
║     🤖 ALUFORCE WhatsApp Bot v2.0 - Porta ${PORT}       ║
║     📱 Acesse: http://localhost:${PORT}/whatsapp         ║
╚═══════════════════════════════════════════════════════╝
    `);
    
    // Sinalizar PM2 que o processo está pronto
    if (process.send) process.send('ready');
    
    // Inicializar WhatsApp
    initializeWhatsApp();
});

// ============================================
// GRACEFUL SHUTDOWN (evita corrupção de sessão)
// ============================================
async function gracefulShutdown(signal) {
    console.log(`\n⚠️ Recebido ${signal}. Encerrando gracefully...`);
    isShuttingDown = true;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    
    try {
        if (whatsappClient) {
            console.log('🔌 Desconectando WhatsApp...');
            await whatsappClient.destroy();
            whatsappClient = null;
        }
    } catch (e) {
        console.error('Erro ao desconectar:', e.message);
    }
    
    server.close(() => {
        console.log('✅ Servidor encerrado.');
        process.exit(0);
    });
    
    // Forçar saída após 10s
    setTimeout(() => {
        console.error('⏰ Timeout — forçando saída.');
        process.exit(1);
    }, 10000);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
