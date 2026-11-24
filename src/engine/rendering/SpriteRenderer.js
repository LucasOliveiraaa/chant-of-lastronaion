import Renderer from "./Renderer.js";
import Sprites from "../assets/Sprites.js";

export default class SpriteRenderer extends Renderer {
    currentSprite = null;
    spriteSheet = null;

    flipX = false;
    flipY = false;
    // Turn off to keep pixel art sharp when scaled.
    imageSmoothing = true;
    opacity = 1;

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

    render(graphics) {
        if (!this.currentSprite || !this.spriteSheet) return;

        const { scale } = this.gameObject.transform;
        graphics.alpha = this.opacity;
        graphics.imageSmoothing = this.imageSmoothing;
        graphics.drawSprite(this.currentSprite, 0, 0, scale.x, scale.y, this.flipX, this.flipY);
    }
}
