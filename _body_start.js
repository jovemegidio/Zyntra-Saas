const fs = require('fs');
// Look at what structure exists around where header would go
const pages = [
  'modules/Financeiro/index.html',
  'modules/Vendas/public/index.html',
  'modules/RH/public/pages/funcionarios.html',
  'modules/PCP/index.html',
  'modules/Compras/cotacoes.html',
];
for (const f of pages) {
  if (!fs.existsSync(f)) continue;
  const text = fs.readFileSync(f, 'utf8');
  // find body opening and first 600 chars after
  const bodyIdx = text.indexOf('<body');
  const slice = text.slice(bodyIdx, bodyIdx + 600);
  console.log('=== ' + f + ' ===');
  console.log(slice);
  console.log('');
}
