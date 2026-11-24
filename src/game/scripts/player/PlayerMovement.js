import Sprites from "../../../engine/assets/Sprites.js";
import Animations, { frames } from "../../../engine/animation/Animations.js";
import Component from "../../../engine/core/Component.js";
import Animator from "../../../engine/animation/Animator.js";
import Input from "../../../engine/input/Input.js";
import Vector2 from "../../../engine/math/Vector2.js";
import Rigidbody from "../../../engine/physics/Rigidbody.js";

export const SPEED = 200;

export default class PlayerMovement extends Component {
    async start() {
        const sprites = Sprites.getInstance();
        const sheet = await sprites.loadSpriteSheet("assets/sprites/player.png");

        const sps = sprites.sliceSpriteSheet(sheet, 54, 13);

        const animations = Animations.getInstance();

        const getIds = (start, count) => sps.slice(start, start + count);

        animations.defineAnimation("idle", {
            frames: frames(getIds(312, 2), 0.5),
            loop: true
        });
        animations.defineAnimation("walkNorth", {
            frames: frames(getIds(494, 8), 0.5),
            loop: true
        });
        animations.defineAnimation("walkWest", {
            frames: frames(getIds(507, 8), 0.5),
            loop: true
        });
        animations.defineAnimation("walkSouth", {
            frames: frames(getIds(520, 8), 0.5),
            loop: true
        });
        animations.defineAnimation("walkEast", {
            frames: frames(getIds(533, 8), 0.5),
            loop: true
        });

        console.log(sps.length, sps[312], sps[313], sps[494], sps[520]);

        this.anim = this.gameObject.getComponent(Animator);
        this.rb = this.gameObject.getComponent(Rigidbody);

        this.anim.setAnimation("idle");

        Input.setAxisConfig("Horizontal", {
            negative: ["KeyA"],
            positive: ["KeyD"],
        });
        Input.setAxisConfig("Vertical", {
            negative: ["KeyW"],
            positive: ["KeyS"],
        })
    }

    update() {
        const horizontal = Input.getAxis("Horizontal");
        const vertical = Input.getAxis("Vertical");
        const dir = new Vector2(horizontal, vertical).normalize();

        this.rb.velocity = dir.multiply(SPEED);

        const direction = this.getDirectionFromInput(horizontal, vertical);
        this.anim.setAnimation(direction);
    }

    getDirectionFromInput(horizontal, vertical) {
        if (horizontal === 0 && vertical === 0) return "idle";
    
        if (horizontal > 0) return "walkEast";
        if (horizontal < 0) return "walkWest";
        if (vertical < 0) return "walkNorth";
        if (vertical > 0) return "walkSouth";
    }
}