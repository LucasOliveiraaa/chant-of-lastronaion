import Component from "../../../engine/core/Component.js";
import GameObject from "../../../engine/core/GameObject.js";
import World from "../../../engine/core/World.js";
import Camera from "../../../engine/rendering/Camera.js";
import CameraFollow from "../../../engine/rendering/CameraFollow.js";
import DungeonManager from "../dungeon/DungeonManager.js";
import { TILE_WIDTH, ROOM_WIDTH, ROOM_HEIGHT } from "../Config.js";

// Follows the player inside the current chamber. CameraFollow does the following and keeps
// the view inside the chamber's bounds; this keeps those bounds current and zooms so the view
// is never bigger than one room, the smallest a chamber can be, so the void around a chamber
// never shows. Runs in update, before CameraFollow's lateUpdate.
export default class CameraController extends Component {
    static requiredComponents = [Camera, CameraFollow];

    #chamber = null;

    start() {
        this.camera = this.gameObject.getComponent(Camera);
        this.follow = this.gameObject.getComponent(CameraFollow);
        this.follow.target = GameObject.findWithTag("player")?.transform ?? null;
        this.#refresh();
    }

    update() {
        this.#refresh();
    }

    #refresh() {
        this.camera.zoom = fitZoom() - 0.1;

        const chamber = DungeonManager.instance?.currentChamber ?? null;
        this.follow.bounds = chamber?.bounds ?? null;

        // A new chamber means the player was moved: jump instead of panning across.
        if (chamber !== this.#chamber) {
            this.#chamber = chamber;
            this.follow.snap();
        }
    }
}

// Smallest zoom at which the view fits inside one room.
function fitZoom() {
    const { canvas } = World.getInstance();
    if (!canvas) return 1;
    return Math.max(canvas.width / (ROOM_WIDTH * TILE_WIDTH), canvas.height / (ROOM_HEIGHT * TILE_WIDTH));
}
