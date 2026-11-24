import Component from "./Component.js";
import Vector2 from "../math/Vector2.js";

export default class Transform extends Component {
    parent = null;
    children = [];

    position = new Vector2(0, 0);
    scale = new Vector2(1, 1);
    // Degrees around the rect's center; positive is clockwise on screen.
    rotation = 0;

    get childCount() {
        return this.children.length;
    }

    get siblingIndex() {
        return this.parent ? this.parent.children.indexOf(this) : 0;
    }

    // Position and rotation are inherited; scale is the size in pixels, so it is not.
    // worldPosition is the rect's top-left corner before its own rotation is applied, and a
    // child's rect rotates with its parent's around the parent's center.
    get worldPosition() {
        const parent = this.parent;
        if (!parent) return this.position.clone();

        const origin = parent.worldPosition;
        const angle = parent.worldRotation;
        if (angle === 0) return origin.add(this.position);

        const offset = new Vector2(
            this.position.x + (this.scale.x - parent.scale.x) / 2,
            this.position.y + (this.scale.y - parent.scale.y) / 2
        ).rotate(angle);

        return new Vector2(
            origin.x + (parent.scale.x - this.scale.x) / 2 + offset.x,
            origin.y + (parent.scale.y - this.scale.y) / 2 + offset.y
        );
    }

    set worldPosition(value) {
        const parent = this.parent;
        if (!parent) {
            this.position.set(value.x, value.y);
            return;
        }

        const origin = parent.worldPosition;
        const angle = parent.worldRotation;
        if (angle === 0) {
            this.position.set(value.x - origin.x, value.y - origin.y);
            return;
        }

        const offset = new Vector2(
            value.x - origin.x - (parent.scale.x - this.scale.x) / 2,
            value.y - origin.y - (parent.scale.y - this.scale.y) / 2
        ).rotate(-angle);

        this.position.set(
            offset.x - (this.scale.x - parent.scale.x) / 2,
            offset.y - (this.scale.y - parent.scale.y) / 2
        );
    }

    get worldRotation() {
        let rotation = this.rotation;
        for (let p = this.parent; p; p = p.parent) rotation += p.rotation;
        return rotation;
    }

    set worldRotation(value) {
        this.rotation = value - (this.parent?.worldRotation ?? 0);
    }

    // Center of the rect in world space; the point the transform rotates around.
    get worldCenter() {
        const position = this.worldPosition;
        return new Vector2(position.x + this.scale.x / 2, position.y + this.scale.y / 2);
    }

    setParent(parent, keepWorldPosition = true) {
        if (parent === this.parent) return;
        if (parent?.isChildOf(this)) {
            throw new Error("A transform can't be parented to itself or to one of its descendants.");
        }
        // Like Unity, scene objects and prefab contents can't be mixed in one hierarchy.
        if (parent && Boolean(parent.gameObject?.isPrefab) !== Boolean(this.gameObject?.isPrefab)) {
            throw new Error("A prefab and a GameObject in the scene can't be parented to each other. Build the prefab's children as Prefabs, or instantiate it first.");
        }

        const world = keepWorldPosition ? this.worldPosition : null;
        const worldRotation = keepWorldPosition ? this.worldRotation : 0;

        if (this.parent) {
            this.parent.children.splice(this.parent.children.indexOf(this), 1);
        }
        this.parent = parent;
        parent?.children.push(this);

        if (world) {
            this.worldRotation = worldRotation;
            this.worldPosition = world;
        }
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

    rotate(degrees) {
        this.rotation += degrees;
    }
}