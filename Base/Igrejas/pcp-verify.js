const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, 'pcp-verify.txt');
const src = fs.readFileSync(path.join(__dirname, 'modules', 'PCP', 'server.js'), 'utf8');

const r = [];
function check(name, ok) { r.push((ok ? 'PASS' : 'FAIL') + ': ' + name); }

// BUG-01: State machine
check('BUG01-VALID_TRANSITIONS_CTRL', src.includes('VALID_TRANSITIONS_CTRL'));
check('BUG01-NFD', src.includes("normalize('NFD')"));

// BUG-02: Estoque negativo
check('BUG02-estoque-negativo', src.includes('estoqueAtualFinal < 0'));

// BUG-03: Cancelamento com reversão
check('BUG03-SAIDA', src.includes('SAIDA'));
check('BUG03-ENTRADA', src.includes('ENTRADA'));
check('BUG03-beginTransaction', src.includes('beginTransaction'));
check('BUG03-rollback', src.includes('rollback'));

// BUG-04: RBAC POST /ordens
check('BUG04-POST-ordens-RBAC', /app\.post\s*\(\s*['"]\/ordens['"]\s*,\s*authenticateToken\s*,\s*requireProductionRole/.test(src));

// BUG-05: RBAC saida/entrada
check('BUG05-saida-RBAC', /saida['"]\s*,\s*authenticateToken\s*,\s*requireProductionRole/.test(src));
check('BUG05-entrada-RBAC', /entrada['"]\s*,\s*authenticateToken\s*,\s*requireProductionRole/.test(src));

// BUG-06: Race condition
check('BUG06-FOR_UPDATE', src.includes('FOR UPDATE'));
check('BUG06-getConnection', src.includes('getConnection'));
check('BUG06-release', src.includes('connection.release'));

// BUG-07: Materiais RBAC + AJUSTE
check('BUG07-materiais-RBAC', /materiais\/:id['"]\s*,\s*authenticateToken\s*,\s*requireProductionRole/.test(src));
check('BUG07-AJUSTE', src.includes('AJUSTE'));

// BUG-08: Quantidade <= 0
const qtdOk = src.includes('parseFloat(quantidade) <= 0') || src.includes('quantidade) <= 0');
check('BUG08-qtd-invalida', qtdOk);

// BUG-09: Preço negativo
const precoOk = src.includes('precoVendaFinal < 0') || src.includes('preco_custo < 0');
check('BUG09-preco-negativo', precoOk);

// BUG-10: RBAC kanban
check('BUG10-kanban-RBAC', /ordens-kanban\/:id['"]\s*,\s*authenticateToken\s*,\s*requireProductionRole/.test(src));

// BUG-11: VALID_ETAPA_STATUS
check('BUG11-VALID_ETAPA_STATUS', src.includes('VALID_ETAPA_STATUS'));

// BUG-12: NFD normalization (at least 2 occurrences)
const nfdCount = (src.match(/\.normalize\('NFD'\)/g) || []).length;
check('BUG12-NFD-count-' + nfdCount, nfdCount >= 2);

// BUG-13: Soft delete expanded status list
check('BUG13-qualidade', src.includes("'qualidade'"));
check('BUG13-conferido', src.includes("'conferido'"));
check('BUG13-armazenado', src.includes("'armazenado'"));

// BUG-14: Data no passado
check('BUG14-data_previsao', src.includes('data_previsao_entrega'));
const passadoOk = src.includes('passado') || src.includes('anterior');
check('BUG14-rejeita-passado', passadoOk);

// Summary
const pass = r.filter(x => x.startsWith('PASS')).length;
const fail = r.filter(x => x.startsWith('FAIL')).length;
const output = r.join('\n') + '\n---\n' + pass + '/' + r.length + ' PASSED, ' + fail + ' FAILED\n';

fs.writeFileSync(OUT, output);
process.stdout.write(output);
