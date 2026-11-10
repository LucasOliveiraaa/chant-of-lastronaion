import Component from "../component.js";

export default class SolidRenderer extends Component {
    constructor(color) {
        super();
        this.color = color;
    }

    update(world, target, deltaTime) {
        const ctx = world.ctx;
        ctx.fillStyle = this.color;
        ctx.fillRect(target.position.x, target.position.y, target.size.x, target.size.y);
    }
}