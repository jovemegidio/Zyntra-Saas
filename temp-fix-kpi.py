#!/usr/bin/env python3
"""Update all pages with KPI counters to match the Compras module visual standard.

Compras standard features:
- Left colored border (4px ::before pseudo-element)  
- Icon in colored badge (48px, gradient bg)
- Minimize button (—) at top-right
- Large number (30px, 800 weight)
- Label (13px, gray)
- Action footer link with arrow
- Subtle background gradient per color
"""
import re, os

BASE = r'G:\Outros computadores\Meu laptop (2)\Zyntra'

# Standard Compras CSS for stat cards
COMPRAS_STAT_CSS = """
    /* ===== COMPRAS STANDARD — STAT CARDS ===== */
    .stats-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 20px;
        margin-bottom: 24px;
    }
    @media (max-width: 1100px) { .stats-grid { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 600px) { .stats-grid { grid-template-columns: 1fr; } }

    .stat-card {
        background: white;
        border-radius: 16px;
        padding: 24px 24px 20px 28px;
        border: 1px solid #f0f0f5;
        box-shadow: 0 1px 3px rgba(0,0,0,0.04);
        position: relative;
        overflow: hidden;
        transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .stat-card:hover {
        transform: translateY(-3px);
        box-shadow: 0 12px 28px rgba(0,0,0,0.08), 0 4px 10px rgba(0,0,0,0.03);
        border-color: #e8e8f0;
    }
    .stat-card::before {
        content: '';
        position: absolute;
        top: 12px; left: 0; bottom: 12px;
        width: 4px;
        border-radius: 0 4px 4px 0;
    }
    .stat-card.amber::before { background: linear-gradient(180deg, #f59e0b, #fbbf24); }
    .stat-card.indigo::before { background: linear-gradient(180deg, #6366f1, #818cf8); }
    .stat-card.green::before { background: linear-gradient(180deg, #10b981, #34d399); }
    .stat-card.purple::before { background: linear-gradient(180deg, #8b5cf6, #a78bfa); }
    .stat-card.red::before { background: linear-gradient(180deg, #ef4444, #f87171); }
    .stat-card.blue::before { background: linear-gradient(180deg, #3b82f6, #60a5fa); }
    .stat-card.teal::before { background: linear-gradient(180deg, #14b8a6, #2dd4bf); }

    .stat-card.amber { background: linear-gradient(135deg, #fffbeb 0%, white 40%); }
    .stat-card.indigo { background: linear-gradient(135deg, #eef2ff 0%, white 40%); }
    .stat-card.green { background: linear-gradient(135deg, #ecfdf5 0%, white 40%); }
    .stat-card.purple { background: linear-gradient(135deg, #f5f3ff 0%, white 40%); }
    .stat-card.red { background: linear-gradient(135deg, #fef2f2 0%, white 40%); }
    .stat-card.blue { background: linear-gradient(135deg, #eff6ff 0%, white 40%); }
    .stat-card.teal { background: linear-gradient(135deg, #f0fdfa 0%, white 40%); }

    .stat-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 16px;
    }
    .stat-icon {
        width: 48px; height: 48px;
        border-radius: 14px;
        display: flex; align-items: center; justify-content: center;
        font-size: 20px; flex-shrink: 0;
        box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    }
    .stat-icon.amber { background: linear-gradient(135deg, #fef3c7, #fde68a); color: #b45309; }
    .stat-icon.indigo { background: linear-gradient(135deg, #e0e7ff, #c7d2fe); color: #4338ca; }
    .stat-icon.green { background: linear-gradient(135deg, #d1fae5, #a7f3d0); color: #047857; }
    .stat-icon.purple { background: linear-gradient(135deg, #ede9fe, #ddd6fe); color: #6d28d9; }
    .stat-icon.red { background: linear-gradient(135deg, #fee2e2, #fecaca); color: #b91c1c; }
    .stat-icon.blue { background: linear-gradient(135deg, #dbeafe, #bfdbfe); color: #1d4ed8; }
    .stat-icon.teal { background: linear-gradient(135deg, #ccfbf1, #99f6e4); color: #0f766e; }

    .stat-trend {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 3px 10px;
        border-radius: 20px;
        font-size: 11px;
        font-weight: 600;
        color: #9ca3af;
        cursor: pointer;
    }
    .stat-value {
        font-size: 30px;
        font-weight: 800;
        color: #111827;
        margin-bottom: 4px;
        letter-spacing: -0.03em;
        line-height: 1.1;
    }
    .stat-label {
        color: #6b7280;
        font-size: 13px;
        font-weight: 500;
        line-height: 1.3;
        letter-spacing: 0.01em;
    }
    .stat-footer {
        margin-top: 14px;
        padding-top: 12px;
        border-top: 1px solid #f3f4f6;
    }
    .stat-footer a {
        color: #6b7280;
        text-decoration: none;
        font-size: 12px;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 6px;
        transition: gap 0.2s;
    }
    .stat-footer a:hover { gap: 10px; color: #374151; }
"""

