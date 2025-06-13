#!/bin/bash
# Quick Template Test Script

echo "🧪 Testing Template System..."

# Build the project
echo "Building ComfyWeb v2..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    echo "📊 Template count analysis:"
    
    # Count templates in each category
    echo "Analyzing templates.json..."
    
    if command -v jq &> /dev/null; then
        echo "📸 Text to Image templates:" $(cat src/data/templates.json | jq '.categories.universal.subcategories.text_to_image.templates | length')
        echo "🖼️ Image to Image templates:" $(cat src/data/templates.json | jq '.categories.universal.subcategories.image_to_image.templates | length')
        echo "🔍 Upscaling templates:" $(cat src/data/templates.json | jq '.categories.universal.subcategories.upscaling.templates | length')
        echo "📦 Batch Processing templates:" $(cat src/data/templates.json | jq '.categories.universal.subcategories.batch_processing.templates | length')
        echo "📚 Legacy templates:" $(cat src/data/templates.json | jq '.categories.legacy.templates | length')
    else
        echo "📄 Templates file size:" $(wc -c < src/data/templates.json) "bytes"
    fi
    
    echo ""
    echo "🚀 Template system ready!"
    echo "💡 Add dropdown should now show:"
    echo "   ✅ Universal Templates"
    echo "   │  ├─ 📸 Text to Image (3 templates)"
    echo "   │  ├─ 🖼️ Image to Image (3 templates)"  
    echo "   │  ├─ 🔍 Upscaling & Enhancement (2 templates)"
    echo "   │  └─ 📦 Batch Processing (1 template)"
    echo "   📚 Legacy Templates (2 templates)"
    echo "   📁 My Workflows (when available)"
    
else
    echo "❌ Build failed - check TypeScript errors"
    exit 1
fi