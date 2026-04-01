#!/bin/bash
# Criar usuário e configurar banco

mysql << 'MYSQL_SCRIPT'
CREATE USER IF NOT EXISTS 'aluforce'@'localhost' IDENTIFIED BY 'CHANGE_ME_DB_PASSWORD';
GRANT ALL PRIVILEGES ON aluforce_vendas.* TO 'aluforce'@'localhost';
FLUSH PRIVILEGES;
SELECT User, Host FROM mysql.user WHERE User='aluforce';
MYSQL_SCRIPT

echo "Testando conexão..."
mysql -ualuforce -pCHANGE_ME_DB_PASSWORD -e "SELECT 'Conexao OK!' as Status" aluforce_vendas
