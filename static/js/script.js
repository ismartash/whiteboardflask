
// Canvas setup
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    redrawCanvas();
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Drawing state
let isDrawing = false;
let currentTool = 'pen';
let currentColor = 'black';
let startX, startY;
let penThickness = 2;
let pdfContent = [];
let currentPage = 0;

// Tool selection
document.getElementById('penTool').addEventListener('click', () => {
    currentTool = 'pen';
});

document.getElementById('eraserTool').addEventListener('click', () => {
    currentTool = 'eraser';
});

document.getElementById('rectangleTool').addEventListener('click', () => {
    currentTool = 'rectangle';
});

// Pen thickness
const penThicknessSlider = document.getElementById('penThickness');
penThicknessSlider.addEventListener('input', (e) => {
    penThickness = parseInt(e.target.value);
});

// Color selection
document.querySelectorAll('.color-option').forEach(option => {
    option.addEventListener('click', (e) => {
        currentColor = e.target.dataset.color;
        currentTool = 'pen';
    });
});

// Drawing functions
canvas.addEventListener('mousedown', startDrawing);
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('mouseup', stopDrawing);
canvas.addEventListener('mouseout', stopDrawing);

function startDrawing(e) {
    isDrawing = true;
    [startX, startY] = [e.offsetX, e.offsetY];
}

function draw(e) {
    if (!isDrawing) return;
    
    const x = e.offsetX;
    const y = e.offsetY;

    ctx.lineWidth = penThickness;
    ctx.lineCap = 'round';

    if (currentTool === 'pen') {
        ctx.strokeStyle = currentColor;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(x, y);
        ctx.stroke();
        [startX, startY] = [x, y];
    } else if (currentTool === 'eraser') {
        const eraserSize = penThickness * 2;
        ctx.clearRect(x - eraserSize / 2, y - eraserSize / 2, eraserSize, eraserSize);
    } else if (currentTool === 'rectangle') {
        ctx.strokeStyle = currentColor;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        redrawCanvas();
        ctx.strokeRect(startX, startY, x - startX, y - startY);
    }
}

function stopDrawing() {
    isDrawing = false;
}

// Clear canvas
document.getElementById('clear').addEventListener('click', () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
});

// PDF handling
document.getElementById('pdfUpload').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('/upload_pdf', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            if (data.success) {
                pdfContent = data.content;
                currentPage = 0;
                displayPDFPage();
            }
        } catch (error) {
            console.error('Error:', error);
        }
    }
});

function displayPDFPage() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = '14px Arial';
    ctx.fillStyle = 'black';
    let yOffset = 20;
    const lines = pdfContent[currentPage].split('\n');
    lines.forEach(line => {
        ctx.fillText(line, 10, yOffset);
        yOffset += 20;
    });
}

document.getElementById('prevPage').addEventListener('click', () => {
    if (currentPage > 0) {
        currentPage--;
        displayPDFPage();
    }
});

document.getElementById('nextPage').addEventListener('click', () => {
    if (currentPage < pdfContent.length - 1) {
        currentPage++;
        displayPDFPage();
    }
});

// Chat functionality
const chatContainer = document.getElementById('chatContainer');
const chatInput = document.getElementById('chatInput');
const chatOutput = document.getElementById('chatOutput');

document.getElementById('chatbot').addEventListener('click', () => {
    chatContainer.style.display = 'block';
});

document.getElementById('closeChat').addEventListener('click', () => {
    chatContainer.style.display = 'none';
});

document.getElementById('sendChat').addEventListener('click', async () => {
    const query = chatInput.value;
    if (!query) return;

    chatOutput.innerHTML += `<div class="mb-2"><strong>You:</strong> ${query}</div>`;
    chatInput.value = '';

    try {
        const response = await fetch('/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query })
        });

        const data = await response.json();
        chatOutput.innerHTML += `<div class="mb-2"><strong>Assistant:</strong> ${data.response}</div>`;
        chatOutput.scrollTop = chatOutput.scrollHeight;
    } catch (error) {
        console.error('Error:', error);
    }
});

// Visual Assistant functionality
const visualAssistantContainer = document.getElementById('visualAssistantContainer');
const visualAssistantInput = document.getElementById('visualAssistantInput');
const visualAssistantOutput = document.getElementById('visualAssistantOutput');

document.getElementById('askDoubt').addEventListener('click', () => {
    visualAssistantContainer.style.display = 'block';
});

document.getElementById('closeVisualAssistant').addEventListener('click', () => {
    visualAssistantContainer.style.display = 'none';
});

document.getElementById('sendVisualQuery').addEventListener('click', async () => {
    const query = visualAssistantInput.value;
    if (!query) return;

    visualAssistantOutput.innerHTML += `<div class="mb-2"><strong>You:</strong> ${query}</div>`;
    visualAssistantInput.value = '';

    try {
        const response = await fetch('/analyze_screen', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query })
        });

        const data = await response.json();
        visualAssistantOutput.innerHTML += `<div class="mb-2"><strong>Visual Assistant:</strong><br>${data.response.replace(/\n/g, '<br>')}</div>`;
        visualAssistantOutput.scrollTop = visualAssistantOutput.scrollHeight;
    } catch (error) {
        console.error('Error:', error);
    }
});

function redrawCanvas() {
    // Redraw any saved shapes or lines here
    // This function should be called after clearing the canvas or resizing
}
