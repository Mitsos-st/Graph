// draw.js

export function toCanvasX(x, originX, scale) {
    return originX + x * scale;
}

export function toCanvasY(y, originY, scale) {
    return originY - y * scale;
}

// Helper to get math coordinates from canvas pixels
export function toMathX(cx, originX, scale) {
    return (cx - originX) / scale;
}

/**
 * Calculates a "nice" step size for the grid based on the current scale.
 * Goal: Keep grid lines roughly 50-100 pixels apart.
 */
function getNiceStep(scale) {
    const targetSpacing = 80; // We want lines about 80px apart
    const rawStep = targetSpacing / scale;
    
    // Find the power of 10 just below the raw step
    const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const residual = rawStep / magnitude;

    // Pick the closest "nice" multiplier
    let multiplier;
    if (residual < 1.5) multiplier = 1;
    else if (residual < 3.5) multiplier = 2;
    else if (residual < 7.5) multiplier = 5;
    else multiplier = 10;

    return magnitude * multiplier;
}

export function drawGrid(ctx, originX, originY, scale, width, height) {
    const step = getNiceStep(scale);
    
    ctx.strokeStyle = "#e0e0e0";
    ctx.lineWidth = 1;
    ctx.beginPath();

    // Start from the first visible step on the left
    const xMin = Math.floor(toMathX(0, originX, scale) / step) * step;
    const xMax = toMathX(width, originX, scale);

    for (let s = xMin; s <= xMax; s += step) {
        const x = toCanvasX(s, originX, scale);
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
    }

    // Start from the first visible step at the bottom
    const yMin = Math.floor(toMathX(height, originY, -scale) / step) * step; 
    const yMax = toMathX(0, originY, -scale);

    for (let s = yMin; s <= yMax; s += step) {
        const y = toCanvasY(s, originY, scale);
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
    }
    ctx.stroke();
}

export function drawNumbers(ctx, originX, originY, scale, width, height) {
    const step = getNiceStep(scale);
    const fontSize = Math.max(10, Math.min(14, scale / 5)); // Subtle font scaling
    
    ctx.fillStyle = "#666";
    ctx.font = `${fontSize}px Arial`;
    
    const xMin = Math.floor(toMathX(0, originX, scale) / step) * step;
    const xMax = toMathX(width, originX, scale);
    const yMin = Math.floor(toMathX(height, originY, -scale) / step) * step;
    const yMax = toMathX(0, originY, -scale);

    // Helper to format numbers (avoids 1.00000000000004)
    const fmt = (n) => parseFloat(n.toFixed(10));

    // X axis numbers
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    for (let s = xMin; s <= xMax; s += step) {
        if (Math.abs(s) < step / 2) continue; // Skip zero
        ctx.fillText(fmt(s).toString(), toCanvasX(s, originX, scale), originY + 5);
    }

    // Y axis numbers
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (let s = yMin; s <= yMax; s += step) {
        if (Math.abs(s) < step / 2) continue; // Skip zero
        ctx.fillText(fmt(s).toString(), originX - 5, toCanvasY(s, originY, scale));
    }

    // Zero
    ctx.fillText("0", originX - 5, originY + 5);
}

export function drawAxes(ctx, originX, originY, width, height) {
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, originY);
    ctx.lineTo(width, originY);
    ctx.moveTo(originX, 0);
    ctx.lineTo(originX, height);
    ctx.stroke();
}

export function drawFunction(ctx, fn, originX, originY, scale, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();

    let first = true;
    let prevCy = null;

    // Draw across the entire visible width of the canvas
    for (let cx = 0; cx <= ctx.canvas.width; cx += 1) {
        const x = toMathX(cx, originX, scale);
        const y = fn.eval(x);

        // 1. Skip non-numbers
        if (!isFinite(y)) {
            first = true; 
            continue;
        }

        const cy = toCanvasY(y, originY, scale);

        // 2. FIX DISCONTINUITY (The 1/x problem)
        // If the jump between the current Y and the previous Y is huge 
        // (larger than the canvas height), we treat it as a break in the graph.
        if (!first && prevCy !== null) {
            if (Math.abs(cy - prevCy) > ctx.canvas.height) {
                ctx.stroke(); // Finish current segment
                ctx.beginPath(); // Start new segment
                ctx.moveTo(cx, cy);
                prevCy = cy;
                continue;
            }
        }

        if (first) {
            ctx.moveTo(cx, cy);
            first = false;
        } else {
            ctx.lineTo(cx, cy);
        }
        
        prevCy = cy;
    }
    ctx.stroke();
}

export function drawPoint(ctx, fn, xVal, originX, originY, scale, color) {
    const y = fn.eval(xVal);
    if (!isFinite(y)) return;

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(toCanvasX(xVal, originX, scale), toCanvasY(y, originY, scale), 5, 0, Math.PI * 2);
    ctx.fill();
    
    // Optional: Draw coordinate label near the point
    ctx.font = "12px Arial";
    ctx.fillText(`(${xVal.toFixed(2)}, ${y.toFixed(2)})`, toCanvasX(xVal, originX, scale) + 8, toCanvasY(y, originY, scale) - 8);
}