/**
 * PCP MODALS - Sistema de Modais Compartilhados
 * Contém todos os modais e funções para Estoque, Materiais e Ordens de Compra
 * Versão: 1.0.0
 * Data: 2026-02-03
 */

// ============================================
// VARIÁVEIS GLOBAIS
// ============================================
let currentModalProduct = null;
let currentModalMaterial = null;
let currentModalOC = null;
let confirmacaoResolve = null;

// ============================================
// FUNÇÕES UTILITÁRIAS
// ============================================
function getAPIBase() {
    if (typeof window.API_BASE !== 'undefined') return window.API_BASE;
    return window.location.origin;
}

function showNotification(message, type = 'info') {
    if (typeof window.showToast === 'function') {
        window.showToast(message, type);
    } else if (typeof window.showNotification === 'function') {
        window.showNotification(message, type);
    } else {
        console.log(`[${type.toUpperCase()}] ${message}`);
        alert(message);
    }
}

function formatarMoeda(valor) {
    const num = parseFloat(valor) || 0;
    return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// ============================================
// SISTEMA DE CONFIRMAÇÃO PROFISSIONAL
// ============================================
function mostrarConfirmacaoPCP(titulo, mensagem, tipo = 'warning') {
    return new Promise((resolve) => {
        confirmacaoResolve = resolve;

        const modal = document.getElementById('modal-confirmacao-pcp');
        if (!modal) {
            resolve(confirm(mensagem));
            return;
        }

        const icon = document.getElementById('confirmacao-icon');
        const tituloEl = document.getElementById('confirmacao-titulo');
        const mensagemEl = document.getElementById('confirmacao-mensagem');
        const btnConfirmar = document.getElementById('confirmacao-btn-confirmar');

        // Configurar ícone e cores baseado no tipo
        const configs = {
            warning: { icon: 'fa-exclamation-triangle', bg: '#fef3c7', color: '#f59e0b', btnBg: 'linear-gradient(135deg, #f97316, #ea580c)' },
            danger: { icon: 'fa-trash-alt', bg: '#fee2e2', color: '#ef4444', btnBg: 'linear-gradient(135deg, #ef4444, #dc2626)' },
            info: { icon: 'fa-info-circle', bg: '#dbeafe', color: '#3b82f6', btnBg: 'linear-gradient(135deg, #3b82f6, #2563eb)' },
            success: { icon: 'fa-check-circle', bg: '#dcfce7', color: '#22c55e', btnBg: 'linear-gradient(135deg, #22c55e, #16a34a)' }
        };

        const config = configs[tipo] || configs.warning;

        if (icon) {
            icon.style.background = config.bg;
            icon.innerHTML = `<i class="fas ${config.icon}" style="font-size: 28px; color: ${config.color};"></i>`;
        }
        if (tituloEl) tituloEl.textContent = titulo;
        if (mensagemEl) mensagemEl.textContent = mensagem;
        if (btnConfirmar) btnConfirmar.style.background = config.btnBg;

        modal.style.display = 'flex';
    });
}

function fecharConfirmacaoPCP(resultado) {
    const modal = document.getElementById('modal-confirmacao-pcp');
    if (modal) modal.style.display = 'none';
    if (confirmacaoResolve) {
        confirmacaoResolve(resultado);
        confirmacaoResolve = null;
    }
}

// ============================================
// MODAL DE ALERTA PROFISSIONAL
// ============================================
function mostrarAlertaPCP(titulo, mensagem, tipo = 'info') {
    const modal = document.getElementById('modal-alerta-pcp');
    if (!modal) {
        alert(mensagem);
        return;
    }

    const configs = {
        warning: { icon: 'fa-exclamation-triangle', bg: 'linear-gradient(135deg, #fef3c7, #fde68a)', color: '#f59e0b' },
        danger: { icon: 'fa-times-circle', bg: 'linear-gradient(135deg, #fee2e2, #fecaca)', color: '#ef4444' },
        info: { icon: 'fa-info-circle', bg: 'linear-gradient(135deg, #dbeafe, #bfdbfe)', color: '#3b82f6' },
        success: { icon: 'fa-check-circle', bg: 'linear-gradient(135deg, #dcfce7, #bbf7d0)', color: '#22c55e' },
        error: { icon: 'fa-times-circle', bg: 'linear-gradient(135deg, #fee2e2, #fecaca)', color: '#ef4444' }
    };

    const config = configs[tipo] || configs.info;

    const iconContainer = document.getElementById('alerta-icon-container');
    const iconEl = document.getElementById('alerta-icon');
    const tituloEl = document.getElementById('alerta-titulo');
    const mensagemEl = document.getElementById('alerta-mensagem');

    if (iconContainer) iconContainer.style.background = config.bg;
    if (iconEl) {
        iconEl.className = `fas ${config.icon}`;
        iconEl.style.color = config.color;
    }
    if (tituloEl) tituloEl.textContent = titulo;
    if (mensagemEl) mensagemEl.textContent = mensagem;

    modal.style.display = 'flex';
}

function fecharAlertaPCP() {
    const modal = document.getElementById('modal-alerta-pcp');
    if (modal) modal.style.display = 'none';
}

// ============================================
// MODAL GENÉRICO - ABRIR/FECHAR
// ============================================
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('active');
    }
}

function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('active');
    }
}

// ============================================
// MODAL DE PRODUTO - FUNÇÕES
// ============================================
function abrirNovoProduto() {
    limparFormProdutoPCP(true);
    const titulo = document.getElementById('modal-novo-produto-titulo');
    if (titulo) titulo.textContent = 'Incluir Produto';
    const idField = document.getElementById('pcp-produto-id');
    if (idField) idField.value = '';
    showModal('modal-novo-produto');
}

// Variável global para produto atual
let produtoAtualPCP = null;

async function verProduto(produtoId) {
    try {
        const API_BASE = getAPIBase();
        const response = await fetch(`${API_BASE}/api/pcp/produtos/${produtoId}`, { credentials: 'include' });
        if (!response.ok) throw new Error('Produto não encontrado');

        const produto = await response.json();
        produtoAtualPCP = produto;

        // Preencher modal de visualização
        const setTxt = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val || '-'; };
        const estoque = produto.estoque_atual ?? produto.estoque ?? 0;
        const minimo = produto.estoque_minimo || 10;
        const unidade = produto.unidade || produto.unidade_medida || 'UN';
        const unidadeAbrev = unidade.toUpperCase().replace('METRO', 'M').replace('UNIDADE', 'UN').replace('QUILOGRAMA', 'KG').replace('LITRO', 'L');

        // Função auxiliar para formatar com unidade
        const fmtUn = (val) => {
            const num = parseFloat(val) || 0;
            return num.toLocaleString('pt-BR') + ' (' + unidadeAbrev.toLowerCase() + ')';
        };

        // Header
        setTxt('view-produto-nome', produto.nome || produto.descricao || 'Produto');
        setTxt('view-produto-codigo', produto.codigo || '-');
        setTxt('view-produto-sku', produto.sku || '-');
        setTxt('view-produto-unidade', unidadeAbrev);

        // Status badge
        const statusBadge = document.getElementById('view-produto-status');
        if (statusBadge) {
            if (estoque <= 0) {
                statusBadge.innerHTML = '<i class="fas fa-circle" style="font-size:6px"></i> Sem Estoque';
                statusBadge.style.background = 'rgba(239, 68, 68, 0.2)';
                statusBadge.style.color = '#fca5a5';
            } else if (estoque < minimo) {
                statusBadge.innerHTML = '<i class="fas fa-circle" style="font-size:6px"></i> Estoque Baixo';
                statusBadge.style.background = 'rgba(245, 158, 11, 0.2)';
                statusBadge.style.color = '#fcd34d';
            } else {
                statusBadge.innerHTML = '<i class="fas fa-circle" style="font-size:6px"></i> Em Estoque';
                statusBadge.style.background = 'rgba(255,255,255,0.2)';
                statusBadge.style.color = 'white';
            }
        }

        // Estoque cards com unidade
        setTxt('view-estoque-atual', fmtUn(estoque));
        setTxt('view-estoque-minimo', fmtUn(minimo));
        setTxt('view-estoque-maximo', fmtUn(produto.estoque_maximo || 1000));
        setTxt('view-estoque-reservado', fmtUn(produto.estoque_reservado || 0));

        // Informações Gerais
        setTxt('view-categoria', produto.categoria || produto.familia || '-');
        setTxt('view-unidade', unidadeAbrev);
        setTxt('view-ncm', produto.ncm || '-');
        setTxt('view-peso', (produto.peso || 0) + ' kg');
        setTxt('view-marca', produto.marca || 'Aluforce');

        // Localização
        setTxt('view-almoxarifado', produto.almoxarifado || 'Principal');
        setTxt('view-corredor', produto.corredor || '-');
        setTxt('view-prateleira', produto.prateleira || '-');
        setTxt('view-posicao', produto.posicao || '-');

        // Preços
        const preco = produto.preco_venda || produto.preco || 0;
        const custoMedio = produto.custo_medio || produto.custo_unitario || produto.preco_custo || preco * 0.7 || 0;
        const valorEstoque = custoMedio * estoque;
        const margem = preco > 0 ? ((preco - custoMedio) / preco * 100) : 0;

        const fmtBRL = (v) => parseFloat(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        setTxt('view-preco', fmtBRL(preco));
        setTxt('view-preco-resumo', fmtBRL(preco));
        setTxt('view-custo-medio', fmtBRL(custoMedio));
        setTxt('view-margem', margem.toFixed(1) + '%');
        setTxt('view-valor-estoque', fmtBRL(valorEstoque));

        // Aba Custos
        setTxt('view-custo-preco-venda', fmtBRL(preco));
        setTxt('view-custo-cmc', fmtBRL(custoMedio));
        setTxt('view-custo-ultimo', fmtBRL(produto.ultimo_custo || custoMedio));
        setTxt('view-custo-margem', margem.toFixed(1) + '%');
        setTxt('view-custo-valor-total', fmtBRL(valorEstoque));
        setTxt('view-custo-qtd-total', fmtUn(estoque));

        // Aba Informações
        setTxt('view-info-codigo', produto.codigo || '-');
        setTxt('view-info-sku', produto.sku || '-');
        setTxt('view-info-ean', produto.gtin || produto.ean || '-');
        setTxt('view-info-marca', produto.marca || 'Aluforce');
        setTxt('view-info-cor', produto.cor || '-');
        setTxt('view-info-ncm', produto.ncm || '-');
        setTxt('view-info-cest', produto.cest || '-');
        setTxt('view-info-cfop', produto.cfop_saida_interna || '-');
        setTxt('view-info-origem', produto.origem || '-');
        setTxt('view-info-peso-bruto', (produto.peso_bruto || produto.peso || 0) + ' kg');
        setTxt('view-info-peso-liq', (produto.peso_liquido || 0) + ' kg');

        // Aba Estoque - tabela
        const tabelaBody = document.getElementById('view-tabela-estoque-body');
        if (tabelaBody) {
            const dispEl = document.getElementById('view-estoque-disp-principal');
            if (dispEl) dispEl.textContent = fmtUn(estoque);
            const minEl = document.getElementById('view-estoque-min-principal');
            if (minEl) minEl.textContent = fmtUn(minimo);
            const maxEl = document.getElementById('view-estoque-max-principal');
            if (maxEl) maxEl.textContent = fmtUn(produto.estoque_maximo || 1000);
        }

        // Observações
        const obsEl = document.getElementById('view-observacoes');
        if (obsEl) {
            obsEl.textContent = (produto.observacoes && produto.observacoes.trim()) ? produto.observacoes : 'Nenhuma observação registrada.';
        }

        // Footer
        setTxt('view-criado-em', produto.created_at ? new Date(produto.created_at).toLocaleDateString('pt-BR') : '-');
        setTxt('view-atualizado-em', produto.updated_at ? new Date(produto.updated_at).toLocaleDateString('pt-BR') : '-');

        // Abrir modal de visualização - resetar para aba Resumo
        const modalView = document.getElementById('modal-visualizar-produto');
        if (modalView) {
            // Mostrar aba resumo por padrão
            mudarAbaFichaProduto('resumo', document.querySelector('.ficha-tab'));

            modalView.classList.add('active');
            // Carregar histórico de movimentações
            carregarHistoricoProdutoView(produtoId);
        } else {
            console.error('Modal modal-visualizar-produto não encontrado');
            // Fallback para modal antigo
            editarProdutoForm(produtoId);
        }

    } catch (error) {
        console.error('Erro ao carregar produto:', error);
        showNotification('Erro ao carregar dados do produto', 'error');
    }
}

// ===== FUNÇÕES DO HISTÓRICO =====

let historicoExpandidoPCP = true;

function toggleHistorico() {
    historicoExpandidoPCP = !historicoExpandidoPCP;
    const content = document.getElementById('view-history-content');
    const btn = document.querySelector('.view-history-toggle');

    if (content) {
        if (historicoExpandidoPCP) {
            content.classList.remove('collapsed');
            if (btn) btn.classList.remove('collapsed');
        } else {
            content.classList.add('collapsed');
            if (btn) btn.classList.add('collapsed');
        }
    }
}

