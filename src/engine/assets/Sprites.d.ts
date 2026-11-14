import type Vector2 from "../math/Vector2";
import type { ImageAsset } from "./Assets";

export type SpriteSheetId = number;
export type SpriteId = number;

export type SpriteSheet = {
    asset: ImageAsset;
    size: Vector2;
};

export type Sprite = {
    id: SpriteId;
    spriteSheetId: SpriteSheetId;
    position: Vector2;
    size: Vector2;
};

export default class Sprites {
    private constructor();
    static getInstance(): Sprites;

    /**
     * Loads a sprite sheet from the given source and returns its ID.
     * 
     * This method will load the image using the `Assets` manager.
     * 
     * @param src The source of the sprite sheet.
     */
    async loadSpriteSheet(src: string): Promise<SpriteSheetId>;
    /**
     * Defines an existing image asset as a sprite sheet and returns its ID.
     * @param image The image asset to define as a sprite sheet.
     */
    defineSpriteSheet(asset: ImageAsset): SpriteSheetId;

    /**
     * Defines a sprite from the given sprite sheet and returns its ID.
     * @param spriteSheet The ID of the sprite sheet to define the sprite from.
     * @param position The position of the sprite in the sprite sheet.
     * @param size The size of the sprite in the sprite sheet.
     */
    defineSprite(spriteSheet: SpriteSheetId, positon: Vector2, size: Vector2): SpriteId;
    /**
     * Slices the given sprite sheet into a grid of sprites, returning the IDs of the resulting sprites.
     * 
     * ## Scissors
     * The `scissorOffset` and `scissorSize` parameters allow you to define a scissor rectangle that will be used to clip the sprite sheet before slicing it into sprites. This can be useful if you want to ignore certain parts of the sprite sheet, such as borders, titles or white space.
     * 
     * @param spriteSheet The ID of the sprite sheet to slice.
     * @param rows How many rows of sprites to create.
     * @param cols How many columns of sprites to create.
     * @param gap The gap between sprites in the sprite sheet.
     * @param padding The padding around the edges of the sprite sheet.
     * @param scissorOffset The offset of the scissor rectangle, relative to the top-left corner of the sprite sheet.
     * @param scissorSize The size of the scissor rectangle, relative to the top-left corner of the sprite sheet.
     * @returns An array of sprite IDs, in row-major order.
     */
    sliceSpriteSheet(
        spriteSheet: SpriteSheetId,
        rows: number,
        cols: number,
        gap?: Vector2,
        padding?: Vector2,
        scissorOffset?: Vector2,
        scissorSize?: Vector2
    ): SpriteId[];

    getSpriteSheet(id: SpriteSheetId): SpriteSheet;
    getSprite(id: SpriteId): Sprite;

    removeSpriteSheet(id: SpriteSheetId): void;
    removeSpriteSheetSprites(id: SpriteSheetId): void;
    removeSprite(id: SpriteId): void;
}