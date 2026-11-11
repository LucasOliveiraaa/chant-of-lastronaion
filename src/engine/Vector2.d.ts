export default class Vector2 {
    static zero(): Vector2;
    static one(): Vector2;
    static up(): Vector2;
    static down(): Vector2;
    static left(): Vector2;
    static right(): Vector2;

    public x: number;
    public y: number;

    constructor(x: number, y: number);

    set(x: number, y: number): void;
    clone(): Vector2;
    equals(other: Vector2): boolean;

    add(other: Vector2): Vector2;
    subtract(other: Vector2): Vector2;
    multiply(scalar: number): Vector2;
    divide(scalar: number): Vector2;
    dot(other: Vector2): number;
    length(): number;
    normalize(): Vector2;
    distanceTo(other: Vector2): number;
}