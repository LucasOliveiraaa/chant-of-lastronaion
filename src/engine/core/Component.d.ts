import type GameObject from "./GameObject.js";
import type Graphics from "../rendering/Graphics.js";
import type Collision from "../physics/Collision.js";
import type Collider from "../physics/Collider.js";

type ComponentState = "created" | "starting" | "started" | "failed" | "destroyed";

export default class Component {
    /** The GameObject this component is attached to. Null before setup and after destroy. */
    readonly gameObject: GameObject;

    /**
     * Unity's [RequireComponent]: addComponent adds these first when the GameObject doesn't have them.
     * Inherited by subclasses. Example: `static requiredComponents = [Rigidbody];`
     */
    static requiredComponents?: (new (...args: any[]) => Component)[];

    constructor();

    get isStarted(): boolean;
    get isDestroyed(): boolean;
    get lifecycleState(): ComponentState;

    on(event: string, callback: (...args: any[]) => void): void;
    off(event: string, callback: (...args: any[]) => void): void;
    notify(event: string, ...args: any[]): void;

    awake(): void;
    start(): Promise<void> | void;

    fixedUpdate(): void;
    update(): void;
    lateUpdate(): void;

    onDestroy(): void;

    /** Optional messages sent by the physics engine when neither collider is a trigger. */
    onCollisionEnter?(collision: Collision): void;
    onCollisionStay?(collision: Collision): void;
    /** The Collision has no contact points here, like Unity. */
    onCollisionExit?(collision: Collision): void;

    /** Optional messages sent by the physics engine, with the other object's collider, when either collider is a trigger. */
    onTriggerEnter?(other: Collider): void;
    onTriggerStay?(other: Collider): void;
    onTriggerExit?(other: Collider): void;

    /** Optional debug drawing, in screen space after lighting (RenderingEngine.drawGizmos toggles it). */
    onDrawGizmos?(graphics: Graphics): void;
}