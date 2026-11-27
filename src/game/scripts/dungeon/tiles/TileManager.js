import Component from "../../../../engine/core/Component.js";
import GameObject from "../../../../engine/core/GameObject.js";
import SpriteRenderer from "../../../../engine/rendering/SpriteRenderer.js";
import Collider from "../../../../engine/physics/Collider.js";
import SortingLayer from "../../../../engine/rendering/SortingLayer.js";
import { Tile } from "./Tiles.js";
import { TILE_WIDTH } from "../../Config.js";
import Interactable from "../../items/Interactable.js";
import DungeonManager from "../DungeonManager.js";

// The door's trigger is smaller than its tile, so the player steps into the doorway before
// leaving (the depth effect). A solid strip this deep along the tile's outer edge, past the
// trigger, keeps projectiles, enemies and thin hitboxes from slipping out around it.
const DOOR_BARRIER_DEPTH = TILE_WIDTH / 4;

// One tile of the live chamber, built by ChamberManager from the chamber's tile layer. Reads
// the tile registry (Tiles.js) for its sprite and collider; door tiles also carry the dungeon
// cell and side they lead out of, and ask the DungeonManager to switch chambers on contact.
// Tiles with an interaction (stairs) get an Interactable that runs it.
export default class TileManager extends Component {
    static requiredComponents = [SpriteRenderer];

    tileId = null;
    // { cell, direction } for door tiles.
    door = null;

    _tile = null;
    _doorBarrier = null;

    get tile() {
        return this._tile;
    }

    awake() {
        this.gameObject.transform.scale.set(TILE_WIDTH, TILE_WIDTH);

        this.sr = this.gameObject.getComponent(SpriteRenderer);
        this.sr.sortingLayer = SortingLayer.BACKGROUND;
        this.sr.imageSmoothing = false;
    }

    start() {
        if (this._tile?.id !== this.tileId) this.setTile(this.tileId);
    }

    update() {
        if (this._tile?.id !== this.tileId) this.setTile(this.tileId);
    }

    setTile(tileId, door = this.door) {
        this.tileId = tileId;
        this.door = door;
        this._tile = Tile[tileId] ?? null;

        this.sr.setSprite(this._tile?.sprite ?? null);

        const needsCollider = this._tile !== null && (this._tile.obstacle || this._tile.door);
        let collider = this.gameObject.getComponent(Collider);
        if (needsCollider && !collider) {
            collider = this.gameObject.addComponent(Collider);
        } else if (!needsCollider && collider) {
            this.gameObject.removeComponent(Collider);
            collider = null;
        }
        if (collider) collider.isTrigger = !this._tile.obstacle;

        if (door && collider) {
            collider.size.set(TILE_WIDTH * 0.5, TILE_WIDTH * 0.5);
            collider.debug = true;
        }

        this.setDoorBarrier(this._tile?.door ? door?.direction ?? null : null);
        this.#setInteraction(this._tile?.interaction ?? null);
    }

    // Tiles with an interaction (e.g. stairs) get an Interactable that runs it.
    #setInteraction(interaction) {
        let interactable = this.gameObject.getComponent(Interactable);
        if (!interaction) {
            if (interactable) this.gameObject.removeComponent(Interactable);
            return;
        }

        interactable ??= this.gameObject.addComponent(Interactable);
        interactable.displayName = interaction.label;
        interactable.onInteract = (_, player) => {
            interaction.onInteract({ dungeon: DungeonManager.instance, player, tile: this });
        };
    }

    // A GameObject has one collider, so the barrier is a child object. null removes it.
    setDoorBarrier(direction) {
        if (!direction) {
            this._doorBarrier?.destroy();
            this._doorBarrier = null;
            return;
        }

        if (!this._doorBarrier) {
            this._doorBarrier = new GameObject("Door Barrier", Collider);
            this._doorBarrier.transform.setParent(this.gameObject.transform, false);
            this._doorBarrier.getComponent(Collider).debug = true;
        }

        const depth = DOOR_BARRIER_DEPTH;
        const far = TILE_WIDTH - depth;
        const [x, y, w, h] = {
            top: [0, 0, TILE_WIDTH, depth],
            bottom: [0, far, TILE_WIDTH, depth],
            left: [0, 0, depth, TILE_WIDTH],
            right: [far, 0, depth, TILE_WIDTH],
        }[direction];

        const { transform } = this._doorBarrier;
        transform.position.set(x, y);
        transform.scale.set(w, h);
    }

    onTriggerEnter(other) {
        if (!this._tile?.door || !this.door || other.gameObject.tag !== "player") return;
        DungeonManager.instance?.requestTransition(this.door.cell, this.door.direction);
    }
}
