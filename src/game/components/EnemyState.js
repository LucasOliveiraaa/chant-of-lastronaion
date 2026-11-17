import Component from "../../engine/core/Component.js";

export default class EnemyState extends Component {
    health = 3;

    takeDamage(ammount) {
        this.health -= ammount;
        console.log("Dano: " + ammount);

        if (this.health <= 0) {
            this.health = 0;
            console.log("INIMIGO MORTO");
            this.gameObject.destroy();
        }
    }
}