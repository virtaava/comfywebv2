# ComfyWeb v2 - Enhanced Workflow Interface

**Enhanced ComfyUI workflow management with additional features**

![ComfyWeb v2 Header](https://img.shields.io/badge/ComfyWeb-v2.0-purple?style=for-the-badge) ![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge) ![ComfyUI](https://img.shields.io/badge/ComfyUI-Compatible-green?style=for-the-badge)

## 🌟 Overview

ComfyWeb v2 is an enhanced version of the original [ComfyWeb](https://github.com/jac3km4/comfyweb) by [@jac3km4](https://github.com/jac3km4), transforming ComfyUI's complex node-graph system into an intuitive, form-based workflow interface with additional features.

## ✅ **Current Features**

### 🛠️ **Core Workflow Management**
- ✅ **Template System**: 14 templates across 5 organized categories
- ✅ **Drag & Drop Import**: Import ComfyUI workflow JSON files
- ✅ **Form-Based Editor**: Parameter editing with real-time validation
- ✅ **Step Reordering**: Drag-and-drop workflow step organization
- ✅ **Real-Time Generation**: Live progress monitoring with WebSocket integration

### 💾 **Storage & Persistence**
- ✅ **Local Workflow Storage**: Save workflows to browser with auto-generated names
- ✅ **Save Dialog**: Custom descriptions and metadata
- ✅ **My Workflows Section**: One-click loading of saved workflows
- ✅ **Session Recovery**: Workflow and gallery state survives browser refresh
- ✅ **ComfyUI Compatibility**: Standard format workflows work everywhere

### 🖼️ **Gallery System**
- ✅ **Real-Time Gallery**: Live updates during generation with session persistence
- ✅ **Output Folder Browser**: Browse ComfyUI's output directory via gallery tab
- ✅ **Workflow Reloading**: Click gallery images to reload their generating workflows
- ✅ **Image Management**: Image organization and access

### 📸 **Image Handling**
- ✅ **Image Upload**: Complete file upload system with progress indicators
- ✅ **Image Previews**: Visual confirmation for image-to-image workflows
- ✅ **Template Images**: Integration with pre-configured examples
- ✅ **Loading States**: Upload feedback and error handling

### ⏹️ **Generation Control**
- ✅ **Stop Generation**: Interrupt current generation via ComfyUI `/interrupt` API
- ✅ **Dynamic UI**: Context-aware button states during generation
- ✅ **State Management**: Generation status tracking and reset
- ✅ **User Feedback**: Success/error notifications

### 🔧 **Error Handling**
- ✅ **Missing Nodes Detection**: Dialog showing missing custom nodes
- ✅ **Installation Information**: Node information with extension names
- ✅ **Debugging**: Console logging and validation
- ✅ **Type Safety**: Full TypeScript implementation with error boundaries
- ✅ **Error Messages**: Clear error messages with recovery options

### 🎨 **UI/UX**
- ✅ **Dark Theme**: Consistent design system throughout
- ✅ **Loading Indicators**: Visual feedback for user actions
- ✅ **Responsive Design**: Works across different screen sizes
- ✅ **Navigation**: Clear organization and intuitive navigation

## 📊 **Template Library** (14 Templates)

### 📸 **Text to Image** (3 templates)
- **SDXL Basic**: SDXL generation with optimized settings
- **SD 1.5 Classic**: Classic Stable Diffusion 1.5 for compatibility
- **Flux GGUF**: GGUF format with Flux integration

### 🖼️ **Image to Image** (3 templates)  
- **Basic Image to Image**: Standard img2img workflow
- **SDXL Image to Image**: Using SDXL model
- **SD 1.5 Image to Image**: Classic SD 1.5 img2img workflow

### 🔍 **Upscaling & Enhancement** (2 templates)
- **Upscale & Enhance**: Image enhancement workflow
- **Latent Upscaling**: Latent space upscaling

### 📦 **Batch Processing** (1 template)
- **Batch Generation**: Multiple image generation

### ⚡ **Advanced** (5 templates)
- **SDXL + LoRA**: LoRA integration
- **Multi-LoRA**: Multi-LoRA fusion
- **Inpainting**: Inpainting workflow
- **ControlNet**: ControlNet integration
- **Professional Portrait**: Portrait generation

## 🚀 **Quick Start**

### Prerequisites
- **[ComfyUI](https://github.com/comfyanonymous/ComfyUI)** installed and running
- **[Node.js](https://nodejs.org/)** (v16 or higher) for building

### Installation

```bash
# Clone the repository
git clone https://github.com/virtaava/comfywebv2.git
cd comfywebv2

# Install dependencies
npm install

# Development mode
npm run dev

# Production build
npm run build
```

### ComfyUI Setup
Start ComfyUI with CORS enabled:
```bash
python main.py --enable-cors-header '*'
```

### Launch Scripts

**Windows**: `launch-comfyweb-v2.bat`
```batch
@echo off
echo Starting ComfyUI with CORS...
start /B python "C:\ComfyUI\main.py" --enable-cors-header '*'
timeout /t 5
echo Starting ComfyWeb v2...
cd /d "C:\comfywebv2"
npm run dev
```

**Linux/Mac**: `launch-comfyweb-v2.sh`
```bash
#!/bin/bash
echo "Starting ComfyUI with CORS..."
python3 /path/to/comfyui/main.py --enable-cors-header '*' &
sleep 5
echo "Starting ComfyWeb v2..."
cd /path/to/comfywebv2
npm run dev
```

## 📖 **Usage Guide**

### Getting Started
1. **Choose Template**: Browse 14 templates organized by category
2. **Customize Parameters**: Use forms with real-time validation
3. **Upload Images**: Drag images for previews (image-to-image workflows)
4. **Generate**: Click "Generate" with live progress monitoring
5. **Save Workflow**: Store in browser with auto-generated names

### Features
- **Import Workflows**: Drag ComfyUI JSON files to import existing workflows
- **Gallery Management**: Real-time gallery with session persistence
- **Stop Generation**: Interrupt processing with stop button
- **Browse Outputs**: Access ComfyUI output folder via gallery tab
- **Session Recovery**: State survives browser refresh

### Working with Missing Nodes
When importing workflows that use custom nodes not installed:
1. **Detection**: ComfyWeb v2 identifies missing custom nodes
2. **Dialog**: Shows information until manually dismissed
3. **Installation Guide**: Node names and extension information
4. **User Control**: Skip installation or get missing node info

## 🛠️ **Development & Contribution**

### Technology Stack
- **Frontend**: Svelte 4.2.18 + TypeScript 5.5.3
- **Build**: Vite 5.4.1 with single-file output
- **Styling**: Tailwind CSS 3.4.9 + Flowbite components
- **State**: Reactive Svelte stores with TypeScript
- **Integration**: ComfyUI HTTP API + WebSocket

### Contributing
Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes with testing
4. Submit a pull request

## 📝 **Version History**

### v2.0.0 - **Current Release**
- **NEW**: Stop generation functionality with ComfyUI interrupt API
- **NEW**: Gallery tab with output folder browsing
- **NEW**: Browser workflow storage with save/load system  
- **NEW**: Image upload system with previews
- **NEW**: Template library (14 templates across 5 categories)
- **NEW**: Missing nodes detection with dialog
- **NEW**: Consistent dark theme
- **IMPROVED**: Session persistence and recovery
- **IMPROVED**: TypeScript implementation with error handling
- **IMPROVED**: Performance and stability

## 🙏 **Credits & Acknowledgments**

### Original Foundation
**Huge appreciation to [@jac3km4](https://github.com/jac3km4)** for creating the original [ComfyWeb](https://github.com/jac3km4/comfyweb)! This project provided the excellent foundation that made our enhancements possible.

### ComfyUI Integration
Built for [ComfyUI](https://github.com/comfyanonymous/ComfyUI) by [@comfyanonymous](https://github.com/comfyanonymous).

### Enhanced Development
- **[@virtaava](https://github.com/virtaava)**: v2 enhancements and feature development
- **Community contributions welcome!**

## 📄 **License**

MIT License - see [LICENSE](LICENSE) file for details.

## 🔗 **Links**

- **Original ComfyWeb**: https://github.com/jac3km4/comfyweb
- **ComfyUI**: https://github.com/comfyanonymous/ComfyUI
- **Issues & Support**: GitHub Issues for bug reports and feature requests

---

**Built for the ComfyUI community.**
