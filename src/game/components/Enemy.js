import Component from "../../engine/core/Component.js";
import GameObject from "../../engine/core/GameObject.js";
import Vector2 from "../../engine/math/Vector2.js";
import Rigidbody from "../../engine/physics/Rigidbody.js";
import SolidRenderer from "../../engine/rendering/SolidRenderer.js";
import Time from "../../engine/core/Time.js";
import { SPEED as SpeedPlayer } from "./PlayerMovement.js";
import PlayerState from "./PlayerState.js";

const SPEED = SpeedPlayer * 0.85;

export default class Enemy extends Component {
    start() {
        this.gameObject.transform.scale.set(50, 50);

        this.gameObject.getComponent(SolidRenderer).color = "#FF0000";

        this.rb = this.gameObject.getComponent(Rigidbody);
        this.rb.gravityScale = 0;

        this.player = GameObject.findWithTag("player");
    }

    update() {
        this.rb.velocity.set(0, 0);

        const posPlayer = this.player.transform.position;
        const posEnemy = this.gameObject.transform.position;

        const dx = posPlayer.x - posEnemy.x;
        const dy = posPlayer.y - posEnemy.y;
        const h = Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2));

        let direction = new Vector2(dx, dy);
        direction = direction.normalize().multiply(SPEED * Time.deltaTime);

        this.rb.velocity = direction;
    }

    onCollisionStay(collision) {
        const other = collision.gameObject;
        if (other.tag == "player") {
            other.getComponent(PlayerState).takeDamage(0.5);
        }
    }
}