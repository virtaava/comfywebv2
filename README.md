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

## 🚀 Quick Installation (Recommended)

### **One-Click Setup Scripts**

**Windows Users:**
```cmd
# Download and run the complete installer
curl -O https://raw.githubusercontent.com/virtaava/comfywebv2/main/install-windows.bat
install-windows.bat
```

**Linux/macOS Users:**
```bash
# Download and run the complete installer
curl -O https://raw.githubusercontent.com/virtaava/comfywebv2/main/install-linux.sh
chmod +x install-linux.sh
./install-linux.sh
```

### **What the installer does:**
- ✅ Checks for Python 3.8+, Git, and Node.js 18+
- ✅ Downloads and installs ComfyUI with all dependencies
- ✅ Installs ComfyUI Manager (for custom nodes)
- ✅ Downloads and builds ComfyWeb v2
- ✅ Creates convenient launch scripts
- ✅ Sets up everything in a `ComfyWebSetup` folder

### **After installation:**
```bash
# Start both ComfyUI and ComfyWeb v2 together
launch-both.bat        # Windows
./launch-both.sh       # Linux/macOS
```

## 📋 Prerequisites

The installation scripts will check for these automatically:

**Required:**
- **Python 3.8+** - For running ComfyUI
- **Node.js 18+** - For building ComfyWeb v2
- **Git** - For downloading repositories

**GPU Support (Optional but Recommended):**
- NVIDIA GPU with CUDA support for faster image generation
- AMD GPU with ROCm support (Linux)

## Screenshots
<img src="https://github.com/virtaava/comfywebv2/blob/master/docs/Screenshot%202025-06-13%20125055.png" width="360px"/>
<img src="https://github.com/virtaava/comfywebv2/blob/master/docs/Screenshot%202025-06-13%20125107.png" width="360px"/>

## 🎮 How to Use ComfyWeb v2

### **Interface Overview**

**Left Panel - Workflow Editor:**
- **Workflow Tab**: Create and edit your workflow steps
- **Manage Tab**: Configure server settings and export workflows

**Gallery Panel:**
- **Generated Images**: View your created images
- **Queue Status**: See generation progress in real-time
- **Image Actions**: 
  - 📁 **Import Icon** (left): Load the workflow used to generate this image
  - 🗑️ **Trash Icon** (right): Delete this image from gallery
- **Click to Enlarge**: View images in full screen
- **Workflow Recovery**: Click the import icon to restore exact settings

### **Getting Started**

1. **Choose a Template:**
   - Click the **"Add"** dropdown
   - Select **"✅ Universal Templates"**
   - Pick a category (Text to Image, Image to Image, etc.)
   - Choose a template (⭐ = beginner friendly)

2. **Customize Your Workflow:**
   - Modify prompts in text areas
   - Adjust settings (steps, CFG, sampler)
   - Upload images for img2img workflows
   - See image previews automatically

3. **Generate Images:**
   - Click the **"Generate"** button
   - Watch progress in the gallery
   - Images appear automatically when complete

4. **Reuse Successful Workflows:**
   - Click the **📁 import icon** on any generated image
   - Your workflow will reload with those exact settings
   - Modify and generate variations

### **Template Categories**

**📸 Text to Image (Beginner ⭐):**
- **SDXL Basic**: Modern, high-quality generation
- **SD 1.5 Classic**: Compatible with older GPUs
- **SDXL + LoRA**: Style enhancement (requires LoRA files)

**🖼️ Image to Image (Beginner ⭐):**
- **SDXL img2img**: Transform existing images
- **SD 1.5 img2img**: Classic image transformation
- **Basic Inpainting** (Intermediate ⭐⭐): Fill masked areas

**🔍 Upscaling & Enhancement:**
- **Simple 4x Upscale** (Beginner ⭐): Quick enhancement
- **Latent Upscale** (Intermediate ⭐⭐): AI-powered quality improvement

**📦 Batch Processing:**
- **Batch Generation**: Create multiple variations

### **Workflow Persistence**
- **Session Storage**: Your workflow automatically saves during browser session
- **Manual Save**: Use "Save workflow" in Manage tab for permanent storage
- **Auto-Restore**: Reload your browser - your work is preserved!

### **Pro Tips**

