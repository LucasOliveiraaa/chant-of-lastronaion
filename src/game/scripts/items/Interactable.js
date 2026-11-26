import Component from "../../../engine/core/Component.js";
import GameObject from "../../../engine/core/GameObject.js";
import Collider from "../../../engine/physics/Collider.js";
import { INTERACTABLE_RANGE } from "../Config.js";
import { addItemToSelection, removeItemFromSelection } from "../gui/ItemSelection.js";

// Hysteresis so standing on the edge of the range doesn't flicker.
const EXIT_SLACK = 1.15;

// onInteract gets the interactable as an argument because prefab functions are shared with
// every copy, so a closure would point at the prefab.
export default class Interactable extends Component {
    static RANGED = "ranged";
    static CONTACT = "contact";

    type = Interactable.RANGED;
    displayName = "";
    range = INTERACTABLE_RANGE;
    // <= 0 covers the object's rect.
    pickupRange = 0;
    canInteract = true;
    // (interactable, player) => void
    onInteract = null;

    #inRange = false;
    #ownCollider = null;

    get label() {
        return this.displayName || this.gameObject?.name || "";
    }

    get player() {
        return GameObject.findWithTag("player");
    }

    interact() {
        if (!this.canInteract || this.isDestroyed || !this.onInteract) return;
        this.onInteract(this, this.player);
    }

    // Not awake: `new GameObject(..., Interactable)` awakes before the fields are set.
    start() {
        if (this.type !== Interactable.CONTACT || this.gameObject.getComponent(Collider)) return;

        this.#ownCollider = this.gameObject.addComponent(Collider);
        this.#ownCollider.type = Collider.CIRCLE;
        this.#ownCollider.isTrigger = true;
        this.#syncOwnCollider();
    }

    update() {
        if (this.#ownCollider) this.#syncOwnCollider();
        this.#setInRange(this.type === Interactable.RANGED && this.canInteract && this.#playerWithinRange());
    }

    onDestroy() {
        this.#setInRange(false);
    }

    onTriggerEnter(other) {
        this.#touched(other.gameObject);
    }

    onCollisionEnter(collision) {
        this.#touched(collision.gameObject);
    }

    #touched(other) {
        if (this.type === Interactable.CONTACT && other?.compareTag("player")) this.interact();
    }

    #setInRange(inRange) {
        if (inRange === this.#inRange) return;
        this.#inRange = inRange;
        if (inRange) addItemToSelection(this);
        else removeItemFromSelection(this);
    }

    #playerWithinRange() {
        const player = this.player;
        if (!player) return false;

        const center = player.transform.worldCenter;
        const min = this.gameObject.transform.worldPosition;
        const { scale } = this.gameObject.transform;
        const dx = Math.max(min.x - center.x, 0, center.x - (min.x + scale.x));
        const dy = Math.max(min.y - center.y, 0, center.y - (min.y + scale.y));

        const limit = this.#inRange ? this.range * EXIT_SLACK : this.range;
        return dx * dx + dy * dy <= limit * limit;
    }

    #syncOwnCollider() {
        const { scale } = this.gameObject.transform;
        this.#ownCollider.radius = this.pickupRange > 0 ? this.pickupRange : Math.max(scale.x, scale.y) / 2;
    }
}
