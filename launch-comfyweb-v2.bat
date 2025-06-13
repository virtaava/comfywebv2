@echo off
title ComfyWeb v2 Launcher
echo.
echo ============================================
echo   ComfyWeb v2 - Enhanced Workflow Interface
echo ============================================
echo.

:: Check if ComfyUI path is set
if not defined COMFYUI_PATH (
    echo Please set your ComfyUI installation path:
    set /p COMFYUI_PATH="Enter full path to ComfyUI folder: "
)

:: Validate ComfyUI path
if not exist "%COMFYUI_PATH%\main.py" (
    echo ERROR: main.py not found in %COMFYUI_PATH%
    echo Please check your ComfyUI installation path.
    pause
    exit /b 1
)

echo Starting ComfyUI server...
echo Path: %COMFYUI_PATH%
echo.

:: Start ComfyUI in background with CORS enabled
cd /d "%COMFYUI_PATH%"
start /B python main.py --enable-cors-header "*" --listen 127.0.0.1 --port 8188

:: Wait for ComfyUI to start
echo Waiting for ComfyUI to initialize...
timeout /t 5 /nobreak > nul

:: Check if ComfyUI is running
echo Checking ComfyUI connection...
curl -s http://127.0.0.1:8188/api/object_info > nul 2>&1
if errorlevel 1 (
    echo WARNING: ComfyUI may not be fully started yet.
    echo If ComfyWeb v2 shows connection errors, please wait a moment.
    echo.
)

:: Navigate back to ComfyWeb v2 directory
cd /d "%~dp0"

echo Starting ComfyWeb v2...
echo Opening in your default browser...
echo.
echo ============================================
echo   ComfyWeb v2 is now running!
echo   
echo   • ComfyUI Server: http://127.0.0.1:8188
echo   • ComfyWeb v2: http://localhost:5173
echo   
echo   Press Ctrl+C to stop both services
echo ============================================
echo.

:: Start ComfyWeb v2 development server
npm run dev

:: Cleanup when script ends
echo.
echo Shutting down services...
taskkill /f /im python.exe /fi "WINDOWTITLE eq ComfyUI*" 2>nul
echo Done.
pause