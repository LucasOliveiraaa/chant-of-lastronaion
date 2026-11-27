import Collider from "../../../engine/physics/Collider.js";
import Projectile from "../combat/Projectile.js";
import { COMPASS } from "./AreaOfEffect.js";

// Safety cap per volley; past it the projectiles spread further apart instead.
export const DEFAULT_MAX_PROJECTILES = 48;

/**
 * Immutable weapon definition. A new weapon only needs its stats and AoE shape:
 *
 *     new Weapon({ name: "spear", damage: 1, range: 150, shape: { n: 1, ne: 0.2, nw: 0.2 } });
 *
 * shape: reach per compass direction, 0-1 (omitted directions are 0); north is forward.
 *        Strengths are relative reach only, not damage or projectile density.
 * range: pixels reached by a strength of 1, before the player's range multiplier.
 * projectile: a ProjectilePrefab; its collider radius sets the default coverage spacing.
 * coverageSpacing: largest gap between projectiles at the AoE's edge (default: their diameter).
 * cooldown: seconds between volleys.
 * icon: sprite id or name shown in the HUD (null for none).
 */
export default class Weapon {
    constructor({
        name,
        displayName = name,
        damage,
        range,
        shape,
        projectile,
        projectileSpeed = 360,
        cooldown = 0.5,
        coverageSpacing = null,
        maxProjectiles = DEFAULT_MAX_PROJECTILES,
        icon = null,
    }) {
        if (typeof name !== "string" || name === "") {
            throw new TypeError("Weapon: name must be a non-empty string.");
        }

        const fail = (message) => {
            throw new RangeError(`Weapon "${name}": ${message}`);
        };

        if (!(damage >= 0) || !Number.isFinite(damage)) fail("damage must be a finite number >= 0.");
        if (!(range > 0) || !Number.isFinite(range)) fail("range must be a finite number > 0.");
        if (!(projectileSpeed > 0) || !Number.isFinite(projectileSpeed)) fail("projectileSpeed must be a finite number > 0.");
        if (!(cooldown >= 0) || !Number.isFinite(cooldown)) fail("cooldown must be a finite number >= 0.");
        if (!(maxProjectiles >= 1)) fail("maxProjectiles must be >= 1.");

        const radius = projectile?.getComponent(Projectile) && projectile.getComponent(Collider)?.radius;
        if (!(radius > 0)) fail("projectile must be a ProjectilePrefab with a circle collider.");

        coverageSpacing ??= radius * 2;
        if (!(coverageSpacing > 0) || !Number.isFinite(coverageSpacing)) fail("coverageSpacing must be a finite number > 0.");

        this.name = name;
        this.displayName = displayName;
        this.damage = damage;
        this.range = range;
        this.shape = Weapon.#validateShape(shape, fail);
        this.projectile = projectile;
        this.projectileRadius = radius;
        this.projectileSpeed = projectileSpeed;
        this.cooldown = cooldown;
        this.coverageSpacing = coverageSpacing;
        this.maxProjectiles = maxProjectiles;
        this.icon = icon;

        Object.freeze(this);
    }

    static #validateShape(shape, fail) {
        if (shape === null || typeof shape !== "object") fail("shape must be an object of compass strengths.");

        for (const key of Object.keys(shape)) {
            if (!COMPASS.includes(key)) fail(`unknown shape direction "${key}" (use ${COMPASS.join(", ")}).`);
        }

        const normalized = {};
        for (const key of COMPASS) {
            const value = shape[key] ?? 0;
            if (!Number.isFinite(value) || value < 0 || value > 1) fail(`shape.${key} must be between 0 and 1.`);
            normalized[key] = value;
        }

        if (COMPASS.every(key => normalized[key] === 0)) fail("shape needs at least one strength above 0.");

        return Object.freeze(normalized);
    }
}
