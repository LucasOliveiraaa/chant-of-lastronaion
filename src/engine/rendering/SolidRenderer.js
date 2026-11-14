import Component from "../core/Component.js";
import World from "../core/World.js";

export default class SolidRenderer extends Component {
    color = "#000000";

    update() {
        const ctx = World.getInstance().ctx;
        ctx.fillStyle = this.color;
        ctx.fillRect(
            this.gameObject.transform.position.x, 
            this.gameObject.transform.position.y, 
            this.gameObject.transform.scale.x, 
            this.gameObject.transform.scale.y
        );
    }
}