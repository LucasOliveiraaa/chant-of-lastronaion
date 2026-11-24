import GameObject from "./GameObject.js";

// A template for GameObject.instantiate.
export default class Prefab extends GameObject {
    get isPrefab() {
        return true;
    }
}
