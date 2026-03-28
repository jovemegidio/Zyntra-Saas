// ============================================================================
// RELATÓRIOS AVANÇADOS - DRE E AGING - Sistema Financeiro Aluforce
// ============================================================================

let tabAtual = 'dre';
let chartDRE = null;
let chartAging = null;

// AUDIT-FIX FRONTEND XSS: HTML escape for user-supplied data in innerHTML
function esc(str) { if (!str) return ''; return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }

// ============================================================================
// INICIALIZAÇÃO
// ============================================================================

document.addEventListener('DOMContentLoaded', function() {
    // Verificar sistema de autenticação
    if (typeof auth !== 'undefined') {
        // Proteger página - verificar permissão de relatórios
        if (!auth.protegerPagina(['relatórios.contas_pagar', 'relatórios.contas_receber'])) {
            return;
        }
    }
    
    inicializar();
});

function inicializar() {
    definirDatasPadrao();
    gerarDRE();
    gerarAging();
}

function definirDatasPadrao() {
    const hoje = new Date();
    document.getElementById('aging-data-base').value = formatarDataInput(hoje);
}

// ============================================================================
// TABS
// ============================================================================

function trocarTab(tab, evt) {
    tabAtual = tab;

    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    if (evt && evt.target) {
        evt.target.classList.add('active');
    }

    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById(`tab-${tab}`).classList.add('active');
}

// ============================================================================
// DRE - DEMONSTRAÇÃO DO RESULTADO
// ============================================================================

async function gerarDRE() {
    const período = document.getElementById('dre-período').value;
    const visao = document.getElementById('dre-visao').value;
    let dataInicio, dataFim;

    if (período === 'personalizado') {
        dataInicio = document.getElementById('dre-data-inicio').value;
        dataFim = document.getElementById('dre-data-fim').value;
    } else {
        const datas = calcularPeriodo(período);
        dataInicio = datas.inicio;
        dataFim = datas.fim;
    }

    try {
        // TODO: Substituir por chamada real à API
        const dados = await buscarDadosDRE(dataInicio, dataFim);

        renderizarDRE(dados, visao);
        renderizarGraficoDRE(dados);
        atualizarTextoPeriodo('dre', dataInicio, dataFim);

    } catch (error) {
        console.error('Erro ao gerar DRE:', error);
        alert('Erro ao gerar relatório');
    }
}

async function buscarDadosDRE(dataInicio, dataFim) {
    const response = await fetch(`/api/financeiro/relatorios/dre?inicio=${dataInicio}&fim=${dataFim}`, {
        credentials: 'include'
    });
    if (!response.ok) throw new Error('Erro ao buscar dados DRE');
    return await response.json();
}

