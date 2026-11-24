import type GameObject from "../core/GameObject.js";
import type Transform from "../core/Transform.js";
import type Vector2 from "../math/Vector2.js";
import type Rigidbody from "./Rigidbody.js";
import type ContactPoint from "./ContactPoint.js";
import type Collider from "./Collider.js";

/**
 * Unity's Collision2D, passed to onCollisionEnter/Stay/Exit (never for triggers). Seen from the object receiving
 * the message: `gameObject`, `collider` and `rigidbody` belong to the other object,
 * `otherCollider` and `otherRigidbody` to this one.
 */
export default class Collision {
    /** The other GameObject. */
    readonly gameObject: GameObject;
    /** The other GameObject's transform. */
    readonly transform: Transform;
    /** The other object's collider. */
    readonly collider: Collider;
    /** This object's collider. */
    readonly otherCollider: Collider;
    /** The other object's Rigidbody, or null. */
    readonly rigidbody: Rigidbody | null;
    /** This object's Rigidbody, or null. */
    readonly otherRigidbody: Rigidbody | null;
    /** Linear velocity of the other body relative to this one, before the solver ran. */
    readonly relativeVelocity: Vector2;
    /** Whether the collision had a physical response. Always true, since triggers send onTriggerX instead. */
    readonly enabled: boolean;

    /** Number of contact points; 0 in onCollisionExit. */
    readonly contactCount: number;
    /** A new array of the contact points on every read (like Unity). */
    readonly contacts: ContactPoint[];

    /** Throws a RangeError when index is not below contactCount. */
    getContact(index: number): ContactPoint;
    /** Fills the array with up to array.length contacts and returns how many were written. */
    getContacts(array: ContactPoint[]): number;

    /** @internal Created by the physics engine. */
    constructor(fields: {
        gameObject: GameObject;
        collider: Collider;
        otherCollider: Collider;
        rigidbody: Rigidbody | null;
        otherRigidbody: Rigidbody | null;
        relativeVelocity: Vector2;
        enabled: boolean;
        contacts: ContactPoint[];
    });
}
