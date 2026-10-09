@echo off
title TimberBooks Launcher
echo ===================================================
echo   🌲 TimberBooks - Mobile GST Billing & ERP
echo   Company: Bhavani Timbers
echo ===================================================
echo.
echo [1/2] Starting TimberBooks Backend Server (Port 5000)...
start "TimberBooks Backend" cmd /k "cd /d %~dp0backend && npm start"

timeout /t 3 >nul

echo [2/2] Starting Mobile Expo App...
start "TimberBooks Mobile" cmd /k "cd /d %~dp0mobile && npx expo start"

echo.
echo ===================================================
echo   TimberBooks is now running!
echo   - Backend API: http://localhost:5000/health
echo   - Mobile App: Press 'w' in Mobile window for Web
echo                 or scan QR with Expo Go on your phone
echo ===================================================
echo.
pause
