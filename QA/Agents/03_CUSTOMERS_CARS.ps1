# 03_CUSTOMERS_CARS.ps1 - QA Agent for Customers & Vehicles
param(
    [string]$BaseUrl = "http://127.0.0.1:5260",
    [string]$TestDataDir = "C:\AutoFixTestData\run-default",
    [string]$ReportPath = "d:\AutoFix\QA\Reports\latest\CUSTOMERS_CARS.md"
)

. "$PSScriptRoot\..\QA_Common.ps1"
$ctx = New-QAResultContext -AgentName "CUSTOMERS-CARS"

Write-Host "Running QA Agent: CUSTOMERS-CARS..." -ForegroundColor Cyan

# Login Admin
$token = Get-QAAdminToken -BaseUrl $BaseUrl

# 1. Create Customer
$phone1 = "010$(Get-Random -Minimum 10000000 -Maximum 99999999)"
$cust1Res = Invoke-QARequest -Url "$BaseUrl/api/customers" -Method "POST" -Token $token -Body @{
    fullName = "Hassan Al-Banna"
    phone = $phone1
    notes = "VIP Customer"
}

if ($cust1Res.Success -and $cust1Res.Data.id) {
    Add-QACheck -Context $ctx -Id "CUST-01" -Title "Customer Creation CRUD" -Status "PASS"
    $cId = $cust1Res.Data.id
} else {
    Add-QACheck -Context $ctx -Id "CUST-01" -Title "Customer Creation CRUD" -Status "FAIL" -Severity "High" `
        -Steps "POST /api/customers" -Expected "201 Created with Customer ID" -Actual ($cust1Res.Content)
}

# 2. Duplicate Phone Warning
$dupRes = Invoke-QARequest -Url "$BaseUrl/api/customers" -Method "POST" -Token $token -Body @{
    fullName = "Another Name"
    phone = $phone1
}
if ($dupRes.StatusCode -eq 409 -and $dupRes.Content -match "DuplicatePhoneWarning") {
    Add-QACheck -Context $ctx -Id "CUST-02" -Title "Duplicate Phone Warning Prompt (409 Conflict)" -Status "PASS"
} else {
    Add-QACheck -Context $ctx -Id "CUST-02" -Title "Duplicate Phone Warning Prompt" -Status "FAIL" -Severity "High" `
        -Steps "Create customer with same phone without override" -Expected "409 Conflict DuplicatePhoneWarning" -Actual ($dupRes.Content)
}

# 3. Allow Duplicate Phone with Explicit Confirmation
$allowDupRes = Invoke-QARequest -Url "$BaseUrl/api/customers" -Method "POST" -Token $token -Body @{
    fullName = "Confirmed Sibling"
    phone = $phone1
    allowDuplicate = $true
}
if ($allowDupRes.Success) {
    Add-QACheck -Context $ctx -Id "CUST-03" -Title "Duplicate Phone Confirmed Override" -Status "PASS"
} else {
    Add-QACheck -Context $ctx -Id "CUST-03" -Title "Duplicate Phone Confirmed Override" -Status "FAIL" -Severity "Medium"
}

# 4. Search Customers (By Name, Phone, Plate, Chassis)
$searchRes = Invoke-QARequest -Url "$BaseUrl/api/customers?search=Hassan" -Method "GET" -Token $token
if ($searchRes.Success -and @($searchRes.Data).Count -ge 1) {
    Add-QACheck -Context $ctx -Id "CUST-04" -Title "Universal Customer Search" -Status "PASS"
} else {
    Add-QACheck -Context $ctx -Id "CUST-04" -Title "Universal Customer Search" -Status "FAIL" -Severity "High"
}

# 5. Multiple Cars Under Same Customer
$plate1 = "EGY-$(Get-Random -Minimum 1000 -Maximum 9999)"
$vin1 = "WBA$(Get-Random -Minimum 10000000 -Maximum 99999999)XYZ"
$car1Res = Invoke-QARequest -Url "$BaseUrl/api/cars" -Method "POST" -Token $token -Body @{
    customerId = $cId
    make = "BMW"
    model = "320i"
    year = 2021
    licensePlate = $plate1
    vin = $vin1
    currentOdometerKm = 52000
}

$plate2 = "EGY-$(Get-Random -Minimum 1000 -Maximum 9999)"
$vin2 = "WBA$(Get-Random -Minimum 10000000 -Maximum 99999999)ABC"
$car2Res = Invoke-QARequest -Url "$BaseUrl/api/cars" -Method "POST" -Token $token -Body @{
    customerId = $cId
    make = "Mercedes"
    model = "C200"
    year = 2023
    licensePlate = $plate2
    vin = $vin2
    currentOdometerKm = 15000
}

if ($car1Res.Success -and $car2Res.Success) {
    Add-QACheck -Context $ctx -Id "CUST-05" -Title "Multiple Vehicles Per Customer Support" -Status "PASS"
} else {
    Add-QACheck -Context $ctx -Id "CUST-05" -Title "Multiple Vehicles Per Customer Support" -Status "FAIL" -Severity "High"
}

# 6. Duplicate Plate / VIN Warning
$dupCarRes = Invoke-QARequest -Url "$BaseUrl/api/cars" -Method "POST" -Token $token -Body @{
    customerId = $cId
    make = "Duplicate"
    model = "Car"
    year = 2020
    licensePlate = $plate1
    vin = "DIFFERENTVIN12345"
}
if ($dupCarRes.StatusCode -eq 409 -or $dupCarRes.StatusCode -eq 400 -or $dupCarRes.Content -match "DuplicateCarWarning") {
    Add-QACheck -Context $ctx -Id "CUST-06" -Title "Duplicate Plate/VIN Rejection" -Status "PASS"
} else {
    Add-QACheck -Context $ctx -Id "CUST-06" -Title "Duplicate Plate/VIN Rejection" -Status "FAIL" -Severity "High"
}

Export-QAAgentReport -Context $ctx -OutputFile $ReportPath
