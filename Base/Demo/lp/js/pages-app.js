/* ========================================
   Zyntra - Pages App JavaScript
   Shared JS for Extrato Financeiro,
   Meus Treinamentos and Zyntra Store
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


    // ========== USER DROPDOWN ==========
    const userBtn = document.getElementById('userBtn');
    const userDropdown = document.getElementById('userDropdown');

    if (userBtn && userDropdown) {
        userBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            userDropdown.classList.toggle('open');
        });

        document.addEventListener('click', (e) => {
            if (!userDropdown.contains(e.target) && !userBtn.contains(e.target)) {
                userDropdown.classList.remove('open');
            }
        });
    }


    // ========== MOBILE NAV ==========
    const mobileToggle = document.getElementById('mobileToggle');
    const mobileNav = document.getElementById('mobileNav');

    if (mobileToggle && mobileNav) {
        mobileToggle.addEventListener('click', () => {
            mobileNav.classList.toggle('open');
        });

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


    // ========== TOAST NOTIFICATION ==========
    const toast = document.getElementById('toast');
    let toastTimeout;

    function showToast(message) {
        if (!toast) return;
        clearTimeout(toastTimeout);
        toast.textContent = message;
        toast.classList.add('show');

        toastTimeout = setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    window.showToast = showToast;


    // ========== EXTRATO FINANCEIRO — FILTERS ==========
    const filterMonth = document.getElementById('filterMonth');
    const filterStatus = document.getElementById('filterStatus');
    const btnExportPdf = document.getElementById('btnExportPdf');

    if (filterMonth) {
        filterMonth.addEventListener('change', () => {
            showToast(`Filtro atualizado: ${filterMonth.options[filterMonth.selectedIndex].text}`);
        });
    }

    if (filterStatus) {
        filterStatus.addEventListener('change', () => {
            showToast(`Status: ${filterStatus.options[filterStatus.selectedIndex].text}`);
        });
    }

    if (btnExportPdf) {
        btnExportPdf.addEventListener('click', () => {
            showToast('📄 Gerando PDF do extrato financeiro...');
            setTimeout(() => {
                showToast('✅ PDF gerado com sucesso!');
            }, 2000);
        });
    }


    // ========== TREINAMENTOS — COURSE BUTTONS ==========
    document.querySelectorAll('.trn-card__btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const card = btn.closest('.trn-card');
            const title = card?.querySelector('.trn-card__title')?.textContent || '';

            if (btn.classList.contains('trn-card__btn--secondary')) {
                showToast(`📜 Baixando certificado: ${title}`);
            } else if (btn.textContent.trim().startsWith('Continuar')) {
                showToast(`▶️ Retomando: ${title}`);
            } else {
                showToast(`🚀 Iniciando curso: ${title}`);
            }
        });
    });


    // ========== ZYNTRA STORE — CATEGORIES ==========
    const storeCats = document.querySelectorAll('.store-cat');
    const storeCards = document.querySelectorAll('.store-card');

    if (storeCats.length > 0) {
        storeCats.forEach(cat => {
            cat.addEventListener('click', () => {
                storeCats.forEach(c => c.classList.remove('active'));
                cat.classList.add('active');

                const selected = cat.dataset.cat;

                storeCards.forEach(card => {
                    if (selected === 'all' || card.dataset.cat === selected) {
                        card.style.display = '';
                    } else {
                        card.style.display = 'none';
                    }
                });
            });
        });
    }


    // ========== ZYNTRA STORE — SEARCH ==========
    const storeSearch = document.getElementById('storeSearch');

    if (storeSearch) {
        storeSearch.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();

            storeCards.forEach(card => {
                const title = card.querySelector('.store-card__body h3')?.textContent.toLowerCase() || '';
                const desc = card.querySelector('.store-card__body p')?.textContent.toLowerCase() || '';

                if (title.includes(query) || desc.includes(query) || query === '') {
                    card.style.display = '';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    }


    // ========== FINANCIAL TABLE — VIEW DETAILS ==========
    document.querySelectorAll('.fin-action-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const row = btn.closest('tr');
            const desc = row?.children[1]?.textContent || '';
            const company = row?.querySelector('.fin-company')?.textContent || '';
            const value = row?.querySelector('.fin-value')?.textContent || '';
            showToast(`📋 ${desc} — ${company}: ${value}`);
        });
    });

});
