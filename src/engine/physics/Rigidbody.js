import Component from "../core/Component.js";
import Vector2 from "../math/Vector2.js";

// Unity's Rigidbody2D. Bounciness and friction live here instead of a PhysicsMaterial2D.
export default class Rigidbody extends Component {
    // "dynamic": moved by forces and collisions.
    // "kinematic": moved only by its velocity, pushes dynamic bodies, ignores gravity and forces.
    // "static": never moves.
    bodyType = "dynamic";
    mass = 1;

    linearDamping = 0;
    gravityScale = 1;
    collisionDetectionMode = "discrete";
    bounciness = 0;
    friction = 0;

    velocity = new Vector2(0, 0);
    force = new Vector2(0, 0);

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
}
