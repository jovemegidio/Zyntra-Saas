const fs = require('fs');

// danfe.html - has header but missing logo
const danfe = fs.readFileSync('modules/NFe/danfe.html', 'utf8');
const hdrStart = danfe.indexOf('<header class="header"');
const hdrEnd = danfe.indexOf('</header>', hdrStart) + 9;
console.log('=== NFe/danfe.html HEADER ===');
console.log(danfe.slice(hdrStart, hdrEnd));
console.log('');

// RH/index.html - old layout
const rh = fs.readFileSync('modules/RH/index.html', 'utf8');
const bodyIdx = rh.indexOf('<body');
console.log('=== RH/index.html BODY START (600 chars) ===');
console.log(rh.slice(bodyIdx, bodyIdx + 600));
console.log('');

// Also check if relatorios.html is accessed inside an iframe or standalone
const rel = fs.readFileSync('modules/RH/public/pages/relatorios.html', 'utf8');
console.log('=== RH relatorios.html FULL (' + rel.length + ' chars) ===');
console.log(rel.slice(0, 300));
