import type Vector2 from "../../../../engine/math/Vector2.js";

export type RoomId = number;
export type DirName = "top" | "right" | "bottom" | "left";

/**
 * One dungeon cell, the unit Dung places. A chamber spanning several cells is made of several
 * rooms linked through `connections`. Extra fields (e.g. the game's chamber blueprint) are
 * ignored by Dung and come back untouched in the room dictionary.
 */
export type Room = {
    id: RoomId;
    doors: Record<DirName, boolean>;
    /** Neighboring room of the same chamber on each side (multi-cell chambers), or null. */
    connections: Record<DirName, RoomId | null>;
    /** Base weight, defaults to 1. */
    weight?: number;
    /** "normal" (default), "boss", "start" or any custom kind. */
    kind?: string;
    /**
     * Defaults to 0. Among the candidates of the same kind that fit a cell, only those with
     * the highest priority are considered; lower ones are used where none of them fit, or
     * when the dungeon is over its target size and they open fewer doors.
     */
    priority?: number;
};

export type PlacedRoom = {
    room: RoomId;
    position: Vector2;
    /** Cells of the same room share the instance. */
    instance: number;
    /** Real distance in rooms from the start room. */
    distance: number;
};

export type KindRule = {
    /** Weight multiplier. */
    weight?: number;
    /** Wanted amount, boosts the weight while below it. */
    min?: number;
    /** Hard limit. */
    max?: number;
};

export type WeightContext = {
    /** Anchor cell of the candidate (multi-cell rooms are tried from each cell). */
    room: RoomId;
    /** Every cell of the candidate room, use this to identify it. */
    cells: RoomId[];
    kind: string;
    x: number;
    y: number;
    /** Distance of the candidate from the start. */
    distance: number;
    roomCount: number;
    frontierSize: number;
    /** Doors opening to empty cells. */
    newDoors: number;
    /** Extra doors connecting to existing rooms. */
    loops: number;
    /** Weight computed so far. */
    weight: number;
};

export type DungeonConfig = {
    seed?: number;
    /** Overrides seed. */
    rng?: () => number;
    maxAttempts?: number;

    size: {
        /** Amount of rooms (not tiles). */
        target: number;
        /** 0.2 = +-20%. */
        tolerance?: number;
        /** Steer the size with weights (default true). */
        control?: boolean;
        /** Strength of the size control. */
        growthBias?: number;
        /** Fraction of the target where branching starts to be discouraged. */
        aim?: number;
        /** Max distance in cells from the origin. */
        maxExtent?: number;
    };

    /** Omit to generate a dungeon without boss. */
    boss?: {
        /** In rooms, from the start room. */
        distance: number;
        tolerance?: number;
        count?: number;
        /** Weight multiplier at the right distance. */
        boost?: number;
        /**
         * Kind of the room placed right behind each boss. The boss then gets exactly one
         * entrance and one extra door, which leads to a dead-end room of this kind.
         */
        exit?: string;
    };

    layout?: {
        /**
         * Which frontier cell is collapsed next:
         * entropy = classic WFC, random = organic, bfs = round, dfs = winding corridors.
         */
        order?: "entropy" | "random" | "bfs" | "dfs";
        /** Weight multiplier per extra connection, >1 = more loops. */
        loopBias?: number;
        /** Dead ends before the boss distance, <1 = longer paths. */
        deadEndPenalty?: number;
        /**
         * Against tightly packed dungeons: weight multiplier exp(-spread * crowding), where
         * crowding counts taken cells around a candidate, new doors whose slot touches
         * existing rooms, and new doors that don't lead away from the start. 0 (default)
         * turns it off.
         */
        spread?: number;
    };

    kinds?: Record<string, KindRule>;
    /** Multiplies the final weight. */
    weightModifier?: (ctx: WeightContext) => number;
};

export type DungeonResult = {
    rooms: PlacedRoom[];
    seed: number | undefined;
    attempts: number;
    roomCount: number;
    bossDistances: number[];
    /** Why the failed attempts failed. */
    failures: Record<string, number>;
};

export function generateDungeon(
    roomDict: Map<RoomId, Room>,
    initialRoom: RoomId,
    config: DungeonConfig
): PlacedRoom[];

export function generateDungeonWithStats(
    roomDict: Map<RoomId, Room>,
    initialRoom: RoomId,
    config: DungeonConfig
): DungeonResult;