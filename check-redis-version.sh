#!/bin/bash
echo "=== redis npm version ==="
node -p "require('/var/www/aluforce/node_modules/redis/package.json').version"
echo "=== @socket.io/redis-adapter version ==="
node -p "require('/var/www/aluforce/node_modules/@socket.io/redis-adapter/package.json').version"
echo "=== Redis TCP test ==="
redis-cli -h 127.0.0.1 -p 6379 ping
echo "=== Socket.IO Redis Adapter test ==="
cd /var/www/aluforce && node -e "
const { createClient } = require('redis');
const c = createClient({ url: 'redis://127.0.0.1:6379' });
c.on('error', e => { console.log('ERROR:', e.message); process.exit(1); });
c.connect().then(() => { console.log('CONNECTED OK'); return c.ping(); }).then(r => { console.log('PING:', r); c.disconnect(); process.exit(0); }).catch(e => { console.log('FAILED:', e.message); process.exit(1); });
setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 5000);
"
