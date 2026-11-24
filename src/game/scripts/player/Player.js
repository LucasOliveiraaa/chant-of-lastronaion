import GameObject from "../../../engine/core/GameObject.js";
import Rigidbody from "../../../engine/physics/Rigidbody.js";
import SquareCollider from "../../../engine/physics/SquareCollider.js";
import SolidRenderer from "../../../engine/rendering/SolidRenderer.js";
import PlayerState from "./PlayerState.js";
import PlayerMovement from "./PlayerMovement.js";
import SortingLayer from "../../../engine/rendering/SortingLayer.js";
import Prefab from "../../../engine/core/Prefab.js";

export class PlayerPrefab extends Prefab {
    constructor() {
        super("Player", SolidRenderer, Rigidbody, SquareCollider, PlayerMovement, PlayerState);

        this.tag = "player";

        this.transform.position.set(100, 100);
        this.transform.scale.set(50, 50);

        const solidRenderer = this.getComponent(SolidRenderer);
        solidRenderer.color = "#0000FF";
        solidRenderer.sortingLayer = SortingLayer.FOREGROUND;
        solidRenderer.sortingOrder = 1;

        const rb = this.getComponent(Rigidbody);
        rb.gravityScale = 0;
    }
}

export const Player = new PlayerPrefab();