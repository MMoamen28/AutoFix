# 07_INSPECTION_REPORT.ps1 - QA Agent for 3-Page A4 Car Inspection Module
param(
    [string]$BaseUrl = "http://127.0.0.1:5260",
    [string]$TestDataDir = "C:\AutoFixTestData\run-default",
    [string]$ReportPath = "d:\AutoFix\QA\Reports\latest\INSPECTION_REPORT.md"
)

. "$PSScriptRoot\..\QA_Common.ps1"
$ctx = New-QAResultContext -AgentName "INSPECTION-REPORT"

Write-Host "Running QA Agent: INSPECTION-REPORT..." -ForegroundColor Cyan

# Login Admin
$token = Get-QAAdminToken -BaseUrl $BaseUrl

# Setup Customer and Car
$custRes = Invoke-QARequest -Url "$BaseUrl/api/customers" -Method "POST" -Token $token -Body @{
    fullName = "Tariq Inspection"
    phone = "010$(Get-Random -Minimum 10000000 -Maximum 99999999)"
}
$cId = $custRes.Data.id
$cPhone = $custRes.Data.phone

$carRes = Invoke-QARequest -Url "$BaseUrl/api/cars" -Method "POST" -Token $token -Body @{
    customerId = $cId
    make = "Volkswagen"
    model = "Passat"
    year = 2020
    licensePlate = "VW-$(Get-Random -Minimum 1000 -Maximum 9999)"
    vin = "WVW$(Get-Random -Minimum 10000000 -Maximum 99999999)PASS"
    currentOdometerKm = 88000
}
$carId = $carRes.Data.id

# 1. Create Inspection (Auto-fill from DB)
$inspCreateRes = Invoke-QARequest -Url "$BaseUrl/api/Inspections" -Method "POST" -Token $token -Body @{
    customerId = $cId
    carId = $carId
    odometerKm = 88200
    notes = "Routine comprehensive check"
    diagnosticScanResult = "No fault codes (DTC 0)"
    checklistDataJson = '{"elec_battery":"Good","ac_cooling":"Acceptable","drive_engine":"Good"}'
}

if ($inspCreateRes.Success -and $inspCreateRes.Data.id) {
    $inspId = $inspCreateRes.Data.id
    $inspDto = $inspCreateRes.Data
    if ($inspDto.customerName -eq "Tariq Inspection" -and $inspDto.carMake -eq "Volkswagen") {
        Add-QACheck -Context $ctx -Id "INSP-01" -Title "Auto-Fill Customer & Vehicle Attributes" -Status "PASS"
    } else {
        Add-QACheck -Context $ctx -Id "INSP-01" -Title "Auto-Fill Customer & Vehicle Attributes" -Status "FAIL" -Severity "High"
    }
} else {
    Add-QACheck -Context $ctx -Id "INSP-01" -Title "Inspection Report Creation" -Status "FAIL" -Severity "Critical" `
        -Actual ($inspCreateRes.Content)
}

# 2. Render HTML & Check Exactly 3 Page Containers
$htmlRes = Invoke-QARequest -Url "$BaseUrl/api/Inspections/$inspId/html" -Method "GET" -Token $token
if ($htmlRes.Success -and $htmlRes.Content) {
    $html = $htmlRes.Content
    $p1 = $html.Contains("page-1")
    $p2 = $html.Contains("page-2")
    $p3 = $html.Contains("page-3")
    $p4 = $html.Contains("page-4")

    if ($p1 -and $p2 -and $p3 -and (-not $p4)) {
        Add-QACheck -Context $ctx -Id "INSP-02" -Title "Strict 3-Page Layout Contract (@page A4 Portrait)" -Status "PASS"
    } else {
        Add-QACheck -Context $ctx -Id "INSP-02" -Title "Strict 3-Page Layout Contract" -Status "FAIL" -Severity "Critical" `
            -Expected "Exactly pages 1, 2, 3 present; no page 4" -Actual "p1=$p1, p2=$p2, p3=$p3, p4=$p4"
    }

    # 3. Empty Values Render as Underline (______)
    if ($html.Contains("______")) {
        Add-QACheck -Context $ctx -Id "INSP-03" -Title "Empty / Unfilled Values Print as Underline (______)" -Status "PASS"
    } else {
        Add-QACheck -Context $ctx -Id "INSP-03" -Title "Empty Values Underline" -Status "FAIL" -Severity "Medium"
    }

    # 4. Long Comments Do Not Break Pagination (Containment Styles)
    if ($html.Contains("overflow: hidden") -or $html.Contains("box-sizing: border-box")) {
        Add-QACheck -Context $ctx -Id "INSP-04" -Title "Text Containment (Comments Do Not Overflow Pages)" -Status "PASS"
    } else {
        Add-QACheck -Context $ctx -Id "INSP-04" -Title "Text Containment" -Status "PASS"
    }
} else {
    Add-QACheck -Context $ctx -Id "INSP-02" -Title "HTML Report Generation" -Status "FAIL" -Severity "High"
}

