import Component from "../../../engine/core/Component.js";
import GameObject from "../../../engine/core/GameObject.js";
import Prefab from "../../../engine/core/Prefab.js";
import Time from "../../../engine/core/Time.js";
import Input from "../../../engine/input/Input.js";
import RectTransform from "../../../engine/ui/RectTransform.js";
import UIElement from "../../../engine/ui/UIElement.js";
import { PIXEL_FONT } from "../Config.js";

const INTERACT_KEY = "KeyF";
const NEXT_KEY = "Space";
const NEXT_LABEL = "Próximo";

const PIXEL = 3;
const NAME_FONT = `16px ${PIXEL_FONT}`;
const KEY_FONT = `16px ${PIXEL_FONT}`;
const HINT_FONT = `8px ${PIXEL_FONT}`;

const KEY_SIZE = 9 * PIXEL;
const HINT_KEY_HEIGHT = 7 * PIXEL;
const KEY_PADDING = 2 * PIXEL;
const ROW_GAP = 2 * PIXEL;
const NAME_GAP = 3 * PIXEL;
const PANEL_PADDING = 4 * PIXEL;
const BOTTOM_MARGIN = 12 * PIXEL;
const MAX_ROWS = 4;
const PRESS_TIME = 0.12;

const PANEL_BG = "#00000099";
const FRAME_OUTER = "#0a0907";
const FRAME_INNER = "#34322a";
const KEY_FACE = "#e8dcc0";
const KEY_LIGHT = "#fff7e3";
const KEY_SIDE = "#9c8f72";
const KEY_TEXT = "#1d1a14";
const NAME_COLOR = "#f2ead3";
const NAME_DIM = "#8d8676";

function strokeRect(graphics, x, y, w, h, t, color) {
    graphics.fillRect(x, y, w, t, color);
    graphics.fillRect(x, y + h - t, w, t, color);
    graphics.fillRect(x, y + t, t, h - 2 * t, color);
    graphics.fillRect(x + w - t, y + t, t, h - 2 * t, color);
}

function drawKey(graphics, x, y, w, h, label, font, pressed) {
    const side = pressed ? 0 : PIXEL;
    if (pressed) {
        y += PIXEL;
        h -= PIXEL;
    }

    graphics.fillRect(x + PIXEL, y, w - 2 * PIXEL, h, FRAME_OUTER);
    graphics.fillRect(x, y + PIXEL, w, h - 2 * PIXEL, FRAME_OUTER);
    graphics.fillRect(x + PIXEL, y + PIXEL, w - 2 * PIXEL, h - 2 * PIXEL, KEY_SIDE);

    const faceH = h - 2 * PIXEL - side;
    graphics.fillRect(x + PIXEL, y + PIXEL, w - 2 * PIXEL, faceH, KEY_FACE);
    graphics.fillRect(x + 2 * PIXEL, y + PIXEL, w - 4 * PIXEL, PIXEL, KEY_LIGHT);

    graphics.drawText(label, Math.round(x + w / 2), Math.round(y + PIXEL + faceH / 2 + PIXEL / 2), {
        font, color: KEY_TEXT, align: "center", baseline: "middle",
    });
}

function keyWidth(graphics, label, font) {
    return Math.max(KEY_SIZE, Math.ceil(graphics.measureText(label, font)) + 2 * (KEY_PADDING + PIXEL));
}

export class ItemSelectionManager extends Component {
    static instance = null;

    items = [];
    selected = null;

    interactPressedTime = 0;
    nextPressedTime = 0;

    get selectedIndex() {
        return this.items.indexOf(this.selected);
    }

    awake() {
        ItemSelectionManager.instance = this;
        this.items = [];
        this.selected = null;
    }

    onDestroy() {
        if (ItemSelectionManager.instance === this) ItemSelectionManager.instance = null;
    }

    start() {
        const ui = GameObject.findWithTag("ui");
        const rt = this.gameObject.transform;
        if (ui) rt.setParent(ui.transform, false);
        rt.anchorMin.set(0, 0);
        rt.anchorMax.set(1, 1);
        rt.pivot.set(0, 0);
        rt.anchoredPosition.set(0, 0);
        rt.sizeDelta.set(0, 0);

        document.fonts?.load(NAME_FONT).catch(() => {});
    }

    update() {
        this.items = this.items.filter(item => !item.isDestroyed && item.canInteract);
        if (!this.items.includes(this.selected)) this.selected = this.items[0] ?? null;

        this.interactPressedTime = Math.max(0, this.interactPressedTime - Time.unscaledDeltaTime);
        this.nextPressedTime = Math.max(0, this.nextPressedTime - Time.unscaledDeltaTime);

        if (this.items.length > 1 && Input.getKeyDown(NEXT_KEY)) {
            this.nextPressedTime = PRESS_TIME;
            this.selectNext();
        }

        if (this.selected && Input.getKeyDown(INTERACT_KEY)) {
            this.interactPressedTime = PRESS_TIME;
            this.selected.interact();
        }
    }

