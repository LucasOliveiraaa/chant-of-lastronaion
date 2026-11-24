import type { Sprite, SpriteId } from "../assets/Sprites.js";
import type Vector2 from "../math/Vector2.js";
import type Transform from "../core/Transform.js";

export type TextOptions = {
    /** CSS font. Default "16px sans-serif". */
    font?: string;
    /** Default "#000000". */
    color?: string;
    /** Default "left". */
    align?: CanvasTextAlign;
    /** Default "alphabetic". */
    baseline?: CanvasTextBaseline;
    maxWidth?: number;
};

/**
 * Draws on the game canvas; passed to Renderer.render(), UIElement.render() and onDrawGizmos().
 * Coordinates are in the current space (a renderer's rect space, or screen space).
 * Colors are any CSS color.
 */
export default class Graphics {
    constructor(ctx: CanvasRenderingContext2D);

    readonly width: number;
    readonly height: number;

    /** 0 to 1, applied to every draw. */
    alpha: number;
    imageSmoothing: boolean;

    /** Saves the state, including clips. */
    save(): void;
    restore(): void;
    /** Clips the next draws to the rect until restore(). */
    clip(x: number, y: number, width: number, height: number): void;
    clear(): void;

    setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void;

    fillRect(x: number, y: number, width: number, height: number, color: string): void;
    strokeRect(x: number, y: number, width: number, height: number, color: string, lineWidth?: number): void;
    fillRoundRect(x: number, y: number, width: number, height: number, radius: number, color: string): void;
    strokeRoundRect(x: number, y: number, width: number, height: number, radius: number, color: string, lineWidth?: number): void;
    fillCircle(x: number, y: number, radius: number, color: string): void;
    strokeCircle(x: number, y: number, radius: number, color: string, lineWidth?: number): void;
    fillPolygon(points: Vector2[], color: string): void;
    strokePolygon(points: Vector2[], color: string, lineWidth?: number): void;
    drawLine(x1: number, y1: number, x2: number, y2: number, color: string, lineWidth?: number): void;

    /** Draws a sprite (object, id or name) stretched over the rect, optionally mirrored. */
    drawSprite(sprite: Sprite | SpriteId | string, x: number, y: number, width: number, height: number, flipX?: boolean, flipY?: boolean): void;
    drawImage(image: CanvasImageSource, x: number, y: number, width?: number, height?: number): void;
    drawText(text: string, x: number, y: number, options?: TextOptions): void;
    /** Width of the text in pixels. */
    measureText(text: string, font?: string): number;

    /** @internal Clears the canvas and the cached state. Called by the RenderingEngine every frame. */
    __beginFrame(): void;
    /** @internal World to screen matrix [a, b, c, d, e, f], from the camera. */
    __setView(matrix: number[]): void;
    /** @internal Draws in screen space. */
    __resetSpace(): void;
    /** @internal Draws in world space, through the view. */
    __setWorldSpace(): void;
    /** @internal Draws in the transform's rect space, with its rotation applied around the center. */
    __setLocalSpace(transform: Transform): void;
    /** @internal Fills the transparent pixels, behind what was drawn. */
    __fillBehind(color: string): void;
    /** @internal The raw context, for engine passes such as lighting. */
    readonly __context: CanvasRenderingContext2D;
}
