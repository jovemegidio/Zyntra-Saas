#!/bin/bash
echo "=== ALL USERS IN USUARIOS ==="
mysql -u aluforce -p'Aluforce2026VpsDB' labor_eletric_vendas -e "SELECT id, nome, email, login, role, status FROM usuarios LIMIT 20"

echo ""
echo "=== ALSO CHECK USERS TABLE ==="
mysql -u aluforce -p'Aluforce2026VpsDB' labor_eletric_vendas -e "SELECT id, username, name, role FROM users LIMIT 10" 2>/dev/null || echo "No users table or no data"
