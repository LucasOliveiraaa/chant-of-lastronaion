import Component from "../../../engine/core/Component.js";
import Rigidbody from "../../../engine/physics/Rigidbody.js";
import SolidRenderer from "../../../engine/rendering/SolidRenderer.js";
import EnemyAI from "./nav/EnemyAI.js";
import EnemyState from "./EnemyState.js";
import { SPEED as SpeedPlayer } from "../player/PlayerMovement.js";
import PlayerState from "../player/PlayerState.js";
import Collider from "../../../engine/physics/Collider.js";

const SPEED = SpeedPlayer * 0.85;

export default class Enemy extends Component {
    static requiredComponents = [Rigidbody, EnemyAI, EnemyState];

    stopDistance = 0;

    start() {
        this.gameObject.transform.scale.set(50, 50);

        const renderer = this.gameObject.getComponent(SolidRenderer);
        if (renderer) renderer.color = "#550000";

        this.gameObject.getComponent(Collider).debug = true;

        this.rb = this.gameObject.getComponent(Rigidbody);
        this.rb.gravityScale = 0;
        this.rb.freezeRotation = true;

        this.ai = this.gameObject.getComponent(EnemyAI);
    }

    update() {
        const { ai } = this;
        const target = ai.target;
        const reach = target
            ? ai.bodyRadius + Math.max(target.transform.scale.x, target.transform.scale.y) / 2 + this.stopDistance
            : 0;

        const speed = ai.inRange(reach) ? 0 : SPEED;
        this.rb.velocity = ai.direction.multiply(speed);
    }

    onCollisionStay(collision) {
        const other = collision.gameObject;
        if (other.tag == "player") {
            other.getComponent(PlayerState).takeDamage(0.5);
        }
    }
}
