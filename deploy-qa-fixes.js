const { execSync } = require('child_process');
const path = require('path');

const VPS = 'root@YOUR_VPS_IP';
const REMOTE_BASE = '/var/www/aluforce';
const LOCAL_BASE = process.cwd();

// Get all modified files from git
const gitOutput = execSync('git status --short', { encoding: 'utf8' });
const files = gitOutput.trim().split('\n')
  .filter(line => line.trim().startsWith('M ') || line.trim().startsWith('?? '))
  .map(line => line.trim().replace(/^[M?]+ /, '').trim())
  .filter(f => !f.startsWith('AUDITORIA-') && !f.startsWith('fix-encoding'));

console.log(`\n📦 Deploy de ${files.length} arquivos para VPS...\n`);

let success = 0;
let failed = 0;

for (const file of files) {
  const localPath = path.join(LOCAL_BASE, file);
  const remotePath = `${REMOTE_BASE}/${file}`;
  const remoteDir = path.posix.dirname(remotePath);

  try {
    // Ensure remote directory exists
    execSync(`ssh -o StrictHostKeyChecking=no ${VPS} "mkdir -p '${remoteDir}'"`, { encoding: 'utf8', timeout: 10000 });
    // SCP the file
    execSync(`scp -o StrictHostKeyChecking=no "${localPath}" "${VPS}:${remotePath}"`, { encoding: 'utf8', timeout: 30000 });
    console.log(`  ✅ ${file}`);
    success++;
  } catch (err) {
    console.log(`  ❌ ${file}: ${err.message.split('\n')[0]}`);
    failed++;
  }
}

console.log(`\n📊 Resultado: ${success} OK, ${failed} falhas de ${files.length} arquivos`);

if (success > 0) {
  console.log('\n🔄 Reiniciando PM2...');
  try {
    const restart = execSync(`ssh -o StrictHostKeyChecking=no ${VPS} "cd ${REMOTE_BASE} && pm2 restart all"`, { encoding: 'utf8', timeout: 30000 });
    console.log(restart);
    console.log('✅ PM2 reiniciado com sucesso');
  } catch (err) {
    console.log('⚠️ PM2 restart falhou:', err.message.split('\n')[0]);
  }
}
