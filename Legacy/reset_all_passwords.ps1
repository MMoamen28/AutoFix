$KEYCLOAK_URL = "http://localhost:8080"
$ADMIN_USER = "admin"
$ADMIN_PASS = "admin"
$REALM = "autofix"

$tokenResp = Invoke-RestMethod -Uri "$KEYCLOAK_URL/realms/master/protocol/openid-connect/token" `
    -Method Post `
    -Body @{ grant_type = "password"; client_id = "admin-cli"; username = $ADMIN_USER; password = $ADMIN_PASS } `
    -ContentType "application/x-www-form-urlencoded"
$token = $tokenResp.access_token

function Set-Pass($u, $p) {
    $user = Invoke-RestMethod -Uri "$KEYCLOAK_URL/admin/realms/$REALM/users?username=$u" -Headers @{Authorization="Bearer $token"}
    if ($user.Count -eq 0) { return }
    $uid = $user[0].id
    $body = @{type="password"; value=$p; temporary=$false} | ConvertTo-Json
    Invoke-RestMethod -Uri "$KEYCLOAK_URL/admin/realms/$REALM/users/$uid/reset-password" -Method Put -Headers @{Authorization="Bearer $token"} -Body $body -ContentType "application/json"
    Write-Host "Set $u password to $p"
}

Set-Pass "owner" "owner123"
Set-Pass "admin" "owner123"
Set-Pass "mechanic" "owner123"
Set-Pass "customer" "owner123"