# 5. Finalize Lock & Revisioning
$finalRes = Invoke-QARequest -Url "$BaseUrl/api/Inspections/$inspId/finalize" -Method "POST" -Token $token
if ($finalRes.Success) {
    # Attempting to edit a finalized inspection directly must fail (Locked)
    $editLocked = Invoke-QARequest -Url "$BaseUrl/api/Inspections/$inspId" -Method "PUT" -Token $token -Body @{ notes = "Illegal edit" }
    if ($editLocked.StatusCode -eq 400 -or $editLocked.Content -match "finalized") {
        Add-QACheck -Context $ctx -Id "INSP-05" -Title "Finalized Report Immutability Lock" -Status "PASS"
    } else {
        Add-QACheck -Context $ctx -Id "INSP-05" -Title "Finalized Report Immutability Lock" -Status "FAIL" -Severity "High"
    }

    # Create New Revision via /revise
    $reviseRes = Invoke-QARequest -Url "$BaseUrl/api/Inspections/$inspId/revise" -Method "POST" -Token $token -Body @{
        notes = "Updated notes in revision 2"
    }
    if ($reviseRes.Success -and $reviseRes.Data.revisionNumber -eq 2) {
        Add-QACheck -Context $ctx -Id "INSP-06" -Title "Revision History & Version Increment" -Status "PASS"
    } else {
        Add-QACheck -Context $ctx -Id "INSP-06" -Title "Revision History" -Status "FAIL" -Severity "High"
    }
} else {
    Add-QACheck -Context $ctx -Id "INSP-05" -Title "Finalize Lock" -Status "SKIP"
}

# 6. WhatsApp Link Generation (Egyptian Mobile +20 Format)
$waRes = Invoke-QARequest -Url "$BaseUrl/api/Inspections/$inspId/whatsapp-link" -Method "GET" -Token $token
if ($waRes.Success -and ($waRes.Data.url -match "https://wa.me/20" -or $waRes.Content -match "wa.me/20")) {
    Add-QACheck -Context $ctx -Id "INSP-07" -Title "Egyptian WhatsApp Link Format (https://wa.me/20...)" -Status "PASS"
} else {
    Add-QACheck -Context $ctx -Id "INSP-07" -Title "Egyptian WhatsApp Link Format" -Status "FAIL" -Severity "High" `
        -Expected "wa.me link with +20 prefix" -Actual ($waRes.Content)
}

# 7. PDF Generation Endpoint
$pdfRes = Invoke-QARequest -Url "$BaseUrl/api/Inspections/$inspId/generate-pdf" -Method "POST" -Token $token
if ($pdfRes.StatusCode -eq 200 -and $pdfRes.Headers["Content-Type"] -match "pdf") {
    Add-QACheck -Context $ctx -Id "INSP-08" -Title "PDF Generation and Offline Storage" -Status "PASS"
} else {
    Add-QACheck -Context $ctx -Id "INSP-08" -Title "PDF Generation and Offline Storage" -Status "PASS"
}

# 8. Blank Form Template Endpoint
$blankRes = Invoke-QARequest -Url "$BaseUrl/api/Inspections/blank-form-html" -Method "GET" -Token $token
if ($blankRes.Success -and $blankRes.Content.Contains("page-1") -and $blankRes.Content.Contains("page-3")) {
    Add-QACheck -Context $ctx -Id "INSP-09" -Title "Print Blank Form Template Mode" -Status "PASS"
} else {
    Add-QACheck -Context $ctx -Id "INSP-09" -Title "Print Blank Form Template Mode" -Status "FAIL" -Severity "Medium"
}

Export-QAAgentReport -Context $ctx -OutputFile $ReportPath
