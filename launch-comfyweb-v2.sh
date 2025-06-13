#!/bin/bash

# ComfyWeb v2 Launcher for Linux/Mac
# Enhanced workflow interface for ComfyUI

echo "============================================"
echo "  ComfyWeb v2 - Enhanced Workflow Interface"
echo "============================================"
echo

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Function to check if ComfyUI is running
check_comfyui() {
    curl -s http://127.0.0.1:8188/api/object_info > /dev/null 2>&1
    return $?
}

# Check if ComfyUI path is set
if [ -z "$COMFYUI_PATH" ]; then
    echo -e "${YELLOW}Please enter your ComfyUI installation path:${NC}"
    read -p "Enter full path to ComfyUI folder: " COMFYUI_PATH
    export COMFYUI_PATH
fi

# Validate ComfyUI path
if [ ! -f "$COMFYUI_PATH/main.py" ]; then
    echo -e "${RED}ERROR: main.py not found in $COMFYUI_PATH${NC}"
    echo "Please check your ComfyUI installation path."
    exit 1
fi

echo -e "${BLUE}Starting ComfyUI server...${NC}"
echo -e "Path: ${COMFYUI_PATH}"
echo

# Start ComfyUI in background with CORS enabled
cd "$COMFYUI_PATH"
python3 main.py --enable-cors-header "*" --listen 127.0.0.1 --port 8188 &
COMFYUI_PID=$!

# Wait for ComfyUI to start
echo -e "${YELLOW}Waiting for ComfyUI to initialize...${NC}"
sleep 5

# Check if ComfyUI is running
echo -e "${BLUE}Checking ComfyUI connection...${NC}"
if check_comfyui; then
    echo -e "${GREEN}✓ ComfyUI is running!${NC}"
else
    echo -e "${YELLOW}⚠ ComfyUI may not be fully started yet.${NC}"
    echo "If ComfyWeb v2 shows connection errors, please wait a moment."
fi

echo

# Navigate back to ComfyWeb v2 directory
cd "$(dirname "$0")"

echo -e "${PURPLE}Starting ComfyWeb v2...${NC}"
echo -e "${BLUE}Opening in your default browser...${NC}"
echo

echo "============================================"
echo -e "  ${GREEN}ComfyWeb v2 is now running!${NC}"
echo
echo -e "  • ComfyUI Server: ${BLUE}http://127.0.0.1:8188${NC}"
echo -e "  • ComfyWeb v2: ${PURPLE}http://localhost:5173${NC}"
echo
echo -e "  ${YELLOW}Press Ctrl+C to stop both services${NC}"
echo "============================================"
echo

# Function to cleanup on exit
cleanup() {
    echo
    echo -e "${YELLOW}Shutting down services...${NC}"
    if [ ! -z "$COMFYUI_PID" ]; then
        kill $COMFYUI_PID 2>/dev/null
    fi
    echo -e "${GREEN}Done.${NC}"
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup SIGINT SIGTERM

# Start ComfyWeb v2 development server
npm run dev

# If we get here, npm run dev has exited
cleanup