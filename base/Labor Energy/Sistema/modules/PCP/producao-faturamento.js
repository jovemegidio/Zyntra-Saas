// =====================================================
// CONTROLE DE PRODUÇÃO E FATURAMENTO - JAVASCRIPT
// =====================================================

(function() {
    'use strict';

    // Estado da aplicação
    let ordensProducao = [];
    let faturamentos = [];
    let currentFilterProducao = 'all';
    let currentFilterFaturamento = 'all';
    let currentMonth = new Date().getMonth();
    let currentYear = new Date().getFullYear();

    // =====================================================
    // CONTROLE DE PRODUÇÃO
    // =====================================================

    function initControleProducao() {
        console.log('🏭 Iniciando Controle de Produção...');
        
        // Event listeners
        document.getElementById('btn-nova-ordem-producao')?.addEventListener('click', abrirModalNovaOrdem);
        
        // Filtros
        document.querySelectorAll('.production-filters .filter-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                document.querySelectorAll('.production-filters .filter-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                currentFilterProducao = this.dataset.status;
                renderOrdensProducao();
            });
        });

        // Busca
        document.getElementById('search-producao')?.addEventListener('input', debounce(buscarProducao, 300));

        // Carregar dados
        loadOrdensProducao();
    }

    async function loadOrdensProducao() {
        try {
            console.log('📦 Carregando ordens de Produção...');
            const response = await fetch('/api/pcp/ordens-producao');
            if (!response.ok) throw new Error('Erro ao carregar ordens');
            
            const result = await response.json();
            ordensProducao = result.data || result || [];
            console.log('✅ Ordens carregadas:', ordensProducao.length);
            
            renderOrdensProducao();
            updateStatsProducao();
        } catch (error) {
            console.error('❌ Erro ao carregar ordens:', error);
            showToast('Erro ao carregar ordens de Produção', 'error');
        }
    }

    function renderOrdensProducao() {
        const container = document.getElementById('lista-ordens-producao');
        if (!container) return;

        const filtered = ordensProducao.filter(ordem => {
            if (currentFilterProducao === 'all') return true;
            return ordem.status === currentFilterProducao;
        });

        if (filtered.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 60px 20px; color: #64748b;">
                    <i class="fas fa-inbox" style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;"></i>
                    <p style="font-size: 16px;">Nenhuma ordem de Produção encontrada</p>
                </div>
            `;
            return;
        }

        const html = filtered.map(ordem => `
            <div class="production-item ${ordem.status}" data-id="${ordem.id}">
                <div class="production-header">
                    <div class="production-info">
                        <div class="production-code">#OP${String(ordem.id).padStart(5, '0')}</div>
                        <div class="production-product">${escapeHtml(ordem.produto_nome || 'Produto não especificado')}</div>
                    </div>
                    <div class="production-status-badge ${ordem.status}">
                        ${getStatusLabel(ordem.status)}
                    </div>
                </div>

                <div class="production-details">
                    <div class="detail-item">
                        <i class="fas fa-calendar"></i>
                        <span>Início: ${formatDate(ordem.data_inicio)}</span>
                    </div>
                    <div class="detail-item">
                        <i class="fas fa-calendar-check"></i>
                        <span>Prazo: ${formatDate(ordem.data_prevista)}</span>
                    </div>
                    <div class="detail-item">
                        <i class="fas fa-boxes"></i>
                        <span>Qtd: ${ordem.quantidade || 0} un</span>
                    </div>
                    <div class="detail-item">
                        <i class="fas fa-user"></i>
                        <span>${escapeHtml(ordem.responsavel || 'não atribuído')}</span>
                    </div>
                </div>

                <div class="production-progress">
                    <div class="progress-label">
                        <span>Progresso</span>
                        <span>${ordem.progresso || 0}%</span>
                    </div>
                    <div class="progress-bar-container">
                        <div class="progress-bar-fill" style="width: ${ordem.progresso || 0}%"></div>
                    </div>
                </div>

                <div class="production-actions">
                    <button class="btn-action btn-view" onclick="window.visualizarOrdem(${ordem.id})">
                        <i class="fas fa-eye"></i> Visualizar
                    </button>
                    <button class="btn-action btn-progress" onclick="window.abrirModalProgresso(${ordem.id})">
                        <i class="fas fa-tasks"></i> Atualizar Progresso
                    </button>
                    <button class="btn-action btn-edit" onclick="window.abrirModalEditarOrdem(${ordem.id})">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                </div>
            </div>
        `).join('');

        container.innerHTML = html;
    }

    function updateStatsProducao() {
        const ativas = ordensProducao.filter(o => o.status !== 'concluido' && o.status !== 'cancelado').length;
        const emProducao = ordensProducao.filter(o => o.status === 'em_producao').length;
        const pendentes = ordensProducao.filter(o => o.status === 'pendente').length;
        
        const hoje = new Date().toISOString().split('T')[0];
        const concluidasHoje = ordensProducao.filter(o => {
            return o.status === 'concluido' && o.data_conclusao && o.data_conclusao.startsWith(hoje);
        }).length;

        document.getElementById('stat-ordens-ativas').textContent = ativas;
        document.getElementById('stat-producao-andamento').textContent = emProducao;
        document.getElementById('stat-ordens-pendentes').textContent = pendentes;
        document.getElementById('stat-producao-concluida').textContent = concluidasHoje;
    }

    function buscarProducao(e) {
        const term = e.target.value.toLowerCase();
        const items = document.querySelectorAll('.production-item');
        
        items.forEach(item => {
            const text = item.textContent.toLowerCase();
            item.style.display = text.includes(term) ? 'block' : 'none';
        });
    }

    function getStatusLabel(status) {
        const labels = {
            'pendente': 'Pendente',
            'em_producao': 'Em Produção',
            'concluido': 'Concluído',
            'cancelado': 'Cancelado'
        };
        return labels[status] || status;
    }

    // =====================================================
    // PROGRAMAÇÃO DE FATURAMENTO
    // =====================================================

    function initFaturamento() {
        console.log('💰 Iniciando Programação de Faturamento...');
        
        // Event listeners
        document.getElementById('btn-novo-faturamento')?.addEventListener('click', abrirModalNovoFaturamento);
        document.getElementById('btn-gerar-nfe')?.addEventListener('click', abrirModalGerarNFe);
        
        // Navegação do calendário
        document.getElementById('btn-prev-month')?.addEventListener('click', () => changeMonth(-1));
        document.getElementById('btn-next-month')?.addEventListener('click', () => changeMonth(1));

        // Filtros
        document.querySelectorAll('.billing-filters .filter-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                document.querySelectorAll('.billing-filters .filter-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                currentFilterFaturamento = this.dataset.status;
                renderFaturamentos();
            });
        });

        // Carregar dados
        loadFaturamentos();
        renderCalendar();
    }

    async function loadFaturamentos() {
        try {
            console.log('💸 Carregando faturamentos...');
            const response = await fetch('/api/pcp/faturamentos');
            if (!response.ok) throw new Error('Erro ao carregar faturamentos');
            
            const result = await response.json();
            faturamentos = result.data || result || [];
            console.log('✅ Faturamentos carregados:', faturamentos.length);
            
            renderFaturamentos();
            renderCalendar();
            updateStatsFaturamento();
        } catch (error) {
            console.error('❌ Erro ao carregar faturamentos:', error);
            showToast('Erro ao carregar faturamentos', 'error');
        }
    }

    function renderFaturamentos() {
        const container = document.getElementById('lista-faturamentos');
        if (!container) return;

        const filtered = faturamentos.filter(fat => {
            if (currentFilterFaturamento === 'all') return true;
            return fat.status === currentFilterFaturamento;
        });

        if (filtered.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px 20px; color: #64748b;">
                    <i class="fas fa-inbox" style="font-size: 36px; margin-bottom: 12px; opacity: 0.5;"></i>
                    <p>Nenhum faturamento encontrado</p>
                </div>
            `;
            return;
        }

        const html = filtered.map(fat => `
            <div class="billing-item ${fat.status}" onclick="window.visualizarFaturamento(${fat.id})">
                <div class="billing-item-header">
                    <span class="billing-number">#${String(fat.numero || fat.id).padStart(6, '0')}</span>
                    <span class="billing-status ${fat.status}">${getStatusLabelFaturamento(fat.status)}</span>
                </div>
                <div class="billing-info">
                    <div><i class="fas fa-building"></i> ${escapeHtml(fat.cliente_nome || 'Cliente não especificado')}</div>
                    <div><i class="fas fa-dollar-sign"></i> R$ ${formatCurrency(fat.valor || 0)}</div>
                    <div><i class="fas fa-calendar"></i> Programado: ${formatDate(fat.data_programada)}</div>
                </div>
            </div>
        `).join('');

        container.innerHTML = html;
    }

    function renderCalendar() {
        const container = document.getElementById('calendar-faturamento');
        if (!container) return;

        const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                           'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        
        document.getElementById('current-month-year').textContent = `${monthNames[currentMonth]} ${currentYear}`;

        const firstDay = new Date(currentYear, currentMonth, 1).getDay();
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        const today = new Date();

        let html = '';
        
        // Dias da semana
        const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        weekDays.forEach(day => {
            html += `<div style="font-weight: 700; color: #64748b; font-size: 12px; text-align: center; padding: 8px 0;">${day}</div>`;
        });

        // Dias vazios
        for (let i = 0; i < firstDay; i++) {
            html += '<div></div>';
        }

        // Dias do mês
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(currentYear, currentMonth, day);
            const dateStr = date.toISOString().split('T')[0];
            const hasBilling = faturamentos.some(f => f.data_programada && f.data_programada.startsWith(dateStr));
            const isToday = date.toDateString() === today.toDateString();
            
            html += `
                <div class="calendar-day ${isToday ? 'today' : ''} ${hasBilling ? 'has-billing' : ''}"
                     onclick="window.verFaturamentosDia('${dateStr}')">
                    ${day}
                    ${hasBilling ? '<span class="calendar-day-badge"></span>' : ''}
                </div>
            `;
        }

        container.innerHTML = html;
    }

    function changeMonth(direction) {
        currentMonth += direction;
        if (currentMonth > 11) {
            currentMonth = 0;
            currentYear++;
        } else if (currentMonth < 0) {
            currentMonth = 11;
            currentYear--;
        }
        renderCalendar();
    }

    function updateStatsFaturamento() {
        const hoje = new Date().toISOString().split('T')[0];
        const faturarHoje = faturamentos.filter(f => f.data_programada && f.data_programada.startsWith(hoje));
        
        document.getElementById('stat-faturar-hoje').textContent = faturarHoje.length;
        
        const valorHoje = faturarHoje.reduce((sum, f) => sum + (parseFloat(f.valor) || 0), 0);
        document.getElementById('valor-faturar-hoje').textContent = formatCurrency(valorHoje);

        const mesAtual = new Date().getMonth();
        const anoAtual = new Date().getFullYear();
        const nfesMes = faturamentos.filter(f => {
            if (!f.data_emissao) return false;
            const data = new Date(f.data_emissao);
            return data.getMonth() === mesAtual && data.getFullYear() === anoAtual;
        }).length;
        document.getElementById('stat-nfe-emitidas').textContent = nfesMes;

        const atrasados = faturamentos.filter(f => {
            if (f.status === 'emitido') return false;
            const programada = new Date(f.data_programada);
            return programada < new Date();
        }).length;
        document.getElementById('stat-faturamento-atrasado').textContent = atrasados;

        const receitaMes = faturamentos
            .filter(f => {
                if (!f.data_emissao) return false;
                const data = new Date(f.data_emissao);
                return data.getMonth() === mesAtual && data.getFullYear() === anoAtual;
            })
            .reduce((sum, f) => sum + (parseFloat(f.valor) || 0), 0);
        document.getElementById('stat-receita-mes').textContent = formatCurrency(receitaMes);
    }

    function getStatusLabelFaturamento(status) {
        const labels = {
            'programado': 'Programado',
            'emitido': 'Emitido',
            'cancelado': 'Cancelado'
        };
        return labels[status] || status;
    }

    // =====================================================
    // FUNÇÕES AUXILIARES
    // =====================================================

    function formatDate(dateStr) {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        return date.toLocaleDateString('pt-BR');
    }

    function formatCurrency(value) {
        return parseFloat(value || 0).toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    function showToast(message, type = 'info') {
        // Reutilizar Função de toast do materiais-functions.js
        if (window.showToast) {
            window.showToast(message, type);
        } else {
            alert(message);
        }
    }

    // =====================================================
    // FUNÇÕES PÚBLICAS (Window)
    // =====================================================

    window.visualizarOrdemProducao = function(id) {
        console.log('👁️ Visualizar ordem:', id);
        showToast('Funcionalidade em desenvolvimento', 'info');
    };

    window.editarOrdemProducao = function(id) {
        console.log('✏️ Editar ordem:', id);
        showToast('Funcionalidade em desenvolvimento', 'info');
    };

    window.atualizarProgressoOrdem = function(id) {
        console.log('📊 Atualizar progresso:', id);
        showToast('Funcionalidade em desenvolvimento', 'info');
    };

    window.visualizarFaturamento = function(id) {
        console.log('👁️ Visualizar faturamento:', id);
        showToast('Funcionalidade em desenvolvimento', 'info');
    };

    window.verFaturamentosDia = function(date) {
        console.log('📅 Ver faturamentos do dia:', date);
        showToast(`Faturamentos programados para ${formatDate(date)}`, 'info');
    };

    function abrirModalNovaOrdem() {
        showToast('Modal de nova ordem em desenvolvimento', 'info');
    }

    function abrirModalNovoFaturamento() {
        showToast('Modal de novo faturamento em desenvolvimento', 'info');
    }

    function abrirModalGerarNFe() {
        showToast('Modal de NF-e em desenvolvimento', 'info');
    }

    // =====================================================
    // INICIALIZAÇÃO
    // =====================================================

    // Detectar quando as views são mostradas
    const producaoView = document.getElementById('controle-producao-view');
    const faturamentoView = document.getElementById('faturamento-view');

    if (producaoView) {
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    const isVisible = !producaoView.classList.contains('hidden');
                    if (isVisible && ordensProducao.length === 0) {
                        console.log('🔄 View de Produção visível, carregando dados...');
                        initControleProducao();
                    }
                }
            });
        });
        observer.observe(producaoView, { attributes: true });
    }

    if (faturamentoView) {
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    const isVisible = !faturamentoView.classList.contains('hidden');
                    if (isVisible && faturamentos.length === 0) {
                        console.log('🔄 View de faturamento visível, carregando dados...');
                        initFaturamento();
                    }
                }
            });
        });
        observer.observe(faturamentoView, { attributes: true });
    }

    console.log('✅ Módulo de Produção e Faturamento carregado');

    // =====================================================
    // FUNÇÕES GLOBAIS PARA OS MODAIS
    // =====================================================

    // Modal Nova Ordem de Produção
    window.abrirModalNovaOrdem = function() {
        const modal = document.getElementById('modal-nova-ordem');
        modal.classList.remove('hidden');
        
        // Gerar código automático
        const proximoNumero = ordensProducao.length + 1;
        const codigo = `OP-${currentYear}-${String(proximoNumero).padStart(3, '0')}`;
        document.getElementById('ordem-codigo').value = codigo;
        
        // Definir data de hoje como data de início
        const hoje = new Date().toISOString().split('T')[0];
        document.getElementById('ordem-data-inicio').value = hoje;
    };

    window.fecharModalNovaOrdem = function() {
        document.getElementById('modal-nova-ordem').classList.add('hidden');
        document.getElementById('form-nova-ordem').reset();
    };

    window.salvarNovaOrdem = async function(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const dados = Object.fromEntries(formData);
        dados.status = 'ativa';
        dados.progresso = 0;
        
        try {
            const response = await fetch('/api/pcp/ordens-producao', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dados)
            });
            
            if (!response.ok) throw new Error('Erro ao criar ordem');
            
            const result = await response.json();
            console.log('✅ Ordem criada:', result);
            
            // Recarregar lista
            await loadOrdensProducao();
            
            // Fechar modal
            fecharModalNovaOrdem();
            
            // Mostrar Notificação (se tiver sistema de toast)
            alert('✅ Ordem de Produção criada com sucesso!');
            
        } catch (error) {
            console.error('❌ Erro ao salvar ordem:', error);
            alert('❌ Erro ao criar ordem de Produção. Tente novamente.');
        }
    };

    // Modal Visualizar Ordem
    window.visualizarOrdem = function(id) {
        const ordem = ordensProducao.find(o => o.id == id);
        if (!ordem) return;
        
        const statusLabels = {
            'ativa': 'Ativa',
            'em_producao': 'Em Produção',
            'pendente': 'Pendente',
            'concluida': 'Concluída',
            'cancelada': 'Cancelada'
        };
        
        const prioridadeLabels = {
            'baixa': '🟢 Baixa',
            'media': '🟡 Média',
            'alta': '🟠 Alta',
            'urgente': '🔴 Urgente'
        };
        
        const content = `
            <div class="ordem-detail-grid">
                <div class="ordem-detail-item">
                    <span class="ordem-detail-label">Código</span>
                    <span class="ordem-detail-value">${ordem.codigo}</span>
                </div>
                <div class="ordem-detail-item">
                    <span class="ordem-detail-label">Status</span>
                    <span class="ordem-detail-value">${statusLabels[ordem.status] || ordem.status}</span>
                </div>
                <div class="ordem-detail-item full-width">
                    <span class="ordem-detail-label">Produto</span>
                    <span class="ordem-detail-value">${ordem.produto_nome}</span>
                </div>
                <div class="ordem-detail-item">
                    <span class="ordem-detail-label">Quantidade</span>
                    <span class="ordem-detail-value">${ordem.quantidade} ${ordem.unidade}</span>
                </div>
                <div class="ordem-detail-item">
                    <span class="ordem-detail-label">Prioridade</span>
                    <span class="ordem-detail-value">${prioridadeLabels[ordem.prioridade] || ordem.prioridade}</span>
                </div>
                <div class="ordem-detail-item">
                    <span class="ordem-detail-label">Data de Início</span>
                    <span class="ordem-detail-value">${formatDate(ordem.data_inicio)}</span>
                </div>
                <div class="ordem-detail-item">
                    <span class="ordem-detail-label">Data Prevista</span>
                    <span class="ordem-detail-value">${formatDate(ordem.data_prevista)}</span>
                </div>
                <div class="ordem-detail-item">
                    <span class="ordem-detail-label">Responsável</span>
                    <span class="ordem-detail-value">${ordem.responsavel || '-'}</span>
                </div>
                <div class="ordem-detail-item">
                    <span class="ordem-detail-label">Progresso</span>
                    <span class="ordem-detail-value">${ordem.progresso}%</span>
                </div>
                <div class="ordem-detail-item full-width">
                    <span class="ordem-detail-label">Observações</span>
                    <span class="ordem-detail-value">${ordem.observacoes || 'Nenhuma observAção'}</span>
                </div>
            </div>
        `;
        
        document.getElementById('visualizar-ordem-content').innerHTML = content;
        document.getElementById('modal-visualizar-ordem').classList.remove('hidden');
    };

    window.fecharModalVisualizarOrdem = function() {
        document.getElementById('modal-visualizar-ordem').classList.add('hidden');
    };

    // Modal Atualizar Progresso
    window.abrirModalProgresso = function(id) {
        const ordem = ordensProducao.find(o => o.id == id);
        if (!ordem) return;
        
        document.getElementById('progresso-ordem-id').value = id;
        document.getElementById('progresso-valor').value = ordem.progresso || 0;
        document.getElementById('progresso-slider').value = ordem.progresso || 0;
        document.getElementById('progresso-status').value = ordem.status;
        
        document.getElementById('modal-atualizar-progresso').classList.remove('hidden');
    };

    window.fecharModalProgresso = function() {
        document.getElementById('modal-atualizar-progresso').classList.add('hidden');
        document.getElementById('form-atualizar-progresso').reset();
    };

    window.salvarProgresso = async function(event) {
        event.preventDefault();
        
        const id = document.getElementById('progresso-ordem-id').value;
        const progresso = document.getElementById('progresso-valor').value;
        const status = document.getElementById('progresso-status').value;
        const observacao = document.getElementById('progresso-observacao').value;
        
        try {
            const response = await fetch(`/api/pcp/ordens-producao/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    progresso: parseFloat(progresso),
                    status: status,
                    observacoes: observacao 
                })
            });
            
            if (!response.ok) throw new Error('Erro ao atualizar progresso');
            
            console.log('✅ Progresso atualizado');
            
            // Recarregar lista
            await loadOrdensProducao();
            
            // Fechar modal
            fecharModalProgresso();
            
            alert('✅ Progresso atualizado com sucesso!');
            
        } catch (error) {
            console.error('❌ Erro ao atualizar progresso:', error);
            alert('❌ Erro ao atualizar progresso. Tente novamente.');
        }
    };

    // Modal Editar Ordem
    window.abrirModalEditarOrdem = function(id) {
        const ordem = ordensProducao.find(o => o.id == id);
        if (!ordem) return;
        
        document.getElementById('editar-ordem-id').value = id;
        document.getElementById('editar-ordem-codigo').value = ordem.codigo;
        document.getElementById('editar-ordem-produto').value = ordem.produto_nome;
        document.getElementById('editar-ordem-quantidade').value = ordem.quantidade;
        document.getElementById('editar-ordem-unidade').value = ordem.unidade;
        document.getElementById('editar-ordem-prioridade').value = ordem.prioridade;
        document.getElementById('editar-ordem-data-inicio').value = ordem.data_inicio ? ordem.data_inicio.split('T')[0] : '';
        document.getElementById('editar-ordem-data-prevista').value = ordem.data_prevista ? ordem.data_prevista.split('T')[0] : '';
        document.getElementById('editar-ordem-responsavel').value = ordem.responsavel || '';
        document.getElementById('editar-ordem-observacoes').value = ordem.observacoes || '';
        
        document.getElementById('modal-editar-ordem').classList.remove('hidden');
    };

    window.fecharModalEditarOrdem = function() {
        document.getElementById('modal-editar-ordem').classList.add('hidden');
        document.getElementById('form-editar-ordem').reset();
    };

    window.salvarEdicaoOrdem = async function(event) {
        event.preventDefault();
        
        const id = document.getElementById('editar-ordem-id').value;
        const formData = new FormData(event.target);
        const dados = Object.fromEntries(formData);
        
        try {
            const response = await fetch(`/api/pcp/ordens-producao/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dados)
            });
            
            if (!response.ok) throw new Error('Erro ao editar ordem');
            
            console.log('✅ Ordem editada');
            
            // Recarregar lista
            await loadOrdensProducao();
            
            // Fechar modal
            fecharModalEditarOrdem();
            
            alert('✅ Ordem editada com sucesso!');
            
        } catch (error) {
            console.error('❌ Erro ao editar ordem:', error);
            alert('❌ Erro ao editar ordem. Tente novamente.');
        }
    };

})();







