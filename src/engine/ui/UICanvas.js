import Component from "../core/Component.js";
import World from "../core/World.js";
import RectTransform from "./RectTransform.js";
import UIElement from "./UIElement.js";

/**
 * Root of a UI hierarchy. Adds a RectTransform to its GameObject if it doesn't have one.
 *
 * Every frame (lateUpdate) it:
 *   1. sizes its own rect to the game canvas and lays out the children inside it,
 *   2. renders every UIElement in tree order (parents first, later siblings on top),
 *   3. keeps its element list ready for pointer hit-testing (topmost first).
 *
 * Pointer events are translated to events on the elements via notify():
 *   "pointerenter", "pointerexit", "pointerdown", "pointerup", "click"
 * each called with a pointer object: { x, y, button }.
 */
export default class UICanvas extends Component {
    constructor() {
        super();

        /** @type {UIElement[]} Elements in render order (back to front). */
        this.elements = [];
        /** @type {UIElement | null} */
        this.hovered = null;
        /** @type {UIElement | null} */
        this.pressed = null;

        /** Pointer position in canvas pixels. */
        this.pointer = { x: 0, y: 0 };

        this._domCanvas = null;
        this._listening = false;

        this._onMove = this._onMove.bind(this);
        this._onDown = this._onDown.bind(this);
        this._onUp = this._onUp.bind(this);
        this._onLeave = this._onLeave.bind(this);
    }

    // Like Unity's [RequireComponent(typeof(RectTransform))]: adds one if missing.
    awake() {
        if (!(this.gameObject.transform instanceof RectTransform)) {
            this.gameObject.addComponent(RectTransform);
        }
    }

    start() {
        this.transform = this.gameObject.transform;

        this._domCanvas = World.getInstance().canvas;
        this._domCanvas.addEventListener("pointermove", this._onMove);
        this._domCanvas.addEventListener("pointerdown", this._onDown);
        window.addEventListener("pointerup", this._onUp);
        this._domCanvas.addEventListener("pointerleave", this._onLeave);
        this._listening = true;
    }

    lateUpdate() {
        const world = World.getInstance();
        const canvas = world.canvas;
        const ctx = world.ctx;

        // Like a Screen Space - Overlay canvas, the root always covers the whole screen;
        // its own anchors and sizeDelta are ignored.
        const root = this.transform.rect;
        root.x = 0;
        root.y = 0;
        root.w = canvas.width;
        root.h = canvas.height;
        this.transform.layoutChildren();

        this.elements.length = 0;
        this._collect(this.transform);

        // Drop references to elements that left the tree.
        if (this.hovered && !this.elements.includes(this.hovered)) this.hovered = null;
        if (this.pressed && !this.elements.includes(this.pressed)) this.pressed = null;

        // Layout may have moved things under a stationary pointer.
        this._updateHover();

        for (const element of this.elements) {
            ctx.save();
            element.render(ctx);
            ctx.restore();
        }
    }

    onDestroy() {
        if (!this._listening) return;
        this._domCanvas.removeEventListener("pointermove", this._onMove);
        this._domCanvas.removeEventListener("pointerdown", this._onDown);
        window.removeEventListener("pointerup", this._onUp);
        this._domCanvas.removeEventListener("pointerleave", this._onLeave);
        this._domCanvas.style.cursor = "";
        this._listening = false;
        this.hovered = null;
        this.pressed = null;
    }

    /**
     * Returns the topmost raycast target at the given canvas-space point, or null.
     * Any raycast target blocks the elements behind it, even if it does nothing.
     */
    raycast(x, y) {
        for (let i = this.elements.length - 1; i >= 0; i--) {
            const el = this.elements[i];
            if (!el.raycastTarget) continue;
            const r = el.rect;
            if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) return el;
        }
        return null;
    }

    // ---- internals -------------------------------------------------------

    /** Pre-order walk: parent first, children in order. */
    _collect(transform) {
        // Every element on the object, in the order they were added (e.g. a UISprite then a UILabel).
        const elements = transform.gameObject?.getComponents(UIElement) ?? [];
        for (const element of elements) this.elements.push(element);

        const children = transform.children ?? [];
        for (const child of children) this._collect(child);
    }

    _toCanvasPoint(e) {
        const canvas = this._domCanvas;
        const box = canvas.getBoundingClientRect();
        return {
            x: (e.clientX - box.left) * (canvas.width / box.width),
            y: (e.clientY - box.top) * (canvas.height / box.height),
        };
    }

    _updateHover() {
        const target = this.raycast(this.pointer.x, this.pointer.y);
        if (target === this.hovered) return;

        const info = { ...this.pointer, button: -1 };
        if (this.hovered) this.hovered.notify("pointerexit", info);
        this.hovered = target;
        if (target) target.notify("pointerenter", info);

        if (this._domCanvas) {
            this._domCanvas.style.cursor = target?.cursor ?? "";
        }
    }

    _onMove(e) {
        this.pointer = this._toCanvasPoint(e);
        this._updateHover();
    }

    _onDown(e) {
        this.pointer = this._toCanvasPoint(e);
        this._updateHover();

        const target = this.hovered;
        this.pressed = target;
        if (target) target.notify("pointerdown", { ...this.pointer, button: e.button });
    }

    _onUp(e) {
        this.pointer = this._toCanvasPoint(e);
        this._updateHover();

        const pressed = this.pressed;
        this.pressed = null;
        if (!pressed) return;

        const info = { ...this.pointer, button: e.button };
        pressed.notify("pointerup", info);
        // A click is a press and release on the same element.
        if (pressed === this.hovered) pressed.notify("click", info);
    }

    _onLeave() {
        this.pointer = { x: -Infinity, y: -Infinity };
        this._updateHover();
    }
}