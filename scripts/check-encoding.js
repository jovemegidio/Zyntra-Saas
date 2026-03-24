const fs = require('fs');
const b = fs.readFileSync('src/routes/compras.js');
console.log('File size:', b.length);
// Find 'DULO' pattern to check bytes before it (should be Ó = C3 93)
const target = Buffer.from('DULO');
for (let i = 0; i < b.length - 4; i++) {
  if (b[i] === target[0] && b[i+1] === target[1] && b[i+2] === target[2] && b[i+3] === target[3]) {
    const ctx = b.slice(Math.max(0, i-6), i+8);
    console.log('Found DULO at', i, '- hex:', ctx.toString('hex'), '- latin1:', ctx.toString('latin1'));
    break;
  }
}
// Count 0xC3 bytes (start of 2-byte UTF-8 sequences for Latin chars)
let c3count = 0;
for (let i = 0; i < b.length; i++) { if (b[i] === 0xC3) c3count++; }
console.log('0xC3 bytes (accented chars indicator):', c3count);

// Check first 5 lines
const lines = b.toString('utf8').split('\n').slice(0, 5);
lines.forEach((l, i) => console.log(i+1+':', l.substring(0, 90)));
