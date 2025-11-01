document.addEventListener('DOMContentLoaded', () => {
    const touchpad = document.getElementById('touchpad');
    const coordsDisplay = document.getElementById('coords');
    const leftClickBtn = document.getElementById('left-click');
    const rightClickBtn = document.getElementById('right-click');
    const keyboardInput = document.getElementById('keyboard-input');
    
    const ws = new WebSocket(`ws://${window.location.host}/ws`);
    
    let isDragging = false;
    let lastX = null;
    let lastY = null;
    let lastSent = 0;
    const SEND_INTERVAL = 16;
    const SENSITIVITY = 2;

    // Обработчики тачпада
    touchpad.addEventListener('mousedown', startDragging);
    touchpad.addEventListener('mousemove', drag);
    touchpad.addEventListener('mouseup', stopDragging);
    touchpad.addEventListener('mouseleave', stopDragging);

    touchpad.addEventListener('touchstart', startDragging);
    touchpad.addEventListener('touchmove', drag);
    touchpad.addEventListener('touchend', stopDragging);

    // Обработчики кнопок кликов
    leftClickBtn.addEventListener('click', () => sendClick('left_click'));
    rightClickBtn.addEventListener('click', () => sendClick('right_click'));

    // Обработчик ввода с клавиатуры устройства
    keyboardInput.addEventListener('input', (e) => {
        const value = e.data;
        if (value && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ text: value }));
        }
    });

    keyboardInput.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ text: '\b' }));
        } else if (e.key === 'Enter' && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ text: '\n' }));
        }
    });

    keyboardInput.addEventListener('input', () => {
        setTimeout(() => {
            keyboardInput.value = '';
        }, 0);
    });

    function startDragging(e) {
        isDragging = true;
        const { x, y } = getPosition(e);
        lastX = x;
        lastY = y;
    }

    function drag(e) {
        if (!isDragging) return;
        e.preventDefault();
        updatePosition(e);
    }

    function stopDragging() {
        isDragging = false;
        lastX = null;
        lastY = null;
    }

    function getPosition(e) {
        const rect = touchpad.getBoundingClientRect();
        let x, y;
        if (e.type.includes('touch')) {
            const touch = e.touches[0];
            x = touch.clientX - rect.left;
            y = touch.clientY - rect.top;
        } else {
            x = e.clientX - rect.left;
            y = e.clientY - rect.top;
        }
        return {
            x: Math.max(0, Math.min(x, rect.width)),
            y: Math.max(0, Math.min(y, rect.height))
        };
    }

    function updatePosition(e) {
        const { x, y } = getPosition(e);
        
        if (lastX !== null && lastY !== null) {
            const dx = (x - lastX) * SENSITIVITY;
            const dy = (y - lastY) * SENSITIVITY;
            
            coordsDisplay.textContent = `DX: ${Math.round(dx)}, DY: ${Math.round(dy)}`;

            const now = Date.now();
            if (now - lastSent >= SEND_INTERVAL && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ dx: Math.round(dx), dy: Math.round(dy) }));
                lastSent = now;
            }
        }
        
        lastX = x;
        lastY = y;
    }

    function sendClick(action) {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ action: action }));
        }
    }

    ws.onmessage = (event) => {
        coordsDisplay.textContent += ` | ${event.data}`;
        setTimeout(() => {
            coordsDisplay.textContent = coordsDisplay.textContent.split(' | ')[0];
        }, 500);
    };

    ws.onclose = () => {
        console.log('WebSocket connection closed');
    };

    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
    };
});