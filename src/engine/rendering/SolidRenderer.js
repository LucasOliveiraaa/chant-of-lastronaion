import Renderer from "./Renderer.js";

export default class SolidRenderer extends Renderer {
    color = "#000000";

    render(graphics) {
        const { scale } = this.gameObject.transform;
        graphics.fillRect(0, 0, scale.x, scale.y, this.color);
    }
}
