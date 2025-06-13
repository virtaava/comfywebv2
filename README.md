# ComfyWeb v2 - Enhanced Workflow Interface

ComfyWeb v2 is a powerful, user-friendly interface for ComfyUI that transforms complex node graphs into intuitive HTML forms while maintaining full compatibility with ComfyUI workflows.

## ✨ Key Features

### 🎯 **Core Functionality**
- **Intuitive Forms Interface**: HTML forms replace complex node graphs for easier workflow creation
- **Drag & Drop Support**: Import ComfyUI workflows and images with embedded metadata
- **Unified Gallery**: Preview, edit, and manage generated images and queue status
- **Real-time Monitoring**: Live progress updates during image generation via WebSocket

### 🔧 **Enhanced Features (v2)**
- **Local Workflow Storage**: Save and load workflows directly in your browser
- **Missing Node Detection**: Automatic detection of required custom nodes (UI ready)
- **Professional Dark Theme**: Modern, responsive interface with Flowbite components
- **Enhanced Error Handling**: Better debugging and workflow validation
- **Template System**: Quick-start templates for common use cases

### 📱 **User Experience**
- **Single File Deployment**: Builds to one HTML file for easy sharing
- **Cross-Platform**: Works on Windows, macOS, and Linux
- **No Installation Required**: Just open the HTML file in any modern browser
- **Persistent Storage**: Workflows saved locally survive browser restarts

## 🚀 Getting Started

### Prerequisites
- ComfyUI server running with CORS enabled
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Quick Start
1. **Start ComfyUI with CORS enabled:**
   ```bash
   python main.py --enable-cors-header '*'
   ```

2. **Download ComfyWeb v2:**
   - Download the latest release from the [Releases page](../../releases)
   - Or build from source (see Build Instructions below)

3. **Open the HTML file** in your browser and configure the ComfyUI server address in the 'Manage' tab

### For Remote Servers
Configure the ComfyUI server hostname in the 'Manage' tab if connecting to a remote instance.

## 📸 Screenshots

<img src="https://github.com/virtaava/comfywebv2/blob/master/docs/Screenshot%202025-06-13%20125055.png" width="400px"/>
<img src="https://github.com/virtaava/comfywebv2/blob/master/docs/Screenshot%202025-06-13%20125107.png" width="400px"/>

## 🛠️ Building from Source

### Prerequisites
- Node.js 18+ and npm
- Git

### Build Steps
```bash
# Clone the repository
git clone https://github.com/virtaava/comfywebv2.git
cd comfywebv2

# Install dependencies
npm install

# Build for production
npm run build

# The built file will be in dist/index.html
```

### Development
```bash
# Start development server
npm run dev

# Development server will open at http://localhost:5173
```

## 📋 Requirements

### ComfyUI Server
- ComfyUI with `--enable-cors-header '*'` flag
- Standard ComfyUI installation (no custom nodes required for basic functionality)

### Browser
- Modern browser with ES6+ support
- JavaScript enabled
- Local storage enabled (for workflow saving)

## 🎨 Enhanced Features Details

### Local Workflow Storage
- Save workflows with custom names and descriptions
- Persistent storage across browser sessions
- Quick access through "My Workflows" dropdown
- No server storage required

### Missing Node Detection
- Automatic detection of missing custom nodes when importing workflows
- Integration with ComfyUI Manager registry
- User-friendly installation guidance (UI complete, backend integration pending)

### Professional Interface
- Dark theme with purple accent colors
- Responsive design for different screen sizes
- Flowbite UI components for consistency
- Enhanced typography and spacing

## 🔧 Technical Details

### Architecture
- **Frontend**: Svelte 4.2.18 + TypeScript 5.5.3
- **Styling**: Tailwind CSS 3.4.9 + Flowbite components
- **Build**: Vite 5.4.1 with single-file output
- **State Management**: Reactive Svelte stores
- **API Integration**: ComfyUI HTTP API + WebSocket

### Compatibility
- **Import**: ComfyUI workflow JSON files and images with metadata
- **Export**: ComfyUI-compatible workflow files
- **Bidirectional**: Full compatibility with ComfyUI ecosystem

## 📝 Version History

### v2.0.0 (Enhanced Release)
- ✅ Fixed critical drag & drop workflow loading bug
- ✅ Added local workflow storage system
- ✅ Implemented missing node detection UI
- ✅ Enhanced error handling and debugging
- ✅ Professional dark theme and branding
- ✅ Improved type safety and validation

### v0.0.4 (Original)
- Basic ComfyUI workflow interface
- Form-based node editing
- Gallery view and queue management

## 🤝 Contributing

Contributions are welcome! This project enhances the original ComfyWeb by @jac3km4 with additional features and improvements.

### Areas for Contribution
- Additional workflow templates
- Custom node integration
- UI/UX improvements
- Bug fixes and testing

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Original ComfyWeb by [@jac3km4](https://github.com/jac3km4/comfyweb)
- ComfyUI by [@comfyanonymous](https://github.com/comfyanonymous/ComfyUI)
- Enhanced and maintained by [@virtaava](https://github.com/virtaava)

## 🔗 Related Projects

- [ComfyUI](https://github.com/comfyanonymous/ComfyUI) - The powerful diffusion model interface
- [ComfyUI Manager](https://github.com/ltdrdata/ComfyUI-Manager) - Extension management for ComfyUI
- [Original ComfyWeb](https://github.com/jac3km4/comfyweb) - The foundation this project builds upon