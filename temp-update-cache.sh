#!/bin/bash
# Atualizar cache-buster do chat em todos os HTMLs
FILES=(
  /var/www/aluforce/modules/Compras/public/index.html
  /var/www/aluforce/modules/Faturamento/public/index.html
  /var/www/aluforce/modules/PCP/index.html
  /var/www/aluforce/modules/RH/index.html
  /var/www/aluforce/modules/Financeiro/public/index.html
  /var/www/aluforce/modules/Vendas/public/index.html
  /var/www/aluforce/public/index.html
)

for f in "${FILES[@]}"; do
  sed -i 's|chat-widget\.css?v=[^"]*|chat-widget.css?v=20260303c|g' "$f"
  sed -i 's|chat-widget\.js?v=[^"]*|chat-widget.js?v=20260303c|g' "$f"
  echo "Updated: $f"
done

echo "---VERIFY---"
grep -rn 'chat-widget' /var/www/aluforce/public/index.html | head -2
