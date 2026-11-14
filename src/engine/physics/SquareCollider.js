import Component from "../core/Component.js";
import Vector2 from "../math/Vector2.js";
import World from "../core/World.js";
import AABB from "../math/AABB.js";

export default class SquareCollider extends Component {
    debug = false;
    dbgColor = "red";

    offset = new Vector2(0, 0);
    size = new Vector2(-1, -1);
    trigger = false;

    getCenter(obj) {
        return new Vector2(
            obj.transform.position.x + obj.transform.scale.x / 2 + this.offset.x,
            obj.transform.position.y + obj.transform.scale.y / 2 + this.offset.y
        );
    }

    // A size component <= 0 means "use the object's scale".
    getSize(obj) {
        const { scale } = obj.transform;
        return new Vector2(
            this.size.x > 0 ? this.size.x : scale.x,
            this.size.y > 0 ? this.size.y : scale.y
        );
    }

    getBounds(obj) {
        const c = this.getCenter(obj);
        const s = this.getSize(obj);

        return new AABB(
            new Vector2(c.x - s.x / 2, c.y - s.y / 2),
            new Vector2(c.x + s.x / 2, c.y + s.y / 2)
        );
    }

    update() {
        if (!this.debug) return;

        const ctx = World.getInstance().ctx;
        const c = this.getCenter(this.gameObject);
        const s = this.getSize(this.gameObject);

        ctx.strokeStyle = this.dbgColor ?? (this.trigger ? "lime" : "red");
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.rect(c.x - s.x / 2, c.y - s.y / 2, s.x, s.y);
        ctx.stroke();
    }
}