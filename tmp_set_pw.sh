#!/bin/bash
# Set a known bcrypt password for user id=3 (ti@laboreletric.com.br)
# Password: Test@2026
HASH=$(node -e "const b=require('bcryptjs'); b.hash('Test@2026',12).then(h=>console.log(h))")
echo "Setting password hash: $HASH"
mysql -u aluforce -p'Aluforce2026VpsDB' labor_eletric_vendas -e "UPDATE usuarios SET senha_hash = '$HASH', password_hash = '$HASH', login_attempts = 0, locked_until = NULL WHERE id = 3; SELECT id, email, LEFT(senha_hash, 20) as hash_preview, login_attempts, locked_until FROM usuarios WHERE id = 3"
