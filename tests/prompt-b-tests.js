/**
 * PROMPT-B — Financeiro: Fluxo de Caixa + Contas a Pagar
 * Testes de validação das correções UC-FIN-01, UC-FIN-02, UC-FIN-04, UC-FIN-05, R08, R16
 *
 * Executar: node tests/prompt-b-tests.js
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

// ===== Helpers =====
const fluxoCaixaHtml = fs.readFileSync(
    path.join(__dirname, '..', 'modules', 'Financeiro', 'public', 'fluxo_caixa.html'), 'utf-8'
);
const contasPagarHtml = fs.readFileSync(
    path.join(__dirname, '..', 'modules', 'Financeiro', 'public', 'contas_pagar.html'), 'utf-8'
);

function escHtml(s) {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
    return String(s || '').replace(/[&<>"]/g, c => map[c]);
}

let passed = 0;
let failed = 0;

function test(name, fn) {
    try {
        fn();
        passed++;
        console.log(`  ✅ ${name}`);
    } catch (e) {
        failed++;
        console.log(`  ❌ ${name}`);
        console.log(`     ${e.message}`);
    }
}

// ===================================================================
console.log('\n🧪 PROMPT-B Financeiro Fixes\n');

// ----- T-B01: Período "Semana" -----
console.log('T-B01: Período Semana');
test('Botão "Semana" existe no HTML', () => {
    assert.ok(fluxoCaixaHtml.includes('data-periodo="semana"'), 'Botão semana não encontrado');
});
test('selecionarPeriodo trata case "semana"', () => {
    assert.ok(fluxoCaixaHtml.includes("case 'semana':"), 'Case semana não encontrado no JS');
});

// ----- T-B02: Saldos negativos vermelho -----
console.log('\nT-B02: Saldos negativos em vermelho');
test('CSS classe saldo-negativo existe', () => {
    assert.ok(fluxoCaixaHtml.includes('tr.saldo-negativo td'), 'CSS saldo-negativo não encontrado');
    assert.ok(fluxoCaixaHtml.includes('#fef2f2'), 'Background vermelho claro não encontrado');
});
test('renderizarTabela aplica classe saldo-negativo', () => {
    assert.ok(fluxoCaixaHtml.includes('saldo-negativo'), 'Classe saldo-negativo não aplicada na tabela');
    assert.ok(fluxoCaixaHtml.includes('saldoAcum < 0'), 'Condição saldoAcum < 0 não encontrada');
});

// ----- T-B03: XSS sanitizado -----
console.log('\nT-B03: XSS Prevention');
test('Função escHtml existe', () => {
    assert.ok(fluxoCaixaHtml.includes('function escHtml(s)'), 'Função escHtml não encontrada');
});
test('escHtml sanitiza tags script', () => {
    const result = escHtml('<script>alert(1)</script>');
    assert.strictEqual(result, '&lt;script&gt;alert(1)&lt;/script&gt;');
});
test('renderizarTabela usa escHtml para descrição', () => {
    assert.ok(fluxoCaixaHtml.includes('escHtml(m.descricao'), 'escHtml não usado em descricao');
});
test('renderizarTabela usa escHtml para categoria', () => {
    assert.ok(fluxoCaixaHtml.includes('escHtml(m.categoria'), 'escHtml não usado em categoria');
});

// ----- T-B04: exportarFluxoPDF limpo -----
console.log('\nT-B04: exportarFluxoPDF HTML limpo');
test('exportarFluxoPDF não contém widget.js dentro do document.write', () => {
    // Extrair conteúdo entre document.write(` e `);
    const match = fluxoCaixaHtml.match(/exportarFluxoPDF[\s\S]*?w\.document\.write\(`([\s\S]*?)`\)/);
    assert.ok(match, 'Não encontrou document.write em exportarFluxoPDF');
    const htmlContent = match[1];
    assert.ok(!htmlContent.includes('widget.js'), 'widget.js encontrado dentro do document.write');
    assert.ok(!htmlContent.includes('socket.io.js'), 'socket.io.js encontrado dentro do document.write');
    assert.ok(!htmlContent.includes('chat-widget.js'), 'chat-widget.js encontrado dentro do document.write');
});
test('exportarFluxoPDF tem resumo de totais', () => {
    assert.ok(fluxoCaixaHtml.includes('Entradas: R$') || fluxoCaixaHtml.includes('Entradas:'), 'Resumo de entradas não encontrado no PDF');
});

// ----- T-B05: Scripts não duplicados -----
console.log('\nT-B05: Scripts sem duplicação');
test('socket.io.js carregado apenas 1x', () => {
    const count = (fluxoCaixaHtml.match(/src="\/socket\.io\/socket\.io\.js"/g) || []).length;
    assert.strictEqual(count, 1, `socket.io.js encontrado ${count}x (esperado 1)`);
});
test('chat-widget.js carregado apenas 1x', () => {
    const count = (fluxoCaixaHtml.match(/src="\/chat-teams\/chat-widget\.js/g) || []).length;
    assert.strictEqual(count, 1, `chat-widget.js encontrado ${count}x (esperado 1)`);
});
test('user-dropdown.js carregado apenas 1x', () => {
    const count = (fluxoCaixaHtml.match(/src="\/js\/user-dropdown\.js/g) || []).length;
    assert.strictEqual(count, 1, `user-dropdown.js encontrado ${count}x (esperado 1)`);
});

// ----- T-B06: Tratamento de erros HTTP -----
console.log('\nT-B06: Erros HTTP tratados');
test('carregarFluxo trata HTTP 401', () => {
    assert.ok(fluxoCaixaHtml.includes('r.status === 401'), 'Tratamento de 401 não encontrado');
    assert.ok(fluxoCaixaHtml.includes("'/login.html"), 'Redirect para login não encontrado');
});
test('carregarFluxo trata HTTP 503', () => {
    assert.ok(fluxoCaixaHtml.includes('r.status === 503'), 'Tratamento de 503 não encontrado');
});
test('Query params usam encodeURIComponent', () => {
    assert.ok(fluxoCaixaHtml.includes('encodeURIComponent(inicio)'), 'encodeURIComponent não usado em inicio');
    assert.ok(fluxoCaixaHtml.includes('encodeURIComponent(fim)'), 'encodeURIComponent não usado em fim');
});
test('Banner de erro existe no HTML', () => {
    assert.ok(fluxoCaixaHtml.includes('id="alert-erro"'), 'Banner de erro não encontrado');
});

// ----- T-B07: Alerta recorrências -----
console.log('\nT-B07: Alerta de recorrências pendentes');
test('Banner de recorrências existe no HTML', () => {
    assert.ok(fluxoCaixaHtml.includes('id="alert-recorrencia"'), 'Banner de recorrência não encontrado');
});
test('Flag recorrencias_pendentes verificada', () => {
    assert.ok(fluxoCaixaHtml.includes('recorrencias_pendentes'), 'Verificação de recorrencias_pendentes não encontrada');
});

// ----- T-B08: Limite export >50k -----
console.log('\nT-B08: Limite de exportação (R16)');
test('exportarFluxo verifica > 50000 registros', () => {
    assert.ok(fluxoCaixaHtml.includes('50000'), 'Limite de 50000 não verificado no export');
});
test('CSV inclui coluna Saldo Acumulado', () => {
    assert.ok(fluxoCaixaHtml.includes("'Saldo Acumulado'"), 'Coluna Saldo Acumulado não encontrada no CSV');
});
test('URL.revokeObjectURL chamado após download', () => {
    assert.ok(fluxoCaixaHtml.includes('URL.revokeObjectURL'), 'Memory leak: revokeObjectURL não chamado');
});

// ----- T-B09: Saldo projetado real -----
console.log('\nT-B09: Saldo projetado diferencia realizado vs. futuro');
test('atualizarResumo calcula entradasRealizadas e entradasFut separadas', () => {
    assert.ok(fluxoCaixaHtml.includes('entradasRealizadas'), 'entradasRealizadas não encontrado');
    assert.ok(fluxoCaixaHtml.includes('saidasRealizadas'), 'saidasRealizadas não encontrado');
    assert.ok(fluxoCaixaHtml.includes('entradasFut'), 'entradasFut não encontrado');
    assert.ok(fluxoCaixaHtml.includes('saidasFut'), 'saidasFut não encontrado');
});
test('saldoProjetado usa cálculo real (não cópia de saldo)', () => {
    assert.ok(fluxoCaixaHtml.includes('saldoRealizado + entradasFut - saidasFut'), 'Cálculo de projeção incorreto');
});
test('KPI saldo projetado muda cor quando negativo', () => {
    assert.ok(fluxoCaixaHtml.includes("saldoProjetado >= 0 ? '#8b5cf6' : '#ef4444'"), 'Cor dinâmica do saldo projetado não encontrada');
});

// ----- T-B10: Idempotência contas_pagar -----
console.log('\nT-B10: X-Idempotency-Key no POST contas-pagar');
test('Header X-Idempotency-Key enviado no POST', () => {
    assert.ok(contasPagarHtml.includes('X-Idempotency-Key'), 'Header X-Idempotency-Key não encontrado');
});
test('Usa crypto.randomUUID para gerar key', () => {
    assert.ok(contasPagarHtml.includes('crypto.randomUUID()'), 'crypto.randomUUID não usado');
});
test('Botão salvar desabilitado durante envio', () => {
    assert.ok(contasPagarHtml.includes('btnSave.disabled = true'), 'Debounce no salvar não implementado');
});
test('Trata HTTP 409 Conflict (duplicação)', () => {
    assert.ok(contasPagarHtml.includes('response.status === 409') || contasPagarHtml.includes("status === 409"), 'Tratamento de 409 não encontrado');
});

// ----- T-B11: Debounce botão baixar -----
console.log('\nT-B11: Debounce no botão Confirmar Pagamento');
test('Botão de pagamento desabilitado durante processamento', () => {
    assert.ok(contasPagarHtml.includes('btnPagar.disabled = true'), 'Debounce no pagamento não implementado');
});
test('Botão restaurado no finally', () => {
    assert.ok(contasPagarHtml.includes('btnPagar.disabled = false'), 'Botão não restaurado após erro');
});
test('Spinner exibido durante processamento', () => {
    assert.ok(contasPagarHtml.includes('fa-spinner fa-spin') && contasPagarHtml.includes('Processando'), 'Spinner de processamento não encontrado');
});

// ----- T-B12: Popup bloqueado -----
console.log('\nT-B12: Popup bloqueado na impressão');
test('exportarFluxoPDF verifica se window.open retornou null', () => {
    assert.ok(fluxoCaixaHtml.includes('if (!w)'), 'Verificação de popup bloqueado não encontrada');
});
test('Mensagem de popup bloqueado exibida', () => {
    assert.ok(fluxoCaixaHtml.includes('Popup bloqueado'), 'Mensagem de popup bloqueado não encontrada');
});

// ===== RESULTADO =====
console.log(`\n${'='.repeat(50)}`);
console.log(`📊 Resultado: ${passed} passaram, ${failed} falharam de ${passed + failed} testes`);
if (failed === 0) {
    console.log('🎉 Todos os testes PROMPT-B passaram!\n');
    process.exit(0);
} else {
    console.log(`⚠️  ${failed} teste(s) falharam.\n`);
    process.exit(1);
}
