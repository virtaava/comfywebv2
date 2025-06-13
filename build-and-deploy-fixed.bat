@echo off
REM Clean Build and Deploy Script for ComfyWeb v2 - Fixed Version

echo 🧹 Cleaning previous build and dependencies...
if exist dist rmdir /s /q dist
if exist node_modules\.vite rmdir /s /q node_modules\.vite

echo 🔄 Fixing package-lock.json sync issue...
if exist package-lock.json del package-lock.json

echo 📦 Installing dependencies (fresh)...
npm install

echo 🔨 Building for GitHub Pages...
npm run build:gh-pages

if exist dist (
    echo ✅ Build complete! Files ready in dist/ folder
    echo 📁 Contents of dist/:
    dir dist
    echo.
    echo 🚀 Ready to commit and push!
    echo Run these commands:
    echo   git add .
    echo   git commit -m "Clean build for GitHub Pages deployment"
    echo   git push
) else (
    echo ❌ Build failed - dist folder not created
    echo Check the build output above for errors
)