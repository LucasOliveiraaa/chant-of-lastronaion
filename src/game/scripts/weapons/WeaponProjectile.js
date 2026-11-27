import Prefab from "../../../engine/core/Prefab.js";

export class WeaponProjectilePrefab extends Prefab {
    constructor() {
        super("WeaponProjectile");
    }
}

export const WeaponProjectile = new WeaponProjectilePrefab();