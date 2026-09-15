const drawingState = {
    tool: "brush",
    color: "#000000",
    size: 5,
    opacity: 1,
    isDrawing: false,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    fontFamily: "Arial",
}

const canvas = document.querySelector("#canvas");
const context = canvas.getContext("2d");

const colorInput = document.querySelector("#color");
const sizeInput = document.querySelector("#size");
const opacityInput = document.querySelector("#opacity");
const undoButton = document.querySelector("#undoButton");
const redoButton = document.querySelector("#redoButton");
const toolButtons = document.querySelectorAll("[data-tool]");

let canvasSnapshot = null;

const undoHistory = [];
const redoHistory = [];


function resizeCanvas() {
    const rectangle = canvas.getBoundingClientRect();

    canvas.width = rectangle.width;
    canvas.height = rectangle.height;

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
}

resizeCanvas();


function configureContext() {
    context.strokeStyle = drawingState.color;
    context.lineWidth = drawingState.size;
    context.globalAlpha = drawingState.opacity;
    
    context.lineCap = "round"; // rounded line corners
    context.lineJoin = "round"; // rounded line joints

    context.globalCompositeOperation = "source-over";
}


function getMousePosition(event) {
    const rectangle = canvas.getBoundingClientRect();

    const scaleX = canvas.width / rectangle.width;
    const scaleY = canvas.height / rectangle.height;

    const x = (event.clientX - rectangle.left) * scaleX;
    const y = (event.clientY - rectangle.top) * scaleY;

    return {x, y};
}


canvas.addEventListener("mousedown", startDrawing);

function startDrawing(event) {
    const position = getMousePosition(event);

    if (drawingState.tool === "text") {
        saveCanvasState();
        drawText(position.x, position.y);
        return;
    }

    saveCanvasState(); // save state before drawing

    drawingState.isDrawing = true;
    
    drawingState.startX = position.x;
    drawingState.startY = position.y;

    drawingState.lastX = position.x;
    drawingState.lastY = position.y;

    configureContext(); // sync config with drawingState

    canvasSnapshot = getCanvasState(); // save canvas for shape preview

    context.beginPath();
    context.moveTo(position.x, position.y);
}

canvas.addEventListener("mouseup", stopDrawing);
canvas.addEventListener("mouseleave", stopDrawing);

function stopDrawing() {
    if (!drawingState.isDrawing) {
        return;
    }

    drawingState.isDrawing = false;
    // context.closePath(); // closes current path connecting last point to first one
}


canvas.addEventListener("mousemove", draw);

function draw(event) {
    if (!drawingState.isDrawing) {
        return;
    }

    const position = getMousePosition(event);

    if (drawingState.tool === "brush") {
        configureContext();
        drawBrush(position.x, position.y);
        return;
    }

    if (drawingState.tool === "eraser") {
        configureContext();
        drawEraser(position.x, position.y);
        return;
    }

    context.putImageData(canvasSnapshot, 0, 0); // restore canvas to snapshot for shape preview

    configureContext();

    if (drawingState.tool === "line") {
        drawLine(position.x, position.y);
    }

    if (drawingState.tool === "rectangle") {
        drawRectangle(position.x, position.y);
    }

    if (drawingState.tool === "ellipse") {
        drawEllipse(position.x, position.y);
    }
}


function drawBrush(x, y) {
    context.beginPath();

    context.moveTo(drawingState.lastX, drawingState.lastY); // start
    context.lineTo(x, y);

    context.stroke();
    
    drawingState.lastX = x; // update last position
    drawingState.lastY = y;
}

function drawEraser(x, y) {
    context.save();

    context.globalCompositeOperation = "source-over";
    context.strokeStyle = "#ffffff";

    context.beginPath();
    context.moveTo(drawingState.lastX, drawingState.lastY);
    context.lineTo(x, y);
    context.stroke();

    context.restore();

    drawingState.lastX = x;
    drawingState.lastY = y;
}

function drawLine(x, y) {
    context.beginPath();

    context.moveTo(drawingState.startX, drawingState.startY); // start

    context.lineTo(x, y); // end
    context.stroke();
}

function drawRectangle(x, y) {
    const width = x - drawingState.startX;
    const height = y - drawingState.startY;

    context.strokeRect(drawingState.startX, drawingState.startY, width, height);
}

