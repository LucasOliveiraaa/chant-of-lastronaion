import Animator from "../../engine/animation/Animator.js";
import Rigidbody from "../../engine/physics/Rigidbody.js";
import SquareCollider from "../../engine/physics/SquareCollider.js";
import Component from "../../engine/core/Component.js";
import Animations, { frames } from "../../engine/animation/Animations.js";
import Input from "../../engine/input/Input.js";
import Sprites from "../../engine/assets/Sprites.js";
import Vector2 from "../../engine/math/Vector2.js";

export default class PlayerMovement extends Component {
    facing = "South";

    speed = 200;

    async start() {
        this.gameObject.transform.scale.set(50, 50);

        const sprites = Sprites.getInstance();

        const sheet = await sprites.loadSpriteSheet("assets/player-spritesheet.png");
        const ids = sprites.sliceSpriteSheet(sheet, 54, 13);

        const animations = Animations.getInstance();

        const getIds = (start, count) => ids.slice(start, start + count);

        animations.defineAnimation("idle", {
            frames: frames(getIds(312, 2), 0.5),
            loop: true
        });

        animations.defineAnimation("runNorth", {
            frames: frames(getIds(494, 8), 0.5),
            loop: true
        });
        animations.defineAnimation("runWest", {
            frames: frames(getIds(507, 8), 0.5),
            loop: true
        });
        animations.defineAnimation("runSouth", {
            frames: frames(getIds(520, 8), 0.5),
            loop: true
        });
        animations.defineAnimation("runEast", {
            frames: frames(getIds(533, 8), 0.5),
            loop: true
        });

        this.rb = this.gameObject.getComponent(Rigidbody);
        this.anim = this.gameObject.getComponent(Animator);

        this.rb.gravityScale = 0;

        const c = this.gameObject.getComponent(SquareCollider);
        c.debug = true;

        c.offset = new Vector2(0, 5);
        c.size = new Vector2(15, 35);

        if (!this.rb) {
            throw new Error("PlayerMovement requires a Rigidbody component.");
        }
        if (!this.anim) {
            throw new Error("PlayerMovement requires an Animator component.");
        }

        Input.setAxisConfig("Horizontal", {
            negative: ["KeyA", "ArrowLeft"],
            positive: ["KeyD", "ArrowRight"]
        });

        Input.setAxisConfig("Vertical", {
            negative: ["KeyW", "ArrowUp"],
            positive: ["KeyS", "ArrowDown"]
        });

        this.anim.setAnimation("idle");
    }

    update() {
        const x = Input.getAxis("Horizontal");
        const y = Input.getAxis("Vertical");

        const length = Math.hypot(x, y) || 1;
        this.rb.velocity.x = (x / length) * this.speed;
        this.rb.velocity.y = (y / length) * this.speed;

        console.log(`Velocity: (${this.rb.velocity.x.toFixed(2)}, ${this.rb.velocity.y.toFixed(2)})`);

        if (x !== 0) this.facing = x > 0 ? "East" : "West";
        else if (y !== 0) this.facing = y > 0 ? "South" : "North";

        this.anim.setAnimation(
            x !== 0 || y !== 0 ? `run${this.facing}` : "idle"
        );
    }

    onCollisionEnter(other) {
        console.log(`Collided with ${other.name}`);
    }
}