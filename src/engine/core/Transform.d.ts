import type Component from "./Component.js";
import type GameObject from "./GameObject.js";
import type Vector2 from "../math/Vector2.js";

export default class Transform extends Component {
    /** Use setParent to change it. */
    readonly parent: Transform | null;
    /** In sibling order. Use setParent and setSiblingIndex to change it. */
    readonly children: readonly Transform[];
    readonly childCount: number;
    readonly siblingIndex: number;

    /** Local to the parent. It is the same as world space when there is no parent. */
    position: Vector2;
    /** The size in pixels. It is not inherited from the parent. */
    scale: Vector2;

    /** Position in world space. A getter returns a new vector, so assign to it to move the transform. */
    worldPosition: Vector2;

    constructor(position?: Vector2, scale?: Vector2);

    /**
     * Changes the parent, or detaches it with null.
     * With keepWorldPosition (default) the local position is adjusted so it doesn't move.
     * Throws if the parent is this transform or one of its descendants.
     */
    setParent(parent: Transform | null, keepWorldPosition?: boolean): void;

    /** True for any ancestor, and for the transform itself (same as Unity). */
    isChildOf(transform: Transform): boolean;

    detachChildren(): void;
    getChild(index: number): Transform | null;

    setSiblingIndex(index: number): void;
    setAsFirstSibling(): void;
    setAsLastSibling(): void;

    /** All descendants, depth first, parents before children. */
    descendants(): Generator<Transform>;

    /** Moves the local position by delta, in place. */
    translate(delta: Vector2): void;
}