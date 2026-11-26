import Prefab from "../../../engine/core/Prefab.js";
import SpriteRenderer from "../../../engine/rendering/SpriteRenderer.js";
import Animator from "../../../engine/animation/Animator.js";
import PlayerState from "../player/PlayerState.js";
import Interactable from "./Interactable.js";

const HEAL = { half: 0.5, full: 1, double: 2 };

export class HeartPrefab extends Prefab {
    static HALF = "half";
    static FULL = "full";
    static DOUBLE = "double";

    constructor(type = HeartPrefab.FULL) {
        super("Heart", SpriteRenderer, Animator, Interactable);
        this.tag = "heart";

        const interactable = this.getComponent(Interactable);
        interactable.type = Interactable.CONTACT;
        interactable.displayName = "Coração";
        interactable.pickupRange = 10;

        interactable.onInteract = (heart, player) => {
            player?.getComponent(PlayerState)?.heal(HEAL[type]);
            heart.gameObject.destroy();
        };
    }
}
