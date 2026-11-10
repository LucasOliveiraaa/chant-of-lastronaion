import Component from "../component.js";
import { getSpriteBounds, renderSprite } from "../lib/sprite.js";
import Vector2 from "../vector2.js";
import World from "../world.js";

export default class SpriteRenderer extends Component {
    bounds = [];
    currentFrame = 0;
    accumulatedTime = 0;
    currentAnimation = null;

    constructor(sprite, config) {
        super();
        this.sprite = sprite;
        this.config = {
            gap: Vector2.ZERO,
            margin: Vector2.ZERO,
            cols: 1,
            rows: 1,
            animations: new Map(),
            ...config,
        };

        this.spriteCount = this.config.rows * this.config.cols;

        for (const [name, anim] of Object.entries(this.config.animations)) {
            if (anim.frames.some(frame => frame < 0 || frame >= this.spriteCount)) {
                throw new Error(`Animation "${name}" has frames out of bounds.`);
            }
        }

        this.sheetSize = new Vector2(sprite.width, sprite.height);

        this.bounds = getSpriteBounds(this.sheetSize, this.config);
    }

    setAnimation(name) {
        if (this.currentAnimation !== name) {
            this.currentAnimation = name;
            this.currentFrame = 0;
            this.accumulatedTime = 0;
        }
    }

    update(target, deltaTime) {
        const ctx = World.getInstance().ctx;
        let spriteIndex;

        if (this.currentAnimation) {
            const anim = this.config.animations[this.currentAnimation];
            const timePerFrame = anim.duration / anim.frames.length;
            this.accumulatedTime += deltaTime;

            if (this.accumulatedTime >= timePerFrame) {
                this.accumulatedTime -= timePerFrame;
                const next = this.currentFrame + 1;

                if (anim.loop) {
                    this.currentFrame = next % anim.frames.length;
                } else {
                    this.currentFrame = Math.min(next, anim.frames.length - 1);
                }
            }

            spriteIndex = anim.frames[this.currentFrame];
        } else {
            spriteIndex = 0;
        }

        renderSprite(
            ctx, 
            target.position, 
            target.size, 
            this.sprite, 
            this.bounds[spriteIndex]
        );
    }
}