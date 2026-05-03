const fs = require('fs');
const pages = [
  'modules/RH/public/pages/relatorios.html',
  'modules/RH/index.html',
  'modules/Compras/qrcode-estoque.html',
];
for (const f of pages) {
  const text = fs.readFileSync(f, 'utf8');
  const bodyIdx = text.indexOf('<body');
  console.log('=== ' + f + ' ===');
  console.log(text.slice(bodyIdx, bodyIdx + 1000));
  console.log('');
}
