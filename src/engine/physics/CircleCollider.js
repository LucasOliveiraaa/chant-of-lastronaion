import Collider from "./Collider.js";
import Vector2 from "../math/Vector2.js";
import AABB from "../math/AABB.js";

export default class CircleCollider extends Collider {
    radius = 0;

    getBounds(obj) {
        const c = this.getCenter(obj);
        return new AABB(
            new Vector2(c.x - this.radius, c.y - this.radius),
            new Vector2(c.x + this.radius, c.y + this.radius)
        );
    }

    // The line from the center shows the rotation.
    onDrawGizmos(graphics) {
        if (!this.debug) return;

        const color = this.gizmoColor;
        const c = this.getCenter(this.gameObject);
        const edge = new Vector2(this.radius, 0).rotate(this.gameObject.transform.worldRotation).add(c);
        graphics.strokeCircle(c.x, c.y, this.radius, color);
        graphics.drawLine(c.x, c.y, edge.x, edge.y, color);
    }
}