function renderizarDRE(dados, visao) {
    const container = document.getElementById('dre-dados');
    
    // Cálculos
    const receitaBruta = dados.receitas.total;
    const custoTotal = dados.custos.total;
    const lucrobruto = receitaBruta - custoTotal;
    const despesasOperacionais = dados.despesas.total;
    const lucroOperacional = lucrobruto - despesasOperacionais;
    const impostos = dados.impostos.total;
    const lucroLiquido = lucroOperacional - impostos;

    const margemBruta = (lucrobruto / receitaBruta) * 100;
    const margemOperacional = (lucroOperacional / receitaBruta) * 100;
    const margemLiquida = (lucroLiquido / receitaBruta) * 100;

    let html = '';

    // RECEITAS
    html += criarLinhaDRE('RECEITA BRUTA', receitaBruta, 1, 'receita');
    
    if (visao === 'analitico') {
        html += criarLinhaDRE('Receitas Operacionais', dados.receitas.operacionais.total, 2, 'receita');
        html += criarLinhaDRE('Vendas de Produtos', dados.receitas.operacionais.vendas_produtos, 3, 'receita');
        html += criarLinhaDRE('Vendas de Serviços', dados.receitas.operacionais.vendas_servicos, 3, 'receita');
        html += criarLinhaDRE('Outras Receitas', dados.receitas.operacionais.outras_receitas, 3, 'receita');
        
        html += criarLinhaDRE('Receitas Não Operacionais', dados.receitas.nao_operacionais.total, 2, 'receita');
        html += criarLinhaDRE('Receitas Financeiras', dados.receitas.nao_operacionais.receitas_financeiras, 3, 'receita');
    }

    // CUSTOS
    html += criarLinhaDRE('(-) CUSTOS', custoTotal, 1, 'despesa');
    
    if (visao === 'analitico') {
        html += criarLinhaDRE('Custo Produtos Vendidos', dados.custos.cpm, 2, 'despesa');
        html += criarLinhaDRE('Custo Serviços Prestados', dados.custos.cps, 2, 'despesa');
    }

    // LUCRO BRUTO
    html += criarLinhaDRE(
        `LUCRO BRUTO (${margemBruta.toFixed(1)}%)`, 
        lucrobruto, 
        1, 
        lucrobruto >= 0 ? 'receita' : 'despesa',
        lucrobruto >= 0 ? 'lucro-positivo' : 'lucro-negativo'
    );

    // DESPESAS OPERACIONAIS
    html += criarLinhaDRE('(-) DESPESAS OPERACIONAIS', despesasOperacionais, 1, 'despesa');
    
    if (visao === 'analitico') {
        html += criarLinhaDRE('Despesas Administrativas', dados.despesas.administrativas.total, 2, 'despesa');
        html += criarLinhaDRE('Salários', dados.despesas.administrativas.salarios, 3, 'despesa');
        html += criarLinhaDRE('Aluguel', dados.despesas.administrativas.aluguel, 3, 'despesa');
        html += criarLinhaDRE('Energia', dados.despesas.administrativas.energia, 3, 'despesa');
        html += criarLinhaDRE('Telefone', dados.despesas.administrativas.telefone, 3, 'despesa');
        html += criarLinhaDRE('Material de Escritório', dados.despesas.administrativas.material_escritorio, 3, 'despesa');
        
        html += criarLinhaDRE('Despesas Comerciais', dados.despesas.comerciais.total, 2, 'despesa');
        html += criarLinhaDRE('Comissões', dados.despesas.comerciais.comissoes, 3, 'despesa');
        html += criarLinhaDRE('Marketing', dados.despesas.comerciais.marketing, 3, 'despesa');
        html += criarLinhaDRE('Viagens', dados.despesas.comerciais.viagens, 3, 'despesa');
        
        html += criarLinhaDRE('Despesas Financeiras', dados.despesas.financeiras.total, 2, 'despesa');
        html += criarLinhaDRE('Juros', dados.despesas.financeiras.juros, 3, 'despesa');
        html += criarLinhaDRE('Tarifas Bancárias', dados.despesas.financeiras.tarifas_bancarias, 3, 'despesa');
        html += criarLinhaDRE('IOF', dados.despesas.financeiras.iof, 3, 'despesa');
    }

    // LUCRO OPERACIONAL
    html += criarLinhaDRE(
        `LUCRO OPERACIONAL (${margemOperacional.toFixed(1)}%)`, 
        lucroOperacional, 
        1, 
        lucroOperacional >= 0 ? 'receita' : 'despesa',
        lucroOperacional >= 0 ? 'lucro-positivo' : 'lucro-negativo'
    );

    // IMPOSTOS
    html += criarLinhaDRE('(-) IMPOSTOS', impostos, 1, 'despesa');
    
    if (visao === 'analitico') {
        html += criarLinhaDRE('ICMS', dados.impostos.icms, 2, 'despesa');
        html += criarLinhaDRE('ISS', dados.impostos.iss, 2, 'despesa');
        html += criarLinhaDRE('PIS/COFINS', dados.impostos.pis_cofins, 2, 'despesa');
        html += criarLinhaDRE('IR/CSLL', dados.impostos.ir_csll, 2, 'despesa');
    }

    // LUCRO LÍQUIDO
    html += criarLinhaDRE(
        `LUCRO LÍQUIDO (${margemLiquida.toFixed(1)}%)`, 
        lucroLiquido, 
        1, 
        lucroLiquido >= 0 ? 'receita' : 'despesa',
        lucroLiquido >= 0 ? 'lucro-positivo total' : 'lucro-negativo total'
    );

    container.innerHTML = html;
}

