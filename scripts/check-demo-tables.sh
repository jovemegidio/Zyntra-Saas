#!/bin/bash
MYSQL_CRED="-u aluforce -pAluforce2026VpsDB"
DB="zyntra_demo"

echo "=== Verificando tabelas que precisamos ==="
for t in configuracoes_empresa departamentos usuarios funcionarios clientes fornecedores produtos vendedores pedidos contas_pagar contas_receber categorias_financeiras contas_bancarias ordens_producao whatsapp_config roles modulos permissoes_modulos; do
    EXISTS=$(mysql $MYSQL_CRED -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$DB' AND table_name='$t';" 2>/dev/null)
    if [ "$EXISTS" = "1" ]; then
        COLS=$(mysql $MYSQL_CRED -N -e "SELECT GROUP_CONCAT(COLUMN_NAME) FROM information_schema.columns WHERE table_schema='$DB' AND table_name='$t';" 2>/dev/null)
        echo "  OK: $t -> $COLS"
    else
        echo "  FALTA: $t"
    fi
done
