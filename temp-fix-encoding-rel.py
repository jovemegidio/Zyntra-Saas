#!/usr/bin/env python3
import os

filepath = os.path.join(os.path.dirname(__file__), 'modules', 'Vendas', 'public', 'relatorios.html')

with open(filepath, 'rb') as f:
    data = f.read()

fffd = b'\xef\xbf\xbd'
count = data.count(fffd)
print(f'Found {count} U+FFFD characters')

replacements = [
    # relatório
    (b'relat\xef\xbf\xbdrio', b'relat\xc3\xb3rio'),
    (b'Relat\xef\xbf\xbdrio', b'Relat\xc3\xb3rio'),
    (b'RELAT\xef\xbf\xbdRIO', b'RELAT\xc3\x93RIO'),
    # período
    (b'per\xef\xbf\xbdodo', b'per\xc3\xadodo'),
    # usuário
    (b'usu\xef\xbf\xbdrio', b'usu\xc3\xa1rio'),
    (b'Usu\xef\xbf\xbdrio', b'Usu\xc3\xa1rio'),
    (b'USU\xef\xbf\xbdRIO', b'USU\xc3\x81RIO'),
    # estatística
    (b'estat\xef\xbf\xbdstica', b'estat\xc3\xadstica'),
    # gráfico
    (b'gr\xef\xbf\xbdfico', b'gr\xc3\xa1fico'),
    (b'GR\xef\xbf\xbdFICO', b'GR\xc3\x81FICO'),
    # métrica
    (b'm\xef\xbf\xbdtrica', b'm\xc3\xa9trica'),
    # dinâmico
    (b'din\xef\xbf\xbdmico', b'din\xc3\xa2mico'),
    # conexão
    (b'conex\xef\xbf\xbdo', b'conex\xc3\xa3o'),
    # Variável
    (b'Vari\xef\xbf\xbdvel', b'Vari\xc3\xa1vel'),
    (b'vari\xef\xbf\xbdvel', b'vari\xc3\xa1vel'),
    # formulário
    (b'formul\xef\xbf\xbdrio', b'formul\xc3\xa1rio'),
    # lógica
    (b'l\xef\xbf\xbdgica', b'l\xc3\xb3gica'),
    # disponível
    (b'dispon\xef\xbf\xbdvel', b'dispon\xc3\xadvel'),
    # funcionário
    (b'funcion\xef\xbf\xbdrio', b'funcion\xc3\xa1rio'),
    # Análise
    (b'An\xef\xbf\xbdlise', b'An\xc3\xa1lise'),
    (b'an\xef\xbf\xbdlise', b'an\xc3\xa1lise'),
    # histórico
    (b'hist\xef\xbf\xbdrico', b'hist\xc3\xb3rico'),
    # rentáveis
    (b'rent\xef\xbf\xbdveis', b'rent\xc3\xa1veis'),
    # Médio
    (b'M\xef\xbf\xbddio', b'M\xc3\xa9dio'),
    (b'm\xef\xbf\xbddio', b'm\xc3\xa9dio'),
    # Versão
    (b'Vers\xef\xbf\xbdo', b'Vers\xc3\xa3o'),
    (b'vers\xef\xbf\xbdo', b'vers\xc3\xa3o'),
    # padrão
    (b'padr\xef\xbf\xbdo', b'padr\xc3\xa3o'),
    # Não/não
    (b'N\xef\xbf\xbdo ', b'N\xc3\xa3o '),
    (b'n\xef\xbf\xbdo ', b'n\xc3\xa3o '),
    # página
    (b'p\xef\xbf\xbdgina', b'p\xc3\xa1gina'),
    # último
    (b'\xef\xbf\xbdltimo', b'\xc3\xbaltimo'),
    # só
    (b's\xef\xbf\xbd ', b's\xc3\xb3 '),
    # é (standalone)
    (b' \xef\xbf\xbd ', b' \xc3\xa9 '),
    # múltipla
    (b'm\xef\xbf\xbdltipla', b'm\xc3\xbaltipla'),
    (b'm\xef\xbf\xbdltiplos', b'm\xc3\xbaltiplos'),
    # já
    (b'j\xef\xbf\xbd ', b'j\xc3\xa1 '),
    # está
    (b'est\xef\xbf\xbd ', b'est\xc3\xa1 '),
    # autenticação
    (b'autentica\xef\xbf\xbd\xef\xbf\xbdo', b'autentica\xc3\xa7\xc3\xa3o'),
    (b'Autentica\xef\xbf\xbd\xef\xbf\xbdo', b'Autentica\xc3\xa7\xc3\xa3o'),
    (b'AUTENTICA\xef\xbf\xbd\xef\xbf\xbdo', b'AUTENTICA\xc3\x87\xc3\x83O'),
    # Evolução
    (b'Evolu\xef\xbf\xbd\xef\xbf\xbdo', b'Evolu\xc3\xa7\xc3\xa3o'),
    (b'evolu\xef\xbf\xbd\xef\xbf\xbdo', b'evolu\xc3\xa7\xc3\xa3o'),
    # Ordenação
    (b'Ordena\xef\xbf\xbd\xef\xbf\xbdo', b'Ordena\xc3\xa7\xc3\xa3o'),
    (b'ordena\xef\xbf\xbd\xef\xbf\xbdo', b'ordena\xc3\xa7\xc3\xa3o'),
    # Saudação
    (b'Sauda\xef\xbf\xbd\xef\xbf\xbdo', b'Sauda\xc3\xa7\xc3\xa3o'),
    (b'sauda\xef\xbf\xbd\xef\xbf\xbdo', b'sauda\xc3\xa7\xc3\xa3o'),
    # Configurações
    (b'Configura\xef\xbf\xbd\xef\xbf\xbdes', b'Configura\xc3\xa7\xc3\xb5es'),
    (b'configura\xef\xbf\xbd\xef\xbf\xbdes', b'configura\xc3\xa7\xc3\xb5es'),
    # Notificações
    (b'Notifica\xef\xbf\xbd\xef\xbf\xbdes', b'Notifica\xc3\xa7\xc3\xb5es'),
    (b'notifica\xef\xbf\xbd\xef\xbf\xbdes', b'notifica\xc3\xa7\xc3\xb5es'),
    # Prospecção
    (b'Prospec\xef\xbf\xbd\xef\xbf\xbdo', b'Prospec\xc3\xa7\xc3\xa3o'),
    # Comissões
    (b'Comiss\xef\xbf\xbdes', b'Comiss\xc3\xb5es'),
    (b'comiss\xef\xbf\xbdes', b'comiss\xc3\xb5es'),
    # seleção
    (b'sele\xef\xbf\xbd\xef\xbf\xbdo', b'sele\xc3\xa7\xc3\xa3o'),
    # orçamento
    (b'or\xef\xbf\xbdamento', b'or\xc3\xa7amento'),
    (b'Or\xef\xbf\xbdamento', b'Or\xc3\xa7amento'),
    # SEGURANÇA
    (b'SEGURAN\xef\xbf\xbdA', b'SEGURAN\xc3\x87A'),
    # opção
    (b'op\xef\xbf\xbd\xef\xbf\xbdo', b'op\xc3\xa7\xc3\xa3o'),
    # forçar
    (b'for\xef\xbf\xbdar', b'for\xc3\xa7ar'),
    # Pré-
    (b'Pr\xef\xbf\xbd-', b'Pr\xc3\xa9-'),
    (b'pr\xef\xbf\xbd-', b'pr\xc3\xa9-'),
    # Início
    (b'In\xef\xbf\xbdcio', b'In\xc3\xadcio'),
    (b'in\xef\xbf\xbdcio', b'in\xc3\xadcio'),
    # Gestão
    (b'Gest\xef\xbf\xbdo', b'Gest\xc3\xa3o'),
    (b'gest\xef\xbf\xbdo', b'gest\xc3\xa3o'),
    # visualização
    (b'visualiza\xef\xbf\xbd\xef\xbf\xbdo', b'visualiza\xc3\xa7\xc3\xa3o'),
    # Carregamento
    (b'Carregamento Relat\xef\xbf\xbdrio', b'Carregamento Relat\xc3\xb3rio'),
    # informação
    (b'informa\xef\xbf\xbd\xef\xbf\xbdo', b'informa\xc3\xa7\xc3\xa3o'),
    # condição
    (b'condi\xef\xbf\xbd\xef\xbf\xbdo', b'condi\xc3\xa7\xc3\xa3o'),
    # ícone → separator char (the diamond ›)
    (b'\xef\xbf\xbd</span>', b'\xe2\x80\xba</span>'),
    # Additional patterns
    (b'Relat\xef\xbf\xbdrios', b'Relat\xc3\xb3rios'),
    (b'relat\xef\xbf\xbdrios', b'relat\xc3\xb3rios'),
    (b'crit\xef\xbf\xbdrio', b'crit\xc3\xa9rio'),
    (b'aten\xef\xbf\xbd\xef\xbf\xbdo', b'aten\xc3\xa7\xc3\xa3o'),
    (b'exce\xef\xbf\xbd\xef\xbf\xbdo', b'exce\xc3\xa7\xc3\xa3o'),
    (b'fun\xef\xbf\xbd\xef\xbf\xbdo', b'fun\xc3\xa7\xc3\xa3o'),
    (b'descri\xef\xbf\xbd\xef\xbf\xbdo', b'descri\xc3\xa7\xc3\xa3o'),
    (b'exporta\xef\xbf\xbd\xef\xbf\xbdo', b'exporta\xc3\xa7\xc3\xa3o'),
    (b'posi\xef\xbf\xbd\xef\xbf\xbdo', b'posi\xc3\xa7\xc3\xa3o'),
    (b'intera\xef\xbf\xbd\xef\xbf\xbdo', b'intera\xc3\xa7\xc3\xa3o'),
    (b'convers\xef\xbf\xbdo', b'convers\xc3\xa3o'),
    (b'apresenta\xef\xbf\xbd\xef\xbf\xbdo', b'apresenta\xc3\xa7\xc3\xa3o'),
    (b'ter\xef\xbf\xbda', b'ter\xc3\xa7a'),
    (b'gera\xef\xbf\xbd\xef\xbf\xbdo', b'gera\xc3\xa7\xc3\xa3o'),
    (b'autoriza\xef\xbf\xbd\xef\xbf\xbdo', b'autoriza\xc3\xa7\xc3\xa3o'),
    (b'sen\xef\xbf\xbdo', b'sen\xc3\xa3o'),
    # Período (uppercase P)
    (b'Per\xef\xbf\xbdodo', b'Per\xc3\xadodo'),
    (b'PER\xef\xbf\xbdODO', b'PER\xc3\x8dODO'),
    # Verificação
    (b'Verifica\xef\xbf\xbd\xef\xbf\xbdo', b'Verifica\xc3\xa7\xc3\xa3o'),
    (b'verifica\xef\xbf\xbd\xef\xbf\xbdo', b'verifica\xc3\xa7\xc3\xa3o'),
    # será
    (b'ser\xef\xbf\xbd ', b'ser\xc3\xa1 '),
    # Comissão (single word)
    (b'Comiss\xef\xbf\xbdo', b'Comiss\xc3\xa3o'),
    (b'comiss\xef\xbf\xbdo', b'comiss\xc3\xa3o'),
    (b'COMISS\xef\xbf\xbdO', b'COMISS\xc3\x83O'),
    (b'COMISS\xef\xbf\xbdES', b'COMISS\xc3\x95ES'),
    # Potência
    (b'Pot\xef\xbf\xbdncia', b'Pot\xc3\xaancia'),
    (b'pot\xef\xbf\xbdncia', b'pot\xc3\xaancia'),
    # catálogo
    (b'cat\xef\xbf\xbdlogo', b'cat\xc3\xa1logo'),
    # são
    (b's\xef\xbf\xbdo ', b's\xc3\xa3o '),
    (b'S\xef\xbf\xbdo ', b'S\xc3\xa3o '),
    # Seleção
    (b'Sele\xef\xbf\xbd\xef\xbf\xbdo', b'Sele\xc3\xa7\xc3\xa3o'),
    # Localização
    (b'Localiza\xef\xbf\xbd\xef\xbf\xbdo', b'Localiza\xc3\xa7\xc3\xa3o'),
    (b'localiza\xef\xbf\xbd\xef\xbf\xbdo', b'localiza\xc3\xa7\xc3\xa3o'),
    # incluirá
    (b'incluir\xef\xbf\xbd ', b'incluir\xc3\xa1 '),
    # permissão
    (b'permiss\xef\xbf\xbdo', b'permiss\xc3\xa3o'),
    # próprio/própria
    (b'pr\xef\xbf\xbdprio', b'pr\xc3\xb3prio'),
    (b'pr\xef\xbf\xbdpria', b'pr\xc3\xb3pria'),
    # AUTENTICAÇÃO (uppercase O)
    (b'AUTENTICA\xef\xbf\xbd\xef\xbf\xbdO', b'AUTENTICA\xc3\x87\xc3\x83O'),
    # sessão
    (b'sess\xef\xbf\xbdo', b'sess\xc3\xa3o'),
    # inválida
    (b'inv\xef\xbf\xbdlida', b'inv\xc3\xa1lida'),
    # ESTATÍSTICAS
    (b'ESTAT\xef\xbf\xbdSTICA', b'ESTAT\xc3\x8dSTICA'),
    # EVOLUÇÃO
    (b'EVOLU\xef\xbf\xbd\xef\xbf\xbdO', b'EVOLU\xc3\x87\xc3\x83O'),
    # Gráficos
    (b'Gr\xef\xbf\xbdficos', b'Gr\xc3\xa1ficos'),
    # Mantém
    (b'Mant\xef\xbf\xbdm', b'Mant\xc3\xa9m'),
    (b'mant\xef\xbf\xbdm', b'mant\xc3\xa9m'),
    # AÇÕES
    (b'A\xef\xbf\xbd\xef\xbf\xbdES', b'A\xc3\x87\xc3\x95ES'),
    # Impressão
    (b'Impress\xef\xbf\xbdo', b'Impress\xc3\xa3o'),
    (b'impress\xef\xbf\xbdo', b'impress\xc3\xa3o'),
    # Título
    (b'T\xef\xbf\xbdtulo', b'T\xc3\xadtulo'),
    (b't\xef\xbf\xbdtulo', b't\xc3\xadtulo'),
    # Rodapé
    (b'Rodap\xef\xbf\xbd', b'Rodap\xc3\xa9'),
    # às
    (b' \xef\xbf\xbds ', b' \xc3\xa0s '),
    # ANÁLISE
    (b'AN\xef\xbf\xbdLISE', b'AN\xc3\x81LISE'),
    # CÓDIGO
    (b'C\xef\xbf\xbdDIGO', b'C\xc3\x93DIGO'),
    # INICIALIZAÇÃO
    (b'INICIALIZA\xef\xbf\xbd\xef\xbf\xbdO', b'INICIALIZA\xc3\x87\xc3\x83O'),
    (b'inicializa\xef\xbf\xbd\xef\xbf\xbdo', b'inicializa\xc3\xa7\xc3\xa3o'),
    # Você
    (b'Voc\xef\xbf\xbd', b'Voc\xc3\xaa'),
    (b'voc\xef\xbf\xbd', b'voc\xc3\xaa'),
    # Faça
    (b'Fa\xef\xbf\xbda', b'Fa\xc3\xa7a'),
    (b'fa\xef\xbf\xbda', b'fa\xc3\xa7a'),
    # concluída
    (b'conclu\xef\xbf\xbdda', b'conclu\xc3\xadda'),
    # módulo
    (b'm\xef\xbf\xbddulo', b'm\xc3\xb3dulo'),
    (b'M\xef\xbf\xbddulo', b'M\xc3\xb3dulo'),
    # Brazilian states
    (b"Amap\xef\xbf\xbd'", b"Amap\xc3\xa1'"),
    (b"Cear\xef\xbf\xbd'", b"Cear\xc3\xa1'"),
    (b"Goi\xef\xbf\xbds'", b"Goi\xc3\xa1s'"),
    (b'Maranh\xef\xbf\xbdo', b'Maranh\xc3\xa3o'),
    (b"Par\xef\xbf\xbd'", b"Par\xc3\xa1'"),
    (b'Para\xef\xbf\xbdba', b'Para\xc3\xadba'),
    (b"Piau\xef\xbf\xbd'", b"Piau\xc3\xad'"),
    (b'Rond\xef\xbf\xbdnia', b'Rond\xc3\xb4nia'),
    (b'Conex\xef\xbf\xbdo', b'Conex\xc3\xa3o'),
    # posição
    (b'posi\xef\xbf\xbd\xef\xbf\xbdes', b'posi\xc3\xa7\xc3\xb5es'),
    # Initialização (remaining case with caps I)
    (b'Inicializa\xef\xbf\xbd\xef\xbf\xbdo', b'Inicializa\xc3\xa7\xc3\xa3o'),
    # Espírito
    (b'Esp\xef\xbf\xbdrito', b'Esp\xc3\xadrito'),
    # Paraná
    (b"Paran\xef\xbf\xbd'", b"Paran\xc3\xa1'"),
    (b'Paran\xef\xbf\xbd', b'Paran\xc3\xa1'),
    # posição (variant)
    (b'posi\xef\xbf\xbd\xc3\xb5es', b'posi\xc3\xa7\xc3\xb5es'),
    # ções ending (catch remaining)
    (b'\xef\xbf\xbdes', b'\xc3\xb5es'),
    # Catch-all remaining single FFFD → try common accenteds
    (b'r\xef\xbf\xbd ', b'r\xc3\xa1 '),   # será → á at end
]

for old, new in replacements:
    c = data.count(old)
    if c > 0:
        data = data.replace(old, new)
        print(f'  Replaced {c}x: {old[:40]}')

remaining = data.count(fffd)
print(f'\nRemaining U+FFFD: {remaining}')

if remaining > 0:
    lines = data.split(b'\n')
    for i, line in enumerate(lines):
        if fffd in line:
            idx = line.index(fffd)
            ctx = line[max(0,idx-20):idx+25]
            print(f'  L{i+1}: {ctx}')

with open(filepath, 'wb') as f:
    f.write(data)
print('\nFile saved!')
