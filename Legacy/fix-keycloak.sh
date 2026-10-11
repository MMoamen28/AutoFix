#!/bin/bash

KEYCLOAK_URL="http://localhost:8080"
ADMIN_USER="admin"
ADMIN_PASS="admin"
REALM="autofix"
CLIENT_ID="autofix-api"
CLIENT_SECRET="autofix-secret-2024"

echo "========================================"
echo " AutoFix Keycloak Complete Fix Script"
echo "========================================"

# Wait for Keycloak
echo "Waiting for Keycloak..."
until curl -sf "$KEYCLOAK_URL/realms/master" > /dev/null 2>&1; do
  echo "  Not ready, retrying in 3s..."
  sleep 3
done
echo "Keycloak is ready."
sleep 3

# Get admin token
echo ""
echo "Getting admin token..."
ADMIN_TOKEN=$(curl -s -X POST \
  "$KEYCLOAK_URL/realms/master/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=password&client_id=admin-cli&username=$ADMIN_USER&password=$ADMIN_PASS" \
  | grep -o '"access_token":"[^"]*"' | sed 's/"access_token":"//;s/"//')

if [ -z "$ADMIN_TOKEN" ]; then
  echo "FATAL: Cannot get admin token. Is Keycloak running?"
  exit 1
fi
echo "Admin token OK."

# ── DELETE and RECREATE realm cleanly ─────────────────────────────────
echo ""
echo "Deleting existing autofix realm..."
curl -s -X DELETE "$KEYCLOAK_URL/admin/realms/$REALM" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
sleep 2
echo "Old realm deleted."

echo ""
echo "Creating fresh autofix realm..."
curl -s -X POST "$KEYCLOAK_URL/admin/realms" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "realm": "autofix",
    "enabled": true,
    "displayName": "AutoFix Workshop",
    "registrationAllowed": true,
    "registrationEmailAsUsername": false,
    "rememberMe": false,
    "verifyEmail": false,
    "loginWithEmailAllowed": true,
    "duplicateEmailsAllowed": false,
    "resetPasswordAllowed": false,
    "editUsernameAllowed": false,
    "bruteForceProtected": false,
    "permanentLockout": false,
    "accessTokenLifespan": 300,
    "ssoSessionIdleTimeout": 1800,
    "ssoSessionMaxLifespan": 36000,
    "defaultSignatureAlgorithm": "RS256",
    "requiredCredentials": ["password"]
  }'
echo "Realm created."
sleep 2

# Refresh admin token (it may expire during long ops)
ADMIN_TOKEN=$(curl -s -X POST \
  "$KEYCLOAK_URL/realms/master/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=password&client_id=admin-cli&username=$ADMIN_USER&password=$ADMIN_PASS" \
  | grep -o '"access_token":"[^"]*"' | sed 's/"access_token":"//;s/"//')

# ── CREATE CLIENT ──────────────────────────────────────────────────────
echo ""
echo "Creating client: autofix-api..."
curl -s -X POST "$KEYCLOAK_URL/admin/realms/$REALM/clients" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "autofix-api",
    "name": "AutoFix API Client",
    "secret": "autofix-secret-2024",
    "enabled": true,
    "publicClient": false,
    "directAccessGrantsEnabled": true,
    "serviceAccountsEnabled": true,
    "authorizationServicesEnabled": false,
    "standardFlowEnabled": true,
    "implicitFlowEnabled": false,
    "bearerOnly": false,
    "frontchannelLogout": true,
    "protocol": "openid-connect",
    "redirectUris": ["*"],
    "webOrigins": ["*"],
    "notBefore": 0,
    "attributes": {
      "post.logout.redirect.uris": "+",
      "backchannel.logout.session.required": "true",
      "display.on.consent.screen": "false"
    }
  }'
sleep 1
echo "Client created."

# Get client UUID
CLIENT_UUID=$(curl -s \
  "$KEYCLOAK_URL/admin/realms/$REALM/clients?clientId=autofix-api" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  | grep -o '"id":"[^"]*"' | head -1 | sed 's/"id":"//;s/"//')
echo "Client UUID: $CLIENT_UUID"

# ── ADD ROLES CLAIM MAPPER ─────────────────────────────────────────────
echo ""
echo "Adding roles claim mapper..."
curl -s -X POST \
  "$KEYCLOAK_URL/admin/realms/$REALM/clients/$CLIENT_UUID/protocol-mappers/models" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "realm-roles-mapper",
    "protocol": "openid-connect",
    "protocolMapper": "oidc-usermodel-realm-role-mapper",
    "consentRequired": false,
    "config": {
      "multivalued": "true",
      "userinfo.token.claim": "true",
      "id.token.claim": "true",
      "access.token.claim": "true",
      "claim.name": "roles",
      "jsonType.label": "String"
    }
  }'
echo "Roles mapper added."

