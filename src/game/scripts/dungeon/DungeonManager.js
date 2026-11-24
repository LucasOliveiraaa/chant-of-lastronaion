import Component from "../../../engine/core/Component.js";
import GameObject from "../../../engine/core/GameObject.js";
import Vector2 from "../../../engine/math/Vector2.js";
import Rigidbody from "../../../engine/physics/Rigidbody.js";
import ChamberManager from "./ChamberManager.js";
import { ROOMS, START_ROOM, DIRECTIONS, DUNGEON_CONFIG } from "./Rooms.js";
import { generateDungeonWithStats } from "../../lib/Dung.js";
import { TILE_WIDTH } from "../Config.js";

// Pixels between the player and the door trigger it arrives next to, so it doesn't walk
// straight back through.
const ENTRY_MARGIN = 6;

// Generates the dungeon with Dung, keeps only the chamber the player is in, and moves the
// player between chambers through the doors.
export default class DungeonManager extends Component {
    /** The DungeonManager in the scene, or null. */
    static instance = null;

    rooms = ROOMS;
    startRoom = START_ROOM;
    config = DUNGEON_CONFIG;

    /** Dung's result, set on start. */
    result = null;
    /** The ChamberManager the player is in. */
    currentChamber = null;

    #cells = new Map(); // "x,y" -> PlacedRoom
    #pending = null;

    awake() {
        DungeonManager.instance = this;
    }

    onDestroy() {
        if (DungeonManager.instance === this) DungeonManager.instance = null;
    }

    start() {
        this.result = generateDungeonWithStats(this.rooms, this.startRoom, this.config);
        for (const cell of this.result.rooms) {
            this.#cells.set(cellKey(cell.position.x, cell.position.y), cell);
        }

        this.player = GameObject.findWithTag("player");

        // Dung places the start room at (0, 0) as instance 0.
        const start = this.getCell(0, 0);
        this.#enterChamber(start.instance, null);
    }

    // Doors report from the physics step, which runs right before fixedUpdate. Switching here,
    // before update and lateUpdate, means the camera sees the new chamber on the same frame.
    fixedUpdate() {
        if (!this.#pending) return;
        const { cell, direction } = this.#pending;
        this.#pending = null;

        const dir = DIRECTIONS[direction];
        const target = this.getCell(cell.x + dir.dx, cell.y + dir.dy);
        // Dung connects every open door, so this only guards against stale or bad requests.
        if (!target || target.instance === this.currentChamber?.instance) return;

        this.#enterChamber(target.instance, { cell: target.position, side: dir.opposite });
    }

    /** Asks to go through the door on `direction` of `cell`. Applied on the next fixedUpdate; extra requests until then are ignored. */
    requestTransition(cell, direction) {
        this.#pending ??= { cell, direction };
    }

    getCell(x, y) {
        return this.#cells.get(cellKey(x, y)) ?? null;
    }

    getChamberCells(instance) {
        return this.result.rooms.filter(cell => cell.instance === instance);
    }

    #enterChamber(instance, entry) {
        this.currentChamber?.gameObject.destroy();

        const chamberObject = new GameObject(`Chamber ${instance}`, ChamberManager);
        const chamber = chamberObject.getComponent(ChamberManager);
        chamber.rooms = this.rooms;
        chamber.cells = this.getChamberCells(instance);
        chamber.build();
        this.currentChamber = chamber;

        if (!this.player) return;

        const transform = this.player.transform;
        const half = transform.scale.divide(2);
        const center = entry
            ? chamber.getEntryPoint(entry.cell, entry.side, TILE_WIDTH + Math.max(half.x, half.y) + ENTRY_MARGIN)
            : chamber.getCellCenter(chamber.cells[0].position);

        transform.worldPosition = center.subtract(half);
        const rb = this.player.getComponent(Rigidbody);
        if (rb) {
            rb.velocity = Vector2.zero();
            rb.angularVelocity = 0;
        }
    }
}

function cellKey(x, y) {
    return `${x},${y}`;
}
