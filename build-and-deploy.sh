#!/bin/bash
# Clean Build and Deploy Script for ComfyWeb v2

echo "🧹 Cleaning previous build..."
rm -rf dist/
rm -rf node_modules/.vite/

echo "📦 Installing dependencies..."
npm ci

echo "🔨 Building for GitHub Pages..."
npm run build:gh-pages

echo "✅ Build complete! Files ready in dist/ folder"
echo "📁 Contents of dist/:"
ls -la dist/

echo ""
echo "🚀 Ready to commit and push!"
echo "Run these commands:"
echo "  git add ."
echo "  git commit -m 'Clean build for GitHub Pages deployment'"
echo "  git push"