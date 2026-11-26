import type Component from "../core/Component.js";
import type GameObject from "../core/GameObject.js";
import type AABB from "../math/AABB.js";
import type Vector2 from "../math/Vector2.js";
import type Rigidbody from "./Rigidbody.js";

export type ColliderType = "square" | "circle";

export default class Collider extends Component {
    static readonly SQUARE: "square";
    static readonly CIRCLE: "circle";

    type: ColliderType;

    /** Draws the collider as a gizmo. Default false. */
    debug: boolean;
    /** Gizmo color. Default null: lime for triggers, red otherwise. */
    dbgColor: string | null;

    /** Local to the transform: it turns with the rotation. Default (0, 0). */
    offset: Vector2;
    /** Detects overlaps (onTriggerEnter/Stay/Exit) without a physical response. Default false. */
    isTrigger: boolean;

    /** Square only. A component <= 0 uses the transform's scale. Default (-1, -1). */
    size: Vector2;
    /** Circle only. Default 0. */
    radius: number;

    readonly isCircle: boolean;

    /** The Rigidbody on the same GameObject, or null. */
    readonly attachedRigidbody: Rigidbody | null;

    /** World-space center: the transform's world center plus the rotated offset. */
    getCenter(obj: GameObject): Vector2;
    /** Full extents: the square's resolved size, or the circle's diameter on both axes. */
    getSize(obj: GameObject): Vector2;
    /** World-space corners of the rotated square (or the box around the circle), clockwise from the top-left. */
    getCorners(obj: GameObject): Vector2[];
    /** World-space box around the collider. */
    getBounds(obj: GameObject): AABB;

    /** @internal */
    protected readonly gizmoColor: string;
}
