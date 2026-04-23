#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Aplica os 3 fixes:
1. dashboard-admin.html: adiciona CSS para modal (vendas.css nao esta linkado)
2. relatorios.html: corrige URL relatório → relatorio no fetch mapa-brasil
3. comissoes.html: corrige avatar Fabiola.webp → Fabiola.jpg
"""

BASE = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra\modules\Vendas\public'

# ══════════════════════════════════════════════════════════════
# FIX 1: dashboard-admin.html — CSS do modal
# ══════════════════════════════════════════════════════════════
path1 = BASE + r'\dashboard-admin.html'
with open(path1, 'rb') as f:
    raw = f.read()

MODAL_CSS = """
        /* === MODAL META (classes de vendas.css) === */
        .modal-overlay {
            display: none;
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            z-index: 2000;
            align-items: center;
            justify-content: center;
        }
        .modal-overlay.active { display: flex; }
        .modal-content {
            background: white;
            border-radius: 12px;
            width: 95%;
            max-width: 600px;
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: 0 25px 60px rgba(0,0,0,0.3);
            animation: modalMetaSlideIn 0.2s ease;
        }
        @keyframes modalMetaSlideIn {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
        }
        .modal-content.modal-small { max-width: 500px; }
        .modal-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 16px 24px;
            background: #1a2744;
            border-radius: 12px 12px 0 0;
        }
        .modal-header h2 {
            color: white;
            font-size: 16px;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 10px;
            margin: 0;
        }
        .modal-header.orange { background: linear-gradient(135deg, #f97316, #ea580c); }
        .modal-header.orange h2 i { color: white; }
        .modal-header .modal-close {
            background: rgba(255,255,255,0.12);
            border: 1px solid rgba(255,255,255,0.2);
            color: rgba(255,255,255,0.9);
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
            padding: 6px 14px;
            border-radius: 20px;
            display: flex;
            align-items: center;
            gap: 6px;
            transition: all 0.2s ease;
        }
        .modal-header .modal-close:hover {
            background: rgba(255,255,255,0.25);
            color: #fff;
        }
        .modal-body { padding: 24px; }
        .modal-footer {
            display: flex;
            align-items: center;
            justify-content: flex-end;
            gap: 12px;
            padding: 16px 24px;
            border-top: 1px solid #e5e7eb;
            background: #f9f9f9;
            border-radius: 0 0 12px 12px;
        }
        .btn-modal {
            padding: 10px 20px;
            border: none;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .btn-modal-cancel { background: #e5e5e5; color: #333; }
        .btn-modal-cancel:hover { background: #d5d5d5; }
        .btn-modal-save { background: #f97316; color: white; }
        .btn-modal-save:hover { background: #ea580c; }
        .modal-body .form-group { margin-bottom: 16px; }
        .modal-body .form-group label {
            display: block; font-size: 14px; font-weight: 600;
            color: #374151; margin-bottom: 8px;
        }
        .modal-body .form-group input,
        .modal-body .form-group select {
            width: 100%; padding: 10px 14px;
            border: 1px solid #d1d5db; border-radius: 8px;
            font-size: 14px; transition: border-color 0.2s;
            background: white; color: #111;
        }
        .modal-body .form-group input:focus,
        .modal-body .form-group select:focus {
            outline: none; border-color: #f97316;
        }""".encode('utf-8')

# Insert before </style>
close_style = b'    </style>'
if close_style in raw:
    raw = raw.replace(close_style, MODAL_CSS + b'\r\n' + close_style, 1)
    print("OK: CSS modal adicionado ao dashboard-admin.html")
else:
    print("AVISO: </style> nao encontrado!")

with open(path1, 'wb') as f:
    f.write(raw)

# ══════════════════════════════════════════════════════════════
# FIX 2: relatorios.html — URL relatório → relatorio
# ══════════════════════════════════════════════════════════════
path2 = BASE + r'\relatorios.html'
with open(path2, 'rb') as f:
    raw2 = f.read()

old_url = '/api/vendas/relat\u00f3rio/mapa-brasil'.encode('utf-8')
new_url = b'/api/vendas/relatorio/mapa-brasil'

if old_url in raw2:
    raw2 = raw2.replace(old_url, new_url)
    with open(path2, 'wb') as f:
        f.write(raw2)
    print("OK: URL relatorio corrigida em relatorios.html")
else:
    print("AVISO: URL relatório nao encontrada em relatorios.html")

# ══════════════════════════════════════════════════════════════
# FIX 3: comissoes.html — Fabiola.webp → Fabiola.jpg
# ══════════════════════════════════════════════════════════════
path3 = BASE + r'\comissoes.html'
with open(path3, 'rb') as f:
    raw3 = f.read()

old_fab = b"'fabiola': '/avatars/Fabiola.webp'"
new_fab = b"'fabiola': '/avatars/Fabiola.jpg'"

if old_fab in raw3:
    raw3 = raw3.replace(old_fab, new_fab)
    with open(path3, 'wb') as f:
        f.write(raw3)
    print("OK: avatar Fabiola corrigido para Fabiola.jpg em comissoes.html")
else:
    print("AVISO: 'fabiola': '/avatars/Fabiola.webp' nao encontrado!")
    # try to find what's there
    idx = raw3.find(b'fabiola')
    if idx >= 0:
        print(f"  encontrado: {repr(raw3[idx:idx+60])}")
