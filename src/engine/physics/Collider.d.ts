import type Component from "../core/Component.js";
import type GameObject from "../core/GameObject.js";
import type AABB from "../math/AABB.js";
import type Vector2 from "../math/Vector2.js";
import type Rigidbody from "./Rigidbody.js";

/**
 * Unity's Collider2D: the shared base of SquareCollider and CircleCollider. Not added on its
 * own; `getComponent(Collider)` finds either shape.
 */
export default abstract class Collider extends Component {
    /** Draws the collider as a gizmo. Default false. */
    debug: boolean;
    /** Gizmo color. Default null: lime for triggers, red otherwise. */
    dbgColor: string | null;

    /** Local to the transform: it turns with the rotation. Default (0, 0). */
    offset: Vector2;
    /** Detects overlaps (onTriggerEnter/Stay/Exit) without a physical response. Default false. */
    isTrigger: boolean;

    /** The Rigidbody on the same GameObject, or null. */
    readonly attachedRigidbody: Rigidbody | null;

    /** World-space center: the transform's world center plus the rotated offset. */
    getCenter(obj: GameObject): Vector2;
    /** World-space box around the collider. */
    abstract getBounds(obj: GameObject): AABB;

    /** @internal */
    protected readonly gizmoColor: string;
}
