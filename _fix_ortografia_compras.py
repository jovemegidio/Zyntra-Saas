#!/usr/bin/env python3
# fix_compras_ortografia.py
# Corrige erros de ortografia PT-BR nos HTMLs do módulo Compras
# SEGURO: só afeta texto visível (entre tags HTML) e atributos title/placeholder/aria-label
# NÃO afeta: id="...", class="...", href="...", src="...", name="...", blocos <script>, <style>

import re
import os
import sys

# ─────────────────────────────────────────────
# Mapa de correções (errado → correto)
# Somente palavras completas em texto visível
# ─────────────────────────────────────────────
WORD_CORRECTIONS = [
    # cotação
    ('Cotacao', 'Cotação'),
    ('cotacao', 'cotação'),
    ('Cotacoes', 'Cotações'),
    ('cotacoes', 'cotações'),
    # requisição
    ('Requisicao', 'Requisição'),
    ('requisicao', 'requisição'),
    ('Requisicoes', 'Requisições'),
    ('requisicoes', 'requisições'),
    # número
    ('Numero', 'Número'),
    ('numero', 'número'),
    ('Numeros', 'Números'),
    ('numeros', 'números'),
    # código
    ('Codigo', 'Código'),
    ('codigo', 'código'),
    ('Codigos', 'Códigos'),
    ('codigos', 'códigos'),
    # histórico
    ('Historico', 'Histórico'),
    ('historico', 'histórico'),
    ('Historicos', 'Históricos'),
    ('historicos', 'históricos'),
    # gestão
    ('Gestao', 'Gestão'),
    ('gestao', 'gestão'),
    # seleção
    ('Selecao', 'Seleção'),
    ('selecao', 'seleção'),
    # edição
    ('Edicao', 'Edição'),
    ('edicao', 'edição'),
    # descrição
    ('Descricao', 'Descrição'),
    ('descricao', 'descrição'),
    ('Descricoes', 'Descrições'),
    ('descricoes', 'descrições'),
    # observação
    ('Observacao', 'Observação'),
    ('observacao', 'observação'),
    ('Observacoes', 'Observações'),
    ('observacoes', 'observações'),
    # solicitação
    ('Solicitacao', 'Solicitação'),
    ('solicitacao', 'solicitação'),
    ('Solicitacoes', 'Solicitações'),
    ('solicitacoes', 'solicitações'),
    # aprovação
    ('Aprovacao', 'Aprovação'),
    ('aprovacao', 'aprovação'),
    # avaliação
    ('Avaliacao', 'Avaliação'),
    ('avaliacao', 'avaliação'),
    # atualização
    ('Atualizacao', 'Atualização'),
    ('atualizacao', 'atualização'),
    # cancelação
    ('Cancelacao', 'Cancelação'),
    ('cancelacao', 'cancelação'),
    # notificação
    ('Notificacao', 'Notificação'),
    ('notificacao', 'notificação'),
    # exportação / importação
    ('Exportacao', 'Exportação'),
    ('exportacao', 'exportação'),
    ('Importacao', 'Importação'),
    ('importacao', 'importação'),
    # integração / configuração
    ('Integracao', 'Integração'),
    ('integracao', 'integração'),
    ('Configuracao', 'Configuração'),
    ('configuracao', 'configuração'),
    # condições
    ('Condicoes', 'Condições'),
    ('condicoes', 'condições'),
    # situação
    ('Situacao', 'Situação'),
    ('situacao', 'situação'),
    # período
    ('Periodo', 'Período'),
    ('periodo', 'período'),
    # mínimo / máximo
    ('Minimo', 'Mínimo'),
    ('minimo', 'mínimo'),
    ('Maximo', 'Máximo'),
    ('maximo', 'máximo'),
    # disponível
    ('Disponivel', 'Disponível'),
    ('disponivel', 'disponível'),
    ('Disponiveis', 'Disponíveis'),
    ('disponiveis', 'disponíveis'),
    # movimentação
    ('Movimentacao', 'Movimentação'),
    ('movimentacao', 'movimentação'),
    # informações
    ('Informacoes', 'Informações'),
    ('informacoes', 'informações'),
    # validação
    ('Validacao', 'Validação'),
    ('validacao', 'validação'),
    # criação
    ('Criacao', 'Criação'),
    ('criacao', 'criação'),
    # geração
    ('Geracao', 'Geração'),
    ('geracao', 'geração'),
    # negociação
    ('Negociacao', 'Negociação'),
    ('negociacao', 'negociação'),
    # pendência
    ('Pendencia', 'Pendência'),
    ('pendencia', 'pendência'),
    ('Pendencias', 'Pendências'),
    ('pendencias', 'pendências'),
    # autorização
    ('Autorizacao', 'Autorização'),
    ('autorizacao', 'autorização'),
    # especificação
    ('Especificacao', 'Especificação'),
    ('especificacao', 'especificação'),
    # localização
    ('Localizacao', 'Localização'),
    ('localizacao', 'localização'),
    # separação
    ('Separacao', 'Separação'),
    ('separacao', 'separação'),
    # conclusão
    ('Conclusao', 'Conclusão'),
    ('conclusao', 'conclusão'),
    # operação
    ('Operacao', 'Operação'),
    ('operacao', 'operação'),
    # revisão
    ('Revisao', 'Revisão'),
    ('revisao', 'revisão'),
    # publicação
    ('Publicacao', 'Publicação'),
    ('publicacao', 'publicação'),
    # relação
    ('Relacao', 'Relação'),
    ('relacao', 'relação'),
    # função
    ('Funcao', 'Função'),
    ('funcao', 'função'),
    # typos de digitação
    ('Fornecedro', 'Fornecedor'),
    ('fornecedro', 'fornecedor'),
    ('Forncedor', 'Fornecedor'),
    ('forncedor', 'fornecedor'),
    ('Recebiemnto', 'Recebimento'),
    ('recebiemnto', 'recebimento'),
    ('Materais', 'Materiais'),
    ('materais', 'materiais'),
]

