import Vector2 from "../math/Vector2.js";
import Assets from "./Assets.js";

export default class Sprites {
    static instance = null;
    constructor() { }

    static getInstance() {
        if (!Sprites.instance) {
            Sprites.instance = new Sprites();
        }
        return Sprites.instance;
    }

    sprites = new Map();
    spriteSheets = new Map();

    async loadSpriteSheet(src) {
        const id = this.spriteSheets.size;
        const asset = await Assets.loadImage(`spritesheet-${id}`, src);
        return this.defineSpriteSheet(asset);
    }
    defineSpriteSheet(asset) {
        const id = this.spriteSheets.size;
        this.spriteSheets.set(id, {
            asset,
            size: new Vector2(asset.width, asset.height)
        });
        return id;
    }

    defineSprite(spriteSheetId, position, size) {
        if (!this.spriteSheets.has(spriteSheetId)) {
            throw new Error(`Sprite sheet with ID ${spriteSheetId} does not exist.`);
        }
        const id = this.sprites.size;
        this.sprites.set(id, {
            id,
            spriteSheetId,
            position,
            size
        });
        return id;
    }

    sliceSpriteSheet(
        spriteSheetId,
        rows,
        cols,
        gap = Vector2.zero(),
        padding = Vector2.zero(),
        scissorOffset = null,
        scissorSize = null
    ) {
        const spriteSheet = this.spriteSheets.get(spriteSheetId);
        if (!spriteSheet) {
            throw new Error(`Sprite sheet with ID ${spriteSheetId} does not exist.`);
        }

        let { size: sheetSize } = spriteSheet;
        let baseX = 0, baseY = 0;

        if ((scissorOffset === null) !== (scissorSize === null)) {
            throw new Error(`Both scissorOffset and scissorSize must be provided together.`);
        }

        if (scissorOffset !== null) {
            if (scissorSize.x <= 0 || scissorSize.y <= 0) {
                throw new Error(`Scissor size must be positive.`);
            }
            if (scissorOffset.x < 0 || scissorOffset.y < 0 || scissorOffset.x + scissorSize.x > sheetSize.x || scissorOffset.y + scissorSize.y > sheetSize.y) {
                throw new Error(`Scissor rectangle is out of bounds of the sprite sheet.`);
            }
            sheetSize = scissorSize;
            baseX = scissorOffset.x;
            baseY = scissorOffset.y;
        }

        baseX += padding.x;
        baseY += padding.y;

        const frameWidth = (sheetSize.x - (cols - 1) * gap.x - 2 * padding.x) / cols;
        const frameHeight = (sheetSize.y - (rows - 1) * gap.y - 2 * padding.y) / rows;

        const spriteIds = [];
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const position = new Vector2(
                    baseX + col * (frameWidth + gap.x),
                    baseY + row * (frameHeight + gap.y)
                );
                const size = new Vector2(frameWidth, frameHeight);
                const spriteId = this.defineSprite(spriteSheetId, position, size);
                spriteIds.push(spriteId);
            }
        }

        return spriteIds;
    }

    getSpriteSheet(id) {
        return this.spriteSheets.get(id);
    }

    getSprite(id) {
        return this.sprites.get(id);
    }

    removeSpriteSheetSprites(spriteSheetId) {
        for (const [spriteId, sprite] of this.sprites.entries()) {
            if (sprite.spriteSheetId === spriteSheetId) {
                this.sprites.delete(spriteId);
            }
        }
    }

    removeSpriteSheet(id) {
        if (!this.spriteSheets.has(id)) {
            throw new Error(`Sprite sheet with ID ${id} does not exist.`);
        }
        this.removeSpriteSheetSprites(id);
        this.spriteSheets.delete(id);
    }

    removeSprite(id) {
        if (!this.sprites.has(id)) {
            throw new Error(`Sprite with ID ${id} does not exist.`);
        }
        this.sprites.delete(id);
    }
}