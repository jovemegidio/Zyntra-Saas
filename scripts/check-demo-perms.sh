#!/bin/bash
# Check and fix demo user permissions for all modules

mysql -u aluforce -pAluforce2026VpsDB zyntra_demo << 'SQL'
-- Check user info
SELECT id, nome, email, funcao, departamento FROM usuarios WHERE email = 'admin@zyntra.com.br';

-- Check user permissions
SELECT u.id, u.email, p.modulo, p.pode_visualizar, p.pode_editar, p.pode_excluir, p.pode_criar
FROM usuarios u
LEFT JOIN permissoes p ON u.id = p.usuario_id
WHERE u.email = 'admin@zyntra.com.br';

-- Check if there's a permissoes table or similar
SHOW TABLES LIKE '%permiss%';
SHOW TABLES LIKE '%acesso%';
SHOW TABLES LIKE '%module%';
SHOW TABLES LIKE '%role%';
SQL
