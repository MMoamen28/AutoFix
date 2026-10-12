# 11_LOCALIZATION_PRINT.ps1 - QA Agent for Arabic RTL & Print Layout
param(
    [string]$BaseUrl = "http://127.0.0.1:5260",
    [string]$TestDataDir = "C:\AutoFixTestData\run-default",
    [string]$ReportPath = "d:\AutoFix\QA\Reports\latest\LOCALIZATION_PRINT.md"
)

. "$PSScriptRoot\..\QA_Common.ps1"
$ctx = New-QAResultContext -AgentName "LOCALIZATION-PRINT"

Write-Host "Running QA Agent: LOCALIZATION-PRINT..." -ForegroundColor Cyan

# 1. Zero External Internet Font Links (100% Offline Cairo Bundling)
$htmlIndex = "d:\AutoFix\wwwroot\index.html"
$hasExternalFonts = $false
if (Test-Path $htmlIndex) {
    $content = [System.IO.File]::ReadAllText($htmlIndex)
    if ($content -match "fonts\.googleapis\.com" -or $content -match "fonts\.gstatic\.com" -or $content -match "cdnjs\.cloudflare\.com") {
        $hasExternalFonts = $true
    }
}

if (-not $hasExternalFonts) {
    Add-QACheck -Context $ctx -Id "LOC-01" -Title "Zero External Internet Links (100% Offline Font Bundling)" -Status "PASS"
} else {
    Add-QACheck -Context $ctx -Id "LOC-01" -Title "External Internet Font Links Detected" -Status "FAIL" -Severity "High" `
        -Expected "All fonts bundled offline" -Actual "Found external CDN references in index.html"
}

# 2. Local Cairo WOFF2 Font Assets Bundled in wwwroot/assets
$woffFiles = Get-ChildItem -Path "d:\AutoFix\wwwroot\assets" -Filter "*cairo*.woff*" -ErrorAction SilentlyContinue
if ($woffFiles.Count -ge 2) {
    Add-QACheck -Context $ctx -Id "LOC-02" -Title "Cairo Arabic Typography WOFF2 Bundled Locally" -Status "PASS"
} else {
    Add-QACheck -Context $ctx -Id "LOC-02" -Title "Cairo Typography Bundled" -Status "FAIL" -Severity "High"
}

# 3. Bilingual Arabic & English Report Labels Contract
$inspServFile = "d:\AutoFix\Services\InspectionService.cs"
if (Test-Path $inspServFile) {
    $servContent = [System.IO.File]::ReadAllText($inspServFile)
    $hasArabicLabels = $servContent.Contains("فحص سيارة شامل") -and $servContent.Contains("كهرباء المحرك") -and $servContent.Contains("مكيف السيارة")
    if ($hasArabicLabels) {
        Add-QACheck -Context $ctx -Id "LOC-03" -Title "Bilingual Arabic/English Inspection Labels Integrity" -Status "PASS"
    } else {
        Add-QACheck -Context $ctx -Id "LOC-03" -Title "Bilingual Arabic/English Inspection Labels" -Status "FAIL" -Severity "High"
    }
} else {
    Add-QACheck -Context $ctx -Id "LOC-03" -Title "Inspection Service File" -Status "FAIL" -Severity "Critical"
}

# 4. A4 Portrait Explicit Page Breaks (@page { size: A4 portrait; })
if ($servContent.Contains("@page") -and $servContent.Contains("size: A4 portrait") -and $servContent.Contains("page-break-after: always")) {
    Add-QACheck -Context $ctx -Id "LOC-04" -Title "A4 Portrait Fixed Layout & Explicit Page Breaks CSS" -Status "PASS"
} else {
    Add-QACheck -Context $ctx -Id "LOC-04" -Title "A4 Portrait Print CSS" -Status "FAIL" -Severity "Critical"
}

# 5. Exact Color Preservation on Print (print-color-adjust: exact)
if ($servContent.Contains("print-color-adjust: exact")) {
    Add-QACheck -Context $ctx -Id "LOC-05" -Title "Print Color Fidelity (print-color-adjust: exact)" -Status "PASS"
} else {
    Add-QACheck -Context $ctx -Id "LOC-05" -Title "Print Color Fidelity" -Status "FAIL" -Severity "Medium"
}

Export-QAAgentReport -Context $ctx -OutputFile $ReportPath
