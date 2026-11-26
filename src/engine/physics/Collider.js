import Component from "../core/Component.js";
import Vector2 from "../math/Vector2.js";
import AABB from "../math/AABB.js";
import Rigidbody from "./Rigidbody.js";

export default class Collider extends Component {
    static SQUARE = "square";
    static CIRCLE = "circle";

    type = Collider.SQUARE;

    debug = false;
    dbgColor = null;

    offset = new Vector2(0, 0);
    isTrigger = false;

    // Square only. <= 0 uses the object's scale.
    size = new Vector2(-1, -1);
    // Circle only.
    radius = 0;

    get isCircle() {
        return this.type === Collider.CIRCLE;
    }

    get attachedRigidbody() {
        return this.gameObject?.getComponent(Rigidbody) ?? null;
    }

    getCenter(obj) {
        const { transform } = obj;
        return transform.worldCenter.add(this.offset.rotate(transform.worldRotation));
    }

    getSize(obj) {
        if (this.isCircle) return new Vector2(this.radius * 2, this.radius * 2);

        const { scale } = obj.transform;
        return new Vector2(
            this.size.x > 0 ? this.size.x : scale.x,
            this.size.y > 0 ? this.size.y : scale.y
        );
    }

    // Clockwise from the top-left.
    getCorners(obj) {
        const center = this.getCenter(obj);
        const half = this.getSize(obj).divide(2);
        const rotation = obj.transform.worldRotation;

        return [
            new Vector2(-half.x, -half.y),
            new Vector2(half.x, -half.y),
            new Vector2(half.x, half.y),
            new Vector2(-half.x, half.y),
        ].map(corner => corner.rotate(rotation).add(center));
    }

    getBounds(obj) {
        if (this.isCircle) {
            const c = this.getCenter(obj);
            return new AABB(
                new Vector2(c.x - this.radius, c.y - this.radius),
                new Vector2(c.x + this.radius, c.y + this.radius)
            );
        }

        const corners = this.getCorners(obj);
        const xs = corners.map(corner => corner.x);
        const ys = corners.map(corner => corner.y);

        return new AABB(
            new Vector2(Math.min(...xs), Math.min(...ys)),
            new Vector2(Math.max(...xs), Math.max(...ys))
        );
    }

    get gizmoColor() {
        return this.dbgColor ?? (this.isTrigger ? "lime" : "red");
    }

    onDrawGizmos(graphics) {
        if (!this.debug) return;

        const color = this.gizmoColor;
        if (!this.isCircle) {
            graphics.strokePolygon(this.getCorners(this.gameObject), color);
            return;
        }

        const c = this.getCenter(this.gameObject);
        const edge = new Vector2(this.radius, 0).rotate(this.gameObject.transform.worldRotation).add(c);
        graphics.strokeCircle(c.x, c.y, this.radius, color);
        graphics.drawLine(c.x, c.y, edge.x, edge.y, color);
    }
}
