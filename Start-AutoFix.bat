@echo off
setlocal enabledelayedexpansion
title AutoFix Workshop System
cd /d "%~dp0"

echo ========================================================
echo        AutoFix: Professional Workshop System
echo               Multi-Device Desktop Edition
echo ========================================================
echo.

set URL=http://localhost:5000
set HEALTH_URL=%URL%/api/health

:: Detect Primary Local LAN IP for Phone and other laptops
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4 Address" /c:"Adresse IPv4"') do (
    set RAW_IP=%%a
    set IP=!RAW_IP: =!
    if "!IP:~0,4!"=="192." set LOCAL_LAN_IP=!IP!
    if "!IP:~0,3!"=="10." set LOCAL_LAN_IP=!IP!
)
if "!LOCAL_LAN_IP!"=="" set LOCAL_LAN_IP=192.168.1.X

:: Check if already running
curl -s --max-time 2 %HEALTH_URL% >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [INFO] AutoFix is already running!
    echo.
    echo ========================================================
    echo   AutoFix is ONLINE:
    echo   - On this Laptop:   %URL%
    echo   - On Phone / Other Laptops:  http://!LOCAL_LAN_IP!:5000
    echo ========================================================
    echo.
    start "" %URL%
    exit /b 0
)

echo [1/3] Starting AutoFix Server in the background...
if exist "publish\AutoFix.exe" (
    start "AutoFix Server" /min "publish\AutoFix.exe" --DataDirectory "C:\AutoFixData"
) else if exist "bin\Release\net8.0\AutoFix.exe" (
    start "AutoFix Server" /min "bin\Release\net8.0\AutoFix.exe" --DataDirectory "C:\AutoFixData"
) else if exist "bin\Debug\net8.0\AutoFix.exe" (
    start "AutoFix Server" /min "bin\Debug\net8.0\AutoFix.exe" --DataDirectory "C:\AutoFixData"
) else (
    start "AutoFix Server" /min dotnet run --no-build -c Release -- --DataDirectory "C:\AutoFixData"
)

echo [2/3] Waiting for AutoFix server to be ready...
set ATTEMPTS=0
:WAIT_LOOP
ping 127.0.0.1 -n 2 >nul
set /a ATTEMPTS+=1

curl -s --max-time 2 %HEALTH_URL% >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    goto SERVER_READY
)

if %ATTEMPTS% GEQ 30 (
    echo.
    echo [ERROR] Server took too long to start. Please check logs in C:\AutoFixData\Logs\
    pause
    exit /b 1
)

echo        Waiting... (%ATTEMPTS%s)
goto WAIT_LOOP

:SERVER_READY
echo.
echo [3/3] Server is ONLINE and HEALTHY!
echo [INFO] Opening default browser at %URL%...
start "" %URL%
echo.
echo ========================================================
echo   AutoFix is now running!
echo.
echo   [THIS LAPTOP]
echo     %URL%
echo.
echo   [PHONE ^& OTHER LAPTOPS ON SAME WI-FI]
echo     http://!LOCAL_LAN_IP!:5000
echo.
echo   To safely stop the system, run Stop-AutoFix.bat
echo ========================================================
echo.