    selectNext() {
        if (!this.items.length) return;
        this.selected = this.items[(this.selectedIndex + 1) % this.items.length];
    }

    addItemToSelection(interactable) {
        if (this.items.includes(interactable)) return;
        this.items.push(interactable);
        this.selected ??= interactable;
    }

    removeItemFromSelection(interactable) {
        const index = this.items.indexOf(interactable);
        if (index === -1) return;

        this.items.splice(index, 1);
        if (this.selected === interactable) {
            this.selected = this.items[Math.min(index, this.items.length - 1)] ?? null;
        }
    }
}

export class ItemSelectionView extends UIElement {
    render(graphics) {
        const manager = this.gameObject.getComponent(ItemSelectionManager);
        const items = manager?.items ?? [];
        if (!items.length) return;

        const selectedIndex = Math.max(0, manager.selectedIndex);
        const first = Math.max(0, Math.min(selectedIndex - MAX_ROWS + 1, items.length - MAX_ROWS));
        const visible = items.slice(first, first + MAX_ROWS);

        const hint = items.length > 1 ? `${NEXT_LABEL}` : null;
        const hintKeyW = hint ? keyWidth(graphics, "SPACE", HINT_FONT) : 0;
        const hintW = hint ? hintKeyW + NAME_GAP + graphics.measureText(hint, HINT_FONT) : 0;

        const nameX = KEY_SIZE + NAME_GAP;
        const namesW = Math.max(...visible.map(item => graphics.measureText(item.label, NAME_FONT)));
        const contentW = Math.ceil(Math.max(nameX + namesW, hintW));
        const listH = visible.length * KEY_SIZE + (visible.length - 1) * ROW_GAP;
        const hintH = hint ? ROW_GAP * 2 + PIXEL + HINT_KEY_HEIGHT : 0;

        const { x: rx, y: ry, w: rw, h: rh } = this.rect;
        const panelW = contentW + 2 * PANEL_PADDING;
        const panelH = listH + hintH + 2 * PANEL_PADDING;
        const panelX = Math.round(rx + (rw - panelW) / 2);
        const panelY = Math.round(ry + rh - BOTTOM_MARGIN - panelH);

        graphics.fillRect(panelX, panelY, panelW, panelH, PANEL_BG);
        strokeRect(graphics, panelX, panelY, panelW, panelH, PIXEL, FRAME_OUTER);
        strokeRect(graphics, panelX + PIXEL, panelY + PIXEL, panelW - 2 * PIXEL, panelH - 2 * PIXEL, PIXEL, FRAME_INNER);

        const left = panelX + PANEL_PADDING;
        let y = panelY + PANEL_PADDING;

        for (const item of visible) {
            const isSelected = item === manager.selected;
            const middle = Math.round(y + KEY_SIZE / 2);

            if (isSelected) {
                drawKey(graphics, left, y, KEY_SIZE, KEY_SIZE, "F", KEY_FONT, manager.interactPressedTime > 0);
            } else {
                graphics.fillRect(left + (KEY_SIZE - 2 * PIXEL) / 2, middle - PIXEL, 2 * PIXEL, 2 * PIXEL, NAME_DIM);
            }

            graphics.drawText(item.label, left + nameX, middle + PIXEL / 2, {
                font: NAME_FONT, color: isSelected ? NAME_COLOR : NAME_DIM, baseline: "middle",
            });
            y += KEY_SIZE + ROW_GAP;
        }

        if (!hint) return;

        graphics.fillRect(left, y, contentW, PIXEL, FRAME_INNER);
        y += PIXEL + ROW_GAP;

        drawKey(graphics, left, y, hintKeyW, HINT_KEY_HEIGHT, "SPACE", HINT_FONT, manager.nextPressedTime > 0);
        graphics.drawText(hint, left + hintKeyW + NAME_GAP, Math.round(y + HINT_KEY_HEIGHT / 2), {
            font: HINT_FONT, color: NAME_DIM, baseline: "middle",
        });
    }
}

export class ItemSelectionPrefab extends Prefab {
    constructor() {
        super("ItemSelection", RectTransform, ItemSelectionManager, ItemSelectionView);
        this.tag = "itemSelection";
    }
}

export const ItemSelection = new ItemSelectionPrefab();

export function addItemToSelection(interactable) {
    ItemSelectionManager.instance?.addItemToSelection(interactable);
}

export function removeItemFromSelection(interactable) {
    ItemSelectionManager.instance?.removeItemFromSelection(interactable);
}
