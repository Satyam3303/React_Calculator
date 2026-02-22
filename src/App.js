import { useReducer, useEffect, useRef, useCallback } from "react";
import DigitButton from "./DigitButton";
import OperationButton from "./OperationButton";
import "./styles.css";

export const ACTIONS = Object.freeze({
  ADD_DIGIT: "add-digit",
  CHOOSE_OPERATION: "choose-operation",
  CLEAR: "clear",
  DELETE_DIGIT: "delete-digit",
  EVALUATE: "evaluate",
});

const INTEGER_FORMATTER = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

function formatOperand(operand) {
  if (operand == null) return "";
  const [integer, decimal] = operand.split(".");
  return decimal == null
    ? INTEGER_FORMATTER.format(integer)
    : `${INTEGER_FORMATTER.format(integer)}.${decimal}`;
}

function evaluate({ currentOperand, previousOperand, operation }) {
  const prev = parseFloat(previousOperand);
  const current = parseFloat(currentOperand);
  if (isNaN(prev) || isNaN(current)) return "";
  const results = { "+": prev + current, "−": prev - current, "×": prev * current, "÷": prev / current };
  const result = results[operation];
  return result === undefined ? "" : parseFloat(result.toPrecision(12)).toString();
}

function reducer(state, { type, payload }) {
  switch (type) {
    case ACTIONS.ADD_DIGIT: {
      if (state.overwrite) return { ...state, currentOperand: payload.digit, overwrite: false };
      if (payload.digit === "0" && state.currentOperand === "0") return state;
      if (payload.digit === "." && state.currentOperand?.includes(".")) return state;
      if (state.currentOperand?.length >= 12) return state;
      return { ...state, currentOperand: `${state.currentOperand ?? ""}${payload.digit}` };
    }
    case ACTIONS.CHOOSE_OPERATION: {
      if (!state.currentOperand && !state.previousOperand) return state;
      if (!state.currentOperand) return { ...state, operation: payload.operation };
      if (!state.previousOperand) return { ...state, operation: payload.operation, previousOperand: state.currentOperand, currentOperand: null };
      return { ...state, previousOperand: evaluate(state), operation: payload.operation, currentOperand: null };
    }
    case ACTIONS.CLEAR:
      return {};
    case ACTIONS.DELETE_DIGIT: {
      if (state.overwrite) return { ...state, overwrite: false, currentOperand: null };
      if (!state.currentOperand) return state;
      if (state.currentOperand.length === 1) return { ...state, currentOperand: null };
      return { ...state, currentOperand: state.currentOperand.slice(0, -1) };
    }
    case ACTIONS.EVALUATE: {
      if (!state.operation || !state.currentOperand || !state.previousOperand) return state;
      return { ...state, overwrite: true, previousOperand: null, operation: null, currentOperand: evaluate(state) };
    }
    default:
      return state;
  }
}

// ── WebGL Background ──────────────────────────────────────────────────────────

function ThreeBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    if (!gl) return;

    let animId;
    let width, height;

    const resize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      gl.viewport(0, 0, width, height);
    };
    resize();
    window.addEventListener("resize", resize);

    const vsSource = `
      attribute vec2 a_position;
      void main() { gl_Position = vec4(a_position, 0.0, 1.0); }
    `;

    const fsSource = `
      precision highp float;
      uniform vec2 u_resolution;
      uniform float u_time;

      float grid(vec2 uv, float spacing) {
        vec2 g = abs(fract(uv / spacing - 0.5) - 0.5) / fwidth(uv / spacing);
        return 1.0 - min(min(g.x, g.y), 1.0);
      }

      void main() {
        vec2 uv = gl_FragCoord.xy / u_resolution;
        uv.x *= u_resolution.x / u_resolution.y;

        vec3 col = vec3(0.03, 0.03, 0.06);

        vec2 guv = uv * 6.0;
        guv.y += u_time * 0.15;
        col += vec3(0.2, 0.5, 1.0) * grid(guv, 1.0) * 0.07;

        for (int i = 0; i < 4; i++) {
          float fi = float(i);
          vec2 center = vec2(
            0.5 + 0.45 * sin(u_time * 0.3 + fi * 1.7),
            0.5 + 0.35 * cos(u_time * 0.25 + fi * 2.3)
          );
          center.x *= u_resolution.x / u_resolution.y;
          float d = length(uv - center);
          vec3 orbColor = mix(vec3(0.1, 0.4, 1.0), vec3(0.6, 0.1, 0.9), sin(fi * 1.3 + u_time * 0.5) * 0.5 + 0.5);
          col += orbColor * (0.015 / (d * d + 0.001)) * 0.08;
        }

        vec2 vig = uv - vec2(0.5 * u_resolution.x / u_resolution.y, 0.5);
        col *= 1.0 - dot(vig, vig) * 0.8;

        gl_FragColor = vec4(col, 1.0);
      }
    `;

    const compileShader = (src, type) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };

    const prog = gl.createProgram();
    gl.attachShader(prog, compileShader(vsSource, gl.VERTEX_SHADER));
    gl.attachShader(prog, compileShader(fsSource, gl.FRAGMENT_SHADER));
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
    const posLoc = gl.getAttribLocation(prog, "a_position");
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prog, "u_resolution");
    const uTime = gl.getUniformLocation(prog, "u_time");

    const render = (t) => {
      gl.uniform2f(uRes, width, height);
      gl.uniform1f(uTime, t * 0.001);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      animId = requestAnimationFrame(render);
    };
    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas ref={canvasRef} style={{ position: "fixed", inset: 0, width: "100%", height: "100%", zIndex: 0 }} />
  );
}

