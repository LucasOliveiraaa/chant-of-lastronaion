import type Graphics from "./Graphics.js";

/**
 * Draws the frame after lateUpdate(), in passes:
 * 1. every enabled Renderer on screen, sorted by sortingLayer, then sortingOrder,
 * 2. lighting, over what the renderers drew,
 * 3. gizmos: onDrawGizmos(graphics) of any started component, unlit and in screen space,
 * 4. UI canvases, on top of everything.
 */
export default class RenderingEngine {
    /** Created on the first frame. */
    readonly graphics: Graphics | null;
    /** Calls onDrawGizmos on components. Default true. */
    drawGizmos: boolean;
    /** Skips renderers whose bounds are outside the screen. Default true. */
    culling: boolean;

    /** @internal Called by World every frame. */
    render(): void;
}
