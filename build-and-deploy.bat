@echo off
REM Clean Build and Deploy Script for ComfyWeb v2

echo 🧹 Cleaning previous build...
if exist dist rmdir /s /q dist
if exist node_modules\.vite rmdir /s /q node_modules\.vite

echo 📦 Installing dependencies...
npm ci

echo 🔨 Building for GitHub Pages...
npm run build:gh-pages

echo ✅ Build complete! Files ready in dist/ folder
echo 📁 Contents of dist/:
dir dist

echo.
echo 🚀 Ready to commit and push!
echo Run these commands:
echo   git add .
echo   git commit -m "Clean build for GitHub Pages deployment"
echo   git push