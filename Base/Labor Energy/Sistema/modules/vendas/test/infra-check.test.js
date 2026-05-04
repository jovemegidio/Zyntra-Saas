/**
 * infra-check.test.js — Teste nível-0 para validar infraestrutura Jest
 * Dois testes puros (sem I/O, sem require do server, sem supertest).
 * Se isto travar, o problema é Jest/Node no ambiente, não o nosso código.
 */

describe('Infra Check — Jest funciona?', () => {

  test('1 + 1 = 2', () => {
    expect(1 + 1).toBe(2);
  });

  test('Objeto role tem campo esperado', () => {
    const vendedor = { id: 1, role: 'user', vendedor_id: 10 };
    expect(vendedor).toHaveProperty('role', 'user');
    expect(vendedor).toHaveProperty('vendedor_id');
  });

});
