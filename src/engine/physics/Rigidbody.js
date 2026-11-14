import Component from "../core/Component.js";
import Vector2 from "../math/Vector2.js";

const DEFAULT_CONFIG = {
    static: false,
    mass: 1,
    linearDrag: 0,
    gravityScale: 1,
    collisionDetection: "discrete",
    bounciness: 0,
    friction: 0,
};

export default class Rigidbody extends Component {
    static = false;
    mass = 1

    linearDrag = 0;
    gravityScale = 1;
    collisionDetection = "discrete";
    bounciness = 0;
    friction = 0;

    velocity = new Vector2(0, 0);
    force = new Vector2(0, 0);

    applyForce(force) {
        this.force.x += force.x;
        this.force.y += force.y;
    }

    applyImpulse(impulse) {
        if (this.config.static) return;
        this.velocity.x += impulse.x / this.config.mass;
        this.velocity.y += impulse.y / this.config.mass;
    }
}