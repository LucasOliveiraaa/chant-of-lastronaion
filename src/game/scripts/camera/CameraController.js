import Component from "../../../engine/core/Component.js";
import GameObject from "../../../engine/core/GameObject.js";
import World from "../../../engine/core/World.js";
import Camera from "../../../engine/rendering/Camera.js";
import CameraFollow from "../../../engine/rendering/CameraFollow.js";
import DungeonManager from "../dungeon/DungeonManager.js";
import { TILE_WIDTH, ROOM_WIDTH, ROOM_HEIGHT } from "../Config.js";

// Extra zoom-out for chambers at least 2x2 rooms.
const LARGE_CHAMBER_ZOOM_OUT = 1.35;

export default class CameraController extends Component {
    static requiredComponents = [Camera, CameraFollow];

    #chamber = null;
    #zoomOut = 1;

    start() {
        this.camera = this.gameObject.getComponent(Camera);
        this.follow = this.gameObject.getComponent(CameraFollow);
        this.follow.target = GameObject.findWithTag("player")?.transform ?? null;
        this.follow.damping = 0;
        this.#refresh();
    }

    update() {
        this.#refresh();
    }

    #refresh() {
        const chamber = DungeonManager.instance?.currentChamber ?? null;
        this.follow.bounds = chamber?.bounds ?? null;

        if (chamber !== this.#chamber) {
            this.#chamber = chamber;
            this.#zoomOut = zoomOutFor(chamber);
            this.camera.zoom = baseZoom() / this.#zoomOut;
            this.follow.snap();
            return;
        }

        this.camera.zoom = baseZoom() / this.#zoomOut;
    }
}

function zoomOutFor(chamber) {
    const dungeon = DungeonManager.instance;
    if (!chamber || !dungeon) return 1;

    const cells = dungeon.getChamberCells(chamber.instance);
    if (!cells?.length) return 1;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const cell of cells) {
        minX = Math.min(minX, cell.position.x);
        minY = Math.min(minY, cell.position.y);
        maxX = Math.max(maxX, cell.position.x);
        maxY = Math.max(maxY, cell.position.y);
    }

    const spanX = maxX - minX + 1;
    const spanY = maxY - minY + 1;
    return spanX >= 2 && spanY >= 2 ? LARGE_CHAMBER_ZOOM_OUT : 1;
}

function baseZoom() {
    return fitZoom() - 0.1;
}

function fitZoom() {
    const { canvas } = World.getInstance();
    if (!canvas) return 1;
    return Math.max(canvas.width / (ROOM_WIDTH * TILE_WIDTH), canvas.height / (ROOM_HEIGHT * TILE_WIDTH));
}