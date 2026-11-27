import ChamberBlueprint, { Footprint } from "./ChamberBlueprint.js";
import { DIRECTIONS, DIR_NAMES } from "../Directions.js";
import { Tile } from "../tiles/Tiles.js";

// The room placed right behind each boss (DUNGEON_CONFIG.boss.exit): one door, a stair.
export const EXIT_KIND = "exit";

/** @typedef {import("../generation/Dung").Room} Room */
/** @typedef {import("../generation/Dung").RoomId} RoomId */

/**
 * A Dung room that knows which chamber it belongs to. Dung ignores the extra fields; the
 * game uses them to go back from a PlacedRoom to the blueprint and its layers.
 * @typedef {Room & { blueprint: ChamberBlueprint, cell: { dx: number, dy: number } }} ChamberRoom
 */

// Turns chamber templates into blueprints and compiles them into the room dictionary Dung
// generates from. The bridge between "chambers the way we author them" and "cells the way
// Dung places them":
//
//   template --add()--> footprint (cells, tiles) --> blueprints (one per door set)
//            --compile--> one Dung room per cell --roomsForFloor()--> Dung's input
//
// Floors: each floor generates from the chambers allowed on it. Chambers made for the floor
// (`floors` includes it) get priority 1, chambers for any floor priority 0, so Dung uses a
// floor's own chambers wherever one fits and the others only to fill in.
export default class ChamberLibrary {
    /** @type {ChamberBlueprint[]} */
    blueprints = [];
    /** @type {Map<RoomId, ChamberRoom>} Every room of every floor, by id. */
    rooms = new Map();
    /** @type {ChamberBlueprint[]} */
    starts = [];

    #nextRoomId = 0;
    /** @type {Map<number, Map<RoomId, ChamberRoom>>} */
    #floorRooms = new Map();

    /**
     * Dung's input for one floor: the rooms of every chamber allowed on it, with `priority`
     * 1 for the floor's own chambers and 0 for chambers without floors.
     * @returns {Map<RoomId, ChamberRoom>}
     */
    roomsForFloor(floor) {
        if (!this.#floorRooms.has(floor)) {
            const rooms = new Map();
            for (const room of this.rooms.values()) {
                const { blueprint } = room;
                if (!blueprint.allowsFloor(floor)) continue;
                rooms.set(room.id, { ...room, priority: blueprint.floors ? 1 : 0 });
            }
            this.#floorRooms.set(floor, rooms);
        }
        return this.#floorRooms.get(floor);
    }

    /**
     * Dung's initial room for a floor: the first cell of a start chamber made for the floor,
     * or else of one for any floor (picked at random among several).
     */
    startRoomFor(floor) {
        const own = this.starts.filter(b => b.floors?.includes(floor));
        const pool = own.length ? own : this.starts.filter(b => b.floors === null);
        if (pool.length === 0) throw new Error(`Floor ${floor} has no start chamber: add one with kind: "start" (and no floors, or floors including ${floor}).`);
        return pool[Math.floor(Math.random() * pool.length)].roomIds[0];
    }

    /** Throws if `floor` lacks a chamber its dungeon config needs (a start, a boss, an exit). */
    checkFloor(floor, config) {
        this.startRoomFor(floor);
        if (!config.boss) return;

        const blueprints = [...new Set([...this.roomsForFloor(floor).values()].map(r => r.blueprint))];
        const where = `(and no floors, or floors including ${floor})`;
        const bosses = blueprints.filter(b => b.kind === "boss");
        if (bosses.length === 0) throw new Error(`Floor ${floor} has no boss chamber: add one with kind: "boss" ${where}.`);

        const exit = config.boss.exit;
        if (!exit) return;
        if (!blueprints.some(b => b.kind === exit)) {
            throw new Error(`Floor ${floor} has no exit chamber: add one with kind: "${exit}" ${where}.`);
        }
        if (!bosses.some(b => b.doorCount === 2)) {
            throw new Error(`Floor ${floor} needs a boss chamber with two doors (doors: "two doors"), one in and one to the exit chamber.`);
        }
    }

    /**
     * Adds every door variant of a template.
     * @param {import("./ChamberBlueprint.js").ChamberTemplate} template
     * @returns {ChamberBlueprint[]} The variants that were added.
     */
    add(template) {
        if (!template?.name) throw new Error("Every chamber needs a name.");
        if (this.blueprints.some(b => b.template === template.name)) throw new Error(`There already is a chamber named "${template.name}".`);

        const footprint = new Footprint(template);
        const doorSets = ChamberBlueprint.doorSetsFor(template, footprint)(footprint.edges);
        if (doorSets.length === 0) throw new Error(`Chamber "${template.name}" has no door set.`);

        const added = doorSets.map(doorSet => {
            const blueprint = new ChamberBlueprint(this.blueprints.length, template, footprint, doorSet);
            this.blueprints.push(blueprint);
            this.#compile(blueprint);
            return blueprint;
        });

        if (template.kind === EXIT_KIND) {
            if (added.some(b => b.doorCount !== 1)) throw new Error(`Chamber "${template.name}": an exit chamber has exactly one door (doors: "dead ends").`);
            if (!added[0].tiles.values.some(id => Tile[id]?.interaction)) {
                throw new Error(`Chamber "${template.name}": an exit chamber needs a stair (tile 3).`);
            }
        }

        if (template.kind === "start") {
            if (added.length !== 1) throw new Error(`Chamber "${template.name}": a start chamber needs exactly one door set (doors: "all").`);
            this.starts.push(added[0]);
        }
        this.#floorRooms.clear();
        return added;
    }

    /** The blueprint a Dung room belongs to. */
    blueprintOf(roomId) {
        return this.rooms.get(roomId)?.blueprint ?? null;
    }

    // One Dung room per cell; neighboring cells of the chamber are linked through
    // `connections`, which is how Dung knows they must be placed together.
    #compile(blueprint) {
        const ids = blueprint.cells.map(() => this.#nextRoomId++);
        blueprint.roomIds = ids;

        blueprint.cells.forEach((cell, i) => {
            const connections = {};
            for (const dir of DIR_NAMES) {
                const neighbor = blueprint.cellIndex(cell.dx + DIRECTIONS[dir].dx, cell.dy + DIRECTIONS[dir].dy);
                connections[dir] = neighbor >= 0 ? ids[neighbor] : null;
            }

            this.rooms.set(ids[i], {
                id: ids[i],
                doors: blueprint.doors[i],
                connections,
                weight: blueprint.weight,
                kind: blueprint.kind,
                blueprint,
                cell,
            });
        });
    }
}
