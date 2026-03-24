const fs = require('fs');
const b = fs.readFileSync('src/routes/compras.js');
let count = 0;
for (let i = 0; i < b.length - 1; i++) {
  if (b[i] === 0x3F && b[i+1] === 0x3F) count++;
}
const s = b.toString('utf8');
console.log('Remaining 0x3F3F pairs:', count, '| size:', b.length);
const expected = ['MÓDULO', 'Cotação', 'Aprovação', 'notificação', 'Fornecedor não encontrado', 'Relatório', 'dígitos'];
expected.forEach(w => console.log((s.includes(w) ? 'OK' : 'MISS') + ':', w));
// Check routes file too
const b2 = fs.readFileSync('routes/compras-routes.js');
let count2 = 0;
for (let i = 0; i < b2.length - 1; i++) { if (b2[i] === 0x3F && b2[i+1] === 0x3F) count2++; }
const s2 = b2.toString('utf8');
console.log('\ncompras-routes.js ?? pairs:', count2);
console.log('Produção:', s2.includes('Produção') ? 'OK' : 'MISS');
console.log('estão:', s2.includes('estão') ? 'OK' : 'MISS');
