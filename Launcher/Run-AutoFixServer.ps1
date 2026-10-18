param(
    [string]$DataDirectory = "C:\AutoFixData",
    [int]$Port = 5000,
    [int]$HealthCheckIntervalSeconds = 30,
    [string]$ExePath = "D:\AutoFix\publish\AutoFix.exe",
    [string]$MutexName = "AutoFix_Supervisor_Mutex"
)

$isNew = $false
$mutex = New-Object System.Threading.Mutex($true, $MutexName, [ref]$isNew)
if (-not $isNew) {
    exit 0
}

$logsDir = Join-Path $DataDirectory "Logs"
if (-not (Test-Path $logsDir)) {
    New-Item -ItemType Directory -Path $logsDir -Force | Out-Null
}

$logFile = Join-Path $logsDir "supervisor.log"
$pidFile = Join-Path $logsDir "autofix.pid"

function Write-SupervisorLog([string]$message) {
    $now = Get-Date
    $ts = $now.ToString("yyyy-MM-dd HH:mm:ss")
    $line = "[$ts] $message"
    if (Test-Path $logFile) {
        if ((Get-Item $logFile).Length -gt 10MB) {
            $archive = Join-Path $logsDir ("supervisor_" + $now.ToString("yyyyMMdd_HHmmss") + ".log")
            Move-Item -Path $logFile -Destination $archive -Force
        }
    }
    Add-Content -Path $logFile -Value $line
}

function Stop-SavedServer {
    if (Test-Path $pidFile) {
        $raw = Get-Content -Path $pidFile -Raw -ErrorAction SilentlyContinue
        if ($raw) {
            $trimmed = $raw.Trim()
            if ($trimmed -match '^\d+$') {
                $targetPid = [int]$trimmed
                $proc = Get-Process -Id $targetPid -ErrorAction SilentlyContinue
                if ($proc) {
                    Write-SupervisorLog "STOP: Stopping server PID $targetPid"
                    Stop-Process -Id $targetPid -Force -ErrorAction SilentlyContinue
                    Start-Sleep -Seconds 1
                }
            }
        }
        Remove-Item -Path $pidFile -Force -ErrorAction SilentlyContinue
    }
}

function Start-ServerProcess {
    $allowExternal = $false
    $appSettingsFile = Join-Path (Split-Path -Parent $ExePath) "appsettings.json"
    if (Test-Path $appSettingsFile) {
        try {
            $json = Get-Content -Path $appSettingsFile -Raw | ConvertFrom-Json
            if ($json.Network -and $json.Network.AllowExternalAccess -eq $true) {
                $allowExternal = $true
            }
        } catch {}
    }
    $settingsFile = Join-Path $DataDirectory "Files\Settings\workshop_settings.json"
    if (Test-Path $settingsFile) {
        try {
            $json = Get-Content -Path $settingsFile -Raw | ConvertFrom-Json
            if ($json.AllowExternalAccess -eq $true) {
                $allowExternal = $true
            }
        } catch {}
    }
    $hostName = if ($allowExternal) { "0.0.0.0" } else { "localhost" }
    $url = "http://$hostName`:$Port"

    $stdoutFile = Join-Path $logsDir "stdout.log"
    $stderrFile = Join-Path $logsDir "stderr.log"

    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = $ExePath
    $psi.Arguments = "--DataDirectory `"$DataDirectory`" --urls `"$url`""
    $psi.EnvironmentVariables["ASPNETCORE_URLS"] = $url
    $psi.UseShellExecute = $false
    $psi.CreateNoWindow = $true
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.WindowStyle = [System.Diagnostics.ProcessWindowStyle]::Hidden

    $process = New-Object System.Diagnostics.Process
    $process.StartInfo = $psi

    $process.Start() | Out-Null
    $newPid = $process.Id

    Set-Content -Path $pidFile -Value $newPid -Force

    Register-ObjectEvent -InputObject $process -EventName OutputDataReceived -Action {
        if ($EventArgs.Data) {
            Add-Content -Path $Event.MessageData -Value $EventArgs.Data
        }
    } -MessageData $stdoutFile | Out-Null

    Register-ObjectEvent -InputObject $process -EventName ErrorDataReceived -Action {
        if ($EventArgs.Data) {
            Add-Content -Path $Event.MessageData -Value $EventArgs.Data
        }
    } -MessageData $stderrFile | Out-Null

    $process.BeginOutputReadLine()
    $process.BeginErrorReadLine()

    Write-SupervisorLog "START: Server started with PID $newPid on $url"
    return $process
}

Stop-SavedServer
$currentProcess = Start-ServerProcess

$restartHistory = [System.Collections.Generic.List[DateTime]]::new()
$failureCount = 0

try {
    while ($true) {
        Start-Sleep -Seconds $HealthCheckIntervalSeconds
        
        $healthy = $false
        $healthUrl = "http://localhost:$Port/api/health"

        try {
            $req = [System.Net.HttpWebRequest]::Create($healthUrl)
            $req.Timeout = 5000
            $req.Method = "GET"
            $resp = $req.GetResponse()
            $stream = $resp.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($stream)
            $body = $reader.ReadToEnd()
            $reader.Close()
            $stream.Close()
            $resp.Close()
            $json = ConvertFrom-Json $body
            if ($json.status -eq "Healthy" -and 
                $json.dataDirectory -eq $DataDirectory -and 
                $json.isFallbackDirectory -eq $false) {
                $healthy = $true
            }
        } catch {
            $healthy = $false
        }

        if ($healthy) {
            $failureCount = 0
        } else {
            $failureCount++
            Write-SupervisorLog "FAIL: Health check failed ($failureCount/3) on port $Port"

            if ($failureCount -ge 3) {
                $now = Get-Date
                $cutoff = $now.AddMinutes(-10)
                $filtered = @($restartHistory | Where-Object { $_ -ge $cutoff })
                $restartHistory = [System.Collections.Generic.List[DateTime]]::new()
                foreach ($item in $filtered) {
                    if ($item) {
                        $restartHistory.Add($item)
                    }
                }

                if ($restartHistory.Count -ge 5) {
                    Write-SupervisorLog "ALERT: Restart rate limit reached (5 restarts in 10 minutes). Supervisor stopped."
                    Stop-SavedServer
                    break
                }

                Write-SupervisorLog "RESTART: 3 consecutive failures reached. Restarting server."
                Stop-SavedServer
                Start-Sleep -Seconds 5

                $restartHistory.Add((Get-Date))
                $currentProcess = Start-ServerProcess
                $failureCount = 0
            }
        }
    }
} finally {
    if ($mutex) {
        $mutex.ReleaseMutex()
        $mutex.Dispose()
    }
}
