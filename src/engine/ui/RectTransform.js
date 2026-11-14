import Transform from "../core/Transform.js";
import Vector2 from "../math/Vector2.js";

// Screen space with Y pointing down: anchor (0, 0) is the top-left corner of the parent
// and a positive anchoredPosition.y moves the element down.
export default class RectTransform extends Transform {
    pivot = new Vector2(0.5, 0.5);
    anchorMin = new Vector2(0, 0);
    anchorMax = new Vector2(0, 0);
    anchoredPosition = new Vector2(0, 0);

    // With a point anchor (min == max) this is the size. With stretched anchors it is
    // the extra size on top of the anchor area, so (-20, -20) leaves a 10px margin.
    sizeDelta = new Vector2(100, 100);

    // Absolute result, written by updateRect()
    rect = { x: 0, y: 0, w: 0, h: 0 };

    // Set by a layout component (e.g. UIPanel) to place the children before they update
    onLayoutChildren = null;

    // Replaces the GameObject's transform, like Unity does when a RectTransform is added.
    // Hierarchy is carried over so it also works when added after the object was parented.
    awake() {
        const previous = this.gameObject.transform;

        if (previous && previous !== this) {
            if (previous instanceof RectTransform) {
                console.warn(`"${this.gameObject.name}" already has a RectTransform; the new one replaces it.`);
            }

            const parent = previous.parent;
            this.position.set(previous.position.x, previous.position.y);

            for (const child of [...previous.children]) child.setParent(this, false);
            previous.setParent(null, false);
            this.setParent(parent, false);
        }

        this.gameObject.transform = this;
    }

    updateRect(parentRect) {
        const minX = parentRect.x + parentRect.w * this.anchorMin.x;
        const maxX = parentRect.x + parentRect.w * this.anchorMax.x;
        const minY = parentRect.y + parentRect.h * this.anchorMin.y;
        const maxY = parentRect.y + parentRect.h * this.anchorMax.y;

        const w = Math.max(0, maxX - minX + this.sizeDelta.x);
        const h = Math.max(0, maxY - minY + this.sizeDelta.y);

        const pivotX = minX + (maxX - minX) * this.pivot.x + this.anchoredPosition.x;
        const pivotY = minY + (maxY - minY) * this.pivot.y + this.anchoredPosition.y;

        this.rect.x = pivotX - w * this.pivot.x;
        this.rect.y = pivotY - h * this.pivot.y;
        this.rect.w = w;
        this.rect.h = h;
    }

    layout(parentRect) {
        this.updateRect(parentRect);
        this.layoutChildren();
    }

    // Lays out the children against the current rect, without recomputing it.
    layoutChildren() {
        this.onLayoutChildren?.();

        for (const child of this.children) {
            if (child instanceof RectTransform) child.layout(this.rect);
        }
    }
}