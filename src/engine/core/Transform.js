import Component from "./Component.js";
import Vector2 from "../math/Vector2.js";

export default class Transform extends Component {
    parent = null;
    children = [];

    position = new Vector2(0, 0);
    scale = new Vector2(1, 1);

    get childCount() {
        return this.children.length;
    }

    get siblingIndex() {
        return this.parent ? this.parent.children.indexOf(this) : 0;
    }

    // Parenting only inherits the translation. Scale is the size in pixels, so it is not inherited.
    get worldPosition() {
        let x = this.position.x;
        let y = this.position.y;
        for (let p = this.parent; p; p = p.parent) {
            x += p.position.x;
            y += p.position.y;
        }
        return new Vector2(x, y);
    }

    set worldPosition(value) {
        const origin = this.parent ? this.parent.worldPosition : Vector2.zero();
        this.position.set(value.x - origin.x, value.y - origin.y);
    }

    setParent(parent, keepWorldPosition = true) {
        if (parent === this.parent) return;
        if (parent?.isChildOf(this)) {
            throw new Error("A transform can't be parented to itself or to one of its descendants.");
        }

        const world = keepWorldPosition ? this.worldPosition : null;

        if (this.parent) {
            this.parent.children.splice(this.parent.children.indexOf(this), 1);
        }
        this.parent = parent;
        parent?.children.push(this);

        if (world) this.worldPosition = world;
    }

    // True for any ancestor, and for the transform itself (same as Unity).
    isChildOf(transform) {
        for (let t = this; t; t = t.parent) {
            if (t === transform) return true;
        }
        return false;
    }

    detachChildren() {
        for (const child of [...this.children]) {
            child.setParent(null);
        }
    }

    getChild(index) {
        return this.children[index] ?? null;
    }

    setSiblingIndex(index) {
        if (!this.parent) return;
        const siblings = this.parent.children;
        siblings.splice(siblings.indexOf(this), 1);
        siblings.splice(Math.max(0, Math.min(index, siblings.length)), 0, this);
    }

    setAsFirstSibling() {
        this.setSiblingIndex(0);
    }

    setAsLastSibling() {
        this.setSiblingIndex(Infinity);
    }

    // Depth first, parents before children (the order UI should be drawn in).
    *descendants() {
        for (const child of this.children) {
            yield child;
            yield* child.descendants();
        }
    }

    translate(delta) {
        this.position.x += delta.x;
        this.position.y += delta.y;
    }
}