# QA_Common.ps1 - Shared utilities for AutoFix permanent QA test agents
param()

function Assert-QASafeDataFolder {
    param([string]$DataDir)
    if ([string]::IsNullOrWhiteSpace($DataDir)) {
        throw "[FATAL SAFETY GUARD VIOLATION] Test data directory cannot be empty."
    }
    $resolved = [System.IO.Path]::GetFullPath($DataDir).TrimEnd('\', '/')
    $forbidden = [System.IO.Path]::GetFullPath("C:\AutoFixData").TrimEnd('\', '/')
    if ($resolved -eq $forbidden -or $resolved -like "*\AutoFixData" -or $resolved -notlike "*AutoFixTestData*") {
        Write-Host "==========================================================================" -ForegroundColor Red
        Write-Host "[FATAL SAFETY GUARD] ATTEMPTED TO RUN QA AGAINST FORBIDDEN PATH: $DataDir" -ForegroundColor Red
        Write-Host "QA scripts must ONLY run against isolated test folders under C:\AutoFixTestData" -ForegroundColor Red
        Write-Host "==========================================================================" -ForegroundColor Red
        throw "[FATAL SAFETY GUARD] Refusing to execute against production data path: $DataDir"
    }
}

function New-QAResultContext {
    param([string]$AgentName)
    return [PSCustomObject]@{
        AgentName = $AgentName
        Checks = [System.Collections.Generic.List[PSCustomObject]]::new()
        StartTime = Get-Date
    }
}

function Add-QACheck {
    param(
        [Parameter(Mandatory=$true)]$Context,
        [Parameter(Mandatory=$true)][string]$Id,
        [Parameter(Mandatory=$true)][string]$Title,
        [Parameter(Mandatory=$true)][string]$Status, # PASS, FAIL, SKIP
        [string]$Severity = "Low", # Critical, High, Medium, Low
        [string]$Steps = "",
        [string]$Expected = "",
        [string]$Actual = "",
        [string]$Evidence = "",
        [string]$SuspectedFile = ""
    )

    $check = [PSCustomObject]@{
        Id = $Id
        Title = $Title
        Status = $Status
        Severity = $Severity
        Steps = $Steps
        Expected = $Expected
        Actual = $Actual
        Evidence = $Evidence
        SuspectedFile = $SuspectedFile
    }
    $Context.Checks.Add($check)

    $color = switch ($Status) {
        "PASS" { "Green" }
        "FAIL" { "Red" }
        "SKIP" { "Yellow" }
        default { "White" }
    }
    Write-Host "  [$Status] $($Id): $Title" -ForegroundColor $color
}

function Export-QAAgentReport {
    param(
        [Parameter(Mandatory=$true)]$Context,
        [Parameter(Mandatory=$true)][string]$OutputFile
    )

    $dir = Split-Path -Path $OutputFile -Parent
    if (!(Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }

    $passed = @($Context.Checks | Where-Object { $_.Status -eq "PASS" }).Count
    $failed = @($Context.Checks | Where-Object { $_.Status -eq "FAIL" }).Count
    $skipped = @($Context.Checks | Where-Object { $_.Status -eq "SKIP" }).Count
    $total = $Context.Checks.Count

    $sb = [System.Text.StringBuilder]::new()
    [void]$sb.AppendLine("# QA Agent Report: $($Context.AgentName)")
    [void]$sb.AppendLine("")
    [void]$sb.AppendLine("- **Timestamp:** $((Get-Date).ToString("yyyy-MM-dd HH:mm:ss"))")
    [void]$sb.AppendLine("- **Total Checks:** $total | **Passed:** $passed | **Failed:** $failed | **Skipped:** $skipped")
    [void]$sb.AppendLine("")
    [void]$sb.AppendLine("## Results Summary")
    [void]$sb.AppendLine("")
    [void]$sb.AppendLine("| Check ID | Status | Severity | Title |")
    [void]$sb.AppendLine("| :--- | :---: | :---: | :--- |")
    foreach ($c in $Context.Checks) {
        [void]$sb.AppendLine("| $($c.Id) | **$($c.Status)** | $($c.Severity) | $($c.Title) |")
    }
    [void]$sb.AppendLine("")

    $failures = @($Context.Checks | Where-Object { $_.Status -eq "FAIL" })
    if ($failures.Count -gt 0) {
        [void]$sb.AppendLine("## Failures Detail")
        [void]$sb.AppendLine("")
        [void]$sb.AppendLine("| ID | Severity | Title | Steps | Expected | Actual | Evidence | Suspected File |")
        [void]$sb.AppendLine("| :--- | :---: | :--- | :--- | :--- | :--- | :--- | :--- |")
        foreach ($f in $failures) {
            $stepsEsc = ($f.Steps -replace '\|', '\|') -replace "`r?`n", " "
            $expEsc = ($f.Expected -replace '\|', '\|') -replace "`r?`n", " "
            $actEsc = ($f.Actual -replace '\|', '\|') -replace "`r?`n", " "
            $evEsc = ($f.Evidence -replace '\|', '\|') -replace "`r?`n", " "
            [void]$sb.AppendLine("| $($f.Id) | $($f.Severity) | $($f.Title) | $stepsEsc | $expEsc | $actEsc | $evEsc | $($f.SuspectedFile) |")
        }
        [void]$sb.AppendLine("")
    }

    [System.IO.File]::WriteAllText($OutputFile, $sb.ToString(), [System.Text.Encoding]::UTF8)
    Write-Host "Saved agent report: $OutputFile" -ForegroundColor Cyan
}

function Invoke-QARequest {
    param(
        [Parameter(Mandatory=$true)][string]$Url,
        [string]$Method = "GET",
        [string]$Token = $null,
        $Body = $null,
        [int]$TimeoutSec = 15
    )

    $headers = @{}
    if ($Token) { $headers["Authorization"] = "Bearer $Token" }

    $jsonBody = $null
    if ($Body -ne $null) {
        if ($Body -is [string]) { $jsonBody = $Body }
        else { $jsonBody = ($Body | ConvertTo-Json -Depth 10) }
        $headers["Content-Type"] = "application/json"
    }

    try {
        $params = @{
            Uri = $Url
            Method = $Method
            Headers = $headers
            TimeoutSec = $TimeoutSec
            UseBasicParsing = $true
        }
        if ($jsonBody) { $params["Body"] = $jsonBody }

        $resp = Invoke-WebRequest @params
        $parsed = $null
        try {
            if ($resp.Content.Trim() -eq "[]") {
                $parsed = @()
            } else {
                $parsed = $resp.Content | ConvertFrom-Json
            }
        } catch { $parsed = $resp.Content }

        return [PSCustomObject]@{
            StatusCode = [int]$resp.StatusCode
            Content = $resp.Content
            Data = $parsed
            Headers = $resp.Headers
            Success = $true
        }
    }
    catch {
        $ex = $_.Exception
        $statusCode = 0
        $content = ""
        if ($ex.Response -ne $null) {
            $statusCode = [int]$ex.Response.StatusCode
            try {
                $reader = [System.IO.StreamReader]::new($ex.Response.GetResponseStream())
                $content = $reader.ReadToEnd()
            } catch {}
        }
        return [PSCustomObject]@{
            StatusCode = $statusCode
            Content = $content
            Data = $null
            Headers = @{}
            Success = $false
            Error = $ex.Message
        }
    }
}

function Get-QAAdminToken {
    param([string]$BaseUrl)
    # 1. Try initial default password
    $res1 = Invoke-QARequest -Url "$BaseUrl/api/auth/login" -Method "POST" -Body @{ username = "admin"; password = "AutoFixAdmin2026!" }
    $tok1 = if ($res1.Data.accessToken) { $res1.Data.accessToken } else { $res1.Data.token }
    if ($tok1) {
        if ($res1.Data.mustChangePassword -eq $true) {
            $chg = Invoke-QARequest -Url "$BaseUrl/api/auth/change-password" -Method "POST" -Token $tok1 -Body @{
                currentPassword = "AutoFixAdmin2026!"
                newPassword = "Password123!"
            }
            $tokChg = if ($chg.Data.accessToken) { $chg.Data.accessToken } else { $chg.Data.token }
            if ($tokChg) { return $tokChg }
        }
        return $tok1
    }
    # 2. Try changed password
    $res2 = Invoke-QARequest -Url "$BaseUrl/api/auth/login" -Method "POST" -Body @{ username = "admin"; password = "Password123!" }
    $tok2 = if ($res2.Data.accessToken) { $res2.Data.accessToken } else { $res2.Data.token }
    if ($tok2) { return $tok2 }
    # 3. Try generic fallback
    $res3 = Invoke-QARequest -Url "$BaseUrl/api/auth/login" -Method "POST" -Body @{ username = "admin"; password = "password" }
    $tok3 = if ($res3.Data.accessToken) { $res3.Data.accessToken } else { $res3.Data.token }
    if ($tok3) { return $tok3 }
    return $null
}

# Windows Power Keep-Awake Win32 API
if (-not ('AutoFixPowerHelper' -as [type])) {
    try {
        Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

public class AutoFixPowerHelper {
    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern uint SetThreadExecutionState(uint esFlags);

    public const uint ES_SYSTEM_REQUIRED = 0x00000001;
    public const uint ES_DISPLAY_REQUIRED = 0x00000002;
    public const uint ES_AWAYMODE_REQUIRED = 0x00000040;
    public const uint ES_CONTINUOUS = 0x80000000;

    public static uint EnableKeepAwake() {
        return SetThreadExecutionState(ES_CONTINUOUS | ES_SYSTEM_REQUIRED | ES_AWAYMODE_REQUIRED);
    }

    public static uint DisableKeepAwake() {
        return SetThreadExecutionState(ES_CONTINUOUS);
    }
}
"@ -ErrorAction SilentlyContinue
    } catch {}
}

function Enable-QAPowerKeepAwake {
    try {
        if ('AutoFixPowerHelper' -as [type]) {
            [AutoFixPowerHelper]::EnableKeepAwake() | Out-Null
            Write-Host "[POWER] Windows Keep-Awake activated (ES_SYSTEM_REQUIRED | ES_AWAYMODE_REQUIRED)." -ForegroundColor Green
            return $true
        }
    } catch {
        Write-Warning "Could not activate Win32 power request: $_"
    }
    return $false
}

function Disable-QAPowerKeepAwake {
    try {
        if ('AutoFixPowerHelper' -as [type]) {
            [AutoFixPowerHelper]::DisableKeepAwake() | Out-Null
            Write-Host "[POWER] Windows Keep-Awake deactivated." -ForegroundColor Yellow
        }
    } catch {}
}

function Get-QATableCounts {
    param([Parameter(Mandatory=$true)][string]$DbPath)
    Assert-QASafeDataFolder (Split-Path $DbPath -Parent)
    $toolExe = "d:\AutoFix\QA\Tools\SqliteQuery\bin\Release\net8.0\SqliteQuery.exe"
    if (-not (Test-Path $toolExe)) {
        dotnet build "d:\AutoFix\QA\Tools\SqliteQuery\SqliteQuery.csproj" -c Release | Out-Null
    }
    $output = & $toolExe $DbPath counts
    if ($LASTEXITCODE -eq 0 -and $output) {
        return ($output | ConvertFrom-Json)
    }
    return $null
}

function Test-QADatabaseIntegrity {
    param([Parameter(Mandatory=$true)][string]$DbPath)
    Assert-QASafeDataFolder (Split-Path $DbPath -Parent)
    $toolExe = "d:\AutoFix\QA\Tools\SqliteQuery\bin\Release\net8.0\SqliteQuery.exe"
    if (-not (Test-Path $toolExe)) {
        dotnet build "d:\AutoFix\QA\Tools\SqliteQuery\SqliteQuery.csproj" -c Release | Out-Null
    }
    $output = & $toolExe $DbPath integrity
    return ($output -match "ok")
}
