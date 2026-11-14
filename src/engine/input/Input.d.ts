import type Vector2 from "../math/Vector2";

export type AxisConfig = {
    /** Keys (KeyboardEvent.code) that push the axis towards -1. */
    negative: string[];
    /** Keys (KeyboardEvent.code) that push the axis towards 1. */
    positive: string[];
    /** Units per second the value moves towards the input. Omit for a raw (-1/0/1) axis. */
    sensitivity?: number;
    /** Units per second the value falls back to 0 with no input. Defaults to sensitivity. */
    gravity?: number;
    /** Jump to 0 when the input reverses direction. */
    snap?: boolean;
};

/**
 * Static, like Unity's (legacy) Input. Keys are KeyboardEvent.code names ("KeyW", "Space", "ArrowUp").
 * "Down"/"Up" queries are true for the whole frame in which the change happened.
 */
export default class Input {
    private constructor();

    /** True while any of the keys is held. */
    static getKey(...keys: string[]): boolean;
    /** True during the frame any of the keys was pressed. */
    static getKeyDown(...keys: string[]): boolean;
    /** True during the frame any of the keys was released. */
    static getKeyUp(...keys: string[]): boolean;

    /** True while any key or mouse button is held. */
    static readonly anyKey: boolean;
    /** True during the frame any key or mouse button was pressed. */
    static readonly anyKeyDown: boolean;

    /** 0 left, 1 right, 2 middle (Unity's numbering, not the DOM's). */
    static getMouseButton(button: number): boolean;
    static getMouseButtonDown(button: number): boolean;
    static getMouseButtonUp(button: number): boolean;

    /** Pointer position in canvas pixels, origin top-left, y down. Returns a copy. */
    static readonly mousePosition: Vector2;
    /** Wheel notches this frame; y is positive when scrolling up. Returns a copy. */
    static readonly mouseScrollDelta: Vector2;

    /**
     * Axis value from -1 to 1. Equals getAxisRaw unless the axis config has a sensitivity.
     * "Horizontal" (A/D, arrows) and "Vertical" (W/S, arrows; down is positive) exist by default.
     */
    static getAxis(axisName: string): number;
    /** -1, 0 or 1, with no smoothing. */
    static getAxisRaw(axisName: string): number;
    static setAxisConfig(axisName: string, config: AxisConfig): void;

    /** @internal Called by World. */
    static __init(canvas: HTMLCanvasElement): void;
    /** @internal Called by World at the start of every frame. */
    static __beginFrame(unscaledDeltaTime?: number): void;
}
