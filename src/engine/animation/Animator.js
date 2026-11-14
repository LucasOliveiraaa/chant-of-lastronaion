import Component from "../core/Component.js";
import Animations from "./Animations.js";
import Time from "../core/Time.js";
import SpriteRenderer from "../rendering/SpriteRenderer.js";

export default class Animator extends Component {
    currentAnimationName = null;
    currentAnimation = null;

    currentFrameIndex = 0;
    currentFrameTime = 0;

    finished = false;

    __spriteTarget = null;

    // Resolved lazily, so setAnimation() works even before this Animator's start().
    get spriteTarget() {
        if (!this.__spriteTarget || this.__spriteTarget.isDestroyed) {
            this.__spriteTarget =
                this.gameObject?.getComponent(SpriteRenderer) ?? null;
        }
        return this.__spriteTarget;
    }

    // Accepts the clip's name or id.
    setAnimation(animation) {
        if (this.currentAnimationName === animation || this.currentAnimation?.id === animation) return;

        const anim = Animations.getInstance().getAnimation(animation);

        if (!anim || !anim.frames.length) {
            console.warn(`Animation "${animation}" not found or empty.`);
            return;
        }

        this.currentAnimationName = anim.name;
        this.currentAnimation = anim;

        this.currentFrameIndex = 0;
        this.currentFrameTime = 0;
        this.finished = false;

        this.updateSprite();
    }

    start() {
        this.updateSprite();
    }

    update() {
        if (!this.currentAnimation || this.finished) return;

        this.currentFrameTime += Time.deltaTime;

        while (
            this.currentFrameTime >=
            this.currentAnimation.frames[this.currentFrameIndex].duration
        ) {
            const duration =
                this.currentAnimation.frames[this.currentFrameIndex].duration;

            this.currentFrameTime -= duration;

            this.currentFrameIndex++;

            if (this.currentFrameIndex >= this.currentAnimation.frames.length) {
                if (this.currentAnimation.loop) {
                    this.currentFrameIndex = 0;
                } else {
                    this.currentFrameIndex =
                        this.currentAnimation.frames.length - 1;

                    this.finished = true;
                    this.currentFrameTime = 0;
                    break;
                }
            }

            this.updateSprite();
        }
    }

    updateSprite() {
        if (!this.currentAnimation) return;

        this.spriteTarget?.setSprite(
            this.currentAnimation.frames[this.currentFrameIndex].spriteId
        );
    }
}