function criarLinhaDRE(descrição, valor, nivel, tipoValor, classeExtra = '') {
    return `
        <div class="dre-linha nivel-${nivel} ${classeExtra}">
            <div>${descrição}</div>
            <div class="dre-valor ${tipoValor}">R$ ${formatarMoeda(Math.abs(valor))}</div>
        </div>
    `;
}

function renderizarGraficoDRE(dados) {
    const ctx = document.getElementById('dre-chart');
    
    if (chartDRE) {
        chartDRE.destroy();
    }

    const receitaBruta = dados.receitas.total;
    const custoTotal = dados.custos.total;
    const lucrobruto = receitaBruta - custoTotal;
    const despesasOperacionais = dados.despesas.total;
    const lucroOperacional = lucrobruto - despesasOperacionais;
    const impostos = dados.impostos.total;
    const lucroLiquido = lucroOperacional - impostos;

    chartDRE = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Receita Bruta', 'Lucro Bruto', 'Lucro Operacional', 'Lucro Líquido'],
            datasets: [{
                label: 'Valores (R$)',
                data: [receitaBruta, lucrobruto, lucroOperacional, lucroLiquido],
                backgroundColor: [
                    'rgba(16, 185, 129, 0.8)',
                    'rgba(59, 130, 246, 0.8)',
                    'rgba(245, 158, 11, 0.8)',
                    lucroLiquido >= 0 ? 'rgba(16, 185, 129, 0.8)' : 'rgba(239, 68, 68, 0.8)'
                ],
                borderColor: [
                    'rgb(16, 185, 129)',
                    'rgb(59, 130, 246)',
                    'rgb(245, 158, 11)',
                    lucroLiquido >= 0 ? 'rgb(16, 185, 129)' : 'rgb(239, 68, 68)'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: true,
                    text: 'Evolução do Resultado',
                    font: {
                        size: 16,
                        weight: 'bold'
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return 'R$ ' + formatarMoeda(value);
                        }
                    }
                }
            }
        }
    });
}

// ============================================================================
// AGING - ANÁLISE DE VENCIMENTOS
// ============================================================================

async function gerarAging() {
    const tipo = document.getElementById('aging-tipo').value;
    const dataBase = document.getElementById('aging-data-base').value;
    const entidadeId = document.getElementById('aging-entidade').value;
    const status = document.getElementById('aging-status').value;

    try {
        // TODO: Substituir por chamada real à API
        const dados = await buscarDadosAging(tipo, dataBase, entidadeId, status);

        renderizarResumoAging(dados);
        renderizarTabelaAging(dados);
        renderizarGraficoAging(dados);
        atualizarTextoPeriodo('aging', null, dataBase);

    } catch (error) {
        console.error('Erro ao gerar Aging:', error);
        alert('Erro ao gerar análise');
    }
}

async function buscarDadosAging(tipo, dataBase, entidadeId, status) {
    const params = new URLSearchParams({ tipo, dataBase });
    if (entidadeId) params.append('entidade', entidadeId);
    if (status) params.append('status', status);
    const response = await fetch(`/api/financeiro/relatorios/dre?${params.toString()}&relatorio=aging`, {
        credentials: 'include'
    });
    if (!response.ok) throw new Error('Erro ao buscar dados Aging');
    return await response.json();
}

