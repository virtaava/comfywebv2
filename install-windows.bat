@echo off
REM ComfyWeb v2 - Complete Installation Script for Windows
REM This script installs ComfyUI, ComfyWeb v2, and all dependencies

echo ===============================================
echo    ComfyWeb v2 - Complete Installation
echo ===============================================
echo.

REM Create installation directory
if not exist "ComfyWebSetup" mkdir ComfyWebSetup
cd ComfyWebSetup

echo [1/5] Checking Prerequisites...

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.8+ from https://python.org
    echo Make sure to check "Add Python to PATH" during installation
    pause
    exit /b 1
)

REM Check if Git is installed
git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Git is not installed or not in PATH
    echo Please install Git from https://git-scm.com
    pause
    exit /b 1
)

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js 18+ from https://nodejs.org
    pause
    exit /b 1
)

echo ✓ Python, Git, and Node.js are available

echo.
echo [2/5] Installing ComfyUI...
if not exist "ComfyUI" (
    git clone https://github.com/comfyanonymous/ComfyUI.git
    cd ComfyUI
    pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
    pip install -r requirements.txt
    cd ..
) else (
    echo ✓ ComfyUI already exists, skipping installation
)

echo.
echo [3/5] Installing ComfyUI Manager (recommended)...
cd ComfyUI\custom_nodes
if not exist "ComfyUI-Manager" (
    git clone https://github.com/ltdrdata/ComfyUI-Manager.git
) else (
    echo ✓ ComfyUI-Manager already exists
)
cd ..\..

echo.
echo [4/5] Installing ComfyWeb v2...
if not exist "comfywebv2" (
    git clone https://github.com/virtaava/comfywebv2.git
    cd comfywebv2
    npm install
    npm run build
    cd ..
) else (
    echo ✓ ComfyWeb v2 already exists, updating...
    cd comfywebv2
    git pull
    npm install
    npm run build
    cd ..
)

echo.
echo [5/5] Creating launch scripts...

REM Create ComfyUI launch script
echo @echo off > launch-comfyui.bat
echo echo Starting ComfyUI server with CORS enabled... >> launch-comfyui.bat
echo cd ComfyUI >> launch-comfyui.bat
echo python main.py --enable-cors-header "*" >> launch-comfyui.bat
echo pause >> launch-comfyui.bat

REM Create ComfyWeb v2 launch script
echo @echo off > launch-comfyweb.bat
echo echo Opening ComfyWeb v2... >> launch-comfyweb.bat
echo echo. >> launch-comfyweb.bat
echo echo Make sure ComfyUI is running first! >> launch-comfyweb.bat
echo echo If ComfyUI is not running, use launch-comfyui.bat >> launch-comfyweb.bat
echo echo. >> launch-comfyweb.bat
echo start comfywebv2\dist\index.html >> launch-comfyweb.bat

REM Create combined launch script
echo @echo off > launch-both.bat
echo echo Starting ComfyUI and ComfyWeb v2... >> launch-both.bat
echo echo. >> launch-both.bat
echo start "ComfyUI Server" launch-comfyui.bat >> launch-both.bat
echo echo Waiting 10 seconds for ComfyUI to start... >> launch-both.bat
echo timeout /t 10 /nobreak ^>nul >> launch-both.bat
echo start "ComfyWeb v2" launch-comfyweb.bat >> launch-both.bat

echo.
echo ===============================================
echo    Installation Complete!
echo ===============================================
echo.
echo Quick Start Options:
echo.
echo 1. launch-both.bat       - Start both ComfyUI and ComfyWeb v2
echo 2. launch-comfyui.bat    - Start only ComfyUI server
echo 3. launch-comfyweb.bat   - Start only ComfyWeb v2 (requires ComfyUI running)
echo.
echo Installation Directory: %cd%
echo ComfyUI: %cd%\ComfyUI
echo ComfyWeb v2: %cd%\comfywebv2\dist\index.html
echo.
echo For first use, run: launch-both.bat
echo.
pause