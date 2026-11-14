import Component from "../core/Component.js";
import type UIElement from "./UIElement.js";

export type UIPointer = {
    /** Pointer x in game-canvas pixels. */
    x: number;
    /** Pointer y in game-canvas pixels. */
    y: number;
    /** Mouse button (0 left, 1 middle, 2 right), or -1 for hover events. */
    button: number;
};

/**
 * Root of a UI hierarchy. Adds a RectTransform to its GameObject if it doesn't have one.
 * Its rect always covers the whole game canvas (its own anchors and sizeDelta are ignored).
 * Lays out the children inside it, renders the tree in order and dispatches
 * pointer events to the elements through notify():
 * "pointerenter", "pointerexit", "pointerdown", "pointerup", "click" (all with a UIPointer).
 */
export default class UICanvas extends Component {
    constructor();

    /** Elements in render order (back to front). Rebuilt every frame. */
    readonly elements: UIElement[];
    /** Raycast target currently under the pointer. */
    readonly hovered: UIElement | null;
    /** Element the pointer was pressed down on, until release. */
    readonly pressed: UIElement | null;
    /** Last known pointer position in game-canvas pixels. */
    readonly pointer: { x: number; y: number };

    /** Returns the topmost raycast target at a canvas-space point, or null. */
    raycast(x: number, y: number): UIElement | null;

    awake(): void;
    start(): void;
    lateUpdate(): void;
    onDestroy(): void;
}