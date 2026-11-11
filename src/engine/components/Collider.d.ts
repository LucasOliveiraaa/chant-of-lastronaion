import type Component from "../component.js";
import type Vector2 from "../vector2.js";

export type ColliderConfig = SquareCollider | CircleCollider;

export type SquareCollider = {
    type: "square";
    size: Vector2;
    offset: Vector2;
    trigger: boolean;
};

export type CircleCollider = {
    type: "circle";
    radius: number;
    offset: Vector2;
    trigger: boolean;
};

export default class Collider extends Component {
    constructor(public config: ColliderConfig);
}