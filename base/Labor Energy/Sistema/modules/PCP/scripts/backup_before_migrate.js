const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function main(){
  const config = {
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'aluforce_vendas',
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT,10) : 3306,
  };
  const db = await mysql.createConnection(config);
  try {
    const [rows] = await db.query('SELECT * FROM produtos');
    const outDir = path.resolve(process.cwd(), 'backups');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);
  const file = path.join(outDir, `produtos-backup-${Date.now()}.json`);
  fs.writeFileSync(file, JSON.stringify(rows, null, 2), 'utf8');
  // Machine-friendly output: print the filepath on the last line only
  console.log(file);
  } catch (err) {
    console.error('Backup failed:', err && err.message ? err.message : err);
    process.exitCode = 2;
  } finally {
    await db.end();
  }
}

if (require.main === module) main().catch(e=>{ console.error(e); process.exit(1); });
