import type Component from "./Component.js";
import type Vector2 from "./Vector2.js";

export default class Entity {
    public name: string | null;
    public tags: Set<string>;

    public position: Vector2;
    public size: Vector2;

    constructor(
        position: Vector2,
        size: Vector2,
    );

    addComponent<T extends Component>(component: T): T;
    removeComponent<T extends Component>(component: T): void;
    getComponent<T>(componentClass: new (...args: any[]) => T): T | null;

    update(deltaTime: number): void;

    onCollisionEnter(other: Entity): void;
    onCollisionStay(other: Entity): void;
    onCollisionExit(other: Entity): void;
}