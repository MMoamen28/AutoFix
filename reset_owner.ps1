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
Write-Host "User ID: $UID"

# Reset password to owner123
$credBody = @{
    type = "password"
    value = "owner123"
    temporary = $false
} | ConvertTo-Json
Invoke-RestMethod -Uri "$KEYCLOAK_URL/admin/realms/$REALM/users/$UID/reset-password" `
    -Method Put `
    -Headers @{ Authorization = "Bearer $ADMIN_TOKEN" } `
    -Body $credBody `
    -ContentType "application/json"
Write-Host "Password reset to 'owner123'"

# Get role
$roleObj = Invoke-RestMethod -Uri "$KEYCLOAK_URL/admin/realms/$REALM/roles/Owner" `
    -Method Get `
    -Headers @{ Authorization = "Bearer $ADMIN_TOKEN" }
$RID = $roleObj.id
$RNM = $roleObj.name

# Assign role
$roleMapping = @(@{ id = $RID; name = $RNM }) | ConvertTo-Json
Invoke-RestMethod -Uri "$KEYCLOAK_URL/admin/realms/$REALM/users/$UID/role-mappings/realm" `
    -Method Post `
    -Headers @{ Authorization = "Bearer $ADMIN_TOKEN" } `
    -Body $roleMapping `
    -ContentType "application/json"
Write-Host "Role 'Owner' assigned."
