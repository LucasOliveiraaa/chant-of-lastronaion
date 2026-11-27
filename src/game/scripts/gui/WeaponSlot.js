import Sprites from "../../../engine/assets/Sprites.js";
import Component from "../../../engine/core/Component.js";
import GameObject from "../../../engine/core/GameObject.js";
import Prefab from "../../../engine/core/Prefab.js";
import RectTransform from "../../../engine/ui/RectTransform.js";
import UIElement from "../../../engine/ui/UIElement.js";
import PlayerWeapon from "../player/PlayerWeapon.js";
import { PIXEL, PANEL_BG, drawPanelFrame } from "./Minimap.js";

const SLOT_SIZE = 24 * PIXEL;
const SLOT_MARGIN = 4 * PIXEL;
// Frame (2 pixels) plus a pixel of breathing room around the icon.
const ICON_INSET = 3 * PIXEL;

const COOLDOWN_OVERLAY = "rgba(255, 255, 255, 0.55)";

// The held weapon's icon, covered by a white veil that sinks as its cooldown runs out.
class WeaponSlotElement extends UIElement {
    playerWeapon = null;

    render(graphics) {
        const { x, y, w, h } = this.rect;
        if (w <= 0 || h <= 0) return;

        graphics.fillRect(x, y, w, h, PANEL_BG);

        const iconX = x + ICON_INSET;
        const iconY = y + ICON_INSET;
        const iconSize = Math.min(w, h) - 2 * ICON_INSET;
        const weapon = this.playerWeapon?.weapon;

        const icon = weapon?.icon != null ? Sprites.getInstance().getSprite(weapon.icon) : null;
        if (icon) {
            graphics.imageSmoothing = false;
            graphics.drawSprite(icon, iconX, iconY, iconSize, iconSize);
        }

        // Anchored to the bottom: full right after a volley, shrinking down to nothing.
        const progress = weapon ? this.playerWeapon.cooldownProgress : 0;
        if (progress > 0) {
            const overlayHeight = Math.round(iconSize * progress);
            graphics.fillRect(iconX, iconY + iconSize - overlayHeight, iconSize, overlayHeight, COOLDOWN_OVERLAY);
        }

        drawPanelFrame(graphics, x, y, w, h);
    }
}

export class WeaponSlotManager extends Component {
    start() {
        this.ui = GameObject.findWithTag("ui");
        this.element = null;
        this.createElement();
    }

    update() {
        if (this.element && !this.element.playerWeapon) {
            this.element.playerWeapon = GameObject.findWithTag("player")?.getComponent(PlayerWeapon) ?? null;
        }
    }

    createElement() {
        if (!this.ui) return;

        const gameObject = new GameObject("Weapon Slot", RectTransform, WeaponSlotElement);
        const rt = gameObject.transform;
        rt.setParent(this.ui.transform, false);
        rt.anchorMin.set(0, 1);
        rt.anchorMax.set(0, 1);
        rt.pivot.set(0, 1);
        rt.anchoredPosition.set(SLOT_MARGIN, -SLOT_MARGIN);
        rt.sizeDelta.set(SLOT_SIZE, SLOT_SIZE);

        this.element = gameObject.getComponent(WeaponSlotElement);
        this.update();
    }
}

export class WeaponSlotPrefab extends Prefab {
    constructor() {
        super("Weapon Slot", RectTransform, WeaponSlotManager);
    }
}

export const WeaponSlot = new WeaponSlotPrefab();
