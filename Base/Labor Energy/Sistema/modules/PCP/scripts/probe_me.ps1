try {
    $r = Invoke-WebRequest -Uri 'http://localhost:3001/api/pcp/me' -Method Get -ErrorAction Stop
    Write-Output "Status: $($r.StatusCode)"
} catch {
    if ($_.Exception.Response) {
        $sc = ($_.Exception.Response.StatusCode.value__)
        Write-Output "Status: $sc"
    } else {
        Write-Output "Error: $($_.Exception.Message)"
    }
}
