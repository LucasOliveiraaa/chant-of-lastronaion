import type GameObject from "./GameObject";
import type Component from "./Component";
import type PhysicsEngine from "../physics/PhysicsEngine";

/** The single scene plus the game loop. GameObjects register themselves on construction. */
export default class World {
    private constructor();
    static getInstance(): World;

    readonly canvas: HTMLCanvasElement;
    readonly ctx: CanvasRenderingContext2D;
    readonly gameObjects: readonly GameObject[];
    readonly physics: PhysicsEngine;

    /** Called by the GameObject constructor; starts the object if the world is running. */
    addGameObject<T extends GameObject>(gameObject: T): T;
    /** Called by GameObject.destroy(). */
    removeGameObject(gameObject: GameObject): void;

    /** Every component of the given type in the scene (Unity's Object.FindObjectsByType). */
    findObjectsByType<T extends Component>(componentClass: new (...args: any[]) => T): T[];

    /** Binds the canvas, input and time, then starts every GameObject created so far. */
    init(canvas: HTMLCanvasElement): Promise<void>;
    /** Starts the game loop. Throws if init() hasn't finished. */
    run(): void;
    stop(): void;
    /** Matches the canvas to the window size. */
    resize(): void;
}
