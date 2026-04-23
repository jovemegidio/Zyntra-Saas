#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Migra modal #modalMeta para o padrao Zyntra (vendas.css classes)"""

path = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra\modules\Vendas\public\dashboard-admin.html'

with open(path, 'rb') as f:
    raw = f.read()

original = raw

# ── 1. Remove bloco CSS .modal-box (linhas ~880..1000)
OLD_CSS = b"""        /* ==================== MODAL DEFINIR META ==================== */
        /* Usando .modal-box para evitar conflito com modal-responsive.css */
        #modalMeta.modal-overlay {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            background: rgba(0, 0, 0, 0.5) !important;
            display: none;
            align-items: center;
            justify-content: center;
            z-index: 10000 !important;
            backdrop-filter: blur(4px);
        }

        #modalMeta.modal-overlay.active {
            display: flex !important;
        }

        .modal-box {
            position: relative;
            background: white;
            border-radius: 16px;
            max-width: 500px;
            width: 90%;
            max-height: 90vh;
            overflow: hidden;
            z-index: 10001;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
            animation: modalSlideIn 0.3s ease;
        }

        @keyframes modalSlideIn {
            from {
                opacity: 0;
                transform: translateY(-20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .modal-box .modal-header {
            padding: 20px 24px;
            border-bottom: 1px solid #e5e7eb;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .modal-box .modal-header h2 {
            font-size: 18px;
            font-weight: 600;
            color: #1a1a1a;
            margin: 0;
        }

        .modal-box .modal-close {
            background: none;
            border: none;
            font-size: 24px;
            color: #6b7280;
            cursor: pointer;
            padding: 0;
            line-height: 1;
            width: auto;
            height: auto;
        }

        .modal-box .modal-close:hover {
            color: #1a1a1a;
        }

        .modal-box .modal-body {
            padding: 24px;
            overflow-y: auto;
        }

        .modal-box .form-group {
            margin-bottom: 20px;
        }

        .modal-box .form-group label {
            display: block;
            font-size: 14px;
            font-weight: 600;
            color: #374151;
            margin-bottom: 8px;
        }

        .modal-box .form-group input, 
        .modal-box .form-group select {
            width: 100%;
            padding: 12px 16px;
            border: 1px solid #d1d5db;
            border-radius: 8px;
            font-size: 14px;
            transition: border-color 0.2s;
        }

        .modal-box .form-group input:focus, 
        .modal-box .form-group select:focus {
            outline: none;
            border-color: var(--primary-orange);
        }

        .modal-box .modal-footer {
            padding: 16px 24px;
            border-top: 1px solid #e5e7eb;
            display: flex;
            justify-content: flex-end;
            gap: 12px;
            flex-direction: row;
        }

        .modal-box .modal-footer button {
            width: auto;
            min-height: auto;
        }"""

if OLD_CSS not in raw:
    print("AVISO: bloco CSS nao encontrado exatamente!")
    # debug: show where modal-box CSS starts
    idx = raw.find(b'.modal-box {')
    print(f"  .modal-box encontrado em byte: {idx}")
    if idx > 0:
        print(repr(raw[idx-200:idx+50]))
else:
    raw = raw.replace(OLD_CSS, b'')
    print("OK: CSS .modal-box removido")

# ── 2. Substituir estrutura HTML do modal
OLD_MODAL = (
    '    <!-- Modal Definir Meta -->\r\n'
    '    <div class="modal-overlay" id="modalMeta">\r\n'
    '        <div class="modal-box">\r\n'
    '            <div class="modal-header">\r\n'
    '                <h2><i class="fas fa-bullseye" style="color: var(--primary-orange); margin-right: 8px;"></i> Definir Nova Meta</h2>\r\n'
    '                <button class="modal-close" onclick="fecharModalMeta()">&times;</button>\r\n'
    '            </div>\r\n'
    '            <div class="modal-body">\r\n'
    '                <div class="form-group">\r\n'
    '                    <label>Tipo de Meta</label>\r\n'
    '                    <select id="tipoMeta">\r\n'
    '                        <option value="vendedor">Meta Individual (Vendedor)</option>\r\n'
    '                        <option value="equipe">Meta da Equipe (Todos Vendedores)</option>\r\n'
    '                    </select>\r\n'
    '                </div>\r\n'
    '                <div class="form-group" id="selectVendedorGroup">\r\n'
    '                    <label>Vendedor</label>\r\n'
    '                    <select id="selectVendedor">\r\n'
    '                        <option value="">Carregando vendedores...</option>\r\n'
    '                    </select>\r\n'
    '                </div>\r\n'
    '                <div class="form-group">\r\n'
    '                    <label>M\u00eas de Refer\u00eancia</label>\r\n'
    '                    <input type="month" id="mesMeta" value="">\r\n'
    '                </div>\r\n'
    '                <div class="form-group">\r\n'
    '                    <label>Valor da Meta (R$)</label>\r\n'
    '                    <input type="text" id="valorMeta" placeholder="Ex: 50000" oninput="formatarValorMeta(this)">\r\n'
    '                </div>\r\n'
    '                <div class="form-group" style="display:none;">\r\n'
    '                    <label>Per\u00edodo</label>\r\n'
    '                    <select id="periodoMeta">\r\n'
    '                        <option value="mensal">Mensal</option>\r\n'
    '                        <option value="trimestral">Trimestral</option>\r\n'
    '                        <option value="anual">Anual</option>\r\n'
    '                    </select>\r\n'
    '                </div>\r\n'
    '            </div>\r\n'
    '            <div class="modal-footer">\r\n'
    '                <button class="btn-secondary" onclick="fecharModalMeta()">Cancelar</button>\r\n'
    '                <button class="btn-primary" onclick="salvarMeta()">\r\n'
    '                    <i class="fas fa-save"></i> Salvar Meta\r\n'
    '                </button>\r\n'
    '            </div>\r\n'
    '        </div>\r\n'
    '    </div>'
).encode('utf-8')

