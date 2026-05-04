/* ========================================
   Zyntra - Dashboard "Meus Aplicativos"
   JavaScript - Interactions & Logic
   ======================================== */

document.addEventListener('DOMContentLoaded', () => {

    // ========== AUTH CHECK ==========
    const loggedUser = JSON.parse(localStorage.getItem('zyntra_user'));
    if (!loggedUser) {
        window.location.href = 'login.html';
        return;
    }

    // ========== SET USER INFO ==========
    const userAvatar = document.getElementById('userAvatar');
    const userName = document.getElementById('userName');
    const userFullName = document.getElementById('userFullName');
    const userEmail = document.getElementById('userEmail');

    if (userAvatar) userAvatar.textContent = loggedUser.name.charAt(0).toUpperCase();
    if (userName) userName.textContent = loggedUser.name;
    if (userFullName) userFullName.textContent = loggedUser.fullName;
    if (userEmail) userEmail.textContent = loggedUser.email;

    // Load user photo if available
    if (loggedUser.photo && userAvatar) {
        const img = new Image();
        img.src = 'Fotos Usuarios/' + loggedUser.photo;
        img.alt = loggedUser.name;
        img.onload = () => {
            userAvatar.textContent = '';
            userAvatar.style.overflow = 'hidden';
            img.style.cssText = 'width:100%;height:100%;border-radius:50%;object-fit:cover;';
            userAvatar.appendChild(img);
        };
    }

    // ========== PROMO BANNER CAROUSEL ==========
    const promoSlides = [
        {
            tag: 'Novidade',
            tagIcon: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
            title: 'Treinamentos gratuitos gravados',
            desc: 'Aprenda a utilizar todas as funcionalidades do Zyntra ERP com nossos cursos online gratuitos.',
            btn: 'Assistir agora',
            btnIcon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>'
        },
        {
            tag: 'Zyntra Academy',
            tagIcon: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>',
            title: 'Certificações profissionais',
            desc: 'Torne-se um especialista Zyntra certificado e destaque-se no mercado de trabalho.',
            btn: 'Saiba mais',
            btnIcon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>'
        },
        {
            tag: 'Atualização',
            tagIcon: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>',
            title: 'Novo módulo de BI integrado',
            desc: 'Dashboards inteligentes com indicadores-chave para tomada de decisão em tempo real.',
            btn: 'Explorar',
            btnIcon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>'
        },
        {
            tag: 'Webinar',
            tagIcon: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>',
            title: 'Webinar: Gestão fiscal 2026',
            desc: 'Participe do webinar ao vivo sobre as principais mudanças fiscais e tributárias para 2026.',
            btn: 'Inscreva-se',
            btnIcon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>'
        }
    ];

    let currentSlide = 0;
    const promoContent = document.getElementById('promoContent');
    const promoDots = document.getElementById('promoDots');

    function updatePromo(index) {
        const slide = promoSlides[index];
        promoContent.innerHTML = `
            <div class="promo-slide active" data-slide="${index}">
                <span class="promo-banner__tag">
                    ${slide.tagIcon}
                    ${slide.tag}
                </span>
                <h2 class="promo-banner__title">${slide.title}</h2>
                <p class="promo-banner__desc">${slide.desc}</p>
                <button class="promo-banner__btn">
                    ${slide.btn}
                    ${slide.btnIcon}
                </button>
            </div>
        `;

        // Update dots
        promoDots.querySelectorAll('.promo-dot').forEach((dot, i) => {
            dot.classList.toggle('active', i === index);
        });
    }

    // Dot click
    promoDots.querySelectorAll('.promo-dot').forEach(dot => {
        dot.addEventListener('click', () => {
            currentSlide = parseInt(dot.dataset.slide);
            updatePromo(currentSlide);
        });
    });

    // Auto-rotate every 5 seconds
    setInterval(() => {
        currentSlide = (currentSlide + 1) % promoSlides.length;
        updatePromo(currentSlide);
    }, 5000);


    // ========== SEARCH FUNCTIONALITY ==========
    const searchInput = document.getElementById('searchInput');
    const companyGrid = document.getElementById('companyGrid');
    const companyCards = companyGrid.querySelectorAll('.company-card');
    const companyCount = document.getElementById('companyCount');

    // ========== UNIFIED FILTER (search + category) ==========
    function applyFilters() {
        const query = searchInput.value.toLowerCase().trim();
        const filterEl = document.getElementById('filterPopup');
        const activeFilter = filterEl ? (filterEl.querySelector('.dash-popup__item.active')?.dataset.filter || 'all') : 'all';
        const favs = getFavorites();
        let visibleCount = 0;

        companyCards.forEach(card => {
            const name = card.querySelector('.company-card__name')?.textContent.toLowerCase() || '';
            const cnpj = card.querySelector('.company-card__cnpj')?.textContent.toLowerCase() || '';
            const companyId = card.dataset.company;
            const statusEl = card.querySelector('.company-card__status-text');
            const isActive = statusEl && statusEl.classList.contains('active');
            const isFav = favs[companyId] === true;

            const matchesSearch = name.includes(query) || cnpj.includes(query) || query === '';
            let matchesFilter = true;
            switch (activeFilter) {
                case 'active': matchesFilter = isActive; break;
                case 'favorites': matchesFilter = isFav; break;
                case 'all': default: matchesFilter = true; break;
            }

            const show = matchesSearch && matchesFilter;
            card.style.display = show ? '' : 'none';
            if (show) visibleCount++;
        });

        companyCount.textContent = visibleCount;
    }

    searchInput.addEventListener('input', () => applyFilters());


    // ========== VIEW TOGGLE ==========
    const viewBtns = document.querySelectorAll('.dash-view-btn[data-view]');

    viewBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            viewBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const view = btn.dataset.view;
            if (view === 'list') {
                companyGrid.classList.add('list-view');
            } else if (view === 'grid') {
                companyGrid.classList.remove('list-view');
            }
        });
    });


    // ========== FILTER / SORT POPUPS ==========
    function closeAllPopups() {
        document.querySelectorAll('.dash-popup.open').forEach(p => p.classList.remove('open'));
    }

    // Filter popup
    const btnFilter = document.getElementById('btnFilter');
    const filterPopupEl = document.getElementById('filterPopup');

    if (btnFilter && filterPopupEl) {
        btnFilter.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = filterPopupEl.classList.contains('open');
            closeAllPopups();
            closeAllSettingsDropdowns();
            if (!isOpen) filterPopupEl.classList.add('open');
        });

        filterPopupEl.querySelectorAll('.dash-popup__item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                filterPopupEl.querySelectorAll('.dash-popup__item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                applyFilters();
                closeAllPopups();
            });
        });
    }

    // Sort popup
    const btnSort = document.getElementById('btnSort');
    const sortPopupEl = document.getElementById('sortPopup');
    const originalCardOrder = Array.from(companyGrid.children);

    if (btnSort && sortPopupEl) {
        btnSort.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = sortPopupEl.classList.contains('open');
            closeAllPopups();
            closeAllSettingsDropdowns();
            if (!isOpen) sortPopupEl.classList.add('open');
        });

        sortPopupEl.querySelectorAll('.dash-popup__item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                sortPopupEl.querySelectorAll('.dash-popup__item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                const sortType = item.dataset.sort;

                if (sortType === 'default') {
                    originalCardOrder.forEach(child => companyGrid.appendChild(child));
                } else {
                    const cardsArray = Array.from(companyCards);
                    const otherElements = Array.from(companyGrid.children).filter(el => !el.classList.contains('company-card'));

                    cardsArray.sort((a, b) => {
                        const nameA = a.querySelector('.company-card__name')?.textContent || '';
                        const nameB = b.querySelector('.company-card__name')?.textContent || '';
                        return sortType === 'az' ? nameA.localeCompare(nameB, 'pt-BR') : nameB.localeCompare(nameA, 'pt-BR');
                    });

                    // Rebuild grid: first card, then promo banner, then rest
                    cardsArray.forEach((card, i) => {
                        companyGrid.appendChild(card);
                        if (i === 0 && otherElements.length > 0) {
                            otherElements.forEach(el => companyGrid.appendChild(el));
                        }
                    });
                }

                closeAllPopups();
            });
        });
    }

    // Close popups on outside click
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.dash-popup-wrap')) {
            closeAllPopups();
        }
    });


    // ========== USER DROPDOWN ==========
    const userBtn = document.getElementById('userBtn');
    const userDropdown = document.getElementById('userDropdown');

    userBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        userDropdown.classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
        if (!userDropdown.contains(e.target) && !userBtn.contains(e.target)) {
            userDropdown.classList.remove('open');
        }
    });


    // ========== FAVORITE TOGGLE WITH PERSISTENCE ==========
    function getFavorites() {
        try {
            return JSON.parse(localStorage.getItem('zyntra_favorites')) || {};
        } catch (e) {
            return {};
        }
    }

    function saveFavorites(favs) {
        localStorage.setItem('zyntra_favorites', JSON.stringify(favs));
    }

    // Load saved favorites on page load
    function loadFavorites() {
        const favs = getFavorites();
        document.querySelectorAll('.company-card__favorite').forEach(btn => {
            const card = btn.closest('.company-card');
            const companyId = card ? card.dataset.company : null;
            if (companyId && favs[companyId]) {
                btn.classList.add('active');
                btn.querySelector('svg').setAttribute('fill', 'currentColor');
            } else if (companyId && favs[companyId] === false) {
                btn.classList.remove('active');
                btn.querySelector('svg').setAttribute('fill', 'none');
            }
        });
    }

    loadFavorites();

    document.querySelectorAll('.company-card__favorite').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            btn.classList.toggle('active');
            const isFav = btn.classList.contains('active');
            const card = btn.closest('.company-card');
            const companyId = card ? card.dataset.company : null;

            if (isFav) {
                btn.querySelector('svg').setAttribute('fill', 'currentColor');
                showToast('Empresa adicionada aos favoritos ❤️');
            } else {
                btn.querySelector('svg').setAttribute('fill', 'none');
                showToast('Empresa removida dos favoritos');
            }

            // Persist to localStorage
            if (companyId) {
                const favs = getFavorites();
                favs[companyId] = isFav;
                saveFavorites(favs);
            }
        });
    });


    // ========== SETTINGS DROPDOWN ==========
    function closeAllSettingsDropdowns() {
        document.querySelectorAll('.settings-dropdown.open').forEach(dd => {
            dd.classList.remove('open');
        });
    }

    document.querySelectorAll('.company-card__settings').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const wrap = btn.closest('.company-card__settings-wrap');
            const dropdown = wrap ? wrap.querySelector('.settings-dropdown') : null;
            if (!dropdown) return;

            const isOpen = dropdown.classList.contains('open');
            closeAllSettingsDropdowns();

            if (!isOpen) {
                dropdown.classList.add('open');
            }
        });
    });

    // Close settings dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.company-card__settings-wrap')) {
            closeAllSettingsDropdowns();
        }
    });

    // Settings dropdown actions
    document.querySelectorAll('.settings-dropdown__item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            const action = item.dataset.action;
            const dropdown = item.closest('.settings-dropdown');
            const companyId = dropdown ? dropdown.dataset.company : null;
            const card = dropdown ? dropdown.closest('.company-card') : null;
            const companyName = card ? card.querySelector('.company-card__name')?.textContent : companyId;

            closeAllSettingsDropdowns();

            switch (action) {
                case 'resumo':
                    showToast(`📊 Abrindo resumo de ${companyName}...`);
                    setTimeout(() => {
                        window.location.href = `Empresas/resumo-app.html?empresa=${companyId}`;
                    }, 800);
                    break;

                case 'extrato':
                    showToast(`📄 Abrindo extrato de ${companyName}...`);
                    setTimeout(() => {
                        window.location.href = 'Empresas/extrato-financeiro.html';
                    }, 1000);
                    break;

                case 'users':
                    showToast(`👥 Abrindo gestão de usuários de ${companyName}...`);
                    setTimeout(() => {
                        window.location.href = `Empresas/gerenciar-usuarios.html?empresa=${companyId}`;
                    }, 800);
                    break;

                case 'groups':
                    showToast(`🔐 Abrindo grupos de acesso de ${companyName}...`);
                    setTimeout(() => {
                        window.location.href = `Empresas/grupos-de-acesso.html?empresa=${companyId}`;
                    }, 800);
                    break;

                case 'security':
                    showToast(`🛡️ Abrindo configurações de segurança de ${companyName}...`);
                    setTimeout(() => {
                        window.location.href = `Empresas/seguranca.html?empresa=${companyId}`;
                    }, 800);
                    break;

                case 'terms':
                    showToast(`📋 Abrindo termos de contrato de ${companyName}...`);
                    setTimeout(() => {
                        window.location.href = `Empresas/termos-de-contrato.html?empresa=${companyId}`;
                    }, 800);
                    break;

                default:
                    showToast('Ação não disponível');
            }
        });
    });


    // ========== MOBILE NAV ==========
    const mobileToggle = document.getElementById('mobileToggle');
    const mobileNav = document.getElementById('mobileNav');

    if (mobileToggle) {
        mobileToggle.addEventListener('click', () => {
            mobileNav.classList.toggle('open');
        });

        // Close on click outside
        mobileNav.addEventListener('click', (e) => {
            if (e.target === mobileNav) {
                mobileNav.classList.remove('open');
            }
        });
    }


    // ========== LOGOUT ==========
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            localStorage.removeItem('zyntra_user');
            showToast('Saindo da conta...');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1000);
        });
    }


    // ========== SHOW MORE ==========
    const btnShowMore = document.getElementById('btnShowMore');
    if (btnShowMore) {
        btnShowMore.addEventListener('click', () => {
            showToast('Todas as empresas já estão sendo exibidas');
        });
    }


    // ========== NOVO TESTE GRÁTIS BUTTON ==========
    const btnNewTest = document.getElementById('btnNewTest');
    if (btnNewTest) {
        btnNewTest.addEventListener('click', () => {
            openModal('modalNewTest');
        });
    }


    // ========== COMPRAR NOVO APLICATIVO BUTTON ==========
    const btnNewApp = document.getElementById('btnNewApp');
    if (btnNewApp) {
        btnNewApp.addEventListener('click', () => {
            openModal('modalNewApp');
        });
    }


    // ========== TOAST NOTIFICATION ==========
    const toast = document.getElementById('toast');
    let toastTimeout;

    function showToast(message) {
        clearTimeout(toastTimeout);
        toast.textContent = message;
        toast.classList.add('show');

        toastTimeout = setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    // Make showToast available globally
    window.showToast = showToast;


    // ========== LOAD USER DATA & POPULATE REAL STATS ==========
    const companiesData = {
        companies: [
            {
                id: 'aluforce',
                name: 'ALUFORCE',
                cnpj: '12.345.678/0001-01',
                status: 'active',
                plan: 'Profissional',
                favorite: true,
                nfeMonth: 487
            },
            {
                id: 'energy',
                name: 'ENERGY',
                cnpj: '98.765.432/0001-02',
                status: 'active',
                plan: 'Profissional',
                favorite: false,
                nfeMonth: 312
            },
            {
                id: 'labor-energy',
                name: 'LABOR ENERGY',
                cnpj: '55.123.789/0001-03',
                status: 'active',
                plan: 'Profissional',
                favorite: false,
                nfeMonth: 449
            }
        ],
        systemUptime: 99.8
    };

    function populateStats() {
        const companies = companiesData.companies;
        const activeCompanies = companies.filter(c => c.status === 'active').length;
        const totalNfe = companies.reduce((sum, c) => sum + (c.nfeMonth || 0), 0);

        // Determine plan (use highest plan across companies)
        const planPriority = { 'Starter': 1, 'Profissional': 2, 'Enterprise': 3 };
        let bestPlan = 'Starter';
        companies.forEach(c => {
            if ((planPriority[c.plan] || 0) > (planPriority[bestPlan] || 0)) {
                bestPlan = c.plan;
            }
        });

        // Animated counter effect
        function animateValue(el, start, end, duration, suffix) {
            suffix = suffix || '';
            if (typeof end === 'string') {
                el.textContent = end;
                return;
            }
            const startTime = performance.now();
            function update(currentTime) {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                // easeOutQuart
                const eased = 1 - Math.pow(1 - progress, 4);
                const current = Math.round(start + (end - start) * eased);
                el.textContent = current.toLocaleString('pt-BR') + suffix;
                if (progress < 1) {
                    requestAnimationFrame(update);
                }
            }
            requestAnimationFrame(update);
        }

        const statActive = document.getElementById('statActiveCompanies');
        const statPlan = document.getElementById('statCurrentPlan');
        const statNfe = document.getElementById('statNfeCount');
        const statUptime = document.getElementById('statUptime');

        if (statActive) animateValue(statActive, 0, activeCompanies, 600);
        if (statPlan) statPlan.textContent = bestPlan;
        if (statNfe) animateValue(statNfe, 0, totalNfe, 900);
        if (statUptime) {
            statUptime.textContent = companiesData.systemUptime.toLocaleString('pt-BR', { minimumFractionDigits: 1 }) + '%';
        }

        // Update company count in toolbar
        if (companyCount) companyCount.textContent = activeCompanies;
    }

    populateStats();


    // ========== SHOW MORE: only visible with 5+ companies ==========
    const showMoreContainer = document.getElementById('showMoreContainer');
    function updateShowMore() {
        const totalCompanies = companyGrid.querySelectorAll('.company-card').length;
        if (showMoreContainer) {
            showMoreContainer.style.display = totalCompanies >= 5 ? '' : 'none';
        }
    }
    updateShowMore();

});


