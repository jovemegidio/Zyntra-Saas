/**
 * ZYNTRA ERP — Toast Notifications
 * Sistema unificado de feedbacks visuais (toasts) para todo o sistema.
 * Substitui alert(), confirm() e mensagens de erro genéricas.
 *
 * API:
 *   ZyntraToast.success('Salvo com sucesso!', { duration: 3000 })
 *   ZyntraToast.error('Erro ao salvar.', { detail: 'Mensagem técnica' })
 *   ZyntraToast.warning('Atenção: campo obrigatório.')
 *   ZyntraToast.info('NF-e em processamento pela SEFAZ.')
 *   ZyntraToast.fiscal(cStat, xMotivo)  — Retorno SEFAZ formatado
 *   ZyntraToast.clear()                 — Remove todos os toasts
 *
 * Versão: 1.0 | Data: 2026-05-01
 */
(function () {
    'use strict';

    // ── CSS INLINE ─────────────────────────────────────────────────
    const TOAST_CSS = `
#zc-toast-container {
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 99999;
    display: flex;
    flex-direction: column;
    gap: 10px;
    pointer-events: none;
    max-width: 400px;
    width: calc(100vw - 48px);
}

.zc-toast {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 14px 16px;
    border-radius: 10px;
    background: #fff;
    box-shadow: 0 8px 24px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.08);
    border: 1px solid #e2e8f0;
    pointer-events: all;
    animation: zcToastIn 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards;
    transition: opacity 0.25s ease, transform 0.25s ease;
    position: relative;
    overflow: hidden;
    font-family: 'Inter', -apple-system, sans-serif;
    font-size: 13px;
    color: #1e293b;
    min-width: 260px;
}

.zc-toast::before {
    content: '';
    position: absolute;
    left: 0; top: 0; bottom: 0;
    width: 4px;
    border-radius: 10px 0 0 10px;
}

.zc-toast-progress {
    position: absolute;
    bottom: 0; left: 0;
    height: 3px;
    border-radius: 0 0 0 10px;
    animation: zcProgress linear forwards;
    transform-origin: left;
}

.zc-toast.leaving {
    animation: zcToastOut 0.25s ease forwards;
}

.zc-toast-icon {
    width: 32px; height: 32px;
    border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    font-size: 14px;
    flex-shrink: 0;
    margin-top: 1px;
}

.zc-toast-body {
    flex: 1;
    min-width: 0;
}

.zc-toast-title {
    font-weight: 600;
    font-size: 13px;
    line-height: 1.4;
    margin-bottom: 2px;
}

.zc-toast-message {
    font-size: 12px;
    color: #64748b;
    line-height: 1.5;
    margin: 0;
}

.zc-toast-detail {
    font-size: 11px;
    color: #94a3b8;
    margin-top: 4px;
    font-family: 'JetBrains Mono', monospace;
    background: #f8fafc;
    padding: 4px 8px;
    border-radius: 4px;
    border: 1px solid #e2e8f0;
    word-break: break-all;
}

.zc-toast-close {
    width: 24px; height: 24px;
    border: none;
    background: transparent;
    color: #94a3b8;
    cursor: pointer;
    border-radius: 4px;
    display: flex; align-items: center; justify-content: center;
    font-size: 12px;
    flex-shrink: 0;
    padding: 0;
    transition: background 0.15s, color 0.15s;
}
.zc-toast-close:hover { background: #f1f5f9; color: #475569; }

/* Variantes */
.zc-toast.success::before    { background: #22c55e; }
.zc-toast.success .zc-toast-icon    { background: #f0fdf4; color: #16a34a; }
.zc-toast.success .zc-toast-progress { background: #22c55e; }

.zc-toast.error::before      { background: #ef4444; }
.zc-toast.error .zc-toast-icon      { background: #fef2f2; color: #dc2626; }
.zc-toast.error .zc-toast-progress  { background: #ef4444; }

.zc-toast.warning::before    { background: #f59e0b; }
.zc-toast.warning .zc-toast-icon    { background: #fffbeb; color: #d97706; }
.zc-toast.warning .zc-toast-progress { background: #f59e0b; }

.zc-toast.info::before       { background: #06b6d4; }
.zc-toast.info .zc-toast-icon       { background: #ecfeff; color: #0891b2; }
.zc-toast.info .zc-toast-progress   { background: #06b6d4; }

.zc-toast.fiscal::before     { background: #8b5cf6; }
.zc-toast.fiscal .zc-toast-icon     { background: #ede9fe; color: #7c3aed; }
.zc-toast.fiscal .zc-toast-progress { background: #8b5cf6; }

@keyframes zcToastIn {
    from { opacity: 0; transform: translateX(30px) scale(0.95); }
    to   { opacity: 1; transform: translateX(0) scale(1); }
}

@keyframes zcToastOut {
    from { opacity: 1; transform: translateX(0) scale(1); max-height: 120px; margin-bottom: 0; }
    to   { opacity: 0; transform: translateX(20px) scale(0.95); max-height: 0; margin-bottom: -10px; padding-top: 0; padding-bottom: 0; }
}

@keyframes zcProgress {
    from { width: 100%; }
    to   { width: 0%; }
}

@media (max-width: 480px) {
    #zc-toast-container {
        bottom: 16px;
        right: 16px;
        left: 16px;
        width: auto;
    }
}
    `;

    // ── ÍCONES ─────────────────────────────────────────────────────
    const ICONS = {
        success: '<i class="fas fa-check"></i>',
        error:   '<i class="fas fa-times"></i>',
        warning: '<i class="fas fa-exclamation-triangle"></i>',
        info:    '<i class="fas fa-info"></i>',
        fiscal:  '<i class="fas fa-file-invoice"></i>',
    };

    // ── MAPA DE REJEIÇÕES SEFAZ ────────────────────────────────────
    const SEFAZ_STATUS = {
        '100': { tipo: 'success', titulo: 'NF-e Autorizada',          msg: 'Nota fiscal autorizada com sucesso pela SEFAZ.' },
        '102': { tipo: 'info',    titulo: 'Numeração Inutilizada',     msg: 'Numeração inutilizada com sucesso.' },
        '103': { tipo: 'info',    titulo: 'Em Processamento',          msg: 'Lote recebido pela SEFAZ. Aguardando processamento assíncrono.' },
        '104': { tipo: 'info',    titulo: 'Lote Processado',           msg: 'Lote processado com erros. Consulte os itens individualmente.' },
        '107': { tipo: 'success', titulo: 'SEFAZ Online',              msg: 'Serviço da SEFAZ está disponível.' },
        '108': { tipo: 'warning', titulo: 'SEFAZ Paralisada',          msg: 'Serviço da SEFAZ temporariamente paralisado. Tente mais tarde.' },
        '109': { tipo: 'warning', titulo: 'SEFAZ com Gargalo',         msg: 'Serviço da SEFAZ operando com lentidão. Tente mais tarde.' },
        '110': { tipo: 'error',   titulo: 'XML Duplicado',             msg: 'XML enviado já foi processado nos últimos 10 minutos. Evite reenvio.' },
        '111': { tipo: 'error',   titulo: 'Autenticação Falhou',       msg: 'Falha de autenticação. Verifique o certificado digital.' },
        '112': { tipo: 'warning', titulo: 'Timeout SEFAZ',             msg: 'Timeout na comunicação com a SEFAZ. Tente novamente em instantes.' },
        '135': { tipo: 'success', titulo: 'Evento Registrado',         msg: 'Evento (cancelamento / CC-e) registrado com sucesso pela SEFAZ.' },
        '136': { tipo: 'success', titulo: 'Manifestação Registrada',   msg: 'Manifestação do destinatário registrada com sucesso.' },
        '203': { tipo: 'error',   titulo: 'Emitente Não Habilitado',   msg: 'CNPJ do emitente não está habilitado para emissão de NF-e.' },
        '204': { tipo: 'error',   titulo: 'NF-e Duplicada',            msg: 'Esta NF-e já foi autorizada com o mesmo número. Verifique a numeração.' },
        '205': { tipo: 'error',   titulo: 'NF-e Denegada',             msg: 'NF-e denegada pela SEFAZ. Irregularidade fiscal no emitente ou destinatário.' },
        '207': { tipo: 'error',   titulo: 'CNPJ Emitente Inválido',    msg: 'O CNPJ do emitente não confere com o certificado digital.' },
        '214': { tipo: 'error',   titulo: 'Tamanho do XML Inválido',   msg: 'O XML da NF-e excede o tamanho máximo permitido.' },
        '225': { tipo: 'error',   titulo: 'Falha no Schema',           msg: 'O XML não está em conformidade com o schema XSD da SEFAZ.' },
        '228': { tipo: 'error',   titulo: 'Data de Emissão Inválida',  msg: 'A data de emissão está fora do período de tolerância permitido.' },
        '233': { tipo: 'error',   titulo: 'Partição de UF Inválida',   msg: 'A NF-e foi enviada para a UF errada. Verifique o autorizador.' },
        '238': { tipo: 'error',   titulo: 'Caract. Inválidos no XML',  msg: 'O XML contém caracteres inválidos. Verifique acentuação e símbolos.' },
        '241': { tipo: 'error',   titulo: 'Versão do Schema Inválida', msg: 'Versão do schema não suportada. Use a versão 4.00.' },
        '301': { tipo: 'error',   titulo: 'IE Inválida',               msg: 'Inscrição Estadual do emitente inválida para o estado.' },
        '302': { tipo: 'error',   titulo: 'IE Destinatário Inválida',  msg: 'Inscrição Estadual do destinatário inválida.' },
        '325': { tipo: 'error',   titulo: 'NCM Inválido',              msg: 'Código NCM inválido ou não encontrado na tabela TIPI.' },
        '357': { tipo: 'error',   titulo: 'CFOP Inválido',             msg: 'CFOP inválido ou inconsistente com a operação.' },
        '360': { tipo: 'error',   titulo: 'Valor Total Divergente',    msg: 'O valor total da NF-e diverge da soma dos itens.' },
        '409': { tipo: 'error',   titulo: 'Chave de Acesso Inválida',  msg: 'A chave de acesso da NF-e não é válida.' },
        '999': { tipo: 'error',   titulo: 'Erro Interno SEFAZ',        msg: 'Erro interno na SEFAZ. Tente mais tarde ou consulte o suporte.' },
    };

    // ── CONTAINER ─────────────────────────────────────────────────
    let _container = null;
    let _styleInjected = false;

    function getContainer() {
        if (!_container || !document.body.contains(_container)) {
            _container = document.getElementById('zc-toast-container');
            if (!_container) {
                _container = document.createElement('div');
                _container.id = 'zc-toast-container';
                document.body.appendChild(_container);
            }
        }
        return _container;
    }

    function injectStyle() {
        if (_styleInjected) return;
        const style = document.createElement('style');
        style.id = 'zc-toast-style';
        style.textContent = TOAST_CSS;
        document.head.appendChild(style);
        _styleInjected = true;
    }

    // ── CRIAR TOAST ────────────────────────────────────────────────
    function create(tipo, titulo, mensagem, opcoes) {
        injectStyle();

        opcoes = opcoes || {};
        const duration = opcoes.duration != null ? opcoes.duration : (tipo === 'error' ? 8000 : 4000);
        const detail   = opcoes.detail || null;

        const toast = document.createElement('div');
        toast.className = 'zc-toast ' + tipo;

        const progressStyle = duration > 0
            ? 'animation-duration:' + duration + 'ms;'
            : 'display:none;';

        const detailHTML = detail
            ? '<div class="zc-toast-detail">' + escapeHtml(detail) + '</div>'
            : '';

        toast.innerHTML =
            '<div class="zc-toast-icon">' + (ICONS[tipo] || ICONS.info) + '</div>' +
            '<div class="zc-toast-body">' +
            '  <div class="zc-toast-title">' + escapeHtml(titulo) + '</div>' +
            (mensagem ? '<p class="zc-toast-message">' + escapeHtml(mensagem) + '</p>' : '') +
            detailHTML +
            '</div>' +
            '<button class="zc-toast-close" aria-label="Fechar"><i class="fas fa-times"></i></button>' +
            '<div class="zc-toast-progress" style="' + progressStyle + '"></div>';

        const closeBtn = toast.querySelector('.zc-toast-close');
        closeBtn.addEventListener('click', function () { remove(toast); });

        getContainer().appendChild(toast);

        if (duration > 0) {
            setTimeout(function () { remove(toast); }, duration);
        }

        return toast;
    }

    function remove(toast) {
        if (!toast || !toast.parentNode) return;
        toast.classList.add('leaving');
        setTimeout(function () {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 300);
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    // ── API PÚBLICA ────────────────────────────────────────────────
    window.ZyntraToast = {
        /**
         * Toast de sucesso
         * @param {string} mensagem
         * @param {object} [opcoes] { duration, detail }
         */
        success: function (mensagem, opcoes) {
            return create('success', 'Sucesso', mensagem, opcoes);
        },

        /**
         * Toast de erro
         * @param {string} mensagem
         * @param {object} [opcoes] { duration, detail }
         */
        error: function (mensagem, opcoes) {
            return create('error', 'Erro', mensagem, opcoes);
        },

        /**
         * Toast de aviso
         * @param {string} mensagem
         * @param {object} [opcoes] { duration, detail }
         */
        warning: function (mensagem, opcoes) {
            return create('warning', 'Atenção', mensagem, opcoes);
        },

        /**
         * Toast informativo
         * @param {string} mensagem
         * @param {object} [opcoes] { duration, detail }
         */
        info: function (mensagem, opcoes) {
            return create('info', 'Informação', mensagem, opcoes);
        },

        /**
         * Toast com título personalizado
         * @param {string} tipo — 'success' | 'error' | 'warning' | 'info'
         * @param {string} titulo
         * @param {string} mensagem
         * @param {object} [opcoes]
         */
        custom: function (tipo, titulo, mensagem, opcoes) {
            return create(tipo || 'info', titulo, mensagem, opcoes);
        },

        /**
         * Toast de retorno da SEFAZ
         * Formata o cStat e xMotivo de forma clara e amigável.
         * @param {string|number} cStat   — código de status SEFAZ
         * @param {string} xMotivo        — motivo retornado pela SEFAZ
         * @param {object} [opcoes]
         */
        fiscal: function (cStat, xMotivo, opcoes) {
            const stat = SEFAZ_STATUS[String(cStat)];
            const tipo   = stat ? stat.tipo : 'error';
            const titulo = stat ? stat.titulo : ('SEFAZ cStat ' + cStat);
            const msg    = stat ? stat.msg : (xMotivo || 'Resposta da SEFAZ sem descrição detalhada.');
            const detail = xMotivo && xMotivo !== msg ? 'SEFAZ: [' + cStat + '] ' + xMotivo : null;

            return create(tipo, titulo, msg, Object.assign({}, opcoes, { detail: detail }));
        },

        /**
         * Toast de erro HTTP
         * @param {number} status — código HTTP
         * @param {string} [detalhe] — mensagem extra (não exposta diretamente ao usuário)
         */
        httpError: function (status, detalhe) {
            const msgs = {
                400: 'Requisição inválida. Verifique os dados informados.',
                401: 'Sessão expirada. Faça login novamente.',
                403: 'Acesso negado. Você não tem permissão para esta ação.',
                404: 'Recurso não encontrado.',
                409: 'Conflito: este registro já existe ou está em uso.',
                422: 'Dados inválidos. Verifique os campos obrigatórios.',
                429: 'Muitas requisições. Aguarde um momento e tente novamente.',
                500: 'Erro interno do servidor. Tente novamente em instantes.',
                502: 'Servidor temporariamente indisponível.',
                503: 'Serviço indisponível. Tente novamente em breve.',
            };
            const msg = msgs[status] || ('Erro ' + status + '. Tente novamente.');
            return create('error', 'Erro ' + status, msg, { detail: detalhe || null });
        },

        /** Remover todos os toasts visíveis */
        clear: function () {
            const container = getContainer();
            const toasts = container.querySelectorAll('.zc-toast');
            toasts.forEach(function (t) { remove(t); });
        },

        /**
         * Tratamento unificado de erro de fetch/API
         * Uso: fetch(...).catch(ZyntraToast.fromFetchError)
         * @param {Response|Error} errOrResponse
         */
        fromFetchError: function (errOrResponse) {
            if (!errOrResponse) {
                ZyntraToast.error('Erro de conexão. Verifique sua internet.');
                return;
            }
            // Response com status
            if (typeof errOrResponse.status === 'number') {
                ZyntraToast.httpError(errOrResponse.status);
                return;
            }
            // Network error
            if (errOrResponse instanceof TypeError) {
                ZyntraToast.error('Sem conexão com o servidor. Verifique a rede.');
                return;
            }
            ZyntraToast.error(errOrResponse.message || 'Erro desconhecido.');
        },

        /** Expõe o mapa completo de status SEFAZ para uso externo */
        SEFAZ_STATUS: SEFAZ_STATUS,
    };

    // Compatibilidade com código legado que usa showToast()
    window.showToast = function (mensagem, tipo) {
        tipo = tipo || 'info';
        if (tipo === 'success') return ZyntraToast.success(mensagem);
        if (tipo === 'error')   return ZyntraToast.error(mensagem);
        if (tipo === 'warning') return ZyntraToast.warning(mensagem);
        return ZyntraToast.info(mensagem);
    };

})();
