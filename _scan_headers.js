const fs = require('fs');
const path = require('path');
const base = 'modules';

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  let results = [];
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      const skip = ['_backup','backups','Base','Labor Energy','Labor Eletric','node_modules','Financeiro_backup'].some(x => full.includes(x));
      if (!skip) results = results.concat(walk(full));
    } else if (f.endsWith('.html') && stat.size > 15000) {
      results.push(full);
    }
  }
  return results;
}

const files = walk(base);
let ok = 0, bad = 0;
for (const f of files) {
  const text = fs.readFileSync(f, 'utf8').slice(0, 8000);
  const hasLogo = text.includes('Logo Monocromatico');
  const hasZyn = text.includes('zyntra-branco');
  const hasHdr = text.includes('<header class="header"');
  const status = (hasLogo && hasZyn) ? 'OK' : hasHdr ? 'HEADER-NO-LOGO' : 'NO-HEADER';
  if (status === 'OK') { ok++; }
  else { bad++; console.log(status + ' | ' + f); }
}
console.log(`\nSummary: ${ok} OK, ${bad} need fixing`);
