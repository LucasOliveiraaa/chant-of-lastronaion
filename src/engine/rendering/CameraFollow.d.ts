import type Component from "../core/Component.js";
import type Transform from "../core/Transform.js";
import type Vector2 from "../math/Vector2.js";
import type AABB from "../math/AABB.js";

/**
 * Moves its GameObject (the one with the Camera) so the view keeps a target in frame,
 * like a Cinemachine follow camera. Runs in lateUpdate, after the target has moved.
 * Don't put it on the target itself.
 */
export default class CameraFollow extends Component {
    /** The transform to follow (its world center). null stays in place. */
    target: Transform | null;
    /** Added to the target's center, in world pixels. Default (0, 0). */
    offset: Vector2;
    /** Roughly the seconds it takes to catch up; 0 sticks to the target. Default 0.15. */
    damping: number;
    /** Half size, in world pixels, of the box around the view center the target moves in without moving the camera. Default (0, 0). */
    deadZone: Vector2;
    /** World area the view is kept inside (centered when the view is larger), or null. Default null. */
    bounds: AABB | null;

    /** Jumps to the target right away, e.g. after a teleport. Also called on start. */
    snap(): void;
}
