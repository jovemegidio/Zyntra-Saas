path = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra\modules\Faturamento\public\index.html'
with open(path, 'rb') as f:
    raw = f.read()

# Exact old modal bytes (from extraction)
old_modal = b'    <!-- Modal Nova NF-e -->\r\n    <div class="modal-overlay" id="modalNovaNovenfe">\r\n        <div class="modal" style="max-width:600px;">\r\n            <div class="modal-header">\r\n                <h3><i class="fas fa-plus-circle"></i> Gerar NF-e a partir de Pedido</h3>\r\n                <button class="modal-close" onclick="fecharModal(\'modalNovaNovenfe\')"><i\r\n                        class="fas fa-times"></i></button>\r\n            </div>\r\n            <div class="modal-body">\r\n                <div class="form-group">\r\n                    <label>Selecione o Pedido Aprovado</label>\r\n                    <select class="form-control" id="pedidoIdSelect" onchange="document.getElementById(\'pedidoId\').value=this.value">\r\n                        <option value="">Carregando pedidos...</option>\r\n                    </select>\r\n                </div>\r\n                <div class="form-group" style="margin-top:8px;">\r\n                    <label style="font-size:12px;color:#6b7280;">Ou informe o ID manualmente</label>\r\n                    <input type="number" class="form-control" id="pedidoId" placeholder="ID do pedido">\r\n                </div>\r\n                <div class="form-row">\r\n                    <div class="form-group">\r\n                        <label><input type="checkbox" id="gerarDanfe" checked> Gerar DANFE automaticamente</label>\r\n                    </div>\r\n                    <div class="form-group">\r\n                        <label><input type="checkbox" id="enviarEmail"> Enviar por e-mail</label>\r\n                    </div>\r\n                </div>\r\n            </div>\r\n            <div class="modal-footer">\r\n                <button class="btn btn-secondary" onclick="fecharModal(\'modalNovaNovenfe\')">Cancelar</button>\r\n                <button class="btn btn-primary" onclick="gerarNFe()"><i class="fas fa-file-invoice"></i> Gerar\r\n                    NF-e</button>\r\n            </div>\r\n        </div>\r\n    </div>\r\n\r\n'

new_modal = b'    <!-- Modal Nova NF-e -->\r\n    <div class="modal-overlay" id="modalNovaNovenfe">\r\n        <div class="modal-content modal-small">\r\n            <div class="modal-header orange">\r\n                <div style="display:flex;align-items:center;gap:10px;">\r\n                    <i class="fas fa-file-invoice" style="font-size:18px;"></i>\r\n                    <span style="font-size:16px;font-weight:700;">Gerar NF-e a partir de Pedido</span>\r\n                </div>\r\n                <button class="modal-close" onclick="fecharModal(\'modalNovaNovenfe\')" title="Fechar">&times;</button>\r\n            </div>\r\n            <div class="modal-body">\r\n                <div class="form-group">\r\n                    <label>Selecione o Pedido Aprovado</label>\r\n                    <select class="form-control" id="pedidoIdSelect" onchange="document.getElementById(\'pedidoId\').value=this.value">\r\n                        <option value="">Carregando pedidos...</option>\r\n                    </select>\r\n                </div>\r\n                <div class="form-group" style="margin-top:8px;">\r\n                    <label style="font-size:12px;color:#6b7280;">Ou informe o ID manualmente</label>\r\n                    <input type="number" class="form-control" id="pedidoId" placeholder="ID do pedido">\r\n                </div>\r\n                <div class="form-row">\r\n                    <div class="form-group">\r\n                        <label><input type="checkbox" id="gerarDanfe" checked> Gerar DANFE automaticamente</label>\r\n                    </div>\r\n                    <div class="form-group">\r\n                        <label><input type="checkbox" id="enviarEmail"> Enviar por e-mail</label>\r\n                    </div>\r\n                </div>\r\n            </div>\r\n            <div class="modal-footer">\r\n                <button class="btn-modal btn-modal-cancel" onclick="fecharModal(\'modalNovaNovenfe\')">Cancelar</button>\r\n                <button class="btn-modal btn-modal-save" onclick="gerarNFe()"><i class="fas fa-file-invoice"></i> Gerar NF-e</button>\r\n            </div>\r\n        </div>\r\n    </div>\r\n\r\n'

