$KEYCLOAK_URL = "http://localhost:8080"
$ADMIN_USER = "admin"
$ADMIN_PASS = "admin"
$REALM = "autofix"

# Get admin token
$tokenResp = Invoke-RestMethod -Uri "$KEYCLOAK_URL/realms/master/protocol/openid-connect/token" `
    -Method Post `
    -Body @{ grant_type = "password"; client_id = "admin-cli"; username = $ADMIN_USER; password = $ADMIN_PASS } `
    -ContentType "application/x-www-form-urlencoded"
$ADMIN_TOKEN = $tokenResp.access_token

# Get owner user ID
$users = Invoke-RestMethod -Uri "$KEYCLOAK_URL/admin/realms/$REALM/users?username=owner" `
    -Method Get `
    -Headers @{ Authorization = "Bearer $ADMIN_TOKEN" }
$UID = $users[0].id
Write-Host "Owner User ID: $UID"

# Get assigned roles
$roles = Invoke-RestMethod -Uri "$KEYCLOAK_URL/admin/realms/$REALM/users/$UID/role-mappings/realm" `
    -Method Get `
    -Headers @{ Authorization = "Bearer $ADMIN_TOKEN" }

Write-Host "Assigned Roles:"
$roles | ForEach-Object { Write-Host " - $($_.name)" }
