// Unity's ContactPoint2D, seen from the object receiving the message: `collider` and
// `rigidbody` belong to the other object, `otherCollider` and `otherRigidbody` to this one.
export default class ContactPoint {
    constructor(fields) {
        this.point = fields.point;
        this.normal = fields.normal;
        this.separation = fields.separation;
        this.normalImpulse = fields.normalImpulse;
        this.tangentImpulse = fields.tangentImpulse;
        this.relativeVelocity = fields.relativeVelocity;
        this.collider = fields.collider;
        this.otherCollider = fields.otherCollider;
        this.rigidbody = fields.rigidbody;
        this.otherRigidbody = fields.otherRigidbody;
        this.enabled = fields.enabled;
    }
}
