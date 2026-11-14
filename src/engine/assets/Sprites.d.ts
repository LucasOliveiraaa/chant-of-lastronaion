import type Vector2 from "../math/Vector2";
import type { ImageAsset } from "./Assets";

/** Stable: never reused after the sheet is removed. */
export type SpriteSheetId = number;
/** Stable: never reused after the sprite is removed. */
export type SpriteId = number;

export type SpriteSheet = {
    id: SpriteSheetId;
    name: string;
    asset: ImageAsset;
    size: Vector2;
};

export type Sprite = {
    id: SpriteId;
    /** null for sprites defined without a name. */
    name: string | null;
    spriteSheetId: SpriteSheetId;
    position: Vector2;
    size: Vector2;
};

/** Registry of sprite sheets and the sprites cut from them, addressed by id or name. */
export default class Sprites {
    private constructor();
    static getInstance(): Sprites;

    /**
     * Loads a sprite sheet through the `Assets` manager and returns its id.
     *
     * Concurrent or repeated calls with the same name share one load and return the same id.
     *
     * @param src The source of the image.
     * @param name The sheet's name (also its key in `Assets`). Defaults to `src`.
     */
    loadSpriteSheet(src: string, name?: string): Promise<SpriteSheetId>;
    /**
     * Defines an already loaded image asset as a sprite sheet and returns its id.
     * Defining a name that already exists updates that sheet in place and keeps its id.
     * @param asset The image asset to define as a sprite sheet.
     * @param name Defaults to the asset's key.
     */
    defineSpriteSheet(asset: ImageAsset, name?: string): SpriteSheetId;

    /**
     * Defines a sprite from the given sprite sheet and returns its id.
     * Defining a name that already exists updates that sprite in place and keeps its id.
     * @param spriteSheet The id or name of the sprite sheet.
     * @param position The position of the sprite in the sprite sheet.
     * @param size The size of the sprite in the sprite sheet.
     * @param name Optional name to look the sprite up with.
     */
    defineSprite(spriteSheet: SpriteSheetId | string, position: Vector2, size: Vector2, name?: string | null): SpriteId;
    /**
     * Slices the given sprite sheet into a grid of sprites, returning the ids of the resulting sprites.
     *
     * Sprites are named `"<sheet name>_<index>"` in row-major order (like Unity's slicer),
     * so slicing the same sheet again returns the same ids.
     *
     * ## Scissors
     * The `scissorOffset` and `scissorSize` parameters allow you to define a scissor rectangle that will be used to clip the sprite sheet before slicing it into sprites. This can be useful if you want to ignore certain parts of the sprite sheet, such as borders, titles or white space.
     *
     * @param spriteSheet The id or name of the sprite sheet to slice.
     * @param rows How many rows of sprites to create.
     * @param cols How many columns of sprites to create.
     * @param gap The gap between sprites in the sprite sheet.
     * @param padding The padding around the edges of the sprite sheet.
     * @param scissorOffset The offset of the scissor rectangle, relative to the top-left corner of the sprite sheet.
     * @param scissorSize The size of the scissor rectangle.
     * @returns An array of sprite ids, in row-major order.
     */
    sliceSpriteSheet(
        spriteSheet: SpriteSheetId | string,
        rows: number,
        cols: number,
        gap?: Vector2,
        padding?: Vector2,
        scissorOffset?: Vector2 | null,
        scissorSize?: Vector2 | null
    ): SpriteId[];

    getSpriteSheet(idOrName: SpriteSheetId | string): SpriteSheet | null;
    getSprite(idOrName: SpriteId | string): Sprite | null;

    /** Removes the sheet and all its sprites. Throws if it doesn't exist. */
    removeSpriteSheet(idOrName: SpriteSheetId | string): void;
    removeSpriteSheetSprites(idOrName: SpriteSheetId | string): void;
    /** Throws if it doesn't exist. */
    removeSprite(idOrName: SpriteId | string): void;
}
