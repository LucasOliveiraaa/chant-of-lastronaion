import type Entity from "./entity.js";

export default class World {
    get canvas(): HTMLCanvasElement;
    get ctx(): CanvasRenderingContext2D;

    private constructor();
    
    static getInstance(): World;

    init(canvas: HTMLCanvasElement): void;

    addEntity(entity: Entity): void;
    removeEntity(entity: Entity): void;

    getEntitiesById(id: string): Entity[];
    getEntitiesByName(name: string): Entity[];

    run(): void;
}