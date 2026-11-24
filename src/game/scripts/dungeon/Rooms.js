import { TileIds } from "../../lib/Tile.js";
import { ROOM_WIDTH, ROOM_HEIGHT, DOOR_WIDTH } from "../Config.js";

/** @typedef {import("../../lib/Dung").DirName} DirName */

/** @type {Record<DirName, { dx: number, dy: number, opposite: DirName }>} */
export const DIRECTIONS = {
    top: { dx: 0, dy: -1, opposite: "bottom" },
    right: { dx: 1, dy: 0, opposite: "left" },
    bottom: { dx: 0, dy: 1, opposite: "top" },
    left: { dx: -1, dy: 0, opposite: "right" },
};
const DIR_NAMES = /** @type {DirName[]} */ (Object.keys(DIRECTIONS));

const DOOR_START_X = Math.floor((ROOM_WIDTH - DOOR_WIDTH) / 2);
const DOOR_START_Y = Math.floor((ROOM_HEIGHT - DOOR_WIDTH) / 2);

// Which room edges the tile at (x, y) lies on (two for corners).
export function edgesAt(x, y) {
    const edges = [];
    if (y === 0) edges.push("top");
    if (y === ROOM_HEIGHT - 1) edges.push("bottom");
    if (x === 0) edges.push("left");
    if (x === ROOM_WIDTH - 1) edges.push("right");
    return edges;
}

function inDoorSpan(edge, x, y) {
    const along = edge === "top" || edge === "bottom" ? x - DOOR_START_X : y - DOOR_START_Y;
    return along >= 0 && along < DOOR_WIDTH;
}

// Row-major tiles of one room: walls around it, door openings where the room has doors, and
// floor on the edges shared with another cell of the same chamber, so they join seamlessly.
function buildTiles(doors, internal) {
    const tiles = [];
    for (let y = 0; y < ROOM_HEIGHT; y++) {
        for (let x = 0; x < ROOM_WIDTH; x++) {
            const external = edgesAt(x, y).filter(edge => !internal[edge]);

            let id = TileIds.FLOOR;
            if (external.length === 1 && edgesAt(x, y).length === 1 && doors[external[0]] && inDoorSpan(external[0], x, y)) {
                id = TileIds.DOOR;
            } else if (external.length > 0) {
                id = TileIds.WALL;
            }
            tiles.push(id);
        }
    }
    return tiles;
}

/** @type {Map<import("../../lib/Dung").RoomId, import("../../lib/Dung").Room>} */
export const ROOMS = new Map();
let nextId = 0;

/**
 * Adds a chamber made of one room per cell.
 * @param {{ dx: number, dy: number }[]} cells Grid offsets of the cells.
 * @param {(cell: { dx: number, dy: number }, dir: DirName) => boolean} hasDoor Asked for every outer edge.
 * @returns {number} Id of the first cell's room.
 */
function addChamber(cells, hasDoor, { kind = "normal", weight = 1 } = {}) {
    const ids = cells.map(() => nextId++);
    const at = (dx, dy) => cells.findIndex(c => c.dx === dx && c.dy === dy);

    cells.forEach((cell, i) => {
        const doors = {}, connections = {}, internal = {};
        for (const dir of DIR_NAMES) {
            const neighbor = at(cell.dx + DIRECTIONS[dir].dx, cell.dy + DIRECTIONS[dir].dy);
            internal[dir] = neighbor >= 0;
            connections[dir] = neighbor >= 0 ? ids[neighbor] : null;
            doors[dir] = neighbor < 0 && hasDoor(cell, dir);
        }
        ROOMS.set(ids[i], { id: ids[i], tiles: buildTiles(doors, internal), doors, connections, weight, kind });
    });
    return ids[0];
}

const SINGLE = [{ dx: 0, dy: 0 }];
const allDoors = () => true;

export const START_ROOM = addChamber(SINGLE, allDoors, { kind: "start" });

// Every combination of doors for a single room.
for (let mask = 1; mask < 16; mask++) {
    addChamber(SINGLE, (_, dir) => (mask & (1 << DIR_NAMES.indexOf(dir))) !== 0);
}

// Dead ends for the boss.
for (const dir of DIR_NAMES) {
    addChamber(SINGLE, (_, d) => d === dir, { kind: "boss" });
}

// Chambers spanning several rooms.
addChamber([{ dx: 0, dy: 0 }, { dx: 1, dy: 0 }], allDoors, { weight: 0.6 });
addChamber([{ dx: 0, dy: 0 }, { dx: 0, dy: 1 }], allDoors, { weight: 0.6 });
addChamber([{ dx: 0, dy: 0 }, { dx: 1, dy: 0 }, { dx: 0, dy: 1 }, { dx: 1, dy: 1 }], allDoors, { weight: 0.4 });

/** @type {import("../../lib/Dung").DungeonConfig} */
export const DUNGEON_CONFIG = {
    size: { target: 10, tolerance: 0.3 },
    boss: { distance: 4 },
};
