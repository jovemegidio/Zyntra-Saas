/**
 * Zyntra ERP - Financeiro: Paginação e Pesquisa Reutilizável
 * Uso: const pg = new FinPagination({ ... });
 */
class FinPagination {
    constructor(opts) {
        this.containerId = opts.containerId || 'fin-pagination';
        this.searchId = opts.searchId || 'fin-search-input';
        this.infoId = opts.infoId || 'fin-page-info';
        this.perPage = opts.perPage || 30;
        this.page = 1;
        this.searchTerm = '';
        this.getData = opts.getData; // fn() => array
        this.renderRows = opts.renderRows; // fn(pageData, allFiltered) => void
        this.searchFields = opts.searchFields || []; // arr of fns: (item) => string
        this.onFilter = opts.onFilter || null; // optional extra filter fn(item, term) => bool
    }

    /** Filtra os dados com base no termo de pesquisa */
    filter(data) {
        if (!this.searchTerm) return data;
        const t = this.searchTerm.toLowerCase();
        return data.filter(item => {
            if (this.searchFields.length > 0) {
                return this.searchFields.some(fn => {
                    const v = fn(item);
                    return v && String(v).toLowerCase().includes(t);
                });
            }
            // fallback: stringify
            return JSON.stringify(item).toLowerCase().includes(t);
        });
    }

    /** Retorna dados paginados */
    paginate(filtered) {
        const total = filtered.length;
        const totalPages = Math.max(1, Math.ceil(total / this.perPage));
        if (this.page > totalPages) this.page = totalPages;
        if (this.page < 1) this.page = 1;
        const start = (this.page - 1) * this.perPage;
        const end = Math.min(start + this.perPage, total);
        return { items: filtered.slice(start, end), total, totalPages, start, end };
    }

    /** Renderiza tudo: filtra + pagina + chama callback + monta controles */
    render() {
        const allData = this.getData();
        const filtered = this.filter(allData);
        const { items, total, totalPages, start, end } = this.paginate(filtered);
        this.renderRows(items, filtered);
        this._renderControls(total, totalPages, start, end);
        this._renderInfo(total, filtered.length, allData.length);
    }

    /** Pesquisar */
    search(term) {
        this.searchTerm = (term || '').trim();
        this.page = 1;
        this.render();
    }

    /** Ir para página */
    goTo(p) {
        this.page = p;
        this.render();
    }

    /** Alterar itens por página */
    setPerPage(n) {
        this.perPage = parseInt(n) || 30;
        this.page = 1;
        this.render();
    }

    /** Gera HTML dos controles de paginação */
    _renderControls(total, totalPages, start, end) {
        const el = document.getElementById(this.containerId);
        if (!el) return;

        if (total === 0) {
            el.innerHTML = '';
            return;
        }

        // Botões de página (max 5 visíveis)
        let pagBtns = '';
        let startP = Math.max(1, this.page - 2);
        let endP = Math.min(totalPages, startP + 4);
        if (endP - startP < 4) startP = Math.max(1, endP - 4);
        const pgId = this.containerId;
        for (let p = startP; p <= endP; p++) {
            pagBtns += `<button class="fp-btn ${p === this.page ? 'active' : ''}" onclick="window._finPg['${pgId}'].goTo(${p})">${p}</button>`;
        }

        el.innerHTML = `
            <div class="fp-row">
                <div class="fp-info">${start + 1}-${end} de ${total}</div>
                <div class="fp-controls">
                    <button class="fp-btn" onclick="window._finPg['${pgId}'].goTo(1)" ${this.page === 1 ? 'disabled' : ''}><i class="fas fa-angle-double-left"></i></button>
                    <button class="fp-btn" onclick="window._finPg['${pgId}'].goTo(${this.page - 1})" ${this.page === 1 ? 'disabled' : ''}><i class="fas fa-angle-left"></i></button>
                    ${pagBtns}
                    <button class="fp-btn" onclick="window._finPg['${pgId}'].goTo(${this.page + 1})" ${this.page === totalPages ? 'disabled' : ''}><i class="fas fa-angle-right"></i></button>
                    <button class="fp-btn" onclick="window._finPg['${pgId}'].goTo(${totalPages})" ${this.page === totalPages ? 'disabled' : ''}><i class="fas fa-angle-double-right"></i></button>
                </div>
                <div class="fp-perpage">
                    <span>Por página:</span>
                    <select onchange="window._finPg['${pgId}'].setPerPage(this.value)">
                        <option value="20" ${this.perPage === 20 ? 'selected' : ''}>20</option>
                        <option value="30" ${this.perPage === 30 ? 'selected' : ''}>30</option>
                        <option value="50" ${this.perPage === 50 ? 'selected' : ''}>50</option>
                    </select>
                </div>
            </div>
        `;
    }

    _renderInfo(total, filteredCount, allCount) {
        const el = document.getElementById(this.infoId);
        if (!el) return;
        if (this.searchTerm && filteredCount !== allCount) {
            el.textContent = `${filteredCount} de ${allCount} registro(s)`;
        } else {
            el.textContent = `${allCount} registro(s)`;
        }
    }

    /** Gera HTML para barra de pesquisa + paginação container */
    static searchBarHTML(searchId, paginationId, infoId, placeholder) {
        return `
        <div class="fp-search-bar">
            <div class="fp-search-wrap">
                <i class="fas fa-search"></i>
                <input type="text" id="${searchId}" placeholder="${placeholder || 'Pesquisar...'}"
                    oninput="window._finPg['${paginationId}'].search(this.value)">
            </div>
            <span class="fp-count" id="${infoId}"></span>
        </div>
        <div class="fp-pagination" id="${paginationId}"></div>
        `;
    }
}

// Registro global para onclick
if (!window._finPg) window._finPg = {};
