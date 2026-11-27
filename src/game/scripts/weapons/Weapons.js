import Weapon from "./Weapon.js";
import { PlayerProjectile } from "../combat/Projectile.js";

// Wide frontal wave.
export const Guitar = new Weapon({
    name: "guitar",
    displayName: "Violão",
    damage: 1,
    range: 140,
    shape: { n: 1, ne: 0.8, e: 0.35, w: 0.35, nw: 0.8 },
    projectile: PlayerProjectile,
    projectileSpeed: 360,
    cooldown: 0.6,
});

// Short pulse all around the player.
export const Drum = new Weapon({
    name: "drum",
    displayName: "Tambor",
    damage: 0.5,
    range: 80,
    shape: { n: 1, ne: 1, e: 1, se: 1, s: 1, sw: 1, w: 1, nw: 1 },
    projectile: PlayerProjectile,
    projectileSpeed: 300,
    cooldown: 0.8,
});

// Long, narrow thrust forward.
export const Flute = new Weapon({
    name: "flute",
    displayName: "Flauta",
    damage: 1.5,
    range: 220,
    shape: { n: 1, ne: 0.15, nw: 0.15 },
    projectile: PlayerProjectile,
    projectileSpeed: 480,
    cooldown: 0.7,
});
