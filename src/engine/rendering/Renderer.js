import Component from "../core/Component.js";
import Vector2 from "../math/Vector2.js";
import AABB from "../math/AABB.js";

// Base of everything drawn in the world (Unity's Renderer). The RenderingEngine calls
// render() once per frame, in the transform's rect space: (0, 0) is the rect's top-left
// corner, (scale.x, scale.y) its bottom-right, and rotation is already applied.
export default class Renderer extends Component {
    enabled = true;
    // Unity's Sorting Layer, as a number (see SortingLayer). Higher layers are drawn on top.
    sortingLayer = 0;
    // Order within the layer: higher is drawn on top. Ties keep the scene order.
    sortingOrder = 0;

    // World-space box around the rotated rect, used to skip renderers outside the screen.
    get bounds() {
        const transform = this.gameObject.transform;
        const center = transform.worldCenter;
        const radians = transform.worldRotation * Math.PI / 180;
        const cos = Math.abs(Math.cos(radians));
        const sin = Math.abs(Math.sin(radians));
        const { x: width, y: height } = transform.scale;
        const halfWidth = (width * cos + height * sin) / 2;
        const halfHeight = (width * sin + height * cos) / 2;

        return new AABB(
            new Vector2(center.x - halfWidth, center.y - halfHeight),
            new Vector2(center.x + halfWidth, center.y + halfHeight)
        );
    }

    render(graphics) {}
}
