#!/bin/bash
set -e
cd /var/www/aluforce

echo "=== Step 1: Add transformHtml function to zyntra-branding.js ==="

# Check if transformHtml already exists
if grep -q 'transformHtml' middleware/zyntra-branding.js; then
    echo "transformHtml already exists, skipping"
else
    # Add transformHtml function before the module.exports
    cat > /tmp/transform-patch.js << 'ENDPATCH'

/**
 * Transforma HTML string aplicando branding Zyntra
 * Pode ser chamado diretamente (ex: no sendFile interceptor)
 */
function transformHtml(html) {
    if (!IS_ZYNTRA || typeof html !== 'string') return html;
    if (!html.includes('<!DOCTYPE html') && !html.includes('<html')) return html;

    // Substituicoes de texto
    html = html
        .replace(/ALUFORCE/g, 'ZYNTRA')
        .replace(/Aluforce/g, 'Zyntra')
        .replace(/aluforce/g, 'zyntra')
        .replace(/Sistema de Gest\u00e3o Empresarial/g, 'Sistema de Gest\u00e3o Empresarial')
        .replace(/Logo Monocromatico - Branco - Aluforce copy\.webp/g, 'zyntra-branco.png')
        .replace(/Logo Monocromatico - Azul - Aluforce\.png/g, 'zyntra-branco.png')
        .replace(/Logo Monocromatico - Branco - Aluforce\.png/g, 'zyntra-branco.png')
        .replace(/Logo Monocromatico - Branco - Aluforce\.webp/g, 'zyntra-branco.png')
        .replace(/Logo Monocromatico - Azul - Aluforce\.webp/g, 'zyntra-branco.png')
        .replace(/Interativo-Aluforce\.png/g, 'zyntra-branco.png')
        .replace(/Interativo-Aluforce\.webp/g, 'zyntra-branco.png')
        .replace(/@aluforce\.ind\.br/g, '@zyntra.com.br')
        .replace(/zyntra\.api\.br/g, 'aluforce.api.br')
        .replace(/zyntra\.ind\.br/g, 'aluforce.ind.br');

    // Injetar CSS antes de </head>
    if (html.includes('</head>')) {
        html = html.replace('</head>', ZYNTRA_CSS + '</head>');
    }

    // Injetar banner demo depois de <body>
    if (DEMO_BANNER && html.includes('<body')) {
        html = html.replace(/(<body[^>]*>)/, '$1' + DEMO_BANNER);
    }

    return html;
}
ENDPATCH

    # Insert before module.exports line
    EXPORT_LINE=$(grep -n 'module.exports' middleware/zyntra-branding.js | head -1 | cut -d: -f1)
    echo "Inserting transformHtml before line $EXPORT_LINE"
    
    sed -i "${EXPORT_LINE}r /tmp/transform-patch.js" middleware/zyntra-branding.js
    
    # Add transformHtml to exports
    sed -i 's/    BRAND/    transformHtml,\n    BRAND/' middleware/zyntra-branding.js
    
    echo "transformHtml function added"
fi

echo ""
echo "=== Step 2: Import transformHtml in server.js ==="

# Update the require line to include transformHtml
if grep -q 'transformHtml' server.js; then
    echo "transformHtml already imported in server.js"
else
    sed -i "s/const { zyntraBrandingMiddleware, zyntraBrandInfo } = require('.\/middleware\/zyntra-branding');/const { zyntraBrandingMiddleware, zyntraBrandInfo, transformHtml, IS_ZYNTRA: IS_ZYNTRA_BRAND } = require('.\/middleware\/zyntra-branding');/" server.js
    echo "Import updated"
fi

echo ""
echo "=== Step 3: Call transformHtml in sendFile interceptor ==="

# Find the line where html is sent in the sendFile interceptor
# Look for: res.send(html); inside the sendFile interceptor (around line 1035)
# We need to add: if (IS_ZYNTRA_BRAND) html = transformHtml(html);
# Just before res.send(html) in the sendFile interceptor

if grep -q 'transformHtml(html)' server.js; then
    echo "transformHtml already integrated in sendFile interceptor"
else
    # Find the specific res.send(html) inside the sendFile interceptor
    # It's the one after res.setHeader('Content-Type', 'text/html; charset=utf-8');
    sed -i '/res\.setHeader.*Content-Type.*text\/html.*charset=utf-8/a\                // Zyntra Branding: transforma HTML se BRAND=zyntra\n                if (typeof transformHtml === \"function\") html = transformHtml(html);' server.js
    echo "transformHtml integrated in sendFile interceptor"
fi

echo ""
echo "=== Step 4: Verify changes ==="
grep -n 'transformHtml' server.js | head -5
echo "---"
grep -n 'transformHtml' middleware/zyntra-branding.js | head -5

echo ""
echo "=== Step 5: Restart zyntra-demo ==="
pm2 restart zyntra-demo --update-env
sleep 3
pm2 status zyntra-demo | grep zyntra

echo ""
echo "=== Step 6: Test branding ==="
sleep 2
TITLE=$(curl -s 'http://localhost:3003/login.html' | grep '<title>' | head -1)
echo "Page title: $TITLE"

BANNER=$(curl -s 'http://localhost:3003/login.html' | grep -c 'zyntra-demo-banner')
echo "Demo banner found: $BANNER times"

ZYNTRA_COUNT=$(curl -s 'http://localhost:3003/login.html' | grep -ci 'zyntra')
echo "Zyntra mentions: $ZYNTRA_COUNT"

echo ""
echo "DONE!"
