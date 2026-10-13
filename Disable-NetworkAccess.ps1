# Disable-NetworkAccess.ps1
# Removes incoming connections rule on TCP Port 5000, isolating the workshop portal to localhost only.

Write-Host "==========================================================" -ForegroundColor Yellow
Write-Host "AutoFix Workshop - Disable LAN Network Access (Port 5000)" -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Yellow

$RuleName = "AutoFix Workshop Port 5000 (Private Only)"

try {
    $existing = Get-NetFirewallRule -DisplayName $RuleName -ErrorAction SilentlyContinue
    if ($existing) {
        Remove-NetFirewallRule -DisplayName $RuleName -ErrorAction SilentlyContinue
        Write-Host "[SUCCESS] Windows Firewall rule removed. Port 5000 is closed to external devices." -ForegroundColor Green
    } else {
        Write-Host "[INFO] No active firewall rule found for AutoFix port 5000." -ForegroundColor Gray
    }
} catch {
    Write-Error "Failed to remove firewall rule: $_"
}
