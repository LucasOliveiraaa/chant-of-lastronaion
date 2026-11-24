import type Vector2 from "../math/Vector2.js";
import type Rigidbody from "./Rigidbody.js";
import type Collider from "./Collider.js";

/**
 * Unity's ContactPoint2D, seen from the object receiving the message: `collider` and
 * `rigidbody` belong to the other object, `otherCollider` and `otherRigidbody` to this one.
 */
export default class ContactPoint {
    /** World-space point of contact. */
    readonly point: Vector2;
    /** Unit surface normal, pointing from the other collider towards this one. */
    readonly normal: Vector2;
    /** Distance between the colliders at the point; negative when they overlap. */
    readonly separation: number;
    /** Impulse the solver applied along the normal at this point. */
    readonly normalImpulse: number;
    /** Friction impulse the solver applied along the surface at this point. */
    readonly tangentImpulse: number;
    /** Velocity of the other body relative to this one at the point, before the solver ran. */
    readonly relativeVelocity: Vector2;

    /** The other object's collider. */
    readonly collider: Collider;
    /** This object's collider. */
    readonly otherCollider: Collider;
    /** The other object's Rigidbody, or null. */
    readonly rigidbody: Rigidbody | null;
    /** This object's Rigidbody, or null. */
    readonly otherRigidbody: Rigidbody | null;
    /** Whether the contact had a physical response. Always true, since triggers get no contacts. */
    readonly enabled: boolean;

    /** @internal Created by the physics engine. */
    constructor(fields: {
        point: Vector2;
        normal: Vector2;
        separation: number;
        normalImpulse: number;
        tangentImpulse: number;
        relativeVelocity: Vector2;
        collider: Collider;
        otherCollider: Collider;
        rigidbody: Rigidbody | null;
        otherRigidbody: Rigidbody | null;
        enabled: boolean;
    });
}
