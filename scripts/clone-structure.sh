#!/bin/bash
echo "=== CLONANDO ESTRUTURA ==="
mysqldump -u aluforce -pCHANGE_ME_DB_PASSWORD --no-data --skip-triggers --skip-lock-tables --single-transaction aluforce_vendas 2>/dev/null | mysql -u aluforce -pCHANGE_ME_DB_PASSWORD zyntra_demo 2>/dev/null
echo "Tabelas clonadas:"
mysql -u aluforce -pCHANGE_ME_DB_PASSWORD -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='zyntra_demo' AND table_type='BASE TABLE';" 2>/dev/null
