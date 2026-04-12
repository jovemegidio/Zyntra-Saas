# fix-financeiro-encoding.ps1
# Corrige caracteres corrompidos (U+FFFD) nos HTMLs do modulo Financeiro
# Os arquivos tinham encoding Latin-1/CP-1252 e foram salvos como UTF-8,
# perdendo os bytes originais (substituidos por U+FFFD).

$basePath = "g:\.shortcut-targets-by-id\1cwjbEHD82YI8KNdhYtxmMhyZezb1IsFN\Zyntra"
$files = Get-ChildItem -Path "$basePath\modules\Financeiro" -Recurse -Filter "*.html"
$r = [char]0xFFFD
$totalFixed = 0

foreach ($f in $files) {
    $content = [System.IO.File]::ReadAllText($f.FullName, [System.Text.Encoding]::UTF8)

    if (-not $content.Contains($r)) { continue }

    $before = ($content.ToCharArray() | Where-Object { $_ -eq $r }).Count
    $original = $content

    # =============================================
    # PASSO 1: Padroes duplos (dois U+FFFD seguidos)
    # =============================================
    # Padrao: двойção = ç + ã → ção (ex: Descrição, Opção, integração)
    $content = $content.Replace("$r${r}o", "ção")
    # Padrao: ções = ç + õ → ções (ex: Notificações, funções, opções)
    $content = $content.Replace("$r${r}es", "ções")
    # Maiusculo
    $content = $content.Replace("$r${r}O", "ÇÃO")

    # =============================================
    # PASSO 2: Padroes simples - palavras especificas
    # =============================================

    # --- ã (a til) ---
    $content = $content.Replace("padr${r}o", "padrão")
    $content = $content.Replace("PADR${r}O", "PADRÃO")
    $content = $content.Replace("Padr${r}o", "Padrão")
    $content = $content.Replace("Bot${r}o", "Botão")
    $content = $content.Replace("bot${r}o", "botão")
    $content = $content.Replace("n${r}o", "não")
    $content = $content.Replace("N${r}o", "Não")
    $content = $content.Replace("Raz${r}o", "Razão")
    $content = $content.Replace("raz${r}o", "razão")
    $content = $content.Replace("inclus${r}o", "inclusão")
    $content = $content.Replace("amanh${r}", "amanhã")
    $content = $content.Replace("ser${r}o", "serão")
    $content = $content.Replace("conex${r}o", "conexão")
    $content = $content.Replace("Conex${r}o", "Conexão")
    $content = $content.Replace("cidad${r}o", "cidadão")
    $content = $content.Replace("m${r}o", "mão")

    # --- á (a agudo) ---
    $content = $content.Replace("Usu${r}rio", "Usuário")
    $content = $content.Replace("usu${r}rio", "usuário")
    $content = $content.Replace("v${r}lido", "válido")
    $content = $content.Replace("V${r}lido", "Válido")
    $content = $content.Replace("Autom${r}tica", "Automática")
    $content = $content.Replace("autom${r}tica", "automática")
    $content = $content.Replace("Banc${r}rios", "Bancários")
    $content = $content.Replace("banc${r}rios", "bancários")
    $content = $content.Replace("Banc${r}rio", "Bancário")
    $content = $content.Replace("banc${r}rio", "bancário")
    $content = $content.Replace("Gr${r}fico", "Gráfico")
    $content = $content.Replace("gr${r}fico", "gráfico")
    $content = $content.Replace("Respons${r}vel", "Responsável")
    $content = $content.Replace("respons${r}vel", "responsável")
    $content = $content.Replace("Tribut${r}rio", "Tributário")
    $content = $content.Replace("tribut${r}rio", "tributário")
    $content = $content.Replace("p${r}gina", "página")
    $content = $content.Replace("P${r}gina", "Página")
    $content = $content.Replace("Obrigat${r}rio", "Obrigatório")
    $content = $content.Replace("obrigat${r}rio", "obrigatório")
    $content = $content.Replace("necess${r}rio", "necessário")
    $content = $content.Replace("Necess${r}rio", "Necessário")
    $content = $content.Replace("j${r} ", "já ")
    $content = $content.Replace("est${r} ", "está ")
    $content = $content.Replace("est${r},", "está,")
    $content = $content.Replace("est${r}.", "está.")
    $content = $content.Replace("prim${r}rio", "primário")
    $content = $content.Replace("Prim${r}rio", "Primário")
    $content = $content.Replace("secund${r}rio", "secundário")
    $content = $content.Replace("Secund${r}rio", "Secundário")
    $content = $content.Replace("coment${r}rio", "comentário")
    $content = $content.Replace("Coment${r}rio", "Comentário")
    $content = $content.Replace("Volunt${r}rio", "Voluntário")
    $content = $content.Replace("Sal${r}rio", "Salário")
    $content = $content.Replace("sal${r}rio", "salário")
    $content = $content.Replace("calend${r}rio", "calendário")
    $content = $content.Replace("Calend${r}rio", "Calendário")
    $content = $content.Replace("h${r} ", "há ")
    $content = $content.Replace("h${r}`n", "há`n")

    # --- ó (o agudo) ---
    $content = $content.Replace("Relat${r}rios", "Relatórios")
    $content = $content.Replace("relat${r}rios", "relatórios")
    $content = $content.Replace("Relat${r}rio", "Relatório")
    $content = $content.Replace("relat${r}rio", "relatório")
    $content = $content.Replace("Pr${r}ximos", "Próximos")
    $content = $content.Replace("pr${r}ximos", "próximos")
    $content = $content.Replace("Pr${r}ximo", "Próximo")
    $content = $content.Replace("pr${r}ximo", "próximo")
    $content = $content.Replace("Aleat${r}ria", "Aleatória")
    $content = $content.Replace("aleat${r}ria", "aleatória")
    $content = $content.Replace("Aleat${r}rio", "Aleatório")
    $content = $content.Replace("aleat${r}rio", "aleatório")
    $content = $content.Replace("neg${r}cio", "negócio")
    $content = $content.Replace("Neg${r}cio", "Negócio")
    $content = $content.Replace("hist${r}rico", "histórico")
    $content = $content.Replace("Hist${r}rico", "Histórico")

    # --- ú (u agudo) ---
    $content = $content.Replace("n${r}mero", "número")
    $content = $content.Replace("N${r}mero", "Número")
    $content = $content.Replace("Ind${r}stria", "Indústria")
    $content = $content.Replace("ind${r}stria", "indústria")
    $content = $content.Replace("Ita${r}", "Itaú")
    $content = $content.Replace("conte${r}do", "conteúdo")
    $content = $content.Replace("Conte${r}do", "Conteúdo")
    $content = $content.Replace("sa${r}de", "saúde")
    $content = $content.Replace("Sa${r}de", "Saúde")

    # Ú/ú no inicio de palavra (ordem: mais longo primeiro)
    $content = $content.Replace("${r}ltimos", "Últimos")
    $content = $content.Replace("${r}ltimo", "último")
    $content = $content.Replace("${r}nico", "único")
    $content = $content.Replace("${r}nica", "única")

    # --- í (i agudo) ---
    $content = $content.Replace("per${r}odo", "período")
    $content = $content.Replace("Per${r}odo", "Período")
    $content = $content.Replace("Sa${r}das", "Saídas")
    $content = $content.Replace("sa${r}das", "saídas")
    $content = $content.Replace("Sa${r}da", "Saída")
    $content = $content.Replace("sa${r}da", "saída")
    $content = $content.Replace("espec${r}ficos", "específicos")
    $content = $content.Replace("espec${r}fico", "específico")
    $content = $content.Replace("Espec${r}fico", "Específico")
    $content = $content.Replace("dispon${r}vel", "disponível")
    $content = $content.Replace("Dispon${r}vel", "Disponível")
    $content = $content.Replace("t${r}tulo", "título")
    $content = $content.Replace("T${r}tulo", "Título")
    $content = $content.Replace("Caracter${r}sticas", "Características")
    $content = $content.Replace("caracter${r}sticas", "características")
    $content = $content.Replace("poss${r}vel", "possível")
    $content = $content.Replace("Poss${r}vel", "Possível")
    $content = $content.Replace("c${r}digo", "código")
    $content = $content.Replace("C${r}digo", "Código")
    $content = $content.Replace("al${r}quota", "alíquota")
    $content = $content.Replace("Al${r}quota", "Alíquota")
    $content = $content.Replace("m${r}nimo", "mínimo")
    $content = $content.Replace("M${r}nimo", "Mínimo")
    # --- á (mais) ---
    $content = $content.Replace("m${r}ximo", "máximo")
    $content = $content.Replace("M${r}ximo", "Máximo")

    # --- é (e agudo) ---
    $content = $content.Replace("Cr${r}dito", "Crédito")
    $content = $content.Replace("cr${r}dito", "crédito")
    $content = $content.Replace("M${r}todo", "Método")
    $content = $content.Replace("m${r}todo", "método")
    $content = $content.Replace("Com${r}rcio", "Comércio")
    $content = $content.Replace("com${r}rcio", "comércio")
    $content = $content.Replace("D${r}bito", "Débito")
    $content = $content.Replace("d${r}bito", "débito")
    $content = $content.Replace("s${r}rie", "série")
    $content = $content.Replace("S${r}rie", "Série")
    # 'até' - com contexto para evitar conflitos
    $content = $content.Replace(" at${r} ", " até ")
    $content = $content.Replace(">at${r}<", ">até<")
    $content = $content.Replace("`"at${r}`"", "`"até`"")
    $content = $content.Replace("'at${r}'", "'até'")

    # --- ç (c cedilha) ---
    $content = $content.Replace("endere${r}o", "endereço")
    $content = $content.Replace("Endere${r}o", "Endereço")
    $content = $content.Replace("Or${r}amentos", "Orçamentos")
    $content = $content.Replace("or${r}amentos", "orçamentos")
    $content = $content.Replace("Or${r}amento", "Orçamento")
    $content = $content.Replace("or${r}amento", "orçamento")
    $content = $content.Replace("Lan${r}amentos", "Lançamentos")
    $content = $content.Replace("lan${r}amentos", "lançamentos")
    $content = $content.Replace("Lan${r}amento", "Lançamento")
    $content = $content.Replace("lan${r}amento", "lançamento")
    $content = $content.Replace("for${r}ar", "forçar")
    $content = $content.Replace("Cobran${r}a", "Cobrança")
    $content = $content.Replace("cobran${r}a", "cobrança")
    $content = $content.Replace("Poupan${r}a", "Poupança")
    $content = $content.Replace("poupan${r}a", "poupança")
    $content = $content.Replace("Pre${r}os", "Preços")
    $content = $content.Replace("pre${r}os", "preços")
    $content = $content.Replace("Pre${r}o", "Preço")
    $content = $content.Replace("pre${r}o", "preço")
    $content = $content.Replace("servi${r}os", "serviços")
    $content = $content.Replace("Servi${r}os", "Serviços")
    $content = $content.Replace("servi${r}o", "serviço")
    $content = $content.Replace("Servi${r}o", "Serviço")
    $content = $content.Replace("balan${r}o", "balanço")
    $content = $content.Replace("Balan${r}o", "Balanço")
    $content = $content.Replace("dan${r}a", "dança")
    $content = $content.Replace("li${r}a", "liça")
    $content = $content.Replace("avan${r}o", "avanço")
    $content = $content.Replace("cabe${r}a", "cabeça")
    $content = $content.Replace("crian${r}a", "criança")
    $content = $content.Replace("Crian${r}a", "Criança")

    # --- ê (e circunflexo) ---
    $content = $content.Replace("M${r}s", "Mês")
    $content = $content.Replace("m${r}s", "mês")
    $content = $content.Replace("Voc${r} ", "Você ")
    $content = $content.Replace("voc${r} ", "você ")
    $content = $content.Replace("Ag${r}ncia", "Agência")
    $content = $content.Replace("ag${r}ncia", "agência")
    $content = $content.Replace("frequ${r}ncia", "frequência")
    $content = $content.Replace("Frequ${r}ncia", "Frequência")
    $content = $content.Replace("refer${r}ncia", "referência")
    $content = $content.Replace("Refer${r}ncia", "Referência")
    $content = $content.Replace("ger${r}ncia", "gerência")
    $content = $content.Replace("Ger${r}ncia", "Gerência")

    # --- ô (o circunflexo) ---
    $content = $content.Replace("At${r}mica", "Atômica")
    $content = $content.Replace("at${r}mica", "atômica")
    $content = $content.Replace("Econ${r}mica", "Econômica")
    $content = $content.Replace("econ${r}mica", "econômica")

    # --- õ (o til) ---
    $content = $content.Replace("permiss${r}es", "permissões")
    $content = $content.Replace("Permiss${r}es", "Permissões")
    $content = $content.Replace("bot${r}es", "botões")
    $content = $content.Replace("Bot${r}es", "Botões")

    # =============================================
    # PASSO 3: Separadores standalone (em dash)
    # =============================================
    $emdash = [char]0x2014
    $content = $content.Replace(" $r ", " $emdash ")
    $content = $content.Replace(">$r<", ">$emdash<")

    # =============================================
    # SALVAR com UTF-8 (sem BOM)
    # =============================================
    if ($content -ne $original) {
        $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
        [System.IO.File]::WriteAllText($f.FullName, $content, $utf8NoBom)
        $after = ($content.ToCharArray() | Where-Object { $_ -eq $r }).Count
        $fixed = $before - $after
        $totalFixed += $fixed
        $rel = $f.FullName.Replace($basePath, "")
        Write-Host "[FIXED] $rel : $before -> $after (corrigidos: $fixed)"
    }
}

Write-Host "`n=== Total de caracteres corrompidos corrigidos: $totalFixed ==="
