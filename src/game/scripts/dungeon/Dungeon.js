import Prefab from "../../../engine/core/Prefab.js";
import DungeonManager from "./DungeonManager.js";
import { CHAMBERS } from "./chambers/Chambers.js";

// The dungeon: a DungeonManager wired to the chamber catalog it generates from.
export class DungeonPrefab extends Prefab {
    constructor() {
        super("Dungeon", DungeonManager);
        this.getComponent(DungeonManager).library = CHAMBERS;
    }
}

export const Dungeon = new DungeonPrefab();
