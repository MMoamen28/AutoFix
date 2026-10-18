param(
    [string]$DataDirectory = "C:\AutoFixData",
    [string]$BackupsDirectory = "D:\AutoFixBackups",
    [int]$Port = 5000
)

$pidFile = Join-Path $DataDirectory "Logs\autofix.pid"
$logFile = Join-Path $DataDirectory "Logs\supervisor.log"

$isRunning = $false
$serverPid = "N/A"
$uptimeStr = "N/A"

if (Test-Path $pidFile) {
    $rawPid = Get-Content -Path $pidFile -Raw -ErrorAction SilentlyContinue
    if ($rawPid) {
        $trimmed = $rawPid.Trim()
        if ($trimmed -match '^\d+$') {
            $targetPid = [int]$trimmed
            $proc = Get-Process -Id $targetPid -ErrorAction SilentlyContinue
            if ($proc) {
                $isRunning = $true
                $serverPid = $targetPid.ToString()
                $diff = (Get-Date) - $proc.StartTime
                $uptimeStr = "{0}d {1}h {2}m {3}s" -f $diff.Days, $diff.Hours, $diff.Minutes, $diff.Seconds
            } else {
                $serverPid = "$targetPid (Inactive)"
            }
        }
    }
}

$lastBackupTime = "N/A"
$newestBackupSize = "N/A"

if (Test-Path $BackupsDirectory) {
    $newestBackup = Get-ChildItem -Path $BackupsDirectory -Filter *.db -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if ($newestBackup) {
        $lastBackupTime = $newestBackup.LastWriteTime.ToString("yyyy-MM-dd HH:mm:ss")
        $newestBackupSize = "{0:N2} MB ({1} bytes)" -f ($newestBackup.Length / 1MB), $newestBackup.Length
    }
}

$diskC = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'" -ErrorAction SilentlyContinue
$diskD = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='D:'" -ErrorAction SilentlyContinue

$freeC = if ($diskC) { "{0:N2} GB free of {1:N2} GB" -f ($diskC.FreeSpace / 1GB), ($diskC.Size / 1GB) } else { "N/A" }
$freeD = if ($diskD) { "{0:N2} GB free of {1:N2} GB" -f ($diskD.FreeSpace / 1GB), ($diskD.Size / 1GB) } else { "N/A" }

$lastLogs = @()
if (Test-Path $logFile) {
    $lastLogs = Get-Content -Path $logFile -Tail 10 -ErrorAction SilentlyContinue
}

[PSCustomObject]@{
    ServerRunning      = if ($isRunning) { "YES" } else { "NO" }
    PID                = $serverPid
    Uptime             = $uptimeStr
    LastBackupTime     = $lastBackupTime
    NewestBackupSize   = $newestBackupSize
    DiskFree_C         = $freeC
    DiskFree_D         = $freeD
} | Format-List

Write-Output "--- Last 10 Supervisor Log Lines ---"
if ($lastLogs.Count -gt 0) {
    $lastLogs | ForEach-Object { Write-Output $_ }
} else {
    Write-Output "No supervisor logs available."
}
