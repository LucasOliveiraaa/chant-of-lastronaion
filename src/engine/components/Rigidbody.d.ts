import type Component from "../Component.js";
import type Vector2 from "../Vector2.js";

export type RigidbodyConfig = {
    static?: boolean;
    /** Must be greater than 0 unless the body is static. */
    mass?: number;
    linearDrag?: number;
    gravityScale?: number;
    collisionDetection?: "discrete" | "continuous";
    /** 0 = no bounce, 1 = perfectly elastic. */
    bounciness?: number;
    /** 0 = ice, ~0.4 typical, 1 = grippy. */
    friction?: number;
};

export default class Rigidbody extends Component {
    readonly config: Required<RigidbodyConfig>;

    /** In pixels per second. Safe to read and write directly. */
    velocity: Vector2;

    /** Accumulated by applyForce, consumed and cleared by the physics engine each update. */
    readonly force: Vector2;

    constructor(config?: RigidbodyConfig);

    /**
     * Applies a continuous force (mass * pixels / s²) for the next physics update.
     * Call it every frame while the force should act.
     */
    applyForce(force: Vector2): void;

    /** Instantly changes the velocity by impulse / mass (a jump, a knockback). */
    applyImpulse(impulse: Vector2): void;
}