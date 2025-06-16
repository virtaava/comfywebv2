# ComfyWeb v2 - Streamlined Workflow Interface

**A simplified, form-based interface for ComfyUI workflows**

![ComfyWeb v2 Header](https://img.shields.io/badge/ComfyWeb-v2.0-purple?style=for-the-badge) ![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge) ![ComfyUI](https://img.shields.io/badge/ComfyUI-Compatible-green?style=for-the-badge)

## 🌟 What is ComfyWeb v2?

ComfyWeb v2 transforms ComfyUI's complex node-graph system into an intuitive, form-based workflow interface. Instead of connecting nodes, users work with simple forms and templates to create AI images.

ComfyWeb v2 is an enhanced version of the original [ComfyWeb](https://github.com/jac3km4/comfyweb) by [@jac3km4](https://github.com/jac3km4), with additional features and improvements for streamlined AI image generation.

## 📖 **Complete User Guide**

**For detailed instructions, tutorials, and feature explanations, see the comprehensive:**

### 📚 **[ComfyWeb V2 User Manual](ComfyWebV2_User_Manual.md)**

The user manual covers:
- **Template-Card relationship** - How workflows are structured
- **14 Professional Templates** - Complete library across 5 categories  
- **Gallery System** - Session-persistent image collection
- **Image Upload & Preview** - Professional drag-drop interface
- **Workflow Import** - ComfyUI JSON workflow integration
- **Missing Node Detection** - Smart installation guidance
- **Step-by-step tutorials** - From beginner to advanced usage
- **Troubleshooting guide** - Common issues and solutions

**👆 Start there for complete usage instructions!**

---

## 🎯 What ComfyWeb v2 Is Designed For

### ✅ **Ideal Use Cases**
- **Simple workflows** with linear progression (text→image, image→image, upscaling)
- **Template-based generation** using pre-configured workflows
- **Beginner-friendly AI image creation** without node-graph complexity
- **Quick iteration** on prompts and basic parameters
- **Standard workflows** like SDXL, ControlNet, LoRA integration

### ❌ **Not Suitable For**
- **Complex conditional workflows** with multiple branching paths
- **Advanced node graphs** with conditional logic and bypassing
- **Custom workflow architectures** requiring specialized node connections
- **Production workflows** with complex automation requirements
- **Workflows using virtual nodes** or advanced ComfyUI features

### 💡 **When to Use ComfyUI Directly**
For complex workflows like multi-path conditional generation, advanced automation, or workflows with sophisticated logic, use ComfyUI's native interface. ComfyWeb v2 focuses on making simple workflows accessible, not replacing ComfyUI's full capabilities.

## 🆕 Enhanced Features in v2

### ⏹️ **Generation Control**
- Stop generation mid-process with interrupt functionality
- Dynamic UI showing current generation state

### 💾 **Workflow Management**
- Save workflows to browser storage with custom names
- \"My Workflows\" section for quick access to saved workflows
- Workflow persistence across browser sessions

### 🖼️ **Enhanced Gallery**
- Session-persistent gallery with automatic image collection
- Track and view images generated through ComfyWeb interface
- Click images to view their generation parameters

### 📸 **Image Handling**
- Drag-and-drop image upload with instant previews
- Professional loading states and progress indicators
- Seamless integration with image-to-image workflows

### 🔧 **Smart Node Detection**
- Automatic detection of missing custom nodes in imported workflows
- Clear information about required extensions
- Guidance for node installation

### 📊 **Template Library**
- 14 curated templates across 5 categories
- Optimized for common use cases and quality results
- Progressive difficulty from beginner to advanced

## 🚀 Quick Start

### Prerequisites

You need both ComfyUI and Node.js installed:

#### ComfyUI Installation
**Windows:**
```cmd
git clone https://github.com/comfyanonymous/ComfyUI.git
cd ComfyUI
python -m venv venv
venv\\Scripts\\activate
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
pip install -r requirements.txt
```

**Linux/Mac:**
```bash
git clone https://github.com/comfyanonymous/ComfyUI.git
cd ComfyUI
python3 -m venv venv
source venv/bin/activate
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
pip install -r requirements.txt
```

#### Node.js Installation
Download and install [Node.js](https://nodejs.org/) (v16 or higher)

### Installation

```bash
# Clone ComfyWeb v2
git clone https://github.com/virtaava/comfywebv2.git
cd comfywebv2

# Install dependencies
npm install

# Start development server
npm run dev
```

### Running the Application

#### Start ComfyUI (Terminal 1)
```bash
cd /path/to/ComfyUI
source venv/bin/activate  # Linux/Mac
# OR
venv\\Scripts\\activate   # Windows

python main.py --enable-cors-header '*'
```

#### Start ComfyWeb v2 (Terminal 2)
```bash
cd /path/to/comfywebv2
npm run dev
```

### Access
- **ComfyUI**: http://localhost:8188
- **ComfyWeb v2**: http://localhost:5173

## 📊 Template Categories

### 📸 **Text to Image** (3 templates)
- SDXL Basic - High-quality text-to-image generation
- SD 1.5 Classic - Standard Stable Diffusion
- Flux GGUF - Modern model format

### 🖼️ **Image to Image** (3 templates)
- Basic Image to Image - Standard img2img workflow
- SDXL Image to Image - Higher quality processing
- SD 1.5 Image to Image - Classic model approach

### 🔍 **Upscaling & Enhancement** (2 templates)
- Upscale & Enhance - Image quality improvement
- Latent Upscaling - Advanced upscaling technique

### 📦 **Batch Processing** (1 template)
- Batch Generation - Multiple image creation

### ⚡ **Advanced** (5 templates)
- SDXL + LoRA - LoRA fine-tuning integration
- Multi-LoRA - Multiple LoRA combination
- Inpainting - Selective image editing
- ControlNet - Guided generation with control inputs
- Professional Portrait - Optimized portrait generation

## 📖 Quick Usage Guide

### Basic Workflow
1. **Select Template** - Choose from organized template categories
2. **Configure Parameters** - Fill out form fields with your settings
3. **Upload Images** - Drag images for preview (image-to-image workflows)
4. **Generate** - Start the generation process
5. **Save Workflow** - Save configurations for future use

### Advanced Features
- **Import Workflows** - Drag ComfyUI workflow JSON files for conversion
- **Session Recovery** - Work persists through browser refresh
- **Gallery Management** - Browse and organize generated images
- **Real-time Updates** - Monitor generation progress

### Handling Complex Workflows
When importing workflows that exceed ComfyWeb v2's capabilities:
- **Missing Node Dialog** - Shows required extensions and installation info
- **Complexity Warning** - Indicates workflows better suited for ComfyUI
- **Simplification Suggestions** - Guidance for workflow adaptation

**📚 For complete instructions, see the [User Manual](ComfyWebV2_User_Manual.md)**

## 🛠️ Technical Details

### Technology Stack
- **Framework**: Svelte 4.2.18 with TypeScript 5.5.3
- **Build Tool**: Vite 5.4.1 with single-file output
- **Styling**: Tailwind CSS 3.4.9 + Flowbite components
- **Integration**: ComfyUI HTTP API + WebSocket connectivity

### Architecture
- Form-based UI layer over ComfyUI's node system
- Workflow-to-form transformation engine
- Template library with predefined configurations
- Session management and local storage integration

## 🔧 Development

### Building
```bash
npm run build
```

### Development Server
```bash
npm run dev
```

### Contributing
1. Fork the repository
2. Create a feature branch
3. Test changes thoroughly
4. Submit a pull request with clear description

## 📝 Version History

### v2.0.0 - Current Release
- Generation control with stop functionality
- Local workflow storage and management
- Enhanced gallery with session persistence
- Image upload with visual previews
- Smart missing node detection
- Expanded template library
- Improved error handling and stability
- TypeScript implementation

## 🙏 Credits

### Original Framework
**[@jac3km4](https://github.com/jac3km4)** - Creator of the original [ComfyWeb](https://github.com/jac3km4/comfyweb)

### ComfyUI Integration
**[@comfyanonymous](https://github.com/comfyanonymous)** - [ComfyUI](https://github.com/comfyanonymous/ComfyUI) platform

### v2 Development
**[@virtaava](https://github.com/virtaava)** - Enhanced features and improvements

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🔗 Resources

- **📚 [Complete User Manual](ComfyWebV2_User_Manual.md)** - Detailed usage guide
- **Original ComfyWeb**: https://github.com/jac3km4/comfyweb
- **ComfyUI**: https://github.com/comfyanonymous/ComfyUI
- **Support**: GitHub Issues

---

**Focused on simplicity. Built for accessibility. Designed for results.**
