import Component from "../../engine/core/Component.js";
import Time from "../../engine/core/Time.js";
import Input from "../../engine/input/Input.js";
import Rigidbody from "../../engine/physics/Rigidbody.js";
import SolidRenderer from "../../engine/rendering/SolidRenderer.js";

export const SPEED = 100 * 100;

export default class PlayerMovement extends Component {
    start() {
        this.gameObject.transform.scale.set(50, 50);

        const solidRenderer = this.gameObject.getComponent(SolidRenderer);
        solidRenderer.color = "#0000FF";

        this.rb = this.gameObject.getComponent(Rigidbody);
        this.rb.gravityScale = 0;
    }

    update() {
        this.rb.velocity.set(0, 0);
        if (Input.getKey("KeyW")) {
            this.rb.velocity.y = -SPEED * Time.deltaTime;
        }
        if (Input.getKey("KeyS")) {
            this.rb.velocity.y = SPEED * Time.deltaTime;
        }
        if (Input.getKey("KeyA")) {
            this.rb.velocity.x = -SPEED * Time.deltaTime;
        }
        if (Input.getKey("KeyD")) {
            this.rb.velocity.x = SPEED * Time.deltaTime;
        }
    }
}