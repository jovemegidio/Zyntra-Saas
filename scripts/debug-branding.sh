#!/bin/bash
cd /var/www/aluforce
echo "=== Test 1: BRAND env var ==="
echo "BRAND=$BRAND"

echo ""
echo "=== Test 2: Node require middleware ==="
node -e "
const m = require('./middleware/zyntra-branding');
console.log('IS_ZYNTRA:', m.IS_ZYNTRA);
console.log('IS_DEMO:', m.IS_DEMO);
console.log('BRAND:', m.BRAND);
"

echo ""
echo "=== Test 3: Quick HTML transform test ==="
node -e "
process.env.BRAND = 'zyntra';
process.env.DEMO_MODE = 'true';
// Force re-evaluate by removing cache
delete require.cache[require.resolve('./middleware/zyntra-branding')];
const m = require('./middleware/zyntra-branding');
console.log('IS_ZYNTRA (forced):', m.IS_ZYNTRA);
"

echo ""
echo "=== Test 4: PM2 zyntra-demo process logs (last 10 lines) ==="
pm2 logs zyntra-demo --nostream --lines 5 2>/dev/null | tail -10
