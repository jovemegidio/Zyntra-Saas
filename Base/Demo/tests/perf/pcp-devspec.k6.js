import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

const BASE_URL = __ENV.PCP_BASE_URL || 'http://localhost:3001';
const AUTH_BEARER = __ENV.PCP_AUTH_BEARER || '';
const AUTH_COOKIE = __ENV.PCP_AUTH_COOKIE || '';

const OP_ID = Number(__ENV.PCP_OP_ID || 1024);
const ETAPA_ID = Number(__ENV.PCP_ETAPA_ID || 1);
const ORDEM_COMPRA_ID = Number(__ENV.PCP_ORDEM_COMPRA_ID || 1);

const FINDINGS = new Counter('pcp_findings_total');
const STEP_OK = new Rate('pcp_step_ok_rate');
const BIG_PAYLOAD_MS = new Trend('pcp_big_payload_duration_ms');
const PDF_BATCH_MS = new Trend('pcp_pdf_batch_duration_ms');
const REPORT_TSUNAMI_MS = new Trend('pcp_report_tsunami_duration_ms');
const RACE_APONTAMENTO_MS = new Trend('pcp_race_apontamento_duration_ms');

function authHeaders(extra) {
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  if (extra) {
    Object.keys(extra).forEach((key) => {
      headers[key] = extra[key];
    });
  }

  if (AUTH_BEARER) headers.Authorization = `Bearer ${AUTH_BEARER}`;
  if (AUTH_COOKIE) headers.Cookie = AUTH_COOKIE;

  return headers;
}

function addFinding(name, evidence) {
  FINDINGS.add(1, { finding: name });
  console.log(`[FINDING] ${name} :: ${evidence}`);
}