def mask_scripts_styles(html):
    """Substitui blocos script/style por marcadores para evitar alteração."""
    blocks = []
    def replacer(m):
        idx = len(blocks)
        blocks.append(m.group(0))
        return f'__BLOCK_{idx}__'
    
    # Mask <script> blocks
    html = re.sub(r'<script[^>]*>.*?</script>', replacer, html, flags=re.DOTALL | re.IGNORECASE)
    # Mask <style> blocks
    html = re.sub(r'<style[^>]*>.*?</style>', replacer, html, flags=re.DOTALL | re.IGNORECASE)
    # Mask HTML comments
    html = re.sub(r'<!--.*?-->', replacer, html, flags=re.DOTALL)
    return html, blocks

def restore_blocks(html, blocks):
    """Restaura blocos mascados."""
    for i, block in enumerate(blocks):
        html = html.replace(f'__BLOCK_{i}__', block)
    return html

def fix_text_node(text):
    """Aplica correções em um nó de texto visível."""
    for wrong, correct in WORD_CORRECTIONS:
        # Use word-boundary-like replacement: match whole word
        # Works for standalone words or words followed by space/punct
        text = re.sub(r'(?<![a-zA-ZÀ-ÿ])' + re.escape(wrong) + r'(?![a-zA-ZÀ-ÿ])', correct, text)
    return text

def fix_attribute_value(val):
    """Aplica correções em valores de atributos visíveis."""
    for wrong, correct in WORD_CORRECTIONS:
        val = re.sub(r'(?<![a-zA-ZÀ-ÿ])' + re.escape(wrong) + r'(?![a-zA-ZÀ-ÿ])', correct, val)
    return val

def fix_html(html):
    """Corrige HTML preservando scripts, styles e atributos não-visuais."""
    # 1. Mascarar scripts e styles
    html, blocks = mask_scripts_styles(html)
    
    # 2. Corrigir texto entre tags (nós de texto)
    def fix_text_match(m):
        return m.group(1) + fix_text_node(m.group(2)) + m.group(3)
    
    html = re.sub(r'(>)([^<]+)(<)', fix_text_match, html)
    
    # 3. Corrigir atributos visíveis: title, placeholder, aria-label, alt, data-title, data-tooltip, value de option
    def fix_attr(m):
        return m.group(1) + fix_attribute_value(m.group(2)) + m.group(3)
    
    # title="..."
    html = re.sub(r'(title=")([^"]+)(")', fix_attr, html)
    # placeholder="..."
    html = re.sub(r'(placeholder=")([^"]+)(")', fix_attr, html)
    # aria-label="..."
    html = re.sub(r'(aria-label=")([^"]+)(")', fix_attr, html)
    # alt="..."
    html = re.sub(r'(alt=")([^"]+)(")', fix_attr, html)
    # data-title="..."
    html = re.sub(r'(data-title=")([^"]+)(")', fix_attr, html)
    # data-tooltip="..."
    html = re.sub(r'(data-tooltip=")([^"]+)(")', fix_attr, html)
    # data-status="..." (visible status labels)
    # NOT fixing: id, class, href, src, name, action, method, onclick, etc.
    
    # 4. Restaurar scripts e styles
    html = restore_blocks(html, blocks)
    
    return html

def process_directory(base_dir, label):
    """Processa todos os HTMLs em um diretório."""
    html_files = sorted([f for f in os.listdir(base_dir) if f.endswith('.html')])
    
    print(f'\n{"="*60}')
    print(f'SISTEMA: {label}')
    print(f'Diretório: {base_dir}')
    print(f'{"="*60}')
    
    total_files = 0
    total_fixes = 0
    
    for fname in html_files:
        fpath = os.path.join(base_dir, fname)
        original = open(fpath, encoding='utf-8', errors='replace').read()
        fixed = fix_html(original)
        
        if fixed != original:
            # Count differences
            fixes = sum(
                original.count(wrong) - fixed.count(wrong)
                for wrong, correct in WORD_CORRECTIONS
                if original.count(wrong) > fixed.count(wrong)
            )
            print(f'  ✓ {fname}: {fixes} correções')
            total_fixes += fixes
            total_files += 1
            # Write back
            open(fpath, 'w', encoding='utf-8').write(fixed)
        else:
            print(f'  - {fname}: sem alterações')
    
    print(f'\n  Total: {total_files} arquivo(s) modificado(s), {total_fixes} correção(ões)')
    return total_fixes

if __name__ == '__main__':
    targets = [
        ('/var/www/aluforce/modules/Compras', 'Zyntra / Aluforce'),
        ('/var/www/labor-energy/modules/Compras', 'Labor Energy'),
        ('/var/www/labor-eletric/modules/Compras', 'Labor Eletric'),
    ]
    
    grand_total = 0
    for base_dir, label in targets:
        if os.path.isdir(base_dir):
            grand_total += process_directory(base_dir, label)
        else:
            print(f'\n⚠ Diretório não encontrado: {base_dir}')
    
    print(f'\n{"="*60}')
    print(f'TOTAL GERAL: {grand_total} correções aplicadas em 3 sistemas')
    print('Done.')
