# Run CRUD tests for produtos and materiais using existing test_login_body.json
# Steps: login -> POST produto -> PUT produto -> GET produtos -> DELETE produto
# and same for materiais. Prints status and responses.

$baseUrl = 'http://localhost:3001'
$loginBody = Get-Content -Path .\test_login_body.json -Raw | ConvertFrom-Json

$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
Write-Host "== LOGIN =="
try {
    $loginResp = Invoke-RestMethod -Uri "$baseUrl/api/pcp/login" -Method Post -Body ($loginBody | ConvertTo-Json -Depth 10) -ContentType 'application/json' -WebSession $session -ErrorAction Stop
    Write-Host "Login response object:"; $loginResp | ConvertTo-Json -Depth 5
} catch {
    Write-Host "LOGIN_FAIL:" $_.Exception.Message
    exit 1
}

# helper to call and show
function Do-Req($method, $url, $body=$null) {
    try {
        if ($body -ne $null) {
            $res = Invoke-RestMethod -Uri $url -Method $method -Body ($body | ConvertTo-Json -Depth 10) -ContentType 'application/json' -WebSession $session -ErrorAction Stop
        } else {
            $res = Invoke-RestMethod -Uri $url -Method $method -WebSession $session -ErrorAction Stop
        }
        Write-Host "$method $url -> OK"
        $res | ConvertTo-Json -Depth 5
        return $res
    } catch {
        Write-Host "$method $url -> FAIL: " $_.Exception.Message
        return $null
    }
}

Write-Host "== PRODUTOS CRUD =="
# create
$newProduto = @{ codigo='TEST-PROD-001'; descricao='Produto de teste automático'; unidade_medida='UN'; quantidade_estoque='10'; custo_unitario='5.5' }
$created = Do-Req -method 'Post' -url "$baseUrl/api/pcp/produtos" -body $newProduto
if ($created -eq $null) { Write-Host 'Create produto failed, aborting produto tests.' } else {
    $prodId = $created.id
    Write-Host "Created produto id=$prodId"
    # update
    $update = @{ descricao='Produto de teste automático - atualizado'; quantidade_estoque='15' }
    Do-Req -method 'Put' -url "$baseUrl/api/pcp/produtos/$prodId" -body $update
    # get list
    Do-Req -method 'Get' -url "$baseUrl/api/pcp/produtos"
    # delete
    Do-Req -method 'Delete' -url "$baseUrl/api/pcp/produtos/$prodId"
}

Write-Host "== MATERIAIS CRUD =="
$newMat = @{ codigo='TEST-MAT-001'; descricao='Material de teste automático'; unidade_medida='PC'; quantidade_estoque='20'; custo_unitario='2.2' }
$createdMat = Do-Req -method 'Post' -url "$baseUrl/api/pcp/materiais" -body $newMat
if ($createdMat -eq $null) { Write-Host 'Create material failed, aborting material tests.' } else {
    $matId = $createdMat.id
    Write-Host "Created material id=$matId"
    $updateMat = @{ descricao='Material teste atualizado'; quantidade_estoque='25' }
    Do-Req -method 'Put' -url "$baseUrl/api/pcp/materiais/$matId" -body $updateMat
    Do-Req -method 'Get' -url "$baseUrl/api/pcp/materiais"
    Do-Req -method 'Delete' -url "$baseUrl/api/pcp/materiais/$matId"
}

Write-Host "== SEARCH TEST =="
Do-Req -method 'Get' -url "$baseUrl/api/pcp/search?q=TEST"

Write-Host "== COOKIE JAR =="
$session.Cookies.GetCookies($baseUrl) | ForEach-Object { "{0}={1}" -f $_.Name, $_.Value }

Write-Host "DONE"
