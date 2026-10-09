@echo off
title TimberBooks Mobile Tunnel (Expo Go)
echo ===================================================
echo   🌲 TimberBooks - Phone Expo Go Tunnel Mode
echo   Company: Bhavani Timbers
echo ===================================================
echo.
echo [1/2] Checking Backend Server...
netstat -ano | findstr :5000 >nul 2>&1
if %errorlevel% neq 0 (
    echo Starting backend server on port 5000...
    start "TimberBooks Backend" cmd /k "cd /d %~dp0backend && npm start"
    timeout /t 3 >nul
) else (
    echo Backend server is running.
)

echo.
echo [2/2] Launching Expo Tunnel for your physical phone...
echo Scan the generated QR code using the Expo Go app on your Android or iPhone!
cd /d %~dp0mobile && npx expo start --tunnel
pause
