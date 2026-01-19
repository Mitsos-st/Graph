import {
    drawGrid,
    drawAxes,
    drawFunction,
    drawNumbers
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

    activeFunctions.forEach(funcData => {
        if (funcData.object) {
            drawFunction(ctx, funcData.object, originX, originY, scale, funcData.color);
        }
    });
}

function setupEventListeners() {
    const btnAdd = document.getElementById('btn-add');
    const btnClear = document.getElementById('btn-clear');
    const input = document.getElementById('math-input');

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
}

function addNewFunction(text) {
    // 1. Parse string to AST using Math.js
    const rootNode = math.parse(text);
    
    // 2. Convert AST to your WASM Object
    const wasmFunc = astToWasm(rootNode);

    if (wasmFunc) {
        activeFunctions.push({
            text: text,
            object: wasmFunc,
            color: getRandomColor()
        });
        updateSidebar();
        render();
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

    // CASE 2: Symbols (Variables & Constants like e, pi)
    if (node.isSymbolNode) {
        if (node.name === 'x') {
            return MathFunction.x(); 
        }
        if (node.name === 'e') {
            return MathFunction.number(Math.E);
        }
        if (node.name === 'pi' || node.name === 'π') {
            return MathFunction.number(Math.PI);
        }
        throw new Error(`Unknown variable: ${node.name}`);
    }

    // CASE 3: Constants (Numbers)
    if (node.isConstantNode) {
        return MathFunction.number(node.value);
    }

    // CASE 4: Operators (+, -, *, /, ^)
    if (node.isOperatorNode) {
        // Handle unary minus (-x)
        if (node.args.length === 1) {
            const arg = astToWasm(node.args[0]);
            if (node.op === '-') {
                return MathFunction.number(0).sub(arg);
            }
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

    // CASE 5: Functions
    if (node.isFunctionNode) {
        const arg = astToWasm(node.args[0]); 
        switch (node.name) {
            case 'sin': return arg.sin();
            case 'cos': return arg.cos();
            case 'tan': return arg.tan();
            case 'ln':  return arg.ln();
            case 'log': return arg.ln(); // Default to ln
            case 'sqrt': return arg.power(MathFunction.number(0.5));
            // Handle exp(x) explicitly if user types "exp(x)" instead of "e^x"
            case 'exp': return MathFunction.number(Math.E).power(arg);
            default: throw new Error("Unsupported function: " + node.name);
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

    activeFunctions.forEach((funcData, index) => {
        const item = document.createElement('div');
        item.className = 'function-item';
        item.style.borderLeftColor = funcData.color; 

        // Text
        const label = document.createElement('span');
        label.className = 'function-text';
        label.innerText = `f${index + 1}(x) = ${funcData.text}`;
        
        // Delete Button
        const delBtn = document.createElement('button');
        delBtn.className = 'btn-delete';
        delBtn.innerText = '×'; // nicer multiplication sign as close icon
        delBtn.onclick = () => removeFunction(index);

        item.appendChild(label);
        item.appendChild(delBtn);
        list.appendChild(item);
    });
}

function removeFunction(index) {
    // 1. Free C++ memory
    activeFunctions[index].object.destroy();
    
    // 2. Remove from array
    activeFunctions.splice(index, 1);
    
    // 3. Update UI
    updateSidebar();
    render();
}

// Cleanup on page reload/close
window.addEventListener("beforeunload", () => {
    activeFunctions.forEach(f => f.object.destroy());
});