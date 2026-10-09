@echo off
title TimberBooks Web Launcher
echo ===================================================
echo   🌲 TimberBooks - Web Browser Preview
echo ===================================================
echo.
echo [1/2] Starting Backend...
start "TimberBooks Backend" cmd /k "cd /d %~dp0backend && npm start"

timeout /t 3 >nul

echo [2/2] Opening Web App in Browser...
cd /d %~dp0mobile && npx expo start --web
