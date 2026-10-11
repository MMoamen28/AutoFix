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
    Write-Host "Assigning '$roleName' to '$username'..."
    
    # Get user
    $users = Invoke-RestMethod -Uri "$KEYCLOAK_URL/admin/realms/$REALM/users?username=$username" `
        -Method Get `
        -Headers @{ Authorization = "Bearer $ADMIN_TOKEN" }
    if ($users.Count -eq 0) { Write-Error "User not found"; return }
    $uid = $users[0].id

    # Get role
    $role = Invoke-RestMethod -Uri "$KEYCLOAK_URL/admin/realms/$REALM/roles/$roleName" `
        -Method Get `
        -Headers @{ Authorization = "Bearer $ADMIN_TOKEN" }
    
    # Prepare body - MUST be an array of objects
    $body = @(
        @{
            id = $role.id
            name = $role.name
        }
    )
    $jsonBody = $body | ConvertTo-Json -Compress

    try {
        Invoke-RestMethod -Uri "$KEYCLOAK_URL/admin/realms/$REALM/users/$uid/role-mappings/realm" `
            -Method Post `
            -Headers @{ Authorization = "Bearer $ADMIN_TOKEN" } `
            -Body $jsonBody `
            -ContentType "application/json"
        Write-Host "  Success!"
    } catch {
        Write-Host "  Failed: $($_.Exception.Message)"
        if ($_.Exception.Response) {
            $stream = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($stream)
            Write-Host "  Detail: $($reader.ReadToEnd())"
        }
    }
}

Assign-Role "owner" "Owner"
Assign-Role "admin" "Admin"
Assign-Role "mechanic" "Mechanic"
Assign-Role "customer" "Customer"
