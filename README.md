# ComfyWeb
ComfyWeb is a simple interface for ComfyUI that replaces graphs with beautiful forms.

## Features
- A simple and intuitive interface with HTML forms instead of graphs! You can easily create and
  edit workflows without having to worry about the underlying graph structure.
- A unified gallery view that allows you to easily preview, edit and manage both generated images as
  well as anything that's pending in the queue.
- Drag and drop support for ComfyUI images and workflows, they are be automatically converted
  to a simple sequence of forms (some complex graphs might be rejected). Images generated
  with ComfyWeb can be loaded with ComfyUI (although they're not guaranteed to be pretty!).

## Usage

```bash
python main.py --enable-cors-header '*'
```
If you want to connect to a remote server, you should configure the host name in the 'Manage' tab.

## Screenshots
<img src="https://github.com/virtaava/comfywebv2/blob/master/docs/Screenshot%202025-06-13%20125055.png" width="360px"/>
<img src="https://github.com/virtaava/comfywebv2/blob/master/docs/Screenshot%202025-06-13%20125107.png" width="360px"/>