// ── Ripple Button ─────────────────────────────────────────────────────────────

function useRipple() {
  const ref = useRef(null);
  const handleClick = useCallback((e, cb) => {
    const btn = ref.current;
    const ripple = document.createElement("span");
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    ripple.style.cssText = `
      position:absolute;border-radius:50%;transform:scale(0);
      animation:ripple 0.5s linear;background:rgba(255,255,255,0.25);
      width:${size}px;height:${size}px;
      left:${e.clientX - rect.left - size / 2}px;
      top:${e.clientY - rect.top - size / 2}px;
      pointer-events:none;
    `;
    btn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
    cb?.();
  }, []);
  return { ref, handleClick };
}

// ── App ───────────────────────────────────────────────────────────────────────

function App() {
  const [{ currentOperand, previousOperand, operation }, dispatch] = useReducer(reducer, {});

  useEffect(() => {
    const handler = (e) => {
      if (e.key >= "0" && e.key <= "9") dispatch({ type: ACTIONS.ADD_DIGIT, payload: { digit: e.key } });
      else if (e.key === ".") dispatch({ type: ACTIONS.ADD_DIGIT, payload: { digit: "." } });
      else if (e.key === "+") dispatch({ type: ACTIONS.CHOOSE_OPERATION, payload: { operation: "+" } });
      else if (e.key === "-") dispatch({ type: ACTIONS.CHOOSE_OPERATION, payload: { operation: "−" } });
      else if (e.key === "*") dispatch({ type: ACTIONS.CHOOSE_OPERATION, payload: { operation: "×" } });
      else if (e.key === "/") { e.preventDefault(); dispatch({ type: ACTIONS.CHOOSE_OPERATION, payload: { operation: "÷" } }); }
      else if (e.key === "Enter" || e.key === "=") dispatch({ type: ACTIONS.EVALUATE });
      else if (e.key === "Backspace") dispatch({ type: ACTIONS.DELETE_DIGIT });
      else if (e.key === "Escape") dispatch({ type: ACTIONS.CLEAR });
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const displayValue = formatOperand(currentOperand) || "0";
  const displayFontSize = displayValue.length > 9 ? "1.8rem" : displayValue.length > 6 ? "2.2rem" : "2.8rem";

  const { ref: acRef, handleClick: acClick } = useRipple();
  const { ref: delRef, handleClick: delClick } = useRipple();
  const { ref: eqRef, handleClick: eqClick } = useRipple();

  return (
    <>
      <ThreeBackground />

      <div className="calc-wrapper">
        <div className="calc-label">PRECISION CALCULATOR</div>
        <div className="calc-float">
          <div className="calculator-grid">

            {/* Display */}
            <div className="output">
              <div className="previous-operand">
                {formatOperand(previousOperand)} {operation ?? ""}
              </div>
              <div className="current-operand" style={{ fontSize: displayFontSize }}>
                {displayValue}
              </div>
            </div>

            {/* Row 1 */}
            <button ref={acRef} className="btn btn--action span-two"
              onClick={(e) => acClick(e, () => dispatch({ type: ACTIONS.CLEAR }))}>AC</button>
            <button ref={delRef} className="btn btn--action"
              onClick={(e) => delClick(e, () => dispatch({ type: ACTIONS.DELETE_DIGIT }))}>⌫</button>
            <OperationButton operation="÷" dispatch={dispatch} />

            {/* Digits */}
            <DigitButton digit="7" dispatch={dispatch} />
            <DigitButton digit="8" dispatch={dispatch} />
            <DigitButton digit="9" dispatch={dispatch} />
            <OperationButton operation="×" dispatch={dispatch} />

            <DigitButton digit="4" dispatch={dispatch} />
            <DigitButton digit="5" dispatch={dispatch} />
            <DigitButton digit="6" dispatch={dispatch} />
            <OperationButton operation="−" dispatch={dispatch} />

            <DigitButton digit="1" dispatch={dispatch} />
            <DigitButton digit="2" dispatch={dispatch} />
            <DigitButton digit="3" dispatch={dispatch} />
            <OperationButton operation="+" dispatch={dispatch} />

            <DigitButton digit="." dispatch={dispatch} />
            <DigitButton digit="0" dispatch={dispatch} />
            <button ref={eqRef} className="btn btn--equals span-two"
              onClick={(e) => eqClick(e, () => dispatch({ type: ACTIONS.EVALUATE }))}>＝</button>
          </div>
        </div>
        <div className="calc-hint">Keyboard supported · Esc to clear</div>
      </div>
    </>
  );
}

export default App;