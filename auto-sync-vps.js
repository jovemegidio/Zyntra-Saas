/**
 * AUTO SYNC VPS - Sincronização Automática com Servidor
 * Monitora alterações nos arquivos e envia automaticamente para o VPS
 * 
 * Versão: 1.0.0
 * Data: 25/01/2026
 */

const { exec, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// ==================== CONFIGURAÇÕES ====================
const CONFIG = {
    // Servidor VPS
    server: {
        host: '31.97.64.102',
        user: 'root',
        password: 'Aluforce@2026#Vps',
        remotePath: '/var/www/aluforce'
    },
    
    // Caminhos locais
    local: {
        basePath: process.cwd()
    },
    
    // Arquivos/pastas para ignorar
    ignore: [
        '**/node_modules/**',
        '**/backups/**',
        '**/.git/**',
        '**/logs/**',
        '**/*.log',
        '**/*.bak',
        '**/package-lock.json',
        '**/auto-sync-vps.js',
        '**/sync-config.json',
        '**/.env',
        '**/ecosystem*.config.js'
    ],
    
    // Extensões permitidas
    allowedExtensions: [
        '.html', '.css', '.js', '.json', '.png', '.jpg', '.jpeg', 
        '.gif', '.svg', '.webp', '.ico', '.woff', '.woff2', '.ttf',
        '.py', '.sh', '.bat', '.md', '.txt'
    ],
    
    // Backup local antes de upload
    backup: {
        enabled: true,
        dir: path.join(process.cwd(), 'backups', 'auto-sync'),
        maxBackups: 50 // máximo de backups por arquivo
    },

    // Delay antes de sincronizar (para evitar múltiplos uploads)
    debounceDelay: 1000, // ms
    
    // Mostrar notificações
    verbose: true
};

// ==================== VARIÁVEIS GLOBAIS ====================
let syncQueue = new Map();
let syncTimeout = null;
let stats = {
    uploaded: 0,
    failed: 0,
    startTime: new Date()
};

// ==================== FUNÇÕES UTILITÁRIAS ====================

function log(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString('pt-BR');
    const icons = {
        info: '📁',
        success: '✅',
        error: '❌',
        warning: '⚠️',
        sync: '🔄',
        watch: '👁️'
    };
    console.log(`[${timestamp}] ${icons[type] || '•'} ${message}`);
}

function getRelativePath(filePath) {
    return path.relative(CONFIG.local.basePath, filePath).replace(/\\/g, '/');
}

function getRemotePath(filePath) {
    const relativePath = getRelativePath(filePath);
    return `${CONFIG.server.remotePath}/${relativePath}`;
}

function shouldSync(filePath) {
    // Verificar extensão
    const ext = path.extname(filePath).toLowerCase();
    if (CONFIG.allowedExtensions.length > 0 && !CONFIG.allowedExtensions.includes(ext)) {
        return false;
    }
    
    // Verificar se é arquivo ignorado
    const relativePath = getRelativePath(filePath);
    for (const pattern of CONFIG.ignore) {
        const regex = new RegExp(pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*'));
        if (regex.test(relativePath)) {
            return false;
        }
    }
    
    return true;
}

// ==================== BACKUP LOCAL ====================

function backupFile(filePath) {
    if (!CONFIG.backup.enabled) return;
    
    try {
        if (!fs.existsSync(filePath)) return;
        
        const relativePath = getRelativePath(filePath);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const ext = path.extname(filePath);
        const baseName = path.basename(filePath, ext);
        const dir = path.dirname(relativePath);
        
        const backupDir = path.join(CONFIG.backup.dir, dir);
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }
        
        const backupPath = path.join(backupDir, `${baseName}_${timestamp}${ext}`);
        fs.copyFileSync(filePath, backupPath);
        log(`Backup: ${relativePath} → backups/auto-sync/${dir}/${baseName}_${timestamp}${ext}`, 'info');
        
        // Limpar backups antigos do mesmo arquivo
        const files = fs.readdirSync(backupDir)
            .filter(f => f.startsWith(baseName + '_') && f.endsWith(ext))
            .sort()
            .reverse();
        
        if (files.length > CONFIG.backup.maxBackups) {
            for (const old of files.slice(CONFIG.backup.maxBackups)) {
                fs.unlinkSync(path.join(backupDir, old));
            }
        }
    } catch (err) {
        log(`Erro no backup: ${err.message}`, 'warning');
    }
}

// ==================== SINCRONIZAÇÃO ====================

function uploadFile(localPath) {
    return new Promise((resolve, reject) => {
        // Backup local antes de enviar
        backupFile(localPath);
        
        const remotePath = getRemotePath(localPath);
        const remoteDir = path.dirname(remotePath).replace(/\\/g, '/');
        const relativePath = getRelativePath(localPath);
        
        // Criar diretório remoto se não existir
        const mkdirCmd = `"C:\\Program Files\\PuTTY\\plink.exe" -batch -pw "${CONFIG.server.password}" ${CONFIG.server.user}@${CONFIG.server.host} "mkdir -p ${remoteDir}"`;
        
        exec(mkdirCmd, { windowsHide: true }, (mkdirErr) => {
            // Ignorar erro de mkdir (pode já existir)
            
            // Upload do arquivo
            const scpCmd = `"C:\\Program Files\\PuTTY\\pscp.exe" -batch -pw "${CONFIG.server.password}" -q "${localPath}" ${CONFIG.server.user}@${CONFIG.server.host}:${remotePath}`;
            
            exec(scpCmd, { windowsHide: true }, (err, stdout, stderr) => {
                if (err) {
                    log(`Falha ao enviar: ${relativePath}`, 'error');
                    stats.failed++;
                    reject(err);
                } else {
                    log(`Sincronizado: ${relativePath}`, 'success');
                    stats.uploaded++;
                    resolve();
                }
            });
        });
    });
}

function deleteRemoteFile(localPath) {
    return new Promise((resolve, reject) => {
        const remotePath = getRemotePath(localPath);
        const relativePath = getRelativePath(localPath);
        
        const cmd = `"C:\\Program Files\\PuTTY\\plink.exe" -batch -pw "${CONFIG.server.password}" ${CONFIG.server.user}@${CONFIG.server.host} "rm -f ${remotePath}"`;
        
        exec(cmd, { windowsHide: true }, (err) => {
            if (err) {
                log(`Falha ao deletar remoto: ${relativePath}`, 'warning');
                reject(err);
            } else {
                log(`Deletado do servidor: ${relativePath}`, 'success');
                resolve();
            }
        });
    });
}

async function processQueue() {
    if (syncQueue.size === 0) return;
    
    const items = Array.from(syncQueue.entries());
    syncQueue.clear();
    
    log(`Processando ${items.length} arquivo(s)...`, 'sync');
    
    for (const [filePath, action] of items) {
        try {
            if (action === 'upload') {
                await uploadFile(filePath);
            } else if (action === 'delete') {
                await deleteRemoteFile(filePath);
            }
        } catch (err) {
            // Erro já logado na função
        }
    }
    
    log(`Fila processada. Total enviados: ${stats.uploaded} | Falhas: ${stats.failed}`, 'info');
}

function queueSync(filePath, action = 'upload') {
    if (!shouldSync(filePath)) return;
    
    syncQueue.set(filePath, action);
    
    // Debounce para agrupar múltiplas alterações
    if (syncTimeout) {
        clearTimeout(syncTimeout);
    }
    
    syncTimeout = setTimeout(() => {
        processQueue();
    }, CONFIG.debounceDelay);
}

// ==================== WATCHER ====================

function startWatcher() {
    log('Iniciando monitoramento de arquivos...', 'watch');
    log(`Pasta: ${CONFIG.local.basePath}`, 'info');
    log(`Servidor: ${CONFIG.server.user}@${CONFIG.server.host}:${CONFIG.server.remotePath}`, 'info');

    // Usar fs.watch nativo com modo recursivo (suportado no Windows)
    const watcher = fs.watch(CONFIG.local.basePath, { recursive: true }, (eventType, filename) => {
        if (!filename) return;
        const filePath = path.join(CONFIG.local.basePath, filename);

        // Pré-filtrar antes de logar
        if (!shouldSync(filePath)) return;

        // Verificar se o arquivo existe (change vs delete)
        if (fs.existsSync(filePath)) {
            const stat = fs.statSync(filePath);
            if (stat.isFile()) {
                log(`Modificado: ${filename}`, 'info');
                queueSync(filePath, 'upload');
            }
        } else {
            log(`Removido: ${filename}`, 'warning');
            queueSync(filePath, 'delete');
        }
    });

    console.log('');
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║        🚀 AUTO SYNC VPS - ATIVO E MONITORANDO            ║');
    console.log('╠═══════════════════════════════════════════════════════════╣');
    console.log('║  Qualquer alteração será enviada automaticamente para:   ║');
    console.log(`║  📡 ${CONFIG.server.host}:${CONFIG.server.remotePath.padEnd(35)}║`);
    console.log('║                                                           ║');
    console.log('║  📂 Backup local automático em backups/auto-sync/        ║');
    console.log('║                                                           ║');
    console.log('║  Pressione Ctrl+C para parar.                            ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');
    console.log('');

    // Graceful shutdown
    process.on('SIGINT', () => {
        console.log('');
        log('Encerrando sincronização...', 'warning');
        log(`Estatísticas da sessão:`, 'info');
        log(`  - Arquivos enviados: ${stats.uploaded}`, 'info');
        log(`  - Falhas: ${stats.failed}`, 'info');
        log(`  - Tempo de execução: ${Math.round((new Date() - stats.startTime) / 1000 / 60)} minutos`, 'info');
        watcher.close();
        process.exit(0);
    });
}

// ==================== INICIALIZAÇÃO ====================

// Iniciar
startWatcher();