def make_card(color, icon, value_id, label, footer_text=None, footer_href=None):
    """Generate a single stat-card HTML."""
    footer = ''
    if footer_text and footer_href:
        footer = f'''
                    <div class="stat-footer">
                        <a href="{footer_href}">{footer_text} <i class="fas fa-arrow-right"></i></a>
                    </div>'''
    return f'''                <div class="stat-card {color}">
                    <div class="stat-header">
                        <div class="stat-icon {color}"><i class="fas {icon}"></i></div>
                        <span class="stat-trend">&mdash;</span>
                    </div>
                    <div class="stat-value" id="{value_id}">--</div>
                    <div class="stat-label">{label}</div>{footer}
                </div>'''

def make_grid(cards):
    """Generate the full stats-grid HTML."""
    cards_html = '\n'.join(cards)
    return f'''            <div class="stats-grid">
{cards_html}
            </div>'''

# ============================================================
# Page configurations
# ============================================================

PAGES = {
    'modules/RH/public/pages/ferias.html': {
        'cards': [
            ('amber', 'fa-hourglass-half', 'kpi-pendentes', 'Pendentes', 'Ver pendentes', '#'),
            ('green', 'fa-check-circle', 'kpi-aprovadas', 'Aprovadas (mês)', 'Ver aprovadas', '#'),
            ('red', 'fa-times-circle', 'kpi-reprovadas', 'Reprovadas (mês)', None, None),
            ('purple', 'fa-calendar-exclamation', 'kpi-vencendo', 'Vencendo em 30 dias', None, None),
        ],
        'old_pattern': r'<div class="grid-4">\s*(?:<div class="kpi">.*?</div>\s*)+</div>',
    },
    'modules/RH/public/pages/avaliacoes.html': {
        'cards': [
            ('green', 'fa-check-double', 'kpi-concluidas', 'Avaliações Concluídas', None, None),
            ('indigo', 'fa-users', 'kpi-funcionários', 'Funcionários Avaliados', None, None),
            ('amber', 'fa-star', 'kpi-nota', 'Nota Média', None, None),
            ('purple', 'fa-project-diagram', 'kpi-pdi', 'PDIs Concluídos', None, None),
        ],
        'old_pattern': r'<div class="grid-4">\s*(?:<div class="kpi">.*?</div>\s*)+</div>',
    },
    'modules/RH/public/pages/funcionarios.html': {
        'cards': [
            ('indigo', 'fa-users', 'stat-total', 'Total Funcionários', 'Ver todos', '#'),
            ('green', 'fa-user-check', 'stat-ativos', 'Ativos', None, None),
            ('amber', 'fa-birthday-cake', 'stat-aniversarios', 'Aniversariantes', None, None),
            ('purple', 'fa-user-plus', 'stat-admissoes', 'Admissões', None, None),
        ],
        'old_pattern': r'<div class="stats-grid">.*?</div>\s*</div>\s*</div>\s*</div>\s*</div>(?=\s*<!--|\s*<div class="(?:filter|toolbar|table|content))',
    },
    'modules/RH/public/pages/gestao-ponto.html': {
        'cards': [
            ('indigo', 'fa-users', 'stat-funcionários', 'Funcionários Ativos', None, None),
            ('green', 'fa-user-check', 'stat-presentes', 'Presentes Hoje', None, None),
            ('blue', 'fa-fingerprint', 'stat-marcacoes', 'Marcações Hoje', None, None),
            ('red', 'fa-user-times', 'stat-faltas', 'Faltas no Mês', None, None),
        ],
        'old_pattern': r'<div class="stats-grid">.*?</div>\s*</div>\s*</div>\s*</div>\s*</div>(?=\s*<!--|\s*<div class="(?:filter|toolbar|table|content))',
    },
    'modules/Financeiro/nfse.html': {
        'cards': [
            ('indigo', 'fa-file-invoice', 'kpi-total', 'Total NFS-e', None, None),
            ('green', 'fa-check-circle', 'kpi-emitidas', 'Emitidas', None, None),
            ('blue', 'fa-dollar-sign', 'kpi-faturamento', 'Faturamento Serviços', None, None),
            ('purple', 'fa-receipt', 'kpi-iss', 'ISS Apurado', None, None),
        ],
        'old_pattern': r'<div class="kpi-grid">.*?</div>\s*</div>\s*</div>\s*</div>\s*</div>',
    },
}

