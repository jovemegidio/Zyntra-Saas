const fs = require('fs');
const b = fs.readFileSync('src/routes/compras.js');
let pairs3F = 0, pairsC383 = 0;
for (let i = 0; i < b.length - 1; i++) {
  if (b[i] === 0x3F && b[i+1] === 0x3F) pairs3F++;
  if (b[i] === 0xC3 && b[i+1] === 0x83) pairsC383++; // double-encoded Ã
}
console.log('Raw 3F3F pairs (literal ?):', pairs3F);
console.log('C383 pairs (double-encoded Ã):', pairsC383);
console.log('File size:', b.length);
// Show line 2
const lines = b.toString('binary').split('\n');
const hex2 = Buffer.from(lines[1], 'binary').toString('hex');
console.log('Line 2 raw hex:', hex2);
// Check for known patterns indicating double-encoding
const s = b.toString('utf8');
const hasGarbled = s.includes('MÃ') || s.includes('ção');
console.log('Has "MÃ" (double-encoded M):', s.includes('MÃ'));
console.log('Has "ção" (correct):', s.includes('ção'));
console.log('Has "????o" (raw ??):', s.includes('????o'));
// Show lines with issues
s.split('\n').forEach((l, i) => {
  if (l.includes('MÃ') || l.includes('????')) console.log('BAD line '+(i+1)+':', l.substring(0,80).trim());
});
