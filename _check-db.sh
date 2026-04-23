#!/bin/bash
mysql -u aluforce -pAluforce2026VpsDB aluforce_vendas -e "SHOW TABLES LIKE 'pedido%'; SHOW TABLES LIKE 'produto%'; DESCRIBE estoque;" 2>/dev/null
