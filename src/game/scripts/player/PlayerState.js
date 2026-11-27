import Component from "../../../engine/core/Component.js";
import Time from "../../../engine/core/Time.js";

export default class PlayerState extends Component {
    // ---- Health ----------------------------------------------------------

    health = 3;
    maxHealth = 3;

    // Seconds of invulnerability after taking damage.
    damageCooldown = 1;
    damageCooldownRemaining = 0;

    // ---- Combat modifiers --------------------------------------------------
    // Plain fields so they can change at any time; read them through the getters below,
    // which ignore invalid values.

    // Scales the current weapon's range.
    rangeMultiplier = 1;
    // Scales the damage the player inflicts.
    damageDealtMultiplier = 1;
    // Scales the damage the player receives.
    damageTakenMultiplier = 1;

    // ---- Exploration -------------------------------------------------------

    currentChamber = null;
    visitedChambers = new Set();
    discoveredChambers = new Set();

    get isDead() {
        return this.health <= 0;
    }

    get isInvulnerable() {
        return this.damageCooldownRemaining > 0;
    }

    update() {
        if (this.damageCooldownRemaining > 0) {
            this.damageCooldownRemaining = Math.max(0, this.damageCooldownRemaining - Time.deltaTime);
        }
    }

    // ---- Health ----------------------------------------------------------

    heal(amount) {
        if (this.isDead || !(amount > 0)) return;
        this.health = Math.min(this.health + amount, this.maxHealth);
    }

    // incomingDamage is the raw damage; damageTakenMultiplier is applied here, once.
    // Returns the damage actually taken (0 while invulnerable or dead).
    takeDamage(incomingDamage) {
        if (this.isDead || this.isInvulnerable) return 0;

        const damage = this.getDamageTaken(incomingDamage);
        if (!(damage > 0)) return 0;

        this.health = Math.max(0, this.health - damage);
        this.damageCooldownRemaining = this.damageCooldown;

        console.log("Dano: " + damage);
        if (this.isDead) {
            console.log("VOCÊ MORREU");
        }

        return damage;
    }

    // ---- Combat modifiers --------------------------------------------------

    // EffectiveRange = WeaponBaseRange × rangeMultiplier
    getEffectiveRange(baseRange) {
        return baseRange * validMultiplier(this.rangeMultiplier, "rangeMultiplier");
    }

    // DamageDealt = WeaponBaseDamage × damageDealtMultiplier
    getDamageDealt(baseDamage) {
        return baseDamage * validMultiplier(this.damageDealtMultiplier, "damageDealtMultiplier");
    }

    // DamageReceived = IncomingDamage × damageTakenMultiplier
    getDamageTaken(incomingDamage) {
        return incomingDamage * validMultiplier(this.damageTakenMultiplier, "damageTakenMultiplier");
    }

    // ---- Exploration -------------------------------------------------------

    resetExploration() {
        this.visitedChambers.clear();
        this.discoveredChambers.clear();
        this.currentChamber = null;
    }

    enterChamber(chamber) {
        this.currentChamber = chamber;
        if (!chamber) return;

        this.visitedChambers.add(chamber.instance);
        this.discoveredChambers.delete(chamber.instance);
    }
}

const warnedMultipliers = new Set();

// A multiplier must be a finite number >= 0; anything else counts as 1 (warned once).
function validMultiplier(value, name) {
    if (Number.isFinite(value) && value >= 0) return value;

    if (!warnedMultipliers.has(name)) {
        warnedMultipliers.add(name);
        console.warn(`PlayerState.${name} must be a finite number >= 0 (got ${value}); using 1.`);
    }
    return 1;
}
