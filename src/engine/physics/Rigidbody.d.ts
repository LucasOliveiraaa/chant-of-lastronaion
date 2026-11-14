import type Component from "../core/Component.js";
import type Vector2 from "../math/Vector2.js";

export type RigidbodyType = "dynamic" | "kinematic" | "static";
export type CollisionDetectionMode = "discrete" | "continuous";
export type ForceMode = "force" | "impulse";

/** Unity's Rigidbody2D. Bounciness and friction live here instead of a PhysicsMaterial2D. */
export default class Rigidbody extends Component {
    /**
     * - "dynamic" (default): moved by forces and collisions.
     * - "kinematic": moved only by its velocity; pushes dynamic bodies, ignores gravity and forces.
     * - "static": never moves.
     */
    bodyType: RigidbodyType;
    /** Default 1. */
    mass: number;

    /** Velocity lost per second, like air resistance. Default 0. */
    linearDamping: number;
    /** Multiplier of the physics gravity. Default 1. */
    gravityScale: number;
    /** "continuous" substeps fast bodies so they don't tunnel through thin colliders. Default "discrete". */
    collisionDetectionMode: CollisionDetectionMode;
    /** 0 to 1. The highest value of the two bodies is used. Default 0. */
    bounciness: number;
    /** Combined with the other body's as a geometric mean. Default 0. */
    friction: number;

    /** In pixels per second. */
    velocity: Vector2;
    /** Forces accumulated for the next physics step; cleared after it. */
    readonly force: Vector2;

    /**
     * "force" (default) is applied over the next physics step; "impulse" changes the velocity right away.
     * Both are divided by mass. Ignored unless the body is dynamic.
     */
    addForce(force: Vector2, mode?: ForceMode): void;
}
