import Component from "../core/Component.js";
import Vector2 from "../math/Vector2.js";
import World from "../core/World.js";
import AABB from "../math/AABB.js";

export default class CircleCollider extends Component {
    debug = false;
    dbgColor = "red";

    offset = new Vector2(0, 0);
    radius = 0;
    trigger = false;

    getCenter(obj) {
        return new Vector2(
            obj.transform.position.x + obj.transform.scale.x / 2 + this.offset.x,
            obj.transform.position.y + obj.transform.scale.y / 2 + this.offset.y
        );
    }

    getBounds(obj) {
        const c = this.getCenter(obj);
        return new AABB(
            new Vector2(c.x - this.radius, c.y - this.radius),
            new Vector2(c.x + this.radius, c.y + this.radius)
        );
    }

    update() {
        if (!this.debug) return;

        const ctx = World.getInstance().ctx;
        const c = this.getCenter(this.gameObject);

        ctx.strokeStyle = this.dbgColor ?? (this.trigger ? "lime" : "red");
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(c.x, c.y, this.radius, 0, Math.PI * 2);
        ctx.stroke();
    }
}