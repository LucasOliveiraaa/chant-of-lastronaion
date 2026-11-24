import GameObject from "../../../engine/core/GameObject.js";
import Prefab from "../../../engine/core/Prefab.js";
import Renderer from "../../../engine/rendering/Renderer.js";
import PlayerState from "../player/PlayerState.js";
import DungeonManager from "../dungeon/DungeonManager.js";

const CHAMBER_WIDTH = 17;
const CHAMBER_HEIGHT = 11;
export const CHAMBER_DISCOVERED_COLOR = "#3f3e36";
export const CHAMBER_VISITED_COLOR = "#7b7b7b";
export const CHAMBER_CURRENT_COLOR = "#dddddd";
export const CHAMBER_SHADOW_COLOR = "#00000055";

export function chamberState(playerState, instance) {
    if (playerState?.visitedChambers?.has(instance)) {
        return playerState.currentChamber?.instance === instance ? "current" : "visited";
    }
    if (playerState?.discoveredChambers?.has(instance)) return "discovered";
    return "unknown";
}

export function chamberColor(state) {
    if (state === "current") return CHAMBER_CURRENT_COLOR;
    if (state === "visited") return CHAMBER_VISITED_COLOR;
    return CHAMBER_DISCOVERED_COLOR;
}

// Shared chamber shape drawing: the union of room cells is filled seamlessly, with only
// convex outer grid corners rounded and inset shadows on exposed bottom/right edges.
export function drawChamber(graphics, cells, originX, originY, roomPx, state) {
    if (!cells?.length) return;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const cell of cells) {
        const x = cell.position.x;
        const y = cell.position.y;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
    }

    const occupied = (x, y) => {
        for (const cell of cells) {
            if (cell.position.x === x && cell.position.y === y) return true;
        }
        return false;
    };

    const offsetX = originX + minX * roomPx;
    const offsetY = originY + minY * roomPx;
    const color = chamberColor(state);

    for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
            if (!occupied(x, y)) continue;
            graphics.fillRect(
                offsetX + (x - minX) * roomPx,
                offsetY + (y - minY) * roomPx,
                roomPx,
                roomPx,
                color
            );
        }
    }

    // 1px pixel corners only on convex outer corners; shared/internal angles stay square.
    for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
            if (!occupied(x, y)) continue;

            const baseX = offsetX + (x - minX) * roomPx;
            const baseY = offsetY + (y - minY) * roomPx;

            if (!occupied(x, y + 1)) graphics.fillRect(baseX, baseY + roomPx - 1, roomPx, 1, CHAMBER_SHADOW_COLOR);
            if (!occupied(x + 1, y)) graphics.fillRect(baseX + roomPx - 1, baseY, 1, roomPx, CHAMBER_SHADOW_COLOR);

            if (!occupied(x - 1, y) && !occupied(x, y - 1)) graphics.clearRect(baseX, baseY, 1, 1);
            if (!occupied(x + 1, y) && !occupied(x, y - 1)) graphics.clearRect(baseX + roomPx - 1, baseY, 1, 1);
            if (!occupied(x - 1, y) && !occupied(x, y + 1)) graphics.clearRect(baseX, baseY + roomPx - 1, 1, 1);
            if (!occupied(x + 1, y) && !occupied(x, y + 1)) graphics.clearRect(baseX + roomPx - 1, baseY + roomPx - 1, 1, 1);
        }
    }
}

export class ChamberRenderer extends Renderer {
    chamber = null;
    width = 1;
    height = 1;
    state = "discovered";

    start() {
        this.player = GameObject.findWithTag("player");
        this.playerState = this.player.getComponent(PlayerState);
    }

    update() {
        this.gameObject.transform.scale.set(CHAMBER_WIDTH * this.width, CHAMBER_HEIGHT * this.height);

        this.onThisChamber = this.playerState?.currentChamber?.instance === this.chamber.instance;
    }

    render(graphics) {
        if (!this.chamber) return;

        const instance = this.chamber.instance;
        const state = chamberState(this.playerState, instance);
        if (state === "unknown") return;

        const roomPx = CHAMBER_WIDTH;
        const dungeon = DungeonManager.instance;
        const cells = dungeon?.getChamberCells(instance) ?? this.chamber.cells ?? [];
        let minX = Infinity;
        for (const cell of cells) minX = Math.min(minX, cell.position.x);
        drawChamber(graphics, cells, -minX * roomPx, 0, roomPx, state);
    }
}

export class ChamberPrefab extends Prefab {
    constructor() {
        super("Chamber");   
    }
}

export const Chamber = new ChamberPrefab();