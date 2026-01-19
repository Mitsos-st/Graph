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