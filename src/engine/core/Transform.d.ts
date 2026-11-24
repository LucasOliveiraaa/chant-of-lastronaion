import type Component from "./Component.js";
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
    /**
     * Degrees around the rect's center, local to the parent. Positive is clockwise on screen.
     * Renderers follow it; colliders and UI ignore it. Default 0.
     */
    rotation: number;

    /**
     * Position in world space: the rect's top-left corner before its own rotation.
     * A child's rect rotates with its parent's around the parent's center.
     * A getter returns a new vector, so assign to it to move the transform.
     */
    worldPosition: Vector2;
    /** Rotation in world space (the sum of the rotations up the hierarchy). */
    worldRotation: number;
    /** Center of the rect in world space, the point it rotates around. */
    readonly worldCenter: Vector2;

    /**
     * Changes the parent, or detaches it with null.
     * With keepWorldPosition (default) the local position and rotation are adjusted so it doesn't move.
     * Throws if the parent is this transform or one of its descendants, or if one side belongs to a
     * Prefab and the other to a scene GameObject.
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
    /** Adds degrees to the local rotation. */
    rotate(degrees: number): void;
}