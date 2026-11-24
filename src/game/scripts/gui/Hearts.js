import Sprites from "../../../engine/assets/Sprites.js";
import Component from "../../../engine/core/Component.js";
import GameObject from "../../../engine/core/GameObject.js";
import Prefab from "../../../engine/core/Prefab.js";
import RectTransform from "../../../engine/ui/RectTransform.js";
import PlayerState from "../player/PlayerState.js";
import UISprite from "../../../engine/ui/UISprite.js";

function createHeart() {
    return new GameObject("Heart", RectTransform, UISprite);
}

export class HeartsManager extends Component {
    async start() {
        const sprites = Sprites.getInstance();
        const sheet = await sprites.loadSpriteSheet("assets/sprites/hearts.png");
        const sps = sprites.sliceSpriteSheet(sheet, 4, 7);

        this.full = sps[0];
        this.half = sps[1];
        this.empty = sps[2];

        this.player = GameObject.findWithTag("player");
        this.ui = GameObject.findWithTag("ui");
        this.playerState = this.player.getComponent(PlayerState);

        this.hearts = [];
    
        this.setHeartState();
    }

    update() {
        this.setHeartState();
    }

    setHeartState() {
        if (!this.playerState) return;

        if (this.playerState.health % 0.5 !== 0) {
            // Correct to the nearest half-heart value
            this.playerState.health = Math.round(this.playerState.health * 2) / 2;
        }

        this.heartState = [];

        let currVal = this.playerState.health;
        while (currVal > 0) {
            if (currVal >= 1) {
                this.heartState.push(1);
                currVal -= 1;
            }else {
                this.heartState.push(0.5);
                currVal -= 0.5;
            }
        }

        const taken = this.playerState.maxHealth - Math.ceil(this.playerState.health);
        for (let i = 0; i < taken; i++) {
            this.heartState.push(0);
        }

        if (this.previousHealth !== this.playerState.health) {
            this.previousHealth = this.playerState.health;
            this.updateHearts();
        }
    }

    updateHearts() {
        if (!this.ui) return;

        for (const heart of this.hearts) {
            heart.destroy();
        }

        const GAP = 0;
        const START_X = 50;
        const START_Y = 25;

        const heartWidth = 50;
        const heartHeight = 50;

        this.hearts = [];
        let x = START_X;
        for (const state of this.heartState) {
            const heart = createHeart();
            const rt = heart.transform;
            rt.setParent(this.ui.transform, false);
            rt.anchorMin.set(0, 0);
            rt.anchorMax.set(0, 0);
            rt.pivot.set(0, 0);
            rt.anchoredPosition.set(x, START_Y);
            rt.sizeDelta.set(heartWidth, heartHeight);
            const sprite = heart.getComponent(UISprite);
            sprite.setSprite(state === 1 ? this.full : state === 0.5 ? this.half : this.empty);
            this.hearts.push(heart);
            x += heartWidth + GAP;
        }
    }
}

export class HeartsPrefab extends Prefab {
    constructor() {
        super("Hearts", RectTransform, HeartsManager);
    }
}

export const Hearts = new HeartsPrefab();