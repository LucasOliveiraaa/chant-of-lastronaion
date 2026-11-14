import UIElement from "./UIElement.js";
import type { Sprite, SpriteId, SpriteSheet } from "../assets/Sprites.js";

/**
 * Draws a sprite from the Sprites manager inside the element's rect (Unity's UI Image).
 *
 * - Static: call `setSprite(spriteIdOrName)`.
 * - Animated: add an `Animator` to the same GameObject and call `animator.setAnimation(name)`.
 */
export default class UISprite extends UIElement {
    constructor();

    readonly currentSprite: Sprite | null;
    readonly spriteSheet: SpriteSheet | null;

    /** Keeps the sprite's proportions, centered in the rect, instead of stretching it. Default false. */
    preserveAspect: boolean;
    /** Canvas image smoothing. Default false, so pixel art stays sharp. */
    imageSmoothing: boolean;
    /** 0 to 1, multiplied with the parent's alpha. Default 1. */
    opacity: number;

    /** Shows the sprite with this id or name; null clears it. Same contract as SpriteRenderer.setSprite. */
    setSprite(sprite: SpriteId | string | null): void;

    render(ctx: CanvasRenderingContext2D): void;
}
