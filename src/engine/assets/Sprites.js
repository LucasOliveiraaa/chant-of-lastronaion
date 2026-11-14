import Vector2 from "../math/Vector2.js";
import Assets from "./Assets.js";

// Registry of sprite sheets and the sprites cut from them, addressed by id or name.
// Ids come from counters and are never reused, so they stay valid after removals.
export default class Sprites {
    static instance = null;

    static getInstance() {
        if (!Sprites.instance) {
            Sprites.instance = new Sprites();
        }
        return Sprites.instance;
    }

    #nextSheetId = 0;
    #nextSpriteId = 0;
    #loading = new Map(); // sheet name -> Promise<sheet id>

    spriteSheets = new Map();      // id -> { id, name, asset, size }
    spriteSheetNames = new Map();  // name -> id
    sprites = new Map();           // id -> { id, name, spriteSheetId, position, size }
    spriteNames = new Map();       // name -> id

    // Loads the image (through Assets) and defines it as a sheet. Concurrent or repeated
    // calls with the same name share one load and return the same id.
    loadSpriteSheet(src, name = src) {
        const existing = this.spriteSheetNames.get(name);
        if (existing !== undefined) return Promise.resolve(existing);

        const pending = this.#loading.get(name);
        if (pending) return pending;

        const promise = Assets.loadImage(name, src)
            .then((asset) => this.spriteSheetNames.get(name) ?? this.defineSpriteSheet(asset, name))
            .finally(() => this.#loading.delete(name));

        this.#loading.set(name, promise);
        return promise;
    }

    // Defining a name that already exists updates that sheet in place and keeps its id.
    defineSpriteSheet(asset, name = asset.key) {
        const sheet = { name, asset, size: new Vector2(asset.width, asset.height) };
        const existingId = this.spriteSheetNames.get(name);

        if (existingId !== undefined) {
            Object.assign(this.spriteSheets.get(existingId), sheet);
            return existingId;
        }

        const id = this.#nextSheetId++;
        this.spriteSheets.set(id, { id, ...sheet });
        this.spriteSheetNames.set(name, id);
        return id;
    }

    // name is optional. Defining a name that already exists updates that sprite in place.
    defineSprite(spriteSheet, position, size, name = null) {
        const spriteSheetId = this.#resolveSheet(spriteSheet);
        if (spriteSheetId === undefined) {
            throw new Error(`Sprite sheet "${spriteSheet}" does not exist.`);
        }

        const sprite = { name, spriteSheetId, position, size };
        const existingId = name === null ? undefined : this.spriteNames.get(name);

        if (existingId !== undefined) {
            Object.assign(this.sprites.get(existingId), sprite);
            return existingId;
        }

        const id = this.#nextSpriteId++;
        this.sprites.set(id, { id, ...sprite });
        if (name !== null) this.spriteNames.set(name, id);
        return id;
    }

    // Sprites are named "<sheet name>_<index>" in row-major order, like Unity's slicer,
    // so slicing the same sheet again returns the same ids.
    sliceSpriteSheet(
        spriteSheet,
        rows,
        cols,
        gap = Vector2.zero(),
        padding = Vector2.zero(),
        scissorOffset = null,
        scissorSize = null
    ) {
        const sheet = this.getSpriteSheet(spriteSheet);
        if (!sheet) {
            throw new Error(`Sprite sheet "${spriteSheet}" does not exist.`);
        }

        let { size: sheetSize } = sheet;
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
                const name = `${sheet.name}_${row * cols + col}`;
                spriteIds.push(this.defineSprite(sheet.id, position, size, name));
            }
        }

        return spriteIds;
    }

    getSpriteSheet(idOrName) {
        return this.spriteSheets.get(this.#resolveSheet(idOrName)) ?? null;
    }

    getSprite(idOrName) {
        return this.sprites.get(this.#resolveSprite(idOrName)) ?? null;
    }

    removeSpriteSheetSprites(spriteSheet) {
        const spriteSheetId = this.#resolveSheet(spriteSheet);
        for (const sprite of [...this.sprites.values()]) {
            if (sprite.spriteSheetId === spriteSheetId) {
                this.removeSprite(sprite.id);
            }
        }
    }

    removeSpriteSheet(idOrName) {
        const sheet = this.getSpriteSheet(idOrName);
        if (!sheet) {
            throw new Error(`Sprite sheet "${idOrName}" does not exist.`);
        }
        this.removeSpriteSheetSprites(sheet.id);
        this.spriteSheetNames.delete(sheet.name);
        this.spriteSheets.delete(sheet.id);
    }

    removeSprite(idOrName) {
        const sprite = this.getSprite(idOrName);
        if (!sprite) {
            throw new Error(`Sprite "${idOrName}" does not exist.`);
        }
        if (sprite.name !== null) this.spriteNames.delete(sprite.name);
        this.sprites.delete(sprite.id);
    }

    #resolveSheet(idOrName) {
        if (typeof idOrName === "string") return this.spriteSheetNames.get(idOrName);
        return this.spriteSheets.has(idOrName) ? idOrName : undefined;
    }

    #resolveSprite(idOrName) {
        if (typeof idOrName === "string") return this.spriteNames.get(idOrName);
        return this.sprites.has(idOrName) ? idOrName : undefined;
    }
}
