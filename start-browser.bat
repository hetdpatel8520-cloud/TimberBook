@echo off
title TimberBooks Instant Browser Mode
echo ===================================================
echo   🌲 TimberBooks - Instant Browser App
echo   Company: Bhavani Timbers
echo ===================================================
echo.
echo [1/2] Ensuring TimberBooks Server is running on Port 5000...
netstat -ano | findstr :5000 >nul 2>&1
if %errorlevel% neq 0 (
    echo Starting server...
    start "TimberBooks Server" cmd /k "cd /d %~dp0backend && npm start"
    timeout /t 3 >nul
) else (
    echo Server is already active on port 5000.
)

echo [2/2] Opening TimberBooks in your default browser...
start http://localhost:5000/

echo.
echo ===================================================
echo   TimberBooks is ready!
echo   URL: http://localhost:5000/
echo   Demo Login: owner / bhavani123  (PIN: 1234)
echo ===================================================
timeout /t 5