export const options = {
  scenarios: {
    fat_payload_op_colossal: {
      executor: 'shared-iterations',
      vus: 1,
      iterations: 1,
      exec: 'scenarioFatPayloadOpColossal',
      startTime: '0s',
      maxDuration: '2m',
    },
    pdf_stress_50_concurrent: {
      executor: 'shared-iterations',
      vus: 1,
      iterations: 1,
      exec: 'scenarioPdfStress',
      startTime: '5s',
      maxDuration: '2m',
    },
    report_tsunami_5y: {
      executor: 'shared-iterations',
      vus: 1,
      iterations: 1,
      exec: 'scenarioReportTsunami',
      startTime: '10s',
      maxDuration: '2m',
    },
    race_choque_apontamentos: {
      executor: 'shared-iterations',
      vus: 1,
      iterations: 1,
      exec: 'scenarioChoqueApontamentos',
      startTime: '15s',
      maxDuration: '2m',
    },
    race_status_vs_apontamento: {
      executor: 'shared-iterations',
      vus: 1,
      iterations: 1,
      exec: 'scenarioStatusVsApontamento',
      startTime: '20s',
      maxDuration: '2m',
    },
    idempotencia_duplo_clique: {
      executor: 'shared-iterations',
      vus: 1,
      iterations: 1,
      exec: 'scenarioDuploCliqueIdempotencia',
      startTime: '25s',
      maxDuration: '2m',
    },
    caos_transacao_zumbi: {
      executor: 'shared-iterations',
      vus: 1,
      iterations: 1,
      exec: 'scenarioTransacaoZumbi',
      startTime: '30s',
      maxDuration: '2m',
    },
    caos_rehidratacao_offline: {
      executor: 'shared-iterations',
      vus: 1,
      iterations: 1,
      exec: 'scenarioRehidratacaoOffline',
      startTime: '35s',
      maxDuration: '3m',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.40'],
    pcp_step_ok_rate: ['rate>0.70'],
    pcp_big_payload_duration_ms: ['p(95)<30000'],
    pcp_pdf_batch_duration_ms: ['p(95)<30000'],
    pcp_report_tsunami_duration_ms: ['p(95)<10000'],
    pcp_race_apontamento_duration_ms: ['p(95)<10000'],
  },
};

export function scenarioFatPayloadOpColossal() {
  group('VOLUME: Ataque da OP Colossal (5.000 itens)', () => {
    const itens = [];
    for (let i = 1; i <= 5000; i++) {
      itens.push({
        codigo: `PERFIL-${String(i).padStart(5, '0')}`,
        descricao: `Perfil de teste ${i}`,
        quantidade: 1,
        unidade: 'UN',
      });
    }

    const payload = {
      codigo: `OP-K6-FAT-${Date.now()}`,
      produto_nome: 'OP Colossal DEV SPEC',
      quantidade: 5000,
      unidade: 'UN',
      status: 'pendente',
      prioridade: 'alta',
      data_inicio: '2026-03-28',
      data_prevista: '2026-04-30',
      responsavel: 'k6-load-test',
      observacoes: 'Payload com 5.000 itens para validar heap e parser',
      itens,
    };

    const res = http.post(
      `${BASE_URL}/api/pcp/ordens-producao`,
      JSON.stringify(payload),
      { headers: authHeaders() }
    );

    BIG_PAYLOAD_MS.add(res.timings.duration);

    const ok = check(res, {
      'V1 respondeu (201/400/413/422)': (r) => [201, 400, 413, 422].includes(r.status),
      'V1 sem timeout de socket': (r) => r.timings.duration < 60000,
    });
    STEP_OK.add(ok);

    if (res.status >= 500) {
      addFinding('V1_BACKEND_5XX', `status=${res.status} body=${String(res.body).slice(0, 300)}`);
    }
  });
}

export function scenarioPdfStress() {
  group('VOLUME: Estresse do Gerador de PDF (50 simultâneos)', () => {
    const requests = [];
    for (let i = 0; i < 50; i++) {
      requests.push([
        'GET',
        `${BASE_URL}/api/pcp/ordens-compra/${ORDEM_COMPRA_ID}/pdf`,
        null,
        { headers: authHeaders({ Accept: 'application/pdf' }), timeout: '30s' },
      ]);
    }

    const t0 = Date.now();
    const responses = http.batch(requests);
    const elapsed = Date.now() - t0;
    PDF_BATCH_MS.add(elapsed);

    const success = responses.filter((r) => r && r.status === 200).length;
    const failed5xx = responses.filter((r) => r && r.status >= 500).length;

    const ok = check({ success, failed5xx }, {
      'V2 pelo menos 1 PDF respondeu': (x) => x.success >= 1,
      'V2 lote processado sem colapso total': (x) => x.success > 0 || x.failed5xx < 50,
    });
    STEP_OK.add(ok);

    if (failed5xx > 0) {
      addFinding('V2_PDF_5XX', `failed5xx=${failed5xx} success=${success}`);
    }
  });
}

export function scenarioReportTsunami() {
  group('VOLUME: Tsunami de Listagem (5 anos)', () => {
    const noPaging = http.get(
      `${BASE_URL}/api/pcp/apontamentos/relatorio?dataInicio=2021-01-01&dataFim=2026-12-31`,
      { headers: authHeaders() }
    );

    const hugeLimit = http.get(
      `${BASE_URL}/api/pcp/apontamentos/relatorio?dataInicio=2021-01-01&dataFim=2026-12-31&page=1&limit=100000`,
      { headers: authHeaders() }
    );

    const validPage = http.get(
      `${BASE_URL}/api/pcp/apontamentos/relatorio?dataInicio=2021-01-01&dataFim=2026-12-31&page=1&limit=1000`,
      { headers: authHeaders() }
    );

    REPORT_TSUNAMI_MS.add(noPaging.timings.duration);
    REPORT_TSUNAMI_MS.add(hugeLimit.timings.duration);
    REPORT_TSUNAMI_MS.add(validPage.timings.duration);

    const ok = check({ noPaging, hugeLimit, validPage }, {
      'V3 sem paginação retorna 400': (x) => x.noPaging.status === 400,
      'V3 limit=100000 retorna 400': (x) => x.hugeLimit.status === 400,
      'V3 page/limit válidos não quebram': (x) => [200, 204].includes(x.validPage.status),
    });
    STEP_OK.add(ok);

    if (noPaging.status !== 400 || hugeLimit.status !== 400) {
      addFinding(
        'V3_PAGINATION_BYPASS',
        `noPaging=${noPaging.status}, hugeLimit=${hugeLimit.status}, valid=${validPage.status}`
      );
    }
  });
}

export function scenarioChoqueApontamentos() {
  group('CONCORRÊNCIA: Choque de Apontamentos (5 x 30 peças)', () => {
    const reqs = [];
    for (let i = 0; i < 5; i++) {
      const body = JSON.stringify({
        ordem_producao_id: OP_ID,
        etapa_id: ETAPA_ID,
        quantidade_produzida: 30,
        quantidade_refugo: 0,
        operador: `k6-operador-${i + 1}`,
        turno: '1',
      });

      reqs.push([
        'POST',
        `${BASE_URL}/api/pcp/apontamentos`,
        body,
        { headers: authHeaders(), timeout: '20s' },
      ]);
    }

    const t0 = Date.now();
    const responses = http.batch(reqs);
    const elapsed = Date.now() - t0;
    RACE_APONTAMENTO_MS.add(elapsed);

    const statusCount = responses.reduce((acc, r) => {
      const k = String(r.status);
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    }, {});

    const success = statusCount['200'] || 0;
    const conflict = statusCount['409'] || 0;

    const ok = check({ success, conflict }, {
      'C1 pelo menos 1 sucesso': (x) => x.success >= 1,
      'C1 bloqueia excedente (espera-se >=1 conflito)': (x) => x.conflict >= 1,
      'C1 não aceita todas as 5': (x) => x.success < 5,
    });
    STEP_OK.add(ok);

    if (success === 5 || conflict === 0) {
      addFinding('C1_RACE_NOT_BLOCKED', `statusCount=${JSON.stringify(statusCount)}`);
    }
  });
}

export function scenarioStatusVsApontamento() {
  group('CONCORRÊNCIA: Mudança de Status vs Apontamento', () => {
    const payloadAp = JSON.stringify({
      ordem_producao_id: OP_ID,
      etapa_id: ETAPA_ID,
      quantidade_produzida: 5,
      operador: 'k6-operador-race',
      turno: '1',
    });

    const pair = http.batch([
      ['PUT', `${BASE_URL}/api/pcp/ordens/${OP_ID}/status`, JSON.stringify({ status: 'cancelada' }), { headers: authHeaders() }],
      ['POST', `${BASE_URL}/api/pcp/apontamentos`, payloadAp, { headers: authHeaders() }],
    ]);

    const statusChange = pair[0];
    const apontamento = pair[1];

    const ok = check({ statusChange, apontamento }, {
      'C2 status responde sem timeout': (x) => x.statusChange.timings.duration < 20000,
      'C2 apontamento responde sem timeout': (x) => x.apontamento.timings.duration < 20000,
      'C2 ao menos um resultado válido (200/409)': (x) => [200, 409, 400, 404].includes(x.statusChange.status) && [200, 409, 400, 404].includes(x.apontamento.status),
    });
    STEP_OK.add(ok);

    if (statusChange.status === 200 && apontamento.status === 200) {
      addFinding('C2_BOTH_ACCEPTED', 'Ambas operações retornaram 200; validar consistência final no banco.');
    }
  });
}

export function scenarioDuploCliqueIdempotencia() {
  group('CONCORRÊNCIA: Teste do Duplo Clique (10 POST em 1s)', () => {
    const fixedCode = `OP-IDEMP-${Date.now()}`;
    const idempotencyKey = `K6-IDEMP-${fixedCode}`;
    const reqs = [];

    for (let i = 0; i < 10; i++) {
      const body = JSON.stringify({
        codigo: fixedCode,
        produto_nome: 'Produto pedido #500',
        quantidade: 100,
        unidade: 'UN',
        status: 'pendente',
        prioridade: 'alta',
        data_inicio: '2026-03-28',
        data_prevista: '2026-04-15',
        responsavel: 'k6-idempotencia',
        observacoes: 'payload duplicado para teste de idempotência',
      });

      reqs.push([
        'POST',
        `${BASE_URL}/api/pcp/ordens-producao`,
        body,
        { headers: authHeaders({ 'X-Idempotency-Key': idempotencyKey }) },
      ]);
    }

    const responses = http.batch(reqs);
    const created = responses.filter((r) => r.status === 201).length;

    const ok = check({ created }, {
      'C3 ideal: no máximo 1 criação': (x) => x.created <= 1,
    });
    STEP_OK.add(ok);

    if (created > 1) {
      addFinding('C3_IDEMPOTENCY_MISSING', `created=${created} para mesmo payload/key`);
    }
  });
}

export function scenarioTransacaoZumbi() {
  group('CHAOS: Transações Zumbis (timeout no meio da resposta)', () => {
    const body = JSON.stringify({
      ordem_producao_id: OP_ID,
      etapa_id: ETAPA_ID,
      quantidade_produzida: 1,
      operador: 'k6-zumbi',
      turno: '1',
      observacoes: 'simulacao-timeout-zumbi',
    });

    const res = http.post(`${BASE_URL}/api/pcp/apontamentos`, body, {
      headers: authHeaders(),
      timeout: '100ms',
    });

    const ok = check(res, {
      'CH1 request terminou (status ou timeout tratado)': (r) => r.status >= 0,
    });
    STEP_OK.add(ok);

    if (res.error || res.status === 0) {
      addFinding('CH1_TIMEOUT_TRIGGERED', `error=${res.error || 'timeout'}`);
    }

    // Sem acesso direto ao DB nesse runner: consistência transacional deve ser validada
    // com consulta SQL out-of-band (ou endpoint dedicado de auditoria transacional).
  });
}

export function scenarioRehidratacaoOffline() {
  group('CHAOS: Re-hidratação Offline->Online (mesmo payload reenviado)', () => {
    const eventId = `K6-REHY-${Date.now()}`;
    const body = {
      ordem_producao_id: OP_ID,
      etapa_id: ETAPA_ID,
      quantidade_produzida: 2,
      operador: 'k6-offline',
      turno: '1',
      observacoes: `rehydration:${eventId}`,
      client_event_id: eventId,
    };

    const first = http.post(`${BASE_URL}/api/pcp/apontamentos`, JSON.stringify(body), {
      headers: authHeaders(),
      timeout: '20s',
    });

    sleep(2);

    const second = http.post(`${BASE_URL}/api/pcp/apontamentos`, JSON.stringify(body), {
      headers: authHeaders(),
      timeout: '20s',
    });

    const ok = check({ first, second }, {
      'CH2 primeira tentativa respondeu': (x) => [200, 201, 409].includes(x.first.status),
      'CH2 segunda tentativa respondeu': (x) => [200, 201, 409].includes(x.second.status),
      'CH2 ideal: segunda rejeitada como duplicata (409)': (x) => x.second.status === 409,
    });
    STEP_OK.add(ok);

    if (second.status !== 409) {
      addFinding('CH2_DUPLICATE_ACCEPTED', `first=${first.status} second=${second.status} event=${eventId}`);
    }
  });
}

export default function () {
  // Cenários são executados pelos executores nomeados acima.
}
