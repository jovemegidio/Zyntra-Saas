#!/bin/bash
mysql -u aluforce -p'Aluforce2026VpsDB' labor_eletric_vendas -e "UPDATE usuarios SET login_attempts = 0, locked_until = NULL WHERE email = 'ti@laboreletric.com.br'"
mysql -u aluforce -p'Aluforce2026VpsDB' labor_eletric_vendas -e "SELECT id, email, login_attempts, locked_until FROM usuarios WHERE email = 'ti@laboreletric.com.br'"
