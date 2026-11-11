import Component from "../Component.js";
import Vector2 from "../Vector2.js";

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
    velocity = new Vector2(0, 0);
    force = new Vector2(0, 0);

    constructor(config = {}) {
        super();
        this.config = { ...DEFAULT_CONFIG, ...config };

        const { static: isStatic, mass, bounciness, friction, collisionDetection } = this.config;
        if (!isStatic && !(mass > 0)) {
            throw new Error("A non-static Rigidbody must have a mass greater than 0.");
        }
        if (!(bounciness >= 0) || !(friction >= 0)) {
            throw new Error("Rigidbody bounciness and friction must be 0 or greater.");
        }
        if (collisionDetection !== "discrete" && collisionDetection !== "continuous") {
            throw new Error(`Unknown collisionDetection "${collisionDetection}".`);
        }
    }

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