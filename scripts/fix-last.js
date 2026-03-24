const fs = require('fs');
const f = 'src/routes/compras.js';
let c = fs.readFileSync(f, 'utf8');
// Fix the remaining Cota????o in the logger line
const before = c.indexOf('Cota????o');
if (before >= 0) {
  c = c.replace('Cota????o', 'Cotação');
  fs.writeFileSync(f, c, 'utf8');
  console.log('Fixed Cota????o at offset', before);
} else {
  console.log('Pattern not found - checking hex...');
  const b = Buffer.from(c, 'utf8');
  // Look for 'Cota' followed by 4 question marks
  const search = Buffer.from('Cota????o', 'utf8');
  let found = -1;
  for (let i = 0; i < b.length - search.length; i++) {
    if (b.slice(i, i+search.length).equals(search)) { found = i; break; }
  }
  console.log('Direct buffer search result:', found);
}
// verify
const final = fs.readFileSync(f, 'utf8');
const remaining = (final.match(/\?\?/g) || []).length;
console.log('Remaining ?? :', remaining);