// ========== GLOBAL: ACCESS COMPANY ERP ==========
function acessarEmpresa(companyId) {
    const btn = event.target.closest('.company-card__btn');

    // Company routes mapping
    const companyRoutes = {
        'aluforce': 'Empresas/aluforce/painel.html',
        'energy': 'Empresas/energy/painel.html',
        'labor-energy': 'Empresas/labor-energy/painel.html'
    };

    // Loading state
    if (btn) {
        btn.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite;">
                <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
            Carregando...
        `;
        btn.style.pointerEvents = 'none';
    }

    window.showToast(`Acessando ERP da empresa ${companyId.toUpperCase()}...`);

    // Redirect to 404 page (ERP panels under construction)
    setTimeout(() => {
        window.location.href = '404.html';
    }, 1500);
}


// ========== GLOBAL: MODAL FUNCTIONS ==========
function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.add('open');
        document.body.style.overflow = 'hidden';

        // Close on overlay click
        modal.addEventListener('click', function handler(e) {
            if (e.target === modal) {
                closeModal(id);
                modal.removeEventListener('click', handler);
            }
        });
    }
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.remove('open');
        document.body.style.overflow = '';
    }
}

// Close modals on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.open').forEach(m => {
            m.classList.remove('open');
        });
        document.body.style.overflow = '';
    }
});


// ========== GLOBAL: CRIAR TESTE (Redesigned Trial Modal) ==========
function criarTeste() {
    const name = document.getElementById('testCompanyName')?.value.trim();
    const doc = document.getElementById('testDocument')?.value.trim();
    const reason = document.getElementById('testReason')?.value;
    const accepted = document.getElementById('testAcceptTerms')?.checked;

    if (!name) { window.showToast('⚠️ Informe o nome da empresa'); return; }
    if (!doc || doc.length < 11) { window.showToast('⚠️ Informe um CNPJ ou CPF válido'); return; }
    if (!reason) { window.showToast('⚠️ Selecione o motivo da contratação'); return; }
    if (!accepted) { window.showToast('⚠️ Você precisa aceitar os Termos de Contrato'); return; }

    closeModal('modalNewTest');
    window.showToast(`🧪 Criando ambiente de teste para "${name}"...`);

    setTimeout(() => {
        window.showToast(`✅ Teste criado com sucesso! Expira em 7 dias.`);
    }, 2000);
}


// ========== GLOBAL: PURCHASE MULTI-STEP ==========

// Pricing table by revenue
const pricingTable = {
    '81000':   { erp: 119,  multi: 249 },
    '180000':  { erp: 309,  multi: 459 },
    '360000':  { erp: 509,  multi: 659 },
    '720000':  { erp: 709,  multi: 859 },
    '1800000': { erp: 949,  multi: 1099 },
    '4800000': { erp: 949,  multi: 1099 },
    'above':   { erp: 0,    multi: 0 }
};

const revenueLabels = {
    '81000': 'Até R$ 81.000,00',
    '180000': 'Até R$ 180.000,00',
    '360000': 'Até R$ 360.000,00',
    '720000': 'Até R$ 720.000,00',
    '1800000': 'Até R$ 1.800.000,00',
    '4800000': 'Até R$ 4.800.000,00',
    'above': 'A partir de R$ 4.800.000,00'
};

let selectedPlan = 'erp';

function updatePricing() {
    const revenue = document.getElementById('revenueSelect')?.value || '81000';
    const prices = pricingTable[revenue];
    const isAbove = revenue === 'above';

    const planErpPrice = document.getElementById('planErpPrice');
    const planMultiPrice = document.getElementById('planMultiPrice');
    const purchasePlans = document.getElementById('purchasePlans');
    const contactForm = document.getElementById('contactFormHighRevenue');
    const purchaseSummary = document.getElementById('purchaseSummary');
    const btnNext = document.getElementById('btnPurchaseNext');

    if (isAbove) {
        // Show contact form, hide plan cards and summary
        if (purchasePlans) purchasePlans.style.display = 'none';
        if (contactForm) contactForm.style.display = '';
        if (purchaseSummary) purchaseSummary.style.display = 'none';
        if (btnNext) btnNext.style.display = 'none';
    } else {
        if (purchasePlans) purchasePlans.style.display = '';
        if (contactForm) contactForm.style.display = 'none';
        if (purchaseSummary) purchaseSummary.style.display = '';
        if (btnNext) btnNext.style.display = '';

        if (planErpPrice) planErpPrice.textContent = prices.erp;
        if (planMultiPrice) planMultiPrice.textContent = prices.multi;

        updateSummary(revenue);
    }
}

function updateSummary(revenue) {
    revenue = revenue || document.getElementById('revenueSelect')?.value || '81000';
    const prices = pricingTable[revenue];
    const price = selectedPlan === 'erp' ? prices.erp : prices.multi;
    const planName = selectedPlan === 'erp' ? 'Zyntra ERP' : 'Zyntra.Multivarejo';

    const summaryPlan = document.getElementById('summaryPlan');
    const summaryRevenue = document.getElementById('summaryRevenue');
    const summaryTotal = document.getElementById('summaryTotal');

    if (summaryPlan) summaryPlan.textContent = planName;
    if (summaryRevenue) summaryRevenue.textContent = revenueLabels[revenue] || '';
    if (summaryTotal) summaryTotal.textContent = `R$ ${price},00/mês`;
}

function goToPurchaseStep(step) {
    const step1 = document.getElementById('purchaseStep1');
    const step2 = document.getElementById('purchaseStep2');
    const steps = document.querySelectorAll('.purchase-step');

    if (step === 1) {
        step1.style.display = '';
        step2.style.display = 'none';
        steps[0].classList.add('active');
        steps[0].classList.remove('completed');
        steps[1].classList.remove('active');
    } else if (step === 2) {
        step1.style.display = 'none';
        step2.style.display = '';
        steps[0].classList.remove('active');
        steps[0].classList.add('completed');
        steps[1].classList.add('active');
    }
}

function enviarContato() {
    const name = document.getElementById('contactName')?.value.trim();
    const cnpj = document.getElementById('contactCnpj')?.value.trim();
    const email = document.getElementById('contactEmail')?.value.trim();

    if (!name || !cnpj || !email) {
        window.showToast('⚠️ Preencha todos os campos obrigatórios');
        return;
    }

    closeModal('modalNewApp');
    window.showToast('📩 Seus dados foram enviados! Um consultor entrará em contato em breve.');
}

function comprarAplicativo() {
    const name = document.getElementById('regName')?.value.trim();
    const email = document.getElementById('regEmail')?.value.trim();
    const cnpj = document.getElementById('regCnpj')?.value.trim();
    const companyName = document.getElementById('regCompanyName')?.value.trim();

    if (!name) { window.showToast('⚠️ Informe seu nome completo'); return; }
    if (!email) { window.showToast('⚠️ Informe seu e-mail'); return; }
    if (!cnpj) { window.showToast('⚠️ Informe o CNPJ ou CPF'); return; }
    if (!companyName) { window.showToast('⚠️ Informe a Razão Social'); return; }

    closeModal('modalNewApp');

    const planName = selectedPlan === 'erp' ? 'Zyntra ERP' : 'Zyntra.Multivarejo';
    window.showToast(`🛒 Processando compra do ${planName} para "${companyName}"...`);

    setTimeout(() => {
        window.showToast(`✅ Aplicativo adquirido com sucesso!`);
    }, 2500);
}


// ========== PURCHASE MODAL: Event Listeners ==========
document.addEventListener('DOMContentLoaded', () => {
    // Trial terms checkbox → enable/disable submit button
    const testAcceptTerms = document.getElementById('testAcceptTerms');
    const btnTrialSubmit = document.getElementById('btnTrialSubmit');
    if (testAcceptTerms && btnTrialSubmit) {
        testAcceptTerms.addEventListener('change', () => {
            btnTrialSubmit.disabled = !testAcceptTerms.checked;
        });
    }

    // Revenue selector → update pricing
    const revenueSelect = document.getElementById('revenueSelect');
    if (revenueSelect) {
        revenueSelect.addEventListener('change', updatePricing);
    }

    // Plan card selection
    document.querySelectorAll('.plan-card').forEach(card => {
        card.addEventListener('click', () => {
            document.querySelectorAll('.plan-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            selectedPlan = card.dataset.plan;
            updateSummary();
        });
    });

    // "Repeat same data" checkbox in step 2
    const regSameData = document.getElementById('regSameData');
    if (regSameData) {
        regSameData.addEventListener('change', () => {
            if (regSameData.checked) {
                const name = document.getElementById('regName')?.value || '';
                const email = document.getElementById('regEmail')?.value || '';
                const phone = document.getElementById('regPhone')?.value || '';
                document.getElementById('regFinName').value = name;
                document.getElementById('regFinEmail').value = email;
                document.getElementById('regFinPhone').value = phone;
            }
        });
    }

    // CNPJ mask for document fields
    ['testDocument', 'contactCnpj', 'regCnpj'].forEach(fieldId => {
        const input = document.getElementById(fieldId);
        if (input) {
            input.addEventListener('input', (e) => {
                let v = e.target.value.replace(/\D/g, '');
                if (v.length > 14) v = v.slice(0, 14);

                if (v.length <= 11) {
                    // CPF mask
                    if (v.length > 9) v = v.replace(/^(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4');
                    else if (v.length > 6) v = v.replace(/^(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3');
                    else if (v.length > 3) v = v.replace(/^(\d{3})(\d{1,3})/, '$1.$2');
                } else {
                    // CNPJ mask
                    v = v.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{1,2})/, '$1.$2.$3/$4-$5');
                }

                e.target.value = v;
            });
        }
    });

    // Phone masks
    ['regPhone', 'regCompanyPhone', 'regFinPhone', 'contactWhatsApp'].forEach(fieldId => {
        const input = document.getElementById(fieldId);
        if (input) {
            input.addEventListener('input', (e) => {
                let v = e.target.value.replace(/\D/g, '');
                if (v.length > 11) v = v.slice(0, 11);
                if (v.length > 6) v = v.replace(/^(\d{2})(\d{5})(\d{1,4})/, '($1) $2-$3');
                else if (v.length > 2) v = v.replace(/^(\d{2})(\d{1,5})/, '($1) $2');
                e.target.value = v;
            });
        }
    });

    // CEP mask
    const cepInput = document.getElementById('regCep');
    if (cepInput) {
        cepInput.addEventListener('input', (e) => {
            let v = e.target.value.replace(/\D/g, '');
            if (v.length > 8) v = v.slice(0, 8);
            if (v.length > 5) v = v.replace(/^(\d{5})(\d{1,3})/, '$1-$2');
            e.target.value = v;
        });
    }
});
