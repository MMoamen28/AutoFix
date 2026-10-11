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

function Assign-Role($username, $roleName) {
    Write-Host "Assigning role '$roleName' to user '$username'..."
    
    # Get user
    $user = Invoke-RestMethod -Uri "$KEYCLOAK_URL/admin/realms/$REALM/users?username=$username&exact=true" `
        -Method Get -Headers @{ Authorization = "Bearer $ADMIN_TOKEN" }
    if (-not $user) { Write-Error "User $username not found"; return }
    $uid = $user[0].id

    # Get role
    $role = Invoke-RestMethod -Uri "$KEYCLOAK_URL/admin/realms/$REALM/roles/$roleName" `
        -Method Get -Headers @{ Authorization = "Bearer $ADMIN_TOKEN" }
    if (-not $role) { Write-Error "Role $roleName not found"; return }
    
    # Assign (must be an array of objects)
    $body = @($role) | ConvertTo-Json
    
    Invoke-RestMethod -Uri "$KEYCLOAK_URL/admin/realms/$REALM/users/$uid/role-mappings/realm" `
        -Method Post `
        -Headers @{ Authorization = "Bearer $ADMIN_TOKEN" } `
        -Body $body `
        -ContentType "application/json"
    
    Write-Host "  Success."
}

Assign-Role "owner" "Owner"
Assign-Role "admin" "Admin"
Assign-Role "mechanic" "Mechanic"
Assign-Role "customer" "Customer"
