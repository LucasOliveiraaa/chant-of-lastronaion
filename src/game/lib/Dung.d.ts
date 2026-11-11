import type Vector2 from "../../engine/Vector2.js";

export type RoomId = number;
export type TileId = number;
export type DirName = "top" | "right" | "bottom" | "left";

export type Room = {
    id: RoomId;
    tiles: TileId[];
    doors: Record<DirName, boolean>;
    /** Only used by rooms that span more than one tile. */
    connections: Record<DirName, RoomId | null>;
    /** Base weight, defaults to 1. */
    weight?: number;
    /** "normal" (default), "boss", "start" or any custom kind. */
    kind?: string;
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