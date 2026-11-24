import GameObject from "./GameObject";

/**
 * A template for GameObject.instantiate.
 */
export default class Prefab extends GameObject {
    readonly isPrefab: true;
}
