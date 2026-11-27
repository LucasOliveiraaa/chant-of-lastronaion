import Component from "../../../engine/core/Component.js";

export default class EnemyState extends Component {
    health = 3;

    get isDead() {
        return this.health <= 0;
    }

    // Returns the damage actually taken.
    takeDamage(amount) {
        if (this.isDead || !(amount > 0)) return 0;

        this.health = Math.max(0, this.health - amount);
        console.log("Dano: " + amount);

        if (this.isDead) {
            console.log("INIMIGO MORTO");
            this.gameObject.destroy();
        }

        return amount;
    }
}
