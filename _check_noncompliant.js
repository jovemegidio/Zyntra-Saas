const fs = require('fs');
const pages = [
  'modules/RH/public/pages/relatorios.html',
  'modules/RH/index.html',
  'modules/Compras/qrcode-estoque.html',
  'modules/NFe/danfe.html',
  'modules/PCP/index_new.html',
  'modules/Vendas/public/index_utf8.html',
  'modules/PCP/apontamentos_backup.html',
];
for (const f of pages) {
  if (!fs.existsSync(f)) { console.log('NOT FOUND: ' + f); continue; }
  const text = fs.readFileSync(f, 'utf8');
  const asideEnd = text.indexOf('</aside>');
  const hdrStart = text.indexOf('<header');
  const slice = asideEnd >= 0 ? text.slice(asideEnd, asideEnd + 600) : 
                (hdrStart >= 0 ? text.slice(hdrStart, hdrStart + 600) : text.slice(0, 300));
  const title = (text.match(/<title>([^<]+)<\/title>/) || [])[1] || '?';
  const size = fs.statSync(f).size;
  console.log('=== ' + f + ' [' + Math.round(size/1024) + 'KB] title=' + title + ' ===');
  console.log(slice.slice(0,500));
  console.log('');
}
