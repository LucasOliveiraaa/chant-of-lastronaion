// Unity's Collision2D, seen from the object receiving the message: `gameObject`, `collider`
// and `rigidbody` belong to the other object, `otherCollider` and `otherRigidbody` to this one.
export default class Collision {
    constructor(fields) {
        this.gameObject = fields.gameObject;
        this.collider = fields.collider;
        this.otherCollider = fields.otherCollider;
        this.rigidbody = fields.rigidbody;
        this.otherRigidbody = fields.otherRigidbody;
        this.relativeVelocity = fields.relativeVelocity;
        this.enabled = fields.enabled;
        this._contacts = fields.contacts;
    }

    get transform() {
        return this.gameObject?.transform ?? null;
    }

    get contactCount() {
        return this._contacts.length;
    }

    // Like Unity, a new array on every read; prefer getContact/getContacts in hot code.
    get contacts() {
        return this._contacts.slice();
    }

    getContact(index) {
        if (index < 0 || index >= this._contacts.length) {
            throw new RangeError(`Contact index ${index} out of range (contactCount is ${this._contacts.length}).`);
        }
        return this._contacts[index];
    }

    getContacts(array) {
        const count = Math.min(array.length, this._contacts.length);
        for (let i = 0; i < count; i++) array[i] = this._contacts[i];
        return count;
    }
}
