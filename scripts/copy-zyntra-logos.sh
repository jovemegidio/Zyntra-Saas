#!/bin/bash
echo "=== Copy Zyntra logos everywhere ==="

LOGO=/var/www/aluforce/public/images/zyntra-logo.png
BRANCO=/var/www/aluforce/public/images/zyntra-branco.png

# Module directories
for moddir in /var/www/aluforce/modules/Compras /var/www/aluforce/modules/Faturamento /var/www/aluforce/modules/Financeiro /var/www/aluforce/modules/Vendas; do
    if [ -d "$moddir" ]; then
        echo "Module: $(basename $moddir)"
        cp "$LOGO" "$moddir/Logo Monocromatico - Azul - Zyntra.png"
        cp "$BRANCO" "$moddir/Logo Monocromatico - Branco - Zyntra.png"
        cp "$BRANCO" "$moddir/Logo Monocromatico - Branco - Zyntra copy.webp"
        cp "$BRANCO" "$moddir/zyntra-branco.png"
        echo "  OK"
    fi
done

# Chat
if [ -d /var/www/aluforce/public/chat ]; then
    cp "$LOGO" /var/www/aluforce/public/chat/zyntra-logo.png
    cp "$BRANCO" /var/www/aluforce/public/chat/zyntra-branco.png
    echo "Chat: OK"
fi

# Ajuda
if [ -d /var/www/aluforce/public/Ajuda-Aluforce ]; then
    cp "$LOGO" "/var/www/aluforce/public/Ajuda-Aluforce/Logo Monocromatico - Azul - Zyntra.png"
    cp "$BRANCO" "/var/www/aluforce/public/Ajuda-Aluforce/Logo Monocromatico - Branco - Zyntra copy.webp"
    echo "Ajuda: OK"
fi

echo ""
echo "=== Verify ==="
find /var/www/aluforce -name "*Zyntra*" -newer /tmp/test-visual-v5.sh | head -20

echo "DONE"
