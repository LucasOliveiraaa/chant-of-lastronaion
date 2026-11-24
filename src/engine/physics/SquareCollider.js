import Collider from "./Collider.js";
import Vector2 from "../math/Vector2.js";
import AABB from "../math/AABB.js";

export default class SquareCollider extends Collider {
    size = new Vector2(-1, -1);

    // A size component <= 0 means "use the object's scale".
    getSize(obj) {
        const { scale } = obj.transform;
        return new Vector2(
            this.size.x > 0 ? this.size.x : scale.x,
            this.size.y > 0 ? this.size.y : scale.y
        );
    }

    // World-space corners, clockwise from the top-left.
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
        const corners = this.getCorners(obj);
        const xs = corners.map(corner => corner.x);
        const ys = corners.map(corner => corner.y);

        return new AABB(
            new Vector2(Math.min(...xs), Math.min(...ys)),
            new Vector2(Math.max(...xs), Math.max(...ys))
        );
    }

    onDrawGizmos(graphics) {
        if (!this.debug) return;
        graphics.strokePolygon(this.getCorners(this.gameObject), this.gizmoColor);
    }
}
