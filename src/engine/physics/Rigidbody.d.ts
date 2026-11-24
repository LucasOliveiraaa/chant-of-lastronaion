import type Component from "../core/Component.js";
import type Vector2 from "../math/Vector2.js";

export type RigidbodyType = "dynamic" | "kinematic" | "static";
export type CollisionDetectionMode = "discrete" | "continuous";
export type ForceMode = "force" | "impulse";

/**
 * Unity's Rigidbody2D. Bounciness and friction live here instead of a PhysicsMaterial2D.
 * It turns the transform around its world center, which is also the center of mass.
 */
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
    /** Angular velocity lost per second. Default 0.05. */
    angularDamping: number;
    /** Multiplier of the physics gravity. Default 1. */
    gravityScale: number;
    /** "continuous" substeps fast bodies so they don't tunnel through thin colliders. Default "discrete". */
    collisionDetectionMode: CollisionDetectionMode;
    /** 0 to 1. The highest value of the two bodies is used. Default 0. */
    bounciness: number;
    /** Combined with the other body's as a geometric mean. Default 0. */
    friction: number;
    /** Collisions and torque don't turn the body (Unity's freezeRotation). Default false. */
    freezeRotation: boolean;

    /** In pixels per second. */
    velocity: Vector2;
    /** Forces accumulated for the next physics step; cleared after it. */
    readonly force: Vector2;
    /** In degrees per second; positive is clockwise on screen. */
    angularVelocity: number;
    /** Torque accumulated for the next physics step; cleared after it. */
    readonly torque: number;

    /** The transform's world center. */
    readonly worldCenterOfMass: Vector2;
    /** Rotational mass around the center of mass, from the collider's shape (or the transform's rect) and offset. */
    readonly inertia: number;

    /**
     * "force" (default) is applied over the next physics step; "impulse" changes the velocity right away.
     * Both are divided by mass. Ignored unless the body is dynamic.
     */
    addForce(force: Vector2, mode?: ForceMode): void;
    /** Like addForce, but turns the body (positive is clockwise). Ignored unless dynamic and not freezeRotation. */
    addTorque(torque: number, mode?: ForceMode): void;
    /** addForce plus the torque the force makes when applied at a world point off the center of mass. */
    addForceAtPosition(force: Vector2, position: Vector2, mode?: ForceMode): void;
}
