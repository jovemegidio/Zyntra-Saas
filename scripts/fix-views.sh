#!/bin/bash
MYSQL="mysql -u aluforce -pCHANGE_ME_DB_PASSWORD -h YOUR_VPS_IP aluforce_vendas"

echo "=== Corrigindo views ==="

$MYSQL << 'SQL'

-- View: Estoque crítico (usa alertas_estoque que já tem os alertas)
CREATE OR REPLACE VIEW vw_estoque_critico AS
SELECT 
    ae.id,
    ae.produto_id,
    ae.titulo,
    ae.descricao,
    ae.tipo_alerta,
    ae.status as status_alerta,
    e.quantidade_atual,
    ae.created_at
FROM alertas_estoque ae
LEFT JOIN estoque e ON e.material_id = ae.produto_id
WHERE ae.status = 'ativo'
ORDER BY ae.created_at DESC;

-- View: Pedidos atrasados (sem data_entrega, usar data_prevista)
CREATE OR REPLACE VIEW vw_pedidos_atrasados AS
SELECT 
    p.id,
    p.omie_numero_pedido as numero_pedido,
    p.cliente_nome,
    p.valor as valor_total,
    p.data_prevista as data_entrega,
    DATEDIFF(CURDATE(), p.data_prevista) as dias_atraso,
    p.status,
    p.status_logistica,
    p.prioridade
FROM pedidos p
WHERE p.status NOT IN ('entregue', 'cancelado', 'Entregue', 'Cancelado', 'faturado', 'Faturado')
AND p.data_prevista < CURDATE()
AND p.data_prevista IS NOT NULL
ORDER BY dias_atraso DESC;

-- View: NFes pendentes/rejeitadas
CREATE OR REPLACE VIEW vw_nfe_pendentes AS
SELECT 
    nf.id,
    nf.numero,
    nf.serie,
    nf.cliente_nome,
    nf.valor_total,
    nf.status,
    nf.data_emissao,
    nf.pedido_numero
FROM notas_fiscais nf
WHERE nf.status IN ('rascunho', 'pendente', 'rejeitada')
ORDER BY nf.data_emissao DESC;

SQL

echo "Views corrigidas!"

echo ""
echo "=== Testando ==="
echo "Estoque crítico:"
$MYSQL -N -e "SELECT COUNT(*) FROM vw_estoque_critico;" 2>/dev/null
echo "Pedidos atrasados:"
$MYSQL -N -e "SELECT COUNT(*) FROM vw_pedidos_atrasados;" 2>/dev/null
echo "NFe pendentes:"
$MYSQL -N -e "SELECT COUNT(*) FROM vw_nfe_pendentes;" 2>/dev/null
echo "Aniversariantes hoje:"
$MYSQL -N -e "SELECT COUNT(*) FROM vw_aniversariantes_hoje;" 2>/dev/null
echo "Contas pagar alertar:"
$MYSQL -N -e "SELECT COUNT(*) FROM vw_contas_pagar_alertar;" 2>/dev/null
echo "Contas receber alertar:"
$MYSQL -N -e "SELECT COUNT(*) FROM vw_contas_receber_alertar;" 2>/dev/null
