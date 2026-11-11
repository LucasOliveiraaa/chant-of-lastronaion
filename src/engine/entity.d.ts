export default class Entity {
    public name: string | null;
    public tags: Set<string>;

    constructor(
        public position: Vector2,
        public size: Vector2,
    );

    addComponent(component: Component): Component;
    removeComponent(component: Component): void;
    getComponent<T>(componentClass: new (...args: any[]) => T): T | null;

    update(deltaTime: number): void;

    onCollisionEnter(other: Entity): void;
    onCollisionStay(other: Entity): void;
    onCollisionExit(other: Entity): void;
}