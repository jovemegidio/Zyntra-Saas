#!/bin/bash
cd /var/www/zyntra-igrejas
pkill -f "npm install" 2>/dev/null
rm -rf node_modules package-lock.json
cat > package.json << 'EOF'
{
  "name": "zyntra-igrejas",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "express": "^4.21.0",
    "helmet": "^8.0.0",
    "compression": "^1.7.5"
  }
}
EOF
npm install --omit=dev 2>&1
echo "DONE: deps installed"
