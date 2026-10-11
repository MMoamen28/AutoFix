@echo off
title Build AutoFix Release (Self-Contained)

echo ========================================================
echo        Building AutoFix Standalone Workshop Release
echo ========================================================
echo.

echo [1/4] Building React 18 frontend...
cd autofix-frontend
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Frontend build failed!
    cd ..
    pause
    exit /b 1
)
cd ..

echo.
echo [2/4] Syncing frontend bundle to backend wwwroot...
if not exist "wwwroot" mkdir wwwroot
xcopy /E /Y /Q autofix-frontend\dist\* wwwroot\

echo.
echo [3/4] Publishing self-contained win-x64 bundle (No .NET install needed on target laptop)...
dotnet publish AutoFix.csproj -c Release -r win-x64 --self-contained true -o ./publish

if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] dotnet publish failed!
    pause
    exit /b 1
)

echo.
echo [4/4] Copying launcher scripts into publish directory...
copy /Y Start-AutoFix.bat publish\
copy /Y Stop-AutoFix.bat publish\

echo.
echo ========================================================
echo   BUILD SUCCESSFUL!
echo   Standalone app is ready in: ./publish/
echo   Just double-click publish\Start-AutoFix.bat to run!
echo ========================================================
pause
