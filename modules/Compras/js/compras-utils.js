/**
 * COMPRAS MODULE - Utilitarios Centralizados
 * @description Biblioteca de funcoes utilitarias para o modulo de Compras
 * @version 2.0.0 - Enterprise Grade
 * @author ALUFORCE Team
 */

(function(global) {
    'use strict';

    // ============================================
    // CONSTANTES E CONFIGURACOES
    // ============================================

    const CONFIG = Object.freeze({
        COLORS: Object.freeze({
            SUCCESS: 'var(--success, #22c55e)',
            ERROR: 'var(--danger, #ef4444)',
            WARNING: 'var(--warning, #f59e0b)',
            INFO: 'var(--info, #3b82f6)',
            PRIMARY: 'var(--compras-primary, #6366f1)'
        }),
        ICONS: Object.freeze({
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        }),
        TOAST_DURATION: 4000,
        API_TIMEOUT: 10000,
        DEBOUNCE_DELAY: 300,
        MAX_TOASTS: 3,
        MAX_RETRY_ATTEMPTS: 3
    });

    // ============================================
    // CLASSE DE TOAST NOTIFICATION
    // ============================================
    class ToastManager {
        constructor() {
            this.toasts = [];
            this.containerId = 'toast-container';
            this._injectStyles();
            this._createContainer();
        }

        _injectStyles() {
            if (document.getElementById('toast-styles')) return;
            const style = document.createElement('style');
            style.id = 'toast-styles';
            style.textContent = `
                @keyframes toastSlideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes toastSlideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
                .toast-container {
                    position: fixed; top: 20px; right: 20px; z-index: 10000;
                    display: flex; flex-direction: column; gap: 10px;
                }
                .toast-notification {
                    display: flex; align-items: center; gap: 12px;
                    padding: 16px 24px; border-radius: 12px; color: white;
                    font-size: 14px; font-weight: 500;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                    animation: toastSlideIn 0.3s ease forwards;
                    max-width: 380px; backdrop-filter: blur(10px);
                }
                .toast-notification.removing { animation: toastSlideOut 0.3s ease forwards; }
                .toast-notification.success { background: var(--success, #22c55e); }
                .toast-notification.error { background: var(--danger, #ef4444); }
                .toast-notification.warning { background: var(--warning, #f59e0b); }
                .toast-notification.info { background: var(--info, #3b82f6); }
            `;
            document.head.appendChild(style);
        }

        _createContainer() {
            if (document.getElementById(this.containerId)) return;
            const container = document.createElement('div');
            container.id = this.containerId;
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        show(message, type = 'info') {
            while (this.toasts.length >= CONFIG.MAX_TOASTS) {
                this._removeToast(this.toasts[0]);
            }
            const toast = document.createElement('div');
            toast.className = `toast-notification ${type}`;
            toast.innerHTML = `
                <i class="fas fa-${CONFIG.ICONS[type] || CONFIG.ICONS.info}"></i>
                <span>${this._escapeHtml(message)}</span>
            `;
            const container = document.getElementById(this.containerId);
            if (container) {
                container.appendChild(toast);
                this.toasts.push(toast);
                setTimeout(() => this._removeToast(toast), CONFIG.TOAST_DURATION);
            }
            return toast;
        }

        _removeToast(toast) {
            if (!toast || !toast.parentNode) return;
            toast.classList.add('removing');
            setTimeout(() => {
                toast.remove();
                this.toasts = this.toasts.filter(t => t !== toast);
            }, 300);
        }

        _escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        success(message) { return this.show(message, 'success'); }
        error(message) { return this.show(message, 'error'); }
        warning(message) { return this.show(message, 'warning'); }
        info(message) { return this.show(message, 'info'); }
    }

    // ============================================
    // API CLIENT
    // ============================================
    class ApiClient {
        constructor(baseUrl = '') {
            this.baseUrl = baseUrl;
        }

        _getAuthHeaders() {
            return { 'Content-Type': 'application/json' };
        }

        async _request(url, options = {}) {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), CONFIG.API_TIMEOUT);
            try {
                const response = await fetch(this.baseUrl + url, {
                    ...options,
                    credentials: 'include',
                    headers: { ...this._getAuthHeaders(), ...options.headers },
                    signal: controller.signal
                });
                clearTimeout(timeoutId);
                if (!response.ok) {
                    const error = await response.json().catch(() => ({}));
                    throw new ApiError(error.message || `HTTP ${response.status}`, response.status);
                }
                return await response.json();
            } catch (error) {
                clearTimeout(timeoutId);
                if (error.name === 'AbortError') {
                    throw new ApiError('Timeout: Servidor nao respondeu', 408);
                }
                throw error;
            }
        }

        get(url) { return this._request(url); }
        post(url, data) { return this._request(url, { method: 'POST', body: JSON.stringify(data) }); }
        put(url, data) { return this._request(url, { method: 'PUT', body: JSON.stringify(data) }); }
        patch(url, data) { return this._request(url, { method: 'PATCH', body: JSON.stringify(data) }); }
        delete(url) { return this._request(url, { method: 'DELETE' }); }
    }

    // ============================================
    // CUSTOM ERRORS
    // ============================================
    class ApiError extends Error {
        constructor(message, statusCode) {
            super(message);
            this.name = 'ApiError';
            this.statusCode = statusCode;
        }
    }

    class ValidationError extends Error {
        constructor(message, field) {
            super(message);
            this.name = 'ValidationError';
            this.field = field;
        }
    }

    // ============================================
    // FORMATADORES
    // ============================================
    const Formatters = {
        moeda(valor) {
            if (valor === null || valor === undefined) return 'R$ 0,00';
            return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
        },
        cnpj(cnpj) {
            if (!cnpj) return '-';
            const clean = cnpj.replace(/\D/g, '');
            if (clean.length !== 14) return cnpj;
            return clean.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
        },
        cpf(cpf) {
            if (!cpf) return '-';
            const clean = cpf.replace(/\D/g, '');
            if (clean.length !== 11) return cpf;
            return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
        },
        telefone(tel) {
            if (!tel) return '-';
            const clean = tel.replace(/\D/g, '');
            if (clean.length === 11) return clean.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
            if (clean.length === 10) return clean.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
            return tel;
        },
        data(data, comHora = false) {
            if (!data) return '-';
            const d = new Date(data);
            if (isNaN(d.getTime())) return '-';
            const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
            if (comHora) { options.hour = '2-digit'; options.minute = '2-digit'; }
            return d.toLocaleDateString('pt-BR', options);
        },
        numero(num, decimais = 0) {
            if (num === null || num === undefined) return '0';
            return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: decimais, maximumFractionDigits: decimais }).format(num);
        },
        truncar(texto, maxLen = 50) {
            if (!texto) return '';
            if (texto.length <= maxLen) return texto;
            return texto.substring(0, maxLen - 3) + '...';
        }
    };

    // ============================================
    // VALIDADORES
    // ============================================
    const Validators = {
        cnpj(cnpj) {
            if (!cnpj) return false;
            const clean = cnpj.replace(/\D/g, '');
            if (clean.length !== 14) return false;
            let tamanho = clean.length - 2;
            let numeros = clean.substring(0, tamanho);
            const digitos = clean.substring(tamanho);
            let soma = 0;
            let pos = tamanho - 7;
            for (let i = tamanho; i >= 1; i--) {
                soma += numeros.charAt(tamanho - i) * pos--;
                if (pos < 2) pos = 9;
            }
            let resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
            if (resultado !== parseInt(digitos.charAt(0))) return false;
            tamanho = tamanho + 1;
            numeros = clean.substring(0, tamanho);
            soma = 0;
            pos = tamanho - 7;
            for (let i = tamanho; i >= 1; i--) {
                soma += numeros.charAt(tamanho - i) * pos--;
                if (pos < 2) pos = 9;
            }
            resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
            return resultado === parseInt(digitos.charAt(1));
        },
        cpf(cpf) {
            if (!cpf) return false;
            const clean = cpf.replace(/\D/g, '');
            if (clean.length !== 11) return false;
            if (/^(\d)\1{10}$/.test(clean)) return false;
            let soma = 0;
            for (let i = 0; i < 9; i++) soma += parseInt(clean.charAt(i)) * (10 - i);
            let resto = (soma * 10) % 11;
            if (resto === 10 || resto === 11) resto = 0;
            if (resto !== parseInt(clean.charAt(9))) return false;
            soma = 0;
            for (let i = 0; i < 10; i++) soma += parseInt(clean.charAt(i)) * (11 - i);
            resto = (soma * 10) % 11;
            if (resto === 10 || resto === 11) resto = 0;
            return resto === parseInt(clean.charAt(10));
        },
        email(email) {
            if (!email) return false;
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        },
        telefone(tel) {
            if (!tel) return false;
            const clean = tel.replace(/\D/g, '');
            return clean.length >= 10 && clean.length <= 11;
        },
        required(value) {
            if (value === null || value === undefined) return false;
            if (typeof value === 'string') return value.trim().length > 0;
            return true;
        },
        minLength(value, min) {
            if (!value) return false;
            return String(value).length >= min;
        },
        maxLength(value, max) {
            if (!value) return true;
            return String(value).length <= max;
        },
        range(value, min, max) {
            const num = parseFloat(value);
            if (isNaN(num)) return false;
            return num >= min && num <= max;
        }
    };

    // ============================================
    // UTILIDADES GERAIS
    // ============================================
    const Utils = {
        debounce(func, wait = CONFIG.DEBOUNCE_DELAY) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => { clearTimeout(timeout); func(...args); };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        },
        throttle(func, limit) {
            let inThrottle;
            return function(...args) {
                if (!inThrottle) {
                    func.apply(this, args);
                    inThrottle = true;
                    setTimeout(() => inThrottle = false, limit);
                }
            };
        },
        escapeHtml(text) {
            if (!text) return '';
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        },
        generateId(prefix = 'id') {
            return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        },
        deepClone(obj) {
            if (obj === null || typeof obj !== 'object') return obj;
            return JSON.parse(JSON.stringify(obj));
        },
        deepMerge(target, ...sources) {
            if (!sources.length) return target;
            const source = sources.shift();
            if (this.isObject(target) && this.isObject(source)) {
                for (const key in source) {
                    if (this.isObject(source[key])) {
                        if (!target[key]) Object.assign(target, { [key]: {} });
                        this.deepMerge(target[key], source[key]);
                    } else {
                        Object.assign(target, { [key]: source[key] });
                    }
                }
            }
            return this.deepMerge(target, ...sources);
        },
        isObject(item) {
            return (item && typeof item === 'object' && !Array.isArray(item));
        },
        getGreeting() {
            const hour = new Date().getHours();
            if (hour >= 5 && hour < 12) return 'Bom dia';
            if (hour >= 12 && hour < 18) return 'Boa tarde';
            return 'Boa noite';
        },
        getInitials(name, count = 2) {
            if (!name) return 'U';
            return name.split(' ').filter(n => n.length > 0).slice(0, count).map(n => n[0].toUpperCase()).join('');
        },
        sleep(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        },
        async retry(fn, attempts = CONFIG.MAX_RETRY_ATTEMPTS, delay = 1000) {
            for (let i = 0; i < attempts; i++) {
                try { return await fn(); }
                catch (error) {
                    if (i === attempts - 1) throw error;
                    await this.sleep(delay * (i + 1));
                }
            }
        }
    };

    // ============================================
    // AVATAR MANAGER
    // ============================================
    class AvatarManager {
        constructor() {
            this.defaultAvatar = '/avatars/default.webp';
            this.fallbackColors = [
                '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
                '#f59e0b', '#22c55e', '#14b8a6', '#3b82f6'
            ];
        }

        render(container, options = {}) {
            const { photoUrl, name = 'Usuario', size = 36, showStatus = false, status = 'offline' } = options;
            const initial = Utils.getInitials(name, 1);
            const bgColor = this._getColorFromName(name);
            container.style.cssText = `
                width: ${size}px; height: ${size}px; border-radius: 50%; overflow: hidden;
                display: flex; align-items: center; justify-content: center;
                background: ${bgColor}; color: white; font-weight: 600;
                font-size: ${Math.floor(size * 0.4)}px; position: relative;
            `;
            if (photoUrl && this._isValidUrl(photoUrl)) {
                const img = document.createElement('img');
                img.alt = name;
                img.style.cssText = 'width:100%;height:100%;object-fit:cover;';
                img.onload = () => {
                    container.innerHTML = '';
                    container.appendChild(img);
                    if (showStatus) this._addStatusBadge(container, status, size);
                };
                img.onerror = () => {
                    container.innerHTML = `<span class="user-initial">${initial}</span>`;
                    if (showStatus) this._addStatusBadge(container, status, size);
                };
                img.src = photoUrl;
            } else {
                container.innerHTML = `<span class="user-initial">${initial}</span>`;
                if (showStatus) this._addStatusBadge(container, status, size);
            }
        }

        _isValidUrl(url) {
            if (!url) return false;
            if (url.includes('undefined') || url.includes('null')) return false;
            if (url === this.defaultAvatar) return true;
            return url.startsWith('/') || url.startsWith('http');
        }

        _getColorFromName(name) {
            if (!name) return this.fallbackColors[0];
            let hash = 0;
            for (let i = 0; i < name.length; i++) {
                hash = name.charCodeAt(i) + ((hash << 5) - hash);
            }
            return this.fallbackColors[Math.abs(hash) % this.fallbackColors.length];
        }

        _addStatusBadge(container, status, size) {
            const badge = document.createElement('span');
            const badgeSize = Math.max(8, Math.floor(size * 0.25));
            const statusColors = { online: '#22c55e', busy: '#ef4444', away: '#f59e0b', offline: '#94a3b8' };
            badge.style.cssText = `
                position: absolute; bottom: 0; right: 0;
                width: ${badgeSize}px; height: ${badgeSize}px;
                background: ${statusColors[status] || statusColors.offline};
                border: 2px solid white; border-radius: 50%;
            `;
            container.appendChild(badge);
        }
    }

    // ============================================
    // EXPORTAR PARA GLOBAL
    // ============================================
    const toast = new ToastManager();
    const api = new ApiClient();
    const avatar = new AvatarManager();

    global.ComprasUtils = {
        CONFIG,
        ToastManager, ApiClient, AvatarManager,
        ApiError, ValidationError,
        Utils, Validators, Formatters,
        toast, api, avatar,
        showToast: (msg, type) => toast.show(msg, type),
        formatMoeda: Formatters.moeda,
        formatData: Formatters.data,
        formatCNPJ: Formatters.cnpj,
        escapeHtml: Utils.escapeHtml,
        debounce: Utils.debounce,
        getGreeting: Utils.getGreeting
    };

    global.mostrarToast = (msg, type) => toast.show(msg, type);

    console.log('[ComprasUtils] Modulo de utilitarios carregado v2.0.0');

})(typeof window !== 'undefined' ? window : this);