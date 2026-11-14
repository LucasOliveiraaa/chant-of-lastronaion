import type Vector2 from "../math/Vector2";

export type AxisConfig = {
    negative: string[];
    positive: string[];
};

export default class Input {
    private constructor();
    static getInstance(): Input;
    static init(canvas: HTMLCanvasElement): void;

    static isKeyPressed(...keys: string[]): boolean;
    static isMouseButtonPressed(button: number): boolean;
    static getMousePosition(): Vector2;

    static getAxis(axisName: string): number;
    static setAxisConfig(axisName: string, config: AxisConfig): void;
}