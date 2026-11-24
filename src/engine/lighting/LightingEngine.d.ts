/**
 * Lights the frame with every started Light2D: the lights are added on a black lightmap,
 * which then multiplies what the Renderers drew. Does nothing when there are no lights.
 */
export default class LightingEngine {
    /** @internal Called by the RenderingEngine after the Renderers, with the camera's world to screen matrix. */
    render(view?: number[]): void;
}
