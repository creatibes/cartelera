@echo off
setlocal enabledelayedexpansion
title Cartelera Digital de Loterias - Agencia Geronimo El Rey
cd /d "%~dp0"

echo =========================================================================
echo       CARTELERA DIGITAL DE RESULTADOS DE LOTERIAS Y ANIMALITOS
echo                 AGENCIA GERONIMO EL REY
echo =========================================================================
echo.

:: 1. Verificar si Node.js esta instalado en esta computadora o en rutas estandar
set "NODE_EXE="
where node >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    set "NODE_EXE=node"
) else if exist "%ProgramFiles%\nodejs\node.exe" (
    set "NODE_EXE=%ProgramFiles%\nodejs\node.exe"
    set "PATH=%ProgramFiles%\nodejs;%PATH%"
) else if exist "%ProgramFiles(x86)%\nodejs\node.exe" (
    set "NODE_EXE=%ProgramFiles(x86)%\nodejs\node.exe"
    set "PATH=%ProgramFiles(x86)%\nodejs;%PATH%"
) else if exist "%LocalAppData%\Programs\node\node.exe" (
    set "NODE_EXE=%LocalAppData%\Programs\node\node.exe"
    set "PATH=%LocalAppData%\Programs\node;%PATH%"
)

if "!NODE_EXE!"=="" (
    echo [!] ATENCION: Node.js no esta instalado en esta computadora.
    echo.
    echo Para que la cartelera funcione en esta PC, recolecte resultados
    echo automaticamente por internet y actualice la tasa del BCV,
    echo se requiere tener instalado Node.js (es gratuito, ligero y seguro).
    echo.
    echo -------------------------------------------------------------------------
    echo INSTRUCCIONES RAPIDAS DE INSTALACION (Solo 1 minuto):
    echo  1. Se abrira el sitio web oficial: https://nodejs.org
    echo  2. Haz clic en el boton verde "LTS" (Recomendado para la mayoria).
    echo  3. Ejecuta el archivo descargado e instalalo (Siguiente ^> Siguiente ^> Finalizar).
    echo  4. Vuelve a hacer doble clic en este archivo "INICIAR_CARTELERA.bat".
    echo -------------------------------------------------------------------------
    echo.
    set /p RESP="Deseas abrir la pagina oficial de descarga ahora mismo? (S/N): "
    if /i "!RESP!"=="S" (
        start "" "https://nodejs.org/"
    )
    echo.
    echo NOTA: Si esta PC esta conectada en red con la PC principal donde ya
    echo funciona la cartelera, no necesitas instalar nada ni copiar archivos.
    echo Solo abre el navegador en esta PC e ingresa la direccion de la PC principal.
    echo.
    pause
    exit /b 1
)

:: 2. Si Node.js esta instalado, obtener IP local para dispositivos en red
set LOCAL_IP=localhost
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
    for /f "tokens=1" %%b in ("%%a") do (
        set LOCAL_IP=%%b
        goto :ip_found
    )
)
:ip_found

echo [OK] Node.js detectado correctamente: !NODE_EXE!
echo [OK] Iniciando servidor y buscador automatico en segundo plano...
echo.

:: 3. Iniciar el servidor Node.js en una ventana visible/minimizada pero con /k para retener errores
start "Servidor Cartelera (Geronimo El Rey)" cmd /k ""!NODE_EXE!" server.js"

:: 4. Esperar a que el servidor inicialice
timeout /t 2 >nul

:: 5. Abrir la cartelera en el navegador predeterminado
start "" "http://localhost:3000"

echo =========================================================================
echo  [LISTO] Cartelera abierta en el navegador: http://localhost:3000
echo.
echo  PANTALLA COMPLETA: Presiona la tecla F11 en tu navegador.
echo.
echo  CONECTAR OTRAS PANTALLAS, TELEVISORES O COMPUTADORAS (MISMA RED WIFI):
echo  Abre el navegador en cualquier otro dispositivo e ingresa:
echo  http://%LOCAL_IP%:3000
echo =========================================================================
echo.
echo Deja esta ventana abierta o minimizada mientras uses la cartelera.
echo Para cerrarla, simplemente cierra esta ventana y la del servidor.
echo.
pause
