
# 🧠 ComfyWeb V2 - Beginner Manual

Welcome to **ComfyWeb V2** – your friendly interface to the world of AI image generation, powered by ComfyUI under the hood, but vastly easier to understand, use, and extend.

---

## 🚀 What is ComfyWeb V2?

ComfyWeb V2 is a visual frontend that turns the usually complex node-graph-based system of **ComfyUI** into a clear **top-down card system**, where each **card = a node**, and they **execute in order from top to bottom**.

Instead of spaghetti graphs, you now build workflows like a vertical recipe.

---

## 📁 My Workflows

Think of **"My Workflows"** as your personal drawer of magic recipes. You can:
- 💾 Save your custom workflows
- ⚡ Quickly launch or modify them
- 📚 Share or load prebuilt ones

This is where you can build, edit, reuse, and remix ideas – permanently.

---

## 🧱 Anatomy of a Workflow: Card-by-Card

Each **card** represents one processing node in ComfyUI. Here's a breakdown of essential and common ones:

### 🧩 Required Nodes

#### 1. `CheckpointLoaderSimple`
- **Loads the base model** (like `SDXL`, `SD 1.5`).
- **Required.** No model = no generation.
- **Field:**
  - `ckpt_name`: Your model file (e.g., `sdxl_base_1.0.safetensors`).

#### 2. `EmptyLatentImage`
- Sets the resolution and canvas size.
- Needed for workflows without an input image.
- **Fields:**
  - `width`, `height`: Dimensions.
  - `batch_size`: Number of outputs.

#### 3. `Prompt`
- Your main input. Describes what the AI should generate.
- **Fields:**
  - `positive`: What you want (e.g., "cinematic astronaut in space").
  - `negative`: What to avoid (e.g., "blurry, extra limbs").

#### 4. `KSampler`
- The generator engine.
- Controls randomness, creativity, iteration count.
- **Fields:**
  - `seed`: 0 = random each time.
  - `steps`: More steps = more detail.
  - `cfg`: Prompt adherence (7–12 is typical).
  - `sampler_name`: Like `euler`, `dpmpp_2m`.

#### 5. `VAEEncode` / `VAEDecode`
- These are used in workflows that manipulate latent images directly (e.g., inpainting).
- Decode turns latent back into images.

#### 6. `SaveImage` or `ImageSaver`
- Final node to output your image.
- Essential if you want to keep your results!

---

## 🔧 Optional & Advanced Nodes

### 🧠 `ControlNetLoader`
- Load a ControlNet model for pose, depth, or edge guidance.

### 🧠 `LoraLoader`
- Apply LoRA fine-tuning weights (e.g., anime styles, artists).
- Can be stacked or blended for creative effects.

### 🎨 `ImageScaleBy`
- Resizes your generated images.
- Used for upscaling or matching dimensions.

### 🖼 `LoadImage`
- Load an external image from file – useful for inpainting or img2img.

### ✂️ `MaskComposite`
- Combine masks for inpainting workflows.
- Useful when masking out areas of an image for editing.

### 🔍 `CLIPTextEncode`
- Advanced control over how prompts are tokenised.
- Can be used in workflows that require direct embeddings.

---

## 🧪 Minimal Working Workflow Example

```
CheckpointLoaderSimple → EmptyLatentImage → Prompt → KSampler → ImageSaver
```

That’s it. Generates your first AI image.

---

## 📦 Adding Cards (Nodes)

Click **"Add"** to choose from:
- **sampling** – KSampler, Schedulers
- **loaders** – Model, VAE, ControlNet, LoRA
- **conditioning** – Prompt, CLIP, custom embeddings
- **latent** – Input/output formatting
- **image** – Upscalers, masks, overlays
- **audio** – If using audio generation nodes
- And more...

Cards are just UI-wrapped nodes that run top-to-bottom. Easier, cleaner, no wiring mess.

---

## 💡 Tips for Building

- Top-to-bottom flow: order matters.
- Start with required cards: Model → Prompt → Sampler.
- Add optional helpers like LoRA, ControlNet, etc.
- Reuse your configs by saving into **My Workflows**.

---

## 🧠 Future Features


- Prebuilt templates by category: anime, realism, sketch, etc. If you have the models.

---

## ❓ Troubleshooting

- **Not generating?** Ensure all required nodes are present.
- **Weird results?** Increase `steps`, tweak `cfg`, change `sampler`.
- **Want to edit existing image?** Use `LoadImage`, `Mask`, `KSampler`.

---

## 🎯 Goal

Our goal: powerful AI tools with zero friction. ComfyUI’s engine, your creativity – no wiring required.

---

Enjoy ComfyWeb V2!
