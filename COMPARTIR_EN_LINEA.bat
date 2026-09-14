@echo off
title Enlace Publico en Linea (Cloudflare) - Cartelera Geronimo El Rey
cd /d "%~dp0"

echo =========================================================================
echo       GENERADOR DE ENLACE PUBLICO EN LINEA (CLOUDFLARE)
echo                 AGENCIA GERONIMO EL REY
echo =========================================================================
echo.
echo Conectando con la red global de Cloudflare...
echo Podras ver la cartelera en cualquier PC, Smart TV o celular por internet.
echo.
echo Busca abajo donde dice:
echo "Your quick Tunnel has been created! Visit it at: https://...trycloudflare.com"
echo.
echo =========================================================================
echo.

cloudflared.exe tunnel --url http://localhost:3000

echo.
pause
