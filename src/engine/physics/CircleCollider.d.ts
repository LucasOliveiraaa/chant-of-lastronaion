import type Component from "../core/Component.js";
import type GameObject from "../core/GameObject.js";
import type Vector2 from "../math/Vector2.js";

export default class CircleCollider extends Component {
    debug: boolean;
    dbgColor: string;

    offset: Vector2;
    radius: number;
    trigger: boolean;

    getCenter(obj: GameObject): Vector2;
    getBounds(obj: GameObject): AABB;
}