import Component from "../../engine/core/Component.js";
import Time from "../../engine/core/Time.js";

export default class PlayerState extends Component {
    health = 3;
    maxHealth = 3;

    damageCooldown = 1;
    damageCooldownCounter = 0;
    onCooldown = false;

    coins = 0;
    maxCoins = 100;

    weapon = null;

    update() {
        if (this.onCooldown) {
            this.damageCooldownCounter += Time.deltaTime;
            if (this.damageCooldownCounter > this.damageCooldown) {
                this.damageCooldownCounter -= this.damageCooldown;
                this.onCooldown = false;
            }
        }
    }

    onCollisionEnter(other) {
        if(other.name == "moeda-1") {
            this.addCoins(1);
            other.destroy();
        }
        if (other.name == "moeda-5") {
            this.addCoins(5);
            other.destroy();
        }
        if (other.name == "moeda-10") {
            this.addCoins(10);
            other.destroy();
        }
        if (other.name == "half-heart") {
            this.heal(0.5);
            other.destroy();
        }
        if (other.name == "heart") {
            this.heal(1);
            other.destroy();
        }
        if (other.name == "double-heart") {
            this.heal(2);
            other.destroy();
        }
        if (other.name == "guitar") {
            this.weapon = "guitar";
            other.destroy();
        }
    }

    addCoins(ammount) {
        this.coins += ammount;
        if (this.coins > this.maxCoins) {
            this.coins = this.maxCoins;
        }
    }

    heal(ammount) {
        this.health += ammount;
        if (this.health > this.maxHealth) {
            this.health = this.maxHealth;
        }
    }

    takeDamage(ammount) {
        if (this.onCooldown) return;

        this.health -= ammount;
        console.log("Dano: " + ammount);
        if (this.health <= 0) {
            this.health = 0;
            console.log("VOCÊ MORREU");
        }

        this.onCooldown = true;
    }
}