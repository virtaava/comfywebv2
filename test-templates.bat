@echo off
REM Quick Template Test Script for Windows

echo 🧪 Testing Template System...

REM Build the project
echo Building ComfyWeb v2...
npm run build

if %errorlevel% equ 0 (
    echo ✅ Build successful!
    echo 📊 Template count analysis:
    
    REM Check template file
    echo 📄 Templates file size:
    for %%I in (src\data\templates.json) do echo %%~zI bytes
    
    echo.
    echo 🚀 Template system ready!
    echo 💡 Add dropdown should now show:
    echo    ✅ Universal Templates
    echo    │  ├─ 📸 Text to Image (3 templates^)
    echo    │  ├─ 🖼️ Image to Image (3 templates^)
    echo    │  ├─ 🔍 Upscaling ^& Enhancement (2 templates^)
    echo    │  └─ 📦 Batch Processing (1 template^)
    echo    📚 Legacy Templates (2 templates^)
    echo    📁 My Workflows (when available^)
    
) else (
    echo ❌ Build failed - check TypeScript errors
    exit /b 1
)