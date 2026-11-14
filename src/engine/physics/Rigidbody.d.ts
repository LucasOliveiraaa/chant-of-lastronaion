import type Component from "../core/Component.js";
import type Vector2 from "../math/Vector2.js";

export type RigidbodyConfig = {
};

export default class Rigidbody extends Component {
    static?: boolean;
    mass?: number;

    linearDrag?: number;
    gravityScale?: number;

    collisionDetection?: "discrete" | "continuous";
    bounciness?: number;
    friction?: number;

    velocity: Vector2;
    readonly force: Vector2;

    applyForce(force: Vector2): void;
    applyImpulse(impulse: Vector2): void;
}