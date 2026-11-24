import type Component from "../core/Component.js";
import type Vector2 from "../math/Vector2.js";
import type AABB from "../math/AABB.js";

/**
 * Unity's orthographic Camera. The view is centered on the transform's world center and turns
 * with its world rotation. Only Camera.main is drawn with; without any camera the world is
 * drawn 1:1 with (0, 0) at the screen's top-left. UI is always in screen space.
 */
export default class Camera extends Component {
    /** The first started, enabled camera, or null. */
    static readonly main: Camera | null;

    /** Skipped by Camera.main when false. Default true. */
    enabled: boolean;
    /** Screen pixels per world pixel; 2 shows everything twice as big. Default 1. */
    zoom: number;
    /** CSS color drawn behind the world, unlit. null leaves the canvas transparent. Default null. */
    backgroundColor: string | null;

    /** Size of the visible area in world pixels. */
    readonly viewSize: Vector2;
    /** World-space box around the visible area, rotation included. */
    readonly viewBounds: AABB;

    /** Shakes the view by up to magnitude screen pixels, fading out over duration seconds. A weaker shake doesn't cut a stronger one short. */
    shake(magnitude: number, duration: number): void;

    worldToScreenPoint(point: Vector2): Vector2;
    /** E.g. camera.screenToWorldPoint(Input.mousePosition). */
    screenToWorldPoint(point: Vector2): Vector2;

    /** @internal World to screen matrix [a, b, c, d, e, f], used by the RenderingEngine. */
    __viewMatrix(): number[];
}
