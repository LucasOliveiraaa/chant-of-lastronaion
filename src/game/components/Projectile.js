import Component from "../../engine/core/Component.js";
import GameObject from "../../engine/core/GameObject.js";
import CircleCollider from "../../engine/physics/CircleCollider.js";
import Rigidbody from "../../engine/physics/Rigidbody.js";
import SolidRenderer from "../../engine/rendering/SolidRenderer.js";
import EnemyState from "./EnemyState.js";
import PlayerState from "./PlayerState.js";

export default class Projectile extends Component {
    whoseSide = null;
    damage = 0.5;

    speed = 500 * 100;
    direction = null;
    
    start() {
        this.rb = this.gameObject.getComponent(Rigidbody);
        this.rb.gravityScale = 0;
        this.rb.collisionDetectionMode = "continuous";

        if (this.direction) {
            this.rb.addForce(this.direction.multiply(this.speed));
        }
    }

    onCollisionEnter(other) {
        if (this.whoseSide == null) return;

        if (other.tag == "player" && this.whoseSide == "enemy") {
            other.getComponent(PlayerState).takeDamage(this.damage);
            this.gameObject.destroy();
        } else if (other.tag.startsWith("enemy") && this.whoseSide == "player") {
            other.getComponent(EnemyState).takeDamage(this.damage);
            this.gameObject.destroy();
        }else if (!other.tag.startsWith("interactable")) {
            this.gameObject.destroy();
        }
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