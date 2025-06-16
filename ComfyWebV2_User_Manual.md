# 🧠 ComfyWeb V2 - Beginner Manual

Welcome to **ComfyWeb V2** – your friendly interface to the world of AI image generation, powered by ComfyUI under the hood, but vastly easier to understand, use, and extend.

---

## 🚀 What is ComfyWeb V2?

ComfyWeb V2 is a visual frontend that turns the usually complex node-graph-based system of **ComfyUI** into a clear **top-down card system**, where each **card = a node**, and they **execute in order from top to bottom**.

Instead of spaghetti graphs, you now build workflows like a vertical recipe.

### 🧩 Templates vs Cards: Understanding the Relationship

**Templates** are complete workflow recipes (like "SDXL Basic" or "Image to Image") that define an entire image generation process from start to finish.

**Cards** are the individual building blocks within each template - each card represents one processing step (node) in the workflow.

When you select a **template**, ComfyWeb V2 displays it as a **stack of cards** that you can configure:
- Template = The complete recipe
- Cards = Individual ingredients and cooking steps
- You customize the cards, ComfyWeb V2 executes the template

---

## 📚 Template Library - Your Recipe Collection

ComfyWeb V2 comes with **14 professionally crafted templates** organized across **5 categories**:

### 📸 **Text to Image** (3 templates)
- **SDXL Basic** - High-quality text-to-image generation using SDXL model
- **SD 1.5 Classic** - Standard Stable Diffusion for reliable results  
- **Flux GGUF** - Modern model format for advanced generation

### 🖼️ **Image to Image** (3 templates)
- **Basic Image to Image** - Transform existing images with new prompts
- **SDXL Image to Image** - Higher quality image transformation
- **SD 1.5 Image to Image** - Classic model approach for img2img

### 🔍 **Upscaling & Enhancement** (2 templates)
- **Upscale & Enhance** - Improve image quality and resolution
- **Latent Upscaling** - Advanced upscaling using latent space processing

### 📦 **Batch Processing** (1 template)
- **Batch Generation** - Create multiple variations efficiently

### ⚡ **Advanced** (5 templates)
- **SDXL + LoRA** - Fine-tuned style integration with LoRA models
- **Multi-LoRA Style Fusion** - Combine multiple LoRA styles creatively
- **Inpainting** - Selective image editing and object removal
- **ControlNet Pose Control** - Guided generation using pose detection
- **Professional Portrait** - Optimized settings for portrait photography

Each template includes **difficulty ratings**, **estimated generation times**, and **example prompts** to get you started.

---

## 🖼️ **Gallery System - Your Image Collection**

ComfyWeb V2 features a **session-persistent gallery** that automatically tracks all images you generate:

### ✨ **Gallery Features**
- **Automatic Collection** - Every image you generate appears in the gallery
- **Session Persistence** - Images stay in gallery across browser refresh
- **Generation Context** - Click images to see their prompts and settings
- **Professional Interface** - Clean, organized grid view with hover effects

### 🎯 **How It Works**
1. Generate images using any template
2. Images automatically appear in Gallery tab
3. Gallery persists until you close the browser tab
4. Perfect for comparing results and iterating on prompts

---

## 📁 My Workflows - Personal Recipe Book

Think of **"My Workflows"** as your personal drawer of magic recipes. You can:
- 💾 **Save Custom Workflows** - Store your perfect parameter combinations
- ⚡ **Quick Launch** - Instantly load saved configurations  
- 🔄 **Modify & Iterate** - Build on previous successes
- 📤 **Import ComfyUI Workflows** - Drag-and-drop JSON files from ComfyUI
- 🎯 **Missing Node Detection** - Get guidance when workflows need additional nodes

This is where you can build, edit, reuse, and remix ideas – permanently.

---

## 🧱 Anatomy of a Workflow: Card-by-Card

Each **card** represents one processing node in ComfyUI. Here's a breakdown of essential and common ones:

### 🧩 Required Cards (The Foundation)

#### 1. `CheckpointLoaderSimple`
- **Loads the base model** (like `SDXL`, `SD 1.5`).
- **Required.** No model = no generation.
- **Field:**
  - `ckpt_name`: Your model file (e.g., `sdxl_base_1.0.safetensors`).

#### 2. `EmptyLatentImage`
- Sets the resolution and canvas size.
- Needed for workflows without an input image.
- **Fields:**
  - `width`, `height`: Dimensions (512x512, 1024x1024, etc.).
  - `batch_size`: Number of outputs to generate.

