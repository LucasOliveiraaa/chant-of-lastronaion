import Assets from "../assets.js";
import Component from "../component.js";
import { getSpriteBounds, renderSprite } from "../lib/sprite.js";
import Vector2 from "../vector2.js";
import World from "../world.js";

const MAX_TRANSITIONS_PER_UPDATE = 100;

export default class SpriteRenderer extends Component {
    currentFrame = 0;
    accumulatedTime = 0;
    currentAnimation = null;

    constructor(source, config = {}) {
        super();
        this.asset = typeof source === "string" ? Assets.get(source) : source;
        this.config = {
            gap: Vector2.ZERO,
            margin: Vector2.ZERO,
            cols: 1,
            rows: 1,
            ...config,
            animations: toAnimationMap(config.animations),
        };

        this.spriteCount = this.config.rows * this.config.cols;
        this.validateAnimations();

        this.sheetSize = new Vector2(this.asset.width, this.asset.height);
        this.bounds = getSpriteBounds(this.sheetSize, this.config);

        if (this.config.defaultAnimation !== undefined) {
            this.setAnimation(this.config.defaultAnimation);
        }
    }

    validateAnimations() {
        const { animations, defaultAnimation } = this.config;

        for (const [name, anim] of animations) {
            if (!anim.frames?.length) {
                throw new Error(`Animation "${name}" has no frames.`);
            }
            if (anim.frames.some(f => !Number.isInteger(f) || f < 0 || f >= this.spriteCount)) {
                throw new Error(`Animation "${name}" has frames out of bounds.`);
            }
            if (!(anim.duration > 0)) {
                throw new Error(`Animation "${name}" must have a duration greater than 0.`);
            }
            if (anim.nextAnimation !== undefined && !animations.has(anim.nextAnimation)) {
                throw new Error(`Animation "${name}" points to unknown nextAnimation "${anim.nextAnimation}".`);
            }
        }

        if (defaultAnimation !== undefined && !animations.has(defaultAnimation)) {
            throw new Error(`Unknown defaultAnimation "${defaultAnimation}".`);
        }
    }

    setAnimation(name, restart = false) {
        if (!this.config.animations.has(name)) {
            throw new Error(`Unknown animation "${name}".`);
        }
        if (this.currentAnimation === name && !restart) return;

        this.currentAnimation = name;
        this.currentFrame = 0;
        this.accumulatedTime = 0;
    }

    advance(deltaTime) {
        let anim = this.config.animations.get(this.currentAnimation);
        if (!anim) return;

        this.accumulatedTime += deltaTime;

        for (let i = 0; i < MAX_TRANSITIONS_PER_UPDATE; i++) {
            // Whole loops don't change the frame, so a huge deltaTime stays cheap.
            if (anim.nextAnimation === undefined) {
                this.accumulatedTime %= anim.duration;
            }

            const timePerFrame = anim.duration / anim.frames.length;
            if (this.accumulatedTime < timePerFrame) return;

            this.accumulatedTime -= timePerFrame;
            const next = this.currentFrame + 1;

            if (next < anim.frames.length) {
                this.currentFrame = next;
            } else if (anim.nextAnimation === undefined) {
                this.currentFrame = 0;
            } else {
                this.currentAnimation = anim.nextAnimation;
                this.currentFrame = 0;
                anim = this.config.animations.get(this.currentAnimation);
            }
        }

        this.accumulatedTime = 0;
    }

    update(target, deltaTime) {
        this.advance(deltaTime);

        const anim = this.config.animations.get(this.currentAnimation);
        const spriteIndex = anim ? anim.frames[this.currentFrame] : 0;

        renderSprite(
            World.getInstance().ctx,
            target.position,
            target.size,
            this.asset.image,
            this.bounds[spriteIndex]
        );
    }
}

function toAnimationMap(animations) {
    if (!animations) return new Map();
    if (animations instanceof Map) return new Map(animations);
    return new Map(Object.entries(animations));
}