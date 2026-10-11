@echo off
setlocal enabledelayedexpansion
title AutoFix Workshop System

echo ========================================================
echo        AutoFix: Professional Workshop System
echo               Offline Desktop Edition
echo ========================================================
echo.

set URL=http://localhost:5000
set HEALTH_URL=%URL%/api/health

:: Check if already running
curl -s --max-time 2 %HEALTH_URL% >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [INFO] AutoFix is already running!
    echo [INFO] Opening browser at %URL%...
    start "" %URL%
    exit /b 0
)

echo [1/3] Starting AutoFix Server in the background...
if exist "publish\AutoFix.exe" (
    start "AutoFix Server" /min "publish\AutoFix.exe"
) else if exist "bin\Debug\net8.0\AutoFix.exe" (
    start "AutoFix Server" /min "bin\Debug\net8.0\AutoFix.exe"
) else (
    start "AutoFix Server" /min dotnet run --no-build
)

echo [2/3] Waiting for AutoFix server to be ready...
set ATTEMPTS=0
:WAIT_LOOP
timeout /t 1 /nobreak >nul
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
echo   AutoFix is now running at %URL%
echo   To safely stop the system, run Stop-AutoFix.bat
echo ========================================================
echo.
