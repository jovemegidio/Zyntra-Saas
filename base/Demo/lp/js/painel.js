/* ========================================
   Zyntra - Painel de Controle
   JavaScript compartilhado entre painéis
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


    // ========== MOBILE NAV ==========
    const mobileToggle = document.getElementById('mobileToggle');
    if (mobileToggle) {
        mobileToggle.addEventListener('click', () => {
            const links = document.querySelector('.dash-nav__links');
            if (links) links.classList.toggle('mobile-open');
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


    // ========== MODULE CLICK FEEDBACK ==========
    document.querySelectorAll('.painel-module').forEach(mod => {
        mod.addEventListener('click', (e) => {
            e.preventDefault();
            const modName = mod.querySelector('h3')?.textContent || 'Módulo';
            showToast(`Abrindo ${modName}...`);
        });
    });

});
