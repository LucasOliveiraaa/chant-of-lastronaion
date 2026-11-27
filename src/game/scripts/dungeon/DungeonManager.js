import Component from "../../../engine/core/Component.js";
import GameObject from "../../../engine/core/GameObject.js";
import Vector2 from "../../../engine/math/Vector2.js";
import Rigidbody from "../../../engine/physics/Rigidbody.js";
import ChamberManager from "./chambers/ChamberManager.js";
import { DIRECTIONS } from "./Directions.js";
import { generateDungeonWithStats } from "./generation/Dung.js";
import { TILE_WIDTH, DUNGEON_CONFIG, FLOOR_COUNT } from "../Config.js";
import PlayerState from "../player/PlayerState.js";

// Pixels between the player and the door trigger it arrives next to, so it doesn't walk
// straight back through.
const ENTRY_MARGIN = 6;

// Runs the dungeon (see README.md in this folder for the whole pipeline):
//
//   #generateFloor() library.roomsForFloor(floor) --Dung--> PlacedRooms, one per cell,
//                    grouped by instance (on start, and for every new floor)
//   #enterChamber()  instance -> blueprint + grid origin -> ChamberManager (tiles + spawns)
//   door contact     TileManager -> requestTransition() -> fixedUpdate() -> #enterChamber()
//   stair            TileManager -> requestNextFloor() -> fixedUpdate() -> #generateFloor()
//
// Floors go from 1 to FLOOR_COUNT (Config.js); each one is a whole new dungeon.
//
// The chamber catalog is handed in by the Dungeon prefab (Dungeon.js) rather than imported
// here: the catalog pulls in every spawnable thing (enemies, items), and those already
// depend on the DungeonManager, so importing it here would close an import cycle.
//
// Only the chamber the player is in exists in the scene. What was used up in a chamber
// (enemies killed, items picked up) is remembered per instance, so it stays gone.
export default class DungeonManager extends Component {
    /** The DungeonManager in the scene, or null. */
    static instance = null;

    /** @type {import("./chambers/ChamberLibrary.js").default | null} Set by the Dungeon prefab. */
    library = null;
    config = DUNGEON_CONFIG;
    floorCount = FLOOR_COUNT;

    /** The floor the player is on, from 1. 0 before start. */
    floor = 0;
    /** Dung's result for the current floor. */
    result = null;
    /** The ChamberManager the player is in. */
    currentChamber = null;

    #cells = new Map(); // "x,y" -> PlacedRoom
    #consumedSpawns = new Map(); // instance -> Set of spawn point indexes
    #pending = null;
    #pendingFloor = false;

    /** Every chamber cell's room (blueprint, cell, doors), by Dung room id. */
    get rooms() {
        return this.library.rooms;
    }

    get isLastFloor() {
        return this.floor >= this.floorCount;
    }

    awake() {
        DungeonManager.instance = this;
    }

    onDestroy() {
        if (DungeonManager.instance === this) DungeonManager.instance = null;
    }

    start() {
        if (!this.library) throw new Error("DungeonManager has no chamber library; instantiate the Dungeon prefab.");
        // Fail at once, naming the floor, rather than when the player gets there.
        for (let floor = 1; floor <= this.floorCount; floor++) this.library.checkFloor(floor, this.configFor(floor));

        this.player = GameObject.findWithTag("player");
        this.playerState = this.player?.getComponent(PlayerState) ?? null;
        this.#generateFloor(1);
    }

