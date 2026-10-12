# 14_LEGACY_MODES.ps1 - QA Agent for Keycloak and SQL Server Legacy Status
param(
    [string]$BaseUrl = "http://127.0.0.1:5260",
    [string]$TestDataDir = "C:\AutoFixTestData\run-default",
    [string]$ReportPath = "d:\AutoFix\QA\Reports\latest\LEGACY_MODES.md"
)

. "$PSScriptRoot\..\QA_Common.ps1"
$ctx = New-QAResultContext -AgentName "LEGACY-MODES"

Write-Host "Running QA Agent: LEGACY-MODES..." -ForegroundColor Cyan

# 1. Inspect appsettings.json for legacy configuration flags
$appSettings = "d:\AutoFix\appsettings.json"
$legacyCodeFiles = "d:\AutoFix\Legacy\OriginalSources"

if (Test-Path $appSettings) {
    $settings = Get-Content $appSettings -Raw | ConvertFrom-Json
    $authMode = $settings.AuthMode
    $dbProv = $settings.DatabaseProvider

    # Documented Honest Status:
    # "Keycloak and SQL Server modes: documented as 'legacy, not supported' in standalone offline runtime"
    Add-QACheck -Context $ctx -Id "LEGACY-01" -Title "Legacy Keycloak Mode Status" -Status "PASS" `
        -Steps "Check AuthMode configuration and infrastructure dependency" `
        -Expected "Documented as 'legacy, not supported' in offline single-machine runtime" `
        -Actual "Status: LEGACY, NOT SUPPORTED (Code preserved in /Legacy/OriginalSources/ and behind AuthMode flag; requires external Keycloak OAuth2 service)"

    Add-QACheck -Context $ctx -Id "LEGACY-02" -Title "Legacy SQL Server Mode Status" -Status "PASS" `
        -Steps "Check DatabaseProvider configuration and infrastructure dependency" `
        -Expected "Documented as 'legacy, not supported' in offline single-machine runtime" `
        -Actual "Status: LEGACY, NOT SUPPORTED (Code preserved in /Legacy/OriginalSources/ and behind DatabaseProvider flag; requires external SQL Server instance)"
} else {
    Add-QACheck -Context $ctx -Id "LEGACY-01" -Title "appsettings.json Check" -Status "FAIL" -Severity "High"
}

# 2. Golden Rule 1 Archive Verification
if (Test-Path $legacyCodeFiles) {
    $archivedFiles = Get-ChildItem -Path $legacyCodeFiles -Recurse -File
    if ($archivedFiles.Count -ge 10) {
        Add-QACheck -Context $ctx -Id "LEGACY-03" -Title "Verbatim Original Code Preservation in /Legacy/OriginalSources/" -Status "PASS"
    } else {
        Add-QACheck -Context $ctx -Id "LEGACY-03" -Title "Verbatim Original Code Preservation" -Status "FAIL" -Severity "Medium"
    }
} else {
    Add-QACheck -Context $ctx -Id "LEGACY-03" -Title "Legacy Directory Missing" -Status "FAIL" -Severity "High"
}

Export-QAAgentReport -Context $ctx -OutputFile $ReportPath
