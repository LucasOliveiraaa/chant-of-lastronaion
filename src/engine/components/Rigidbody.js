import Component from "../component.js";
import Vector2 from "../vector2.js";

export default class Rigidbody extends Component {
    velocity = Vector2.ZERO;

    constructor(config) {
        super();
        this.config = config;
    }

    applyForce(force) {
        this.velocity = this.velocity.add(force);
    }
}