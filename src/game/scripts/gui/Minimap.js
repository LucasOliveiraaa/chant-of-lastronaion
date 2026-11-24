import Component from "../../../engine/core/Component.js";
import GameObject from "../../../engine/core/GameObject.js";
import Prefab from "../../../engine/core/Prefab.js";
import RectTransform from "../../../engine/ui/RectTransform.js";
import UIElement from "../../../engine/ui/UIElement.js";
import DungeonManager from "../dungeon/DungeonManager.js";
import PlayerState from "../player/PlayerState.js";
import { chamberState, chamberColor, drawChamber } from "./Chamber.js";

const PANEL_WIDTH = 160;
const PANEL_HEIGHT = 160;
const PANEL_MARGIN = 12;
const ROOM_PX = 24;
const CONNECTOR_COLOR = "#7b7b7b";
const DIRECTIONS = [
    ["top", 0, -1],
    ["right", 1, 0],
    ["bottom", 0, 1],
    ["left", -1, 0],
];

class MinimapElement extends UIElement {
    state = null;

    render(graphics) {
        const { x, y, w, h } = this.rect;
        if (w <= 0 || h <= 0) return;

        graphics.fillRect(x, y, w, h, "#00000055");
        graphics.save();
        graphics.clip(x, y, w, h);

        const dungeon = this.state?.dungeon;
        const playerState = this.state?.playerState;
        if (!dungeon?.result || !playerState?.currentChamber) {
            graphics.restore();
            return;
        }

        const currentInstance = playerState.currentChamber.instance;
        const currentCells = dungeon.getChamberCells(currentInstance);
        if (!currentCells.length) {
            graphics.restore();
            return;
        }

        let currentMinX = Infinity, currentMinY = Infinity;
        let currentMaxX = -Infinity, currentMaxY = -Infinity;
        for (const cell of currentCells) {
            currentMinX = Math.min(currentMinX, cell.position.x);
            currentMinY = Math.min(currentMinY, cell.position.y);
            currentMaxX = Math.max(currentMaxX, cell.position.x);
            currentMaxY = Math.max(currentMaxY, cell.position.y);
        }

        const centerGridX = (currentMinX + currentMaxX + 1) / 2;
        const centerGridY = (currentMinY + currentMaxY + 1) / 2;
        const originX = Math.round(x + w / 2 - centerGridX * ROOM_PX);
        const originY = Math.round(y + h / 2 - centerGridY * ROOM_PX);

        this.drawConnectors(graphics, dungeon, playerState, originX, originY);

        for (const instance of this.state.instances) {
            const stateName = chamberState(playerState, instance);
            if (stateName === "unknown") continue;
            const cells = dungeon.getChamberCells(instance);
            drawChamber(graphics, cells, originX, originY, ROOM_PX, stateName);
        }

        graphics.restore();
    }

    drawConnectors(graphics, dungeon, playerState, originX, originY) {
        for (const instance of this.state.instances) {
            const cells = dungeon.getChamberCells(instance);
            for (const cell of cells) {
                const room = dungeon.rooms.get(cell.room);
                if (!room) continue;

                for (const [direction, dx, dy] of DIRECTIONS) {
                    if (!room.doors[direction]) continue;

                    const neighbor = dungeon.getCell(
                        cell.position.x + dx,
                        cell.position.y + dy
                    );
                    if (!neighbor) continue;

                    const neighborState = chamberState(playerState, neighbor.instance);
                    if (neighborState === "unknown") continue;

                    const cx = originX + (cell.position.x + 0.5) * ROOM_PX;
                    const cy = originY + (cell.position.y + 0.5) * ROOM_PX;
                    const sourceState = chamberState(playerState, instance);
                    const color = sourceState === "discovered"
                        ? chamberColor("discovered")
                        : CONNECTOR_COLOR;

                    if (direction === "left" || direction === "right") {
                        const boundaryX = originX + (
                            direction === "left" ? cell.position.x : cell.position.x + 1
                        ) * ROOM_PX;
                        graphics.fillRect(boundaryX - 1, cy - 1, 3, 3, color);
                    } else {
                        const boundaryY = originY + (
                            direction === "top" ? cell.position.y : cell.position.y + 1
                        ) * ROOM_PX;
                        graphics.fillRect(cx - 1, boundaryY - 1, 3, 3, color);
                    }
                }
            }
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

        const instance = this.playerState?.currentChamber?.instance ?? null;
        if (instance !== this.lastInstance) {
            this.lastInstance = instance;
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
