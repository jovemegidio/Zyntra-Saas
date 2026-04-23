import os

BASE = r'g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra'
f = os.path.join(BASE, 'modules', 'Financeiro', 'public', 'contas_receber.html')

with open(f, 'rb') as fh:
    raw = fh.read()

# ─────────────────────────────────────────────────────────────────
# FIX 1: CSS – hide native calendar picker indicator
# Insert after the .input-icon-conta i rule (on line with pointer-events:none)
# ─────────────────────────────────────────────────────────────────
old1 = b'        .input-icon-conta i, .input-search-conta i { position:absolute; right:14px; top:50%; transform:translateY(-50%); color:#9ca3af; font-size:14px; pointer-events:none; }'
new1 = old1 + b'\n        .input-icon-conta input[type="date"]::-webkit-calendar-picker-indicator { opacity:0; position:absolute; right:0; width:100%; height:100%; cursor:pointer; }'

assert old1 in raw, 'FIX 1 anchor not found'
raw = raw.replace(old1, new1, 1)
print('FIX 1 applied: CSS calendar picker indicator hidden')

# ─────────────────────────────────────────────────────────────────
# FIX 2: carregarCategorias – add fallback static options when API returns empty
# ─────────────────────────────────────────────────────────────────
old2 = (
    b'        async function carregarCategorias() {\n'
    b'            try {\n'
    b'                var response = await fetch(\'/api/financeiro/categorias\', { credentials: \'include\' });\n'
    b'                if (response.ok) {\n'
    b'                    var rawCats = await response.json();\n'
    b'                    var cats = Array.isArray(rawCats) ? rawCats : (Array.isArray(rawCats && rawCats.data) ? rawCats.data : []);\n'
    b'                    document.getElementById(\'categoria-id\').innerHTML = \'<option value="">Selecione...</option>\' + cats.filter(function(c){return c.tipo===\'receita\';}).map(function(c){return \'<option value="\'+_escFin(c.id)+\'">\'+_escFin(c.nome)+\'</option>\';}).join(\'\');\n'
    b'                }\n'
    b'            } catch(e) { console.error(\'Erro categorias:\', e); }\n'
    b'        }'
)
new2 = (
    b'        async function carregarCategorias() {\n'
    b'            var fallback = [\n'
    b'                {id:\'vendas\',nome:\'Vendas\'},\n'
    b'                {id:\'servicos_prestados\',nome:\'Servi\xc3\xa7os Prestados\'},\n'
    b'                {id:\'comissoes\',nome:\'Comiss\xc3\xb5es\'},\n'
    b'                {id:\'aluguel_receita\',nome:\'Aluguel / Loca\xc3\xa7\xc3\xa3o\'},\n'
    b'                {id:\'juros_receita\',nome:\'Juros e Rendimentos\'},\n'
    b'                {id:\'outras_receitas\',nome:\'Outras Receitas\'}\n'
    b'            ];\n'
    b'            try {\n'
    b'                var response = await fetch(\'/api/financeiro/categorias\', { credentials: \'include\' });\n'
    b'                if (response.ok) {\n'
    b'                    var rawCats = await response.json();\n'
    b'                    var cats = Array.isArray(rawCats) ? rawCats : (Array.isArray(rawCats && rawCats.data) ? rawCats.data : []);\n'
    b'                    var receitas = cats.filter(function(c){return c.tipo===\'receita\';});\n'
    b'                    if (receitas.length === 0) receitas = cats; // fallback: use all if no tipo=receita\n'
    b'                    if (receitas.length > 0) {\n'
    b'                        document.getElementById(\'categoria-id\').innerHTML = \'<option value="">Selecione...</option>\' + receitas.map(function(c){return \'<option value="\'+_escFin(c.id)+\'">\'+_escFin(c.nome)+\'</option>\';}).join(\'\');\n'
    b'                        return;\n'
    b'                    }\n'
    b'                }\n'
    b'            } catch(e) { console.error(\'Erro categorias:\', e); }\n'
    b'            // Fallback est\xc3\xa1tico quando API n\xc3\xa3o retorna dados\n'
    b'            document.getElementById(\'categoria-id\').innerHTML = \'<option value="">Selecione...</option>\' + fallback.map(function(c){return \'<option value="\'+c.id+\'">\'+c.nome+\'</option>\';}).join(\'\');\n'
    b'        }'
)

assert old2 in raw, 'FIX 2 anchor not found'
raw = raw.replace(old2, new2, 1)
print('FIX 2 applied: carregarCategorias fallback added')

# ─────────────────────────────────────────────────────────────────
# FIX 3a: Add list="lista-projetos" to the #cr-projeto input + datalist element
# ─────────────────────────────────────────────────────────────────
old3a = b'                                    <div class="input-search-conta"><input type="text" id="cr-projeto" placeholder=""><i class="fas fa-search"></i></div>'
new3a = (
    b'                                    <div class="input-search-conta">'
    b'<input type="text" id="cr-projeto" placeholder="" list="lista-projetos" autocomplete="off">'
    b'<datalist id="lista-projetos"></datalist>'
    b'<i class="fas fa-search"></i></div>'
)

assert old3a in raw, 'FIX 3a anchor not found'
raw = raw.replace(old3a, new3a, 1)
print('FIX 3a applied: datalist added to #cr-projeto')

# ─────────────────────────────────────────────────────────────────
# FIX 3b: Add carregarProjetos() function after carregarContasBancarias()
# ─────────────────────────────────────────────────────────────────
old3b = b'        async function carregarResumo() {'
new3b = (
    b'        async function carregarProjetos() {\n'
    b'            try {\n'
    b'                var response = await fetch(\'/api/projetos\', { credentials: \'include\' });\n'
    b'                if (response.ok) {\n'
    b'                    var rows = await response.json();\n'
    b'                    var dl = document.getElementById(\'lista-projetos\');\n'
    b'                    if (dl && Array.isArray(rows)) {\n'
    b'                        dl.innerHTML = rows.filter(function(p){return p.nome;}).map(function(p){return \'<option value="\' + _escFin(p.nome) + \'"></option>\';}).join(\'\');\n'
    b'                    }\n'
    b'                }\n'
    b'            } catch(e) { console.error(\'Erro projetos:\', e); }\n'
    b'        }\n\n'
    b'        async function carregarResumo() {'
)

assert old3b in raw, 'FIX 3b anchor not found'
raw = raw.replace(old3b, new3b, 1)
print('FIX 3b applied: carregarProjetos function added')

# ─────────────────────────────────────────────────────────────────
# FIX 3c: Call carregarProjetos() in Promise.all in init()
# ─────────────────────────────────────────────────────────────────
old3c = b'            await Promise.all([carregarUsuarioLogado(), carregarContas(), carregarClientes(), carregarCategorias(), carregarContasBancarias()]);\n'
new3c = b'            await Promise.all([carregarUsuarioLogado(), carregarContas(), carregarClientes(), carregarCategorias(), carregarContasBancarias(), carregarProjetos()]);\n'

assert old3c in raw, 'FIX 3c anchor not found'
raw = raw.replace(old3c, new3c, 1)
print('FIX 3c applied: carregarProjetos added to init Promise.all')

with open(f, 'wb') as fh:
    fh.write(raw)
print('\nAll fixes saved to contas_receber.html')
