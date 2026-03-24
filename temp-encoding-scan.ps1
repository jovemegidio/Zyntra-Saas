$base = "G:\Outros computadores\Meu laptop (2)\Zyntra"
$results = @()
$count = 0

Get-ChildItem $base -Recurse -Include *.html,*.js,*.css -File | Where-Object {
    $_.FullName -notmatch 'node_modules' -and
    $_.FullName -notmatch '\.bak$' -and
    $_.FullName -notmatch '_Legacy' -and
    $_.FullName -notmatch '_backup' -and
    $_.FullName -notmatch 'backup-old' -and
    $_.FullName -notmatch '\.backup$'
} | ForEach-Object {
    $count++
    $bytes = [IO.File]::ReadAllBytes($_.FullName)
    $utf8str = [Text.Encoding]::UTF8.GetString($bytes)
    $bad = 0
    foreach ($c in $utf8str.ToCharArray()) {
        if ($c -eq [char]0xFFFD) { $bad++ }
    }
    $rel = $_.FullName.Substring($base.Length + 1)
    if ($bad -gt 0) {
        $results += "CORRUPT($bad): $rel"
    }
}

$output = "SCAN RESULTS`n"
$output += "Files scanned: $count`n"
$output += "Corrupted files: $($results.Count)`n"
$output += "---`n"
foreach ($r in $results) {
    $output += "$r`n"
}
$output += "---END---"

[IO.File]::WriteAllText("$base\temp-encoding-results.txt", $output, [Text.Encoding]::UTF8)
Write-Host "Done. Results in temp-encoding-results.txt"
