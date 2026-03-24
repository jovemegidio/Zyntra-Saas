#!/bin/bash
echo "=== CLONANDO ESTRUTURA ==="
mysqldump -u aluforce -pAluforce2026VpsDB --no-data --skip-triggers --skip-lock-tables --single-transaction aluforce_vendas 2>/dev/null | mysql -u aluforce -pAluforce2026VpsDB zyntra_demo 2>/dev/null
echo "Tabelas clonadas:"
mysql -u aluforce -pAluforce2026VpsDB -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='zyntra_demo' AND table_type='BASE TABLE';" 2>/dev/null