    // Doors report from the physics step, which runs right before fixedUpdate. Switching here,
    // before update and lateUpdate, means the camera sees the new chamber on the same frame.
    // Stairs are pressed during update; waiting for fixedUpdate keeps the stair tile alive
    // until its own update is over.
    fixedUpdate() {
        if (this.#pendingFloor) {
            this.#pendingFloor = false;
            this.#pending = null;
            this.#generateFloor(this.floor + 1);
            return;
        }

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

    /**
     * Asks to go up to the next floor, a new dungeon. Applied on the next fixedUpdate.
     * @returns {boolean} false on the last floor, where there's nowhere to go.
     */
    requestNextFloor() {
        if (this.isLastFloor) {
            console.log(`Você já está no último andar (${this.floor}/${this.floorCount}).`);
            return false;
        }
        this.#pendingFloor = true;
        return true;
    }

    /** Dung's config for a floor: the top floor has no exit room, there's nowhere to go. */
    configFor(floor) {
        if (floor < this.floorCount || !this.config.boss?.exit) return this.config;
        const { exit, ...boss } = this.config.boss;
        return { ...this.config, boss };
    }

    getCell(x, y) {
        return this.#cells.get(cellKey(x, y)) ?? null;
    }

    getChamberCells(instance) {
        return this.result.rooms.filter(cell => cell.instance === instance);
    }

    /**
     * The blueprint placed as `instance` and the dungeon grid position of its top-left cell.
     * @returns {{ blueprint: import("./chambers/ChamberBlueprint.js").default, origin: Vector2, cells: object[] }}
     */
    getChamber(instance) {
        const cells = this.getChamberCells(instance);
        const room = this.rooms.get(cells[0].room);
        const origin = cells[0].position.subtract(new Vector2(room.cell.dx, room.cell.dy));
        return { blueprint: room.blueprint, origin, cells };
    }

    #revealConnectedChambers(chamber) {
        if (!this.playerState) return;

        for (const cell of chamber.cells) {
            const room = this.rooms.get(cell.room);
            if (!room) continue;

            for (const [direction, dir] of Object.entries(DIRECTIONS)) {
                if (!room.doors[direction]) continue;

                const neighbor = this.getCell(
                    cell.position.x + dir.dx,
                    cell.position.y + dir.dy
                );
                if (!neighbor || neighbor.instance === chamber.instance) continue;

                if (!this.playerState.visitedChambers.has(neighbor.instance)) {
                    this.playerState.discoveredChambers.add(neighbor.instance);
                }
            }
        }
    }

    #generateFloor(floor) {
        this.#leaveChamber();
        this.#cells.clear();
        this.#consumedSpawns.clear();

        this.floor = floor;
        this.result = generateDungeonWithStats(this.library.roomsForFloor(floor), this.library.startRoomFor(floor), this.configFor(floor));
        for (const cell of this.result.rooms) {
            this.#cells.set(cellKey(cell.position.x, cell.position.y), cell);
        }
        console.log(`Andar ${floor}/${this.floorCount}: ${this.result.roomCount} salas.`);

        // Exploration (minimap) is per floor.
        this.playerState ??= this.player?.getComponent(PlayerState) ?? null;
        this.playerState?.resetExploration();

        // Dung places the start room at (0, 0) as instance 0.
        this.#enterChamber(this.getCell(0, 0).instance, null);
    }

    #leaveChamber() {
        const chamber = this.currentChamber;
        if (!chamber) return;

        // Read before destroying: the chamber's teardown destroys what's left too.
        this.#consumedSpawns.set(chamber.instance, chamber.collectConsumedSpawns());
        chamber.gameObject.destroy();
        this.currentChamber = null;
    }

    #enterChamber(instance, entry) {
        this.#leaveChamber();

        const { blueprint, origin, cells } = this.getChamber(instance);
        const chamberObject = new GameObject(`Chamber ${instance} (${blueprint.name})`, ChamberManager);
        const chamber = chamberObject.getComponent(ChamberManager);
        chamber.blueprint = blueprint;
        chamber.origin = origin;
        chamber.cells = cells;
        chamber.consumedSpawns = this.#consumedSpawns.get(instance) ?? new Set();
        chamber.build();

        this.currentChamber = chamber;
        this.playerState ??= this.player?.getComponent(PlayerState) ?? null;
        this.playerState?.enterChamber(chamber);
        this.#revealConnectedChambers(chamber);

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
