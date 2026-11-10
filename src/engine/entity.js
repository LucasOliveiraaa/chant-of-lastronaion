import Vector2 from "./vector2.js";

export default class Entity {
    components = [];

    constructor(position = Vector2.ZERO, size = Vector2.ONE) {
        this.position = position;
        this.size = size;
    }

    addComponent(component) {
        this.components.push(component);
    }

    removeComponent(component) {
        const index = this.components.indexOf(component);
        if (index !== -1) {
            this.components.splice(index, 1);
        }
    }

    __update(world, deltaTime) {
        for (const component of this.components) {
            if (component.update) {
                component.update(world, this, deltaTime);
            }
        }

        this.update(deltaTime);
    }

    update(deltaTime) {
        // Update the entity's position or state
    }
}