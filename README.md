# ◈ Precision Calculator

A React calculator with a live WebGL shader background, 3D floating animations, ripple interactions, and full keyboard support.

![React](https://img.shields.io/badge/React-18-61dafb?style=flat-square&logo=react)
![WebGL](https://img.shields.io/badge/WebGL-1.0-990000?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)

---

## Preview

> Dark glass calculator shell floating over an animated WebGL background — perspective grid + drifting color orbs, all rendered on the GPU with no external 3D library.

---

## Features

- **WebGL background** — custom GLSL fragment shader renders a scrolling perspective grid and animated glowing orbs in real time
- **3D float animation** — the calculator gently bobs and tilts using CSS `perspective` + `rotateX`
- **Ripple feedback** — buttons emit a physical ripple on every click
- **Keyboard support** — full operation via keyboard (see [Shortcuts](#keyboard-shortcuts))
- **Floating-point precision** — results are rounded via `toPrecision(12)` to avoid `0.1 + 0.2` style noise
- **Input guards** — digit cap at 12 characters, duplicate decimal prevention, leading-zero protection
- **Glassmorphism UI** — `backdrop-filter` blur panels with layered box shadows and inset highlights

---

## Getting Started

### Prerequisites

- Node.js ≥ 16
- npm ≥ 8

### Install & run

```bash
git clone https://github.com/your-username/react-calculator.git
cd react-calculator
npm install
npm start
```

App opens at `http://localhost:3000`.

### Build for production

```bash
npm run build
```

Output is in `/build`, ready to deploy to any static host (Vercel, Netlify, GitHub Pages, etc.).

---

## Project Structure

```
src/
├── App.js            # State machine (useReducer), WebGL canvas, root layout
├── DigitButton.js    # Digit button component
├── OperationButton.js # Operator button component
└── styles.css        # All visual styles, animations, and theme variables
```

### Key files

| File | Responsibility |
|---|---|
| `App.js` | `reducer` logic, `ThreeBackground` WebGL component, keyboard handler, layout |
| `styles.css` | Button variants, display, glass shell, keyframe animations |
| `DigitButton.js` | Dispatches `ADD_DIGIT` action |
| `OperationButton.js` | Dispatches `CHOOSE_OPERATION` action |

---

## Keyboard Shortcuts

| Key | Action |
|---|---|
| `0` – `9` | Input digit |
| `.` | Decimal point |
| `+` `-` `*` `/` | Choose operation |
| `Enter` or `=` | Evaluate |
| `Backspace` | Delete last digit |
| `Escape` | Clear all (AC) |

---

## How the WebGL Background Works

`ThreeBackground` sets up a raw WebGL 1.0 context on a full-screen `<canvas>` — no Three.js or external library. It compiles two GLSL shaders at runtime:

- **Vertex shader** — draws a full-screen quad (two triangles covering clip space)
- **Fragment shader** — runs per-pixel each frame, computing:
  1. A perspective grid via `fwidth`-based anti-aliased line drawing
  2. Four drifting orbs using distance-based inverse-square falloff
  3. A radial vignette

Two uniforms are updated each animation frame via `requestAnimationFrame`:

```glsl
uniform vec2 u_resolution; // canvas dimensions for aspect correction
uniform float u_time;      // elapsed seconds, drives all motion
```

The canvas sits behind the UI at `z-index: 0` and is properly cleaned up on component unmount.

---

## State Machine

The calculator uses `useReducer` with five actions:

```
ADD_DIGIT        → append digit to currentOperand
CHOOSE_OPERATION → snapshot currentOperand into previousOperand, set operator
EVALUATE         → compute result, set overwrite flag
DELETE_DIGIT     → remove last character from currentOperand
CLEAR            → reset to empty state {}
```

The `overwrite` flag causes the next digit input to replace the display rather than append — standard calculator behaviour after hitting `=`.

---

## Customisation

### Change the color accent

The indigo accent (`#6366f1` / `rgba(99,102,241,...)`) appears in `styles.css` on `.btn--operation`, `.btn--equals`, and the display glow. Find-and-replace those values to re-theme in seconds.

### Adjust the grid speed

In `App.js`, inside the fragment shader string:

```glsl
guv.y += u_time * 0.15; /* increase for faster scroll */
```

### Change orb count

Modify the loop in the fragment shader:

```glsl
for (int i = 0; i < 4; i++) { /* change 4 to any value */
```

---

## Browser Support

Requires WebGL 1.0 and `backdrop-filter` support. Works in all modern browsers (Chrome, Firefox, Safari, Edge). Falls back gracefully to a dark solid background if WebGL is unavailable.

---

Built with care and lots of ☕ — Happy Coding!