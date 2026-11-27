import GameObject from "../../../engine/core/GameObject.js";
import Rigidbody from "../../../engine/physics/Rigidbody.js";
import Collider from "../../../engine/physics/Collider.js";
import SolidRenderer from "../../../engine/rendering/SolidRenderer.js";
import PlayerState from "./PlayerState.js";
import PlayerMovement from "./PlayerMovement.js";
import PlayerWeapon from "./PlayerWeapon.js";
import { Guitar } from "../weapons/Weapons.js";
import SortingLayer from "../../../engine/rendering/SortingLayer.js";
import Prefab from "../../../engine/core/Prefab.js";
import SpriteRenderer from "../../../engine/rendering/SpriteRenderer.js";
import Animator from "../../../engine/animation/Animator.js";
import Vector2 from "../../../engine/math/Vector2.js";

export class PlayerPrefab extends Prefab {
    constructor() {
        super("Player", SpriteRenderer, Animator, Rigidbody, Collider, PlayerMovement, PlayerState, PlayerWeapon);

        this.tag = "player";

        this.transform.position.set(100, 100);
        this.transform.scale.set(45, 45);

        const spriteRenderer = this.getComponent(SpriteRenderer);
        spriteRenderer.sortingLayer = SortingLayer.FOREGROUND;
        spriteRenderer.sortingOrder = 1;

        const rb = this.getComponent(Rigidbody);
        rb.gravityScale = 0;
        rb.freezeRotation = true;

        const collider = this.getComponent(Collider);
        collider.type = Collider.CIRCLE;
        collider.radius = 8;
        collider.offset = new Vector2(0, 15);
        collider.debug = true;

        this.getComponent(PlayerWeapon).weapon = Guitar;
    }
}

export const Player = new PlayerPrefab();