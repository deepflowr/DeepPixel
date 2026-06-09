@echo off
title DeepPixel - Iniciando...

setlocal enabledelayedexpansion

cd /d "%~dp0"

echo ========================================
echo   DeepPixel - Inicio completo
echo ========================================
echo.

echo [1/4] Buscando proceso en puerto 3001...
set "FOUND_PID="
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3001" ^| findstr "LISTENING"') do (
  set "FOUND_PID=%%a"
  taskkill /F /PID %%a >nul 2>&1
)
if defined FOUND_PID (
  echo [OK] Proceso anterior cerrado.
) else (
  echo [!] No habia proceso en puerto 3001.
)
timeout /t 1 /nobreak >nul

echo [2/4] Iniciando servidor WebSocket (puerto 3001)...
start "DeepPixel WS" cmd /c "node server.js"
timeout /t 2 /nobreak >nul

echo [3/4] Iniciando Vite dev server...
echo.
echo [4/4] Cuando Vite muestre el puerto, abri http://localhost:PUERTO/DeepPixel/
echo.
echo ========================================
echo   DeepPixel corriendo:
echo   - WebSocket: puerto 3001 (ventana separada)
echo   - App:       Vite mostrara el puerto abajo
echo.
echo   IMPORTANTE: Cerra las DOS ventanas al terminar.
echo ========================================
echo.
npx vite --host

echo.
echo [OK] Vite se detuvo. Cerrando WebSocket...
taskkill /F /FI "WINDOWTITLE eq DeepPixel WS" >nul 2>&1
echo [OK] Todo cerrado.
timeout /t 2 /nobreak >nul
