/* ========================================
   Zyntra - App Settings Pages
   Shared JS for Resumo, Grupos de Acesso,
   Segurança, Termos de Contrato
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

    if (userAvatar) userAvatar.textContent = loggedUser.name.charAt(0).toUpperCase();
    if (userName) userName.textContent = loggedUser.name;

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

    // ========== TOAST ==========
    const toast = document.getElementById('toast');
    let toastTimeout;

    function showToast(message) {
        if (!toast) return;
        clearTimeout(toastTimeout);
        toast.textContent = message;
        toast.classList.add('show');
        toastTimeout = setTimeout(() => { toast.classList.remove('show'); }, 3000);
    }
    window.showToast = showToast;


    // ========== COMPANY CONTEXT ==========
    const params = new URLSearchParams(window.location.search);
    const empresa = params.get('empresa') || 'aluforce';

    // Populate company info if present
    const companyNames = {
        'aluforce': 'ALUFORCE',
        'energy': 'ENERGY',
        'labor-energy': 'LABOR ENERGY'
    };

    const companyName = document.getElementById('companyName');
    if (companyName) companyName.textContent = companyNames[empresa] || empresa.toUpperCase();


    // ========== TAB NAVIGATION (update links with empresa param) ==========
    document.querySelectorAll('.app-tabs a').forEach(link => {
        const href = link.getAttribute('href');
        if (href && !href.includes('empresa=')) {
            const sep = href.includes('?') ? '&' : '?';
            link.setAttribute('href', href + sep + 'empresa=' + empresa);
        }
    });


    // ========== INVOICE TABLE (for resumo-app.html) ==========
    const invoiceTableBody = document.getElementById('invoiceTableBody');
    if (invoiceTableBody) {
        const invoices = [
            { date: '13/02/2026', num: 'NFS-242577', value: 'R$ 2.998,00', type: 'NFS-e', status: 'Pago', statusClass: 'green' },
            { date: '13/01/2026', num: 'NFS-236714', value: 'R$ 2.998,00', type: 'NFS-e', status: 'Pago', statusClass: 'green' },
            { date: '13/12/2025', num: 'NFS-230859', value: 'R$ 2.998,00', type: 'NFS-e', status: 'Pago', statusClass: 'green' },
            { date: '13/11/2025', num: 'NFS-225003', value: 'R$ 2.998,00', type: 'NFS-e', status: 'Pago', statusClass: 'green' },
            { date: '13/10/2025', num: 'NFS-219147', value: 'R$ 2.998,00', type: 'NFS-e', status: 'Pago', statusClass: 'green' },
        ];

        invoices.forEach(inv => {
            invoiceTableBody.innerHTML += `<tr>
                <td>${inv.date}</td>
                <td>${inv.num}</td>
                <td>${inv.value}</td>
                <td>${inv.type}</td>
                <td><span class="badge ${inv.statusClass}">${inv.status}</span></td>
                <td><button style="font-size:11px;color:var(--primary);background:none;border:none;cursor:pointer;font-family:var(--font);font-weight:600;">⬇ Download</button></td>
            </tr>`;
        });
    }


    // ========== API KEY TOGGLE (for resumo-app.html) ==========
    document.querySelectorAll('.app-api-toggle').forEach(btn => {
        btn.addEventListener('click', () => {
            const row = btn.closest('.app-api-row');
            const valueEl = row.querySelector('.app-api-value');
            if (!valueEl) return;

            const realValue = valueEl.dataset.value || valueEl.textContent;
            const isHidden = valueEl.textContent.includes('•');

            if (isHidden) {
                valueEl.dataset.value = valueEl.textContent;
                valueEl.textContent = generateRandomKey();
                btn.textContent = 'Ocultar';
            } else {
                valueEl.textContent = valueEl.dataset.value || '••••••••••••••••';
                btn.textContent = 'Mostrar';
            }
        });
    });

    function generateRandomKey() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < 20; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
        return result;
    }

});