function drawEllipse(x, y) {
    const width = x - drawingState.startX;
    const height = y - drawingState.startY;

    const centerX = drawingState.startX + width / 2;
    const centerY = drawingState.startY + height / 2;

    const radiusX = Math.abs(width) / 2;
    const radiusY = Math.abs(height) / 2;

    context.beginPath();

    context.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);

    context.stroke();
}

function drawText(x, y) {
    const text = prompt("Enter text: ");

    if (!text) {
        return;
    }

    context.save();

    context.fillStyle = drawingState.color;
    context.globalAlpha = drawingState.opacity;
    context.font = drawingState.size + "px " + drawingState.fontFamily;
    context.textBaseline = "top";

    context.fillText(text, x, y);

    context.restore();
}


function getCanvasState() {
    return context.getImageData(0,0,canvas.width,canvas.height); // get current canvas state
}

function saveCanvasState() {
    undoHistory.push(getCanvasState()); // save current canvas state to undo history
    redoHistory.length = 0; // clear redo history

    updateHistoryButtons();
}


function undo() {
    if (undoHistory.length === 0) {
        return;
    }

    const currentState = getCanvasState();
    redoHistory.push(currentState); // save current state to redo history

    const previousState = undoHistory.pop(); // get last state from undo history and delete it
    context.putImageData(previousState, 0, 0); // restore previous state

    updateHistoryButtons();
}

function redo() {
    if (redoHistory.length === 0) {
        return;
    }

    const currentState = getCanvasState();
    undoHistory.push(currentState);

    const nextState = redoHistory.pop();
    context.putImageData(nextState, 0, 0);

    updateHistoryButtons();
}

function clearCanvas() {
    saveCanvasState();

    context.clearRect(0, 0, canvas.width, canvas.height); // clear canvas

    context.fillStyle = "#ffffff"; // fill with white background

    context.fillRect(0, 0, canvas.width, canvas.height);
}


function saveDrawing() {
    const link = document.createElement("a");

    link.download = "drawing.png";
    link.href = canvas.toDataURL("image/png");

    link.click();
}


toolButtons.forEach(button => {
    button.addEventListener("click", () => {
        drawingState.tool = button.dataset.tool;

        updateSelectedTool(button);
    });
});

function updateSelectedTool(selectedButton) {
    toolButtons.forEach(button => {
        button.dataset.active = "false";
    });

    selectedButton.dataset.active = "true";
}


function updateHistoryButtons() {
    if (undoHistory.length === 0) {
        undoButton.disabled = true;
    } else {
        undoButton.disabled = false;
    }

    if (redoHistory.length === 0) {
        redoButton.disabled = true;
    } else {
        redoButton.disabled = false;
    }
}

updateHistoryButtons(); // initialize history buttons state


colorInput.addEventListener("input", event => {
    drawingState.color = event.target.value;
});

sizeInput.addEventListener("input", event => {
    drawingState.size = Number(event.target.value);
});

opacityInput.addEventListener("input", event => {
    drawingState.opacity = Number(event.target.value);
});


document.addEventListener("keydown", event => {
    if (event.ctrlKey && event.shiftKey && event.code === "KeyZ") {
        event.preventDefault();
        event.stopPropagation();

        redo();
        return;
    }

    if (event.ctrlKey && !event.shiftKey && event.code === "KeyZ") {
        event.preventDefault();
        event.stopPropagation();

        undo();
        return;
    }

    if (event.ctrlKey && event.code === "KeyS") {
        event.preventDefault();
        saveDrawing();
        return;
    }

    if (event.ctrlKey && event.code === "KeyD") {
        event.preventDefault();
        clearCanvas();
        return;
    }

    if (event.key === "1") {
        drawingState.tool = "brush";
        updateSelectedTool(document.querySelector("[data-tool='brush']"));
        return;
    }

    if (event.key === "2") {
        drawingState.tool = "eraser";
        updateSelectedTool(document.querySelector("[data-tool='eraser']"));
        return;
    }

    if (event.key === "3") {
        drawingState.tool = "line";
        updateSelectedTool(document.querySelector("[data-tool='line']"));
        return;
    }

    if (event.key === "4") {
        drawingState.tool = "rectangle";
        updateSelectedTool(document.querySelector("[data-tool='rectangle']"));
        return;
    }

    if (event.key === "5") {
        drawingState.tool = "ellipse";
        updateSelectedTool(document.querySelector("[data-tool='ellipse']"));
        return;
    }

    if (event.key === "6") {
        drawingState.tool = "text";
        updateSelectedTool(document.querySelector("[data-tool='text']"));
        return;
    }
});
