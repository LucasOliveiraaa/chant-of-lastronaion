import Layer from "./Layer.js";
import { DIRECTIONS, DIR_NAMES } from "../Directions.js";
import { Tile, TileIds, isWalkable } from "../tiles/Tiles.js";
import { findSpawn, spawnNames } from "../spawns/Spawns.js";
import { ROOM_WIDTH, ROOM_HEIGHT, DOOR_WIDTH, FLOOR_COUNT } from "../../Config.js";

/** @typedef {import("../generation/Dung").DirName} DirName */
/** @typedef {import("../tiles/Tiles").TileId} TileId */
/** @typedef {import("../spawns/Spawns").SpawnId} SpawnId */
/** @typedef {import("../spawns/Spawns").SpawnDefinition} SpawnDefinition */
/** @typedef {import("../../../../engine/core/Prefab.js").default} Prefab */
/**
 * A spawn point, in tiles: (x, y) is the middle of the tile at column x, row y, and
 * decimals go in between (x: 4.5 is halfway between columns 4 and 5).
 * @typedef {{ x: number, y: number, index: number, spawn: SpawnDefinition }} SpawnPoint
 */
/** @typedef {{ dx: number, dy: number }} CellOffset */
/** @typedef {{ cell: number, direction: DirName }} Edge An outer edge: cell index + side. */

/**
 * What a chamber author writes (see Chambers.js). A template expands into one blueprint per
 * door set, all sharing the same tiles and spawns.
 *
 * @typedef {object} ChamberTemplate
 * @property {string} name
 * @property {(TileId | null)[][]} [tiles] Rows of tile ids, any size; null is void. The
 *     chamber covers as many dungeon cells (ROOM_WIDTH x ROOM_HEIGHT tiles each) as the
 *     drawing needs. Defaults to one cell of floor.
 * @property {{ type: string | SpawnId | Prefab, x: number, y: number }[]} [spawns] What appears
 *     in the chamber: a spawn name or a Prefab, at a tile position (x = column, y = row,
 *     from 0; decimals allowed, see SpawnPoint).
 * @property {number | number[]} [floors] Floors (1 to FLOOR_COUNT) the chamber can appear
 *     on. Left out, it can appear on any floor, but a floor's own chambers come first.
 * @property {number} [weight] How often it appears, per door variant. Defaults to 1.
 * @property {string} [kind] "normal" (default), "start", "boss" or any kind Dung's config knows.
 * @property {"all" | "variants" | "dead ends" | "two doors" | ((edges: Edge[]) => Edge[][])} [doors]
 *     Which door sets to build, see DOOR_OPTIONS. Defaults to "dead ends" for exit chambers,
 *     "variants" for other one-cell chambers and "all" for bigger ones (and the start).
 */

/** Ready-made door set builders. */
export const DoorSets = Object.freeze({
    /** One variant with a door on every outer edge. */
    all: edges => [edges],
    /** One variant per non-empty combination of outer edges. */
    combinations: edges => {
        const sets = [];
        for (let mask = 1; mask < 1 << edges.length; mask++) {
            sets.push(edges.filter((_, i) => mask & (1 << i)));
        }
        return sets;
    },
    /** One variant per outer edge, with only that door: a dead end. */
    deadEnds: edges => edges.map(edge => [edge]),
    /** One variant per pair of outer edges: a way in and a way out (bosses with an exit). */
    pairs: edges => edges.flatMap((a, i) => edges.slice(i + 1).map(b => [a, b])),
});

/** What a template's `doors` can say. */
export const DOOR_OPTIONS = Object.freeze({
    "all": DoorSets.all,
    "variants": DoorSets.combinations,
    "dead ends": DoorSets.deadEnds,
    "two doors": DoorSets.pairs,
});

const DOOR_START_X = Math.floor((ROOM_WIDTH - DOOR_WIDTH) / 2);
const DOOR_START_Y = Math.floor((ROOM_HEIGHT - DOOR_WIDTH) / 2);

