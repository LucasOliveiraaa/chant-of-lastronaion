import UIElement from "./UIElement.js";
import Sprites from "../assets/Sprites.js";

/**
 * Draws a sprite from the Sprites manager inside the element's rect (Unity's UI Image).
 *
 * Static:   uiSprite.setSprite(spriteIdOrName)
 * Animated: add an Animator to the same GameObject and call animator.setAnimation(name).
 */
export default class UISprite extends UIElement {
    currentSprite = null;
    spriteSheet = null;

    // Keeps the sprite's proportions, centered in the rect, instead of stretching it.
    preserveAspect = false;
    // Off by default so pixel art stays sharp when scaled.
    imageSmoothing = false;
    opacity = 1;

    // Same contract as SpriteRenderer.setSprite, so an Animator can drive either one.
    // Accepts the sprite's id or name; null clears it.
    setSprite(spriteIdOrName) {
        if (spriteIdOrName === null || spriteIdOrName === undefined) {
            this.currentSprite = null;
            this.spriteSheet = null;
            return;
        }

        const sprites = Sprites.getInstance();
        const sprite = sprites.getSprite(spriteIdOrName);
        if (!sprite) {
            console.warn(`Sprite "${spriteIdOrName}" not found.`);
            return;
        }
        if (sprite === this.currentSprite) return;

        this.currentSprite = sprite;
        this.spriteSheet = sprites.getSpriteSheet(sprite.spriteSheetId);
    }

    render(ctx) {
        if (!this.currentSprite || !this.spriteSheet) return;

        const { position, size } = this.currentSprite;
        let { x, y, w, h } = this.rect;
        if (w <= 0 || h <= 0 || size.x <= 0 || size.y <= 0) return;

        if (this.preserveAspect) {
            const scale = Math.min(w / size.x, h / size.y);
            const fitW = size.x * scale;
            const fitH = size.y * scale;
            x += (w - fitW) / 2;
            y += (h - fitH) / 2;
            w = fitW;
            h = fitH;
        }

        ctx.globalAlpha *= this.opacity;
        ctx.imageSmoothingEnabled = this.imageSmoothing;
        ctx.drawImage(
            this.spriteSheet.asset.image,
            position.x, position.y, size.x, size.y,
            x, y, w, h
        );
    }
}
