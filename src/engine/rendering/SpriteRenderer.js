import World from "../core/World.js";
import Component from "../core/Component.js";
import Sprites from "../assets/Sprites.js";

export default class SpriteRenderer extends Component {
    currentSprite = null;
    spriteSheet = null;

    setSprite(spriteId) {
        if (this.currentSprite?.id === spriteId) return;

        const sprite = Sprites.getInstance().getSprite(spriteId);
        if (!sprite) {
            console.warn(`Sprite with ID ${spriteId} not found.`);
            return;
        }
        
        this.currentSprite = sprite;
        this.spriteSheet = Sprites.getInstance().getSpriteSheet(sprite.spriteSheetId);
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