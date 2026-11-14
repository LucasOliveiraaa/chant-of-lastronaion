import type Transform from "../core/Transform.js";
import type Vector2 from "../math/Vector2.js";

export type Rect = {
    x: number;
    y: number;
    w: number;
    h: number;
};

export default class RectTransform extends Transform {
    /** Point of the element (0 to 1) that anchoredPosition refers to. */
    pivot: Vector2;
    /** Top-left corner of the anchor area, as a fraction of the parent's rect. */
    anchorMin: Vector2;
    /** Bottom-right corner of the anchor area, as a fraction of the parent's rect. */
    anchorMax: Vector2;
    /** Position of the pivot relative to its point in the anchor area. Y points down. */
    anchoredPosition: Vector2;
    /** Size relative to the anchor area: the size itself when the anchors coincide. */
    sizeDelta: Vector2;

    /** Absolute screen-space rect, valid after layout(). */
    readonly rect: Rect;

    /** Set by a layout component to place the children before they are laid out. */
    onLayoutChildren: (() => void) | null;

    updateRect(parentRect: Rect): void;

    /** Updates this rect, lets the layout hook place the children, then recurses. */
    layout(parentRect: Rect): void;

    /** Lays out the children against the current rect, without recomputing it. */
    layoutChildren(): void;
}