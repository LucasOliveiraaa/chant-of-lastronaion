import Sprites from "../../../../engine/assets/Sprites.js";

// The tile registry: every kind of tile a chamber can be made of.
//
// Chambers (chambers/Chambers.js) are drawn as grids of these ids, so an id must never
// change once chambers use it: give new tiles the next free number. When a chamber is
// entered, ChamberManager turns every id into a GameObject with a TileManager, which reads
// the flags below to pick the sprite and the collider. NavGrid reads the same flags to know
// where enemies can walk.
//
// A tile with an `interaction` gets an Interactable: the player sees its label when close
// and presses the interact key to run `onInteract({ dungeon, player, tile })`.

// Size of a tile's sprite, in sprite pixels (TILE_WIDTH in Config is its size in the world).
export const TILE_SIZE = 16;

/** @type {Record<import("./Tiles").TileId, import("./Tiles").Tile>} */
export const Tile = {};

/**
 * @param {Omit<import("./Tiles").Tile, "door"> & { door?: boolean }} tile
 * @returns {import("./Tiles").TileId}
 */
function addTile(tile) {
    if (!Number.isInteger(tile.id) || tile.id < 0) throw new Error(`Tile "${tile.name}" needs a whole number id >= 0.`);
    if (Tile[tile.id]) throw new Error(`Tile id ${tile.id} is already used by "${Tile[tile.id].name}".`);

    Tile[tile.id] = { door: false, ...tile };
    return tile.id;
}

/** Whether something on foot can stand on the tile. Doors count as blocked: they lead out. */
export function isWalkable(tileId) {
    const tile = Tile[tileId];
    return !!tile && !tile.obstacle && !tile.door;
}

const solid = (color) => Sprites.getInstance().createSolidSprite(TILE_SIZE, TILE_SIZE, color);

export const TileIds = Object.freeze({
    FLOOR: addTile({ id: 0, name: "floor", sprite: solid("#3B3842"), obstacle: false }),
    WALL: addTile({ id: 1, name: "wall", sprite: solid("#6E5A48"), obstacle: true }),
    // Placed by the chamber's doors setting, never drawn by hand (see ChamberBlueprint).
    DOOR: addTile({ id: 2, name: "door", sprite: solid("#C9A227"), obstacle: false, door: true }),
    // Leads up to the next floor, a new dungeon (DungeonManager.requestNextFloor).
    STAIR: addTile({
        id: 3,
        name: "stair",
        sprite: solid("#8FB3D9"),
        obstacle: false,
        interaction: {
            label: "Escada",
            onInteract: ({ dungeon }) => dungeon?.requestNextFloor(),
        },
    }),
});
