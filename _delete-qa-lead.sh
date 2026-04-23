#!/bin/bash
echo "=== Buscando leads QA/FATURAMENTO ==="
mysql -u aluforce -pAluforce2026VpsDB aluforce_vendas -e "SELECT id, razao_social, nome_fantasia, cnpj, email, status FROM leads_prospeccao WHERE nome_fantasia LIKE '%QA%' OR razao_social LIKE '%QA%' OR nome_fantasia LIKE '%FATURAMENTO%' LIMIT 10;"

echo ""
echo "=== Deletando leads QA FATURAMENTO ==="
mysql -u aluforce -pAluforce2026VpsDB aluforce_vendas -e "DELETE FROM leads_prospeccao WHERE nome_fantasia LIKE '%QA%FATURAMENTO%' OR razao_social LIKE '%QA%FATURAMENTO%'; SELECT ROW_COUNT() as linhas_deletadas;"
echo "=== DONE ==="
