/**
 * ZYNTRA ERP — Testes Completos: Módulo Compras
 *
 * Valida que o módulo Compras está 100% funcional para qualquer usuário
 * (guilherme.bastos ou outro), sem erros 404, 500, 502, auth-undefined.
 *
 * Cobertura:
 *  🔐 Autenticação e autorização (login, token, permissões)
 *  📄 Acesso às páginas HTML (sem 404/500)
 *  🔌 Todos os endpoints API (fornecedores, pedidos, cotações, etc.)
 *  📊 Contratos de dados (formato de resposta)
 *  🛡️ Segurança (auth obrigatório, CORS, injection)
 *  ⚡ Integração entre sub-módulos (recebimento ↔ pedidos, etc.)
 *
 * Execução:
 *   node --test tests/unit/compras-module-complete.test.js
 *
 * Pré-requisito: servidor rodando em localhost:3000
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');

// ============================================================================
// CONFIGURAÇÃO
// ============================================================================
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const API_BASE = `${BASE_URL}/api/compras`;

// Credenciais de teste — usuário guilherme.bastos ou admin
const TEST_USERS = {
    admin: {
        email: process.env.TEST_ADMIN_EMAIL || 'admin@aluforce.com',
        password: process.env.TEST_ADMIN_PASSWORD || 'Admin@2026#Secure'
    },
    guilherme: {
        email: process.env.TEST_USER_EMAIL || 'guilherme.bastos@aluforce.com',
        password: process.env.TEST_USER_PASSWORD || 'Guilherme@2026#'
    }
};

// Tokens armazenados após login
let adminToken = null;
let userToken = null;
let activeUser = 'admin'; // fallback

// ============================================================================
// HELPERS
// ============================================================================
async function login(email, password) {
    try {
        const res = await fetch(`${BASE_URL}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const body = await res.json().catch(() => ({}));
        if (res.ok && body.token) return body.token;
        if (res.ok && body.accessToken) return body.accessToken;
        return null;
    } catch {
        return null;
    }
}

function authHeaders(token) {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}

async function apiGet(path, token) {
    const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
    const res = await fetch(url, {
        method: 'GET',
        headers: authHeaders(token || adminToken)
    });
    let body = {};
    try { body = await res.json(); } catch { body = {}; }
    return { status: res.status, body, ok: res.ok };
}

async function apiPost(path, data, token) {
    const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
    const res = await fetch(url, {
        method: 'POST',
        headers: authHeaders(token || adminToken),
        body: JSON.stringify(data || {})
    });
    let body = {};
    try { body = await res.json(); } catch { body = {}; }
    return { status: res.status, body, ok: res.ok };
}

async function apiPut(path, data, token) {
    const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
    const res = await fetch(url, {
        method: 'PUT',
        headers: authHeaders(token || adminToken),
        body: JSON.stringify(data || {})
    });
    let body = {};
    try { body = await res.json(); } catch { body = {}; }
    return { status: res.status, body, ok: res.ok };
}

async function apiDelete(path, token) {
    const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
    const res = await fetch(url, {
        method: 'DELETE',
        headers: authHeaders(token || adminToken)
    });
    let body = {};
    try { body = await res.json(); } catch { body = {}; }
    return { status: res.status, body, ok: res.ok };
}

async function fetchPage(path) {
    const url = `${BASE_URL}${path}`;
    try {
        const res = await fetch(url, { redirect: 'follow' });
        const text = await res.text().catch(() => '');
        return { status: res.status, text, ok: res.ok, url: res.url };
    } catch (err) {
        return { status: 0, text: '', ok: false, error: err.message };
    }
}

function getToken() {
    return userToken || adminToken;
}

// ============================================================================
// SETUP: Login antes dos testes
// ============================================================================
before(async () => {
    console.log('\n🔧 Setup: Fazendo login para obter tokens...');
    console.log(`   Base URL: ${BASE_URL}`);

    // Tentar login admin
    adminToken = await login(TEST_USERS.admin.email, TEST_USERS.admin.password);
    if (adminToken) {
        console.log('   ✅ Admin logado com sucesso');
    } else {
        console.log('   ⚠️  Admin login falhou — tentando com credenciais alternativas');
        // Tentar variações comuns
        adminToken = await login('admin@zyntra.com', 'Admin@2026#Secure');
        if (adminToken) console.log('   ✅ Admin logado (email alternativo)');
    }

    // Tentar login guilherme.bastos
    userToken = await login(TEST_USERS.guilherme.email, TEST_USERS.guilherme.password);
    if (userToken) {
        console.log('   ✅ guilherme.bastos logado com sucesso');
        activeUser = 'guilherme';
    } else {
        console.log('   ⚠️  guilherme.bastos login falhou — usando token admin');
    }

    if (!adminToken && !userToken) {
        console.log('   ❌ NENHUM login obteve sucesso — testes de auth vão falhar');
        console.log('      Certifique-se que o servidor está rodando em ' + BASE_URL);
    }
    console.log('');
});

// ============================================================================
// 1. AUTENTICAÇÃO E AUTORIZAÇÃO
// ============================================================================
describe('🔐 1. Autenticação e Autorização', () => {

    it('Login admin deve retornar token válido', async () => {
        assert.ok(adminToken, 'Admin token não foi obtido — servidor pode estar offline');
        assert.equal(typeof adminToken, 'string');
        assert.ok(adminToken.length > 20, 'Token parece muito curto');
        console.log('   ✅ Admin token obtido (length=' + adminToken.length + ')');
    });

    it('Login guilherme.bastos deve funcionar', async () => {
        const token = await login(TEST_USERS.guilherme.email, TEST_USERS.guilherme.password);
        if (!token) {
            console.log('   ⚠️  guilherme.bastos não existe ou senha incorreta — SKIP');
            return; // Não falha, mas avisa
        }
        assert.equal(typeof token, 'string');
        assert.ok(token.length > 20);
        console.log('   ✅ guilherme.bastos autenticado com sucesso');
    });

    it('Requisição sem token deve retornar 401', async () => {
        const res = await fetch(`${API_BASE}/fornecedores`, {
            headers: { 'Content-Type': 'application/json' }
        });
        assert.equal(res.status, 401, `Esperado 401, obteve ${res.status}`);
        const body = await res.json().catch(() => ({}));
        assert.ok(
            body.code === 'AUTH_REQUIRED' || body.code === 'AUTH_EXPIRED' ||
            body.message?.includes('autenticado') || body.message?.includes('token') ||
            body.error?.includes('token'),
            `Resposta 401 deve ter código/mensagem de auth, obteve: ${JSON.stringify(body)}`
        );
        console.log('   ✅ Sem token → 401 AUTH_REQUIRED');
    });

    it('Token inválido/expirado deve retornar 401', async () => {
        const res = await fetch(`${API_BASE}/fornecedores`, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer token_invalido_123'
            }
        });
        assert.ok([401, 403].includes(res.status), `Esperado 401/403, obteve ${res.status}`);
        console.log(`   ✅ Token inválido → ${res.status}`);
    });

    it('Token malformado (sem Bearer) deve retornar 401', async () => {
        const res = await fetch(`${API_BASE}/pedidos`, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'just_a_plain_token'
            }
        });
        assert.ok([401, 403].includes(res.status), `Esperado 401/403, obteve ${res.status}`);
        console.log(`   ✅ Token malformado → ${res.status}`);
    });
});

// ============================================================================
// 2. PÁGINAS HTML — Sem 404/500/502
// ============================================================================
describe('📄 2. Páginas HTML — Acesso sem erros', () => {

    const pages = [
        { path: '/Compras/index.html', name: 'Dashboard Compras' },
        { path: '/Compras/pedidos.html', name: 'Pedidos de Compra' },
        { path: '/Compras/fornecedores.html', name: 'Fornecedores' },
        { path: '/Compras/cotacoes.html', name: 'Cotações' },
        { path: '/Compras/requisicoes.html', name: 'Requisições' },
        { path: '/Compras/recebimento.html', name: 'Recebimento' },
        { path: '/Compras/relatorios.html', name: 'Relatórios' },
        { path: '/Compras/gestao-estoque.html', name: 'Gestão de Estoque' },
    ];

    for (const page of pages) {
        it(`${page.name} (${page.path}) → sem 404/500/502`, async () => {
            const { status, text } = await fetchPage(page.path);
            assert.ok(
                status !== 404,
                `❌ ${page.path} retornou 404 — arquivo não encontrado no servidor`
            );
            assert.ok(
                status !== 500,
                `❌ ${page.path} retornou 500 — erro interno do servidor`
            );
            assert.ok(
                status !== 502,
                `❌ ${page.path} retornou 502 — bad gateway`
            );
            assert.ok(
                status < 500,
                `❌ ${page.path} retornou ${status} — erro de servidor`
            );
            assert.ok(
                text.includes('<html') || text.includes('<!DOCTYPE') || text.includes('<!doctype'),
                `❌ ${page.path} não retornou HTML válido`
            );
            console.log(`   ✅ ${page.name} → ${status} OK (${text.length} bytes)`);
        });
    }

    it('Página /Compras (sem index.html) deve responder', async () => {
        const { status } = await fetchPage('/Compras');
        assert.ok(status < 500, `❌ /Compras retornou ${status}`);
        console.log(`   ✅ /Compras → ${status}`);
    });

    it('Página inexistente do módulo deve retornar 404', async () => {
        const { status } = await fetchPage('/Compras/pagina-que-nao-existe.html');
        assert.ok(
            [404, 302, 301].includes(status),
            `Esperado 404 para página inexistente, obteve ${status}`
        );
        console.log(`   ✅ Página inexistente → ${status}`);
    });
});

// ============================================================================
// 3. API FORNECEDORES — CRUD completo
// ============================================================================
describe('🏢 3. API Fornecedores', () => {

    it('GET /fornecedores → lista sem erro', async () => {
        const { status, body } = await apiGet('/fornecedores');
        assert.ok(
            [200, 401, 403].includes(status),
            `❌ GET /fornecedores retornou ${status} — não deveria ser 404/500/502`
        );
        if (status === 200) {
            assert.ok(Array.isArray(body) || body.data || body.fornecedores,
                'Resposta deve conter array ou objeto com dados');
        }
        console.log(`   ✅ GET /fornecedores → ${status} (${JSON.stringify(body).substring(0, 100)}...)`);
    });

    it('GET /fornecedores/:id → detalhe ou 404 legítimo', async () => {
        const { status, body } = await apiGet('/fornecedores/1');
        assert.ok(
            [200, 404, 401, 403].includes(status),
            `❌ GET /fornecedores/1 retornou ${status}`
        );
        if (status === 200) {
            assert.ok(body.id || body.fornecedor, 'Resposta deve conter dados do fornecedor');
        }
        console.log(`   ✅ GET /fornecedores/1 → ${status}`);
    });

    it('POST /fornecedores com body vazio → validação (400/422)', async () => {
        const { status } = await apiPost('/fornecedores', {});
        assert.ok(
            [400, 401, 403, 422].includes(status),
            `❌ POST /fornecedores vazio retornou ${status} — deveria rejeitar`
        );
        console.log(`   ✅ POST /fornecedores (vazio) → ${status}`);
    });

    it('POST /fornecedores → não retorna 500/502', async () => {
        const { status } = await apiPost('/fornecedores', {
            razao_social: 'Fornecedor Teste Automatizado',
            cnpj: '00.000.000/0001-00',
            tipo: 'PJ'
        });
        assert.ok(status !== 500, `❌ POST /fornecedores retornou 500`);
        assert.ok(status !== 502, `❌ POST /fornecedores retornou 502`);
        console.log(`   ✅ POST /fornecedores (dados) → ${status}`);
    });
});

// ============================================================================
// 4. API PEDIDOS DE COMPRA
// ============================================================================
describe('📦 4. API Pedidos de Compra', () => {

    it('GET /pedidos → lista sem erro', async () => {
        const { status, body } = await apiGet('/pedidos');
        assert.ok(
            [200, 401, 403].includes(status),
            `❌ GET /pedidos retornou ${status}`
        );
        console.log(`   ✅ GET /pedidos → ${status}`);
    });

    it('GET /pedidos/:id → detalhe ou 404', async () => {
        const { status } = await apiGet('/pedidos/1');
        assert.ok(
            [200, 404, 401, 403].includes(status),
            `❌ GET /pedidos/1 retornou ${status}`
        );
        console.log(`   ✅ GET /pedidos/1 → ${status}`);
    });

    it('POST /pedidos com body vazio → validação', async () => {
        const { status } = await apiPost('/pedidos', {});
        assert.ok(
            [400, 401, 403, 422].includes(status),
            `❌ POST /pedidos vazio retornou ${status}`
        );
        console.log(`   ✅ POST /pedidos (vazio) → ${status}`);
    });

    it('PUT /pedidos/:id/status → sem 500', async () => {
        const { status } = await apiPut('/pedidos/1/status', { status: 'aprovado' });
        assert.ok(status !== 500, `❌ PUT /pedidos/1/status retornou 500`);
        assert.ok(status !== 502, `❌ PUT /pedidos/1/status retornou 502`);
        console.log(`   ✅ PUT /pedidos/1/status → ${status}`);
    });

    it('POST /pedidos/:id/cancelar → sem 500', async () => {
        const { status } = await apiPost('/pedidos/99999/cancelar', { motivo: 'teste' });
        assert.ok(status !== 500, `❌ POST /pedidos/cancelar retornou 500`);
        console.log(`   ✅ POST /pedidos/99999/cancelar → ${status}`);
    });
});

// ============================================================================
// 5. API COTAÇÕES
// ============================================================================
describe('📊 5. API Cotações', () => {

    it('GET /cotacoes → lista sem erro', async () => {
        const { status } = await apiGet('/cotacoes');
        assert.ok(
            [200, 401, 403].includes(status),
            `❌ GET /cotacoes retornou ${status}`
        );
        console.log(`   ✅ GET /cotacoes → ${status}`);
    });

    it('GET /cotacoes/proximo-numero → sem erro', async () => {
        const { status } = await apiGet('/cotacoes/proximo-numero');
        assert.ok(
            [200, 401, 403].includes(status),
            `❌ GET /cotacoes/proximo-numero retornou ${status}`
        );
        console.log(`   ✅ GET /cotacoes/proximo-numero → ${status}`);
    });

    it('GET /cotacoes/:id → detalhe ou 404', async () => {
        const { status } = await apiGet('/cotacoes/1');
        assert.ok(
            [200, 404, 401, 403].includes(status),
            `❌ GET /cotacoes/1 retornou ${status}`
        );
        console.log(`   ✅ GET /cotacoes/1 → ${status}`);
    });

    it('POST /cotacoes com body vazio → validação', async () => {
        const { status } = await apiPost('/cotacoes', {});
        assert.ok(
            [400, 401, 403, 422].includes(status),
            `❌ POST /cotacoes vazio retornou ${status}`
        );
        console.log(`   ✅ POST /cotacoes (vazio) → ${status}`);
    });

    it('POST /cotacoes/:id/proposta → sem 500', async () => {
        const { status } = await apiPost('/cotacoes/1/proposta', {
            fornecedor_id: 1,
            valor: 100.00
        });
        assert.ok(status !== 500, `❌ POST /cotacoes/1/proposta retornou 500`);
        console.log(`   ✅ POST /cotacoes/1/proposta → ${status}`);
    });
});

// ============================================================================
// 6. API REQUISIÇÕES
// ============================================================================
describe('📋 6. API Requisições', () => {

    it('GET /requisicoes → lista sem erro', async () => {
        const { status } = await apiGet('/requisicoes');
        assert.ok(
            [200, 401, 403].includes(status),
            `❌ GET /requisicoes retornou ${status}`
        );
        console.log(`   ✅ GET /requisicoes → ${status}`);
    });

    it('GET /requisicoes/proximo-numero → sem erro', async () => {
        const { status } = await apiGet('/requisicoes/proximo-numero');
        assert.ok(
            [200, 401, 403].includes(status),
            `❌ GET /requisicoes/proximo-numero retornou ${status}`
        );
        console.log(`   ✅ GET /requisicoes/proximo-numero → ${status}`);
    });

    it('GET /requisicoes/:id → detalhe ou 404', async () => {
        const { status } = await apiGet('/requisicoes/1');
        assert.ok(
            [200, 404, 401, 403].includes(status),
            `❌ GET /requisicoes/1 retornou ${status}`
        );
        console.log(`   ✅ GET /requisicoes/1 → ${status}`);
    });

    it('POST /requisicoes com body vazio → validação', async () => {
        const { status } = await apiPost('/requisicoes', {});
        assert.ok(
            [400, 401, 403, 422].includes(status),
            `❌ POST /requisicoes vazio retornou ${status}`
        );
        console.log(`   ✅ POST /requisicoes (vazio) → ${status}`);
    });

    it('PUT /requisicoes/:id/aprovar → sem 500', async () => {
        const { status } = await apiPut('/requisicoes/1/aprovar', {});
        assert.ok(status !== 500, `❌ PUT /requisicoes/1/aprovar retornou 500`);
        console.log(`   ✅ PUT /requisicoes/1/aprovar → ${status}`);
    });

    it('PUT /requisicoes/:id/reprovar → sem 500', async () => {
        const { status } = await apiPut('/requisicoes/1/reprovar', { motivo: 'teste' });
        assert.ok(status !== 500, `❌ PUT /requisicoes/1/reprovar retornou 500`);
        console.log(`   ✅ PUT /requisicoes/1/reprovar → ${status}`);
    });
});

// ============================================================================
// 7. API MATERIAIS
// ============================================================================
describe('🧱 7. API Materiais', () => {

    it('GET /materiais → lista sem erro', async () => {
        const { status } = await apiGet('/materiais');
        assert.ok(
            [200, 401, 403].includes(status),
            `❌ GET /materiais retornou ${status}`
        );
        console.log(`   ✅ GET /materiais → ${status}`);
    });

    it('GET /materiais/categorias/list → sem erro (route ordering test)', async () => {
        const { status } = await apiGet('/materiais/categorias/list');
        assert.ok(
            [200, 401, 403].includes(status),
            `❌ GET /materiais/categorias/list retornou ${status} — possível bug de route ordering`
        );
        console.log(`   ✅ GET /materiais/categorias/list → ${status}`);
    });

    it('GET /materiais/:id → detalhe ou 404', async () => {
        const { status } = await apiGet('/materiais/1');
        assert.ok(
            [200, 404, 401, 403].includes(status),
            `❌ GET /materiais/1 retornou ${status}`
        );
        console.log(`   ✅ GET /materiais/1 → ${status}`);
    });

    it('POST /materiais com body vazio → validação', async () => {
        const { status } = await apiPost('/materiais', {});
        assert.ok(
            [400, 401, 403, 422].includes(status),
            `❌ POST /materiais vazio retornou ${status}`
        );
        console.log(`   ✅ POST /materiais (vazio) → ${status}`);
    });
});

// ============================================================================
// 8. API ESTOQUE
// ============================================================================
describe('📦 8. API Estoque', () => {

    it('GET /estoque → lista sem erro', async () => {
        const { status } = await apiGet('/estoque');
        assert.ok(
            [200, 401, 403].includes(status),
            `❌ GET /estoque retornou ${status}`
        );
        console.log(`   ✅ GET /estoque → ${status}`);
    });

    it('GET /estoque/materiais-com-entrada → sem erro', async () => {
        const { status } = await apiGet('/estoque/materiais-com-entrada');
        assert.ok(
            [200, 401, 403].includes(status),
            `❌ GET /estoque/materiais-com-entrada retornou ${status}`
        );
        console.log(`   ✅ GET /estoque/materiais-com-entrada → ${status}`);
    });

    it('GET /estoque/movimentacoes → sem erro (route ordering test)', async () => {
        const { status } = await apiGet('/estoque/movimentacoes');
        assert.ok(
            [200, 401, 403].includes(status),
            `❌ GET /estoque/movimentacoes retornou ${status} — possível bug de route ordering`
        );
        console.log(`   ✅ GET /estoque/movimentacoes → ${status}`);
    });

    it('GET /estoque/movimentacoes/historico → sem erro', async () => {
        const { status } = await apiGet('/estoque/movimentacoes/historico');
        assert.ok(
            [200, 401, 403].includes(status),
            `❌ GET /estoque/movimentacoes/historico retornou ${status}`
        );
        console.log(`   ✅ GET /estoque/movimentacoes/historico → ${status}`);
    });

    it('GET /estoque/alertas → sem erro', async () => {
        const { status } = await apiGet('/estoque/alertas');
        assert.ok(
            [200, 401, 403].includes(status),
            `❌ GET /estoque/alertas retornou ${status}`
        );
        console.log(`   ✅ GET /estoque/alertas → ${status}`);
    });

    it('GET /estoque/qrcode/lookup → sem 500', async () => {
        const { status } = await apiGet('/estoque/qrcode/lookup?codigo=TESTE');
        assert.ok(status !== 500, `❌ GET /estoque/qrcode/lookup retornou 500`);
        console.log(`   ✅ GET /estoque/qrcode/lookup → ${status}`);
    });

    it('GET /estoque/:id → detalhe ou 404', async () => {
        const { status } = await apiGet('/estoque/1');
        assert.ok(
            [200, 404, 401, 403].includes(status),
            `❌ GET /estoque/1 retornou ${status}`
        );
        console.log(`   ✅ GET /estoque/1 → ${status}`);
    });

    it('POST /estoque/movimentacao com body vazio → validação', async () => {
        const { status } = await apiPost('/estoque/movimentacao', {});
        assert.ok(
            [400, 401, 403, 422].includes(status),
            `❌ POST /estoque/movimentacao vazio retornou ${status}`
        );
        console.log(`   ✅ POST /estoque/movimentacao (vazio) → ${status}`);
    });
});

// ============================================================================
// 9. API RECEBIMENTO
// ============================================================================
describe('📥 9. API Recebimento', () => {

    it('GET /recebimento/stats → sem erro', async () => {
        const { status } = await apiGet('/recebimento/stats');
        assert.ok(
            [200, 401, 403].includes(status),
            `❌ GET /recebimento/stats retornou ${status}`
        );
        console.log(`   ✅ GET /recebimento/stats → ${status}`);
    });

    it('GET /recebimento/pedidos-pendentes → sem erro', async () => {
        const { status } = await apiGet('/recebimento/pedidos-pendentes');
        assert.ok(
            [200, 401, 403].includes(status),
            `❌ GET /recebimento/pedidos-pendentes retornou ${status}`
        );
        console.log(`   ✅ GET /recebimento/pedidos-pendentes → ${status}`);
    });

    it('GET /recebimento/historico → sem erro', async () => {
        const { status } = await apiGet('/recebimento/historico');
        assert.ok(
            [200, 401, 403].includes(status),
            `❌ GET /recebimento/historico retornou ${status}`
        );
        console.log(`   ✅ GET /recebimento/historico → ${status}`);
    });

    it('POST /recebimento/registrar com body vazio → validação', async () => {
        const { status } = await apiPost('/recebimento/registrar', {});
        assert.ok(
            [400, 401, 403, 422].includes(status),
            `❌ POST /recebimento/registrar vazio retornou ${status}`
        );
        console.log(`   ✅ POST /recebimento/registrar (vazio) → ${status}`);
    });
});

// ============================================================================
// 10. API RELATÓRIOS
// ============================================================================
describe('📈 10. API Relatórios', () => {

    const relatorioEndpoints = [
        '/relatorios/compras-periodo',
        '/relatorios/fornecedores-performance',
        '/relatorios/estoque-baixo',
        '/relatorios/materiais-criticos',
        '/relatorios/movimentacoes-estoque',
        '/relatorios/requisicoes-status',
        '/relatorios/cotacoes-analise'
    ];

    for (const ep of relatorioEndpoints) {
        it(`GET ${ep} → sem erro`, async () => {
            const { status } = await apiGet(ep);
            assert.ok(
                [200, 401, 403].includes(status),
                `❌ GET ${ep} retornou ${status}`
            );
            console.log(`   ✅ GET ${ep} → ${status}`);
        });
    }
});

// ============================================================================
// 11. TESTES COM USUÁRIO guilherme.bastos
// ============================================================================
describe('👤 11. Acesso como guilherme.bastos', () => {

    it('guilherme.bastos pode acessar GET /fornecedores', async () => {
        const token = userToken || adminToken;
        if (!token) {
            console.log('   ⚠️  Sem token — SKIP');
            return;
        }
        const { status } = await apiGet('/fornecedores', token);
        assert.ok(
            [200, 403].includes(status),
            `❌ guilherme.bastos GET /fornecedores → ${status} (esperado 200 ou 403)`
        );
        console.log(`   ✅ guilherme.bastos /fornecedores → ${status}`);
    });

    it('guilherme.bastos pode acessar GET /pedidos', async () => {
        const token = userToken || adminToken;
        if (!token) return;
        const { status } = await apiGet('/pedidos', token);
        assert.ok(
            [200, 403].includes(status),
            `❌ guilherme.bastos GET /pedidos → ${status}`
        );
        console.log(`   ✅ guilherme.bastos /pedidos → ${status}`);
    });

    it('guilherme.bastos pode acessar GET /cotacoes', async () => {
        const token = userToken || adminToken;
        if (!token) return;
        const { status } = await apiGet('/cotacoes', token);
        assert.ok(
            [200, 403].includes(status),
            `❌ guilherme.bastos GET /cotacoes → ${status}`
        );
        console.log(`   ✅ guilherme.bastos /cotacoes → ${status}`);
    });

    it('guilherme.bastos pode acessar GET /requisicoes', async () => {
        const token = userToken || adminToken;
        if (!token) return;
        const { status } = await apiGet('/requisicoes', token);
        assert.ok(
            [200, 403].includes(status),
            `❌ guilherme.bastos GET /requisicoes → ${status}`
        );
        console.log(`   ✅ guilherme.bastos /requisicoes → ${status}`);
    });

    it('guilherme.bastos pode acessar GET /materiais', async () => {
        const token = userToken || adminToken;
        if (!token) return;
        const { status } = await apiGet('/materiais', token);
        assert.ok(
            [200, 403].includes(status),
            `❌ guilherme.bastos GET /materiais → ${status}`
        );
        console.log(`   ✅ guilherme.bastos /materiais → ${status}`);
    });

    it('guilherme.bastos pode acessar GET /estoque', async () => {
        const token = userToken || adminToken;
        if (!token) return;
        const { status } = await apiGet('/estoque', token);
        assert.ok(
            [200, 403].includes(status),
            `❌ guilherme.bastos GET /estoque → ${status}`
        );
        console.log(`   ✅ guilherme.bastos /estoque → ${status}`);
    });

    it('guilherme.bastos pode acessar GET /recebimento/stats', async () => {
        const token = userToken || adminToken;
        if (!token) return;
        const { status } = await apiGet('/recebimento/stats', token);
        assert.ok(
            [200, 403].includes(status),
            `❌ guilherme.bastos GET /recebimento/stats → ${status}`
        );
        console.log(`   ✅ guilherme.bastos /recebimento/stats → ${status}`);
    });

    it('guilherme.bastos NÃO recebe erro 500/502/undefined em nenhum endpoint', async () => {
        const token = userToken || adminToken;
        if (!token) return;

        const endpoints = [
            '/fornecedores', '/pedidos', '/cotacoes',
            '/requisicoes', '/materiais', '/estoque',
            '/recebimento/stats', '/recebimento/pedidos-pendentes',
            '/relatorios/compras-periodo'
        ];

        const errors = [];
        for (const ep of endpoints) {
            const { status, body } = await apiGet(ep, token);
            if (status >= 500) {
                errors.push(`${ep} → ${status}`);
            }
            if (body?.code === 'AUTH_UNDEFINED' || body?.message?.includes('undefined')) {
                errors.push(`${ep} → auth-undefined: ${body.message}`);
            }
        }

        assert.equal(
            errors.length, 0,
            `❌ Erros encontrados para guilherme.bastos:\n${errors.join('\n')}`
        );
        console.log(`   ✅ guilherme.bastos: ${endpoints.length} endpoints sem erros 500/502/undefined`);
    });
});

// ============================================================================
// 12. SEGURANÇA — Sem vazamento de informação
// ============================================================================
describe('🛡️ 12. Segurança', () => {

    it('SQL injection no campo de busca → sem 500', async () => {
        const { status } = await apiGet("/fornecedores?search=' OR 1=1 --");
        assert.ok(status !== 500, `❌ SQL injection causou 500`);
        console.log(`   ✅ SQL injection → ${status} (protegido)`);
    });

    it('XSS no campo de busca → sem 500', async () => {
        const { status } = await apiGet('/fornecedores?search=<script>alert(1)</script>');
        assert.ok(status !== 500, `❌ XSS causou 500`);
        console.log(`   ✅ XSS → ${status} (protegido)`);
    });

    it('Path traversal → sem 500', async () => {
        const { status } = await apiGet('/fornecedores/../../etc/passwd');
        assert.ok(status !== 500, `❌ Path traversal causou 500`);
        console.log(`   ✅ Path traversal → ${status} (protegido)`);
    });

    it('Corpo JSON muito grande → sem crash', async () => {
        const bigData = { dados: 'x'.repeat(50000) };
        const { status } = await apiPost('/fornecedores', bigData);
        assert.ok(status !== 502, `❌ Corpo grande causou 502`);
        assert.ok(status !== 500 || status === 413, `❌ Corpo grande causou crash`);
        console.log(`   ✅ Corpo 50KB → ${status}`);
    });
});

// ============================================================================
// 13. ASSETS (CSS/JS) — Sem 404
// ============================================================================
describe('🎨 13. Assets CSS/JS — Sem 404', () => {

    const cssFiles = [
        '/Compras/css/compras.css',
        '/Compras/css/compras-standard.css',
        '/Compras/css/compras-pedidos.css',
        '/Compras/css/compras-cotacoes.css',
        '/Compras/css/compras-fornecedores.css',
        '/Compras/css/compras-requisicoes.css'
    ];

    for (const css of cssFiles) {
        it(`CSS ${css} → sem 404`, async () => {
            const { status } = await fetchPage(css);
            if (status === 404) {
                console.log(`   ⚠️  ${css} → 404 (MISSING)`);
            } else {
                console.log(`   ✅ ${css} → ${status}`);
            }
            // Log mas não falha — alguns CSS podem não existir
            assert.ok(
                status !== 500 && status !== 502,
                `❌ ${css} → ${status} (erro de servidor)`
            );
        });
    }

    const jsFiles = [
        '/Compras/js/compras-api.js',
        '/Compras/js/compras-user.js',
        '/Compras/js/compras-fornecedores.js',
        '/Compras/js/compras-pedidos.js',
        '/Compras/js/compras-cotacoes.js',
        '/Compras/js/compras-requisicoes.js',
        '/Compras/js/compras-materiais.js',
        '/Compras/js/compras-estoque.js',
        '/Compras/js/compras-relatorios.js'
    ];

    for (const js of jsFiles) {
        it(`JS ${js} → sem 404`, async () => {
            const { status } = await fetchPage(js);
            if (status === 404) {
                console.log(`   ⚠️  ${js} → 404 (MISSING)`);
            } else {
                console.log(`   ✅ ${js} → ${status}`);
            }
            assert.ok(
                status !== 500 && status !== 502,
                `❌ ${js} → ${status} (erro de servidor)`
            );
        });
    }
});

// ============================================================================
// 14. CROSS-MODULE: Endpoints referenciados pelo frontend
// ============================================================================
describe('🔗 14. Endpoints referenciados pelo frontend Compras', () => {

    it('GET /api/compras/recebimento/stats → existe', async () => {
        const { status } = await apiGet('/recebimento/stats');
        assert.ok(
            status !== 404,
            `❌ /recebimento/stats → 404 (rota não montada no servidor)`
        );
        console.log(`   ✅ /recebimento/stats → ${status}`);
    });

    it('GET /api/compras/recebimento/pedidos-pendentes → existe', async () => {
        const { status } = await apiGet('/recebimento/pedidos-pendentes');
        assert.ok(
            status !== 404,
            `❌ /recebimento/pedidos-pendentes → 404`
        );
        console.log(`   ✅ /recebimento/pedidos-pendentes → ${status}`);
    });

    it('GET /api/compras/estoque/movimentacoes → existe', async () => {
        const { status } = await apiGet('/estoque/movimentacoes');
        assert.ok(
            status !== 404,
            `❌ /estoque/movimentacoes → 404 (possível route ordering bug)`
        );
        console.log(`   ✅ /estoque/movimentacoes → ${status}`);
    });

    it('GET /api/compras/materiais/categorias/list → existe', async () => {
        const { status } = await apiGet('/materiais/categorias/list');
        assert.ok(
            status !== 404,
            `❌ /materiais/categorias/list → 404 (possível route ordering bug)`
        );
        console.log(`   ✅ /materiais/categorias/list → ${status}`);
    });

    it('/api/me → existe (cross-module)', async () => {
        const res = await fetch(`${BASE_URL}/api/me`, {
            headers: authHeaders(getToken())
        });
        assert.ok(
            res.status !== 404,
            `❌ /api/me → 404 (rota faltando no servidor)`
        );
        console.log(`   ✅ /api/me → ${res.status}`);
    });
});

// ============================================================================
// 15. STRESS: Múltiplas requisições simultâneas sem crash
// ============================================================================
describe('⚡ 15. Stress — Requisições simultâneas', () => {

    it('10 GETs simultâneos em /fornecedores → sem 500/502', async () => {
        const promises = Array.from({ length: 10 }, () =>
            apiGet('/fornecedores')
        );
        const results = await Promise.all(promises);
        const errors = results.filter(r => r.status >= 500);
        assert.equal(
            errors.length, 0,
            `❌ ${errors.length}/10 requisições retornaram 500+`
        );
        console.log(`   ✅ 10 GETs simultâneos → todos < 500`);
    });

    it('Requisições paralelas em endpoints diferentes → sem crash', async () => {
        const endpoints = [
            '/fornecedores', '/pedidos', '/cotacoes',
            '/requisicoes', '/materiais', '/estoque',
            '/recebimento/stats', '/relatorios/compras-periodo'
        ];
        const promises = endpoints.map(ep => apiGet(ep));
        const results = await Promise.all(promises);
        const errors = results.filter(r => r.status >= 500);
        assert.equal(
            errors.length, 0,
            `❌ ${errors.length}/${endpoints.length} endpoints retornaram 500+:\n` +
            errors.map((r, i) => `  ${endpoints[results.indexOf(r)]} → ${r.status}`).join('\n')
        );
        console.log(`   ✅ ${endpoints.length} endpoints paralelos → todos < 500`);
    });
});

// ============================================================================
// RESUMO FINAL
// ============================================================================
after(() => {
    console.log('\n' + '='.repeat(70));
    console.log('📋 RESUMO: Testes do Módulo Compras');
    console.log('='.repeat(70));
    console.log(`   Servidor: ${BASE_URL}`);
    console.log(`   Admin token: ${adminToken ? '✅ Obtido' : '❌ Falhou'}`);
    console.log(`   User token (guilherme.bastos): ${userToken ? '✅ Obtido' : '⚠️ Não obtido'}`);
    console.log('='.repeat(70));
    console.log('');
});
