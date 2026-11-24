import Component from "../core/Component.js";
import Vector2 from "../math/Vector2.js";
import Rigidbody from "./Rigidbody.js";

// Unity's Collider2D: the shared base of SquareCollider and CircleCollider. Not added on its
// own; getComponent(Collider) finds either shape.
export default class Collider extends Component {
    debug = false;
    dbgColor = null;

    // Local to the transform, so it turns with the rotation.
    offset = new Vector2(0, 0);
    // Detects overlaps (onTriggerX) without a physical response.
    isTrigger = false;

    get attachedRigidbody() {
        return this.gameObject?.getComponent(Rigidbody) ?? null;
    }

    getCenter(obj) {
        const { transform } = obj;
        return transform.worldCenter.add(this.offset.rotate(transform.worldRotation));
    }

    getBounds(obj) {
        throw new Error(`${this.constructor.name} must implement getBounds.`);
    }

    get gizmoColor() {
        return this.dbgColor ?? (this.isTrigger ? "lime" : "red");
    }
}