// Which sides of its cell the tile at local (x, y) lies on (two for corners).
function edgesAt(x, y) {
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

// Local positions of the door tiles on one side of a cell.
function doorSpan(edge) {
    const tiles = [];
    for (let i = 0; i < DOOR_WIDTH; i++) {
        switch (edge) {
            case "top": tiles.push([DOOR_START_X + i, 0]); break;
            case "bottom": tiles.push([DOOR_START_X + i, ROOM_HEIGHT - 1]); break;
            case "left": tiles.push([0, DOOR_START_Y + i]); break;
            case "right": tiles.push([ROOM_WIDTH - 1, DOOR_START_Y + i]); break;
        }
    }
    return tiles;
}

/**
 * What is worked out once from a template and shared by every door variant: the floors it
 * belongs to and its shape (which cells it covers, what each tile is, with the drawing
 * padded to whole cells, and where doors can go).
 */
export class Footprint {
    /** @type {number[] | null} Floors the chamber can appear on; null for any. */
    floors = null;

    /** @param {ChamberTemplate} template */
    constructor(template) {
        const fail = message => { throw new Error(`Chamber "${template.name}": ${message}`); };
        this.floors = this.#parseFloors(template, fail);

        const rows = template.tiles ?? Array.from({ length: ROOM_HEIGHT }, () => new Array(ROOM_WIDTH).fill(TileIds.FLOOR));
        this.#checkDrawing(rows, fail);

        const drawnWidth = rows[0].length;
        const drawnHeight = rows.length;
        this.widthCells = Math.ceil(drawnWidth / ROOM_WIDTH);
        this.heightCells = Math.ceil(drawnHeight / ROOM_HEIGHT);
        this.width = this.widthCells * ROOM_WIDTH;
        this.height = this.heightCells * ROOM_HEIGHT;

        // A cell belongs to the chamber when anything is drawn in it.
        /** @type {CellOffset[]} */
        this.cells = [];
        for (let dy = 0; dy < this.heightCells; dy++) {
            for (let dx = 0; dx < this.widthCells; dx++) {
                let used = false;
                for (let y = dy * ROOM_HEIGHT; y < Math.min((dy + 1) * ROOM_HEIGHT, drawnHeight) && !used; y++) {
                    for (let x = dx * ROOM_WIDTH; x < Math.min((dx + 1) * ROOM_WIDTH, drawnWidth) && !used; x++) {
                        used = rows[y][x] !== null;
                    }
                }
                if (used) this.cells.push({ dx, dy });
            }
        }
        if (this.cells.length === 0) fail("every tile is null, there is nothing to build.");
        this.#checkConnected(fail);

        // The drawing, padded with floor up to whole cells; void outside the chamber's cells.
        /** @type {Layer<TileId>} */
        this.tiles = new Layer(this.width, this.height);
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.cellIndexAtTile(x, y) < 0) continue;
                this.tiles.set(x, y, x < drawnWidth && y < drawnHeight ? rows[y][x] : TileIds.FLOOR);
            }
        }

        if (drawnWidth !== this.width || drawnHeight !== this.height) {
            console.warn(
                `Chamber "${template.name}" is drawn ${drawnWidth}x${drawnHeight} tiles; chambers are made of ` +
                `blocks of ${ROOM_WIDTH}x${ROOM_HEIGHT}, so it was filled with floor up to ${this.width}x${this.height}.`
            );
        }

        // Doors go on outer edges whose door tiles aren't void.
        /** @type {Edge[]} */
        this.edges = [];
        this.cells.forEach((cell, i) => {
            for (const dir of DIR_NAMES) {
                const { dx, dy } = DIRECTIONS[dir];
                if (this.cellIndex(cell.dx + dx, cell.dy + dy) >= 0) continue;
                const open = doorSpan(dir).every(([x, y]) => this.tiles.get(cell.dx * ROOM_WIDTH + x, cell.dy * ROOM_HEIGHT + y) !== null);
                if (open) this.edges.push({ cell: i, direction: dir });
            }
        });
        if (this.edges.length === 0) {
            fail(`there's nowhere to put a door. Doors go in the middle of each side of a ${ROOM_WIDTH}x${ROOM_HEIGHT} block (column ${DOOR_START_X}, row ${DOOR_START_Y} of the block), so those tiles can't be null.`);
        }
    }

    /** Index of the cell at (dx, dy), or -1. */
    cellIndex(dx, dy) {
        return this.cells.findIndex(c => c.dx === dx && c.dy === dy);
    }

    /** The cell holding tile (x, y), or -1 outside the chamber. */
    cellIndexAtTile(x, y) {
        return this.cellIndex(Math.floor(x / ROOM_WIDTH), Math.floor(y / ROOM_HEIGHT));
    }

    #parseFloors(template, fail) {
        if (template.floors === undefined) return null;

        const floors = Array.isArray(template.floors) ? template.floors : [template.floors];
        if (floors.length === 0) fail("floors is empty. Leave it out to allow every floor.");
        for (const floor of floors) {
            if (!Number.isInteger(floor) || floor < 1) fail(`floors must be whole numbers from 1 (got ${JSON.stringify(floor)}).`);
        }

        const beyond = floors.filter(f => f > FLOOR_COUNT);
        if (beyond.length) {
            console.warn(`Chamber "${template.name}": the temple has ${FLOOR_COUNT} floors (FLOOR_COUNT in Config.js), so floor ${beyond.join(", ")} never happens.`);
        }
        return [...new Set(floors)].sort((a, b) => a - b);
    }

    #checkDrawing(rows, fail) {
        if (!Array.isArray(rows) || rows.length === 0 || !rows.every(Array.isArray)) {
            fail("tiles must be a list of rows, like [[1, 1, 1], [1, 0, 1], [1, 1, 1]].");
        }

        const width = rows[0].length;
        if (width === 0) fail("the first row of tiles is empty.");
        rows.forEach((row, y) => {
            if (row.length !== width) fail(`row ${y} has ${row.length} tiles, but row 0 has ${width}. Every row needs the same number of tiles.`);
            row.forEach((id, x) => {
                if (id === null) return;
                if (!Tile[id]) {
                    const known = Object.values(Tile).filter(t => !t.door).map(t => `${t.id} = ${t.name}`).join(", ");
                    fail(`unknown tile ${JSON.stringify(id)} at column ${x}, row ${y}. Use ${known}, or null for void.`);
                }
                if (Tile[id].door) fail(`there's a door drawn at column ${x}, row ${y}. Doors are added automatically; draw a wall there instead.`);
            });
        });
    }

    #checkConnected(fail) {
        const reached = new Set([0]);
        const queue = [0];
        while (queue.length) {
            const { dx, dy } = this.cells[queue.shift()];
            for (const dir of DIR_NAMES) {
                const n = this.cellIndex(dx + DIRECTIONS[dir].dx, dy + DIRECTIONS[dir].dy);
                if (n >= 0 && !reached.has(n)) { reached.add(n); queue.push(n); }
            }
        }
        if (reached.size !== this.cells.length) {
            fail(`its parts don't touch. Every ${ROOM_WIDTH}x${ROOM_HEIGHT} block with tiles in it must share a side with another one.`);
        }
    }
}

