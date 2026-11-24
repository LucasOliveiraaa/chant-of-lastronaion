import Component from "../core/Component.js";
import Vector2 from "../math/Vector2.js";
import Collider from "./Collider.js";
import SquareCollider from "./SquareCollider.js";
import CircleCollider from "./CircleCollider.js";

const RAD_TO_DEG = 180 / Math.PI;

// Unity's Rigidbody2D. Bounciness and friction live here instead of a PhysicsMaterial2D.
// It rotates the transform around its world center, which is also the center of mass.
export default class Rigidbody extends Component {
    // "dynamic": moved by forces and collisions.
    // "kinematic": moved only by its velocity, pushes dynamic bodies, ignores gravity and forces.
    // "static": never moves.
    bodyType = "dynamic";
    mass = 1;

    linearDamping = 0;
    angularDamping = 0.05;
    gravityScale = 1;
    collisionDetectionMode = "discrete";
    bounciness = 0;
    friction = 0;
    // Keeps the rotation as it is: collisions and torque don't turn the body.
    freezeRotation = false;

    velocity = new Vector2(0, 0);
    force = new Vector2(0, 0);
    // Degrees per second; positive is clockwise on screen.
    angularVelocity = 0;
    torque = 0;

    get worldCenterOfMass() {
        return this.gameObject.transform.worldCenter;
    }

    // Rotational mass around the center of mass, from the collider's shape (or the transform's
    // rect without one), moved by the collider's offset.
    get inertia() {
        const mass = this.mass > 0 ? this.mass : 1;
        const gameObject = this.gameObject;
        const collider = gameObject.getComponent(Collider);

        let shape;
        let offset = Vector2.zero();
        if (collider instanceof SquareCollider) {
            const size = collider.getSize(gameObject);
            shape = (size.x * size.x + size.y * size.y) / 12;
            offset = collider.offset;
        } else if (collider instanceof CircleCollider) {
            shape = collider.radius * collider.radius / 2;
            offset = collider.offset;
        } else {
            const { scale } = gameObject.transform;
            shape = (scale.x * scale.x + scale.y * scale.y) / 12;
        }

        return mass * (shape + offset.x * offset.x + offset.y * offset.y);
    }

    // mode "force" is applied over the next physics step (scaled by mass and time);
    // mode "impulse" changes the velocity right away (scaled by mass).
    addForce(force, mode = "force") {
        if (this.bodyType !== "dynamic") return;

        if (mode === "impulse") {
            const invMass = 1 / (this.mass > 0 ? this.mass : 1);
            this.velocity.x += force.x * invMass;
            this.velocity.y += force.y * invMass;
            return;
        }

        this.force.x += force.x;
        this.force.y += force.y;
    }

    // Same modes as addForce, scaled by inertia instead of mass. Positive turns clockwise.
    addTorque(torque, mode = "force") {
        if (this.bodyType !== "dynamic" || this.freezeRotation) return;

        if (mode === "impulse") {
            const inertia = this.inertia;
            if (inertia > 0) this.angularVelocity += torque / inertia * RAD_TO_DEG;
            return;
        }

        this.torque += torque;
    }

    // A force applied at a world point off the center of mass also turns the body.
    addForceAtPosition(force, position, mode = "force") {
        this.addForce(force, mode);

        const center = this.worldCenterOfMass;
        const rx = position.x - center.x;
        const ry = position.y - center.y;
        this.addTorque(rx * force.y - ry * force.x, mode);
    }
}