count = raw.count(old_modal)
print(f"Modal match count: {count}")

if count == 1:
    raw = raw.replace(old_modal, new_modal)
    
    # Add Zyntra CSS before </style>
    css_block = (
        b'\r\n        /* === Zyntra Modal Standard Pattern === */\r\n'
        b'        .modal-content {\r\n'
        b'            background: #fff;\r\n'
        b'            border-radius: 12px;\r\n'
        b'            width: 90%;\r\n'
        b'            max-width: 520px;\r\n'
        b'            box-shadow: 0 20px 60px rgba(0,0,0,0.18);\r\n'
        b'            animation: modalSlideIn 0.22s ease;\r\n'
        b'            overflow: hidden;\r\n'
        b'        }\r\n'
        b'        .modal-content.modal-small { max-width: 480px; }\r\n'
        b'        .modal-header.orange {\r\n'
        b'            background: linear-gradient(135deg, #f97316, #ea580c);\r\n'
        b'            color: #fff;\r\n'
        b'            padding: 18px 20px;\r\n'
        b'            display: flex;\r\n'
        b'            align-items: center;\r\n'
        b'            justify-content: space-between;\r\n'
        b'            border-radius: 12px 12px 0 0;\r\n'
        b'        }\r\n'
        b'        .modal-header.orange .modal-close {\r\n'
        b'            background: rgba(255,255,255,0.12);\r\n'
        b'            border: none;\r\n'
        b'            color: #fff;\r\n'
        b'            font-size: 20px;\r\n'
        b'            cursor: pointer;\r\n'
        b'            border-radius: 50px;\r\n'
        b'            width: 32px;\r\n'
        b'            height: 32px;\r\n'
        b'            display: flex;\r\n'
        b'            align-items: center;\r\n'
        b'            justify-content: center;\r\n'
        b'            transition: background 0.2s;\r\n'
        b'            flex-shrink: 0;\r\n'
        b'            line-height: 1;\r\n'
        b'        }\r\n'
        b'        .modal-header.orange .modal-close:hover { background: rgba(255,255,255,0.25); }\r\n'
        b'        .modal-content .modal-footer {\r\n'
        b'            background: #f9f9f9;\r\n'
        b'            border-top: 1px solid #f0f0f0;\r\n'
        b'            padding: 14px 20px;\r\n'
        b'            display: flex;\r\n'
        b'            justify-content: flex-end;\r\n'
        b'            gap: 10px;\r\n'
        b'            border-radius: 0 0 12px 12px;\r\n'
        b'        }\r\n'
        b'        .btn-modal {\r\n'
        b'            padding: 9px 22px;\r\n'
        b'            border-radius: 8px;\r\n'
        b'            font-size: 14px;\r\n'
        b'            font-weight: 600;\r\n'
        b'            cursor: pointer;\r\n'
        b'            border: none;\r\n'
        b'            transition: background 0.2s, opacity 0.2s;\r\n'
        b'        }\r\n'
        b'        .btn-modal-cancel { background: #e5e7eb; color: #374151; }\r\n'
        b'        .btn-modal-cancel:hover { background: #d1d5db; }\r\n'
        b'        .btn-modal-save { background: #f97316; color: #fff; }\r\n'
        b'        .btn-modal-save:hover { background: #ea580c; }\r\n'
        b'        @keyframes modalSlideIn {\r\n'
        b'            from { opacity: 0; transform: scale(0.95) translateY(-8px); }\r\n'
        b'            to   { opacity: 1; transform: scale(1) translateY(0); }\r\n'
        b'        }\r\n'
    )
    
    style_close = b'</style>'
    idx = raw.rfind(style_close)
    if idx >= 0:
        raw = raw[:idx] + css_block + raw[idx:]
        print("CSS inserted before </style>")
    else:
        print("WARNING: </style> not found!")
    
    with open(path, 'wb') as f:
        f.write(raw)
    print("Done!")
else:
    print("ERROR: old_modal not found exactly once")
