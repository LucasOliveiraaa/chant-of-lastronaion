export const TILE_WIDTH = 32;

// In tiles. Odd sizes keep the doors centered.
export const ROOM_WIDTH = 17;
export const ROOM_HEIGHT = 11;
export const DOOR_WIDTH = 1;

export const INTERACTABLE_RANGE = 50;

// Crisp at multiples of 8px.
export const PIXEL_FONT = '"Press Start 2P", monospace';

// How many floors the temple has. Each floor is a new dungeon; the stairs lead up to the
// next one. Chambers can be limited to some floors with `floors` (dungeon/chambers/Chambers.js).
export const FLOOR_COUNT = 3;

/** How Dung lays out each dungeon (each floor). Chambers come from dungeon/chambers/Chambers.js. */
/** @type {import("./dungeon/generation/Dung").DungeonConfig} */
export const DUNGEON_CONFIG = {
    // aim: below 1 because every open door must still get a room, which overshoots.
    size: { target: 12, tolerance: 0.35, aim: 0.65 },
    // exit: the kind of room placed right behind the boss, the way up (not on the top floor).
    boss: { distance: 4, exit: "exit" },
    // spread: against tightly packed dungeons, steers growth away from built-up spots and
    // toward the outside. loopBias < 1: fewer extra connections between rooms.
    layout: { spread: 2.5, loopBias: 0.2 },
    kinds: {
        treasure: { max: 2 },
    },
};
