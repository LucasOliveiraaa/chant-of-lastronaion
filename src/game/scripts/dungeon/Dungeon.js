import Prefab from "../../../engine/core/Prefab.js";
import DungeonManager from "./DungeonManager.js";

export class DungeonPrefab extends Prefab {
    constructor() {
        super("Dungeon", DungeonManager);
    }
}

export const Dungeon = new DungeonPrefab();
