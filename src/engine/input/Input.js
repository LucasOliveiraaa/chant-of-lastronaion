import Vector2 from "../math/Vector2.js";

// DOM numbers buttons left/middle/right as 0/1/2; Unity uses 0/1/2 for left/right/middle.
const DOM_TO_UNITY_BUTTON = { 0: 0, 1: 2, 2: 1 };

const DEFAULT_AXES = {
    Horizontal: { negative: ["KeyA", "ArrowLeft"], positive: ["KeyD", "ArrowRight"] },
    Vertical: { negative: ["KeyW", "ArrowUp"], positive: ["KeyS", "ArrowDown"] },
};

/**
 * Static, like Unity's (legacy) Input. Keys use KeyboardEvent.code names ("KeyW", "Space", "ArrowUp").
 *
 * "Down"/"Up" queries are true for the whole frame in which the change happened.
 * Events are buffered and applied at the start of each frame, so a quick tap that
 * goes down and up between two frames still reports getKeyDown, then getKeyUp.
 */
export default class Input {
    static #canvas = null;

    static #held = new Set();
    static #down = new Set();
    static #up = new Set();
    static #pendingDown = new Set();
    static #pendingUp = new Set();

    static #buttonsHeld = new Set();
    static #buttonsDown = new Set();
    static #buttonsUp = new Set();
    static #pendingButtonsDown = new Set();
    static #pendingButtonsUp = new Set();

    static #mousePosition = new Vector2(0, 0);
    static #scrollDelta = new Vector2(0, 0);
    static #pendingScroll = new Vector2(0, 0);

    static #axes = new Map(Object.entries(DEFAULT_AXES));
    static #axisValues = new Map();

    // ---- Keyboard -------------------------------------------------------

