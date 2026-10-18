param(
    [string]$TaskName = "AP Portal Server",
    [string]$ScriptPath = "D:\AutoFix\Launcher\Run-AutoFixServer.ps1"
)

$currentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-WindowStyle Hidden -ExecutionPolicy Bypass -NoProfile -File `"$ScriptPath`""
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $currentUser
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RestartCount 99 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit ([System.TimeSpan]::Zero)
$principal = New-ScheduledTaskPrincipal -UserId $currentUser -LogonType Interactive -RunLevel Limited

try {
    Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Force -ErrorAction Stop | Out-Null
    Write-Output "SUCCESS: Scheduled task '$TaskName' registered for user '$currentUser' without administrator elevation."
} catch {
    if (-not $isAdmin) {
        Write-Output "ALERT: Failed to register task without administrator rights: $($_.Exception.Message)"
    } else {
        Write-Output "ALERT: Registration error: $($_.Exception.Message)"
    }
}
