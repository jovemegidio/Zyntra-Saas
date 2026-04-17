#!/bin/bash
echo "=== USUARIOS TABLE COLUMNS ==="
mysql -u aluforce -p'Aluforce2026VpsDB' labor_eletric_vendas -e "SHOW COLUMNS FROM usuarios"

echo ""
echo "=== USER DATA ==="
mysql -u aluforce -p'Aluforce2026VpsDB' labor_eletric_vendas -e "SELECT id, nome, email, login, role, status, LEFT(COALESCE(senha_hash, senha, password, password_hash, ''), 20) as pw_preview FROM usuarios WHERE email = 'ti@laboreletric.com.br' OR login = 'ti'"
