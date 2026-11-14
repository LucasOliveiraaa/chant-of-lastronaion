import type GameObject from "./GameObject";

export default class World {
    private constructor();
    static getInstance(): World;

    get canvas(): HTMLCanvasElement;
    get ctx(): CanvasRenderingContext2D;
    get entities(): GameObject[];

    addGameObject<T extends GameObject>(GameObject: T): T;
    removeGameObject<T extends GameObject>(GameObject: T): void;

    getEntitiesByName(name: string): GameObject[];
    getEntitiesByTag(tag: string): GameObject[];

    getComponents<T>(componentClass: new (...args: any[]) => T): [GameObject, T][];

    init(canvas: HTMLCanvasElement): Promise<void>;
    run(): Promise<void>;
}