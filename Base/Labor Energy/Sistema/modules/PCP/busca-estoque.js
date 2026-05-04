// =====================================================
// BUSCA AVANÇADA DE PRODUTOS E ALERTAS DE ESTOQUE
// =====================================================

(function() {
    'use strict';

    let produtosCache = [];
    const API_BASE_URL = '/api/pcp';

    // =====================================================
    // BUSCA AVANÇADA
    // =====================================================

    window.buscarProdutosAvancado = async function() {
        const searchTerm = document.getElementById('search-produtos')?.value.toLowerCase().trim() || '';
        const categoria = document.getElementById('filter-categoria')?.value || '';
        const estoqueFilter = document.getElementById('filter-estoque')?.value || '';
        
        console.log('Busca avançada:', { searchTerm, categoria, estoqueFilter });
        
        try {
            // Carregar produtos se não estiverem em cache
            if (produtosCache.length === 0) {
                const response = await fetch(`${API_BASE_URL}/produtos?limit=1000`);
                if (!response.ok) throw new Error('Erro ao buscar produtos');
                const body = await response.json();
                produtosCache = body.rows || [];
            }
            
            let produtosFiltrados = [...produtosCache];
            
            // Filtro por texto de busca
            if (searchTerm) {
                produtosFiltrados = produtosFiltrados.filter(p => {
                    const codigo = (p.codigo || '').toLowerCase();
                    const nome = (p.nome || '').toLowerCase();
                    const descricao = (p.descricao || '').toLowerCase();
                    const sku = (p.sku || '').toLowerCase();
                    const gtin = (p.gtin || '').toLowerCase();
                    
                    return codigo.includes(searchTerm) || 
                           nome.includes(searchTerm) || 
                           descricao.includes(searchTerm) ||
                           sku.includes(searchTerm) ||
                           gtin.includes(searchTerm);
                });
            }
            
            // Filtro por categoria
            if (categoria) {
                produtosFiltrados = produtosFiltrados.filter(p => {
                    const prodCategoria = (p.categoria || '').toLowerCase();
                    return prodCategoria.includes(categoria);
                });
            }
            
            // Filtro por estoque
            if (estoqueFilter) {
                produtosFiltrados = produtosFiltrados.filter(p => {
                    const qtd = parseFloat(p.quantidade || 0);
                    const min = parseFloat(p.estoque_minimo || 0);
                    const max = parseFloat(p.estoque_maximo || 100);
                    
                    switch(estoqueFilter) {
                        case 'baixo':
                            return qtd <= min && qtd > 0;
                        case 'critico':
                            return qtd === 0 || qtd < (min * 0.5);
                        case 'normal':
                            return qtd > min && qtd < max;
                        case 'alto':
                            return qtd >= max;
                        default:
                            return true;
                    }
                });
            }
            
            renderProdutosFiltrados(produtosFiltrados);
            
            if (typeof showToast === 'function') {
                showToast(`${produtosFiltrados.length} produtos encontrados`, 'success');
            }
            
        } catch (error) {
            console.error('Erro na busca:', error);
            if (typeof showToast === 'function') {
                showToast('Erro ao buscar produtos', 'error');
            }
        }
    };

    window.filtrarRapido = function(tipo) {
        const searchInput = document.getElementById('search-produtos');
        const categoriaSelect = document.getElementById('filter-categoria');
        const estoqueSelect = document.getElementById('filter-estoque');
        
        // Limpar todos os filtros
        if (searchInput) searchInput.value = '';
        if (categoriaSelect) categoriaSelect.value = '';
        if (estoqueSelect) estoqueSelect.value = '';
        
        // Aplicar filtro específico
        if (tipo === 'estoque-baixo') {
            if (estoqueSelect) estoqueSelect.value = 'baixo';
        } else if (tipo === 'critico') {
            if (estoqueSelect) estoqueSelect.value = 'critico';
        } else if (tipo === 'todos') {
            produtosCache = [];
            if (typeof carregarProdutos === 'function') {
                carregarProdutos();
            }
            return;
        }
        
        buscarProdutosAvancado();
    };

    function renderProdutosFiltrados(produtos) {
        const container = document.getElementById('tabela-produtos-container');
        if (!container) return;
        
        if (produtos.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 60px 20px; color: #64748b;">
                    <i class="fas fa-search" style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;"></i>
                    <p style="font-size: 16px;">Nenhum produto encontrado</p>
                    <button onclick="filtrarRapido('todos')" style="margin-top: 12px; padding: 8px 16px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer;">
                        Limpar Filtros
                    </button>
                </div>
            `;
            return;
        }
        
        const infoLine = `<div class="info-line" style="padding: 12px; background: #f9fafb; border-radius: 8px; margin-bottom: 12px; font-weight: 600; color: #374151;">${produtos.length} produto(s) encontrado(s)</div>`;
        
        let tableHTML = `
            ${infoLine}
            <table class="estoque-table">
                <thead>
                    <tr>
                        <th style="width: 10%;">Código</th>
                        <th>Descrição</th>
                        <th style="width: 10%;">SKU</th>
                        <th style="width: 12%;">GTIN</th>
                        <th style="width: 10%; text-align: center;">Estoque</th>
                        <th style="width: 10%; text-align: center;">Status</th>
                        <th style="width: 12%; text-align: center;">Ações</th>
                    </tr>
                </thead>
                <tbody>
                    ${produtos.map(p => {
                        const qtd = parseFloat(p.quantidade || 0);
                        const min = parseFloat(p.estoque_minimo || 0);
                        const max = parseFloat(p.estoque_maximo || 100);
                        
                        let statusEstoque = '';
                        let statusClass = '';
                        
                        if (qtd === 0 || qtd < (min * 0.5)) {
                            statusEstoque = '🚨 Crítico';
                            statusClass = 'status-critico';
                        } else if (qtd <= min) {
                            statusEstoque = '⚠️ Baixo';
                            statusClass = 'status-baixo';
                        } else if (qtd >= max) {
                            statusEstoque = '📦 Alto';
                            statusClass = 'status-alto';
                        } else {
                            statusEstoque = '✅ Normal';
                            statusClass = 'status-normal';
                        }
                        
                        return `
                            <tr data-id="${p.id}">
                                <td><strong>${p.codigo || ''}</strong></td>
                                <td>${p.nome || p.descricao || ''}</td>
                                <td><span style="background: #10b981; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">${p.sku || '-'}</span></td>
                                <td>${p.gtin || '-'}</td>
                                <td style="text-align: center;"><strong>${qtd.toFixed(2)}</strong> ${p.unidade || 'UN'}</td>
                                <td style="text-align: center;">
                                    <span class="${statusClass}" style="padding: 4px 8px; border-radius: 6px; font-size: 12px; font-weight: 600; white-space: nowrap; display: inline-block;">
                                        ${statusEstoque}
                                    </span>
                                </td>
                                <td style="text-align: center;">
                                    <button class="btn-sm btn-primary" onclick="editarProduto(${p.id})" title="Editar" style="margin: 2px;">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button class="btn-sm btn-info" onclick="verDetalhesProduto(${p.id})" title="Detalhes" style="margin: 2px;">
                                        <i class="fas fa-eye"></i>
                                    </button>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
            
            <style>
                .status-critico {
                    background: #fee2e2 !important;
                    color: #991b1b !important;
                    border: 1px solid #ef4444 !important;
                }
                .status-baixo {
                    background: #fef3c7 !important;
                    color: #92400e !important;
                    border: 1px solid #fbbf24 !important;
                }
                .status-normal {
                    background: #d1fae5 !important;
                    color: #065f46 !important;
                    border: 1px solid #10b981 !important;
                }
                .status-alto {
                    background: #dbeafe !important;
                    color: #1e40af !important;
                    border: 1px solid #3b82f6 !important;
                }
            </style>
        `;
        
        container.innerHTML = tableHTML;
    }

    // =====================================================
    // SISTEMA DE ALERTAS DE ESTOQUE
    // =====================================================

    window.verificarAlertasEstoque = async function() {
        try {
            const response = await fetch(`${API_BASE_URL}/produtos?limit=1000`);
            if (!response.ok) throw new Error('Erro ao buscar produtos');
            
            const body = await response.json();
            const produtos = body.rows || [];
            
            const alertas = {
                criticos: [],
                baixos: [],
                zerados: []
            };
            
            produtos.forEach(p => {
                const qtd = parseFloat(p.quantidade || 0);
                const min = parseFloat(p.estoque_minimo || 0);
                
                if (qtd === 0) {
                    alertas.zerados.push(p);
                } else if (qtd < (min * 0.5)) {
                    alertas.criticos.push(p);
                } else if (qtd <= min) {
                    alertas.baixos.push(p);
                }
            });
            
            // Mostrar Notificação se houver alertas
            const totalAlertas = alertas.criticos.length + alertas.baixos.length + alertas.zerados.length;
            
            if (totalAlertas > 0) {
                let mensagem = '📦 ALERTAS DE ESTOQUE';
                
                if (alertas.zerados.length > 0) {
                    mensagem += `🚨 ${alertas.zerados.length} produto(s) SEM ESTOQUE:`;
                    alertas.zerados.slice(0, 5).forEach(p => {
                        mensagem += `   • ${p.codigo} - ${p.nome}`;
                    });
                    if (alertas.zerados.length > 5) {
                        mensagem += `   ... e mais ${alertas.zerados.length - 5}`;
                    }
                    mensagem += '';
                }
                
                if (alertas.criticos.length > 0) {
                    mensagem += `⚠️ ${alertas.criticos.length} produto(s) em NÍVEL CRÍTICO:`;
                    alertas.criticos.slice(0, 5).forEach(p => {
                        mensagem += `   • ${p.codigo} - ${p.nome} (${p.quantidade}/${p.estoque_minimo})`;
                    });
                    if (alertas.criticos.length > 5) {
                        mensagem += `   ... e mais ${alertas.criticos.length - 5}`;
                    }
                    mensagem += '';
                }
                
                if (alertas.baixos.length > 0) {
                    mensagem += `📉 ${alertas.baixos.length} produto(s) com ESTOQUE BAIXO:`;
                    alertas.baixos.slice(0, 5).forEach(p => {
                        mensagem += `   • ${p.codigo} - ${p.nome} (${p.quantidade}/${p.estoque_minimo})`;
                    });
                    if (alertas.baixos.length > 5) {
                        mensagem += `   ... e mais ${alertas.baixos.length - 5}`;
                    }
                }
                
                // Atualizar badge de notificações
                const notificationCount = document.getElementById('notification-count');
                if (notificationCount) {
                    notificationCount.textContent = totalAlertas;
                    notificationCount.style.display = 'block';
                }
                
                console.log(mensagem);
                
                if (typeof showToast === 'function') {
                    showToast(`${totalAlertas} alertas de estoque detectados!`, 'warning');
                }
            } else {
                console.log('✅ Nenhum alerta de estoque');
            }
            
            return alertas;
            
        } catch (error) {
            console.error('Erro ao verificar alertas:', error);
        }
    };

    // =====================================================
    // EVENT LISTENERS
    // =====================================================

    function initEventListeners() {
        const searchInput = document.getElementById('search-produtos');
        if (searchInput) {
            searchInput.addEventListener('keyup', function(e) {
                if (e.key === 'Enter') {
                    buscarProdutosAvancado();
                }
            });
        }
        
        const filterCategoria = document.getElementById('filter-categoria');
        if (filterCategoria) {
            filterCategoria.addEventListener('change', buscarProdutosAvancado);
        }
        
        const filterEstoque = document.getElementById('filter-estoque');
        if (filterEstoque) {
            filterEstoque.addEventListener('change', buscarProdutosAvancado);
        }
        
        // Verificar alertas ao carregar
        setTimeout(verificarAlertasEstoque, 3000);
    }

    // Inicializar quando o DOM estiver pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initEventListeners);
    } else {
        initEventListeners();
    }

    // =====================================================
    // GESTÃO DE PRODUTOS - FUNÇÕES DEDICADAS
    // =====================================================

    window.initGestaoProdutos = async function() {
        console.log('Inicializando Gestão de Produtos...');
        
        // Carregar produtos
        await buscarProdutosGestao();
        
        // Event listeners
        const searchInput = document.getElementById('search-produtos-gestao');
        const categoriaSelect = document.getElementById('filter-categoria-gestao');
        const estoqueSelect = document.getElementById('filter-estoque-gestao');
        
        if (searchInput) {
            searchInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    buscarProdutosGestao();
                }
            });
        }
        
        if (categoriaSelect) {
            categoriaSelect.addEventListener('change', buscarProdutosGestao);
        }
        
        if (estoqueSelect) {
            estoqueSelect.addEventListener('change', buscarProdutosGestao);
        }
        
        // Verificar alertas após carregar
        setTimeout(() => {
            verificarAlertasEstoque();
        }, 2000);
    };

    window.buscarProdutosGestao = async function() {
        const searchTerm = document.getElementById('search-produtos-gestao')?.value.toLowerCase().trim() || '';
        const categoria = document.getElementById('filter-categoria-gestao')?.value || '';
        const estoqueFilter = document.getElementById('filter-estoque-gestao')?.value || '';
        
        console.log('Busca gestão:', { searchTerm, categoria, estoqueFilter });
        
        try {
            // Carregar produtos se não estiverem em cache
            if (produtosCache.length === 0) {
                const response = await fetch(`${API_BASE_URL}/produtos?limit=1000`);
                if (!response.ok) throw new Error('Erro ao buscar produtos');
                const body = await response.json();
                produtosCache = body.rows || [];
            }
            
            let produtosFiltrados = [...produtosCache];
            
            // Filtro por texto
            if (searchTerm) {
                produtosFiltrados = produtosFiltrados.filter(p => {
                    const codigo = (p.codigo || '').toLowerCase();
                    const nome = (p.nome || '').toLowerCase();
                    const descricao = (p.descricao || '').toLowerCase();
                    const sku = (p.sku || '').toLowerCase();
                    const gtin = (p.gtin || '').toLowerCase();
                    return codigo.includes(searchTerm) || nome.includes(searchTerm) || 
                           descricao.includes(searchTerm) || sku.includes(searchTerm) || gtin.includes(searchTerm);
                });
            }
            
            // Filtro por categoria
            if (categoria) {
                produtosFiltrados = produtosFiltrados.filter(p => {
                    const cat = (p.categoria || '').toLowerCase();
                    return cat.includes(categoria);
                });
            }
            
            // Filtro por estoque
            if (estoqueFilter) {
                produtosFiltrados = produtosFiltrados.filter(p => {
                    const status = calcularStatusEstoque(p);
                    return status === estoqueFilter;
                });
            }
            
            // Atualizar estatísticas
            atualizarEstatisticasGestao(produtosCache);
            
            // Renderizar
            renderProdutosGestao(produtosFiltrados);
            
        } catch (error) {
            console.error('Erro ao buscar produtos:', error);
            showToast?.('Erro ao buscar produtos', 'error');
        }
    };

    function atualizarEstatisticasGestao(produtos) {
        const total = produtos.length;
        let baixo = 0, critico = 0, normal = 0;
        
        produtos.forEach(p => {
            const status = calcularStatusEstoque(p);
            if (status === 'critico') critico++;
            else if (status === 'baixo') baixo++;
            else if (status === 'normal') normal++;
        });
        
        document.getElementById('stat-total-produtos-gestao').textContent = total;
        document.getElementById('stat-estoque-baixo-gestao').textContent = baixo;
        document.getElementById('stat-produtos-criticos-gestao').textContent = critico;
        document.getElementById('stat-produtos-ok-gestao').textContent = normal;
    }

    function renderProdutosGestao(produtos) {
        const container = document.getElementById('tabela-produtos-gestao-container');
        if (!container) return;
        
        if (produtos.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 60px 20px; color: #9ca3af;">
                    <i class="fas fa-search" style="font-size: 48px; margin-bottom: 16px;"></i>
                    <p style="font-size: 16px; margin: 0;">Nenhum produto encontrado</p>
                </div>
            `;
            return;
        }
        
        let html = `
            <table style="width: 100%; border-collapse: collapse; background: white;">
                <thead>
                    <tr style="background: #f9fafb; border-bottom: 2px solid #e5e7eb;">
                        <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151;">Código</th>
                        <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151;">Produto</th>
                        <th style="padding: 12px; text-align: center; font-weight: 600; color: #374151;">SKU</th>
                        <th style="padding: 12px; text-align: center; font-weight: 600; color: #374151;">GTIN</th>
                        <th style="padding: 12px; text-align: center; font-weight: 600; color: #374151;">Categoria</th>
                        <th style="padding: 12px; text-align: center; font-weight: 600; color: #374151;">Estoque</th>
                        <th style="padding: 12px; text-align: center; font-weight: 600; color: #374151;">Status</th>
                        <th style="padding: 12px; text-align: center; font-weight: 600; color: #374151;">Ações</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        produtos.forEach(p => {
            const status = calcularStatusEstoque(p);
            const badgeInfo = getStatusBadge(status);
            const estoque = p.estoque_atual || 0;
            
            html += `
                <tr style="border-bottom: 1px solid #e5e7eb; transition: background 0.2s;" onmouseover="this.style.background='#f9fafb'" onmouseout="this.style.background='white'">
                    <td style="padding: 12px;">
                        <span style="font-weight: 600; color: #1f2937;">${p.codigo || 'N/A'}</span>
                    </td>
                    <td style="padding: 12px;">
                        <div style="font-weight: 500; color: #1f2937;">${p.nome || 'Sem nome'}</div>
                        <div style="font-size: 12px; color: #6b7280;">${p.descricao || ''}</div>
                    </td>
                    <td style="padding: 12px; text-align: center;">
                        <span style="font-family: monospace; font-size: 12px; color: #6b7280;">${p.sku || '-'}</span>
                    </td>
                    <td style="padding: 12px; text-align: center;">
                        <span style="font-family: monospace; font-size: 12px; color: #6b7280;">${p.gtin || '-'}</span>
                    </td>
                    <td style="padding: 12px; text-align: center;">
                        <span style="padding: 4px 8px; background: #dbeafe; color: #1e40af; border-radius: 6px; font-size: 12px; font-weight: 500;">
                            ${p.categoria || 'Sem categoria'}
                        </span>
                    </td>
                    <td style="padding: 12px; text-align: center;">
                        <span style="font-weight: 600; color: #1f2937;">${estoque}</span>
                        <span style="font-size: 12px; color: #9ca3af;"> / ${p.estoque_minimo || 0}</span>
                    </td>
                    <td style="padding: 12px; text-align: center;">
                        <span style="padding: 4px 10px; background: ${badgeInfo.bg}; color: ${badgeInfo.color}; border: 1px solid ${badgeInfo.border}; border-radius: 6px; font-size: 12px; font-weight: 600;">
                            ${badgeInfo.icon} ${badgeInfo.label}
                        </span>
                    </td>
                    <td style="padding: 12px; text-align: center;">
                        <button onclick="editarProduto(${p.id})" style="padding: 6px 12px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; margin-right: 4px;" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="excluirProduto(${p.id})" style="padding: 6px 12px; background: #ef4444; color: white; border: none; border-radius: 6px; cursor: pointer;" title="Excluir">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
        
        html += `
                </tbody>
            </table>
        `;
        
        container.innerHTML = html;
    }

    window.filtrarRapidoGestao = function(tipo) {
        const searchInput = document.getElementById('search-produtos-gestao');
        const categoriaSelect = document.getElementById('filter-categoria-gestao');
        const estoqueSelect = document.getElementById('filter-estoque-gestao');
        
        // Resetar filtros
        if (searchInput) searchInput.value = '';
        if (categoriaSelect) categoriaSelect.value = '';
        
        switch (tipo) {
            case 'estoque-baixo':
                if (estoqueSelect) estoqueSelect.value = 'baixo';
                break;
            case 'critico':
                if (estoqueSelect) estoqueSelect.value = 'critico';
                break;
            case 'com-variacao':
                // Filter for products with variations (example logic)
                if (searchInput) searchInput.value = '';
                break;
            case 'todos':
                if (estoqueSelect) estoqueSelect.value = '';
                break;
        }
        
        buscarProdutosGestao();
    };

    // Helper functions (already exist in file, ensuring they're available)
    function calcularStatusEstoque(produto) {
        const estoque = produto.estoque_atual || 0;
        const minimo = produto.estoque_minimo || 0;
        const maximo = produto.estoque_maximo || 999999;
        
        if (estoque === 0 || estoque < minimo * 0.5) return 'critico';
        if (estoque <= minimo) return 'baixo';
        if (estoque >= maximo) return 'alto';
        return 'normal';
    }

    function getStatusBadge(status) {
        const badges = {
            'critico': { icon: '🚨', label: 'CRÍTICO', bg: '#fee2e2', color: '#991b1b', border: '#ef4444' },
            'baixo': { icon: '⚠️', label: 'Baixo', bg: '#fef3c7', color: '#92400e', border: '#fbbf24' },
            'normal': { icon: '✅', label: 'Normal', bg: '#d1fae5', color: '#065f46', border: '#10b981' },
            'alto': { icon: '📦', label: 'Alto', bg: '#dbeafe', color: '#1e40af', border: '#3b82f6' }
        };
        return badges[status] || badges.normal;
    }

})();





