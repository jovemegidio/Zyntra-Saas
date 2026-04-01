#!/bin/bash
echo '=== TABELAS PRODUCAO ==='
mysql -u aluforce -pCHANGE_ME_DB_PASSWORD -N -e "SELECT COUNT(*) as total FROM information_schema.tables WHERE table_schema='aluforce_vendas' AND table_type='BASE TABLE';" 2>/dev/null
echo '=== TABELAS DEMO ==='
mysql -u aluforce -pCHANGE_ME_DB_PASSWORD -N -e "SELECT COUNT(*) as total FROM information_schema.tables WHERE table_schema='zyntra_demo' AND table_type='BASE TABLE';" 2>/dev/null
echo '=== TESTE MYSQLDUMP ==='
mysqldump -u aluforce -pCHANGE_ME_DB_PASSWORD --no-data --skip-triggers --skip-lock-tables --single-transaction aluforce_vendas 2>/dev/null | head -20
echo '=== FIM ==='