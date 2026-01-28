import {
    drawGrid,
    drawAxes,
    drawFunction,
    drawNumbers,
    drawPoint
} from "./draw.js";

// --- Global State ---
let activeFunctions = []; 
let ctx = null;
let canvas = null;
let scale = 50;
let originX = 0;
let originY = 0;

window.addEventListener("DOMContentLoaded", () => {
    Module.onRuntimeInitialized = () => {
        canvas = document.getElementById("plot");
        ctx = canvas.getContext("2d");
        originX = canvas.width / 2;
        originY = canvas.height / 2;

        render();
        setupEventListeners();
    };
});

function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    drawGrid(ctx, originX, originY, scale, canvas.width, canvas.height);
    drawAxes(ctx, originX, originY, canvas.width, canvas.height);
    drawNumbers(ctx, originX, originY, scale, canvas.width, canvas.height);

    activeFunctions.forEach(item => {
        if (item.type === 'function') {
            drawFunction(ctx, item.object, originX, originY, scale, item.color);
        } else if (item.type === 'point') {
            // Use your drawPoint function here
            drawPoint(ctx, item.object, item.xVal, originX, originY, scale, item.color);
        }
    });
}

function setupEventListeners() {
    const btnAdd = document.getElementById('btn-add');
    const btnClear = document.getElementById('btn-clear');
    const input = document.getElementById('math-input');
    
    document.getElementById('btn-zoom-in').onclick = () => {
    scale *= 1.2;
    render();
    };

    document.getElementById('btn-zoom-out').onclick = () => {
        scale /= 1.2;
        render();
    };

    document.getElementById('btn-reset-view').onclick = () => {
        scale = 50;
        originX = canvas.width / 2;
        originY = canvas.height / 2;
        render();
    };

    const handleAdd = () => {
        const text = input.value.trim();
        if(!text) return;
        
        try {
            addNewFunction(text);
            input.value = ''; 
        } catch (e) {
            console.error(e);
            alert("Error: " + e.message);
        }
    };

    btnAdd.addEventListener('click', handleAdd);
    input.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleAdd(); });

    btnClear.addEventListener('click', () => {
        activeFunctions.forEach(f => f.object.destroy());
        activeFunctions = [];
        updateSidebar();
        render();
    });

    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();

        const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;

        // 1. Get mouse position relative to the canvas
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // 2. Calculate mouse position in "math units" before zoom
        const mathX = (mouseX - originX) / scale;
        const mathY = (originY - mouseY) / scale;

        // 3. Apply the zoom to the scale
        scale *= zoomFactor;

        // 4. Adjust the origin so the math point stays under the mouse
        // New origin = MousePos - (MathPos * NewScale)
        originX = mouseX - (mathX * scale);
        originY = mouseY + (mathY * scale);

        render();
    }, { passive: false });

    let isDragging = false;
    let lastMouseX, lastMouseY;

    canvas.addEventListener('mousedown', (e) => {
        isDragging = true;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
    });

    window.addEventListener('mousemove', (e) => {
        if (isDragging) {
            const dx = e.clientX - lastMouseX;
            const dy = e.clientY - lastMouseY;

            originX += dx;
            originY += dy;

            lastMouseX = e.clientX;
            lastMouseY = e.clientY;
            render();
        }
    });

    window.addEventListener('mouseup', () => {
        isDragging = false;
    });

    let lastTouchDist = null;

    canvas.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
            // Prepare for single-finger panning
            lastMouseX = e.touches[0].clientX;
            lastMouseY = e.touches[0].clientY;
        } else if (e.touches.length === 2) {
            // Prepare for two-finger pinch-to-zoom
            lastTouchDist = getDist(e.touches);
        }
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault(); // Stop the page from scrolling while drawing

        if (e.touches.length === 1) {
            // PANNING
            const dx = e.touches[0].clientX - lastMouseX;
            const dy = e.touches[0].clientY - lastMouseY;
            originX += dx;
            originY += dy;
            lastMouseX = e.touches[0].clientX;
            lastMouseY = e.touches[0].clientY;
        } 
        else if (e.touches.length === 2) {
            // PINCH ZOOMING
            const currentDist = getDist(e.touches);
            if (lastTouchDist) {
                const zoomRatio = currentDist / lastTouchDist;
                scale *= zoomRatio;
            }
            lastTouchDist = currentDist;
        }
        render();
    }, { passive: false });

    canvas.addEventListener('touchend', () => {
        lastTouchDist = null;
});

