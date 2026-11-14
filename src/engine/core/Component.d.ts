import type GameObject from "./GameObject.js";

type ComponentState = "created" | "starting" | "started" | "failed" | "destroyed";

export default class Component {
    /** The GameObject this component is attached to. Null before setup and after destroy. */
    readonly gameObject: GameObject;

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

    /** Optional messages sent by the physics engine with the other GameObject. */
    onCollisionEnter?(other: GameObject): void;
    onCollisionStay?(other: GameObject): void;
    onCollisionExit?(other: GameObject): void;
}