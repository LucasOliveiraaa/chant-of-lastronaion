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

    sr = null;

    setAnimation(animationName) {
        if (this.currentAnimationName === animationName) return;

        const anim = Animations.getInstance().getAnimation(animationName);

        if (!anim || !anim.animation.frames.length) {
            console.warn(`Animation "${animationName}" not found or empty.`);
            return;
        }

        this.currentAnimationName = animationName;
        this.currentAnimation = anim.animation;

        this.currentFrameIndex = 0;
        this.currentFrameTime = 0;
        this.finished = false;

        this.updateSprite();
    }

    start() {
        this.sr = this.gameObject.getComponent(SpriteRenderer);
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
        if (!this.sr || !this.currentAnimation) return;

        this.sr.setSprite(
            this.currentAnimation.frames[this.currentFrameIndex].spriteId
        );
    }
}