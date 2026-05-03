const fs = require('fs');
const pages = [
  'modules/Financeiro/index.html',
  'modules/Financeiro/bancos.html',
  'modules/Vendas/public/index.html',
  'modules/Compras/cotacoes.html',
  'modules/PCP/index.html',
  'modules/RH/public/pages/funcionarios.html',
  'modules/RH/public/pages/folha.html',
  'modules/NFe/index.html',
  'modules/Admin/public/pages/permissoes.html',
  'modules/Logistica/public/index.html',
];
for (const f of pages) {
  if (!fs.existsSync(f)) { console.log('NOT FOUND: ' + f); continue; }
  const text = fs.readFileSync(f, 'utf8').slice(0, 5000);
  const m = text.match(/<header[\s\S]{0,600}/);
  console.log('=== ' + f + ' ===');
  if (m) console.log(m[0].slice(0,500));
  else {
    const title = (text.match(/<title>([^<]+)<\/title>/) || [])[1] || '?';
    console.log('NO <header> | title=' + title);
    // find first div with logo/brand clue
    const brand = text.match(/class="[^"]*logo[^"]*"|class="[^"]*brand[^"]*"|class="[^"]*navbar[^"]*"/);
    if (brand) console.log('BRAND hint: ' + brand[0]);
  }
  console.log('');
}
