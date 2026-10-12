# 13_REGRESSION.ps1 - QA Agent for Golden Rule 2 Feature Regression
param(
    [string]$BaseUrl = "http://127.0.0.1:5260",
    [string]$TestDataDir = "C:\AutoFixTestData\run-default",
    [string]$ReportPath = "d:\AutoFix\QA\Reports\latest\REGRESSION.md"
)

. "$PSScriptRoot\..\QA_Common.ps1"
$ctx = New-QAResultContext -AgentName "REGRESSION"

Write-Host "Running QA Agent: REGRESSION..." -ForegroundColor Cyan

# Login Admin
$token = Get-QAAdminToken -BaseUrl $BaseUrl

# 1. Original Repair Orders API
$roRes = Invoke-QARequest -Url "$BaseUrl/api/RepairOrders" -Method "GET" -Token $token
if ($roRes.StatusCode -eq 200) {
    Add-QACheck -Context $ctx -Id "REG-01" -Title "Original RepairOrders API Operability" -Status "PASS"
} else {
    Add-QACheck -Context $ctx -Id "REG-01" -Title "Original RepairOrders API" -Status "FAIL" -Severity "Critical"
}

# 2. Dual Receipts API
$recRes = Invoke-QARequest -Url "$BaseUrl/api/receipts" -Method "GET" -Token $token
if ($recRes.StatusCode -eq 200) {
    Add-QACheck -Context $ctx -Id "REG-02" -Title "Dual Receipts Generation Operability" -Status "PASS"
} else {
    Add-QACheck -Context $ctx -Id "REG-02" -Title "Dual Receipts Generation" -Status "FAIL" -Severity "Critical"
}

# 3. Spare Parts Marketplace API
$marketRes = Invoke-QARequest -Url "$BaseUrl/api/spareparts" -Method "GET" -Token $token
if ($marketRes.StatusCode -eq 200) {
    Add-QACheck -Context $ctx -Id "REG-03" -Title "Spare Parts Marketplace & Catalog" -Status "PASS"
} else {
    Add-QACheck -Context $ctx -Id "REG-03" -Title "Spare Parts Marketplace" -Status "FAIL" -Severity "Critical"
}

# 4. Shopping Cart API
$cartRes = Invoke-QARequest -Url "$BaseUrl/api/Cart" -Method "GET" -Token $token
if ($cartRes.StatusCode -eq 200 -or $cartRes.StatusCode -eq 401 -or $cartRes.StatusCode -eq 403) {
    # Protected endpoint requires Customer role
    Add-QACheck -Context $ctx -Id "REG-04" -Title "Customer Shopping Cart API Preservation" -Status "PASS"
} else {
    Add-QACheck -Context $ctx -Id "REG-04" -Title "Customer Shopping Cart API" -Status "FAIL" -Severity "High"
}

# 5. Dual SignalR Hub Endpoints (/hubs/autofix AND /repairHub)
$hub1Res = Invoke-QARequest -Url "$BaseUrl/hubs/autofix/negotiate?negotiateVersion=1" -Method "POST" -Token $token
$hub2Res = Invoke-QARequest -Url "$BaseUrl/repairHub/negotiate?negotiateVersion=1" -Method "POST" -Token $token

if ($hub1Res.StatusCode -eq 200 -and $hub2Res.StatusCode -eq 200) {
    Add-QACheck -Context $ctx -Id "REG-05" -Title "Dual SignalR Real-Time Hubs (/hubs/autofix & /repairHub)" -Status "PASS"
} else {
    Add-QACheck -Context $ctx -Id "REG-05" -Title "SignalR Real-Time Hubs" -Status "FAIL" -Severity "Critical" `
        -Expected "Both /hubs/autofix and /repairHub negotiate 200 OK" -Actual "hub1=$($hub1Res.StatusCode), hub2=$($hub2Res.StatusCode)"
}

Export-QAAgentReport -Context $ctx -OutputFile $ReportPath
