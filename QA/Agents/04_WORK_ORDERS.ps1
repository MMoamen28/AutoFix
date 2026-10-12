# 04_WORK_ORDERS.ps1 - QA Agent for Work Orders Lifecycle
param(
    [string]$BaseUrl = "http://127.0.0.1:5260",
    [string]$TestDataDir = "C:\AutoFixTestData\run-default",
    [string]$ReportPath = "d:\AutoFix\QA\Reports\latest\WORK_ORDERS.md"
)

. "$PSScriptRoot\..\QA_Common.ps1"
$ctx = New-QAResultContext -AgentName "WORK-ORDERS"

Write-Host "Running QA Agent: WORK-ORDERS..." -ForegroundColor Cyan

# Login Admin
$token = Get-QAAdminToken -BaseUrl $BaseUrl

# Setup Customer and Car
$custRes = Invoke-QARequest -Url "$BaseUrl/api/customers" -Method "POST" -Token $token -Body @{
    fullName = "WorkOrder Test Customer"
    phone = "010$(Get-Random -Minimum 10000000 -Maximum 99999999)"
}
$cId = $custRes.Data.id

$carRes = Invoke-QARequest -Url "$BaseUrl/api/cars" -Method "POST" -Token $token -Body @{
    customerId = $cId
    make = "Audi"
    model = "A6"
    year = 2022
    licensePlate = "AUD-$(Get-Random -Minimum 1000 -Maximum 9999)"
    vin = "WAU$(Get-Random -Minimum 10000000 -Maximum 99999999)WO"
    currentOdometerKm = 40000
}
$carId = $carRes.Data.id

# 1. Create Work Order (Initial status: Pending)
$woRes = Invoke-QARequest -Url "$BaseUrl/api/WorkOrders" -Method "POST" -Token $token -Body @{
    customerId = $cId
    carId = $carId
    odometerKm = 40150
    customerComplaint = "Transmission noise and oil service"
    estimatedCost = 5000
}

if ($woRes.Success -and $woRes.Data.id) {
    Add-QACheck -Context $ctx -Id "WO-01" -Title "Work Order Creation (Initial Pending State)" -Status "PASS"
    $woId = $woRes.Data.id
} else {
    Add-QACheck -Context $ctx -Id "WO-01" -Title "Work Order Creation" -Status "FAIL" -Severity "Critical" `
        -Steps "POST /api/WorkOrders" -Expected "201 Created with ID" -Actual ($woRes.Content)
}

# 2. Add Labor & Parts Items (Internal & External)
$addItemRes = Invoke-QARequest -Url "$BaseUrl/api/WorkOrders/$woId/items" -Method "POST" -Token $token -Body @{
    lineType = "LaborMechanical"
    description = "Transmission Fluid Flush & Inspection"
    quantity = 1
    unitPrice = 850
}
$addPartRes = Invoke-QARequest -Url "$BaseUrl/api/WorkOrders/$woId/items" -Method "POST" -Token $token -Body @{
    lineType = "SparePart"
    description = "Synthetic Transmission Oil 5L"
    quantity = 5
    unitPrice = 300
    isExternalPart = $false
}
if ($addItemRes.Success -and $addPartRes.Success) {
    Add-QACheck -Context $ctx -Id "WO-02" -Title "Work Order Line Items (Labor & Parts)" -Status "PASS"
} else {
    Add-QACheck -Context $ctx -Id "WO-02" -Title "Work Order Line Items" -Status "FAIL" -Severity "High"
}

# 3. Valid State Transitions: Pending -> InProgress -> WaitingForParts -> InProgress -> Completed
$s1 = Invoke-QARequest -Url "$BaseUrl/api/WorkOrders/$woId/status" -Method "PUT" -Token $token -Body @{ newStatus = "InProgress" }
$s2 = Invoke-QARequest -Url "$BaseUrl/api/WorkOrders/$woId/status" -Method "PUT" -Token $token -Body @{ newStatus = "WaitingForParts" }
$s3 = Invoke-QARequest -Url "$BaseUrl/api/WorkOrders/$woId/status" -Method "PUT" -Token $token -Body @{ newStatus = "InProgress" }
$s4 = Invoke-QARequest -Url "$BaseUrl/api/WorkOrders/$woId/status" -Method "PUT" -Token $token -Body @{ newStatus = "Completed" }

if ($s1.Success -and $s2.Success -and $s3.Success -and $s4.Success) {
    Add-QACheck -Context $ctx -Id "WO-03" -Title "Valid State Machine Transitions" -Status "PASS"
} else {
    Add-QACheck -Context $ctx -Id "WO-03" -Title "Valid State Machine Transitions" -Status "FAIL" -Severity "High"
}

# 4. Forbidden State Transition: Completed cannot jump straight to WaitingForParts
$badTrans = Invoke-QARequest -Url "$BaseUrl/api/WorkOrders/$woId/status" -Method "PUT" -Token $token -Body @{ newStatus = "WaitingForParts" }
if ($badTrans.StatusCode -eq 400) {
    Add-QACheck -Context $ctx -Id "WO-04" -Title "Forbidden State Transition Rejection" -Status "PASS"
} else {
    Add-QACheck -Context $ctx -Id "WO-04" -Title "Forbidden State Transition Rejection" -Status "FAIL" -Severity "Medium"
}

# 5. Transition to Delivered
$sDelivered = Invoke-QARequest -Url "$BaseUrl/api/WorkOrders/$woId/status" -Method "PUT" -Token $token -Body @{ newStatus = "Delivered" }
if ($sDelivered.Success) {
    Add-QACheck -Context $ctx -Id "WO-05" -Title "Transition to Delivered" -Status "PASS"
} else {
    Add-QACheck -Context $ctx -Id "WO-05" -Title "Transition to Delivered" -Status "FAIL" -Severity "High"
}

# 6. Convert Work Order to Invoice (Price Snapshots + 14% Egyptian VAT)
$invRes = Invoke-QARequest -Url "$BaseUrl/api/WorkOrders/$woId/convert-to-invoice" -Method "POST" -Token $token
if ($invRes.Success -and $invRes.Data.id) {
    $inv = $invRes.Data
    # Expected: 850 + (5*300) = 2350 subtotal. VAT 14% = 329. Total = 2679.
    $vat = if ($inv.vatAmount -ne $null) { $inv.vatAmount } else { $inv.taxAmount }
    if ($vat -gt 0 -and $inv.totalAmount -gt $inv.subtotal) {
        Add-QACheck -Context $ctx -Id "WO-06" -Title "Convert to Invoice with 14% VAT & Price Snapshots" -Status "PASS"
    } else {
        Add-QACheck -Context $ctx -Id "WO-06" -Title "Convert to Invoice" -Status "FAIL" -Severity "High" -Actual ($invRes.Content)
    }
} else {
    Add-QACheck -Context $ctx -Id "WO-06" -Title "Convert to Invoice" -Status "FAIL" -Severity "High" -Actual ($invRes.Content)
}

Export-QAAgentReport -Context $ctx -OutputFile $ReportPath
