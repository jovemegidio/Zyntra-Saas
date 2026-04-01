#!/bin/bash
mysql -u aluforce -pCHANGE_ME_DB_PASSWORD aluforce_vendas -e "INSERT IGNORE INTO permissoes_acoes (usuario_id, acao) VALUES (57, 'ver_relatorio');"
mysql -u aluforce -pCHANGE_ME_DB_PASSWORD aluforce_vendas -e "INSERT IGNORE INTO permissoes_acoes (usuario_id, acao) VALUES (57, 'criar_orcamento');"
mysql -u aluforce -pCHANGE_ME_DB_PASSWORD aluforce_vendas -e "INSERT IGNORE INTO permissoes_acoes (usuario_id, acao) VALUES (57, 'ver_orcamento');"
mysql -u aluforce -pCHANGE_ME_DB_PASSWORD aluforce_vendas -e "INSERT IGNORE INTO permissoes_acoes (usuario_id, acao) VALUES (57, 'ver_auditoria');"
echo "Permissions granted for user 57"