/**
 * One concrete chamber: its footprint in dungeon cells, the doors it opens and its two layers.
 *
 *   tiles  - Layer<TileId>: what the chamber is made of. null is void (not built, not
 *            walkable), including the empty cells of an L-shaped chamber's bounding box.
 *   spawns - SpawnPoint[]: what appears in it when the player walks in.
 *
 * Both are in tiles from the top-left tile of the top-left cell, so a spawn at (5, 3)
 * stands in the middle of tile (5, 3). Spawns can also sit between tiles.
 *
 * Blueprints are immutable data built once at load time by ChamberLibrary; ChamberManager
 * builds a live chamber from one.
 */
export default class ChamberBlueprint {
    /** @type {number} */ id;
    /** @type {string} Name of the variant, e.g. "pillars [top left]". */ name;
    /** @type {string} Name of the template it came from. */ template;
    /** @type {string} */ kind;
    /** @type {number} */ weight;
    /** @type {CellOffset[]} */ cells;
    /** @type {Record<DirName, boolean>[]} Doors of each cell, same order as cells. */ doors;
    /** @type {Layer<TileId>} */ tiles;
    /** @type {SpawnPoint[]} */ spawns;
    /** @type {number[] | null} Floors it can appear on; null for any. */ floors;
    /** @type {number[]} Dung room id of each cell, set by ChamberLibrary. */ roomIds = [];

    /** @type {Map<number, { cell: CellOffset, direction: DirName }>} tile index -> door */
    #doorTiles = new Map();

    /**
     * @param {number} id
     * @param {ChamberTemplate} template
     * @param {Footprint} footprint
     * @param {Edge[]} doorSet Outer edges that get a door.
     */
    constructor(id, template, footprint, doorSet) {
        this.id = id;
        this.template = template.name;
        this.kind = template.kind ?? "normal";
        this.weight = template.weight ?? 1;
        this.floors = footprint.floors;
        this.cells = footprint.cells;
        this.widthCells = footprint.widthCells;
        this.heightCells = footprint.heightCells;

        this.doors = this.cells.map(() => Object.fromEntries(DIR_NAMES.map(dir => [dir, false])));
        for (const { cell, direction } of doorSet) this.doors[cell][direction] = true;

        const doorNames = doorSet.map(({ cell, direction }) => this.cells.length > 1 ? `${this.cells[cell].dx},${this.cells[cell].dy}:${direction}` : direction);
        this.name = `${template.name} [${doorNames.join(" ")}]`;

        this.tiles = this.#buildTiles(footprint);
        this.spawns = this.#buildSpawns(template);
    }