// Helper to calculate distance between two touch points
function getDist(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
}
}

function addNewFunction(text) {
    try {
        let item = null;

        // 1. REGEX CHECK: Does it look like a point "(1, 2)" or "(1, pi)"?
        const pointRegex = /^\s*\(\s*([^,]+)\s*,\s*([^,]+)\s*\)\s*$/;
        const match = text.match(pointRegex);

        if (match) {
            // It's a coordinate pair! 
            // We evaluate the contents (in case the user typed 'pi' or '2*3')
            const xVal = math.evaluate(match[1]);
            const yVal = math.evaluate(match[2]);

            item = {
                type: 'point',
                text: text,
                object: MathFunction.number(yVal), // Use Y as the "function" for drawPoint
                xVal: xVal,
                color: getRandomColor()
            };
        } 
        else {
            // 2. STANDARD PARSING: If it's not a coordinate pair, use Math.js
            const rootNode = math.parse(text);

            // Check if it's an evaluation like "f1(2)"
            if (rootNode.isFunctionNode && rootNode.name.match(/^f\d+$/)) {
                const argText = rootNode.args[0].toString();
                const isStaticPoint = !argText.includes('x');

                if (isStaticPoint) {
                    const index = parseInt(rootNode.name.substring(1)) - 1;
                    const parentFunc = activeFunctions[index];
                    if (!parentFunc) throw new Error(`Function ${rootNode.name} not found`);

                    item = {
                        type: 'point',
                        text: text,
                        object: parentFunc.object.copy(),
                        xVal: math.evaluate(argText),
                        color: parentFunc.color 
                    };
                }
            }

            // If it wasn't caught as a point above, treat as a normal function
            if (!item) {
                const wasmFunc = astToWasm(rootNode);
                item = {
                    type: 'function',
                    text: text,
                    object: wasmFunc,
                    color: getRandomColor()
                };
            }
        }

        if (item) {
            activeFunctions.push(item);
            updateSidebar();
            render();
        }
    } catch (e) {
        console.error(e);
        alert("Input Error: " + e.message);
    }
}

