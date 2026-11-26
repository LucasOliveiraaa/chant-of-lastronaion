import Component from "../core/Component.js";
import Vector2 from "../math/Vector2.js";
import Collider from "./Collider.js";

const RAD_TO_DEG = 180 / Math.PI;

export default class Rigidbody extends Component {
    // "dynamic" | "kinematic" | "static"
    bodyType = "dynamic";
    mass = 1;

    linearDamping = 0;
    angularDamping = 0.05;
    gravityScale = 1;
    collisionDetectionMode = "discrete";
    bounciness = 0;
    friction = 0;
    freezeRotation = false;

    velocity = new Vector2(0, 0);
    force = new Vector2(0, 0);
    // Degrees per second, clockwise.
    angularVelocity = 0;
    torque = 0;

    get worldCenterOfMass() {
        return this.gameObject.transform.worldCenter;
    }

    get inertia() {
        const mass = this.mass > 0 ? this.mass : 1;
        const gameObject = this.gameObject;
        const collider = gameObject.getComponent(Collider);

        let shape;
        let offset = Vector2.zero();
        if (collider?.isCircle) {
            shape = collider.radius * collider.radius / 2;
            offset = collider.offset;
        } else if (collider) {
            const size = collider.getSize(gameObject);
            shape = (size.x * size.x + size.y * size.y) / 12;
            offset = collider.offset;
        } else {
            const { scale } = gameObject.transform;
            shape = (scale.x * scale.x + scale.y * scale.y) / 12;
        }

        return mass * (shape + offset.x * offset.x + offset.y * offset.y);
    }

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

    addTorque(torque, mode = "force") {
        if (this.bodyType !== "dynamic" || this.freezeRotation) return;

        if (mode === "impulse") {
            const inertia = this.inertia;
            if (inertia > 0) this.angularVelocity += torque / inertia * RAD_TO_DEG;
            return;
        }

        this.torque += torque;
    }

    addForceAtPosition(force, position, mode = "force") {
        this.addForce(force, mode);

        const center = this.worldCenterOfMass;
        const rx = position.x - center.x;
        const ry = position.y - center.y;
        this.addTorque(rx * force.y - ry * force.x, mode);
    }
}
