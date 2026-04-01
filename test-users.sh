#!/bin/bash
mysql -u aluforce -pCHANGE_ME_DB_PASSWORD aluforce_vendas -e "SELECT id, nome, email, LEFT(COALESCE(password_hash, senha_hash, senha, ''), 10) as pw_preview FROM usuarios WHERE status != 'inativo' LIMIT 5"
