import type Component from "../core/Component.js";
import type GameObject from "../core/GameObject.js";
import type AABB from "../math/AABB.js";
import type Vector2 from "../math/Vector2.js";

export default class SquareCollider extends Component {
    debug: boolean;
    dbgColor: string;

    offset: Vector2;
    size: Vector2;
    trigger: boolean;

    getCenter(obj: GameObject): Vector2;
    getBounds(obj: GameObject): AABB;
}