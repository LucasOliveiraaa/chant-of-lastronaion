import Component from "../component.js";
import World from "../world.js";

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