// ---------------------------------------------------------
// PARSER: MathJS AST -> Your Wrapper API
// ---------------------------------------------------------
function astToWasm(node) {
    if (!node) return null;

    // CASE 1: Handle Parentheses
    if (node.isParenthesisNode) {
        return astToWasm(node.content);
    }

    // CASE 2: Symbols (Variables, Constants, AND Existing Functions f1, f2...)
    if (node.isSymbolNode) {
        const name = node.name;

        // 2a. Variable x
        if (name === 'x') return MathFunction.x();
        
        // 2b. Constants
        if (name === 'e') return MathFunction.number(Math.E);
        if (name === 'pi' || name === 'π') return MathFunction.number(Math.PI);

        // 2c. Existing Functions (f1, f2, f3...) used as variables (e.g., "f1 + f2")
        // This implies f1(x) + f2(x)
        if (name.match(/^f\d+$/)) {
            const index = parseInt(name.substring(1)) - 1;
            const funcData = activeFunctions[index];
            
            if (!funcData) throw new Error(`Function ${name} does not exist.`);
            
            // Return a COPY so we don't destroy the original
            return funcData.object.copy();
        }

        throw new Error(`Unknown variable: ${name}`);
    }

    // CASE 3: Constants (Numbers)
    if (node.isConstantNode) {
        return MathFunction.number(node.value);
    }

    // CASE 4: Operators (+, -, *, /, ^)
    if (node.isOperatorNode) {
        // Unary minus (-x)
        if (node.args.length === 1) {
            const arg = astToWasm(node.args[0]);
            if (node.op === '-') return MathFunction.number(0).sub(arg);
            if (node.op === '+') return arg;
        }

        const left = astToWasm(node.args[0]);
        const right = astToWasm(node.args[1]);

        switch (node.op) {
            case '+': return left.add(right);
            case '-': return left.sub(right);
            case '*': return left.mul(right);
            case '/': return left.div(right);
            case '^': return left.power(right);
            default:  throw new Error("Unknown operator: " + node.op);
        }
    }

    // CASE 5: Function Calls (sin, cos, der, f1...)
    if (node.isFunctionNode) {
        const arg = astToWasm(node.args[0]); 
        const name = node.name;

        // 5a. Derivative Command: der(...)
        if (name === 'der' || name === 'derivative') {
            return arg.derivative();
        }

        // 5b. Composition: f1(...), f2(...)
        // Example: f1(x^2) -> take f1, compose with x^2
        if (name.match(/^f\d+$/)) {
            const index = parseInt(name.substring(1)) - 1;
            const funcData = activeFunctions[index];
            
            if (!funcData) throw new Error(`Function ${name} does not exist.`);
            
            // Use your wrapper's compose method
            return funcData.object.compose(arg);
        }

        // 5c. Standard Math Functions
        switch (name) {
            case 'sin': return arg.sin();
            case 'cos': return arg.cos();
            case 'tan': return arg.tan();
            case 'ln':  return arg.ln();
            case 'log': return arg.ln();
            case 'exp': return MathFunction.number(Math.E).power(arg);
            case 'sqrt': return arg.power(MathFunction.number(0.5));
            default: throw new Error("Unsupported function: " + name);
        }
    }

    throw new Error(`Unsupported syntax: ${node.type}`);
}

// ---------------------------------------------------------
// UTILS
// ---------------------------------------------------------

function getRandomColor() {
    const hue = Math.floor(Math.random() * 360);
    return `hsl(${hue}, 80%, 45%)`; 
}

function updateSidebar() {
    const list = document.getElementById('function-list');
    list.innerHTML = ''; 

    activeFunctions.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'function-item';
        div.style.borderLeftColor = item.color; 

        const label = document.createElement('span');
        label.className = 'function-text';
        
        // Differentiate label text
        if (item.type === 'point') {
            label.innerHTML = `<b>P${index + 1}</b>: ${item.text}`;
        } else {
            label.innerHTML = `f<sub>${index + 1}</sub>(x) = ${item.text}`;
        }
        
        const delBtn = document.createElement('button');
        delBtn.className = 'btn-delete';
        delBtn.innerText = '×';
        delBtn.onclick = () => removeFunction(index);

        div.appendChild(label);
        div.appendChild(delBtn);
        list.appendChild(div);
    });
}

function removeFunction(index) {
    // 1. Get the item
    const item = activeFunctions[index];

    // 2. Explicitly free the Wasm memory
    if (item && item.object && typeof item.object.delete === 'function') {
        item.object.delete(); 
        console.log(`Memory freed for function ${index + 1}`);
    }

    // 3. Remove from the JS array
    activeFunctions.splice(index, 1);

    // 4. Refresh UI
    updateSidebar();
    render();
}

// Cleanup on page reload/close
window.addEventListener("beforeunload", () => {
    activeFunctions.forEach(f => f.object.destroy());
});

window.addEventListener('resize', () => {
    const wrapper = canvas.parentElement;
    canvas.width = wrapper.clientWidth;
    canvas.height = wrapper.clientHeight;
    
    // Optional: Keep the origin centered during resize
    originX = canvas.width / 2;
    originY = canvas.height / 2;
    
    render();
});

// Call once on startup to set initial size
window.dispatchEvent(new Event('resize'));