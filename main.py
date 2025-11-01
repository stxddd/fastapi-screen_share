from fastapi import FastAPI, WebSocket
from fastapi.responses import StreamingResponse
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
import uvicorn
import pyautogui
import json
import asyncio
import cv2
import numpy as np
import mss

app = FastAPI()

app.mount("/static", StaticFiles(directory="static"), name="static")

SCREEN_WIDTH, SCREEN_HEIGHT = pyautogui.size()
TOUCHPAD_WIDTH = 400
TOUCHPAD_HEIGHT = 300

def capture_screen():
    with mss.mss() as sct:
        monitor = sct.monitors[1]  
        while True:
            try:
                screenshot = sct.grab(monitor)
                frame = np.array(screenshot)
                frame = cv2.cvtColor(frame, cv2.COLOR_BGRA2BGR)  
                
                mouse_x, mouse_y = pyautogui.position()
                
                cv2.circle(frame, (mouse_x, mouse_y), 10, (0, 0, 255), -1)  # Red cursor

                _, buffer = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 70])
                yield (b"--frame\r\n"
                       b"Content-Type: image/jpeg\r\n\r\n" + buffer.tobytes() + b"\r\n")
            except Exception as e:
                print(f"Error capturing screen: {e}")
                break 

@app.get("/stream")
def stream():
    return StreamingResponse(capture_screen(), media_type="multipart/x-mixed-replace; boundary=frame")

@app.get("/")
async def get():
    return FileResponse("static/index.html")

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()
            coords = json.loads(data)
            
            if 'dx' in coords and 'dy' in coords:
                current_x, current_y = pyautogui.position()
                new_x = current_x + coords['dx']
                new_y = current_y + coords['dy']
                new_x = max(0, min(new_x, SCREEN_WIDTH))
                new_y = max(0, min(new_y, SCREEN_HEIGHT))
                pyautogui.moveTo(new_x, new_y, _pause=False)
            
            if coords.get('action') == 'left_click':
                pyautogui.click(button='left')
                await websocket.send_text("Left click")
            elif coords.get('action') == 'right_click':
                pyautogui.click(button='right')
                await websocket.send_text("Right click")
            
            if 'text' in coords:
                text = coords['text']
                if text == '\b':
                    pyautogui.press('backspace')
                elif text == '\n':
                    pyautogui.press('enter')
                else:
                    pyautogui.typewrite(text)
                await websocket.send_text(f"Typed: {text}")
            
            await asyncio.sleep(0.001)
            
    except Exception as e:
        print(f"Error: {e}")
        await websocket.close()

if __name__ == "__main__":
    pyautogui.FAILSAFE = False
    pyautogui.PAUSE = 0
    uvicorn.run(app, host="0.0.0.0", port=8000)