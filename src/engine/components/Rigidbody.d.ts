import type Component from "../component.js";
import type Vector2 from "../vector2.js";

export type RigidbodyConfig = {
    static: boolean;
    mass: number;
    linearDrag: number;
    friction: number;   // 0 = ice, ~0.4 typical, 1 = grippy
    bounciness: number; // 0 = no bounce, 1 = perfectly elastic
    gravityScale: number;
    collisionDetection: "discrete" | "continuous";
};

export default class Rigidbody extends Component {
    get velocity(): Vector2;

    constructor(public config: RigidbodyConfig);

    applyForce(force: Vector2): void;
}