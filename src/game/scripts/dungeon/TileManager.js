import Component from "../../../engine/core/Component.js";
import SpriteRenderer from "../../../engine/rendering/SpriteRenderer.js";
import Collider from "../../../engine/physics/Collider.js";
import SortingLayer from "../../../engine/rendering/SortingLayer.js";
import { Tile } from "../../lib/Tile.js";
import { TILE_WIDTH } from "../Config.js";
import DungeonManager from "./DungeonManager.js";

export default class TileManager extends Component {
    static requiredComponents = [SpriteRenderer];

    tileId = null;
    // { cell, direction } for door tiles.
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
    }

    onTriggerEnter(other) {
        if (!this._tile?.door || !this.door || other.gameObject.tag !== "player") return;
        DungeonManager.instance?.requestTransition(this.door.cell, this.door.direction);
    }
}
