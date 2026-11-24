import Component from "../../../engine/core/Component.js";
import GameObject from "../../../engine/core/GameObject.js";
import Vector2 from "../../../engine/math/Vector2.js";
import AABB from "../../../engine/math/AABB.js";
import TileManager from "./TileManager.js";
import { edgesAt } from "./Rooms.js";
import { Tile } from "../../lib/Tile.js";
import { TILE_WIDTH, ROOM_WIDTH, ROOM_HEIGHT } from "../Config.js";

const CELL_WIDTH = ROOM_WIDTH * TILE_WIDTH;
const CELL_HEIGHT = ROOM_HEIGHT * TILE_WIDTH;

// A chamber is every dungeon cell sharing one Dung instance (one room per cell). Cells sit
// at their dungeon grid position in world space, so the rooms of a multi-cell chamber line
// up edge to edge and neighboring chambers keep consistent coordinates.
export default class ChamberManager extends Component {
    /** Dung's room dictionary the cells refer to. */
    rooms = null;
    /** The chamber's PlacedRooms. */
    cells = [];

    #built = false;

    /** World-space top-left corner of a dungeon cell. */
    static cellOrigin(cell) {
        return new Vector2(cell.x * CELL_WIDTH, cell.y * CELL_HEIGHT);
    }

    get instance() {
        return this.cells[0]?.instance ?? null;
    }

    /** World-space box around every cell of the chamber. */
    get bounds() {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const { position } of this.cells) {
            const origin = ChamberManager.cellOrigin(position);
            minX = Math.min(minX, origin.x);
            minY = Math.min(minY, origin.y);
            maxX = Math.max(maxX, origin.x + CELL_WIDTH);
            maxY = Math.max(maxY, origin.y + CELL_HEIGHT);
        }
        return new AABB(new Vector2(minX, minY), new Vector2(maxX, maxY));
    }

    start() {
        this.build();
    }

    // Instantiates one tile per room cell as children, so destroying the chamber removes them.
    // Called by the DungeonManager right away; start() only covers chambers made elsewhere.
    build() {
        if (this.#built) return;
        this.#built = true;

        for (const cell of this.cells) {
            const room = this.rooms.get(cell.room);
            const origin = ChamberManager.cellOrigin(cell.position);

            room.tiles.forEach((tileId, i) => {
                const x = i % ROOM_WIDTH;
                const y = Math.floor(i / ROOM_WIDTH);

                const tile = new GameObject(`Tile ${cell.position.x}:${cell.position.y} ${x},${y}`, TileManager);
                tile.transform.setParent(this.gameObject.transform, false);
                tile.transform.position.set(origin.x + x * TILE_WIDTH, origin.y + y * TILE_WIDTH);

                // A door sits on exactly one edge of its room.
                const door = Tile[tileId]?.door ? { cell: cell.position, direction: edgesAt(x, y)[0] } : null;
                tile.getComponent(TileManager).setTile(tileId, door);
            });
        }
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
}
