import type Entity from "./Entity.js";

export default class Component {
    /**
     * Called every frame.
     */
    update(target: Entity, deltaTime: number): void;
}