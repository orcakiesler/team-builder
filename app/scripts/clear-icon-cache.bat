@echo off
REM Clear Windows icon cache so Explorer shows the correct (purple) icon for Relay Team Builder.
echo Closing Explorer...
taskkill /f /im explorer.exe 2>nul
timeout /t 2 /nobreak >nul

echo Clearing icon cache...
if exist "%LOCALAPPDATA%\IconCache.db" del /f /q "%LOCALAPPDATA%\IconCache.db"
if exist "%LOCALAPPDATA%\Microsoft\Windows\Explorer\iconcache*.db" del /f /q "%LOCALAPPDATA%\Microsoft\Windows\Explorer\iconcache*.db"
if exist "%LOCALAPPDATA%\Microsoft\Windows\Explorer\thumbcache*.db" del /f /q "%LOCALAPPDATA%\Microsoft\Windows\Explorer\thumbcache*.db"

echo Restarting Explorer...
start explorer.exe
echo Done. Open the dist folder again - the large preview should now show the purple icon.
pause