# ============================================================
# Process each page
# ============================================================

fixed = 0
for rel_path, config in PAGES.items():
    filepath = os.path.join(BASE, rel_path)
    if not os.path.exists(filepath):
        print(f'SKIP (not found): {rel_path}')
        continue
    
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except UnicodeDecodeError:
        with open(filepath, 'r', encoding='latin-1') as f:
            content = f.read()
    
    original = content
    
    # 1. Add/replace CSS - inject before </style>
    # First check if Compras CSS already exists
    if '.stat-card::before' not in content and 'COMPRAS STANDARD' not in content:
        # Find last </style> in the <head> section
        style_end = content.rfind('</style>')
        if style_end > 0:
            content = content[:style_end] + COMPRAS_STAT_CSS + '\n    </style>' + content[style_end + len('</style>'):]
    
    # 2. Remove old conflicting CSS classes
    # Remove old .kpi, .grid-4, .kpi-card, .kpi-grid styles that conflict
    old_css_patterns = [
        r'\.grid-4\s*\{[^}]+\}',
        r'\.kpi\s*\{[^}]+\}',
        r'\.kpi\s+span\s*\{[^}]+\}',
        r'\.kpi\s+strong\s*\{[^}]+\}',
        r'\.kpi-grid\s*\{[^}]+\}',
        r'\.kpi-card\b[^{]*\{[^}]+\}',
        r'\.kpi-header\b[^{]*\{[^}]+\}',
        r'\.kpi-icon\b[^{]*\{[^}]+\}',
        r'\.kpi-content\b[^{]*\{[^}]+\}',
        r'\.kpi-value\b[^{]*\{[^}]+\}',
        r'\.kpi-sub\b[^{]*\{[^}]+\}',
    ]
    for pat in old_css_patterns:
        content = re.sub(pat, '', content)
    
    # 3. Replace HTML
    cards = [make_card(*c) for c in config['cards']]
    new_grid = make_grid(cards)
    
    # Try to find and replace the old KPI section
    old_pat = config.get('old_pattern')
    if old_pat:
        m = re.search(old_pat, content, re.DOTALL)
        if m:
            content = content[:m.start()] + new_grid + content[m.end():]
            print(f'OK (regex): {rel_path}')
            fixed += 1
        else:
            print(f'WARN (no match): {rel_path} - pattern: {old_pat[:50]}...')
    
    if content != original:
        with open(filepath, 'w', encoding='utf-8', newline='\n') as f:
            f.write(content)
    
print(f'\nFixed {fixed} files')
