import Component from "../component.js";
import World from "../world.js";

export default class Collider extends Component {
    constructor(config) {
        super();
        this.config = config;
    }

    update(target, _deltaTime) {
        const ctx = World.getInstance().ctx;
        ctx.strokeStyle = this.config.color || "red";
        ctx.strokeRect(target.position.x, target.position.y, target.size.x, target.size.y);
    }
}