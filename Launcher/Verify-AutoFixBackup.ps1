param(
    [string]$BackupsDirectory = "D:\AutoFixBackups",
    [string]$WeeklyDirectory = "D:\AutoFixBackups_Weekly",
    [string]$LogFile = "C:\AutoFixData\Logs\backup-check.log",
    [string]$CheckerExe = "D:\AutoFix\Launcher\bin\IntegrityChecker.exe"
)

$logDir = Split-Path -Parent $LogFile
if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
}

$now = Get-Date
$ts = $now.ToString("yyyy-MM-dd HH:mm:ss")

if (-not (Test-Path $BackupsDirectory)) {
    Add-Content -Path $LogFile -Value "[$ts] ALERT: Backups directory does not exist: $BackupsDirectory"
    exit 1
}

$newest = Get-ChildItem -Path $BackupsDirectory -Filter *.db -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1

if ($null -eq $newest) {
    Add-Content -Path $LogFile -Value "[$ts] ALERT: No backup files found in $BackupsDirectory"
    exit 1
}

if ($newest.Length -eq 0) {
    Add-Content -Path $LogFile -Value "[$ts] ALERT: Newest backup is empty (0 bytes): $($newest.Name)"
    exit 2
}

if ($newest.LastWriteTime -lt $now.AddHours(-24)) {
    Add-Content -Path $LogFile -Value "[$ts] ALERT: Newest backup is older than 24 hours: $($newest.Name) ($($newest.LastWriteTime.ToString('yyyy-MM-dd HH:mm:ss')))"
    exit 3
}

$checkResult = & $CheckerExe $newest.FullName
if ($checkResult -match "^OK") {
    Add-Content -Path $LogFile -Value "[$ts] OK: $($newest.Name) passed integrity check ($($newest.Length) bytes, $($newest.LastWriteTime.ToString('yyyy-MM-dd HH:mm:ss')))"
} else {
    Add-Content -Path $LogFile -Value "[$ts] ALERT: $($newest.Name) integrity check failed ($checkResult)"
    exit 4
}

if (-not (Test-Path $WeeklyDirectory)) {
    New-Item -ItemType Directory -Path $WeeklyDirectory -Force | Out-Null
}

$newestWeekly = Get-ChildItem -Path $WeeklyDirectory -Filter *.db -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
$needsWeeklyCopy = $false

if ($null -eq $newestWeekly) {
    $needsWeeklyCopy = $true
} elseif ($newestWeekly.LastWriteTime -lt $now.AddDays(-7)) {
    $needsWeeklyCopy = $true
}

if ($needsWeeklyCopy) {
    $targetWeeklyFile = Join-Path $WeeklyDirectory $newest.Name
    Copy-Item -Path $newest.FullName -Destination $targetWeeklyFile -Force
    Add-Content -Path $LogFile -Value "[$ts] OK: Copied $($newest.Name) to weekly backup directory: $WeeklyDirectory"
}

$weeklyBackups = Get-ChildItem -Path $WeeklyDirectory -Filter *.db -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending
if ($weeklyBackups.Count -gt 8) {
    $toRemove = $weeklyBackups | Select-Object -Skip 8
    foreach ($item in $toRemove) {
        Remove-Item -Path $item.FullName -Force -ErrorAction SilentlyContinue
    }
}
