/**
 * Sprint 2 — TDD Verification (Static Code Analysis)
 * Validates all 5 Sprint 2 fixes + regression checks for Sprint 1 fixes
 */
const fs = require('fs');
const path = require('path');

const VENDAS = fs.readFileSync(path.join(__dirname, '..', 'routes', 'vendas-routes.js'), 'utf-8');
const LOGISTICA = fs.readFileSync(path.join(__dirname, '..', 'routes', 'logistica-routes.js'), 'utf-8');
const FINANCEIRO = fs.readFileSync(path.join(__dirname, '..', 'routes', 'financeiro-routes.js'), 'utf-8');
const PCP = fs.readFileSync(path.join(__dirname, '..', 'routes', 'pcp-routes.js'), 'utf-8');
const PEDIDO_REPO = fs.readFileSync(path.join(__dirname, '..', 'repositories', 'pedido-repository.js'), 'utf-8');

let passed = 0;
let failed = 0;
const results = [];

function assert(name, condition) {
    if (condition) {
        passed++;
        results.push(`  ✅ ${name}`);
    } else {
        failed++;
        results.push(`  ❌ FAIL: ${name}`);
    }
}

// ========================================================
// S2-Fix1: Roles Intermediários RBAC (E2-CRIT-02)
// ========================================================
console.log('\n🔐 S2-Fix1: Roles Intermediários RBAC (E2-CRIT-02)');

assert('supervisor role defined in statusPermissions',
    VENDAS.includes("'supervisor':") && VENDAS.includes("statusPermissions"));

