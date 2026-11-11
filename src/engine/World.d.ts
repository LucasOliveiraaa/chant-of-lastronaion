import type Entity from "./Entity.js";

export default class World {
    get canvas(): HTMLCanvasElement;
    get ctx(): CanvasRenderingContext2D;
    get entities(): Entity[];

    private constructor();
    
    static getInstance(): World;

    init(canvas: HTMLCanvasElement): void;

    addEntity<T extends Entity>(entity: T): T;
    removeEntity<T extends Entity>(entity: T): void;

    getEntitiesByName(name: string): Entity[];
    getEntitiesByTag(tag: string): Entity[];

    getComponents<T>(componentClass: new (...args: any[]) => T): [Entity, T][];

    run(): void;
}