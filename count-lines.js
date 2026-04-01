const fs = require('fs');
const path = require('path');

function countLines(dir) {
  let c = 0;
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      if (e.name === 'node_modules' || e.name === '.git' || e.name === 'backup' || e.name === 'backups') continue;
      const fp = path.join(dir, e.name);
      if (e.isDirectory()) c += countLines(fp);
      else if (/\.(js|html|css)$/.test(e.name)) {
        try { c += fs.readFileSync(fp, 'utf8').split('\n').length; } catch(x) {}
      }
    }
  } catch(x) {}
  return c;
}

const mods = ['Admin','Compras','Consultoria','Faturamento','Financeiro','NFe','PCP','RH','Vendas','_shared','config'];
let total = 0;
const lines = [];
for (const m of mods) {
  const c = countLines(path.join('modules', m));
  total += c;
  lines.push(m + ':' + c);
  // Write incrementally
  fs.writeFileSync('count-result.txt', lines.join('\n') + '\nRUNNING...\n');
}
fs.writeFileSync('count-result.txt', lines.join('\n') + '\nTOTAL:' + total + '\nDONE\n');
process.exit(0);
