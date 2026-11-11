import Vector2 from "./Vector2.js";

export default class Entity {
    components = [];

    name = null;
    tags = new Set();

    constructor(position = Vector2.zero(), size = Vector2.one()) {
        this.position = position;
        this.size = size;
    }

    addComponent(component) {
        this.components.push(component);
        return component;
    }

    removeComponent(component) {
        const index = this.components.indexOf(component);
        if (index !== -1) {
            this.components.splice(index, 1);
        }
    }

    getComponent(componentClass) {
        return this.components.find(component => component instanceof componentClass);
    }

    __update(deltaTime) {
        for (const component of this.components) {
            if (component.update) {
                component.update(this, deltaTime);
            }
        }

        this.update(deltaTime);
    }

    update(deltaTime) {
        // Update the entity's position or state
    }

    onCollisionEnter(otherEntity) {
        // Handle collision with another entity
    }

    onCollisionStay(otherEntity) {
        // Handle ongoing collision with another entity
    }
    
    onCollisionExit(otherEntity) {
        // Handle end of collision with another entity
    }
}