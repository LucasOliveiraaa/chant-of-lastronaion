import type Vector2 from "./Vector2";

export default class AABB {
    min: Vector2;
    max: Vector2;

    constructor(min: Vector2, max: Vector2);
}