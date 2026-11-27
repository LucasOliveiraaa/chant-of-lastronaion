import Component from "../../../engine/core/Component.js";
import Time from "../../../engine/core/Time.js";
import Input from "../../../engine/input/Input.js";
import PlayerState from "./PlayerState.js";
import Projectile from "../combat/Projectile.js";
import { generateProjectilePattern } from "../weapons/AreaOfEffect.js";

// Degrees applied to the weapon's profile (north forward); positive is clockwise.
const AIM_ROTATIONS = { ArrowUp: 0, ArrowRight: 90, ArrowDown: 180, ArrowLeft: -90 };
const AIM_KEYS = Object.keys(AIM_ROTATIONS);

// Fires the equipped Weapon while an arrow key is held, aimed by that key.
export default class PlayerWeapon extends Component {
    static requiredComponents = [PlayerState];

    // A Weapon (see weapons/Weapons.js), or null for none.
    weapon = null;

    #cooldownRemaining = 0;
    #aimKey = null;

    get cooldownRemaining() {
        return this.#cooldownRemaining;
    }

    // 1 right after a volley, down to 0 when the next one is ready.
    get cooldownProgress() {
        const cooldown = this.weapon?.cooldown ?? 0;
        return cooldown > 0 ? Math.min(1, this.#cooldownRemaining / cooldown) : 0;
    }

    start() {
        this.playerState = this.gameObject.getComponent(PlayerState);
    }

    update() {
        this.#cooldownRemaining = Math.max(0, this.#cooldownRemaining - Time.deltaTime);

        const aimKey = this.#updateAimKey();
        if (!aimKey || !this.weapon || this.#cooldownRemaining > 0 || this.playerState.isDead) return;

        this.attack(AIM_ROTATIONS[aimKey]);
        this.#cooldownRemaining = this.weapon.cooldown;
    }

    /**
     * Fires one volley of the equipped weapon from the player's center, rotated by
     * `rotation` degrees. Multipliers are read now, so changes apply to the next volley.
     * Returns the spawned projectiles.
     */
    attack(rotation = 0) {
        const { weapon, playerState } = this;
        if (!weapon) return [];

        // Each multiplier is applied exactly once, here; projectiles carry the final damage.
        const range = playerState.getEffectiveRange(weapon.range);
        const damage = playerState.getDamageDealt(weapon.damage);

        const pattern = generateProjectilePattern(
            weapon.shape,
            range,
            weapon.coverageSpacing,
            weapon.maxProjectiles,
            weapon.projectileRadius
        );

        const origin = this.gameObject.transform.worldCenter;
        const hitTargets = new Set();

        return pattern.map(({ direction, distance }) => Projectile.spawn(weapon.projectile, origin, {
            side: Projectile.PLAYER,
            direction: direction.rotate(rotation),
            damage,
            speed: weapon.projectileSpeed,
            lifetime: distance / weapon.projectileSpeed,
            hitTargets,
        }));
    }

    // The most recently pressed arrow that is still held.
    #updateAimKey() {
        for (const key of AIM_KEYS) {
            if (Input.getKeyDown(key)) this.#aimKey = key;
        }

        if (this.#aimKey && !Input.getKey(this.#aimKey)) {
            this.#aimKey = AIM_KEYS.find(key => Input.getKey(key)) ?? null;
        }

        return this.#aimKey;
    }
}
