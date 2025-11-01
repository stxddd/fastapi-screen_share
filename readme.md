
# FastAPI Screen Share + Touchpad

Lightweight project that streams your desktop as a MJPEG (multipart JPEG) stream and exposes a WebSocket-based touchpad/control interface so a remote device can move the mouse, click, and send keyboard input.

This repository contains a minimal FastAPI app (`main.py`) and a small static client in `static/` that shows the stream and provides a touchpad UI.

## Features

- Live MJPEG screen stream (via `/stream`).
- WebSocket control at `/ws` to send relative touchpad movements, clicks and typed text.
- Small HTML/JS client in `static/` (`index.html`, `touchpad.js`, `style.css`).

## Prerequisites

- Windows (tested). The project uses `pyautogui`, which requires access to the desktop and may prompt for permissions on newer Windows/macOS.
- Python 3.8+ recommended.
- A copy of `requirements.txt` should be present in the repo root.

Install dependencies (from a Windows cmd prompt):

```cmd
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

If you prefer to run without a virtual environment:

```cmd
pip install -r requirements.txt
```

## Running the server

There are two main ways to start the app:

- Using uvicorn directly (recommended for development):

```cmd
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

- Or run the script (the file contains a `__main__` entry that starts uvicorn):

```cmd
python main.py
```

Then open the client page on a device that can reach the machine running the server. By default the stream endpoint is at:

```
http://<HOST>:8000/stream
```

and the client page is served from `/` (the project serves `static/index.html`). Example in-network usage from a phone: `http://192.168.0.11:8000/` (replace `192.168.0.11` with your PC's IP).

Important: `static/index.html` currently includes a hard-coded stream URL (`http://192.168.0.11:8000/stream`). Update that IP to match the server machine's IP or change it to a relative URL like `/stream` before using across devices.

## How it works (short)

- `main.py` uses `mss` + `opencv` to capture the primary monitor into frames and serves them as a multipart MJPEG stream for simple browser display.
- The WebSocket handler (`/ws`) accepts JSON messages with fields like `dx`, `dy` (relative pointer movement), `action` (e.g. `left_click`, `right_click`) and `text` for typing.
- On the server `pyautogui` performs the pointer and keyboard actions.

Example WebSocket message shapes (JSON):

- Move pointer: `{ "dx": 5, "dy": -3 }`
- Click: `{ "action": "left_click" }`
- Type: `{ "text": "hello" }`

