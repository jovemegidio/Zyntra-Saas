// Script para forçar recarregamento das permissões
console.log('🔄 Forçando recarregamento de permissões...');

// Limpar cache
if ('caches' in window) {
    caches.keys().then(names => {
        names.forEach(name => caches.delete(name));
    });
}

// Recarregar email-permissions.js
const script = document.createElement('script');
script.src = '/js/email-permissions.js?v=' + Date.now();
script.onload = () => {
    console.log('✅ email-permissions.js recarregado');
    
    // Buscar dados do usuário e aplicar permissões
    fetch('/api/me', { credentials: 'include' })
        .then(r => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return r.json();
        })
        .then(user => {
            console.log('👤 Usuário:', user.email);
            if (typeof applyModulePermissions === 'function') {
                applyModulePermissions(user);
            }
        })
        .catch(err => console.error('❌ Erro ao carregar permissões:', err));
};
document.head.appendChild(script);
