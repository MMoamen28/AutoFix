@echo off
title AutoFix - Enable Network Access (Port 5000)

:: Check for administrative permissions
net session >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [INFO] Requesting Administrator permissions...
    powershell -Command "Start-Process cmd -ArgumentList '/c \"%~f0\"' -Verb RunAs"
    exit /b
)

echo ========================================================
echo   AutoFix Workshop - Opening Port 5000 in Windows Firewall
echo ========================================================
echo.

netsh advfirewall firewall delete rule name="AutoFix Workshop Port 5000" >nul 2>&1
netsh advfirewall firewall add rule name="AutoFix Workshop Port 5000" dir=in action=allow protocol=TCP localport=5000 profile=any >nul 2>&1

if %ERRORLEVEL% EQU 0 (
    echo [SUCCESS] Port 5000 is now open for Mobile & Multi-Laptop access!
) else (
    echo [WARNING] Could not configure firewall automatically.
)

echo.
echo ========================================================
echo Your Workshop Local Wi-Fi Addresses:
powershell -Command "Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notlike '*Loopback*' -and $_.IPAddress -notlike '169.254*' -and $_.IPAddress -notlike '172.*' } | ForEach-Object { Write-Host '  -> Phone / Laptop URL: http://' $_.IPAddress ':5000' -ForegroundColor Green }"
echo ========================================================
echo.
pause