#### 3. `CLIPTextEncode` (Prompt Cards)
- Your creative input - describes what the AI should generate.
- **Fields:**
  - **Positive Prompt**: What you want (e.g., "cinematic astronaut in space")
  - **Negative Prompt**: What to avoid (e.g., "blurry, extra limbs")

#### 4. `KSampler`
- The generation engine - where the magic happens.
- Controls randomness, creativity, iteration count.
- **Fields:**
  - `seed`: 0 = random each time, specific number = reproducible results
  - `steps`: More steps = more detail (20-30 typical)
  - `cfg`: Prompt adherence (7–12 is typical range)
  - `sampler_name`: Algorithm like `euler`, `dpmpp_2m`

#### 5. `VAEDecode`
- Converts the generated latent image into viewable pixels.
- Essential final processing step.

#### 6. `SaveImage`
- **Critical final card** - saves your image to ComfyUI's output folder.
- Without this, your images disappear when ComfyUI restarts!
- Images saved with `ComfyWebv2_` prefix for easy identification.

---

## 🔧 Optional & Advanced Cards

### 🧠 `ControlNetLoader` & `ControlNetApply`
- Load ControlNet models for pose, depth, or edge guidance.
- Gives you precise control over composition and structure.

### 🎨 `LoraLoader`
- Apply LoRA fine-tuning weights (e.g., anime styles, specific artists).
- Can be stacked or blended for creative effects.
- Multiple LoRAs can be combined in advanced templates.

### 🖼️ `LoadImage`
- **Image Upload Interface** - Load external images for img2img workflows.
- Features **drag-and-drop upload** with **instant visual previews**.
- Professional loading states and progress indicators.

### ✂️ `MaskComposite` & Inpainting Cards
- Combine masks for selective image editing.
- Used in inpainting workflows for precise object removal/replacement.

### 🔍 `ImageScaleBy` & Upscaling
- Resize and enhance your generated images.
- Used in upscaling templates for quality improvement.

---

## 🚀 **Getting Started: Your First Image**

### **Step 1: Choose Your Template**
1. Browse the **template categories** in the sidebar
2. Start with **"SDXL Basic"** for your first generation
3. Each template shows difficulty level and expected generation time

### **Step 2: Configure the Cards**
1. **Model Card** - Select your checkpoint (SDXL models recommended)
2. **Prompt Cards** - Write what you want to see
3. **Generation Settings** - Adjust steps, CFG, and other parameters
4. **Output Settings** - Set resolution and batch size

### **Step 3: Generate & Monitor**
1. Click **"Generate"** to start the process
2. Watch real-time progress updates
3. Images appear automatically in the **Gallery** tab

### **Step 4: Save & Iterate**  
1. **Save successful workflows** to "My Workflows"
2. **Adjust parameters** and regenerate for variations
3. **Build your collection** of perfect recipes

---

## 📸 **Image Upload & Preview System**

For **Image-to-Image workflows**, ComfyWeb V2 provides professional image handling:

### ✨ **Upload Features**
- **Drag & Drop Interface** - Simply drag images onto upload areas
- **Instant Visual Previews** - See your images immediately after upload
- **Professional Loading States** - Clear feedback during upload process
- **Error Handling** - Clear messages if upload fails

### 🎯 **Image-to-Image Workflow**
1. Select an **Image-to-Image template**
2. **Upload your source image** using drag-and-drop
3. **Adjust the prompt** to describe desired changes
4. **Set strength parameter** (0.1 = subtle, 0.8 = major changes)
5. **Generate** and compare results in gallery

---

## 🔄 **Workflow Import & Management**

### 📥 **Import ComfyUI Workflows**
- **Drag ComfyUI JSON files** directly into ComfyWeb V2
- **Automatic conversion** from node-graph to card-based interface
- **Missing node detection** - Get clear guidance on required extensions

### 🛠️ **Missing Node Handling**
When importing complex workflows:
1. **Automatic Detection** - ComfyWeb V2 identifies missing custom nodes
2. **Clear Information** - See exactly which extensions are needed
3. **Installation Guidance** - Links and instructions for adding nodes
4. **Graceful Fallback** - Workflows still load with clear missing node indicators

### 💾 **Workflow Management**
- **Save Configurations** - Store your perfect parameter combinations
- **Quick Access** - "My Workflows" section for instant loading
- **Persistent Storage** - Workflows saved across browser sessions
- **Custom Names** - Organize with descriptive titles

