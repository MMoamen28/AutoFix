# QA_Common.ps1 - Shared utilities for AutoFix permanent QA test agents
param()

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

