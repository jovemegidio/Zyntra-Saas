/**
 * User Profile Loader - Aluforce ERP
 * Carrega dados do perfil do usuário logado e atualiza a interface
 */
(function() {
    'use strict';
    
    async function loadUserProfile() {
        try {
            const res = await fetch('/api/auth/me', {
                credentials: 'include',
                headers: { 'Accept': 'application/json' }
            });
            if (!res.ok) return null;
            const data = await res.json();
            const user = data.user || data;
            
            // Update profile elements
            document.querySelectorAll('[data-user-name]').forEach(el => {
                el.textContent = user.nome || user.username || '';
            });
            document.querySelectorAll('[data-user-email]').forEach(el => {
                el.textContent = user.email || '';
            });
            document.querySelectorAll('[data-user-role]').forEach(el => {
                el.textContent = user.role || '';
            });
            document.querySelectorAll('[data-user-avatar]').forEach(el => {
                if (user.foto || user.avatar) {
                    el.src = user.foto || user.avatar;
                }
            });
            
            return user;
        } catch (e) {
            console.warn('[UserProfile] Erro ao carregar perfil:', e.message);
            return null;
        }
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadUserProfile);
    } else {
        loadUserProfile();
    }
    
    window.UserProfileLoader = { load: loadUserProfile };
})();