function renderizarResumoAging(dados) {
    const container = document.getElementById('aging-resumo');

    // Classificar por faixas
    const faixas = {
        vencidoMais60: { valor: 0, qtd: 0, cor: 'vermelho', titulo: 'Vencido > 60 dias' },
        vencido30a60: { valor: 0, qtd: 0, cor: 'vermelho', titulo: 'Vencido 30-60 dias' },
        vencido15a30: { valor: 0, qtd: 0, cor: 'amarelo', titulo: 'Vencido 15-30 dias' },
        vencidoAte15: { valor: 0, qtd: 0, cor: 'amarelo', titulo: 'Vencido até 15 dias' },
        venceAte15: { valor: 0, qtd: 0, cor: 'verde', titulo: 'Vence em 15 dias' },
        vence15a30: { valor: 0, qtd: 0, cor: 'verde', titulo: 'Vence em 15-30 dias' },
        venceMais30: { valor: 0, qtd: 0, cor: 'verde', titulo: 'Vence > 30 dias' }
    };

    dados.itens.forEach(item => {
        const dias = item.dias_atraso;

        if (dias > 60) {
            faixas.vencidoMais60.valor += item.valor;
            faixas.vencidoMais60.qtd++;
        } else if (dias > 30) {
            faixas.vencido30a60.valor += item.valor;
            faixas.vencido30a60.qtd++;
        } else if (dias > 15) {
            faixas.vencido15a30.valor += item.valor;
            faixas.vencido15a30.qtd++;
        } else if (dias > 0) {
            faixas.vencidoAte15.valor += item.valor;
            faixas.vencidoAte15.qtd++;
        } else if (dias >= -15) {
            faixas.venceAte15.valor += item.valor;
            faixas.venceAte15.qtd++;
        } else if (dias >= -30) {
            faixas.vence15a30.valor += item.valor;
            faixas.vence15a30.qtd++;
        } else {
            faixas.venceMais30.valor += item.valor;
            faixas.venceMais30.qtd++;
        }
    });

    container.innerHTML = Object.values(faixas).map(faixa => `
        <div class="aging-card ${faixa.cor}">
            <div class="aging-card-titulo">${faixa.titulo}</div>
            <div class="aging-card-valor">R$ ${formatarMoeda(faixa.valor)}</div>
            <div class="aging-card-qtd">${faixa.qtd} título${faixa.qtd !== 1 ? 's' : ''}</div>
        </div>
    `).join('');
}

function renderizarTabelaAging(dados) {
    const tbody = document.querySelector('#aging-tabela tbody');

    if (dados.itens.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px; color: #999;">Nenhum título encontrado</td></tr>';
        return;
    }

    tbody.innerHTML = dados.itens.map(item => {
        const diasAtraso = item.dias_atraso;
        let statusClasse, statusTexto;

        if (diasAtraso > 0) {
            statusClasse = 'vencido';
            statusTexto = `${diasAtraso} dias atraso`;
        } else if (diasAtraso >= -15) {
            statusClasse = 'a-vencer';
            statusTexto = `Vence em ${Math.abs(diasAtraso)} dias`;
        } else {
            statusClasse = 'em-dia';
            statusTexto = `Vence em ${Math.abs(diasAtraso)} dias`;
        }

        return `
            <tr>
                <td><strong>${esc(item.documento)}</strong></td>
                <td>${esc(item.entidade)}</td>
                <td>${formatarData(item.data_vencimento)}</td>
                <td style="text-align: center;">${Math.abs(diasAtraso)} dias</td>
                <td style="text-align: right;"><strong>R$ ${formatarMoeda(item.valor)}</strong></td>
                <td><span class="aging-status ${statusClasse}">${statusTexto}</span></td>
            </tr>
        `;
    }).join('');
}

