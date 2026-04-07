/* ============================================
   MODAL DE PRODUTO ENRIQUECIDO - JAVASCRIPT
   Funcionalidades interativas e gerenciamento de abas
   ============================================ */

(function() {
    'use strict';

    // ========== SISTEMA DE ABAS ==========
    function initTabs() {
        const tabs = document.querySelectorAll('.produto-tab');
        const contents = document.querySelectorAll('.produto-tab-content');
        
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.getAttribute('data-tab');
                
                // Remove classe active de todas as abas
                tabs.forEach(t => t.classList.remove('active'));
                contents.forEach(c => c.classList.remove('active'));
                
                // Adiciona classe active à aba clicada
                tab.classList.add('active');
                const content = document.querySelector(`[data-content="${tabName}"]`);
                if (content) {
                    content.classList.add('active');
                }
            });
        });
    }

    // ========== ATUALIZAR CARDS INFORMATIVOS ==========
    function atualizarCardsInfo(produto) {
        // Atualizar SKU
        const infoSku = document.getElementById('info-sku');
        if (infoSku) infoSku.textContent = produto.sku || '—';
        
        // Atualizar GTIN
        const infoGtin = document.getElementById('info-gtin');
        if (infoGtin) infoGtin.textContent = produto.gtin || '—';
        
        // Atualizar Categoria
        const infoCategoria = document.getElementById('info-categoria');
        if (infoCategoria) {
            const categoriaFormatada = formatarCategoria(produto.categoria);
            infoCategoria.textContent = categoriaFormatada || '—';
        }
        
        // Atualizar Status
        const infoStatus = document.getElementById('info-status');
        if (infoStatus) {
            const ativo = produto.ativo !== false;
            infoStatus.className = `status-badge ${ativo ? 'status-ativo' : 'status-inativo'}`;
            infoStatus.innerHTML = `
                <i class="fas fa-${ativo ? 'check-circle' : 'times-circle'}"></i>
                ${ativo ? 'Ativo' : 'Inativo'}
            `;
        }
    }

    // ========== ATUALIZAR CARDS DE ESTOQUE ==========
    function atualizarCardsEstoque(produto) {
        // Card: Quantidade Disponível
        const estqDisponivel = document.getElementById('estq-disponivel');
        if (estqDisponivel) {
            const qtd = parseFloat(produto.quantidade) || 0;
            estqDisponivel.textContent = qtd.toLocaleString('pt-BR', {minimumFractionDigits: 2});
        }
        
        // Card: Estoque Mínimo
        const estqMinimo = document.getElementById('estq-minimo');
        if (estqMinimo) {
            const min = parseFloat(produto.estoque_minimo) || 0;
            estqMinimo.textContent = min.toLocaleString('pt-BR', {minimumFractionDigits: 2});
        }
        
        // Card: Estoque Máximo
        const estqMaximo = document.getElementById('estq-maximo');
        if (estqMaximo) {
            const max = parseFloat(produto.estoque_maximo) || 0;
            estqMaximo.textContent = max.toLocaleString('pt-BR', {minimumFractionDigits: 2});
        }
        
        // Card: Status do Estoque
        const estqStatusText = document.getElementById('estq-status-text');
        const estqStatusBadge = document.getElementById('estq-status-badge');
        
        if (estqStatusText && estqStatusBadge) {
            const qtd = parseFloat(produto.quantidade) || 0;
            const min = parseFloat(produto.estoque_minimo) || 0;
            
            if (qtd === 0) {
                estqStatusText.textContent = 'Sem Estoque';
                estqStatusBadge.className = 'status-badge status-inativo';
                estqStatusBadge.innerHTML = '<i class="fas fa-times-circle"></i> Crítico';
            } else if (qtd < min) {
                estqStatusText.textContent = 'Abaixo do Mínimo';
                estqStatusBadge.className = 'status-badge status-alerta';
                estqStatusBadge.innerHTML = '<i class="fas fa-exclamation-triangle"></i> atenção';
                
                // Mostrar badge de alerta na aba
                const estoqueBadge = document.getElementById('estoque-alert-badge');
                if (estoqueBadge) estoqueBadge.style.display = 'inline-block';
            } else {
                estqStatusText.textContent = 'Estoque Normal';
                estqStatusBadge.className = 'status-badge status-ativo';
                estqStatusBadge.innerHTML = '<i class="fas fa-check-circle"></i> OK';
            }
        }
        
        // Atualizar barra de progresso do estoque
        atualizarProgressoEstoque(produto);
    }

    // ========== ATUALIZAR BARRA DE PROGRESSO DO ESTOQUE ==========
    function atualizarProgressoEstoque(produto) {
        const progressFill = document.getElementById('estoque-progress-fill');
        const progressLabel = document.getElementById('estoque-progress-label');
        
        if (!progressFill || !progressLabel) return;
        
        const qtd = parseFloat(produto.quantidade) || 0;
        const min = parseFloat(produto.estoque_minimo) || 0;
        const max = parseFloat(produto.estoque_maximo) || 100;
        
        let percentual = 0;
        if (max > 0) {
            percentual = Math.min((qtd / max) * 100, 100);
        }
        
        progressFill.style.width = percentual + '%';
        progressLabel.textContent = `${qtd.toLocaleString('pt-BR')} / ${max.toLocaleString('pt-BR')} ${produto.unidade || 'unidades'}`;
        
        // Alterar cor baseada no status
        if (qtd === 0) {
            progressFill.className = 'progress-bar-fill danger';
        } else if (qtd < min) {
            progressFill.className = 'progress-bar-fill warning';
        } else {
            progressFill.className = 'progress-bar-fill success';
        }
    }

    // ========== ATUALIZAR CARDS DE CUSTO ==========
    function atualizarCardsCusto(produto) {
        // Custo Unitário
        const custoUnit = document.getElementById('custo-unitario-display');
        if (custoUnit) {
            const custo = parseFloat(produto.custo_unitario) || 0;
            custoUnit.textContent = custo.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});
        }
        
        // Custo Total do Estoque
        const custoTotal = document.getElementById('custo-total-display');
        if (custoTotal) {
            const custo = parseFloat(produto.custo_unitario) || 0;
            const qtd = parseFloat(produto.quantidade) || 0;
            const total = custo * qtd;
            custoTotal.textContent = total.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});
        }
        
        // Preço de Venda
        const precoVenda = document.getElementById('preco-venda-display');
        if (precoVenda) {
            const preco = parseFloat(produto.preco) || 0;
            precoVenda.textContent = preco.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});
        }
        
        // Margem de Lucro
        const margemLucro = document.getElementById('margem-lucro-display');
        if (margemLucro) {
            const custo = parseFloat(produto.custo_unitario) || 0;
            const preco = parseFloat(produto.preco) || 0;
            let margem = 0;
            
            if (custo > 0 && preco > 0) {
                margem = ((preco - custo) / custo) * 100;
            }
            
            margemLucro.textContent = margem.toFixed(2) + '%';
        }
    }

    // ========== POPULAR TABELA DE FORNECEDORES ==========
    function popularTabelaFornecedores(fornecedores) {
        const tbody = document.getElementById('fornecedores-tbody');
        if (!tbody) return;
        
        if (!fornecedores || fornecedores.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 24px; color: #64748b;">Nenhum fornecedor cadastrado</td></tr>';
            return;
        }
        
        tbody.innerHTML = fornecedores.map((forn, idx) => `
            <tr>
                <td><strong>#${idx + 1}</strong></td>
                <td>${forn.nome || '—'}</td>
                <td>${forn.contato || '—'}</td>
                <td>${forn.prazo || '—'} dias</td>
                <td>
                    ${forn.preferencial ? '<span class="status-badge status-ativo"><i class="fas fa-star"></i> Preferencial</span>' : '<span class="status-badge status-alerta">Alternativo</span>'}
                </td>
            </tr>
        `).join('');
    }

    // ========== POPULAR TABELA DE HISTÓRICO ==========
    function popularTabelaHistorico(historico) {
        const tbody = document.getElementById('historico-tbody');
        if (!tbody) return;
        
        if (!historico || historico.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 24px; color: #64748b;">Nenhuma movimentAção registrada</td></tr>';
            return;
        }
        
        tbody.innerHTML = historico.map(item => `
            <tr>
                <td>${formatarData(item.data)}</td>
                <td>
                    <span class="status-badge ${item.tipo === 'entrada' ? 'status-ativo' : 'status-alerta'}">
                        <i class="fas fa-arrow-${item.tipo === 'entrada' ? 'up' : 'down'}"></i>
                        ${item.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                    </span>
                </td>
                <td><strong>${item.quantidade}</strong></td>
                <td>${item.observacao || '—'}</td>
            </tr>
        `).join('');
    }

    // ========== VALIDAÇÃO EM TEMPO REAL ==========
    function setupValidacaoTempoReal() {
        // Validação GTIN
        const gtinInput = document.getElementById('edit-gtin');
        if (gtinInput) {
            gtinInput.addEventListener('input', (e) => {
                const valor = e.target.value.replace(/\D/g, '');
                e.target.value = valor;
                
                if (valor.length === 13) {
                    if (validarGTIN(valor)) {
                        e.target.classList.add('is-valid');
                        e.target.classList.remove('is-invalid');
                    } else {
                        e.target.classList.add('is-invalid');
                        e.target.classList.remove('is-valid');
                    }
                } else {
                    e.target.classList.remove('is-valid', 'is-invalid');
                }
            });
        }
        
        // Atualização dinâmica dos cards conforme digitAção
        const camposMonitorados = ['edit-quantidade', 'edit-custo', 'edit-preco', 'edit-estoque-minimo', 'edit-estoque-maximo'];
        
        camposMonitorados.forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                input.addEventListener('input', () => {
                    const produto = obterDadosFormulario();
                    atualizarCardsEstoque(produto);
                    atualizarCardsCusto(produto);
                });
            }
        });
    }

    // ========== VALIDAR GTIN/EAN-13 ==========
    function validarGTIN(gtin) {
        if (gtin.length !== 13) return false;
        
        let soma = 0;
        for (let i = 0; i < 12; i++) {
            soma += parseInt(gtin[i]) * (i % 2 === 0 ? 1 : 3);
        }
        
        const digitoVerificador = (10 - (soma % 10)) % 10;
        return digitoVerificador === parseInt(gtin[12]);
    }

    // ========== OBTER DADOS DO FORMULÁRIO ==========
    function obterDadosFormulario() {
        return {
            codigo: document.getElementById('edit-codigo')?.value || '',
            sku: document.getElementById('edit-sku')?.value || '',
            gtin: document.getElementById('edit-gtin')?.value || '',
            nome: document.getElementById('edit-nome')?.value || '',
            descricao: document.getElementById('edit-descricao')?.value || '',
            categoria: document.getElementById('edit-categoria')?.value || '',
            quantidade: document.getElementById('edit-quantidade')?.value || 0,
            custo_unitario: document.getElementById('edit-custo')?.value || 0,
            preco: document.getElementById('edit-preco')?.value || 0,
            estoque_minimo: document.getElementById('edit-estoque-minimo')?.value || 0,
            estoque_maximo: document.getElementById('edit-estoque-maximo')?.value || 0,
            unidade: document.getElementById('edit-unidade')?.value || 'unidade'
        };
    }

    // ========== FORMATAR CATEGORIA ==========
    function formatarCategoria(categoria) {
        const mapa = {
            'cabo_duplex': 'Cabo Duplex',
            'cabo_triplex': 'Cabo Triplex',
            'cabo_quadruplex': 'Cabo Quadruplex',
            'cabo_unipolar': 'Cabo Unipolar',
            'cabo_potencia': 'Cabo de Potência',
            'cabo_protegido': 'Cabo Protegido',
            'cabo_ca': 'Cabo CA',
            'acessorios': 'Acessórios'
        };
        
        return mapa[categoria] || categoria;
    }

    // ========== FORMATAR DATA ==========
    function formatarData(data) {
        if (!data) return '—';
        const d = new Date(data);
        return d.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // ========== FECHAR MODAL ==========
    function fecharModal() {
        const modal = document.getElementById('modal-editar-produto');
        if (modal) {
            modal.classList.add('hidden');
            modal.setAttribute('aria-hidden', 'true');
        }
    }

    // ========== ABRIR MODAL ==========
    function abrirModal(produto) {
        const modal = document.getElementById('modal-editar-produto');
        if (!modal) return;
        
        // Preencher código do produto no header
        const codigoBadge = document.getElementById('modal-produto-id-display');
        if (codigoBadge) {
            codigoBadge.textContent = produto.codigo || '';
        }
        
        // Preencher todos os campos
        document.getElementById('edit-codigo').value = produto.codigo || '';
        document.getElementById('edit-sku').value = produto.sku || '';
        document.getElementById('edit-gtin').value = produto.gtin || '';
        document.getElementById('edit-nome').value = produto.nome || '';
        document.getElementById('edit-descricao').value = produto.descricao || '';
        document.getElementById('edit-categoria').value = produto.categoria || '';
        document.getElementById('edit-tensao').value = produto.tensao || '';
        document.getElementById('edit-secao').value = produto.secao || '';
        document.getElementById('edit-isolamento').value = produto.isolamento || '';
        document.getElementById('edit-condutor').value = produto.condutor || '';
        document.getElementById('edit-variacao').value = produto.variacao || '';
        document.getElementById('edit-custo').value = produto.custo_unitario || '';
        document.getElementById('edit-unidade').value = produto.unidade || 'metro';
        document.getElementById('edit-peso').value = produto.peso || '';
        document.getElementById('edit-quantidade').value = produto.quantidade || '';
        document.getElementById('edit-preco').value = produto.preco || '';
        document.getElementById('edit-fornecedor').value = produto.fornecedor || '';
        document.getElementById('edit-estoque-minimo').value = produto.estoque_minimo || '';
        document.getElementById('edit-estoque-maximo').value = produto.estoque_maximo || '';
        document.getElementById('edit-produto-id').value = produto.id || '';
        
        // Atualizar cards informativos
        atualizarCardsInfo(produto);
        atualizarCardsEstoque(produto);
        atualizarCardsCusto(produto);
        
        // Popular tabelas (se houver dados)
        // popularTabelaFornecedores(produto.fornecedores || []);
        // popularTabelaHistorico(produto.historico || []);
        
        // Mostrar modal
        modal.classList.remove('hidden');
        modal.setAttribute('aria-hidden', 'false');
        
        // Voltar para primeira aba
        document.querySelector('.produto-tab')?.click();
    }

    // ========== INICIALIZAÇÃO ==========
    document.addEventListener('DOMContentLoaded', () => {
        initTabs();
        setupValidacaoTempoReal();
        
        // botão fechar
        const btnFechar = document.getElementById('close-editar-produto');
        if (btnFechar) {
            btnFechar.addEventListener('click', fecharModal);
        }
        
        // botão cancelar
        const btnCancelar = document.getElementById('btn-cancelar-edicao');
        if (btnCancelar) {
            btnCancelar.addEventListener('click', fecharModal);
        }
        
        // Fechar ao clicar fora do modal
        const modal = document.getElementById('modal-editar-produto');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    fecharModal();
                }
            });
        }
    });

    // ========== EXPORTAR FUNÇÕES GLOBAIS ==========
    window.abrirModalEditarProdutoEnriquecido = abrirModal;
    window.fecharModalEditarProduto = fecharModal;

})();




