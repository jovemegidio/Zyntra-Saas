/**
 * PCP — TESTE DE SATURAÇÃO: CONDIÇÃO DE CORRIDA EM APONTAMENTOS
 *
 * Tradução do cenário proposto para o sistema real.
 *
 * ROTA ALVO:  POST /api/pcp/apontamentos                         (tabela: apontamentos_producao)
 * SERVIDOR:   modules/PCP/server.js — linha 8242
 * PROTEÇÕES:  FOR UPDATE na OP e na Etapa (lock pessimista), verificação de status da OP
 *
 * DIFERENÇAS DO SCRIPT ORIGINAL PARA O SISTEMA REAL:
 *   1. Status de sucesso é 200 (não 201) — o servidor usa res.json(...) sem .status(201)
 *   2. Campo `etapa_id` é OBRIGATÓRIO — sem ele toda request retorna 400 imediatamente
 *   3. Campo `tempo_gasto_minutos` não existe — usa-se `tempo_producao` (minutos)
 *   4. `data_apontamento` é ignorado — o servidor usa NOW() internamente
 *   5. `X-Idempotency-Key` é silenciosamente ignorado pelo servidor (finding esperado)
 *   6. `ordem_producao_id` deve ser INTEGER, não string como "OP-998877"
 *
 * VARIÁVEIS DE AMBIENTE (via -e / --env do k6 ou pelo runner PS1):
 *   PCP_BASE_URL       URL base do servidor PCP  (padrão: http://localhost:3001)
 *   PCP_AUTH_BEARER    JWT do operador           (obrigatório para passar RBAC)
 *   PCP_OP_ID          ID inteiro da OP alvo     (padrão: 1)
 *   PCP_ETAPA_ID       ID inteiro da Etapa       (obrigatório — sem isso 100% retorna 400)
 *   PCP_QTD_POR_REQ    Quantidade por apontamento (padrão: 10)
 *
 * EXEMPLO DE EXECUÇÃO:
 *   .tools\k6\k6.exe run `
 *     -e PCP_BASE_URL=http://localhost:3001 `
 *     -e PCP_AUTH_BEARER=<JWT> `
 *     -e PCP_OP_ID=42 `
 *     -e PCP_ETAPA_ID=7 `
 *     tests/perf/pcp-race-saturacao.k6.js
 *
 * OU via npm:
 *   npm run test:perf:pcp:k6:race
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// ─── Variáveis de ambiente ────────────────────────────────────────────────────

const BASE_URL      = __ENV.PCP_BASE_URL    || 'http://localhost:3001';
const AUTH_BEARER   = __ENV.PCP_AUTH_BEARER || '';
const OP_ID         = Number(__ENV.PCP_OP_ID     || 1);
const ETAPA_ID      = Number(__ENV.PCP_ETAPA_ID  || 1);
const QTD_POR_REQ   = Number(__ENV.PCP_QTD_POR_REQ || 10);

// ─── Métricas customizadas ────────────────────────────────────────────────────

// Conta cada vez que um apontamento é aceito (200)
const successful_inserts = new Counter('pcp_race_inserts_ok');

// Conta cada vez que o servidor bloqueou por limite da etapa/status da OP (409)
const blocked_by_limit   = new Counter('pcp_race_blocked_limit');

// Conta cada vez que o servidor retornou 500 — NUNCA deve acontecer
const server_errors      = new Counter('pcp_race_server_errors');

// Taxa de requests que NÃO resultaram em 500
const no_crash_rate      = new Rate('pcp_race_no_crash_rate');

// Latência de cada request individualmente
const req_duration       = new Trend('pcp_race_req_duration_ms', true);

// ─── Configuração do cenário ──────────────────────────────────────────────────

export const options = {
  scenarios: {
    race_condition_apontamentos: {
      executor: 'shared-iterations',
      vus: 50,            // 50 operadores virtuais simultâneos
      iterations: 200,    // Total de 200 apontamentos a disparar
      maxDuration: '30s', // Janela generosa (original: 5s — pode manter se a rede for rápida)
    },
  },

  thresholds: {
    // A API não pode demorar mais de 2s em 95% dos casos, mesmo sob 50 VUs
    'pcp_race_req_duration_ms': ['p(95)<2000'],

    // ZERO erros 500 tolerados — deadlock ou exceção não tratada é falha crítica
    'pcp_race_no_crash_rate': ['rate==1.0'],

    // Aceitamos qualquer mix de 200+409 (soma deve ser 200 requests):
    // não colocamos threshold aqui — as Counters são evidências qualitativas
    'http_req_failed': ['rate<1.0'],
  },
};

// ─── Função principal (default) ───────────────────────────────────────────────

export default function () {
  const url = `${BASE_URL}/api/pcp/apontamentos`;

  /**
   * PAYLOAD ADAPTADO AO SISTEMA REAL
   *
   * Campos que o servidor realmente processa (server.js:8254):
   *   ordem_producao_id   OBRIGATÓRIO  — ID inteiro da OP (não string "OP-xxxx")
   *   etapa_id            OBRIGATÓRIO  — sem isso: 400 imediato
   *   quantidade_produzida OBRIGATÓRIO — deve ser > 0
   *   quantidade_refugo   opcional     — padrão 0
   *   operador            opcional     — padrão 'Operador'
   *   maquina             opcional
   *   turno               opcional     — padrão '1'
   *   tempo_producao      opcional     — em minutos (era tempo_gasto_minutos no script original)
   *   tempo_setup         opcional
   *   tempo_parada        opcional
   *   observacoes         opcional
   *
   * Campos do script original que NÃO existem no servidor:
   *   ❌ data_apontamento  — servidor usa NOW() internamente, campo ignorado
   *   ❌ tempo_gasto_minutos — campo desconhecido, ignorado
   *
   * X-Idempotency-Key: enviado mas silenciosamente ignorado pelo servidor.
   * Cada request com o mesmo payload vai gerar um INSERT separado.
   * Isso é um FINDING se a OP permanecer aberta (buckets de 200 apontamentos distintos).
   */
  const payload = JSON.stringify({
    ordem_producao_id: OP_ID,
    etapa_id:          ETAPA_ID,
    quantidade_produzida: QTD_POR_REQ,
    quantidade_refugo: 0,
    operador:          `k6-vu${__VU}`,
    turno:             '1',
    tempo_producao:    15,
    observacoes:       `Apontamento gerado via teste de saturacao k6 · VU=${__VU} ITER=${__ITER}`,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': AUTH_BEARER ? `Bearer ${AUTH_BEARER}` : undefined,
      // Enviado conforme script original — servidor NÃO implementa dedup por este header.
      // Cada request ainda será inserida individualmente → FINDING esperado.
      'X-Idempotency-Key': `k6-req-${__VU}-${__ITER}`,
    },
    timeout: '5s',
  };

  // Remove o header Authorization se não foi fornecido bearer
  if (!AUTH_BEARER) {
    delete params.headers['Authorization'];
  }

  const res = http.post(url, payload, params);
  req_duration.add(res.timings.duration);

  // ─── Contadores por status ──────────────────────────────────────────────────

  if (res.status === 200) {
    // Servidor usa res.json({success:true}) sem .status(201)
    // Portanto sucesso real = 200, não 201 como no script original
    successful_inserts.add(1);
  }

  if (res.status === 409) {
    // 409 = OP cancelada/concluída  OU  quantidade excede limite da etapa
    // Ambos são respostas corretas — o FOR UPDATE está funcionando
    blocked_by_limit.add(1);
  }

  if (res.status >= 500) {
    server_errors.add(1);
  }

  const noCrash = res.status < 500;
  no_crash_rate.add(noCrash);

  // ─── Checks ─────────────────────────────────────────────────────────────────

  check(res, {
    // Sucesso real no sistema = status 200 (não 201 — servidor não usa .status(201))
    'Status é 200 (Apontamento Inserido)':
      (r) => r.status === 200,

    // Bloqueio por limite ou status da OP — comportamento CORRETO do sistema
    'Status é 409/422 (Bloqueado por Limite/Status da OP)':
      (r) => r.status === 409 || r.status === 422,

    // RGOL — nunca deve ocorrer: deadlock, exceção não tratada, OOM
    'NUNCA deve retornar 500 (Deadlock/Crash)':
      (r) => r.status !== 500,

    // Latência: mesmo sob 50 VUs, cada resposta deve chegar em < 500ms
    'Tempo de resposta aceitável (< 500ms)':
      (r) => r.timings.duration < 500,

    // Detecta se o servidor ignorou o X-Idempotency-Key:
    // Se o servidor IMPLEMENTASSE dedup por esse header, requests do mesmo VU/ITER
    // retornariam 409 na segunda chamada. Como não implementa, retorna 200 repetidamente.
    // Este check documenta a ausência de implementação quando o status é 200:
    'X-Idempotency-Key foi processado pelo servidor (esperado: falhar = não implementado)':
      (r) => r.status === 409 && r.headers['X-Idempotency-Key-Result'] !== undefined,
  });

  // Cadência variável entre 10ms e 50ms (mesmo que script original)
  sleep(Math.random() * 0.05);
}

