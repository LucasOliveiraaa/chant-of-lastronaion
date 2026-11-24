import Component from "../../../engine/core/Component.js";
import SpriteRenderer from "../../../engine/rendering/SpriteRenderer.js";
import SquareCollider from "../../../engine/physics/SquareCollider.js";
import { Tile } from "../../lib/Tile.js";
import { TILE_WIDTH } from "../Config.js";

export default class TileRenderer extends Component {
    tileId = null;
    _tile = null;
    
    start() {
        this.gameObject.transform.scale.set(TILE_WIDTH, TILE_WIDTH);

        if (this.tileId !== null) {
            this._tile = Tile[this.tileId];
        }

        this.sr = this.gameObject.getComponent(SpriteRenderer);
        this.sc = this.gameObject.getComponent(SquareCollider);
    }

    update() {
        if (this._tile?.id !== this.tileId) {
            this._tile = Tile[this.tileId];

            this.sr.setSprite(this._tile.sprite);

            this.sc.trigger = !this._tile.obstacle;
        }
    }

    onCollisionEnter(other) {
        if (!this._tile?.door || other.tag !== "player") {
            return;
        }
    }
}