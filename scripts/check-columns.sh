#!/bin/bash
MYSQL_CRED="-u aluforce -pCHANGE_ME_DB_PASSWORD"
DB="zyntra_demo"

echo "=== PEDIDOS ==="
mysql $MYSQL_CRED -N -e "SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT FROM information_schema.columns WHERE table_schema='$DB' AND table_name='pedidos' ORDER BY ordinal_position;" 2>/dev/null

echo ""
echo "=== CLIENTES ==="
mysql $MYSQL_CRED -N -e "SELECT COLUMN_NAME, DATA_TYPE FROM information_schema.columns WHERE table_schema='$DB' AND table_name='clientes' AND COLUMN_NAME IN ('ativo','status','tipo_pessoa','numero') ORDER BY ordinal_position;" 2>/dev/null

echo ""
echo "=== CONTAS_PAGAR ==="
mysql $MYSQL_CRED -N -e "SELECT COLUMN_NAME, DATA_TYPE FROM information_schema.columns WHERE table_schema='$DB' AND table_name='contas_pagar' AND COLUMN_NAME IN ('fornecedor_id','fornecedor_nome','categoria','categoria_id','categoria_nome') ORDER BY ordinal_position;" 2>/dev/null

echo ""
echo "=== CONTAS_RECEBER ==="
mysql $MYSQL_CRED -N -e "SELECT COLUMN_NAME, DATA_TYPE FROM information_schema.columns WHERE table_schema='$DB' AND table_name='contas_receber' AND COLUMN_NAME IN ('cliente_id','cliente_nome','data_pagamento','data_recebimento') ORDER BY ordinal_position;" 2>/dev/null

echo ""
echo "=== CATEGORIAS_FINANCEIRAS ==="
mysql $MYSQL_CRED -N -e "SELECT COLUMN_NAME, DATA_TYPE FROM information_schema.columns WHERE table_schema='$DB' AND table_name='categorias_financeiras' AND COLUMN_NAME IN ('ativo','tipo') ORDER BY ordinal_position;" 2>/dev/null

echo ""
echo "=== CONTAS_BANCARIAS ==="
mysql $MYSQL_CRED -N -e "SELECT COLUMN_NAME, DATA_TYPE FROM information_schema.columns WHERE table_schema='$DB' AND table_name='contas_bancarias' AND COLUMN_NAME IN ('ativo','ativa','status','saldo','saldo_atual','saldo_inicial') ORDER BY ordinal_position;" 2>/dev/null

echo ""
echo "=== ORDENS_PRODUCAO ==="
mysql $MYSQL_CRED -N -e "SELECT COLUMN_NAME, DATA_TYPE FROM information_schema.columns WHERE table_schema='$DB' AND table_name='ordens_producao' AND COLUMN_NAME IN ('numero','numero_pedido','numero_orcamento','produto_id','produto_nome','pedido_id','data_inicio','data_previsao','data_previsao_entrega','data_prevista') ORDER BY ordinal_position;" 2>/dev/null