# ── ADD USERNAME MAPPER ───────────────────────────────────────────────
echo "Adding username mapper..."
curl -s -X POST \
  "$KEYCLOAK_URL/admin/realms/$REALM/clients/$CLIENT_UUID/protocol-mappers/models" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "username-mapper",
    "protocol": "openid-connect",
    "protocolMapper": "oidc-usermodel-property-mapper",
    "consentRequired": false,
    "config": {
      "userinfo.token.claim": "true",
      "user.attribute": "username",
      "id.token.claim": "true",
      "access.token.claim": "true",
      "claim.name": "preferred_username",
      "jsonType.label": "String"
    }
  }'
echo "Username mapper added."

# ── CREATE REALM ROLES ─────────────────────────────────────────────────
echo ""
echo "Creating realm roles..."
for ROLE in "Owner" "Admin" "Mechanic" "Customer"; do
  RESULT=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST "$KEYCLOAK_URL/admin/realms/$REALM/roles" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"name":"'"$ROLE"'","description":"AutoFix '"$ROLE"' role"}')
  echo "  Role '$ROLE' -> HTTP $RESULT"
done

# ── CREATE USERS ──────────────────────────────────────────────────────
create_user_with_role() {
  local U="$1" P="$2" FN="$3" LN="$4" EM="$5" ROLE="$6"
  echo ""
  echo "Creating user: $U..."

  # Create user
  HTTP=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST "$KEYCLOAK_URL/admin/realms/$REALM/users" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "username": "'"$U"'",
      "email": "'"$EM"'",
      "firstName": "'"$FN"'",
      "lastName": "'"$LN"'",
      "enabled": true,
      "emailVerified": true,
      "credentials": [
        {
          "type": "password",
          "value": "'"$P"'",
          "temporary": false
        }
      ]
    }')
  echo "  Create user HTTP: $HTTP"
  sleep 1

  # Get user ID
  UID=$(curl -s \
    "$KEYCLOAK_URL/admin/realms/$REALM/users?username=$U&exact=true" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    | grep -o '"id":"[^"]*"' | head -1 | sed 's/"id":"//;s/"//')
  
  if [ -z "$UID" ]; then
    echo "  ERROR: Could not get user ID for $U"
    return 1
  fi
  echo "  User ID: $UID"

  # Get role
  ROLE_DATA=$(curl -s \
    "$KEYCLOAK_URL/admin/realms/$REALM/roles/$ROLE" \
    -H "Authorization: Bearer $ADMIN_TOKEN")
  RID=$(echo "$ROLE_DATA" | grep -o '"id":"[^"]*"' | \
    head -1 | sed 's/"id":"//;s/"//')
  RNM=$(echo "$ROLE_DATA" | grep -o '"name":"[^"]*"' | \
    head -1 | sed 's/"name":"//;s/"//')

  # Assign role
  AROLE=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST \
    "$KEYCLOAK_URL/admin/realms/$REALM/users/$UID/role-mappings/realm" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d '[{"id":"'"$RID"'","name":"'"$RNM"'"}]')
  echo "  Role '$ROLE' assigned -> HTTP $AROLE"
}

echo ""
echo "Creating all test users..."
create_user_with_role \
  "owner"    "password" "Shop"    "Owner"    "owner@autofix.com"    "Owner"
create_user_with_role \
  "admin"    "password" "System"  "Admin"    "admin@autofix.com"    "Admin"
create_user_with_role \
  "mechanic" "password" "Ahmed"   "Hassan"   "mechanic@autofix.com" "Mechanic"
create_user_with_role \
  "customer" "password" "Mohamed" "Ali"      "customer@autofix.com" "Customer"

# ── FINAL VERIFICATION ────────────────────────────────────────────────
echo ""
echo "========================================"
echo " Running final login tests..."
echo "========================================"
sleep 3

ALL_PASS=true
for USER in "owner" "admin" "mechanic" "customer"; do
  RESP=$(curl -s -X POST \
    "$KEYCLOAK_URL/realms/$REALM/protocol/openid-connect/token" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "grant_type=password&client_id=autofix-api&client_secret=autofix-secret-2024&username=$USER&password=password")
  
  if echo "$RESP" | grep -q "access_token"; then
    echo "  PASS: $USER can login"
  else
    ERR=$(echo "$RESP" | \
      grep -o '"error_description":"[^"]*"' | \
      sed 's/"error_description":"//;s/"//')
    echo "  FAIL: $USER cannot login - $ERR"
    ALL_PASS=false
  fi
done

echo ""
if [ "$ALL_PASS" = true ]; then
  echo "ALL USERS CAN LOGIN SUCCESSFULLY!"
else
  echo "SOME LOGINS FAILED - check output above"
fi

echo ""
echo "========================================"
echo " SETUP COMPLETE"
echo "========================================"
echo ""
echo " Login credentials:"
echo "   owner    / password"
echo "   admin    / password"
echo "   mechanic / password"
echo "   customer / password"
echo ""
echo " Keycloak admin:"
echo "   http://localhost:8080/admin"
echo "   admin / admin -> select autofix realm"
echo "========================================"
