import Component from "../Component.js";
import Vector2 from "../Vector2.js";
import World from "../World.js";

export default class Collider extends Component {
    static debug = false;

    constructor(config) {
        super();
        this.config = {
            offset: new Vector2(0, 0),
            trigger: false,
            ...config,
        };

        const { type, size, radius } = this.config;
        if (type === "square") {
            if (!size || !(size.x > 0) || !(size.y > 0)) {
                throw new Error("A square Collider needs a size greater than 0.");
            }
        } else if (type === "circle") {
            if (!(radius > 0)) {
                throw new Error("A circle Collider needs a radius greater than 0.");
            }
        } else {
            throw new Error(`Unknown Collider type "${type}".`);
        }
    }

    getCenter(entity) {
        const { offset } = this.config;
        return new Vector2(
            entity.position.x + entity.size.x / 2 + offset.x,
            entity.position.y + entity.size.y / 2 + offset.y
        );
    }

    getBounds(entity) {
        const { type, size, radius } = this.config;
        const c = this.getCenter(entity);
        const hx = type === "circle" ? radius : size.x / 2;
        const hy = type === "circle" ? radius : size.y / 2;
        return { minX: c.x - hx, maxX: c.x + hx, minY: c.y - hy, maxY: c.y + hy };
    }

    update(target) {
        if (!Collider.debug) return;

        const ctx = World.getInstance().ctx;
        const { type, size, radius, trigger, color } = this.config;
        const c = this.getCenter(target);

        ctx.strokeStyle = color ?? (trigger ? "lime" : "red");
        ctx.lineWidth = 1;
        ctx.beginPath();
        if (type === "circle") {
            ctx.arc(c.x, c.y, radius, 0, Math.PI * 2);
        } else {
            ctx.rect(c.x - size.x / 2, c.y - size.y / 2, size.x, size.y);
        }
        ctx.stroke();
    }
}