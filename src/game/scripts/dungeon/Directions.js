/** @typedef {import("./generation/Dung").DirName} DirName */

// The four sides of a dungeon cell, in the same order Dung uses. Shared by the chamber
// blueprints (which edges get doors), the DungeonManager (which cell a door leads to) and
// the tiles (which way a door faces).

/** @type {Readonly<Record<DirName, { dx: number, dy: number, opposite: DirName }>>} */
export const DIRECTIONS = Object.freeze({
    top: { dx: 0, dy: -1, opposite: "bottom" },
    right: { dx: 1, dy: 0, opposite: "left" },
    bottom: { dx: 0, dy: 1, opposite: "top" },
    left: { dx: -1, dy: 0, opposite: "right" },
});

export const DIR_NAMES = /** @type {DirName[]} */ (Object.keys(DIRECTIONS));
