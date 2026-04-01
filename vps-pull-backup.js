const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const CONFIG = {
    server: {
        host: 'YOUR_VPS_IP',
        user: 'root',
        password: process.env.VPS_PASSWORD || '',  // Defina VPS_PASSWORD no ambiente
        remotePath: '/var/www/aluforce'
    },
    backupDir: path.join(process.cwd(), 'backups', 'vps-remote'),
    stateFile: path.join(process.cwd(), 'backups', 'vps-remote', '.pull-state.json'),
    pollIntervalMs: 60000,
    allowedExtensions: new Set([
        '.html', '.css', '.js', '.json', '.png', '.jpg', '.jpeg', '.gif', '.svg',
        '.webp', '.ico', '.woff', '.woff2', '.ttf', '.py', '.sh', '.bat', '.md', '.txt'
    ]),
    ignoreParts: ['node_modules', '.git', 'backups', 'logs']
};

function log(message) {
    console.log('[' + new Date().toLocaleTimeString('pt-BR') + '] ' + message);
}

function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

function loadState() {
    ensureDir(CONFIG.backupDir);
    if (!fs.existsSync(CONFIG.stateFile)) {
        return { lastSyncIso: null };
    }
    try {
        return JSON.parse(fs.readFileSync(CONFIG.stateFile, 'utf8'));
    } catch {
        return { lastSyncIso: null };
    }
}

function saveState(state) {
    ensureDir(CONFIG.backupDir);
    fs.writeFileSync(CONFIG.stateFile, JSON.stringify(state, null, 2));
}

function shouldTrack(relativePath) {
    const normalized = relativePath.replace(/\\/g, '/');
    const ext = path.extname(normalized).toLowerCase();
    if (!CONFIG.allowedExtensions.has(ext)) {
        return false;
    }
    return !CONFIG.ignoreParts.some(part => normalized.includes(part));
}

function run(command) {
    return new Promise((resolve, reject) => {
        exec(command, { windowsHide: true, maxBuffer: 1024 * 1024 * 20 }, (error, stdout, stderr) => {
            if (error) {
                reject(new Error(stderr || stdout || error.message));
                return;
            }
            resolve(stdout);
        });
    });
}

async function listChangedRemoteFiles(lastSyncIso) {
    const filter = lastSyncIso
        ? ` -newermt \"${lastSyncIso}\"`
        : '';
    const remoteCommand = `find ${CONFIG.server.remotePath} -type f${filter} -printf '%TY-%Tm-%TdT%TH:%TM:%TS|%p\\n'`;
    const plink = `"C:\\Program Files\\PuTTY\\plink.exe" -batch -pw "${CONFIG.server.password}" ${CONFIG.server.user}@${CONFIG.server.host} "${remoteCommand}"`;
    const stdout = await run(plink);
    return stdout
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean)
        .map(line => {
            const separator = line.indexOf('|');
            return {
                mtime: line.slice(0, separator),
                remotePath: line.slice(separator + 1)
            };
        })
        .filter(item => item.remotePath.startsWith(CONFIG.server.remotePath))
        .map(item => ({
            ...item,
            relativePath: item.remotePath.slice(CONFIG.server.remotePath.length + 1)
        }))
        .filter(item => shouldTrack(item.relativePath));
}

async function downloadBackupFile(item) {
    const ext = path.extname(item.relativePath);
    const baseName = path.basename(item.relativePath, ext);
    const relativeDir = path.dirname(item.relativePath);
    const safeStamp = item.mtime.replace(/[:.]/g, '-');
    const destinationDir = path.join(CONFIG.backupDir, relativeDir);
    const destinationFile = path.join(destinationDir, `${baseName}_${safeStamp}${ext}`);

    ensureDir(destinationDir);
    const pscp = `"C:\\Program Files\\PuTTY\\pscp.exe" -batch -pw "${CONFIG.server.password}" ${CONFIG.server.user}@${CONFIG.server.host}:"${item.remotePath}" "${destinationFile}"`;
    await run(pscp);
    log(`Backup remoto salvo: ${item.relativePath}`);
}

async function pollRemoteChanges() {
    const state = loadState();
    const nowIso = new Date().toISOString().replace('T', ' ').slice(0, 19);

    if (!state.lastSyncIso) {
        state.lastSyncIso = nowIso;
        saveState(state);
        log('Baseline criada. Novas alteracoes na VPS serao baixadas para backups/vps-remote.');
        return;
    }

    const changedFiles = await listChangedRemoteFiles(state.lastSyncIso);
    if (changedFiles.length === 0) {
        state.lastSyncIso = nowIso;
        saveState(state);
        return;
    }

    log(`Encontrados ${changedFiles.length} arquivo(s) alterados na VPS.`);
    for (const item of changedFiles) {
        try {
            await downloadBackupFile(item);
        } catch (error) {
            log(`Falha ao baixar ${item.relativePath}: ${error.message}`);
        }
    }

    state.lastSyncIso = nowIso;
    saveState(state);
}

async function main() {
    log('Monitor de backup remoto iniciado.');
    await pollRemoteChanges();
    setInterval(() => {
        pollRemoteChanges().catch(error => log(`Erro no monitor: ${error.message}`));
    }, CONFIG.pollIntervalMs);
}

main().catch(error => {
    log(`Erro fatal: ${error.message}`);
    process.exit(1);
});