@echo off
setlocal
cd /d "%~dp0"
where python >nul 2>nul
if not errorlevel 1 (
    python -X utf8 "%~dp0start_game.py" %*
    if errorlevel 1 (
        pause
        exit /b 1
    )
    exit /b 0
)
where py >nul 2>nul
if not errorlevel 1 (
    py -3 -X utf8 "%~dp0start_game.py" %*
    if errorlevel 1 (
        pause
        exit /b 1
    )
    exit /b 0
)
echo Python 3 is required. Install Python, then run start_game.bat again.
pause
exit /b 1
