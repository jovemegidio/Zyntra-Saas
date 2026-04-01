#!/bin/bash
# Criar banco e dar permissão
mysql -u root -p'CHANGE_ME_DB_PASSWORD' << 'EOF'
CREATE DATABASE IF NOT EXISTS zyntra_demo CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
GRANT ALL PRIVILEGES ON zyntra_demo.* TO 'aluforce'@'localhost';
FLUSH PRIVILEGES;
SELECT 'OK - zyntra_demo criado e permissoes concedidas' as resultado;
EOF
