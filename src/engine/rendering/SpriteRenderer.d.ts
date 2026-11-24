import type Renderer from "./Renderer.js";
import type { Sprite, SpriteId, SpriteSheet } from "../assets/Sprites.js";

/** Draws a sprite from the Sprites manager over the GameObject's rect (position, scale and rotation). */
export default class SpriteRenderer extends Renderer {
    readonly currentSprite: Sprite | null;
    readonly spriteSheet: SpriteSheet | null;

    /** Mirrors the sprite horizontally. Default false. */
    flipX: boolean;
    /** Mirrors the sprite vertically. Default false. */
    flipY: boolean;
    /** Turn off to keep pixel art sharp when scaled. Default true. */
    imageSmoothing: boolean;
    /** 0 to 1. Default 1. */
    opacity: number;

    /** Shows the sprite with this id or name; null clears it. */
    setSprite(sprite: SpriteId | string | null): void;
}