async function carregarHistoricoProdutoView(produtoId) {
    const container = document.getElementById('view-historico-lista');
    const loading = document.getElementById('history-loading');
    const empty = document.getElementById('history-empty');

    if (!container || !loading || !empty) return;

    loading.style.display = 'flex';
    empty.style.display = 'none';
    container.innerHTML = '';

    try {
        const API_BASE = getAPIBase();
        const response = await fetch(`${API_BASE}/api/pcp/estoque/movimentacoes?produto_id=${produtoId}&limit=20`, {
            credentials: 'include'
        });

        loading.style.display = 'none';

        if (response.ok) {
            const data = await response.json();
            const movs = data.rows || data.movimentacoes || data || [];

            if (movs.length === 0) {
                empty.style.display = 'flex';
                return;
            }

            container.innerHTML = movs.map(m => {
                const tipo = (m.tipo || 'ajuste').toLowerCase();
                const isEntrada = tipo === 'entrada';
                const isSaida = tipo === 'saida';
                const icone = isEntrada ? 'arrow-up' : isSaida ? 'arrow-down' : 'sliders-h';
                const tipoClass = isEntrada ? 'entrada' : isSaida ? 'saida' : 'ajuste';
                const qtyClass = isEntrada ? 'positive' : isSaida ? 'negative' : 'neutral';
                const qtyPrefix = isEntrada ? '+' : isSaida ? '-' : '';
                const dataVal = m.data_movimentacao || m.created_at || m.criado_em;
                const dataFormatada = dataVal ? new Date(dataVal).toLocaleDateString('pt-BR', {
                    day: '2-digit', month: '2-digit', year: '2-digit',
                    hour: '2-digit', minute: '2-digit'
                }) : '-';

                return `
                    <div class="history-item">
                        <div class="history-icon ${tipoClass}">
                            <i class="fas fa-${icone}"></i>
                        </div>
                        <div class="history-info">
                            <div class="history-title">${tipo.charAt(0).toUpperCase() + tipo.slice(1)}</div>
                            <div class="history-desc">${m.observacao || m.motivo || m.referencia || 'Movimentação registrada'}</div>
                        </div>
                        <div class="history-meta">
                            <div class="history-qty ${qtyClass}">${qtyPrefix}${m.quantidade || 0}</div>
                            <div class="history-date">${dataFormatada}</div>
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            empty.style.display = 'flex';
            empty.innerHTML = '<i class="fas fa-exclamation-triangle"></i><span>Erro ao carregar histórico</span>';
        }
    } catch (error) {
        console.error('Erro ao carregar histórico:', error);
        loading.style.display = 'none';
        empty.style.display = 'flex';
        empty.innerHTML = '<i class="fas fa-exclamation-triangle"></i><span>Erro ao carregar histórico</span>';
    }
}

function fecharModalVisualizacao() {
    const modal = document.getElementById('modal-visualizar-produto');
    if (modal) modal.classList.remove('active');
}

function abrirEdicaoProduto() {
    fecharModalVisualizacao();
    if (produtoAtualPCP) {
        editarProduto(produtoAtualPCP.id);
    }
}

async function editarProduto(produtoId) {
    // Delegar para editarProdutoForm que tem toda a lógica correta
    if (typeof editarProdutoForm === 'function') {
        return editarProdutoForm(produtoId);
    }
}

function fecharModalEdicao() {
    if (typeof hideModal === 'function') {
        hideModal('modal-novo-produto');
    } else {
        const modal = document.getElementById('modal-novo-produto');
        if (modal) modal.classList.remove('active');
    }
}

async function salvarEdicaoProduto() {
    const id = document.getElementById('edit-prod-id')?.value;
    if (!id) {
        showNotification('ID do produto não encontrado', 'error');
        return;
    }

    const dados = {
        categoria: document.getElementById('edit-prod-categoria')?.value,
        nome: document.getElementById('edit-prod-nome')?.value,
        descricao: document.getElementById('edit-prod-nome')?.value,
        preco: parseFloat(document.getElementById('edit-prod-preco')?.value) || 0,
        peso: parseFloat(document.getElementById('edit-prod-peso')?.value) || 0,
        unidade: document.getElementById('edit-prod-unidade')?.value,
        ncm: document.getElementById('edit-prod-ncm')?.value,
        estoque_minimo: parseInt(document.getElementById('edit-prod-estoque-min')?.value) || 10,
        estoque_maximo: parseInt(document.getElementById('edit-prod-estoque-max')?.value) || 1000,
        ponto_reposicao: parseInt(document.getElementById('edit-prod-ponto-reposicao')?.value) || 50,
        almoxarifado: document.getElementById('edit-prod-almoxarifado')?.value,
        corredor: document.getElementById('edit-prod-corredor')?.value,
        prateleira: document.getElementById('edit-prod-prateleira')?.value,
        posicao: document.getElementById('edit-prod-posicao')?.value,
        observacoes: document.getElementById('edit-prod-observacoes')?.value
    };

    try {
        const API_BASE = getAPIBase();
        const response = await fetch(`${API_BASE}/api/pcp/produtos/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(dados)
        });

        if (response.ok) {
            showNotification('Produto atualizado com sucesso!', 'success');
            fecharModalEdicao();
            if (typeof carregarProdutos === 'function') carregarProdutos();
            if (typeof buscarProdutos === 'function') buscarProdutos();
        } else {
            const err = await response.json();
            showNotification(err.error || 'Erro ao salvar produto', 'error');
        }
    } catch (error) {
        console.error('Erro ao salvar:', error);
        showNotification('Erro ao salvar produto', 'error');
    }
}

// Funções auxiliares do modal de visualização
function registrarEntradaView() {
    fecharModalVisualizacao();
    if (produtoAtualPCP && typeof abrirModalMovimentacao === 'function') {
        abrirModalMovimentacao('entrada', produtoAtualPCP);
    }
}

function registrarSaidaView() {
    fecharModalVisualizacao();
    if (produtoAtualPCP && typeof abrirModalMovimentacao === 'function') {
        abrirModalMovimentacao('saida', produtoAtualPCP);
    }
}

function imprimirEtiquetaView() {
    if (!produtoAtualPCP) {
        showNotification('Nenhum produto selecionado', 'warning');
        return;
    }

    const p = produtoAtualPCP;
    const codigo = p.codigo || p.sku || '-';
    const nome = p.nome || p.descricao || 'Produto';
    const unidade = (p.unidade_medida || p.unidade || 'UN').toUpperCase();
    const precoNum = parseFloat(p.preco_venda || p.preco || 0);
    const preco = precoNum.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const custoNum = parseFloat(p.custo_unitario || p.preco_custo || 0);
    const custo = custoNum.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const ean = p.gtin || p.ean || '';
    const marca = p.marca || 'Aluforce';
    const sku = p.sku || '';
    const ncm = p.ncm || '';
    const categoria = p.categoria || p.familia || '';
    const cor = p.cor || '';
    const pesoB = parseFloat(p.peso_bruto || p.peso || 0);
    const pesoL = parseFloat(p.peso_liquido || 0);
    const estoqueAtual = parseFloat(p.estoque_atual || p.quantidade_estoque || 0);
    const estoqueMin = parseFloat(p.estoque_minimo || 0);
    const fornecedor = p.fornecedor_principal || p.fornecedor || '';
    const material = p.material || '';
    const norma = p.norma || '';
    const tensao = p.tensao || '';
    const secao = p.secao || '';
    const almoxarifado = p.almoxarifado || p.localizacao_almoxarifado || 'Principal';
    const corredor = p.corredor || p.localizacao_corredor || '-';
    const prateleira = p.prateleira || p.localizacao_prateleira || '-';
    const posicao = p.posicao || p.localizacao_posicao || '-';
    const unidadeExtenso = unidade === 'M' ? 'metro' : unidade === 'KG' ? 'quilo' : unidade === 'UN' ? 'unidade' : unidade === 'PC' || unidade === 'PÇ' ? 'peça' : unidade.toLowerCase();
    const qrStr = codigo + '|' + ean + '|' + almoxarifado + '|C' + corredor + '|P' + prateleira + '|' + posicao;
    const locParts = [almoxarifado];
    if (corredor !== '-') locParts.push('C' + corredor);
    if (prateleira !== '-') locParts.push('P' + prateleira);
    if (posicao !== '-') locParts.push(posicao);
    const locStr = locParts.join(' › ');

    const etiquetaHTML = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <title>Etiqueta - ${codigo}</title>
            <script src="https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js"><\/script>
            <style>
                @page { size: 100mm 70mm; margin: 0; }
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: 'Segoe UI', Arial, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #f0f2f5; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                .etiqueta {
                    width: 100mm; height: 70mm; background: white; border: 1.5px solid #c7c7c7;
                    border-radius: 6px; display: flex; flex-direction: column; overflow: hidden;
                    page-break-after: always; box-shadow: 0 2px 8px rgba(0,0,0,0.08);
                }
                /* ── Top bar ── */
                .etq-top-bar {
                    display: flex; align-items: center; justify-content: space-between;
                    background: #1e293b; color: #fff; padding: 2mm 3.5mm; min-height: 9mm;
                }
                .etq-logo-area { display: flex; align-items: center; gap: 2mm; }
                .etq-logo { height: 5.5mm; object-fit: contain; }
                .etq-codigo-pill {
                    background: rgba(255,255,255,0.18); padding: 1mm 3mm; border-radius: 3px;
                    font-size: 7.5pt; font-weight: 700; letter-spacing: 0.4px;
                }
                /* ── Body ── */
                .etq-body { flex: 1; display: flex; flex-direction: column; padding: 2.5mm 3.5mm 2mm 3.5mm; gap: 1.5mm; }
                .etq-nome { font-size: 9pt; font-weight: 700; color: #0f172a; line-height: 1.25; max-height: 9mm; overflow: hidden; }
                /* ── Info grid ── */
                .etq-info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.8mm 3mm; }
                .etq-info-item { display: flex; align-items: baseline; gap: 1mm; }
                .etq-info-label { font-size: 5.5pt; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.3px; white-space: nowrap; font-weight: 600; }
                .etq-info-value { font-size: 6.5pt; color: #1e293b; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
                /* ── Chips row ── */
                .etq-chips { display: flex; gap: 1.5mm; flex-wrap: wrap; }
                .etq-chip {
                    background: #f1f5f9; border: 0.5px solid #e2e8f0; padding: 0.5mm 2mm; border-radius: 2px;
                    font-size: 5.5pt; font-weight: 600; color: #475569; white-space: nowrap;
                }
                .etq-chip-accent { background: #dbeafe; border-color: #93c5fd; color: #1d4ed8; }
                /* ── Separator ── */
                .etq-sep { border: none; border-top: 1px dashed #e2e8f0; margin: 0.5mm 0; }
                /* ── Footer ── */
                .etq-footer { display: flex; justify-content: space-between; align-items: flex-end; margin-top: auto; }
                .etq-qr-area { display: flex; align-items: flex-end; gap: 2.5mm; }
                .etq-qr-box {
                    width: 14mm; height: 14mm; border: 1px solid #e5e7eb; border-radius: 2px;
                    display: flex; align-items: center; justify-content: center; overflow: hidden; flex-shrink: 0;
                }
                .etq-qr-box img { width: 13mm; height: 13mm; }
                .etq-loc-block { font-size: 5.5pt; color: #64748b; line-height: 1.5; }
                .etq-loc-block strong { color: #334155; }
                .etq-loc-icon { font-size: 5pt; margin-right: 0.5mm; }
                .etq-estoque-badge {
                    display: inline-block; padding: 0.4mm 1.5mm; border-radius: 2px;
                    font-size: 5.5pt; font-weight: 700; margin-top: 0.5mm;
                }
                .etq-estoque-ok { background: #dcfce7; color: #166534; }
                .etq-estoque-low { background: #fef3c7; color: #92400e; }
                .etq-estoque-out { background: #fee2e2; color: #991b1b; }
                /* ── Price block ── */
                .etq-price-block { text-align: right; min-width: 26mm; flex-shrink: 0; }
                .etq-price-label { font-size: 5pt; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.4px; }
                .etq-price-value { font-size: 14pt; font-weight: 900; color: #0f172a; letter-spacing: -0.3px; line-height: 1; }
                .etq-price-unit { font-size: 5.5pt; color: #64748b; margin-top: 0.3mm; }
                .etq-custo-line { font-size: 5pt; color: #94a3b8; margin-top: 0.8mm; }
                @media print {
                    body { background: white; min-height: auto; }
                    .etiqueta { border: none; box-shadow: none; }
                    .no-print { display: none !important; }
                }
            </style>
        </head>
        <body>
            <div class="etiqueta">
                <!-- Top Bar -->
                <div class="etq-top-bar">
                    <div class="etq-logo-area">
                        <img class="etq-logo" src="/images/Logo Monocromatico - Branco - Aluforce.png" alt="ALUFORCE" onerror="this.outerHTML='<span style=\\'font-size:8pt;font-weight:800;letter-spacing:1.5px\\'>ALUFORCE</span>'">
                    </div>
                    <span class="etq-codigo-pill">${codigo}</span>
                </div>

                <div class="etq-body">
                    <!-- Product name -->
                    <div class="etq-nome">${nome}</div>

                    <!-- Info Grid -->
                    <div class="etq-info-grid">
                        ${ean ? '<div class="etq-info-item"><span class="etq-info-label">EAN</span><span class="etq-info-value">' + ean + '</span></div>' : ''}
                        ${sku ? '<div class="etq-info-item"><span class="etq-info-label">SKU</span><span class="etq-info-value">' + sku + '</span></div>' : ''}
                        ${ncm ? '<div class="etq-info-item"><span class="etq-info-label">NCM</span><span class="etq-info-value">' + ncm + '</span></div>' : ''}
                        <div class="etq-info-item"><span class="etq-info-label">Marca</span><span class="etq-info-value">${marca}</span></div>
                        ${cor ? '<div class="etq-info-item"><span class="etq-info-label">Cor</span><span class="etq-info-value">' + cor + '</span></div>' : ''}
                        ${pesoB > 0 ? '<div class="etq-info-item"><span class="etq-info-label">Peso</span><span class="etq-info-value">' + pesoB.toLocaleString('pt-BR') + ' kg</span></div>' : ''}
                        ${fornecedor ? '<div class="etq-info-item"><span class="etq-info-label">Fornec.</span><span class="etq-info-value">' + fornecedor + '</span></div>' : ''}
                        ${norma ? '<div class="etq-info-item"><span class="etq-info-label">Norma</span><span class="etq-info-value">' + norma + '</span></div>' : ''}
                    </div>

                    <!-- Chips -->
                    <div class="etq-chips">
                        <span class="etq-chip etq-chip-accent">${unidade}</span>
                        ${categoria ? '<span class="etq-chip">' + categoria + '</span>' : ''}
                        ${material ? '<span class="etq-chip">' + material + '</span>' : ''}
                        ${tensao ? '<span class="etq-chip">' + tensao + '</span>' : ''}
                        ${secao ? '<span class="etq-chip">' + secao + '</span>' : ''}
                    </div>

                    <hr class="etq-sep">

                    <!-- Footer -->
                    <div class="etq-footer">
                        <div class="etq-qr-area">
                            <div class="etq-qr-box"><div id="etq-qr"></div></div>
                            <div class="etq-loc-block">
                                <div><span class="etq-loc-icon">📍</span><strong>${locStr}</strong></div>
                                <div class="etq-estoque-badge ${estoqueAtual <= 0 ? 'etq-estoque-out' : estoqueAtual < estoqueMin ? 'etq-estoque-low' : 'etq-estoque-ok'}">
                                    Est: ${estoqueAtual.toLocaleString('pt-BR')} ${unidade.toLowerCase()}
                                </div>
                            </div>
                        </div>
                        <div class="etq-price-block">
                            <div class="etq-price-label">Preço / ${unidadeExtenso}</div>
                            <div class="etq-price-value">${preco}</div>
                            <div class="etq-price-unit">por ${unidadeExtenso}</div>
                            ${custoNum > 0 ? '<div class="etq-custo-line">Custo: ' + custo + '</div>' : ''}
                        </div>
                    </div>
                </div>
            </div>
            <button class="no-print" onclick="window.print()" style="position:fixed; bottom:20px; right:20px; padding:12px 24px; background:#1e293b; color:white; border:none; border-radius:8px; font-size:14px; font-weight:600; cursor:pointer; box-shadow:0 4px 12px rgba(30,41,59,0.4);">
                🖨️ Imprimir Etiqueta
            </button>
            <script>
                document.addEventListener('DOMContentLoaded', function() {
                    try {
                        var qr = qrcode(0, 'M');
                        qr.addData('${qrStr.replace(/'/g, "\\'")}');
                        qr.make();
                        var el = document.getElementById('etq-qr');
                        if (el) {
                            el.innerHTML = qr.createImgTag(2, 0);
                            var img = el.querySelector('img');
                            if (img) { img.style.width = '13mm'; img.style.height = '13mm'; }
                        }
                    } catch(e) {
                        var el = document.getElementById('etq-qr');
                        if (el) el.innerHTML = '<div style="width:13mm;height:13mm;background:#f1f5f9;display:flex;align-items:center;justify-content:center;font-size:6pt;color:#94a3b8;border-radius:2px;">QR</div>';
                    }
                });
            <\/script>
        </body>
        </html>
    `;

    const printWin = window.open('', '_blank', 'width=500,height=450');
    if (printWin) {
        printWin.document.write(etiquetaHTML);
        printWin.document.close();
        showNotification('Etiqueta aberta para impressão!', 'success');
    } else {
        showNotification('Permita pop-ups para imprimir etiquetas', 'warning');
    }
}

// Função de troca de abas na Ficha do Produto (modal de visualização)
function mudarAbaFichaProduto(aba, btnEl) {
    // Esconder todas as abas
    document.querySelectorAll('.ficha-tab-content').forEach(el => {
        el.style.display = 'none';
    });

    // Desativar todos os botões
    document.querySelectorAll('.ficha-tab').forEach(el => {
        el.style.color = '#64748b';
        el.style.borderBottomColor = 'transparent';
        el.classList.remove('active');
    });

    // Mostrar aba selecionada
    const tabContent = document.getElementById('ficha-tab-' + aba);
    if (tabContent) {
        tabContent.style.display = 'block';
    }

    // Ativar botão
    if (btnEl) {
        btnEl.style.color = '#6366f1';
        btnEl.style.borderBottomColor = '#6366f1';
        btnEl.classList.add('active');
    }
}

// Injeta o modal de edição de produto se não existir no DOM (ex: estoque.html separado)
function _ensureEditModalExists() {
    if (document.getElementById('modal-novo-produto')) return;
    const div = document.createElement('div');
    div.innerHTML = `
    <div class="modal-overlay" id="modal-novo-produto" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:10003;justify-content:center;align-items:center;">
        <div style="background:white;max-width:1200px;width:98%;height:95vh;display:flex;flex-direction:column;box-shadow:0 4px 20px rgba(0,0,0,0.15);border-radius:0;">
            <div style="display:flex;justify-content:space-between;align-items:center;padding:16px 24px;border-bottom:1px solid #e5e5e5;background:white;flex-shrink:0;">
                <h2 id="modal-novo-produto-titulo" style="color:#333;font-size:18px;font-weight:400;margin:0;">Produtos</h2>
                <button onclick="fecharModalProdutoPCP()" style="color:#666;background:none;border:none;font-size:14px;cursor:pointer;display:flex;align-items:center;gap:6px;">Fechar <i class="fas fa-times"></i></button>
            </div>
            <div style="display:flex;flex:1;overflow:hidden;">
                <div style="flex:1;padding:24px 32px;overflow-y:auto;background:white;">
                    <input type="hidden" id="pcp-produto-id">
                    <div style="display:flex;gap:24px;margin-bottom:24px;">
                        <div style="flex-shrink:0;width:80px;">
                            <div id="pcp-produto-imagem-container" style="width:70px;height:70px;border:1px solid #ddd;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#fafafa;cursor:pointer;position:relative;" onclick="document.getElementById('pcp-produto-imagem-input').click()">
                                <img id="pcp-produto-imagem-preview" src="" style="display:none;width:100%;height:100%;object-fit:cover;">
                                <i class="fas fa-image" id="pcp-produto-imagem-icon" style="font-size:24px;color:#ccc;"></i>
                            </div>
                            <input type="file" id="pcp-produto-imagem-input" accept="image/*" style="display:none;" onchange="if(typeof previewImagemProdutoPCP==='function')previewImagemProdutoPCP(this)">
                        </div>
                        <div style="flex:1;">
                            <div style="margin-bottom:12px;">
                                <fieldset style="border:1px solid #ddd;border-radius:4px;padding:0 12px 8px 12px;margin:0;">
                                    <legend style="font-size:11px;color:#666;padding:0 4px;">Descrição do Produto</legend>
                                    <input type="text" id="pcp-produto-descricao" placeholder="Descrição do Produto" style="width:100%;padding:4px 0;border:none;font-size:14px;outline:none;background:transparent;">
                                </fieldset>
                            </div>
                            <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:12px;margin-bottom:12px;">
                                <fieldset style="border:1px solid #ddd;border-radius:4px;padding:0 12px 8px 12px;margin:0;">
                                    <legend style="font-size:11px;color:#666;padding:0 4px;">Código do Produto</legend>
                                    <input type="text" id="pcp-produto-codigo" style="width:100%;padding:4px 0;border:none;font-size:13px;outline:none;background:transparent;">
                                </fieldset>
                                <fieldset style="border:1px solid #ddd;border-radius:4px;padding:0 12px 8px 12px;margin:0;">
                                    <legend style="font-size:11px;color:#666;padding:0 4px;">Código EAN (GTIN)</legend>
                                    <input type="text" id="pcp-produto-ean" placeholder="Opcional" style="width:100%;padding:4px 0;border:none;font-size:13px;outline:none;background:transparent;">
                                </fieldset>
                                <fieldset style="border:1px solid #ddd;border-radius:4px;padding:0 12px 8px 12px;margin:0;">
                                    <legend style="font-size:11px;color:#666;padding:0 4px;">Unidade</legend>
                                    <select id="pcp-produto-unidade" style="width:100%;padding:4px 0;border:none;font-size:13px;outline:none;background:transparent;cursor:pointer;">
                                        <option value="">Selecione</option><option value="UN">UN - Unidade</option><option value="M">M - Metro</option><option value="KG">KG - Quilograma</option><option value="CX">CX - Caixa</option><option value="PC">PC - Peça</option><option value="RL">RL - Rolo</option><option value="LT">LT - Litro</option>
                                    </select>
                                </fieldset>
                                <fieldset style="border:1px solid #ddd;border-radius:4px;padding:0 12px 8px 12px;margin:0;">
                                    <legend style="font-size:11px;color:#666;padding:0 4px;">Preço Unitário de Venda</legend>
                                    <input type="text" id="pcp-produto-preco" value="0,000000" style="width:100%;padding:4px 0;border:none;font-size:13px;outline:none;background:transparent;text-align:right;">
                                </fieldset>
                            </div>
                            <div style="display:grid;grid-template-columns:1fr 1.5fr;gap:12px;">
                                <fieldset style="border:1px solid #ddd;border-radius:4px;padding:0 12px 8px 12px;margin:0;">
                                    <legend style="font-size:11px;color:#666;padding:0 4px;">Código NCM</legend>
                                    <input type="text" id="pcp-produto-ncm" placeholder="NCM" style="width:100%;padding:4px 0;border:none;font-size:13px;outline:none;background:transparent;">
                                </fieldset>
                                <fieldset style="border:1px solid #ddd;border-radius:4px;padding:0 12px 8px 12px;margin:0;">
                                    <legend style="font-size:11px;color:#666;padding:0 4px;">Família/Categoria</legend>
                                    <select id="pcp-produto-categoria" style="width:100%;padding:4px 0;border:none;font-size:13px;outline:none;background:transparent;">
                                        <option value="">Selecione</option><option value="GERAL">GERAL</option><option value="ALUFORCE CB">ALUFORCE CB</option><option value="MATERIAIS">MATERIAIS</option>
                                    </select>
                                </fieldset>
                            </div>
                        </div>
                    </div>
                    <div style="border-bottom:1px solid #e5e5e5;margin-bottom:20px;">
                        <div style="display:flex;gap:0;">
                            <button class="pcp-produto-tab active" onclick="mudarAbaProdutoPCP('estoque',this)" style="padding:10px 16px;background:none;border:none;border-bottom:2px solid #333;color:#333;font-size:13px;font-weight:500;cursor:pointer;">Estoque</button>
                            <button class="pcp-produto-tab" onclick="mudarAbaProdutoPCP('custo',this)" style="padding:10px 16px;background:none;border:none;border-bottom:2px solid transparent;color:#666;font-size:13px;cursor:pointer;">Custo</button>
                            <button class="pcp-produto-tab" onclick="mudarAbaProdutoPCP('informacoes',this)" style="padding:10px 16px;background:none;border:none;border-bottom:2px solid transparent;color:#666;font-size:13px;cursor:pointer;">Info. Adicionais</button>
                            <button class="pcp-produto-tab" onclick="mudarAbaProdutoPCP('caracteristicas',this)" style="padding:10px 16px;background:none;border:none;border-bottom:2px solid transparent;color:#666;font-size:13px;cursor:pointer;">Características</button>
                            <button class="pcp-produto-tab" onclick="mudarAbaProdutoPCP('fiscal',this)" style="padding:10px 16px;background:none;border:none;border-bottom:2px solid transparent;color:#666;font-size:13px;cursor:pointer;">Fiscal</button>
                            <button class="pcp-produto-tab" onclick="mudarAbaProdutoPCP('observacoes',this)" style="padding:10px 16px;background:none;border:none;border-bottom:2px solid transparent;color:#666;font-size:13px;cursor:pointer;">Observações</button>
                        </div>
                    </div>
                    <div id="pcp-produto-tab-content">
                        <div id="pcp-tab-estoque" class="pcp-produto-tab-panel" style="display:block;">
                            <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:20px;">
                                <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:16px;text-align:center;">
                                    <div style="font-size:24px;font-weight:700;color:#16a34a;" id="pcp-estoque-disponivel">0</div>
                                    <div style="font-size:11px;color:#666;margin-top:4px;">Estoque Disponível</div>
                                </div>
                                <div style="background:#fef9c3;border:1px solid #fde047;border-radius:8px;padding:16px;text-align:center;">
                                    <div style="font-size:24px;font-weight:700;color:#ca8a04;" id="pcp-estoque-reservado">0</div>
                                    <div style="font-size:11px;color:#666;margin-top:4px;">Reservado</div>
                                </div>
                                <div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:16px;text-align:center;">
                                    <div style="font-size:24px;font-weight:700;color:#dc2626;" id="pcp-estoque-minimo-card">0</div>
                                    <div style="font-size:11px;color:#666;margin-top:4px;">Estoque Mínimo</div>
                                </div>
                                <div style="background:#eff6ff;border:1px solid #93c5fd;border-radius:8px;padding:16px;text-align:center;">
                                    <div style="font-size:24px;font-weight:700;color:#2563eb;" id="pcp-estoque-valor">R$ 0,00</div>
                                    <div style="font-size:11px;color:#666;margin-top:4px;">Valor em Estoque</div>
                                </div>
                            </div>
                            <div style="border:1px solid #e5e5e5;overflow:hidden;">
                                <table style="width:100%;border-collapse:collapse;font-size:13px;">
                                    <thead><tr style="background:#fafafa;">
                                        <th style="padding:12px 16px;text-align:left;font-weight:400;color:#666;border-bottom:1px solid #e5e5e5;">Local</th>
                                        <th style="padding:12px 16px;text-align:right;font-weight:400;color:#666;border-bottom:1px solid #e5e5e5;">Disponível</th>
                                        <th style="padding:12px 16px;text-align:right;font-weight:400;color:#666;border-bottom:1px solid #e5e5e5;">CMC Unit.</th>
                                        <th style="padding:12px 16px;text-align:right;font-weight:400;color:#666;border-bottom:1px solid #e5e5e5;">CMC Total</th>
                                        <th style="padding:12px 16px;text-align:right;font-weight:400;color:#666;border-bottom:1px solid #e5e5e5;">Estoque Mín.</th>
                                    </tr></thead>
                                    <tbody id="pcp-tabela-estoque-body">
                                        <tr style="background:#fff5e6;">
                                            <td style="padding:10px 16px;font-size:13px;color:#333;border-bottom:1px solid #e5e5e5;">PADRAO</td>
                                            <td style="padding:10px 16px;text-align:right;font-size:13px;color:#333;border-bottom:1px solid #e5e5e5;">0</td>
                                            <td style="padding:10px 16px;text-align:right;font-size:13px;color:#333;border-bottom:1px solid #e5e5e5;">0,00</td>
                                            <td style="padding:10px 16px;text-align:right;font-size:13px;color:#333;border-bottom:1px solid #e5e5e5;">0,00</td>
                                            <td style="padding:10px 16px;text-align:right;font-size:13px;border-bottom:1px solid #e5e5e5;"><input type="number" value="0" style="width:60px;padding:4px 6px;border:1px solid #f97316;border-radius:3px;text-align:right;font-size:13px;background:#fff8f0;" id="pcp-estoque-minimo-padrao"></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div id="pcp-tab-custo" class="pcp-produto-tab-panel" style="display:none;">
                            <h4 style="font-size:14px;color:#333;margin:0 0 16px 0;font-weight:600;">Custo do Estoque</h4>
                            <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:16px;margin-bottom:16px;">
                                <fieldset style="border:1px solid #ddd;border-radius:4px;padding:0 12px 8px 12px;margin:0;"><legend style="font-size:11px;color:#666;padding:0 4px;">Preço de Custo (R$)</legend><input type="text" id="pcp-produto-preco-custo" value="0,00" style="width:100%;padding:8px 0;border:none;font-size:15px;font-weight:500;outline:none;background:transparent;"></fieldset>
                                <fieldset style="border:1px solid #ddd;border-radius:4px;padding:0 12px 8px 12px;margin:0;"><legend style="font-size:11px;color:#666;padding:0 4px;">CMC Unitário (R$)</legend><input type="text" id="pcp-produto-cmc" value="0,00" style="width:100%;padding:8px 0;border:none;font-size:15px;font-weight:500;outline:none;background:#f5f5f5;" readonly></fieldset>
                            </div>
                            <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:16px;">
                                <fieldset style="border:1px solid #ddd;border-radius:4px;padding:0 12px 8px 12px;margin:0;"><legend style="font-size:11px;color:#666;padding:0 4px;">Margem (%)</legend><input type="text" id="pcp-produto-margem" value="0.00" style="width:100%;padding:8px 0;border:none;font-size:15px;font-weight:500;outline:none;background:transparent;color:#dc2626;"></fieldset>
                                <fieldset style="border:1px solid #ddd;border-radius:4px;padding:0 12px 8px 12px;margin:0;background:#f0fdf4;"><legend style="font-size:11px;color:#666;padding:0 4px;">Preço Venda Final (R$)</legend><input type="text" id="pcp-produto-preco-venda-final" value="0,00" style="width:100%;padding:8px 0;border:none;font-size:15px;font-weight:500;outline:none;background:transparent;color:#16a34a;" readonly></fieldset>
                            </div>
                        </div>
                        <div id="pcp-tab-informacoes" class="pcp-produto-tab-panel" style="display:none;">
                            <h4 style="font-size:14px;color:#333;margin:0 0 16px 0;font-weight:600;">Informações Adicionais</h4>
                            <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:16px;margin-bottom:16px;">
                                <fieldset style="border:1px solid #ddd;border-radius:4px;padding:0 12px 8px 12px;margin:0;"><legend style="font-size:11px;color:#666;padding:0 4px;">SKU</legend><input type="text" id="pcp-produto-sku" style="width:100%;padding:4px 0;border:none;font-size:13px;outline:none;background:transparent;"></fieldset>
                                <fieldset style="border:1px solid #ddd;border-radius:4px;padding:0 12px 8px 12px;margin:0;"><legend style="font-size:11px;color:#666;padding:0 4px;">Marca/Fabricante</legend><input type="text" id="pcp-produto-marca" placeholder="Marca" style="width:100%;padding:4px 0;border:none;font-size:13px;outline:none;background:transparent;"></fieldset>
                            </div>
                            <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:16px;margin-bottom:16px;">
                                <fieldset style="border:1px solid #ddd;border-radius:4px;padding:0 12px 8px 12px;margin:0;"><legend style="font-size:11px;color:#666;padding:0 4px;">Localização</legend><input type="text" id="pcp-produto-localizacao" style="width:100%;padding:4px 0;border:none;font-size:13px;outline:none;background:transparent;"></fieldset>
                                <fieldset style="border:1px solid #ddd;border-radius:4px;padding:0 12px 8px 12px;margin:0;"><legend style="font-size:11px;color:#666;padding:0 4px;">Cor</legend><input type="text" id="pcp-produto-cor" style="width:100%;padding:4px 0;border:none;font-size:13px;outline:none;background:transparent;"></fieldset>
                            </div>
                            <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:16px;">
                                <fieldset style="border:1px solid #ddd;border-radius:4px;padding:0 12px 8px 12px;margin:0;"><legend style="font-size:11px;color:#666;padding:0 4px;">Peso Bruto (kg)</legend><input type="number" id="pcp-produto-peso-bruto" placeholder="0.00" step="0.001" style="width:100%;padding:4px 0;border:none;font-size:13px;outline:none;background:transparent;"></fieldset>
                                <fieldset style="border:1px solid #ddd;border-radius:4px;padding:0 12px 8px 12px;margin:0;"><legend style="font-size:11px;color:#666;padding:0 4px;">Peso Líquido (kg)</legend><input type="number" id="pcp-produto-peso-liquido" placeholder="0.00" step="0.001" style="width:100%;padding:4px 0;border:none;font-size:13px;outline:none;background:transparent;"></fieldset>
                            </div>
                        </div>
                        <div id="pcp-tab-caracteristicas" class="pcp-produto-tab-panel" style="display:none;">
                            <h4 style="font-size:14px;color:#333;margin:0 0 16px 0;font-weight:600;">Características Físicas</h4>
                            <fieldset style="border:1px solid #ddd;border-radius:4px;padding:0 12px 8px 12px;margin:0;"><legend style="font-size:11px;color:#666;padding:0 4px;">Observações Técnicas</legend><textarea id="pcp-produto-observacoes" rows="4" placeholder="Obs. técnicas..." style="width:100%;padding:4px 0;border:none;font-size:13px;outline:none;background:transparent;resize:vertical;font-family:inherit;"></textarea></fieldset>
                        </div>
                        <div id="pcp-tab-fiscal" class="pcp-produto-tab-panel" style="display:none;">
                            <h4 style="font-size:14px;color:#333;margin:0 0 16px 0;font-weight:600;">Recomendações Fiscais</h4>
                            <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:16px;margin-bottom:16px;">
                                <fieldset style="border:1px solid #ddd;border-radius:4px;padding:0 12px 8px 12px;margin:0;"><legend style="font-size:11px;color:#666;padding:0 4px;">NCM</legend><input type="text" id="pcp-produto-ncm-fiscal" style="width:100%;padding:4px 0;border:none;font-size:13px;outline:none;background:transparent;"></fieldset>
                                <fieldset style="border:1px solid #ddd;border-radius:4px;padding:0 12px 8px 12px;margin:0;"><legend style="font-size:11px;color:#666;padding:0 4px;">CEST</legend><input type="text" id="pcp-produto-cest" style="width:100%;padding:4px 0;border:none;font-size:13px;outline:none;background:transparent;"></fieldset>
                            </div>
                            <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:16px;">
                                <fieldset style="border:1px solid #ddd;border-radius:4px;padding:0 12px 8px 12px;margin:0;"><legend style="font-size:11px;color:#666;padding:0 4px;">CFOP</legend><input type="text" id="pcp-produto-cfop" style="width:100%;padding:4px 0;border:none;font-size:13px;outline:none;background:transparent;"></fieldset>
                                <fieldset style="border:1px solid #ddd;border-radius:4px;padding:0 12px 8px 12px;margin:0;"><legend style="font-size:11px;color:#666;padding:0 4px;">Origem</legend><select id="pcp-produto-origem" style="width:100%;padding:4px 0;border:none;font-size:13px;outline:none;background:transparent;"><option value="0">0 - Nacional</option><option value="1">1 - Estrangeira - Import.</option><option value="2">2 - Estrangeira - Merc. Int.</option></select></fieldset>
                            </div>
                        </div>
                        <div id="pcp-tab-observacoes" class="pcp-produto-tab-panel" style="display:none;">
                            <h4 style="font-size:14px;color:#333;margin:0 0 16px 0;font-weight:600;">Observações</h4>
                            <fieldset style="border:1px solid #ddd;border-radius:4px;padding:0 12px 8px 12px;margin:0 0 16px 0;"><legend style="font-size:11px;color:#666;padding:0 4px;">Observações Internas</legend><textarea id="pcp-produto-obs-interna" rows="4" placeholder="Notas internas..." style="width:100%;padding:4px 0;border:none;font-size:13px;outline:none;background:transparent;resize:vertical;font-family:inherit;"></textarea></fieldset>
                            <fieldset style="border:1px solid #ddd;border-radius:4px;padding:0 12px 8px 12px;margin:0;"><legend style="font-size:11px;color:#666;padding:0 4px;">Observações NF</legend><textarea id="pcp-produto-obs-nf" rows="3" placeholder="Texto para NF-e..." style="width:100%;padding:4px 0;border:none;font-size:13px;outline:none;background:transparent;resize:vertical;font-family:inherit;"></textarea></fieldset>
                        </div>
                    </div>
                </div>
                <div id="pcp-sidebar-acoes" style="width:60px;background:white;border-left:1px solid #e5e5e5;padding:16px 8px;display:flex;flex-direction:column;align-items:center;gap:2px;flex-shrink:0;overflow-y:auto;transition:width 0.25s ease;">
                    <button onclick="salvarProdutoPCP()" style="display:flex;align-items:center;gap:10px;padding:10px 8px;background:none;border:none;cursor:pointer;color:#d97706;font-size:13px;width:100%;justify-content:center;border-radius:6px;white-space:nowrap;" onmouseover="this.style.background='#fef3c7'" onmouseout="this.style.background='none'"><i class="fas fa-cloud-upload-alt" style="font-size:16px;flex-shrink:0;"></i><span class="pcp-sidebar-label" style="display:none;">Salvar</span></button>
                    <div style="display:flex;justify-content:center;margin:8px 0;">
                        <button id="pcp-sidebar-toggle" onclick="toggleSidebarProdutoPCP()" style="width:36px;height:36px;border-radius:50%;border:2px solid #f97316;background:white;color:#f97316;cursor:pointer;display:flex;align-items:center;justify-content:center;"><i class="fas fa-chevron-right" style="font-size:12px;"></i></button>
                    </div>
                    <div id="pcp-sidebar-items" style="display:none;width:100%;flex-direction:column;gap:2px;">
                        <button onclick="if(typeof excluirProdutoPCP==='function')excluirProdutoPCP();else if(produtoAtualPCP)excluirProduto(produtoAtualPCP.id)" style="display:flex;align-items:center;gap:10px;padding:10px 8px;background:none;border:none;cursor:pointer;color:#dc2626;font-size:13px;width:100%;text-align:left;border-radius:6px;white-space:nowrap;" onmouseover="this.style.background='#fef2f2'" onmouseout="this.style.background='none'"><i class="fas fa-trash-alt" style="font-size:16px;flex-shrink:0;"></i><span>Excluir</span></button>
                    </div>
                </div>
            </div>
        </div>
    </div>`;
    document.body.appendChild(div.firstElementChild);
    console.log('[pcp-modals] Modal de edição injetado dinamicamente');
}

// Função para editar produto - preenche modal com dados da API
async function editarProdutoForm(produtoId) {
    try {
        console.log('[EDIT] ===== INICIO editarProdutoForm =====', produtoId);

        // 1) Buscar dados do produto via API
        const API_BASE = getAPIBase();
        console.log('[EDIT] API_BASE:', API_BASE);

        const response = await fetch(`${API_BASE}/api/pcp/produtos/${produtoId}`, { credentials: 'include' });
        console.log('[EDIT] Response status:', response.status);

        if (!response.ok) {
            const errText = await response.text();
            console.error('[EDIT] API Error:', response.status, errText);
            showNotification('Erro ao buscar produto: ' + response.status, 'error');
            return;
        }

        const produto = await response.json();
        console.log('[EDIT] Produto recebido:', JSON.stringify({id: produto.id, codigo: produto.codigo, nome: produto.nome, estoque_atual: produto.estoque_atual}));

        if (!produto || !produto.id) {
            showNotification('Produto não encontrado ou dados inválidos', 'error');
            return;
        }

        // 2) Salvar referência global
        produtoAtualPCP = produto;

        // 3) Garantir que o modal existe
        _ensureEditModalExists();

        // 4) Abrir o modal PRIMEIRO (para que os elementos fiquem visíveis no DOM)
        showModal('modal-novo-produto');

        // 5) Pequeno delay para garantir que o modal renderizou
        await new Promise(r => setTimeout(r, 100));

        // 6) Agora preencher os dados
        const tituloEl = document.getElementById('modal-novo-produto-titulo');
        if (tituloEl) tituloEl.textContent = 'Editar Produto';

        // Helper para setar valor com log
        const setVal = (id, val) => {
            const el = document.getElementById(id);
            if (el) {
                el.value = val ?? '';
                // Forçar trigger de input event para campos reactivos
                el.dispatchEvent(new Event('input', { bubbles: true }));
            } else {
                console.warn('[EDIT] Campo não encontrado:', id);
            }
        };

        // Helper para selects
        const setSelect = (id, val) => {
            const sel = document.getElementById(id);
            if (sel && val) {
                const v = String(val);
                for (let i = 0; i < sel.options.length; i++) {
                    if (sel.options[i].value === v || sel.options[i].value.toUpperCase() === v.toUpperCase()) {
                        sel.selectedIndex = i;
                        break;
                    }
                }
            }
        };

        // Dados básicos
        setVal('pcp-produto-id', produto.id);
        setVal('pcp-produto-codigo', produto.codigo);
        setVal('pcp-produto-descricao', produto.nome || produto.descricao || '');
        setVal('pcp-produto-ean', produto.gtin || produto.ean || '');
        setVal('pcp-produto-ncm', produto.ncm || '');

        const precoVenda = parseFloat(produto.preco_venda || produto.preco || 0);
        setVal('pcp-produto-preco', precoVenda.toFixed(6).replace('.', ','));

        const unidade = produto.unidade_medida || produto.unidade || 'UN';
        setSelect('pcp-produto-unidade', unidade);
        setSelect('pcp-produto-categoria', produto.categoria || produto.familia || '');

        // Verificar se os valores foram realmente setados
        const descEl = document.getElementById('pcp-produto-descricao');
        const codEl = document.getElementById('pcp-produto-codigo');
        console.log('[EDIT] Verificação - descricao.value:', descEl?.value, '| codigo.value:', codEl?.value);
        console.log('[EDIT] Verificação - descricao count:', document.querySelectorAll('[id="pcp-produto-descricao"]').length);

        // Se os valores não foram setados, forçar via setAttribute
        if (descEl && !descEl.value && produto.nome) {
            console.warn('[EDIT] Forçando via setAttribute');
            descEl.setAttribute('value', produto.nome);
            descEl.value = produto.nome;
        }
        if (codEl && !codEl.value && produto.codigo) {
            codEl.setAttribute('value', produto.codigo);
            codEl.value = produto.codigo;
        }

        // Aba Estoque - Calcular valores
        const estoqueAtual = parseFloat(produto.estoque_atual || 0);
        const estoqueMin = parseFloat(produto.estoque_minimo || 5);
        const precoCusto = parseFloat(produto.preco_custo || produto.custo_unitario || 0);
        const cmcTotal = precoCusto * estoqueAtual;
        const unAbrev = unidade.toUpperCase();

        // Preencher tabela de estoque (template: pcp-estoque-tbody / injetado: pcp-tabela-estoque-body)
        const estoqueTbody = document.getElementById('pcp-estoque-tbody') || document.getElementById('pcp-tabela-estoque-body');
        console.log('[EDIT] estoqueTbody found:', !!estoqueTbody, estoqueTbody?.id);
        if (estoqueTbody) {
            estoqueTbody.innerHTML = `
                <tr style="border-bottom: 1px solid #f0f0f0; background: #fffbf0;">
                    <td style="padding: 10px 12px; color: #333; font-weight: 500;">PADRAO - Local de Estoque Padrão</td>
                    <td style="padding: 10px 12px; text-align: right; color: #333; font-weight: 600;">${estoqueAtual.toLocaleString('pt-BR')} ${unAbrev}</td>
                    <td style="padding: 10px 12px; text-align: right; color: #333;">${precoCusto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td style="padding: 10px 12px; text-align: right; color: #333;">${cmcTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td style="padding: 10px 12px; text-align: right; color: #333;">${estoqueMin.toLocaleString('pt-BR')}</td>
                    <td style="padding: 10px 12px; text-align: right; color: #999;">0 ${unAbrev}</td>
                    <td style="padding: 10px 12px; text-align: right; color: #999;">0 ${unAbrev}</td>
                </tr>
            `;
        }

        // Cards de estoque (modal injetado)
        const estDisp = document.getElementById('pcp-estoque-disponivel');
        if (estDisp) estDisp.textContent = estoqueAtual.toLocaleString('pt-BR');
        const estMinCard = document.getElementById('pcp-estoque-minimo-card');
        if (estMinCard) estMinCard.textContent = estoqueMin.toLocaleString('pt-BR');
        const estValor = document.getElementById('pcp-estoque-valor');
        if (estValor) estValor.textContent = cmcTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        setVal('pcp-estoque-minimo-padrao', estoqueMin);

        // Aba Custo
        setVal('pcp-produto-preco-custo', precoCusto.toFixed(2).replace('.', ','));
        setVal('pcp-produto-cmc', parseFloat(produto.custo_unitario || precoCusto || 0).toFixed(2).replace('.', ','));
        const margem = parseFloat(produto.margem || produto.margem_lucro || 0);
        setVal('pcp-produto-margem', margem || '');
        if (precoVenda > 0) {
            setVal('pcp-produto-preco-venda-final', precoVenda.toFixed(2).replace('.', ','));
        } else if (precoCusto > 0 && margem > 0) {
            setVal('pcp-produto-preco-venda-final', (precoCusto * (1 + margem / 100)).toFixed(2).replace('.', ','));
        }

        // Aba Info Adicionais
        setVal('pcp-produto-sku', produto.sku || '');
        setVal('pcp-produto-marca', produto.marca || 'Aluforce');
        setVal('pcp-produto-localizacao', produto.localizacao || '');
        setVal('pcp-produto-cor', produto.cor || '');
        setVal('pcp-produto-peso-bruto', produto.peso_bruto || '');
        setVal('pcp-produto-peso-liquido', produto.peso_liquido || '');

        // Aba Características
        setVal('pcp-produto-observacoes', produto.observacoes || produto.obs_tecnicas || '');

        // Aba Fiscal
        setVal('pcp-produto-ncm-fiscal', produto.ncm || '');
        setVal('pcp-produto-cest', produto.cest || '');
        setVal('pcp-produto-cfop', produto.cfop_saida_interna || '5102');
        setSelect('pcp-produto-origem', produto.origem || '0');

        // Aba Observações
        setVal('pcp-produto-obs-interna', produto.obs_internas || '');
        setVal('pcp-produto-obs-nf', produto.info_adicional_produto || '');

        // Controle de lote
        const controleLote = document.getElementById('pcp-controle-lote');
        if (controleLote) {
            controleLote.checked = !!produto.controle_lote;
            const span = controleLote.parentElement?.querySelector('span');
            if (span) span.style.backgroundColor = controleLote.checked ? '#f97316' : '#ccc';
        }

        // Definição do produto (toggles)
        try {
            const tipo = produto.tipo_produto || 'produto';
            if (tipo === 'kit') toggleDefinicaoProdutoPCP('kit');
            else if (tipo === 'variacao') toggleDefinicaoProdutoPCP('variacoes');
            else toggleDefinicaoProdutoPCP('simples');
        } catch(e) { console.warn('[EDIT] toggleDefinicao error:', e); }

        // Imagem
        if (produto.imagem_url) {
            const imgPreview = document.getElementById('pcp-produto-imagem-preview');
            const imgIcon = document.getElementById('pcp-produto-imagem-icon');
            if (imgPreview) { imgPreview.src = produto.imagem_url; imgPreview.style.display = 'block'; }
            if (imgIcon) imgIcon.style.display = 'none';
        }

        // Mostrar aba estoque
        mudarAbaProdutoPCP('estoque', document.querySelector('#modal-novo-produto .pcp-produto-tab'));

        console.log('[EDIT] ===== PREENCHIMENTO COMPLETO =====');
        console.log('[EDIT] Desc final:', document.getElementById('pcp-produto-descricao')?.value);
        console.log('[EDIT] Cod final:', document.getElementById('pcp-produto-codigo')?.value);

        showNotification('Produto carregado: ' + (produto.codigo || '') + ' - ' + (produto.nome || ''), 'success');

    } catch (error) {
        console.error('[EDIT] ERRO FATAL:', error);
        showNotification('Erro ao carregar produto: ' + error.message, 'error');
    }
}

async function excluirProduto(produtoId) {
    const confirmado = await mostrarConfirmacaoPCP(
        'Excluir Produto',
        'Tem certeza que deseja excluir este produto? Esta ação não pode ser desfeita.',
        'danger'
    );

    if (!confirmado) return;

    try {
        const API_BASE = getAPIBase();
        const response = await fetch(`${API_BASE}/api/pcp/produtos/${produtoId}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        if (response.ok) {
            showNotification('Produto excluído com sucesso!', 'success');
            if (typeof buscarProdutos === 'function') buscarProdutos();
            if (typeof carregarProdutos === 'function') carregarProdutos();
        } else {
            const error = await response.json();
            showNotification(error.message || 'Erro ao excluir produto', 'error');
        }
    } catch (error) {
        console.error('Erro ao excluir produto:', error);
        showNotification('Erro ao excluir produto', 'error');
    }
}

async function salvarProdutoPCP() {
    const produtoId = document.getElementById('pcp-produto-id')?.value;
    const codigo = document.getElementById('pcp-produto-codigo')?.value?.trim();
    const descricao = document.getElementById('pcp-produto-descricao')?.value?.trim();

    if (!codigo || !descricao) {
        showNotification('Código e descrição são obrigatórios!', 'warning');
        return;
    }

    const getVal = (id) => document.getElementById(id)?.value || '';
    const getNumVal = (id) => parseFloat(document.getElementById(id)?.value?.replace(',', '.')) || 0;
    const getChecked = (id) => document.getElementById(id)?.checked ? 1 : 0;

    // Determinar tipo_produto baseado nos toggles de definição
    let tipoProduto = 'produto';
    if (getChecked('pcp-def-kit')) tipoProduto = 'kit';
    else if (getChecked('pcp-def-variacoes')) tipoProduto = 'variacao';

    const dados = {
        // Campos básicos (header)
        codigo: codigo,
        nome: descricao,
        descricao: descricao,
        gtin: getVal('pcp-produto-ean'),
        unidade_medida: getVal('pcp-produto-unidade'),
        preco_venda: getNumVal('pcp-produto-preco'),
        ncm: getVal('pcp-produto-ncm') || getVal('pcp-produto-ncm-fiscal'),
        categoria: getVal('pcp-produto-categoria') || 'GERAL',
        tipo_produto: tipoProduto,

        // Aba Estoque
        controle_lote: getChecked('pcp-controle-lote'),

        // Aba Custo do Estoque
        preco_custo: getNumVal('pcp-produto-preco-custo'),
        custo_unitario: getNumVal('pcp-produto-preco-custo'),
        margem: getNumVal('pcp-produto-margem'),

        // Aba Informações Adicionais
        sku: getVal('pcp-produto-sku') || null,
        marca: getVal('pcp-produto-marca') || null,
        localizacao: getVal('pcp-produto-localizacao'),
        cor: getVal('pcp-produto-cor'),
        peso_bruto: getNumVal('pcp-produto-peso-bruto'),
        peso_liquido: getNumVal('pcp-produto-peso-liquido'),

        // Aba Características
        observacoes: getVal('pcp-produto-observacoes'),

        // Aba Fiscal
        cest: getVal('pcp-produto-cest'),
        cfop_saida_interna: getVal('pcp-produto-cfop') || '5102',
        origem: getVal('pcp-produto-origem') || '0',

        // Aba Observações
        obs_internas: getVal('pcp-produto-obs-interna'),
        info_adicional_produto: getVal('pcp-produto-obs-nf'),

        // Status
        status: 'ativo',
        ativo: 1
    };

    try {
        const API_BASE = getAPIBase();
        const url = produtoId ? `${API_BASE}/api/pcp/produtos/${produtoId}` : `${API_BASE}/api/pcp/produtos`;
        const method = produtoId ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados),
            credentials: 'include'
        });

        if (response.ok) {
            showNotification(produtoId ? 'Produto atualizado com sucesso!' : 'Produto cadastrado com sucesso!', 'success');
            fecharModalProdutoPCP();
            if (typeof buscarProdutos === 'function') buscarProdutos();
            if (typeof carregarProdutos === 'function') carregarProdutos();
        } else {
            const error = await response.json();
            showNotification(error.message || 'Erro ao salvar produto', 'error');
        }
    } catch (error) {
        console.error('Erro ao salvar produto:', error);
        showNotification('Erro ao salvar produto', 'error');
    }
}

function fecharModalProdutoPCP() {
    hideModal('modal-novo-produto');
}

function limparFormProdutoPCP(semConfirmacao = false) {
    if (!semConfirmacao) {
        if (!confirm('Limpar todos os campos?')) return;
    }

    const campos = [
        'pcp-produto-id', 'pcp-produto-codigo', 'pcp-produto-descricao', 'pcp-produto-sku',
        'pcp-produto-ean', 'pcp-produto-ncm', 'pcp-produto-preco', 'pcp-produto-estoque',
        'pcp-produto-estoque-minimo', 'pcp-produto-observacoes', 'pcp-produto-gtin',
        'pcp-produto-marca', 'pcp-produto-preco-custo', 'pcp-produto-cmc', 'pcp-produto-margem',
        'pcp-produto-preco-venda-final', 'pcp-produto-localizacao', 'pcp-produto-cor',
        'pcp-produto-peso-bruto', 'pcp-produto-peso-liquido', 'pcp-produto-ncm-fiscal',
        'pcp-produto-cest', 'pcp-produto-cfop', 'pcp-produto-obs-interna', 'pcp-produto-obs-nf'
    ];

    campos.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });

    const precoEl = document.getElementById('pcp-produto-preco');
    if (precoEl) precoEl.value = '0,00';

    // Reset definição toggles
    const defSimples = document.getElementById('pcp-def-simples');
    if (defSimples) { defSimples.checked = true; if (defSimples.nextElementSibling) defSimples.nextElementSibling.style.backgroundColor = '#f97316'; }
    const defKit = document.getElementById('pcp-def-kit');
    if (defKit) { defKit.checked = false; if (defKit.nextElementSibling) defKit.nextElementSibling.style.backgroundColor = '#ccc'; }
    const defVar = document.getElementById('pcp-def-variacoes');
    if (defVar) { defVar.checked = false; if (defVar.nextElementSibling) defVar.nextElementSibling.style.backgroundColor = '#ccc'; }

    // Reset controle de lote
    const controleLote = document.getElementById('pcp-controle-lote');
    if (controleLote) { controleLote.checked = false; const s = controleLote.parentElement?.querySelector('span'); if (s) s.style.backgroundColor = '#ccc'; }

    // Reset selects
    const unidadeSel = document.getElementById('pcp-produto-unidade');
    if (unidadeSel) unidadeSel.selectedIndex = 0;
    const categSel = document.getElementById('pcp-produto-categoria');
    if (categSel) categSel.selectedIndex = 0;
    const origemSel = document.getElementById('pcp-produto-origem');
    if (origemSel) origemSel.selectedIndex = 0;

    // Reset imagem
    const imgPreview = document.getElementById('pcp-produto-imagem-preview');
    const imgIcon = document.getElementById('pcp-produto-imagem-icon');
    if (imgPreview) { imgPreview.style.display = 'none'; imgPreview.src = ''; }
    if (imgIcon) imgIcon.style.display = 'block';

    // Voltar para aba Estoque
    const primeiraAba = document.querySelector('.pcp-produto-tab');
    if (primeiraAba) mudarAbaProdutoPCP('estoque', primeiraAba);
}

function mudarAbaProdutoPCP(aba, btnClicado) {
    document.querySelectorAll('.pcp-produto-tab').forEach(btn => {
        btn.classList.remove('active');
        btn.style.borderBottomColor = 'transparent';
        btn.style.color = '#666';
        btn.style.fontWeight = '400';
    });

    document.querySelectorAll('.pcp-produto-tab-panel').forEach(panel => {
        panel.style.display = 'none';
    });

    if (btnClicado) {
        btnClicado.classList.add('active');
        btnClicado.style.borderBottomColor = '#333';
        btnClicado.style.color = '#333';
        btnClicado.style.fontWeight = '500';
    }

    const painelAtivo = document.getElementById(`pcp-tab-${aba}`);
    if (painelAtivo) painelAtivo.style.display = 'block';
}

function toggleDefinicaoProdutoPCP(tipo) {
    const tipos = ['simples', 'kit', 'variacoes'];
    tipos.forEach(t => {
        const cb = document.getElementById(`pcp-def-${t}`);
        if (cb) {
            cb.checked = (t === tipo);
            const span = cb.nextElementSibling;
            if (span) span.style.backgroundColor = cb.checked ? '#f97316' : '#ccc';
        }
    });
}

// Sidebar colapsável do modal de produto (Estilo Omie)
function toggleSidebarProdutoPCP() {
    const sidebar = document.getElementById('pcp-sidebar-acoes');
    const items = document.getElementById('pcp-sidebar-items');
    const toggleBtn = document.getElementById('pcp-sidebar-toggle');
    const labels = document.querySelectorAll('.pcp-sidebar-label');

    if (!sidebar) return;

    const isExpanded = sidebar.style.width === '200px';

    if (isExpanded) {
        // Colapsar
        sidebar.style.width = '60px';
        if (items) items.style.display = 'none';
        labels.forEach(l => l.style.display = 'none');
        if (toggleBtn) {
            toggleBtn.querySelector('i').style.transform = 'rotate(0deg)';
        }
    } else {
        // Expandir
        sidebar.style.width = '200px';
        if (items) { items.style.display = 'flex'; }
        labels.forEach(l => l.style.display = 'inline');
        if (toggleBtn) {
            toggleBtn.querySelector('i').style.transform = 'rotate(180deg)';
        }
    }
}

// Funções de ações da sidebar
function duplicarProdutoPCP() {
    const id = document.getElementById('pcp-produto-id')?.value;
    if (!id) { showNotification('Salve o produto antes de duplicar', 'warning'); return; }
    const desc = document.getElementById('pcp-produto-descricao')?.value || '';
    document.getElementById('pcp-produto-id').value = '';
    document.getElementById('pcp-produto-descricao').value = desc + ' (Cópia)';
    document.getElementById('pcp-produto-codigo').value = '';
    document.getElementById('modal-novo-produto-titulo').textContent = 'Incluir Produto';
    showNotification('Produto duplicado! Altere o código e salve.', 'info');
}

function inativarProdutoPCP() {
    const id = document.getElementById('pcp-produto-id')?.value;
    if (!id) { showNotification('Selecione um produto para inativar', 'warning'); return; }
    if (confirm('Deseja realmente inativar este produto?')) {
        showNotification('Produto inativado com sucesso!', 'success');
        fecharModalProdutoPCP();
    }
}

function excluirProdutoPCP() {
    const id = document.getElementById('pcp-produto-id')?.value;
    if (!id) { showNotification('Selecione um produto para excluir', 'warning'); return; }
    excluirProduto(id);
}

function abrirAnexosProdutoPCP() { showNotification('Módulo de anexos em desenvolvimento', 'info'); }
function abrirIAFiscalProdutoPCP() { showNotification('IA Fiscal em desenvolvimento', 'info'); }
function abrirHistoricoAlteracoesProdutoPCP() { showNotification('Histórico de alterações em desenvolvimento', 'info'); }
function abrirTarefasProdutoPCP() { showNotification('Tarefas em desenvolvimento', 'info'); }

function previewImagemProdutoPCP(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById('pcp-produto-imagem-preview');
            const icon = document.getElementById('pcp-produto-imagem-icon');
            if (preview) {
                preview.src = e.target.result;
                preview.style.display = 'block';
            }
            if (icon) icon.style.display = 'none';
        };
        reader.readAsDataURL(input.files[0]);
    }
}

// ============================================
// MODAL DE MATERIAL - FUNÇÕES
// ============================================
function abrirNovoMaterial() {
    limparFormMaterial();
    const titulo = document.getElementById('modal-material-titulo');
    if (titulo) titulo.innerHTML = '<i class="fas fa-plus-circle" style="color: #9333ea;"></i> Incluir Material';
    document.getElementById('material-id').value = '';
    showModal('modal-novo-material');
}

async function editarMaterial(materialId) {
    try {
        showNotification('Carregando dados do material...', 'info');

        const API_BASE = getAPIBase();
        const response = await fetch(`${API_BASE}/api/pcp/materiais/${materialId}`, { credentials: 'include' });
        if (!response.ok) throw new Error('Material não encontrado');

        const material = await response.json();
        console.log('Dados do material carregados:', material);

        limparFormMaterial();

        const titulo = document.getElementById('modal-material-titulo');
        if (titulo) titulo.innerHTML = '<i class="fas fa-edit" style="color: #9333ea;"></i> Editar Material';

        const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };

        setVal('material-id', material.id);
        setVal('material-codigo', material.codigo_material || material.codigo);
        setVal('material-descricao', material.descricao || material.nome);
        setVal('material-ncm', material.ncm);
        setVal('material-gtin', material.gtin);
        setVal('material-cor', material.cor);
        setVal('material-bitola', material.bitola || material.espessura);
        setVal('material-observacoes', material.observacoes);

        const custo = parseFloat(material.custo_unitario || material.custo || 0);
        setVal('material-custo', custo.toFixed(2).replace('.', ','));

        const preco = parseFloat(material.preco_venda || material.preco || 0);
        setVal('material-preco', preco.toFixed(2).replace('.', ','));

        setVal('material-estoque', material.quantidade_estoque || material.estoque || 0);
        setVal('material-estoque-minimo', material.estoque_minimo || 0);

        // Selects
        const setSelect = (id, val) => {
            const sel = document.getElementById(id);
            if (sel && val) {
                for (let opt of sel.options) {
                    if (opt.value.toLowerCase() === val.toLowerCase()) {
                        opt.selected = true;
                        break;
                    }
                }
            }
        };

        setSelect('material-tipo', material.tipo);
        setSelect('material-unidade', material.unidade_medida || material.unidade || 'UN');

        mudarAbaMaterialPCP('definicao');
        showModal('modal-novo-material');

    } catch (error) {
        console.error('Erro ao carregar material:', error);
        showNotification('Erro ao carregar dados do material', 'error');
    }
}

function verMaterial(materialId) {
    editarMaterial(materialId);
}

async function excluirMaterial(id) {
    const confirmado = await mostrarConfirmacaoPCP(
        'Excluir Material',
        'Tem certeza que deseja excluir este material? Esta ação não pode ser desfeita.',
        'danger'
    );

    if (!confirmado) return;

    try {
        const API_BASE = getAPIBase();
        const response = await fetch(`${API_BASE}/api/pcp/materiais/${id}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        if (response.ok) {
            showNotification('Material excluído com sucesso!', 'success');
            if (typeof buscarMateriais === 'function') buscarMateriais();
            if (typeof carregarMateriais === 'function') carregarMateriais();
        } else {
            showNotification('Erro ao excluir material', 'error');
        }
    } catch (error) {
        console.error('Erro ao excluir material:', error);
        showNotification('Erro ao excluir material', 'error');
    }
}

async function salvarMaterial() {
    const materialId = document.getElementById('material-id')?.value;
    const codigo = document.getElementById('material-codigo')?.value?.trim();
    const descricao = document.getElementById('material-descricao')?.value?.trim();
    const tipo = document.getElementById('material-tipo')?.value;

    if (!codigo || !descricao || !tipo) {
        showNotification('Preencha os campos obrigatórios: Código, Descrição e Tipo', 'error');
        return;
    }

    const getVal = (id) => document.getElementById(id)?.value || '';
    const getNumVal = (id) => parseFloat(document.getElementById(id)?.value?.replace(',', '.')) || 0;

    const materialData = {
        codigo_material: codigo,
        descricao: descricao,
        tipo: tipo,
        unidade_medida: getVal('material-unidade'),
        ncm: getVal('material-ncm'),
        gtin: getVal('material-gtin'),
        cor: getVal('material-cor'),
        bitola: getVal('material-bitola'),
        quantidade_estoque: getNumVal('material-estoque'),
        estoque_minimo: getNumVal('material-estoque-minimo'),
        custo_unitario: getNumVal('material-custo'),
        preco_venda: getNumVal('material-preco'),
        observacoes: getVal('material-observacoes')
    };

    try {
        const API_BASE = getAPIBase();
        const url = materialId ? `${API_BASE}/api/pcp/materiais/${materialId}` : `${API_BASE}/api/pcp/materiais`;
        const method = materialId ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(materialData),
            credentials: 'include'
        });

        if (response.ok) {
            showNotification(materialId ? 'Material atualizado com sucesso!' : 'Material cadastrado com sucesso!', 'success');
            fecharModalMaterial();
            if (typeof buscarMateriais === 'function') buscarMateriais();
            if (typeof carregarMateriais === 'function') carregarMateriais();
        } else {
            const error = await response.json();
            showNotification(error.message || 'Erro ao salvar material', 'error');
        }
    } catch (error) {
        console.error('Erro ao salvar material:', error);
        showNotification('Erro ao salvar material', 'error');
    }
}

function fecharModalMaterial() {
    hideModal('modal-novo-material');
}

function limparFormMaterial() {
    const campos = [
        'material-id', 'material-codigo', 'material-descricao', 'material-ncm', 'material-gtin',
        'material-cor', 'material-bitola', 'material-observacoes', 'material-custo', 'material-preco',
        'material-estoque', 'material-estoque-minimo', 'material-estoque-maximo', 'material-lote',
        'material-fornecedor-padrao', 'material-peso-bruto', 'material-peso-liquido',
        'material-altura', 'material-largura', 'material-comprimento'
    ];

    campos.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });

    const custoEl = document.getElementById('material-custo');
    if (custoEl) custoEl.value = '0,00';
    const precoEl = document.getElementById('material-preco');
    if (precoEl) precoEl.value = '0,00';
}

function mudarAbaMaterialPCP(aba, btnClicado) {
    document.querySelectorAll('.pcp-material-tab-btn').forEach(btn => {
        btn.classList.remove('active');
        btn.style.borderBottomColor = 'transparent';
        btn.style.color = '#666';
    });

    document.querySelectorAll('.pcp-material-tab-panel').forEach(panel => {
        panel.style.display = 'none';
    });

    const btnAtivo = btnClicado || document.querySelector(`.pcp-material-tab-btn[data-tab="${aba}"]`);
    if (btnAtivo) {
        btnAtivo.classList.add('active');
        btnAtivo.style.borderBottomColor = '#f97316';
        btnAtivo.style.color = '#f97316';
    }

    const painelAtivo = document.getElementById(`pcp-material-tab-${aba}`);
    if (painelAtivo) painelAtivo.style.display = 'block';
}

function toggleDefinicaoMaterialPCP(element, tipo) {
    const container = element.closest('div').parentElement;
    container.querySelectorAll('.toggle-switch-pcp').forEach(toggle => {
        toggle.removeAttribute('data-active');
    });
    element.setAttribute('data-active', 'true');
}

function previewImagemMaterial(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById('material-imagem-preview-img');
            const icon = document.getElementById('material-imagem-icon');
            if (preview) {
                preview.src = e.target.result;
                preview.style.display = 'block';
            }
            if (icon) icon.style.display = 'none';
        };
        reader.readAsDataURL(input.files[0]);
    }
}

// ============================================
// MODAL DE ORDEM DE COMPRA - FUNÇÕES
// ============================================
let ordensCompraList = [];

async function visualizarOC(id) {
    const oc = ordensCompraList.find(o => o.id === id);
    if (!oc) {
        // Tentar buscar da API
        try {
            const API_BASE = getAPIBase();
            const response = await fetch(`${API_BASE}/api/pcp/ordens-compra/${id}`, { credentials: 'include' });
            if (response.ok) {
                const data = await response.json();
                abrirModalVisualizarOC(data);
                return;
            }
        } catch (e) {
            console.error('Erro ao buscar OC:', e);
        }
        showNotification('Ordem de compra não encontrada', 'error');
        return;
    }
    abrirModalVisualizarOC(oc);
}

function abrirModalVisualizarOC(oc) {
    const statusColors = {
        pendente: { bg: '#fef3c7', color: '#92400e', icon: 'fa-clock' },
        aprovada: { bg: '#dcfce7', color: '#166534', icon: 'fa-check' },
        aprovado: { bg: '#dcfce7', color: '#166534', icon: 'fa-check' },
        em_cotacao: { bg: '#dbeafe', color: '#1e40af', icon: 'fa-search-dollar' },
        recebida: { bg: '#d1fae5', color: '#065f46', icon: 'fa-box-open' },
        recebido: { bg: '#d1fae5', color: '#065f46', icon: 'fa-box-open' },
        cancelada: { bg: '#fee2e2', color: '#991b1b', icon: 'fa-times' }
    };

    const statusConfig = statusColors[oc.status?.toLowerCase()] || statusColors.pendente;
    const previsao = oc.previsao_entrega ? new Date(oc.previsao_entrega).toLocaleDateString('pt-BR') : '-';
    const criacao = oc.created_at ? new Date(oc.created_at).toLocaleDateString('pt-BR') : '-';

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'modal-visualizar-oc';
    modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 10000; backdrop-filter: blur(4px);';

    modal.innerHTML = `
        <div style="background: white; border-radius: 20px; width: 95%; max-width: 800px; max-height: 90vh; overflow: hidden; box-shadow: 0 25px 60px rgba(0,0,0,0.3); animation: modalSlideIn 0.3s ease;">
            <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 24px; position: relative; overflow: hidden;">
                <div style="display: flex; align-items: center; gap: 16px;">
                    <div style="width: 56px; height: 56px; background: rgba(255,255,255,0.2); border-radius: 16px; display: flex; align-items: center; justify-content: center;">
                        <i class="fas fa-shopping-cart" style="font-size: 24px; color: white;"></i>
                    </div>
                    <div>
                        <h2 style="color: white; margin: 0; font-size: 22px; font-weight: 600;">Ordem de Compra</h2>
                        <span style="background: rgba(255,255,255,0.25); color: white; padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: 600;">OC-${String(oc.id).padStart(4, '0')}</span>
                    </div>
                </div>
                <button onclick="fecharModalVisualizarOC()" style="position: absolute; top: 16px; right: 16px; width: 36px; height: 36px; background: rgba(255,255,255,0.2); border: none; border-radius: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center;">
                    <i class="fas fa-times" style="color: white; font-size: 16px;"></i>
                </button>
            </div>

            <div style="padding: 24px; max-height: calc(90vh - 200px); overflow-y: auto;">
                <div style="display: flex; align-items: center; gap: 12px; padding: 16px; background: ${statusConfig.bg}; border-radius: 12px; margin-bottom: 24px;">
                    <i class="fas ${statusConfig.icon}" style="font-size: 20px; color: ${statusConfig.color};"></i>
                    <div>
                        <div style="font-size: 12px; color: ${statusConfig.color}; opacity: 0.8;">Status</div>
                        <div style="font-size: 16px; font-weight: 600; color: ${statusConfig.color}; text-transform: capitalize;">${oc.status || 'Pendente'}</div>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 24px;">
                    <div style="background: #f8fafc; border-radius: 12px; padding: 16px;">
                        <div style="font-size: 12px; color: #64748b; margin-bottom: 4px;"><i class="fas fa-cube" style="margin-right: 6px;"></i>Material</div>
                        <div style="font-size: 15px; font-weight: 600; color: #1e293b;">${oc.descricao || oc.codigo_material || '-'}</div>
                    </div>
                    <div style="background: #f8fafc; border-radius: 12px; padding: 16px;">
                        <div style="font-size: 12px; color: #64748b; margin-bottom: 4px;"><i class="fas fa-hashtag" style="margin-right: 6px;"></i>Quantidade</div>
                        <div style="font-size: 15px; font-weight: 600; color: #1e293b;">${oc.quantidade || 0} ${oc.unidade || 'UN'}</div>
                    </div>
                    <div style="background: #f8fafc; border-radius: 12px; padding: 16px;">
                        <div style="font-size: 12px; color: #64748b; margin-bottom: 4px;"><i class="fas fa-calendar" style="margin-right: 6px;"></i>Previsão Entrega</div>
                        <div style="font-size: 15px; font-weight: 600; color: #1e293b;">${previsao}</div>
                    </div>
                    <div style="background: #f8fafc; border-radius: 12px; padding: 16px;">
                        <div style="font-size: 12px; color: #64748b; margin-bottom: 4px;"><i class="fas fa-clock" style="margin-right: 6px;"></i>Data Criação</div>
                        <div style="font-size: 15px; font-weight: 600; color: #1e293b;">${criacao}</div>
                    </div>
                </div>

                ${oc.observacoes ? `
                <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 16px;">
                    <div style="font-size: 12px; color: #92400e; margin-bottom: 8px;"><i class="fas fa-sticky-note" style="margin-right: 6px;"></i>Observações</div>
                    <div style="font-size: 14px; color: #78350f;">${oc.observacoes}</div>
                </div>
                ` : ''}
            </div>

            <div style="padding: 16px 24px 24px; border-top: 1px solid #e5e7eb; display: flex; justify-content: flex-end; gap: 12px;">
                <button onclick="fecharModalVisualizarOC()" style="padding: 12px 24px; background: #f1f5f9; border: none; border-radius: 10px; cursor: pointer; font-weight: 600; color: #64748b;">Fechar</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    modal.onclick = (e) => { if (e.target === modal) fecharModalVisualizarOC(); };
}

function fecharModalVisualizarOC() {
    const modal = document.getElementById('modal-visualizar-oc');
    if (modal) modal.remove();
}

function editarOC(id) {
    const oc = ordensCompraList.find(o => o.id === id);
    if (!oc) {
        showNotification('Ordem de compra não encontrada', 'error');
        return;
    }

    if (oc.status?.toLowerCase() !== 'pendente') {
        showNotification('Apenas OCs pendentes podem ser editadas', 'warning');
        return;
    }

    abrirModalEditarOC(oc);
}

function abrirModalEditarOC(oc) {
    const previsaoDate = oc.previsao_entrega ? new Date(oc.previsao_entrega).toISOString().split('T')[0] : '';

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'modal-editar-oc';
    modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 10000; backdrop-filter: blur(4px);';

    modal.innerHTML = `
        <div style="background: white; border-radius: 20px; width: 95%; max-width: 600px; max-height: 90vh; overflow: hidden; box-shadow: 0 25px 60px rgba(0,0,0,0.3);">
            <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 20px 24px; display: flex; align-items: center; justify-content: space-between;">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="width: 40px; height: 40px; background: rgba(255,255,255,0.2); border-radius: 10px; display: flex; align-items: center; justify-content: center;">
                        <i class="fas fa-pen-to-square" style="font-size: 18px; color: white;"></i>
                    </div>
                    <div>
                        <h2 style="color: white; margin: 0; font-size: 18px; font-weight: 600;">Editar Ordem de Compra</h2>
                        <span style="color: rgba(255,255,255,0.8); font-size: 13px;">OC-${String(oc.id).padStart(4, '0')}</span>
                    </div>
                </div>
                <button onclick="fecharModalEditarOC()" style="background: rgba(255,255,255,0.2); border: none; width: 32px; height: 32px; border-radius: 8px; cursor: pointer;">
                    <i class="fas fa-times" style="color: white;"></i>
                </button>
            </div>

            <div style="padding: 24px;">
                <form id="form-editar-oc">
                    <input type="hidden" id="edit-oc-id" value="${oc.id}">

                    <div style="margin-bottom: 20px;">
                        <label style="font-weight: 600; color: #374151; margin-bottom: 6px; display: block;">
                            <i class="fas fa-cube" style="color:#f59e0b;margin-right:6px;"></i>Material
                        </label>
                        <input type="text" value="${oc.descricao || oc.codigo_material || ''}" readonly
                            style="width: 100%; padding: 12px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 14px; background: #f9fafb; color: #6b7280; box-sizing: border-box;">
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px;">
                        <div>
                            <label style="font-weight: 600; color: #374151; margin-bottom: 6px; display: block;">
                                <i class="fas fa-hashtag" style="color:#f59e0b;margin-right:6px;"></i>Quantidade *
                            </label>
                            <input type="number" id="edit-oc-quantidade" required min="1" value="${oc.quantidade || ''}"
                                style="width: 100%; padding: 12px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 14px; box-sizing: border-box;">
                        </div>
                        <div>
                            <label style="font-weight: 600; color: #374151; margin-bottom: 6px; display: block;">
                                <i class="fas fa-calendar" style="color:#f59e0b;margin-right:6px;"></i>Previsão Entrega *
                            </label>
                            <input type="date" id="edit-oc-previsao" required value="${previsaoDate}"
                                style="width: 100%; padding: 12px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 14px; box-sizing: border-box;">
                        </div>
                    </div>

                    <div style="margin-bottom: 20px;">
                        <label style="font-weight: 600; color: #374151; margin-bottom: 6px; display: block;">
                            <i class="fas fa-comment" style="color:#f59e0b;margin-right:6px;"></i>Observações
                        </label>
                        <textarea id="edit-oc-observacoes" rows="3" placeholder="Observações opcionais..."
                            style="width: 100%; padding: 12px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 14px; resize: vertical; box-sizing: border-box;">${oc.observacoes || ''}</textarea>
                    </div>
                </form>
            </div>

            <div style="padding: 16px 24px 24px; border-top: 1px solid #e5e7eb; display: flex; justify-content: flex-end; gap: 12px;">
                <button onclick="fecharModalEditarOC()" style="padding: 12px 24px; border: 2px solid #e5e7eb; background: white; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; color: #374151;">
                    Cancelar
                </button>
                <button onclick="salvarEdicaoOC()" style="padding: 12px 24px; background: linear-gradient(135deg, #f59e0b, #d97706); border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; color: white;">
                    <i class="fas fa-save" style="margin-right: 6px;"></i>Salvar Alterações
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    modal.onclick = (e) => { if (e.target === modal) fecharModalEditarOC(); };
}

function fecharModalEditarOC() {
    const modal = document.getElementById('modal-editar-oc');
    if (modal) modal.remove();
}

async function salvarEdicaoOC() {
    const id = document.getElementById('edit-oc-id')?.value;
    const quantidade = document.getElementById('edit-oc-quantidade')?.value;
    const previsao = document.getElementById('edit-oc-previsao')?.value;
    const observacoes = document.getElementById('edit-oc-observacoes')?.value;

    if (!quantidade || !previsao) {
        showNotification('Preencha quantidade e previsão de entrega', 'warning');
        return;
    }

    try {
        const API_BASE = getAPIBase();
        const response = await fetch(`${API_BASE}/api/pcp/ordens-compra/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ quantidade: parseFloat(quantidade), previsao_entrega: previsao, observacoes }),
            credentials: 'include'
        });

        if (response.ok) {
            showNotification('Ordem de compra atualizada!', 'success');
            fecharModalEditarOC();
            if (typeof carregarOrdensCompra === 'function') carregarOrdensCompra();
            if (typeof buscarOrdensCompra === 'function') buscarOrdensCompra();
        } else {
            showNotification('Erro ao atualizar ordem', 'error');
        }
    } catch (error) {
        console.error('Erro ao salvar OC:', error);
        showNotification('Erro ao salvar alterações', 'error');
    }
}

