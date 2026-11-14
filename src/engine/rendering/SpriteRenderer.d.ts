import type Component from "../core/Component.js";
import type { Sprite, SpriteId, SpriteSheet } from "../assets/Sprites.js";

/** Draws a sprite from the Sprites manager over the GameObject's rect (position and scale). */
export default class SpriteRenderer extends Component {
    readonly currentSprite: Sprite | null;
    readonly spriteSheet: SpriteSheet | null;

    /** Shows the sprite with this id or name; null clears it. */
    setSprite(sprite: SpriteId | string | null): void;
}