    /** True while any of the keys is held. */
    static getKey(...keys) {
        return keys.some((key) => Input.#held.has(key));
    }

    /** True during the frame any of the keys was pressed. */
    static getKeyDown(...keys) {
        return keys.some((key) => Input.#down.has(key));
    }

    /** True during the frame any of the keys was released. */
    static getKeyUp(...keys) {
        return keys.some((key) => Input.#up.has(key));
    }

    static get anyKey() {
        return Input.#held.size > 0 || Input.#buttonsHeld.size > 0;
    }

    static get anyKeyDown() {
        return Input.#down.size > 0 || Input.#buttonsDown.size > 0;
    }

    // ---- Mouse ----------------------------------------------------------

    /** 0 left, 1 right, 2 middle (Unity's numbering). */
    static getMouseButton(button) {
        return Input.#buttonsHeld.has(button);
    }

    static getMouseButtonDown(button) {
        return Input.#buttonsDown.has(button);
    }

    static getMouseButtonUp(button) {
        return Input.#buttonsUp.has(button);
    }

    /** Pointer position in canvas pixels, origin at the top-left (y points down, like the UI). */
    static get mousePosition() {
        return Input.#mousePosition.clone();
    }

    /** Wheel notches this frame; y is positive when scrolling up (Unity's convention). */
    static get mouseScrollDelta() {
        return Input.#scrollDelta.clone();
    }

    // ---- Axes -----------------------------------------------------------

    /**
     * Axis value from -1 to 1. Without sensitivity in its config it equals getAxisRaw;
     * with it, the value ramps towards the input like Unity's smoothed axes.
     * "Horizontal" (A/D, arrows) and "Vertical" (W/S, arrows; down is positive) exist by default.
     */
    static getAxis(axisName) {
        const config = Input.#axes.get(axisName);
        if (!config) return 0;
        if (!(config.sensitivity > 0)) return Input.getAxisRaw(axisName);
        return Input.#axisValues.get(axisName) ?? 0;
    }

    /** -1, 0 or 1, with no smoothing. */
    static getAxisRaw(axisName) {
        const config = Input.#axes.get(axisName);
        if (!config) return 0;

        let value = 0;
        if (Input.getKey(...config.positive)) value += 1;
        if (Input.getKey(...config.negative)) value -= 1;
        return value;
    }

    static setAxisConfig(axisName, config) {
        Input.#axes.set(axisName, config);
        Input.#axisValues.delete(axisName);
    }

    // ---- Engine internals ----------------------------------------------

    static __init(canvas) {
        if (Input.#canvas) return;
        Input.#canvas = canvas;

        canvas.addEventListener("mousedown", (event) => {
            const button = DOM_TO_UNITY_BUTTON[event.button] ?? event.button;
            Input.#pendingButtonsDown.add(button);
            Input.#setMousePosition(event);
        });
        window.addEventListener("mouseup", (event) => {
            Input.#pendingButtonsUp.add(DOM_TO_UNITY_BUTTON[event.button] ?? event.button);
        });
        window.addEventListener("mousemove", (event) => Input.#setMousePosition(event));
        canvas.addEventListener("wheel", (event) => {
            Input.#pendingScroll.x -= Math.sign(event.deltaX);
            Input.#pendingScroll.y -= Math.sign(event.deltaY);
        }, { passive: true });
        // Right click is a game button, not a browser menu.
        canvas.addEventListener("contextmenu", (event) => event.preventDefault());

        window.addEventListener("keydown", (event) => {
            if (event.repeat) return;
            Input.#pendingDown.add(event.code);
        });
        window.addEventListener("keyup", (event) => {
            Input.#pendingUp.add(event.code);
        });
        // Keys released while the page is unfocused never send keyup.
        window.addEventListener("blur", () => {
            for (const key of Input.#held) Input.#pendingUp.add(key);
            for (const button of Input.#buttonsHeld) Input.#pendingButtonsUp.add(button);
        });
    }

    // Applies the events buffered since the last frame. Called by World before any update.
    static __beginFrame(unscaledDeltaTime = 0) {
        Input.#applyPending(Input.#held, Input.#down, Input.#up, Input.#pendingDown, Input.#pendingUp);
        Input.#applyPending(
            Input.#buttonsHeld, Input.#buttonsDown, Input.#buttonsUp,
            Input.#pendingButtonsDown, Input.#pendingButtonsUp
        );

        Input.#scrollDelta.set(Input.#pendingScroll.x, Input.#pendingScroll.y);
        Input.#pendingScroll.set(0, 0);

        Input.#updateSmoothedAxes(unscaledDeltaTime);
    }

    static #applyPending(held, down, up, pendingDown, pendingUp) {
        down.clear();
        up.clear();

        for (const key of pendingDown) {
            if (!held.has(key)) down.add(key);
            held.add(key);
        }
        pendingDown.clear();

        // A tap that went down and up between two frames reports Down this frame
        // and Up the next one, so neither query misses it.
        const deferred = [];
        for (const key of pendingUp) {
            if (down.has(key)) {
                deferred.push(key);
            } else if (held.delete(key)) {
                up.add(key);
            }
        }
        pendingUp.clear();
        for (const key of deferred) pendingUp.add(key);
    }

    static #updateSmoothedAxes(dt) {
        for (const [name, config] of Input.#axes) {
            if (!(config.sensitivity > 0)) continue;

            const target = Input.getAxisRaw(name);
            let value = Input.#axisValues.get(name) ?? 0;

            if (config.snap && target !== 0 && Math.sign(target) !== Math.sign(value)) {
                value = 0;
            }

            if (target !== 0) {
                const step = config.sensitivity * dt;
                value = target > value ? Math.min(target, value + step) : Math.max(target, value - step);
            } else {
                const step = (config.gravity ?? config.sensitivity) * dt;
                value = value > 0 ? Math.max(0, value - step) : Math.min(0, value + step);
            }

            Input.#axisValues.set(name, value);
        }
    }

    static #setMousePosition(event) {
        const canvas = Input.#canvas;
        const box = canvas.getBoundingClientRect();
        Input.#mousePosition.set(
            (event.clientX - box.left) * (canvas.width / (box.width || 1)),
            (event.clientY - box.top) * (canvas.height / (box.height || 1))
        );
    }
}
