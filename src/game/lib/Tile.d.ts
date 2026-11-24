import type { SpriteId } from "../../engine/assets/Sprites";

export type TileId = number;

export type Tile = {
    id: TileId;
    name: string;
    sprite: SpriteId;
    /** Blocks movement with a solid collider. */
    obstacle: boolean;
    /** Leads to the neighboring chamber when the player walks into it. */
    door: boolean;
};

/** Size of a tile's sprite, in sprite pixels. */
export const TILE_SIZE: number;
export const Tile: Record<TileId, Tile>;
export const TileIds: Readonly<{
    FLOOR: TileId;
    WALL: TileId;
    DOOR: TileId;
}>;
