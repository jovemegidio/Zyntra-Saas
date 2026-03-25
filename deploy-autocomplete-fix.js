/**
 * Deploy Fix: Autocomplete produtos - envia arquivos para VPS via ssh2
 * Uso: node deploy-autocomplete-fix.js
 */
const { execSync } = require('child_process');
const path = require('path');

const CONFIG = {
    host: '31.97.64.102',
    user: 'root',
    password: 'Aluforce@2026#Vps',
    remotePath: '/var/www/aluforce'
};

const LOCAL_BASE = __dirname;

const FILES = [
    'routes/vendas-routes.js',
    'routes/misc-routes.js',
    'modules/Vendas/server.js',
    'modules/Vendas/public/index.html'
];

function run(cmd) {
    try {
        const result = execSync(cmd, { encoding: 'utf8', timeout: 30000, stdio: 'pipe' });
        return { ok: true, output: result.trim() };
    } catch (e) {
        return { ok: false, output: e.stderr || e.message };
    }
}

console.log('=== DEPLOY: Fix Autocomplete Produtos ===\n');

// Try to find pscp/plink
let pscp = null, plink = null;
const paths = ['C:\\Program Files\\PuTTY', 'C:\\Program Files (x86)\\PuTTY', 'C:\\PuTTY'];
for (const p of paths) {
    try {
        const fs = require('fs');
        if (fs.existsSync(path.join(p, 'pscp.exe'))) {
            pscp = path.join(p, 'pscp.exe');
            plink = path.join(p, 'plink.exe');
            break;
        }
    } catch(e) {}
}

if (!pscp) {
    // Try from PATH
    try {
        execSync('where pscp', { encoding: 'utf8', stdio: 'pipe' });
        pscp = 'pscp';
        plink = 'plink';
    } catch(e) {}
}

if (!pscp) {
    console.log('PuTTY não encontrado. Tentando com OpenSSH scp...\n');
    
    // Use scp with sshpass if available, otherwise manual instructions
    let successCount = 0;
    
    for (const file of FILES) {
        const localFile = path.join(LOCAL_BASE, file).replace(/\//g, '\\');
        const remoteFile = CONFIG.remotePath + '/' + file.replace(/\\/g, '/');
        console.log(`  Enviando: ${file}...`);
        
        const cmd = `scp -o StrictHostKeyChecking=no -o ConnectTimeout=10 "${localFile}" ${CONFIG.user}@${CONFIG.host}:${remoteFile}`;
        console.log(`    CMD: ${cmd}`);
    }
    
    console.log('\n⚠️  SCP requer senha interativa. Execute os comandos acima manualmente.');
    console.log(`    Senha: ${CONFIG.password}`);
    console.log(`\n  Depois: ssh ${CONFIG.user}@${CONFIG.host} "pm2 restart aluforce-dashboard --update-env"`);
    process.exit(0);
}

console.log(`Usando PuTTY: ${pscp}\n`);

let ok = 0, fail = 0;

for (const file of FILES) {
    const localFile = path.join(LOCAL_BASE, file);
    const remoteFile = CONFIG.remotePath + '/' + file.replace(/\\/g, '/');
    const remoteDir = path.dirname(remoteFile).replace(/\\/g, '/');
    
    process.stdout.write(`  ${file} ... `);
    
    // Create remote dir
    run(`"${plink}" -batch -pw "${CONFIG.password}" ${CONFIG.user}@${CONFIG.host} "mkdir -p ${remoteDir}"`);
    
    // Upload
    const result = run(`"${pscp}" -batch -pw "${CONFIG.password}" -q "${localFile}" ${CONFIG.user}@${CONFIG.host}:${remoteFile}`);
    
    if (result.ok) {
        console.log('✅ OK');
        ok++;
    } else {
        console.log('❌ ERRO: ' + result.output);
        fail++;
    }
}

console.log(`\nResultado: ${ok} enviados, ${fail} erros`);

if (ok > 0) {
    console.log('\nReiniciando PM2...');
    const restart = run(`"${plink}" -batch -pw "${CONFIG.password}" ${CONFIG.user}@${CONFIG.host} "pm2 restart aluforce-dashboard --update-env 2>&1 || pm2 restart all 2>&1"`);
    console.log(restart.ok ? '✅ PM2 reiniciado' : '❌ Erro PM2: ' + restart.output);
}

console.log('\n=== DEPLOY CONCLUIDO ===');