---

## 🧪 Minimal Working Workflow Example

```
CheckpointLoaderSimple → EmptyLatentImage → CLIPTextEncode → KSampler → VAEDecode → SaveImage
```

That's it. This card sequence generates your first AI image.

**In Practice:**
1. **Template** = "SDXL Basic" (contains all these cards)
2. **Your Job** = Fill out the parameters on each card
3. **ComfyWeb V2** = Executes the cards top-to-bottom

---

## 💡 Tips for Success

### 🎯 **Template Selection**
- **Beginners**: Start with "SDXL Basic" or "SD 1.5 Classic"
- **Image Editing**: Use "Image-to-Image" templates
- **Quality Enhancement**: Try "Upscale & Enhance"
- **Advanced Users**: Explore "Multi-LoRA" and "ControlNet" templates

### ⚙️ **Parameter Tuning**
- **Steps**: 20-30 for most cases, 40+ for fine detail
- **CFG Scale**: 7-12 typical, higher = more prompt adherence
- **Seed**: 0 for random, save good seeds for variations
- **Resolution**: Start with template defaults, adjust as needed

### 🖼️ **Image Workflows**
- **Upload Quality**: Use high-resolution source images
- **Strength Settings**: 0.3-0.7 for img2img typically
- **Preview First**: Check image upload preview before generating

### 🎨 **Creative Process**
- **Start Simple**: Basic prompts often work best
- **Iterate Gradually**: Make small changes between generations
- **Save Successes**: Build your personal template collection
- **Use Gallery**: Compare results to refine your approach

---

## 🔧 **Advanced Features**

### 🎛️ **Stop Generation**
- **Interrupt Control** - Stop generation mid-process if needed
- **Real-time Monitoring** - See generation progress updates
- **Resource Management** - Free up GPU when changing direction

### 🔄 **Session Recovery**
- **Automatic Saving** - Workflow state persists through browser refresh
- **Gallery Persistence** - Generated images survive page reloads  
- **Progress Tracking** - Resume where you left off

### 🛡️ **Error Handling**
- **Clear Messages** - Understand what went wrong
- **Graceful Degradation** - Missing features don't break the interface
- **Recovery Options** - Easy ways to fix common issues

---

## ❓ Troubleshooting

### 🚫 **Generation Issues**
- **Not generating?** Check that all required cards have values
- **Poor quality?** Increase steps, adjust CFG, try different sampler
- **Out of memory?** Reduce resolution or batch size

### 🖼️ **Image Problems**  
- **Images disappearing?** Ensure SaveImage card is present (not PreviewImage)
- **Upload failing?** Check image format (PNG, JPG, WebP supported)
- **No preview?** Verify image uploaded successfully before generating

### ⚙️ **Workflow Issues**
- **Missing nodes?** Use the detection system for installation guidance
- **Cards not working?** Verify ComfyUI is running and accessible
- **Slow generation?** Check GPU usage and ComfyUI performance

### 🔧 **Technical Issues**
- **Connection problems?** Verify ComfyUI is running on http://localhost:8188
- **CORS errors?** Start ComfyUI with `--enable-cors-header '*'`
- **Model not found?** Check model file paths and ComfyUI model folders

---

## 🎯 Goal

Our goal: powerful AI tools with zero friction. ComfyUI's engine, your creativity – no node wiring required.

**ComfyWeb V2 Philosophy:**
- **Templates** provide the structure
- **Cards** give you the control  
- **Gallery** tracks your progress
- **Simplicity** unlocks creativity

---

## 🆕 What's New in V2

### ✨ **Major Enhancements**
- **14 Professional Templates** across 5 organized categories
- **Session-Persistent Gallery** with automatic image collection
- **Professional Image Upload** with drag-drop and instant previews
- **Smart Workflow Import** with missing node detection
- **Enhanced Error Handling** with clear user feedback
- **Local Workflow Storage** with persistent browser saving

### 🎨 **UI Improvements**
- **Consistent Dark Theme** throughout the interface
- **Responsive Design** that works on different screen sizes
- **Professional Loading States** and progress indicators
- **Clean Typography** and visual hierarchy

### 🔧 **Technical Advances**
- **TypeScript Implementation** for better reliability
- **Enhanced Type Safety** with comprehensive error handling
- **Improved Performance** and memory management
- **Better ComfyUI Integration** with real-time status updates

---

Enjoy ComfyWeb V2 – where **templates meet creativity**!
