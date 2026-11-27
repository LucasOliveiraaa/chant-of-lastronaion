import Component from "../../../engine/core/Component.js";
import GameObject from "../../../engine/core/GameObject.js";
import Prefab from "../../../engine/core/Prefab.js";
import RectTransform from "../../../engine/ui/RectTransform.js";
import UIElement from "../../../engine/ui/UIElement.js";
import DungeonManager from "../dungeon/DungeonManager.js";
import PlayerState from "../player/PlayerState.js";
import { chamberState, drawPixelChamber } from "./Chamber.js";

export const PIXEL = 3;
const ROOM_CHUNKS = 9;
const ROOM_PX = ROOM_CHUNKS * PIXEL;

const PANEL_WIDTH = 54 * PIXEL;
const PANEL_HEIGHT = 54 * PIXEL;
const PANEL_MARGIN = 4 * PIXEL;

export const PANEL_BG = "#00000066";
const FRAME_OUTER = "#0a0907";
const FRAME_INNER = "#34322a";

// The HUD panels' two-tone pixel frame, drawn inside the rect.
export function drawPanelFrame(graphics, x, y, w, h) {
    strokeRect(graphics, x, y, w, h, PIXEL, FRAME_OUTER);
    strokeRect(graphics, x + PIXEL, y + PIXEL, w - 2 * PIXEL, h - 2 * PIXEL, PIXEL, FRAME_INNER);
}

function strokeRect(graphics, x, y, w, h, t, color) {
    graphics.fillRect(x, y, w, t, color);
    graphics.fillRect(x, y + h - t, w, t, color);
    graphics.fillRect(x, y + t, t, h - 2 * t, color);
    graphics.fillRect(x + w - t, y + t, t, h - 2 * t, color);
}

class MinimapElement extends UIElement {
    state = null;

    render(graphics) {
        const { x, y, w, h } = this.rect;
        if (w <= 0 || h <= 0) return;

        graphics.fillRect(x, y, w, h, PANEL_BG);
        graphics.save();
        graphics.clip(x, y, w, h);
        this.drawMap(graphics, x, y, w, h);
        graphics.restore();

        drawPanelFrame(graphics, x, y, w, h);
    }

    drawMap(graphics, x, y, w, h) {
        const dungeon = this.state?.dungeon;
        const playerState = this.state?.playerState;
        if (!dungeon?.result || !playerState?.currentChamber) return;

        const currentCells = dungeon.getChamberCells(playerState.currentChamber.instance);
        if (!currentCells.length) return;

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const cell of currentCells) {
            minX = Math.min(minX, cell.position.x);
            minY = Math.min(minY, cell.position.y);
            maxX = Math.max(maxX, cell.position.x);
            maxY = Math.max(maxY, cell.position.y);
        }

        const centerGridX = (minX + maxX + 1) / 2;
        const centerGridY = (minY + maxY + 1) / 2;
        const originX = Math.round(x + w / 2 - centerGridX * ROOM_PX);
        const originY = Math.round(y + h / 2 - centerGridY * ROOM_PX);

        for (const instance of this.state.instances) {
            const stateName = chamberState(playerState, instance);
            if (stateName === "unknown") continue;
            const cells = dungeon.getChamberCells(instance);
            drawPixelChamber(graphics, cells, originX, originY, ROOM_PX, stateName, PIXEL);
        }
    }
}

export class MinimapManager extends Component {
    start() {
        this.ui = GameObject.findWithTag("ui");
        this.player = GameObject.findWithTag("player");
        this.playerState = this.player?.getComponent(PlayerState) ?? null;
        this.dungeon = DungeonManager.instance;
        this.element = null;
        this.lastInstance = undefined;
        this.createElement();
    }

    update() {
        if (!this.playerState) {
            this.player = GameObject.findWithTag("player");
            this.playerState = this.player?.getComponent(PlayerState) ?? null;
        }
        this.dungeon = DungeonManager.instance;

        // A new floor is a new dungeon, even if the instance number is the same.
        const instance = this.playerState?.currentChamber?.instance ?? null;
        const result = this.dungeon?.result ?? null;
        if (instance !== this.lastInstance || result !== this.lastResult) {
            this.lastInstance = instance;
            this.lastResult = result;
            this.refresh();
        }
    }

    createElement() {
        if (!this.ui) return;

        const gameObject = new GameObject("Minimap", RectTransform, MinimapElement);
        const rt = gameObject.transform;
        rt.setParent(this.ui.transform, false);
        rt.anchorMin.set(1, 0);
        rt.anchorMax.set(1, 0);
        rt.pivot.set(1, 0);
        rt.anchoredPosition.set(-PANEL_MARGIN, PANEL_MARGIN);
        rt.sizeDelta.set(PANEL_WIDTH, PANEL_HEIGHT);

        this.element = gameObject.getComponent(MinimapElement);
        this.refresh();
    }

    refresh() {
        if (this.element) {
            const instances = [];
            if (this.playerState) {
                for (const instance of this.playerState.visitedChambers) instances.push(instance);
                for (const instance of this.playerState.discoveredChambers) instances.push(instance);
            }
            this.element.state = {
                dungeon: this.dungeon,
                playerState: this.playerState,
                instances,
            };
        }
    }
}

export class MinimapPrefab extends Prefab {
    constructor() {
        super("Minimap", RectTransform, MinimapManager);
    }
}

export const Minimap = new MinimapPrefab();