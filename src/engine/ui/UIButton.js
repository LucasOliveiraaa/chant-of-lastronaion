import UIElement from "./UIElement.js";

/**
 * A clickable rounded rectangle with a centered text label.
 * Fires "click" (via notify/on) and calls onClick when pressed and released on it.
 */
export default class UIButton extends UIElement {
    constructor() {
        super();

        this.raycastTarget = true;
        this.interactable = true;
        /** Cursor the canvas shows while hovering (read by UICanvas). */
        this.cursor = "pointer";

        this.label = "Button";
        this.fontSize = 16;
        this.fontFamily = "sans-serif";
        this.textColor = "#ffffff";

        this.normalColor = "#3b82f6";
        this.hoverColor = "#60a5fa";
        this.pressedColor = "#2563eb";
        this.disabledColor = "#6b7280";
        this.disabledTextColor = "#d1d5db";

        this.borderColor = "#000000";
        this.borderWidth = 0;
        this.cornerRadius = 6;

        /** @type {((pointer: object) => void) | null} */
        this.onClick = null;

        this._hovered = false;
        this._pressed = false;

        this.on("pointerenter", () => { this._hovered = true; });
        this.on("pointerexit", () => { this._hovered = false; });
        this.on("pointerdown", (pointer) => {
            if (this.interactable && pointer.button === 0) this._pressed = true;
        });
        this.on("pointerup", () => { this._pressed = false; });
        this.on("click", (pointer) => {
            if (!this.interactable || pointer.button !== 0) return;
            if (this.onClick) this.onClick(pointer);
        });
    }

    /** "disabled" | "pressed" | "hover" | "normal" */
    get state() {
        if (!this.interactable) return "disabled";
        if (this._pressed && this._hovered) return "pressed";
        if (this._hovered) return "hover";
        return "normal";
    }

    render(graphics) {
        const { x, y, w, h } = this.rect;
        const state = this.state;

        const fill = {
            disabled: this.disabledColor,
            pressed: this.pressedColor,
            hover: this.hoverColor,
            normal: this.normalColor,
        }[state];

        graphics.fillRoundRect(x, y, w, h, this.cornerRadius, fill);

        if (this.borderWidth > 0) {
            graphics.strokeRoundRect(x, y, w, h, this.cornerRadius, this.borderColor, this.borderWidth);
        }

        if (this.label) {
            graphics.drawText(this.label, x + w / 2, y + h / 2, {
                font: `${this.fontSize}px ${this.fontFamily}`,
                color: state === "disabled" ? this.disabledTextColor : this.textColor,
                align: "center",
                baseline: "middle",
                maxWidth: w,
            });
        }
    }
}