$KEYCLOAK_URL = "http://localhost:8080"
$ADMIN_USER = "admin"
$ADMIN_PASS = "admin"
$REALM = "autofix"
$CLIENT_ID = "autofix-api"
$CLIENT_SECRET = "autofix-secret-2024"

Write-Host "========================================"
Write-Host " AutoFix Keycloak Complete Fix (PowerShell)"
Write-Host "========================================"

# Wait for Keycloak
Write-Host "Waiting for Keycloak..."
while ($true) {
    try {
        $resp = Invoke-WebRequest -Uri "$KEYCLOAK_URL/realms/master" -Method Get -UseBasicParsing -ErrorAction SilentlyContinue
        if ($resp.StatusCode -eq 200) { break }
    } catch { }
    Write-Host "  Not ready, retrying in 3s..."
    Start-Sleep -Seconds 3
}
Write-Host "Keycloak is ready."
Start-Sleep -Seconds 3

# Get admin token
Write-Host ""
Write-Host "Getting admin token..."
$tokenResp = Invoke-RestMethod -Uri "$KEYCLOAK_URL/realms/master/protocol/openid-connect/token" `
    -Method Post `
    -Body @{ grant_type = "password"; client_id = "admin-cli"; username = $ADMIN_USER; password = $ADMIN_PASS } `
    -ContentType "application/x-www-form-urlencoded"

$ADMIN_TOKEN = $tokenResp.access_token

if (-not $ADMIN_TOKEN) {
    Write-Error "FATAL: Cannot get admin token. Is Keycloak running?"
    exit 1
}
Write-Host "Admin token OK."

# ── DELETE and RECREATE realm cleanly ─────────────────────────────────
Write-Host ""
Write-Host "Deleting existing autofix realm..."
try {
    Invoke-RestMethod -Uri "$KEYCLOAK_URL/admin/realms/$REALM" `
        -Method Delete `
        -Headers @{ Authorization = "Bearer $ADMIN_TOKEN" } `
        -ErrorAction SilentlyContinue
    Write-Host "Old realm deleted."
} catch {
    Write-Host "Old realm not found or could not be deleted."
}
Start-Sleep -Seconds 2

Write-Host ""
Write-Host "Creating fresh autofix realm..."
$realmBody = @{
    realm = "autofix"
    enabled = $true
    displayName = "AutoFix Workshop"
    registrationAllowed = $true
    registrationEmailAsUsername = $false
    rememberMe = $false
    verifyEmail = $false
    loginWithEmailAllowed = $true
    duplicateEmailsAllowed = $false
    resetPasswordAllowed = $false
    editUsernameAllowed = $false
    bruteForceProtected = $false
    permanentLockout = $false
    accessTokenLifespan = 300
    ssoSessionIdleTimeout = 1800
    ssoSessionMaxLifespan = 36000
    defaultSignatureAlgorithm = "RS256"
    requiredCredentials = @("password")
} | ConvertTo-Json

Invoke-RestMethod -Uri "$KEYCLOAK_URL/admin/realms" `
    -Method Post `
    -Headers @{ Authorization = "Bearer $ADMIN_TOKEN" } `
    -Body $realmBody `
    -ContentType "application/json"

Write-Host "Realm created."
Start-Sleep -Seconds 2

# ── CREATE CLIENT ──────────────────────────────────────────────────────
Write-Host ""
Write-Host "Creating client: autofix-api..."
$clientBody = @{
    clientId = "autofix-api"
    name = "AutoFix API Client"
    secret = "autofix-secret-2024"
    enabled = $true
    publicClient = $false
    directAccessGrantsEnabled = $true
    serviceAccountsEnabled = $true
    authorizationServicesEnabled = $false
    standardFlowEnabled = $true
    implicitFlowEnabled = $false
    bearerOnly = $false
    frontchannelLogout = $true
    protocol = "openid-connect"
    redirectUris = @("*")
    webOrigins = @("*")
    notBefore = 0
    attributes = @{
        "post.logout.redirect.uris" = "+"
        "backchannel.logout.session.required" = "true"
        "display.on.consent.screen" = "false"
    }
} | ConvertTo-Json

Invoke-RestMethod -Uri "$KEYCLOAK_URL/admin/realms/$REALM/clients" `
    -Method Post `
    -Headers @{ Authorization = "Bearer $ADMIN_TOKEN" } `
    -Body $clientBody `
    -ContentType "application/json"

Write-Host "Client created."
Start-Sleep -Seconds 1

# Get client UUID
$clients = Invoke-RestMethod -Uri "$KEYCLOAK_URL/admin/realms/$REALM/clients?clientId=autofix-api" `
    -Method Get `
    -Headers @{ Authorization = "Bearer $ADMIN_TOKEN" }
