// draw.js

export function toCanvasX(x, originX, scale) {
    return originX + x * scale;
}

export function toCanvasY(y, originY, scale) {
    return originY - y * scale;
}

export function drawGrid(ctx, originX, originY, scale, width, height) {
    ctx.strokeStyle = "#e0e0e0";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = -20; i <= 20; i++) {
        ctx.moveTo(toCanvasX(i, originX, scale), 0);
        ctx.lineTo(toCanvasX(i, originX, scale), height);

        ctx.moveTo(0, toCanvasY(i, originY, scale));
        ctx.lineTo(width, toCanvasY(i, originY, scale));
    }
    ctx.stroke();
}

export function drawNumbers(ctx, originX, originY, scale, width, height) {
    ctx.fillStyle = "#000";
    ctx.font = "14px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    // ===== X axis numbers =====
    for (let i = -Math.floor(originX / scale); i <= Math.floor((width - originX) / scale); i++) {
        if (i === 0) continue; // μηδέν, θα το δείξουμε στο y axis
        const x = originX + i * scale;
        ctx.fillText(i.toString(), x, originY + 5); // 5 px κάτω από άξονα
    }

    // ===== Y axis numbers =====
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (let i = -Math.floor(originY / scale); i <= Math.floor((height - originY) / scale); i++) {
        if (i === 0) continue; // μηδέν, ήδη στο x axis
        const y = originY - i * scale;
        ctx.fillText(i.toString(), originX - 5, y); // 5 px αριστερά από άξονα
    }

    // ===== Zero point =====
    ctx.textAlign = "right";
    ctx.textBaseline = "top";
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

export function drawFunction(ctx, fn, originX, originY, scale , color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    let first = true;
    for (let x = -10; x <= 10; x += 0.02) {
        let y = fn.eval(x);
        if (!isFinite(y)) continue;
        const cx = toCanvasX(x, originX, scale);
        const cy = toCanvasY(y, originY, scale);
        if (first) {
            ctx.moveTo(cx, cy);
            first = false;
        } else {
            ctx.lineTo(cx, cy);
        }
    }
    ctx.stroke();
}

export function drawPoint(ctx, fn, xVal, originX, originY, scale) {
    const y = fn.eval(xVal);
    ctx.fillStyle = "red";
    ctx.beginPath();
    ctx.arc(toCanvasX(xVal, originX, scale), toCanvasY(y, originY, scale), 5, 0, Math.PI * 2);
    ctx.fill();
}

export function drawTangent(ctx, fn, x0, originX, originY, scale) {
    const d = fn.derivative();
    const m = d.eval(x0);
    const y0 = fn.eval(x0);
    const b = y0 - m * x0;

    ctx.strokeStyle = "green";
    ctx.lineWidth = 2;
    ctx.beginPath();
    let first = true;
    for (let x = -10; x <= 10; x += 0.1) {
        const y = m * x + b;
        const cx = toCanvasX(x, originX, scale);
        const cy = toCanvasY(y, originY, scale);
        if (first) {
            ctx.moveTo(cx, cy);
            first = false;
        } else {
            ctx.lineTo(cx, cy);
        }
    }
    ctx.stroke();
    d.destroy();
}
