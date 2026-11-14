import type Component from "./Component";
import type Vector2 from "../math/Vector2";
import type Transform from "./Transform";

export default class GameObject {
    public name: string | null;
    public tag: string | null;

    public transform: Transform;

    static find(name: string): GameObject | null;
    static findWithTag(tag: string): GameObject | null;
    static findAllWithTag(tag: string): GameObject[];

    constructor();
    constructor(name: string);
    constructor<T extends (new (...args: any[]) => Component)[]>(name: string, ...components: T);

    addComponent<T extends Component>(componentClass: new (...args: any[]) => T): T;
    removeComponent<T extends Component>(componentClass: new (...args: any[]) => T): void;
    getComponent<T extends Component>(componentClass: new (...args: any[]) => T): T | null;

    sendMessage(message: string, ...args: any[]): void;

    destroy();

    start(): void;

    fixedUpdate(): void;
    update(): void;
    lateUpdate(): void;
}