**For Best Results:**
- Start with beginner templates (⭐) and experiment
- Use the import icon to learn from successful generations
- Save workflows you like using the "Save workflow" button
- Adjust CFG (7-8 for most cases) and steps (20-30) for quality vs speed

**Troubleshooting:**
- If templates don't load: Check ComfyUI is running with CORS enabled
- If images don't appear: Verify server address in Manage tab
- If upload fails: Ensure image files are PNG, JPG, or WebP format

## 🛠️ Manual Installation (Advanced Users)

If you prefer to install manually or customize the setup:

### 1. Install ComfyUI
```bash
git clone https://github.com/comfyanonymous/ComfyUI.git
cd ComfyUI
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
pip install -r requirements.txt
```

### 2. Install ComfyWeb v2
```bash
git clone https://github.com/virtaava/comfywebv2.git
cd comfywebv2
npm install
npm run build
```

### 3. Launch Manually
```bash
# Terminal 1: Start ComfyUI
cd ComfyUI
python main.py --enable-cors-header "*"

# Terminal 2: Open ComfyWeb v2
# Open comfywebv2/dist/index.html in your browser
```

## 🎯 Daily Usage

### **First Time Setup:**
1. Run the installer script for your platform
2. Use `launch-both` script to start everything
3. ComfyWeb v2 will open in your browser automatically
4. Configure ComfyUI server address if needed (usually http://127.0.0.1:8188)

### **Daily Usage:**
- **Quick Start**: Run `launch-both` script
- **ComfyUI Only**: Run `launch-comfyui` script  
- **ComfyWeb Only**: Run `launch-comfyweb` script (requires ComfyUI running)

### **Remote Server:**
If connecting to a remote ComfyUI server, configure the hostname in the 'Manage' tab.

## 🔧 Development

### Build from Source
```bash
git clone https://github.com/virtaava/comfywebv2.git
cd comfywebv2
npm install
npm run build          # Production build
npm run dev            # Development server
```

### Project Structure
```
comfywebv2/
├── src/               # Source code
├── dist/              # Built application (index.html)
├── install-*.sh/bat   # Installation scripts
└── launch-*.sh/bat    # Launch scripts
```

## 📋 Version History

### v2.0.0 (Enhanced Release)
- ✅ **One-click installers** for Windows and Linux/macOS
- ✅ **Complete automation** - installs ComfyUI + ComfyWeb v2
- ✅ **Launch scripts** for easy daily usage
- ✅ **Comprehensive template library** - 11 professional templates
- ✅ **Image preview system** - See uploaded images in workflows
- ✅ **Session persistence** - Work survives browser refresh
- ✅ Fixed critical drag & drop workflow loading bug
- ✅ Added local workflow storage system  
- ✅ Implemented missing node detection UI
- ✅ Enhanced error handling and debugging
- ✅ Professional interface improvements

### v0.0.4 (Original)
- Basic ComfyUI workflow interface by [@jac3km4](https://github.com/jac3km4/comfyweb)

## 🆘 Troubleshooting

### **Common Issues:**

**"Command not found" errors:**
- Make sure Python, Node.js, and Git are installed and in your PATH
- Windows: Restart command prompt after installing
- Linux/macOS: Restart terminal or source your profile

**ComfyUI won't start:**
- Check if port 8188 is already in use
- Try: `python main.py --port 8189 --enable-cors-header "*"`

**ComfyWeb v2 can't connect:**
- Ensure ComfyUI is running with CORS enabled
- Check the server address in ComfyWeb's 'Manage' tab
- Default should be: http://127.0.0.1:8188

**GPU not detected:**
- Install appropriate PyTorch version for your GPU
- NVIDIA: Use CUDA index URL in the installer
- AMD: Use ROCm version of PyTorch

**Images don't show previews:**
- Ensure image files are PNG, JPG, JPEG, or WebP format
- Check that ComfyUI can access the image files
- Verify file paths are correct

## 🙏 Acknowledgments
- Original ComfyWeb by [@jac3km4](https://github.com/jac3km4/comfyweb)
- ComfyUI by [@comfyanonymous](https://github.com/comfyanonymous/ComfyUI)
- Enhanced by [@virtaava](https://github.com/virtaava) with additional features and automation