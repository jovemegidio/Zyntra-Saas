#!/bin/bash
# Check and fix demo user permissions for all modules

mysql -u aluforce -pCHANGE_ME_DB_PASSWORD zyntra_demo << 'SQL'
-- Check user columns
DESCRIBE usuarios;

-- Check user info
SELECT * FROM usuarios WHERE email = 'admin@zyntra.com.br' \G

-- Check permissions tables
SHOW TABLES LIKE '%permiss%';
SHOW TABLES LIKE '%acesso%';
SHOW TABLES LIKE '%module%';
SHOW TABLES LIKE '%role%';
SHOW TABLES LIKE '%cargo%';

SQL