NEW_MODAL = (
    '    <!-- Modal Definir Meta -->\r\n'
    '    <div class="modal-overlay" id="modalMeta">\r\n'
    '        <div class="modal-content modal-small">\r\n'
    '            <div class="modal-header orange">\r\n'
    '                <h2><i class="fas fa-bullseye"></i> Definir Nova Meta</h2>\r\n'
    '                <button class="modal-close" onclick="fecharModalMeta()"><i class="fas fa-times"></i> Fechar</button>\r\n'
    '            </div>\r\n'
    '            <div class="modal-body">\r\n'
    '                <div class="form-group">\r\n'
    '                    <label>Tipo de Meta</label>\r\n'
    '                    <select id="tipoMeta">\r\n'
    '                        <option value="vendedor">Meta Individual (Vendedor)</option>\r\n'
    '                        <option value="equipe">Meta da Equipe (Todos Vendedores)</option>\r\n'
    '                    </select>\r\n'
    '                </div>\r\n'
    '                <div class="form-group" id="selectVendedorGroup">\r\n'
    '                    <label>Vendedor</label>\r\n'
    '                    <select id="selectVendedor">\r\n'
    '                        <option value="">Carregando vendedores...</option>\r\n'
    '                    </select>\r\n'
    '                </div>\r\n'
    '                <div class="form-group">\r\n'
    '                    <label>M\u00eas de Refer\u00eancia</label>\r\n'
    '                    <input type="month" id="mesMeta" value="">\r\n'
    '                </div>\r\n'
    '                <div class="form-group">\r\n'
    '                    <label>Valor da Meta (R$)</label>\r\n'
    '                    <input type="text" id="valorMeta" placeholder="Ex: 50000" oninput="formatarValorMeta(this)">\r\n'
    '                </div>\r\n'
    '                <div class="form-group" style="display:none;">\r\n'
    '                    <label>Per\u00edodo</label>\r\n'
    '                    <select id="periodoMeta">\r\n'
    '                        <option value="mensal">Mensal</option>\r\n'
    '                        <option value="trimestral">Trimestral</option>\r\n'
    '                        <option value="anual">Anual</option>\r\n'
    '                    </select>\r\n'
    '                </div>\r\n'
    '            </div>\r\n'
    '            <div class="modal-footer">\r\n'
    '                <button class="btn-modal btn-modal-cancel" onclick="fecharModalMeta()">Cancelar</button>\r\n'
    '                <button class="btn-modal btn-modal-save" onclick="salvarMeta()"><i class="fas fa-save"></i> Salvar Meta</button>\r\n'
    '            </div>\r\n'
    '        </div>\r\n'
    '    </div>'
).encode('utf-8')

if OLD_MODAL not in raw:
    print("AVISO: HTML do modal nao encontrado exatamente!")
    # debug
    idx = raw.find(b'id="modalMeta"')
    print(f"  #modalMeta encontrado em byte: {idx}")
    if idx > 0:
        print(repr(raw[idx:idx+400]))
else:
    raw = raw.replace(OLD_MODAL, NEW_MODAL)
    print("OK: HTML modal substituido para padrao Zyntra")

with open(path, 'wb') as f:
    f.write(raw)

# Verify
with open(path, 'rb') as f:
    v = f.read()
print(f"modal-content modal-small: {b'modal-content modal-small' in v}")
print(f"modal-header orange: {b'modal-header orange' in v}")
print(f"btn-modal-save: {b'btn-modal-save' in v}")
print(f"modal-box restante: {b'modal-box' in v}")
