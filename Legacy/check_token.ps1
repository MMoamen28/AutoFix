$resp = Invoke-RestMethod -Uri 'http://localhost:5000/api/auth/login' `
    -Method Post -ContentType 'application/json' `
    -Body '{"username":"owner","password":"owner123"}'

$token = $resp.accessToken
Write-Host "Login OK. Token received."

$parts = $token.Split('.')
$payload = $parts[1]
$mod = $payload.Length % 4
if ($mod -eq 2) { $payload += '==' }
elseif ($mod -eq 3) { $payload += '=' }

$bytes = [System.Convert]::FromBase64String($payload)
$json = [System.Text.Encoding]::UTF8.GetString($bytes)
$obj = $json | ConvertFrom-Json

Write-Host ""
Write-Host "=== Roles in JWT ==="
$obj.roles
Write-Host ""
Write-Host "=== realm_access.roles ==="
$obj.realm_access.roles
