@echo off
title Stop AutoFix Workshop System

echo ========================================================
echo        Stopping AutoFix Workshop System Safely...
echo ========================================================
echo.

taskkill /f /im AutoFix.exe >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [INFO] AutoFix.exe process stopped successfully.
) else (
    echo [INFO] AutoFix.exe was not running or was started via dotnet CLI.
)

:: Also kill dotnet process listening on 5000 if running via dotnet run
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5000 ^| findstr LISTENING') do (
    echo [INFO] Stopping process PID %%a listening on port 5000...
    taskkill /f /pid %%a >nul 2>&1
)

echo.
echo [DONE] AutoFix server has stopped cleanly.
timeout /t 2 /nobreak >nul
