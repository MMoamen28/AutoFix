@echo off
title Stop AutoFix Workshop System

echo ========================================================
echo        Stopping AutoFix Workshop System Safely...
echo ========================================================
echo.

for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5000 ^| findstr LISTENING') do (
    echo [INFO] Stopping process PID %%a listening on port 5000...
    taskkill /f /pid %%a >nul 2>&1
)

echo.
echo [DONE] AutoFix server has stopped cleanly.
timeout /t 2 /nobreak >nul
