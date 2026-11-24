import Sprites from "../../engine/assets/Sprites.js";

// Size of a tile's sprite, in sprite pixels (TILE_WIDTH in Config is its size in the world).
export const TILE_SIZE = 16;

/** @type {Record<import("./Tile").TileId, import("./Tile").Tile>} */
export const Tile = {};

let nextId = 0;

/**
 * @param {Omit<import("./Tile").Tile, "id" | "door"> & { door?: boolean }} tile
 * @returns {import("./Tile").TileId}
 */
function addTile(tile) {
    const id = nextId++;
    Tile[id] = { door: false, ...tile, id };
    return id;
}

const solid = (color) => Sprites.getInstance().createSolidSprite(TILE_SIZE, TILE_SIZE, color);

export const TileIds = Object.freeze({
    FLOOR: addTile({ name: "floor", sprite: solid("#3B3842"), obstacle: false }),
    WALL: addTile({ name: "wall", sprite: solid("#6E5A48"), obstacle: true }),
    DOOR: addTile({ name: "door", sprite: solid("#C9A227"), obstacle: false, door: true }),
});
