import type Collider from "./Collider.js";
import type GameObject from "../core/GameObject.js";
import type AABB from "../math/AABB.js";

export default class CircleCollider extends Collider {
    /** Default 0. */
    radius: number;

    getBounds(obj: GameObject): AABB;
}
