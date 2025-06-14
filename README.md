# ComfyWeb v2 - Enhanced Workflow Interface

**Enhanced ComfyUI workflow management with additional features**

![ComfyWeb v2 Header](https://img.shields.io/badge/ComfyWeb-v2.0-purple?style=for-the-badge) ![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge) ![ComfyUI](https://img.shields.io/badge/ComfyUI-Compatible-green?style=for-the-badge)

## 🌟 What is ComfyWeb?

ComfyWeb transforms ComfyUI's complex node-graph system into an intuitive, form-based workflow interface. Instead of connecting nodes, users work with simple forms and templates to create AI images.

ComfyWeb v2 is an enhanced version of the original [ComfyWeb](https://github.com/jac3km4/comfyweb) by [@jac3km4](https://github.com/jac3km4), with additional features and improvements.

## 🆕 What's New in v2

### ⏹️ **Stop Generation**
- Interrupt current generation with a stop button
- Uses ComfyUI's `/interrupt` API
- Dynamic UI shows stop/generate states

### 💾 **Local Workflow Storage**
- Save workflows to browser storage
- Auto-generated names with custom descriptions
- "My Workflows" section for one-click loading
- Workflows persist across browser sessions

### 🖼️ **Enhanced Gallery**
- Real-time gallery with session persistence
- Browse ComfyUI's output directory
- Click images to reload their generating workflows
- Gallery survives browser refresh

### 📸 **Image Upload & Previews**
- Upload images with progress indicators
- Immediate visual previews for image-to-image workflows
- Professional loading states and error handling

### 🔧 **Missing Nodes Detection**
- Persistent dialog when workflows use missing custom nodes
- Shows node names and required extensions
- Clear installation guidance

### 📊 **Expanded Templates**
- 14 templates across 5 organized categories
- Text-to-Image, Image-to-Image, Upscaling, Batch, Advanced
- Includes ControlNet, Multi-LoRA, and specialized workflows

## 🚀 Quick Start

### Prerequisites
- [ComfyUI](https://github.com/comfyanonymous/ComfyUI) installed and running
- [Node.js](https://nodejs.org/) (v16+) for building

### Installation
```bash
git clone https://github.com/virtaava/comfywebv2.git
cd comfywebv2
npm install
npm run dev
```

### ComfyUI Setup
```bash
python main.py --enable-cors-header '*'
```

## 📊 Template Library

### 📸 Text to Image (3)
- **SDXL Basic** - High-quality SDXL generation
- **SD 1.5 Classic** - Classic Stable Diffusion 1.5
- **Flux GGUF** - Modern GGUF format

### 🖼️ Image to Image (3)
- **Basic Image to Image** - Standard img2img
- **SDXL Image to Image** - Higher quality with SDXL
- **SD 1.5 Image to Image** - Classic SD 1.5 img2img

### 🔍 Upscaling & Enhancement (2)
- **Upscale & Enhance** - Image enhancement
- **Latent Upscaling** - Latent space upscaling

### 📦 Batch Processing (1)
- **Batch Generation** - Multiple image generation

### ⚡ Advanced (5)
- **SDXL + LoRA** - LoRA integration
- **Multi-LoRA** - Multiple LoRA fusion
- **Inpainting** - Inpainting workflow
- **ControlNet** - ControlNet integration
- **Professional Portrait** - Portrait generation

## 📖 Usage Guide

### Basic Workflow
1. **Choose Template** - Select from 14 available templates
2. **Edit Parameters** - Fill out form fields (prompts, settings, etc.)
3. **Upload Images** - For image-to-image workflows, drag images for previews
4. **Generate** - Click generate and monitor progress
5. **Save** - Save workflows to browser for reuse

### Key Features
- **Form Interface** - No node connections needed, just fill out forms
- **Template System** - Pre-configured workflows for common tasks
- **Drag & Drop** - Import existing ComfyUI workflow JSON files
- **Real-time Monitoring** - Watch generation progress with WebSocket updates
- **Session Recovery** - Work survives browser refresh

### Working with Missing Nodes
When importing workflows with missing custom nodes:
1. ComfyWeb detects missing nodes automatically
2. Shows persistent dialog with node information
3. Lists required extensions and installation details
4. Allows skipping or getting more information

## 🛠️ Development

### Technology Stack
- **Frontend**: Svelte 4.2.18 + TypeScript 5.5.3
- **Build**: Vite 5.4.1
- **Styling**: Tailwind CSS 3.4.9 + Flowbite
- **Integration**: ComfyUI HTTP API + WebSocket

### Contributing
1. Fork the repository
2. Create a feature branch
3. Make changes with testing
4. Submit a pull request

## 📝 Version History

### v2.0.0 - Current Release
- **NEW**: Stop generation functionality
- **NEW**: Local workflow storage and save/load
- **NEW**: Enhanced gallery with output browsing
- **NEW**: Image upload with previews
- **NEW**: Missing nodes detection dialog
- **NEW**: Expanded template library (14 templates)
- **IMPROVED**: Session persistence and recovery
- **IMPROVED**: TypeScript implementation
- **IMPROVED**: Error handling and stability

## 🙏 Credits

### Original Author
**[@jac3km4](https://github.com/jac3km4)** created the original [ComfyWeb](https://github.com/jac3km4/comfyweb) that provided the foundation for these enhancements.

### Built For
[ComfyUI](https://github.com/comfyanonymous/ComfyUI) by [@comfyanonymous](https://github.com/comfyanonymous)

### v2 Development
**[@virtaava](https://github.com/virtaava)** - v2 enhancements and features

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🔗 Links

- **Original ComfyWeb**: https://github.com/jac3km4/comfyweb
- **ComfyUI**: https://github.com/comfyanonymous/ComfyUI
- **Issues**: GitHub Issues for support

---

**Built for the ComfyUI community.**
