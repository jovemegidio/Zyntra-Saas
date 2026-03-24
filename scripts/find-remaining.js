const fs = require('fs');
const c = fs.readFileSync('src/routes/compras.js', 'utf8');
const lines = c.split('\n');
lines.forEach((l, i) => { if (l.includes('??')) console.log((i+1)+':', l.trim()); });
