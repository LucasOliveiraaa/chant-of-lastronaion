import Component from "../../../engine/core/Component.js";
import Time from "../../../engine/core/Time.js";
import Input from "../../../engine/input/Input.js";
import Vector2 from "../../../engine/math/Vector2.js";
import Rigidbody from "../../../engine/physics/Rigidbody.js";
import SolidRenderer from "../../../engine/rendering/SolidRenderer.js";

export const SPEED = 200;

export default class PlayerMovement extends Component {
    start() {
        this.rb = this.gameObject.getComponent(Rigidbody);

        Input.setAxisConfig("Horizontal", {
            negative: ["KeyA"],
            positive: ["KeyD"],
        });
        Input.setAxisConfig("Vertical", {
            negative: ["KeyW"],
            positive: ["KeyS"],
        })
    }

    update() {
        const horizontal = Input.getAxis("Horizontal");
        const vertical = Input.getAxis("Vertical");
        const dir = new Vector2(horizontal, vertical).normalize();

        this.rb.velocity = dir.multiply(SPEED);
    }
}