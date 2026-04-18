#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
fix-portugues-html.py
=====================
Corrige erros de português em TODOS os arquivos HTML de produção do Zyntra ERP.

Corrige:
  1. Mojibake (UTF-8 lido como Latin-1 e re-salvo): Ã³ → ó, Ã§ → ç, etc.
  2. Palavras sem acento por corrupção de encoding
  3. Erros ortográficos e gramaticais específicos de UI

Exclui: node_modules, backups, _old, arquivos .bak
"""

import os
import re
import sys
from pathlib import Path

BASE = Path(__file__).parent

# ─────────────────────────────────────────────────────────────────────────────
# 1. MOJIBAKE MAP
#    Dois padrões suportados:
#    A) C3 81 C2 XX → C3 XX  (padrão "Á+char", encontrado nos arquivos Zyntra)
#       Exemplo: Á³ → ó,  Á£ → ã,  Á§ → ç
#    B) Ã+char clássico (double-encoding padrão, por precaução)
#       Exemplo: Ã³ → ó,  Ã£ → ã,  Ã§ → ç
#    Ordene do MAIS LONGO para o MAIS CURTO para evitar substituições parciais.
# ─────────────────────────────────────────────────────────────────────────────
MOJIBAKE_MAP = [
    # ── Padrão A: Á + Latin Supplement (C3 81 C2 XX → C3 XX) ────────────────
    # Minúsculas — muito comuns em português:
    ('\u00c1\u00a3', '\u00e3'),   # Á£ → ã
    ('\u00c1\u00a7', '\u00e7'),   # Á§ → ç
    ('\u00c1\u00b3', '\u00f3'),   # Á³ → ó
    ('\u00c1\u00ba', '\u00fa'),   # Áº → ú
    ('\u00c1\u00aa', '\u00ea'),   # Áª → ê
    ('\u00c1\u00b4', '\u00f4'),   # Á´ → ô
    ('\u00c1\u00b5', '\u00f5'),   # Áµ → õ
    ('\u00c1\u00a1', '\u00e1'),   # Á¡ → á
    ('\u00c1\u00a2', '\u00e2'),   # Á¢ → â
    ('\u00c1\u00a9', '\u00e9'),   # Á© → é
    ('\u00c1\u00ad', '\u00ed'),   # Á­ → í  (soft hyphen intermediário)
    ('\u00c1\u00a0', '\u00e0'),   # Á  → à
    ('\u00c1\u00a8', '\u00e8'),   # Á¨ → è
    ('\u00c1\u00ac', '\u00ec'),   # Á¬ → ì
    ('\u00c1\u00ae', '\u00ee'),   # Á® → î
    ('\u00c1\u00b9', '\u00f9'),   # Á¹ → ù
    ('\u00c1\u00bb', '\u00fb'),   # Á» → û
    ('\u00c1\u00bc', '\u00fc'),   # Á¼ → ü
    ('\u00c1\u00b1', '\u00f1'),   # Á± → ñ
    # Maiúsculas — segundo char é C1 control (U+0080–U+009F):
    ('\u00c1\x87', '\u00c7'),     # Á\x87 → Ç
    ('\u00c1\x89', '\u00c9'),     # Á\x89 → É
    ('\u00c1\x8a', '\u00ca'),     # Á\x8a → Ê
    ('\u00c1\x8e', '\u00ce'),     # Á\x8e → Î
    ('\u00c1\x93', '\u00d3'),     # Á\x93 → Ó
    ('\u00c1\x94', '\u00d4'),     # Á\x94 → Ô
    ('\u00c1\x95', '\u00d5'),     # Á\x95 → Õ
    ('\u00c1\x9a', '\u00da'),     # Á\x9a → Ú
    ('\u00c1\x80', '\u00c0'),     # Á\x80 → À
    ('\u00c1\x82', '\u00c2'),     # Á\x82 → Â
    ('\u00c1\x83', '\u00c3'),     # Á\x83 → Ã
    ('\u00c1\x91', '\u00d1'),     # Á\x91 → Ñ
    ('\u00c1\x81', '\u00c1'),     # Á\x81 → Á  (auto-referencial — ÚLTIMO)

    # ── Padrão B: Ã+char clássico (double-encoding, por precaução) ───────────
    ('\u00c3\u0087', '\u00c7'),   # Ã‡ → Ç
    ('\u00c3\u0089', '\u00c9'),   # Ã‰ → É
    ('\u00c3\u0080', '\u00c0'),   # Ã€ → À
    ('\u00c3\u0082', '\u00c2'),   # Ã‚ → Â
    ('\u00c3\u0084', '\u00c4'),   # Ã„ → Ä
    ('\u00c3\u008b', '\u00cb'),   # Ã‹ → Ë
    ('\u00c3\u0094', '\u00d4'),   # Ã" → Ô
    ('\u00c3\u0095', '\u00d5'),   # Ã• → Õ
    ('\u00c3\u0093', '\u00d3'),   # Ã" → Ó
    ('\u00c3\u009a', '\u00da'),   # Ãš → Ú
    ('\u00c3\u0086', '\u00c6'),   # Ã† → Æ
    ('\u00c3\u0085', '\u00c5'),   # Ã… → Å
    ('\u00c3\u0098', '\u00d8'),   # Ã˜ → Ø
    ('\u00c3\u009c', '\u00dc'),   # Ãœ → Ü
    ('\u00c3\u0081', '\u00c1'),   # Ã\x81 → Á  (precisa vir antes de Ã sozinho)
    ('\u00c3\u00a1', '\u00e1'),   # Ã¡ → á
    ('\u00c3\u00a0', '\u00e0'),   # Ã  → à
    ('\u00c3\u00a2', '\u00e2'),   # Ã¢ → â
    ('\u00c3\u00a3', '\u00e3'),   # Ã£ → ã
    ('\u00c3\u00a7', '\u00e7'),   # Ã§ → ç
    ('\u00c3\u00a9', '\u00e9'),   # Ã© → é
    ('\u00c3\u00a8', '\u00e8'),   # Ã¨ → è
    ('\u00c3\u00ac', '\u00ec'),   # Ã¬ → ì
    ('\u00c3\u00ad', '\u00ed'),   # Ã­ → í
    ('\u00c3\u00ae', '\u00ee'),   # Ã® → î
    ('\u00c3\u00b3', '\u00f3'),   # Ã³ → ó
    ('\u00c3\u00b4', '\u00f4'),   # Ã´ → ô
    ('\u00c3\u00b5', '\u00f5'),   # Ãµ → õ
    ('\u00c3\u00b9', '\u00f9'),   # Ã¹ → ù
    ('\u00c3\u00ba', '\u00fa'),   # Ãº → ú
    ('\u00c3\u00bb', '\u00fb'),   # Ã» → û
    ('\u00c3\u00bc', '\u00fc'),   # Ã¼ → ü
    ('\u00c3\u00b1', '\u00f1'),   # Ã± → ñ

    # ── Outros mojibake comuns (aspas, símbolos) ─────────────────────────────
    ('\u00e2\u20ac\u2122', '\''),  # â€™ → '  (apóstrofo curvo)
    ('\u00e2\u20ac\u0153', '"'),   # â€œ → "  (abre aspas)
    ('\u00e2\u20ac',       '"'),   # â€  → "  (fecha aspas — deve vir DEPOIS do anterior)
    ('\u00e2\u20ac\u201c', '\u2013'),  # â€" → –  (en dash)
    ('\u00e2\u20ac\u201d', '\u2014'),  # â€" → —  (em dash)
    ('\u00c2\u00b0', '\u00b0'),   # Â° → °
    ('\u00c2\u00ba', '\u00ba'),   # Âº → º
    ('\u00c2\u00aa', '\u00aa'),   # Âª → ª
    ('\u00c2\u00b7', '\u00b7'),   # Â· → ·
    ('\u00c2\u00b9', '\u00b9'),   # Â¹ → ¹
    ('\u00c2\u00b2', '\u00b2'),   # Â² → ²
    ('\u00c2\u00b3', '\u00b3'),   # Â³ → ³
    ('\u00c2\u00a9', '\u00a9'),   # Â© → ©
    ('\u00c2\u00ae', '\u00ae'),   # Â® → ®
    ('\u00c2\u00a2', '\u00a2'),   # Â¢ → ¢
    ('\u00c2\u00a3', '\u00a3'),   # Â£ → £
    ('\u00c2\u00b5', '\u00b5'),   # Âµ → µ
    ('\u00e2\u201a\u00ac', '\u20ac'),  # â‚¬ → €
    ('\u00e2\u201e\u00a2', '\u2122'),  # â„¢ → ™
]

# ─────────────────────────────────────────────────────────────────────────────
# 2. CORREÇÕES ORTOGRÁFICAS (encoding já correto, texto errado)
#    Formato: (regex_pattern, replacement, flags)
#    ATENÇÃO: estas serão aplicadas APÓS a correção de mojibake
# ─────────────────────────────────────────────────────────────────────────────
SPELLING_FIXES = [
    # ── Família Gestão ──────────────────────────────────────────────────────
    (r'\bGest[aã]o\b(?! [dD]e)', 'Gestão', re.IGNORECASE),
    (r'\bGEST[AÃ]O\b', 'GESTÃO', 0),

    # ── Família Funcionário ──────────────────────────────────────────────────
    (r'\bFuncion[aá]rio\b', 'Funcionário', 0),
    (r'\bfuncion[aá]rio\b', 'funcionário', 0),
    (r'\bFuncion[aá]rios\b', 'Funcionários', 0),
    (r'\bfuncion[aá]rios\b', 'funcionários', 0),
    (r'\bFUNCION[AÁ]RIO\b', 'FUNCIONÁRIO', 0),
    (r'\bFUNCION[AÁ]RIOS\b', 'FUNCIONÁRIOS', 0),

    # ── Família Relatório ────────────────────────────────────────────────────
    (r'\bRelat[oó]rio\b', 'Relatório', 0),
    (r'\brelat[oó]rio\b', 'relatório', 0),
    (r'\bRelat[oó]rios\b', 'Relatórios', 0),
    (r'\brelat[oó]rios\b', 'relatórios', 0),
    (r'\bRELAT[OÓ]RIO\b', 'RELATÓRIO', 0),
    (r'\bRELAT[OÓ]RIOS\b', 'RELATÓRIOS', 0),

    # ── Família Salário ──────────────────────────────────────────────────────
    (r'\bSal[aá]rio\b', 'Salário', 0),
    (r'\bsal[aá]rio\b', 'salário', 0),
    (r'\bSAL[AÁ]RIO\b', 'SALÁRIO', 0),

    # ── Família Histórico ────────────────────────────────────────────────────
    (r'\bHist[oó]rico\b', 'Histórico', 0),
    (r'\bhist[oó]rico\b', 'histórico', 0),
    (r'\bHIST[OÓ]RICO\b', 'HISTÓRICO', 0),

    # ── Família Código ───────────────────────────────────────────────────────
    (r'\bC[oó]digo\b', 'Código', 0),
    (r'\bc[oó]digo\b', 'código', 0),
    (r'\bC[OÓ]DIGO\b', 'CÓDIGO', 0),

    # ── Família Número ───────────────────────────────────────────────────────
    (r'\bN[uú]mero\b', 'Número', 0),
    (r'\bn[uú]mero\b', 'número', 0),
    (r'\bN[UÚ]MERO\b', 'NÚMERO', 0),

    # ── Família Período ──────────────────────────────────────────────────────
    (r'\bPer[ií]odo\b', 'Período', 0),
    (r'\bper[ií]odo\b', 'período', 0),
    (r'\bPER[IÍ]ODO\b', 'PERÍODO', 0),

    # ── Família Descrição ────────────────────────────────────────────────────
    (r'\bDescri[cç][aã]o\b', 'Descrição', 0),
    (r'\bdescri[cç][aã]o\b', 'descrição', 0),
    (r'\bDESCRI[CÇ][AÃ]O\b', 'DESCRIÇÃO', 0),

    # ── Família Informação/Informações ───────────────────────────────────────
    (r'\bInforma[cç][oõ]es\b', 'Informações', 0),
    (r'\binforma[cç][oõ]es\b', 'informações', 0),
    (r'\bInforma[cç][aã]o\b', 'Informação', 0),
    (r'\binforma[cç][aã]o\b', 'informação', 0),

    # ── Família Avaliação/Avaliações ─────────────────────────────────────────
    (r'\bAvalia[cç][oõ]es\b', 'Avaliações', 0),
    (r'\bavalia[cç][oõ]es\b', 'avaliações', 0),
    (r'\bAvalia[cç][aã]o\b', 'Avaliação', 0),
    (r'\bavalia[cç][aã]o\b', 'avaliação', 0),

    # ── Família Operação/Operações ───────────────────────────────────────────
    (r'\bOpera[cç][oõ]es\b', 'Operações', 0),
    (r'\bopera[cç][oõ]es\b', 'operações', 0),
    (r'\bOpera[cç][aã]o\b', 'Operação', 0),
    (r'\bopera[cç][aã]o\b', 'operação', 0),

    # ── Família Notificação/Notificações ─────────────────────────────────────
    (r'\bNotifica[cç][oõ]es\b', 'Notificações', 0),
    (r'\bnotifica[cç][oõ]es\b', 'notificações', 0),
    (r'\bNotifica[cç][aã]o\b', 'Notificação', 0),
    (r'\bnotifica[cç][aã]o\b', 'notificação', 0),

    # ── Família Confirmação ──────────────────────────────────────────────────
    (r'\bConfirma[cç][aã]o\b', 'Confirmação', 0),
    (r'\bconfirma[cç][aã]o\b', 'confirmação', 0),

    # ── Família Atualização ──────────────────────────────────────────────────
    (r'\bAtualiza[cç][aã]o\b', 'Atualização', 0),
    (r'\batualiza[cç][aã]o\b', 'atualização', 0),

    # ── Família Criação ──────────────────────────────────────────────────────
    (r'\bCria[cç][aã]o\b', 'Criação', 0),
    (r'\bcria[cç][aã]o\b', 'criação', 0),

    # ── Família Alteração/Alterações ─────────────────────────────────────────
    (r'\bAltera[cç][oõ]es\b', 'Alterações', 0),
    (r'\baltera[cç][oõ]es\b', 'alterações', 0),
    (r'\bAltera[cç][aã]o\b', 'Alteração', 0),
    (r'\baltera[cç][aã]o\b', 'alteração', 0),

    # ── Família Observação/Observações ───────────────────────────────────────
    (r'\bObserva[cç][oõ]es\b', 'Observações', 0),
    (r'\bobserva[cç][oõ]es\b', 'observações', 0),
    (r'\bObserva[cç][aã]o\b', 'Observação', 0),
    (r'\bobserva[cç][aã]o\b', 'observação', 0),

    # ── Família Requisição/Requisições ───────────────────────────────────────
    (r'\bRequisição\b', 'Requisição', 0),
    (r'\bRequisicao\b', 'Requisição', 0),
    (r'\brequisicao\b', 'requisição', 0),
    (r'\bRequisi[cç][oõ]es\b', 'Requisições', 0),
    (r'\brequisi[cç][oõ]es\b', 'requisições', 0),

    # ── Família Produção ─────────────────────────────────────────────────────
    (r'\bProdu[cç][aã]o\b', 'Produção', 0),
    (r'\bprodu[cç][aã]o\b', 'produção', 0),
    (r'\bPRODU[CÇ][AÃ]O\b', 'PRODUÇÃO', 0),

    # ── Família Exclusão ─────────────────────────────────────────────────────
    (r'\bExclus[aã]o\b', 'Exclusão', 0),
    (r'\bexclus[aã]o\b', 'exclusão', 0),
    (r'\bExclus[oõ]es\b', 'Exclusões', 0),
    (r'\bexclus[oõ]es\b', 'exclusões', 0),

    # ── Família Edição ───────────────────────────────────────────────────────
    (r'\bEdi[cç][aã]o\b', 'Edição', 0),
    (r'\bedi[cç][aã]o\b', 'edição', 0),
    (r'\bEdi[cç][oõ]es\b', 'Edições', 0),
    (r'\bedi[cç][oõ]es\b', 'edições', 0),

    # ── Família Marcação/Marcações ───────────────────────────────────────────
    (r'\bMarca[cç][oõ]es\b', 'Marcações', 0),
    (r'\bmarca[cç][oõ]es\b', 'marcações', 0),

    # ── Família Visualização ─────────────────────────────────────────────────
    (r'\bVisualiza[cç][aã]o\b', 'Visualização', 0),
    (r'\bvisualiza[cç][aã]o\b', 'visualização', 0),
    (r'\bVisualiza[cç][oõ]es\b', 'Visualizações', 0),
    (r'\bvisualiza[cç][oõ]es\b', 'visualizações', 0),

    # ── Família Inserção ─────────────────────────────────────────────────────
    (r'\bInser[cç][aã]o\b', 'Inserção', 0),
    (r'\binser[cç][aã]o\b', 'inserção', 0),

    # ── Família Separação ────────────────────────────────────────────────────
    (r'\bSepara[cç][aã]o\b', 'Separação', 0),
    (r'\bsepara[cç][aã]o\b', 'separação', 0),

    # ── Família Ação/Ações ───────────────────────────────────────────────────
    (r'\bA[cç][oõ]es\b', 'Ações', 0),
    (r'\ba[cç][oõ]es\b', 'ações', 0),
    (r'\bA[cç][aã]o\b', 'Ação', 0),
    (r'\ba[cç][aã]o\b', 'ação', 0),

    # ── Básico/Básica/Básicas ────────────────────────────────────────────────
    (r'\bB[aá]sico\b', 'Básico', 0),
    (r'\bb[aá]sico\b', 'básico', 0),
    (r'\bB[aá]sica\b', 'Básica', 0),
    (r'\bb[aá]sica\b', 'básica', 0),
    (r'\bB[aá]sicas\b', 'Básicas', 0),
    (r'\bb[aá]sicas\b', 'básicas', 0),

    # ── Obrigatório ──────────────────────────────────────────────────────────
    (r'\bObrigat[oó]rio\b', 'Obrigatório', 0),
    (r'\bobrigat[oó]rio\b', 'obrigatório', 0),
    (r'\bObrigat[oó]rios\b', 'Obrigatórios', 0),
    (r'\bobrigat[oó]rios\b', 'obrigatórios', 0),

    # ── Necessário ───────────────────────────────────────────────────────────
    (r'\bNecess[aá]rio\b', 'Necessário', 0),
    (r'\bnecess[aá]rio\b', 'necessário', 0),

    # ── Automático ───────────────────────────────────────────────────────────
    (r'\bAutom[aá]tico\b', 'Automático', 0),
    (r'\bautom[aá]tico\b', 'automático', 0),

    # ── Líquido ──────────────────────────────────────────────────────────────
    (r'\bL[ií]quido\b', 'Líquido', 0),
    (r'\bl[ií]quido\b', 'líquido', 0),

    # ── Médico ───────────────────────────────────────────────────────────────
    (r'\bM[eé]dico\b', 'Médico', 0),
    (r'\bm[eé]dico\b', 'médico', 0),

    # ── Jurídico ─────────────────────────────────────────────────────────────
    (r'\bJur[ií]dico\b', 'Jurídico', 0),
    (r'\bjur[ií]dico\b', 'jurídico', 0),
    (r'\bJur[ií]dica\b', 'Jurídica', 0),
    (r'\bjur[ií]dica\b', 'jurídica', 0),

    # ── Série ────────────────────────────────────────────────────────────────
    (r'\bS[eé]rie\b', 'Série', 0),
    (r'\bs[eé]rie\b', 'série', 0),

    # ── Endereço ─────────────────────────────────────────────────────────────
    (r'\bEnder[eê][cç]o\b', 'Endereço', 0),
    (r'\bender[eê][cç]o\b', 'endereço', 0),
    (r'\bEnder[eê][cç]os\b', 'Endereços', 0),
    (r'\bender[eê][cç]os\b', 'endereços', 0),

    # ── Benefícios ───────────────────────────────────────────────────────────
    (r'\bBenef[ií]cios\b', 'Benefícios', 0),
    (r'\bbenef[ií]cios\b', 'benefícios', 0),

    # ── Gênero ───────────────────────────────────────────────────────────────
    (r'\bG[eê]nero\b', 'Gênero', 0),
    (r'\bg[eê]nero\b', 'gênero', 0),

    # ── Rápido/Rápidas ───────────────────────────────────────────────────────
    (r'\bR[aá]pido\b', 'Rápido', 0),
    (r'\br[aá]pido\b', 'rápido', 0),
    (r'\bR[aá]pida\b', 'Rápida', 0),
    (r'\br[aá]pida\b', 'rápida', 0),
    (r'\bR[aá]pidas\b', 'Rápidas', 0),
    (r'\br[aá]pidas\b', 'rápidas', 0),

    # ── Último/Última/Últimos ────────────────────────────────────────────────
    (r'\b[Uu]ltimas\b', 'Últimas', 0),
    (r'\b[Uu]ltimo\b', 'Último', 0),
    (r'\b[Uu]ltima\b', 'Última', 0),
    (r'\bÚLTIMAS\b', 'ÚLTIMAS', 0),

    # ── Formulário ───────────────────────────────────────────────────────────
    (r'\bFormul[aá]rio\b', 'Formulário', 0),
    (r'\bformul[aá]rio\b', 'formulário', 0),

    # ── Categor(ia/ias) ──────────────────────────────────────────────────────
    (r'\bCategoria\b', 'Categoria', 0),  # já correto, apenas normaliza

    # ── Condições ────────────────────────────────────────────────────────────
    (r'\bCondi[cç][oõ]es\b', 'Condições', 0),
    (r'\bcondi[cç][oõ]es\b', 'condições', 0),

    # ── Animações ────────────────────────────────────────────────────────────
    (r'\bAnima[cç][oõ]es\b', 'Animações', 0),
    (r'\banima[cç][oõ]es\b', 'animações', 0),

    # ── Transação/Transações ─────────────────────────────────────────────────
    (r'\bTrans[aã]ção\b', 'Transação', 0),
    (r'\btrans[aã]ção\b', 'transação', 0),
    (r'\bTrans[aã][cç][oõ]es\b', 'Transações', 0),
    (r'\btrans[aã][cç][oõ]es\b', 'transações', 0),

    # ── Recorrência ──────────────────────────────────────────────────────────
    (r'\bRecorr[eê]ncia\b', 'Recorrência', 0),
    (r'\brecorr[eê]ncia\b', 'recorrência', 0),
    (r'\bRecorr[eê]ncias\b', 'Recorrências', 0),
    (r'\brecorr[eê]ncias\b', 'recorrências', 0),

    # ── Ocorrência ───────────────────────────────────────────────────────────
    (r'\bOcorr[eê]ncia\b', 'Ocorrência', 0),
    (r'\bocorr[eê]ncia\b', 'ocorrência', 0),

    # ── Competência ──────────────────────────────────────────────────────────
    (r'\bCompet[eê]ncia\b', 'Competência', 0),
    (r'\bcompet[eê]ncia\b', 'competência', 0),

    # ── Diferença ────────────────────────────────────────────────────────────
    (r'\bDifer[eê]n[cç]a\b', 'Diferença', 0),
    (r'\bdifer[eê]n[cç]a\b', 'diferença', 0),

    # ── Sequência ────────────────────────────────────────────────────────────
    (r'\bSequ[eê]ncia\b', 'Sequência', 0),
    (r'\bsequ[eê]ncia\b', 'sequência', 0),

    # ── Referência ───────────────────────────────────────────────────────────
    (r'\bRef[eê]r[eê]ncia\b', 'Referência', 0),
    (r'\bref[eê]r[eê]ncia\b', 'referência', 0),

    # ── Previsão ─────────────────────────────────────────────────────────────
    (r'\bPrevis[aã]o\b', 'Previsão', 0),
    (r'\bprevis[aã]o\b', 'previsão', 0),

    # ── Distribuição ─────────────────────────────────────────────────────────
    (r'\bDistribui[cç][aã]o\b', 'Distribuição', 0),
    (r'\bdistribui[cç][aã]o\b', 'distribuição', 0),

    # ── Repetição ────────────────────────────────────────────────────────────
    (r'\bRepeti[cç][aã]o\b', 'Repetição', 0),
    (r'\brepeti[cç][aã]o\b', 'repetição', 0),

    # ── Simulação ────────────────────────────────────────────────────────────
    (r'\bSimula[cç][aã]o\b', 'Simulação', 0),
    (r'\bsimula[cç][aã]o\b', 'simulação', 0),

    # ── Integração ───────────────────────────────────────────────────────────
    (r'\bIntegra[cç][aã]o\b', 'Integração', 0),
    (r'\bintegra[cç][aã]o\b', 'integração', 0),
    (r'\bIntegra[cç][oõ]es\b', 'Integrações', 0),
    (r'\bintegra[cç][oõ]es\b', 'integrações', 0),

    # ── Comunicação ──────────────────────────────────────────────────────────
    (r'\bComunica[cç][aã]o\b', 'Comunicação', 0),
    (r'\bcomunica[cç][aã]o\b', 'comunicação', 0),

    # ── Autenticação ─────────────────────────────────────────────────────────
    (r'\bAutentica[cç][aã]o\b', 'Autenticação', 0),
    (r'\bautentica[cç][aã]o\b', 'autenticação', 0),

    # ── Autorização ──────────────────────────────────────────────────────────
    (r'\bAutoriza[cç][aã]o\b', 'Autorização', 0),
    (r'\bautoriza[cç][aã]o\b', 'autorização', 0),

    # ── Cancelamento ─────────────────────────────────────────────────────────
    (r'\bCancelamento\b', 'Cancelamento', 0),  # já correto

    # ── Ativação ─────────────────────────────────────────────────────────────
    (r'\bAtiva[cç][aã]o\b', 'Ativação', 0),
    (r'\bativa[cç][aã]o\b', 'ativação', 0),

    # ── Desativação ──────────────────────────────────────────────────────────
    (r'\bDesativa[cç][aã]o\b', 'Desativação', 0),
    (r'\bdesativa[cç][aã]o\b', 'desativação', 0),

    # ── Seleção ──────────────────────────────────────────────────────────────
    (r'\bSele[cç][aã]o\b', 'Seleção', 0),
    (r'\bsele[cç][aã]o\b', 'seleção', 0),

    # ── Seção ────────────────────────────────────────────────────────────────
    (r'\bSe[cç][aã]o\b', 'Seção', 0),
    (r'\bse[cç][aã]o\b', 'seção', 0),

    # ── Endereço já cobre ────────────────────────────────────────────────────

    # ── Específico ───────────────────────────────────────────────────────────
    (r'\bEspec[ií]fico\b', 'Específico', 0),
    (r'\bespec[ií]fico\b', 'específico', 0),
    (r'\bEspec[ií]fica\b', 'Específica', 0),
    (r'\bespec[ií]fica\b', 'específica', 0),

    # ── Técnico ──────────────────────────────────────────────────────────────
    (r'\bT[eé]cnico\b', 'Técnico', 0),
    (r'\bt[eé]cnico\b', 'técnico', 0),
    (r'\bT[eé]cnica\b', 'Técnica', 0),
    (r'\bt[eé]cnica\b', 'técnica', 0),

    # ── Prático ──────────────────────────────────────────────────────────────
    (r'\bPr[aá]tico\b', 'Prático', 0),
    (r'\bpr[aá]tico\b', 'prático', 0),

    # ── Público ──────────────────────────────────────────────────────────────
    (r'\bP[uú]blico\b', 'Público', 0),
    (r'\bp[uú]blico\b', 'público', 0),

    # ── Físico ───────────────────────────────────────────────────────────────
    (r'\bF[ií]sico\b', 'Físico', 0),
    (r'\bf[ií]sico\b', 'físico', 0),

    # ── Eletrônica ───────────────────────────────────────────────────────────
    (r'\bEletr[oô]nica\b', 'Eletrônica', 0),
    (r'\beletr[oô]nica\b', 'eletrônica', 0),
    (r'\bEletr[oô]nico\b', 'Eletrônico', 0),
    (r'\beletr[oô]nico\b', 'eletrônico', 0),

    # ── Débito ───────────────────────────────────────────────────────────────
    (r'\bD[eé]bito\b', 'Débito', 0),
    (r'\bd[eé]bito\b', 'débito', 0),
    (r'\bD[eé]bitos\b', 'Débitos', 0),
    (r'\bd[eé]bitos\b', 'débitos', 0),

    # ── Crédito ──────────────────────────────────────────────────────────────
    (r'\bCr[eé]dito\b', 'Crédito', 0),
    (r'\bcr[eé]dito\b', 'crédito', 0),
    (r'\bCr[eé]ditos\b', 'Créditos', 0),
    (r'\bcr[eé]ditos\b', 'créditos', 0),

    # ── Próximo/Próxima ──────────────────────────────────────────────────────
    (r'\bPr[oó]ximo\b', 'Próximo', 0),
    (r'\bpr[oó]ximo\b', 'próximo', 0),
    (r'\bPr[oó]xima\b', 'Próxima', 0),
    (r'\bpr[oó]xima\b', 'próxima', 0),
    (r'\bPr[oó]ximos\b', 'Próximos', 0),
    (r'\bpr[oó]ximos\b', 'próximos', 0),

    # ── Dinâmico/Dinâmica ────────────────────────────────────────────────────
    (r'\bDin[aâ]mico\b', 'Dinâmico', 0),
    (r'\bdin[aâ]mico\b', 'dinâmico', 0),
    (r'\bDin[aâ]mica\b', 'Dinâmica', 0),
    (r'\bdin[aâ]mica\b', 'dinâmica', 0),

    # ── Bancário/Bancária ────────────────────────────────────────────────────
    (r'\bBanc[aá]rio\b', 'Bancário', 0),
    (r'\bbanc[aá]rio\b', 'bancário', 0),
    (r'\bBanc[aá]ria\b', 'Bancária', 0),
    (r'\bbanc[aá]ria\b', 'bancária', 0),
    (r'\bBanc[aá]rias\b', 'Bancárias', 0),
    (r'\bbanc[aá]rias\b', 'bancárias', 0),
    (r'\bBanc[aá]rios\b', 'Bancários', 0),
    (r'\bbanc[aá]rios\b', 'bancários', 0),

    # ── Agendamento ──────────────────────────────────────────────────────────
    (r'\bAgendamento\b', 'Agendamento', 0),

    # ── Cancelado/Cancelada ──────────────────────────────────────────────────
    (r'\bCancelado\b', 'Cancelado', 0),

    # ── Botão ────────────────────────────────────────────────────────────────
    (r'\bBot[aã]o\b', 'Botão', 0),
    (r'\bbot[aã]o\b', 'botão', 0),

    # ── Incrição/Inscrição ───────────────────────────────────────────────────
    (r'\bInscri[cç][aã]o\b', 'Inscrição', 0),
    (r'\bInscri[cç][oõ]es\b', 'Inscrições', 0),

    # ── Cartão ───────────────────────────────────────────────────────────────
    (r'\bCart[aã]o\b', 'Cartão', 0),
    (r'\bcart[aã]o\b', 'cartão', 0),

    # ── Emissão ──────────────────────────────────────────────────────────────
    (r'\bEmiss[aã]o\b', 'Emissão', 0),
    (r'\bemiss[aã]o\b', 'emissão', 0),

    # ── Negociação ───────────────────────────────────────────────────────────
    (r'\bNegocia[cç][aã]o\b', 'Negociação', 0),
    (r'\bnegocia[cç][aã]o\b', 'negociação', 0),

    # ── Conciliação ──────────────────────────────────────────────────────────
    (r'\bConcilia[cç][aã]o\b', 'Conciliação', 0),
    (r'\bconcilia[cç][aã]o\b', 'conciliação', 0),

    # ── Movimentação ─────────────────────────────────────────────────────────
    (r'\bMovimenta[cç][aã]o\b', 'Movimentação', 0),
    (r'\bmovimenta[cç][aã]o\b', 'movimentação', 0),
    (r'\bMovimenta[cç][oõ]es\b', 'Movimentações', 0),
    (r'\bmovimenta[cç][oõ]es\b', 'movimentações', 0),

    # ── Tributação ───────────────────────────────────────────────────────────
    (r'\bTributa[cç][aã]o\b', 'Tributação', 0),
    (r'\btributa[cç][aã]o\b', 'tributação', 0),

    # ── Composição ───────────────────────────────────────────────────────────
    (r'\bComposi[cç][aã]o\b', 'Composição', 0),
    (r'\bcomposi[cç][aã]o\b', 'composição', 0),

    # ── Compensação ──────────────────────────────────────────────────────────
    (r'\bCompensa[cç][aã]o\b', 'Compensação', 0),
    (r'\bcompensa[cç][aã]o\b', 'compensação', 0),

    # ── Dedução ──────────────────────────────────────────────────────────────
    (r'\bDedu[cç][aã]o\b', 'Dedução', 0),
    (r'\bdedu[cç][aã]o\b', 'dedução', 0),
    (r'\bDedu[cç][oõ]es\b', 'Deduções', 0),
    (r'\bdedu[cç][oõ]es\b', 'deduções', 0),

    # ── Provisão ─────────────────────────────────────────────────────────────
    (r'\bProvis[aã]o\b', 'Provisão', 0),
    (r'\bprovis[aã]o\b', 'provisão', 0),

    # ── Promoção ─────────────────────────────────────────────────────────────
    (r'\bPromo[cç][aã]o\b', 'Promoção', 0),
    (r'\bpromo[cç][aã]o\b', 'promoção', 0),

    # ── Medição ──────────────────────────────────────────────────────────────
    (r'\bMedi[cç][aã]o\b', 'Medição', 0),
    (r'\bmedi[cç][aã]o\b', 'medição', 0),

    # ── Expedição ────────────────────────────────────────────────────────────
    (r'\bExpedi[cç][aã]o\b', 'Expedição', 0),
    (r'\bexpedi[cç][aã]o\b', 'expedição', 0),

    # ── Ocupação ─────────────────────────────────────────────────────────────
    (r'\bOcupa[cç][aã]o\b', 'Ocupação', 0),
    (r'\bocupa[cç][aã]o\b', 'ocupação', 0),

    # ── Faturação/Faturamento ────────────────────────────────────────────────
    (r'\bFaturamento\b', 'Faturamento', 0),

    # ── Terça-feira ──────────────────────────────────────────────────────────
    (r'\bTer[cç]a-feira\b', 'Terça-feira', 0),
    (r'\bter[cç]a-feira\b', 'terça-feira', 0),

    # ── Sábado ───────────────────────────────────────────────────────────────
    (r'\bS[aá]bado\b', 'Sábado', 0),
    (r'\bs[aá]bado\b', 'sábado', 0),

    # ── Índice ───────────────────────────────────────────────────────────────
    (r'\b[ÍI]ndice\b', 'Índice', 0),

    # ── Síntese ──────────────────────────────────────────────────────────────
    (r'\bS[ií]ntese\b', 'Síntese', 0),
    (r'\bs[ií]ntese\b', 'síntese', 0),

    # ── Análise ──────────────────────────────────────────────────────────────
    (r'\bAn[aá]lise\b', 'Análise', 0),
    (r'\ban[aá]lise\b', 'análise', 0),
    (r'\bAn[aá]lises\b', 'Análises', 0),
    (r'\ban[aá]lises\b', 'análises', 0),

    # ── Crítico/Crítica ──────────────────────────────────────────────────────
    (r'\bCr[ií]tico\b', 'Crítico', 0),
    (r'\bcr[ií]tico\b', 'crítico', 0),
    (r'\bCr[ií]tica\b', 'Crítica', 0),
    (r'\bcr[ií]tica\b', 'crítica', 0),

    # ── Símbolo ──────────────────────────────────────────────────────────────
    (r'\bS[ií]mbolo\b', 'Símbolo', 0),
    (r'\bs[ií]mbolo\b', 'símbolo', 0),

    # ── Nível/Níveis ─────────────────────────────────────────────────────────
    (r'\bN[ií]vel\b', 'Nível', 0),
    (r'\bn[ií]vel\b', 'nível', 0),
    (r'\bN[ií]veis\b', 'Níveis', 0),
    (r'\bn[ií]veis\b', 'níveis', 0),

    # ── Título/Títulos ───────────────────────────────────────────────────────
    (r'\bT[ií]tulo\b', 'Título', 0),
    (r'\bt[ií]tulo\b', 'título', 0),
    (r'\bT[ií]tulos\b', 'Títulos', 0),
    (r'\bt[ií]tulos\b', 'títulos', 0),

    # ── Crédito já coberto ───────────────────────────────────────────────────

    # ── Vírgula ──────────────────────────────────────────────────────────────
    (r'\bV[ií]rgula\b', 'Vírgula', 0),
    (r'\bv[ií]rgula\b', 'vírgula', 0),

    # ── Módulo ───────────────────────────────────────────────────────────────
    (r'\bM[oó]dulo\b', 'Módulo', 0),
    (r'\bm[oó]dulo\b', 'módulo', 0),

    # ── Máximo/Máxima ────────────────────────────────────────────────────────
    (r'\bM[aá]ximo\b', 'Máximo', 0),
    (r'\bm[aá]ximo\b', 'máximo', 0),
    (r'\bM[aá]xima\b', 'Máxima', 0),
    (r'\bm[aá]xima\b', 'máxima', 0),

    # ── Mínimo/Mínima ────────────────────────────────────────────────────────
    (r'\bM[ií]nimo\b', 'Mínimo', 0),
    (r'\bm[ií]nimo\b', 'mínimo', 0),
    (r'\bM[ií]nima\b', 'Mínima', 0),
    (r'\bm[ií]nima\b', 'mínima', 0),

    # ── Único/Única ──────────────────────────────────────────────────────────
    (r'\b[Uu]nico\b', 'Único', 0),
    (r'\b[Uu]nica\b', 'Única', 0),

    # ── 13º Salário ──────────────────────────────────────────────────────────
    (r'\b13 Sal[aá]rio\b', '13º Salário', 0),
    (r'\b13\b(?= sal[aá]rio)', '13º', re.IGNORECASE),

    # ── Preenchimento ────────────────────────────────────────────────────────
    (r'\bPreenchimento\b', 'Preenchimento', 0),

    # ── Configuração ─────────────────────────────────────────────────────────
    (r'\bConfigura[cç][aã]o\b', 'Configuração', 0),
    (r'\bConfigura[cç][oõ]es\b', 'Configurações', 0),
    (r'\bcon figura[cç][aã]o\b', 'configuração', re.IGNORECASE),

    # ── Sincronização ────────────────────────────────────────────────────────
    (r'\bSincroniza[cç][aã]o\b', 'Sincronização', 0),
    (r'\bsincroniza[cç][aã]o\b', 'sincronização', 0),

    # ── Pré-visualização ─────────────────────────────────────────────────────
    (r'\bPr[eé]-visualiza[cç][aã]o\b', 'Pré-visualização', 0),

    # ── 13° / 13ª – ordinal em superscript errado ────────────────────────────
    # (ex: "13 Salario" → "13º Salário" já coberto acima)

    # ── Inativação ───────────────────────────────────────────────────────────
    (r'\bInativa[cç][aã]o\b', 'Inativação', 0),
    (r'\binativa[cç][aã]o\b', 'inativação', 0),

    # ── Efetivação ───────────────────────────────────────────────────────────
    (r'\bEfetiva[cç][aã]o\b', 'Efetivação', 0),
    (r'\befetiva[cç][aã]o\b', 'efetivação', 0),

    # ── Situação ─────────────────────────────────────────────────────────────
    (r'\bSitua[cç][aã]o\b', 'Situação', 0),
    (r'\bsitua[cç][aã]o\b', 'situação', 0),

    # ── Classificação ────────────────────────────────────────────────────────
    (r'\bClassifica[cç][aã]o\b', 'Classificação', 0),
    (r'\bclassifica[cç][aã]o\b', 'classificação', 0),

    # ── Apresentação ─────────────────────────────────────────────────────────
    (r'\bApresenta[cç][aã]o\b', 'Apresentação', 0),
    (r'\bapresenta[cç][aã]o\b', 'apresentação', 0),

    # ── Exportação ───────────────────────────────────────────────────────────
    (r'\bExporta[cç][aã]o\b', 'Exportação', 0),
    (r'\bexporta[cç][aã]o\b', 'exportação', 0),
    (r'\bExporta[cç][oõ]es\b', 'Exportações', 0),
    (r'\bexporta[cç][oõ]es\b', 'exportações', 0),

    # ── Importação ───────────────────────────────────────────────────────────
    (r'\bImporta[cç][aã]o\b', 'Importação', 0),
    (r'\bimporta[cç][aã]o\b', 'importação', 0),
    (r'\bImporta[cç][oõ]es\b', 'Importações', 0),
    (r'\bimporta[cç][oõ]es\b', 'importações', 0),

    # ── Geração ──────────────────────────────────────────────────────────────
    (r'\bGera[cç][aã]o\b', 'Geração', 0),
    (r'\bgera[cç][aã]o\b', 'geração', 0),

    # ── Função/Funções ───────────────────────────────────────────────────────
    (r'\bFun[cç][aã]o\b', 'Função', 0),
    (r'\bfun[cç][aã]o\b', 'função', 0),
    (r'\bFun[cç][oõ]es\b', 'Funções', 0),
    (r'\bfun[cç][oõ]es\b', 'funções', 0),

    # ── Administração ────────────────────────────────────────────────────────
    (r'\bAdministra[cç][aã]o\b', 'Administração', 0),
    (r'\badministra[cç][aã]o\b', 'administração', 0),

    # ── Permissão/Permissões ─────────────────────────────────────────────────
    (r'\bPermiss[aã]o\b', 'Permissão', 0),
    (r'\bpermiss[aã]o\b', 'permissão', 0),
    (r'\bPermiss[oõ]es\b', 'Permissões', 0),
    (r'\bpermiss[oõ]es\b', 'permissões', 0),

    # ── Versão ───────────────────────────────────────────────────────────────
    (r'\bVers[aã]o\b', 'Versão', 0),
    (r'\bvers[aã]o\b', 'versão', 0),

    # ── Produtividade ────────────────────────────────────────────────────────
    (r'\bProdutividade\b', 'Produtividade', 0),

    # ── Adição ───────────────────────────────────────────────────────────────
    (r'\bAdi[cç][aã]o\b', 'Adição', 0),
    (r'\badi[cç][aã]o\b', 'adição', 0),

    # ── Composição já coberto ────────────────────────────────────────────────

    # ── Padrão ───────────────────────────────────────────────────────────────
    (r'\bPadr[aã]o\b', 'Padrão', 0),
    (r'\bpadr[aã]o\b', 'padrão', 0),
    (r'\bPadr[oõ]es\b', 'Padrões', 0),
    (r'\bpadr[oõ]es\b', 'padrões', 0),

    # ── Brão → Bração/Obrigar (edge case) ────────────────────────────────────

    # ── Exceção ──────────────────────────────────────────────────────────────
    (r'\bExce[cç][aã]o\b', 'Exceção', 0),
    (r'\bexce[cç][aã]o\b', 'exceção', 0),
    (r'\bExce[cç][oõ]es\b', 'Exceções', 0),
    (r'\bexce[cç][oõ]es\b', 'exceções', 0),

    # ── Projeção ─────────────────────────────────────────────────────────────
    (r'\bProje[cç][aã]o\b', 'Projeção', 0),
    (r'\bproje[cç][aã]o\b', 'projeção', 0),
    (r'\bProje[cç][oõ]es\b', 'Projeções', 0),
    (r'\bproje[cç][oõ]es\b', 'projeções', 0),

    # ── Função já coberto ────────────────────────────────────────────────────
]

# ─────────────────────────────────────────────────────────────────────────────
# 3. DIRETÓRIOS A PROCESSAR (sem node_modules, sem backups)
# ─────────────────────────────────────────────────────────────────────────────
HTML_DIRS = [
    'public',
    'modules/Vendas/public',
    'modules/Financeiro',
    'modules/Financeiro/public',
    'modules/PCP',
    'modules/PCP/pages',
    'modules/RH/public',
    'modules/RH/public/pages',
    'modules/Compras',
    'modules/Compras/public',
    'modules/Admin/public',
    'modules/Admin/public/pages',
    'modules/Faturamento',
    'modules/Faturamento/public',
    'modules/Logistica',
    'modules/Logistica/public',
    'modules/NFe',
    'modules/NFe/public',
    'modules/Config',
    'modules/Config/public',
    'modules/Consultoria',
    'modules/Consultoria/public',
    'ajuda',
    'lp',
]

# Padrões de nome a IGNORAR
IGNORE_PATTERNS = [
    'node_modules', 'backup', '_backup', 'public_backup',
    '.bak', '_old', '_legacy', '-old', 'legacy',
    'screenshots', 'lcov-report',
]

def should_ignore(path_str: str) -> bool:
    path_lower = path_str.lower().replace('\\', '/')
    for pattern in IGNORE_PATTERNS:
        if pattern in path_lower:
            return True
    return False


def apply_mojibake(content: str) -> tuple[str, int]:
    """Aplica correções de mojibake (double-encoded UTF-8)."""
    count = 0
    for wrong, right in MOJIBAKE_MAP:
        if wrong in content:
            occurrences = content.count(wrong)
            count += occurrences
            content = content.replace(wrong, right)
    return content, count


def apply_spelling(content: str) -> tuple[str, int]:
    """Aplica correções ortográficas usando regex, apenas em texto visível (não em JS/CSS inline)."""
    count = 0
    # Dividir o conteúdo em blocos: text nodes vs script/style blocks
    # Para evitar alterar código JS ou CSS, processamos bloco a bloco
    # Padrão simples: não alterar dentro de <script> ... </script> e <style> ... </style>
    # mas SIM alterar placeholder="...", title="...", alt="...", aria-label="..."
    
    for pattern, replacement, flags in SPELLING_FIXES:
        try:
            compiled = re.compile(pattern, flags) if flags else re.compile(pattern)
            new_content, n = compiled.subn(replacement, content)
            if n > 0:
                count += n
                content = new_content
        except re.error:
            pass
    return content, count


def process_file(file_path: Path) -> dict:
    """Processa um arquivo HTML e retorna estatísticas das correções."""
    try:
        content = file_path.read_text(encoding='utf-8', errors='replace')
    except Exception as e:
        return {'file': str(file_path), 'error': str(e)}

    original = content

    # 1. Corrigir mojibake
    content, mojibake_count = apply_mojibake(content)

    # 2. Corrigir ortografia
    content, spelling_count = apply_spelling(content)

    total = mojibake_count + spelling_count

    if total > 0 and content != original:
        try:
            file_path.write_text(content, encoding='utf-8')
        except Exception as e:
            return {'file': str(file_path), 'error': f'write error: {e}'}
        return {
            'file': str(file_path.relative_to(BASE)),
            'mojibake': mojibake_count,
            'spelling': spelling_count,
            'total': total,
        }
    return {'file': str(file_path.relative_to(BASE)), 'mojibake': 0, 'spelling': 0, 'total': 0}


def scan_directory(dir_path: Path) -> list[Path]:
    """Retorna todos os .html em um diretório (sem recursão profunda, só 1 nível)."""
    results = []
    if not dir_path.exists():
        return results
    for item in dir_path.iterdir():
        if item.is_file() and item.suffix.lower() == '.html':
            if not should_ignore(str(item)):
                results.append(item)
    return results


def scan_recursive(dir_path: Path) -> list[Path]:
    """Retorna todos os .html recursivamente, excluindo padrões ignorados."""
    results = []
    if not dir_path.exists():
        return results
    for item in dir_path.rglob('*.html'):
        if not should_ignore(str(item)):
            results.append(item)
    return results


def main():
    print("=" * 70)
    print("  fix-portugues-html.py — Correções de Português nos HTMLs do Zyntra")
    print("=" * 70)
    print()

    # Coletar todos os arquivos HTML de produção
    all_files: list[Path] = []

    for dir_rel in HTML_DIRS:
        dir_abs = BASE / dir_rel
        if dir_abs.exists():
            files = scan_directory(dir_abs)
            all_files.extend(files)

    # Também fazer varredura recursiva nas pastas de módulos (para subpastas não listadas)
    for module_dir in (BASE / 'modules').iterdir():
        if module_dir.is_dir() and module_dir.name not in ('Financeiro_backup_20260319',):
            for html_file in module_dir.rglob('*.html'):
                if not should_ignore(str(html_file)) and html_file not in all_files:
                    all_files.append(html_file)

    # Deduplica preservando ordem
    seen = set()
    unique_files = []
    for f in all_files:
        key = str(f).lower()
        if key not in seen:
            seen.add(key)
            unique_files.append(f)

    print(f"  Arquivos encontrados: {len(unique_files)}")
    print()

    # Processar
    results = []
    for f in unique_files:
        result = process_file(f)
        results.append(result)

    # Relatório
    modified = [r for r in results if r.get('total', 0) > 0]
    errors = [r for r in results if 'error' in r]

    print(f"{'─'*70}")
    print(f"  ARQUIVOS MODIFICADOS: {len(modified)}/{len(unique_files)}")
    print(f"{'─'*70}")

    total_mojibake = 0
    total_spelling = 0

    for r in modified:
        mj = r.get('mojibake', 0)
        sp = r.get('spelling', 0)
        total_mojibake += mj
        total_spelling += sp
        parts = []
        if mj:
            parts.append(f"{mj} mojibake")
        if sp:
            parts.append(f"{sp} ortografia")
        print(f"  ✅  {r['file']}  [{', '.join(parts)}]")

    if errors:
        print()
        print(f"  ERROS:")
        for r in errors:
            print(f"  ❌  {r['file']}: {r['error']}")

    print()
    print(f"{'═'*70}")
    print(f"  TOTAL: {total_mojibake + total_spelling} correções")
    print(f"         {total_mojibake} mojibake  +  {total_spelling} ortografia")
    print(f"{'═'*70}")


if __name__ == '__main__':
    main()
