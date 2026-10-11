$KEYCLOAK_URL = "http://localhost:8080"
$ADMIN_USER   = "admin"
$ADMIN_PASS   = "admin"
$REALM        = "autofix"

# Get admin token
$tokenResp = Invoke-RestMethod -Uri "$KEYCLOAK_URL/realms/master/protocol/openid-connect/token" `
    -Method Post `
    -Body @{ grant_type = "password"; client_id = "admin-cli"; username = $ADMIN_USER; password = $ADMIN_PASS } `
    -ContentType "application/x-www-form-urlencoded"
$ADMIN_TOKEN = $tokenResp.access_token
Write-Host "Admin token OK"

function Assign-Role($username, $roleName) {
    Write-Host "Assigning role '$roleName' to '$username'..."

    # Get user
    $users = Invoke-RestMethod -Uri "$KEYCLOAK_URL/admin/realms/$REALM/users?username=$username&exact=true" `
        -Method Get -Headers @{ Authorization = "Bearer $ADMIN_TOKEN" }
    if (-not $users -or $users.Count -eq 0) { Write-Warning "User '$username' not found"; return }
    $uid = $users[0].id

    # Get role
    $role = Invoke-RestMethod -Uri "$KEYCLOAK_URL/admin/realms/$REALM/roles/$roleName" `
        -Method Get -Headers @{ Authorization = "Bearer $ADMIN_TOKEN" }
    if (-not $role) { Write-Warning "Role '$roleName' not found"; return }

    # Keycloak requires a JSON ARRAY of role objects
    $body = ConvertTo-Json @( @{ id = $role.id; name = $role.name } )

    try {
        Invoke-RestMethod -Uri "$KEYCLOAK_URL/admin/realms/$REALM/users/$uid/role-mappings/realm" `
            -Method Post `
            -Headers @{ Authorization = "Bearer $ADMIN_TOKEN"; "Content-Type" = "application/json" } `
            -Body $body
        Write-Host "  OK - Role assigned."
    } catch {
        $msg = $_.Exception.Response
        Write-Host "  Already assigned or error: $_"
    }
}

Assign-Role "owner"    "Owner"
Assign-Role "admin"    "Admin"
Assign-Role "mechanic" "Mechanic"
Assign-Role "customer" "Customer"

Write-Host ""
Write-Host "Done. Login with: owner / owner123"
