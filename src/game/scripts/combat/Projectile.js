import Component from "../../../engine/core/Component.js";
import GameObject from "../../../engine/core/GameObject.js";
import Prefab from "../../../engine/core/Prefab.js";
import Time from "../../../engine/core/Time.js";
import Vector2 from "../../../engine/math/Vector2.js";
import Collider from "../../../engine/physics/Collider.js";
import Rigidbody from "../../../engine/physics/Rigidbody.js";
import SolidRenderer from "../../../engine/rendering/SolidRenderer.js";
import EnemyState from "../enemy/EnemyState.js";
import PlayerState from "../player/PlayerState.js";

const EPSILON = 1e-6;

// A trigger that flies in a straight line, damages the opposite side and is consumed by
// whatever solid thing it touches. Spawn it from a ProjectilePrefab with Projectile.spawn.
export default class Projectile extends Component {
    static PLAYER = "player";
    static ENEMY = "enemy";

    static requiredComponents = [Rigidbody, Collider];

    // Projectile.PLAYER, Projectile.ENEMY, or null for a projectile that hits nothing.
    side = null;
    damage = 0.5;
    // Pixels per second.
    speed = 300;
    // Seconds until it disappears; Infinity lives until it hits something.
    lifetime = 2;
    direction = new Vector2(0, 0);
    // Shared by a volley so each target takes its damage once (Set of EnemyState/PlayerState).
    hitTargets = null;

    #elapsed = 0;

    /**
     * Instantiates a projectile prefab centered on position and launches it.
     * Omitted options keep the prefab's values.
     */
    static spawn(prefab, position, options = {}) {
        const projectile = GameObject.instantiate(prefab).getComponent(Projectile);
        if (!projectile) {
            throw new TypeError("Projectile.spawn: the prefab has no Projectile component.");
        }

        projectile.launch(position, options);
        return projectile;
    }

    // Places the projectile (centered on position) and sets its flight. Call before it starts.
    launch(position, {
        side = this.side,
        direction = this.direction,
        damage = this.damage,
        speed = this.speed,
        lifetime = this.lifetime,
        hitTargets = this.hitTargets,
    } = {}) {
        if (side !== null && side !== Projectile.PLAYER && side !== Projectile.ENEMY) {
            throw new RangeError(`Projectile: unknown side "${side}".`);
        }
        if (!(damage >= 0) || !Number.isFinite(damage)) {
            throw new RangeError("Projectile: damage must be a finite number >= 0.");
        }
        if (!(speed > 0) || !Number.isFinite(speed)) {
            throw new RangeError("Projectile: speed must be a finite number > 0.");
        }
        if (!(lifetime > 0)) {
            throw new RangeError("Projectile: lifetime must be > 0 (Infinity for no limit).");
        }

        const { transform } = this.gameObject;
        transform.worldPosition = new Vector2(
            position.x - transform.scale.x / 2,
            position.y - transform.scale.y / 2
        );

        this.side = side;
        this.direction = direction.normalize();
        this.damage = damage;
        this.speed = speed;
        this.lifetime = lifetime;
        this.hitTargets = hitTargets;
        this.#elapsed = 0;
    }

    start() {
        this.rb = this.gameObject.getComponent(Rigidbody);
        this.rb.velocity = this.direction.multiply(this.speed);
    }

    // Runs right after the physics step that moved it, so elapsed time maps exactly to distance.
    fixedUpdate() {
        if (this.lifetime === Infinity) return;

        const dt = Time.deltaTime;
        this.#elapsed += dt;

        const remaining = this.lifetime - this.#elapsed;
        if (remaining <= EPSILON) {
            this.gameObject.destroy();
        } else if (remaining < dt) {
            // Shorten the last step so it stops on its range instead of overshooting it.
            this.rb.velocity = this.direction.multiply(this.speed * remaining / dt);
        }
    }

    onTriggerEnter(collider) {
        const other = collider.gameObject;
        if (!other || this.side === null || this.isDestroyed) return;
        // Doors, pickups and other projectiles don't stop it.
        if (collider.isTrigger || other.getComponent(Projectile)) return;

        const player = other.getComponent(PlayerState);
        const enemy = other.getComponent(EnemyState);
        const ally = this.side === Projectile.PLAYER ? player : enemy;
        const target = this.side === Projectile.PLAYER ? enemy : player;

        if (ally) return;

        if (target) {
            // Already hit by this volley: pass through, so the rest of the volley keeps its shape.
            if (this.hitTargets?.has(target)) return;
            this.hitTargets?.add(target);
            target.takeDamage(this.damage);
        }

        this.gameObject.destroy();
    }
}

export class ProjectilePrefab extends Prefab {
    constructor(name = "Projectile", { color = "#FFFF00", radius = 5, side = null, colliderOffset = Vector2.zero() } = {}) {
        super(name, SolidRenderer, Rigidbody, Collider, Projectile);

        this.tag = "projectile";
        this.transform.scale.set(radius * 2, radius * 2);

        this.getComponent(SolidRenderer).color = color;

        const rb = this.getComponent(Rigidbody);
        rb.gravityScale = 0;
        rb.freezeRotation = true;
        rb.collisionDetectionMode = "continuous";

        // A trigger, so a volley spawned inside its shooter doesn't push or hit it.
        const collider = this.getComponent(Collider);
        collider.type = Collider.CIRCLE;
        collider.radius = radius;
        collider.isTrigger = true;
        collider.debug = true;
        collider.offset = colliderOffset;

        this.getComponent(Projectile).side = side;
    }
}

export const EnemyProjectile = new ProjectilePrefab("EnemyProjectile", {
    side: Projectile.ENEMY,
    colliderOffset: new Vector2(0, 10),
});
export const PlayerProjectile = new ProjectilePrefab("PlayerProjectile", {
    color: "#7FDBFF",
    radius: 6,
    side: Projectile.PLAYER,
    colliderOffset: new Vector2(0, 10),
});