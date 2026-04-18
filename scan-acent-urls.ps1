$files = Get-ChildItem -Path "modules" -Filter "*.html" -Recurse | Where-Object { $_.FullName -notmatch "backup|vps_backup|_utf8|Base" }
$pattern = [regex]"fetch\([`"'][^`"']*[ãçóéíúàõ][^`"']*[`"']"
foreach ($f in $files) {
    $lines = Get-Content $f.FullName -Encoding UTF8 -ErrorAction SilentlyContinue
    for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match "/api/" -and $pattern.IsMatch($lines[$i])) {
            Write-Host "$($f.FullName):$($i+1): $($lines[$i].Trim().Substring(0, [Math]::Min(120, $lines[$i].Trim().Length)))"
        }
    }
}
Write-Host "DONE"
