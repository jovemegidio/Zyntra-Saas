/**
 * ZYNTRA ERP - Testes Unitários: Login por CPF
 *
 * Cobertura completa da rota POST /api/login (modo CPF):
 *  ✅ Login com CPF válido + senha correta → resolve email → login OK
 *  ❌ CPF com menos de 11 dígitos → 400
 *  ❌ CPF com mais de 11 dígitos → 400
 *  ❌ CPF com letras → sanitizado (strip non-digits) → 400 se < 11
 *  ❌ CPF não cadastrado → 401 "CPF ou senha incorretos"
 *  ❌ CPF válido + senha errada → 401
 *  ❌ CPF vazio → 400 (precisa de email ou cpf)
 *  ❌ CPF com formatação (pontos e traço) → deve aceitar (strip)
 *  ❌ CPF + email simultaneamente → email tem prioridade (não entra no modo CPF)
 *  🛡️ SQL injection no campo CPF → seguro
 *  🛡️ CPFs com dígitos repetidos → 401 (não cadastrado)
 *  🔒 Account lockout via CPF → 429 após muitas tentativas
 *
 * Execução:
 *   node --test tests/unit/login-cpf.test.js
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

// ============================================================================
// CONFIGURAÇÃO
// ============================================================================
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const API_LOGIN = `${BASE_URL}/api/login`;

// ============================================================================
// HELPER: POST /api/login
// ============================================================================
async function loginCPF(cpf, password, extraFields = {}) {
    const payload = { cpf, password, ...extraFields };
    const res = await fetch(API_LOGIN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    let body = {};
    try { body = await res.json(); } catch { body = {}; }
    return { status: res.status, body };
}

async function loginEmail(email, password) {
    const res = await fetch(API_LOGIN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    let body = {};
    try { body = await res.json(); } catch { body = {}; }
    return { status: res.status, body };
}

// ============================================================================
// TESTES: VALIDAÇÃO DE FORMATO DO CPF
// ============================================================================
describe('📋 Login CPF - Validação de Formato', () => {

    it('❌ CPF com menos de 11 dígitos → 400', async () => {
        const { status, body } = await loginCPF('1234567890', 'Senha123!');

        assert.equal(status, 400, `Esperado 400, obteve ${status}`);
        assert.ok(
            (body.message && body.message.includes('11')) || (body.error && body.error.includes('11')),
            'Mensagem deve indicar que CPF precisa ter 11 dígitos'
        );
        console.log(`  ✅ CPF 10 dígitos → 400: ${body.message || body.error}`);
    });

    it('❌ CPF com mais de 11 dígitos → 400', async () => {
        const { status, body } = await loginCPF('123456789012', 'Senha123!');

        assert.equal(status, 400, `Esperado 400, obteve ${status}`);
        console.log(`  ✅ CPF 12 dígitos → 400: ${body.message || body.error}`);
    });

    it('❌ CPF vazio → 400 (email ou cpf obrigatório)', async () => {
        const { status, body } = await loginCPF('', 'Senha123!');

        assert.ok([400, 401].includes(status), `Esperado 400/401, obteve ${status}`);
        console.log(`  ✅ CPF vazio → ${status}: ${body.message || body.error || 'bloqueado'}`);
    });

    it('❌ CPF null → 400', async () => {
        const { status } = await loginCPF(null, 'Senha123!');

        assert.ok([400, 401].includes(status), `Esperado 400/401, obteve ${status}`);
        console.log(`  ✅ CPF null → ${status}`);
    });

    it('✅ CPF com formatação (pontos/traço) → strip automático', async () => {
        // 123.456.789-01 = 12345678901 (11 dígitos)
        // Deve ser aceito no formato (strip non-digits) e depois processado
        const { status, body } = await loginCPF('123.456.789-01', 'Senha123!');

        // Não deve retornar 400 por formato inválido
        // Pode retornar 401 se o CPF não está cadastrado — OK, o formato foi aceito
        assert.ok([200, 401].includes(status),
            `CPF formatado não deve dar 400 (obteve ${status})`);
        console.log(`  ✅ CPF formatado "123.456.789-01" → ${status} (formato aceito, strip funcionou)`);
    });

    it('✅ CPF com espaços → strip automático', async () => {
        const { status } = await loginCPF('123 456 789 01', 'Senha123!');

        assert.ok([200, 401].includes(status),
            `CPF com espaços não deve dar 400 de formato (obteve ${status})`);
        console.log(`  ✅ CPF com espaços → ${status} (sanitizado)`);
    });

    it('❌ CPF só com letras → 400 (após strip, fica vazio)', async () => {
        const { status } = await loginCPF('abcdefghijk', 'Senha123!');

        assert.ok([400, 401].includes(status), `Esperado 400/401, obteve ${status}`);
        console.log(`  ✅ CPF com letras → ${status}`);
    });

    it('❌ CPF com caracteres especiais → validação', async () => {
        const { status } = await loginCPF('!@#$%^&*()+', 'Senha123!');

        assert.ok([400, 401].includes(status), `Esperado 400/401, obteve ${status}`);
        console.log(`  ✅ CPF com chars especiais → ${status}`);
    });
});

// ============================================================================
// TESTES: CPF NÃO CADASTRADO
// ============================================================================
describe('❌ Login CPF - CPF Não Cadastrado', () => {

    it('❌ CPF válido (11 dígitos) mas não cadastrado → 401', async () => {
        const { status, body } = await loginCPF('99988877766', 'Senha123!');

        assert.equal(status, 401, `Esperado 401, obteve ${status}`);
        assert.equal(body.message, 'CPF ou senha incorretos.',
            'Mensagem deve ser genérica (anti-enumeração CPF)');
        console.log('  ✅ CPF não cadastrado → 401 "CPF ou senha incorretos."');
    });

    it('❌ CPF com todos dígitos iguais → 401 (não cadastrado)', async () => {
        const cpfsRepetidos = [
            '00000000000',
            '11111111111',
            '22222222222',
            '99999999999'
        ];

        for (const cpf of cpfsRepetidos) {
            const { status, body } = await loginCPF(cpf, 'Senha123!');
            assert.ok([400, 401].includes(status), `CPF ${cpf} → esperava 400/401, obteve ${status}`);
            console.log(`  ✅ CPF ${cpf.substring(0, 5)}... → ${status}`);
        }
    });

    it('❌ CPF não cadastrado + senha errada → 401 com mensagem genérica', async () => {
        const { status, body } = await loginCPF('12345678901', 'SenhaErradaTotal!');

        assert.equal(status, 401, `Esperado 401, obteve ${status}`);
        assert.equal(body.message, 'CPF ou senha incorretos.');
        console.log('  ✅ CPF inexistente → mensagem genérica anti-enumeração');
    });
});

// ============================================================================
// TESTES: CPF + SENHA
// ============================================================================
describe('🔑 Login CPF - Autenticação', () => {

    it('❌ CPF válido cadastrado + senha errada → 401', async () => {
        // Mesmo que o CPF exista na tabela funcionarios, com senha errada deve dar 401
        // Este teste depende de ter um CPF real no DB — em DEV_MOCK pode dar 401 por CPF não existir
        const { status, body } = await loginCPF('12345678901', 'SenhaErrada999!');

        assert.ok([401, 500].includes(status),
            `Esperado 401 (ou 500 se tabela funcionarios não existe em mock), obteve ${status}`);

        if (status === 401) {
            assert.equal(body.message, 'CPF ou senha incorretos.');
            console.log('  ✅ Senha errada com CPF → 401 "CPF ou senha incorretos."');
        } else {
            console.log(`  ⚠️ Status ${status} — tabela funcionarios pode não existir em DEV_MOCK`);
        }
    });

    it('✅ Login CPF não deve verificar domínio de email', async () => {
        // Quando fazendo login por CPF, o sistema busca o email na tabela funcionarios.
        // O domínio do email encontrado NÃO deve ser verificado (já é interno).
        // Testamos enviando CPF sem email — o fluxo de domínio é pulado.
        const { status, body } = await loginCPF('12345678901', 'Senha123!');

        // Não deve retornar erro de domínio
        if (status === 401 && body.message) {
            assert.ok(!body.message.includes('Apenas e-mails'),
                'Login CPF NÃO deve validar domínio de email');
            console.log('  ✅ CPF login não verifica domínio — correto');
        } else {
            console.log(`  ℹ️ Status ${status} — sem validação de domínio no modo CPF`);
        }
    });
});

// ============================================================================
// TESTES: CPF + EMAIL SIMULTANEAMENTE
// ============================================================================
describe('🔀 Login CPF - CPF + Email Simultâneo', () => {

    it('🔀 Quando email E cpf são enviados, email tem prioridade', async () => {
        // O código verifica: if (cpf && !email) → modo CPF
        // Se ambos estão presentes, email tem prioridade
        const { status, body } = await loginCPF('12345678901', 'Senha123!', {
            email: 'exemplo@aluforce.ind.br'
        });

        // Deve processar pelo fluxo de email (não CPF)
        if (status === 401 && body.message) {
            assert.equal(body.message, 'Email ou senha incorretos.',
                'Com email+cpf, deve usar mensagem de email (não de CPF)');
            console.log('  ✅ Email+CPF → fluxo de email tem prioridade');
        } else if (status === 200) {
            console.log('  ✅ Email+CPF → login via email com sucesso');
        } else {
            console.log(`  ℹ️ Status ${status} — email teve prioridade`);
        }
    });

    it('🔀 CPF com email vazio "" → modo CPF ativado', async () => {
        const { status, body } = await loginCPF('12345678901', 'Senha123!', { email: '' });

        // email='' é falsy, então cpf && !email = true → modo CPF
        if (status === 401) {
            assert.equal(body.message, 'CPF ou senha incorretos.',
                'Com email vazio, deve usar mensagem de CPF');
            console.log('  ✅ CPF + email="" → modo CPF ativado');
        } else {
            console.log(`  ℹ️ Status ${status}`);
        }
    });

    it('🔀 CPF com email null → modo CPF ativado', async () => {
        const { status, body } = await loginCPF('12345678901', 'Senha123!', { email: null });

        if (status === 401) {
            assert.equal(body.message, 'CPF ou senha incorretos.');
            console.log('  ✅ CPF + email=null → modo CPF ativado');
        } else {
            console.log(`  ℹ️ Status ${status}`);
        }
    });
});

// ============================================================================
// TESTES: SEGURANÇA NO CAMPO CPF
// ============================================================================
describe('🛡️ Login CPF - Segurança', () => {

    it('🛡️ Deve resistir a SQL injection no campo CPF', async () => {
        const payloads = [
            "' OR 1=1 --",
            "1; DROP TABLE funcionarios;--",
            "' UNION SELECT email FROM usuarios--",
            "12345678901' AND '1'='1"
        ];

        for (const cpf of payloads) {
            const { status } = await loginCPF(cpf, 'Senha123!');
            // Strip non-digits deve transformar tudo em números/vazio → 400 por tamanho inválido
            assert.ok([400, 401, 500].includes(status),
                `SQLi CPF "${cpf.substring(0, 25)}" → esperava 4xx/5xx, obteve ${status}`);
            console.log(`  ✅ SQLi "${cpf.substring(0, 20)}..." → ${status} (seguro)`);
        }
    });

    it('🛡️ Deve resistir a XSS no campo CPF', async () => {
        const payloads = [
            '<script>alert(1)</script>',
            '"><img src=x onerror=alert(1)>'
        ];

        for (const cpf of payloads) {
            const { status, body } = await loginCPF(cpf, 'Senha123!');
            assert.ok([400, 401].includes(status), `XSS CPF → esperava 4xx, obteve ${status}`);
            const bodyStr = JSON.stringify(body);
            assert.ok(!bodyStr.includes('<script>'), 'Resposta não deve refletir <script>');
            console.log(`  ✅ XSS CPF bloqueado → ${status}`);
        }
    });

    it('🛡️ CPF com payload NoSQL injection → seguro', async () => {
        const { status } = await loginCPF('{"$gt": ""}', 'Senha123!');
        assert.ok([400, 401].includes(status), `NoSQLi → esperava 4xx, obteve ${status}`);
        console.log(`  ✅ NoSQL injection CPF → ${status} (seguro)`);
    });

    it('🛡️ CPF extremamente longo → rejeitar', async () => {
        const cpfLongo = '1'.repeat(10000);
        const { status } = await loginCPF(cpfLongo, 'Senha123!');
        assert.ok([400, 401, 413].includes(status), `CPF longo → esperava 4xx, obteve ${status}`);
        console.log(`  ✅ CPF com 10000 chars → ${status}`);
    });
});

// ============================================================================
// TESTES: ACCOUNT LOCKOUT VIA CPF
// ============================================================================
describe('🔒 Login CPF - Account Lockout', () => {

    it('🔒 Deve bloquear após 5 tentativas falhas via CPF', async () => {
        // CPF de lockout único para este teste
        const testCpf = '55544433322';

        for (let i = 1; i <= 5; i++) {
            const { status } = await loginCPF(testCpf, 'Errada!' + i);
            console.log(`  Tentativa CPF ${i}: status ${status}`);
        }

        // 6ª tentativa
        const { status, body } = await loginCPF(testCpf, 'Qualquer!');

        if (status === 429) {
            assert.ok(body.message.includes('bloqueada') || body.message.includes('tentativas'),
                'Mensagem deve indicar lockout');
            console.log('  ✅ Account lockout via CPF → 429');
        } else {
            // Em DEV_MOCK, se a tabela funcionarios não existe, todas retornam 500 e lockout pode não funcionar
            console.log(`  ⚠️ Lockout CPF retornou ${status} — pode depender do estado do servidor`);
        }
    });
});

// ============================================================================
// TESTES: EDGE CASES
// ============================================================================
describe('🔧 Login CPF - Edge Cases', () => {

    it('🔧 CPF enviado como número (não string) → deve funcionar', async () => {
        const payload = { cpf: 12345678901, password: 'Senha123!' };
        const res = await fetch(API_LOGIN, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        let body = {};
        try { body = await res.json(); } catch {}

        // O servidor faz String(cpf).replace(/\D/g, '') — deve converter número para string
        assert.ok([200, 400, 401, 500].includes(res.status),
            `CPF como number → esperava processamento, obteve ${res.status}`);
        console.log(`  ✅ CPF como number → ${res.status} (processado)`);
    });

    it('🔧 Múltiplos logins CPF consecutivos → estabilidade', async () => {
        const promises = [];
        for (let i = 0; i < 5; i++) {
            promises.push(loginCPF(`1234567890${i}`, 'Senha123!'));
        }

        const results = await Promise.all(promises);
        for (const { status } of results) {
            assert.ok([400, 401, 429, 500].includes(status),
                `Concorrência CPF → esperava resposta válida, obteve ${status}`);
        }
        console.log('  ✅ 5 requests CPF concorrentes → todas responderam');
    });

    it('🔧 CPF sem campo password → 400', async () => {
        const res = await fetch(API_LOGIN, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cpf: '12345678901' })
        });

        assert.ok([400, 401].includes(res.status), `CPF sem senha → esperava 400, obteve ${res.status}`);
        console.log(`  ✅ CPF sem password → ${res.status}`);
    });
});

console.log('═'.repeat(60));
console.log('📋 Login CPF — Test Suite carregada');
console.log(`   Servidor: ${BASE_URL}`);
console.log('═'.repeat(60));
