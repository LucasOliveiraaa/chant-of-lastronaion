import World from "../core/World.js";
import Component from "../core/Component.js";
import Sprites from "../assets/Sprites.js";

export default class SpriteRenderer extends Component {
    currentSprite = null;
    spriteSheet = null;

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

    update() {
        if (!this.currentSprite) return;
        if (!this.spriteSheet) return;

        const ctx = World.getInstance().ctx;

        const { position, size } = this.currentSprite;
        const { asset } = this.spriteSheet;

        ctx.drawImage(
            asset.image,
            position.x,
            position.y,
            size.x,
            size.y,
            this.gameObject.transform.position.x,
            this.gameObject.transform.position.y,
            this.gameObject.transform.scale.x,
            this.gameObject.transform.scale.y
        );
    }
}