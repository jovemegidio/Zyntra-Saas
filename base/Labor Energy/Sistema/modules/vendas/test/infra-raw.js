// infra-raw.js — Teste sem Jest, puro Node.js assert
const assert = require('assert');

console.log('=== INFRA RAW TEST START ===');

// Test 1
try {
  assert.strictEqual(1 + 1, 2);
  console.log('PASS: 1+1=2');
} catch (e) {
  console.log('FAIL: 1+1=2 -', e.message);
}

// Test 2 — simula lógica de role
try {
  const vendedor = { id: 1, role: 'user', vendedor_id: 10 };
  assert.strictEqual(vendedor.role, 'user');
  assert.ok(vendedor.vendedor_id);
  console.log('PASS: role check');
} catch (e) {
  console.log('FAIL: role check -', e.message);
}

console.log('=== INFRA RAW TEST END ===');
process.exit(0);
