#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Fix bugs in prospeccao.html"""

path = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra\modules\Vendas\public\prospeccao.html'

with open(path, 'rb') as f:
    raw = f.read()

original = raw

# FILE HAS CRLF (\r\n) LINE ENDINGS - use \r\n in multi-line patterns

# ── 1. Fix atualizarMetricas: negociação → negociacao in status filter ──────
# Single-line replacements (no CRLF issue)
raw = raw.replace(
    "const negociação = this.leads.filter(l => l.status === 'negociação').length;".encode('utf-8'),
    "const negociacao_leads = this.leads.filter(l => l.status === 'negociacao').length;".encode('utf-8')
)
raw = raw.replace(
    b"document.getElementById('count-negociacao').textContent = negociacao;",
    b"document.getElementById('count-negociacao').textContent = negociacao_leads;"
)
raw = raw.replace(
    b"document.getElementById('metric-negociacao').textContent = negociacao;",
    b"document.getElementById('metric-negociacao').textContent = negociacao_leads;"
)

# ── 2. Fix renderizarKanban: 'negociação' → 'negociacao' in array ────────────
raw = raw.replace(
    "const colunas = ['novo', 'contato', 'qualificado', 'negociação', 'convertido'];".encode('utf-8'),
    "const colunas = ['novo', 'contato', 'qualificado', 'negociacao', 'convertido'];".encode('utf-8')
)

# ── 3. Add null guard for container in renderizarKanban (CRLF) ─────────────
old_kanban = b"                const container = document.getElementById(`col-${status}`);\r\n                \r\n                if (leads.length === 0) {"
new_kanban = b"                const container = document.getElementById(`col-${status}`);\r\n                if (!container) return;\r\n                \r\n                if (leads.length === 0) {"
raw = raw.replace(old_kanban, new_kanban)
# Also try without extra space on blank line
old_kanban2 = b"                const container = document.getElementById(`col-${status}`);\r\n\r\n                if (leads.length === 0) {"
new_kanban2 = b"                const container = document.getElementById(`col-${status}`);\r\n                if (!container) return;\r\n\r\n                if (leads.length === 0) {"
raw = raw.replace(old_kanban2, new_kanban2)

# ── 4. Fix formatarStatus: negociação key → negociacao ──────────────────────
raw = raw.replace(
    "negociação: 'Negociação',".encode('utf-8'),
    "negociacao: 'Negociação',".encode('utf-8')
)

# ── 5. Add paginaAnterior() and proximaPagina() methods (CRLF) ───────────────
# Find formatarStatus in context with CRLF
target = "        formatarStatus(status) {\r\n            const map = { novo: 'Novo', contato: 'Em Contato', qualificado: 'Qualificado', negociacao: 'Negociação', convertido: 'Convertido', perdido: 'Perdido' };\r\n            return map[status] || 'Novo';\r\n        },".encode('utf-8')
replacement = "        paginaAnterior() {\r\n            if (this.paginaAtual > 1) {\r\n                this.paginaAtual--;\r\n                this.renderizarTabela();\r\n            }\r\n        },\r\n\r\n        proximaPagina() {\r\n            this.paginaAtual++;\r\n            this.renderizarTabela();\r\n        },\r\n\r\n        formatarStatus(status) {\r\n            const map = { novo: 'Novo', contato: 'Em Contato', qualificado: 'Qualificado', negociacao: 'Negociação', convertido: 'Convertido', perdido: 'Perdido' };\r\n            return map[status] || 'Novo';\r\n        },".encode('utf-8')
raw = raw.replace(target, replacement)

if raw == original:
    print("AVISO: Nenhuma substituição foi feita! Verificar strings alvo.")
else:
    with open(path, 'wb') as f:
        f.write(raw)
    print("OK: prospeccao.html atualizado com sucesso.")

# Verify
with open(path, 'rb') as f:
    verify = f.read()
print(f"paginaAnterior defined: {b'paginaAnterior() {' in verify}")
print(f"proximaPagina defined: {b'proximaPagina() {' in verify}")
print(f"null guard added: {b'if (!container) return;' in verify}")
neg_no_acc = b"'negociacao'"
print(f"colunas with negociacao (no accent): {neg_no_acc in verify}")
print(f"metric-negociacao uses negociacao_leads: {b'textContent = negociacao_leads' in verify}")

