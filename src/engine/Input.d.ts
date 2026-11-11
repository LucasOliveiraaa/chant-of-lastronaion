import type Vector2 from "./Vector2.js";

export default class Input {
    private constructor();
    static getInstance(): Input;
    static init(canvas: HTMLCanvasElement): void;

    static isKeyPressed(key: string): boolean;
    static isMouseButtonPressed(button: number): boolean;
    static getMousePosition(): Vector2;
}