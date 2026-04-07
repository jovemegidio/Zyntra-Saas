/**
 * ALUFORCE ERP — Utilitários de Segurança Frontend v1.0
 * Funções globais: escapeHtml, protectedClick, safeFetch
 * Carregue ANTES de qualquer módulo que renderize dados.
 */
(function () {
    'use strict';
    if (window.__aluSafeUtilsLoaded) return;
    window.__aluSafeUtilsLoaded = true;

    // ═══════════════════════════════════════════════════════════
    // 1. escapeHtml — Previne XSS em innerHTML / template literals
    // ═══════════════════════════════════════════════════════════
    function escapeHtml(str) {
        if (str == null) return '';
        var s = String(str);
        var d = document.createElement('div');
        d.textContent = s;
        return d.innerHTML;
    }

    // ═══════════════════════════════════════════════════════════
    // 2. protectedClick — Debounce + loading state em botões
    // ═══════════════════════════════════════════════════════════
    // Uso: <button onclick="protectedClick(this, criarCobranca)">Gerar PIX</button>
    // Ou via JS: protectedClick(btnElement, asyncFunction, [arg1, arg2])
    function protectedClick(btn, fn, args) {
        if (!btn || btn.disabled || btn.dataset.loading === 'true') return;
        btn.dataset.loading = 'true';
        btn.disabled = true;
        var originalText = btn.innerHTML;
        var spinner = '<i class="fas fa-spinner fa-spin"></i> Aguarde...';
        btn.innerHTML = spinner;

        var result;
        try {
            result = fn.apply(null, args || []);
        } catch (e) {
            btn.disabled = false;
            btn.dataset.loading = 'false';
            btn.innerHTML = originalText;
            throw e;
        }

        if (result && typeof result.then === 'function') {
            result.finally(function () {
                btn.disabled = false;
                btn.dataset.loading = 'false';
                btn.innerHTML = originalText;
            });
        } else {
            btn.disabled = false;
            btn.dataset.loading = 'false';
            btn.innerHTML = originalText;
        }
    }

    // ═══════════════════════════════════════════════════════════
    // 3. safeFetch — wrapper que cancela ao navegar + timeout
    // ═══════════════════════════════════════════════════════════
    var _activeControllers = [];

    function safeFetch(url, options, timeoutMs) {
        var controller = new AbortController();
        _activeControllers.push(controller);
        var opts = Object.assign({}, options || {}, { signal: controller.signal });
        var timeout = timeoutMs || 30000;

        var timer = setTimeout(function () { controller.abort(); }, timeout);

        return fetch(url, opts).finally(function () {
            clearTimeout(timer);
            var idx = _activeControllers.indexOf(controller);
            if (idx > -1) _activeControllers.splice(idx, 1);
        });
    }

    // Cancelar requests pendentes ao navegar
    window.addEventListener('beforeunload', function () {
        _activeControllers.forEach(function (c) { try { c.abort(); } catch (e) { /* ignore */ } });
        _activeControllers.length = 0;
    });

    // ═══════════════════════════════════════════════════════════
    // 4. Truncar input — previne payloads gigantes
    // ═══════════════════════════════════════════════════════════
    function enforceMaxLength(selector, max) {
        var m = max || 5000;
        document.querySelectorAll(selector || 'input[type="text"], textarea').forEach(function (el) {
            if (!el.maxLength || el.maxLength < 0 || el.maxLength > m) {
                el.maxLength = m;
            }
        });
    }

    // ═══════════════════════════════════════════════════════════
    // Exportar globalmente
    // ═══════════════════════════════════════════════════════════
    window.escapeHtml = window.escapeHtml || escapeHtml;
    window.protectedClick = protectedClick;
    window.safeFetch = safeFetch;
    window.enforceMaxLength = enforceMaxLength;
})();
