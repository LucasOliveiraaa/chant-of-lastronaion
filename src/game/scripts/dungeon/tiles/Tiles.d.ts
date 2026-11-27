import type { SpriteId } from "../../../../engine/assets/Sprites";

export type TileId = number;

export type Tile = {
    /** Fixed: chambers are drawn with these numbers. */
    id: TileId;
    name: string;
    sprite: SpriteId;
    /** Blocks movement with a solid collider. */
    obstacle: boolean;
    /** Leads to the neighboring chamber when the player walks into it. */
    door: boolean;
    /** Makes the tile interactable. */
    interaction?: TileInteraction;
};

export type TileInteraction = {
    /** Shown to the player when in range. */
    label: string;
    onInteract(context: {
        dungeon: import("../DungeonManager.js").default | null;
        player: import("../../../../engine/core/GameObject.js").default | null;
        tile: import("./TileManager.js").default;
    }): void;
};

/** Size of a tile's sprite, in sprite pixels. */
export const TILE_SIZE: number;
export const Tile: Record<TileId, Tile>;
export const TileIds: Readonly<{
    FLOOR: TileId;
    WALL: TileId;
    DOOR: TileId;
    STAIR: TileId;
}>;

/** Whether something on foot can stand on the tile. Doors count as blocked. */
export function isWalkable(tileId: TileId | null): boolean;
