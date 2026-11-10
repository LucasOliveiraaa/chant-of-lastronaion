import SolidRenderer from "../../engine/components/SolidRenderer.js";
import Entity from "../../engine/entity.js";
import Input from "../../engine/input.js";
import Vector2 from "../../engine/vector2.js";

const SPEED = 100;

export default class Player extends Entity {
    constructor() {
        super(Vector2.ZERO, new Vector2(100, 100));

        this.addComponent(new SolidRenderer("red"));
    }

    update(deltaTime) {
        if (Input.isKeyPressed("KeyW")) {
            this.position.y -= SPEED * deltaTime;
        }
        if (Input.isKeyPressed("KeyS")) {
            this.position.y += SPEED * deltaTime;
        }
        if (Input.isKeyPressed("KeyA")) {
            this.position.x -= SPEED * deltaTime;
        }
        if (Input.isKeyPressed("KeyD")) {
            this.position.x += SPEED * deltaTime;
        }
    }
}