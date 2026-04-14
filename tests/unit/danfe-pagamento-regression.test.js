const test = require('node:test');
const assert = require('node:assert/strict');
const PDFDocument = require('pdfkit');

const danfeService = require('../../modules/Faturamento/services/danfe.service');

test('DANFE header should not throw when emitente is missing', async () => {
  const doc = new PDFDocument({ autoFirstPage: false });
  doc.addPage();

  await assert.doesNotReject(async () => {
    await danfeService.desenharCabecalho(doc, {
      chaveAcesso: '12345678901234567890123456789012345678901234',
      numeroNFe: '1',
      serie: '1',
      dataEmissao: new Date().toISOString()
    });
  });

  doc.end();
});

test('payment condition payload alias remains singular for backend persistence', () => {
  const condicao = '28 / 35 / 42 dias';
  const dados = {
    condicao_pagamento: condicao,
    condicoes_pagamento: condicao,
    parcelas: condicao
  };

  assert.equal(dados.condicao_pagamento, condicao);
  assert.equal(dados.condicoes_pagamento, condicao);
  assert.equal(dados.parcelas, condicao);
});
