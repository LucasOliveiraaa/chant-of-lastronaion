import UIElement from "./UIElement.js";
import type { UIPointer } from "./UICanvas.js";

export type UIButtonState = "normal" | "hover" | "pressed" | "disabled";

/**
 * A clickable rounded rectangle with a centered text label.
 * Emits "click" (UIPointer) through on()/notify() and calls onClick.
 */
export default class UIButton extends UIElement {
    constructor();

    /** When false the button is drawn disabled and ignores clicks (it still blocks raycasts). */
    interactable: boolean;
    /** CSS cursor the canvas shows while the pointer is over the button. */
    cursor: string;

    label: string;
    fontSize: number;
    fontFamily: string;
    textColor: string;

    normalColor: string;
    hoverColor: string;
    pressedColor: string;
    disabledColor: string;
    disabledTextColor: string;

    borderColor: string;
    /** Border thickness in pixels; 0 draws no border. */
    borderWidth: number;
    cornerRadius: number;

    /** Called on a left-button press and release over the button. */
    onClick: ((pointer: UIPointer) => void) | null;

    readonly state: UIButtonState;

    render(ctx: CanvasRenderingContext2D): void;
}