$CLIENT_UUID = $clients[0].id
Write-Host "Client UUID: $CLIENT_UUID"

# ── ADD ROLES CLAIM MAPPER ─────────────────────────────────────────────
Write-Host ""
Write-Host "Adding roles claim mapper..."
$mapperBody = @{
    name = "realm-roles-mapper"
    protocol = "openid-connect"
    protocolMapper = "oidc-usermodel-realm-role-mapper"
    consentRequired = $false
    config = @{
        multivalued = "true"
        "userinfo.token.claim" = "true"
        "id.token.claim" = "true"
        "access.token.claim" = "true"
        "claim.name" = "roles"
        "jsonType.label" = "String"
    }
} | ConvertTo-Json

Invoke-RestMethod -Uri "$KEYCLOAK_URL/admin/realms/$REALM/clients/$CLIENT_UUID/protocol-mappers/models" `
    -Method Post `
    -Headers @{ Authorization = "Bearer $ADMIN_TOKEN" } `
    -Body $mapperBody `
    -ContentType "application/json"

Write-Host "Roles mapper added."

# ── CREATE REALM ROLES ─────────────────────────────────────────────────
Write-Host ""
Write-Host "Creating realm roles..."
foreach ($ROLE in @("Owner", "Admin", "Mechanic", "Customer")) {
    Invoke-RestMethod -Uri "$KEYCLOAK_URL/admin/realms/$REALM/roles" `
        -Method Post `
        -Headers @{ Authorization = "Bearer $ADMIN_TOKEN" } `
        -Body (@{ name = $ROLE; description = "AutoFix $ROLE role" } | ConvertTo-Json) `
        -ContentType "application/json"
    Write-Host "  Role '$ROLE' created."
}

# ── CREATE USERS ──────────────────────────────────────────────────────
function Create-UserWithRole($U, $P, $FN, $LN, $EM, $ROLE) {
    Write-Host ""
    Write-Host "Creating user: $U..."

    # Create user
    $userBody = @{
        username = $U
        email = $EM
        firstName = $FN
        lastName = $LN
        enabled = $true
        emailVerified = $true
        credentials = @(@{
            type = "password"
            value = $P
            temporary = $false
        })
    } | ConvertTo-Json

    Invoke-RestMethod -Uri "$KEYCLOAK_URL/admin/realms/$REALM/users" `
        -Method Post `
        -Headers @{ Authorization = "Bearer $ADMIN_TOKEN" } `
        -Body $userBody `
        -ContentType "application/json"

    # Get user ID
    $users = Invoke-RestMethod -Uri "$KEYCLOAK_URL/admin/realms/$REALM/users?username=$U&exact=true" `
        -Method Get `
        -Headers @{ Authorization = "Bearer $ADMIN_TOKEN" }
    $UID = $users[0].id
    Write-Host "  User ID: $UID"

    # Get role
    $roleObj = Invoke-RestMethod -Uri "$KEYCLOAK_URL/admin/realms/$REALM/roles/$ROLE" `
        -Method Get `
        -Headers @{ Authorization = "Bearer $ADMIN_TOKEN" }
    $RID = $roleObj.id
    $RNM = $roleObj.name

    # Assign role
    Invoke-RestMethod -Uri "$KEYCLOAK_URL/admin/realms/$REALM/users/$UID/role-mappings/realm" `
        -Method Post `
        -Headers @{ Authorization = "Bearer $ADMIN_TOKEN" } `
        -Body (@(@{ id = $RID; name = $RNM }) | ConvertTo-Json) `
        -ContentType "application/json"

    Write-Host "  Role '$ROLE' assigned."
}

Write-Host ""
Write-Host "Creating all test users..."
Create-UserWithRole "owner" "owner123" "Shop" "Owner" "owner@autofix.com" "Owner"
Create-UserWithRole "admin" "owner123" "System" "Admin" "admin@autofix.com" "Admin"
Create-UserWithRole "mechanic" "owner123" "Ahmed" "Hassan" "mechanic@autofix.com" "Mechanic"
Create-UserWithRole "customer" "owner123" "Mohamed" "Ali" "customer@autofix.com" "Customer"

Write-Host ""
Write-Host "========================================"
Write-Host " SETUP COMPLETE"
Write-Host "========================================"
Write-Host ""
Write-Host " Login credentials:"
Write-Host "   owner    / owner123"
Write-Host "   admin    / owner123"
Write-Host "   mechanic / owner123"
Write-Host "   customer / owner123"
Write-Host "========================================"
