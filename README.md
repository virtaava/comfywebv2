# ComfyWeb v2 - Enhanced Workflow Interface

ComfyWeb v2 is an enhanced interface for ComfyUI that replaces complex node graphs with intuitive HTML forms while maintaining full compatibility with ComfyUI workflows.

## Features

### 🎯 **Core Functionality**
- **Simple and intuitive interface** with HTML forms instead of graphs! You can easily create and edit workflows without having to worry about the underlying graph structure.
- **Unified gallery view** that allows you to easily preview, edit and manage both generated images as well as anything that's pending in the queue.
- **Drag and drop support** for ComfyUI images and workflows - they are automatically converted to a simple sequence of forms (some complex graphs might be rejected). Images generated with ComfyWeb can be loaded with ComfyUI (although they're not guaranteed to be pretty!).

### ✨ **Enhanced Features (v2)**
- **Local Workflow Storage**: Save and load workflows directly in your browser
- **Missing Node Detection**: Automatic detection of required custom nodes with installation UI
- **Enhanced Error Handling**: Fixed critical bugs and improved workflow validation  
- **Professional Dark Theme**: Modern, responsive interface with improved typography
- **Template System**: Quick-start templates for common workflows
- **Single File Deployment**: Builds to one HTML file for easy sharing

## Usage

Start ComfyUI with CORS enabled:
```bash
python main.py --enable-cors-header '*'
```

**Getting ComfyWeb v2:**
- Download from the [Releases page](../../releases) 
- Or build from source (see instructions below)

If you want to connect to a remote server, you should configure the host name in the 'Manage' tab.

## Screenshots
<img src="https://github.com/virtaava/comfywebv2/blob/master/docs/Screenshot%202025-06-13%20125055.png" width="360px"/>
<img src="https://github.com/virtaava/comfywebv2/blob/master/docs/Screenshot%202025-06-13%20125107.png" width="360px"/>

## 🛠️ Building from Source

### Prerequisites
- Node.js 18+ and npm

### Build Steps
```bash
# Clone and install
git clone https://github.com/virtaava/comfywebv2.git
cd comfywebv2
npm install

# Build for production
npm run build

# Output: dist/index.html (single file, ready to use)
```

### Development
```bash
npm run dev  # Opens at http://localhost:5173
```

## 📋 Version History

### v2.0.0 (Enhanced Release)
- ✅ Fixed critical drag & drop workflow loading bug
- ✅ Added local workflow storage system  
- ✅ Implemented missing node detection UI
- ✅ Enhanced error handling and debugging
- ✅ Professional interface improvements

### v0.0.4 (Original)
- Basic ComfyUI workflow interface by [@jac3km4](https://github.com/jac3km4/comfyweb)

## 🙏 Acknowledgments
- Original ComfyWeb by [@jac3km4](https://github.com/jac3km4/comfyweb)
- Enhanced by [@virtaava](https://github.com/virtaava) with additional features and bug fixes