#!/bin/bash

KEYCLOAK_URL="http://localhost:8080"
CLIENT_ID="autofix-api"
CLIENT_SECRET="autofix-secret-2024"
REALM="autofix"

echo "========================================"
echo " AutoFix Keycloak Diagnostics"
echo "========================================"

# Check 1: Is Keycloak running?
echo ""
echo "[CHECK 1] Is Keycloak reachable?"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  "$KEYCLOAK_URL/realms/master")
if [ "$STATUS" = "200" ]; then
  echo "  PASS - Keycloak is running (HTTP 200)"
else
  echo "  FAIL - Keycloak not reachable (HTTP $STATUS)"
  echo "  FIX: Run 'docker-compose up -d keycloak keycloak-db'"
  exit 1
fi

# Check 2: Does autofix realm exist?
echo ""
echo "[CHECK 2] Does 'autofix' realm exist?"
REALM_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  "$KEYCLOAK_URL/realms/$REALM")
if [ "$REALM_STATUS" = "200" ]; then
  echo "  PASS - Realm 'autofix' exists"
else
  echo "  FAIL - Realm 'autofix' NOT FOUND (HTTP $REALM_STATUS)"
  echo "  FIX: Run ./keycloak-init.sh"
  exit 1
fi

# Check 3: Get admin token
echo ""
echo "[CHECK 3] Can we get admin token?"
ADMIN_TOKEN=$(curl -s -X POST \
  "$KEYCLOAK_URL/realms/master/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=password&client_id=admin-cli&username=admin&password=admin" \
  | grep -o '"access_token":"[^"]*"' | sed 's/"access_token":"//;s/"//')
if [ -n "$ADMIN_TOKEN" ]; then
  echo "  PASS - Admin token obtained"
else
  echo "  FAIL - Cannot get admin token"
  echo "  FIX: Check Keycloak admin credentials (admin/admin)"
  exit 1
fi

# Check 4: Does client exist?
echo ""
echo "[CHECK 4] Does client 'autofix-api' exist?"
CLIENT_DATA=$(curl -s \
  "$KEYCLOAK_URL/admin/realms/$REALM/clients?clientId=$CLIENT_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
CLIENT_UUID=$(echo "$CLIENT_DATA" | \
  grep -o '"id":"[^"]*"' | head -1 | sed 's/"id":"//;s/"//')
if [ -n "$CLIENT_UUID" ]; then
  echo "  PASS - Client exists (UUID: $CLIENT_UUID)"
else
  echo "  FAIL - Client 'autofix-api' NOT FOUND"
  echo "  FIX: Run ./keycloak-init.sh"
  exit 1
fi

# Check 5: Is directAccessGrants enabled?
echo ""
echo "[CHECK 5] Is directAccessGrantsEnabled on client?"
DIRECT_GRANT=$(echo "$CLIENT_DATA" | \
  grep -o '"directAccessGrantsEnabled":[^,}]*' | head -1)
if echo "$DIRECT_GRANT" | grep -q "true"; then
  echo "  PASS - directAccessGrantsEnabled = true"
else
  echo "  FAIL - directAccessGrantsEnabled is NOT true"
  echo "  Value found: $DIRECT_GRANT"
  echo "  FIX: Enable 'Direct Access Grants' on the client in Keycloak admin"
fi

# Check 6: Do roles exist?
echo ""
echo "[CHECK 6] Do realm roles exist?"
ROLES=$(curl -s "$KEYCLOAK_URL/admin/realms/$REALM/roles" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
for ROLE in "Owner" "Admin" "Mechanic" "Customer"; do
  if echo "$ROLES" | grep -q "\"$ROLE\""; then
    echo "  PASS - Role '$ROLE' exists"
  else
    echo "  FAIL - Role '$ROLE' MISSING"
    echo "  FIX: Run ./keycloak-init.sh"
  fi
done

# Check 7: Do users exist?
echo ""
echo "[CHECK 7] Do test users exist?"
for USER in "owner" "admin" "mechanic" "customer"; do
  USER_DATA=$(curl -s \
    "$KEYCLOAK_URL/admin/realms/$REALM/users?username=$USER&exact=true" \
    -H "Authorization: Bearer $ADMIN_TOKEN")
  USER_ID=$(echo "$USER_DATA" | \
    grep -o '"id":"[^"]*"' | head -1 | sed 's/"id":"//;s/"//')
  if [ -n "$USER_ID" ]; then
    ENABLED=$(echo "$USER_DATA" | grep -o '"enabled":[^,}]*' | head -1)
    echo "  PASS - User '$USER' exists (enabled: $ENABLED, ID: $USER_ID)"
  else
    echo "  FAIL - User '$USER' NOT FOUND"
    echo "  FIX: Run ./keycloak-init.sh"
  fi
done

# Check 8: Try actual login with each user
echo ""
echo "[CHECK 8] Testing actual login for each user..."
for USER in "owner" "admin" "mechanic" "customer"; do
  RESPONSE=$(curl -s -X POST \
    "$KEYCLOAK_URL/realms/$REALM/protocol/openid-connect/token" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "grant_type=password&client_id=$CLIENT_ID&client_secret=$CLIENT_SECRET&username=$USER&password=password")
  
  if echo "$RESPONSE" | grep -q "access_token"; then
    echo "  PASS - Login works for '$USER'"
    # Check if roles are in token
    TOKEN=$(echo "$RESPONSE" | grep -o '"access_token":"[^"]*"' | \
      sed 's/"access_token":"//;s/"//')
    PAYLOAD=$(echo "$TOKEN" | cut -d'.' -f2 | \
      base64 -d 2>/dev/null || echo "$TOKEN" | \
      cut -d'.' -f2 | base64 --decode 2>/dev/null)
    if echo "$PAYLOAD" | grep -q '"roles"'; then
      echo "  PASS - 'roles' claim exists in JWT for '$USER'"
    else
      echo "  FAIL - 'roles' claim MISSING from JWT for '$USER'"
      echo "  FIX: Add roles mapper to client (see below)"
    fi
  else
    ERROR=$(echo "$RESPONSE" | grep -o '"error_description":"[^"]*"' | \
      sed 's/"error_description":"//;s/"//')
    echo "  FAIL - Login FAILED for '$USER': $ERROR"
    echo "  Full response: $RESPONSE"
  fi
done

# Check 9: Test with wrong password to confirm error type
echo ""
echo "[CHECK 9] Testing error type with wrong password..."
WRONG_RESPONSE=$(curl -s -X POST \
  "$KEYCLOAK_URL/realms/$REALM/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=password&client_id=$CLIENT_ID&client_secret=$CLIENT_SECRET&username=owner&password=wrongpassword")
echo "  Wrong password response: $WRONG_RESPONSE"

# Check 10: Verify roles mapper exists
echo ""
echo "[CHECK 10] Checking roles mapper on client..."
MAPPERS=$(curl -s \
  "$KEYCLOAK_URL/admin/realms/$REALM/clients/$CLIENT_UUID/protocol-mappers/models" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
if echo "$MAPPERS" | grep -q "roles"; then
  echo "  PASS - Roles mapper exists on client"
else
  echo "  FAIL - Roles mapper MISSING from client"
  echo "  FIX: Add the mapper using the fix script below"
fi

echo ""
echo "========================================"
echo " Diagnostics Complete"
echo "========================================"