async function excluirOC(id) {
    const confirmado = await mostrarConfirmacaoPCP(
        'Excluir Ordem de Compra',
        'Tem certeza que deseja excluir esta ordem de compra?',
        'danger'
    );

    if (!confirmado) return;

    try {
        const API_BASE = getAPIBase();
        const response = await fetch(`${API_BASE}/api/pcp/ordens-compra/${id}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        if (response.ok) {
            showNotification('Ordem de compra excluída!', 'success');
            if (typeof carregarOrdensCompra === 'function') carregarOrdensCompra();
            if (typeof buscarOrdensCompra === 'function') buscarOrdensCompra();
        } else {
            showNotification('Erro ao excluir ordem', 'error');
        }
    } catch (error) {
        console.error('Erro ao excluir OC:', error);
        showNotification('Erro ao excluir ordem', 'error');
    }
}

// ============================================
// MODAL DE MOVIMENTAÇÃO DE ESTOQUE
// ============================================
let currentMovimentacaoTipo = 'entrada';
let currentMovimentacaoItem = null;
let _movBuscaTimeout = null;

function abrirModalMovimentacao(tipo, produto) {
    currentMovimentacaoTipo = tipo;
    currentMovimentacaoItem = produto || null;

    const header = document.getElementById('modal-mov-header');
    const icon = document.getElementById('modal-mov-icon');
    const titulo = document.getElementById('modal-mov-titulo');
    const subtitulo = document.getElementById('modal-mov-subtitulo');
    const btnConfirmar = document.getElementById('modal-mov-btn-confirmar');

    const configs = {
        entrada: {
            bg: 'linear-gradient(135deg, #22c55e, #16a34a)',
            icon: 'fa-arrow-up',
            titulo: 'Registrar Entrada',
            subtitulo: 'Adicionar quantidade ao estoque',
            btnText: 'Confirmar Entrada'
        },
        saida: {
            bg: 'linear-gradient(135deg, #ef4444, #dc2626)',
            icon: 'fa-arrow-down',
            titulo: 'Registrar Saída',
            subtitulo: 'Remover quantidade do estoque',
            btnText: 'Confirmar Saída'
        },
        ajuste: {
            bg: 'linear-gradient(135deg, #f59e0b, #d97706)',
            icon: 'fa-sliders-h',
            titulo: 'Ajuste de Estoque',
            subtitulo: 'Corrigir quantidade em estoque',
            btnText: 'Confirmar Ajuste'
        }
    };

    const config = configs[tipo] || configs.entrada;

    if (header) header.style.background = config.bg;
    if (icon) icon.className = `fas ${config.icon}`;
    if (titulo) titulo.textContent = config.titulo;
    if (subtitulo) subtitulo.textContent = config.subtitulo;
    if (btnConfirmar) {
        btnConfirmar.style.background = config.bg;
        btnConfirmar.innerHTML = `<i class="fas fa-check"></i> ${config.btnText}`;
    }

    // Reset form
    document.getElementById('modal-mov-quantidade').value = '';
    document.getElementById('modal-mov-observacao').value = '';
    document.getElementById('modal-mov-documento').value = '';
    const motivoPreset = document.getElementById('modal-mov-motivo-preset');
    if (motivoPreset) motivoPreset.value = '';
    // Reset color selector
    const corInput = document.getElementById('modal-mov-cor');
    if (corInput) corInput.value = '';
    const corTags = document.getElementById('modal-mov-cor-tags');
    if (corTags) corTags.innerHTML = '';
    const corList = document.getElementById('modal-mov-cor-list');
    if (corList) corList.innerHTML = '';
    // Load global color suggestions
    _carregarCoresGlobais();

    // Product search area
    const buscaInput = document.getElementById('modal-mov-produto-busca');
    const buscaResults = document.getElementById('modal-mov-produto-resultados');
    const infoCard = document.getElementById('modal-mov-produto-info');
    const buscaContainer = document.getElementById('modal-mov-produto-search-container');

    if (produto && produto.id) {
        // Product pre-selected — show info card, hide search
        currentMovimentacaoItem = produto;
        if (buscaContainer) buscaContainer.style.display = 'none';
        if (infoCard) {
            infoCard.style.display = 'flex';
            const estoque = produto.estoque_atual ?? produto.estoque ?? 0;
            document.getElementById('modal-mov-produto-nome').textContent = produto.nome || produto.descricao || 'Produto';
            document.getElementById('modal-mov-produto-codigo').textContent = `Código: ${produto.codigo || '-'}`;
            document.getElementById('modal-mov-produto-estoque').textContent = parseFloat(estoque).toFixed(2);
        }
        _popularCoresMovimentacao(produto);
    } else {
        // No product — show search, hide info card
        currentMovimentacaoItem = null;
        if (buscaContainer) buscaContainer.style.display = 'block';
        if (buscaInput) buscaInput.value = '';
        if (buscaResults) { buscaResults.innerHTML = ''; buscaResults.style.display = 'none'; }
        if (infoCard) infoCard.style.display = 'none';
    }

    showModal('modal-movimentacao-estoque');
    // Focus on search or quantity
    setTimeout(() => {
        if (produto && produto.id) {
            document.getElementById('modal-mov-quantidade')?.focus();
        } else if (buscaInput) {
            buscaInput.focus();
        }
    }, 250);
}

function buscarProdutoMovimentacao(termo) {
    clearTimeout(_movBuscaTimeout);
    const resultados = document.getElementById('modal-mov-produto-resultados');
    if (!resultados) return;

    if (!termo || termo.length < 2) {
        resultados.style.display = 'none';
        resultados.innerHTML = '';
        return;
    }

    _movBuscaTimeout = setTimeout(() => {
        // Sempre buscar na API para trazer TODOS os produtos (não apenas com entrada)
        const API_BASE = getAPIBase();
        fetch(`${API_BASE}/api/pcp/produtos?q=${encodeURIComponent(termo)}&limit=8`, { credentials: 'include' })
            .then(r => {
                if (!r.ok) throw new Error('HTTP ' + r.status);
                return r.json();
            })
            .then(data => {
                const produtos = Array.isArray(data) ? data : (data.rows || data.produtos || []);
                _renderResultadosBuscaMov(produtos, resultados);
            })
            .catch(() => {
                resultados.innerHTML = '<div style="padding:12px;color:#94a3b8;font-size:13px;text-align:center;">Erro ao buscar</div>';
                resultados.style.display = 'block';
            });
    }, 250);
}

function _renderResultadosBuscaMov(lista, container) {
    if (lista.length === 0) {
        container.innerHTML = '<div style="padding:12px;color:#94a3b8;font-size:13px;text-align:center;">Nenhum produto encontrado</div>';
    } else {
        container.innerHTML = lista.map(p => {
            const est = p.estoque_atual ?? p.estoque ?? 0;
            const safeJson = JSON.stringify({id:p.id,codigo:p.codigo||'',nome:p.nome||p.descricao||'',estoque:est,estoque_atual:est,cor:p.cor||'',cores:p.cores||''}).replace(/'/g,"\\'").replace(/"/g,'&quot;');
            const corLabel = p.cor ? ` | Cor: ${p.cor}` : '';
            return `
                <div onclick="selecionarProdutoMovimentacao(JSON.parse(this.getAttribute('data-p')))" data-p="${safeJson}" style="padding:10px 14px;cursor:pointer;border-bottom:1px solid #f1f5f9;transition:background 0.15s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background=''">
                    <div style="font-weight:600;font-size:13px;color:#1e293b;">${_escHtml(p.codigo || '-')} — ${_escHtml(p.nome || p.descricao || '')}</div>
                    <div style="font-size:11px;color:#64748b;margin-top:2px;">Estoque: ${parseFloat(est).toFixed(2)} | ${p.categoria || 'Sem categoria'}${corLabel}</div>
                </div>
            `;
        }).join('');
    }
    container.style.display = 'block';
}

function _escHtml(s) {
    const d = document.createElement('div'); d.textContent = s; return d.innerHTML;
}

function selecionarProdutoMovimentacao(produto) {
    currentMovimentacaoItem = produto;
    const buscaContainer = document.getElementById('modal-mov-produto-search-container');
    const infoCard = document.getElementById('modal-mov-produto-info');
    const buscaResults = document.getElementById('modal-mov-produto-resultados');

    if (buscaContainer) buscaContainer.style.display = 'none';
    if (buscaResults) buscaResults.style.display = 'none';
    if (infoCard) {
        infoCard.style.display = 'flex';
        const est = produto.estoque_atual ?? produto.estoque ?? 0;
        document.getElementById('modal-mov-produto-nome').textContent = produto.nome || produto.descricao || 'Produto';
        document.getElementById('modal-mov-produto-codigo').textContent = `Código: ${produto.codigo || '-'}`;
        document.getElementById('modal-mov-produto-estoque').textContent = parseFloat(est).toFixed(2);
    }
    document.getElementById('modal-mov-quantidade')?.focus();
    _popularCoresMovimentacao(produto);
}

function limparProdutoMovimentacao() {
    currentMovimentacaoItem = null;
    const buscaContainer = document.getElementById('modal-mov-produto-search-container');
    const infoCard = document.getElementById('modal-mov-produto-info');
    const buscaInput = document.getElementById('modal-mov-produto-busca');

    if (buscaContainer) buscaContainer.style.display = 'block';
    if (infoCard) infoCard.style.display = 'none';
    if (buscaInput) { buscaInput.value = ''; buscaInput.focus(); }
    // Reset color tags but keep field visible
    const corInput2 = document.getElementById('modal-mov-cor');
    if (corInput2) corInput2.value = '';
    const corTags2 = document.getElementById('modal-mov-cor-tags');
    if (corTags2) corTags2.innerHTML = '';
}

function _popularCoresMovimentacao(produto) {
    const corInput = document.getElementById('modal-mov-cor');
    const corList = document.getElementById('modal-mov-cor-list');
    const corTags = document.getElementById('modal-mov-cor-tags');
    if (!corInput || !corList) return;

    const corProduto = (produto && (produto.cores || produto.codigo_cores || produto.cor || '')) || '';
    const cores = corProduto ? corProduto.split(/[\/,;\s]+/).map(s => s.trim()).filter(Boolean) : [];

    // Map abbreviations to full names
    const MAPA_CORES = {
        'PT': 'PRETO', 'CZ': 'CINZA', 'AZ': 'AZUL', 'VM': 'VERMELHO',
        'VD': 'VERDE', 'AM': 'AMARELO', 'BR': 'BRANCO', 'NU': 'NATURAL',
        'MR': 'MARROM', 'LJ': 'LARANJA', 'RS': 'ROSA', 'RX': 'ROXO'
    };

    // Build datalist options: product colors first, then globals
    corList.innerHTML = '';
    const addedValues = new Set();
    cores.forEach(c => {
        const label = MAPA_CORES[c.toUpperCase()] || c;
        if (!addedValues.has(c.toUpperCase())) {
            addedValues.add(c.toUpperCase());
            const opt = document.createElement('option');
            opt.value = c;
            opt.textContent = label !== c ? `${c} — ${label}` : c;
            corList.appendChild(opt);
        }
    });

    // Add global cached colors
    if (window._coresGlobaisCache) {
        window._coresGlobaisCache.forEach(c => {
            if (!addedValues.has(c.toUpperCase())) {
                addedValues.add(c.toUpperCase());
                const opt = document.createElement('option');
                opt.value = c;
                corList.appendChild(opt);
            }
        });
    }

    // Render clickable color tags if product has specific colors
    if (corTags && cores.length > 0) {
        const COR_HEX = {
            'PRETO': '#1e293b', 'PT': '#1e293b', 'CINZA': '#6b7280', 'CZ': '#6b7280',
            'AZUL': '#2563eb', 'AZ': '#2563eb', 'VERMELHO': '#dc2626', 'VM': '#dc2626', 'VERMELHA': '#dc2626',
            'VERDE': '#16a34a', 'VD': '#16a34a', 'AMARELO': '#eab308', 'AM': '#eab308',
            'BRANCO': '#e5e7eb', 'BR': '#e5e7eb', 'NATURAL': '#d4a574', 'NU': '#d4a574',
            'MARROM': '#78350f', 'MR': '#78350f', 'LARANJA': '#ea580c', 'LJ': '#ea580c',
            'ROSA': '#ec4899', 'RS': '#ec4899', 'ROXO': '#7c3aed', 'RX': '#7c3aed'
        };
        corTags.innerHTML = cores.map(c => {
            const hex = COR_HEX[c.toUpperCase()] || '#94a3b8';
            const textColor = ['BRANCO', 'BR', 'AMARELO', 'AM', 'NATURAL', 'NU'].includes(c.toUpperCase()) ? '#374151' : '#fff';
            const label = MAPA_CORES[c.toUpperCase()] || c;
            return `<span onclick="document.getElementById('modal-mov-cor').value='${c}'" style="cursor:pointer;display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:16px;font-size:12px;font-weight:600;background:${hex};color:${textColor};border:1px solid rgba(0,0,0,0.1);transition:transform 0.15s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'"><span style="width:10px;height:10px;border-radius:50%;background:${textColor === '#fff' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.15)'};display:inline-block;"></span>${label}</span>`;
        }).join('');
    } else if (corTags) {
        corTags.innerHTML = '';
    }

    // Auto-select if only one color
    if (cores.length === 1) {
        corInput.value = cores[0];
    }
}

// Cache de cores globais carregadas uma vez
let _coresGlobaisLoaded = false;
function _carregarCoresGlobais() {
    if (_coresGlobaisLoaded && window._coresGlobaisCache) return;
    _coresGlobaisLoaded = true;

    // Extract unique colors from local product data
    const dados = window.produtosData || [];
    const coresSet = new Set();
    dados.forEach(p => {
        const cor = p.cor || '';
        if (cor) {
            cor.split(/[\/,;\s]+/).forEach(c => {
                const t = c.trim();
                if (t) coresSet.add(t.toUpperCase());
            });
        }
    });
    window._coresGlobaisCache = Array.from(coresSet).sort();

    // Populate datalist with global colors
    const corList = document.getElementById('modal-mov-cor-list');
    if (corList && window._coresGlobaisCache.length > 0) {
        corList.innerHTML = '';
        window._coresGlobaisCache.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c;
            corList.appendChild(opt);
        });
    }
}

function fecharModalMovimentacao() {
    hideModal('modal-movimentacao-estoque');
    currentMovimentacaoItem = null;
}

function selecionarMotivoPreset() {
    const preset = document.getElementById('modal-mov-motivo-preset')?.value;
    const obs = document.getElementById('modal-mov-observacao');
    if (preset && preset !== 'outro' && obs) {
        obs.value = preset;
    }
}

async function confirmarMovimentacao() {
    // Validate product
    if (!currentMovimentacaoItem || !currentMovimentacaoItem.id) {
        showNotification('Selecione um produto', 'warning');
        return;
    }

    const quantidade = parseFloat(document.getElementById('modal-mov-quantidade')?.value);
    const observacao = document.getElementById('modal-mov-observacao')?.value?.trim();
    const documento = document.getElementById('modal-mov-documento')?.value?.trim();
    const local = document.getElementById('modal-mov-local')?.value || 'PRINCIPAL';
    const cor = document.getElementById('modal-mov-cor')?.value?.trim() || null;

    if (!quantidade || quantidade <= 0) {
        showNotification('Informe uma quantidade válida', 'warning');
        return;
    }

    if (!observacao) {
        showNotification('Informe o motivo da movimentação', 'warning');
        return;
    }

    // Check stock for exits
    const estoqueAtual = currentMovimentacaoItem.estoque_atual ?? currentMovimentacaoItem.estoque ?? 0;
    if (currentMovimentacaoTipo === 'saida' && quantidade > estoqueAtual) {
        if (!confirm(`Atenção: a saída de ${quantidade} é maior que o estoque atual (${parseFloat(estoqueAtual).toFixed(2)}). Deseja continuar?`)) return;
    }

    const btn = document.getElementById('modal-mov-btn-confirmar');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processando...';
    }

    try {
        const API_BASE = getAPIBase();
        const tipoAPI = currentMovimentacaoTipo.toUpperCase();

        const response = await fetch(`${API_BASE}/api/pcp/estoque/movimentacao`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                produto_id: currentMovimentacaoItem.id,
                tipo: tipoAPI,
                quantidade: quantidade,
                observacoes: observacao,
                local: local,
                documento: documento || null,
                cor: cor
            })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Erro ao registrar movimentação');

        const nomeItem = currentMovimentacaoItem.nome || currentMovimentacaoItem.codigo || 'Produto';
        const tipoLabel = currentMovimentacaoTipo === 'entrada' ? 'Entrada' : currentMovimentacaoTipo === 'saida' ? 'Saída' : 'Ajuste';
        showNotification(`✅ ${tipoLabel} registrada! ${nomeItem}: ${data.quantidade_anterior?.toFixed(2)} → ${data.quantidade_atual?.toFixed(2)}`, 'success');

        fecharModalMovimentacao();
        if (typeof carregarProdutos === 'function') carregarProdutos();
    } catch (err) {
        showNotification('Erro: ' + err.message, 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            const configs = { entrada: 'Confirmar Entrada', saida: 'Confirmar Saída', ajuste: 'Confirmar Ajuste' };
            btn.innerHTML = `<i class="fas fa-check"></i> ${configs[currentMovimentacaoTipo] || 'Confirmar'}`;
        }
    }
}

// Funções similares para Material
function abrirModalMovimentacaoMaterial(tipo) {
    abrirModalMovimentacao(tipo);
}

function fecharModalMovimentacaoMaterial() {
    fecharModalMovimentacao();
}

function selecionarMotivoPresetMaterial() {
    selecionarMotivoPreset();
}

function confirmarMovimentacaoMaterial() {
    confirmarMovimentacao();
}

// ============================================
// EXPORTAR FUNÇÕES GLOBALMENTE
// ============================================
window.mostrarConfirmacaoPCP = mostrarConfirmacaoPCP;
window.fecharConfirmacaoPCP = fecharConfirmacaoPCP;
window.mostrarAlertaPCP = mostrarAlertaPCP;
window.fecharAlertaPCP = fecharAlertaPCP;
window.showModal = showModal;
window.hideModal = hideModal;

// Produto
window.abrirNovoProduto = abrirNovoProduto;
window.editarProduto = editarProduto;
window.verProduto = verProduto;
window.excluirProduto = excluirProduto;
window.salvarProdutoPCP = salvarProdutoPCP;
window.fecharModalProdutoPCP = fecharModalProdutoPCP;
window.limparFormProdutoPCP = limparFormProdutoPCP;
window.mudarAbaProdutoPCP = mudarAbaProdutoPCP;
window.toggleDefinicaoProdutoPCP = toggleDefinicaoProdutoPCP;
window.previewImagemProdutoPCP = previewImagemProdutoPCP;
window.toggleSidebarProdutoPCP = toggleSidebarProdutoPCP;
window.duplicarProdutoPCP = duplicarProdutoPCP;
window.inativarProdutoPCP = inativarProdutoPCP;
window.excluirProdutoPCP = excluirProdutoPCP;
window.abrirAnexosProdutoPCP = abrirAnexosProdutoPCP;
window.abrirIAFiscalProdutoPCP = abrirIAFiscalProdutoPCP;
window.abrirHistoricoAlteracoesProdutoPCP = abrirHistoricoAlteracoesProdutoPCP;
window.abrirTarefasProdutoPCP = abrirTarefasProdutoPCP;

// Novos modais de produto (visualização e edição separados)
window.fecharModalVisualizacao = fecharModalVisualizacao;
window.fecharModalEdicao = fecharModalEdicao;
window.abrirEdicaoProduto = abrirEdicaoProduto;
window.salvarEdicaoProduto = salvarEdicaoProduto;
window.registrarEntradaView = registrarEntradaView;
window.registrarSaidaView = registrarSaidaView;
window.imprimirEtiquetaView = imprimirEtiquetaView;
window.mudarAbaFichaProduto = mudarAbaFichaProduto;
window.editarProdutoForm = editarProdutoForm;
window.toggleHistórico = toggleHistorico;
window.carregarHistoricoProdutoView = carregarHistoricoProdutoView;

// Material
window.abrirNovoMaterial = abrirNovoMaterial;
window.editarMaterial = editarMaterial;
window.verMaterial = verMaterial;
window.excluirMaterial = excluirMaterial;
window.salvarMaterial = salvarMaterial;
window.fecharModalMaterial = fecharModalMaterial;
window.limparFormMaterial = limparFormMaterial;
window.mudarAbaMaterialPCP = mudarAbaMaterialPCP;
window.toggleDefinicaoMaterialPCP = toggleDefinicaoMaterialPCP;
window.previewImagemMaterial = previewImagemMaterial;

// Ordem de Compra
window.visualizarOC = visualizarOC;
window.editarOC = editarOC;
window.excluirOC = excluirOC;
window.fecharModalVisualizarOC = fecharModalVisualizarOC;
window.fecharModalEditarOC = fecharModalEditarOC;
window.salvarEdicaoOC = salvarEdicaoOC;
window.ordensCompraList = ordensCompraList;

// Movimentação
window.abrirModalMovimentacao = abrirModalMovimentacao;
window.fecharModalMovimentacao = fecharModalMovimentacao;
window.selecionarMotivoPreset = selecionarMotivoPreset;
window.confirmarMovimentacao = confirmarMovimentacao;
window.buscarProdutoMovimentacao = buscarProdutoMovimentacao;
window.selecionarProdutoMovimentacao = selecionarProdutoMovimentacao;
window.limparProdutoMovimentacao = limparProdutoMovimentacao;
window.abrirModalMovimentacaoMaterial = abrirModalMovimentacaoMaterial;
window.fecharModalMovimentacaoMaterial = fecharModalMovimentacaoMaterial;

console.log('✅ PCP Modals carregado com sucesso!');
