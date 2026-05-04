/* ========================================
   Zyntra - Gerenciar Usuários
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

    // ========== GET COMPANY FROM URL ==========
    const urlParams = new URLSearchParams(window.location.search);
    const companyId = urlParams.get('empresa') || 'aluforce';

    // Company data map
    const companiesInfo = {
        'aluforce': {
            name: 'ALUFORCE',
            status: 'Ativo',
            logo: 'Icones/Icone Aluforce.jpg'
        },
        'energy': {
            name: 'ENERGY',
            status: 'Ativo',
            logo: null // uses placeholder
        },
        'labor-energy': {
            name: 'LABOR ENERGY',
            status: 'Ativo',
            logo: null
        }
    };

    // Set company info
    const companyInfo = companiesInfo[companyId] || companiesInfo['aluforce'];
    const guCompanyName = document.getElementById('guCompanyName');
    const guCompanyStatus = document.getElementById('guCompanyStatus');
    const guCompanyLogo = document.getElementById('guCompanyLogo');

    if (guCompanyName) guCompanyName.textContent = companyInfo.name;
    if (guCompanyStatus) guCompanyStatus.textContent = companyInfo.status;
    if (guCompanyLogo && companyInfo.logo) {
        guCompanyLogo.innerHTML = `<img src="${companyInfo.logo}" alt="${companyInfo.name}">`;
    } else if (guCompanyLogo && !companyInfo.logo) {
        guCompanyLogo.innerHTML = `
            <div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#6C5CE7,#A29BFE);border-radius:12px;">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            </div>
        `;
    }

    // ========== USERS DATA (per company) ==========
    const usersData = {
        'aluforce': [
            { name: 'Andreia Trovão', email: 'andreia.trovao@laboreletric.com.br', status: 'Aceito', group: 'Administrador' },
            { name: 'Antonio Egidio', email: 'ti@aluforce.ind.br', status: 'Aceito', group: 'Administrador' },
            { name: 'Ariel Silva', email: 'ariel.silva@aluforce.ind.br', status: 'Aceito', group: 'Vendas_Oficial' },
            { name: 'Augusto Santos', email: 'augusto.santos@aluforce.ind.br', status: 'Aceito', group: 'Administrador' },
            { name: 'Clémerson', email: 'pcp@aluforce.ind.br', status: 'Aceito', group: 'Compras, PCP e Painel de Vendas' },
            { name: 'Daniel Henrique Camargo De Brito', email: 'daniel.mkt@aluforce.ind.br', status: 'Aceito', group: 'Administrador' },
            { name: 'Diego Lucena', email: 'diego.lucena@lumiereassessoria.com.br', status: 'Aceito', group: 'Consultoria' },
            { name: 'Douglas', email: 'douglas@laboreletric.com.br', status: 'Aceito', group: 'Administrador' },
            { name: 'Felipe Mendes', email: 'felipe.mendes@aluforce.ind.br', status: 'Pendente', group: 'Vendas_Oficial' },
            { name: 'Marcos Lima', email: 'marcos.lima@aluforce.ind.br', status: 'Aceito', group: 'Financeiro' }
        ],
        'energy': [
            { name: 'Carlos Ferreira', email: 'carlos@energy.com.br', status: 'Aceito', group: 'Administrador' },
            { name: 'Maria Oliveira', email: 'maria@energy.com.br', status: 'Aceito', group: 'Financeiro' },
            { name: 'Roberto Silva', email: 'roberto@energy.com.br', status: 'Aceito', group: 'Vendas_Oficial' },
            { name: 'Juliana Santos', email: 'juliana@energy.com.br', status: 'Pendente', group: 'Administrador' }
        ],
        'labor-energy': [
            { name: 'Pedro Alves', email: 'pedro@laborenergy.com.br', status: 'Aceito', group: 'Administrador' },
            { name: 'Ana Costa', email: 'ana@laborenergy.com.br', status: 'Aceito', group: 'Financeiro' },
            { name: 'Lucas Ramos', email: 'lucas@laborenergy.com.br', status: 'Aceito', group: 'Administrador' }
        ]
    };

    const users = usersData[companyId] || usersData['aluforce'];

    // ========== RENDER TABLE ==========
    const tbody = document.getElementById('usersTableBody');
    const userCount = document.getElementById('userCount');

    function renderUsers(filteredUsers) {
        const usersToRender = filteredUsers || users;

        if (userCount) userCount.textContent = usersToRender.length;

        if (usersToRender.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4">
                        <div class="gu-empty">
                            <div class="gu-empty__icon">
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                            </div>
                            <h3 class="gu-empty__title">Nenhum usuário encontrado</h3>
                            <p class="gu-empty__desc">Tente buscar com outro termo ou convide novos usuários.</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = usersToRender.map((user, index) => `
            <tr data-index="${index}">
                <td>
                    <div class="gu-user-cell">
                        <span class="gu-user-cell__name">${user.name}</span>
                        <span class="gu-user-cell__email">${user.email}</span>
                    </div>
                </td>
                <td>
                    <span class="gu-status-badge ${user.status.toLowerCase()}">${user.status}</span>
                </td>
                <td>
                    <select class="gu-group-select" data-index="${index}">
                        <option value="Administrador" ${user.group === 'Administrador' ? 'selected' : ''}>Administrador</option>
                        <option value="Vendas_Oficial" ${user.group === 'Vendas_Oficial' ? 'selected' : ''}>Vendas_Oficial</option>
                        <option value="Financeiro" ${user.group === 'Financeiro' ? 'selected' : ''}>Financeiro</option>
                        <option value="Consultoria" ${user.group === 'Consultoria' ? 'selected' : ''}>Consultoria</option>
                        <option value="Compras, PCP e Painel de Vendas" ${user.group === 'Compras, PCP e Painel de Vendas' ? 'selected' : ''}>Compras, PCP e Painel de Vendas</option>
                        <option value="Visualizador" ${user.group === 'Visualizador' ? 'selected' : ''}>Visualizador</option>
                    </select>
                </td>
                <td>
                    <div class="gu-actions">
                        <button class="gu-action-icon danger" title="Remover usuário" data-index="${index}">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        // Attach event listeners for group change
        tbody.querySelectorAll('.gu-group-select').forEach(select => {
            select.addEventListener('change', (e) => {
                const idx = parseInt(e.target.dataset.index);
                users[idx].group = e.target.value;
                showToast(`✅ Grupo alterado para "${e.target.value}"`);
            });
        });

        // Attach event listeners for delete
        tbody.querySelectorAll('.gu-action-icon.danger').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(btn.dataset.index);
                const user = users[idx];
                const confirmed = confirm(`Remover o usuário "${user.name}" (${user.email})?`);
                if (confirmed) {
                    users.splice(idx, 1);
                    renderUsers();
                    showToast(`🗑️ Usuário "${user.name}" removido`);
                }
            });
        });
    }

    renderUsers();

    // ========== SEARCH ==========
    const searchInput = document.getElementById('searchUsers');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            if (!query) {
                renderUsers();
                return;
            }
            const filtered = users.filter(u =>
                u.name.toLowerCase().includes(query) ||
                u.email.toLowerCase().includes(query)
            );
            renderUsers(filtered);
        });
    }

    // ========== INVITE USER ==========
    const btnInviteUser = document.getElementById('btnInviteUser');
    if (btnInviteUser) {
        btnInviteUser.addEventListener('click', () => {
            openModal('modalInviteUser');
        });
    }

    const btnSendInvite = document.getElementById('btnSendInvite');
    if (btnSendInvite) {
        btnSendInvite.addEventListener('click', () => {
            const name = document.getElementById('inviteName')?.value.trim();
            const email = document.getElementById('inviteEmail')?.value.trim();
            const group = document.getElementById('inviteGroup')?.value;

            if (!name) {
                showToast('⚠️ Informe o nome do usuário');
                return;
            }
            if (!email || !email.includes('@')) {
                showToast('⚠️ Informe um e-mail válido');
                return;
            }

            users.push({
                name: name,
                email: email,
                status: 'Pendente',
                group: group
            });

            closeModal('modalInviteUser');
            renderUsers();
            showToast(`📧 Convite enviado para ${name} (${email})`);

            // Clear form
            document.getElementById('inviteName').value = '';
            document.getElementById('inviteEmail').value = '';
        });
    }

    // ========== REFRESH ==========
    const btnRefresh = document.getElementById('btnRefresh');
    if (btnRefresh) {
        btnRefresh.addEventListener('click', () => {
            renderUsers();
            showToast('🔄 Lista de usuários atualizada');
        });
    }

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

    window.showToast = showToast;
});


// ========== GLOBAL: MODAL FUNCTIONS ==========
function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.add('open');
        document.body.style.overflow = 'hidden';

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

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.open').forEach(m => {
            m.classList.remove('open');
        });
        document.body.style.overflow = '';
    }
});
