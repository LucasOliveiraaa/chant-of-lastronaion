import Component from "../../../engine/core/Component.js";
import SpriteRenderer from "../../../engine/rendering/SpriteRenderer.js";
import SquareCollider from "../../../engine/physics/SquareCollider.js";
import SortingLayer from "../../../engine/rendering/SortingLayer.js";
import { Tile } from "../../lib/Tile.js";
import { TILE_WIDTH } from "../Config.js";
import DungeonManager from "./DungeonManager.js";

// Configures one tile of a chamber from its Tile entry: size, sprite and collider. Obstacles
// get a solid collider, doors a trigger that moves the player to the neighboring chamber, and
// floors none. Changing tileId at runtime reconfigures it.
export default class TileManager extends Component {
    static requiredComponents = [SpriteRenderer];

    tileId = null;
    /** For door tiles: the dungeon cell the door belongs to and the side it is on. */
    door = null;

    _tile = null;

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

    // Applies right away, so a chamber built mid-frame is drawn and collides on that frame.
    setTile(tileId, door = this.door) {
        this.tileId = tileId;
        this.door = door;
        this._tile = Tile[tileId] ?? null;

        this.sr.setSprite(this._tile?.sprite ?? null);

        const needsCollider = this._tile !== null && (this._tile.obstacle || this._tile.door);
        let collider = this.gameObject.getComponent(SquareCollider);
        if (needsCollider && !collider) {
            collider = this.gameObject.addComponent(SquareCollider);
        } else if (!needsCollider && collider) {
            this.gameObject.removeComponent(SquareCollider);
            collider = null;
        }
        if (collider) collider.isTrigger = !this._tile.obstacle;
    }

    onTriggerEnter(other) {
        if (!this._tile?.door || !this.door || other.gameObject.tag !== "player") return;
        DungeonManager.instance?.requestTransition(this.door.cell, this.door.direction);
    }
}