function renderizarGraficoAging(dados) {
    const ctx = document.getElementById('aging-chart');
    
    if (chartAging) {
        chartAging.destroy();
    }

    // Agrupar por faixas
    const faixas = ['> 60d Vencido', '30-60d Vencido', '15-30d Vencido', '< 15d Vencido', '< 15d A Vencer', '15-30d A Vencer', '> 30d A Vencer'];
    const valores = [0, 0, 0, 0, 0, 0, 0];
    const cores = [
        'rgba(239, 68, 68, 0.8)',
        'rgba(239, 68, 68, 0.6)',
        'rgba(245, 158, 11, 0.8)',
        'rgba(245, 158, 11, 0.6)',
        'rgba(16, 185, 129, 0.6)',
        'rgba(16, 185, 129, 0.8)',
        'rgba(16, 185, 129, 1)'
    ];

    dados.itens.forEach(item => {
        const dias = item.dias_atraso;

        if (dias > 60) valores[0] += item.valor;
        else if (dias > 30) valores[1] += item.valor;
        else if (dias > 15) valores[2] += item.valor;
        else if (dias > 0) valores[3] += item.valor;
        else if (dias >= -15) valores[4] += item.valor;
        else if (dias >= -30) valores[5] += item.valor;
        else valores[6] += item.valor;
    });

    chartAging = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: faixas,
            datasets: [{
                label: 'Valor (R$)',
                data: valores,
                backgroundColor: cores,
                borderColor: cores.map(c => c.replace('0.8', '1').replace('0.6', '1')),
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: true,
                    text: 'Distribuição por Faixa de Vencimento',
                    font: {
                        size: 16,
                        weight: 'bold'
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return 'R$ ' + formatarMoeda(value);
                        }
                    }
                }
            }
        }
    });
}

// ============================================================================
// UTILITÁRIOS
// ============================================================================

function atualizarDatasPersonalizadas(tipo) {
    const select = document.getElementById(`${tipo}-período`);
    const grupoInicio = document.getElementById(`${tipo}-data-inicio-group`);
    const grupoFim = document.getElementById(`${tipo}-data-fim-group`);

    if (select.value === 'personalizado') {
        grupoInicio.style.display = 'block';
        grupoFim.style.display = 'block';
    } else {
        grupoInicio.style.display = 'none';
        grupoFim.style.display = 'none';
    }
}

function calcularPeriodo(período) {
    const hoje = new Date();
    let inicio, fim;

    switch (período) {
        case 'mes-atual':
            inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
            fim = hoje;
            break;
        case 'mes-anterior':
            inicio = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
            fim = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
            break;
        case 'trimestre':
            const mesAtual = hoje.getMonth();
            const inicioTrimestre = Math.floor(mesAtual / 3) * 3;
            inicio = new Date(hoje.getFullYear(), inicioTrimestre, 1);
            fim = hoje;
            break;
        case 'ano':
            inicio = new Date(hoje.getFullYear(), 0, 1);
            fim = hoje;
            break;
        default:
            inicio = hoje;
            fim = hoje;
    }

    return {
        inicio: formatarDataInput(inicio),
        fim: formatarDataInput(fim)
    };
}

function atualizarTextoPeriodo(tipo, dataInicio, dataFim) {
    let texto = '';

    if (tipo === 'dre') {
        texto = `Período: ${formatarData(dataInicio)} a ${formatarData(dataFim)}`;
    } else {
        texto = `Data Base: ${formatarData(dataFim)}`;
    }

    document.getElementById(`${tipo}-período-texto`).textContent = texto;
}

function calcularData(data, dias) {
    const nova = new Date(data);
    nova.setDate(nova.getDate() + dias);
    return formatarDataInput(nova);
}

function formatarMoeda(valor) {
    return new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(valor || 0);
}

function formatarData(data) {
    if (!data) return '-';
    const d = new Date(data + 'T00:00:00');
    return d.toLocaleDateString('pt-BR');
}

function formatarDataInput(data) {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
}

// ============================================================================
// EXPORTAÇÃO
// ============================================================================

function exportarDRE(formato) {
    alert(`Exportação ${formato.toUpperCase()} em desenvolvimento`);
    // TODO: Implementar exportação real
}

function exportarAging(formato) {
    alert(`Exportação ${formato.toUpperCase()} em desenvolvimento`);
    // TODO: Implementar exportação real
}
