(() => {

    // ===== WASM bridge =====
    const mf_create_empty = Module.cwrap("mf_create_empty", "number", []);
    const mf_create_double = Module.cwrap("mf_create_double", "number", ["number"]);
    const mf_create_int    = Module.cwrap("mf_create_int", "number", ["number"]);
    const mf_copy          = Module.cwrap("mf_copy", "number", ["number"]);

    const mf_add = Module.cwrap("mf_add", "number", ["number", "number"]);
    const mf_sub = Module.cwrap("mf_sub", "number", ["number", "number"]);
    const mf_mul = Module.cwrap("mf_mul", "number", ["number", "number"]);
    const mf_div = Module.cwrap("mf_div", "number", ["number", "number"]);

    const mf_power_num = Module.cwrap("mf_power_num", "number", ["number", "number"]);
    const mf_power_fn  = Module.cwrap("mf_power_fn", "number", ["number", "number"]);

    const mf_compose = Module.cwrap("mf_compose", "number", ["number", "number"]);

    const mf_sin = Module.cwrap("mf_sin", "number", ["number"]);
    const mf_cos = Module.cwrap("mf_cos", "number", ["number"]);
    const mf_tan = Module.cwrap("mf_tan", "number", ["number"]);
    const mf_ln  = Module.cwrap("mf_ln",  "number", ["number"]);
    const mf_log = Module.cwrap("mf_log", "number", ["number", "number"]);

    const mf_eval       = Module.cwrap("mf_eval", "number", ["number", "number"]);
    const mf_derivative = Module.cwrap("mf_derivative", "number", ["number"]);
    const mf_destroy    = Module.cwrap("mf_destroy", null, ["number"]);

    const mf_x = Module.cwrap("mf_x", "number", []);

    // ===== JS Wrapper =====
    class MathFunction {
        constructor(ptr) {
            this.ptr = ptr;
        }

        // ---- Factories ----
        static empty() {
            return new MathFunction(mf_create_empty());
        }

        static number(v) {
            return Number.isInteger(v)
                ? new MathFunction(mf_create_int(v))
                : new MathFunction(mf_create_double(v));
        }

        static x() {
            return new MathFunction(mf_x());
        }

        copy() {
            return new MathFunction(mf_copy(this.ptr));
        }

        // ---- Arithmetic ----
        add(other) {
            return new MathFunction(mf_add(this.ptr, other.ptr));
        }

        sub(other) {
            return new MathFunction(mf_sub(this.ptr, other.ptr));
        }

        mul(other) {
            return new MathFunction(mf_mul(this.ptr, other.ptr));
        }

        div(other) {
            return new MathFunction(mf_div(this.ptr, other.ptr));
        }

        // ---- Power ----
        power(n) {
            if (n instanceof MathFunction) {
                return new MathFunction(mf_power_fn(this.ptr, n.ptr));
            }
            return new MathFunction(mf_power_num(this.ptr, n));
        }

        // ---- Composition ----
        compose(g) {
            return new MathFunction(mf_compose(this.ptr, g.ptr));
        }

        // ---- Elementary ----
        sin() { return new MathFunction(mf_sin(this.ptr)); }
        cos() { return new MathFunction(mf_cos(this.ptr)); }
        tan() { return new MathFunction(mf_tan(this.ptr)); }
        ln()  { return new MathFunction(mf_ln(this.ptr)); }
        log(n) { return new MathFunction(mf_log(n,this.ptr)); }

        // ---- Calculus ----
        derivative() {
            return new MathFunction(mf_derivative(this.ptr));
        }

        eval(x) {
            return mf_eval(this.ptr, x);
        }

        // ---- Memory ----
        destroy() {
            if (this.ptr !== 0) {
                mf_destroy(this.ptr);
                this.ptr = 0;
            }
        }
    }

    window.MathFunction = MathFunction;
})();