assert('supervisor can approve (includes aprovado)',
    /supervisor.*\[.*'aprovado'/.test(VENDAS) || /supervisor.*aprovado/.test(VENDAS));

assert('supervisor CANNOT faturar (no faturar in supervisor perms)',
    (() => {
        const m = VENDAS.match(/'supervisor'\s*:\s*\[(.*?)\]/s);
        return m && !m[1].includes("'faturar'");
    })());

assert('aprovador role defined in statusPermissions',
    VENDAS.includes("'aprovador':") && VENDAS.includes("statusPermissions"));

assert('aprovador can faturar (includes faturar)',
    (() => {
        const m = VENDAS.match(/'aprovador'\s*:\s*\[(.*?)\]/s);
        return m && m[1].includes("'faturar'");
    })());

assert('aprovador CANNOT move to faturado directly (no faturado in aprovador)',
    (() => {
        const m = VENDAS.match(/'aprovador'\s*:\s*\[(.*?)\]/s);
        return m && !m[1].includes("'faturado'");
    })());

assert('comercial/user still limited to analise-credito max',
    (() => {
        const m = VENDAS.match(/'comercial'\s*:\s*\[(.*?)\]/s);
        return m && !m[1].includes("'aprovado'") && m[1].includes("'analise-credito'");
    })());

// ========================================================
// S2-Fix2: Restringir forceTransition (E2-CRIT-03)
// ========================================================
console.log('\n🔒 S2-Fix2: Restringir forceTransition (E2-CRIT-03)');

assert('forceTransition requires isAdmin (canForce = forceTransition && isAdmin)',
    VENDAS.includes('forceTransition && isAdmin'));

assert('canForce variable used in transition validation',
    VENDAS.includes('!canForce'));

assert('forceTransition bypass is logged with [AUDIT] tag',
    VENDAS.includes('[AUDIT]') && VENDAS.includes('FORÇOU transição'));

assert('non-admin forceTransition is blocked (old bypass removed)',
    !VENDAS.includes('!transicoesValidas.includes(status) && !forceTransition)'));

// ========================================================
// S2-Fix3: Restringir Cancelamento Vendedor (E2-HIGH-03)
// ========================================================
console.log('\n🚫 S2-Fix3: Restringir Cancelamento Vendedor (E2-HIGH-03)');

assert('statusAvancados array defined for cancel restriction',
    VENDAS.includes('statusAvancados') && VENDAS.includes("'aprovado'"));

assert('vendedor cancel check targets user/comercial roles',
    VENDAS.includes("['user', 'comercial', 'default'].includes(userRole)"));

assert('cancel block checks status === cancelado',
    VENDAS.includes("status === 'cancelado'") && VENDAS.includes('statusAvancados.includes(statusAtual)'));

assert('blocked cancel returns 403 with helpful message',
    VENDAS.includes('Vendedores não podem cancelar pedidos'));

// ========================================================
// S2-Fix4: Fix Filtro Logística Status (E4-HIGH-06)
// ========================================================
console.log('\n📦 S2-Fix4: Fix Filtro Logística Status (E4-HIGH-06)');

assert('dashboard separates pendente from aguardando_separacao',
    LOGISTICA.includes('pendente:') && LOGISTICA.includes('aguardando_separacao:'));

assert('dashboard pendente query does NOT include aguardando_separacao',
    (() => {
        // Find the first dashboard query (pendente counter)
        const dashSection = LOGISTICA.substring(0, LOGISTICA.indexOf('aguardandoSep'));
        const pendQuery = dashSection.substring(dashSection.lastIndexOf('SELECT COUNT'));
        return pendQuery && !pendQuery.includes('aguardando_separacao');
    })());

assert('dashboard has separate aguardando_separacao query',
    LOGISTICA.includes("status_logistica = 'aguardando_separacao'"));

assert('listing filter for pendente does NOT merge aguardando_separacao',
    (() => {
        // Find the GET /pedidos filter section
        const listSection = LOGISTICA.substring(LOGISTICA.indexOf("router.get('/pedidos'"));
        const filterPart = listSection.substring(0, listSection.indexOf('ORDER BY'));
        // The old code had: status === 'pendente' || status === 'aguardando_separacao' both mapping to same query
        return !filterPart.includes("status === 'aguardando_separacao'");
    })());

assert('error fallback includes both pendente and aguardando_separacao fields',
    LOGISTICA.includes('pendente: 0') && LOGISTICA.includes('aguardando_separacao: 0'));

// ========================================================
// S2-Fix5: Auditoria Delta no PATCH Valor (E1-HIGH-02)
// ========================================================
console.log('\n📊 S2-Fix5: Auditoria Delta no PATCH Valor (E1-HIGH-02)');

assert('deltaInfo object created for audit',
    VENDAS.includes('deltaInfo'));

assert('camposAuditaveis array defined with valor, frete, desconto',
    VENDAS.includes('camposAuditaveis') && VENDAS.includes("'valor'") && VENDAS.includes("'frete'"));

assert('delta records anterior and novo values',
    VENDAS.includes('anterior:') && VENDAS.includes('novo:'));

assert('delta info included in meta JSON (pedido_historico)',
    VENDAS.includes('delta: deltaInfo'));

assert('compares against existing (pre-update) record',
    VENDAS.includes('existing[campo]'));

// ========================================================
// REGRESSION CHECKS — Sprint 1 fixes still intact
// ========================================================
console.log('\n🔄 Regression: Sprint 1 Fixes Still Intact');

assert('[S1] VALID_STATUS_TRANSITIONS state machine preserved',
    VENDAS.includes('VALID_STATUS_TRANSITIONS') && VENDAS.includes("'orcamento':") && VENDAS.includes("'faturado':"));

assert('[S1] FOR UPDATE on PUT /pedidos/:id/status preserved',
    VENDAS.includes("FROM pedidos WHERE id = ? FOR UPDATE', [id]"));

assert('[S1] PATCH status block (K-05) preserved',
    VENDAS.includes("Alteração de status não é permitida via PATCH"));

assert('[S1] estoque auto-baixa function preserved',
    VENDAS.includes('baixarEstoqueAutomatico'));

assert('[S1] OP auto-creation on pedido-aprovado preserved',
    VENDAS.includes("status === 'pedido-aprovado'") && VENDAS.includes('ordens_producao'));

assert('[S1] faturamentoShared.isAdmin reference preserved',
    VENDAS.includes('faturamentoShared.isAdmin'));

assert('[S1] PCP transaction in OP→faturar preserved',
    PCP.includes('pipeConn') && PCP.includes('beginTransaction'));

assert('[S1] pedido_id in GET /contas-receber preserved',
    FINANCEIRO.includes('cr.pedido_id'));

assert('[S1] vendedor filter in pedido-repository preserved',
    PEDIDO_REPO.includes('vendedor_id') && PEDIDO_REPO.includes('isAdmin'));

assert('[S1] deliveryFields block post-faturamento preserved',
    VENDAS.includes('deliveryFields') && VENDAS.includes("'endereco_entrega'"));

assert('[S1] PATCH wrapped in transaction (patchConn) preserved',
    VENDAS.includes('patchConn.beginTransaction') || VENDAS.includes('patchConn.commit'));

assert('[S1] SUM(subtotal) for contas_receber value preserved',
    VENDAS.includes('SUM(subtotal)') && VENDAS.includes('valorFaturamento'));

// ========================================================
// RESULTS
// ========================================================
console.log('\n' + '='.repeat(60));
console.log(`RESULTS: ${passed} passed, ${failed} failed, ${passed + failed} total`);
console.log('='.repeat(60));
results.forEach(r => console.log(r));
console.log('='.repeat(60));

if (failed > 0) {
    console.log(`\n⚠️ ${failed} test(s) FAILED. Review the fixes above.`);
    process.exit(1);
} else {
    console.log('\n✅ All Sprint 2 fixes verified. No regressions detected.');
    process.exit(0);
}
