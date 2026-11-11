import type Entity from "./entity.js";

export default class World {
    get canvas(): HTMLCanvasElement;
    get ctx(): CanvasRenderingContext2D;
    get entities(): Entity[];

    private constructor();
    
    static getInstance(): World;

    init(canvas: HTMLCanvasElement): void;

    addEntity(entity: Entity): void;
    removeEntity(entity: Entity): void;

    getEntitiesByName(name: string): Entity[];
    getEntitiesByTag(tag: string): Entity[];

    getComponents<T>(componentClass: new (...args: any[]) => T): [Entity, T][];

    run(): void;
}