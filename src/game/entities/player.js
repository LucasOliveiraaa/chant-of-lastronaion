import Collider from "../../engine/components/Collider.js";
import Rigidbody from "../../engine/components/Rigidbody.js";
import SpriteRenderer from "../../engine/components/SpriteRenderer.js";
import Entity from "../../engine/Entity.js";
import Input from "../../engine/Input.js";
import Vector2 from "../../engine/Vector2.js";

const SPEED = 100;

export default class Player extends Entity {
    facing = "South";

    constructor() {
        super(new Vector2(0, 0), new Vector2(100, 100));

        this.rigidbody = this.addComponent(new Rigidbody({ mass: 1, gravityScale: 0 }));
        this.addComponent(new Collider({ type: "square", size: this.size }));

        Collider.debug = true;
    }

    update(deltaTime) {
        const x = Number(Input.isKeyPressed("KeyD")) - Number(Input.isKeyPressed("KeyA"));
        const y = Number(Input.isKeyPressed("KeyS")) - Number(Input.isKeyPressed("KeyW"));

        // Normalized so diagonals aren't faster.
        const length = Math.hypot(x, y) || 1;
        this.rigidbody.velocity.set((x / length) * SPEED, (y / length) * SPEED);

        if (x !== 0) this.facing = x > 0 ? "East" : "West";
        else if (y !== 0) this.facing = y > 0 ? "South" : "North";

        this.getComponent(SpriteRenderer)?.setAnimation(
            x !== 0 || y !== 0 ? `run${this.facing}` : "idle"
        );
    }
}