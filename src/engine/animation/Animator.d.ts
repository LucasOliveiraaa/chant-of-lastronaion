import type Component from "../core/Component";
import type { AnimationId } from "./Animations";
import type SpriteRenderer from "../rendering/SpriteRenderer";

/** Plays animations from the Animations manager on the SpriteRenderer of the same GameObject. */
export default class Animator extends Component {
    constructor();

    readonly currentAnimationName: string | null;
    readonly currentFrameIndex: number;
    /** True once a non-looping animation reached its last frame. */
    readonly finished: boolean;

    /** The component that receives the frames, or null if the GameObject has none. */
    readonly spriteTarget: SpriteRenderer | null;

    /** Plays the clip with this name or id from the start. Does nothing if it is already playing. */
    setAnimation(animation: string | AnimationId): void;
}
