#!/bin/bash
mysql -u aluforce -pAluforce2026VpsDB labor_eletric_vendas -e "SELECT email FROM usuarios WHERE email LIKE '%labor%';" 2>/dev/null
echo "---"
mysql -u aluforce -pAluforce2026VpsDB labor_eletric_vendas -e "SELECT COUNT(*) as total FROM usuarios;" 2>/dev/null
