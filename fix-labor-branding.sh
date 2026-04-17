#!/bin/bash
BASE=/var/www/labor-eletric

find $BASE/modules $BASE/public -type f \( -name '*.html' -o -name '*.js' \) \
  ! -path '*/node_modules/*' \
  ! -path '*/.git/*' \
  ! -path '*/backup*/*' \
  ! -path '*.bak*' \
  ! -path '*.backup*' \
  | while read f; do
    if grep -q 'Logo Monocromatico.*Aluforce' "$f" 2>/dev/null; then
      echo "Fixing logos in: $f"
      sed -i 's|/images/Logo Monocromatico - Azul - Aluforce.png|/images/labor-eletric-logo-azul.png|g' "$f"
      sed -i 's|/images/Logo Monocromatico - Branco - Aluforce.png|/images/labor-eletric-logo-branco.png|g' "$f"
      sed -i "s|alt=\"ALUFORCE\"|alt=\"LABOR ELETRIC\"|g" "$f"
    fi
done

echo "--- Done fixing logos ---"
echo ""
echo "Remaining Logo Monocromatico refs:"
grep -rl 'Logo Monocromatico.*Aluforce' $BASE/modules/ $BASE/public/ 2>/dev/null | grep -v node_modules | grep -v '.git/' | grep -v backup | wc -l
