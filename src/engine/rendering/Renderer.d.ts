import type Component from "../core/Component.js";
import type AABB from "../math/AABB.js";
import type Graphics from "./Graphics.js";

/**
 * Base of everything drawn in the world (Unity's Renderer). Subclasses override render(),
 * which the RenderingEngine calls once per frame after lateUpdate().
 */
export default class Renderer extends Component {
    /** Skipped by the RenderingEngine when false. Default true. */
    enabled: boolean;
    /**
     * Unity's Sorting Layer, as a number (see SortingLayer for named ones). Renderers on a
     * higher layer are drawn on top, whatever their sortingOrder. Default 0 (SortingLayer.DEFAULT).
     */
    sortingLayer: number;
    /** Order within the sorting layer: higher is drawn on top; ties keep the scene order. Default 0. */
    sortingOrder: number;

    /** World-space box around the rotated rect. Renderers outside the screen aren't drawn. */
    readonly bounds: AABB;

    /**
     * Draws in the transform's rect space: (0, 0) is the rect's top-left corner,
     * (scale.x, scale.y) its bottom-right, and the rotation is already applied.
     * alpha starts at 1 for every renderer.
     */
    render(graphics: Graphics): void;
}
