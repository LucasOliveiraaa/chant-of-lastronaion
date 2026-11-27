import Component from "../../../../engine/core/Component.js";
import GameObject from "../../../../engine/core/GameObject.js";
import Vector2 from "../../../../engine/math/Vector2.js";
import AABB from "../../../../engine/math/AABB.js";
import TileManager from "../tiles/TileManager.js";
import { TILE_WIDTH, ROOM_WIDTH, ROOM_HEIGHT } from "../../Config.js";

const CELL_WIDTH = ROOM_WIDTH * TILE_WIDTH;
const CELL_HEIGHT = ROOM_HEIGHT * TILE_WIDTH;

// The live chamber the player is in, built from a ChamberBlueprint by DungeonManager:
//
//   blueprint.tiles  -> one child GameObject with a TileManager per tile
//   blueprint.spawns -> one child GameObject per spawn point (Spawns.js builds it)
//
// Everything is parented to the chamber, so destroying it on the way out removes it all.
// The chamber sits at its dungeon grid position in world space, so the cells of a multi-cell
// chamber line up edge to edge and neighboring chambers keep consistent coordinates.
export default class ChamberManager extends Component {
    /** @type {import("./ChamberBlueprint.js").default | null} */
    blueprint = null;
    /** Dungeon grid position of the blueprint's top-left cell. */
    origin = Vector2.zero();
    /** The chamber's PlacedRooms, from Dung. */
    cells = [];
    /** Spawn points (their indexes) used up in earlier visits; they don't spawn again. */
    consumedSpawns = new Set();

    /** @type {{ index: number, category: string, gameObject: GameObject }[]} */
    #spawned = [];
    #built = false;

    /** World-space top-left corner of a dungeon cell. */
    static cellOrigin(cell) {
        return new Vector2(cell.x * CELL_WIDTH, cell.y * CELL_HEIGHT);
    }

    get instance() {
        return this.cells[0]?.instance ?? null;
    }

    /** World-space box around the chamber (its blueprint's bounding box). */
    get bounds() {
        const min = ChamberManager.cellOrigin(this.origin);
        const size = new Vector2(this.blueprint.widthCells * CELL_WIDTH, this.blueprint.heightCells * CELL_HEIGHT);
        return new AABB(min, min.add(size));
    }

    /** Enemies from the spawn layer that are still alive. */
    get enemiesAlive() {
        // SpawnCategory.ENEMY; not imported, since Spawns.js depends on the enemies, which
        // depend on this chamber through the DungeonManager.
        return this.#spawned.filter(s => s.category === "enemy" && !s.gameObject.isDestroyed).length;
    }

    start() {
        this.build();
    }

    // Called by the DungeonManager right away; start() only covers chambers made elsewhere.
    build() {
        if (this.#built) return;
        this.#built = true;

        this.#buildTileLayer();
        this.#buildSpawnLayer();
    }

    /** Spawns used up so far: the earlier ones plus every spawned object destroyed since. */
    collectConsumedSpawns() {
        const consumed = new Set(this.consumedSpawns);
        for (const { index, gameObject } of this.#spawned) {
            if (gameObject.isDestroyed) consumed.add(index);
        }
        return consumed;
    }

    /** World-space top-left corner of layer tile (x, y). */
    tilePosition(x, y) {
        return ChamberManager.cellOrigin(this.origin).add(new Vector2(x * TILE_WIDTH, y * TILE_WIDTH));
    }

    /** World-space center of layer tile (x, y). */
    tileCenter(x, y) {
        return this.tilePosition(x, y).add(new Vector2(TILE_WIDTH / 2, TILE_WIDTH / 2));
    }

    getCell(position) {
        return this.cells.find(c => c.position.x === position.x && c.position.y === position.y) ?? null;
    }

    /** World-space center of a cell. */
    getCellCenter(position) {
        return ChamberManager.cellOrigin(position).add(new Vector2(CELL_WIDTH / 2, CELL_HEIGHT / 2));
    }

    /**
     * Where to put something entering a cell through the door on the given side: centered on
     * the door, `inset` pixels inside the cell's edge.
     */
    getEntryPoint(position, side, inset) {
        const origin = ChamberManager.cellOrigin(position);
        const centerX = origin.x + CELL_WIDTH / 2;
        const centerY = origin.y + CELL_HEIGHT / 2;

        switch (side) {
            case "top": return new Vector2(centerX, origin.y + inset);
            case "bottom": return new Vector2(centerX, origin.y + CELL_HEIGHT - inset);
            case "left": return new Vector2(origin.x + inset, centerY);
            case "right": return new Vector2(origin.x + CELL_WIDTH - inset, centerY);
        }
        throw new Error(`Unknown side "${side}".`);
    }

    #buildTileLayer() {
        const { blueprint } = this;

        for (const { x, y, value: tileId } of blueprint.tiles.entries()) {
            const tile = new GameObject(`Tile ${x},${y}`, TileManager);
            tile.transform.setParent(this.gameObject.transform, false);
            const position = this.tilePosition(x, y);
            tile.transform.position.set(position.x, position.y);

            // Doors know the dungeon cell they belong to, so the DungeonManager can tell
            // which chamber is on the other side.
            const door = blueprint.doorAt(x, y);
            const link = door
                ? { cell: this.origin.add(new Vector2(door.cell.dx, door.cell.dy)), direction: door.direction }
                : null;
            tile.getComponent(TileManager).setTile(tileId, link);
        }
    }

    #buildSpawnLayer() {
        for (const { x, y, index, spawn } of this.blueprint.spawnPoints()) {
            if (this.consumedSpawns.has(index)) continue;

            const gameObject = spawn.create(this.tileCenter(x, y));
            gameObject.transform.setParent(this.gameObject.transform, true);
            this.#spawned.push({ index, category: spawn.category, gameObject });
        }
    }
}
