path = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra\modules\Faturamento\public\index.html'
with open(path, 'rb') as f:
    raw = f.read()

# 1. Replace the modal HTML structure
old_modal = b'''    <!-- Modal Nova NF-e -->
    <div class="modal-overlay" id="modalNovaNovenfe">
        <div class="modal" style="max-width:600px;">
            <div class="modal-header">
                <h3><i class="fas fa-plus-circle"></i> Gerar NF-e a partir de Pedido</h3>
                <button class="modal-close" onclick="fecharModal(\'modalNovaNovenfe\')"><i
                        class="fas fa-times"></i></button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label>Selecione o Pedido Aprovado</label>
                    <select class="form-control" id="pedidoIdSelect" onchange="document.getElementById(\'pedidoId\').value=this.value">
                        <option value="">Carregando pedidos...</option>
                    </select>
                </div>
                <div class="form-group" style="margin-top:8px;">
                    <label style="font-size:12px;color:#6b7280;">Ou informe o ID manualmente</label>
                    <input type="number" class="form-control" id="pedidoId" placeholder="ID do pedido">
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label><input type="checkbox" id="gerarDanfe" checked> Gerar DANFE automaticamente</label>
                    </div>
                    <div class="form-group">
                        <label><input type="checkbox" id="enviarEmail"> Enviar por e-mail</label>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="fecharModal(\'modalNovaNovenfe\')">Cancelar</button>
                <button class="btn btn-primary" onclick="gerarNFe()"><i class="fas fa-file-invoice"></i> Gerar
                    NF-e</button>
            </div>
        </div>
    </div>'''

new_modal = b'''    <!-- Modal Nova NF-e -->
    <div class="modal-overlay" id="modalNovaNovenfe">
        <div class="modal-content modal-small">
            <div class="modal-header orange">
                <div style="display:flex;align-items:center;gap:10px;">
                    <i class="fas fa-file-invoice" style="font-size:18px;"></i>
                    <span style="font-size:16px;font-weight:700;">Gerar NF-e a partir de Pedido</span>
                </div>
                <button class="modal-close" onclick="fecharModal(\'modalNovaNovenfe\')" title="Fechar">&times;</button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label>Selecione o Pedido Aprovado</label>
                    <select class="form-control" id="pedidoIdSelect" onchange="document.getElementById(\'pedidoId\').value=this.value">
                        <option value="">Carregando pedidos...</option>
                    </select>
                </div>
                <div class="form-group" style="margin-top:8px;">
                    <label style="font-size:12px;color:#6b7280;">Ou informe o ID manualmente</label>
                    <input type="number" class="form-control" id="pedidoId" placeholder="ID do pedido">
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label><input type="checkbox" id="gerarDanfe" checked> Gerar DANFE automaticamente</label>
                    </div>
                    <div class="form-group">
                        <label><input type="checkbox" id="enviarEmail"> Enviar por e-mail</label>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn-modal btn-modal-cancel" onclick="fecharModal(\'modalNovaNovenfe\')">Cancelar</button>
                <button class="btn-modal btn-modal-save" onclick="gerarNFe()"><i class="fas fa-file-invoice"></i> Gerar NF-e</button>
            </div>
        </div>
    </div>'''

count = raw.count(old_modal)
print(f"Modal occurrences: {count}")

if count == 1:
    raw = raw.replace(old_modal, new_modal)
    
    # 2. Add Zyntra modal CSS before </style>
    css_block = b'''
        /* === Zyntra Modal Standard Pattern === */
        .modal-content {
            background: #fff;
            border-radius: 12px;
            width: 90%;
            max-width: 520px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.18);
            animation: modalSlideIn 0.22s ease;
            overflow: hidden;
        }
        .modal-content.modal-small { max-width: 480px; }
        .modal-header.orange {
            background: linear-gradient(135deg, #f97316, #ea580c);
            color: #fff;
            padding: 18px 20px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-radius: 12px 12px 0 0;
        }
        .modal-header.orange .modal-close {
            background: rgba(255,255,255,0.12);
            border: none;
            color: #fff;
            font-size: 18px;
            cursor: pointer;
            border-radius: 50px;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background 0.2s;
            flex-shrink: 0;
        }
        .modal-header.orange .modal-close:hover { background: rgba(255,255,255,0.25); }
        .modal-content .modal-body { padding: 20px 22px; }
        .modal-content .modal-body .form-group { margin-bottom: 14px; }
        .modal-content .modal-body .form-group label { font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 5px; display: block; }
        .modal-content .modal-body .form-group input,
        .modal-content .modal-body .form-group select,
        .modal-content .modal-body .form-group textarea {
            width: 100%; box-sizing: border-box; border: 1.5px solid #e5e7eb; border-radius: 8px;
            padding: 9px 12px; font-size: 14px; color: #111827; transition: border-color 0.2s;
        }
        .modal-content .modal-body .form-group input:focus,
        .modal-content .modal-body .form-group select:focus { border-color: #f97316; outline: none; }
        .modal-content .modal-footer {
            background: #f9f9f9;
            border-top: 1px solid #f0f0f0;
            padding: 14px 20px;
            display: flex;
            justify-content: flex-end;
            gap: 10px;
            border-radius: 0 0 12px 12px;
        }
        .btn-modal {
            padding: 9px 22px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            border: none;
            transition: background 0.2s, opacity 0.2s;
        }
        .btn-modal-cancel { background: #e5e7eb; color: #374151; }
        .btn-modal-cancel:hover { background: #d1d5db; }
        .btn-modal-save { background: #f97316; color: #fff; }
        .btn-modal-save:hover { background: #ea580c; }
        @keyframes modalSlideIn {
            from { opacity: 0; transform: scale(0.95) translateY(-8px); }
            to   { opacity: 1; transform: scale(1) translateY(0); }
        }'''
    
    # Find </style> tag to insert before
    style_close = b'</style>'
    idx = raw.rfind(style_close)
    if idx >= 0:
        raw = raw[:idx] + css_block + b'\n    ' + raw[idx:]
        print("CSS block inserted before </style>")
    else:
        print("WARNING: </style> not found!")
    
    with open(path, 'wb') as f:
        f.write(raw)
    print("Done!")
else:
    print("ERROR: modal not found exactly once, check byte content")
    # Debug: find partial match
    partial = b'<div class="modal" style="max-width:600px;">'
    pidx = raw.find(partial)
    print(f"Partial match at {pidx}: {repr(raw[pidx:pidx+100])}")
