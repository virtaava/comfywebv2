#!/bin/bash
# ComfyWeb v2 - Complete Installation Script for Linux/macOS
# This script installs ComfyUI, ComfyWeb v2, and all dependencies

echo "==============================================="
echo "   ComfyWeb v2 - Complete Installation"
echo "==============================================="
echo

# Create installation directory
mkdir -p ComfyWebSetup
cd ComfyWebSetup

echo "[1/5] Checking Prerequisites..."

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "ERROR: Python 3 is not installed"
    echo "Please install Python 3.8+ using your package manager:"
    echo "  Ubuntu/Debian: sudo apt update && sudo apt install python3 python3-pip python3-venv"
    echo "  macOS: brew install python3"
    echo "  Or download from: https://python.org"
    exit 1
fi

# Check if Git is installed
if ! command -v git &> /dev/null; then
    echo "ERROR: Git is not installed"
    echo "Please install Git using your package manager:"
    echo "  Ubuntu/Debian: sudo apt install git"
    echo "  macOS: brew install git"
    echo "  Or download from: https://git-scm.com"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed"
    echo "Please install Node.js 18+ using your package manager:"
    echo "  Ubuntu/Debian: curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && sudo apt-get install -y nodejs"
    echo "  macOS: brew install node"
    echo "  Or download from: https://nodejs.org"
    exit 1
fi

echo "✓ Python 3, Git, and Node.js are available"

echo
echo "[2/5] Installing ComfyUI..."
if [ ! -d "ComfyUI" ]; then
    git clone https://github.com/comfyanonymous/ComfyUI.git
    cd ComfyUI
    
    # Create virtual environment
    python3 -m venv venv
    source venv/bin/activate
    
    # Install PyTorch (CPU version for compatibility)
    pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu
    
    # Install requirements
    pip install -r requirements.txt
    
    cd ..
else
    echo "✓ ComfyUI already exists, skipping installation"
fi

echo
echo "[3/5] Installing ComfyUI Manager (recommended)..."
cd ComfyUI/custom_nodes
if [ ! -d "ComfyUI-Manager" ]; then
    git clone https://github.com/ltdrdata/ComfyUI-Manager.git
else
    echo "✓ ComfyUI-Manager already exists"
fi
cd ../..

echo
echo "[4/5] Installing ComfyWeb v2..."
if [ ! -d "comfywebv2" ]; then
    git clone https://github.com/virtaava/comfywebv2.git
    cd comfywebv2
    npm install
    npm run build
    cd ..
else
    echo "✓ ComfyWeb v2 already exists, updating..."
    cd comfywebv2
    git pull
    npm install
    npm run build
    cd ..
fi

echo
echo "[5/5] Creating launch scripts..."

# Create ComfyUI launch script
cat > launch-comfyui.sh << 'EOF'
#!/bin/bash
echo "Starting ComfyUI server with CORS enabled..."
cd ComfyUI
source venv/bin/activate
python main.py --enable-cors-header "*"
EOF

# Create ComfyWeb v2 launch script
cat > launch-comfyweb.sh << 'EOF'
#!/bin/bash
echo "Opening ComfyWeb v2..."
echo
echo "Make sure ComfyUI is running first!"
echo "If ComfyUI is not running, use: ./launch-comfyui.sh"
echo

# Try different ways to open the HTML file
if command -v xdg-open &> /dev/null; then
    xdg-open comfywebv2/dist/index.html
elif command -v open &> /dev/null; then
    open comfywebv2/dist/index.html
else
    echo "Please open this file in your browser:"
    echo "file://$(pwd)/comfywebv2/dist/index.html"
fi
EOF

# Create combined launch script
cat > launch-both.sh << 'EOF'
#!/bin/bash
echo "Starting ComfyUI and ComfyWeb v2..."
echo

# Start ComfyUI in background
./launch-comfyui.sh &
COMFYUI_PID=$!

echo "Waiting 10 seconds for ComfyUI to start..."
sleep 10

# Start ComfyWeb v2
./launch-comfyweb.sh

# Keep script running
echo "ComfyUI is running in background (PID: $COMFYUI_PID)"
echo "Press Ctrl+C to stop both services"
wait $COMFYUI_PID
EOF

# Make scripts executable
chmod +x launch-comfyui.sh
chmod +x launch-comfyweb.sh
chmod +x launch-both.sh

echo
echo "==============================================="
echo "   Installation Complete!"
echo "==============================================="
echo
echo "Quick Start Options:"
echo
echo "1. ./launch-both.sh      - Start both ComfyUI and ComfyWeb v2"
echo "2. ./launch-comfyui.sh   - Start only ComfyUI server"
echo "3. ./launch-comfyweb.sh  - Start only ComfyWeb v2 (requires ComfyUI running)"
echo
echo "Installation Directory: $(pwd)"
echo "ComfyUI: $(pwd)/ComfyUI"
echo "ComfyWeb v2: $(pwd)/comfywebv2/dist/index.html"
echo
echo "For first use, run: ./launch-both.sh"
echo