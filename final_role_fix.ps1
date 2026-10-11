$KEYCLOAK_URL = "http://localhost:8080"
$ADMIN_USER = "admin"
$ADMIN_PASS = "admin"
$REALM = "autofix"

# 1. Get Token
$tokenResp = Invoke-RestMethod -Uri "$KEYCLOAK_URL/realms/master/protocol/openid-connect/token" `
    -Method Post `
    -Body @{ grant_type = "password"; client_id = "admin-cli"; username = $ADMIN_USER; password = $ADMIN_PASS } `
    -ContentType "application/x-www-form-urlencoded"
$token = $tokenResp.access_token

# 2. Get User
$user = Invoke-RestMethod -Uri "$KEYCLOAK_URL/admin/realms/$REALM/users?username=owner" `
    -Method Get -Headers @{ Authorization = "Bearer $token" }
$uid = $user[0].id
Write-Host "User ID: $uid"

# 3. Get Role
$role = Invoke-RestMethod -Uri "$KEYCLOAK_URL/admin/realms/$REALM/roles/Owner" `
    -Method Get -Headers @{ Authorization = "Bearer $token" }
Write-Host "Role ID: $($role.id)"

# 4. Assign Role
# The body MUST be a JSON array of role objects
$roleObj = @{
    id = $role.id
    name = $role.name
}
$body = @($roleObj) | ConvertTo-Json -Depth 10
Invoke-RestMethod -Uri "$KEYCLOAK_URL/admin/realms/$REALM/users/$uid/role-mappings/realm" `
    -Method Post `
    -Headers @{ Authorization = "Bearer $token" } `
    -Body $body `
    -ContentType "application/json"
Write-Host "Role assigned."

# 5. Verify
$rolesAfter = Invoke-RestMethod -Uri "$KEYCLOAK_URL/admin/realms/$REALM/users/$uid/role-mappings/realm" `
    -Method Get -Headers @{ Authorization = "Bearer $token" }
Write-Host "Current Roles: $($rolesAfter.name -join ', ')"
