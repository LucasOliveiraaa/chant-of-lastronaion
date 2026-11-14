import type Component from "./Component";
import type Transform from "./Transform";

type ComponentClass<T extends Component = Component> = new (...args: any[]) => T;

export default class GameObject {
    name: string;
    /** Single tag, like Unity. Default "Untagged". */
    tag: string;

    /** A Transform, or a RectTransform once one is added. */
    transform: Transform;

    /** First GameObject with this name, or null. */
    static find(name: string): GameObject | null;
    /** First GameObject with this tag, or null. */
    static findWithTag(tag: string): GameObject | null;
    static findGameObjectsWithTag(tag: string): GameObject[];

    /** Creates the object, adds the components in order and registers it in the World. */
    constructor(name?: string, ...components: ComponentClass[]);

    compareTag(tag: string): boolean;

    /** Creates the component and calls its awake(). It starts with the object (or right away if already started). */
    addComponent<T extends Component>(componentClass: ComponentClass<T>): T;
    /** Destroys every component that is an instance of the class. */
    removeComponent<T extends Component>(componentClass: ComponentClass<T>): void;
    /** First component that is an instance of the class (subclasses included), or null. */
    getComponent<T extends Component>(componentClass: ComponentClass<T>): T | null;
    getComponents<T extends Component>(componentClass: ComponentClass<T>): T[];

    /** Delivers a message (e.g. "OnCollisionEnter") to every started component. */
    sendMessage(message: string, ...args: any[]): void;

    /** Destroys the children, the components, and removes the object from the World. */
    destroy(): void;

    /** @internal Called by World. */
    start(): Promise<void>;
    /** @internal Called by World. */
    fixedUpdate(): void;
    /** @internal Called by World. */
    update(): void;
    /** @internal Called by World. */
    lateUpdate(): void;
}