// ─── Sumário customizado no teardown ─────────────────────────────────────────

export function handleSummary(data) {
  const inserts  = data.metrics['pcp_race_inserts_ok']   ? data.metrics['pcp_race_inserts_ok'].values.count   : 0;
  const blocked  = data.metrics['pcp_race_blocked_limit'] ? data.metrics['pcp_race_blocked_limit'].values.count : 0;
  const crashes  = data.metrics['pcp_race_server_errors'] ? data.metrics['pcp_race_server_errors'].values.count : 0;
  const total    = inserts + blocked + crashes;
  const p95      = data.metrics['pcp_race_req_duration_ms']
    ? Math.round(data.metrics['pcp_race_req_duration_ms'].values['p(95)'])
    : null;

  const lines = [
    '════════════════════════════════════════════════════════════',
    '  PCP RACE SATURATION — RESUMO',
    '════════════════════════════════════════════════════════════',
    `  Total requests disparados :  ${total}`,
    `  ✅ Aceitos (200)           :  ${inserts}`,
    `  ⚠️  Bloqueados (409)        :  ${blocked}`,
    `  💥 Crashes (5xx)           :  ${crashes}   ← deve ser 0`,
    `  ⏱️  p(95) latência          :  ${p95 !== null ? p95 + ' ms' : 'N/A'}`,
    '',
    crashes > 0
      ? '  ❌ CRÍTICO: 500s detectados — verificar deadlocks no MySQL!'
      : '  ✅ ZERO crashes — FOR UPDATE protegeu o banco.',
    inserts > 0 && blocked === 0
      ? '  ⚠️  FINDING: 0 bloqueios — verificar se quantidade_prevista da etapa está configurada.'
      : '',
    inserts > 0 && blocked > 0
      ? '  ✅ Mix saudável de 200+409 — lock pessimista funcionando sob carga.'
      : '',
    '════════════════════════════════════════════════════════════',
  ].filter(Boolean).join('\n');

  console.log('\n' + lines + '\n');

  return {
    stdout: lines,
    'tests/perf/pcp-race-saturacao-summary.json': JSON.stringify(data, null, 2),
  };
}
