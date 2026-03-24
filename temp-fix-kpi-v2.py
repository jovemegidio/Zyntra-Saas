#!/usr/bin/env python3
"""
Standardize ALL KPI counters across ALL pages to match Compras module visual standard.
Uses exact string replacement (no regex) for reliability.
"""
import os

BASE = r'G:\Outros computadores\Meu laptop (2)\Zyntra'

# ================================================================
# Compras Standard CSS
# ================================================================
COMPRAS_CSS = """
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

# 5-column variant for estoque
COMPRAS_CSS_5COL = COMPRAS_CSS.replace(
    'grid-template-columns: repeat(4, 1fr);',
    'grid-template-columns: repeat(5, 1fr);'
)

# 3-column variant for RH dashboard
COMPRAS_CSS_3COL = COMPRAS_CSS.replace(
    'grid-template-columns: repeat(4, 1fr);',
    'grid-template-columns: repeat(3, 1fr);'
)


def card(color, icon, vid, label, footer=None):
    """Generate one stat-card in Compras standard."""
    ft = ''
    if footer:
        ft = f"""
                    <div class="stat-footer">
                        <a href="#">{footer} <i class="fas fa-arrow-right"></i></a>
                    </div>"""
    return f"""                <div class="stat-card {color}">
                    <div class="stat-header">
                        <div class="stat-icon {color}"><i class="fas {icon}"></i></div>
                        <span class="stat-trend">&mdash;</span>
                    </div>
                    <div class="stat-value" id="{vid}">--</div>
                    <div class="stat-label">{label}</div>{ft}
                </div>"""


def grid(cards_html):
    return '            <div class="stats-grid">\n' + '\n'.join(cards_html) + '\n            </div>'


def process_file(rel_path, old_html, new_html, css_variant=None, old_css_blocks=None):
    """Replace old KPI HTML with new, inject CSS, remove old CSS."""
    fp = os.path.join(BASE, rel_path)
    if not os.path.exists(fp):
        print(f'SKIP (not found): {rel_path}')
        return False
    
    with open(fp, 'r', encoding='utf-8', errors='replace') as f:
        content = f.read()
    
    original = content
    
    # 1. Replace HTML
    if old_html in content:
        content = content.replace(old_html, new_html, 1)
        print(f'  HTML replaced in {rel_path}')
    else:
        # Try stripping whitespace-variations
        print(f'  WARN: exact HTML match not found in {rel_path}')
        # Try line-by-line approach
        old_stripped = '\n'.join(l.rstrip() for l in old_html.split('\n'))
        content_stripped_check = '\n'.join(l.rstrip() for l in content.split('\n'))
        if old_stripped in content_stripped_check:
            # Find start/end positions by looking for first+last unique lines
            first_line = old_html.strip().split('\n')[0].strip()
            last_line = old_html.strip().split('\n')[-1].strip()
            start_idx = content.find(first_line)
            # Find the end after start
            end_search = content.find(last_line, start_idx)
            if start_idx >= 0 and end_search >= 0:
                end_idx = end_search + len(last_line)
                content = content[:start_idx] + new_html.strip() + content[end_idx:]
                print(f'  HTML replaced (stripped) in {rel_path}')
            else:
                print(f'  FAIL: could not locate HTML block in {rel_path}')
                return False
        else:
            print(f'  FAIL: HTML block not found in {rel_path}')
            return False
    
    # 2. Remove old CSS blocks
    if old_css_blocks:
        for block in old_css_blocks:
            if block in content:
                content = content.replace(block, '', 1)
    
    # 3. Add Compras CSS if not already present
    css_to_use = css_variant or COMPRAS_CSS
    if 'COMPRAS STANDARD' not in content:
        # Find last </style> in the head
        style_end = content.rfind('</style>')
        if style_end > 0:
            content = content[:style_end] + css_to_use + '\n    </style>' + content[style_end + 8:]
            print(f'  CSS injected in {rel_path}')
    
    if content != original:
        with open(fp, 'w', encoding='utf-8', newline='\n') as f:
            f.write(content)
        print(f'  OK: {rel_path}')
        return True
    else:
        print(f'  NO CHANGES: {rel_path}')
        return False


count = 0

# ================================================================
# 1. ferias.html
# ================================================================
print('\n1. ferias.html')
old = """        <div class="grid-4">
          <div class="kpi"><span>Pendentes</span><strong id="kpi-pendentes">--</strong></div>
          <div class="kpi"><span>Aprovadas (mes)</span><strong id="kpi-aprovadas">--</strong></div>
          <div class="kpi"><span>Reprovadas (mes)</span><strong id="kpi-reprovadas">--</strong></div>
          <div class="kpi"><span>Vencendo em 30 dias</span><strong id="kpi-vencendo">--</strong></div>
        </div>"""

new = grid([
    card('amber', 'fa-hourglass-half', 'kpi-pendentes', 'Pendentes'),
    card('green', 'fa-check-circle', 'kpi-aprovadas', 'Aprovadas (mês)'),
    card('red', 'fa-times-circle', 'kpi-reprovadas', 'Reprovadas (mês)'),
    card('purple', 'fa-calendar-alt', 'kpi-vencendo', 'Vencendo em 30 dias'),
])

if process_file('modules/RH/public/pages/ferias.html', old, new):
    count += 1

# ================================================================
# 2. avaliacoes.html
# ================================================================
print('\n2. avaliacoes.html')
old = """        <div class="grid-4">
          <div class="kpi"><span>Avaliações Concluídas</span><strong id="kpi-concluidas">--</strong></div>
          <div class="kpi"><span>Funcionários Avaliados</span><strong id="kpi-funcionários">--</strong></div>
          <div class="kpi"><span>Nota Media</span><strong id="kpi-nota">--</strong></div>
          <div class="kpi"><span>PDIs Concluidos</span><strong id="kpi-pdi">--</strong></div>
        </div>"""

new = grid([
    card('green', 'fa-check-double', 'kpi-concluidas', 'Avaliações Concluídas'),
    card('indigo', 'fa-users', 'kpi-funcionários', 'Funcionários Avaliados'),
    card('amber', 'fa-star', 'kpi-nota', 'Nota Média'),
    card('purple', 'fa-project-diagram', 'kpi-pdi', 'PDIs Concluídos'),
])

if process_file('modules/RH/public/pages/avaliacoes.html', old, new):
    count += 1

# ================================================================
# 3. funcionarios.html
# ================================================================
print('\n3. funcionarios.html')
old = """                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-icon purple"><i class="fas fa-users"></i></div>
                        <div class="stat-content">
                            <div class="stat-label">Total Funcionários</div>
                            <div class="stat-value" id="stat-total">0</div>
                            <div class="stat-trend positive"><i class="fas fa-check"></i> Cadastrados</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon green"><i class="fas fa-check-circle"></i></div>
                        <div class="stat-content">
                            <div class="stat-label">Ativos</div>
                            <div class="stat-value" id="stat-ativos">0</div>
                            <div class="stat-trend positive"><i class="fas fa-briefcase"></i> Trabalhando</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon yellow"><i class="fas fa-birthday-cake"></i></div>
                        <div class="stat-content">
                            <div class="stat-label">Aniversariantes</div>
                            <div class="stat-value" id="stat-aniversarios">0</div>
                            <div class="stat-trend"><i class="fas fa-calendar"></i> Este mês</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon blue"><i class="fas fa-user-plus"></i></div>
                        <div class="stat-content">
                            <div class="stat-label">Admissões</div>
                            <div class="stat-value" id="stat-admissoes">0</div>
                            <div class="stat-trend positive"><i class="fas fa-arrow-up"></i> Este mês</div>
                        </div>
                    </div>
                </div>"""

new = grid([
    card('indigo', 'fa-users', 'stat-total', 'Total Funcionários', 'Ver todos'),
    card('green', 'fa-user-check', 'stat-ativos', 'Ativos'),
    card('amber', 'fa-birthday-cake', 'stat-aniversarios', 'Aniversariantes'),
    card('purple', 'fa-user-plus', 'stat-admissoes', 'Admissões'),
])

if process_file('modules/RH/public/pages/funcionarios.html', old, new):
    count += 1

# ================================================================
# 4. gestao-ponto.html
# ================================================================
print('\n4. gestao-ponto.html')
old = """                <!-- Stats -->
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-icon purple"><i class="fas fa-users"></i></div>
                        <div class="stat-content">
                            <div class="stat-label">Funcionários Ativos</div>
                            <div class="stat-value" id="stat-funcionários">-</div>
                            <div class="stat-trend"><i class="fas fa-check"></i> Atualizado</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon green"><i class="fas fa-check-circle"></i></div>
                        <div class="stat-content">
                            <div class="stat-label">Presentes Hoje</div>
                            <div class="stat-value" id="stat-presentes">-</div>
                            <div class="stat-trend positive"><i class="fas fa-arrow-up"></i> Hoje</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon yellow"><i class="fas fa-exclamation-triangle"></i></div>
                        <div class="stat-content">
                            <div class="stat-label">Marcações Hoje</div>
                            <div class="stat-value" id="stat-marcacoes">-</div>
                            <div class="stat-trend"><i class="fas fa-clock"></i> Hoje</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon red"><i class="fas fa-times-circle"></i></div>
                        <div class="stat-content">
                            <div class="stat-label">Faltas no Mês</div>
                            <div class="stat-value" id="stat-faltas">-</div>
                            <div class="stat-trend negative"><i class="fas fa-calendar-times"></i> Este mês</div>
                        </div>
                    </div>
                </div>"""

new = """                <!-- Stats -->
""" + grid([
    card('indigo', 'fa-users', 'stat-funcionários', 'Funcionários Ativos'),
    card('green', 'fa-user-check', 'stat-presentes', 'Presentes Hoje'),
    card('blue', 'fa-fingerprint', 'stat-marcacoes', 'Marcações Hoje'),
    card('red', 'fa-user-times', 'stat-faltas', 'Faltas no Mês'),
])

if process_file('modules/RH/public/pages/gestao-ponto.html', old, new):
    count += 1

# ================================================================
# 5. folha.html
# ================================================================
print('\n5. folha.html')
old = """                <!-- KPI Cards resumo -->
                <div class="kpi-row">
                    <div class="kpi-card">
                        <div class="kpi-label">Total Salrio</div>
                        <div class="kpi-value" id="kpi-salário">R$ 0,00</div>
                        <div class="kpi-sub" id="kpi-sub-sal">Mensal</div>
                        <div class="kpi-icon indigo"><i class="fas fa-file-invoice-dollar"></i></div>
                    </div>
                    <div class="kpi-card">
                        <div class="kpi-label">Total Adiantamento</div>
                        <div class="kpi-value" id="kpi-adiantamento">R$ 0,00</div>
                        <div class="kpi-sub" id="kpi-sub-adto">Adiantamento</div>
                        <div class="kpi-icon amber"><i class="fas fa-hand-holding-usd"></i></div>
                    </div>
                    <div class="kpi-card">
                        <div class="kpi-label">Total Geral (Contas a Pagar)</div>
                        <div class="kpi-value" id="kpi-total-geral">R$ 0,00</div>
                        <div class="kpi-sub">Salrio + Adiantamento</div>
                        <div class="kpi-icon green"><i class="fas fa-calculator"></i></div>
                    </div>
                    <div class="kpi-card">
                        <div class="kpi-label">Colaboradores</div>
                        <div class="kpi-value" id="kpi-colaboradores">0</div>
                        <div class="kpi-sub" id="kpi-sub-colab">Nesta competncia</div>
                        <div class="kpi-icon red"><i class="fas fa-users"></i></div>
                    </div>
                </div>"""

new = """                <!-- KPI Cards resumo -->
""" + grid([
    card('indigo', 'fa-file-invoice-dollar', 'kpi-salário', 'Total Salário'),
    card('amber', 'fa-hand-holding-usd', 'kpi-adiantamento', 'Total Adiantamento'),
    card('green', 'fa-calculator', 'kpi-total-geral', 'Total Geral (Contas a Pagar)'),
    card('red', 'fa-users', 'kpi-colaboradores', 'Colaboradores'),
])

if process_file('modules/RH/public/pages/folha.html', old, new):
    count += 1

# ================================================================
# 6. holerites.html
# ================================================================
print('\n6. holerites.html')
old = """        <!-- Estatsticas -->
        <div class="stats-row">
            <div class="stat-card blue">
                <div class="stat-header">
                    <h3 class="stat-title">Holerites Gerados</h3>
                    <div class="stat-icon"><i class="fas fa-file-invoice"></i></div>
                </div>
                <div class="stat-value" id="stat-total">0</div>
                <div class="stat-subtitle" id="stat-período">Carregando...</div>
            </div>
            <div class="stat-card green">
                <div class="stat-header">
                    <h3 class="stat-title">Total Bruto</h3>
                    <div class="stat-icon"><i class="fas fa-money-bill"></i></div>
                </div>
                <div class="stat-value" id="stat-bruto">R$ 0</div>
                <div class="stat-subtitle">Folha mensal</div>
            </div>
            <div class="stat-card yellow">
                <div class="stat-header">
                    <h3 class="stat-title">Descontos</h3>
                    <div class="stat-icon"><i class="fas fa-minus-circle"></i></div>
                </div>
                <div class="stat-value" id="stat-descontos">R$ 0</div>
                <div class="stat-subtitle">INSS + IRRF</div>
            </div>
            <div class="stat-card red">
                <div class="stat-header">
                    <h3 class="stat-title">Lquido</h3>
                    <div class="stat-icon"><i class="fas fa-hand-holding-usd"></i></div>
                </div>
                <div class="stat-value" id="stat-liquido">R$ 0</div>
                <div class="stat-subtitle">A pagar</div>
            </div>
        </div>"""

new = """        <!-- Estatísticas -->
""" + grid([
    card('blue', 'fa-file-invoice', 'stat-total', 'Holerites Gerados'),
    card('green', 'fa-money-bill', 'stat-bruto', 'Total Bruto'),
    card('amber', 'fa-minus-circle', 'stat-descontos', 'Descontos'),
    card('red', 'fa-hand-holding-usd', 'stat-liquido', 'Líquido'),
])

if process_file('modules/RH/public/pages/holerites.html', old, new):
    count += 1

# ================================================================
# 7. nfse.html (Financeiro)
# ================================================================
print('\n7. nfse.html')
old = """                    <div class="kpi-grid">
                        <div class="kpi-card highlight">
                            <div class="kpi-header"><div class="kpi-icon"><i class="fas fa-file-invoice"></i></div></div>
                            <div class="kpi-content"><h3>Total NFS-e</h3><div class="kpi-value" id="kpi-total">0</div></div>
                        </div>
                        <div class="kpi-card">
                            <div class="kpi-header"><div class="kpi-icon green"><i class="fas fa-check-circle"></i></div></div>
                            <div class="kpi-content"><h3>Emitidas</h3><div class="kpi-value" id="kpi-emitidas">0</div></div>
                        </div>
                        <div class="kpi-card">
                            <div class="kpi-header"><div class="kpi-icon blue"><i class="fas fa-dollar-sign"></i></div></div>
                            <div class="kpi-content"><h3>Faturamento Serviços</h3><div class="kpi-value" id="kpi-faturamento">R$ 0</div><div class="kpi-sub">valor total emitido</div></div>
                        </div>
                        <div class="kpi-card">
                            <div class="kpi-header"><div class="kpi-icon purple"><i class="fas fa-receipt"></i></div></div>
                            <div class="kpi-content"><h3>ISS Apurado</h3><div class="kpi-value" id="kpi-iss">R$ 0</div><div class="kpi-sub">imposto retido</div></div>
                        </div>
                    </div>"""

new = grid([
    card('indigo', 'fa-file-invoice', 'kpi-total', 'Total NFS-e'),
    card('green', 'fa-check-circle', 'kpi-emitidas', 'Emitidas'),
    card('blue', 'fa-dollar-sign', 'kpi-faturamento', 'Faturamento Serviços'),
    card('purple', 'fa-receipt', 'kpi-iss', 'ISS Apurado'),
])

if process_file('modules/Financeiro/nfse.html', old, new):
    count += 1

# ================================================================
# 8. RH dashboard.html
# ================================================================
print('\n8. dashboard.html (RH)')
old = """        <!-- Estatsticas Principais -->
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-icon blue"><i class="fas fa-user-friends"></i></div>
                <div class="stat-content">
                    <div class="stat-label">Total Funcionários</div>
                    <div class="stat-value widget-value" id="total-funcionários"><i class="fas fa-spinner fa-spin" style="font-size:20px;"></i></div>
                    <div class="stat-trend positive"><i class="fas fa-check"></i> Ativos na empresa</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon green"><i class="fas fa-money-bill-wave"></i></div>
                <div class="stat-content">
                    <div class="stat-label">Folha Mensal</div>
                    <div class="stat-value widget-value" id="count-folha"><i class="fas fa-spinner fa-spin" style="font-size:20px;"></i></div>
                    <div class="stat-trend"><i class="fas fa-calendar"></i> Mês atual</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon yellow"><i class="fas fa-birthday-cake"></i></div>
                <div class="stat-content">
                    <div class="stat-label">Aniversariantes</div>
                    <div class="stat-value widget-value" id="count-aniversariantes"><i class="fas fa-spinner fa-spin" style="font-size:20px;"></i></div>
                    <div class="stat-trend"><i class="fas fa-calendar"></i> Este mês</div>
                </div>
            </div>
        </div>"""

new = """        <!-- Estatísticas Principais -->
        <div class="stats-grid">
                <div class="stat-card blue">
                    <div class="stat-header">
                        <div class="stat-icon blue"><i class="fas fa-user-friends"></i></div>
                        <span class="stat-trend">&mdash;</span>
                    </div>
                    <div class="stat-value widget-value" id="total-funcionários">--</div>
                    <div class="stat-label">Total Funcionários</div>
                    <div class="stat-footer">
                        <a href="funcionarios.html">Ver todos <i class="fas fa-arrow-right"></i></a>
                    </div>
                </div>
                <div class="stat-card green">
                    <div class="stat-header">
                        <div class="stat-icon green"><i class="fas fa-money-bill-wave"></i></div>
                        <span class="stat-trend">&mdash;</span>
                    </div>
                    <div class="stat-value widget-value" id="count-folha">--</div>
                    <div class="stat-label">Folha Mensal</div>
                    <div class="stat-footer">
                        <a href="folha.html">Ver folha <i class="fas fa-arrow-right"></i></a>
                    </div>
                </div>
                <div class="stat-card amber">
                    <div class="stat-header">
                        <div class="stat-icon amber"><i class="fas fa-birthday-cake"></i></div>
                        <span class="stat-trend">&mdash;</span>
                    </div>
                    <div class="stat-value widget-value" id="count-aniversariantes">--</div>
                    <div class="stat-label">Aniversariantes</div>
                </div>
        </div>"""

if process_file('modules/RH/public/pages/dashboard.html', old, new, css_variant=COMPRAS_CSS_3COL):
    count += 1

# ================================================================
# 9. estoque.html (Vendas)
# ================================================================
print('\n9. estoque.html (Vendas)')
old = """                <!-- Stats Cards - ALINHADO COM PCP -->
                <div class="stats-grid">
                    <div class="stat-card highlight">
                        <div class="stat-card-header">
                            <div class="stat-icon white"><i class="fas fa-box"></i></div>
                        </div>
                        <div class="stat-value" id="stat-total">0</div>
                        <div class="stat-label">Total em Estoque</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-card-header">
                            <div class="stat-icon purple"><i class="fas fa-layer-group"></i></div>
                        </div>
                        <div class="stat-value" id="stat-categorias">0</div>
                        <div class="stat-label">Categorias</div>
                        <div class="stat-detail" id="stat-categorias-detail" style="font-size: 10px; color: #9ca3af; margin-top: 4px;"></div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-card-header">
                            <div class="stat-icon yellow"><i class="fas fa-exclamation-triangle"></i></div>
                        </div>
                        <div class="stat-value" id="stat-baixo">0</div>
                        <div class="stat-label">Estoque Baixo</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-card-header">
                            <div class="stat-icon red"><i class="fas fa-times-circle"></i></div>
                        </div>
                        <div class="stat-value" id="stat-zerado">0</div>
                        <div class="stat-label">Nível Crítico</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-card-header">
                            <div class="stat-icon green"><i class="fas fa-check-circle"></i></div>
                        </div>
                        <div class="stat-value" id="stat-disponivel">0</div>
                        <div class="stat-label">Estoque Normal</div>
                    </div>
                </div>"""

new = """                <!-- Stats Cards -->
            <div class="stats-grid">
                <div class="stat-card indigo">
                    <div class="stat-header">
                        <div class="stat-icon indigo"><i class="fas fa-box"></i></div>
                        <span class="stat-trend">&mdash;</span>
                    </div>
                    <div class="stat-value" id="stat-total">--</div>
                    <div class="stat-label">Total em Estoque</div>
                </div>
                <div class="stat-card purple">
                    <div class="stat-header">
                        <div class="stat-icon purple"><i class="fas fa-layer-group"></i></div>
                        <span class="stat-trend">&mdash;</span>
                    </div>
                    <div class="stat-value" id="stat-categorias">--</div>
                    <div class="stat-label">Categorias</div>
                </div>
                <div class="stat-card amber">
                    <div class="stat-header">
                        <div class="stat-icon amber"><i class="fas fa-exclamation-triangle"></i></div>
                        <span class="stat-trend">&mdash;</span>
                    </div>
                    <div class="stat-value" id="stat-baixo">--</div>
                    <div class="stat-label">Estoque Baixo</div>
                </div>
                <div class="stat-card red">
                    <div class="stat-header">
                        <div class="stat-icon red"><i class="fas fa-times-circle"></i></div>
                        <span class="stat-trend">&mdash;</span>
                    </div>
                    <div class="stat-value" id="stat-zerado">--</div>
                    <div class="stat-label">Nível Crítico</div>
                </div>
                <div class="stat-card green">
                    <div class="stat-header">
                        <div class="stat-icon green"><i class="fas fa-check-circle"></i></div>
                        <span class="stat-trend">&mdash;</span>
                    </div>
                    <div class="stat-value" id="stat-disponivel">--</div>
                    <div class="stat-label">Estoque Normal</div>
                </div>
            </div>"""

if process_file('modules/Vendas/public/estoque.html', old, new, css_variant=COMPRAS_CSS_5COL):
    count += 1

# ================================================================
# 10. comissoes.html (Vendas)
# ================================================================
print('\n10. comissoes.html (Vendas)')
old = """                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-card-header">
                            <div>
                                <div class="stat-card-value" id="totalFaturado">R$ 0</div>
                                <div class="stat-card-label">Total Faturado</div>
                            </div>
                            <div class="stat-card-icon blue"><i class="fas fa-dollar-sign"></i></div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-card-header">
                            <div>
                                <div class="stat-card-value" id="totalComissao">R$ 0</div>
                                <div class="stat-card-label">Total em Comissões</div>
                            </div>
                            <div class="stat-card-icon green"><i class="fas fa-hand-holding-usd"></i></div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-card-header">
                            <div>
                                <div class="stat-card-value" id="comissaoPendente">R$ 0</div>
                                <div class="stat-card-label">Comissão Pendente</div>
                            </div>
                            <div class="stat-card-icon orange"><i class="fas fa-clock"></i></div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-card-header">
                            <div>
                                <div class="stat-card-value" id="qtdVendedores">0</div>
                                <div class="stat-card-label">Vendedores Ativos</div>
                            </div>
                            <div class="stat-card-icon purple"><i class="fas fa-user-tie"></i></div>
                        </div>
                    </div>
                </div>"""

new = grid([
    card('blue', 'fa-dollar-sign', 'totalFaturado', 'Total Faturado'),
    card('green', 'fa-hand-holding-usd', 'totalComissao', 'Total em Comissões'),
    card('amber', 'fa-clock', 'comissaoPendente', 'Comissão Pendente'),
    card('purple', 'fa-user-tie', 'qtdVendedores', 'Vendedores Ativos'),
])

if process_file('modules/Vendas/public/comissoes.html', old, new):
    count += 1


print(f'\n============================')
print(f'Total files updated: {count}/10')
print(f'============================')
