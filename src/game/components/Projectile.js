import Component from "../../engine/core/Component.js";
import GameObject from "../../engine/core/GameObject.js";
import CircleCollider from "../../engine/physics/CircleCollider.js";
import Rigidbody from "../../engine/physics/Rigidbody.js";
import SolidRenderer from "../../engine/rendering/SolidRenderer.js";
import EnemyState from "./EnemyState.js";
import PlayerState from "../scripts/player/PlayerState.js";

export default class Projectile extends Component {
    whoseSide = null;
    damage = 0.5;

    speed = 15000;
    direction = null;
    
    start() {
        this.rb = this.gameObject.getComponent(Rigidbody);
        this.rb.gravityScale = 0;
        this.rb.collisionDetectionMode = "continuous";

        if (this.direction) {
            this.rb.addForce(this.direction.multiply(this.speed));
        }
    }

    onCollisionEnter(collision) {
        if (this.whoseSide == null) return;

        const other = collision.gameObject;
        if (other.tag == "player" && this.whoseSide == "enemy") {
            other.getComponent(PlayerState).takeDamage(this.damage);
        } else if (other.tag.startsWith("enemy") && this.whoseSide == "player") {
            other.getComponent(EnemyState).takeDamage(this.damage);
        }
        // Triggers (pickups, traps) send onTriggerEnter, so anything solid stops the projectile.
        this.gameObject.destroy();
    }
}

export function createProjectile(position, whoseSide, damage, direction) {
    const projectile = new GameObject("projectile", SolidRenderer, Rigidbody, CircleCollider, Projectile);
    projectile.tag = "projectile";
    projectile.transform.position.set(position.x, position.y);
    projectile.transform.scale.set(10, 10);

    projectile.getComponent(SolidRenderer).color = "#FFFF00";

    projectile.getComponent(CircleCollider).debug = true;
    projectile.getComponent(CircleCollider).radius = 5;

    projectile.getComponent(Projectile).whoseSide = whoseSide;
    projectile.getComponent(Projectile).damage = damage;
    projectile.getComponent(Projectile).direction = direction;
}