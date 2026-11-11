import type Component from "../Component.js";
import type Entity from "../Entity.js";
import type Vector2 from "../Vector2.js";

type BaseCollider = {
    /** Offset from the entity's center. Defaults to (0, 0). */
    offset?: Vector2;
    /** Triggers detect overlaps and fire collision callbacks, but never push anything. */
    trigger?: boolean;
    /** Debug outline color. Defaults to red, or lime for triggers. */
    color?: string;
};

export type SquareCollider = BaseCollider & {
    type: "square";
    size: Vector2;
};

export type CircleCollider = BaseCollider & {
    type: "circle";
    radius: number;
};

export type ColliderConfig = SquareCollider | CircleCollider;

export type Bounds = {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
};

export default class Collider extends Component {
    /** When true, every collider draws its outline. */
    static debug: boolean;

    readonly config: ColliderConfig & { offset: Vector2; trigger: boolean };

    constructor(config: ColliderConfig);

    /** World-space center of the collider for the given entity. */
    getCenter(entity: Entity): Vector2;

    /** World-space axis-aligned bounding box for the given entity. */
    getBounds(entity: Entity): Bounds;

    update(target: Entity, deltaTime?: number): void;
}