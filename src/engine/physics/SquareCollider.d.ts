import type Collider from "./Collider.js";
import type GameObject from "../core/GameObject.js";
import type AABB from "../math/AABB.js";
import type Vector2 from "../math/Vector2.js";

export default class SquareCollider extends Collider {
    /** A component <= 0 uses the transform's scale. Default (-1, -1). */
    size: Vector2;

    getSize(obj: GameObject): Vector2;
    /** World-space corners of the rotated square, clockwise from the top-left. */
    getCorners(obj: GameObject): Vector2[];
    /** World-space box around the rotated collider. */
    getBounds(obj: GameObject): AABB;
}
