path = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra\modules\Faturamento\public\index.html'
with open(path, 'rb') as f:
    raw = f.read()

# Insert <style> block before </head>
css_block = (
    b'    <style>\r\n'
    b'        /* === Zyntra Modal Standard Pattern === */\r\n'
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
    b'    </style>\r\n'
)

head_close = b'</head>'
idx = raw.find(head_close)
if idx >= 0:
    raw = raw[:idx] + css_block + raw[idx:]
    print(f"CSS <style> block inserted before </head> at byte {idx}")
else:
    print("ERROR: </head> not found!")

with open(path, 'wb') as f:
    f.write(raw)

# Verify modal was replaced correctly
new_check = b'modal-content modal-small'
if new_check in raw:
    print("Modal structure: OK (modal-content modal-small found)")
else:
    print("WARNING: modal-content modal-small not found in HTML")

print("Done!")
