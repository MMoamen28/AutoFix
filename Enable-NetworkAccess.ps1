# Enable-NetworkAccess.ps1
# Allows incoming connections on TCP Port 5000 ONLY on Private network profiles (Workshop LAN).
# Never opens the port on Public networks.

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "AutoFix Workshop - Enable LAN Network Access (Port 5000)" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$RuleName = "AutoFix Workshop Port 5000 (Private Only)"

try {
    # Check if rule exists
    $existing = Get-NetFirewallRule -DisplayName $RuleName -ErrorAction SilentlyContinue
    if ($existing) {
        Remove-NetFirewallRule -DisplayName $RuleName -ErrorAction SilentlyContinue
    }

    New-NetFirewallRule -DisplayName $RuleName `
                        -Direction Inbound `
                        -LocalPort 5000 `
                        -Protocol TCP `
                        -Action Allow `
                        -Profile Private `
                        -Description "Allows mobile and tablet access to AutoFix workshop portal on local private network." | Out-Null

    Write-Host "[SUCCESS] Windows Firewall rule created successfully for port 5000 (Private profile only)." -ForegroundColor Green
    Write-Host ""
    Write-Host "Local IP addresses reachable on your workshop Wi-Fi / LAN:" -ForegroundColor Yellow
    Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notlike "*Loopback*" -and $_.IPAddress -notlike "169.254*" } | ForEach-Object {
        Write-Host "  -> http://$($_.IPAddress):5000" -ForegroundColor White
    }
    Write-Host ""
    Write-Host "Tip: In your Wi-Fi router settings, reserve a fixed/static DHCP IP for this laptop." -ForegroundColor Gray
} catch {
    Write-Error "Failed to configure firewall rule: $_"
}
