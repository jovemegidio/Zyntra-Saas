const fs = require('fs');
const pages = [
  'modules/Financeiro/index.html',
  'modules/Vendas/public/index.html',
  'modules/RH/public/pages/funcionarios.html',
  'modules/Compras/cotacoes.html',
];
for (const f of pages) {
  if (!fs.existsSync(f)) continue;
  const text = fs.readFileSync(f, 'utf8');
  const asideEnd = text.indexOf('</aside>');
  if (asideEnd < 0) { console.log(f + ': no </aside>'); continue; }
  const slice = text.slice(asideEnd, asideEnd + 300);
  console.log('=== ' + f + ' ===');
  console.log(slice);
  console.log('');
}