    /**
     * The door set builder a template asks for.
     * @param {ChamberTemplate} template
     * @param {Footprint} footprint
     */
    static doorSetsFor(template, footprint) {
        const { doors } = template;
        if (typeof doors === "function") return doors;
        if (doors === undefined) {
            if (template.kind === "exit") return DoorSets.deadEnds;
            return footprint.cells.length === 1 && template.kind !== "start" ? DoorSets.combinations : DoorSets.all;
        }
        const option = DOOR_OPTIONS[String(doors).trim().toLowerCase()];
        if (!option) {
            const names = Object.keys(DOOR_OPTIONS).map(n => `"${n}"`).join(", ");
            throw new Error(`Chamber "${template.name}": doors can be ${names}, not ${JSON.stringify(doors)}.`);
        }
        return option;
    }

    /** Tile layer width, in tiles. */
    get width() {
        return this.widthCells * ROOM_WIDTH;
    }

    /** Tile layer height, in tiles. */
    get height() {
        return this.heightCells * ROOM_HEIGHT;
    }

    /** Index of the cell at (dx, dy), or -1. */
    cellIndex(dx, dy) {
        return this.cells.findIndex(c => c.dx === dx && c.dy === dy);
    }

    /** The door on layer tile (x, y): its cell and the side it leads out of, or null. */
    doorAt(x, y) {
        return this.#doorTiles.get(this.tiles.index(x, y)) ?? null;
    }

    /** How many doors this variant has. */
    get doorCount() {
        return this.doors.reduce((n, d) => n + Object.values(d).filter(Boolean).length, 0);
    }

    /** Whether the chamber can appear on `floor`. */
    allowsFloor(floor) {
        return this.floors === null || this.floors.includes(floor);
    }

    /**
     * Every spawn point. `index` is stable, so it identifies the spawn point across visits.
     * @returns {SpawnPoint[]}
     */
    spawnPoints() {
        return this.spawns;
    }

    // ---- Layer construction -------------------------------------------------------------

    // The footprint's tiles with walls on every outer edge and door openings where this
    // variant has doors. Void stays void; edges shared by two cells keep what was drawn, so
    // the cells join seamlessly.
    #buildTiles(footprint) {
        const layer = new Layer(this.width, this.height);
        for (const { x, y, value } of footprint.tiles.entries()) layer.set(x, y, value);

        this.cells.forEach((cell, i) => {
            const ox = cell.dx * ROOM_WIDTH, oy = cell.dy * ROOM_HEIGHT;
            const outer = dir => this.cellIndex(cell.dx + DIRECTIONS[dir].dx, cell.dy + DIRECTIONS[dir].dy) < 0;

            for (let y = 0; y < ROOM_HEIGHT; y++) {
                for (let x = 0; x < ROOM_WIDTH; x++) {
                    if (layer.get(ox + x, oy + y) === null) continue;
                    const sides = edgesAt(x, y);
                    const external = sides.filter(outer);
                    if (external.length === 0) continue;

                    const side = external[0];
                    const isDoor = sides.length === 1 && this.doors[i][side] && inDoorSpan(side, x, y);
                    layer.set(ox + x, oy + y, isDoor ? TileIds.DOOR : TileIds.WALL);
                    if (isDoor) this.#doorTiles.set(layer.index(ox + x, oy + y), { cell, direction: side });
                }
            }
        });
        return layer;
    }

    /** @param {ChamberTemplate} template */
    #buildSpawns(template) {
        const fail = (i, message) => { throw new Error(`Chamber "${template.name}", spawn ${i + 1}: ${message}`); };

        return (template.spawns ?? []).map((entry, index) => {
            const { type, x, y } = entry ?? {};
            const spawn = findSpawn(type);
            if (!spawn) fail(index, `unknown type ${JSON.stringify(type)}. Use a Prefab or one of: ${spawnNames().map(n => `"${n}"`).join(", ")}.`);
            if (!Number.isFinite(x) || !Number.isFinite(y)) fail(index, `x and y must be numbers (got x: ${x}, y: ${y}).`);

            // The tile under the spawn's middle.
            const column = Math.floor(x + 0.5), row = Math.floor(y + 0.5);
            if (!this.tiles.inBounds(column, row)) fail(index, `column ${x}, row ${y} is outside the chamber (${this.width}x${this.height} tiles).`);
            if (!isWalkable(this.tiles.get(column, row))) {
                const tile = Tile[this.tiles.get(column, row)];
                fail(index, `"${spawn.name}" at column ${x}, row ${y} is on ${tile ? `a ${tile.name}` : "void"}; it needs floor.`);
            }
            return { x, y, index, spawn };
        });
    }
}
