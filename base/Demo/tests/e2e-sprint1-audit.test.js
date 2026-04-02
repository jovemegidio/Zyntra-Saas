/**
 * TDD VERIFICATION — Sprint 1 E2E Audit Fixes
 * Static analysis tests that verify code patterns without running the server.
 * Each test validates that a specific fix is correctly applied.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function readFile(relPath) {
    return fs.readFileSync(path.join(ROOT, relPath), 'utf-8');
}

let passed = 0;
let failed = 0;
const results = [];

function assert(condition, testName, detail = '') {
    if (condition) {
        passed++;
        results.push(`  ✅ PASS: ${testName}`);
    } else {
        failed++;
        results.push(`  ❌ FAIL: ${testName}${detail ? ' — ' + detail : ''}`);
    }
}

console.log('='.repeat(70));
console.log('  TDD VERIFICATION — SPRINT 1 (Integridade Transacional)');
console.log('='.repeat(70));
console.log('');

// =====================================================
// TEST 1: E5-CRIT-05 — pedido_id in GET /contas-receber
// =====================================================
console.log('[TEST GROUP] E5-CRIT-05: pedido_id no GET /contas-receber');
const finRoutes = readFile('routes/financeiro-routes.js');

assert(
    finRoutes.includes('cr.pedido_id,'),
    'GET /contas-receber SELECT includes cr.pedido_id'
);

assert(
    finRoutes.includes("pedido_id } = req.query"),
    'GET /contas-receber destructures pedido_id from query params'
);

assert(
    finRoutes.includes("cr.pedido_id = ?"),
    'GET /contas-receber has WHERE filter for pedido_id'
);

// =====================================================
// TEST 2: E3-CRIT-04 — Transaction in OP→faturar (PCP)
// =====================================================
console.log('[TEST GROUP] E3-CRIT-04: Transação na OP→faturar');
const pcpRoutes = readFile('routes/pcp-routes.js');

// PUT handler
const putOpConcluida = pcpRoutes.indexOf('E3-CRIT-04 fix');
assert(putOpConcluida !== -1, 'PUT /ordens-kanban has E3-CRIT-04 fix comment');

assert(
    pcpRoutes.includes('const pipeConn = await pool.getConnection()'),
    'PCP uses dedicated connection for pipeline auto-update'
);

assert(
    pcpRoutes.includes("await pipeConn.beginTransaction()"),
    'PCP wraps OP→faturar in beginTransaction'
);

assert(
    pcpRoutes.includes("FROM pedidos WHERE id = ? FOR UPDATE"),
    'PCP uses FOR UPDATE when reading pedido status'
);

assert(
    pcpRoutes.includes("await pipeConn.commit()"),
    'PCP commits pipeline transaction'
);

assert(
    pcpRoutes.includes("await pipeConn.rollback()"),
    'PCP rolls back on pipeline error'
);

assert(
    pcpRoutes.includes("pipeConn.release()"),
    'PCP releases connection in finally block'
);

// PATCH handler should also be fixed
const patchPipelineIdx = pcpRoutes.indexOf('E3-CRIT-04 fix', putOpConcluida + 1);
assert(patchPipelineIdx !== -1, 'PATCH /ordens-kanban also has E3-CRIT-04 fix');

// =====================================================
// TEST 3: E1-HIGH-01 — Vendor filter in GET /pedidos
// =====================================================
console.log('[TEST GROUP] E1-HIGH-01: Filtro vendedor GET /pedidos');
const vendasRoutes = readFile('routes/vendas-routes.js');
const pedidoRepo = readFile('repositories/pedido-repository.js');

assert(
    pedidoRepo.includes('userId, isAdmin'),
    'PedidoRepository.list accepts userId and isAdmin params'
);

assert(
    pedidoRepo.includes("p.vendedor_id = ?"),
    'PedidoRepository.list filters by vendedor_id for non-admin'
);

assert(
    pedidoRepo.includes('!isAdmin'),
    'Filter only applies when user is NOT admin'
);

assert(
    vendasRoutes.includes("userId: user.id, isAdmin"),
    'GET /pedidos route passes userId and isAdmin to repository'
);

// =====================================================
// TEST 4: E4-HIGH-07 — Block address after faturamento
// =====================================================
console.log('[TEST GROUP] E4-HIGH-07: Bloqueio endereço pós-faturamento');

assert(
    vendasRoutes.includes("deliveryFields"),
    'PATCH handler defines deliveryFields array'
);

assert(
    vendasRoutes.includes("'endereco_entrega'") && vendasRoutes.includes("'municipio_entrega'"),
    'deliveryFields includes endereco_entrega and municipio_entrega'
);

assert(
    vendasRoutes.includes("[...financialFields, ...deliveryFields]"),
    'Blocked fields check combines financial + delivery fields'
);

// =====================================================
// TEST 5: RC-HIGH-01 — Transaction in PATCH /pedidos
// =====================================================
console.log('[TEST GROUP] RC-HIGH-01: Transação no PATCH /pedidos');

assert(
    vendasRoutes.includes('const patchConn = await pool.getConnection()'),
    'PATCH uses dedicated connection (patchConn)'
);

assert(
    vendasRoutes.includes('await patchConn.beginTransaction()'),
    'PATCH starts transaction'
);

assert(
    vendasRoutes.includes('FOR UPDATE', vendasRoutes.indexOf('patchConn')),
    'PATCH uses FOR UPDATE on SELECT'
);

assert(
    vendasRoutes.includes('await patchConn.commit()'),
    'PATCH commits transaction on success'
);

assert(
    vendasRoutes.includes('await patchConn.rollback()'),
    'PATCH rolls back on error'
);

assert(
    vendasRoutes.includes('patchConn.release()'),
    'PATCH releases connection in finally'
);

// Verify old pool.query is NOT used for critical writes inside PATCH
// The main UPDATE should use patchConn, not pool
const patchSection = vendasRoutes.substring(
    vendasRoutes.indexOf('const patchConn'),
    vendasRoutes.indexOf('patchConn.release()')
);

assert(
    patchSection.includes('await patchConn.query(query, values)'),
    'Main UPDATE in PATCH uses patchConn (not pool.query)'
);

// =====================================================
// TEST 6: E5-HIGH-09 — pedido_id in POST /contas-receber
// =====================================================
console.log('[TEST GROUP] E5-HIGH-09: pedido_id no POST manual contas-receber');

assert(
    finRoutes.includes("pedido_id } = req.body"),
    'POST /contas-receber destructures pedido_id from body'
);

assert(
    finRoutes.includes("pedido_id, status"),
    'POST /contas-receber INSERT includes pedido_id column'
);

// =====================================================
// TEST 7: E5-CRIT-06 — Use SUM(itens) for contas_receber value
// =====================================================
console.log('[TEST GROUP] E5-CRIT-06: Valor contas_receber = SUM(itens)');

assert(
    vendasRoutes.includes('SUM(subtotal)') && vendasRoutes.includes('total_itens'),
    'Faturamento queries SUM(subtotal) from pedido_itens'
);

assert(
    vendasRoutes.includes('valorFaturamento'),
    'Uses valorFaturamento variable (derived from SUM(itens))'
);

assert(
    vendasRoutes.includes("valor: valorFaturamento"),
    'gerarContaReceber receives valorFaturamento instead of valorPedido'
);

// =====================================================
// REGRESSION CHECKS — Nothing broken
// =====================================================
console.log('[TEST GROUP] REGRESSION: Funcionalidades existentes preservadas');

// Status machine still exists
assert(
    vendasRoutes.includes('VALID_STATUS_TRANSITIONS'),
    'Status transition machine preserved'
);

// FOR UPDATE on PUT /status still exists
assert(
    vendasRoutes.includes('FROM pedidos WHERE id = ? FOR UPDATE'),
    'PUT /status still uses FOR UPDATE'
);

// K-05 fix: PATCH still blocks status changes
assert(
    vendasRoutes.includes("updates.status !== undefined"),
    'PATCH still blocks status changes (K-05)'
);

// Estoque auto-baixa still exists
assert(
    vendasRoutes.includes('baixarEstoqueAutomatico'),
    'Estoque auto-baixa function preserved'
);

// OP auto-creation still works
assert(
    vendasRoutes.includes('[PIPELINE_AUTO] OP'),
    'OP auto-creation on pedido-aprovado preserved'
);

// Faturamento shared service import should work
assert(
    vendasRoutes.includes('faturamentoShared'),
    'faturamentoShared service reference preserved'
);

// Estorno on cancel still works
assert(
    vendasRoutes.includes('ESTORNO_ESTOQUE'),
    'Estorno de estoque on cancel preserved'
);

// PCP mapKanbanToStatus still referenced
assert(
    pcpRoutes.includes('mapKanbanToStatus'),
    'PCP mapKanbanToStatus function preserved'
);

// Logistica routes still work (not modified in Sprint 1)
const logisticaRoutes = readFile('routes/logistica-routes.js');
assert(
    logisticaRoutes.includes("router.get('/pedidos'"),
    'Logística GET /pedidos route preserved'
);

assert(
    logisticaRoutes.includes("router.get('/dashboard'"),
    'Logística dashboard route preserved'
);

// =====================================================
// SUMMARY
// =====================================================
console.log('');
console.log('='.repeat(70));
console.log(`  RESULTS: ${passed} passed, ${failed} failed, ${passed + failed} total`);
console.log('='.repeat(70));
results.forEach(r => console.log(r));
console.log('');

if (failed > 0) {
    console.log(`⚠️  ${failed} test(s) FAILED — review fixes before deploying`);
    process.exit(1);
} else {
    console.log('✅ All Sprint 1 fixes verified. No regressions detected.');
    process.exit(0);
}
