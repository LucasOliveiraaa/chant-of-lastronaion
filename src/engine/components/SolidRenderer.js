import Component from "../Component.js";
import World from "../World.js";

export default class SolidRenderer extends Component {
    constructor(color) {
        super();
        this.color = color;
    }

    update(target, _deltaTime) {
        const ctx = World.getInstance().ctx;
        ctx.fillStyle = this.color;
        ctx.fillRect(target.position.x, target.position.y, target.size.x, target.size.y);
    }
}