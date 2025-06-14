# ComfyWeb v2 - Enhanced Workflow Interface

**Professional ComfyUI workflow management with advanced features, bug fixes, and intuitive interface.**

![ComfyWeb v2 Header](https://img.shields.io/badge/ComfyWeb-v2.0-purple?style=for-the-badge) ![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge) ![ComfyUI](https://img.shields.io/badge/ComfyUI-Compatible-green?style=for-the-badge)

## 🌟 Overview

ComfyWeb v2 is an enhanced version of the original [ComfyWeb](https://github.com/jac3km4/comfyweb) by [@jac3km4](https://github.com/jac3km4), transforming ComfyUI's complex node-graph system into an intuitive, form-based workflow interface with professional-grade features.

### ✨ What Makes v2 Special

- **🐛 Critical Bug Fixes**: Resolves workflow import crashes present in the original
- **🎨 Professional UI**: Beautiful branding with enhanced user experience  
- **💾 Browser Workflow Storage**: Save/load workflows with browser persistence
- **🖼️ Session Gallery**: Real-time generated image gallery with workflow reloading
- **📁 ComfyUI Compatibility**: Standard format workflows that work everywhere
- **⚡ Enhanced Performance**: Improved error handling and validation

## 🚀 Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) (v16 or higher)
- [ComfyUI](https://github.com/comfyanonymous/ComfyUI) installed and running

### Installation

#### Build from Source (Currently Available)
```bash
# Clone repository
git clone https://github.com/virtaava/comfywebv2.git
cd comfywebv2

# Install dependencies
npm install

# Development mode
npm run dev

# Build for production
npm run build
```

**Note**: NPM package and binary releases planned for future versions.

### ComfyUI Setup
ComfyUI must be running with CORS enabled:
```bash
# Start ComfyUI with CORS support
python main.py --enable-cors-header '*'
```

### Example Launch Script
Create your own launch script to automatically start ComfyUI and ComfyWeb v2:

**Windows Example**: `launch-comfyweb-v2.bat`
```batch
@echo off
echo Starting ComfyUI...
start /B python "path\to\comfyui\main.py" --enable-cors-header '*'
timeout /t 3
echo Starting ComfyWeb v2...
npm run dev
```

**Linux/Mac Example**: `launch-comfyweb-v2.sh`
```bash
#!/bin/bash
echo "Starting ComfyUI..."
python3 /path/to/comfyui/main.py --enable-cors-header '*' &
sleep 3
echo "Starting ComfyWeb v2..."
npm run dev
```

## ✅ Current Features (Working)

### 🛠️ Core Functionality
- **✅ Workflow Creation**: Form-based workflow editor with drag-and-drop step reordering
- **✅ Template System**: 11 professional templates (Text-to-Image, Image-to-Image, Upscaling, etc.)
- **✅ Drag & Drop Import**: ComfyUI workflow JSON file import fully functional
- **✅ Real-time Generation**: Live progress monitoring with WebSocket integration
- **✅ Professional UI**: Dark theme, consistent styling, loading indicators

### 🖼️ Gallery & Image Management
- **✅ Session Gallery**: Real-time gallery of generated images with perfect functionality
- **✅ Workflow Reloading**: Click gallery images to reload their generating workflows
- **✅ Image Previews**: Professional image upload with immediate visual feedback for image-to-image workflows
- **✅ Session Persistence**: Gallery images survive browser refresh/restart
- **✅ Progress Tracking**: Real-time generation status with visual indicators

### 💾 Workflow Management
- **✅ Browser Storage**: Save workflows to browser localStorage with persistence
- **✅ Save Dialog**: Professional save dialog with auto-generated names and descriptions
- **✅ Load Workflows**: "My Workflows" section in Add dropdown for saved workflows
- **✅ Workflow Export**: Download workflows as ComfyUI-compatible JSON files
- **✅ Session Recovery**: Workflow state survives browser refresh

### 🔧 Error Handling & Debugging
- **✅ Enhanced Error Handling**: Comprehensive debugging and validation with clear error messages
- **✅ Missing Nodes Dialog**: Persistent dialog showing missing custom nodes with installation options (replaces auto-dismissing error toasts)
- **✅ Type Safety**: Full TypeScript implementation with proper error boundaries
- **✅ File Upload System**: Complete image upload to ComfyUI server with progress indicators

### 🎯 Fixed Critical Bugs
- **✅ Workflow Import Crashes**: Fixed `TypeError: nodes is not iterable` that breaks official v0.0.4
- **✅ Image Preview Issues**: Fixed image URL construction and upload functionality
- **✅ Template System**: All 11 templates working properly
- **✅ Type Safety**: Resolved TypeScript crashes from missing node types

## ⚠️ Features In Development

### 🔄 Planned Enhancements
- **📁 Output Folder Browsing**: Browse ComfyUI's output directory (requires additional setup due to browser security limitations)
- **⚡ Pipeline Integration**: Gallery action icons for using images as inputs to next workflow stages
- **🛑 Generation Control**: Stop/interrupt functionality via ComfyUI interrupt API
- **📂 Workflow File Import**: Import saved ComfyWeb workflow files (currently only ComfyUI drag & drop works)
- **🔌 Missing Node Installation**: Automatic node installation system (detection works, requires backend integration)

### 🎯 Future Roadmap
- **Advanced Pipeline**: Multi-stage workflow automation (Text→Image→Video→Enhancement)
- **Batch Processing**: Multiple workflow execution management
- **Mobile Optimization**: Enhanced responsive design
- **Performance**: Bundle size reduction and loading optimizations

## 📖 Usage Guide

### Creating Workflows
1. **Start Simple**: Click "Add" → choose from 11 professional templates
2. **Customize**: Edit parameters in intuitive form interface with real-time validation
3. **Generate**: Click "Generate" to create your image with live progress monitoring
4. **Save**: Click "Save workflow" to store in browser with auto-generated names

### Gallery & Image Management
- **View Images**: Real-time gallery shows all generated images from current session
- **Reload Workflows**: Click any gallery image to reload its generating workflow
- **Session Persistence**: Images and workflows survive browser refresh
- **Upload Images**: Drag images to image-to-image templates for immediate previews

### Advanced Features
- **Drag & Drop**: Drop ComfyUI workflow JSON files to import (fixed critical bug from original)
- **Browser Storage**: Workflows saved in browser appear in "My Workflows" section
- **Error Debugging**: Comprehensive debugging with clear error messages and console logging

### Working with Missing Nodes
When importing workflows that use custom nodes not installed in your ComfyUI:
1. **Error Detection**: ComfyWeb v2 will identify which nodes are missing
2. **⚠️ Current Limitation**: Error messages auto-close after 5 seconds, making it hard to copy node names
3. **Manual Installation**: Use ComfyUI Manager to install the required custom nodes  
4. **Retry Import**: After installation, import the workflow again

**Improvement Planned**: Error messages will stay open until manually dismissed, with copy functionality for node names.

## 🛠️ Development

### Tech Stack
- **Frontend**: Svelte 4.2.18 + TypeScript 5.5.3
- **Build**: Vite 5.4.1 with single-file output
- **Styling**: Tailwind CSS 3.4.9 + Flowbite components
- **State**: Reactive stores with TypeScript
- **Integration**: ComfyUI HTTP API + WebSocket

### Contributing
We welcome contributions! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes with proper testing
4. Submit a pull request

## 📝 Version History

### v2.0.0 (Current - Production Ready)
- **🐛 CRITICAL**: Fixed workflow import crashes that break official v0.0.4
- **🖼️ NEW**: Professional session gallery with real-time updates
- **💾 NEW**: Browser workflow storage with save/load functionality
- **🎨 NEW**: Professional UI with ComfyWeb v2 branding
- **📸 NEW**: Professional image upload system with previews
- **🔧 NEW**: Enhanced missing node error detection (improvement planned for UX)
- **⚡ IMPROVED**: Enhanced error handling and comprehensive validation
- **🛠️ IMPROVED**: Full TypeScript implementation with type safety
- **📱 IMPROVED**: Session persistence and recovery system

### Known Issues in Original v0.0.4
- ❌ Critical workflow import crashes with `TypeError: nodes is not iterable`
- ❌ No workflow persistence (lost on browser refresh)
- ❌ Basic gallery without session management
- ❌ Limited error handling and debugging
- ❌ Poor missing node error messages

## 🙏 Credits & Acknowledgments

### Original Author
**Huge thanks to [@jac3km4](https://github.com/jac3km4)** for creating the original [ComfyWeb](https://github.com/jac3km4/comfyweb)! This project provided the foundation and inspiration for all our enhancements.

### ComfyUI Integration
Built for the amazing [ComfyUI](https://github.com/comfyanonymous/ComfyUI) by [@comfyanonymous](https://github.com/comfyanonymous).

### Enhanced by
- **[@virtaava](https://github.com/virtaava)**: Complete v2 enhancement, bug fixes, and feature development
- **Community contributions welcome!**

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

Built with ❤️ for the ComfyUI community.

## 🔗 Links

- **Original ComfyWeb**: https://github.com/jac3km4/comfyweb
- **ComfyUI**: https://github.com/comfyanonymous/ComfyUI
- **Development Repository**: Available upon public release

---

**ComfyWeb v2: Your professional ComfyUI workflow interface - stable, enhanced, and ready for serious AI image generation! 🚀**